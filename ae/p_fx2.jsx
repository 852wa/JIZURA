// ================================================================ effect events part 2 (AE port of the fx entries in src/11p_fxB.js)
// fx.build(f, ev): f.comp = the MAIN comp (absolute time), ev = { t, dur, amp, type, seed, sc }.
// Adjustment layers (jzAdjLayer) / overlays (jzEvShape, jzEvSolid) over [ev.t, ev.t + ev.dur], driven by jzEvHead → p (= browser k).
// Effects that need extra copies of the picture (the browser's `S` snapshot drawn again: radialChroma, echoFrames, perspectiveTilt)
// duplicate the cut wrappers visible during the event (fx2_copies). Glitch entries that re-roll their randomness on the browser's
// 24 fps clock (I.step) build one layer per clock step (fx2_steps) with the browser's own hash, so the patterns match.

// ---------------------------------------------------------------- helpers
// J.h of the browser (same uint32 for the same keys) so AE picks the same variants / positions as the web preview
function fx2_h(a, b, c, d, e) {
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
function fx2_r(a, b, c, d, e) { return fx2_h(a, b, c, d, e) / 4294967296; }
function fx2_rs(a, b, c, d, e) { return fx2_r(a, b, c, d, e) * 2 - 1; }
function fx2_rr(lo, hi, a, b, c, d, e) { return lo + (hi - lo) * fx2_r(a, b, c, d, e); }
function fx2_noise(x, seed) { var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return jzLerp(fx2_rs(seed, i), fx2_rs(seed, i + 1), u); }
function fx2_s(ev) { return fx2_h(Math.round(ev.t * 1000), 9127); }                 // evS(ev)
function fx2_amp(ev, lo, hi) { var a = jzClamp(ev.amp == null ? 1 : ev.amp, 0.3, 1.6); return jzClamp(a, lo == null ? 0.3 : lo, hi == null ? 1.6 : hi); }
function fx2_hyp(x, y) { return Math.sqrt(x * x + y * y); }
function fx2_t1(ev) { return ev.t + Math.max(ev.dur, 1 / 24); }
function fx2_dk(sc) { return jzLum(sc.bg) < 0.45; }
function fx2_ext(list, dark) { var b = null, i; for (i = 0; i < list.length; i++) { if (!list[i]) continue; if (b === null || (dark ? jzLum(list[i]) < jzLum(b) : jzLum(list[i]) > jzLum(b))) b = list[i]; } return b || (dark ? '#111111' : '#FFFFFF'); }
function fx2_ink(sc) { return fx2_dk(sc) ? fx2_ext([sc.fg, sc.ink, '#FFFFFF'], false) : fx2_ext([sc.fg, sc.ink, '#111111'], true); }
function fx2_hueD(a, b) { var d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }
// the most colourful scheme colour (cool blue for monochrome schemes)
function fx2_vivid(sc, fb) {
    var best = null, bv = 0.18, L = [sc.accent, sc.accent2, sc.ghostA, sc.ghostB, sc.fg], i, hs, v;
    for (i = 0; i < L.length; i++) { if (!L[i]) continue; hs = jzToHsl(L[i]); v = hs[1] * (1 - Math.abs(hs[2] - 0.55) * 1.1); if (v > bv) { bv = v; best = L[i]; } }
    return best || fb || '#4FB8FF';
}
// two hues for a duotone
function fx2_huePair(sc) {
    var src = [sc.accent, sc.accent2, sc.ghostA, sc.ghostB, sc.fg, sc.bg], cs = [], i, j, x, hs;
    for (i = 0; i < src.length; i++) if (src[i]) { hs = jzToHsl(src[i]); cs.push({ h: hs[0], v: hs[1] * (1 - Math.abs(hs[2] - 0.5) * 1.2) }); }
    for (i = 1; i < cs.length; i++) { x = cs[i]; j = i - 1; while (j >= 0 && cs[j].v < x.v) { cs[j + 1] = cs[j]; j--; } cs[j + 1] = x; }
    if (!cs.length || cs[0].v < 0.15) return [330, 195];
    for (i = 0; i < cs.length; i++) if (cs[i].v > 0.15 && fx2_hueD(cs[i].h, cs[0].h) > 50) return [cs[0].h, cs[i].h];
    return [cs[0].h, cs[0].h + 170];
}
// expression helpers on top of jzEvHead: bell, in-out cubic, out quad, attack-hold-release, ST = the browser's 24 fps step
var fx2_FNS = 'function bell(x){return Math.sin(Math.PI*cl(x));}' +
    'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}' +
    'function oq(x){x=cl(x);return 1-(1-x)*(1-x);}' +
    'function ahr(k,a,b){return k<a?oc(k/a):(k>b?1-ic((k-b)/Math.max(0.001,1-b)):1);}' +
    'var ST=Math.floor(time*24+0.000001);\n';
function fx2_head(ev, extra) { return jzEvHead(ev.t, ev.dur, extra) + fx2_FNS; }
function fx2_span(L, t0, t1) { try { L.inPoint = t0; L.outPoint = Math.max(t1, t0 + 0.001); } catch (e) { jzWarn('fx2 span: ' + e.toString()); } return L; }
// one entry per 24 fps clock step inside the event (the browser re-rolls glitch randomness on I.step = floor(t*24))
function fx2_steps(ev, cap) {
    var t0 = ev.t, t1 = fx2_t1(ev), s = Math.floor(t0 * 24 + 0.000001), out = [];
    for (; s / 24 < t1 - 0.0001 && out.length < (cap || 12); s++) out.push({ st: s, t0: Math.max(t0, s / 24), t1: Math.min(t1, (s + 1) / 24) });
    if (out.length) out[out.length - 1].t1 = t1;
    return out;
}
// masks (layer space = comp space for comp-sized solids / adjustment layers / wrappers)
function fx2_maskPts(L, verts, ins, outs, o) {
    o = o || {};
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = verts; if (ins) { sh.inTangents = ins; sh.outTangents = outs; } sh.closed = true;
    m.property('ADBE Mask Shape').setValue(sh);
    if (o.mode) m.maskMode = o.mode;
    if (o.feather) m.property('ADBE Mask Feather').setValue([o.feather, o.feather]);
    if (o.op != null) m.property('ADBE Mask Opacity').setValue(o.op);
    if (o.inv) m.inverted = true;
    return m;
}
function fx2_ellPts(cx, cy, rx, ry) {
    var kx = 0.5523 * rx, ky = 0.5523 * ry;
    return { v: [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]], i: [[-kx, 0], [0, -ky], [kx, 0], [0, ky]], o: [[kx, 0], [0, ky], [-kx, 0], [0, -ky]] };
}
function fx2_maskEll(L, cx, cy, rx, ry, o) { var e = fx2_ellPts(cx, cy, rx, ry); return fx2_maskPts(L, e.v, e.i, e.o, o); }
function fx2_maskRect(L, x0, y0, x1, y1, o) { return fx2_maskPts(L, [[x1, y0], [x1, y1], [x0, y1], [x0, y0]], null, null, o); }
// shape helpers
function fx2_path(g, verts, ins, outs, closed) {
    var p = jzVecs(g).addProperty('ADBE Vector Shape - Group'), sh = new Shape();
    sh.vertices = verts; if (ins) { sh.inTangents = ins; sh.outTangents = outs; } sh.closed = !!closed;
    p.property('ADBE Vector Shape').setValue(sh);
    return p;
}
function fx2_eo(fill) { try { fill.property('ADBE Vector Fill Rule').setValue(2); } catch (e) {} return fill; }
function fx2_gx(g, mn, ex) { jzSetExpr(jzGX(g).property(mn), ex); }
function fx2_sub(g, name) { var q = jzVecs(g).addProperty('ADBE Vector Group'); if (name) q.name = name; return q; }
function fx2_solid(f, name, hex, w, h, t0, t1) {
    var L = f.comp.layers.addSolid(jzHex(hex), name, Math.max(4, Math.round(w)), Math.max(4, Math.round(h)), 1, f.comp.duration);
    return fx2_span(L, t0, t1);
}
// Transform effect (ADBE Geometry2) with anchor = position = pivot
function fx2_xform(L, name, pivot) {
    var tr = jzEffect(L, 'ADBE Geometry2', name);
    if (pivot) { jzEP(tr, 1, pivot); jzEP(tr, 2, pivot); }
    return tr;
}
function fx2_isWrap(L) {
    try { return !!(L && L.source && typeof L.source.numLayers === 'number' && /^\d\d\d /.test(String(L.name))); } catch (e) { return false; }
}
// copies of the picture: duplicates of the cut wrappers visible during the event, moved to the top of the main comp and trimmed to it.
// A matted wrapper takes a copy of its matte along (kept directly above the copy). fn(layer, isMatte) is applied to each.
function fx2_copies(f, ev, tag, fn) {
    var C = f.comp, t0 = ev.t, t1 = fx2_t1(ev), src = [], out = [], i, L, D, M, M0;
    for (i = C.numLayers; i >= 1; i--) { L = C.layer(i); if (fx2_isWrap(L) && L.inPoint < t1 - 0.0001 && L.outPoint > t0 + 0.0001) src.push(L); }
    for (i = 0; i < src.length; i++) {
        L = src[i]; M0 = null;
        try { if (L.trackMatteType !== TrackMatteType.NO_TRACK_MATTE && L.index > 1) M0 = C.layer(L.index - 1); } catch (e0) {}
        D = L.duplicate(); D.moveToBeginning(); D.name = 'JZ FX ' + tag + ' copy';
        fx2_span(D, Math.max(D.inPoint, t0), Math.min(D.outPoint, t1));
        M = null;
        if (M0) { M = M0.duplicate(); M.moveToBeginning(); M.name = 'JZ FX ' + tag + ' matte'; fx2_span(M, Math.max(M.inPoint, t0), Math.min(M.outPoint, t1)); }
        else { try { if (D.trackMatteType !== TrackMatteType.NO_TRACK_MATTE) D.trackMatteType = TrackMatteType.NO_TRACK_MATTE; } catch (e1) {} }
        if (fn) { fn(D, false); if (M) fn(M, true); }
        out.push({ L: D, M: M });
    }
    return out;
}
// a mask on a picture copy that may already carry transition masks (then it must intersect them)
function fx2_clipMask(L, verts) {
    var n = 0; try { n = L.property('ADBE Mask Parade').numProperties; } catch (e) { n = 0; }
    return fx2_maskPts(L, verts, null, null, n > 0 ? { mode: MaskMode.INTERSECT } : null);
}
function fx2_cropMask(L, x0, y0, x1, y1) { return fx2_clipMask(L, [[x1, y0], [x1, y1], [x0, y1], [x0, y0]]); }

// ================================================================ lens / optics
/* ---- radialChroma — 放射色収差: red / cyan tinted copies of the picture scaled out from the centre */
jzReg('fx', 'radialChroma', { build: function (f, ev) {
    var s = fx2_s(ev), dk = fx2_dk(ev.sc);
    var hd = fx2_head(ev, ',D0=' + jzN((0.03 + 0.016 * fx2_r(s, 1)) * fx2_amp(ev))) + 'var d=D0*(0.4+0.6*oq(p))*(p>0.8?1-(p-0.8)*2.5:1);\n';
    var parts = [['#FF3020', 1, 95], ['#18E0FF', -0.7, 95], ['#FF3020', 2.2, 45]], j;
    for (j = 0; j < parts.length; j++) {
        fx2_copies(f, ev, 'radialChroma', function (L, isM) {
            if (!isM) {
                var tn = jzEffect(L, 'ADBE Tint', 'JZ Chroma Tint');
                jzEP(tn, 1, jzHex(dk ? '#000000' : parts[j][0])); jzEP(tn, 2, jzHex(dk ? parts[j][0] : '#FFFFFF')); jzEP(tn, 3, 100);
                L.blendingMode = dk ? BlendingMode.SCREEN : BlendingMode.MULTIPLY;
            }
            var tr = fx2_xform(L, 'JZ Chroma Scale', [f.W / 2, f.H / 2]);
            jzEX(tr, 4, hd + '100*(1+' + jzN(parts[j][1]) + '*d)');
            if (!isM) jzEP(tr, 9, parts[j][2]);
        });
    }
} });

/* ---- bloomFlash — ブルーム: a soft glow blooms out of the frame and fades */
jzReg('fx', 'bloomFlash', { build: function (f, ev) {
    var dk = fx2_dk(ev.sc), A = fx2_amp(ev, 0.5, 1.3);
    var hd = fx2_head(ev, ',AC=' + jzN(A)) + 'var a=AC*(p<0.12?oc(p/0.12):Math.pow(Math.max(0,1-(p-0.12)/0.88),1.5));\n';
    var L = jzAdjLayer(f.comp, 'JZ FX bloomFlash', ev.t, ev.dur);
    var g1 = jzEffect(L, 'ADBE Glo2', 'JZ Bloom Near');
    jzEP(g1, 2, dk ? 30 : 8); jzEP(g1, 3, 18 * f.u); jzEX(g1, 4, hd + 'a*' + (dk ? '1.1' : '0.6'));
    var g2 = jzEffect(L, 'ADBE Glo2', 'JZ Bloom Far');
    jzEP(g2, 2, dk ? 30 : 8); jzEP(g2, 3, 90 * f.u); jzEX(g2, 4, hd + 'a*' + (dk ? '1.2' : '0.5'));
    if (dk) {   // + a faint fg-coloured lift
        var F = jzEvSolid(f.comp, 'JZ FX bloomFlash lift', ev.sc.fg, ev.t, ev.dur);
        F.blendingMode = BlendingMode.SCREEN;
        jzSetExpr(jzXf(F, 'ADBE Opacity'), hd + '10*a');
    }
} });

/* ---- bulge — 魚眼: fisheye bulge (or pinch) that swells in and relaxes */
jzReg('fx', 'bulge', { build: function (f, ev) {
    var s = fx2_s(ev), pinch = fx2_r(s, 1) < 0.25, W = f.W, H = f.H;
    var base = (pinch ? -0.26 : 0.27) * fx2_amp(ev, 0.5, 1.35);
    var L = jzAdjLayer(f.comp, 'JZ FX bulge', ev.t, ev.dur);
    var bg = jzEffect(L, 'ADBE Bulge', 'JZ Bulge');
    jzEP(bg, 1, W * 0.56); jzEP(bg, 2, H * 0.56); jzEP(bg, 3, [W * (0.5 + fx2_rs(s, 2) * 0.05), H * (0.5 + fx2_rs(s, 3) * 0.04)]);
    jzEX(bg, 4, fx2_head(ev, ',B0=' + jzN(base)) + 'var amt=p<0.3?oc(p/0.3):1-ioc((p-0.3)/0.7);var A=Math.max(-0.36,Math.min(0.38,B0*amt));A/0.27*0.55');
} });

// ================================================================ glitch
/* ---- pixelSort — ピクセルソート: runs of columns melt downwards (or upwards) — masked vertical stretches */
jzReg('fx', 'pixelSort', { build: function (f, ev) {
    var W = f.W, H = f.H, a = fx2_amp(ev), s = fx2_s(ev), st = Math.floor(ev.t * 24 + 0.000001) * 19 + s, up = fx2_r(s, 1) < 0.3;
    var xa = W * fx2_rr(0.02, 0.35, st, 1), xb = Math.min(W, xa + W * fx2_rr(0.4, 0.7, st, 2));
    var x = Math.round(xa), i = 0, cols = [], wr, on;
    while (x < xb && i < 200) {
        wr = Math.max(1, Math.round(W * fx2_rr(0.002, 0.009, st, i, 3)));
        on = fx2_noise(x / W * 9, st + 5) > -0.25 && fx2_r(st, i, 4) < 0.85;
        if (on) cols.push([x, Math.min(xb, x + wr)]);
        x += wr; i++;
    }
    // the columns' window / stretch vary smoothly along x: 5 bands, one adjustment layer each (its columns as masks)
    var K = 5, bw = (xb - xa) / K, k, j;
    for (k = 0; k < K; k++) {
        var b0 = xa + k * bw, b1 = b0 + bw, runs = [], cur = null, cm;
        for (j = 0; j < cols.length; j++) {
            cm = (cols[j][0] + cols[j][1]) / 2;
            if (cm < b0 || cm >= b1) continue;
            if (cur && Math.abs(cur[1] - cols[j][0]) < 0.5) cur[1] = cols[j][1]; else { cur = [cols[j][0], cols[j][1]]; runs.push(cur); }
        }
        if (!runs.length) continue;
        var xc = (b0 + b1) / 2, n1 = fx2_noise(xc / W * 7, st + 9) * 0.5 + 0.5, n2 = fx2_noise(xc / W * 23, st + 13) * 0.5 + 0.5;
        var win = H * (0.08 + 0.12 * n1), str = 1 + (0.5 + 2 * n2) * a, y0, ya, yb;
        if (!up) { y0 = H * (0.36 + 0.12 * n2); ya = y0; yb = y0 + Math.min(H - y0, win * str); }
        else { y0 = H * (0.64 - 0.12 * n2); ya = y0 - Math.min(y0, win * str); yb = y0; }
        var L = jzAdjLayer(f.comp, 'JZ FX pixelSort', ev.t, ev.dur);
        for (j = 0; j < runs.length; j++) fx2_maskRect(L, runs[j][0], ya, runs[j][1], yb);
        var tr = fx2_xform(L, 'JZ Pixel Sort', [xc, y0]);
        jzEP(tr, 3, 0); jzEP(tr, 5, 100);
        jzEX(tr, 4, 'posterizeTime(24);seedRandom(' + ((s + k * 31) % 99991) + '+Math.floor(time*24)*7,true);' + jzN(str * 100) + '*random(0.8,1.25)');
        // the browser re-rolls the melt every 24 fps step: after the first step the whole melt jumps to a new place
        jzSetExpr(jzXf(L, 'ADBE Position'), 'var S0=' + Math.floor(ev.t * 24 + 0.000001) + ',st=Math.floor(time*24+0.000001);seedRandom(' + (s % 99991) + '+st*19,true);' +
            'var jx=random(-0.18,0.18)*thisComp.width,jy=random(-0.05,0.05)*thisComp.height;st<=S0?value:[value[0]+jx,value[1]+jy]');
    }
} });

/* ---- interlace — インターレース: alternate row bands knocked sideways against the rest (square Wave Warp) */
jzReg('fx', 'interlace', { build: function (f, ev) {
    var H = f.H, a = fx2_amp(ev), s = fx2_s(ev), Lr = Math.max(1, Math.round(H / 200));
    var hd = fx2_head(ev, ',A=' + jzN(a) + ',SD=' + (s % 9973)) + 'seedRandom(SD+ST*7,true);var sg=random()<0.5?1:-1;var dx=sg*(0.012+0.02*random())*thisComp.width*A*(1-0.45*p);\n';
    var L = jzAdjLayer(f.comp, 'JZ FX interlace', ev.t, ev.dur);
    var ww = jzEffect(L, 'ADBE Wave Warp', 'JZ Interlace Rows');
    jzEP(ww, 1, 2); jzEX(ww, 2, hd + '0.675*Math.abs(dx)'); jzEP(ww, 3, 2 * Lr); jzEP(ww, 4, 0); jzEP(ww, 5, 0); jzEP(ww, 6, 1);
    jzEX(ww, 7, hd + '(ST%2)*180+(dx<0?180:0)');
    var tr = fx2_xform(L, 'JZ Interlace Shift', null);
    jzEX(tr, 2, hd + '[value[0]+0.325*dx,value[1]]');
    // the browser paints the background first: bg-coloured edges where the rows leave the frame
    var S = jzEvShape(f.comp, 'JZ FX interlace edges', ev.t, ev.dur), side, g, r;
    for (side = 0; side < 2; side++) {
        g = jzGrp(S, side ? 'right' : 'left'); r = jzAddRect(g, 10, H + 4, 0, 0, 0); jzAddFill(g, ev.sc.bg);
        jzSetExpr(r.property('ADBE Vector Rect Size'), hd + '[Math.max(' + (side ? '-dx,0.35*dx' : 'dx,-0.35*dx') + ')+3,thisComp.height+4]');
        jzSetExpr(r.property('ADBE Vector Rect Position'), hd + 'var w=Math.max(' + (side ? '-dx,0.35*dx' : 'dx,-0.35*dx') + ')+3;[' + (side ? 'thisComp.width-w/2' : 'w/2') + ',thisComp.height/2]');
    }
} });

/* ---- macroBlock — ブロックノイズ: grid-aligned blocks smear down, quantise or slip (re-rolled every 24 fps step) */
jzReg('fx', 'macroBlock', { build: function (f, ev) {
    var W = f.W, H = f.H, a = fx2_amp(ev), s = fx2_s(ev), B = Math.max(6, Math.round(Math.min(W, H) / 18));
    var nx = Math.ceil(W / B), ny = Math.ceil(H / B), steps = fx2_steps(ev, 4), k, c, i, j, q;
    for (k = 0; k < steps.length; k++) {
        var st = steps[k].st * 23 + s, sm = [], qu = [], sl = [], df = [], slip = 0, smTop = H;
        var nC = 2 + (fx2_h(st, 1) % 3);
        for (c = 0; c < nC; c++) {
            var gw = Math.min(nx, 3 + (fx2_h(st, c, 2) % 7)), gh = 1 + (fx2_h(st, c, 3) % 3);
            var i0 = Math.floor(fx2_r(st, c, 4) * (nx - gw + 1)), j0 = Math.round(ny * (0.38 + 0.24 * fx2_r(st, c, 5)) - gh / 2);
            for (j = 0; j < gh; j++) for (i = 0; i < gw; i++) {
                var id = i * 16 + j;
                if (fx2_r(st, c, id, 6) < 0.12) continue;
                var bx = (i0 + i) * B, by = jzClamp(j0 + j, 0, ny - 1) * B, bw = Math.min(B, W - bx), bh = Math.min(B, H - by), m = fx2_r(st, c, id, 7);
                if (bw < 1 || bh < 1) continue;
                if (m < 0.42) { sm.push([bx, by, bx + bw, by + Math.min(H - by, B * (1 + (fx2_h(st, c, id, 9) % 3)))]); smTop = Math.min(smTop, by); }
                else if (m < 0.7 || m >= 0.9) qu.push([bx, by, bx + bw, by + bh, m >= 0.9]);
                else { sl.push([bx, by, bx + bw, by + bh]); slip += (fx2_r(st, c, id, 10) < 0.5 ? -1 : 1) * (1 + (fx2_h(st, c, id, 12) % 2)); }
                if (m >= 0.42 && fx2_r(st, c, id, 8) < 0.06 * a) df.push([bx, by, bw, bh, fx2_r(st, c, id, 11) < 0.5 ? ev.sc.ghostA : ev.sc.ghostB]);
            }
        }
        var t0 = steps[k].t0, t1 = steps[k].t1, L, e;
        if (sm.length) {     // datamosh bleed: the blocks' top rows smeared down
            L = fx2_span(jzAdjLayer(f.comp, 'JZ FX macroBlock smear', t0, t1 - t0), t0, t1);
            for (q = 0; q < sm.length; q++) fx2_maskRect(L, sm[q][0], sm[q][1], sm[q][2], sm[q][3]);
            e = fx2_xform(L, 'JZ Block Smear', [W / 2, smTop + 0.5]); jzEP(e, 3, 0); jzEP(e, 5, 100); jzEP(e, 4, Math.min(9000, 100 * B * 1.5));
        }
        if (qu.length) {     // quantised to 3x3 flat cells (the "flat" blocks too)
            L = fx2_span(jzAdjLayer(f.comp, 'JZ FX macroBlock quant', t0, t1 - t0), t0, t1);
            for (q = 0; q < qu.length; q++) fx2_maskRect(L, qu[q][0], qu[q][1], qu[q][2], qu[q][3]);
            e = jzEffect(L, 'ADBE Mosaic', 'JZ Block Cells'); jzEP(e, 1, Math.max(1, Math.round(3 * W / B))); jzEP(e, 2, Math.max(1, Math.round(3 * H / B))); jzEP(e, 3, 1);
        }
        if (sl.length) {     // slipped: copied from a neighbouring block
            L = fx2_span(jzAdjLayer(f.comp, 'JZ FX macroBlock slip', t0, t1 - t0), t0, t1);
            for (q = 0; q < sl.length; q++) fx2_maskRect(L, sl[q][0], sl[q][1], sl[q][2], sl[q][3]);
            e = jzEffect(L, 'ADBE Offset', 'JZ Block Slip'); jzEP(e, 1, [W / 2 - (slip < 0 ? -1 : 1) * B * (Math.abs(slip) > sl.length * 1.4 ? 2 : 1), H / 2]);
        }
        if (df.length) {     // a few blocks flashed in the ghost colours (difference)
            L = fx2_span(jzEvShape(f.comp, 'JZ FX macroBlock tint', t0, t1 - t0), t0, t1);
            L.blendingMode = BlendingMode.DIFFERENCE; jzXf(L, 'ADBE Opacity').setValue(30);
            for (q = 0; q < df.length; q++) { var g = jzGrp(L); jzAddRect(g, df[q][2], df[q][3], 0, df[q][0] + df[q][2] / 2, df[q][1] + df[q][3] / 2); jzAddFill(g, df[q][4] || '#FF3080'); }
        }
    }
} });

// ================================================================ print / stylise
/* ---- halftone — 網点: the picture seen through a 45° screen on a paper-tone ground (square dots: Venetian Blinds x2 as a matte) */
jzReg('fx', 'halftone', { build: function (f, ev) {
    var c = Math.max(5, Math.round(Math.min(f.W, f.H) / 44));
    var G = jzEvSolid(f.comp, 'JZ FX halftone ground', jzMixHex(ev.sc.bg, ev.sc.fg, 0.16), ev.t, ev.dur);
    var M = jzEvSolid(f.comp, 'JZ FX halftone screen', '#FFFFFF', ev.t, ev.dur);
    // browser dot radius r = lerp(0.72c, 0.42c, amt) → square dot of the same area → blinds completion
    var ex = fx2_head(ev) + 'var r=0.72-0.3*ahr(p,0.3,0.72);100*(1-Math.min(1,1.7725*r))';
    var d, vb, dirs = [45, 135];
    for (d = 0; d < 2; d++) { vb = jzEffect(M, 'ADBE Venetian Blinds', 'JZ Screen ' + dirs[d]); jzEX(vb, 1, ex); jzEP(vb, 2, dirs[d]); jzEP(vb, 3, c); }
    G.trackMatteType = TrackMatteType.ALPHA_INVERTED;
} });

/* ---- duotone — ダブルトーン: the frame mapped onto two scheme hues (Tint) */
jzReg('fx', 'duotone', { build: function (f, ev) {
    var s = fx2_s(ev), hp = fx2_huePair(ev.sc), h1 = hp[0], h2 = hp[1], t;
    if (fx2_r(s, 1) < 0.4) { t = h1; h1 = h2; h2 = t; }
    var L = jzAdjLayer(f.comp, 'JZ FX duotone', ev.t, ev.dur);
    var tn = jzEffect(L, 'ADBE Tint', 'JZ Duotone');
    jzEP(tn, 1, jzHex(jzHsl(h1, 0.8, 0.15))); jzEP(tn, 2, jzHex(jzHsl(h2, 1, 0.76)));
    jzEX(tn, 3, fx2_head(ev, ',AC=' + jzN(fx2_amp(ev, 0.6, 1))) + '100*AC*ahr(p,0.12,0.7)');
} });

/* ---- ditherBit — 1bitディザ: coarse pixels, noise dither, hard threshold, mapped to the scheme's darkest / lightest colour */
jzReg('fx', 'ditherBit', { build: function (f, ev) {
    var sc = ev.sc, q = Math.max(2, Math.round(f.H / 200));
    var hd = fx2_head(ev, ',Q=' + q) + 'var c=Q*(p<0.34?2:1);\n';
    var L = jzAdjLayer(f.comp, 'JZ FX ditherBit', ev.t, ev.dur), m;
    m = jzEffect(L, 'ADBE Mosaic', 'JZ Dither Cells'); jzEX(m, 1, hd + 'Math.round(thisComp.width/c)'); jzEX(m, 2, hd + 'Math.round(thisComp.height/c)'); jzEP(m, 3, 1);
    var nz = jzEffect(L, 'ADBE Noise', 'JZ Dither Noise'); jzEP(nz, 1, 40); jzEP(nz, 2, 0);
    m = jzEffect(L, 'ADBE Mosaic', 'JZ Dither Cells 2'); jzEX(m, 1, hd + 'Math.round(thisComp.width/c)'); jzEX(m, 2, hd + 'Math.round(thisComp.height/c)'); jzEP(m, 3, 1);
    var th = jzEffect(L, 'ADBE Threshold2', 'JZ 1bit'); jzEP(th, 1, 128);
    var tn = jzEffect(L, 'ADBE Tint', 'JZ 1bit Colours');
    var c0 = fx2_ext([sc.bg, sc.fg, sc.ink], true), c1 = fx2_ext([sc.bg, sc.fg, sc.ink], false);
    jzEP(tn, 1, jzHex(c0)); jzEP(tn, 2, jzHex(c1)); jzEP(tn, 3, 100);
    // the ordered (Bayer) dither turns the flat background into a sparse dot lattice (density = its brightness): a dot screen on top
    var lb = jzLum(sc.bg), dark = lb < 0.5, fr = jzClamp(dark ? lb : 1 - lb, 0.02, 0.3);
    var D = jzEvSolid(f.comp, 'JZ FX ditherBit dots', dark ? c1 : c0, ev.t, ev.dur), d, vb;
    for (d = 0; d < 2; d++) { vb = jzEffect(D, 'ADBE Venetian Blinds', 'JZ Dither Dots ' + (d + 1)); jzEP(vb, 1, 100 * (1 - Math.min(0.5, Math.sqrt(fr)))); jzEP(vb, 2, d * 90); jzEX(vb, 3, hd + '4*c'); }
} });

// ================================================================ frame motion
/* ---- rotateSnap — 傾きスナップ: the frame snaps to a tilt and springs back level (zoomed to cover) */
jzReg('fx', 'rotateSnap', { build: function (f, ev) {
    var s = fx2_s(ev), dir = fx2_r(s, 1) < 0.5 ? 1 : -1, TH = dir * (3 + 2 * fx2_r(s, 2)) * fx2_amp(ev, 0.5, 1.3);
    var hd = fx2_head(ev, ',TH=' + jzN(TH)) + 'var e=p<0.12?1:Math.exp(-4.5*(p-0.12))*Math.cos((p-0.12)*Math.PI*2.4);var th=TH*e;' +
        'var q=Math.abs(th)*Math.PI/180,c=Math.cos(q),sn=Math.sin(q),W=thisComp.width,H=thisComp.height;var z=Math.max((W*c+H*sn)/W,(W*sn+H*c)/H)*(1+0.025*Math.abs(e));\n';
    var L = jzAdjLayer(f.comp, 'JZ FX rotateSnap', ev.t, ev.dur);
    var tr = fx2_xform(L, 'JZ Rotate Snap', null);
    jzEX(tr, 4, hd + 'z*100'); jzEX(tr, 8, hd + 'th');
} });

/* ---- echoFrames — 残像エコー: stepped after-images of the frame (lighten on dark schemes / darken on light ones) */
jzReg('fx', 'echoFrames', { build: function (f, ev) {
    var s = fx2_s(ev), dk = fx2_dk(ev.sc), a = fx2_amp(ev, 0.5, 1.3), PI = Math.PI;
    var ang = fx2_r(s, 1) < 0.65 ? (fx2_r(s, 2) < 0.5 ? 0 : PI) : (fx2_r(s, 3) < 0.5 ? 0.25 : 0.75) * PI + (fx2_r(s, 2) < 0.5 ? 0 : PI);
    var hd = fx2_head(ev, ',CA=' + jzN(Math.cos(ang)) + ',SA=' + jzN(Math.sin(ang)) + ',MM=' + jzN(Math.min(f.W, f.H) * a)) +
        'var d=MM*(0.02+0.035*oc(p)),fade=p<0.1?1:1-iq((p-0.1)/0.9);\n';
    var i;
    for (i = 4; i >= 1; i--) {
        fx2_copies(f, ev, 'echoFrames', function (L, isM) {
            var tr = fx2_xform(L, 'JZ Echo Offset', null);
            jzEX(tr, 2, hd + '[value[0]+CA*d*' + i + ',value[1]+SA*d*' + i + ']');
            if (!isM) { jzEX(tr, 9, hd + '100*Math.max(0,fade*' + jzN(0.64 - i * 0.12) + ')'); L.blendingMode = dk ? BlendingMode.LIGHTEN : BlendingMode.DARKEN; }
        });
    }
} });

/* ---- kaleido — 万華鏡: n mirrored wedges around the centre — picture copies, each clipped to a source wedge, turned and flipped into place */
jzReg('fx', 'kaleido', { build: function (f, ev) {
    var W = f.W, H = f.H, s = fx2_s(ev), n = fx2_r(s, 1) < 0.5 ? 6 : 8, th = 360 / n, PI = Math.PI, i;
    var src = fx2_r(s, 4) < 0.5 ? 0 : 180, sg = fx2_r(s, 3) < 0.5 ? 1 : -1, cx = W / 2, cy = H / 2, R = fx2_hyp(W, H) * 1.3;
    var hd = fx2_head(ev, ',R0=' + jzN(fx2_r(s, 2) * 360) + ',SG=' + sg) + 'var rot=R0+p*0.5*SG*180/Math.PI,z=1.05+0.12*p;\n';
    var ha = (th / 2 + 0.35) * PI / 180, a0 = src * PI / 180;
    var wedge = [[cx, cy], [cx + Math.cos(a0 - ha) * R, cy + Math.sin(a0 - ha) * R], [cx + Math.cos(a0) * R * 1.2, cy + Math.sin(a0) * R * 1.2], [cx + Math.cos(a0 + ha) * R, cy + Math.sin(a0 + ha) * R]];
    for (i = 0; i < n; i++) {
        var odd = i % 2 === 1, rotOff = i * th + (src && !odd ? 180 : 0);
        var sx = odd && src ? '-z' : 'z', sy = odd && !src ? '-z' : 'z';
        fx2_copies(f, ev, 'kaleido', function (L, isM) {
            fx2_clipMask(L, wedge);
            var tr = fx2_xform(L, 'JZ Kaleido Wedge', [cx, cy]);
            jzEP(tr, 3, 0);
            jzEX(tr, 4, hd + '100*' + sy); jzEX(tr, 5, hd + '100*' + sx); jzEX(tr, 8, hd + 'rot+' + jzN(rotOff));
            if (!isM) jzEX(tr, 9, hd + '100*(p>0.75?1-(p-0.75)/0.25*0.5:1)');
        });
    }
} });

// ================================================================ inversion / light
/* ---- bandInvert — 帯反転: a few bands of the frame inverted (difference), re-rolled every 24 fps step */
jzReg('fx', 'bandInvert', { build: function (f, ev) {
    var W = f.W, H = f.H, s = fx2_s(ev), vert = fx2_r(s, 2) < 0.22, a = fx2_amp(ev, 0.6, 1.3), Lx = vert ? W : H, Mx = vert ? H : W;
    var steps = fx2_steps(ev, 12), k, i;
    for (k = 0; k < steps.length; k++) {
        var st = steps[k].st * 13 + s, n = 2 + (fx2_h(st, 1) % 4);
        var S = fx2_span(jzEvShape(f.comp, 'JZ FX bandInvert', steps[k].t0, steps[k].t1 - steps[k].t0), steps[k].t0, steps[k].t1);
        S.blendingMode = BlendingMode.DIFFERENCE;
        var g = jzGrp(S, 'bands');
        for (i = 0; i < n; i++) {
            var h = Math.max(2, Lx * fx2_rr(0.012, 0.12, st, i, 3) * a), y = Math.round(Lx * fx2_rr(0.12, 0.88, st, i, 4) - h / 2);
            var part = fx2_r(st, i, 5) < 0.35, x0 = part ? Mx * fx2_rr(0, 0.5, st, i, 6) : 0, w = part ? Mx * fx2_rr(0.25, 0.6, st, i, 7) : Mx;
            if (vert) jzAddRect(g, h, w, 0, y + h / 2, x0 + w / 2); else jzAddRect(g, w, h, 0, x0 + w / 2, y + h / 2);
        }
        jzAddFill(g, '#FFFFFF');
    }
} });

/* ---- lightRays — 光芒: god rays from a point above the lyric (masked wedges on a radial Gradient Ramp), slowly turning */
jzReg('fx', 'lightRays', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = fx2_s(ev), dk = fx2_dk(sc), M = Math.min(W, H), D = fx2_hyp(W, H), PI = Math.PI;
    var cx = W * (0.5 + fx2_rs(s, 1) * 0.12), cy = H * (0.42 + fx2_rs(s, 2) * 0.1);
    var n = 12 + (fx2_h(s, 3) % 8), rot = fx2_r(s, 4) * 2 * PI, sg = fx2_r(s, 7) < 0.5 ? 1 : -1;
    var col = dk ? jzMixHex(sc.fg, '#FFFFFF', 0.3) : jzMixHex(fx2_vivid(sc), '#FFFFFF', 0.35);
    var SZ = Math.ceil(D * 2.2), C0 = SZ / 2, R = D * 1.05, i;
    var L = fx2_solid(f, 'JZ FX lightRays', col, SZ, SZ, ev.t, fx2_t1(ev));
    jzXf(L, 'ADBE Position').setValue([cx, cy]);
    for (i = 0; i < n; i++) {
        var an = rot + i / n * 2 * PI + fx2_rs(s, i, 5) * 0.12, w = 2 * PI / n * fx2_rr(0.14, 0.45, s, i, 6);
        fx2_maskPts(L, [[C0, C0], [C0 + Math.cos(an - w / 2) * R, C0 + Math.sin(an - w / 2) * R], [C0 + Math.cos(an + w / 2) * R, C0 + Math.sin(an + w / 2) * R]]);
    }
    fx2_maskEll(L, C0, C0, M * 0.2, M * 0.2, { feather: M * 0.2, op: 80 });     // the bright core
    var hd = fx2_head(ev, ',A0=' + jzN(fx2_amp(ev, 0.5, 1.2)) + ',DG=' + jzN(D)) + 'var Rp=DG*(0.4+0.6*oc(p));\n';
    var rp = jzEffect(L, 'ADBE Ramp', 'JZ Ray Falloff');
    jzEP(rp, 1, [C0, C0]); jzEP(rp, 2, jzHex(col)); jzEX(rp, 3, hd + '[' + jzN(C0) + '+0.65*Rp,' + jzN(C0) + ']'); jzEP(rp, 4, jzHex(dk ? '#000000' : '#FFFFFF')); jzEP(rp, 5, 2);
    L.blendingMode = dk ? BlendingMode.SCREEN : BlendingMode.MULTIPLY;
    jzSetExpr(jzXf(L, 'ADBE Opacity'), hd + 'seedRandom(ST*5+3,true);100*Math.min(1,A0*Math.pow(bell(p),0.6)*(0.9+0.1*random())*0.8)');
    jzSetExpr(jzXf(L, 'ADBE Rotate Z'), hd + 'p*' + jzN(0.22 * sg * 180 / PI));
} });

/* ---- anamorphic — アナモフレア: a horizontal lens streak with core and ghosts drifting across (feathered elliptical masks) */
jzReg('fx', 'anamorphic', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = fx2_s(ev), dk = fx2_dk(sc), M = Math.min(W, H), col = fx2_vivid(sc), dir = fx2_r(s, 3) < 0.5 ? 1 : -1;
    var y = H * (0.5 + fx2_rs(s, 1) * 0.1), x = W * (0.5 + fx2_rs(s, 2) * 0.22), t1 = fx2_t1(ev);
    var hd = fx2_head(ev, ',A0=' + jzN(fx2_amp(ev, 0.5, 1.2)) + ',DX=' + jzN(W * 0.14 * dir)) + 'seedRandom(ST*7+5,true);var a=A0*Math.pow(bell(p),0.5)*(0.88+0.12*random());var dx=(p-0.5)*DX;\n';
    var mode = dk ? BlendingMode.SCREEN : BlendingMode.MULTIPLY;
    function mk(name, hex, opK, moveK) {
        var L = jzEvSolid(f.comp, 'JZ FX anamorphic ' + name, hex, ev.t, ev.dur);
        L.blendingMode = mode;
        jzSetExpr(jzXf(L, 'ADBE Opacity'), hd + '100*Math.min(1,a*' + jzN(opK) + ')');
        jzSetExpr(jzXf(L, 'ADBE Position'), hd + '[value[0]+dx*' + jzN(moveK) + ',value[1]]');
        return L;
    }
    var A = mk('streak', dk ? col : jzMixHex(col, '#FFFFFF', 0.2), dk ? 0.6 : 0.75, 1);
    fx2_maskEll(A, x, y, W * 0.78, M * 0.045, { feather: M * 0.05, op: 40 });
    fx2_maskEll(A, x, y, W * 0.36, M * 0.03, { feather: M * 0.04, op: 100 });
    var B = mk('core', dk ? '#FFFFFF' : col, dk ? 0.95 : 1, 1);
    fx2_maskEll(B, x, y, W * 0.6, Math.max(1.5, M * 0.006), { feather: Math.max(2, M * 0.008), op: 100 });
    fx2_maskEll(B, x, y, M * (dk ? 0.07 : 0.05), M * (dk ? 0.07 : 0.05), { feather: M * 0.06, op: dk ? 85 : 55 });
    if (dk) {      // lens ghosts along the line through the frame centre (they drift the other way)
        var C = mk('ghosts', col, 0.16, -1.1), fs = [0.55, 1.1, 1.7], rs = [0.03, 0.06, 0.02], j;
        for (j = 0; j < 3; j++) fx2_maskEll(C, W / 2 + (W / 2 - x) * fs[j], H / 2 + (H / 2 - y) * fs[j], M * rs[j], M * rs[j], { feather: M * rs[j] * 0.4 });
    }
} });

/* ---- heartbeat — 鼓動: a coloured vignette closes in twice with a slight push */
jzReg('fx', 'heartbeat', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, dk = fx2_dk(sc), M = Math.min(W, H), R = fx2_hyp(W, H) / 2;
    var hd = fx2_head(ev, ',AC=' + jzN(fx2_amp(ev, 0.5, 1.2))) +
        'function pulse(x,c,w){var u=(x-c)/w;return u<0||u>1?0:(u<0.22?oc(u/0.22):1-ioc((u-0.22)/0.78));}var P=Math.max(pulse(p,0,0.36),0.8*pulse(p,0.44,0.56))*AC;\n';
    var L = jzAdjLayer(f.comp, 'JZ FX heartbeat', ev.t, ev.dur);
    var tr = fx2_xform(L, 'JZ Heartbeat Push', null); jzEX(tr, 4, hd + '100*(1+0.03*P)');
    // vignette: inverted feathered circle; alpha ramps 0 → 1 from r_in = M*(0.52-0.2P) to the corners
    var col = jzMixHex(fx2_vivid(sc), '#000000', dk ? 0.1 : 0.25), pk = dk ? 0.55 : 0.8, rin = M * 0.52, rc = (rin + R) / 2, SZ = Math.ceil(R * 2.6);
    var V = fx2_solid(f, 'JZ FX heartbeat vignette', col, SZ, SZ, ev.t, fx2_t1(ev));
    jzXf(V, 'ADBE Position').setValue([W / 2, H / 2]);
    fx2_maskEll(V, SZ / 2, SZ / 2, rc, rc, { feather: (R - rin) * 0.9, inv: true });
    jzSetExpr(jzXf(V, 'ADBE Scale'), hd + 'var k=((' + jzN(M) + '*(0.52-0.2*P))+' + jzN(R) + ')/2/' + jzN(rc) + ';[value[0]*k,value[1]*k]');
    jzSetExpr(jzXf(V, 'ADBE Opacity'), hd + 'Math.min(100,115*' + jzN(pk) + '*P)');
    V.blendingMode = dk ? BlendingMode.SCREEN : BlendingMode.MULTIPLY;
} });

// ================================================================ film / TV
/* ---- tvStatic — 砂嵐: TV snow over the frame with a rolling dark band and scan lines */
jzReg('fx', 'tvStatic', { build: function (f, ev) {
    var W = f.W, H = f.H, s = fx2_s(ev), sz = Math.max(1, Math.round(H / 540));
    var hd = fx2_head(ev, ',AC=' + jzN(fx2_amp(ev, 0.7, 1.1)) + ',SD=' + (s % 9973)) + 'var cov=(p<0.4?0.5+0.5*oq(p/0.4):1-oq((p-0.4)/0.6))*AC;\n';
    var N = jzEvSolid(f.comp, 'JZ FX tvStatic', '#7A7A7A', ev.t, ev.dur);
    var nz = jzEffect(N, 'ADBE Noise', 'JZ Snow'); jzEP(nz, 1, 100); jzEP(nz, 2, 0);
    var mo = jzEffect(N, 'ADBE Mosaic', 'JZ Snow Grain'); jzEP(mo, 1, Math.round(W / (2 * sz))); jzEP(mo, 2, Math.round(H / sz)); jzEP(mo, 3, 1);
    jzSetExpr(jzXf(N, 'ADBE Opacity'), hd + '100*Math.min(1,cov)');
    var S = jzEvShape(f.comp, 'JZ FX tvStatic bars', ev.t, ev.dur), g, i;
    jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*Math.min(1,cov)');
    for (i = 0; i < 4; i++) {
        g = jzGrp(S, 'line ' + (i + 1)); jzAddRect(g, W, Math.max(1, H * 0.003), 0, 0, 0); jzAddFill(g, '#FFFFFF', 50);
        fx2_gx(g, 'ADBE Vector Position', hd + 'seedRandom(SD+ST*3+' + (i * 17 + 4) + ',true);[' + jzN(W / 2) + ',random()*' + jzN(H) + ']');
    }
    g = jzGrp(S, 'band'); jzAddRect(g, W, H * 0.16, 0, 0, 0); jzAddFill(g, '#000000', 30);
    fx2_gx(g, 'ADBE Vector Position', hd + 'seedRandom(SD+ST*3,true);[' + jzN(W / 2) + ',(random()*1.2-0.1)*' + jzN(H) + '+' + jzN(H * 0.08) + ']');
} });

/* ---- dustScratches — フィルム傷: film dust, hairs and vertical scratches, a new set every 24 fps step */
jzReg('fx', 'dustScratches', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = fx2_s(ev), dk = fx2_dk(sc), M = Math.min(W, H), lw = Math.max(1, M * 0.0017), LT = '#FFFDF5', DKc = '#181008';
    var aEx = fx2_head(ev, ',AC=' + jzN(fx2_amp(ev, 0.6, 1.2))) + '100*Math.min(1,ahr(p,0.08,0.7)*AC)';
    var nS = 1 + (fx2_h(s, 3) % 3), steps = fx2_steps(ev, 12), k, i, g, st;
    for (k = 0; k < steps.length; k++) {
        st = steps[k].st * 31 + s;
        var S = fx2_span(jzEvShape(f.comp, 'JZ FX dustScratches', steps[k].t0, steps[k].t1 - steps[k].t0), steps[k].t0, steps[k].t1);
        jzSetExpr(jzXf(S, 'ADBE Opacity'), aEx);
        var nD = 7 + (fx2_h(st, 14) % 9);
        for (i = 0; i < nD; i++) {       // dust specks and hairs
            var x = fx2_r(st, i, 15) * W, y = fx2_r(st, i, 16) * H, r = M * fx2_rr(0.0018, 0.007, st, i, 17);
            var c = fx2_r(st, i, 18) < (dk ? 0.7 : 0.25) ? LT : DKc, op = 100 * fx2_rr(0.45, 0.9, st, i, 19);
            g = jzGrp(S, 'dust ' + (i + 1));
            if (fx2_r(st, i, 20) < 0.72) {
                jzAddEllipse(g, 2 * r, 2 * r * fx2_rr(0.45, 1, st, i, 21), 0, 0); jzAddFill(g, c, op);
                jzGX(g).property('ADBE Vector Position').setValue([x, y]); jzGX(g).property('ADBE Vector Rotation').setValue(fx2_r(st, i, 22) * 360);
            } else {
                var Lh = M * fx2_rr(0.02, 0.06, st, i, 23), an = fx2_r(st, i, 24) * 2 * Math.PI;
                var c1 = [Math.cos(an) * Lh * 0.4 + fx2_rs(st, i, 25) * Lh * 0.4, Math.sin(an) * Lh * 0.4], c2 = [Math.cos(an + 0.8) * Lh * 0.8, Math.sin(an + 0.8) * Lh * 0.8], e = [Math.cos(an + 0.3) * Lh, Math.sin(an + 0.3) * Lh];
                fx2_path(g, [[x, y], [x + e[0], y + e[1]]], [[0, 0], [c2[0] - e[0], c2[1] - e[1]]], [[c1[0], c1[1]], [0, 0]], false);
                jzAddStroke(g, c, lw * 0.8, op);
            }
        }
        for (i = 0; i < nS; i++) {       // scratches
            if (fx2_r(st, i, 4) < 0.18) continue;
            var sx = W * (0.1 + 0.8 * fx2_r(s, i, 5)) + fx2_rs(st, i, 6) * M * 0.012;
            var y0 = fx2_r(s, i, 7) < 0.5 ? -2 : H * 0.5 * fx2_r(st, i, 8), y1 = fx2_r(s, i, 9) < 0.5 ? H + 2 : y0 + H * fx2_rr(0.3, 0.7, st, i, 10);
            var q = [sx + fx2_rs(st, i, 12) * M * 0.008, (y0 + y1) / 2], ex = sx + fx2_rs(s, i, 13) * M * 0.006;
            g = jzGrp(S, 'scratch ' + (i + 1));
            fx2_path(g, [[sx, y0], [ex, y1]], [[0, 0], [(q[0] - ex) * 2 / 3, (q[1] - y1) * 2 / 3]], [[(q[0] - sx) * 2 / 3, (q[1] - y0) * 2 / 3], [0, 0]], false);
            var sk = jzAddStroke(g, dk ? LT : DKc, 1.4 * lw * fx2_rr(0.7, 1.7, s, i, 11), 70);
            try { sk.property('ADBE Vector Stroke Line Cap').setValue(2); } catch (e1) {}
        }
        g = jzGrp(S, 'flicker'); jzAddRect(g, W + 4, H + 4, 0, W / 2, H / 2); jzAddFill(g, fx2_r(st, 1) < 0.5 ? LT : DKc, 100 * 0.06 * fx2_r(st, 2));
    }
} });

// ================================================================ film strip / 3D / water
/* ---- filmAdvance — フィルム送り: the picture shrinks into a film gate with sprocket holes and the strip is pulled on by one frame */
jzReg('fx', 'filmAdvance', { build: function (f, ev) {
    var W = f.W, H = f.H, s = fx2_s(ev), dir = fx2_r(s, 1) < 0.7 ? 1 : -1, gap = Math.max(2, H * 0.03);
    var hd = fx2_head(ev, ',DIR=' + dir + ',GP=' + jzN(gap)) + 'var env=p<0.22?ioc(p/0.22):(p>0.78?1-ioc((p-0.78)/0.22):1);' +
        'var W=thisComp.width,H=thisComp.height,z=1-0.17*env,fw=W*z,fh=H*z,x0=(W-fw)/2,top=(H-fh)/2,q=ioc(cl((p-0.2)/0.6)),off=q*fh*DIR,hp=fh/4;\n';
    // the strip: Offset wraps the frame (one full frame per pull), then the Transform shrinks it into the gate
    var L = jzAdjLayer(f.comp, 'JZ FX filmAdvance', ev.t, ev.dur);
    var of = jzEffect(L, 'ADBE Offset', 'JZ Film Pull'); jzEX(of, 1, hd + '[W/2,H/2-q*H*DIR]');
    var tr = fx2_xform(L, 'JZ Film Gate', null); jzEX(tr, 4, hd + '100*z');
    // film base + frame lines + sprocket holes
    var S = jzEvShape(f.comp, 'JZ FX filmAdvance strip', ev.t, ev.dur), g, r, side, rep;
    for (side = 0; side < 2; side++) {
        g = jzGrp(S, side ? 'holes right' : 'holes left');
        r = jzAddRect(g, 10, 10, 0, 0, 0);
        jzSetExpr(r.property('ADBE Vector Rect Size'), hd + '[x0*0.42,hp*0.46]');
        jzSetExpr(r.property('ADBE Vector Rect Roundness'), hd + 'x0*0.084');
        var fl = jzAddFill(g, '#ECE6DA'); jzSetExpr(fl.property('ADBE Vector Fill Opacity'), hd + '(x0>3?90:0)*env');
        rep = jzVecs(g).addProperty('ADBE Vector Filter - Repeater');
        rep.property('ADBE Vector Repeater Copies').setValue(Math.ceil(4 / 0.8) + 3);
        jzSetExpr(rep.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position'), hd + '[0,hp]');
        fx2_gx(g, 'ADBE Vector Position', hd + 'var yc=top-off,y=((yc%hp)+hp)%hp-hp;[' + (side ? 'W-x0*0.29-x0*0.21' : 'x0*0.29+x0*0.21') + ',y+hp/2]');
    }
    g = jzGrp(S, 'frame lines');
    for (side = 0; side < 2; side++) {
        r = jzAddRect(g, 10, 10, 0, 0, 0);
        jzSetExpr(r.property('ADBE Vector Rect Size'), hd + '[fw+2,GP*env]');
        jzSetExpr(r.property('ADBE Vector Rect Position'), hd + 'var sy=top+(((-off)%fh)+fh)%fh;[W/2,sy' + (side ? '+fh' : '') + ']');
    }
    jzAddFill(g, '#0D0B09');
    g = jzGrp(S, 'film base');
    jzAddRect(g, W + 8, H + 8, 0, W / 2, H / 2);
    r = jzAddRect(g, W, H, 0, W / 2, H / 2); jzSetExpr(r.property('ADBE Vector Rect Size'), hd + '[fw,fh]');
    fx2_eo(jzAddFill(g, '#0D0B09'));
} });

/* ---- perspectiveTilt — パース揺れ: the frame swings in 3D around its vertical (or horizontal) axis — perspective strips of picture copies */
jzReg('fx', 'perspectiveTilt', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = fx2_s(ev), cols = fx2_r(s, 1) < (W >= H ? 0.7 : 0.35), dir = fx2_r(s, 2) < 0.5 ? 1 : -1;
    var PH = dir * (30 + 10 * fx2_r(s, 3)) * fx2_amp(ev, 0.5, 1.2), Lx = cols ? W : H, Mx = cols ? H : W, N = 10, i;
    jzEvSolid(f.comp, 'JZ FX perspectiveTilt ground', fx2_dk(sc) ? sc.bg : jzMixHex(sc.bg, sc.fg, 0.1), ev.t, ev.dur);
    var hd = fx2_head(ev, ',PH=' + jzN(PH) + ',HL=' + jzN(Lx / 2) + ',DD=' + jzN(1.15 * Math.max(W, H)) + ',MX=' + jzN(Mx)) +
        'var e=p<0.25?oc(p/0.25):Math.cos((p-0.25)/0.75*Math.PI*1.5)*Math.exp(-2.6*(p-0.25)/0.75);var ph=PH*e*Math.PI/180,co=Math.cos(ph),si=Math.sin(ph);' +
        'function pp(u){return DD/(DD+u*HL*si);}function dd(u){return HL+u*HL*co*pp(u);}\n';
    for (i = 0; i < N; i++) {
        var s0 = i * Lx / N, s1 = (i + 1) * Lx / N;
        var sx = hd + 'var d0=dd(' + jzN(-1 + 2 * i / N) + '),d1=dd(' + jzN(-1 + 2 * (i + 1) / N) + '),h=MX*(pp(' + jzN(-1 + 2 * i / N) + ')+pp(' + jzN(-1 + 2 * (i + 1) / N) + '))/2;\n';
        fx2_copies(f, ev, 'perspectiveTilt', function (L, isM) {
            if (cols) fx2_cropMask(L, s0 - 1, -20, s1 + 1, H + 20); else fx2_cropMask(L, -20, s0 - 1, W + 20, s1 + 1);
            var tr = fx2_xform(L, 'JZ Perspective Strip', cols ? [(s0 + s1) / 2, H / 2] : [W / 2, (s0 + s1) / 2]);
            jzEP(tr, 3, 0);
            jzEX(tr, 2, sx + (cols ? '[(d0+d1)/2,' + jzN(H / 2) + ']' : '[' + jzN(W / 2) + ',(d0+d1)/2]'));
            jzEX(tr, cols ? 5 : 4, sx + '(d1-d0)/' + jzN(s1 - s0) + '*100');
            jzEX(tr, cols ? 4 : 5, sx + 'h/MX*100');
        });
    }
} });

/* ---- ripple — 波紋: a water ripple spreads from a drop point (Ripple locked to the wave front) + crest highlights */
jzReg('fx', 'ripple', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = fx2_s(ev), dk = fx2_dk(sc), M = Math.min(W, H);
    var cx = W * (0.5 + fx2_rs(s, 1) * 0.1), cy = H * (0.5 + fx2_rs(s, 2) * 0.08), lam = M * 0.1;
    var Rmax = fx2_hyp(Math.max(cx, W - cx), Math.max(cy, H - cy));
    var hd = fx2_head(ev, ',RM=' + jzN(Rmax) + ',LAM=' + jzN(lam) + ',A0=' + jzN(M * 0.022 * fx2_amp(ev, 0.5, 1.3)) + ',HD=' + jzN(fx2_hyp(W, H) / 2)) +
        'var front=(0.05+0.95*oq(p))*RM*1.05,A=A0*(1-0.7*p);\n';
    var L = jzAdjLayer(f.comp, 'JZ FX ripple', ev.t, ev.dur);
    var rp = jzEffect(L, 'ADBE Ripple', 'JZ Ripple');
    jzEX(rp, 1, hd + 'Math.min(100,(front+LAM*0.3)/HD*100)'); jzEP(rp, 2, [cx, cy]); jzEP(rp, 4, 0); jzEP(rp, 5, lam);
    jzEX(rp, 6, hd + '2*A'); jzEX(rp, 7, hd + 'front/LAM*360');
    var S = jzEvShape(f.comp, 'JZ FX ripple crests', ev.t, ev.dur), j, g, el, sk;
    S.blendingMode = dk ? BlendingMode.SCREEN : BlendingMode.MULTIPLY;
    for (j = 2; j >= 0; j--) {
        g = jzGrp(S, 'crest ' + (j + 1)); el = jzAddEllipse(g, 10, 10, 0, 0);
        jzGX(g).property('ADBE Vector Position').setValue([cx, cy]);
        jzSetExpr(el.property('ADBE Vector Ellipse Size'), hd + 'var rc=Math.max(0,front-LAM*' + jzN(j + 0.25) + ');[2*rc,2*rc]');
        sk = jzAddStroke(g, dk ? '#FFFFFF' : jzMixHex(sc.fg, sc.bg, 0.4), Math.max(1, lam / 5 * 0.9), 100);
        jzSetExpr(sk.property('ADBE Vector Stroke Opacity'), hd + 'var rc=front-LAM*' + jzN(j + 0.25) + ';rc>2?100*' + jzN(0.16 * Math.exp(-j * 0.9)) + '*(1-0.6*p)*' + (dk ? '1.6' : '1.2') + ':0');
    }
} });

// ================================================================ manga / graphic overlays
/* ---- focusLines — 集中線: thin wedges converging on the centre, redrawn every 24 fps step like hand-drawn animation */
jzReg('fx', 'focusLines', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = fx2_s(ev), M = Math.min(W, H), PI = Math.PI;
    var cx = W / 2 + fx2_rs(s, 1) * W * 0.03, cy = H / 2 + fx2_rs(s, 2) * H * 0.03, R = fx2_hyp(W, H) * 0.75, n = 90 + (fx2_h(s, 3) % 50);
    var aEx = fx2_head(ev) + '85*ahr(p,0.1,0.72)', steps = fx2_steps(ev, 12), k, i, ink = fx2_ink(sc);
    for (k = 0; k < steps.length; k++) {
        var km = jzClamp(((steps[k].t0 + steps[k].t1) / 2 - ev.t) / Math.max(ev.dur, 0.001), 0, 1);
        var a = km < 0.1 ? 1 - Math.pow(1 - km / 0.1, 3) : (km > 0.72 ? 1 - Math.pow((km - 0.72) / 0.28, 3) : 1);
        var st = steps[k].st * 5 + s, rx = W * (0.4 + 0.06 * (1 - a)), ry = H * (0.34 + 0.06 * (1 - a));
        var S = fx2_span(jzEvShape(f.comp, 'JZ FX focusLines', steps[k].t0, steps[k].t1 - steps[k].t0), steps[k].t0, steps[k].t1);
        jzSetExpr(jzXf(S, 'ADBE Opacity'), aEx);
        var g = jzGrp(S, 'lines');
        for (i = 0; i < n; i++) {
            var an = (i + fx2_r(st, i, 4) * 0.8) / n * 2 * PI, w = M * fx2_rr(0.002, 0.011, st, i, 5), tip = fx2_rr(1.0, 1.45, st, i, 6);
            var tx = cx + Math.cos(an) * rx * tip, ty = cy + Math.sin(an) * ry * tip, nx = -Math.sin(an), ny = Math.cos(an), ox = cx + Math.cos(an) * R, oy = cy + Math.sin(an) * R;
            fx2_path(g, [[tx, ty], [ox + nx * w, oy + ny * w], [ox - nx * w, oy - ny * w]], null, null, true);
        }
        jzAddFill(g, ink);
    }
} });

/* ---- speedLines — 流線: tapered streaks racing across the frame, clear of the centre band */
jzReg('fx', 'speedLines', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = fx2_s(ev), vert = W < H ? fx2_r(s, 1) < 0.5 : fx2_r(s, 1) < 0.15, dir = fx2_r(s, 2) < 0.5 ? 1 : -1;
    var Lx = vert ? H : W, Mx = vert ? W : H, n = 22 + (fx2_h(s, 3) % 12), c1 = fx2_ink(sc), c2 = fx2_vivid(sc), i;
    var hd = fx2_head(ev, ',LX=' + jzN(Lx)) + 'var a=ahr(p,0.12,0.7);\n';
    var S = jzEvShape(f.comp, 'JZ FX speedLines', ev.t, ev.dur);
    for (i = 0; i < n; i++) {
        var q = fx2_r(s, i, 4);
        if (Math.abs(q - 0.5) < 0.12 && fx2_r(s, i, 9) < 0.8) q = q < 0.5 ? 0.38 - fx2_r(s, i, 10) * 0.33 : 0.62 + fx2_r(s, i, 10) * 0.33;
        var pp = q * Mx, len = Lx * fx2_rr(0.15, 0.55, s, i, 5), th = Math.max(1, Mx * fx2_rr(0.002, 0.008, s, i, 6)), sp = fx2_rr(1.3, 2.6, s, i, 7);
        var g = jzGrp(S, 'streak ' + (i + 1)), tl = -len * dir;
        if (!vert) fx2_path(g, [[tl, 0], [0, -th / 2], [0, th / 2]], null, null, true); else fx2_path(g, [[0, tl], [-th / 2, 0], [th / 2, 0]], null, null, true);
        jzAddFill(g, fx2_r(s, i, 12) < 0.22 ? c2 : c1);
        var he = hd + 'var fr=(' + jzN(fx2_r(s, i, 8)) + '+p*' + jzN(sp) + ')%1;var hx=' + jzN(-len * 0.2) + '+fr*(LX+' + jzN(len * 1.2) + ');' + (dir > 0 ? '' : 'hx=LX-hx;');
        fx2_gx(g, 'ADBE Vector Position', he + (vert ? '[' + jzN(pp) + ',hx]' : '[hx,' + jzN(pp) + ']'));
        fx2_gx(g, 'ADBE Vector Group Opacity', hd + '100*a*' + jzN(fx2_rr(0.4, 0.9, s, i, 11)));
    }
} });

/* ---- starGlint — キラッ: 8-point glints popping in sequence around the lyric band */
jzReg('fx', 'starGlint', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = fx2_s(ev), dk = fx2_dk(sc), M = Math.min(W, H), col = fx2_vivid(sc), n = 2 + (fx2_h(s, 1) % 3), port = H > W;
    var ac = fx2_amp(ev, 0.6, 1.3), i, j, PI = Math.PI;
    var G = jzEvShape(f.comp, 'JZ FX starGlint glow', ev.t, ev.dur), S = jzEvShape(f.comp, 'JZ FX starGlint', ev.t, ev.dur);
    G.blendingMode = dk ? BlendingMode.SCREEN : BlendingMode.NORMAL;
    var gb = jzEffect(G, 'ADBE Gaussian Blur 2', 'JZ Glint Glow'); jzEP(gb, 1, M * 0.05);
    for (i = 0; i < n; i++) {
        var t0 = i * 0.16 + fx2_r(s, i, 4) * 0.06, R = M * (0.1 + 0.07 * fx2_r(s, i, 5)) * ac;
        var x = W * (0.5 + fx2_rs(s, i, 2) * (port ? 0.3 : 0.34)), y = H * (0.5 + fx2_rs(s, i, 3) * (port ? 0.14 : 0.1));
        var hd = fx2_head(ev) + 'var u=(p-' + jzN(t0) + ')/0.55;var g=(u>0&&u<1)?Math.pow(Math.sin(Math.PI*u),0.8):0;\n';
        var pts = [];
        for (j = 0; j < 16; j++) { var an = j * PI / 8, rr = j % 2 ? R * 0.07 : (j % 4 === 0 ? R : R * 0.42); pts.push([Math.cos(an) * rr, Math.sin(an) * rr]); }
        var g = jzGrp(S, 'glint ' + (i + 1));
        jzAddEllipse(g, R * 0.16, R * 0.16, 0, 0); jzAddFill(g, '#FFFFFF');
        var gs = fx2_sub(g, 'star'); fx2_path(gs, pts, null, null, true); jzAddFill(gs, dk ? '#FFFFFF' : col);
        jzGX(g).property('ADBE Vector Position').setValue([x, y]);
        fx2_gx(g, 'ADBE Vector Scale', hd + '[100*g,100*g]');
        fx2_gx(g, 'ADBE Vector Rotation', hd + jzN(fx2_rs(s, i, 6) * 12) + '+u*30');
        var gg = jzGrp(G, 'glow ' + (i + 1));
        jzAddEllipse(gg, R * 0.8, R * 0.8, 0, 0); jzAddFill(gg, col, 70);
        jzGX(gg).property('ADBE Vector Position').setValue([x, y]);
        fx2_gx(gg, 'ADBE Vector Scale', hd + '[100*g,100*g]');
    }
} });

/* ---- colorBars — カラーバー: thin scheme-coloured bars sweeping across the frame at different speeds */
jzReg('fx', 'colorBars', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = fx2_s(ev), vert = fx2_r(s, 1) < (W >= H ? 0.35 : 0.15), dir = fx2_r(s, 2) < 0.5 ? 1 : -1;
    var src = [sc.accent, sc.accent2, sc.ghostA, sc.ghostB, sc.fg], cols = [], i;
    for (i = 0; i < src.length; i++) if (src[i] && jzContrast(src[i], sc.bg) > 1.35) cols.push(src[i]);
    if (!cols.length) cols = [fx2_ink(sc)];
    var Lx = vert ? W : H, Mx = vert ? H : W, n = 4 + (fx2_h(s, 3) % 4);
    var S = jzEvShape(f.comp, 'JZ FX colorBars', ev.t, ev.dur);
    for (i = 0; i < n; i++) {
        var th = Math.max(2, Lx * fx2_rr(0.008, 0.045, s, i, 4)), d = fx2_r(s, i, 5) * 0.4, sp = fx2_rr(0.9, 1.5, s, i, 6);
        var part = fx2_r(s, i, 7) < 0.4, m0 = part ? Mx * fx2_rr(0, 0.5, s, i, 8) : 0, mw = part ? Mx * fx2_rr(0.3, 0.6, s, i, 9) : Mx;
        var g = jzGrp(S, 'bar ' + (i + 1));
        if (vert) jzAddRect(g, th, mw, 0, 0, 0); else jzAddRect(g, mw, th, 0, 0, 0);
        jzAddFill(g, cols[(i + (fx2_h(s, 10) % cols.length)) % cols.length], 92);
        var hd = fx2_head(ev) + 'var u=cl((p-' + jzN(d) + ')/' + jzN(1 - d) + '*' + jzN(sp) + ');var ps=' + jzN(-th) + '+' + jzN(Lx + 2 * th) + '*u;' + (dir < 0 ? 'ps=' + jzN(Lx) + '-ps;' : '') + '\n';
        fx2_gx(g, 'ADBE Vector Position', hd + (vert ? '[ps,' + jzN(m0 + mw / 2) + ']' : '[' + jzN(m0 + mw / 2) + ',ps]'));
        fx2_gx(g, 'ADBE Vector Group Opacity', hd + '(u<=0||u>=1)?0:100');
    }
} });

/* ---- zoomStutter — ズーム連打: three hard zoom steps, each with its own slight focus shift */
jzReg('fx', 'zoomStutter', { build: function (f, ev) {
    var W = f.W, H = f.H, s = fx2_s(ev), a = fx2_amp(ev, 0.5, 1.3), z0 = (0.035 + 0.012 * fx2_r(s, 1)) * a, j, cx = [], cy = [];
    for (j = 0; j < 3; j++) { cx.push(jzN(W * (0.5 + fx2_rs(s, 2, j) * 0.04))); cy.push(jzN(H * (0.5 + fx2_rs(s, 3, j) * 0.04))); }
    var hd = fx2_head(ev) + 'var j=Math.min(2,Math.floor(p*3)),CX=[' + cx.join(',') + '],CY=[' + cy.join(',') + '];\n';
    var L = jzAdjLayer(f.comp, 'JZ FX zoomStutter', ev.t, ev.dur);
    var tr = fx2_xform(L, 'JZ Zoom Stutter', null);
    jzEX(tr, 1, hd + '[CX[j],CY[j]]'); jzEX(tr, 2, hd + '[CX[j],CY[j]]'); jzEX(tr, 4, hd + '100*(1+(j+1)*' + jzN(z0) + ')');
} });

// ================================================================ graphic inversions / stylise
/* ---- negativeRing — 反転リング: an inverted ring (circle or diamond) bursts out from the centre, a thinner echo ring follows */
jzReg('fx', 'negativeRing', { build: function (f, ev) {
    var W = f.W, H = f.H, s = fx2_s(ev), M = Math.min(W, H), dia = fx2_r(s, 1) < 0.35, a = fx2_amp(ev, 0.6, 1.3);
    var cx = W / 2 + fx2_rs(s, 2) * W * 0.05, cy = H / 2 + fx2_rs(s, 3) * H * 0.05, Rm = fx2_hyp(W, H) * (dia ? 0.75 : 0.56);
    var S = jzEvShape(f.comp, 'JZ FX negativeRing', ev.t, ev.dur), rings = [['p*1.05+0.04', M * 0.16 * a], ['(p-0.22)*1.35', M * 0.05 * a]], k, j;
    S.blendingMode = BlendingMode.DIFFERENCE;
    for (k = rings.length - 1; k >= 0; k--) {
        var hd = fx2_head(ev) + 'var q=' + rings[k][0] + ',on=q>0&&q<1,r=on?oc(q)*' + jzN(Rm) + ':0,r0=on?Math.max(0,r-' + jzN(rings[k][1]) + '*(1-0.55*q)):0;\n';
        var g = jzGrp(S, 'ring ' + (k + 1));
        for (j = 0; j < 2; j++) {
            var rx = j ? 'r0' : 'r';
            if (dia) {
                var st = jzVecs(g).addProperty('ADBE Vector Shape - Star');
                st.property('ADBE Vector Star Type').setValue(2); st.property('ADBE Vector Star Points').setValue(4);
                jzSetExpr(st.property('ADBE Vector Star Outer Radius'), hd + 'Math.max(0.01,' + rx + ')');
            } else {
                var el = jzAddEllipse(g, 10, 10, 0, 0);
                jzSetExpr(el.property('ADBE Vector Ellipse Size'), hd + '[2*' + rx + ',2*' + rx + ']');
            }
        }
        fx2_eo(jzAddFill(g, '#FFFFFF'));
        jzGX(g).property('ADBE Vector Position').setValue([cx, cy]);
        fx2_gx(g, 'ADBE Vector Group Opacity', hd + 'on?100:0');
    }
} });

/* ---- edgeDetect — 輪郭抽出: neon outlines on a darkened ground (dark schemes) / an ink line drawing on the paper (light ones) */
jzReg('fx', 'edgeDetect', { build: function (f, ev) {
    var sc = ev.sc, dk = fx2_dk(sc);
    var L = jzAdjLayer(f.comp, 'JZ FX edgeDetect', ev.t, ev.dur);
    var gb = jzEffect(L, 'ADBE Gaussian Blur 2', 'JZ Edge Denoise'); jzEP(gb, 1, 2.5 * f.u); jzEP(gb, 3, 1);
    var fe = jzEffect(L, 'ADBE Find Edges', 'JZ Edges'); jzEP(fe, 1, dk ? 1 : 0);
    var tn = jzEffect(L, 'ADBE Tint', 'JZ Edge Colours');
    if (dk) { jzEP(tn, 1, jzHex(jzMixHex(sc.bg, '#000000', 0.6))); jzEP(tn, 2, jzHex(jzMixHex(fx2_vivid(sc), '#FFFFFF', 0.45))); }
    else { jzEP(tn, 1, jzHex(fx2_ext([sc.fg, sc.ink, '#111111'], true))); jzEP(tn, 2, jzHex(sc.bg)); }
    jzEP(tn, 3, 100);
    jzSetExpr(jzXf(L, 'ADBE Opacity'), fx2_head(ev) + '100*ahr(p,0.1,0.72)');
} });

/* ---- shatter — ガラス割れ: cracks on the frame, then the shards slip apart and knit back (rings x alternating sectors) */
jzReg('fx', 'shatter', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = fx2_s(ev), M = Math.min(W, H), dk = fx2_dk(sc), a = fx2_amp(ev, 0.6, 1.3), PI = Math.PI;
    var px = W * (0.5 + fx2_rs(s, 1) * 0.15), py = H * (0.5 + fx2_rs(s, 2) * 0.12), n = 9 + (fx2_h(s, 3) % 4), i, j, par;
    var radii = [0, M * fx2_rr(0.1, 0.17, s, 4), M * fx2_rr(0.32, 0.45, s, 5), fx2_hyp(W, H) * 1.1], ang = [];
    for (i = 0; i < n; i++) ang.push((i + fx2_rs(s, i, 6) * 0.35) / n * 2 * PI);
    function V(i2, j2) {
        if (!j2) return [px, py];
        var q = ang[i2 % n] + fx2_rs(s, i2 % n, j2, 7) * 0.12, r = radii[j2] * (j2 < 3 ? 1 + fx2_rs(s, i2 % n, j2, 8) * 0.18 : 1);
        return [px + Math.cos(q) * r, py + Math.sin(q) * r];
    }
    function shard(i2, j2) { return j2 ? [V(i2, j2), V(i2 + 1, j2), V(i2 + 1, j2 + 1), V(i2, j2 + 1)] : [V(i2, 0), V(i2, 1), V(i2 + 1, 1)]; }
    var hd = fx2_head(ev) + 'var u=(p-0.125)/0.875,sep=u<=0?0:(u<0.28?oc(u/0.28):1-ioc((u-0.28)/0.72)),crack=u<=0?1:Math.max(0,1-u*1.4);\n';
    // content of each ring slips outwards (+ a small twist, alternating per sector) inside the static shard outlines
    var dist = [radii[1] * 0.6, (radii[1] + radii[2]) / 2, radii[2] * 1.5], rot = [2.5, 1.5, 0.8];
    for (j = 0; j < 3; j++) for (par = 0; par < 2; par++) {
        var L = jzAdjLayer(f.comp, 'JZ FX shatter ring ' + (j + 1), ev.t, ev.dur), cnt = 0;
        for (i = par; i < n; i += 2) { fx2_maskPts(L, shard(i, j)); cnt++; }
        if (!cnt) { L.remove(); continue; }
        var dj = M * (dk ? 0.04 : 0.028) * a * (0.75 + 0.3 * j);
        var tr = fx2_xform(L, 'JZ Shard Slip', [px, py]);
        jzEX(tr, 4, hd + '100*(1+sep*' + jzN(dj / dist[j]) + ')');
        jzEX(tr, 8, hd + 'sep*' + jzN(rot[j] * (par ? 1 : -1) * (fx2_rs(s, j, 10) < 0 ? -1 : 1)));
    }
    // crack lines
    var S = jzEvShape(f.comp, 'JZ FX shatter cracks', ev.t, ev.dur), g = jzGrp(S, 'cracks');
    for (i = 0; i < n; i++) for (j = 0; j < 3; j++) fx2_path(g, shard(i, j), null, null, true);
    var sk = jzAddStroke(g, dk ? '#FFFFFF' : fx2_ext([sc.fg, sc.ink], true), Math.max(1.5, M * 0.0025), 100);
    jzSetExpr(sk.property('ADBE Vector Stroke Opacity'), hd + (dk ? '75' : '60') + '*Math.max(crack,sep*0.6)');
    // the dark gaps that open between the drifting shards (the browser's background showing through)
    var gk = jzAddStroke(g, dk ? '#000000' : jzMixHex(sc.bg, '#000000', 0.55), 1, 100);
    jzSetExpr(gk.property('ADBE Vector Stroke Width'), hd + 'Math.max(0.1,sep*' + jzN(M * (dk ? 0.04 : 0.028) * a * 0.7) + ')');
    jzSetExpr(gk.property('ADBE Vector Stroke Opacity'), hd + 'sep>0.01?100:0');
    try { sk.property('ADBE Vector Stroke Line Join').setValue(2); gk.property('ADBE Vector Stroke Line Join').setValue(2); } catch (e1) {}
    // impact flash
    var F = jzEvSolid(f.comp, 'JZ FX shatter flash', '#FFFFFF', ev.t, ev.dur);
    fx2_maskEll(F, px, py, M * 0.14, M * 0.14, { feather: M * 0.2 });
    F.blendingMode = dk ? BlendingMode.SCREEN : BlendingMode.NORMAL;
    jzSetExpr(jzXf(F, 'ADBE Opacity'), hd + 'p<0.1875?85*(1-p/0.1875):0');
} });

/* ---- defocus — ピンぼけ: the picture drops out of focus (peak at the cut) and snaps back */
jzReg('fx', 'defocus', { build: function (f, ev) {
    var hd = fx2_head(ev, ',AC=' + jzN(fx2_amp(ev, 0.6, 1.2))) + 'var amt=(p<0.5?ioc(p/0.5):1-ioc((p-0.5)/0.5))*AC;\n';
    var L = jzAdjLayer(f.comp, 'JZ FX defocus', ev.t, ev.dur);
    var gb = jzEffect(L, 'ADBE Gaussian Blur 2', 'JZ Defocus'); jzEX(gb, 1, hd + 'amt*thisComp.height/27'); jzEP(gb, 3, 1);
    var tr = fx2_xform(L, 'JZ Defocus Breathe', null); jzEX(tr, 4, hd + '100*(1+0.025*amt)');
    jzSetExpr(jzXf(L, 'ADBE Opacity'), hd + '100*Math.min(1,amt*1.8)');
} });

/* ---- snapshot — シャッター: white flash, the frame becomes a tilted instant photo on a dimmed backdrop, then zooms back */
jzReg('fx', 'snapshot', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = fx2_s(ev), M = Math.min(W, H), D = fx2_hyp(W, H);
    var RT = (fx2_r(s, 1) < 0.5 ? -1 : 1) * (2 + 2.5 * fx2_r(s, 2));
    var hd = fx2_head(ev, ',RT=' + jzN(RT) + ',MM=' + jzN(M)) + 'var env=p<0.16?ob(p/0.16,1.4):(p>0.8?1-ioc((p-0.8)/0.2):1);' +
        'var W=thisComp.width,H=thisComp.height,z=1-0.15*env,rot=RT*env,bw=MM*0.024*cl(env),fw=W*z,fh=H*z,bb=bw*3.2;\n';
    var L = jzAdjLayer(f.comp, 'JZ FX snapshot', ev.t, ev.dur);
    var tr = fx2_xform(L, 'JZ Snapshot Photo', null); jzEX(tr, 4, hd + '100*z'); jzEX(tr, 8, hd + 'rot');
    // print border, drop shadow and dimmed backdrop around the photo (even-odd fills with the photo cut out)
    var S = jzEvShape(f.comp, 'JZ FX snapshot print', ev.t, ev.dur), g, r, fl;
    jzXf(S, 'ADBE Position').setValue([W / 2, H / 2]);
    jzSetExpr(jzXf(S, 'ADBE Rotate Z'), hd + 'rot');
    var OUT = '[fw+2*bw,fh+bw+bb]', OUTP = '[0,(bb-bw)/2]';
    g = jzGrp(S, 'border');
    r = jzAddRect(g, 10, 10, 0, 0, 0); jzSetExpr(r.property('ADBE Vector Rect Size'), hd + OUT); jzSetExpr(r.property('ADBE Vector Rect Position'), hd + OUTP);
    r = jzAddRect(g, 10, 10, 0, 0, 0); jzSetExpr(r.property('ADBE Vector Rect Size'), hd + '[fw,fh]');
    fx2_eo(jzAddFill(g, '#F7F5F0'));
    g = jzGrp(S, 'shadow');
    r = jzAddRect(g, 10, 10, 0, 0, 0); jzSetExpr(r.property('ADBE Vector Rect Size'), hd + OUT); jzSetExpr(r.property('ADBE Vector Rect Position'), hd + '[MM*0.012,(bb-bw)/2+MM*0.02]');
    r = jzAddRect(g, 10, 10, 0, 0, 0); jzSetExpr(r.property('ADBE Vector Rect Size'), hd + OUT); jzSetExpr(r.property('ADBE Vector Rect Position'), hd + OUTP);
    fl = fx2_eo(jzAddFill(g, '#000000')); jzSetExpr(fl.property('ADBE Vector Fill Opacity'), hd + '30*cl(env)');
    g = jzGrp(S, 'backdrop');
    jzAddRect(g, D * 2.2, D * 2.2, 0, 0, 0);
    r = jzAddRect(g, 10, 10, 0, 0, 0); jzSetExpr(r.property('ADBE Vector Rect Size'), hd + OUT); jzSetExpr(r.property('ADBE Vector Rect Position'), hd + OUTP);
    fl = fx2_eo(jzAddFill(g, jzMixHex(sc.bg, '#000000', fx2_dk(sc) ? 0.5 : 0.45))); jzSetExpr(fl.property('ADBE Vector Fill Opacity'), hd + '100*cl(env*1.2)');
    // shutter flash
    var F = jzEvSolid(f.comp, 'JZ FX snapshot flash', '#FFFFFF', ev.t, ev.dur);
    jzSetExpr(jzXf(F, 'ADBE Opacity'), hd + 'p<0.22?90*(1-p/0.22):0');
} });

/* ---- squash — 伸縮: elastic squash & stretch of the whole frame (damped spring) */
jzReg('fx', 'squash', { build: function (f, ev) {
    var W = f.W, H = f.H, s = fx2_s(ev), hor = fx2_r(s, 1) < 0.6;
    var hd = fx2_head(ev, ',AC=' + jzN(fx2_amp(ev, 0.5, 1.3))) + 'var e=Math.cos(p*Math.PI*2.5)*Math.exp(-1.8*p)*(1-Math.pow(p,6)),a=0.17*AC*e;' +
        'var sx=' + (hor ? '1+a' : '1-a*0.6') + ',sy=' + (hor ? '1-a*0.6' : '1+a') + ',W=thisComp.width,H=thisComp.height,gx=Math.max(0,(W-W*sx)/2)+1,gy=Math.max(0,(H-H*sy)/2)+1;\n';
    var L = jzAdjLayer(f.comp, 'JZ FX squash', ev.t, ev.dur);
    var tr = fx2_xform(L, 'JZ Squash', null); jzEP(tr, 3, 0); jzEX(tr, 4, hd + '100*sy'); jzEX(tr, 5, hd + '100*sx');
    // the browser paints the background first: bg-coloured margins where the squashed frame leaves the edges
    var S = jzEvShape(f.comp, 'JZ FX squash margins', ev.t, ev.dur), g = jzGrp(S, 'margins'), k, r;
    var geo = [['[gx,H+4]', '[gx/2,H/2]'], ['[gx,H+4]', '[W-gx/2,H/2]'], ['[W+4,gy]', '[W/2,gy/2]'], ['[W+4,gy]', '[W/2,H-gy/2]']];
    for (k = 0; k < 4; k++) { r = jzAddRect(g, 10, 10, 0, 0, 0); jzSetExpr(r.property('ADBE Vector Rect Size'), hd + geo[k][0]); jzSetExpr(r.property('ADBE Vector Rect Position'), hd + geo[k][1]); }
    jzAddFill(g, ev.sc.bg);
} });

/* ---- scanBar — スキャン: a glowing bar sweeps the frame; what it has not reached is dimmed, rows just behind it jitter */
jzReg('fx', 'scanBar', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = fx2_s(ev), dk = fx2_dk(sc), down = fx2_r(s, 1) < 0.7, bh = H * 0.05, band = Math.max(3, Math.round(H * 0.035));
    var col = dk ? jzMixHex(fx2_vivid(sc), '#FFFFFF', 0.4) : fx2_vivid(sc), t1 = fx2_t1(ev);
    var hd = fx2_head(ev, ',BH=' + jzN(bh) + ',HH=' + jzN(H) + ',BD=' + band + ',SD=' + (s % 9973)) + 'var yy=-BH+p*(HH+2*BH),y=' + (down ? 'yy' : 'HH-yy') + ';\n';
    // the jittering rows behind the bar: a thin adjustment strip that follows it
    // (full-frame adjustment with a band mask, moved along: its effect stays limited to the band)
    var J = jzAdjLayer(f.comp, 'JZ FX scanBar jitter', ev.t, ev.dur);
    fx2_maskRect(J, -4, H / 2 - band / 2, W + 4, H / 2 + band / 2);
    jzSetExpr(jzXf(J, 'ADBE Position'), hd + '[' + jzN(W / 2) + ',Math.max(BD/2,Math.min(HH-BD/2,' + (down ? 'y-BD/2' : 'y+BD/2') + '))]');
    var ww = jzEffect(J, 'ADBE Wave Warp', 'JZ Scan Jitter');
    jzEP(ww, 1, 2); jzEP(ww, 3, Math.max(2, 2 * band / 3)); jzEP(ww, 4, 0); jzEP(ww, 5, 0); jzEP(ww, 6, 1);
    jzEX(ww, 2, hd + 'seedRandom(SD+ST*3,true);random(0.3,1)*' + jzN(W * 0.012));
    jzEX(ww, 7, hd + 'seedRandom(SD+ST*3+1,true);random()<0.5?0:180');
    // dimmed unscanned part + the bright line
    var S = jzEvShape(f.comp, 'JZ FX scanBar', ev.t, ev.dur), g, r;
    g = jzGrp(S, 'line'); r = jzAddRect(g, W + 4, Math.max(2, H * 0.003), 0, 0, 0); jzAddFill(g, dk ? '#FFFFFF' : col, 90);
    fx2_gx(g, 'ADBE Vector Position', hd + '[' + jzN(W / 2) + ',y]');
    g = jzGrp(S, 'dim'); r = jzAddRect(g, 10, 10, 0, 0, 0); jzAddFill(g, dk ? '#000000' : sc.bg, dk ? 60 : 70);
    if (down) { jzSetExpr(r.property('ADBE Vector Rect Size'), hd + '[' + jzN(W + 4) + ',Math.max(0,HH-Math.max(0,y))]'); jzSetExpr(r.property('ADBE Vector Rect Position'), hd + '[' + jzN(W / 2) + ',(Math.max(0,y)+HH)/2]'); }
    else { jzSetExpr(r.property('ADBE Vector Rect Size'), hd + '[' + jzN(W + 4) + ',Math.max(0,Math.min(HH,y))]'); jzSetExpr(r.property('ADBE Vector Rect Position'), hd + '[' + jzN(W / 2) + ',Math.max(0,Math.min(HH,y))/2]'); }
    // glow around the line
    var G = fx2_solid(f, 'JZ FX scanBar glow', col, W, bh * 2, ev.t, t1);
    fx2_maskRect(G, -bh, bh * 0.55, W + bh, bh * 1.45, { feather: bh * 0.9 });
    jzSetExpr(jzXf(G, 'ADBE Position'), hd + '[' + jzN(W / 2) + ',y]');
    jzXf(G, 'ADBE Opacity').setValue(dk ? 55 : 40);
    G.blendingMode = dk ? BlendingMode.SCREEN : BlendingMode.MULTIPLY;
} });

/* ---- loopScroll — 横ループ: the whole frame scrolls one full width (wrapping) with motion blur, ending where it started */
jzReg('fx', 'loopScroll', { build: function (f, ev) {
    var W = f.W, H = f.H, s = fx2_s(ev), vert = W < H ? fx2_r(s, 1) < 0.6 : fx2_r(s, 1) < 0.2, dir = fx2_r(s, 2) < 0.5 ? 1 : -1, Lx = vert ? H : W;
    var hd = fx2_head(ev, ',LX=' + jzN(Lx) + ',DIR=' + dir) + 'var o=ioc(p)*LX*DIR,v=p<0.5?12*p*p:12*(1-p)*(1-p),bl=LX*0.05*v/3;\n';
    var L = jzAdjLayer(f.comp, 'JZ FX loopScroll', ev.t, ev.dur);
    var of = jzEffect(L, 'ADBE Offset', 'JZ Loop Scroll');
    jzEX(of, 1, hd + (vert ? '[' + jzN(W / 2) + ',' + jzN(H / 2) + '+o]' : '[' + jzN(W / 2) + '+o,' + jzN(H / 2) + ']'));
    var mb = jzEffect(L, 'ADBE Motion Blur', 'JZ Loop Blur'); jzEP(mb, 1, vert ? 0 : 90); jzEX(mb, 2, hd + 'bl');
} });
