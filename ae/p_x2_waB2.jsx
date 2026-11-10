// ================================================================ pack x2waB part 2 (AE port of src/11p_x2_waB.js) — 和風: 5 holds, 5 treatments, 3 camera moves, 6 screen accents, 3 transitions
// hold  : wzFurin wzShishiodoshi wzMikoshi wzTanzaku wzNotan
// treat : wzRakkan wzKinpaku wzKasure wzObi wzBinsen
// cam   : wzKakejikuView wzByobuPan wzOjigi
// fx    : wzHyoshigi wzShojiPass wzSumiShibuki wzOrime wzHanafubuki wzMaku
// trans : wzFusumaPass wzMakimonoRoll wzMawariButai
// Uses the awzb_ helpers of part 1 (ae/p_x2_waB1.jsx: awzb_K line measure, awzb_emit per-glyph animators, awzb_pivot, awzb_layer,
// awzb_rc, awzb_setMatte, colour pickers …).
//  - holds: per-glyph motion = awzb_emit animators; rigid motion of the line = m.parts snippets with a pivot correction. Strength
//    wzK = AMT × motionK (browser amt × clamp(fx.motion / 0.7, 0, 1.6)). There is no beat grid in AE: wzMikoshi runs on the
//    browser's own no-beat clock (1.1 s).
//  - treatments: shape layers parented to the lyric (its own layer space, measured at rest). The two pattern fills of the
//    browser (canvas patterns through the glyphs) become a fleck fill seen through the lyric as its alpha matte (wzKinpaku) and
//    dry-brush streaks used as the lyric's inverted alpha matte (wzKasure); both are tiled with Repeaters.
//  - cam: expressions on the cut's camera null (the construction of ae/p_cam.jsx / ae/p_x2_camtr.jsx; skew = Transform effect).
//  - fx: shape layers on the main comp driven by jzEvHead (p = the browser's k).
//  - trans: as ae/p_trans.jsx — copies of the old wrapper above the new one, masks, Transform / Fill effects on the wrappers.

// ---------------------------------------------------------------- shared helpers (awzb2_*)
var AWZB2_POP = '(hasParent?parent.transform.opacity/100:1)';
var AWZB2_FX = 'function bell(x){return Math.sin(Math.PI*cl(x));}function wzahr(k,a,b){return k<a?oc(k/a):(k>b?1-ic((k-b)/Math.max(0.001,1-b)):1);}\n';
function awzb2_p(P, k, d) { return (P && P[k]) ? P[k] : d; }               // the browser's `Q.k || d`
function awzb2_cp(K) { return (K.cs % 97) / 97; }                           // cphase(env)
// hold strength snippet (after m.HD, which defines AMT and M)
var AWZB2_HK = AWZB_FNS + 'var wzK=AMT*Math.max(0,Math.min(1.6,M/0.7)),wzKK=Math.min(1,wzK);';
// ---- treatments
function awzb2_doc(L) { try { return L.property('ADBE Text Properties').property('ADBE Text Document').value; } catch (e) { return null; } }
function awzb2_alive(L) {
    var td = awzb2_doc(L);
    if (!td || td.applyFill === false || !jzTrim(String(td.text || '')) || !(td.fontSize > 1)) return false;
    var op = 100; try { op = awzb_sv(L, 'ADBE Opacity'); } catch (e) {}
    return op >= 89.99;
}
function awzb2_line(ctx, L) { var td = awzb2_doc(L); return jzCount(String(td ? td.text : '')) >= 2 || jzCount(String(ctx.cut.text || '')) <= 1; }
function awzb2_plate(sc, col) { return jzContrast(col, sc.bg) < 1.5; }
// the line measure of part 1 for a treatment (at rest)
function awzb2_tK(ctx, L, o) {
    var m = { L: L, c: ctx.cut, ctx: ctx, o: { mi: (o && o.mi) || 0 }, size: jzFontSize(L), u: ctx.u, W: ctx.W, H: ctx.H };
    return awzb_K(m, true);
}
function awzb2_th(ctx, L, o) { return jzHead(ctx, { mi: (o && o.mi) || 0, size: jzFontSize(L) }) + AWZB_FNS; }
// move the lyric by (dx, dy) comp px (the browser's it.x / it.y change before drawing)
function awzb2_shift(L, dx, dy) {
    var p = awzb_sv(L, 'ADBE Position'), q = [], i;
    for (i = 0; i < p.length; i++) q.push(p[i]);
    q[0] += dx; q[1] += dy;
    try { jzXf(L, 'ADBE Position').setValue(q); } catch (e) { jzWarn('x2waB shift: ' + e.toString()); }
}
function awzb2_pt(v, u, w) { return v ? [w, u] : [u, w]; }
function awzb2_path(g, v, pts) { var o = [], i; for (i = 0; i < pts.length; i++) o.push(awzb2_pt(v, pts[i][0], pts[i][1])); return jzAddPath(g, o, true); }
function awzb2_rep(g, n, dx, dy) {
    var V = jzVecs(g), ix = V.addProperty('ADBE Vector Filter - Repeater').propertyIndex;
    V.property(ix).property('ADBE Vector Repeater Copies').setValue(Math.max(1, n));
    V.property(ix).property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([dx, dy]);
    return V.property(ix);
}
// a tile of paths (fn(g) adds them at tile origin 0,0) repeated nx × ny times from (x0, y0), one fill
function awzb2_tile(S, name, x0, y0, T, nx, ny, col, fn) {
    var G = jzGrp(S, name), row = awzb_sub(G, name + ' row');
    fn(row);
    jzAddFill(row, col);
    awzb2_rep(row, nx, T, 0);
    awzb2_rep(G, ny, 0, T);
    awzb_xf(G, { p: [x0, y0] });
    return G;
}
// ---- effect events / transitions
function awzb2_S(ev) { return awzb_h(Math.round(ev.t * 1000), 6143); }   // evS(ev)
function awzb2_ampOf(ev) { return jzClamp(ev.amp == null ? 1 : ev.amp, 0.3, 1.6); }
function awzb2_amp1(ev) { return jzClamp(ev.amp == null ? 1 : ev.amp, 0.5, 1.3); }
function awzb2_fh(f, ev) { return jzEvHead(ev.t, ev.dur, ',W=' + jzN(f.W) + ',H=' + jzN(f.H)) + AWZB_FNS + AWZB2_FX; }
function awzb2_trh(t) { return jzEvHead(t.t0, t.dur, ',W=' + jzN(t.W) + ',H=' + jzN(t.H)) + AWZB_FNS + AWZB2_FX; }
function awzb2_copy(t, L, name, t1) {
    var C = L.duplicate();
    try { C.name = name; } catch (e0) {}
    C.moveBefore(t.B);
    C.inPoint = t.t0; C.outPoint = t1 || (t.t0 + t.dur);
    return C;
}
// rect mask (layer px) whose path is an expression ending in createPath
function awzb2_emask(L, ex) {
    var mk = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = [[1, 0], [1, 1], [0, 1], [0, 0]]; sh.closed = true;
    mk.property('ADBE Mask Shape').setValue(sh);
    jzSetExpr(mk.property('ADBE Mask Shape'), ex);
    return mk;
}
// stepped linear ramp of `col` from alpha a0 at x = 0 to a1 at x = len (len < 0: to the left), height H, n bands, into group S
function awzb2_ramp(S, name, x, len, H, col, a0, a1, n) {
    var k, w = Math.abs(len) / n, sg = len < 0 ? -1 : 1;
    for (k = 0; k < n; k++) {
        var a = a0 + (a1 - a0) * (k + 0.5) / n; if (a <= 0.002) continue;
        var g = jzGrp(S, name + ' ' + (k + 1));
        jzAddRect(g, w + 0.5, H, 0, x + sg * (k + 0.5) * w, H / 2); jzAddFill(g, col, a * 100);
    }
}

/* =====================================================================
   HOLD
   ===================================================================== */

/* ---- wzFurin — 風鈴: now and then a breeze passes along the line: each glyph swings from a point above it (0.85 em up) and
   rings down at its own pace */
jzReg('hold', 'wzFurin', { apply: function (m) {
    var K = awzb_K(m, true), N = jzN, n = Math.max(1, K.n), T = 2.3, ph = (0.75 + 0.2 * awzb2_cp(K)) * T, Lp = K.fs * 0.85, Jv = [], Wv = [], Av = [], i;
    for (i = 0; i < n; i++) { var j = K.single ? K.mi : i; Jv.push(j); Wv.push(7.5 + 3 * awzb_r(K.seed, j, 301)); Av.push(0.7 + 0.6 * awzb_r(K.seed, j, 302)); }
    awzb_emit(m.L, 'JZ Hold Furin', m.HD + AWZB2_HK,
        'var J=' + awzb_arr(Jv) + ',WV=' + awzb_arr(Wv) + ',AV=' + awzb_arr(Av) + ',j=J[i]||0,tt=wzfr((time+' + N(ph) + '-j*0.08)/' + T + ')*' + T + ',' +
        'th=10*wzK*Math.exp(-1.2*tt)*Math.sin(tt*(WV[i]||9))*Math.min(1,tt*8)*(1-wzsm(0.8,1,tt/' + T + '))*(AV[i]||1)*Math.PI/180;' +
        'rot=th*180/Math.PI;dx=-' + N(Lp) + '*Math.sin(th);dy=' + N(Lp) + '*(Math.cos(th)-1);', { p: K.fs * 0.3, r: 20 });
} });

/* ---- wzShishiodoshi — 鹿威し: the line slowly tips as if filling with water (2.4°), drops back with a knock, rocks once and
   starts again (3.4 s), turning about the centre of its box */
jzReg('hold', 'wzShishiodoshi', { apply: function (m) {
    var K = awzb_K(m, true), N = jzN, dir = awzb_dir(K, 311);
    var pre = AWZB2_HK + 'var wsu=wzfr(time/3.4+' + N(awzb2_cp(K)) + '),wsv=(wsu-0.76)/0.24,' +
        'wsa=wsu<0.7?iq(wsu/0.7):(wsu<0.76?wzlp(1,-0.45,ic((wsu-0.7)/0.06)):-0.45*Math.exp(-5*wsv)*Math.cos(wsv*Math.PI*3)*(1-wsv)),wsr=' + N(dir * 2.4) + '*wzK*wsa;';
    m.parts.rot.push(pre + 'r+=wsr;');
    var pv = awzb_pivot(K, '1', '1', 'wsr', K.cx, K.cy);
    if (pv) m.parts.pos.push(pre + pv);
} });

/* ---- wzMikoshi — 神輿 (わっしょい): two quick shoulder bounces and a rest, leaning left then right (no beat in AE: the browser's
   1.1 s fallback cycle) */
jzReg('hold', 'wzMikoshi', { apply: function (m) {
    var K = awzb_K(m, true), N = jzN;
    var pre = AWZB2_HK + 'var wmu=wzfr(time/1.1+' + N(awzb2_cp(K)) + '),wm1=wmu<0.3?Math.sin(Math.PI*wmu/0.3):0,wm2=(wmu>0.34&&wmu<0.64)?Math.sin(Math.PI*(wmu-0.34)/0.3):0,wmr=1.3*wzK*(wm1-wm2);';
    m.parts.pos.push(pre + 'd=[d[0],d[1]-' + N(K.fs * K.s0 * 0.08) + '*wzK*(wm1+wm2*0.8)];');
    m.parts.rot.push(pre + 'r+=wmr;');
    var pv = awzb_pivot(K, '1', '1', 'wmr', K.cx, K.cy);
    if (pv) m.parts.pos.push(pre + pv);
} });

/* ---- wzTanzaku — 短冊ゆれ: paper strips turning in a light breeze: a slow twist travels along the line, each glyph narrowing
   (to 66 %) and opening again, with a small tilt and lift */
jzReg('hold', 'wzTanzaku', { apply: function (m) {
    var K = awzb_K(m, true), N = jzN, IX = K.single ? N(K.mi) : 'i', ph = awzb2_cp(K) * AWZB_TAU;
    awzb_emit(m.L, 'JZ Hold Tanzaku', m.HD + AWZB2_HK,
        'var f=time*1.9-' + IX + '*0.6+' + N(ph) + ',tw=Math.pow(Math.max(0,Math.sin(f)),2);sx=1-0.34*Math.min(1.2,wzK)*tw;rot=2.2*wzK*Math.sin(f+0.9);dy=-' + N(K.fs * 0.015) + '*wzK*tw;',
        { s: 1, r: 6, p: K.fs * 0.06 });
} });

/* ---- wzNotan — 墨の濃淡: a slow wave of ink density: glyph after glyph pales to a thin wash (55 %) and comes back to full */
jzReg('hold', 'wzNotan', { apply: function (m) {
    var K = awzb_K(m, true), N = jzN, IX = K.single ? N(K.mi) : 'i', ph = awzb2_cp(K) * AWZB_TAU;
    awzb_emit(m.L, 'JZ Hold Notan', m.HD + AWZB2_HK,
        'var w=0.5+0.5*Math.sin(time*1.3-' + IX + '*0.7+' + N(ph) + '),dd=w*w;al=1-0.45*wzKK*dd;sx=sy=1-0.02*wzK*dd;', { a: 1, s: 1 });
} });

/* =====================================================================
   TREAT  (apply(ctx, L, P, o) after the lyric's motion; P = the browser's plan params)
   ===================================================================== */

/* ---- wzRakkan — 落款: a small vermilion seal (田 / 王 / 回 knocked out of it) set beside the end of the line, as on a finished
   piece of calligraphy; it is pressed on (from 145 %) once the entrance has mostly played. The line is set 6 % smaller. */
jzReg('treat', 'wzRakkan', {
    plan: function (rng, st) { return { v: rng.int(0, 2), r: rng.range(-5, 5), k: rng.range(0.36, 0.44) }; },
    apply: function (ctx, L, P, o) {
        if (!awzb2_alive(L) || !awzb2_line(ctx, L)) return;
        var sc = ctx.sc, col = jzTextColor(L), N = jzN;
        if (awzb2_plate(sc, col)) return;
        var seal = awzb_seal(sc, col), knock = jzContrast(sc.bg, seal) >= 1.6 ? sc.bg : (awzb_dark(seal) ? '#FFFFFF' : '#000000');
        var s0 = awzb_sv(L, 'ADBE Scale'), s1 = [], i;
        for (i = 0; i < s0.length; i++) s1.push(i < 2 ? s0[i] * 0.94 : s0[i]);
        try { jzXf(L, 'ADBE Scale').setValue(s1); } catch (e0) {}
        var K = awzb2_tK(ctx, L, o), s = K.fs * awzb2_p(P, 'k', 0.4), v = (P && P.v) | 0, wait = (ctx.cut.inDur || 0.3) * 0.75;
        var cx = K.vert ? K.x0 - s * 0.72 : K.x1 + s * 0.72, cy = K.y1 - s * 0.5, q = s * 0.3, lw = s * 0.085;
        var H = awzb2_th(ctx, L, o) + 'var q=cl((time-DL-' + N(wait) + ')/0.26);';
        var S = awzb_layer(K, 'JZ Rakkan Seal', 'keep'), G = jzGrp(S, 'seal'), kn = awzb_sub(G, 'knock-out');
        var R = function (x0, y0, w, h) { jzAddRect(kn, w, h, 0, x0 + w / 2, y0 + h / 2); };
        if (v === 1) { R(-q, -q - lw / 2, q * 2, lw); R(-q, -lw / 2, q * 2, lw); R(-q, q - lw / 2, q * 2, lw); R(-lw / 2, -q, lw, q * 2); }   // 王
        else {
            R(-q, -q, q * 2, lw); R(-q, q - lw, q * 2, lw); R(-q, -q, lw, q * 2); R(q - lw, -q, lw, q * 2);
            if (v === 0) { R(-q, -lw / 2, q * 2, lw); R(-lw / 2, -q, lw, q * 2); }                                                        // 田
            else R(-q * 0.42, -q * 0.42, q * 0.84, q * 0.84);                                                                             // 回
        }
        jzAddFill(kn, knock);
        var bk = awzb_sub(G, 'block'); jzAddRect(bk, s, s, s * 0.1, 0, 0); jzAddFill(bk, seal);
        awzb_xf(G, { p: [cx, cy], r: (P && P.r) || 0, se: H + 'var k=wzlp(1.45,1,oc(q))*100;[k,k]' });
        jzSetExpr(jzXf(S, 'ADBE Opacity'), H + 'q<=0?0:100*cl(q*3)*(1-ic(PO))*' + AWZB2_POP);
    }
});

/* ---- wzKinpaku — 金箔ちらし: flecks of gold leaf scattered through the body of the glyphs. The browser fills the glyphs with a
   canvas pattern; here a fill layer (text colour + a seeded tile of four-cornered flecks, repeated) is seen through the lyric as
   its alpha matte. The flecks stay put on the line while single glyphs move, and colour changes of the motion (tints) are
   not seen. Not built on a lyric that already has a track matte. */
jzReg('treat', 'wzKinpaku', {
    plan: function (rng, st) { return { d: rng.range(0.4, 1), s: rng.int(1, 9999) }; },
    apply: function (ctx, L, P, o) {
        if (!awzb2_alive(L) || awzb_matted(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), seed = (P && P.s) | 0, d = (P && P.d != null) ? P.d : 0.7, cnt = Math.round(20 + 18 * d), i, q;
        var gold = awzb_first([sc.accent, sc.accent2], function (c) { return jzContrast(c, col) >= 1.35; }, jzMixHex(col, sc.bg, 0.5)), gold2 = jzMixHex(gold, col, 0.45);
        var K = awzb2_tK(ctx, L, o), T = K.fs * 1.5, k = T / 256, pad = K.fs * 0.5, far = K.big;
        var nx = Math.min(40, Math.ceil((K.w + pad * 2) / T) + 1), ny = Math.min(30, Math.ceil((K.h + pad * 2) / T) + 1);
        var fl = [[], []];
        for (i = 0; i < cnt; i++) {
            var cx = awzb_r(seed, i, 401) * 256, cy = awzb_r(seed, i, 402) * 256, R = 5 + 15 * Math.pow(awzb_r(seed, i, 403), 1.6), a0 = awzb_r(seed, i, 404) * AWZB_TAU, pts = [];
            for (q = 0; q < 4; q++) {
                var an = a0 + q * AWZB_TAU / 4 + awzb_rs(seed, i, q, 406) * 0.5, rr = R * (0.55 + 0.6 * awzb_r(seed, i, q, 407));
                pts.push([(cx + Math.cos(an) * rr) * k, (cy + Math.sin(an) * rr) * k]);
            }
            fl[awzb_r(seed, i, 405) < 0.7 ? 0 : 1].push(pts);
        }
        var F = awzb_layer(K, 'JZ Kinpaku fill', 'keep', true);
        for (q = 0; q < 2; q++) {
            if (!fl[q].length) continue;
            (function (list) {
                awzb2_tile(F, q ? 'gold leaf B' : 'gold leaf A', K.x0 - pad, K.y0 - pad, T, nx, ny, q ? gold2 : gold, function (g) { for (var j = 0; j < list.length; j++) jzAddPath(g, list[j], true); });
            })(fl[q]);
        }
        var bg = jzGrp(F, 'text colour'); jzAddRect(bg, far * 2, far * 2, 0, K.cx, K.cy); jzAddFill(bg, col);
        awzb_setMatte(F, L, false);
    }
});

/* ---- wzKasure — 墨のかすれ: a dry brush: thin streaks along the stroke direction where the bristles ran out of ink (they run
   down the glyphs of vertical text). The browser cuts them out of a canvas pattern fill; here the streak tile (repeated) is the
   lyric's inverted alpha matte, so the glyphs keep their own colours and motion. Not built on a lyric that already has a
   track matte. */
jzReg('treat', 'wzKasure', {
    plan: function (rng, st) { return { d: rng.range(0.55, 1), s: rng.int(1, 9999) }; },
    apply: function (ctx, L, P, o) {
        if (!awzb2_alive(L) || awzb_matted(L)) return;
        var seed = (P && P.s) | 0, cnt = Math.round(52 + 40 * ((P && P.d != null) ? P.d : 0.8)), i;
        var K = awzb2_tK(ctx, L, o), v = K.vert, T = K.fs * 1.5, k = T / 256, pad = K.fs * 0.5;
        var nx = Math.min(40, Math.ceil((K.w + pad * 2) / T) + 1), ny = Math.min(30, Math.ceil((K.h + pad * 2) / T) + 1), st = [];
        for (i = 0; i < cnt; i++) {
            var band = (i % 8 + awzb_r(seed, i % 8, 411)) * 256 / 8, y = band + awzb_rs(seed, i, 412) * 14, h = 3 + 8 * Math.pow(awzb_r(seed, i, 413), 2);
            var x = awzb_r(seed, i, 414) * 256, len = 40 + 150 * awzb_r(seed, i, 415);
            st.push([[x * k, y * k], [(x + len * 0.5) * k, (y - h / 2) * k], [(x + len) * k, y * k], [(x + len * 0.5) * k, (y + h / 2) * k]]);
        }
        var M = awzb_layer(K, 'JZ Kasure Streaks', 'keep');
        awzb2_tile(M, 'dry streaks', K.x0 - pad, K.y0 - pad, T, nx, ny, '#FFFFFF', function (g) { for (var j = 0; j < st.length; j++) awzb2_path(g, v, st[j]); });
        awzb_setMatte(L, M, true);
    }
});

/* ---- wzObi — 和柄の帯: a narrow band of a traditional repeat (市松 / 鱗 / 青海波 / 菱) laid along the foot of the line (right of a
   vertical column), drawn out from its start; the line moves up (left) to make room */
jzReg('treat', 'wzObi', {
    plan: function (rng, st) { return { v: rng.int(0, 3), h: rng.range(0.2, 0.26) }; },
    apply: function (ctx, L, P, o) {
        if (!awzb2_alive(L) || !awzb2_line(ctx, L)) return;
        var sc = ctx.sc, col = jzTextColor(L), N = jzN, i, j;
        if (awzb2_plate(sc, col)) return;
        var mc = awzb_mark(sc, col), v = (P && P.v) | 0, K = awzb2_tK(ctx, L, o), vt = K.vert, S0 = K.fs, B = K.big;
        if (vt) awzb2_shift(L, -S0 * K.s0 * 0.14, 0); else awzb2_shift(L, 0, -S0 * K.s0 * 0.14);
        var hb = S0 * awzb2_p(P, 'h', 0.22), U0 = (vt ? K.y0 : K.x0) - S0 * 0.08, U1 = (vt ? K.y1 : K.x1) + S0 * 0.08, V0 = (vt ? K.x1 : K.y1) + S0 * 0.14, Ln = U1 - U0;
        var H = awzb2_th(ctx, L, o) + 'var q=oc(cl((time-DL-0.05)/0.5));';
        var S = awzb_layer(K, 'JZ Obi Band', 'keep', true), g = jzGrp(S, 'pattern'), n;
        if (v === 0) {                                                                                         // 市松
            var c = hb / 2; n = Math.min(300, Math.ceil(Ln / c));
            for (i = 0; i < n; i++) awzb_box(g, vt, U0 + i * c, V0 + (i % 2 ? c : 0), U0 + i * c + c + 0.4, V0 + (i % 2 ? c : 0) + c);
            jzAddFill(g, mc);
        } else if (v === 1) {                                                                                  // 鱗
            n = Math.min(200, Math.ceil(Ln / hb));
            for (i = 0; i < n; i++) awzb2_path(g, vt, [[U0 + i * hb, V0 + hb], [U0 + (i + 0.5) * hb, V0], [U0 + (i + 1) * hb, V0 + hb]]);
            jzAddFill(g, mc);
        } else if (v === 2) {                                                                                  // 青海波
            n = Math.min(120, Math.ceil(Ln / (hb * 2)) + 1);
            var rs = [1, 0.66, 0.33];
            for (i = 0; i < n; i++) for (j = 0; j < 3; j++) {
                var A = awzb_arc(U0 + (i + 0.5) * hb * 2, V0 + hb, hb * rs[j], hb * rs[j], 180, 360, 0);
                if (vt) awzb_swap(A);
                awzb_curve(g, A.v, A.i, A.o, false);
            }
            jzAddStroke(g, mc, Math.max(K.u, hb * 0.1));
        } else {                                                                                               // 菱
            var w = hb * 1.3; n = Math.min(200, Math.ceil(Ln / w));
            awzb_box(g, vt, U0, V0, U1, V0 + hb * 0.1); awzb_box(g, vt, U0, V0 + hb * 0.9, U1, V0 + hb);
            for (i = 0; i < n; i++) { var ux = U0 + (i + 0.5) * w, vy = V0 + hb / 2; awzb2_path(g, vt, [[ux - w * 0.38, vy], [ux, vy - hb * 0.27], [ux + w * 0.38, vy], [ux, vy + hb * 0.27]]); }
            jzAddFill(g, mc);
        }
        // drawn out from U0 (a mask opened by its expansion), clipped to the band and its end
        var a = awzb2_pt(vt, U0 - B, V0 - B), b = awzb2_pt(vt, U0, V0 + hb + B);
        var mk = awzb_mask(S, Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), 'JZ Obi reveal');
        jzSetExpr(mk.property('ADBE Mask Offset'), H + N(Ln) + '*q');
        var c0 = awzb2_pt(vt, U0 - B, V0 - 2), c1 = awzb2_pt(vt, U1, V0 + hb + 2);
        awzb_mask(S, Math.min(c0[0], c1[0]), Math.min(c0[1], c1[1]), Math.max(c0[0], c1[0]), Math.max(c0[1], c1[1]), 'JZ Obi clip');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), H + 'q<=0.005?0:100*(1-ic(PO))*' + AWZB2_POP);
        jzNoGhost(S);
    }
});

/* ---- wzBinsen — 便箋の罫: letter paper: a ruled line under every line of text (left of the column of vertical text), one or two
   more left empty, and a coloured head rule (sometimes doubled); the rules are drawn out one after another, the text moves to
   sit between them */
jzReg('treat', 'wzBinsen', {
    plan: function (rng, st) { return { n: rng.pick([1, 1, 2]), d: rng.chance(0.5) }; },
    apply: function (ctx, L, P, o) {
        if (!awzb2_alive(L) || !awzb2_line(ctx, L)) return;
        var sc = ctx.sc, col = jzTextColor(L), N = jzN, i, j;
        if (awzb2_plate(sc, col)) return;
        var K = awzb2_tK(ctx, L, o), vt = K.vert, sg = vt ? -1 : 1, extra = awzb2_p(P, 'n', 1), S0 = K.fs;
        var lead = (!vt && K.nL > 1) ? K.lead : S0 * 1.3;
        if (vt) awzb2_shift(L, lead * K.s0 * 0.25 * extra, 0); else awzb2_shift(L, 0, -lead * K.s0 * 0.25 * extra);
        var cs = [];
        if (vt) cs.push(K.cx);
        else for (i = 0; i < K.lines.length; i++) { var has = false; for (j = 0; j < K.g.length; j++) if (K.g[j].li === i && !K.g[j].sp) { has = true; break; } if (has) cs.push(K.lines[i].y); }
        if (!cs.length) return;
        var rule = awzb_quiet(sc, col), head = awzb_mark(sc, col), lw = Math.max(1.5 * K.u, S0 * 0.014);
        var U0 = (vt ? K.y0 : K.x0) - S0 * 0.3, U1 = (vt ? K.y1 : K.x1) + S0 * 0.3, H = awzb2_th(ctx, L, o), vs = [];
        for (i = 0; i < cs.length; i++) vs.push(cs[i] + sg * lead / 2);
        for (j = 1; j <= extra; j++) vs.push(vs[cs.length - 1] + sg * lead * j);
        var S = awzb_layer(K, 'JZ Binsen Rules', 'keep', true), UE = 'wzlp(' + N(U0) + ',' + N(U1) + ',q)';
        var hv = cs[0] - sg * lead / 2, HQ = H + 'var q=oc(cl((time-DL)/0.45));';
        awzb_rc(S, 'head rule', vt, HQ, N(U0), N(hv - lw), UE, N(hv + lw), head);
        if (P && P.d) awzb_rc(S, 'head rule 2', vt, HQ, N(U0), N(hv - sg * lw * 4 - lw / 2), UE, N(hv - sg * lw * 4 + lw / 2), head, { op: 80 });
        for (j = 0; j < vs.length; j++)
            awzb_rc(S, 'rule ' + (j + 1), vt, H + 'var q=oc(cl((time-DL-' + N(0.04 * (j + 1)) + ')/0.45));', N(U0), N(vs[j] - lw / 2), UE, N(vs[j] + lw / 2), rule, { op: 75 });
        jzSetExpr(jzXf(S, 'ADBE Opacity'), H + '100*(1-ic(PO))*' + AWZB2_POP);
    }
});

/* =====================================================================
   CAMERA
   ===================================================================== */
// CAM(t) → [x, y, s*sx, s*sy, rot, skx] = the browser's get() at cut time t (snippets see t, cu, KM, W, H + easings ioc ios bell)
function awzb2_fn(cam, o) {
    return jzCamHead(cam) + 'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}function bell(x){return Math.sin(Math.PI*cl(x));}' +
        'var W=' + jzN(cam.W || 1920) + ',H=' + jzN(cam.H || 1080) + ';\n' +
        'function CAM(t){t=Math.max(0,t);var cu=cl(t/DUR);\n' + (o.pre || '') + '\nvar S=(' + (o.s || '1') + ');return [' + (o.x || '0') + ',' + (o.y || '0') + ',S*(' +
        (o.sx || '1') + '),S*(' + (o.sy || '1') + '),' + (o.rot || '0') + ',' + (o.skx || '0') + '];}\n';
}
// on the camera null; skew = Transform effect on every content layer; the colour ghosts (startTime = their lag) get the camera's
// change over their lag as a Transform effect (as ae/p_x2_camtr.jsx)
function awzb2_cam(cam, o) {
    var F = awzb2_fn(cam, o), i, e, C = cam.content || [], lag, LG;
    if (o.x || o.y) jzSetExpr(jzXf(cam.nul, 'ADBE Position'), F + 'var c=CAM(time);[value[0]+c[0],value[1]+c[1]]');
    if (o.s || o.sx || o.sy) jzSetExpr(jzXf(cam.nul, 'ADBE Scale'), F + 'var c=CAM(time);[value[0]*c[2],value[1]*c[3]]');
    for (i = 0; i < C.length; i++) {
        lag = 0; try { lag = C[i].startTime || 0; } catch (err) { lag = 0; }
        LG = 'var LAG=' + jzN(Math.max(0, lag)) + ';';
        if (o.skx) { e = jzEffect(C[i], 'ADBE Geometry2', 'JZ Cam Skew'); jzEX(e, 6, F + LG + '-CAM(time-LAG)[5]'); }
        if (lag > 0.001) {
            e = jzEffect(C[i], 'ADBE Geometry2', 'JZ Cam Lag'); jzEP(e, 3, 0);
            jzEX(e, 2, F + LG + 'var a=CAM(time),b=CAM(time-LAG);[value[0]+(b[0]-a[0])/a[2],value[1]+(b[1]-a[1])/a[3]]');
            if (o.s || o.sx || o.sy) {
                jzEX(e, 4, F + LG + 'CAM(time-LAG)[3]/CAM(time)[3]*100');
                jzEX(e, 5, F + LG + 'CAM(time-LAG)[2]/CAM(time)[2]*100');
            }
        }
    }
}
function awzb2_cdur(cam) { return Math.max(0.01, (cam.cut && cam.cut.dur) || 3); }

/* ---- wzKakejikuView — 掛け軸を眺める: starts close on the upper part, lets the eye travel down the scroll while stepping back
   to the whole picture (72 % of the cut) */
jzReg('cam', 'wzKakejikuView', {
    plan: function (rng, st) { return { a: rng.range(0.06, 0.085), y: rng.range(0.026, 0.036) }; },
    apply: function (cam, P) {
        var N = jzN, T = Math.max(0.6, awzb2_cdur(cam) * 0.72);
        awzb2_cam(cam, { pre: 'var e=ios(cl(t/' + N(T) + '));', s: '1+' + N(awzb2_p(P, 'a', 0.07)) + '*KM*(1-e)', y: 'H*' + N(awzb2_p(P, 'y', 0.03)) + '*KM*Math.cos(e*Math.PI)*(1-e)' });
    }
});

/* ---- wzByobuPan — 屏風送り: the view walks past a folding screen: it pans in three or four steps, and each panel faces a slightly
   different way (alternating skew, the last panel square on) */
jzReg('cam', 'wzByobuPan', {
    plan: function (rng, st) { return { dir: rng.pick([1, -1]), n: rng.pick([3, 3, 4]), a: rng.range(0.024, 0.032) }; },
    apply: function (cam, P) {
        var N = jzN, n = Math.max(1, Math.round(awzb2_p(P, 'n', 3))), d = awzb2_p(P, 'dir', 1) < 0 ? -1 : 1;
        awzb2_cam(cam, { pre: 'var n=' + n + ',u=cl(t/' + N(Math.max(0.5, awzb2_cdur(cam))) + ')*n,i=Math.min(n-1,Math.floor(u)),f=ioc(cl((u-i)/0.55)),pos=(i+f)/n*2-1,' +
                'j0=i-1,f0=(j0<0||j0>=n-1)?0:(j0%2?1:-1),f1=(i<0||i>=n-1)?0:(i%2?1:-1),fc=f0+(f1-f0)*f;',
            x: d + '*pos*W*' + N(awzb2_p(P, 'a', 0.028)) + '*KM', skx: 'fc*1.1*KM', sx: '1-0.014*KM*bell(f)', s: '1.03' });
    }
});

/* ---- wzOjigi — お辞儀: the frame makes a small bow at the top of the cut: it dips and shortens, holds for a breath and straightens up */
jzReg('cam', 'wzOjigi', {
    plan: function (rng, st) { return { a: rng.range(0.026, 0.036), h: rng.range(0.16, 0.26) }; },
    apply: function (cam, P) {
        var N = jzN, T = jzClamp(awzb2_cdur(cam) * 0.6, 0.5, 1.25), h = awzb2_p(P, 'h', 0.2);
        awzb2_cam(cam, { pre: 'var u=t/' + N(T) + ',b=ioc(u/0.3)*(1-ioc((u-' + N(0.3 + h) + ')/' + N(0.7 - h) + '));',
            y: 'H*' + N(awzb2_p(P, 'a', 0.03)) + '*KM*b', sy: '1-0.04*KM*b', s: '1+0.008*KM*b' });
    }
});

/* =====================================================================
   FX (main comp, absolute time; p = the browser's k)
   ===================================================================== */

/* ---- wzHyoshigi — 拍子木: two wooden clappers fly in and strike (at 30 %): a sharp crack of rays at the meeting point, a brief
   wash of the accent, and they spring apart */
jzReg('fx', 'wzHyoshigi', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = awzb2_S(ev), mn = Math.min(W, H), N = jzN, A1 = awzb2_amp1(ev), Lc = mn * 0.5, th = mn * 0.065, i, c, sd;
    var cx = W / 2 + awzb_rs(s, 1) * W * 0.14, cy = H / 2 + awzb_rs(s, 2) * H * 0.1, tilt = (awzb_r(s, 3) < 0.5 ? 1 : -1) * (10 + 14 * awzb_r(s, 4));
    var col = awzb_ink(sc), band = awzb_pop(sc), Rm = mn * 0.4, sw = Math.max(2, mn * 0.009);
    var hd = awzb2_fh(f, ev) + 'var u=cl((p-0.3)/0.7),d=p<0.3?wzlp(' + N(mn * 0.8) + ',' + N(th / 2) + ',ic(p/0.3)):' + N(th / 2) + '+' + N(mn * 0.1) + '*oc(u);\n';
    var S = jzEvShape(f.comp, 'JZ FX wzHyoshigi', ev.t, ev.dur);
    var RG = jzGrp(S, 'crack');
    for (c = 0; c < 2; c++) {
        var rg = awzb_sub(RG, c ? 'rays B' : 'rays A');
        for (i = c; i < 12; i += 2) { var an = i / 12 * AWZB_TAU + 0.26; jzAddPath(rg, [[0, 0], [Math.cos(an) * Rm, Math.sin(an) * Rm * 1.6]], false); }
        var R0 = 'var r0=' + N(mn) + '*(0.09+0.26*oe(u))*' + (c ? '0.8' : '1') + ',ln=' + N(mn * 0.11 * A1) + '*(1-u);';
        jzAddTrimPaths(rg, hd + R0 + 'Math.min(100,(r0+ln)/' + N(Rm) + '*100)', hd + R0 + 'Math.min(100,r0/' + N(Rm) + '*100)');
        jzAddStroke(rg, band, sw);
    }
    awzb_xf(RG, { p: [cx, cy], r: tilt, oe: hd + 'p>=0.3?100*(1-wzsm(0.1,0.75,u)):0' });
    var CG = jzGrp(S, 'clappers');
    for (sd = -1; sd <= 1; sd += 2) {
        var cg = awzb_sub(CG, sd < 0 ? 'clapper A' : 'clapper B'), bs = awzb_sub(cg, 'band'), bd;
        jzAddRect(bs, th, Lc * 0.045, 0, 0, -Lc * 0.3775); jzAddFill(bs, band);
        bd = awzb_sub(cg, 'wood'); jzAddRect(bd, th, Lc, 0, 0, 0); jzAddFill(bd, col);
        awzb_xf(cg, { pe: hd + '[' + sd + '*d,0]' });
    }
    awzb_xf(CG, { p: [cx, cy], r: tilt, oe: hd + '100*(p<0.3?cl(p/0.3*4):1-iq(u))' });
    var FG = jzGrp(S, 'strike wash');
    jzAddRect(FG, W + 8, H + 8, 0, W / 2, H / 2); jzAddFill(FG, band);
    awzb_xf(FG, { oe: hd + 'var fl=p>=0.3?(1-oc(u/0.5))*' + N(A1) + ':0;fl>0.01?20*fl:0' });
} });

/* ---- wzShojiPass — 障子の影: the shadow of a shoji lattice slides slantwise across the picture, as if a lamp were carried past
   outside (a soft wide pass under a sharp one) */
jzReg('fx', 'wzShojiPass', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = awzb2_S(ev), mn = Math.min(W, H), N = jzN, dir = awzb_r(s, 1) < 0.5 ? 1 : -1, A = jzClamp(awzb2_ampOf(ev), 0.6, 1.1);
    var cu = mn * 0.21, cv = mn * 0.15, lw = Math.max(2, mn * 0.012), sk = 0.32 * dir, i, x, y, k;
    var hd = awzb2_fh(f, ev) + 'var a=0.3*wzahr(p,0.25,0.7)*' + N(A) + ',sh=' + dir + '*wzlp(' + N(-W * 0.14) + ',' + N(W * 0.14) + ',p);\n';
    var S = jzEvShape(f.comp, 'JZ FX wzShojiPass', ev.t, ev.dur), passes = [[1, 100], [2.6, 35]];
    var X = function (xx, yy) { return xx + sk * (yy - H / 2); };
    for (k = 0; k < 2; k++) {
        var wv = passes[k][0], g = jzGrp(S, k ? 'soft shadow' : 'lattice shadow');
        for (x = -W * 0.5, i = 0; x < W * 1.5 && i < 80; x += cu, i++) {
            var t = (i % 3 === 0 ? 2.2 : 1) * lw * wv;
            jzAddPath(g, [[X(x - t / 2, -10), -10], [X(x + t / 2, -10), -10], [X(x + t / 2, H + 10), H + 10], [X(x - t / 2, H + 10), H + 10]], true);
        }
        for (y = cv * 0.5, i = 0; y < H && i < 60; y += cv, i++) {
            var hw = lw * wv / 2;
            jzAddPath(g, [[-W, y - hw], [W * 2, y - hw], [W * 2, y + hw], [-W, y + hw]], true);
        }
        jzAddFill(g, awzb_shade(sc));
        awzb_xf(g, { o: passes[k][1] });
    }
    jzSetExpr(jzXf(S, 'ADBE Position'), hd + '[value[0]+sh,value[1]]');
    jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + 'a<0.01?0:100*a');
} });

/* ---- wzSumiShibuki — 墨しぶき: a loaded brush is flicked at the screen: a blot lands near one edge and throws a fan of drops
   across it towards the centre */
jzReg('fx', 'wzSumiShibuki', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = awzb2_S(ev), mn = Math.min(W, H), N = jzN, a0 = awzb2_amp1(ev), i;
    var left = awzb_r(s, 1) < 0.5, ox = W * (left ? 0.1 + 0.1 * awzb_r(s, 2) : 0.9 - 0.1 * awzb_r(s, 2)), oy = H * (0.2 + 0.6 * awzb_r(s, 3)), base = Math.atan2(H / 2 - oy, W / 2 - ox);
    var hd = awzb2_fh(f, ev) + 'var g=oe(cl(p/0.3)),al=1-iq(cl((p-0.42)/0.58));\n';
    var S = jzEvShape(f.comp, 'JZ FX wzSumiShibuki', ev.t, ev.dur), G = jzGrp(S, 'ink');
    for (i = 0; i < 34; i++) {
        var r1 = awzb_r(s, i, 7), an = base + awzb_rs(s, i, 8) * 0.95, D = mn * (0.09 + 0.85 * r1 * r1) * a0, r = mn * 0.02 * (1 - r1 * 0.8) * (0.4 + 0.6 * awzb_r(s, i, 9)) * a0;
        var dg = awzb_sub(G, 'drop ' + (i + 1));
        jzAddEllipse(dg, r * (1.4 + 2.2 * r1) * 2, r * 2);
        awzb_xf(dg, { r: an * 180 / Math.PI, pe: hd + '[' + N(ox) + '+' + N(Math.cos(an) * D) + '*g,' + N(oy) + '+' + N(Math.sin(an) * D) + '*g]' });
    }
    for (i = 0; i < 7; i++) {
        var ab = awzb_r(s, i, 4) * AWZB_TAU, db = mn * 0.035 * awzb_r(s, i, 5), rb = mn * (0.03 + 0.035 * awzb_r(s, i, 6)) * a0;
        var bg = awzb_sub(G, 'blot ' + (i + 1));
        jzAddEllipse(bg, rb * 2, rb * 2);
        awzb_xf(bg, { pe: hd + '[' + N(ox) + '+' + N(Math.cos(ab) * db) + '*g,' + N(oy) + '+' + N(Math.sin(ab) * db) + '*g]', se: hd + '[g*100,g*100]' });
    }
    jzAddFill(G, awzb_ink(sc));
    jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + 'al<=0.01?0:100*al');
} });

/* ---- wzOrime — 紙の折り目: for a moment the picture is a sheet folded in thirds and across: panels shade alternately and the
   creases catch the light (light on one side, shade on the other; the browser's gradients as stepped bands) */
jzReg('fx', 'wzOrime', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, mn = Math.min(W, H), A = jzClamp(awzb2_ampOf(ev), 0.6, 1.1), i, j, sd;
    var nx = W >= H ? 3 : 2, ny = W >= H ? 2 : 3, dk = awzb_shade(sc), lt = awzb_light(sc), wB = mn * 0.2, lw = Math.max(1, mn * 0.003), nb = 8;
    var hd = awzb2_fh(f, ev) + 'var e=wzahr(p,0.14,0.55);\n';
    var S = jzEvShape(f.comp, 'JZ FX wzOrime', ev.t, ev.dur), cr = [];
    for (i = 1; i < nx; i++) cr.push({ v: true, pos: W * i / nx, flip: i % 2 ? 1 : -1 });
    for (j = 1; j < ny; j++) cr.push({ v: false, pos: H * j / ny, flip: j % 2 ? -1 : 1 });
    var LG = jzGrp(S, 'crease lines');
    for (i = 0; i < cr.length; i++) { if (cr[i].v) jzAddRect(LG, lw, H, 0, cr[i].pos, H / 2); else jzAddRect(LG, W, lw, 0, W / 2, cr[i].pos); }
    jzAddFill(LG, dk, 45 * A);
    for (i = 0; i < cr.length; i++) for (sd = -1; sd <= 1; sd += 2) {
        var C = cr[i], dark = sd * C.flip > 0, c = dark ? dk : lt, a = (dark ? 0.3 : 0.2) * A, k;
        for (k = 0; k < nb; k++) {
            var al = a * (1 - (k + 0.5) / nb), d0 = C.pos + sd * k / nb * wB, d1 = C.pos + sd * (k + 1) / nb * wB, g = jzGrp(S, 'crease ' + (i + 1) + (sd < 0 ? ' a' : ' b') + ' ' + (k + 1));
            if (C.v) jzAddRect(g, wB / nb + 0.5, H, 0, (d0 + d1) / 2, H / 2); else jzAddRect(g, W, wB / nb + 0.5, 0, W / 2, (d0 + d1) / 2);
            jzAddFill(g, c, al * 100);
        }
    }
    var PG = jzGrp(S, 'shaded panels');
    for (i = 0; i < nx; i++) for (j = 0; j < ny; j++) if ((i + j) % 2) jzAddRect(PG, W / nx, H / ny, 0, W * (i + 0.5) / nx, H * (j + 0.5) / ny);
    jzAddFill(PG, dk, 9 * A);
    jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + 'e<0.01?0:100*e');
} });

/* ---- wzHanafubuki — 花吹雪: one gust carries a flurry of petals slantwise across the whole picture (each petal turning and
   flipping on its way) */
jzReg('fx', 'wzHanafubuki', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = awzb2_S(ev), mn = Math.min(W, H), N = jzN, dir = awzb_r(s, 1) < 0.5 ? 1 : -1, n = Math.round(34 + 16 * jzClamp(awzb2_ampOf(ev), 0.5, 1.3)), i;
    var c1 = awzb_pop(sc), cols = [c1, awzb_first([sc.accent2], function (c) { return jzContrast(c, sc.bg) > 1.4; }, c1), jzMixHex(c1, awzb_light(sc), 0.45)];
    var hd = awzb2_fh(f, ev), X0 = (dir > 0 ? -0.08 : 1.08) * W;
    var S = jzEvShape(f.comp, 'JZ FX wzHanafubuki', ev.t, ev.dur);
    for (i = 0; i < n; i++) {
        var ph = awzb_r(s, i, 3) * AWZB_TAU, y0 = H * (-0.25 + 1.05 * awzb_r(s, i, 4)), sp = mn * (0.016 + 0.022 * awzb_r(s, i, 5)), g = jzGrp(S, 'petal ' + (i + 1));
        var Q = hd + 'var kk=cl(p*1.4-' + N(0.4 * awzb_r(s, i, 2)) + ');';
        awzb_curve(g, [[0, -sp], [0.22 * sp, sp], [0, 0.72 * sp], [-0.22 * sp, sp]],
            [[-0.6333 * sp, 0.6 * sp], [0.4867 * sp, -0.7333 * sp], [0, 0], [0, 0]], [[0.6333 * sp, 0.6 * sp], [0, 0], [0, 0], [-0.4867 * sp, -0.7333 * sp]], true);
        jzAddFill(g, cols[i % 3]);
        awzb_xf(g, { pe: Q + '[' + N(X0) + '+' + N(dir * W * 1.16) + '*kk,' + N(y0) + '+' + N(H * 0.36) + '*kk+Math.sin(kk*9+' + N(ph) + ')*' + N(mn * 0.035) + ']',
            re: Q + '(' + N(ph) + '+kk*' + (i % 2 ? 8 : -8) + ')*180/Math.PI', se: Q + '[(0.3+0.7*Math.abs(Math.cos(kk*12+' + N(ph) + ')))*100,100]',
            oe: Q + 'kk>0&&kk<1?wzsm(0,0.1,kk)*(1-wzsm(0.85,1,kk))*92:0' });
    }
} });

/* ---- wzMaku — 定式幕: the striped stage curtain (three colours) is run across the picture and straight off again — closed at
   the middle of the event, the cut (the curtain travels with its leading edge; a mask cuts it to the covered part) */
jzReg('fx', 'wzMaku', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = awzb2_S(ev), N = jzN, dir = awzb_r(s, 1) < 0.5 ? 1 : -1, sw = Math.max(8, W / 13), i, c;
    var c1 = awzb_ink(sc), c2 = awzb_pop(sc);
    var c3 = awzb_first([sc.accent2, sc.sub, sc.fg], function (x) { return !awzb_same(x, c1) && !awzb_same(x, c2) && jzContrast(x, sc.bg) > 1.3; }, jzMixHex(c1, c2, 0.5)), cols = [c1, c2, c3];
    var hd = awzb2_fh(f, ev) + 'var x0=p<0.5?0:W*wzio((p-0.5)/0.5),x1=p<0.5?W*wzio(p/0.5):W,an=p<0.5?x1:x0+W;\n';
    var S = jzEvShape(f.comp, 'JZ FX wzMaku', ev.t, ev.dur), n = Math.min(40, Math.ceil(W / sw) + 2);
    if (dir < 0) { jzXf(S, 'ADBE Position').setValue([W, 0]); jzXf(S, 'ADBE Scale').setValue([-100, 100]); }
    awzb2_emask(S, hd + 'createPath([[x0,-10],[x1,-10],[x1,H+10],[x0,H+10]],[],[],true)');
    var eg = jzGrp(S, 'edge shade'); jzAddRect(eg, sw * 0.2, H, 0, 0, H / 2); jzAddFill(eg, '#000000', 30);
    awzb_xf(eg, { pe: hd + '[(p<0.5?x1-' + N(sw * 0.2) + ':x0)+' + N(sw * 0.1) + ',0]' });
    awzb_rc(S, 'rail', false, hd, 'x0', '0', 'x1', N(Math.max(3, H * 0.03)), c1);
    var fg = jzGrp(S, 'fold shades');
    for (i = 0; i < n; i++) jzAddRect(fg, sw * 0.14, H, 0, -(i + 1) * sw + sw * 0.07, H / 2);
    jzAddFill(fg, '#000000', 16);
    awzb_xf(fg, { pe: hd + '[an,0]' });
    for (c = 0; c < 3; c++) {
        var g = jzGrp(S, 'stripes ' + (c + 1));
        for (i = c; i < n; i += 3) jzAddRect(g, sw + 0.6, H, 0, -(i + 0.5) * sw + 0.3, H / 2);
        jzAddFill(g, cols[c]);
        awzb_xf(g, { pe: hd + '[an,0]' });
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + 'x1-x0<0.5?0:100');
} });

/* =====================================================================
   TRANS  (p = 0 exactly the old cut A, p = 1 exactly the new cut B)
   ===================================================================== */

/* ---- wzFusumaPass — 襖渡し: two sliding paper doors (frame, pulls, optional middle stile and painted mist) close over the old
   cut, meet, and open again on the new one (the old cut = a copy of A above B until the doors are shut) */
jzReg('trans', 'wzFusumaPass', {
    plan: function (rng, st) { return { n: rng.pick([1, 2]), k: rng.chance(0.6) }; },
    build: function (t) {
        var W = t.W, H = t.H, sc = t.sc, mn = Math.min(W, H), N = jzN, Q = t.P || {}, pw = W / 2, lw = Math.max(2, mn * 0.012), sd, k;
        var paper = awzb_paper(sc), frame = awzb_ink(sc), acc = awzb_pop(sc);
        var hd = awzb2_trh(t) + 'var c=p<0.44?wzio(p/0.44):(p<0.56?1:1-wzio((p-0.56)/0.44)),half=' + N(pw) + '*c;\n';
        awzb2_copy(t, t.A, 'JZ Trans fusuma (prev cut)', t.t0 + t.dur * 0.5);
        var S = jzEvShape(t.comp, 'JZ Trans fusuma doors', t.t0, t.dur);
        for (sd = -1; sd <= 1; sd += 2) {
            var G = jzGrp(S, sd < 0 ? 'door left' : 'door right'), hx = sd < 0 ? pw - mn * 0.075 : mn * 0.075, r = mn * 0.024, g;
            g = awzb_sub(G, 'pull ring'); jzAddEllipse(g, r * 2, r * 2, hx, H / 2); jzAddStroke(g, acc, lw * 0.7);
            g = awzb_sub(G, 'pull'); jzAddEllipse(g, r * 2, r * 2, hx, H / 2); jzAddFill(g, frame);
            g = awzb_sub(G, 'frame');
            jzAddRect(g, pw, lw * 2.2, 0, pw / 2, lw * 1.1); jzAddRect(g, pw, lw * 2.2, 0, pw / 2, H - lw * 1.1);
            jzAddRect(g, lw * 1.6, H, 0, lw * 0.8, H / 2); jzAddRect(g, lw * 1.6, H, 0, pw - lw * 0.8, H / 2);
            if ((Q.n || 1) > 1) jzAddRect(g, lw * 1.2, H, 0, pw / 2, H / 2);
            jzAddFill(g, frame);
            if (Q.k) {
                var mist = [[0.24, 0.1, 0.7], [0.3, 0.35, 0.95], [0.72, 0.05, 0.55]];
                g = awzb_sub(G, 'mist');
                for (k = 0; k < 3; k++) { var y = H * mist[k][0], h = H * 0.035, xa = pw * (sd < 0 ? mist[k][1] : 1 - mist[k][2]), w = pw * (mist[k][2] - mist[k][1]); jzAddRect(g, w, h, h / 2, xa + w / 2, y + h / 2); }
                jzAddFill(g, acc, 16);
            }
            g = awzb_sub(G, 'paper'); jzAddRect(g, pw + 0.5, H, 0, pw / 2 + 0.25, H / 2); jzAddFill(g, paper);
            awzb_xf(G, { pe: hd + (sd < 0 ? '[half-' + N(pw) + ',0]' : '[' + N(W) + '-half,0]') });
        }
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + 'c<=0.001?0:100');
    }
});

/* ---- wzMakimonoRoll — 巻物送り: a scroll roller travels across the picture, winding the old cut onto itself (the next strip of
   it squeezed onto the roll, shaded round) and leaving the new one flat behind it with a cast shadow */
jzReg('trans', 'wzMakimonoRoll', {
    plan: function (rng, st) { return { dir: rng.pick([1, -1]) }; },
    build: function (t) {
        var W = t.W, H = t.H, sc = t.sc, mn = Math.min(W, H), N = jzN, dir = (t.P && t.P.dir) < 0 ? -1 : 1, d = Math.max(12, mn * 0.09), B = W + H, k;
        var hd = awzb2_trh(t) + 'var e=wzio(p),X=' + (dir > 0 ? 'wzlp(' + N(-d) + ',' + N(W + d) + ',e)' : 'wzlp(' + N(W + d) + ',' + N(-d) + ',e)') + ',xa=X-' + N(d / 2) + ',xb=X+' + N(d / 2) + ';\n';
        var S01 = 'var sx0=' + (dir > 0 ? 'xb' : 'xa-' + N(d * 1.6)) + ',s0=Math.max(0,Math.min(W-1,sx0)),s1=Math.max(1,Math.min(W,sx0+' + N(d * 1.6) + '));';
        // the rest of the old cut, cut back to the far side of the roll
        var C = awzb2_copy(t, t.A, 'JZ Trans scroll (prev cut)');
        var mk = dir > 0 ? awzb_mask(C, W, -B, W + B, H + B, 'JZ Scroll rest') : awzb_mask(C, -B, -B, 0, H + B, 'JZ Scroll rest');
        jzSetExpr(mk.property('ADBE Mask Offset'), hd + (dir > 0 ? 'Math.max(0,W-xb)' : 'Math.max(0,xa)'));
        // the paper of the roll and the shadow it casts on the new cut
        var SL = jzEvShape(t.comp, 'JZ Trans scroll paper', t.t0, t.dur), g;
        g = jzGrp(SL, 'roll paper'); jzAddRect(g, d, H, 0, d / 2, H / 2); jzAddFill(g, awzb_paper(sc));
        awzb2_ramp(SL, 'cast shadow', dir > 0 ? 0 : d, (dir > 0 ? -1 : 1) * d * 1.3, H, '#000000', 0.32, 0, 6);
        jzSetExpr(jzXf(SL, 'ADBE Position'), hd + '[value[0]+xa,value[1]]');
        // the next strip of the old cut, squeezed onto the roll
        var C2 = awzb2_copy(t, t.A, 'JZ Trans scroll (wound strip)');
        awzb2_emask(C2, hd + S01 + 'createPath([[s0,-10],[s1,-10],[s1,H+10],[s0,H+10]],[],[],true)');
        var tr = jzEffect(C2, 'ADBE Geometry2', 'JZ Scroll squeeze');
        jzEX(tr, 1, hd + S01 + '[s0,' + N(H / 2) + ']'); jzEX(tr, 2, hd + '[xa,' + N(H / 2) + ']'); jzEP(tr, 3, 0);
        jzEX(tr, 5, hd + S01 + '100*' + N(d) + '/Math.max(1,s1-s0)'); jzEX(tr, 9, hd + S01 + 's1-s0>1?85:0');
        // round shading and the end caps
        var ST = jzEvShape(t.comp, 'JZ Trans scroll roll', t.t0, t.dur), capH = Math.max(4, H * 0.035), stops = [[0, 0.62], [0.3, 0.08], [0.55, 0.12], [1, 0.66]], nb = 12;
        g = jzGrp(ST, 'caps');
        jzAddRect(g, d * 1.24, capH, 0, d / 2, capH / 2); jzAddRect(g, d * 1.24, capH, 0, d / 2, H - capH / 2); jzAddFill(g, awzb_ink(sc));
        g = jzGrp(ST, 'cap lines');
        jzAddRect(g, d * 1.24, capH * 0.22, 0, d / 2, capH * 1.11); jzAddRect(g, d * 1.24, capH * 0.22, 0, d / 2, H - capH * 1.11); jzAddFill(g, awzb_pop(sc));
        for (k = 0; k < nb; k++) {
            var u = (k + 0.5) / nb, a = 0, z;
            for (z = 0; z + 1 < stops.length; z++) if (u >= stops[z][0] && u <= stops[z + 1][0]) a = stops[z][1] + (stops[z + 1][1] - stops[z][1]) * (u - stops[z][0]) / (stops[z + 1][0] - stops[z][0]);
            g = jzGrp(ST, 'shade ' + (k + 1)); jzAddRect(g, d / nb + 0.3, H, 0, d * u, H / 2); jzAddFill(g, '#000000', a * 100);
        }
        jzSetExpr(jzXf(ST, 'ADBE Position'), hd + '[value[0]+xa,value[1]]');
        // stacking (top → bottom): roll shading, wound strip, roll paper, rest of the old cut, new cut
        C.moveBefore(t.B); SL.moveBefore(C); C2.moveBefore(SL); ST.moveBefore(C2);
    }
});

/* ---- wzMawariButai — 回り舞台: the revolving stage: both cuts stand on one great turntable below the frame; the old one swings
   out (dimming) as the new one swings in, over a darkened floor, with the seam of the turntable passing through */
jzReg('trans', 'wzMawariButai', {
    plan: function (rng, st) { return { dir: rng.pick([1, -1]) }; },
    build: function (t) {
        var W = t.W, H = t.H, sc = t.sc, N = jzN, dir = (t.P && t.P.dir) < 0 ? -1 : 1, R = Math.max(W, H) * 1.9, px = W / 2, py = H / 2 + R;
        var al = 2 * Math.atan((W / 2) / (R - H / 2)) * 1.32 * 180 / Math.PI, lw = Math.max(2, Math.min(W, H) * 0.008);
        var hd = awzb2_trh(t) + 'var e=wzio(p);\n';
        var turn = function (L, tag, dimEx, rotEx) {
            var fe = jzEffect(L, 'ADBE Fill', 'JZ Trans stage dim ' + tag); jzEP(fe, 3, jzHex('#000000')); jzEX(fe, 7, hd + dimEx);
            var tr = jzEffect(L, 'ADBE Geometry2', 'JZ Trans stage turn ' + tag); jzEP(tr, 1, [px, py]); jzEP(tr, 2, [px, py]); jzEX(tr, 8, hd + rotEx);
        };
        turn(t.A, 'out', '0.4*e', N(-dir * al) + '*e');
        turn(t.B, 'in', '0.4*(1-e)', N(dir * al) + '*(1-e)');
        // the floor: the old background turning into the new one, darkened
        var pb = (t.scPrev || sc).bg, F1 = jzEvSolid(t.comp, 'JZ Trans stage floor (new)', jzMixHex(sc.bg, '#000000', 0.55), t.t0, t.dur), F0 = jzEvSolid(t.comp, 'JZ Trans stage floor', jzMixHex(pb, '#000000', 0.55), t.t0, t.dur);
        jzSetExpr(jzXf(F1, 'ADBE Opacity'), hd + '100*p');
        F1.moveAfter(t.A); F0.moveAfter(F1);
        var S = jzEvShape(t.comp, 'JZ Trans stage seam', t.t0, t.dur), g = jzGrp(S, 'seam');
        jzAddRect(g, lw, H * 2, 0, 0, -R); jzAddFill(g, awzb_ink(sc));
        jzXf(S, 'ADBE Position').setValue([px, py]);
        jzSetExpr(jzXf(S, 'ADBE Rotate Z'), hd + N(dir * al) + '*(0.5-e)');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*bell(p)');
    }
});
