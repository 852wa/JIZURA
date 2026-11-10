// ================================================================ effect events 追加分2 (AE port of src/11p_x2_fx.js, pack x2fx — keys xr…)
// fx.build(f, ev): f.comp = the MAIN comp (absolute time), ev = { t, dur, amp, type, seed, sc }.
// Three constructions, as in ae/p_fx1.jsx / ae/p_fx2.jsx:
//  - adjustment layers (jzAdjLayer) with a mask and a Transform / Offset / Mosaic effect rework the picture below them in place;
//    where the reworked picture leaves a hole, a scheme-background shape on top fills it (the browser paints the background first)
//  - parts that need the untouched frame several times (the browser's `S` snapshot drawn again: quadrants, pleats, echoes, nested
//    copies, thumbnails, loupe, reflection, crease) duplicate the cut wrappers visible during the event (axr_copies)
//  - overlays are shape layers / solids (jzEvShape, jzEvSolid) driven by jzEvHead → p (= the browser's k)
// Entries that re-roll on the browser's 24 fps clock (I.step) build one layer per clock step with the browser's own hash.

// ---------------------------------------------------------------- helpers
// J.h / J.r / J.rs of the browser (same uint32 for the same keys): AE picks the same variants as the web preview
function axr_h(a, b, c, d, e) {
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
function axr_r(a, b, c, d, e) { return axr_h(a, b, c, d, e) / 4294967296; }
function axr_rs(a, b, c, d, e) { return axr_r(a, b, c, d, e) * 2 - 1; }
function axr_S(ev) { return axr_h(Math.round(ev.t * 1000), 5519); }                               // evS(ev)
function axr_ampOf(ev) { return jzClamp(ev.amp == null ? 1 : ev.amp, 0.3, 1.6); }                 // ampOf(ev)
function axr_amp1(ev) { return jzClamp(ev.amp == null ? 1 : ev.amp, 0.5, 1.3); }                  // amp1(ev)
function axr_dk(c) { return jzLum(c || '#000000') < 0.45; }                                       // isDark
function axr_hyp(x, y) { return Math.sqrt(x * x + y * y); }
// an accent that is visible on the background
function axr_pop(sc) {
    var l = [sc.accent, sc.accent2, sc.fg], i;
    for (i = 0; i < l.length; i++) if (l[i] && jzContrast(l[i], sc.bg) > 1.6) return l[i];
    return sc.fg;
}
function axr_tints(sc) {
    var l = [sc.accent, sc.accent2, sc.ghostA, sc.ghostB], o = [], i;
    for (i = 0; i < l.length; i++) if (l[i] && jzContrast(l[i], sc.bg) > 1.3) o.push(l[i]);
    return o.length ? o : [sc.fg];
}
// the colour used to darken a frame (lids, dimming)
function axr_shade(sc) { return axr_dk(sc.bg) ? '#000000' : (sc.ink && axr_dk(sc.ink) ? sc.ink : (axr_dk(sc.fg) ? sc.fg : '#111111')); }
// expression helpers on top of jzEvHead (JZ_FNS has cl oe oc ic iq ob bo …)
var AXR_FNS = 'function bell(x){return Math.sin(Math.PI*cl(x));}' +
    'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}' +
    'function oq(x){x=cl(x);return 1-(1-x)*(1-x);}' +
    'function ios(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}' +
    'function ahr(k,a,b){return k<a?oc(k/a):(k>b?1-ic((k-b)/Math.max(0.001,1-b)):1);}' +        // attack → hold → release (in cubic)
    'function ahs(k,a,b){return k<a?oc(k/a):(k>b?1-ioc((k-b)/Math.max(0.001,1-b)):1);}' +       // … release in-out cubic
    'function punch(k,a){return k<a?oe(k/a):1-ioc((k-a)/(1-a));}' +
    'function spring(k,a){if(k<a)return oc(k/a);var q=(k-a)/(1-a);return Math.exp(-2.2*q)*Math.cos(q*Math.PI*2.5)*(1-q);}\n';
function axr_hd(f, ev, extra) { return jzEvHead(ev.t, ev.dur, ',W=' + f.W + ',H=' + f.H + (extra || '')) + AXR_FNS; }
function axr_span(L, t0, t1) { try { L.inPoint = t0; L.outPoint = Math.max(t1, t0 + 0.001); } catch (e) { jzWarn('axr span: ' + e.toString()); } return L; }
function axr_t1(ev) { return ev.t + Math.max(ev.dur, 1 / 24); }
// one entry per 24 fps clock step inside the event (the browser re-rolls its randomness on I.step = floor(t*24))
function axr_steps(ev) {
    var t0 = ev.t, t1 = axr_t1(ev), s = Math.floor(t0 * 24 + 0.000001), out = [];
    for (; s / 24 < t1 - 0.0001 && out.length < 16; s++) out.push({ st: s, t0: Math.max(t0, s / 24), t1: Math.min(t1, (s + 1) / 24) });
    if (!out.length) out.push({ st: s, t0: t0, t1: t1 });
    out[out.length - 1].t1 = t1;
    return out;
}
// expression snippets: si = index of the current clock step, and a number array
function axr_si(St) { return 'var si=Math.max(0,Math.min(' + (St.length - 1) + ',Math.floor(time*24+0.0001)-' + St[0].st + '));'; }
function axr_arr(name, a) { var s = [], i; for (i = 0; i < a.length; i++) s.push(jzN(a[i])); return 'var ' + name + '=[' + s.join(',') + '];'; }
// masks (layer space = comp space for comp-sized solids / adjustment layers / wrappers)
function axr_mpts(L, verts, ins, outs, o) {
    o = o || {};
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = verts; if (ins) { sh.inTangents = ins; sh.outTangents = outs; } sh.closed = true;
    m.property('ADBE Mask Shape').setValue(sh);
    if (o.mode) m.maskMode = o.mode;
    if (o.feather) m.property('ADBE Mask Feather').setValue([o.feather, o.feather]);
    if (o.inv) m.inverted = true;
    return m;
}
function axr_mrect(L, x0, y0, x1, y1, o) { return axr_mpts(L, [[x1, y0], [x1, y1], [x0, y1], [x0, y0]], null, null, o); }
function axr_mell(L, cx, cy, rx, ry, o) {
    var kx = 0.5523 * rx, ky = 0.5523 * ry;
    return axr_mpts(L, [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]], [[-kx, 0], [0, -ky], [kx, 0], [0, ky]], [[kx, 0], [0, ky], [-kx, 0], [0, -ky]], o);
}
// a crop on a picture copy that may already carry transition masks (then it must intersect them)
function axr_crop(L, x0, y0, x1, y1) {
    var n = 0; try { n = L.property('ADBE Mask Parade').numProperties; } catch (e) { n = 0; }
    return axr_mrect(L, x0, y0, x1, y1, n > 0 ? { mode: MaskMode.INTERSECT } : null);
}
// Transform effect (ADBE Geometry2: 1 anchor, 2 position, 3 uniform scale, 4 scale (height), 5 scale width, 6 skew, 7 skew axis, 8 rotation, 9 opacity)
function axr_xf(L, name, pivot) {
    var tr = jzEffect(L, 'ADBE Geometry2', name);
    if (pivot) { jzEP(tr, 1, pivot); jzEP(tr, 2, pivot); }
    return tr;
}
function axr_eo(fill) { try { fill.property('ADBE Vector Fill Rule').setValue(2); } catch (e) {} return fill; }
function axr_sub(g, name) { var q = jzVecs(g).addProperty('ADBE Vector Group'); if (name) q.name = name; return q; }
function axr_rep(g, n, dx, dy) {
    var V = jzVecs(g), ix = V.addProperty('ADBE Vector Filter - Repeater').propertyIndex;
    V.property(ix).property('ADBE Vector Repeater Copies').setValue(n);
    V.property(ix).property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([dx, dy]);
    return V.property(ix);
}
// rectangle with expressions on its size / position (configured before anything else is added to the group)
function axr_rect(g, w, h, x, y, sizeEx, posEx) {
    var r = jzAddRect(g, w, h, 0, x, y);
    if (sizeEx) jzSetExpr(r.property('ADBE Vector Rect Size'), sizeEx);
    if (posEx) jzSetExpr(r.property('ADBE Vector Rect Position'), posEx);
    return r;
}
function axr_solid(f, name, hex, w, h, t0, t1) {
    var L = f.comp.layers.addSolid(jzHex(hex), name, Math.max(4, Math.round(w)), Math.max(4, Math.round(h)), 1, f.comp.duration);
    return axr_span(L, t0, t1);
}
function axr_isWrap(L) {
    try { return !!(L && L.source && typeof L.source.numLayers === 'number' && /^\d\d\d /.test(String(L.name))); } catch (e) { return false; }
}
// copies of the picture: duplicates of the cut wrappers visible during the event, moved to the top of the main comp and trimmed to it.
// A matted wrapper takes a copy of its matte along (kept directly above the copy). fn(layer, isMatte) is applied to each.
function axr_copies(f, ev, tag, fn) {
    var C = f.comp, t0 = ev.t, t1 = axr_t1(ev), src = [], out = [], i, L, D, M, M0;
    if (f.wraps) {
        for (i = f.wraps.length - 1; i >= 0; i--) { var W0 = f.wraps[i]; if (W0.cut.start > t1 + 1 || W0.cut.end < t0 - 1) continue; L = W0.layer; if (L.inPoint < t1 - 0.0001 && L.outPoint > t0 + 0.0001) src.push(L); }
    } else for (i = C.numLayers; i >= 1; i--) { L = C.layer(i); if (axr_isWrap(L) && L.inPoint < t1 - 0.0001 && L.outPoint > t0 + 0.0001) src.push(L); }
    for (i = 0; i < src.length; i++) {
        L = src[i]; M0 = null;
        try { if (L.trackMatteType !== TrackMatteType.NO_TRACK_MATTE && L.index > 1) M0 = C.layer(L.index - 1); } catch (e0) {}
        D = L.duplicate(); D.moveToBeginning(); D.name = 'JZ FX ' + tag + ' copy';
        axr_span(D, Math.max(D.inPoint, t0), Math.min(D.outPoint, t1));
        M = null;
        if (M0) { M = M0.duplicate(); M.moveToBeginning(); M.name = 'JZ FX ' + tag + ' matte'; axr_span(M, Math.max(M.inPoint, t0), Math.min(M.outPoint, t1)); }
        else { try { if (D.trackMatteType !== TrackMatteType.NO_TRACK_MATTE) D.trackMatteType = TrackMatteType.NO_TRACK_MATTE; } catch (e1) {} }
        if (fn) { fn(D, false); if (M) fn(M, true); }
        out.push({ L: D, M: M });
    }
    return out;
}
// the cut wrappers visible during [t0, t1] with their 'content' layer (the lyric precomp inside the wrapper / stage comp)
function axr_wraps(f, t0, t1) {
    var out = [], w, W0;
    if (!f.wraps) return out;
    for (w = 0; w < f.wraps.length; w++) {
        W0 = f.wraps[w];
        if (W0.cut.start > t1 + 1 || W0.cut.end < t0 - 1 || !W0.content) continue;
        if (W0.layer.inPoint > t1 || W0.layer.outPoint <= t0) continue;
        out.push({ L: W0.layer, comp: W0.stage || W0.comp, content: W0.content });
    }
    return out;
}
// a tinted duplicate of the lyric inside its wrapper (follows the camera), trimmed to the event; off = wrapper time offset
function axr_inkCopy(w, ev, name, hex) {
    var off = w.L.startTime, D = w.content.duplicate();
    D.name = name;
    D.inPoint = Math.max(0, ev.t - off); D.outPoint = Math.min(w.comp.duration, Math.max(ev.t + ev.dur - off, ev.t - off + 1 / 24));
    var fe = jzEffect(D, 'ADBE Fill', 'JZ Ink Colour');
    jzEP(fe, 3, jzHex(hex)); jzEP(fe, 7, 1);
    return D;
}

// ================================================================ displacement
/* ---- xrShearSnap — シアー戻し: the whole frame leans into a parallelogram and springs back (Transform skew) */
jzReg('fx', 'xrShearSnap', { build: function (f, ev) {
    var W = f.W, H = f.H, s = axr_S(ev), sg = axr_r(s, 1) < 0.5 ? 1 : -1, hor = axr_r(s, 2) < 0.75;
    var hd = axr_hd(f, ev, ',K=' + jzN(sg * 0.24 * axr_amp1(ev) * (hor ? 1 : 0.55))) + 'var sk=K*spring(p,0.2);sk=Math.abs(sk)<0.0015?0:sk;var dg=-Math.atan(sk)*180/Math.PI;\n';
    var L = jzAdjLayer(f.comp, 'JZ FX xrShearSnap', ev.t, ev.dur);
    var tr = axr_xf(L, 'JZ Shear', [W / 2, H / 2]); jzEP(tr, 7, hor ? 0 : 90); jzEX(tr, 6, hd + 'dg');
    // background where the leaning frame leaves the edges: everything outside a frame-sized rectangle that leans the same way
    var S = jzEvShape(f.comp, 'JZ FX xrShearSnap margins', ev.t, ev.dur), g = jzGrp(S, 'margins');
    jzAddRect(g, W * 4, H * 4, 0, 0, 0); jzAddRect(g, W, H, 0, 0, 0);
    axr_eo(jzAddFill(g, ev.sc.bg));
    var t = jzGX(g);
    t.property('ADBE Vector Position').setValue([W / 2, H / 2]); t.property('ADBE Vector Skew Axis').setValue(hor ? 0 : 90);
    jzSetExpr(t.property('ADBE Vector Skew'), hd + 'dg');
} });

/* ---- xrColumnDrop — 列落ち: columns fall one after another like piano keys and rise back */
jzReg('fx', 'xrColumnDrop', { build: function (f, ev) {
    var W = f.W, H = f.H, s = axr_S(ev), n = 10 + (axr_h(s, 1) % 8), rev = axr_r(s, 2) < 0.5, up = axr_r(s, 4) < 0.3 ? -1 : 1, i, cols = [];
    var hd = axr_hd(f, ev, ',UP=' + up + ',A=' + jzN(axr_amp1(ev))) +
        'function dy(o,c){var u=cl((p-o*0.42)/0.58),e=u<0.38?iq(u/0.38):1-ioc((u-0.38)/0.62);return Math.round(UP*H*c*A*e);}\n';
    for (i = 0; i < n; i++) {
        var x0 = Math.round(i * W / n), x1 = Math.round((i + 1) * W / n);
        var arg = jzN((rev ? n - 1 - i : i) / (n - 1)) + ',' + jzN(0.09 + 0.15 * axr_r(s, i, 3));
        var L = jzAdjLayer(f.comp, 'JZ FX xrColumnDrop ' + jzPad(i + 1, 2), ev.t, ev.dur);
        axr_mrect(L, x0, 0, x1, H);
        var tr = axr_xf(L, 'JZ Column', null);
        jzEX(tr, 2, hd + '[value[0],value[1]+dy(' + arg + ')]');
        cols.push([x0, x1, arg]);
    }
    // background above (below) the fallen columns
    var S = jzEvShape(f.comp, 'JZ FX xrColumnDrop gaps', ev.t, ev.dur), g = jzGrp(S, 'gaps');
    for (i = 0; i < n; i++) {
        var c = cols[i], xc = jzN((c[0] + c[1]) / 2);
        axr_rect(g, c[1] - c[0], 10, 0, 0, hd + '[' + (c[1] - c[0]) + ',Math.abs(dy(' + c[2] + '))]', hd + 'var d=dy(' + c[2] + ');[' + xc + ',d>0?d/2:H+d/2]');
    }
    jzAddFill(g, ev.sc.bg);
} });

/* ---- xrQuadCycle — 四分割めぐり: the four quadrants travel one full lap around the centre, a quarter turn per beat (picture copies) */
jzReg('fx', 'xrQuadCycle', { build: function (f, ev) {
    var W = f.W, H = f.H, s = axr_S(ev), cwD = axr_r(s, 1) < 0.5 ? 1 : 3, hw = W / 2, hh = H / 2, SL = [[0, 0], [1, 0], [1, 1], [0, 1]], q;
    jzEvSolid(f.comp, 'JZ FX xrQuadCycle ground', ev.sc.bg, ev.t, ev.dur);
    var hd = axr_hd(f, ev, ',CD=' + cwD + ',SK=' + jzN(0.08 * axr_amp1(ev))) +
        'var SL=[[0,0],[1,0],[1,1],[0,1]],ff=p*4,j=Math.min(3,Math.floor(ff)),fr=ioc(ff-j),sh=1-SK*bell(p);' +
        'function qp(q){var a=SL[(q+j*CD)%4],b=SL[(q+(j+1)*CD)%4];return [(a[0]+(b[0]-a[0])*fr+0.5)*W/2,(a[1]+(b[1]-a[1])*fr+0.5)*H/2];}\n';
    for (q = 0; q < 4; q++) {
        axr_copies(f, ev, 'xrQuadCycle', function (L, isM) {
            axr_crop(L, SL[q][0] * hw, SL[q][1] * hh, SL[q][0] * hw + hw, SL[q][1] * hh + hh);
            var tr = axr_xf(L, 'JZ Quadrant', [(SL[q][0] + 0.5) * hw, (SL[q][1] + 0.5) * hh]);
            jzEX(tr, 2, hd + 'qp(' + q + ')'); jzEX(tr, 4, hd + '100*sh');
        });
    }
} });

/* ---- xrFlipTiles — パネル返し: split-flap board — tiles turn over to their coloured back and round again in a diagonal wave */
jzReg('fx', 'xrFlipTiles', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = axr_S(ev), m = Math.min(W, H), gx = Math.max(3, Math.round(W / (m / 3.2))), gy = Math.max(3, Math.round(H / (m / 3.2)));
    var rev = axr_r(s, 1) < 0.5, back = axr_pop(sc), back2 = jzMixHex(back, sc.bg, 0.35), part = 0.55 + 0.35 * jzClamp(axr_ampOf(ev) - 0.3, 0, 1), i, j, k, tiles = [];
    // cc(o): cosine of the tile's turn (2 = the tile is at rest)
    var hd = axr_hd(f, ev) + 'function cc(o){var u=cl((p-o*0.45)/0.55);return (u<=0||u>=1)?2:Math.cos(2*Math.PI*ioc(u));}\n';
    for (j = 0; j < gy; j++) for (i = 0; i < gx; i++) {
        if (axr_r(s, i, j, 2) > part) continue;
        var x0 = Math.round(i * W / gx), x1 = Math.round((i + 1) * W / gx), y0 = Math.round(j * H / gy), y1 = Math.round((j + 1) * H / gy);
        var T = { xc: (x0 + x1) / 2, yc: (y0 + y1) / 2, tw: x1 - x0, th: y1 - y0, o: jzN(((rev ? gx - 1 - i : i) + j) / (gx + gy - 2)), odd: (i + j) % 2 };
        var L = jzAdjLayer(f.comp, 'JZ FX xrFlipTiles ' + jzPad(tiles.length + 1, 2), ev.t, ev.dur);
        axr_mrect(L, x0, y0, x1, y1);
        var tr = axr_xf(L, 'JZ Flip', [T.xc, T.yc]); jzEP(tr, 3, 0);
        jzEX(tr, 5, hd + 'var c=cc(' + T.o + ');c>1?100:Math.max(0.5,100*c)');
        tiles.push(T);
    }
    if (!tiles.length) return;
    var S = jzEvShape(f.comp, 'JZ FX xrFlipTiles backs', ev.t, ev.dur), g, n;
    for (k = 0; k < 2; k++) {        // the coloured backs (two tones, chequered)
        n = 0; for (i = 0; i < tiles.length; i++) if (tiles[i].odd === k) n++;
        if (!n) continue;
        g = jzGrp(S, k ? 'back A' : 'back B');
        for (i = 0; i < tiles.length; i++) {
            T = tiles[i]; if (T.odd !== k) continue;
            axr_rect(g, 10, T.th, T.xc, T.yc, hd + 'var c=cc(' + T.o + ');c<0?[' + T.tw + '*(-c),' + T.th + ']:[0,0]', null);
        }
        jzAddFill(g, k ? back : back2);
    }
    g = jzGrp(S, 'ground');           // background beside the narrowed tile (the whole tile while its back shows)
    for (i = 0; i < tiles.length; i++) {
        T = tiles[i];
        jzAddRect(g, T.tw, T.th, 0, T.xc, T.yc);
        axr_rect(g, T.tw, T.th, T.xc, T.yc, hd + 'var c=cc(' + T.o + ');c>1?[' + T.tw + ',' + T.th + ']:[Math.max(0,' + T.tw + '*c),' + T.th + ']', null);
    }
    axr_eo(jzAddFill(g, sc.bg));
} });

/* ---- xrWaist — くびれ: rows squeezed towards the centre line — the frame gets a waist (or a belly) and springs back (20 row strips) */
jzReg('fx', 'xrWaist', { build: function (f, ev) {
    var W = f.W, H = f.H, s = axr_S(ev), A0 = (axr_r(s, 1) < 0.35 ? -0.2 : 0.3) * axr_amp1(ev), yc = 0.5 + axr_rs(s, 2) * 0.06, N = 20, i, rows = [];
    var hd = axr_hd(f, ev, ',A0=' + jzN(A0)) + 'var A=A0*punch(p,0.28);A=Math.abs(A)<0.003?0:A;\n';
    for (i = 0; i < N; i++) {
        var v0 = -0.85 + 1.7 * i / N, v1 = -0.85 + 1.7 * (i + 1) / N, vm = (v0 + v1) / 2;
        var ya = jzClamp(Math.round((yc + v0 / 2) * H), 0, H), yb = jzClamp(Math.round((yc + v1 / 2) * H), 0, H), G = jzN(Math.exp(-(vm * vm) / 0.16));
        if (yb - ya < 1) continue;
        var L = jzAdjLayer(f.comp, 'JZ FX xrWaist ' + jzPad(i + 1, 2), ev.t, ev.dur);
        axr_mrect(L, 0, ya, W, yb);
        var tr = axr_xf(L, 'JZ Waist', [W / 2, (ya + yb) / 2]); jzEP(tr, 3, 0);
        jzEX(tr, 5, hd + '100*(1-A*' + G + ')');
        rows.push([ya, yb, G]);
    }
    var S = jzEvShape(f.comp, 'JZ FX xrWaist margins', ev.t, ev.dur), g = jzGrp(S, 'margins');
    for (i = 0; i < rows.length; i++) {
        var r = rows[i], h = r[1] - r[0], ym = (r[0] + r[1]) / 2;
        jzAddRect(g, W, h, 0, W / 2, ym);
        axr_rect(g, W, h, W / 2, ym, hd + '[W*(1-A*' + r[2] + '),' + h + ']', null);
    }
    axr_eo(jzAddFill(g, ev.sc.bg));
} });

/* ---- xrSyncBend — 同期曲がり: horizontal sync flagging — the top (or bottom) of the picture bends sideways and wraps round (22 Offset strips) */
jzReg('fx', 'xrSyncBend', { build: function (f, ev) {
    var W = f.W, H = f.H, s = axr_S(ev), St = axr_steps(ev), top = axr_r(s, 1) < 0.7, dir = axr_r(s, 2) < 0.5 ? 1 : -1, zone = H * 0.78, N = 22, i, j;
    var hd = axr_hd(f, ev, ',A0=' + jzN(dir * W * 0.34 * axr_amp1(ev))) + 'var b=bell(p),A=A0*b;A=Math.abs(A)<1?0:A;\n' + axr_si(St);
    for (i = 0; i < N; i++) {
        var a0 = Math.floor(i * zone / N), a1 = Math.floor((i + 1) * zone / N), y = top ? a0 : H - a1, v = 1 - (i + 0.5) / N, JT = [];
        for (j = 0; j < St.length; j++) JT.push(axr_rs(St[j].st * 7 + s, i * 2, 3) * W * 0.006 * v);
        var L = jzAdjLayer(f.comp, 'JZ FX xrSyncBend ' + jzPad(i + 1, 2), ev.t, ev.dur);
        axr_mrect(L, 0, y, W, y + (a1 - a0));
        var of = jzEffect(L, 'ADBE Offset', 'JZ Sync Bend');
        jzEX(of, 1, hd + axr_arr('JT', JT) + 'var dx=A?A*' + jzN(Math.pow(v, 1.7)) + '+JT[si]*b:0;[W/2+dx,H/2]');
    }
} });

/* ---- xrAccordion — 蛇腹: vertical pleats — neighbouring strips are squeezed and stretched in turn (picture copies, one per pleat) */
jzReg('fx', 'xrAccordion', { build: function (f, ev) {
    var W = f.W, H = f.H, s = axr_S(ev), n = 2 * (4 + (axr_h(s, 1) % 3)), w0 = W / n, i, k;
    var hd = axr_hd(f, ev, ',Q0=' + jzN(0.62 * axr_amp1(ev) * (axr_r(s, 2) < 0.5 ? 1 : -1)) + ',W0=' + jzN(w0)) +
        'var q=Q0*Math.sin(p*2*Math.PI)*(1-0.35*p);q=Math.abs(q)<0.004?0:q;\n';
    for (i = 0; i < n; i++) {
        var odd = i % 2, xa = i * w0, xb = (i + 1) * w0;
        axr_copies(f, ev, 'xrAccordion', function (L, isM) {
            axr_crop(L, xa - 0.3, -20, xb + 0.3, H + 20);
            var tr = axr_xf(L, 'JZ Pleat', [odd ? xb : xa, H / 2]); jzEP(tr, 3, 0);
            jzEX(tr, 5, hd + '100*(1' + (odd ? '-' : '+') + 'q)');
        });
    }
    // the squeezed pleats fall into shadow
    var S = jzEvShape(f.comp, 'JZ FX xrAccordion shade', ev.t, ev.dur), g, fl;
    for (k = 0; k < 2; k++) {
        g = jzGrp(S, k ? 'odd pleats' : 'even pleats');
        for (i = k; i < n; i += 2) {
            if (k) axr_rect(g, 10, H, 0, 0, hd + '[W0*(1-q),H]', hd + '[' + jzN((i + 1) * w0) + '-W0*(1-q)/2,H/2]');
            else axr_rect(g, 10, H, 0, 0, hd + '[W0*(1+q),H]', hd + '[' + jzN(i * w0) + '+W0*(1+q)/2,H/2]');
        }
        fl = jzAddFill(g, '#000000', 0);
        jzSetExpr(fl.property('ADBE Vector Fill Opacity'), hd + (k ? 'q>0?42*q:0' : 'q<0?-42*q:0'));
    }
} });

/* ---- xrDropBounce — 着地バウンド: the frame is tossed up, falls and bounces on the bottom edge (Offset wraps it) */
jzReg('fx', 'xrDropBounce', { build: function (f, ev) {
    var L = jzAdjLayer(f.comp, 'JZ FX xrDropBounce', ev.t, ev.dur);
    var of = jzEffect(L, 'ADBE Offset', 'JZ Drop Bounce');
    jzEX(of, 1, axr_hd(f, ev, ',A=' + jzN(axr_amp1(ev))) + 'var lift=p<0.16?oc(p/0.16):1-bo((p-0.16)/0.84);[W/2,H/2-Math.round(H*0.2*A*lift)]');
} });

/* ---- xrDiscTurn — 円盤まわし: three concentric discs of the picture turn against each other and settle */
jzReg('fx', 'xrDiscTurn', { build: function (f, ev) {
    var W = f.W, H = f.H, s = axr_S(ev), m = Math.min(W, H) / 2, cx = W / 2, cy = H / 2, dir = axr_r(s, 1) < 0.5 ? 1 : -1, lw = Math.max(1, m * 0.006), i;
    // each disc sits inside the one before it, so it only adds the difference to the turn it already carries (1, -1.7, 2.6)
    var R = [0.97, 0.66, 0.36], DT = [1, -2.7, 4.3];
    var hd = axr_hd(f, ev, ',K=' + jzN(dir * 15 * axr_amp1(ev))) + 'var e=spring(p,0.22);e=Math.abs(e)<0.004?0:e;\n';
    for (i = 0; i < 3; i++) {
        var L = jzAdjLayer(f.comp, 'JZ FX xrDiscTurn ' + (i + 1), ev.t, ev.dur);
        axr_mell(L, cx, cy, R[i] * m, R[i] * m);
        var tr = axr_xf(L, 'JZ Disc', [cx, cy]);
        jzEX(tr, 8, hd + 'K*e*' + jzN(DT[i]));
    }
    var S = jzEvShape(f.comp, 'JZ FX xrDiscTurn rims', ev.t, ev.dur), g = jzGrp(S, 'rims');
    for (i = 0; i < 3; i++) jzAddEllipse(g, 2 * R[i] * m - lw, 2 * R[i] * m - lw, cx, cy);
    var sk = jzAddStroke(g, axr_pop(ev.sc), lw, 0);
    jzSetExpr(sk.property('ADBE Vector Stroke Opacity'), hd + '70*cl(Math.abs(e)*1.5)');
} });

/* ---- xrStretchWave — 伸び波: a bump of vertical stretch runs across the columns (a train of stretch strips that rides with the bump) */
jzReg('fx', 'xrStretchWave', { build: function (f, ev) {
    var W = f.W, H = f.H, s = axr_S(ev), dir = axr_r(s, 1) < 0.5, sig = W * 0.1, a = 0.85 * axr_amp1(ev), j;
    var pos = axr_hd(f, ev) + '[W*' + (dir ? '(-0.3+1.6*p)' : '(1.3-1.6*p)') + ',H/2]';
    for (j = -10; j <= 10; j++) {
        var d = j * 0.2, sy = 1 + a * Math.exp(-d * d);
        if (sy < 1.004) continue;
        // (the layer only moves sideways: the mask rides along, the vertical stretch about the centre line is the same everywhere)
        var L = jzAdjLayer(f.comp, 'JZ FX xrStretchWave ' + jzPad(j + 11, 2), ev.t, ev.dur);
        axr_mrect(L, Math.round(W / 2 + (d - 0.1) * sig), -20, Math.round(W / 2 + (d + 0.1) * sig), H + 20);
        var tr = axr_xf(L, 'JZ Stretch', null); jzEP(tr, 3, 0); jzEP(tr, 4, 100 * sy);
        jzSetExpr(jzXf(L, 'ADBE Position'), pos);
    }
} });

/* ---- xrDiagSlice — 斜め裂き: the frame is cut along a diagonal; the two halves slide apart along the cut and back */
jzReg('fx', 'xrDiagSlice', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = axr_S(ev), th = (axr_r(s, 1) < 0.5 ? 1 : -1) * (18 + 20 * axr_r(s, 2)) * Math.PI / 180, D = axr_hyp(W, H);
    var c = Math.cos(th), sn = Math.sin(th), cx = W / 2, cy = H / 2, lw = Math.max(1.5, Math.min(W, H) * 0.004), hf;
    var hd = axr_hd(f, ev, ',D0=' + jzN(Math.min(W, H) * 0.13 * axr_amp1(ev))) + 'var e=punch(p,0.3),d=D0*e;d=d<0.5?0:d;\n';
    function P(x, y) { return [cx + x * c - y * sn, cy + x * sn + y * c]; }
    for (hf = 0; hf < 2; hf++) {
        var sg = hf ? -1 : 1, ux = sg * c, uy = sg * sn, half = [P(-D, hf ? 0 : -D), P(D, hf ? 0 : -D), P(D, hf ? D : 0), P(-D, hf ? D : 0)];
        var L = jzAdjLayer(f.comp, 'JZ FX xrDiagSlice ' + (hf ? 'B' : 'A'), ev.t, ev.dur);
        axr_mpts(L, half);
        var tr = axr_xf(L, 'JZ Slice', null);
        jzEX(tr, 2, hd + '[value[0]+' + jzN(ux) + '*d,value[1]+' + jzN(uy) + '*d]');
        // background where this half has slid away from the frame edges
        var G = jzEvShape(f.comp, 'JZ FX xrDiagSlice gap ' + (hf ? 'B' : 'A'), ev.t, ev.dur), g = jzGrp(G, 'gap');
        axr_rect(g, 10, H, 0, 0, hd + '[' + jzN(Math.abs(ux)) + '*d,H]', hd + '[' + (ux > 0 ? '' : 'W-') + jzN(Math.abs(ux) / 2) + '*d,H/2]');
        axr_rect(g, W, 10, 0, 0, hd + '[W,' + jzN(Math.abs(uy)) + '*d]', hd + '[W/2,' + (uy > 0 ? '' : 'H-') + jzN(Math.abs(uy) / 2) + '*d]');
        jzAddFill(g, sc.bg);
        axr_mpts(G, half);
    }
    var S = jzEvShape(f.comp, 'JZ FX xrDiagSlice cut', ev.t, ev.dur), gs = jzGrp(S, 'cut');
    jzAddRect(gs, 2 * D, lw, 0, 0, 0); jzAddFill(gs, axr_pop(sc));
    jzXf(S, 'ADBE Position').setValue([cx, cy]); jzXf(S, 'ADBE Rotate Z').setValue(th * 180 / Math.PI);
    jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + 'd>0?100*cl(e*1.4):0');
} });

/* ---- xrBandZoom — 段ズーム: horizontal bands each jump to their own magnification (parallax layers) and fall back */
jzReg('fx', 'xrBandZoom', { build: function (f, ev) {
    var W = f.W, H = f.H, s = axr_S(ev), nb = 4 + (axr_h(s, 1) % 3), b;
    var hd = axr_hd(f, ev, ',A=' + jzN(axr_amp1(ev))) + 'var e=punch(p,0.22)*A;e=e<0.004?0:e;\n';
    for (b = 0; b < nb; b++) {
        var y0 = Math.round(b * H / nb), y1 = Math.round((b + 1) * H / nb);
        var L = jzAdjLayer(f.comp, 'JZ FX xrBandZoom ' + (b + 1), ev.t, ev.dur);
        axr_mrect(L, 0, y0, W, y1);
        var tr = axr_xf(L, 'JZ Band Zoom', [W * (0.5 + axr_rs(s, b, 3) * 0.12), (y0 + y1) / 2]);
        jzEX(tr, 4, hd + '100*(1+e*' + jzN(0.03 + 0.2 * axr_r(s, b, 2)) + ')');
    }
} });

/* ---- xrRibbonTwist — ねじれ: the picture twists like a ribbon — rows turn over (mirrored for a moment) one after another (16 row strips) */
jzReg('fx', 'xrRibbonTwist', { build: function (f, ev) {
    var W = f.W, H = f.H, s = axr_S(ev), N = 16, down = axr_r(s, 1) < 0.5, i, rows = [];
    // cc(o): cosine of the row's turn (1 = at rest); a negative Scale Width mirrors the row
    var hd = axr_hd(f, ev) + 'function cc(o){var u=cl((p-0.5*o)/0.5);return (u<=0||u>=1)?1:Math.cos(2*Math.PI*ioc(u));}\n';
    for (i = 0; i < N; i++) {
        var y0 = Math.floor(i * H / N), y1 = Math.floor((i + 1) * H / N), o = jzN(down ? i / N : 1 - i / N);
        var L = jzAdjLayer(f.comp, 'JZ FX xrRibbonTwist ' + jzPad(i + 1, 2), ev.t, ev.dur);
        axr_mrect(L, 0, y0, W, y1);
        var tr = axr_xf(L, 'JZ Twist', [W / 2, (y0 + y1) / 2]); jzEP(tr, 3, 0);
        jzEX(tr, 5, hd + 'var c=cc(' + o + ');100*(Math.abs(c)<0.002?0.002:c)');
        rows.push([y0, y1, o]);
    }
    var S = jzEvShape(f.comp, 'JZ FX xrRibbonTwist shade', ev.t, ev.dur), g, r, h, ym, fl;
    for (i = 0; i < N; i++) {          // the turning rows darken
        r = rows[i]; h = r[1] - r[0]; ym = (r[0] + r[1]) / 2;
        g = jzGrp(S, 'shade ' + (i + 1));
        axr_rect(g, W, h, W / 2, ym, hd + '[W*Math.abs(cc(' + r[2] + ')),' + h + ']', null);
        fl = jzAddFill(g, '#000000', 0);
        jzSetExpr(fl.property('ADBE Vector Fill Opacity'), hd + '22*(1-Math.abs(cc(' + r[2] + ')))');
    }
    g = jzGrp(S, 'margins');
    for (i = 0; i < N; i++) {
        r = rows[i]; h = r[1] - r[0]; ym = (r[0] + r[1]) / 2;
        jzAddRect(g, W, h, 0, W / 2, ym);
        axr_rect(g, W, h, W / 2, ym, hd + '[W*Math.abs(cc(' + r[2] + ')),' + h + ']', null);
    }
    axr_eo(jzAddFill(g, ev.sc.bg));
} });

/* ---- xrSlotReel — リール回転: wide reels spin one full turn in alternate directions and stop one by one (Offset + vertical smear) */
jzReg('fx', 'xrSlotReel', { build: function (f, ev) {
    var W = f.W, H = f.H, s = axr_S(ev), n = (W >= H ? 3 : 2) + (axr_h(s, 1) % 2), lag = 0.14, par = axr_h(s, 2) % 2, i;
    var hd = axr_hd(f, ev, ',A=' + jzN(axr_amp1(ev)) + ',LG=' + jzN(lag) + ',DN=' + jzN(1 - (n - 1) * lag)) + 'function uu(i){return cl((p-i*LG)/DN);}\n';
    for (i = 0; i < n; i++) {
        var x0 = Math.round(i * W / n), x1 = Math.round((i + 1) * W / n), dir = (i + par) % 2 ? -1 : 1;
        var L = jzAdjLayer(f.comp, 'JZ FX xrSlotReel ' + (i + 1), ev.t, ev.dur);
        axr_mrect(L, x0, 0, x1, H);
        var of = jzEffect(L, 'ADBE Offset', 'JZ Reel');
        jzEX(of, 1, hd + '[W/2,H/2+' + jzN(dir) + '*ioc(uu(' + i + '))*H]');
        var mb = jzEffect(L, 'ADBE Motion Blur', 'JZ Reel Smear'); jzEP(mb, 1, 0);
        jzEX(mb, 2, hd + 'var sp=bell(uu(' + i + '))*H*0.035*A;sp<1?0:2*sp');
    }
    var lw = Math.max(1, Math.round(Math.min(W, H) * 0.003));
    var S = jzEvShape(f.comp, 'JZ FX xrSlotReel dividers', ev.t, ev.dur), g = jzGrp(S, 'dividers');
    for (i = 1; i < n; i++) jzAddRect(g, lw, H, 0, Math.round(i * W / n), H / 2);
    jzAddFill(g, ev.sc.fg);
    jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '50*bell(p)');
} });

/* ---- xrCrossSplit — 十字割り: the quadrants are pushed apart from the centre, leaving a cross-shaped gap */
jzReg('fx', 'xrCrossSplit', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = axr_S(ev), m = Math.min(W, H), lw = Math.max(1, m * 0.003), q;
    var xs = Math.round(W * (0.5 + axr_rs(s, 1) * 0.1)), ys = Math.round(H * (0.5 + axr_rs(s, 2) * 0.06));
    var hd = axr_hd(f, ev, ',G0=' + jzN(m * 0.04 * axr_amp1(ev))) + 'var e=punch(p,0.25),g=G0*e;g=g<0.5?0:g;\n';
    var Q = [[0, 0, xs, ys, '-', '-'], [xs, 0, W, ys, '+', '-'], [0, ys, xs, H, '-', '+'], [xs, ys, W, H, '+', '+']];
    for (q = 0; q < 4; q++) {
        var L = jzAdjLayer(f.comp, 'JZ FX xrCrossSplit ' + (q + 1), ev.t, ev.dur);
        axr_mrect(L, Q[q][0], Q[q][1], Q[q][2], Q[q][3]);
        var tr = axr_xf(L, 'JZ Quadrant Push', null);
        jzEX(tr, 2, hd + '[value[0]' + Q[q][4] + 'g,value[1]' + Q[q][5] + 'g]');
    }
    var S = jzEvShape(f.comp, 'JZ FX xrCrossSplit cross', ev.t, ev.dur), g = jzGrp(S, 'lines');
    jzAddRect(g, lw, H, 0, xs, H / 2); jzAddRect(g, W, lw, 0, W / 2, ys);
    var fl = jzAddFill(g, axr_pop(sc), 0);
    jzSetExpr(fl.property('ADBE Vector Fill Opacity'), hd + 'g>0?100*cl(e*1.3):0');
    g = jzGrp(S, 'gap');
    axr_rect(g, 10, H, xs, H / 2, hd + '[2*g,H]', null);
    axr_rect(g, W, 10, W / 2, ys, hd + '[W,2*g]', null);
    jzAddFill(g, sc.bg);
} });

// ================================================================ copies
/* ---- xrLongShadow — ロングシャドウ: the ink throws a solid coloured extrusion along a diagonal, then pulls it back in.
   An accent-filled duplicate of the lyric behind it, extruded by four hard Drop Shadows (distances 1, 2, 4, 8 → 16 stacked copies) */
jzReg('fx', 'xrLongShadow', { build: function (f, ev) {
    var sc = ev.sc, s = axr_S(ev), col = axr_r(s, 1) < 0.6 ? sc.accent : (sc.accent2 || sc.accent), ang = axr_r(s, 2) < 0.5 ? 45 : 135;
    var ws = axr_wraps(f, ev.t, ev.t + ev.dur), i, k;
    for (i = 0; i < ws.length; i++) {
        var w = ws[i], off = w.L.startTime;
        var hd = jzEvHead(ev.t - off, ev.dur, ',L0=' + jzN(Math.min(f.W, f.H) * 0.085 * axr_amp1(ev))) + AXR_FNS + 'var L=L0*ahs(p,0.3,0.6);L=L<1?0:L;\n';
        var D = axr_inkCopy(w, ev, 'JZ FX xrLongShadow', col);
        D.moveAfter(w.content);
        for (k = 0; k < 4; k++) {
            var ds = jzEffect(D, 'ADBE Drop Shadow', 'JZ Extrude ' + (k + 1));
            jzEP(ds, 1, jzHex(col)); jzEP(ds, 2, 255); jzEP(ds, 3, ang + 90); jzEP(ds, 5, 0);
            jzEX(ds, 4, hd + 'L/15*' + (1 << k));
        }
        var tr = jzEffect(D, 'ADBE Geometry2', 'JZ Extrude Switch');
        jzEX(tr, 9, hd + 'L>0?100:0');
    }
} });

/* ---- xrWaterMirror — 水鏡: a waterline rises from the bottom edge; below it the picture is reflected, squashed and rippling.
   A picture copy flipped about the waterline (Transform), rippled (Wave Warp) and wiped away above the line (Linear Wipe) */
jzReg('fx', 'xrWaterMirror', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, k;
    var hd = axr_hd(f, ev, ',DP=' + jzN(H * 0.34 * jzClamp(axr_ampOf(ev), 0.8, 1.1))) + 'var lift=ahr(p,0.3,0.68),dep=DP*lift;dep=dep<2?0:dep;var y0=Math.round(H-dep);\n';
    axr_copies(f, ev, 'xrWaterMirror', function (L, isM) {
        var tr = axr_xf(L, 'JZ Reflection', null); jzEP(tr, 3, 0); jzEP(tr, 4, -100 / 1.55);
        jzEX(tr, 1, hd + '[W/2,y0]'); jzEX(tr, 2, hd + '[W/2,y0]');
        var ww = jzEffect(L, 'ADBE Wave Warp', 'JZ Reflection Ripple');
        jzEP(ww, 1, 1); jzEP(ww, 2, W * 0.008); jzEP(ww, 3, H * 0.11); jzEP(ww, 4, 0); jzEP(ww, 5, 0); jzEP(ww, 6, 1);
        jzEX(ww, 7, hd + '-p*16*180/Math.PI');
        var lw = jzEffect(L, 'ADBE Linear Wipe', 'JZ Waterline'); jzEP(lw, 2, 180); jzEP(lw, 3, 0);
        jzEX(lw, 1, hd + 'dep>0?100*y0/H:100');
    });
    var S = jzEvShape(f.comp, 'JZ FX xrWaterMirror water', ev.t, ev.dur), lh = Math.max(1, H * 0.003), g, fl;
    g = jzGrp(S, 'waterline');
    axr_rect(g, W, lh, 0, 0, hd + '[dep>0?W:0,' + jzN(lh) + ']', hd + '[W/2,y0-1+' + jzN(lh / 2) + ']');
    fl = jzAddFill(g, axr_pop(sc), 0);
    jzSetExpr(fl.property('ADBE Vector Fill Opacity'), hd + '70*lift');
    // the water's veil: background colour, denser towards the bottom edge (0.3 → 0.8 in the browser)
    var VO = [35, 28, 30];
    for (k = 2; k >= 0; k--) {
        g = jzGrp(S, 'veil ' + (k + 1));
        axr_rect(g, W, 10, 0, 0, hd + '[W,dep*' + jzN(1 - k / 3) + ']', hd + '[W/2,H-dep*' + jzN((1 - k / 3) / 2) + ']');
        jzAddFill(g, sc.bg, VO[k]);
    }
} });

/* ---- xrSwingEcho — 振り子残像: pendulum after-images — copies swing out to both sides around a pivot far below the frame */
jzReg('fx', 'xrSwingEcho', { build: function (f, ev) {
    var W = f.W, H = f.H, s = axr_S(ev), dk = axr_dk(ev.sc.bg), up = axr_r(s, 1) < 0.3, px = W / 2, py = up ? -H * 0.9 : H * 1.9, i, j;
    var hd = axr_hd(f, ev, ',TH=' + jzN(3.4 * axr_amp1(ev))) + 'var e=punch(p,0.3),th=TH*e;th=th<0.034?0:th;\n';
    for (i = 3; i >= 1; i--) for (j = 0; j < 2; j++) {
        axr_copies(f, ev, 'xrSwingEcho', function (L, isM) {
            var tr = axr_xf(L, 'JZ Swing', [px, py]);
            jzEX(tr, 8, hd + 'th*' + jzN((j ? 1 : -1) * i));
            if (!isM) { jzEX(tr, 9, hd + 'th>0?100*cl(e*2)*' + jzN(0.62 - i * 0.14) + ':0'); L.blendingMode = dk ? BlendingMode.LIGHTEN : BlendingMode.DARKEN; }
        });
    }
} });

/* ---- xrBandRepeat — 帯リピート: the middle band of the picture is stamped again and again above and below, then folds back */
jzReg('fx', 'xrBandRepeat', { build: function (f, ev) {
    var W = f.W, H = f.H, dk = axr_dk(ev.sc.bg), bh = Math.round(H * 0.26), y0 = Math.round(H / 2 - bh / 2), i, j;
    var hd = axr_hd(f, ev, ',SP=' + jzN(bh * 0.92 * jzClamp(axr_amp1(ev), 0.7, 1.1))) + 'var e=punch(p,0.3),sp=SP*e;sp=sp<1?0:sp;\n';
    for (i = 3; i >= 1; i--) for (j = 0; j < 2; j++) {
        axr_copies(f, ev, 'xrBandRepeat', function (L, isM) {
            axr_crop(L, -20, y0, W + 20, y0 + bh);
            var tr = axr_xf(L, 'JZ Band Stamp', null);
            jzEX(tr, 2, hd + '[value[0],value[1]+sp*' + jzN((j ? 1 : -1) * i) + ']');
            if (!isM) { jzEX(tr, 9, hd + 'sp>0?100*cl(e*2.5)*' + jzN(0.7 - i * 0.16) + ':0'); L.blendingMode = dk ? BlendingMode.LIGHTEN : BlendingMode.DARKEN; }
        });
    }
} });

/* ---- xrNested — 入れ子: picture in picture in picture — the frame recedes into nested, framed copies of itself */
jzReg('fx', 'xrNested', { build: function (f, ev) {
    var W = f.W, H = f.H, s = axr_S(ev), cx = W * (0.5 + axr_rs(s, 1) * 0.08), cy = H * (0.5 + axr_rs(s, 2) * 0.06), lw = Math.max(1, Math.min(W, H) * 0.004), i;
    var hd = axr_hd(f, ev, ',FK=' + jzN(0.27 * axr_amp1(ev)) + ',CX=' + jzN(cx) + ',CY=' + jzN(cy)) + 'var e=punch(p,0.3),ff=1-FK*e;ff=ff>0.997?1:ff;\n';
    for (i = 1; i <= 4; i++) {
        axr_copies(f, ev, 'xrNested', function (L, isM) {
            var tr = axr_xf(L, 'JZ Nested', [cx, cy]);
            jzEX(tr, 4, hd + '100*Math.pow(ff,' + i + ')'); jzEX(tr, 9, hd + 'ff<1?100:0');
        });
    }
    var S = jzEvShape(f.comp, 'JZ FX xrNested frames', ev.t, ev.dur), g = jzGrp(S, 'frames');
    for (i = 1; i <= 4; i++) {
        var z = 'var z=Math.pow(ff,' + i + ');';
        axr_rect(g, W, H, W / 2, H / 2, hd + z + '[W*z,H*z]', hd + z + '[CX+(W/2-CX)*z,CY+(H/2-CY)*z]');
    }
    var sk = jzAddStroke(g, axr_pop(ev.sc), lw, 0);
    jzSetExpr(sk.property('ADBE Vector Stroke Opacity'), hd + 'ff<1?85*cl(e*1.5):0');
} });

/* ---- xrThumbRow — サムネ列: a row of small framed copies of the frame pops up along one edge and drops away */
jzReg('fx', 'xrThumbRow', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = axr_S(ev), n = W >= H ? 5 : 4, a = jzClamp(axr_amp1(ev), 0.8, 1.15), tw = W * 0.86 / n * 0.86 * a, th = tw * H / W, gap = (W - n * tw) / (n + 1);
    var top = axr_r(s, 1) < 0.35, yb = top ? H * 0.045 : H * 0.955 - th, rev = axr_r(s, 2) < 0.5, lw = Math.max(1, Math.min(W, H) * 0.004), i, k, T = [];
    var hd = axr_hd(f, ev, ',TW=' + jzN(tw) + ',TH=' + jzN(th)) + 'function zz(o){var z=ob((p-o)/0.22,1.6)*(1-ic((p-0.66-o*0.5)/0.2));return z<0.02?0:z;}\n';
    for (i = 0; i < n; i++) {
        var o = jzN((rev ? n - 1 - i : i) * 0.06), xc = gap + i * (tw + gap) + tw / 2, yc = yb + th / 2;
        axr_copies(f, ev, 'xrThumbRow', function (L, isM) {
            var tr = axr_xf(L, 'JZ Thumb', null); jzEP(tr, 2, [xc, yc]);
            jzEX(tr, 4, hd + 'Math.max(0.1,' + jzN(100 * tw / W) + '*zz(' + o + '))'); jzEX(tr, 9, hd + 'zz(' + o + ')>0?100:0');
        });
        T.push([xc, yc, o]);
    }
    var S = jzEvShape(f.comp, 'JZ FX xrThumbRow frames', ev.t, ev.dur), g;
    for (k = 0; k < 2; k++) {
        g = jzGrp(S, k ? 'frames B' : 'frames A');
        for (i = k; i < n; i += 2) axr_rect(g, tw, th, T[i][0], T[i][1], hd + 'var z=zz(' + T[i][2] + ');[TW*z,TH*z]', null);
        jzAddStroke(g, k ? sc.fg : axr_pop(sc), lw);
    }
} });

/* ---- xrLoupe — 虫めがね: a round magnifier glides across the frame.
   A picture copy enlarged about the lens centre, under a plain copy with a round hole (Iris Wipe, 32-gon) that follows it */
jzReg('fx', 'xrLoupe', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = axr_S(ev), m = Math.min(W, H), dir = axr_r(s, 1) < 0.5, lw = Math.max(1.5, m * 0.007);
    var hd = axr_hd(f, ev, ',R0=' + jzN(m * 0.21 * Math.sqrt(axr_amp1(ev))) + ',YB=' + jzN(H * (0.5 + axr_rs(s, 2) * 0.05)) + ',LW=' + jzN(lw)) +
        'var env=p<0.22?ob(p/0.22,1.4):(p>0.75?1-ic((p-0.75)/0.25):1),r=R0*env;r=r>=1?r:0;' +
        'var q=ios(p),x=W*' + (dir ? '(0.26+0.48*q)' : '(0.74-0.48*q)') + ',y=YB-Math.sin(q*Math.PI)*H*0.03;\n';
    axr_copies(f, ev, 'xrLoupe zoom', function (L, isM) {
        var tr = axr_xf(L, 'JZ Loupe Zoom', null); jzEP(tr, 4, 160);
        jzEX(tr, 1, hd + '[x,y]'); jzEX(tr, 2, hd + '[x,y]'); jzEX(tr, 9, hd + 'r>0?100:0');
    });
    axr_copies(f, ev, 'xrLoupe lens', function (L, isM) {
        var iw = jzEffect(L, 'ADBE Iris Wipe', 'JZ Loupe Lens');
        jzEP(iw, 2, 32); jzEP(iw, 4, 0); jzEP(iw, 7, 0);
        jzEX(iw, 1, hd + '[x,y]'); jzEX(iw, 3, hd + 'r/0.995');
        var tr = jzEffect(L, 'ADBE Geometry2', 'JZ Loupe Switch');
        jzEX(tr, 9, hd + 'r>0?100:0');
    });
    var S = jzEvShape(f.comp, 'JZ FX xrLoupe rim', ev.t, ev.dur), g, el, tp;
    g = jzGrp(S, 'glint');
    el = jzAddEllipse(g, 10, 10, 0, 0);
    jzSetExpr(el.property('ADBE Vector Ellipse Size'), hd + 'var rr=r>LW*3?r-LW*1.6:0;[2*rr,2*rr]');
    tp = jzAddTrimPaths(g, null, null);
    tp.property('ADBE Vector Trim End').setValue(14.3); tp.property('ADBE Vector Trim Offset').setValue(-47.5);    // canvas arc −2.4 … −1.5 rad
    jzAddStroke(g, axr_pop(sc), lw * 0.6, 80);
    jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + '[x,y]');
    g = jzGrp(S, 'rim');
    el = jzAddEllipse(g, 10, 10, 0, 0);
    jzSetExpr(el.property('ADBE Vector Ellipse Size'), hd + '[2*r,2*r]');
    jzAddStroke(g, sc.fg, lw);
    jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + '[x,y]');
    jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + 'r>0?100:0');
} });

// ================================================================ light
// bar along one edge in "design space": it starts at a (along the axis the bars close on) and is w thick
function axr_bar(g, hd, vert, M, aEx, wEx) {
    var pre = hd + 'var a=' + aEx + ',w=Math.max(0,' + wEx + ');';
    return axr_rect(g, 10, 10, 0, 0, pre + (vert ? '[w,' + jzN(M) + ']' : '[' + jzN(M) + ',w]'), pre + (vert ? '[a+w/2,' + jzN(M / 2) + ']' : '[' + jzN(M / 2) + ',a+w/2]'));
}
/* ---- xrEdgeBars — 端フラッシュ: accent bars slam in from two opposite edges with a glow and retract */
jzReg('fx', 'xrEdgeBars', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = axr_S(ev), vert = axr_r(s, 1) < (W >= H ? 0.3 : 0.55), LL = vert ? W : H, M = vert ? H : W, col = axr_pop(sc), dk = axr_dk(sc.bg);
    var hd = axr_hd(f, ev, ',LL=' + jzN(LL) + ',TK=' + jzN(LL * 0.06 * axr_amp1(ev))) + 'var e=p<0.14?oe(p/0.14):Math.pow(1-(p-0.14)/0.86,1.6),th=TK*e;th=th<0.5?0:th;\n';
    // glow: feathered bands at the two edges (the feather spans 0 … 0.2 L)
    var G = jzEvSolid(f.comp, 'JZ FX xrEdgeBars glow', col, ev.t, ev.dur), fe = LL * 0.2;
    if (vert) { jzMaskRect(G, -LL, -M, LL * 0.1, 2 * M, fe); jzMaskRect(G, LL * 0.9, -M, 2 * LL, 2 * M, fe); }
    else { jzMaskRect(G, -M, -LL, 2 * M, LL * 0.1, fe); jzMaskRect(G, -M, LL * 0.9, 2 * M, 2 * LL, fe); }
    G.blendingMode = dk ? BlendingMode.SCREEN : BlendingMode.MULTIPLY;
    jzSetExpr(jzXf(G, 'ADBE Opacity'), hd + 'th>0?50*e:0');
    var S = jzEvShape(f.comp, 'JZ FX xrEdgeBars', ev.t, ev.dur), g, fl;
    g = jzGrp(S, 'inner lines');
    axr_bar(g, hd, vert, M, 'th*1.3', 'th*0.15'); axr_bar(g, hd, vert, M, 'LL-th*1.45', 'th*0.15');
    fl = jzAddFill(g, sc.fg, 0);
    jzSetExpr(fl.property('ADBE Vector Fill Opacity'), hd + '100*cl(e)');
    g = jzGrp(S, 'bars');
    axr_bar(g, hd, vert, M, '0', 'th'); axr_bar(g, hd, vert, M, 'LL-th', 'th');
    jzAddFill(g, col);
} });

/* ---- xrSpotlight — スポット: everything goes dim except a round pool of light that travels across the frame */
jzReg('fx', 'xrSpotlight', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = axr_S(ev), r = Math.min(W, H) * 0.3, dir = axr_r(s, 1) < 0.5, SZ = Math.ceil(axr_hyp(W, H) * 2.2);
    var hd = axr_hd(f, ev, ',AM=' + jzN(jzClamp(axr_ampOf(ev), 0.6, 1.1)) + ',Y=' + jzN(H * (0.5 + axr_rs(s, 2) * 0.06))) + 'var a=ahr(p,0.2,0.72)*AM,q=ios(p);\n';
    var V = axr_solid(f, 'JZ FX xrSpotlight', axr_shade(sc), SZ, SZ, ev.t, axr_t1(ev));
    axr_mell(V, SZ / 2, SZ / 2, r, r, { feather: r * 0.6, inv: true });          // clear inside 0.7 r, full dim from 1.3 r
    jzSetExpr(jzXf(V, 'ADBE Position'), hd + '[W*' + (dir ? '(0.2+0.6*q)' : '(0.8-0.6*q)') + ',Y]');
    jzSetExpr(jzXf(V, 'ADBE Opacity'), hd + 'a<0.01?0:' + (axr_dk(sc.bg) ? 80 : 60) + '*a');
} });

/* ---- xrColorStrobe — 色ストロボ: three hard flashes, each in a different scheme colour */
jzReg('fx', 'xrColorStrobe', { build: function (f, ev) {
    var sc = ev.sc, s = axr_S(ev), cols = axr_tints(sc), off = axr_h(s, 1) % cols.length, dk = axr_dk(sc.bg), seg, d = ev.dur / 3;
    var hd = axr_hd(f, ev, ',AM=' + jzN(jzClamp(axr_ampOf(ev), 0.5, 1))) + 'var sg=Math.min(2,Math.floor(p*3)),fr=p*3-sg,a=AM*(1-0.55*fr)*(1-p*p*p);a=a<0.01?0:a;\n';
    for (seg = 0; seg < 3; seg++) {
        var col = cols[(seg + off) % cols.length], t0 = ev.t + seg * d, t1 = seg < 2 ? t0 + d : axr_t1(ev);
        var A = axr_span(jzEvSolid(f.comp, 'JZ FX xrColorStrobe tint ' + (seg + 1), col, t0, d), t0, t1);
        A.blendingMode = dk ? BlendingMode.MULTIPLY : BlendingMode.SCREEN;
        jzSetExpr(jzXf(A, 'ADBE Opacity'), hd + '95*a');
        var B = axr_span(jzEvSolid(f.comp, 'JZ FX xrColorStrobe wash ' + (seg + 1), col, t0, d), t0, t1);
        jzSetExpr(jzXf(B, 'ADBE Opacity'), hd + '22*a');
    }
} });

/* ---- xrExposureDip — 露出落ち: the exposure sags, then recovers slightly too bright before settling */
jzReg('fx', 'xrExposureDip', { build: function (f, ev) {
    var sc = ev.sc, dk = axr_dk(sc.bg);
    var hd = axr_hd(f, ev, ',AM=' + jzN(jzClamp(axr_ampOf(ev), 0.6, 1.1))) + 'var d=p<0.28?oc(p/0.28):1-ioc((p-0.28)/0.34),o=p>0.55?bell((p-0.55)/0.45):0;\n';
    var D = jzEvSolid(f.comp, 'JZ FX xrExposureDip dim', axr_shade(sc), ev.t, ev.dur);
    jzSetExpr(jzXf(D, 'ADBE Opacity'), hd + 'd>0.005?' + (dk ? 86 : 70) + '*AM*d:0');
    var O = jzEvSolid(f.comp, 'JZ FX xrExposureDip over', dk ? sc.fg : '#FFFFFF', ev.t, ev.dur);
    if (dk) O.blendingMode = BlendingMode.SCREEN;
    jzSetExpr(jzXf(O, 'ADBE Opacity'), hd + 'o>0.005?' + (dk ? 13 : 40) + '*AM*o:0');
} });

/* ---- xrTileLights — タイル点灯: cells of a coarse grid light up one after another in a diagonal run */
jzReg('fx', 'xrTileLights', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = axr_S(ev), m = Math.min(W, H), gx = Math.max(3, Math.round(W / (m / 4.5))), gy = Math.max(3, Math.round(H / (m / 4.5)));
    var cols = axr_tints(sc), rev = axr_r(s, 1) < 0.5, gp = Math.max(1, Math.round(m * 0.004)), i, j, d, c, k;
    var hd = axr_hd(f, ev, ',A=' + jzN(jzClamp(axr_ampOf(ev), 0.6, 1.2))) +
        'function al(o){var u=cl((p-o*0.62)/0.38);return (u<=0||u>=1)?0:100*Math.min(1,(u<0.2?1:1-oq((u-0.2)/0.8))*0.62*A);}\n';
    var S = jzEvShape(f.comp, 'JZ FX xrTileLights', ev.t, ev.dur);
    S.blendingMode = axr_dk(sc.bg) ? BlendingMode.SCREEN : BlendingMode.MULTIPLY;
    // the cells of one diagonal light up together: one group per diagonal, one sub-group per colour
    for (d = 0; d <= gx + gy - 2; d++) {
        var by = [], any = false;
        for (c = 0; c < cols.length; c++) by.push([]);
        for (j = 0; j < gy; j++) for (i = 0; i < gx; i++) {
            if ((rev ? gx - 1 - i : i) + j !== d || axr_r(s, i, j, 2) > 0.62) continue;
            var x0 = Math.round(i * W / gx), x1 = Math.round((i + 1) * W / gx), y0 = Math.round(j * H / gy), y1 = Math.round((j + 1) * H / gy);
            by[axr_h(s, i, j, 3) % cols.length].push([(x0 + x1) / 2, (y0 + y1) / 2, x1 - x0 - 2 * gp, y1 - y0 - 2 * gp]); any = true;
        }
        if (!any) continue;
        var g = jzGrp(S, 'run ' + jzPad(d + 1, 2));
        for (c = 0; c < cols.length; c++) {
            if (!by[c].length) continue;
            var sub = axr_sub(g, 'colour ' + (c + 1));
            for (k = 0; k < by[c].length; k++) jzAddRect(sub, by[c][k][2], by[c][k][3], 0, by[c][k][0], by[c][k][1]);
            jzAddFill(sub, cols[c]);
        }
        jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), hd + 'al(' + jzN(d / (gx + gy - 2)) + ')');
    }
} });

/* ---- xrCrosshair — 照準ロック: two hairlines sweep in from the edges, lock on a point with a reticle flash and let go */
jzReg('fx', 'xrCrosshair', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = axr_S(ev), m = Math.min(W, H), a = jzClamp(axr_ampOf(ev), 0.7, 1.3), i;
    var tx = Math.round(W * (0.5 + axr_rs(s, 1) * 0.16)), ty = Math.round(H * (0.5 + axr_rs(s, 2) * 0.12)), lw = Math.max(1, Math.round(m * 0.004 * a));
    var hd = axr_hd(f, ev, ',TX=' + tx + ',TY=' + ty + ',X0=' + (axr_r(s, 3) < 0.5 ? 0 : W) + ',Y0=' + (axr_r(s, 4) < 0.5 ? 0 : H) + ',R0=' + jzN(m * 0.045 * a)) +
        'var pp=oe(p/0.42),fade=p>0.62?1-iq((p-0.62)/0.38):1,x=X0+(TX-X0)*pp,y=Y0+(TY-Y0)*pp,q=(p-0.38)/0.62,r=R0*(1+1.6*oc(q));\n';
    var S = jzEvShape(f.comp, 'JZ FX xrCrosshair', ev.t, ev.dur), g, sk, fl, t;
    // reticle: four corner brackets drawn at r = 100 and scaled to r (the stroke width is scaled back)
    g = jzGrp(S, 'reticle');
    var C = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (i = 0; i < 4; i++) jzAddPath(g, [[C[i][0] * 100, C[i][1] * 55], [C[i][0] * 100, C[i][1] * 100], [C[i][0] * 55, C[i][1] * 100]], false);
    sk = jzAddStroke(g, sc.fg, lw * 1.5);
    jzSetExpr(sk.property('ADBE Vector Stroke Width'), hd + jzN(lw * 1.5 * 100) + '/Math.max(1,r)');
    t = jzGX(g);
    t.property('ADBE Vector Position').setValue([tx, ty]);
    jzSetExpr(t.property('ADBE Vector Scale'), hd + '[r,r]');
    jzSetExpr(t.property('ADBE Vector Group Opacity'), hd + 'q>0?100*(1-iq(q)):0');
    g = jzGrp(S, 'hairlines');
    axr_rect(g, lw, H, 0, 0, null, hd + '[x,H/2]');
    axr_rect(g, W, lw, 0, 0, null, hd + '[W/2,y]');
    fl = jzAddFill(g, axr_pop(sc), 0);
    jzSetExpr(fl.property('ADBE Vector Fill Opacity'), hd + '100*fade*cl(p*12)');
    // lock flash: the square inside the reticle goes negative for a moment
    var F = jzEvShape(f.comp, 'JZ FX xrCrosshair flash', ev.t, ev.dur), gf = jzGrp(F, 'flash');
    F.blendingMode = BlendingMode.DIFFERENCE;
    axr_rect(gf, 10, 10, tx, ty, hd + '(q>0&&q<0.25)?[2*r,2*r]:[0,0]', null);
    jzAddFill(gf, '#FFFFFF');
} });

/* ---- xrLampFlicker — 明滅: lamp on its way out — irregular dimming steps (a new level every 24 fps step) */
jzReg('fx', 'xrLampFlicker', { build: function (f, ev) {
    var s = axr_S(ev), St = axr_steps(ev), V = [], j;
    for (j = 0; j < St.length; j++) V.push(axr_r(St[j].st, s, 1));
    var D = jzEvSolid(f.comp, 'JZ FX xrLampFlicker', axr_shade(ev.sc), ev.t, ev.dur);
    jzSetExpr(jzXf(D, 'ADBE Opacity'), axr_hd(f, ev, ',AM=' + jzN(jzClamp(axr_ampOf(ev), 0.6, 1.15))) + axr_si(St) + axr_arr('V', V) +
        'var v=V[si],lvl=p<0.12?0.8:(v<0.3?0.78:(v<0.55?0.42:(v<0.75?0.14:0)));var a=Math.min(0.88,lvl*AM*Math.pow(1-p,0.6));a<0.01?0:100*a');
} });

/* ---- xrZebra — ゼブラ: exposure warning — moving diagonal stripes cut through the ink only */
jzReg('fx', 'xrZebra', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = axr_S(ev), D = axr_hyp(W, H) / 2 + 2, P = Math.max(6, Math.min(W, H) / 26);
    var hd = axr_hd(f, ev, ',DD=' + jzN(D) + ',PP=' + jzN(P) + ',DU=' + jzN(0.5 * jzClamp(axr_ampOf(ev), 0.7, 1.1))) + 'var duty=DU*ahr(p,0.22,0.7);duty=duty<0.02?0:duty;var o=(p*3*PP)%PP;\n';
    var S = jzEvShape(f.comp, 'JZ FX xrZebra', ev.t, ev.dur), g = jzGrp(S, 'stripes');
    jzXf(S, 'ADBE Position').setValue([W / 2, H / 2]); jzXf(S, 'ADBE Rotate Z').setValue(axr_r(s, 1) < 0.5 ? 45 : -45);
    // background-coloured stripes: multiply (dark schemes) / screen (light ones) leaves the ground alone and cuts the ink
    S.blendingMode = axr_dk(sc.bg) ? BlendingMode.MULTIPLY : BlendingMode.SCREEN;
    axr_rect(g, 10, 2 * D, 0, 0, hd + '[PP*duty,2*DD]', hd + '[-DD-PP+o+PP*duty/2,0]');
    jzAddFill(g, sc.bg);
    axr_rep(g, Math.ceil(2 * D / P) + 3, P, 0);
} });

// ================================================================ colour
/* ---- xrCrossFringe — 十字色ズレ: the ink splits into two scheme-tinted copies — one stretched tall, one stretched wide.
   Tinted duplicates of the lyric inside its wrapper (they follow the camera), stretched about the frame centre */
jzReg('fx', 'xrCrossFringe', { build: function (f, ev) {
    var sc = ev.sc, s = axr_S(ev), dk = axr_dk(sc.bg), sw = axr_r(s, 1) < 0.5, gA = sc.ghostA || sc.accent, gB = sc.ghostB || sc.accent2 || sc.accent;
    var ws = axr_wraps(f, ev.t, ev.t + ev.dur), i, k;
    for (i = 0; i < ws.length; i++) {
        var w = ws[i], off = w.L.startTime;
        var hd = jzEvHead(ev.t - off, ev.dur, ',DK=' + jzN(0.1 * axr_amp1(ev))) + AXR_FNS + 'var d=DK*punch(p,0.2);d=d<0.002?0:d;\n';
        for (k = 0; k < 2; k++) {
            var D = axr_inkCopy(w, ev, 'JZ FX xrCrossFringe ' + (k ? 'wide' : 'tall'), k ? (sw ? gA : gB) : (sw ? gB : gA));
            D.moveToBeginning();
            var tr = jzEffect(D, 'ADBE Geometry2', 'JZ Fringe Stretch'); jzEP(tr, 3, 0);
            jzEX(tr, k ? 5 : 4, hd + '100*(1+d*' + (k ? '1' : '1.6') + ')'); jzEX(tr, 9, hd + 'd>0?95:0');
            D.blendingMode = dk ? BlendingMode.SCREEN : BlendingMode.MULTIPLY;
        }
    }
} });

/* ---- xrCheckerInvert — チェック反転: negative squares swell out of a chequered grid, swap phase and shrink away */
jzReg('fx', 'xrCheckerInvert', { build: function (f, ev) {
    var W = f.W, H = f.H, s = axr_S(ev), c = Math.min(W, H) / (4 + (axr_h(s, 1) % 2)), nx = Math.ceil(W / c / 2) * 2 + 1, ny = Math.ceil(H / c / 2) * 2 + 1;
    var ox = (W - nx * c) / 2, oy = (H - ny * c) / 2, ph, a;
    var hd = axr_hd(f, ev, ',C=' + jzN(c) + ',AM=' + jzN(Math.min(1, axr_ampOf(ev)))) + 'var e=(p<0.5?ahr(p*2,0.5,0.82):ahr((p-0.5)*2,0.18,0.5))*AM,sd=C*e;sd=sd<0.5?0:sd;\n';
    var S = jzEvShape(f.comp, 'JZ FX xrCheckerInvert', ev.t, ev.dur);
    S.blendingMode = BlendingMode.DIFFERENCE;
    // each phase of the chequer = two square lattices (pitch 2c): one square repeated along x, then along y
    for (ph = 0; ph < 2; ph++) for (a = 0; a < 2; a++) {
        var b = (a + ph) % 2, cx = Math.ceil((nx - a) / 2), cy = Math.ceil((ny - b) / 2);
        if (cx < 1 || cy < 1) continue;
        var g = jzGrp(S, 'phase ' + (ph + 1) + (a ? ' b' : ' a'));
        axr_rect(g, 10, 10, ox + a * c + c / 2, oy + b * c + c / 2, hd + (ph ? 'p<0.5?[0,0]:[sd,sd]' : 'p<0.5?[sd,sd]:[0,0]'), null);
        jzAddFill(g, '#FFFFFF');
        axr_rep(g, cx, 2 * c, 0);
        axr_rep(g, cy, 0, 2 * c);
    }
} });

/* ---- xrStripeMosaic — 縞モザイク: resolution collapses along one axis only — the picture turns into flat bars and resolves again */
jzReg('fx', 'xrStripeMosaic', { build: function (f, ev) {
    var W = f.W, H = f.H, s = axr_S(ev), rows = axr_r(s, 1) < 0.3, LL = rows ? H : W;
    var hd = axr_hd(f, ev, ',N0=' + jzN(LL / 3) + ',N1=' + jzN(LL / (40 + 50 * jzClamp(axr_ampOf(ev) - 0.3, 0, 1)))) + 'var e=punch(p,0.3),n=Math.max(6,Math.round(N0+(N1-N0)*oc(e)));\n';
    var L = jzAdjLayer(f.comp, 'JZ FX xrStripeMosaic', ev.t, ev.dur);
    var mo = jzEffect(L, 'ADBE Mosaic', 'JZ Stripe Mosaic');
    jzEP(mo, rows ? 1 : 2, Math.max(2, Math.round((rows ? W : H) / 2)));
    jzEX(mo, rows ? 2 : 1, hd + 'n');
    jzSetExpr(jzXf(L, 'ADBE Opacity'), hd + 'e<0.02?0:100*cl(e*3)');
} });

/* ---- xrFourTints — 四色パネル: four quadrants, four scheme tints, trading places every quarter of the event */
function axr_rgba(hex) { var c = jzHex(hex); return '[' + jzN(c[0]) + ',' + jzN(c[1]) + ',' + jzN(c[2]) + ',1]'; }
jzReg('fx', 'xrFourTints', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = axr_S(ev), base = axr_tints(sc), cols = [], C = [], i, q, k;
    for (i = 0; i < 4; i++) { cols.push(i < base.length ? base[i] : jzMixHex(base[i % base.length], sc.fg, 0.5)); C.push(axr_rgba(cols[i])); }
    var xs = Math.round(W / 2), ys = Math.round(H / 2), Q = [[0, 0, xs, ys], [xs, 0, W - xs, ys], [xs, ys, W - xs, H - ys], [0, ys, xs, H - ys]];
    var hd = axr_hd(f, ev, ',AM=' + jzN(Math.min(1, axr_ampOf(ev))) + ',R0=' + (axr_h(s, 1) % 4)) + 'var a=ahr(p,0.12,0.7)*AM;a=a<0.01?0:a;var C=[' + C.join(',') + '];\n';
    for (k = 0; k < 2; k++) {        // the tint itself (multiply / screen), then a thin wash of the same colours
        var S = jzEvShape(f.comp, 'JZ FX xrFourTints ' + (k ? 'wash' : 'tint'), ev.t, ev.dur);
        for (q = 0; q < 4; q++) {
            var g = jzGrp(S, 'quadrant ' + (q + 1));
            jzAddRect(g, Q[q][2], Q[q][3], 0, Q[q][0] + Q[q][2] / 2, Q[q][1] + Q[q][3] / 2);
            var fl = jzAddFill(g, cols[q]);
            jzSetExpr(fl.property('ADBE Vector Fill Color'), hd + 'C[(' + q + '+Math.floor(p*4)+R0)%4]');
        }
        if (!k) S.blendingMode = axr_dk(sc.bg) ? BlendingMode.MULTIPLY : BlendingMode.SCREEN;
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + (k ? '20*a' : '95*a'));
    }
} });

/* ---- xrClockInvert — 時計反転: a clock hand sweeps round and leaves the picture negative behind it; a second sweep puts it right.
   A white difference solid under a Radial Wipe: first lap it is uncovered behind the hand, second lap wiped away behind it */
jzReg('fx', 'xrClockInvert', { build: function (f, ev) {
    var W = f.W, H = f.H, s = axr_S(ev), q4 = axr_h(s, 1) % 4, ccw = axr_r(s, 2) < 0.5, sg = ccw ? -1 : 1, R = axr_hyp(W, H), k;
    var hd = axr_hd(f, ev) + 'var fa=p<0.5?ioc(p*2):1,fb=p<0.5?0:ioc((p-0.5)*2);\n', half = ev.dur / 2;
    for (k = 0; k < 2; k++) {
        var t0 = ev.t + k * half, N = axr_span(jzEvSolid(f.comp, 'JZ FX xrClockInvert ' + (k ? 'lap 2' : 'lap 1'), '#FFFFFF', t0, half), t0, k ? axr_t1(ev) : t0 + half);
        N.blendingMode = BlendingMode.DIFFERENCE;
        var rw = jzEffect(N, 'ADBE Radial Wipe', 'JZ Clock Sweep');
        jzEP(rw, 2, q4 * 90); jzEP(rw, 3, [W / 2, H / 2]); jzEP(rw, 5, 0);
        // lap 1: wiped the other way round with completion 1 − f → what is left is the wedge the hand has passed
        jzEP(rw, 4, (k ? sg > 0 : sg < 0) ? 1 : 2);
        jzEX(rw, 1, hd + (k ? '100*fb' : '100*(1-fa)'));
    }
    var S = jzEvShape(f.comp, 'JZ FX xrClockInvert hand', ev.t, ev.dur), g = jzGrp(S, 'hand');
    jzAddRect(g, R, Math.max(1.5, Math.min(W, H) * 0.005), 0, R / 2, 0);
    jzAddFill(g, axr_pop(ev.sc));
    var t = jzGX(g);
    t.property('ADBE Vector Position').setValue([W / 2, H / 2]);
    jzSetExpr(t.property('ADBE Vector Rotation'), hd + jzN(-90 + q4 * 90) + '+' + jzN(sg * 360) + '*(p<0.5?fa:fb)');
    jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '(fa-fb)<0.002?0:100');
} });

// ================================================================ texture
/* ---- xrScanBurst — 走査線バースト: fine scan lines burst open into thick bars that cut through the picture while scrolling */
jzReg('fx', 'xrScanBurst', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = axr_S(ev), P0 = Math.max(4, H / 150), hl = Math.max(1, H * 0.0015), g, fl, rp;
    var hd = axr_hd(f, ev, ',AM=' + jzN(Math.min(1, axr_ampOf(ev))) + ',P0=' + jzN(P0) + ',DR=' + (axr_r(s, 1) < 0.5 ? 1 : -1)) +
        'var a=Math.pow(1-p,0.9)*AM;a=a<0.01?0:a;var PP=P0+(H/8-P0)*iq(p),th=PP*0.5*(0.35+0.65*a),o=((p*H*0.35*DR)%PP+PP)%PP;\n';
    var S = jzEvShape(f.comp, 'JZ FX xrScanBurst', ev.t, ev.dur);
    g = jzGrp(S, 'edge lights');        // a thin accent line under each bar once the bars are coarse
    axr_rect(g, W, hl, 0, 0, hd + 'PP>H/40?[W,' + jzN(hl) + ']:[0,0]', hd + '[W/2,o-PP+th+' + jzN(hl / 2) + ']');
    fl = jzAddFill(g, axr_pop(sc), 0);
    jzSetExpr(fl.property('ADBE Vector Fill Opacity'), hd + '50*a');
    rp = axr_rep(g, 43, 0, 10);
    jzSetExpr(rp.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position'), hd + '[0,PP]');
    g = jzGrp(S, 'bars');
    axr_rect(g, W, 10, 0, 0, hd + '[W,th]', hd + '[W/2,o-PP+th/2]');
    fl = jzAddFill(g, sc.bg, 0);
    jzSetExpr(fl.property('ADBE Vector Fill Opacity'), hd + '100*Math.min(1,a*1.6)');
    rp = axr_rep(g, Math.ceil(H / P0) + 2, 0, 10);
    jzSetExpr(rp.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position'), hd + '[0,PP]');
} });

/* ---- xrDotWave — ドット波: a ring of printed dots rolls out from one corner across the frame.
   Three dot screens (large / medium / small dots), each shown through a ring matte of its own width: big dots at the crest, small at the rims */
jzReg('fx', 'xrDotWave', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = axr_S(ev), m = Math.min(W, H), pt = m / 19, cn = axr_h(s, 1) % 4, ox = cn & 1 ? W : 0, oy = cn & 2 ? H : 0;
    var D = axr_hyp(W, H), band = D * 0.2, rm = pt * 0.47 * jzClamp(axr_ampOf(ev), 0.7, 1.05), nx = Math.ceil(W / pt) + 1, ny = Math.ceil(H / pt) + 1, k, a;
    var hd = axr_hd(f, ev, ',DG=' + jzN(D) + ',BD=' + jzN(band)) + 'var R=-BD+(DG+2*BD)*oq(p);\n';
    var tiers = [[0.36, 0.92], [0.72, 0.64], [0.95, 0.34]];       // [dot radius / rm, half width of its ring / band]  (r = rm·cos(d·π/2))
    for (k = 0; k < tiers.length; k++) {
        var Dl = jzEvShape(f.comp, 'JZ FX xrDotWave dots ' + (k + 1), ev.t, ev.dur), rr = rm * tiers[k][0], g, el;
        for (a = 0; a < 2; a++) {       // even rows / odd rows (shifted half a pitch)
            var cnt = a ? Math.floor(ny / 2) : Math.ceil(ny / 2);
            if (cnt < 1) continue;
            g = jzGrp(Dl, a ? 'odd rows' : 'even rows');
            jzAddEllipse(g, 2 * rr, 2 * rr, 0, 0);
            jzAddFill(g, axr_pop(sc));
            axr_rep(g, nx, pt, 0);
            axr_rep(g, cnt, 0, 2 * pt);
            jzGX(g).property('ADBE Vector Position').setValue([a ? pt / 2 : 0, a ? pt : 0]);
        }
        var M = jzEvShape(f.comp, 'JZ FX xrDotWave ring ' + (k + 1), ev.t, ev.dur), hw = 'BD*' + jzN(tiers[k][1]);
        g = jzGrp(M, 'ring');
        el = jzAddEllipse(g, 10, 10, 0, 0);
        jzSetExpr(el.property('ADBE Vector Ellipse Size'), hd + 'var ro=Math.max(0,R+' + hw + ');[2*ro,2*ro]');
        el = jzAddEllipse(g, 10, 10, 0, 0);
        jzSetExpr(el.property('ADBE Vector Ellipse Size'), hd + 'var ri=Math.max(0,R-' + hw + ');[2*ri,2*ri]');
        axr_eo(jzAddFill(g, '#FFFFFF'));
        jzGX(g).property('ADBE Vector Position').setValue([ox, oy]);
        Dl.trackMatteType = TrackMatteType.ALPHA; M.enabled = false;
    }
} });

/* ---- xrDropout — 欠落: signal dropout — grid-aligned rectangles of the picture go missing, fewer every frame (one layer per 24 fps step) */
jzReg('fx', 'xrDropout', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = axr_S(ev), St = axr_steps(ev), B = Math.max(4, Math.round(Math.min(W, H) / 10));
    var n0 = (4 + (axr_h(s, 1) % 4)) * axr_amp1(ev), nx = Math.ceil(W / B), ny = Math.ceil(H / B), lw = Math.max(1, Math.round(B * 0.05)), j, i, c, q;
    var gc = [sc.ghostA || sc.accent, sc.ghostB || sc.accent2 || sc.accent];
    for (j = 0; j < St.length; j++) {
        var st = St[j].st * 29 + s, k = jzClamp((St[j].t0 - ev.t) / Math.max(1 / 240, ev.dur), 0, 1), n = Math.round(n0 * (1 - k)), holes = [], lines = [[], []];
        for (i = 0; i < n; i++) {
            var gw = 1 + (axr_h(st, i, 2) % 4), gh = 1 + (axr_h(st, i, 3) % 2);
            var x = (axr_h(st, i, 4) % Math.max(1, nx - gw + 1)) * B, y = Math.round(ny * (0.2 + 0.6 * axr_r(st, i, 5)) - gh / 2) * B;
            holes.push([x + gw * B / 2, y + gh * B / 2, gw * B, gh * B]);
            c = axr_r(st, i, 6) < 0.5 ? 0 : 1;
            if (axr_r(st, i, 7) < 0.5) lines[c].push([x + lw / 2, y + gh * B / 2, lw, gh * B]); else lines[c].push([x + gw * B / 2, y + gh * B - lw / 2, gw * B, lw]);
        }
        if (!holes.length) continue;
        var S = axr_span(jzEvShape(f.comp, 'JZ FX xrDropout ' + (j + 1), St[j].t0, St[j].t1 - St[j].t0), St[j].t0, St[j].t1), g;
        for (c = 0; c < 2; c++) {
            if (!lines[c].length) continue;
            g = jzGrp(S, c ? 'edges B' : 'edges A');
            for (q = 0; q < lines[c].length; q++) jzAddRect(g, lines[c][q][2], lines[c][q][3], 0, lines[c][q][0], lines[c][q][1]);
            jzAddFill(g, gc[c], 80);
        }
        g = jzGrp(S, 'holes');
        for (q = 0; q < holes.length; q++) jzAddRect(g, holes[q][2], holes[q][3], 0, holes[q][0], holes[q][1]);
        jzAddFill(g, sc.bg);
    }
} });

/* ---- xrTapeCrease — テープ折れ: a crease travels through the tape — a squeezed, side-slipped band with a bright fold line.
   A picture copy squeezed about the crease (Transform) and wiped down to the band from above and below (two Linear Wipes) */
jzReg('fx', 'xrTapeCrease', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = axr_S(ev), up = axr_r(s, 1) < 0.5, dir = axr_r(s, 2) < 0.5 ? 1 : -1, dk = axr_dk(sc.bg), lw = Math.max(1, H * 0.003), g, fl;
    var hd = axr_hd(f, ev, ',A=' + jzN(axr_amp1(ev))) + 'var amt=Math.pow(bell(p),0.6),y0=H*' + (up ? '(0.8-0.6*p)' : '(0.2+0.6*p)') + ',hb=H*0.05*A*amt;hb=hb<1?0:hb;\n';
    var Gd = jzEvShape(f.comp, 'JZ FX xrTapeCrease ground', ev.t, ev.dur);
    g = jzGrp(Gd, 'ground');
    axr_rect(g, W, 10, 0, 0, hd + '[W,2*hb]', hd + '[W/2,y0]');
    jzAddFill(g, sc.bg);
    axr_copies(f, ev, 'xrTapeCrease', function (L, isM) {
        var tr = axr_xf(L, 'JZ Crease Squeeze', null); jzEP(tr, 3, 0); jzEP(tr, 4, 100 / 1.8);
        // (the browser slips the rows in a triangle, 0 at the band's edges … 0.04 W at the fold: here the band slips as a whole)
        jzEX(tr, 1, hd + '[W/2,y0]'); jzEX(tr, 2, hd + '[W/2+' + jzN(dir * W * 0.024) + '*A*amt,y0]'); jzEX(tr, 9, hd + 'hb>0?100:0');
        var w1 = jzEffect(L, 'ADBE Linear Wipe', 'JZ Crease Top'); jzEP(w1, 2, 180); jzEP(w1, 3, 0);
        jzEX(w1, 1, hd + '100*cl((y0-hb)/H)');
        var w2 = jzEffect(L, 'ADBE Linear Wipe', 'JZ Crease Bottom'); jzEP(w2, 2, 0); jzEP(w2, 3, 0);
        jzEX(w2, 1, hd + '100*cl((H-y0-hb)/H)');
    });
    var S = jzEvShape(f.comp, 'JZ FX xrTapeCrease fold', ev.t, ev.dur);
    g = jzGrp(S, 'fold line');
    axr_rect(g, W, lw, 0, 0, null, hd + '[W/2,y0]');
    fl = jzAddFill(g, dk ? '#FFFFFF' : axr_shade(sc), 0);
    jzSetExpr(fl.property('ADBE Vector Fill Opacity'), hd + 'hb>0?' + (dk ? 60 : 45) + '*amt:0');
    g = jzGrp(S, 'fold shadow');
    axr_rect(g, W, 10, 0, 0, hd + '[W,hb*0.5]', hd + '[W/2,y0+' + jzN(lw / 2) + '+hb*0.25]');
    fl = jzAddFill(g, '#000000', 0);
    jzSetExpr(fl.property('ADBE Vector Fill Opacity'), hd + '30*amt');
} });

/* ---- xrMoire — モアレ: two sets of concentric rings drift apart and interfere */
jzReg('fx', 'xrMoire', { build: function (f, ev) {
    var W = f.W, H = f.H, s = axr_S(ev), m = Math.min(W, H), gp = m / 24, R = axr_hyp(W, H) * 0.56, n = Math.min(60, Math.ceil(R / gp)), i, k;
    var hd = axr_hd(f, ev, ',AL=' + jzN(0.2 * jzClamp(axr_ampOf(ev), 0.6, 1.1)) + ',A0=' + jzN(axr_r(s, 1) * 2 * Math.PI) + ',M=' + jzN(m)) +
        'var al=AL*ahs(p,0.25,0.6);al=al<0.01?0:al;var an=A0+p*0.9,sep=M*(0.03+0.1*p);\n';
    var S = jzEvShape(f.comp, 'JZ FX xrMoire', ev.t, ev.dur);
    for (k = 0; k < 2; k++) {
        var g = jzGrp(S, 'rings ' + (k + 1));
        for (i = 1; i <= n; i++) jzAddEllipse(g, 2 * i * gp, 2 * i * gp);
        jzAddStroke(g, ev.sc.fg, gp * 0.32);
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + '[W/2' + (k ? '+' : '-') + 'Math.cos(an)*sep,H/2' + (k ? '+' : '-') + 'Math.sin(an)*sep]');
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*al');
} });

/* ---- xrPixelSparks — 画素はじけ: stray pixels — small grid-snapped squares in scheme colours pop all over the frame (one layer per 24 fps step) */
jzReg('fx', 'xrPixelSparks', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = axr_S(ev), St = axr_steps(ev), q = Math.max(2, Math.round(Math.min(W, H) * 0.016)), cols = axr_tints(sc), j, i, c, k;
    cols.push(sc.fg);
    for (j = 0; j < St.length; j++) {
        var st = St[j].st * 17 + s, kk = jzClamp((St[j].t0 - ev.t) / Math.max(1 / 240, ev.dur), 0, 1);
        var n = Math.round(54 * axr_amp1(ev) * Math.pow(Math.sin(Math.PI * kk), 0.7)), by = [];
        if (n < 1) continue;
        for (c = 0; c < cols.length; c++) by.push([]);
        for (i = 0; i < n; i++) {
            var z = q * (1 + (axr_h(st, i, 1) % 3)), x = Math.floor(axr_r(st, i, 2) * W / q) * q, y = Math.floor(axr_r(st, i, 3) * H / q) * q;
            var w = axr_r(st, i, 5) < 0.3 ? z * (2 + (axr_h(st, i, 6) % 4)) : z, h = axr_r(st, i, 5) < 0.3 ? q : z;
            by[axr_h(st, i, 4) % cols.length].push([x + w / 2, y + h / 2, w, h]);
        }
        var S = axr_span(jzEvShape(f.comp, 'JZ FX xrPixelSparks ' + (j + 1), St[j].t0, St[j].t1 - St[j].t0), St[j].t0, St[j].t1);
        for (c = cols.length - 1; c >= 0; c--) {
            if (!by[c].length) continue;
            var g = jzGrp(S, 'sparks ' + (c + 1));
            for (k = 0; k < by[c].length; k++) jzAddRect(g, by[c][k][2], by[c][k][3], 0, by[c][k][0], by[c][k][1]);
            jzAddFill(g, cols[c]);
        }
    }
} });

// ================================================================ framing
/* ---- xrLetterSnap — 帯スナップ: cinema bars snap shut to a wide frame with a little overshoot, then open again */
jzReg('fx', 'xrLetterSnap', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, lw = Math.max(1, H * 0.003), l = [sc.ink, sc.fg, sc.bg], dkst = null, i, g, fl;
    for (i = 0; i < l.length; i++) if (l[i] && (dkst === null || jzLum(l[i]) < jzLum(dkst))) dkst = l[i];
    var col = jzContrast(dkst, sc.bg) > 1.25 ? dkst : jzMixHex(sc.bg, sc.fg, 0.2);
    var hd = axr_hd(f, ev, ',HB=' + jzN(H * (W >= H ? 0.125 : 0.075) * jzClamp(axr_ampOf(ev), 0.7, 1.2))) +
        'var e=p<0.22?ob(p/0.22,2.2):(p>0.7?1-ic((p-0.7)/0.3):1),hb=HB*e;hb=hb<0.5?0:hb;\n';
    var S = jzEvShape(f.comp, 'JZ FX xrLetterSnap', ev.t, ev.dur);
    g = jzGrp(S, 'edge lines');
    axr_rect(g, W, lw, 0, 0, null, hd + '[W/2,hb+' + jzN(lw / 2) + ']');
    axr_rect(g, W, lw, 0, 0, null, hd + '[W/2,H-hb-' + jzN(lw / 2) + ']');
    fl = jzAddFill(g, axr_pop(sc), 0);
    jzSetExpr(fl.property('ADBE Vector Fill Opacity'), hd + 'hb>0?100*cl(e):0');
    g = jzGrp(S, 'bars');
    axr_rect(g, W, 10, 0, 0, hd + '[W,hb]', hd + '[W/2,hb/2]');
    axr_rect(g, W, 10, 0, 0, hd + '[W,hb]', hd + '[W/2,H-hb/2]');
    jzAddFill(g, col);
} });

/* ---- xrBlink — まばたき: eyelids — the frame closes to a slit like a blinking eye and opens again */
jzReg('fx', 'xrBlink', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, g, el, sk;
    var col = jzLum(sc.bg) < 0.08 ? jzMixHex(sc.bg, sc.fg, 0.1) : axr_shade(sc);
    var hd = axr_hd(f, ev) + 'var b=4/9,c=p<b?iq(p/b):1-oq((p-b)/(1-b)),rx=W*0.8*Math.pow(1-c,0.22),ry=H*0.86*(1-c);\n';
    var S = jzEvShape(f.comp, 'JZ FX xrBlink', ev.t, ev.dur);
    g = jzGrp(S, 'lash line');
    el = jzAddEllipse(g, 10, 10, W / 2, H / 2);
    jzSetExpr(el.property('ADBE Vector Ellipse Size'), hd + 'ry>1?[2*rx,2*ry]:[0,0]');
    sk = jzAddStroke(g, axr_pop(sc), Math.max(1.5, H * 0.005), 0);
    jzSetExpr(sk.property('ADBE Vector Stroke Opacity'), hd + '100*cl(c*2)');
    g = jzGrp(S, 'lids');            // the whole frame minus the eye opening (even-odd)
    jzAddRect(g, W + 8, H + 8, 0, W / 2, H / 2);
    el = jzAddEllipse(g, 10, 10, W / 2, H / 2);
    jzSetExpr(el.property('ADBE Vector Ellipse Size'), hd + 'ry>0.5?[2*rx,2*ry]:[0,0]');
    axr_eo(jzAddFill(g, col));
    jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + 'c<0.003?0:100');
} });

/* ---- xrBorderPunch — 枠パンチ: a thick coloured border punches in while the picture steps back inside it */
jzReg('fx', 'xrBorderPunch', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, m = Math.min(W, H), lw = Math.max(1, m * 0.003), g, sk;
    var hd = axr_hd(f, ev, ',A=' + jzN(axr_amp1(ev)) + ',T0K=' + jzN(m * 0.055 * axr_amp1(ev))) +
        'var e=p<0.2?ob(p/0.2,2):1-ioc((p-0.2)/0.8),t=T0K*e;t=t<0.5?0:t;var z=t>0?1-0.07*A*e:1,o=t*1.35;\n';
    var L = jzAdjLayer(f.comp, 'JZ FX xrBorderPunch', ev.t, ev.dur);
    var tr = axr_xf(L, 'JZ Border Step Back', [W / 2, H / 2]);
    jzEX(tr, 4, hd + '100*z');
    var S = jzEvShape(f.comp, 'JZ FX xrBorderPunch frame', ev.t, ev.dur);
    g = jzGrp(S, 'inner line');
    axr_rect(g, W, H, W / 2, H / 2, hd + '[Math.max(0,W-2*o),Math.max(0,H-2*o)]', null);
    sk = jzAddStroke(g, sc.fg, lw, 0);
    jzSetExpr(sk.property('ADBE Vector Stroke Opacity'), hd + 't>0?100*cl(e):0');
    g = jzGrp(S, 'border');
    jzAddRect(g, W + 8, H + 8, 0, W / 2, H / 2);
    axr_rect(g, W, H, W / 2, H / 2, hd + '[W-2*t,H-2*t]', null);
    axr_eo(jzAddFill(g, axr_pop(sc)));
    g = jzGrp(S, 'ground');           // background between the border and the picture that stepped back
    jzAddRect(g, W + 8, H + 8, 0, W / 2, H / 2);
    axr_rect(g, W, H, W / 2, H / 2, hd + '[W*z,H*z]', null);
    axr_eo(jzAddFill(g, sc.bg));
} });

/* ---- xrCornerFold — 角折れ: one corner of the picture is dog-eared — the flap folds over, shows its back and flattens again.
   Drawn at fold size 100 in the corner's own axes; the layer's scale (mirrored per corner) is the fold size */
jzReg('fx', 'xrCornerFold', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = axr_S(ev), cn = axr_h(s, 1) % 4, lw = Math.max(1, Math.min(W, H) * 0.003), g, sk;
    var hd = axr_hd(f, ev, ',F0=' + jzN(Math.min(W, H) * 0.4 * axr_amp1(ev))) + 'var fo=F0*ahs(p,0.3,0.62);fo=fo<1?0:fo;\n';
    var S = jzEvShape(f.comp, 'JZ FX xrCornerFold', ev.t, ev.dur);
    jzXf(S, 'ADBE Position').setValue([cn & 1 ? W : 0, cn & 2 ? H : 0]);
    g = jzGrp(S, 'crease');
    jzAddPath(g, [[100, 0], [0, 100]], false);
    sk = jzAddStroke(g, sc.fg, lw, 60);
    jzSetExpr(sk.property('ADBE Vector Stroke Width'), hd + jzN(lw * 100) + '/Math.max(1,fo)');
    g = jzGrp(S, 'flap fold shade');       // the flap is darker along the crease
    jzAddPath(g, [[100, 0], [0, 100], [50, 100], [100, 50]], true);
    jzAddFill(g, '#000000', 12);
    g = jzGrp(S, 'flap back');
    jzAddPath(g, [[100, 0], [0, 100], [100, 100]], true);
    jzAddFill(g, jzMixHex(sc.bg, sc.fg, axr_dk(sc.bg) ? 0.24 : 0.1));
    g = jzGrp(S, 'under the corner');
    jzAddPath(g, [[0, 0], [100, 0], [0, 100]], true);
    jzAddFill(g, axr_pop(sc));
    g = jzGrp(S, 'cast shadow');           // what the flap casts on the page
    jzAddPath(g, [[125, 0], [0, 125], [125, 125]], true);
    jzAddFill(g, '#000000', 17);
    jzSetExpr(jzXf(S, 'ADBE Scale'), hd + '[' + (cn & 1 ? '-' : '') + 'fo,' + (cn & 2 ? '-' : '') + 'fo]');
    jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + 'fo>0?100:0');
} });
