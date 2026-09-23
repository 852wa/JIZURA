// ================================================================ decor B part 1 (AE port of 27 decor entries in src/11p_decorB.js)
// Japanese motifs (kamon … kasumi), sci-fi HUD (hexGrid … circuit), print & stationery (swatches … indexTabs).
// decor.build(ctx, bb, d): layers live in the CONTENT comp (time 0 = cut start). Every entry here is drawn by the browser on the
// main pass only, so all its layers are kept out of the tinted ghosts (jzNoGhost, done once in db1_reg).
// Entries the browser wraps in withSettle() start after the lyric's entrance has settled: expressions use t = time - ST.

// ---------------------------------------------------------------- shared helpers (prefix db1_)
// the browser's deterministic hash J.h / J.r / J.rs (so seeded placements match the web frame)
function db1_h(a, b, c, d, e) {
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
function db1_r(a, b, c, d, e) { return db1_h(a, b, c, d, e) / 4294967296; }
function db1_rs(a, b, c, d, e) { return db1_r(a, b, c, d, e) * 2 - 1; }
var DB1_D = Math.PI / 180;
function db1_u(ctx) { return jzU(ctx) / 1080; }                       // browser U(env) at comp scale
function db1_mg(ctx) { return Math.round(jzU(ctx) * 0.05); }          // safe margin
function db1_fs(ctx) { return Math.max(12, 16 * db1_u(ctx)); }       // small label size
function db1_dark(sc) { return jzLum(sc.bg) < 0.5; }
function db1_vis(sc, c, mn) { return (c && jzContrast(c, sc.bg) >= (mn || 1.5)) ? c : sc.fg; }
function db1_acc(sc) { return db1_vis(sc, sc.accent); }
function db1_acc2(sc) { return db1_vis(sc, sc.accent2 || sc.accent); }
function db1_settle(ctx) { return jzClamp((ctx.cut.inDur || 0) * 0.6, 0, 0.35); }
function db1_pad(n, k) { return jzPad(Math.max(0, Math.floor(n)), k || 2); }
// colour as an expression literal [r,g,b,1]
function db1_cx(hex) { var c = jzHex(hex); return '[' + jzN(c[0]) + ',' + jzN(c[1]) + ',' + jzN(c[2]) + ',1]'; }
// expression header: jzTH (DUR IN OS OD SD, easings, PO, K) + ioc / wr + t (local time after the settle delay), V (started)
var DB1_FNS = 'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}function wr(v,lo,sp){return lo+((v-lo)%sp+sp)%sp;}\n';
function db1_H(ctx, st) { return jzTH(ctx) + DB1_FNS + 'var ST=' + jzN(st || 0) + ',t=time-ST,V=t<0?0:1;\n'; }
// layer opacity = value × started × exit fade × extra factor
function db1_op(ctx, L, st, ex) { jzSetExpr(jzXf(L, 'ADBE Opacity'), db1_H(ctx, st) + 'value*V*K' + (ex ? '*(' + ex + ')' : '')); }
function db1_sub(g, name) { var s = jzVecs(g).addProperty('ADBE Vector Group'); if (name) s.name = name; return s; }
function db1_gx(ctx, g, mn, st, ex) { jzSetExpr(jzGX(g).property(mn), db1_H(ctx, st) + ex); }
function db1_gop(ctx, g, st, ex, pre) { db1_gx(ctx, g, 'ADBE Vector Group Opacity', st, (pre || '') + 'value*(' + ex + ')'); }
function db1_st(g, col, w, op, cap, join) {
    var s = jzAddStroke(g, col, w, op);
    try { if (cap) s.property('ADBE Vector Stroke Line Cap').setValue(cap); if (join) s.property('ADBE Vector Stroke Line Join').setValue(join); } catch (e) {}
    return s;
}
function db1_dash(s, on, off) {
    var D = s.property('ADBE Vector Stroke Dashes'), p1 = null, p2 = null;
    try { p1 = D.addProperty('ADBE Vector Stroke Dash 1'); p2 = D.addProperty('ADBE Vector Stroke Gap 1'); } catch (e) { p1 = null; p2 = null; }
    try { if (p1) p1.setValue(on); if (p2) p2.setValue(off); } catch (e2) {}
}
// trim paths with expressions (end / start / offset), all in one header
function db1_trim(ctx, g, st, endEx, startEx, offEx, pre) {
    var tr = jzVecs(g).addProperty('ADBE Vector Filter - Trim'), H = db1_H(ctx, st) + (pre || '');
    if (endEx != null) jzSetExpr(tr.property('ADBE Vector Trim End'), H + 'Math.max(0,Math.min(100,' + endEx + '))');
    if (startEx != null) jzSetExpr(tr.property('ADBE Vector Trim Start'), H + 'Math.max(0,Math.min(100,' + startEx + '))');
    if (offEx != null) jzSetExpr(tr.property('ADBE Vector Trim Offset'), H + offEx);
    return tr;
}
// circle arc: ellipse r around (x, y) starting at a0 (deg, 0 = right, clockwise) and sweeping sweepEx degrees
function db1_arcTrim(ctx, g, r, x, y, a0, st, sweepEx) {
    jzAddEllipse(g, r * 2, r * 2, x, y);
    var tr = db1_trim(ctx, g, st, '(' + sweepEx + ')/3.6');
    tr.property('ADBE Vector Trim Offset').setValue(a0 + 90);
    return tr;
}
function db1_rep(g, n, px, py, rot, off) {
    var rp = jzVecs(g).addProperty('ADBE Vector Filter - Repeater');
    rp.property('ADBE Vector Repeater Copies').setValue(n);
    if (off) rp.property('ADBE Vector Repeater Offset').setValue(off);
    var rt = rp.property('ADBE Vector Repeater Transform');
    rt.property('ADBE Vector Repeater Position').setValue([px || 0, py || 0]);
    if (rot) rt.property('ADBE Vector Repeater Rotation').setValue(rot);
    return rp;
}
// point lists
function db1_arc(cx, cy, r, a0, a1, n) { var o = [], i; n = n || 48; for (i = 0; i <= n; i++) { var a = (a0 + (a1 - a0) * i / n) * DB1_D; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; }
function db1_ell(cx, cy, rx, ry, rot, a0, a1, n) { var o = [], c = Math.cos(rot), s = Math.sin(rot), i; for (i = 0; i <= n; i++) { var a = (a0 + (a1 - a0) * i / n) * DB1_D, x = Math.cos(a) * rx, y = Math.sin(a) * ry; o.push([cx + x * c - y * s, cy + x * s + y * c]); } return o; }
function db1_xf(pts, cx, cy, ang, s) { var c = Math.cos(ang || 0), sn = Math.sin(ang || 0), o = [], i; s = s == null ? 1 : s; for (i = 0; i < pts.length; i++) o.push([cx + (pts[i][0] * c - pts[i][1] * sn) * s, cy + (pts[i][0] * sn + pts[i][1] * c) * s]); return o; }
function db1_bez(p0, p1, p2, p3, n) { var o = [], i; for (i = 0; i <= n; i++) { var t = i / n, m = 1 - t; o.push([m * m * m * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t * t * t * p3[0], m * m * m * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t * t * t * p3[1]]); } return o; }
function db1_off(pts, dx, dy) { var o = [], i; for (i = 0; i < pts.length; i++) o.push([pts[i][0] + dx, pts[i][1] + dy]); return o; }
function db1_ellShape(cx, cy, rx, ry) {
    var kx = 0.5523 * rx, ky = 0.5523 * ry, sh = new Shape();
    sh.vertices = [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]];
    sh.inTangents = [[-kx, 0], [0, -ky], [kx, 0], [0, ky]];
    sh.outTangents = [[kx, 0], [0, ky], [-kx, 0], [0, -ky]];
    sh.closed = true; return sh;
}
function db1_rectShape(x0, y0, x1, y1) { var sh = new Shape(); sh.vertices = [[x1, y0], [x1, y1], [x0, y1], [x0, y0]]; sh.closed = true; return sh; }
function db1_mask(L, sh, mode, feather) {
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
    m.property('ADBE Mask Shape').setValue(sh);
    if (mode) m.maskMode = mode;
    if (feather) m.property('ADBE Mask Feather').setValue([feather, feather]);
    return m;
}
// small secondary text (mono, sub colour, left aligned, like the browser's label())
function db1_label(ctx, text, x, y, o) {
    o = o || {};
    return jzText(ctx, String(text), { font: o.font || jzMonoF(ctx), size: o.size || db1_fs(ctx), color: o.color || ctx.sc.sub, x: x, y: y,
        align: o.align || 'left', track: o.track == null ? 0.08 : o.track, rot: o.rot, opacity: o.alpha == null ? 1 : o.alpha, name: o.name });
}
// a text colour animator switched on by an amount expression (0..100)
function db1_txtCol(ctx, L, hex, st, amtEx) { return jzAnimator(L, 'JZ Colour', [['ADBE Text Fill Color', jzHex(hex)]], db1_H(ctx, st) + amtEx); }
// source text driven by an expression
function db1_srcText(ctx, L, st, ex) { try { L.property('ADBE Text Properties').property('ADBE Text Document').expression = db1_H(ctx, st) + ex; } catch (e) { jzWarn('db1 source text: ' + e.toString()); } }

// lyric bbox clamped like the browser's getBB
function db1_bb(ctx, bb) {
    var W = ctx.W, H = ctx.H;
    var b = { x0: Math.max(bb.x0, -W * 0.1), x1: Math.min(bb.x1, W * 1.1), y0: Math.max(bb.y0, -H * 0.1), y1: Math.min(bb.y1, H * 1.1) };
    if (b.x1 <= b.x0) { b.x0 = bb.x0; b.x1 = bb.x1; }
    if (b.y1 <= b.y0) { b.y0 = bb.y0; b.y1 = bb.y1; }
    b.cx = bb.cx != null ? bb.cx : (b.x0 + b.x1) / 2; b.cy = bb.cy != null ? bb.cy : (b.y0 + b.y1) / 2;
    return b;
}
function db1_bw(bb) { return bb.x1 - bb.x0; }
function db1_bh(bb) { return bb.y1 - bb.y0; }
function db1_isVert(bb) { return db1_bh(bb) > db1_bw(bb) * 1.25; }
function db1_hit(x0, y0, x1, y1, bb, pad) { pad = pad || 0; return !(x1 < bb.x0 - pad || x0 > bb.x1 + pad || y1 < bb.y0 - pad || y0 > bb.y1 + pad); }
// a screen corner (inside the margin) that keeps clear of the lyric
function db1_corner(ctx, bb, w, h, P, mk) {
    var W = ctx.W, H = ctx.H, m = db1_mg(ctx) * (mk || 1), sx0 = P.right ? 1 : -1, sy0 = P.low ? 1 : -1;
    var order = [[sx0, sy0], [-sx0, sy0], [sx0, -sy0], [-sx0, -sy0]], best = null, bestA = 1e18, i;
    for (i = 0; i < 4; i++) {
        var sx = order[i][0], sy = order[i][1], X = sx > 0 ? W - m - w : m, Y = sy > 0 ? H - m - h : m;
        if (!db1_hit(X, Y, X + w, Y + h, bb, 8)) return { x: X, y: Y, cx: X + w / 2, cy: Y + h / 2, ok: true, sx: sx, sy: sy };
        var ov = Math.max(0, Math.min(X + w, bb.x1) - Math.max(X, bb.x0)) * Math.max(0, Math.min(Y + h, bb.y1) - Math.max(Y, bb.y0));
        if (ov < bestA) { bestA = ov; best = { x: X, y: Y, cx: X + w / 2, cy: Y + h / 2, ok: false, sx: sx, sy: sy }; }
    }
    return best;
}
// place a w×h box next to the lyric (outside it, inside the safe margin)
function db1_near(ctx, bb, w, h, P, gap) {
    var W = ctx.W, H = ctx.H, m = db1_mg(ctx) * 0.8, sx0 = P.right ? 1 : -1, sy0 = P.low ? 1 : -1, i;
    var order = P.corner ? [[sx0, sy0], [-sx0, sy0], [sx0, -sy0], [-sx0, -sy0]] : [[sx0, sy0], [sx0, -sy0], [-sx0, sy0], [-sx0, -sy0]], tries = [];
    for (i = 0; i < 4; i++) {
        var sx = order[i][0], sy = order[i][1];
        var ax = sx > 0 ? bb.x1 - w : bb.x0, ox = sx > 0 ? bb.x1 + gap : bb.x0 - gap - w;
        var ay = sy > 0 ? bb.y1 + gap : bb.y0 - gap - h, iy = sy > 0 ? bb.y1 - h : bb.y0;
        if ((P.v | 0) % 2) { tries.push([ox, iy, sx, sy]); tries.push([ax, ay, sx, sy]); tries.push([ox, ay, sx, sy]); }
        else { tries.push([ax, ay, sx, sy]); tries.push([ox, iy, sx, sy]); tries.push([ox, ay, sx, sy]); }
    }
    for (i = 0; i < tries.length; i++) {
        var X = jzClamp(tries[i][0], m, Math.max(m, W - m - w)), Y = jzClamp(tries[i][1], m, Math.max(m, H - m - h));
        if (!db1_hit(X, Y, X + w, Y + h, bb, gap * 0.4)) return { x: X, y: Y, cx: X + w / 2, cy: Y + h / 2, ok: true, sx: tries[i][2], sy: tries[i][3] };
    }
    return db1_corner(ctx, bb, w, h, P);
}
function db1_spot(ctx, bb, w, h, P, gap) { return P.corner ? db1_corner(ctx, bb, w, h, P) : db1_near(ctx, bb, w, h, P, gap); }
// free rectangles around the lyric, biggest usable first
function db1_free(ctx, bb, gap) {
    var W = ctx.W, H = ctx.H, m = db1_mg(ctx) * 0.8, i, j;
    var all = [{ x: m, y: m, w: W - 2 * m, h: bb.y0 - gap - m }, { x: m, y: bb.y1 + gap, w: W - 2 * m, h: H - m - bb.y1 - gap },
        { x: m, y: m, w: bb.x0 - gap - m, h: H - 2 * m }, { x: bb.x1 + gap, y: m, w: W - m - bb.x1 - gap, h: H - 2 * m }], out = [];
    for (i = 0; i < all.length; i++) if (all[i].w > 30 && all[i].h > 30) out.push(all[i]);
    for (i = 1; i < out.length; i++) for (j = i; j > 0 && Math.min(out[j].w, out[j].h * 1.5) > Math.min(out[j - 1].w, out[j - 1].h * 1.5); j--) { var tmp = out[j]; out[j] = out[j - 1]; out[j - 1] = tmp; }
    return out;
}
// a character from the lyric: prefer kanji, then kana / latin
function db1_lyricChar(ctx, salt) {
    var c = ctx.cut, s = jzChars(String(c.text || c.lineText || '')), arr = [], kan = [], kana = [], i;
    for (i = 0; i < s.length; i++) if (jzTrim(s[i]) && !jzIsPunct(s[i])) arr.push(s[i]);
    if (!arr.length) return '';
    for (i = 0; i < arr.length; i++) { if (jzIsKanji(arr[i])) kan.push(arr[i]); else if (jzIsKata(arr[i]) || jzIsHira(arr[i]) || jzIsLatin(arr[i])) kana.push(arr[i]); }
    var p = kan.length ? kan : (kana.length ? kana : arr);
    return p[db1_h(c.seed, salt | 0, 5) % p.length];
}
// register an entry; all its layers are main-pass only in the browser -> keep them out of the ghosts
function db1_reg(k, back, fn) {
    jzReg('decor', k, { back: !!back, build: function (ctx, bb, d) {
        var n0 = ctx.comp.numLayers, i;
        fn(ctx, db1_bb(ctx, bb), d);
        var added = ctx.comp.numLayers - n0;
        for (i = 1; i <= added; i++) jzNoGhost(ctx.comp.layer(i));
    } });
}

// ================================================================ Japanese motifs

/* ---- kamon — 家紋: a family crest drawn on inside a double ring, its name set small beneath */
var DB1_KAMON = ['丸に三つ巴', '丸に七宝', '丸に梅鉢', '丸に輪違い', '丸に三つ輪'];
function db1_kamonPaths(kind) {
    var out = [], k, i;
    if (kind === 0) {
        for (k = 0; k < 3; k++) {
            var th0 = (-90 + k * 120) * DB1_D, sw = 150 * DB1_D, h0 = 0.27, M = 30, outer = [], inner = [], cap = [];
            for (i = 0; i <= M; i++) {
                var t = i / M, th = th0 + t * sw, rc = 0.38 + 0.46 * t, w = h0 * Math.pow(1 - t, 0.85);
                outer.push([Math.cos(th) * (rc + w), Math.sin(th) * (rc + w)]);
                inner.push([Math.cos(th) * (rc - w), Math.sin(th) * (rc - w)]);
            }
            var hc = [Math.cos(th0) * 0.38, Math.sin(th0) * 0.38], rh = [Math.cos(th0), Math.sin(th0)], tn = [-Math.sin(th0), Math.cos(th0)];
            for (i = 1; i < 16; i++) { var f = i / 16 * Math.PI; cap.push([hc[0] + h0 * (-rh[0] * Math.cos(f) - tn[0] * Math.sin(f)), hc[1] + h0 * (-rh[1] * Math.cos(f) - tn[1] * Math.sin(f))]); }
            inner.reverse();
            out.push(outer.concat(inner, cap, [outer[0]]));
        }
    } else if (kind === 1) {
        for (k = 0; k < 4; k++) { var a1 = k * 90; out.push(db1_arc(Math.cos(a1 * DB1_D) * 0.5, Math.sin(a1 * DB1_D) * 0.5, 0.5, a1 + 180, a1 + 540, 40)); }
        out.push(db1_arc(0, 0, 0.13, -90, 270, 20));
    } else if (kind === 2) {
        for (k = 0; k < 5; k++) { var a2 = -90 + k * 72; out.push(db1_arc(Math.cos(a2 * DB1_D) * 0.6, Math.sin(a2 * DB1_D) * 0.6, 0.3, a2 + 180, a2 + 540, 32)); }
        out.push(db1_arc(0, 0, 0.17, -90, 270, 20));
    } else if (kind === 3) {
        out.push(db1_arc(-0.3, 0, 0.55, 0, 360, 48)); out.push(db1_arc(0.3, 0, 0.55, 180, 540, 48));
    } else {
        for (k = 0; k < 3; k++) { var a3 = -90 + k * 120; out.push(db1_arc(Math.cos(a3 * DB1_D) * 0.4, Math.sin(a3 * DB1_D) * 0.4, 0.46, a3 + 180, a3 + 540, 40)); }
    }
    return out;
}
db1_reg('kamon', false, function (ctx, bb, d) {
    var sc = ctx.sc, u = db1_u(ctx), ST = db1_settle(ctx), i;
    var R = jzClamp(jzU(ctx) * 0.075, 48 * u, 96 * u), fs = db1_fs(ctx) * 0.85;
    var sp = db1_spot(ctx, bb, R * 2.3, R * 2.3 + fs * 2.2, d, 24 * u);
    var cx = sp.cx, cy = sp.y + R * 1.15, a = sp.ok ? 1 : 0.35, kind = (d.v | 0) % 5, lw = Math.max(1, 1.5 * u);
    var S = jzShapeLayer(ctx, 'kamon', cx, cy);
    var gd = jzGrp(S, 'centre'); jzAddEllipse(gd, 4.4 * u, 4.4 * u); jzAddFill(gd, db1_acc(sc));
    db1_gop(ctx, gd, ST, 'oe((t-0.5)/0.3)');
    // motif: settles from -70° (the tomoe / mitsuwa keep turning slowly)
    var gm = jzGrp(S, 'motif'), paths = db1_kamonPaths(kind), s = R * 0.8, col = d.accent ? db1_acc(sc) : sc.fg;
    var spin = (kind === 0 || kind === 4) ? '+t*' + (d.right ? 8 : -8) : '';
    db1_gx(ctx, gm, 'ADBE Vector Rotation', ST, '(1-oe(t/0.9))*-70' + spin + '+' + jzN(kind === 0 ? (d.r || 0) * 120 : 0));
    for (i = paths.length - 1; i >= 0; i--) {
        var gp = db1_sub(gm, 'part ' + i);
        jzAddPath(gp, db1_xf(paths[i], 0, 0, 0, s), false);
        db1_trim(ctx, gp, ST, '100*ioc((t-' + jzN(0.12 + i * 0.07) + ')/0.55)');
        db1_st(gp, col, lw * 1.1, null, 2, 2);
    }
    var g2 = jzGrp(S, 'inner ring'); db1_arcTrim(ctx, g2, R * 0.9, 0, 0, 90, ST, '360*ioc(t/0.6)'); db1_st(g2, sc.fg, Math.max(1, 0.8 * u), 55);
    var g1 = jzGrp(S, 'ring'); db1_arcTrim(ctx, g1, R, 0, 0, -90, ST, '360*ioc(t/0.6)'); db1_st(g1, sc.fg, lw);
    jzXf(S, 'ADBE Opacity').setValue(a * 100); db1_op(ctx, S, ST);
    var T = db1_label(ctx, DB1_KAMON[kind], cx, cy + R + fs * 1.35, { font: jzSerifF(ctx), size: fs, align: 'center', track: 0.32, alpha: a });
    db1_op(ctx, T, ST, 'oc((t-0.45)/0.4)');
});

/* ---- seigaiha — 青海波: overlapping concentric-arc waves spreading from a screen corner, behind the lyric (Repeater grid) */
db1_reg('seigaiha', true, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db1_u(ctx), k;
    var r = jzClamp(jzU(ctx) * 0.05, 34 * u, 60 * u), sx = d.right ? 1 : -1, sy = d.low ? 1 : -1, ox = sx > 0 ? W : 0, oy = sy > 0 ? H : 0;
    var pw = W * jzLerp(0.42, 0.62, db1_r(d.seed, 1)), ph = H * jzLerp(0.45, 0.65, db1_r(d.seed, 2));
    var NR = 4, gam = [];
    for (k = 0; k < NR; k++) { var rho = r * (1 - k / NR), ca = (rho * rho + 1.25 * r * r - r * r) / (2 * rho * 1.118 * r); gam.push(Math.max(0, Math.acos(jzClamp(ca, -1, 1)) - 26.565 * DB1_D) / DB1_D); }
    var rows = Math.ceil(ph / (r / 2)) + 2, cols = Math.ceil(pw / (2 * r)) + 2;
    var y0 = sy > 0 ? H - ph : -r, x0 = sx > 0 ? W - pw - 2 * r : -2 * r;
    var col = d.accent ? db1_acc(sc) : sc.sub, base = (d.accent ? 0.5 : 0.46) * (db1_dark(sc) ? 1 : 0.8), lw = Math.max(1, 1.3 * u);
    var S = jzShapeLayer(ctx, 'seigaiha', 0, 0), gP = jzGrp(S, 'pattern');
    db1_gx(ctx, gP, 'ADBE Vector Position', 0, '[value[0]-(' + sx + ')*((t*' + jzN(7 * u) + ')%' + jzN(2 * r) + '),value[1]]');
    var gU = db1_sub(gP, 'scale pair');
    for (k = 0; k < NR; k++) {
        var rk = r * (1 - k / NR);
        jzAddPath(gU, db1_arc(x0, y0, rk, 180 + gam[k], 360 - gam[k], 16), false);
        jzAddPath(gU, db1_arc(x0 + r, y0 + r / 2, rk, 180 + gam[k], 360 - gam[k], 16), false);
    }
    db1_st(gU, col, lw, base * 100);
    db1_rep(gP, cols + 1, 2 * r, 0);
    db1_rep(gP, Math.ceil(rows / 2) + 1, 0, r);
    // soft elliptical falloff from the corner, growing out over ~1 s
    var m = db1_mask(S, db1_ellShape(ox, oy, pw * 1.02, ph * 1.02), null, Math.min(pw, ph) * 0.6);
    jzSetExpr(m.property('ADBE Mask Offset'), db1_H(ctx, 0) + '-(1-oc(t/0.8))*' + jzN(Math.max(pw, ph) * 1.3));
    db1_op(ctx, S, 0);
});

/* ---- asanoha — 麻の葉: the hemp-leaf lattice seen through a round (or square) window that irises open behind the lyric */
db1_reg('asanoha', true, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db1_u(ctx), M = jzU(ctx);
    var R0 = M * jzLerp(0.27, 0.36, db1_r(d.seed, 1)), portrait = H > W * 1.1;
    var cx = portrait ? W * (0.5 + (d.right ? 0.14 : -0.14)) : W * (0.5 + (d.right ? 0.22 : -0.22)) + db1_rs(d.seed, 2) * W * 0.04;
    var cy = portrait ? H * (d.low ? 0.66 : 0.34) : H * (0.5 + (d.low ? 0.07 : -0.07));
    var sq = !!d.corner, s = R0 / 3.2, h3 = s * Math.sqrt(3) / 2, col = d.accent ? db1_acc(sc) : sc.sub, al = db1_dark(sc) ? 0.3 : 0.34, lw = Math.max(1, 1.1 * u);
    var Rx = '(' + jzN(R0) + '*oc(t/0.8)*(1+0.06*ic(PO)))';
    var S = jzShapeLayer(ctx, 'asanoha', cx, cy), gL = jzGrp(S, 'lattice');
    db1_gx(ctx, gL, 'ADBE Vector Rotation', 0, jzN((d.r || 0) * 60) + '+t*2.5');
    var gC = db1_sub(gL, 'cell'), gS = db1_sub(gC, 'star'), gG = db1_sub(gC, 'grid');
    var A = [0, 0], B = [s, 0], C = [s / 2, h3], D = [s * 1.5, h3], tris = [[A, B, C], [B, D, C]], i, j;
    jzAddPath(gG, [A, B], false); jzAddPath(gG, [A, C], false); jzAddPath(gG, [B, C], false);
    db1_st(gG, col, lw, al * 80);
    for (i = 0; i < 2; i++) {
        var tr = tris[i], g = [(tr[0][0] + tr[1][0] + tr[2][0]) / 3, (tr[0][1] + tr[1][1] + tr[2][1]) / 3];
        for (j = 0; j < 3; j++) jzAddPath(gS, [g, tr[j]], false);
    }
    db1_trim(ctx, gS, 0, '100*oc((t-0.15)/0.8)');
    db1_st(gS, col, lw, al * 100);
    var n = sq ? 7 : 6;
    db1_rep(gL, 2 * n + 1, s, 0, 0, -n);
    db1_rep(gL, 2 * n + 1, s / 2, h3, 0, -n);
    var mR = R0 * 1.06, m = db1_mask(S, sq ? db1_rectShape(-mR, -mR, mR, mR) : jzCircleShape(0, 0, mR));
    jzSetExpr(m.property('ADBE Mask Offset'), db1_H(ctx, 0) + Rx + '-' + jzN(mR));
    db1_op(ctx, S, 0);
    // window rim (+ an outer arc on the round window)
    var F = jzShapeLayer(ctx, 'asanoha rim', cx, cy), gr = jzGrp(F, 'rim');
    if (sq) {
        var rc = jzAddRect(gr, R0 * 2, R0 * 2, 6 * u);
        jzSetExpr(rc.property('ADBE Vector Rect Size'), db1_H(ctx, 0) + 'var R=' + Rx + ';[2*R,2*R]');
        db1_trim(ctx, gr, 0, '100*ioc(t/0.9)');
    } else {
        var el = jzAddEllipse(gr, R0 * 2, R0 * 2);
        jzSetExpr(el.property('ADBE Vector Ellipse Size'), db1_H(ctx, 0) + 'var R=' + Rx + ';[2*R,2*R]');
        db1_trim(ctx, gr, 0, '100*ioc(t/0.9)');
        var go = jzGrp(F, 'outer arc'), e2 = jzAddEllipse(go, R0 * 2, R0 * 2);
        jzSetExpr(e2.property('ADBE Vector Ellipse Size'), db1_H(ctx, 0) + 'var R=' + Rx + '+' + jzN(7 * u) + ';[2*R,2*R]');
        var t2 = db1_trim(ctx, go, 0, '300*ioc(t/0.9)/3.6'); t2.property('ADBE Vector Trim Offset').setValue(180);
        db1_st(go, col, Math.max(1, 0.8 * u), al * 90);
    }
    db1_st(gr, col, lw * 1.3, Math.min(100, al * 160));
    db1_op(ctx, F, 0);
});

/* ---- hanabi — 花火: firework shells bursting in the free space around the lyric (chrysanthemum / peony / willow).
   Each shell is one shape layer that re-launches every 2.2 s at a new pre-computed spot; rays are Repeaters with Trim Paths. */
db1_reg('hanabi', false, function (ctx, bb, d) {
    var sc = ctx.sc, u = db1_u(ctx), ST = db1_settle(ctx), c = ctx.cut;
    var fr = db1_free(ctx, bb, 26 * u); if (!fr.length) return;
    var nB = 2 + ((d.n | 0) % 2), TT = 2.2, style = (d.v | 0) % 3, cols = [db1_acc(sc), db1_acc2(sc), sc.fg];
    var colEx = 'var CC=[' + db1_cx(cols[0]) + ',' + db1_cx(cols[1]) + ',' + db1_cx(cols[2]) + '];';
    var life = style === 2 ? 1.75 : 1.4, gk = style === 2 ? 0.75 * 0.55 : 0.28, pad = 8 * u, soft = 30 * u, k, cy;
    var ncyc = Math.ceil((c.dur + 1) / TT) + 1;
    var rings = [[style === 1 ? 32 : 28, 1, 0, 1.4 * u], [style === 2 ? 0 : 16, 0.52, 1, 1.2 * u]];
    // head position along a ray (fraction of R*rk) and the trail length (s)
    var fEx = style === 2 ? 'function F(x){return x<=0?0:1-Math.exp(-2.6*x);}' : 'function F(x){return oc(x/0.85);}';
    var trail = style === 2 ? 0.6 : (style === 1 ? 0.05 : 0.2), hr = style === 1 ? 2.6 * u : (style === 2 ? 1.6 * u : 2 * u);
    for (k = 0; k < nB; k++) {
        var Q = [];
        for (cy = 0; cy < ncyc; cy++) {
            var reg = fr[(k + cy) % Math.min(2, fr.length)];
            var R = jzClamp(Math.min(reg.w * 0.5, reg.h) * 0.5, 44 * u, 190 * u) * (0.75 + 0.3 * db1_r(d.seed, k, cy, 3));
            var x = reg.x + R * 0.9 + Math.max(0, reg.w - R * 1.8) * db1_r(d.seed, k, cy, 1), y = reg.y + R * 0.8 + Math.max(0, reg.h - R * 1.7) * db1_r(d.seed, k, cy, 2);
            Q.push('[' + jzN(x) + ',' + jzN(y) + ',' + jzN(R) + ',' + ((k + cy) % 3) + ',' + ((k + cy + 1) % 3) + ']');
        }
        var HD = colEx + fEx + 'var A=t-' + jzN(0.02 + k * 0.6) + ',cy=Math.max(0,Math.floor(A/' + TT + ')),tau=A-cy*' + TT + ',QQ=[' + Q.join(',') + '],q=QQ[Math.min(cy,QQ.length-1)],X=q[0],Y=q[1],R=q[2],tb=tau-0.3,LF=' + life +
            ',fade=1-cl((tb-LF*0.4)/(LF*0.6)),on=(A>=0&&tb>=0&&tb<=LF)?1:0,DY=R*' + jzN(gk) + '*tb*tb;\n';
        var S = jzShapeLayer(ctx, 'hanabi ' + (k + 1), 0, 0), ri;
        for (ri = 0; ri < 2; ri++) {
            var M = rings[ri][0], rk = rings[ri][1], ci = rings[ri][2], lwr = rings[ri][3];
            if (!M) continue;
            var gR = jzGrp(S, 'burst ' + (ri + 1));
            db1_gx(ctx, gR, 'ADBE Vector Position', ST, HD + '[X,Y+DY]');
            db1_gop(ctx, gR, ST, 'on*fade', HD);
            // heads
            var gH = db1_sub(gR, 'heads'), gh = db1_sub(gH, 'head'), step = 360 / M;
            var e1 = jzAddEllipse(gh, hr * 2, hr * 2), e2 = jzAddEllipse(gh, hr * 2, hr * 2);
            jzSetExpr(e1.property('ADBE Vector Ellipse Position'), db1_H(ctx, ST) + HD + 'var r=R*' + rk + '*F(tb);[r,0]');
            jzSetExpr(e2.property('ADBE Vector Ellipse Position'), db1_H(ctx, ST) + HD + 'var r=R*' + jzN(rk * 0.9) + '*F(tb);[r*' + jzN(Math.cos(step * DB1_D)) + ',r*' + jzN(Math.sin(step * DB1_D)) + ']');
            db1_rep(gH, M / 2, 0, 0, step * 2);
            var fl = jzAddFill(gH, cols[ci]);
            jzSetExpr(fl.property('ADBE Vector Fill Color'), db1_H(ctx, ST) + HD + 'CC[q[' + (3 + ci) + ']]');
            // rays (unit length 100, scaled to R) with a moving trim window = the trails
            var gT = db1_sub(gR, 'trails'), gs = db1_sub(gT, 'rays'), gr = db1_sub(gs, 'ray');
            jzAddPath(gr, [[0, 0], [100, 0]], false);
            jzAddPath(gr, [[0, 0], [90 * Math.cos(step * DB1_D), 90 * Math.sin(step * DB1_D)]], false);
            db1_rep(gs, M / 2, 0, 0, step * 2);
            db1_gx(ctx, gs, 'ADBE Vector Scale', ST, HD + '[R*' + rk + ',R*' + rk + ']');
            db1_trim(ctx, gT, ST, '100*F(tb)', '100*F(tb-' + trail + ')', null, HD);
            var sk = db1_st(gT, cols[ci], lwr, style === 1 ? 35 : 80, 2);
            jzSetExpr(sk.property('ADBE Vector Stroke Color'), db1_H(ctx, ST) + HD + 'CC[q[' + (3 + ci) + ']]');
        }
        // burst flash
        var gF = jzGrp(S, 'flash'), ef = jzAddEllipse(gF, 10, 10);
        jzSetExpr(ef.property('ADBE Vector Ellipse Size'), db1_H(ctx, ST) + HD + 'var r=R*0.16*(1-cl(tb/0.16))+' + jzN(2 * u) + ';[2*r,2*r]');
        jzSetExpr(ef.property('ADBE Vector Ellipse Position'), db1_H(ctx, ST) + HD + '[X,Y]');
        jzAddFill(gF, sc.fg, 60);
        db1_gop(ctx, gF, ST, '(A>=0&&tb>=0&&tb<0.16)?1:0', HD);
        // rising shell with a short tail
        var gU = jzGrp(S, 'shell');
        db1_gx(ctx, gU, 'ADBE Vector Position', ST, HD + 'var qq=oc(tau/0.3);[X,Y+R*1.1*(1-qq)]');
        db1_gop(ctx, gU, ST, '(A>=0&&tau<0.3)?1:0', HD);
        var gUd = db1_sub(gU, 'dot'); jzAddEllipse(gUd, 4.4 * u, 4.4 * u); var fd = jzAddFill(gUd, cols[0]);
        jzSetExpr(fd.property('ADBE Vector Fill Color'), db1_H(ctx, ST) + HD + 'CC[q[3]]');
        var gUt = db1_sub(gU, 'tail'); jzAddPath(gUt, [[0, 0], [0, 34 * u]], false);
        db1_trim(ctx, gUt, ST, '100*(1-0.7*oc(tau/0.3))', null, null, HD);
        var su = db1_st(gUt, cols[0], 1.4 * u, 70, 2);
        jzSetExpr(su.property('ADBE Vector Stroke Color'), db1_H(ctx, ST) + HD + 'CC[q[3]]');
        // keep clear of the lyric (the browser's clearOf): feathered subtract mask
        db1_mask(S, db1_rectShape(bb.x0 - pad - soft / 2, bb.y0 - pad - soft / 2, bb.x1 + pad + soft / 2, bb.y1 + pad + soft / 2), MaskMode.SUBTRACT, soft);
        db1_op(ctx, S, ST);
        // falling sparks leave drooping trails (gravity) - the browser draws them from earlier positions
        if (style !== 1) { var ec = jzEffect(S, 'ADBE Echo', 'JZ Trails'); jzEP(ec, 1, -0.04); jzEP(ec, 2, 5); jzEP(ec, 3, 0.8); jzEP(ec, 4, 0.72); jzEP(ec, 5, 5); }
    }
});

/* ---- chochin — 提灯: paper lanterns dropping in on strings from the top edge, swinging, each bearing a character of the lyric */
db1_reg('chochin', false, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db1_u(ctx), m = db1_mg(ctx), ST = db1_settle(ctx), i, j;
    var lw0 = jzClamp(jzU(ctx) * 0.066, 42 * u, 86 * u), lh = lw0 * 1.32, gap = 24 * u;
    var K = Math.max(5, Math.floor((W - 2 * m) / (lw0 * 1.9))), cands = [];
    for (i = 0; i < K; i++) {
        var x = m + lw0 * 0.7 + (W - 2 * m - lw0 * 1.4) * i / Math.max(1, K - 1);
        var over = x + lw0 * 0.75 > bb.x0 - gap && x - lw0 * 0.75 < bb.x1 + gap, floor = over ? bb.y0 - gap : H * 0.62, room = floor - lh * 1.3 - 10 * u;
        if (room >= 16 * u) cands.push({ x: x, room: room, i: i });
    }
    var want = Math.min(K, 3 + (d.n | 0) % 3), pick = [];
    for (j = 0; j < want; j++) {
        var ideal = Math.round((j + 0.5) * K / want - 0.5 + db1_rs(d.seed, j, 4) * 0.4), best = null, bd = 1e9, q;
        for (i = 0; i < cands.length; i++) {
            var cc = cands[i], ok = true;
            for (q = 0; q < pick.length; q++) if (Math.abs(pick[q].x - cc.x) <= lw0 * 1.6) ok = false;
            if (ok && Math.abs(cc.i - ideal) < bd) { bd = Math.abs(cc.i - ideal); best = cc; }
        }
        if (best && Math.abs(best.i - ideal) <= Math.max(1, K / want / 2)) pick.push(best);
    }
    for (i = 1; i < pick.length; i++) for (j = i; j > 0 && pick[j].x < pick[j - 1].x; j--) { var tp = pick[j]; pick[j] = pick[j - 1]; pick[j - 1] = tp; }
    var body = db1_acc(sc), rib = jzMixHex(body, sc.bg, 0.45), cap = db1_dark(sc) ? sc.fg : (sc.ink || sc.fg), txtC = jzLum(body) > 0.55 ? '#000000' : sc.bg;
    var shape = [], rl = [], ts = [];
    for (i = 0; i <= 32; i++) {
        var th = i / 32 * Math.PI * 2, cs = Math.cos(th), sn = Math.sin(th);
        shape.push([(cs < 0 ? -1 : 1) * Math.pow(Math.abs(cs), 0.8) * lw0 / 2, (sn < 0 ? -1 : 1) * Math.pow(Math.abs(sn), 0.9) * lh * 0.42 + lh / 2]);
    }
    for (i = 1; i < 8; i++) {
        var yy = -lh * 0.42 + lh * 0.84 * i / 8, sy = Math.pow(Math.abs(yy) / (lh * 0.42), 1 / 0.9), f = Math.pow(Math.sqrt(Math.max(0, 1 - sy * sy)), 0.8) * lw0 / 2 - 1.5 * u;
        if (f > 2 * u) rl.push([[-f, lh / 2 + yy], [f, lh / 2 + yy]]);
    }
    for (i = -2; i <= 2; i++) ts.push([[i * 2.4 * u, lh], [i * 3.2 * u, lh + lh * 0.24]]);
    var font = jzSerifF(ctx) === 'mincho_light' ? 'mincho_bold' : jzSerifF(ctx);
    for (j = 0; j < pick.length; j++) {
        var p = pick[j], Lf = Math.min(p.room, p.room * (0.25 + 0.6 * db1_r(d.seed, p.i, 2)) + 20 * u);
        var sg = db1_r(d.seed, j, 3) < 0.5 ? 1 : -1;
        var LX = 'var qd=cl((t-' + jzN(0.03 + j * 0.08) + ')/0.6),LL=' + jzN(-lh * 1.6) + '+(' + jzN(Lf + lh * 1.6) + ')*(qd<=0?0:ob(qd,1.4));';
        var S = jzShapeLayer(ctx, 'chochin ' + (j + 1), p.x, 0);
        jzSetExpr(jzXf(S, 'ADBE Rotate Z'), db1_H(ctx, ST) + '(2.5+8*Math.exp(-Math.max(0,t)*1.5))*' + sg + '*Math.sin(t*' + jzN(1.7 + j * 0.23) + '+' + jzN(j * 1.3) + ')');
        var gB = jzGrp(S, 'lantern');
        db1_gx(ctx, gB, 'ADBE Vector Position', ST, LX + '[0,LL]');
        var gt = db1_sub(gB, 'tassel'); for (i = 0; i < ts.length; i++) jzAddPath(gt, ts[i], false); db1_st(gt, body, Math.max(1, u), 85);
        var gc = db1_sub(gB, 'caps'); jzAddRect(gc, lw0 * 0.54, lh * 0.1, 0, 0, lh * 0.05); jzAddRect(gc, lw0 * 0.54, lh * 0.1, 0, 0, lh * 0.95); jzAddFill(gc, cap);
        var gr = db1_sub(gB, 'ribs'); for (i = 0; i < rl.length; i++) jzAddPath(gr, rl[i], false); db1_st(gr, rib, Math.max(1, 1.1 * u), 70);
        var gb = db1_sub(gB, 'body'); jzAddPath(gb, shape, true); jzAddFill(gb, body, 94);
        if (db1_dark(sc)) { var gg = db1_sub(gB, 'glow'); jzAddEllipse(gg, lw0 * 1.56, lw0 * 1.56, 0, lh / 2); jzAddFill(gg, body, 8); var gg2 = db1_sub(gB, 'glow 2'); jzAddEllipse(gg2, lw0 * 2.1, lw0 * 2.1, 0, lh / 2); jzAddFill(gg2, body, 6); }
        var gS = jzGrp(S, 'string'), rs = jzAddRect(gS, Math.max(1, u), 10);
        jzSetExpr(rs.property('ADBE Vector Rect Size'), db1_H(ctx, ST) + LX + '[' + jzN(Math.max(1, u)) + ',Math.max(0,LL)]');
        jzSetExpr(rs.property('ADBE Vector Rect Position'), db1_H(ctx, ST) + LX + '[0,Math.max(0,LL)/2]');
        jzAddFill(gS, sc.sub, 80);
        db1_op(ctx, S, ST);
        var ch = db1_lyricChar(ctx, p.i * 7 + 1);
        if (ch) {
            var T = jzText(ctx, ch, { font: font, size: lw0 * 0.5, color: txtC, x: p.x, y: Lf + lh / 2 });
            T.parent = S;
            jzXf(T, 'ADBE Position').setValue([0, Lf + lh / 2 + lw0 * 0.02]);
            jzSetExpr(jzXf(T, 'ADBE Position'), db1_H(ctx, ST) + LX + '[value[0],LL+' + jzN(lh / 2 + lw0 * 0.02) + ']');
            db1_op(ctx, T, ST, 'cl((cl((t-' + jzN(0.03 + j * 0.08) + ')/0.6)-0.35)/0.4)');
        }
    }
});

/* ---- shimenawa — 注連縄: a twisted sacred rope sagging across the free band, with zigzag shide papers and straw tassels */
db1_reg('shimenawa', false, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db1_u(ctx), m = db1_mg(ctx), ST = db1_settle(ctx), i, s;
    var gap = 30 * u, need0 = 210 * u, topRoom = bb.y0 - gap - m * 0.3, botRoom = H - m * 0.4 - bb.y1 - gap;
    var top = d.low ? !(botRoom >= need0 * 0.7 || botRoom > topRoom) : (topRoom >= need0 * 0.7 || topRoom >= botRoom);
    var room = top ? topRoom : botRoom; if (room < 60 * u) return;
    var k = jzClamp(room / need0, 0.4, 1.15), T0 = 17 * u * k, sag = 46 * u * k, shL = 112 * u * k, shW = shL * 0.17;
    var ya = top ? m * 0.3 + T0 * 0.6 : bb.y1 + gap + T0 * 0.6;
    function Y(x) { return ya + sag * 4 * (x / W) * (1 - x / W); }
    function TK(x) { return T0 * (0.45 + 0.55 * Math.sin(Math.PI * jzClamp(x / W, 0, 1))); }
    var col = db1_dark(sc) ? sc.fg : (sc.ink || sc.fg), lw = Math.max(1, 1.1 * u), step = T0 * 1.05, x;
    // rope: slanted twisted bundles (drifting by one bundle step), revealed from the centre by a mask
    var S = jzShapeLayer(ctx, 'shimenawa rope', 0, 0), gE = jzGrp(S, 'edges'), gT = jzGrp(S, 'twist');
    for (x = -2 * step; x < W + step; x += step) {
        var x0 = x, x1 = x + step * 0.82, sl = TK(x) * 0.7;
        jzAddPath(gT, [[x0, Y(x0) - TK(x0) / 2], [x1, Y(x1) - TK(x1) / 2], [x1 + sl, Y(x1) + TK(x1) / 2], [x0 + sl, Y(x0) + TK(x0) / 2]], true);
    }
    jzAddFill(gT, col, 82);
    db1_gx(ctx, gT, 'ADBE Vector Position', ST, '[value[0]+(Math.max(0,t)*' + jzN(5 * u) + ')%' + jzN(step) + ',value[1]]');
    var tp = [], bt = [];
    for (x = -12; x <= W + 12.1; x += 8 * u) { tp.push([x, Y(x) - TK(x) / 2 - 1.5 * u]); bt.push([x, Y(x) + TK(x) / 2 + 1.5 * u]); }
    jzAddPath(gE, tp, false); jzAddPath(gE, bt, false); db1_st(gE, col, lw, 45);
    var mk = db1_mask(S, db1_rectShape(-12, -2 * H, W + 12, 3 * H));
    jzSetExpr(mk.property('ADBE Mask Offset'), db1_H(ctx, ST) + '-(1-ioc(t/0.8))*' + jzN(W / 2 + 12));
    db1_op(ctx, S, ST);
    // shide papers + tassels
    var ns = 3 + ((d.n | 0) % 2 ? 1 : 0), paperC = db1_dark(sc) ? sc.fg : sc.bg, P2 = jzShapeLayer(ctx, 'shimenawa shide', 0, 0);
    for (i = 0; i < ns - 1; i++) {
        var tx = W * (i + 1.5) / (ns + 1), ty = Y(tx) + TK(tx) / 2, tl = shL * 0.36, gq = jzGrp(P2, 'tassel ' + (i + 1));
        for (s = -4; s <= 4; s++) jzAddPath(gq, [[s * 1.4 * u, 0], [s * 2 * u, tl * (1 - Math.abs(s) * 0.05)]], false);
        db1_st(gq, sc.sub, Math.max(1, u), 85);
        jzGX(gq).property('ADBE Vector Position').setValue([tx, ty]);
        db1_gx(ctx, gq, 'ADBE Vector Scale', ST, 'var f=oc((t-0.4)/0.4);[100,100*f]');
        db1_gx(ctx, gq, 'ADBE Vector Rotation', ST, 'Math.sin(t*1.2+' + i + ')*1.5');
    }
    for (i = 0; i < ns; i++) {
        var px = W * (i + 1) / (ns + 1), ex = Math.abs(px - W / 2) / (W / 2 + 12), py = Y(px) + TK(px) / 2, h = shL / 4, gp = jzGrp(P2, 'shide ' + (i + 1));
        for (s = 0; s < 4; s++) {
            var dx = (s % 2 ? shW * 0.62 : 0) - shW / 2, sk = (s % 2 ? -1 : 1) * shW * 0.18;
            jzAddPath(gp, [[dx, s * h], [dx + shW, s * h + sk * 0.3], [dx + shW + sk, (s + 1) * h + 0.5], [dx + sk, (s + 1) * h + 0.5 - sk * 0.3]], true);
        }
        if (!db1_dark(sc)) db1_st(gp, sc.fg, Math.max(1, u), 85);
        jzAddFill(gp, paperC, 94);
        jzGX(gp).property('ADBE Vector Position').setValue([px, py]);
        db1_gx(ctx, gp, 'ADBE Vector Scale', ST, 'var q=ioc(t/0.8)<' + jzN(ex) + '?0:cl((t-' + jzN(0.2 + ex * 0.5) + ')/0.45);var s=q<=0?0:ob(q,1.6);[100,100*s]');
        db1_gx(ctx, gp, 'ADBE Vector Rotation', ST, 'Math.sin(t*1.4+' + jzN(i * 1.7) + ')*3');
    }
    db1_op(ctx, P2, ST);
});

/* ---- sensu — 扇: a folding fan that opens with pleated ribs (plain, with a red sun, or painted wave bands) and folds shut on exit */
db1_reg('sensu', false, function (ctx, bb, d) {
    var sc = ctx.sc, u = db1_u(ctx), ST = db1_settle(ctx), i;
    var R = jzClamp(jzU(ctx) * 0.105, 62 * u, 124 * u), r0 = R * 0.36;
    var sp = db1_spot(ctx, bb, R * 2.05, R * 1.2, d, 22 * u), a = sp.ok ? 1 : 0.35;
    var tilt = (d.right ? 1 : -1) * (5 + (d.r || 0) * 9), px = sp.cx, py = sp.y + R * 1.12, N = 14, v = (d.v | 0) % 3, ac = db1_acc(sc);
    var OP = 'var op=ob(cl((t-0.05)/0.65),1.1)*(1-0.9*ic(PO)),SP=12+140*op;';
    function angEx(i) { return OP + jzN(-90 + tilt) + '-SP/2+SP*' + jzN(i / N); }
    function sweep(g) { return db1_trim(ctx, g, ST, 'SP/3.6', null, jzN(tilt) + '-SP/2', OP); }
    var S = jzShapeLayer(ctx, 'sensu', px, py);
    var gv = jzGrp(S, 'pivot'); jzAddEllipse(gv, 3.2 * u, 3.2 * u); jzAddFill(gv, ac);
    var gv2 = jzGrp(S, 'pivot ring'); jzAddEllipse(gv2, 8 * u, 8 * u); db1_st(gv2, sc.fg, Math.max(1, u));
    for (i = 0; i <= N; i += N) { var ge = jzGrp(S, 'guard ' + i); jzAddPath(ge, [[0, 0], [R, 0]], false); db1_st(ge, sc.fg, Math.max(1, 1.6 * u)); db1_gx(ctx, ge, 'ADBE Vector Rotation', ST, angEx(i)); }
    var go = jzGrp(S, 'outer edge'); jzAddEllipse(go, R * 2, R * 2); sweep(go); db1_st(go, sc.fg, Math.max(1, 1.3 * u), 95, 1, 2);
    var gi = jzGrp(S, 'inner edge'); jzAddEllipse(gi, r0 * 2, r0 * 2); sweep(gi); db1_st(gi, sc.fg, Math.max(1, 1.1 * u), 80);
    for (i = 1; i < N; i++) {
        var gk = jzGrp(S, 'rib ' + i), g1 = db1_sub(gk, 'rib'), g2 = db1_sub(gk, 'fold');
        jzAddPath(g1, [[R * 0.06, 0], [r0, 0]], false); db1_st(g1, sc.fg, Math.max(1, 1.1 * u), 80);
        jzAddPath(g2, [[r0, 0], [R * (i % 2 ? 0.965 : 1), 0]], false); db1_st(g2, sc.fg, Math.max(1, 0.8 * u), 45);
        db1_gx(ctx, gk, 'ADBE Vector Rotation', ST, angEx(i));
    }
    if (v === 1) {
        var an = (-90 + tilt) * DB1_D, rc = (r0 + R) / 2, gh = jzGrp(S, 'hinomaru'), eh = jzAddEllipse(gh, 10, 10, Math.cos(an) * rc, Math.sin(an) * rc);
        jzSetExpr(eh.property('ADBE Vector Ellipse Size'), db1_H(ctx, ST) + OP + 'var r=' + jzN((R - r0) * 0.28) + '*cl((op-0.6)/0.4);[2*r,2*r]');
        jzAddFill(gh, ac, 90);
    } else if (v === 2) {
        var fb = [0.55, 0.72];
        for (i = 0; i < 2; i++) {
            var gw = jzGrp(S, 'wave band ' + (i + 1)), rr = jzLerp(r0, R, fb[i]);
            jzAddEllipse(gw, rr * 2, rr * 2);
            sweep(gw); db1_st(gw, ac, 1.6 * u, 80);
        }
    }
    var gl = jzGrp(S, 'leaf'); jzAddEllipse(gl, R + r0, R + r0); sweep(gl); db1_st(gl, ac, R - r0, 13, 1);
    jzXf(S, 'ADBE Opacity').setValue(a * 100); db1_op(ctx, S, ST);
});

/* ---- tsukiKumo — 月に雲: a moon (full or crescent) with a haloed ring, crossed by a curling Japanese cloud that drifts past */
function db1_kumo(x0, yb, L, hc) {
    var bumps = [[0.22, 0.5], [0.48, 0.78], [0.74, 0.55], [0.9, 0.32]], top = [], curl = [], i, k;
    for (i = 0; i <= 44; i++) {
        var x = x0 + L * i / 44, y = yb;
        for (k = 0; k < bumps.length; k++) { var dx = x - (x0 + L * bumps[k][0]), R = bumps[k][1] * hc; if (Math.abs(dx) < R) y = Math.min(y, yb - Math.sqrt(R * R - dx * dx)); }
        top.push([x, y]);
    }
    var c = [x0 - hc * 0.05, yb - hc * 0.3];
    for (i = 0; i <= 30; i++) { var t = i / 30, an = (90 + t * 400) * DB1_D, r = hc * 0.3 * (1 - t * 0.78); curl.push([c[0] - Math.cos(an) * r * 1.1, c[1] + Math.sin(an) * r]); }
    return { outline: top.concat([[x0 + L, yb], [x0, yb]]), curl: curl };
}
db1_reg('tsukiKumo', false, function (ctx, bb, d) {
    var sc = ctx.sc, u = db1_u(ctx), ST = db1_settle(ctx), i;
    var Rm = jzClamp(jzU(ctx) * 0.064, 40 * u, 84 * u), sp = db1_spot(ctx, bb, Rm * 4.6, Rm * 2.9, d, 24 * u), a = sp.ok ? 1 : 0.35;
    var flip = sp.cx < ctx.W / 2 ? -1 : 1, mx = sp.cx + flip * Rm * 0.9, my = sp.y + Rm * 1.3;
    var moonC = db1_dark(sc) ? sc.fg : db1_acc(sc), cres = (d.v | 0) % 2 === 1;
    var DR = 'var e=oc(t/0.6),dr=Math.sin(t*0.5+' + jzN((d.r || 0) * 6) + ')*' + jzN(Rm * 0.35) + '-(' + flip + ')*(1-e)*' + jzN(Rm * 1.4) + ';';
    var S = jzShapeLayer(ctx, 'tsuki kumo', mx, my);
    // small cloud above (line only)
    var L = Rm * 3.3, hc = Rm * 0.7, L2c = L * 0.55, c2 = db1_kumo(flip * Rm * 0.2 - L2c / 2, -Rm * 0.9, L2c, hc * 0.55);
    var g2 = jzGrp(S, 'cloud 2');
    jzAddPath(g2, c2.outline.slice(0, c2.outline.length - 1), false); jzAddPath(g2, c2.curl, false);
    db1_trim(ctx, g2, ST, '100*ioc((t-0.35)/0.7)'); db1_st(g2, sc.sub, Math.max(1, 1.1 * u), 70, 2, 2);
    db1_gx(ctx, g2, 'ADBE Vector Position', ST, DR + '[-dr*0.6,0]');
    // main cloud across the lower half of the moon (filled with the background so it passes in front)
    var c1 = db1_kumo(-L * 0.55, Rm * 0.62, L, hc), gC = jzGrp(S, 'cloud');
    db1_gx(ctx, gC, 'ADBE Vector Position', ST, DR + '[dr,0]');
    var gl = db1_sub(gC, 'lines'); jzAddPath(gl, c1.outline.slice(0, c1.outline.length - 1), false); jzAddPath(gl, c1.curl, false);
    db1_trim(ctx, gl, ST, '100*ioc((t-0.2)/0.7)'); db1_st(gl, sc.fg, Math.max(1, 1.4 * u), 90, 2, 2);
    var gi = db1_sub(gC, 'inner'); jzAddPath(gi, db1_off(c1.outline.slice(6, 40), 0, hc * 0.28), false);
    db1_trim(ctx, gi, ST, '100*ioc((t-0.2)/0.7)'); db1_st(gi, sc.sub, Math.max(1, u), 50);
    var gf = db1_sub(gC, 'fill'); jzAddPath(gf, c1.outline, true); jzAddFill(gf, sc.bg);
    db1_gop(ctx, gf, ST, 'cl(ioc((t-0.2)/0.7)*2)');
    // halo rings
    var gh1 = jzGrp(S, 'halo'); db1_arcTrim(ctx, gh1, Rm * 1.28, 0, 0, -90, ST, '360*ioc((t-0.1)/0.7)'); db1_st(gh1, sc.sub, Math.max(1, u), 50);
    var gh2 = jzGrp(S, 'halo 2'); db1_arcTrim(ctx, gh2, Rm * 1.5, 0, 0, 90, ST, '200*ioc((t-0.1)/0.7)'); db1_st(gh2, sc.sub, Math.max(1, 0.8 * u), 30);
    // moon
    var gm = jzGrp(S, 'moon');
    if (cres) {
        var pts = db1_arc(0, 0, Rm, 60, 300, 40), inn = [];
        for (i = 0; i <= 40; i++) { var an = (300 - 240 * i / 40) * DB1_D; inn.push([Rm * 0.42 + Math.cos(an) * Rm * 0.62 * 1.12, Math.sin(an) * Rm * 0.93]); }
        jzAddPath(gm, pts.concat(inn), true);
    } else jzAddEllipse(gm, Rm * 2, Rm * 2);
    jzAddFill(gm, moonC, 95);
    db1_gx(ctx, gm, 'ADBE Vector Scale', ST, 'var e=oc(t/0.6),s=85+15*e;[s,s]');
    db1_gop(ctx, gm, ST, 'oc(t/0.6)');
    jzXf(S, 'ADBE Opacity').setValue(a * 100); db1_op(ctx, S, ST);
});

/* ---- momiji — 紅葉: a few maple leaves falling in a pendulum sway (tilting with each swing), fading near the lyric */
var DB1_MAPLE = (function () {
    var lobes = [[-125, 0.36], [-82, 0.66], [-42, 0.9], [0, 1], [42, 0.9], [82, 0.66], [125, 0.36]], pts = [], i;
    function P2(a, r) { return [Math.sin(a * DB1_D) * r, -Math.cos(a * DB1_D) * r]; }
    pts.push(P2(180, 0.1));
    for (i = 0; i < lobes.length; i++) {
        var a = lobes[i][0], l = lobes[i][1];
        pts.push(P2(a - 17, l * 0.6), P2(a - 11, l * 0.64), P2(a - 6, l * 0.84), P2(a, l), P2(a + 6, l * 0.84), P2(a + 11, l * 0.64), P2(a + 17, l * 0.6));
        var nx = i < lobes.length - 1 ? lobes[i + 1][0] : 180;
        pts.push(P2((a + nx) / 2, i < lobes.length - 1 ? 0.3 : 0.1));
    }
    return pts;
})();
db1_reg('momiji', false, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db1_u(ctx), i, j;
    var N = 4 + (d.n | 0) + (d.big ? 1 : 0), ac = db1_acc(sc), cols = [ac, jzMixHex(ac, sc.fg, 0.3), jzMixHex(ac, sc.bg, 0.3)];
    var veins = [[0, 0.82], [-42, 0.7], [42, 0.7], [-82, 0.5], [82, 0.5]];
    for (i = 0; i < N; i++) {
        var r1 = db1_r(d.seed, i, 1), L = (40 + db1_r(d.seed, i, 2) * 26) * u * (i === 0 ? 1.35 : 1), v = (38 + db1_r(d.seed, i, 3) * 30) * u;
        var om = 1.3 + db1_r(d.seed, i, 4) * 0.9, ph = db1_r(d.seed, i, 5) * Math.PI * 2, span = H + L * 4;
        var x0 = W * (i + 0.5) / N + db1_rs(d.seed, i, 7) * W * 0.4 / N, A = (26 + db1_r(d.seed, i, 8) * 34) * u, rot0 = db1_rs(d.seed, i, 9) * 40;
        var pad = 12 * u + L * 0.5, soft = 30 * u;
        var MV = 'var s=Math.sin(t*' + jzN(om) + '+' + jzN(ph) + '),x=' + jzN(x0) + '+' + jzN(A) + '*s,y=wr(' + jzN(db1_r(d.seed, i, 6) * span) + '+' + jzN(v) + '*t,' + jzN(-L * 2) + ',' + jzN(span) + ')-Math.abs(Math.cos(t*' + jzN(om) + '+' + jzN(ph) + '))*' + jzN(A * 0.25) + ';';
        var S = jzShapeLayer(ctx, 'momiji ' + (i + 1), x0, 0), col = cols[i % 3];
        var gs = jzGrp(S, 'stem'); jzAddPath(gs, [[0, 0.05 * L], [0.06 * L, 0.42 * L]], false); db1_st(gs, col, Math.max(1, 1.4 * u), null, 2);
        var gv = jzGrp(S, 'veins'); for (j = 0; j < veins.length; j++) jzAddPath(gv, [[0, 0], [Math.sin(veins[j][0] * DB1_D) * veins[j][1] * L, -Math.cos(veins[j][0] * DB1_D) * veins[j][1] * L]], false);
        db1_st(gv, sc.bg, Math.max(1, 0.9 * u), 45);
        var gl = jzGrp(S, 'leaf'); jzAddPath(gl, db1_xf(DB1_MAPLE, 0, 0, 0, L), true); jzAddFill(gl, col);
        jzSetExpr(jzXf(S, 'ADBE Position'), db1_H(ctx, 0) + MV + '[x,y]');
        jzSetExpr(jzXf(S, 'ADBE Rotate Z'), db1_H(ctx, 0) + MV + jzN(rot0) + '+s*38');
        jzSetExpr(jzXf(S, 'ADBE Scale'), db1_H(ctx, 0) + 'var q=oc((t-' + jzN(r1 * 0.35) + ')/0.45),fx=0.55+0.45*Math.abs(Math.cos(t*' + jzN(om * 0.5) + '+' + jzN(ph) + '));[100*fx*q,100*q]');
        jzXf(S, 'ADBE Opacity').setValue(92);
        db1_op(ctx, S, 0, '(function(){' + MV + 'var dx=Math.max(' + jzN(bb.x0 - pad) + '-x,0,x-' + jzN(bb.x1 + pad) + '),dy=Math.max(' + jzN(bb.y0 - pad) + '-y,0,y-' + jzN(bb.y1 + pad) + ');return cl(Math.sqrt(dx*dx+dy*dy)/' + jzN(soft) + ');})()');
    }
});

/* ---- namiGashira — 波頭: a row of curling wave crests (line art with water lines and spray) rising along the bottom band */
function db1_crest(x, yb, w, h) {
    var back = db1_bez([x - w / 2, yb], [x - w * 0.18, yb], [x - w * 0.28, yb - h], [x, yb - h], 16), r0 = h * 0.4, cx = x, cy = yb - h + r0, curl = [], i;
    for (i = 1; i <= 30; i++) { var deg = i / 30 * 430, an = (-90 + deg) * DB1_D, rr = r0 * (deg < 90 ? 1 : 1 - 0.8 * (deg - 90) / 340); curl.push([cx + Math.cos(an) * rr, cy + Math.sin(an) * rr]); }
    var face = db1_bez([cx + r0, cy], [cx + r0 * 1.05, cy + h * 0.35], [x + w * 0.3, yb], [x + w / 2, yb], 12);
    var inner = [], ks = [0.7, 0.44];
    for (i = 0; i < 2; i++) { var k = ks[i]; inner.push(db1_bez([x - w / 2 + w * 0.12 * (1 - k), yb], [x - w * 0.2, yb], [x - w * 0.24, yb - h * k], [x - w * 0.02, yb - h * k + h * 0.08], 12)); }
    return { crest: back.concat(curl), face: face, inner: inner, top: [x + r0 * 0.9, yb - h] };
}
db1_reg('namiGashira', false, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db1_u(ctx), m = db1_mg(ctx), ST = db1_settle(ctx), i, k;
    var room = H - m * 0.6 - (bb.y1 + 26 * u); if (room < 34 * u) return;
    var h = Math.min(jzU(ctx) * 0.085, room * 0.72), w = h * 2.3, dir = d.right ? 1 : -1, n = Math.ceil(W / w) + 2, lw = Math.max(1, 1.5 * u), ac = db1_acc(sc);
    var S = jzShapeLayer(ctx, 'nami gashira', 0, H - m * 0.6);
    jzSetExpr(jzXf(S, 'ADBE Position'), db1_H(ctx, ST) + 'var e=oc(t/0.6);[value[0],value[1]+(1-e)*' + jzN(h * 1.2) + '+ic(PO)*' + jzN(h * 0.8) + ']');
    var gb = jzGrp(S, 'water line'); jzAddPath(gb, [[m * 0.5, 3 * u], [W - m * 0.5, 3 * u]], false); db1_st(gb, sc.sub, Math.max(1, 0.8 * u), 50);
    db1_gop(ctx, gb, ST, 'ioc((t-0.05)/0.8)');
    var gR = jzGrp(S, 'crests');
    db1_gx(ctx, gR, 'ADBE Vector Position', ST, '[wr(t*' + jzN(16 * u * dir) + ',0,' + jzN(w) + '),0]');
    for (i = -1; i < n; i++) {
        var hh = h * (0.82 + 0.18 * Math.sin(i * 1.7 + (d.r || 0) * 6)), wc = db1_crest(0, 0, w, hh), gc = db1_sub(gR, 'crest ' + (i + 2));
        jzGX(gc).property('ADBE Vector Position').setValue([i * w - w * 0.5, 0]);
        db1_gx(ctx, gc, 'ADBE Vector Position', ST, '[value[0],Math.sin(t*1.6+' + jzN(i * 0.9) + ')*' + jzN(h * 0.04) + ']');
        var gsp = db1_sub(gc, 'spray');
        for (k = 0; k < 4; k++) { var rr = (1.8 + 0.6 * Math.sin(i * 3 + k * 2)) * u; jzAddEllipse(gsp, rr * 2, rr * 2, wc.top[0] + (k * 0.12 + 0.06) * w * 0.45, wc.top[1] - (k % 2 ? 0.1 : 0.2) * hh - k * 1.5 * u); }
        var fs = jzAddFill(gsp, ac, 90);
        jzSetExpr(fs.property('ADBE Vector Fill Opacity'), db1_H(ctx, ST) + 'value*cl((ioc((t-0.05)/0.8)-0.8)/0.2)*(0.75+0.25*Math.sin(t*5+' + (i * 3) + '))');
        var gi = db1_sub(gc, 'water'); jzAddPath(gi, wc.inner[0], false); jzAddPath(gi, wc.inner[1], false); db1_st(gi, sc.sub, Math.max(1, u), 60, 2);
        var gl = db1_sub(gc, 'crest'); jzAddPath(gl, wc.crest, false); jzAddPath(gl, wc.face, false); db1_st(gl, sc.fg, lw, 90, 2, 2);
    }
    db1_trim(ctx, gR, ST, '100*ioc((t-0.05)/0.8)');
    db1_op(ctx, S, ST);
});

/* ---- kasumi — 霞: layered suyari-gasumi mist bands (rounded stepped bars) drifting behind the lyric, edged with a gold hairline */
db1_reg('kasumi', true, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db1_u(ctx), k;
    var n = 2 + ((d.n | 0) % 2), hb = jzClamp(jzU(ctx) * 0.046, 28 * u, 58 * u), line = db1_acc(sc), fa = db1_dark(sc) ? 0.9 : 0.75, lw = Math.max(1, 1.2 * u);
    for (k = 0; k < n; k++) {
        var dir = (k + (d.right ? 1 : 0)) % 2 ? 1 : -1, dl = k * 0.12;
        var Lm = W * (0.34 + db1_r(d.seed, k, 1) * 0.22), yc = H * ((k + 0.5) / n) + (db1_r(d.seed, k, 2) - 0.5) * H * 0.16;
        var xc = W * (0.5 + dir * (0.2 + db1_r(d.seed, k, 3) * 0.18));
        var Lu = Lm * (0.45 + db1_r(d.seed, k, 4) * 0.2), ou = (db1_r(d.seed, k, 5) < 0.5 ? -1 : 1) * Lm * 0.22, hu = hb * 0.8, Ld = Lm * (0.3 + db1_r(d.seed, k, 6) * 0.2), od = -ou * 0.8;
        var S = jzShapeLayer(ctx, 'kasumi ' + (k + 1), xc, yc);
        jzSetExpr(jzXf(S, 'ADBE Position'), db1_H(ctx, 0) + 'var e=oc((t-' + jzN(dl) + ')/0.8);[value[0]+(' + dir + ')*((1-e)*' + jzN(W * 0.25) + '+t*' + jzN(7 * u) + '),value[1]]');
        var g1 = jzGrp(S, 'hairline'); jzAddPath(g1, [[ou - Lu / 2 + hu / 2, -hb / 2 - hu + 1], [ou + Lu / 2 - hu / 2, -hb / 2 - hu + 1]], false);
        db1_trim(ctx, g1, 0, '100*ioc((t-' + jzN(0.3 + dl) + ')/0.6)'); db1_st(g1, line, lw, 75);
        var g2 = jzGrp(S, 'hairline 2'); jzAddPath(g2, [[Lm / 2 - hb / 2, hb / 2], [-Lm / 2 + hb / 2, hb / 2]], false);
        db1_trim(ctx, g2, 0, '100*ioc((t-' + jzN(0.4 + dl) + ')/0.6)'); db1_st(g2, line, lw, 52);
        var gf = jzGrp(S, 'mist');
        jzAddRect(gf, Lm, hb, hb / 2);
        jzAddRect(gf, Lu, hu + 2, hu / 2, ou, -hb / 2 - hu / 2);
        if (db1_r(d.seed, k, 7) < 0.6) jzAddRect(gf, Ld, hu * 0.85 + 2, hu * 0.42, od, hb / 2 + (hu * 0.85) / 2);
        jzAddFill(gf, sc.dim, fa * 100);
        db1_op(ctx, S, 0, 'oc((t-' + jzN(dl) + ')/0.8)');
    }
});

// ================================================================ sci-fi / HUD

/* ---- hexGrid — 六角格子: a honeycomb patch whose cells ripple in, a scan band (track-matted bright copy) and a few lit cells */
db1_reg('hexGrid', false, function (ctx, bb, d) {
    var sc = ctx.sc, u = db1_u(ctx), ST = db1_settle(ctx), i, j, k;
    var rc = jzClamp(jzU(ctx) * 0.021, 13 * u, 24 * u), cols = 5 + (d.n | 0) + (d.big ? 1 : 0), rows = 3 + ((d.v | 0) % 2);
    var dx = rc * 1.5, dy = rc * Math.sqrt(3), fs = db1_fs(ctx) * 0.72, w = (cols - 1) * dx + rc * 2, h = rows * dy + dy / 2 + fs * 1.8;
    var sp = db1_spot(ctx, bb, w, h, d, 24 * u), a = sp.ok ? 1 : 0.35, x0 = sp.x + rc, y0 = sp.y + fs * 1.8 + dy / 2;
    var sc0 = Math.floor((d.r || 0) * cols), sc1 = Math.floor(db1_r(d.seed, 2) * rows), lw = Math.max(1, u), hex = [], cells = [];
    for (k = 0; k <= 6; k++) hex.push([Math.cos(k * 60 * DB1_D) * rc * 0.88, Math.sin(k * 60 * DB1_D) * rc * 0.88]);
    for (i = 0; i < cols; i++) for (j = 0; j < rows; j++) cells.push([x0 + i * dx, y0 + j * dy + (i % 2 ? dy / 2 : 0), Math.sqrt((i - sc0) * (i - sc0) + (j - sc1) * (j - sc1))]);
    function grid(name, col, w0, op) {
        var S = jzShapeLayer(ctx, name, 0, 0), q;
        for (q = 0; q < cells.length; q++) {
            var g = jzGrp(S, 'cell ' + (q + 1)); jzAddPath(g, hex, true);
            jzGX(g).property('ADBE Vector Position').setValue([cells[q][0], cells[q][1]]);
            db1_gx(ctx, g, 'ADBE Vector Scale', ST, 'var q=cl((t-' + jzN(cells[q][2] * 0.045) + ')/0.3),s=q<=0?0:ob(q,1.6);[100*s,100*s]');
        }
        // one stroke at the root, below every cell group: strokes all of them, width unaffected by the cells' scale
        var st = S.property('ADBE Root Vectors Group').addProperty('ADBE Vector Graphic - Stroke');
        st.property('ADBE Vector Stroke Color').setValue(jzHex(col)); st.property('ADBE Vector Stroke Width').setValue(w0); st.property('ADBE Vector Stroke Opacity').setValue(op);
        jzXf(S, 'ADBE Opacity').setValue(a * 100); db1_op(ctx, S, ST);
        return S;
    }
    // lit cells: re-picked 2.5× per second
    var Lt = jzShapeLayer(ctx, 'hex lit', 0, 0), nl = 3 + (d.n | 0), CE = [];
    for (k = 0; k < cells.length; k++) CE.push('[' + jzN(cells[k][0]) + ',' + jzN(cells[k][1]) + ']');
    for (k = 0; k < nl; k++) {
        var gk = jzGrp(Lt, 'lit ' + (k + 1)); jzAddPath(gk, db1_xf(hex, 0, 0, 0, 0.62), true); jzAddFill(gk, k % 2 ? db1_acc(sc) : sc.fg, k % 2 ? 90 : 50);
        db1_gx(ctx, gk, 'ADBE Vector Position', ST, 'var C=[' + CE.join(',') + '],tk=Math.floor(Math.max(0,t)*2.5);C[Math.floor(hh(tk*31.7+' + (k * 7 + 3) + '+SD*0.013)*C.length)%C.length]');
    }
    jzXf(Lt, 'ADBE Opacity').setValue(a * 100); db1_op(ctx, Lt, ST, 't>0.5?1:0');
    grid('hex grid', sc.sub, lw, 60);
    var hot = grid('hex scan', sc.fg, lw * 1.3, 95);
    var Mt = jzShapeLayer(ctx, 'hex scan band', sp.x, sp.y + h / 2), gm = jzGrp(Mt, 'band'); jzAddRect(gm, rc * 2.4, h + dy); jzAddFill(gm, '#FFFFFF');
    jzSetExpr(jzXf(Mt, 'ADBE Position'), db1_H(ctx, ST) + '[value[0]+((t*0.45+' + jzN(d.r || 0) + ')%1.4)*' + jzN(w + 40 * u) + '-' + jzN(20 * u) + ',value[1]]');
    hot.trackMatteType = TrackMatteType.ALPHA; Mt.enabled = false;
    // header
    var le = 'oe((t-0.35)/0.3)';
    var T1 = db1_label(ctx, 'SECTOR ' + db1_pad((ctx.cut.line | 0) + 1), sp.x, sp.y + fs * 0.5, { size: fs, track: 0.2, alpha: a }); db1_op(ctx, T1, ST, le);
    var T2 = db1_label(ctx, db1_pad(nl) + '/' + cols * rows, sp.x + w, sp.y + fs * 0.5, { size: fs, align: 'right', color: sc.fg, alpha: a }); db1_op(ctx, T2, ST, le);
    db1_srcText(ctx, T2, ST, 'var tk=Math.floor(Math.max(0,t)*2.5),NC=' + cells.length + ',seen={},c=0;for(var k=0;k<' + nl + ';k++){var ix=Math.floor(hh(tk*31.7+k*7+3+SD*0.013)*NC)%NC;if(!seen[ix]){seen[ix]=1;c++;}}(c<10?"0":"")+c+"/' + cells.length + '"');
    var Ln = jzShapeLayer(ctx, 'hex rule', sp.x, sp.y + fs * 1.15), gn = jzGrp(Ln, 'rule'); jzAddPath(gn, [[0, 0], [w, 0]], false);
    db1_trim(ctx, gn, ST, '100*' + le); db1_st(gn, sc.sub, lw, 50); jzXf(Ln, 'ADBE Opacity').setValue(a * 100); db1_op(ctx, Ln, ST);
});

/* ---- spectrumRing — 円形スペクトラム: a radial spectrum analyser (mirrored bars round a small ring) with falling peak dots */
db1_reg('spectrumRing', false, function (ctx, bb, d) {
    var sc = ctx.sc, u = db1_u(ctx), ST = db1_settle(ctx), k;
    var R0 = jzClamp(jzU(ctx) * 0.052, 34 * u, 66 * u), Lm = R0 * 0.95, sp = db1_spot(ctx, bb, (R0 + Lm) * 2.1, (R0 + Lm) * 2.1, d, 18 * u), a = sp.ok ? 1 : 0.35;
    var N = 60, ac = db1_acc(sc), bl = Math.max(1.4, Math.min(3.2 * u, Math.PI * 2 * R0 / N * 0.55)), rin = R0 + 3 * u;
    // value noise (the browser's J.noise1) + the level of bar pair k
    var NZ = 'function nz(x){var i=Math.floor(x),f=x-i,s=f*f*(3-2*f),p=hh(i*0.917+' + jzN((d.seed % 997) * 0.37) + ')*2-1,q=hh((i+1)*0.917+' + jzN((d.seed % 997) * 0.37) + ')*2-1;return p+(q-p)*s;}' +
        'var e=oe(t/0.5),bt=0.5+0.5*Math.sin(t*7);function lev(k,tt){return cl((0.55+0.45*nz(k*0.5+tt*5.5))*(1-k/30*0.55)*(0.75+0.35*bt));}\n';
    var S = jzShapeLayer(ctx, 'spectrum ring', sp.cx, sp.cy);
    var gi = jzGrp(S, 'inner ring'); db1_arcTrim(ctx, gi, R0 * 0.72, 0, 0, 90, ST, '360*oe((t-0.15)/0.5)'); db1_st(gi, sc.sub, Math.max(1, 0.8 * u), 40);
    var gr = jzGrp(S, 'ring'); db1_arcTrim(ctx, gr, R0, 0, 0, -90, ST, '360*oe(t/0.5)'); db1_st(gr, sc.sub, Math.max(1, u), 70);
    var gB = jzGrp(S, 'bars');
    db1_gx(ctx, gB, 'ADBE Vector Rotation', ST, jzN((d.r || 0) * 360) + '+t*6');
    for (k = 0; k < N / 2; k++) {
        var i1 = k, i2 = N - 1 - k, ie = k % 2 === 0 ? i1 : i2, g = db1_sub(gB, 'band ' + (k + 1)), gb = db1_sub(g, 'bars'), gp = db1_sub(g, 'peak'), an, j;
        for (j = 0; j < 2; j++) { an = (j ? i2 : i1) / N * 360 * DB1_D; jzAddPath(gb, [[Math.cos(an) * rin, Math.sin(an) * rin], [Math.cos(an) * (rin + Lm), Math.sin(an) * (rin + Lm)]], false); }
        db1_trim(ctx, gb, ST, '(' + jzN(k / N) + '<=e?100*lev(' + k + ',t)*e:0)', null, null, NZ);
        var st = db1_st(gb, sc.fg, bl, 90);
        jzSetExpr(st.property('ADBE Vector Stroke Color'), db1_H(ctx, ST) + NZ + '(lev(' + k + ',t)>0.78?' + db1_cx(ac) + ':' + db1_cx(sc.fg) + ')');
        an = ie / N * 360 * DB1_D;
        var ep = jzAddEllipse(gp, 2.6 * u, 2.6 * u);
        jzSetExpr(ep.property('ADBE Vector Ellipse Position'), db1_H(ctx, ST) + NZ + 'var r1=' + jzN(rin) + '+' + jzN(Lm) + '*lev(' + k + ',t)*e,pk=' + jzN(rin) + '+' + jzN(Lm) + '*cl(0.25+0.7*(0.55+0.45*nz(' + jzN(k * 0.5) + '+(t-0.25)*5.5))*(1-' + jzN(k / 30 * 0.55) + '))*e+' + jzN(5 * u) +
            ',r=Math.max(pk,r1+' + jzN(4 * u) + ');[' + jzN(Math.cos(an)) + '*r,' + jzN(Math.sin(an)) + '*r]');
        jzAddFill(gp, sc.sub, 80);
        db1_gop(ctx, gp, ST, '(' + jzN(ie / N) + '<=oe(t/0.5)?1:0)');
    }
    jzXf(S, 'ADBE Opacity').setValue(a * 100); db1_op(ctx, S, ST);
    var fs = R0 * 0.42;
    var T1 = db1_label(ctx, db1_pad((ctx.cut.line | 0) + 1), sp.cx, sp.cy - fs * 0.1, { size: fs, align: 'center', color: sc.fg, track: 0.04, alpha: a }); db1_op(ctx, T1, ST, 'oe((t-0.3)/0.3)');
    var T2 = db1_label(ctx, 'Hz', sp.cx, sp.cy + fs * 0.75, { size: fs * 0.42, align: 'center', track: 0.2, alpha: a }); db1_op(ctx, T2, ST, 'oe((t-0.4)/0.3)');
});

/* ---- dataColumns — データ列: a memory-dump panel — address / bytes / code-point rows scrolling up (one text layer, Source Text
   expression + a Position animator for the step scroll, masked to its window), newest row flagged */
db1_reg('dataColumns', false, function (ctx, bb, d) {
    var sc = ctx.sc, u = db1_u(ctx), ST = db1_settle(ctx), c = ctx.cut, i;
    var fs = db1_fs(ctx) * 0.9, rh = fs * 1.55, nR = 6 + (d.n | 0), font = jzMonoF(ctx), ac = db1_acc(sc);
    var chs = jzChars(String(c.text || '')), cps = [], lines = [];
    for (i = 0; i < chs.length; i++) if (jzTrim(chs[i])) cps.push(chs[i].charCodeAt(0));
    if (!cps.length) cps.push(65);
    for (i = 0; i < nR + 2; i++) lines.push('0x0000  00 00 00 00  U+0000');
    var T = jzText(ctx, lines.join('\r'), { font: font, size: fs, color: sc.sub, x: 0, y: 0, align: 'left', track: 0.06, leading: rh });
    var tw = jzSize(T)[0], w = tw + 22 * u, hwin = nR * rh, h = hwin + fs * 2.2;
    var sp = db1_spot(ctx, bb, w, h, d, 24 * u), a = sp.ok ? 1 : 0.35, x0 = sp.x + 14 * u, yTop = sp.y + fs * 2.2;
    // anchor on the first row's baseline (origin of a left-aligned text layer): row k sits at yTop + (k + 1) * rh - rh / 2
    var anc = [0, 0], pos = [x0, yTop - rh / 2 + fs * 0.36];
    jzXf(T, 'ADBE Anchor Point').setValue(anc); jzXf(T, 'ADBE Position').setValue(pos);
    var H7 = db1_h(d.seed, 7) & 0xff;
    db1_srcText(ctx, T, ST, 'function hx(n,k){var s=(n>>>0).toString(16).toUpperCase();while(s.length<k)s="0"+s;return s.substr(s.length-k);}' +
        'var CP=[' + cps.join(',') + '],n0=Math.floor(t*2.6),o=[];for(var k=-1;k<=' + nR + ';k++){var n=n0+k,b=[];for(var j=0;j<4;j++)b.push(hx(Math.floor(hh(n*7.31+j*1.93+' + jzN((d.seed % 9973) * 0.011) + ')*256),2));' +
        'var ci=((n%CP.length)+CP.length)%CP.length;o.push("0x"+hx(' + H7 * 256 + '+n*16,4)+"  "+b.join(" ")+"  U+"+hx(CP[ci],4));}o.join("\\r")');
    // step scroll (one row per 1/2.6 s, eased), row fade by age, newest row in fg
    jzAnimator(T, 'JZ Scroll', [['ADBE Text Position 3D', [0, -rh, 0]]], db1_H(ctx, ST) + 'var f=t*2.6-Math.floor(t*2.6);100*ioc(f*2.5)');
    jzAnimator(T, 'JZ Age', [['ADBE Text Opacity', 0]], 'var L=Math.floor((textIndex-1)/27)-1,NR=' + nR + ';L===NR-1?0:100*(1-(0.3+0.6*(1-Math.max(0,NR-1-L)/NR)))');
    jzAnimator(T, 'JZ Newest', [['ADBE Text Fill Color', jzHex(sc.fg)]], 'Math.floor((textIndex-1)/27)-1===' + (nR - 1) + '?100:0');
    db1_mask(T, db1_rectShape(sp.x - 2 * u - pos[0] + anc[0], yTop - pos[1] + anc[1], sp.x + w + 2 * u - pos[0] + anc[0], yTop + hwin - pos[1] + anc[1]));
    jzXf(T, 'ADBE Opacity').setValue(a * 100); db1_op(ctx, T, ST, 'oe(t/0.5)');
    // header + rules + newest-row flag
    var T1 = db1_label(ctx, 'MEM', sp.x, sp.y + fs * 0.6, { size: fs, color: ac, track: 0.2, alpha: a }); db1_op(ctx, T1, ST, 'oe(t/0.5)');
    var T2 = db1_label(ctx, 'LYRIC_' + db1_pad((c.line | 0) + 1), sp.x + w, sp.y + fs * 0.6, { size: fs, align: 'right', track: 0.1, alpha: a }); db1_op(ctx, T2, ST, 'oe(t/0.5)');
    var S = jzShapeLayer(ctx, 'data rules', 0, 0);
    var gf = jzGrp(S, 'flag'); jzAddPath(gf, [[sp.x + 3 * u, -4 * u], [sp.x + 9 * u, 0], [sp.x + 3 * u, 4 * u]], true); jzAddFill(gf, ac);
    db1_gx(ctx, gf, 'ADBE Vector Position', ST, 'var f=t*2.6-Math.floor(t*2.6);[0,' + jzN(yTop + nR * rh - rh * 0.5) + '-ioc(f*2.5)*' + jzN(rh) + ']');
    var g1 = jzGrp(S, 'rule'); jzAddPath(g1, [[sp.x, sp.y + fs * 1.4], [sp.x + w, sp.y + fs * 1.4]], false); db1_trim(ctx, g1, ST, '100*oe(t/0.5)'); db1_st(g1, sc.sub, Math.max(1, u), 70);
    var g2 = jzGrp(S, 'side'); jzAddPath(g2, [[sp.x, yTop], [sp.x, yTop + hwin]], false); db1_trim(ctx, g2, ST, '100*oe(t/0.5)'); db1_st(g2, sc.sub, Math.max(1, u), 50);
    jzXf(S, 'ADBE Opacity').setValue(a * 100); db1_op(ctx, S, ST);
});

/* ---- spinner — 読み込み: a loading spinner (segments, twin arcs or orbiting dots) that resolves into a check mark */
db1_reg('spinner', false, function (ctx, bb, d) {
    var sc = ctx.sc, u = db1_u(ctx), ST = db1_settle(ctx), c = ctx.cut, i;
    var R = jzClamp(jzU(ctx) * 0.036, 22 * u, 44 * u), fs = db1_fs(ctx) * 0.95, font = jzMonoF(ctx), ac = db1_acc(sc);
    var T = db1_label(ctx, 'LOADING...', 0, 0, { size: fs, font: font, color: sc.fg, track: 0.16 }), tw = jzSize(T)[0];
    var w = R * 2 + 14 * u + tw, h = R * 2 + 4 * u, sp = db1_spot(ctx, bb, w, h, d, 22 * u), a = sp.ok ? 1 : 0.35;
    var left = sp.cx < ctx.W / 2 || !sp.ok, cx = left ? sp.x + R : sp.x + w - R, cy = sp.cy;
    var tDone = jzClamp(c.dur * 0.55, 0.9, 2.4), v = (d.v | 0) % 3, lw = Math.max(1.4, 2.2 * u), DN = 'var dn=cl((t-' + jzN(tDone) + ')/0.35);';
    var S = jzShapeLayer(ctx, 'spinner', cx, cy);
    var gk = jzGrp(S, 'check');
    var gc = db1_sub(gk, 'tick'); jzAddPath(gc, [[-R * 0.42, R * 0.02], [-R * 0.1, R * 0.32], [R * 0.45, -R * 0.3]], false);
    db1_trim(ctx, gc, ST, '100*ioc((t-' + jzN(tDone + 0.15) + ')/0.3)'); db1_st(gc, ac, lw, null, 2, 2);
    var ga = db1_sub(gk, 'circle'); db1_arcTrim(ctx, ga, R, 0, 0, -90, ST, '360*oc(cl((t-' + jzN(tDone) + ')/0.35))'); db1_st(ga, ac, lw);
    db1_gop(ctx, gk, ST, 't>=' + jzN(tDone) + '?1:0');
    var gS = jzGrp(S, 'spin');
    db1_gx(ctx, gS, 'ADBE Vector Scale', ST, 'var e=ob(cl(t/0.35),1.6);[100*e,100*e]');
    db1_gop(ctx, gS, ST, '1-dn', DN);
    if (v === 0) {
        var gg = db1_sub(gS, 'segments'), g1 = db1_sub(gg, 'segment'); jzAddPath(g1, [[R * 0.5, 0], [R, 0]], false); db1_st(g1, sc.fg, lw, null, 2);
        var rp = db1_rep(gg, 12, 0, 0, -30);
        try { var rt = rp.property('ADBE Vector Repeater Transform'); rt.property('ADBE Vector Repeater Opacity 1').setValue(100); rt.property('ADBE Vector Repeater Opacity 2').setValue(16); } catch (e1) {}
        db1_gx(ctx, gg, 'ADBE Vector Rotation', ST, 'Math.floor(Math.max(0,t)*12)*30');
    } else if (v === 1) {
        var g0 = db1_sub(gS, 'track'); jzAddEllipse(g0, R * 2, R * 2); db1_st(g0, sc.sub, Math.max(1, 0.8 * u), 25);
        var gA = db1_sub(gS, 'arc'); jzAddEllipse(gA, R * 2, R * 2); db1_trim(ctx, gA, ST, '(90+60*Math.sin(t*4))/3.6', null, 't*300+90'); db1_st(gA, sc.fg, lw);
        var gB = db1_sub(gS, 'arc 2'); jzAddEllipse(gB, R * 1.24, R * 1.24); db1_trim(ctx, gB, ST, '(90+60*Math.sin(t*4))*0.8/3.6', null, '-t*200+90'); db1_st(gB, ac, lw);
    } else {
        var gd = db1_sub(gS, 'dots');
        for (i = 0; i < 8; i++) { var an = -i * 26 * DB1_D, r = (3.4 - i * 0.35) * u, gi = db1_sub(gd, 'dot ' + i); jzAddEllipse(gi, r * 2, r * 2, Math.cos(an) * R * 0.8, Math.sin(an) * R * 0.8); jzAddFill(gi, i ? sc.fg : ac, i ? 70 : 100); }
        db1_gx(ctx, gd, 'ADBE Vector Rotation', ST, 't*280');
    }
    jzXf(S, 'ADBE Opacity').setValue(a * 100); db1_op(ctx, S, ST);
    var lx = left ? cx + R + 12 * u : cx - R - 12 * u - tw;
    jzXf(T, 'ADBE Position').setValue([lx, cy - fs * 0.35]); jzXf(T, 'ADBE Opacity').setValue(a * 100);
    db1_srcText(ctx, T, ST, DN + 'var k=Math.floor(Math.max(0,t)*3)%4,s="LOADING";for(var i=0;i<k;i++)s+=".";dn>0.5?"COMPLETE":s');
    db1_txtCol(ctx, T, ac, ST, DN + 'dn>0.5?100:0');
    db1_op(ctx, T, ST, 'oe((t-0.1)/0.3)');
    var T2 = db1_label(ctx, '000%  00000ms', lx, cy + fs * 0.75, { size: fs * 0.72, font: font, track: 0.1, alpha: a * 0.8 });
    db1_srcText(ctx, T2, ST, DN + 'function pd(n,k){var s=String(Math.max(0,Math.floor(n)));while(s.length<k)s="0"+s;return s;}var pr=dn>0?100:Math.min(99,Math.floor(100*(1-Math.exp(-t/' + jzN(tDone) + '*2.2))));pd(pr,3)+"%  "+pd(t*1000,5)+"ms"');
    db1_op(ctx, T2, ST, 'oe((t-0.2)/0.3)');
});

/* ---- headingTape — 方位テープ: a scrolling compass heading tape (Repeater ticks under a feathered window mask), fixed pointer, boxed readout */
db1_reg('headingTape', false, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db1_u(ctx), m = db1_mg(ctx), ST = db1_settle(ctx), j;
    var fs = db1_fs(ctx) * 0.85, font = jzMonoF(ctx), gap = 22 * u, ht = fs * 1.4 + 16 * u + fs * 2.2, ac = db1_acc(sc);
    var aboveRoom = bb.y0 - gap - m * 0.6, belowRoom = H - m * 0.6 - bb.y1 - gap, above = !d.low;
    if ((above ? aboveRoom : belowRoom) < ht && (above ? belowRoom : aboveRoom) > (above ? aboveRoom : belowRoom)) above = !above;
    var room = above ? aboveRoom : belowRoom, compact = room < ht; if (compact) ht = fs * 1.4 + 18 * u;
    var yT = above ? Math.max(m * 0.6, bb.y0 - gap - ht - Math.max(0, (room - ht) * 0.35)) : bb.y1 + gap + Math.max(0, (room - ht) * 0.35);
    var a = room >= ht * 0.8 ? 1 : 0.35, Wt = Math.min(W * 0.56, 620 * u, W - 2 * m), cx = jzClamp((bb.x0 + bb.x1) / 2, m + Wt / 2, W - m - Wt / 2);
    var k = Wt / 100, base = yT + fs * 1.4 + 14 * u, lw = Math.max(1, u), pw = 6 * u, py = base + 3 * u;
    var HD = 'var HG=((' + jzN((d.r || 0) * 360) + '+t*' + (d.right ? 7 : -7) + '+18*Math.sin(t*0.6+' + jzN((d.r || 0) * 5) + '))%360+360)%360,E=oe(t/0.55)*(1-0.7*ic(PO));';
    // ticks: a 15° unit (long + 2 short) repeated, scrolled by the heading, windowed by a feathered mask that opens from the centre
    var S = jzShapeLayer(ctx, 'heading ticks', 0, 0), gt = jzGrp(S, 'tape'), gu = db1_sub(gt, 'unit');
    jzAddPath(gu, [[0, base], [0, base - 12 * u]], false); jzAddPath(gu, [[5 * k, base], [5 * k, base - 6 * u]], false); jzAddPath(gu, [[10 * k, base], [10 * k, base - 6 * u]], false);
    db1_st(gu, sc.fg, lw, 90);
    db1_rep(gt, 9, 15 * k, 0);
    db1_gx(ctx, gt, 'ADBE Vector Position', ST, HD + '[' + jzN(cx) + '+(Math.floor((HG-60)/15)*15-HG)*' + jzN(k) + ',0]');
    var mk = db1_mask(S, db1_rectShape(cx - Wt / 2, base - 20 * u - Wt / 2, cx + Wt / 2, base + 2 * u + Wt / 2));
    mk.property('ADBE Mask Feather').setValue([Wt * 0.3, 0]);
    jzSetExpr(mk.property('ADBE Mask Offset'), db1_H(ctx, ST) + HD + '-(1-E)*' + jzN(Wt / 2));
    jzXf(S, 'ADBE Opacity').setValue(a * 100); db1_op(ctx, S, ST);
    // degree labels: 7 slots riding on the tape
    for (j = 0; j < 7; j++) {
        var DG = HD + 'var dg=Math.ceil((HG-50)/15)*15+' + (j * 15) + ',dd=((dg%360)+360)%360,x=' + jzN(cx) + '+(dg-HG)*' + jzN(k) + ',f=Math.abs(x-' + jzN(cx) + ')/' + jzN(Wt / 2) + ';';
        var TL = db1_label(ctx, '000', cx, base - 12 * u - fs * 0.75, { size: fs, font: font, align: 'center', track: 0.04, alpha: a });
        db1_srcText(ctx, TL, ST, DG + 'dd===0?"N":dd===90?"E":dd===180?"S":dd===270?"W":(dd<10?"00":dd<100?"0":"")+dd');
        jzSetExpr(jzXf(TL, 'ADBE Position'), db1_H(ctx, ST) + DG + '[x,value[1]]');
        db1_txtCol(ctx, TL, ac, ST, DG + '(dd%90===0)?100:0');
        db1_op(ctx, TL, ST, '(function(){' + DG + 'return (f<0.92&&f<=E)?cl((1-f)*1.2):0;})()');
    }
    // base line, pointer and the boxed readout
    var tr = db1_label(ctx, '000°', 0, 0, { size: fs * 1.1, font: font, align: 'center', color: sc.fg, track: 0.08 }), tw = jzSize(tr)[0] + 14 * u, bh0 = fs * 1.6;
    var bx = compact ? cx + Wt / 2 + 12 * u : cx - tw / 2, by = compact ? base - 6 * u - bh0 / 2 : py + pw * 1.3 + 4 * u;
    var F = jzShapeLayer(ctx, 'heading hud', 0, 0);
    var gbx = jzGrp(F, 'box'), rb = jzAddRect(gbx, tw, bh0, 2 * u, bx + tw / 2, by + bh0 / 2); db1_st(gbx, sc.fg, lw);
    jzGX(gbx).property('ADBE Vector Anchor').setValue([bx, by]); jzGX(gbx).property('ADBE Vector Position').setValue([bx, by]);
    db1_gx(ctx, gbx, 'ADBE Vector Scale', ST, '[100,100*oe((t-0.25)/0.3)]');
    var gpt = jzGrp(F, 'pointer'); jzAddPath(gpt, [[cx, py], [cx - pw, py + pw * 1.3], [cx + pw, py + pw * 1.3]], true); jzAddFill(gpt, ac);
    var gl = jzGrp(F, 'base line'); jzAddPath(gl, [[cx - Wt / 2, base], [cx + Wt / 2, base]], false); db1_st(gl, sc.sub, lw, 60);
    jzGX(gl).property('ADBE Vector Anchor').setValue([cx, base]); jzGX(gl).property('ADBE Vector Position').setValue([cx, base]);
    db1_gx(ctx, gl, 'ADBE Vector Scale', ST, HD + '[100*E,100]');
    jzXf(F, 'ADBE Opacity').setValue(a * 100); db1_op(ctx, F, ST);
    jzXf(tr, 'ADBE Position').setValue([bx + tw / 2, by + bh0 / 2]); jzXf(tr, 'ADBE Opacity').setValue(a * 100);
    db1_srcText(ctx, tr, ST, HD + 'var h=Math.floor(HG);(h<10?"00":h<100?"0":"")+h+"°"');
    db1_op(ctx, tr, ST, 'cl((oe((t-0.25)/0.3)-0.6)/0.4)');
    var th = db1_label(ctx, 'HDG', compact ? cx - Wt / 2 - 10 * u : bx - 8 * u, by + bh0 / 2, { size: fs * 0.72, font: font, align: 'right', track: 0.2, alpha: a });
    db1_op(ctx, th, ST, 'oe((t-0.25)/0.3)');
});

/* ---- glyphLock — 文字ロック: HUD lock-on corners hopping from glyph to glyph along the lyric's outer edges, leaving index ticks.
   AE has no per-glyph boxes for the lyric: the glyph cells are estimated from the bbox (line count from its shape). */
function db1_q(s) { return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'; }
db1_reg('glyphLock', false, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db1_u(ctx), m = db1_mg(ctx), ST = db1_settle(ctx), i, j;
    var vert = db1_isVert(bb), G = jzGlyphs(jzStrip(ctx.cut.text || '')), n = Math.max(1, Math.min(12, G.length || 1));
    var a0 = vert ? bb.y0 : bb.x0, a1 = vert ? bb.y1 : bb.x1, along = a1 - a0, across = vert ? db1_bw(bb) : db1_bh(bb);
    var NL = Math.max(1, Math.min(n, Math.round(Math.sqrt(n * across / (1.15 * Math.max(1, along)))))), per = Math.ceil(n / NL), cs = along / per, nb = n - (NL - 1) * per;
    var CA = [], CB = [], gw = cs * 0.9;
    for (i = 0; i < per; i++) CA.push(a0 + (i + 0.5) * cs);
    for (i = 0; i < nb; i++) CB.push((a0 + a1) / 2 - nb * cs / 2 + (i + 0.5) * cs);
    if (NL === 1) CB = CA;
    var pad = 12 * u + across * 0.07, lw = Math.max(1.2, 1.9 * u), ac = db1_acc(sc), OFF = db1_h(d.seed, 1) % 3;
    function arr(A) { var o = []; for (var q = 0; q < A.length; q++) o.push(jzN(A[q])); return '[' + o.join(',') + ']'; }
    var HOP = 'var tt=Math.max(0,t-0.15),k=Math.floor(tt/0.34),f=oe((tt-k*0.34)/0.16);function ix(i,n){return ((i+' + OFF + ')%n+n)%n;}' +
        'function at(C,i){var p=C[ix(i-1,C.length)],q=C[ix(i,C.length)];return k===0?q:p+(q-p)*f;}var CA=' + arr(CA) + ',CB=' + arr(CB) + ';';
    var S = jzShapeLayer(ctx, 'glyph lock', 0, 0);
    // corners: side -1 = top / right edge (accent, the active glyph), +1 = bottom / left edge (fg, two glyphs ahead)
    var sides = [[-1, 'CA', 'k', ac, 100], [1, 'CB', 'k+2', sc.fg, 80]], sd;
    for (sd = 0; sd < 2; sd++) {
        var side = sides[sd][0], Lh = Math.min(gw * 0.36, 22 * u), Lv = pad * 0.8, h0 = gw / 2 + 3 * u, g = jzGrp(S, side < 0 ? 'lock A' : 'lock B'), q;
        var fix = vert ? (side < 0 ? bb.x1 + pad : bb.x0 - pad) : (side < 0 ? bb.y0 - pad : bb.y1 + pad), dn = vert ? (side < 0 ? -1 : 1) : (side < 0 ? 1 : -1);
        db1_gx(ctx, g, 'ADBE Vector Position', ST, HOP + 'var c=at(' + sides[sd][1] + ',' + sides[sd][2] + ');' + (vert ? '[' + jzN(fix) + ',c]' : '[c,' + jzN(fix) + ']'));
        for (q = -1; q <= 1; q += 2) {
            var gc = db1_sub(g, q < 0 ? 'lo' : 'hi'), pts;
            if (!vert) pts = [[q * h0, dn * Lv], [q * h0, 0], [q * h0 - q * Lh, 0]];
            else pts = [[dn * Lv, q * h0], [0, q * h0], [0, q * h0 - q * Lh]];
            jzAddPath(gc, pts, false);
            var sp = '(1-oe(t/0.3))*' + jzN(10 * u);
            db1_gx(ctx, gc, 'ADBE Vector Position', ST, vert ? '[' + (-dn) + '*' + sp + ',' + q + '*' + sp + ']' : '[' + q + '*' + sp + ',' + (-dn) + '*' + sp + ']');
        }
        db1_st(g, sides[sd][3], lw, sides[sd][4]);
        db1_gop(ctx, g, ST, 'oe(t/0.3)');
    }
    // visited ticks along edge A
    var gT = jzGrp(S, 'ticks');
    for (j = 0; j < CA.length; j++) {
        var c = CA[(j + OFF) % CA.length], gt = db1_sub(gT, 'tick ' + (j + 1));
        if (!vert) jzAddPath(gt, [[c, bb.y0 - pad * 0.45], [c, bb.y0 - pad * 0.45 - 5 * u]], false);
        else jzAddPath(gt, [[bb.x1 + pad * 0.45, c], [bb.x1 + pad * 0.45 + 5 * u, c]], false);
        db1_st(gt, sc.sub, Math.max(1, u), 60);
        db1_gop(ctx, gt, ST, 'Math.floor(Math.max(0,t-0.15)/0.34)>=' + j + '?1:0');
    }
    // target label
    var fs = db1_fs(ctx) * 0.9, le = 'oe((t-0.2)/0.25)', GS = [], TX = HOP + 'var ii=ix(k,CA.length);';
    for (i = 0; i < G.length; i++) GS.push(db1_q(G[i]));
    var txt = 'TGT 01/' + db1_pad(CA.length);
    if (!vert) {
        var up = bb.y0 - pad - 14 * u - fs > m * 0.4, ly = up ? bb.y0 - pad - 10 * u - fs * 0.6 : bb.y1 + pad + 14 * u + fs * 0.6;
        var gL = jzGrp(S, 'leader'); jzAddPath(gL, [[0, up ? bb.y0 - pad - 2 * u : bb.y1 + pad + 2 * u], [0, up ? ly + fs * 0.6 : ly - fs * 0.6]], false); db1_st(gL, ac, Math.max(1, u));
        var LX = HOP + 'var lx=Math.max(' + m + ',Math.min(' + (W - m) + ',at(CA,k)));';
        db1_gx(ctx, gL, 'ADBE Vector Position', ST, LX + '[lx,0]'); db1_gop(ctx, gL, ST, le);
        var T1 = db1_label(ctx, txt, 0, ly, { size: fs, color: sc.fg, track: 0.12 });
        jzSetExpr(jzXf(T1, 'ADBE Position'), db1_H(ctx, ST) + LX + '[lx+' + jzN(6 * u) + ',value[1]]');
        db1_srcText(ctx, T1, ST, TX + 'var s=String(ii+1);"TGT "+(s.length<2?"0":"")+s+"/' + db1_pad(CA.length) + '"'); db1_op(ctx, T1, ST, le);
        if (G.length) {
            var T2 = db1_label(ctx, G[0], 0, ly, { size: fs * 1.1, font: jzBodyF(ctx), align: 'right', color: ac });
            jzSetExpr(jzXf(T2, 'ADBE Position'), db1_H(ctx, ST) + LX + '[lx-' + jzN(6 * u) + ',value[1]]');
            db1_srcText(ctx, T2, ST, TX + 'var G=[' + GS.join(',') + '];G[ii]||""'); db1_op(ctx, T2, ST, le);
        }
    } else {
        var right = bb.x1 + pad + 16 * u + fs * 0.7 * txt.length < W - m * 0.4, lx = right ? bb.x1 + pad + 12 * u : bb.x0 - pad - 12 * u;
        var T3 = db1_label(ctx, txt, lx, 0, { size: fs, color: sc.fg, align: right ? 'left' : 'right', track: 0.12 });
        jzSetExpr(jzXf(T3, 'ADBE Position'), db1_H(ctx, ST) + HOP + '[value[0],Math.max(' + m + ',Math.min(' + (H - m) + ',at(CA,k)))]');
        db1_srcText(ctx, T3, ST, TX + 'var s=String(ii+1);"TGT "+(s.length<2?"0":"")+s+"/' + db1_pad(CA.length) + '"'); db1_op(ctx, T3, ST, le);
    }
    db1_op(ctx, S, ST);
});

/* ---- atomOrbit — 原子軌道: three tilted orbit ellipses round a small nucleus, electrons with comet trails (dimmer when behind) */
db1_reg('atomOrbit', false, function (ctx, bb, d) {
    var sc = ctx.sc, u = db1_u(ctx), ST = db1_settle(ctx), k, i;
    var R = jzClamp(jzU(ctx) * 0.072, 46 * u, 92 * u), fs = db1_fs(ctx) * 0.75, sp = db1_spot(ctx, bb, R * 2.3, R * 2.3 + fs * 1.6, d, 22 * u), a = sp.ok ? 1 : 0.35;
    var cx = sp.cx, cy = sp.y + R * 1.15, ac = db1_acc(sc), lw = Math.max(1, 1.1 * u), ry = R * 0.34, dir = d.right ? 1 : -1;
    // arc-length fraction of the ellipse path (AE starts it at the top, clockwise) every 10° of the parametric angle
    var F = [0], tot = 0, acc = [], px = 0, py = -ry;
    for (i = 1; i <= 360; i++) { var an = (-90 + i) * DB1_D, x = Math.cos(an) * R, y = Math.sin(an) * ry; tot += Math.sqrt((x - px) * (x - px) + (y - py) * (y - py)); acc.push(tot); px = x; py = y; }
    for (i = 1; i <= 36; i++) F.push(jzN(acc[i * 10 - 1] / tot));
    var FR = 'var FF=[' + F.join(',') + '];function fr(a){var x=((a+90)%360+360)%360/10,i=Math.floor(x),g=x-i;return FF[i]+(FF[Math.min(36,i+1)]-FF[i])*g;}';
    var N = jzShapeLayer(ctx, 'atom nucleus', cx, cy), gn = jzGrp(N, 'nucleus');
    var gr = db1_sub(gn, 'ring'); jzAddEllipse(gr, 26 * u, 26 * u); db1_st(gr, sc.sub, Math.max(1, 0.8 * u), 50);
    var gf = db1_sub(gn, 'fg'); jzAddEllipse(gf, 10 * u, 10 * u, 2.5 * u, -2.75 * u); jzAddEllipse(gf, 10 * u, 10 * u, -2.5 * u, 2.5 * u); jzAddFill(gf, sc.fg);
    var ga = db1_sub(gn, 'acc'); jzAddEllipse(ga, 10 * u, 10 * u, -3 * u, -1.5 * u); jzAddEllipse(ga, 10 * u, 10 * u, 3 * u, 1.75 * u); jzAddFill(ga, ac);
    db1_gx(ctx, gn, 'ADBE Vector Scale', ST, 'var q=cl((t-0.1)/0.35),s=(q<=0?0:ob(q,2))*(1+0.06*Math.sin(t*6));[100*s,100*s]');
    jzXf(N, 'ADBE Opacity').setValue(a * 100); db1_op(ctx, N, ST);
    var S = jzShapeLayer(ctx, 'atom orbits', cx, cy);
    for (k = 2; k >= 0; k--) {
        var w = (1.4 + k * 0.35) * (k % 2 ? -1 : 1), ph = db1_r(d.seed, k) * 360, span = 0.28 * Math.abs(w) * 90, col = k === 0 ? ac : sc.fg;
        var AN = 'var an=' + jzN(ph) + '+t*' + jzN(w * 90) + ',z=Math.sin(an*Math.PI/180);';
        var g = jzGrp(S, 'orbit ' + (k + 1));
        db1_gx(ctx, g, 'ADBE Vector Rotation', ST, jzN((d.r || 0) * 180 + k * 60) + '+t*' + (5 * dir));
        var ge = db1_sub(g, 'electron'), el = jzAddEllipse(ge, 7.6 * u, 7.6 * u);
        jzSetExpr(el.property('ADBE Vector Ellipse Position'), db1_H(ctx, ST) + AN + '[' + jzN(R) + '*Math.cos(an*Math.PI/180),' + jzN(ry) + '*z]');
        jzSetExpr(el.property('ADBE Vector Ellipse Size'), db1_H(ctx, ST) + AN + 'var r=z<0?' + jzN(2.6 * u) + ':' + jzN(3.8 * u) + ';[2*r,2*r]');
        jzAddFill(ge, col);
        var gt = db1_sub(g, 'trail'); jzAddEllipse(gt, R * 2, ry * 2);
        var lo = w > 0 ? 'an-' + jzN(span) : 'an', hi = w > 0 ? 'an' : 'an+' + jzN(span);
        db1_trim(ctx, gt, ST, '100*(DD<0?DD+1:DD)', null, '360*fr(' + lo + ')', AN + FR + 'var DD=fr(' + hi + ')-fr(' + lo + ');');
        db1_st(gt, col, 1.8 * u, 45, 2);
        db1_gop(ctx, ge, ST, '(ioc((t-' + jzN(k * 0.07) + ')/0.45)>=0.9?1:0)*(z<0?0.45:1)', AN);
        db1_gop(ctx, gt, ST, '(ioc((t-' + jzN(k * 0.07) + ')/0.45)>=0.9?1:0)*(z<0?0.45:1)', AN);
        var go = db1_sub(g, 'orbit'); jzAddEllipse(go, R * 2, ry * 2);
        var to = db1_trim(ctx, go, ST, '100*ioc((t-' + jzN(k * 0.07) + ')/0.45)'); to.property('ADBE Vector Trim Offset').setValue(90);
        db1_st(go, sc.fg, lw, 55);
    }
    jzXf(S, 'ADBE Opacity').setValue(a * 100); db1_op(ctx, S, ST);
    var T = db1_label(ctx, 'ORB-3  e⁻3', cx, cy + R * 1.15 + fs * 0.4, { size: fs, align: 'center', track: 0.2, alpha: a }); db1_op(ctx, T, ST, 'oe((t-0.5)/0.3)');
});

/* ---- sonarArcs — 音波: sound-wave arcs radiating outward from both sides of the lyric (above / below for vertical text) */
db1_reg('sonarArcs', false, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db1_u(ctx), m = db1_mg(ctx), ST = db1_settle(ctx), i, k;
    var cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, roomH = Math.min(bb.x0, W - bb.x1) - m * 0.5, roomV = Math.min(bb.y0, H - bb.y1) - m * 0.5;
    var vert = db1_isVert(bb);
    if ((vert ? db1_bh(bb) / H : db1_bw(bb) / W) > 0.66 && (vert ? roomH : roomV) > 60 * u) vert = !vert;
    var g0 = 16 * u + (vert ? db1_bw(bb) : db1_bh(bb)) * 0.04, ac = db1_acc(sc), span = vert ? 40 : 34;
    var sides = vert ? [[cx, bb.y0 - g0, -90, bb.y0 - g0 - m * 0.5], [cx, bb.y1 + g0, 90, H - m * 0.5 - bb.y1 - g0]]
        : [[bb.x0 - g0, cy, 180, bb.x0 - g0 - m * 0.5], [bb.x1 + g0, cy, 0, W - m * 0.5 - bb.x1 - g0]];
    var S = jzShapeLayer(ctx, 'sonar arcs', 0, 0);
    for (i = 0; i < 2; i++) {
        var ex = sides[i][0], ey = sides[i][1], dr = sides[i][2], room = sides[i][3];
        if (room < 30 * u) continue;
        var rM = Math.min(room, 190 * u), r0 = 8 * u, g = jzGrp(S, 'side ' + (i + 1));
        jzGX(g).property('ADBE Vector Position').setValue([ex, ey]);
        var gd = db1_sub(g, 'dot'), ed = jzAddEllipse(gd, 4.4 * u, 4.4 * u); jzAddFill(gd, ac);
        jzSetExpr(ed.property('ADBE Vector Ellipse Size'), db1_H(ctx, ST) + 'var r=' + jzN(2.2 * u) + '*oc(t/0.4);[2*r,2*r]');
        var gs = db1_sub(g, 'speaker');
        for (k = 1; k <= 2; k++) jzAddPath(gs, db1_arc(0, 0, k * 7 * u, dr - span * 1.2, dr + span * 1.2, 12), false);
        db1_st(gs, sc.sub, Math.max(1, 1.2 * u), 80, 2);
        db1_gx(ctx, gs, 'ADBE Vector Scale', ST, 'var e=oc(t/0.4);[100*e,100*e]');
        for (k = 0; k < 4; k++) {
            var P = 'var LN=0.62,sn=((t%LN)+LN)%LN,p=(sn+' + k + '*LN)/(LN*4),al=Math.pow(1-p,1.3),r=(' + jzN(r0) + '+' + jzN(rM - r0) + '*oc(p))*oc(t/0.4);';
            var gw = db1_sub(g, 'wave ' + (k + 1)), ew = jzAddEllipse(gw, 20, 20);
            jzSetExpr(ew.property('ADBE Vector Ellipse Size'), db1_H(ctx, ST) + P + '[2*r,2*r]');
            var tr = db1_trim(ctx, gw, ST, jzN(2 * span / 3.6)); tr.property('ADBE Vector Trim Offset').setValue(dr - span + 90);
            var st = db1_st(gw, sc.fg, 1.6 * u, 60, 2);
            jzSetExpr(st.property('ADBE Vector Stroke Color'), db1_H(ctx, ST) + P + '(al>0.66?' + db1_cx(ac) + ':' + db1_cx(sc.fg) + ')');
            jzSetExpr(st.property('ADBE Vector Stroke Width'), db1_H(ctx, ST) + P + '(al>0.66?' + jzN(2.4 * u) + ':al>0.33?' + jzN(1.6 * u) + ':' + jzN(1.1 * u) + ')');
            jzSetExpr(st.property('ADBE Vector Stroke Opacity'), db1_H(ctx, ST) + P + '(al>0.66?95:al>0.33?60:30)');
        }
    }
    db1_op(ctx, S, ST);
});

/* ---- circuit — 回路: circuit traces routed with 45° bends from a screen edge toward the lyric, pads, vias and travelling pulses */
db1_reg('circuit', false, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db1_u(ctx), ST = db1_settle(ctx), i, j;
    var gap = 18 * u + Math.min(db1_bw(bb), db1_bh(bb)) * 0.05, rooms = { l: bb.x0 - gap, r: W - bb.x1 - gap, t: bb.y0 - gap, b: H - bb.y1 - gap };
    var order = ['l', 'r', 't', 'b'];
    for (i = 1; i < order.length; i++) for (j = i; j > 0 && rooms[order[j]] > rooms[order[j - 1]]; j--) { var tp = order[j]; order[j] = order[j - 1]; order[j - 1] = tp; }
    var pref = d.right ? 'r' : 'l';
    if (rooms[pref] > 140 * u) { var o2 = [pref]; for (i = 0; i < order.length; i++) if (order[i] !== pref) o2.push(order[i]); order = o2; }
    var sides = [order[0]]; if (d.big && rooms[order[1]] > 140 * u) sides.push(order[1]);
    var ac = db1_acc(sc), lw = Math.max(1, 1.3 * u), S = jzShapeLayer(ctx, 'circuit', 0, 0), si;
    for (si = 0; si < sides.length; si++) {
        var side = sides[si], sEnd = rooms[side]; if (sEnd < 70 * u) continue;
        var horiz = side === 'l' || side === 'r';
        var tc = horiz ? jzClamp((bb.y0 + bb.y1) / 2, 60 * u, H - 60 * u) : jzClamp((bb.x0 + bb.x1) / 2, 60 * u, W - 60 * u);
        var across = horiz ? db1_bh(bb) : db1_bw(bb), n = 4 + ((d.n | 0) % 3), pe = jzClamp(across / n, 10 * u, 22 * u), ps = pe * (1.6 + (d.r || 0) * 0.8);
        var Mp = function (s, t) { return side === 'l' ? [s, t] : side === 'r' ? [W - s, t] : side === 't' ? [t, s] : [t, H - s]; };
        var gP = jzGrp(S, 'pads ' + (si + 1)), gX = jzGrp(S, 'pulses ' + (si + 1)), gR = jzGrp(S, 'traces ' + (si + 1));
        for (i = 0; i < n; i++) {
            var c = i - (n - 1) / 2, t0 = tc + c * ps + db1_rs(d.seed, i, 1) * 3 * u, t1 = tc + c * pe, dd = Math.abs(t1 - t0);
            var sm = sEnd * (0.45 + 0.15 * db1_rs(d.seed, si, 2)), sa = Math.max(10 * u, sm - dd / 2);
            var pts = [Mp(-6 * u, t0), Mp(sa, t0), Mp(sa + dd, t1), Mp(sEnd - (i % 2 ? 14 * u : 0), t1)];
            var gt = db1_sub(gR, 'trace ' + (i + 1)); jzAddPath(gt, pts, false);
            db1_trim(ctx, gt, ST, '100*ioc((t-' + jzN(i * 0.06 + si * 0.1) + ')/0.6)');
            var TT = 1.3 + db1_r(d.seed, i, 5) * 0.8, D0 = 0.7 + db1_r(d.seed, i, 6) * TT;
            var gp = db1_sub(gX, 'pulse ' + (i + 1)); jzAddPath(gp, pts, false);
            db1_trim(ctx, gp, ST, '100*ph', '100*Math.max(0,ph-0.1)', null, 'var x=(t-' + jzN(D0) + ')/' + jzN(TT) + ',ph=(t<0.7||x<0)?0:x-Math.floor(x);');
            db1_st(gp, ac, 2.4 * u, null, 2);
            var gd = db1_sub(gP, 'pad ' + (i + 1)), gd1 = db1_sub(gd, 'dot'), gd2 = db1_sub(gd, 'ring');
            jzGX(gd).property('ADBE Vector Position').setValue(pts[3]);
            jzAddEllipse(gd1, 3.2 * u, 3.2 * u); jzAddFill(gd1, ac);
            jzAddEllipse(gd2, 8 * u, 8 * u); db1_st(gd2, sc.fg, Math.max(1, 1.2 * u));
            db1_gx(ctx, gd, 'ADBE Vector Scale', ST, 'var e=oe((t-0.55)/0.3);[100*e,100*e]');
            if (dd > 3 * u) {
                var gv = db1_sub(gP, 'via ' + (i + 1)); jzAddEllipse(gv, 5.2 * u, 5.2 * u); db1_st(gv, sc.sub, Math.max(1, u), 80);
                jzGX(gv).property('ADBE Vector Position').setValue(pts[1]);
                db1_gx(ctx, gv, 'ADBE Vector Scale', ST, 'var e=oe((t-0.55)/0.3);[100*e,100*e]');
            }
        }
        db1_st(gR, sc.sub, lw, 85, 1, 1);
    }
    db1_op(ctx, S, ST);
});

// ================================================================ print & stationery

/* ---- swatches — 色見本: a printer's colour-control strip built from the scheme: solids over 50 % tints, with codes and a register mark */
db1_reg('swatches', false, function (ctx, bb, d) {
    var sc = ctx.sc, u = db1_u(ctx), ST = db1_settle(ctx), i;
    var all = [[sc.accent, 'ACC'], [sc.accent2, 'AC2'], [sc.fg, 'FG'], [sc.sub, 'SUB'], [sc.ink, 'INK'], [sc.dim, 'DIM']], seen = {}, cols = [];
    for (i = 0; i < all.length; i++) { if (!all[i][0]) continue; var hx = String(all[i][0]).toUpperCase(); if (seen[hx]) continue; seen[hx] = 1; cols.push(all[i]); }
    var sq = jzClamp(jzU(ctx) * 0.037, 24 * u, 44 * u), g = 2 * u, fs = db1_fs(ctx) * 0.7, n = Math.min(6, cols.length), w = n * (sq + g) + sq * 1.4, h = sq * 1.7 + fs * 3.4;
    var P2 = jzCopy(d); P2.low = d.low || d.corner;
    var sp = db1_spot(ctx, bb, w, h, P2, 24 * u), a = sp.ok ? 1 : 0.35, x0 = sp.x, y0 = sp.y + fs * 1.6, lw = Math.max(1, u);
    var T0 = db1_label(ctx, 'COLOR BAR  ' + db1_pad(n), x0, sp.y + fs * 0.6, { size: fs, track: 0.2, alpha: a }); db1_op(ctx, T0, ST, 'oe(t/0.3)');
    var S = jzShapeLayer(ctx, 'swatches', 0, 0);
    var rx = x0 + n * (sq + g) + sq * 0.7, ry = y0 + sq * 0.85, rr = sq * 0.42;
    var gm = jzGrp(S, 'register'), gm1 = db1_sub(gm, 'cross'), gm2 = db1_sub(gm, 'circle');
    jzAddPath(gm1, [[-rr * 1.5, 0], [rr * 1.5, 0]], false); jzAddPath(gm1, [[0, -rr * 1.5], [0, rr * 1.5]], false); db1_st(gm1, sc.fg, lw);
    db1_gx(ctx, gm1, 'ADBE Vector Scale', ST, 'var e=oe((t-0.3)/0.4);[100*e,100*e]');
    db1_arcTrim(ctx, gm2, rr, 0, 0, -90, ST, '360*oe((t-0.3)/0.4)'); db1_st(gm2, sc.fg, lw);
    jzGX(gm).property('ADBE Vector Position').setValue([rx, ry]);
    for (i = 0; i < n; i++) {
        var c = cols[i][0], x = x0 + i * (sq + g), gs = jzGrp(S, cols[i][1]);
        if (jzContrast(c, sc.bg) < 1.3) { var go = db1_sub(gs, 'outline'); jzAddRect(go, sq, sq, 0, sq / 2, sq / 2); db1_st(go, sc.sub, lw, 60); db1_gx(ctx, go, 'ADBE Vector Scale', ST, '[100,100*oe((t-' + jzN(0.05 + i * 0.06) + ')/0.35)]'); }
        var g1 = db1_sub(gs, 'solid'); jzAddRect(g1, sq, sq, 0, sq / 2, sq / 2); jzAddFill(g1, c);
        db1_gx(ctx, g1, 'ADBE Vector Scale', ST, '[100,100*oe((t-' + jzN(0.05 + i * 0.06) + ')/0.35)]');
        var g2 = db1_sub(gs, 'tint'); jzAddRect(g2, sq, sq * 0.7, 0, sq / 2, sq * 0.35); jzAddFill(g2, jzMixHex(sc.bg, c, 0.5));
        jzGX(g2).property('ADBE Vector Position').setValue([0, sq + g]);
        db1_gx(ctx, g2, 'ADBE Vector Scale', ST, '[100,100*oe((t-' + jzN(0.25 + i * 0.06) + ')/0.35)]');
        jzGX(gs).property('ADBE Vector Position').setValue([x, y0]);
        // code + hex in one two-line text (second line smaller, in fg)
        var key = cols[i][1], hexs = String(c).replace('#', '').toUpperCase().substr(0, 6);
        var T = jzText(ctx, key + '\r' + hexs, { font: jzMonoF(ctx), size: fs, color: sc.sub, x: x + sq / 2, y: y0 + sq * 1.7 + g + fs * 1.5, track: 0.05, leading: fs * 1.2, opacity: a });
        jzAnimator(T, 'JZ Hex', [['ADBE Text Scale 3D', [80, 80, 100]], ['ADBE Text Fill Color', jzHex(sc.fg)], ['ADBE Text Opacity', 80]], 'textIndex>' + key.length + '?100:0');
        db1_op(ctx, T, ST, 'oe((t-' + jzN(0.25 + i * 0.06) + ')/0.35)');
    }
    jzXf(S, 'ADBE Opacity').setValue(a * 100); db1_op(ctx, S, ST);
});

/* ---- ruledLines — 罫線ノート: faint notebook rules drawn on across the screen behind the lyric, a red margin line and a date header */
db1_reg('ruledLines', true, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db1_u(ctx), i;
    var s = jzClamp(jzU(ctx) * 0.078, 44 * u, 96 * u), dk = db1_dark(sc), lw = Math.max(1, 1.2 * u), al = dk ? 0.36 : 0.42, dotted = (d.v | 0) % 2 === 1;
    var y0 = s * 1.6 + (db1_r(d.seed, 1) - 0.5) * s * 0.4, rows = Math.floor((H - y0) / s);
    var S = jzShapeLayer(ctx, 'ruled lines', 0, 0);
    var mx = d.right ? W - W * 0.09 : W * 0.09, mc = db1_acc(sc), ma = dk ? 0.55 : 0.6;
    var gm = jzGrp(S, 'margin'); jzAddPath(gm, [[mx, 0], [mx, H]], false);
    if ((d.v | 0) % 3 === 2) { var gm2 = db1_sub(gm, 'margin 2'); jzAddPath(gm2, [[mx + (d.right ? -5 : 5) * u, 0], [mx + (d.right ? -5 : 5) * u, H]], false); db1_st(gm2, mc, lw, ma * 70); }
    db1_trim(ctx, gm, 0, '100*ioc((t-0.1)/0.7)'); db1_st(gm, mc, lw, ma * 100);
    for (i = 0; i <= rows && i < 40; i++) {
        var y = y0 + i * s, g = jzGrp(S, 'rule ' + (i + 1)); jzAddPath(g, [[0, y], [W, y]], false);
        db1_trim(ctx, g, 0, '100*ioc((t-' + jzN(i * 0.025) + ')/0.6)');
        var st = db1_st(g, sc.sub, dotted ? lw * 1.4 : lw, al * 100);
        if (dotted) db1_dash(st, 2 * u, 7 * u);
    }
    db1_op(ctx, S, 0);
    var fs = db1_fs(ctx) * 0.95, dd = 1 + db1_h(d.seed, 3) % 28, mm = 1 + db1_h(d.seed, 4) % 12;
    var T = db1_label(ctx, 'No.  ' + db1_pad((ctx.cut.line | 0) + 1) + '      Date   ' + db1_pad(mm) + ' . ' + db1_pad(dd), d.right ? W * 0.06 : W - W * 0.06, y0 - s * 0.35,
        { size: fs, align: d.right ? 'left' : 'right', track: 0.1, alpha: 0.6 });
    db1_op(ctx, T, 0, 'oe((t-0.4)/0.4)');
});

/* ---- registration — 見当合わせ: a registration target printed in three offset colours (screen / multiply) that slide into register */
db1_reg('registration', false, function (ctx, bb, d) {
    var sc = ctx.sc, u = db1_u(ctx), ST = db1_settle(ctx), k, i;
    var R = jzClamp(jzU(ctx) * 0.045, 28 * u, 56 * u), fs = db1_fs(ctx) * 0.72, sp = db1_spot(ctx, bb, R * 3.2, R * 3.2 + fs * 2, d, 22 * u), a = sp.ok ? 1 : 0.35;
    var cx = sp.cx, cy = sp.y + R * 1.6, cols = [db1_acc(sc), db1_acc2(sc), sc.fg], dirs = [[-1, -0.6], [0.9, -0.5], [0.1, 1]], lw = Math.max(1, 1.3 * u);
    var DX = 'var lk=oe((t-0.05)/0.9),jt=(t>1.2&&Math.floor(t/1.7)!==Math.floor((t-0.08)/1.7))?1:0,D=' + jzN(18 * u) + '*(1-lk)+jt*' + jzN(2.5 * u) + ';';
    function pie(a0) { var p = [[0, 0]], j; for (j = 0; j <= 8; j++) { var an = (a0 + j * 90 / 8) * DB1_D; p.push([Math.cos(an) * R * 0.32, Math.sin(an) * R * 0.32]); } return p; }
    for (k = 0; k < 3; k++) {
        var S = jzShapeLayer(ctx, 'registration ' + (k + 1), cx, cy), gp = jzGrp(S, 'pies'), gl = jzGrp(S, 'lines');
        jzAddPath(gp, pie(-90), true); jzAddPath(gp, pie(90), true); jzAddFill(gp, cols[k], 90);
        jzAddEllipse(gl, R * 1.96, R * 1.96); jzAddEllipse(gl, R * 1.24, R * 1.24);
        jzAddPath(gl, [[-R * 1.45, 0], [R * 1.45, 0]], false); jzAddPath(gl, [[0, -R * 1.45], [0, R * 1.45]], false);
        db1_st(gl, cols[k], lw, 90);
        jzSetExpr(jzXf(S, 'ADBE Position'), db1_H(ctx, ST) + DX + '[value[0]+' + jzN(dirs[k][0]) + '*D,value[1]+' + jzN(dirs[k][1]) + '*D]');
        jzSetExpr(jzXf(S, 'ADBE Scale'), db1_H(ctx, ST) + 'var e=ob(cl(t/0.35),1.4);[100*e,100*e]');
        S.blendingMode = db1_dark(sc) ? BlendingMode.SCREEN : BlendingMode.MULTIPLY;
        jzXf(S, 'ADBE Opacity').setValue(a * 100); db1_op(ctx, S, ST);
    }
    var ly = cy + R * 1.6 + fs * 0.5, OK = DX + 'var ok=lk>0.985&&!jt;';
    var T1 = db1_label(ctx, 'REG  OK', cx - R * 1.5, ly, { size: fs, track: 0.2, alpha: a });
    db1_srcText(ctx, T1, ST, OK + 'ok?"REG  OK":"REG"'); db1_txtCol(ctx, T1, db1_acc(sc), ST, OK + 'ok?100:0'); db1_op(ctx, T1, ST, 'oe((t-0.1)/0.3)');
    var T2 = db1_label(ctx, '±0.00mm', cx + R * 1.5, ly, { size: fs, align: 'right', color: sc.fg, track: 0.06, alpha: a });
    db1_srcText(ctx, T2, ST, OK + 'var dx=D/' + jzN(u) + '*0.1;ok?"±0.00mm":"ΔX "+(-dx).toFixed(2)+"  ΔY "+(-0.6*dx).toFixed(2)');
    db1_op(ctx, T2, ST, 'oe((t-0.1)/0.3)');
});

/* ---- punchHoles — パンチ穴: binder punch holes along a free screen edge, punched in one by one, reinforcement rings and a dimension */
db1_reg('punchHoles', false, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db1_u(ctx), m = db1_mg(ctx), i, k;
    var r = jzClamp(jzU(ctx) * 0.016, 10 * u, 19 * u), n = (d.v | 0) % 3 === 2 ? 3 : 2;
    var edges = (d.right ? ['r', 'l'] : ['l', 'r']).concat(d.low ? ['b', 't'] : ['t', 'b']), pick = null;
    for (i = 0; i < edges.length && !pick; i++) {
        var ed = edges[i], vE = ed === 'l' || ed === 'r', LL = vE ? H : W, spc = Math.min(LL * 0.3, 260 * u) * (n === 3 ? 0.8 : 1);
        var c = ed === 'l' ? m * 0.9 + r : ed === 'r' ? W - m * 0.9 - r : ed === 't' ? m * 0.9 + r : H - m * 0.9 - r;
        var span = spc * (n - 1) / 2 + r * 3, mid = vE ? H / 2 : W / 2;
        var box = vE ? [c - r * 5, mid - span, c + r * 5, mid + span] : [mid - span, c - r * 5, mid + span, c + r * 5];
        if (!db1_hit(box[0], box[1], box[2], box[3], bb, 6 * u)) pick = { ed: ed, vE: vE, spc: spc, c: c, mid: mid };
    }
    if (!pick) return;
    var vert = pick.vE, inward = pick.ed === 'r' || pick.ed === 'b' ? -1 : 1, lw = Math.max(1, 1.2 * u), T0 = jzN(Math.min(ctx.cut.inDur || 0, 0.6) * 0.9);
    function Pt(al, off) { return vert ? [pick.c + inward * off, al] : [al, pick.c + inward * off]; }
    var pos = []; for (i = 0; i < n; i++) pos.push(pick.mid + (i - (n - 1) / 2) * pick.spc);
    var LT = 'var lt=t-' + T0 + ';';
    var S = jzShapeLayer(ctx, 'punch holes', 0, 0);
    // dimension line + label
    var fs = db1_fs(ctx) * 0.72, a0 = pos[0], a1 = pos[n - 1], am = (a0 + a1) / 2, gp = fs * 2.4, off = r * 2.3, DE = 'oe((lt-0.4)/0.4)';
    var gD = jzGrp(S, 'dimension'), gD1 = db1_sub(gD, 'arms');
    jzAddPath(gD1, [Pt(am - gp, off), Pt(a0, off)], false); jzAddPath(gD1, [Pt(am + gp, off), Pt(a1, off)], false);
    db1_trim(ctx, gD1, 0, '100*' + DE, null, null, LT);
    var gD2 = db1_sub(gD, 'ends'); jzAddPath(gD2, [Pt(a0, off - 3 * u), Pt(a0, off + 3 * u)], false); jzAddPath(gD2, [Pt(a1, off - 3 * u), Pt(a1, off + 3 * u)], false);
    db1_st(gD, sc.sub, lw, 85); db1_gop(ctx, gD, 0, 'lt>0.4?1:0', LT);
    var lp = Pt(am, off), TL = db1_label(ctx, (n === 2 ? 80 : 108) + 'mm', lp[0], lp[1], { size: fs, align: 'center', rot: vert ? -90 : 0, track: 0.1 });
    db1_op(ctx, TL, 0, '(function(){' + LT + 'return ' + DE + ';})()');
    // holes, punched one by one
    for (i = n - 1; i >= 0; i--) {
        var P = Pt(pos[i], 0), Q = LT + 'var q=cl((lt-' + jzN(0.08 + i * 0.14) + ')/0.22);', gh = jzGrp(S, 'hole ' + (i + 1));
        jzGX(gh).property('ADBE Vector Position').setValue(P);
        var gb = db1_sub(gh, 'burst');
        for (k = 0; k < 6; k++) { var an = k * 60 * DB1_D + 0.3; jzAddPath(gb, [[Math.cos(an) * r * 1.3, Math.sin(an) * r * 1.3], [Math.cos(an) * (r * 1.3 + 5 * u), Math.sin(an) * (r * 1.3 + 5 * u)]], false); }
        db1_st(gb, db1_acc(sc), lw);
        db1_gx(ctx, gb, 'ADBE Vector Position', 0, Q + 'var dd=q*' + jzN(8 * u) + ';[0,0]');
        db1_gx(ctx, gb, 'ADBE Vector Scale', 0, Q + 'var s=1+q*' + jzN(8 * u / (r * 1.3)) + ';[100*s,100*s]');
        db1_gop(ctx, gb, 0, '(q>0&&q<1)?1-q:0', Q);
        var gc = db1_sub(gh, 'hole');
        var gs = db1_sub(gc, 'shade'); jzAddPath(gs, db1_arc(0, 0, r * 0.76, 200, 290, 12), false); db1_st(gs, sc.sub, 2 * u, 60);
        var go = db1_sub(gc, 'edge'); jzAddEllipse(go, r * 2, r * 2); db1_st(go, sc.fg, lw, 90);
        var gf = db1_sub(gc, 'fill'); jzAddEllipse(gf, r * 2, r * 2); jzAddFill(gf, sc.dim, 95);
        if ((d.v | 0) % 2 === 0) { var gr = db1_sub(gc, 'ring'); jzAddEllipse(gr, r * 3.7, r * 3.7); db1_st(gr, sc.sub, r * 0.75, 18); }
        db1_gx(ctx, gc, 'ADBE Vector Scale', 0, Q + 'var s=1+0.35*(1-oc(q));[100*s,100*s]');
        db1_gop(ctx, gc, 0, 'q', Q);
    }
    // dashed guide through the holes
    var g0 = Pt(0, r * 3.4), g1 = Pt(vert ? H : W, r * 3.4), gg = jzGrp(S, 'guide'); jzAddPath(gg, [g0, g1], false);
    db1_trim(ctx, gg, 0, '50+50*ioc(lt/0.7)', '50-50*ioc(lt/0.7)', null, LT);
    db1_dash(db1_st(gg, sc.sub, lw, 50), 6 * u, 6 * u);
    db1_op(ctx, S, 0, 't>' + T0 + '?1:0');
});

/* virtual "sheet" around the lyric: its corner lines (two offset sheets) — used by staple / paper clip; grows from the corner outward */
function db1_sheetCorner(ctx, S, X, Y, sx, sy, L, st, dur) {
    var u = db1_u(ctx), lw = Math.max(1, u), o = 5 * u, E = 'ioc(t/' + jzN(dur) + ')';
    var g2 = jzGrp(S, 'sheet 2'); jzAddPath(g2, [[X + sx * L * 0.8 + sx * o, Y + sy * o], [X + sx * o, Y + sy * o], [X + sx * o, Y + sy * L * 0.8 + sy * o]], false);
    db1_trim(ctx, g2, st, '50+50*' + E, '50-50*' + E); db1_st(g2, ctx.sc.sub, lw, 35);
    var g1 = jzGrp(S, 'sheet'); jzAddPath(g1, [[X + sx * L, Y], [X, Y], [X, Y + sy * L]], false);
    db1_trim(ctx, g1, st, '50+50*' + E, '50-50*' + E); db1_st(g1, ctx.sc.sub, lw, 80);
}

/* ---- staple — ホチキス: the lyric treated as a stapled sheet: paper-corner lines, a dog-ear, and a staple that snaps in diagonally */
db1_reg('staple', false, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db1_u(ctx), m = db1_mg(ctx), ST = db1_settle(ctx), i;
    var Ls = jzClamp(jzU(ctx) * 0.058, 38 * u, 70 * u), padP = Ls * 0.7 + 14 * u + db1_bh(bb) * 0.04, sx = d.right ? 1 : -1, sy = d.low ? 1 : -1;
    var X = jzClamp(sx < 0 ? bb.x0 - padP : bb.x1 + padP, m * 0.5, W - m * 0.5), Y = jzClamp(sy < 0 ? bb.y0 - padP : bb.y1 + padP, m * 0.5, H - m * 0.5);
    var L = Math.min(Ls * 3.4, Math.max(db1_bw(bb), db1_bh(bb)) * 0.45);
    var F = jzShapeLayer(ctx, 'staple sheet', 0, 0);
    var dd = Ls * 0.3, cx = X - sx * dd, cy = Y - sy * dd, ang = sx * sy > 0 ? -45 : 45, Q = 'var q=cl((t-0.3)/0.18);';
    var gk = jzGrp(F, 'impact');
    for (i = 0; i < 4; i++) { var an = (ang + 90 + (i < 2 ? 0 : 180) + (i % 2 ? 28 : -28)) * DB1_D; jzAddPath(gk, [[Math.cos(an) * 9 * u, Math.sin(an) * 9 * u], [Math.cos(an) * 16 * u, Math.sin(an) * 16 * u]], false); }
    db1_st(gk, db1_acc(sc), Math.max(1, 1.4 * u), null, 2);
    jzGX(gk).property('ADBE Vector Position').setValue([cx, cy]);
    db1_gx(ctx, gk, 'ADBE Vector Scale', ST, Q + 'var s=1+q*' + jzN(12 / 9) + ';[100*s,100*s]');
    db1_gop(ctx, gk, ST, '(q>0&&q<1)?1-q:0', Q);
    if ((d.v | 0) % 2 === 1) {
        var X2 = sx < 0 ? bb.x1 + padP * 0.6 : bb.x0 - padP * 0.6, Y2 = sy < 0 ? bb.y1 + padP * 0.6 : bb.y0 - padP * 0.6, f = Ls * 0.7;
        if (X2 > m * 0.5 && X2 < W - m * 0.5 && Y2 > m * 0.5 && Y2 < H - m * 0.5) {
            var gd = jzGrp(F, 'dog-ear'), gd1 = db1_sub(gd, 'fold'), gd2 = db1_sub(gd, 'edge');
            jzAddPath(gd1, [[X2 + sx * f, Y2], [X2 + sx * f, Y2 + sy * f], [X2, Y2 + sy * f]], false); db1_st(gd1, sc.sub, Math.max(1, u), 55);
            jzAddPath(gd2, [[X2 + sx * L * 0.7, Y2], [X2 + sx * f, Y2], [X2, Y2 + sy * f], [X2, Y2 + sy * L * 0.7]], false); db1_st(gd2, sc.sub, Math.max(1, u), 80);
            db1_trim(ctx, gd2, ST, '50+50*ioc(t/0.5)', '50-50*ioc(t/0.5)');
            db1_gop(ctx, gd, ST, 'oe((t-0.3)/0.4)');
        }
    }
    db1_sheetCorner(ctx, F, X, Y, -sx, -sy, L, ST, 0.5);
    db1_op(ctx, F, ST);
    // the staple
    var S = jzShapeLayer(ctx, 'staple', cx, cy), hl = Ls / 2, tt = 2.6 * u;
    var gl = jzGrp(S, 'legs'); jzAddRect(gl, 3 * u, tt * 3.2, 0, -hl, 0); jzAddRect(gl, 3 * u, tt * 3.2, 0, hl, 0); jzAddFill(gl, sc.fg, 80);
    var gh = jzGrp(S, 'highlight'); jzAddPath(gh, [[-hl + tt * 1.5, -tt * 0.3], [hl - tt * 1.5, -tt * 0.3]], false); db1_st(gh, sc.bg, Math.max(1, 0.8 * u), 45);
    var gb = jzGrp(S, 'body'); jzAddRect(gb, Ls, tt * 2, tt); jzAddFill(gb, sc.fg, 95);
    var gs = jzGrp(S, 'shadow'); jzAddRect(gs, Ls, tt * 2, tt, 2 * u, 2.5 * u); jzAddFill(gs, sc.sub, 30);
    jzSetExpr(jzXf(S, 'ADBE Rotate Z'), db1_H(ctx, ST) + Q + jzN(ang) + '+(1-q)*14');
    jzSetExpr(jzXf(S, 'ADBE Scale'), db1_H(ctx, ST) + Q + 'var s=1+0.6*(1-oc(q));[100*s,100*s]');
    db1_op(ctx, S, ST, 'cl(cl((t-0.3)/0.18)*3)');
});

/* ---- paperClip — クリップ: a gem paper clip drawn on in one wire stroke, clipping the top edge of the lyric's "sheet" */
var DB1_CLIP = (function () {
    var p = [], i;
    function seg(a, b) { for (var j = 0; j <= 6; j++) p.push([a[0] + (b[0] - a[0]) * j / 6, a[1] + (b[1] - a[1]) * j / 6]); }
    function arc(cx, cy, r, a0, a1) { for (var j = 0; j <= 14; j++) { var an = (a0 + (a1 - a0) * j / 14) * DB1_D; p.push([cx + Math.cos(an) * r, cy + Math.sin(an) * r]); } }
    seg([-0.2, 0.95], [-0.2, 2.45]); arc(0.05, 2.45, 0.25, 180, 0);
    seg([0.3, 2.45], [0.3, 0.42]); arc(-0.02, 0.42, 0.32, 0, -180);
    seg([-0.34, 0.42], [-0.34, 2.62]); arc(0.06, 2.62, 0.4, 180, 0);
    seg([0.46, 2.62], [0.46, 0.85]);
    for (i = 0; i < p.length; i++) p[i] = [p[i][0], p[i][1] - 1.5];
    return p;
})();
db1_reg('paperClip', false, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db1_u(ctx), m = db1_mg(ctx), ST = db1_settle(ctx), i;
    var S0 = jzClamp(jzU(ctx) * 0.035, 22 * u, 40 * u), hc = S0 * 3.3, low = !!d.low && H - bb.y1 > hc * 1.2 + m;
    var padP = hc * 0.42 + 10 * u + db1_bh(bb) * 0.03, Y = low ? bb.y1 + padP : Math.max(m * 0.5 + hc * 0.55, bb.y0 - padP), sy = low ? 1 : -1, sx = d.right ? 1 : -1;
    var Xc = jzClamp(sx < 0 ? bb.x0 - 26 * u - db1_bw(bb) * 0.02 : bb.x1 + 26 * u + db1_bw(bb) * 0.02, m * 0.5, W - m * 0.5), L = Math.min(S0 * 7, Math.max(db1_bw(bb) * 0.45, S0 * 4));
    var F = jzShapeLayer(ctx, 'clip sheet', 0, 0); db1_sheetCorner(ctx, F, Xc, Y, -sx, -sy, L, ST, 0.45); db1_op(ctx, F, ST);
    var cx = jzClamp(Xc - sx * L * 0.42, m, W - m), tilt = sx * 7 + db1_rs(d.seed, 1) * 5, cy = Y + sy * hc * 0.12, pts = [];
    for (i = 0; i < DB1_CLIP.length; i++) pts.push([DB1_CLIP[i][0] * S0, (low ? -DB1_CLIP[i][1] : DB1_CLIP[i][1]) * S0]);
    var S = jzShapeLayer(ctx, 'paper clip', cx, cy);
    jzXf(S, 'ADBE Rotate Z').setValue(tilt);
    jzSetExpr(jzXf(S, 'ADBE Position'), db1_H(ctx, ST) + '[value[0],value[1]-(' + sy + ')*(1-oc((t-0.1)/0.45))*' + jzN(24 * u) + ']');
    var gh = jzGrp(S, 'highlight'); jzAddPath(gh, db1_off(pts, -0.8 * u, -0.8 * u), false);
    db1_trim(ctx, gh, ST, '100*ioc((t-0.1)/0.6)'); db1_st(gh, sc.bg, Math.max(1, 0.7 * u), 35, 2, 2);
    var gw = jzGrp(S, 'wire'); jzAddPath(gw, pts, false);
    db1_trim(ctx, gw, ST, '100*ioc((t-0.1)/0.6)'); db1_st(gw, sc.fg, Math.max(1.4, 2.1 * u), 95, 2, 2);
    db1_op(ctx, S, ST);
});

/* ---- indexTabs — 見出しタブ: binder index tabs sliding out of a free screen edge; the current line's tab sticks out in the accent */
db1_reg('indexTabs', false, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db1_u(ctx), i;
    var n = 5, th = jzClamp(jzU(ctx) * 0.066, 42 * u, 76 * u), tw = th * 0.8, g = 6 * u, fs = db1_fs(ctx) * 1.05, span = n * th + (n - 1) * g;
    var edges = (d.right ? ['r', 'l'] : ['l', 'r']).concat(['t', 'b']), pick = null;
    for (i = 0; i < edges.length && !pick; i++) {
        var ed = edges[i], vE = ed === 'l' || ed === 'r', mid = vE ? H * (d.low ? 0.58 : 0.42) : W / 2, depth = tw + 22 * u;
        var box = ed === 'l' ? [0, mid - span / 2, depth, mid + span / 2] : ed === 'r' ? [W - depth, mid - span / 2, W, mid + span / 2] : ed === 't' ? [mid - span / 2, 0, mid + span / 2, depth] : [mid - span / 2, H - depth, mid + span / 2, H];
        if ((vE ? H : W) > span + 40 * u && !db1_hit(box[0], box[1], box[2], box[3], bb, 26 * u)) pick = { ed: ed, vE: vE, mid: mid };
    }
    if (!pick) return;
    var E = pick.ed, cur = (((ctx.cut.line | 0) % n) + n) % n, T0 = jzN(Math.min(ctx.cut.inDur || 0, 0.6) * 0.9), ac = db1_acc(sc);
    var labs = [['01', '02', '03', '04', '05'], ['あ', 'か', 'さ', 'た', 'な'], ['A', 'B', 'C', 'D', 'E']][(d.v | 0) % 3];
    var S = jzShapeLayer(ctx, 'index tabs', 0, 0), sg = E === 'l' || E === 't' ? 1 : -1;
    for (i = n - 1; i >= 0; i--) {
        var isC = i === cur, Dm = tw + (isC ? 16 * u : 0), along = pick.mid - span / 2 + i * (th + g), ext = Dm + 12 * u;
        var Q = 'var lt=t-' + T0 + ',q=cl((lt-' + jzN(i * 0.06) + ')/0.35),D=(q<=0?0:ob(q,1.3))*' + jzN(Dm) + ';';
        // the tab is a fixed rounded rect that slides out: its inner edge sits at depth D from the screen edge
        var gt = jzGrp(S, 'tab ' + (i + 1)), col = isC ? ac : sc.dim;
        if (pick.vE) jzAddRect(gt, ext, th, 6 * u, 0, 0); else jzAddRect(gt, th, ext, 6 * u, 0, 0);
        if (!isC) db1_st(gt, sc.sub, Math.max(1, u), 70);
        jzAddFill(gt, col, isC ? 95 : 90);
        var base = E === 'l' ? 'D-' + jzN(ext / 2) : E === 'r' ? jzN(W) + '-D+' + jzN(ext / 2) : E === 't' ? 'D-' + jzN(ext / 2) : jzN(H) + '-D+' + jzN(ext / 2);
        db1_gx(ctx, gt, 'ADBE Vector Position', 0, Q + (pick.vE ? '[' + base + ',' + jzN(along + th / 2) + ']' : '[' + jzN(along + th / 2) + ',' + base + ']'));
        var tc = isC ? (jzLum(col) > 0.55 ? '#000000' : sc.bg) : sc.fg, lb = labs[i];
        var T = jzText(ctx, lb, { font: lb.length > 1 ? jzMonoF(ctx) : jzBodyF(ctx), size: fs * (lb.length > 1 ? 1 : 1.15), color: tc, x: pick.vE ? 0 : along + th / 2, y: pick.vE ? along + th / 2 : 0, track: 0.04 });
        var tb = E === 'l' ? 'D-' + jzN(tw * 0.5) : E === 'r' ? jzN(W) + '-D+' + jzN(tw * 0.5) : E === 't' ? 'D-' + jzN(tw * 0.5) : jzN(H) + '-D+' + jzN(tw * 0.5);
        jzSetExpr(jzXf(T, 'ADBE Position'), db1_H(ctx, 0) + Q + (pick.vE ? '[' + tb + ',value[1]]' : '[value[0],' + tb + ']'));
        db1_op(ctx, T, 0, '(function(){' + Q + 'return cl((q<=0?0:ob(q,1.3)-0.5)*2);})()');
    }
    db1_op(ctx, S, 0, 't>' + T0 + '?1:0');
});
