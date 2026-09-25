// ================================================================ effect events part 1 (AE port of the fx entries in src/11p_looks.js)
// fx.build(f, ev): one plan event. f.comp = the MAIN comp (absolute time), ev = { t, dur, amp, type, seed, sc }.
// Make an adjustment layer (jzAdjLayer) or overlay layers (jzEvShape / jzEvSolid) covering [ev.t, ev.t + ev.dur] and drive them with
// expressions built on jzEvHead(ev.t, ev.dur) — it defines T0, TD and p (0..1 progress through the event, like the browser's k).

/* ---- strobe — ストロボ: the picture flips to its negative on alternate quarters */
jzReg('fx', 'strobe', { build: function (f, ev) {
    var L = jzAdjLayer(f.comp, 'JZ FX strobe', ev.t, ev.dur);
    var iv = jzEffect(L, 'ADBE Invert', 'JZ Strobe');
    jzEX(iv, 2, jzEvHead(ev.t, ev.dur) + 'Math.floor(p*4)%2?100:0');     // blend with original: 0 = inverted
} });

// ================================================================ fx1 helpers
// exact port of the browser's J.h / J.r / J.rs / J.rr, so every variant choice (direction, corner, grid, strips …) matches the web frame
function fx1_h(a, b, c, d, e) {
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
function fx1_r(a, b, c, d, e) { return fx1_h(a, b, c, d, e) / 4294967296; }
function fx1_rs(a, b, c, d, e) { return fx1_r(a, b, c, d, e) * 2 - 1; }
function fx1_rr(lo, hi, a, b, c, d, e) { return lo + (hi - lo) * fx1_r(a, b, c, d, e); }
function fx1_S(ev) { return fx1_h(Math.round(ev.t * 1000), 7331); }                 // evS(ev)
function fx1_amp(ev) { return jzClamp(ev.amp == null ? 1 : ev.amp, 0.3, 1.6); }     // ampOf(ev)
function fx1_dark(c) { return jzLum(c || '#000000') < 0.45; }                        // isDark
function fx1_best(list, against) {
    var b = list[0], bv = -1;
    for (var i = 0; i < list.length; i++) { if (!list[i]) continue; var v = jzContrast(list[i], against); if (v > bv) { bv = v; b = list[i]; } }
    return b;
}
function fx1_ink(sc) {                                                                 // inkOf(sc)
    var l = [sc.ink, sc.fg];
    for (var i = 0; i < l.length; i++) if (l[i] && jzContrast(l[i], sc.bg) >= 1.6) return l[i];
    return sc.fg;
}
// extra easings for the expressions (JZ_FNS has cl oe oc ic iq …)
function fx1_E() { return 'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}function bell(x){return Math.sin(Math.PI*cl(x));}\n'; }
function fx1_head(ev, extra) { return jzEvHead(ev.t, ev.dur, extra) + fx1_E(); }

// the browser re-randomises glitches on a 24 fps clock (I.step = floor(t*24)): list the steps inside the event
function fx1_steps(ev) {
    var k0 = Math.floor(ev.t * 24 + 1e-6), k1 = Math.floor((ev.t + ev.dur) * 24 - 1e-6), o, j;
    if (k1 < k0) k1 = k0;
    o = { k0: k0, n: k1 - k0 + 1, ts: [] };
    for (j = 0; j < o.n; j++) o.ts.push(j ? (k0 + j) / 24 - 1e-4 : Math.min(ev.t, k0 / 24));
    return o;
}
// expression snippet: si = index of the current 24 fps step inside the event (off = layer-comp time offset to absolute time)
function fx1_si(S, off) { return 'var si=Math.max(0,Math.min(' + (S.n - 1) + ',Math.floor((time+' + jzN(off || 0) + ')*24+0.0001)-' + S.k0 + '));'; }
function fx1_arr(name, a) { var s = []; for (var i = 0; i < a.length; i++) s.push(jzN(a[i])); return 'var ' + name + '=[' + s.join(',') + '];'; }
// hold keyframes (one value per step)
function fx1_hold(prop, ts, vs) {
    if (!prop) return;
    try {
        if (vs.length === 1) { prop.setValue(vs[0]); return; }
        var i;
        for (i = 0; i < ts.length; i++) prop.setValueAtTime(ts[i], vs[i]);
        for (i = 1; i <= prop.numKeys; i++) prop.setInterpolationTypeAtKey(i, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
    } catch (e) { jzWarn('fx1 keys: ' + e.toString()); }
}
function fx1_rectShape(x0, y0, x1, y1) { var sh = new Shape(); sh.vertices = [[x1, y0], [x1, y1], [x0, y1], [x0, y0]]; sh.closed = true; return sh; }
function fx1_sub(g, name) { var s = jzVecs(g).addProperty('ADBE Vector Group'); if (name) s.name = name; return s; }
function fx1_root(L) { return L.property('ADBE Root Vectors Group'); }
// shape group holding one rectangle whose box comes from an expression body defining x, y (top-left), w, h
function fx1_box(vecs, name, hex, op, hd, body) {
    var g = vecs.addProperty('ADBE Vector Group'); g.name = name;
    var r = jzAddRect(g, 10, 10);
    jzSetExpr(r.property('ADBE Vector Rect Size'), hd + body + '[Math.max(0,w),Math.max(0,h)]');
    jzSetExpr(r.property('ADBE Vector Rect Position'), hd + body + '[x+w/2,y+h/2]');
    jzAddFill(g, hex, op);
    return g;
}
// group mapping a "design space" (the move runs along +x over LL px, M across) onto the frame: mirrored when dir < 0, transposed when vert
function fx1_orient(L, LL, dir, vert) {
    var g = jzGrp(L, 'orient'), t = jzGX(g);
    if (vert) { t.property('ADBE Vector Rotation').setValue(90); t.property('ADBE Vector Scale').setValue([dir * 100, -100]); t.property('ADBE Vector Position').setValue([0, dir > 0 ? 0 : LL]); }
    else { t.property('ADBE Vector Scale').setValue([dir * 100, 100]); t.property('ADBE Vector Position').setValue([dir > 0 ? 0 : LL, 0]); }
    return g;
}
// adjustment layer applying a Transform inside one rectangle, re-keyed (hold) on every 24 fps step.
// P[j] per step = { x, y, w, h (mask), ax, ay (source point), px, py (where it lands), sw (scale width %) } or null (off at that step)
function fx1_strip(f, ev, name, S, P, op) {
    var j, ref = null;
    for (j = 0; j < P.length; j++) if (P[j]) { ref = P[j]; break; }
    if (!ref) return null;
    var L = jzAdjLayer(f.comp, name, ev.t, ev.dur);
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
    var tr = jzEffect(L, 'ADBE Geometry2', 'JZ Strip');
    jzEP(tr, 3, 0);                                               // uniform scale off
    var sh = [], an = [], po = [], sw = [], ops = [];
    for (j = 0; j < S.n; j++) {
        var q = P[j] || ref;
        sh.push(fx1_rectShape(q.x, q.y, q.x + q.w, q.y + q.h)); an.push([q.ax, q.ay]); po.push([q.px, q.py]);
        sw.push(Math.min(10000, q.sw || 100)); ops.push(P[j] ? op : 0);
    }
    fx1_hold(m.property('ADBE Mask Shape'), S.ts, sh);
    fx1_hold(tr.property(1), S.ts, an); fx1_hold(tr.property(2), S.ts, po); fx1_hold(tr.property(5), S.ts, sw);
    fx1_hold(jzXf(L, 'ADBE Opacity'), S.ts, ops);
    return L;
}
// the cut wrappers (precomp layers holding 'content') visible during [t0, t1]
function fx1_layer(comp, name) { for (var i = 1; i <= comp.numLayers; i++) if (comp.layer(i).name === name) return comp.layer(i); return null; }
function fx1_wraps(f, t0, t1) {
    var out = [], C = f.comp;
    // the builder keeps an index of the cut wrappers (f.wraps): no scan of the whole main comp per event, which made
    // long songs slower and slower (every event walked hundreds of layers, and the copies it added made it worse)
    if (f.wraps) {
        for (var w = 0; w < f.wraps.length; w++) {
            var W0 = f.wraps[w];
            if (W0.cut.start > t1 + 1 || W0.cut.end < t0 - 1 || !W0.content) continue;
            if (W0.layer.inPoint > t1 || W0.layer.outPoint <= t0) continue;
            out.push({ L: W0.layer, comp: W0.stage || W0.comp, content: W0.content });
        }
        return out;
    }
    for (var i = 1; i <= C.numLayers; i++) {
        var L = C.layer(i), src = null;
        try { src = L.source; } catch (e) { src = null; }
        if (!src || typeof src.numLayers !== 'number') continue;
        if (L.inPoint > t1 || L.outPoint <= t0) continue;
        var cl = fx1_layer(src, 'content');
        if (cl) out.push({ L: L, comp: src, content: cl });
    }
    return out;
}

// ================================================================ covering wipes (overlay graphics)

/* ---- panelWipe — パネルワイプ: a slanted accent panel sweeps across (with a thin second-colour edge) and sweeps away */
function fx1_slant(o, hex, hd, sl, M) {
    var g = fx1_sub(o, 'panel');
    var r = jzAddRect(g, 10, M);
    jzSetExpr(r.property('ADBE Vector Rect Size'), hd + 'var w=u1-u0<=0.0005?0:(u1-u0)*(LL+SL);[w,M]');
    jzAddFill(g, hex);
    var tg = jzGX(g);
    tg.property('ADBE Vector Skew').setValue(Math.atan(sl / M) * 180 / Math.PI);     // top edge leads by SL
    jzSetExpr(tg.property('ADBE Vector Position'), hd + '[(u0+u1)/2*(LL+SL)-SL/2,M/2]');
}
jzReg('fx', 'panelWipe', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = fx1_S(ev), dir = fx1_r(s, 1) < 0.5 ? 1 : -1, vert = fx1_r(s, 2) < 0.28;
    var LL = vert ? H : W, M = vert ? W : H, sl = M * 0.3;
    var L = jzEvShape(f.comp, 'JZ FX panelWipe', ev.t, ev.dur);
    var o = fx1_orient(L, LL, dir, vert);
    var hd = fx1_head(ev, ',LL=' + jzN(LL) + ',M=' + jzN(M) + ',SL=' + jzN(sl)) + 'var b=0.4,a0,a1;if(p<b){a0=0;a1=oc(p/b);}else{a0=ic((p-b)/(1-b));a1=1;}';
    fx1_slant(o, sc.accent, hd + 'var u0=a0,u1=a1;', sl, M);                                           // on top
    fx1_slant(o, fx1_best([sc.ink, sc.fg, sc.bg], sc.accent), hd + 'var u0,u1;if(p<b){u0=a1;u1=Math.min(1,a1+0.06);}else{u0=Math.max(0,a0-0.06);u1=a0;}', sl, M);
} });

/* ---- irisTrans — アイリス: a dark iris closes on a point near the centre (accent rim) and opens again */
jzReg('fx', 'irisTrans', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = fx1_S(ev);
    var cx = W / 2 + fx1_rs(s, 1) * W * 0.08, cy = H / 2 + fx1_rs(s, 2) * H * 0.06;
    var dx = Math.max(cx, W - cx), dy = Math.max(cy, H - cy), R = Math.sqrt(dx * dx + dy * dy);
    var ink = sc.ink || sc.fg, col = fx1_dark(sc.bg) ? '#000000' : (fx1_dark(ink) ? ink : '#111111');
    var L = jzEvShape(f.comp, 'JZ FX irisTrans', ev.t, ev.dur);
    var hd = fx1_head(ev, ',R=' + jzN(R)) + 'var c=p<0.5?ic(p/0.5):1-oc((p-0.5)/0.5),r=R*(1-c);';
    var gr = jzGrp(L, 'rim'), el = jzAddEllipse(gr, 10, 10, cx, cy);
    jzSetExpr(el.property('ADBE Vector Ellipse Size'), hd + 'r>1&&c>0.02?[2*r,2*r]:[0,0]');
    jzAddStroke(gr, sc.accent, Math.max(2, H * 0.008));
    var gc = jzGrp(L, 'iris');
    jzAddRect(gc, W + 8, H + 8, 0, W / 2, H / 2);
    var hole = jzAddEllipse(gc, 10, 10, cx, cy);
    jzSetExpr(hole.property('ADBE Vector Ellipse Size'), hd + 'r>0.5?[2*r,2*r]:[0,0]');
    var fl = jzAddFill(gc, col); fl.property('ADBE Vector Fill Rule').setValue(2);            // even-odd: the circle is a hole
} });

/* ---- doors — 扉: two ink panels close from the sides (accent edges) and open again */
jzReg('fx', 'doors', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = fx1_S(ev), vert = fx1_r(s, 3) < 0.3;
    var LL = vert ? H : W, M = vert ? W : H, lw = Math.max(2, Math.min(W, H) * 0.008), ink = fx1_ink(sc);
    var L = jzEvShape(f.comp, 'JZ FX doors', ev.t, ev.dur);
    var hd = fx1_head(ev, ',LL=' + jzN(LL) + ',M=' + jzN(M) + ',LW=' + jzN(lw)) + 'var c=p<0.5?iq(p/0.5):1-oc((p-0.5)/0.5),half=LL/2*c+1;';
    jzSetExpr(jzXf(L, 'ADBE Opacity'), hd + 'c<=0.001?0:100');
    var V = jzVecs(fx1_orient(L, LL, 1, vert));
    fx1_box(V, 'line 1', sc.accent, 35, hd, 'var x=half-LW*4,y=0,w=LW*0.5,h=M;');
    fx1_box(V, 'line 2', sc.accent, 35, hd, 'var x=LL-half+LW*3.5,y=0,w=LW*0.5,h=M;');
    fx1_box(V, 'edge 1', sc.accent, 100, hd, 'var x=half-LW,y=0,w=LW,h=M;');
    fx1_box(V, 'edge 2', sc.accent, 100, hd, 'var x=LL-half,y=0,w=LW,h=M;');
    fx1_box(V, 'door 1', ink, 100, hd, 'var x=0,y=0,w=half,h=M;');
    fx1_box(V, 'door 2', ink, 100, hd, 'var x=LL-half,y=0,w=half,h=M;');
} });

/* ---- blindsTrans — ブラインド: slats close one after another (staggered), then open */
jzReg('fx', 'blindsTrans', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = fx1_S(ev), n = 7 + (fx1_h(s, 4) % 6), vert = fx1_r(s, 5) < 0.35;
    var col = fx1_r(s, 6) < 0.5 ? sc.accent : fx1_ink(sc), LL = vert ? W : H, M = vert ? H : W, slat = LL / n;
    var L = jzEvShape(f.comp, 'JZ FX blindsTrans', ev.t, ev.dur);
    var hd = fx1_head(ev, ',N=' + n + ',SL=' + jzN(slat) + ',M=' + jzN(M)) +
        'var c=p<0.5?ic(p/0.5):1-oc((p-0.5)/0.5);function hs(i){var ci=cl(c*1.35-(i/N)*0.35),h=SL*ci+(ci>=1?1:0);return c<=0.001||h<=0.2?0:h;}';
    var g = jzGrp(L, 'slats');
    for (var i = 0; i < n; i++) {
        var r = jzAddRect(g, 10, 10);
        if (vert) {
            jzSetExpr(r.property('ADBE Vector Rect Size'), hd + '[hs(' + i + '),M]');
            jzSetExpr(r.property('ADBE Vector Rect Position'), hd + '[' + jzN(i * slat) + '+hs(' + i + ')/2,M/2]');
        } else {
            jzSetExpr(r.property('ADBE Vector Rect Size'), hd + '[M,hs(' + i + ')]');
            jzSetExpr(r.property('ADBE Vector Rect Position'), hd + '[M/2,' + jzN(i * slat) + '+hs(' + i + ')/2]');
        }
    }
    jzAddFill(g, col);
} });

// ================================================================ glitches on the picture (adjustment layers)

/* ---- rgbSplit — RGB分離: red / cyan copies of the lyric knocked sideways (screen on dark, multiply on light).
   The browser tints |frame − bg| (= the ink); here: tinted duplicates of the cut's ghost / content layer inside its wrapper,
   so they follow the camera exactly. */
jzReg('fx', 'rgbSplit', { build: function (f, ev) {
    var W = f.W, H = f.H, a = fx1_amp(ev), s = fx1_S(ev), dk = fx1_dark(ev.sc.bg), S = fx1_steps(ev), j, i, k;
    var R5 = [], R6 = [];
    for (j = 0; j < S.n; j++) { var st = S.k0 + j + s; R5.push(fx1_r(st, 5)); R6.push(fx1_rs(st, 6)); }
    var ws = fx1_wraps(f, ev.t, ev.t + ev.dur);
    for (i = 0; i < ws.length; i++) {
        var w = ws[i], off = w.L.startTime, base = fx1_layer(w.comp, 'ghost B') || w.content;
        for (k = 0; k < 2; k++) {
            var D = base.duplicate();
            D.name = 'JZ FX rgbSplit ' + (k ? 'cyan' : 'red');
            D.moveToBeginning();
            D.startTime = 0;
            D.inPoint = Math.max(0, ev.t - off); D.outPoint = Math.min(w.comp.duration, Math.max(ev.t + ev.dur - off, ev.t - off + 1 / 24));
            var fe = jzEffect(D, 'ADBE Fill', 'JZ rgbSplit Colour');
            jzEP(fe, 3, jzHex(k ? '#1EE6FF' : '#FF2A2A')); jzEP(fe, 7, 1);
            D.blendingMode = dk ? BlendingMode.SCREEN : BlendingMode.MULTIPLY;
            jzXf(D, 'ADBE Opacity').setValue(90);
            jzSetExpr(jzXf(D, 'ADBE Position'), jzEvHead(ev.t - off, ev.dur, ',W=' + W + ',H=' + H + ',A=' + jzN(a) + ',SG=' + (k ? 1 : -1)) +
                fx1_arr('R5', R5) + fx1_arr('R6', R6) + fx1_si(S, off) +
                'var d=Math.max(2,W*(0.006+0.01*R5[si])*A*(1-0.6*p)),dy=R6[si]*H*0.004*A;[value[0]+SG*d,value[1]+SG*dy]');
        }
    }
} });

/* ---- smear — 横スミア: a few horizontal bands stretch one pixel column into long streaks (new bands every 1/24 s) */
jzReg('fx', 'smear', { build: function (f, ev) {
    var W = f.W, H = f.H, a = fx1_amp(ev), s = fx1_S(ev), S = fx1_steps(ev), sw = Math.max(1, Math.round(W * 0.003));
    var steps = [], nMax = 0, j, i;
    for (j = 0; j < S.n; j++) {
        var st = (S.k0 + j) * 13 + s, n = 7 + (fx1_h(st, 2) % 6), list = [];
        for (i = 0; i < n; i++) {
            var h = Math.max(2, Math.round(H * fx1_rr(0.008, 0.06, st, i, 2))), y = Math.round(jzClamp(H * (0.22 + 0.56 * fx1_r(st, i, 1)), 0, H - h));
            var sx = Math.round(W * fx1_rr(0.25, 0.75, st, i, 3)), len = W * fx1_rr(0.12, 0.45, st, i, 4) * a, dir = fx1_r(st, i, 5) < 0.5 ? 1 : -1;
            var x0 = dir > 0 ? sx : sx - len;
            list.push({ x: x0, y: y, w: len, h: h, ax: sx, ay: y + h / 2, px: x0, py: y + h / 2, sw: len / sw * 100 });
        }
        steps.push(list); if (n > nMax) nMax = n;
    }
    for (i = 0; i < nMax; i++) {
        var P = [];
        for (j = 0; j < S.n; j++) P.push(steps[j][i] || null);
        fx1_strip(f, ev, 'JZ FX smear ' + jzPad(i + 1, 2), S, P, 92);
    }
} });

/* ---- vhsRoll — VHSロール: the picture rolls down and back (wrapping), a black tracking bar rides the seam */
jzReg('fx', 'vhsRoll', { build: function (f, ev) {
    var W = f.W, H = f.H, a = fx1_amp(ev), s = fx1_S(ev), S = fx1_steps(ev), j, i;
    var DX = [];
    for (j = 0; j < S.n; j++) DX.push(Math.round(fx1_rs((S.k0 + j) * 7 + s, 1) * W * 0.004 * a));
    var hd = fx1_head(ev, ',W=' + W + ',H=' + H + ',A=' + jzN(a)) + 'var oy=Math.round(H*0.2*A*bell(p));';
    // the roll itself: Offset wraps the frame vertically
    var L = jzAdjLayer(f.comp, 'JZ FX vhsRoll', ev.t, ev.dur);
    var of = jzEffect(L, 'ADBE Offset', 'JZ VHS Roll');
    jzEX(of, 1, hd + fx1_arr('DX', DX) + fx1_si(S) + 'oy<1?[W/2,H/2]:[W/2+DX[si],H/2+oy]');
    // torn lines just under the seam
    var sh = Math.max(2, Math.round(H * 0.008));
    for (i = 0; i < 5; i++) {
        var SX = [];
        for (j = 0; j < S.n; j++) SX.push(fx1_rs((S.k0 + j) * 7 + s, i, 2) * W * 0.03 * a);
        var T = jzAdjLayer(f.comp, 'JZ FX vhsRoll tear ' + (i + 1), ev.t, ev.dur);
        jzMaskRect(T, 0, i * sh * 1.6, W, i * sh * 1.6 + sh);
        jzSetExpr(jzXf(T, 'ADBE Position'), hd + '[value[0],value[1]+oy]');
        jzSetExpr(jzXf(T, 'ADBE Opacity'), hd + 'oy<1||oy+' + jzN(i * sh * 1.6 + sh) + '>H?0:100');
        var tr = jzEffect(T, 'ADBE Geometry2', 'JZ Tear'); jzEP(tr, 1, [W / 2, H / 2]); jzEP(tr, 2, [W / 2, H / 2]);
        jzEX(tr, 2, hd + fx1_arr('SX', SX) + fx1_si(S) + '[value[0]+SX[si],value[1]]');
    }
    // tracking bar + highlight above the seam
    var bh = Math.max(3, H * 0.028), hl = Math.max(1, H * 0.003);
    var B = jzEvShape(f.comp, 'JZ FX vhsRoll bar', ev.t, ev.dur);
    jzSetExpr(jzXf(B, 'ADBE Opacity'), hd + 'oy<1?0:100');
    fx1_box(fx1_root(B), 'highlight', '#FFFFFF', 75, hd, 'var x=0,y=oy-' + jzN(bh + hl) + ',w=W,h=' + jzN(hl) + ';');
    fx1_box(fx1_root(B), 'bar', '#000000', 78, hd, 'var x=0,y=oy-' + jzN(bh) + ',w=W,h=' + jzN(bh) + ';');
} });

/* ---- trackingNoise — トラッキングノイズ: two drifting bands of torn rows, streaky noise and hairlines */
jzReg('fx', 'trackingNoise', { build: function (f, ev) {
    var W = f.W, H = f.H, a = fx1_amp(ev), s = fx1_S(ev), S = fx1_steps(ev), dk = fx1_dark(ev.sc.bg), j, i, b;
    var bands = [
        { yc: 'H*' + jzN(0.25 + 0.5 * fx1_r(s, 1)) + '+(p-0.5)*H*0.12', bh: H * (0.05 + 0.06 * fx1_r(s, 2)) * a, rows: 6 },
        { yc: 'H*' + jzN(0.1 + 0.8 * fx1_r(s, 8)) + '-p*H*0.08', bh: H * 0.018 * a, rows: 2 }
    ];
    var Lh = jzEvShape(f.comp, 'JZ FX trackingNoise lines', ev.t, ev.dur);
    for (b = 0; b < bands.length; b++) {
        var B = bands[b], hh = Math.max(2, Math.round(B.bh));
        var hd = fx1_head(ev, ',W=' + W + ',H=' + H) + 'var y0=Math.max(0,Math.min(H-2,Math.round(' + B.yc + '-' + jzN(B.bh / 2) + ')));';
        // torn rows: each row slides sideways by its own amount, new amounts every step
        for (i = 0; i < B.rows; i++) {
            var ry = Math.floor(i * hh / B.rows), rh = Math.max(1, Math.floor(hh / B.rows)), DX = [];
            for (j = 0; j < S.n; j++) DX.push(fx1_rs((S.k0 + j) * 5 + s, i, 9) * W * 0.035 * a);
            var R = jzAdjLayer(f.comp, 'JZ FX trackingNoise row ' + (b + 1) + '.' + (i + 1), ev.t, ev.dur);
            jzMaskRect(R, 0, ry, W, ry + rh);
            jzSetExpr(jzXf(R, 'ADBE Position'), hd + '[value[0],value[1]+y0]');
            var tr = jzEffect(R, 'ADBE Geometry2', 'JZ Row'); jzEP(tr, 1, [W / 2, H / 2]); jzEP(tr, 2, [W / 2, H / 2]);
            jzEX(tr, 2, hd + fx1_arr('DX', DX) + fx1_si(S) + '[value[0]+DX[si],value[1]]');
        }
        // streaky noise over the band
        var N = f.comp.layers.addSolid([0.3, 0.3, 0.3], 'JZ FX trackingNoise noise ' + (b + 1), W, hh, 1, f.comp.duration);
        N.inPoint = Math.max(0, ev.t); N.outPoint = Math.min(f.comp.duration, ev.t + Math.max(ev.dur, 1 / 24));
        var nz = jzEffect(N, 'ADBE Noise', 'JZ Noise'); jzEP(nz, 1, 100); jzEP(nz, 2, 0); jzEP(nz, 3, 1);
        var db = jzEffect(N, 'ADBE Motion Blur', 'JZ Streak'); jzEP(db, 1, 90); jzEP(db, 2, W * 0.06);
        var bc = jzEffect(N, 'ADBE Brightness & Contrast 2', 'JZ Noise Contrast'); jzEP(bc, 1, -10); jzEP(bc, 2, 100);
        jzSetExpr(jzXf(N, 'ADBE Position'), hd + '[W/2,y0+' + jzN(hh / 2) + ']');
        N.blendingMode = dk ? BlendingMode.SCREEN : BlendingMode.MULTIPLY;
        jzXf(N, 'ADBE Opacity').setValue(75);
        // hairlines
        var g = jzGrp(Lh, 'band ' + (b + 1));
        for (i = 0; i < 7; i++) {
            var X = [], Y = [], WD = [];
            for (j = 0; j < S.n; j++) { var st = (S.k0 + j) * 5 + s; X.push(fx1_r(st, i, 5) * W); Y.push(fx1_r(st, i, 6)); WD.push(W * fx1_rr(0.05, 0.4, st, i, 7)); }
            var r = jzAddRect(g, 10, Math.max(1, H * 0.0025));
            var hx = hd + fx1_arr('X', X) + fx1_arr('Y', Y) + fx1_arr('WD', WD) + fx1_si(S);
            jzSetExpr(r.property('ADBE Vector Rect Size'), hx + '[WD[si],' + jzN(Math.max(1, H * 0.0025)) + ']');
            jzSetExpr(r.property('ADBE Vector Rect Position'), hx + '[X[si]+WD[si]/2,y0+Y[si]*' + hh + '+' + jzN(Math.max(1, H * 0.0025) / 2) + ']');
        }
        jzAddFill(g, dk ? '#FFFFFF' : '#000000', dk ? 80 : 70);
    }
    Lh.moveToBeginning();
} });

/* ---- mirrorFlash — ミラー: for two frames one half (or quarter) of the picture is mirrored onto the rest */
jzReg('fx', 'mirrorFlash', { build: function (f, ev) {
    var W = f.W, H = f.H, m = fx1_h(fx1_S(ev), 9) % 4;
    var L = jzAdjLayer(f.comp, 'JZ FX mirrorFlash', ev.t, ev.dur);
    var mi = jzEffect(L, 'ADBE Mirror', 'JZ Mirror');
    jzEP(mi, 1, [W / 2, H / 2]); jzEP(mi, 2, m === 1 ? 180 : (m === 2 ? 90 : 0));      // 0: left → right, 180: right → left, 90: top → bottom
    if (m === 3) { var m2 = jzEffect(L, 'ADBE Mirror', 'JZ Mirror 2'); jzEP(m2, 1, [W / 2, H / 2]); jzEP(m2, 2, 90); }
} });

/* ---- posterize — ポスタリゼ: a punch of contrast + saturation that fades out */
jzReg('fx', 'posterize', { build: function (f, ev) {
    var L = jzAdjLayer(f.comp, 'JZ FX posterize', ev.t, ev.dur);
    var hd = fx1_head(ev, ',A=' + jzN(fx1_amp(ev))) + 'var a=A*Math.pow(1-p,1.2);a=a<0.02?0:a;';
    var bc = jzEffect(L, 'ADBE Brightness & Contrast 2', 'JZ Posterize Contrast');
    jzEX(bc, 2, hd + 'Math.min(100,180*a)');
    var hs = jzEffect(L, 'ADBE Color Balance (HLS)', 'JZ Posterize Saturation');
    jzEX(hs, 3, hd + 'Math.min(100,260*a)');
} });

/* ---- hueShift — 色相シフト: the picture jumps round the colour wheel with a ghost-colour wash, fading back */
jzReg('fx', 'hueShift', { build: function (f, ev) {
    var sc = ev.sc, s = fx1_S(ev), deg = Math.round(90 + 180 * fx1_r(s, 3)), dk = fx1_dark(sc.bg);
    var hd = fx1_head(ev, ',AM=' + jzN(Math.min(1, fx1_amp(ev)))) + 'var a=Math.pow(1-p,0.8)*AM;';
    var L = jzAdjLayer(f.comp, 'JZ FX hueShift', ev.t, ev.dur);
    var hs = jzEffect(L, 'ADBE Color Balance (HLS)', 'JZ Hue Shift'); jzEP(hs, 1, deg); jzEP(hs, 3, 60);
    jzSetExpr(jzXf(L, 'ADBE Opacity'), hd + '100*a');
    var C = jzEvSolid(f.comp, 'JZ FX hueShift wash', (fx1_r(s, 4) < 0.5 ? sc.ghostA : sc.ghostB) || sc.accent, ev.t, ev.dur);
    C.blendingMode = dk ? BlendingMode.MULTIPLY : BlendingMode.SCREEN;
    jzSetExpr(jzXf(C, 'ADBE Opacity'), hd + '50*a');
} });

/* ---- tileShift — タイルずらし: the frame cut into a grid; tiles jump off their places (some swap), background in the gaps */
jzReg('fx', 'tileShift', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, a = fx1_amp(ev), s = fx1_S(ev), S = fx1_steps(ev), j, i, x, y, k;
    var steps = [], nMax = 0;
    for (j = 0; j < S.n; j++) {
        var s0 = (S.k0 + j) * 11 + s, gx = 3 + (fx1_h(s0, 1) % 4), gy = 2 + (fx1_h(s0, 2) % 3), list = [];
        for (y = 0; y < gy; y++) for (x = 0; x < gx; x++) {
            var x0 = Math.round(x * W / gx), x1 = Math.round((x + 1) * W / gx), y0 = Math.round(y * H / gy), y1 = Math.round((y + 1) * H / gy), tw = x1 - x0, th = y1 - y0;
            var moved = fx1_r(s0, x, y, 3) < 0.6, dx = moved ? fx1_rs(s0, x, y, 4) * tw * 0.2 * a : 0, dy = moved ? fx1_rs(s0, x, y, 5) * th * 0.15 * a : 0;
            var si = x, sj = y;
            if (fx1_r(s0, x, y, 6) < 0.12) { si = fx1_h(s0, x, y, 7) % gx; sj = fx1_h(s0, x, y, 8) % gy; }
            var sx0 = Math.round(si * W / gx), sy0 = Math.round(sj * H / gy);
            list.push({ x: x0 + dx, y: y0 + dy, w: tw, h: th, ax: sx0, ay: sy0, px: x0 + dx, py: y0 + dy, sw: 100, id: (sx0 !== x0 || sy0 !== y0 || dx !== 0 || dy !== 0) });
        }
        steps.push(list); if (list.length > nMax) nMax = list.length;
    }
    for (k = 0; k < nMax; k++) {
        var P = [], any = false;
        for (j = 0; j < S.n; j++) { var q = steps[j][k] || null; if (q && q.id) any = true; P.push(q && q.id ? q : null); }
        if (any) fx1_strip(f, ev, 'JZ FX tileShift ' + jzPad(k + 1, 2), S, P, 100);
    }
    // background where no tile lands: a bg solid with every tile cut out (re-keyed per step)
    var G = jzEvSolid(f.comp, 'JZ FX tileShift gaps', sc.bg, ev.t, ev.dur);
    for (k = 0; k < nMax; k++) {
        var mk = G.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), shs = [];
        mk.maskMode = MaskMode.SUBTRACT;
        for (j = 0; j < S.n; j++) { var t = steps[j][k]; shs.push(t ? fx1_rectShape(t.x, t.y, t.x + t.w, t.y + t.h) : fx1_rectShape(0, 0, 0, 0)); }
        fx1_hold(mk.property('ADBE Mask Shape'), S.ts, shs);
    }
} });

/* ---- filmBurn — フィルム焼け: a warm light leak blooms from one edge and fades (flickering) */
jzReg('fx', 'filmBurn', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = fx1_S(ev), S = fx1_steps(ev), j;
    var cn = fx1_h(s, 5) % 4, cx = cn & 1 ? W * 1.02 : -W * 0.02, cy = cn & 2 ? H * (0.7 + 0.3 * fx1_r(s, 6)) : H * 0.3 * fx1_r(s, 6);
    var FL = [];
    for (j = 0; j < S.n; j++) FL.push(0.85 + 0.15 * fx1_r(S.k0 + j, 3));
    var hd = fx1_head(ev, ',D=' + jzN(Math.sqrt(W * W + H * H)) + ',CX=' + jzN(cx) + ',CY=' + jzN(cy) + ',AM=' + jzN(jzClamp(fx1_amp(ev), 0.5, 1.2))) +
        fx1_arr('FL', FL) + fx1_si(S) + 'var b=2/7,a=(p<b?oc(p/b):1-ioc((p-b)/(1-b)))*AM*FL[si],R=D*(0.55+0.5*p);';
    var mk = function (name, c0, c1, reach, mode) {
        var L = jzEvSolid(f.comp, 'JZ FX filmBurn ' + name, '#000000', ev.t, ev.dur);
        var g = jzEffect(L, 'ADBE Ramp', 'JZ Burn');
        jzEP(g, 1, [cx, cy]); jzEP(g, 2, c0); jzEP(g, 4, c1); jzEP(g, 5, 2);
        jzEX(g, 3, hd + '[CX+R*' + jzN(reach) + ',CY]');
        L.blendingMode = mode;
        jzSetExpr(jzXf(L, 'ADBE Opacity'), hd + 'Math.min(100,100*a)');
        return L;
    };
    if (!fx1_dark(sc.bg)) mk('tint', [1, 0.76, 0.62], [1, 1, 1], 1, BlendingMode.MULTIPLY);          // light paper: the orange also darkens
    mk('glow', [0.95, 0.46, 0.16], [0, 0, 0], 1.15, BlendingMode.SCREEN);
    mk('core', [0.6, 0.56, 0.44], [0, 0, 0], 0.4, BlendingMode.SCREEN);
} });

/* ---- whipBlur — ホイップブラー: a whip-pan smear (directional blur) swells and settles */
jzReg('fx', 'whipBlur', { build: function (f, ev) {
    var vert = fx1_r(fx1_S(ev), 2) < 0.25;
    var hd = fx1_head(ev, ',W=' + f.W + ',A=' + jzN(fx1_amp(ev))) + 'var amt=p<0.4?ic(p/0.4):1-oc((p-0.4)/0.6),d=W*0.045*A*amt;';
    var L = jzAdjLayer(f.comp, 'JZ FX whipBlur', ev.t, ev.dur);
    var db = jzEffect(L, 'ADBE Motion Blur', 'JZ Whip'); jzEP(db, 1, vert ? 0 : 90);
    jzEX(db, 2, hd + 'd<1?0:d');
    var gb = jzEffect(L, 'ADBE Gaussian Blur 2', 'JZ Whip Soft');                // the browser draws the smear at half resolution
    jzEX(gb, 1, hd + 'd<1?0:' + jzN(3 * f.u) + '*amt');
} });

/* ---- blackFrame / whiteFrame — 黒コマ / 白コマ: one or two frames of solid black / white */
function fx1_koma(col) {
    return { build: function (f, ev) {
        var one = fx1_r(fx1_S(ev), 9) < 0.5;
        jzEvSolid(f.comp, 'JZ FX ' + (col === '#000000' ? 'blackFrame' : 'whiteFrame'), col, ev.t, one ? ev.dur / 2 : ev.dur);
    } };
}
jzReg('fx', 'blackFrame', fx1_koma('#000000'));
jzReg('fx', 'whiteFrame', fx1_koma('#FFFFFF'));

/* ---- gridRepeat — 画面分割: the whole frame repeated 2×2 / 3×3 with background gutters (switches grid at 60%) */
// built from copies: tile (0,0) = the frame scaled down, the rest of row 0 copies tile (0,0), the other rows copy row 0
// (every copy reads a region that is already final, so no precomp is needed)
function fx1_grid(f, ev, n, t0, dur, bg) {
    var W = f.W, H = f.H, tw = W / n, th = H / n, i, L, tr;
    L = jzAdjLayer(f.comp, 'JZ FX gridRepeat ' + n + 'x' + n + ' tile', t0, dur);
    jzMaskRect(L, 0, 0, tw, th);
    tr = jzEffect(L, 'ADBE Geometry2', 'JZ Grid Scale'); jzEP(tr, 1, [0, 0]); jzEP(tr, 2, [0, 0]); jzEP(tr, 4, 100 / n);
    for (i = 1; i < n; i++) {
        L = jzAdjLayer(f.comp, 'JZ FX gridRepeat ' + n + 'x' + n + ' col ' + i, t0, dur);
        jzMaskRect(L, i * tw, 0, (i + 1) * tw, th);
        tr = jzEffect(L, 'ADBE Geometry2', 'JZ Grid Copy'); jzEP(tr, 1, [0, 0]); jzEP(tr, 2, [i * tw, 0]);
    }
    for (i = 1; i < n; i++) {
        L = jzAdjLayer(f.comp, 'JZ FX gridRepeat ' + n + 'x' + n + ' row ' + i, t0, dur);
        jzMaskRect(L, 0, i * th, W, (i + 1) * th);
        tr = jzEffect(L, 'ADBE Geometry2', 'JZ Grid Copy'); jzEP(tr, 1, [0, 0]); jzEP(tr, 2, [0, i * th]);
    }
    var g = Math.max(2, Math.round(H * 0.006)), S = jzEvShape(f.comp, 'JZ FX gridRepeat ' + n + 'x' + n + ' gutters', t0, dur), G = jzGrp(S, 'gutters');
    for (i = 1; i < n; i++) { jzAddRect(G, g, H, 0, i * tw, H / 2); jzAddRect(G, W, g, 0, W / 2, i * th); }
    jzAddFill(G, bg);
}
jzReg('fx', 'gridRepeat', { build: function (f, ev) {
    var fl = fx1_r(fx1_S(ev), 1) < 0.5, n1 = fl ? 2 : 3, n2 = fl ? 3 : 2;
    fx1_grid(f, ev, n1, ev.t, ev.dur * 0.6, ev.sc.bg);
    fx1_grid(f, ev, n2, ev.t + ev.dur * 0.6, ev.dur * 0.4, ev.sc.bg);
} });

/* ---- waveWarp — 波ゆがみ: the rows sway sideways in a travelling sine wave that swells and settles */
jzReg('fx', 'waveWarp', { build: function (f, ev) {
    var W = f.W, H = f.H, s = fx1_S(ev), fr = 2 + fx1_r(s, 1) * 2, ph0 = fx1_r(s, 2) * 6;
    var hd = fx1_head(ev, ',W=' + W + ',A=' + jzN(fx1_amp(ev))) + 'var amp=W*0.034*A*bell(p);';
    var L = jzAdjLayer(f.comp, 'JZ FX waveWarp', ev.t, ev.dur);
    var ww = jzEffect(L, 'ADBE Wave Warp', 'JZ Wave');
    jzEP(ww, 1, 1); jzEP(ww, 3, H / fr); jzEP(ww, 4, 0); jzEP(ww, 5, 0); jzEP(ww, 6, 1);          // sine, wave length = H / cycles, travels up, still, no pinning
    jzEX(ww, 2, hd + 'amp<0.5?0:amp');
    jzEX(ww, 7, hd + '-(p*8+' + jzN(ph0) + ')*180/Math.PI');
} });

/* ---- pixelDrift — ピクセルずれ: many thin segments slide sideways or smear out (new set every 1/24 s) */
jzReg('fx', 'pixelDrift', { build: function (f, ev) {
    var W = f.W, H = f.H, a = fx1_amp(ev), s = fx1_S(ev), S = fx1_steps(ev), MAXL = 20;
    var steps = [], nMax = 0, j, i;
    for (j = 0; j < S.n; j++) {
        var s0 = (S.k0 + j) * 7 + s, m = 16 + (fx1_h(s0, 1) % 14), list = [];
        for (i = 0; i < m; i++) {
            var h = Math.max(1, Math.round(H * fx1_rr(0.003, 0.022, s0, i, 2))), y = Math.round(jzClamp(H * (0.2 + 0.6 * fx1_r(s0, i, 1)), 0, H - h));
            var len = Math.round(W * fx1_rr(0.05, 0.3, s0, i, 4)), x0 = Math.round(fx1_r(s0, i, 3) * (W - len)), dx = fx1_rs(s0, i, 5) * W * 0.07 * a;
            if (fx1_r(s0, i, 6) < 0.35) { var xs = dx > 0 ? x0 : x0 - len; list.push({ x: xs, y: y, w: len, h: h, ax: x0, ay: y, px: xs, py: y, sw: len * 100 }); }
            else list.push({ x: x0 + dx, y: y, w: len, h: h, ax: x0, ay: y, px: x0 + dx, py: y, sw: 100 });
        }
        steps.push(list); if (m > nMax) nMax = m;
    }
    for (i = 0; i < Math.min(nMax, MAXL); i++) {
        var P = [];
        for (j = 0; j < S.n; j++) P.push(steps[j][i] || null);
        fx1_strip(f, ev, 'JZ FX pixelDrift ' + jzPad(i + 1, 2), S, P, 100);
    }
} });

/* ---- zoomPunch — ズームパンチ: a quick punch-in on the frame that eases back */
jzReg('fx', 'zoomPunch', { build: function (f, ev) {
    var zk = (0.06 + 0.04 * fx1_r(fx1_S(ev), 1)) * jzClamp(fx1_amp(ev), 0.5, 1.3);
    var L = jzAdjLayer(f.comp, 'JZ FX zoomPunch', ev.t, ev.dur);
    var tr = jzEffect(L, 'ADBE Geometry2', 'JZ Zoom Punch'); jzEP(tr, 1, [f.W / 2, f.H / 2]); jzEP(tr, 2, [f.W / 2, f.H / 2]);
    jzEX(tr, 4, fx1_head(ev, ',ZK=' + jzN(zk)) + 'var amt=p<0.25?oe(p/0.25):1-ioc((p-0.25)/0.75);100*(1+ZK*amt)');
} });

/* ---- lightSweep — 光の筋: a soft slanted light band (plus a thin echo) sweeps across the frame */
jzReg('fx', 'lightSweep', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = fx1_S(ev), dk = fx1_dark(sc.bg);
    var ang = (20 + 20 * fx1_r(s, 1)) * (fx1_r(s, 2) < 0.5 ? 1 : -1), dir = fx1_r(s, 3) < 0.5 ? 1 : -1;
    var bw = W * 0.11, HH = Math.sqrt(W * W + H * H), col = dk ? sc.fg : jzMixHex(sc.accent, '#FFFFFF', 0.35);
    var hd = fx1_head(ev, ',W=' + W + ',H=' + H + ',AM=' + jzN(Math.min(1, fx1_amp(ev)))) +
        'var P=ioc(p),xc=' + (dir > 0 ? 'W*(-0.3+1.6*P)' : 'W*(1.3-1.6*P)') + ',a=AM*Math.sqrt(bell(p));';
    var strips = [[0, bw, 60], [-bw * 0.95 * dir, bw * 0.25, 45]];
    for (var i = 0; i < strips.length; i++) {
        var L = jzEvShape(f.comp, 'JZ FX lightSweep ' + (i ? 'echo' : 'band'), ev.t, ev.dur);
        var g = jzGrp(L, 'light');
        jzAddRect(g, strips[i][1] * 0.5, HH * 2, 0, strips[i][0], 0);
        jzAddFill(g, col);
        var gb = jzEffect(L, 'ADBE Gaussian Blur 2', 'JZ Soft'); jzEP(gb, 1, strips[i][1] * 0.45);
        jzSetExpr(jzXf(L, 'ADBE Position'), hd + '[xc,H/2]');
        jzXf(L, 'ADBE Rotate Z').setValue(ang);
        jzSetExpr(jzXf(L, 'ADBE Opacity'), hd + strips[i][2] + '*a');
        L.blendingMode = dk ? BlendingMode.SCREEN : BlendingMode.MULTIPLY;
    }
} });

/* ---- crtOff — ブラウン管オフ: the picture collapses to a bright line / dot on black (TV switched off) and pops back on */
jzReg('fx', 'crtOff', { build: function (f, ev) {
    var W = f.W, H = f.H;
    var hd = fx1_head(ev, ',W=' + W + ',H=' + H) +
        'var sx,sy,br,q;if(p<0.5){q=p/0.5;sy=Math.max(0.004,1-ic(Math.min(1,q*1.15)));sx=q>0.8?Math.max(0.01,1-ic((q-0.8)/0.2)*0.99):1;br=iq(q);}' +
        'else{q=(p-0.5)/0.5;sy=Math.max(0.004,oe(cl(q*1.4-0.15)));sx=q<0.15?Math.max(0.01,oc(q/0.15)):1;br=1-oc(q);}var w=W*sx,h=Math.max(1,H*sy),gh=H*0.05*br+1;';
    var L = jzAdjLayer(f.comp, 'JZ FX crtOff', ev.t, ev.dur);
    var tr = jzEffect(L, 'ADBE Geometry2', 'JZ CRT Squash');
    jzEP(tr, 1, [W / 2, H / 2]); jzEP(tr, 2, [W / 2, H / 2]); jzEP(tr, 3, 0);
    jzEX(tr, 4, hd + 'sy*100'); jzEX(tr, 5, hd + 'sx*100');
    // black around the squashed picture (even-odd: outer frame minus the picture's box)
    var K = jzEvShape(f.comp, 'JZ FX crtOff black', ev.t, ev.dur), gk = jzGrp(K, 'black');
    jzAddRect(gk, W + 8, H + 8, 0, W / 2, H / 2);
    var hole = jzAddRect(gk, W, H, 0, W / 2, H / 2);
    jzSetExpr(hole.property('ADBE Vector Rect Size'), hd + '[w,h]');
    jzAddFill(gk, '#000000').property('ADBE Vector Fill Rule').setValue(2);
    // the picture brightens as it collapses
    var Wb = jzEvShape(f.comp, 'JZ FX crtOff white', ev.t, ev.dur), gw = jzGrp(Wb, 'white');
    var rw = jzAddRect(gw, W, H, 0, W / 2, H / 2);
    jzSetExpr(rw.property('ADBE Vector Rect Size'), hd + '[w,h]');
    jzAddFill(gw, '#FFFFFF');
    Wb.blendingMode = BlendingMode.SCREEN;
    jzSetExpr(jzXf(Wb, 'ADBE Opacity'), hd + '85*br');
    // soft glow line across the centre
    var Gl = jzEvShape(f.comp, 'JZ FX crtOff glow', ev.t, ev.dur), gg = jzGrp(Gl, 'glow');
    var rg = jzAddRect(gg, W, 10, 0, W / 2, H / 2);
    jzSetExpr(rg.property('ADBE Vector Rect Size'), hd + '[w*1.1,gh]');
    jzAddFill(gg, '#FFFFFF');
    var gb = jzEffect(Gl, 'ADBE Gaussian Blur 2', 'JZ Glow Soft'); jzEP(gb, 2, 3);
    jzEX(gb, 1, hd + 'gh*0.8');
    Gl.blendingMode = BlendingMode.SCREEN;
    jzSetExpr(jzXf(Gl, 'ADBE Opacity'), hd + '60*br');
} });

/* ---- splitSlide — 上下スライド: the frame splits in two; the halves slide apart (accent seam), background in the gaps */
jzReg('fx', 'splitSlide', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = fx1_S(ev), vert = fx1_r(s, 1) < 0.3, sp = 0.5 + fx1_rs(s, 2) * 0.08;
    var lw = Math.max(2, Math.round(Math.min(W, H) * 0.004)), cut = vert ? Math.round(W * sp) : Math.round(H * sp);
    var hd = fx1_head(ev, ',W=' + W + ',H=' + H + ',C=' + cut + ',A=' + jzN(fx1_amp(ev))) +
        'var amt=p<1/3?oc(p*3):1-ioc((p-1/3)/(2/3));amt=amt<=0.002?0:amt;var d=' + (vert ? 'H*0.1' : 'W*0.09') + '*A*amt;';
    for (var k = 0; k < 2; k++) {
        var L = jzAdjLayer(f.comp, 'JZ FX splitSlide ' + (k ? 'B' : 'A'), ev.t, ev.dur), sg = k ? '+' : '-';
        if (vert) jzMaskRect(L, k ? cut : 0, 0, k ? W : cut, H); else jzMaskRect(L, 0, k ? cut : 0, W, k ? H : cut);
        var tr = jzEffect(L, 'ADBE Geometry2', 'JZ Split Slide'); jzEP(tr, 1, [W / 2, H / 2]); jzEP(tr, 2, [W / 2, H / 2]);
        jzEX(tr, 2, hd + (vert ? '[value[0],value[1]' + sg + 'd]' : '[value[0]' + sg + 'd,value[1]]'));
    }
    var G = jzEvShape(f.comp, 'JZ FX splitSlide seam', ev.t, ev.dur), V = fx1_root(G);
    var seam = fx1_box(V, 'seam', sc.accent, 100, hd, vert ? 'var x=C-' + jzN(lw / 2) + ',y=0,w=' + lw + ',h=amt>0?H:0;' : 'var x=0,y=C-' + jzN(lw / 2) + ',w=amt>0?W:0,h=' + lw + ';');
    jzSetExpr(jzVecs(seam).property(2).property('ADBE Vector Fill Opacity'), hd + '100*amt');
    if (vert) {
        fx1_box(V, 'gap A', sc.bg, 100, hd, 'var x=0,y=H-d,w=C,h=d;');
        fx1_box(V, 'gap B', sc.bg, 100, hd, 'var x=C,y=0,w=W-C,h=d;');
    } else {
        fx1_box(V, 'gap A', sc.bg, 100, hd, 'var x=W-d,y=0,w=d,h=C;');
        fx1_box(V, 'gap B', sc.bg, 100, hd, 'var x=0,y=C,w=d,h=H-C;');
    }
} });
