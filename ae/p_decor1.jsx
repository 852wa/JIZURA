// ================================================================ decor pack 1 (AE port of 21 HUD / geometry decor entries in src/11p_decor.js)
// decor.build(ctx, bb, d): layers in the content comp (time 0 = cut start). Every entry follows the cut's exit through K (jzTH).
// The browser draws all of these on the main pass only (ghost off) -> jzNoGhost on every layer, except the pieces the browser
// ghosts (glitchRects' fg / accent slivers and triangleSpin's orbiting solid).

// ---------------------------------------------------------------- shared helpers (prefix dc1_)
// the browser's deterministic hash J.h / J.r / J.rs / J.rr (so placements match the web frame)
function dc1_h(a, b, c, d, e) {
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
function dc1_r(a, b, c, d, e) { return dc1_h(a, b, c, d, e) / 4294967296; }
function dc1_rs(a, b, c, d, e) { return dc1_r(a, b, c, d, e) * 2 - 1; }
function dc1_rr(lo, hi, a, b, c, d, e) { return lo + (hi - lo) * dc1_r(a, b, c, d, e); }
// sizes: browser U(env) = min(W, H) / 1080, MG = 5% safe margin, FS = small label size
function dc1_u(ctx) { return jzU(ctx) / 1080; }
function dc1_mg(ctx) { return Math.round(jzU(ctx) * 0.05); }
function dc1_fs(ctx) { return Math.max(12, 16 * dc1_u(ctx)); }
function dc1_len(x, y) { return Math.sqrt(x * x + y * y); }
function dc1_p(n, k) { return jzPad(Math.max(0, Math.floor(n)), k || 2); }          // browser pad2
// browser getBB: lyric box clamped to the frame (+10%), centred box when missing
function dc1_bb(ctx, bb) {
    var W = ctx.W, H = ctx.H;
    if (!bb || !(bb.x1 > bb.x0) || !(bb.y1 > bb.y0)) bb = { x0: W * 0.35, x1: W * 0.65, y0: H * 0.4, y1: H * 0.6 };
    var b = { x0: Math.max(bb.x0, -W * 0.1), x1: Math.min(bb.x1, W * 1.1), y0: Math.max(bb.y0, -H * 0.1), y1: Math.min(bb.y1, H * 1.1) };
    if (b.x1 <= b.x0) { b.x0 = bb.x0; b.x1 = bb.x1; }
    if (b.y1 <= b.y0) { b.y0 = bb.y0; b.y1 = bb.y1; }
    b.cx = (b.x0 + b.x1) / 2; b.cy = (b.y0 + b.y1) / 2; b.w = b.x1 - b.x0; b.h = b.y1 - b.y0;
    return b;
}
function dc1_hit(x0, y0, x1, y1, bb, pad) { pad = pad || 0; return !(x1 < bb.x0 - pad || x0 > bb.x1 + pad || y1 < bb.y0 - pad || y0 > bb.y1 + pad); }
// browser cornerSpot: a screen corner (inside the margin) clear of the lyric -> { x, y, cx, cy, ok, sx, sy }
function dc1_corner(ctx, bb, w, h, d, mk) {
    var W = ctx.W, H = ctx.H, m = dc1_mg(ctx) * (mk || 1), sx0 = d.right ? 1 : -1, sy0 = d.low ? 1 : -1;
    var order = [[sx0, sy0], [-sx0, sy0], [sx0, -sy0], [-sx0, -sy0]], best = null, bestA = 1e18, i;
    for (i = 0; i < 4; i++) {
        var sx = order[i][0], sy = order[i][1], X = sx > 0 ? W - m - w : m, Y = sy > 0 ? H - m - h : m;
        if (!dc1_hit(X, Y, X + w, Y + h, bb, 8)) return { x: X, y: Y, cx: X + w / 2, cy: Y + h / 2, ok: true, sx: sx, sy: sy };
        var ov = Math.max(0, Math.min(X + w, bb.x1) - Math.max(X, bb.x0)) * Math.max(0, Math.min(Y + h, bb.y1) - Math.max(Y, bb.y0));
        if (ov < bestA) { bestA = ov; best = { x: X, y: Y, cx: X + w / 2, cy: Y + h / 2, ok: false, sx: sx, sy: sy }; }
    }
    return best;
}
// browser nearBB: a w x h box next to the lyric (outside it, inside the safe margin), else a corner
function dc1_near(ctx, bb, w, h, d, gap) {
    var W = ctx.W, H = ctx.H, m = dc1_mg(ctx) * 0.8, sx0 = d.right ? 1 : -1, sy0 = d.low ? 1 : -1, i;
    var order = d.corner ? [[sx0, sy0], [-sx0, sy0], [sx0, -sy0], [-sx0, -sy0]] : [[sx0, sy0], [sx0, -sy0], [-sx0, sy0], [-sx0, -sy0]], tries = [];
    for (i = 0; i < 4; i++) {
        var sx = order[i][0], sy = order[i][1];
        var ax = sx > 0 ? bb.x1 - w : bb.x0, ox = sx > 0 ? bb.x1 + gap : bb.x0 - gap - w;
        var ay = sy > 0 ? bb.y1 + gap : bb.y0 - gap - h, iy = sy > 0 ? bb.y1 - h : bb.y0;
        if ((d.v | 0) % 2) tries.push([ox, iy, sx, sy], [ax, ay, sx, sy], [ox, ay, sx, sy]);
        else tries.push([ax, ay, sx, sy], [ox, iy, sx, sy], [ox, ay, sx, sy]);
    }
    for (i = 0; i < tries.length; i++) {
        var X = jzClamp(tries[i][0], m, Math.max(m, W - m - w)), Y = jzClamp(tries[i][1], m, Math.max(m, H - m - h));
        if (!dc1_hit(X, Y, X + w, Y + h, bb, gap * 0.4)) return { x: X, y: Y, cx: X + w / 2, cy: Y + h / 2, ok: true, sx: tries[i][2], sy: tries[i][3] };
    }
    return dc1_corner(ctx, bb, w, h, d);
}
// expression headers: jzTH (DUR IN OS OD SD, easings, PO, K) + ioc (inOutCubic) + T = song time, ST = 12 fps step
var DC1_X = 'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}';
function dc1_hd(ctx) { return jzTH(ctx) + DC1_X + 'var T=time+' + jzN(ctx.cut.start || 0) + ',ST=Math.floor(T*12+1e-6);\n'; }
// light header for many small per-group expressions (PO, ST, SD, cl, ic, hh)
function dc1_lh(ctx) {
    var c = ctx.cut, hard = c.outDur != null && c.outDur <= 0, od = hard ? 0.05 : Math.max(0.12, c.outDur || 0.15);
    return 'var OS=' + jzN(hard ? c.dur : c.dur - od) + ',OD=' + jzN(od) + ',SD=' + (c.seed % 99991) + ',T=time+' + jzN(c.start || 0) + ';' +
        'function cl(x){return Math.max(0,Math.min(1,x));}function ic(x){x=cl(x);return x*x*x;}function hh(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);}' +
        'var PO=cl((time-OS)/OD),ST=Math.floor(T*12+1e-6);';
}
// layer opacity = a * K * factor(expression)
function dc1_op(ctx, L, f, a) {
    if (a != null) jzXf(L, 'ADBE Opacity').setValue(Math.max(0, Math.min(100, a * 100)));
    jzSetExpr(jzXf(L, 'ADBE Opacity'), dc1_hd(ctx) + 'value*K*(' + (f || '1') + ')');
    return L;
}
// browser label(): small mono text, never ghosted. o: size, align, color, font, track, rot, a (alpha), f (fade factor expr), expr (sourceText expr)
function dc1_label(ctx, text, x, y, o) {
    o = o || {};
    var L = jzText(ctx, String(text), { font: o.font || jzMonoF(ctx), size: o.size || dc1_fs(ctx), color: o.color || ctx.sc.sub, x: x, y: y, align: o.align || 'left', track: o.track != null ? o.track : 0.08, name: o.name });
    if (o.rot) jzXf(L, 'ADBE Rotate Z').setValue(o.rot);
    if (o.expr) jzSetExpr(L.property('ADBE Text Properties').property('ADBE Text Document'), dc1_hd(ctx) + o.expr);
    jzNoGhost(L);
    dc1_op(ctx, L, o.f, o.a);
    return L;
}
// several short labels in ONE text layer: line k holds strs[k]; per-glyph offsets move it to pts[k] (x by align, y = centre)
function dc1_lines(ctx, strs, pts, o) {
    var fs = o.size, LD = fs * 1.2, k, j, offs = [];
    var L = jzText(ctx, strs.join('\r'), { font: o.font || jzMonoF(ctx), size: fs, color: o.color || ctx.sc.sub, x: 0, y: 0, align: o.align || 'left', track: o.track != null ? o.track : 0.08, leading: LD, name: o.name });
    jzXf(L, 'ADBE Anchor Point').setValue([0, -0.36 * fs]);
    jzXf(L, 'ADBE Position').setValue([pts[0][0], pts[0][1]]);
    for (k = 0; k < strs.length; k++) { var gl = jzGlyphs(strs[k]); for (j = 0; j < gl.length; j++) offs.push([pts[k][0] - pts[0][0], pts[k][1] - pts[0][1] - k * LD]); }
    if (strs.length > 1) jzCharOffsets(L, offs, 'JZ Place');
    jzNoGhost(L);
    dc1_op(ctx, L, o.f, o.a);
    return L;
}
function dc1_layer(ctx, name, x, y) { return jzNoGhost(jzShapeLayer(ctx, name, x || 0, y || 0)); }
function dc1_sub(g, name) { var q = jzVecs(g).addProperty('ADBE Vector Group'); if (name) q.name = name; return q; }
function dc1_seg(g, x0, y0, x1, y1) { return jzAddPath(g, [[x0, y0], [x1, y1]], false); }
function dc1_gset(g, mn, v) { jzGX(g).property(mn).setValue(v); }
function dc1_gexp(ctx, g, mn, ex) { jzSetExpr(jzGX(g).property(mn), dc1_hd(ctx) + ex); }
function dc1_sexp(ctx, prop, ex) { jzSetExpr(prop, dc1_hd(ctx) + ex); }
function dc1_trim(ctx, g, endEx, startEx) { return jzAddTrimPaths(g, endEx ? dc1_hd(ctx) + endEx : null, startEx ? dc1_hd(ctx) + startEx : null); }
function dc1_cap(st) { try { st.property('ADBE Vector Stroke Line Cap').setValue(2); st.property('ADBE Vector Stroke Line Join').setValue(2); } catch (e) {} return st; }
function dc1_col(hex) { var c = jzHex(hex); return '[' + jzN(c[0]) + ',' + jzN(c[1]) + ',' + jzN(c[2]) + ',1]'; }
// repeater at the end of group g: n copies, each offset by (px, py) and rot degrees around the group origin
function dc1_rep(g, n, px, py, rot) {
    var rp = jzVecs(g).addProperty('ADBE Vector Filter - Repeater'), idx = rp.propertyIndex;
    rp = jzVecs(g).property(idx);
    rp.property('ADBE Vector Repeater Copies').setValue(n);
    var rt = rp.property('ADBE Vector Repeater Transform');
    rt.property('ADBE Vector Repeater Position').setValue([px || 0, py || 0]);
    if (rot) rt.property('ADBE Vector Repeater Rotation').setValue(rot);
    return rp;
}
// open bezier arc (degrees, clockwise on screen, 0 = right) - starts where the browser's arcs start
function dc1_arc(g, cx, cy, r, a0, a1) {
    var n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 90)), da = (a1 - a0) / n * Math.PI / 180, k = 4 / 3 * Math.tan(da / 4) * r, v = [], it = [], ot = [];
    for (var i = 0; i <= n; i++) {
        var a = a0 * Math.PI / 180 + da * i, c = Math.cos(a), s = Math.sin(a);
        v.push([cx + c * r, cy + s * r]); it.push([s * k, -c * k]); ot.push([-s * k, c * k]);
    }
    var sh = new Shape(); sh.vertices = v; sh.inTangents = it; sh.outTangents = ot; sh.closed = false;
    var p = jzVecs(g).addProperty('ADBE Vector Shape - Group'); p.property('ADBE Vector Shape').setValue(sh);
    return p;
}
// dashed stroke (AE starts with an empty Dashes group; the preview model has fixed children).
// The dash is set before the gap is added: adding the gap invalidates a held reference to the dash in AE.
function dc1_dashItem(D, mn, v) {
    var p = null;
    try { p = D.addProperty(mn); } catch (e) { p = null; }
    if (!p) { try { p = D.property(mn); } catch (e1) { p = null; } }
    if (p) p.setValue(v);
}
function dc1_dash(st, dl, gp) {
    var D = st.property('ADBE Vector Stroke Dashes');
    dc1_dashItem(D, 'ADBE Vector Stroke Dash 1', dl);
    dc1_dashItem(D, 'ADBE Vector Stroke Gap 1', gp);
}
// rectangular layer mask; mode MaskMode.*, feather px or [fx, fy], expEx = Mask Expansion expression
function dc1_mask(L, x0, y0, x1, y1, mode, feather, expEx) {
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = [[x1, y0], [x1, y1], [x0, y1], [x0, y0]]; sh.closed = true;
    m.property('ADBE Mask Shape').setValue(sh);
    if (feather) m.property('ADBE Mask Feather').setValue(feather instanceof Array ? feather : [feather, feather]);
    if (mode) m.maskMode = mode;
    if (expEx) jzSetExpr(m.property('ADBE Mask Offset'), expEx);
    return m;
}
// triangle polyline (closed by repeating the first point), apex up, radius R, around 0,0
function dc1_tri(R) { var p = []; for (var k = 0; k <= 3; k++) { var an = (-90 + k * 120) * Math.PI / 180; p.push([Math.cos(an) * R, Math.sin(an) * R]); } return p; }

// ================================================================ HUD / technical

/* ---- crosshair 照準線: hairlines through the lyric centre, broken around it, graduated near the gap */
jzReg('decor', 'crosshair', { back: false, build: function (ctx, bb0, d) {
    var bb = dc1_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc1_u(ctx), m = dc1_mg(ctx), i, q;
    var cx = bb.cx, cy = bb.cy, gx = 26 * u + bb.w * 0.02, gy = 22 * u + bb.h * 0.1, v = (d.v | 0) % 3, lw = Math.max(1, 1.3 * u);
    var arms = [[[cx, bb.y0 - gy], [cx, m * 0.5]], [[cx, bb.y1 + gy], [cx, H - m * 0.5]], [[bb.x0 - gx, cy], [m * 0.5, cy]], [[bb.x1 + gx, cy], [W - m * 0.5, cy]]];
    var S = dc1_layer(ctx, 'crosshair', 0, 0);
    for (i = 0; i < 4; i++) {
        var a = arms[i][0], b = arms[i][1], len = dc1_len(b[0] - a[0], b[1] - a[1]);
        if (len < 40 * u) continue;
        var EE = 'oe((time-' + jzN(i * 0.06) + ')/0.6)', g = jzGrp(S, 'arm ' + (i + 1));
        dc1_gset(g, 'ADBE Vector Position', a);
        dc1_gset(g, 'ADBE Vector Rotation', Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI);
        // accent cap at the inner end
        var gc = dc1_sub(g, 'cap'); dc1_seg(gc, 0, -9 * u, 0, 9 * u); jzAddStroke(gc, (i < 2 || d.accent) ? sc.accent : sc.fg, 2.4 * u);
        dc1_gexp(ctx, gc, 'ADBE Vector Scale', 'var e=' + EE + ';[100,100*e]');
        dc1_gexp(ctx, gc, 'ADBE Vector Group Opacity', '(PO<0.02?100:0)*' + EE);
        if (v === 1) {
            var ge = dc1_sub(g, 'end'); jzAddEllipse(ge, 6 * u, 6 * u); jzAddStroke(ge, sc.fg, lw);
            dc1_gset(ge, 'ADBE Vector Position', [len, 0]); dc1_gexp(ctx, ge, 'ADBE Vector Scale', 'var e=' + EE + ';[100*e,100*e]');
        }
        // graduation near the gap: repeaters whose copies follow the drawn arm (and leave with the exit)
        if (v !== 2 || i < 2) {
            var st = 10 * u, nt = Math.min(20, Math.floor(len * 0.5 / st));
            for (q = 0; q < 2; q++) {
                var step = q ? st * 5 : st, nn = q ? Math.floor(nt / 5) : nt, tl = q ? 8 * u : 3.5 * u;
                if (nn < 1) continue;
                var gt = dc1_sub(g, q ? 'major ticks' : 'ticks');
                dc1_seg(gt, step, -tl, step, tl); jzAddStroke(gt, sc.fg, lw, 80);
                var rp = dc1_rep(gt, nn, step, 0, 0), SX = 'var L=' + jzN(len) + ',S=' + jzN(step) + ',o=Math.floor(ic(PO)*L/S+1e-6);';
                dc1_sexp(ctx, rp.property('ADBE Vector Repeater Copies'), SX + 'Math.max(0,Math.min(' + nn + ',Math.floor(' + EE + '*L/S+1e-6))-o)');
                dc1_sexp(ctx, rp.property('ADBE Vector Repeater Offset'), SX + 'o');
            }
        }
        var gl = dc1_sub(g, 'line'); dc1_seg(gl, 0, 0, len, 0); jzAddStroke(gl, sc.sub, lw, 75);
        dc1_trim(ctx, gl, '100*' + EE, '100*Math.min(ic(PO),' + EE + ')');
    }
    dc1_op(ctx, S, '1');
    if (v !== 2) {
        var fs = dc1_fs(ctx) * 0.85, f = 'oe((time-0.35)/0.3)';
        dc1_label(ctx, 'Y ' + dc1_p(bb.y0, 4), cx + 12 * u, bb.y0 - gy - fs * 0.9, { size: fs, f: f });
        dc1_label(ctx, 'Y ' + dc1_p(bb.y1, 4), cx + 12 * u, bb.y1 + gy + fs * 0.9, { size: fs, f: f });
        dc1_label(ctx, 'X ' + dc1_p(cx, 4), cx - 12 * u, H - m * 0.5 - fs * 0.6, { size: fs, f: f, align: 'right', color: sc.fg });
    }
} });

/* ---- cropMarks トンボ: printer's crop / registration marks around the lyric */
jzReg('decor', 'cropMarks', { back: false, build: function (ctx, bb0, d) {
    var bb = dc1_bb(ctx, bb0), sc = ctx.sc, u = dc1_u(ctx), mn = Math.min(bb.w, bb.h), k, j;
    var pad = 14 * u + mn * 0.08 + (d.r || 0) * 10 * u, cm = 12 * u;
    var X0 = Math.max(cm, bb.x0 - pad), X1 = Math.min(ctx.W - cm, bb.x1 + pad), Y0 = Math.max(cm, bb.y0 - pad), Y1 = Math.min(ctx.H - cm, bb.y1 + pad);
    var g = 8 * u, Lm = 26 * u + mn * 0.05, b = 9 * u, lw = Math.max(1, u), cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    var S = dc1_layer(ctx, 'crop marks', 0, 0);
    // centre marks (十) + register circles, scaled in from their foot
    var ccx = (X0 + X1) / 2, ccy = (Y0 + Y1) / 2, cl = 20 * u, rr = 6 * u, rc = d.accent ? sc.accent : sc.fg;
    var marks = [[ccx, Y0 - g, 0, -1], [ccx, Y1 + g, 0, 1]];
    if (d.big || bb.h > bb.w) { marks.push([X0 - g, ccy, -1, 0]); marks.push([X1 + g, ccy, 1, 0]); }
    for (k = 0; k < marks.length; k++) {
        var x = marks[k][0], y = marks[k][1], dx = marks[k][2], dy = marks[k][3], mx = x + dx * cl * 0.55, my = y + dy * cl * 0.55;
        var gm = jzGrp(S, 'register ' + (k + 1));
        dc1_seg(gm, x, y, x + dx * cl, y + dy * cl);
        dc1_seg(gm, mx - dy * cl * 0.45, my - dx * cl * 0.45, mx + dy * cl * 0.45, my + dx * cl * 0.45);
        if (d.big) jzAddEllipse(gm, rr * 2, rr * 2, mx, my);
        jzAddStroke(gm, rc, lw, 85);
        dc1_gset(gm, 'ADBE Vector Anchor', [x, y]); dc1_gset(gm, 'ADBE Vector Position', [x, y]);
        dc1_gexp(ctx, gm, 'ADBE Vector Scale', 'var e=oe((time-0.15)/0.45);[100*e,100*e]');
    }
    // corner marks: an outer and an inner (fainter) L per corner, drawn outwards
    for (k = 0; k < 4; k++) {
        var sx = cs[k][0], sy = cs[k][1], X = sx < 0 ? X0 : X1, Y = sy < 0 ? Y0 : Y1, gk = jzGrp(S, 'corner ' + (k + 1));
        for (j = 0; j < 2; j++) {
            var o = j * b, gq = dc1_sub(gk, j ? 'inner' : 'outer');
            dc1_seg(gq, X + sx * g, Y + sy * o, X + sx * (g + Lm), Y + sy * o);
            dc1_seg(gq, X + sx * o, Y + sy * g, X + sx * o, Y + sy * (g + Lm));
            jzAddStroke(gq, sc.fg, lw, j ? 55 : 90);
            dc1_trim(ctx, gq, '100*oe((time-' + jzN(k * 0.05) + ')/0.45)');
        }
    }
    dc1_op(ctx, S, '1');
} });

/* ---- reticle ロックオン: a targeting reticle that shrinks, spins and locks beside the lyric */
jzReg('decor', 'reticle', { back: false, build: function (ctx, bb0, d) {
    var bb = dc1_bb(ctx, bb0), sc = ctx.sc, u = dc1_u(ctx), fs0 = dc1_fs(ctx), k, st;
    var R = jzClamp(Math.min(bb.w, bb.h) * 0.3, 40 * u, 72 * u), LW = fs0 * 3.6;
    var sp = dc1_near(ctx, bb, R * 2.8 + LW, R * 2.6, d, 18 * u), lLeft = sp.cx > ctx.W / 2;
    var cx = lLeft ? sp.x + LW + R * 1.4 : sp.x + R * 1.4, cy = sp.cy, lw = Math.max(1.2, 1.6 * u), lw1 = Math.max(1, u);
    var LK = 'var lock=oe(time/0.6),s=(2.1-1.1*lock)*(1+0.25*ic(PO));', FA = 'Math.min(1,time/0.12)';
    var S = dc1_layer(ctx, 'reticle', cx, cy);
    // centre dot (blinks until locked)
    var gd = jzGrp(S, 'centre'); jzAddEllipse(gd, 5.2 * u, 5.2 * u); jzAddFill(gd, sc.accent);
    dc1_gexp(ctx, gd, 'ADBE Vector Group Opacity', 'oe(time/0.6)>0.97?100:(ST%2?100:20)');
    // three inward-pointing markers orbiting at 1.32 r
    var s5 = 5 * u;
    for (k = 0; k < 3; k++) {
        var gk = jzGrp(S, 'marker ' + (k + 1));
        jzAddPath(gk, [[-s5, 0], [s5 * 0.6, s5 * 0.8], [s5 * 0.6, -s5 * 0.8]], true); jzAddFill(gk, sc.accent);
        var AN = 'var an=(-time*30+' + jzN(k * 120 + (d.r || 0) * 60) + ')*Math.PI/180;';
        dc1_gexp(ctx, gk, 'ADBE Vector Position', LK + AN + 'var r2=' + jzN(R * 1.32) + '*s;[Math.cos(an)*r2,Math.sin(an)*r2]');
        dc1_gexp(ctx, gk, 'ADBE Vector Rotation', AN + 'an*180/Math.PI');
    }
    // cross ticks (fixed angles), lock arc, four spinning arcs: scaled by r/R, stroke widths compensated
    var gt = jzGrp(S, 'ticks');
    for (k = 0; k < 4; k++) { var an = k * Math.PI / 2; dc1_seg(gt, Math.cos(an) * R * 0.74, Math.sin(an) * R * 0.74, Math.cos(an) * R * 1.16, Math.sin(an) * R * 1.16); }
    st = jzAddStroke(gt, sc.fg, lw1, 90); dc1_sexp(ctx, st.property('ADBE Vector Stroke Width'), LK + jzN(lw1) + '/Math.max(0.05,s)');
    dc1_gexp(ctx, gt, 'ADBE Vector Scale', LK + '[100*s,100*s]');
    var gi = jzGrp(S, 'lock arc'); dc1_arc(gi, 0, 0, R * 0.62, -90, 270);
    st = jzAddStroke(gi, sc.sub, lw1, 60); dc1_sexp(ctx, st.property('ADBE Vector Stroke Width'), LK + jzN(lw1) + '/Math.max(0.05,s)');
    dc1_trim(ctx, gi, '100*oe(time/0.6)');
    dc1_gexp(ctx, gi, 'ADBE Vector Scale', LK + '[100*s,100*s]');
    var ga = jzGrp(S, 'arcs');
    for (k = 0; k < 4; k++) dc1_arc(ga, 0, 0, R, k * 90 - 28, k * 90 + 28);
    st = jzAddStroke(ga, sc.fg, lw);
    dc1_sexp(ctx, st.property('ADBE Vector Stroke Width'), LK + jzN(lw) + '/Math.max(0.05,s)');
    dc1_sexp(ctx, st.property('ADBE Vector Stroke Opacity'), LK + '(lock>0.97||ST%2==0)?100:50');
    dc1_gexp(ctx, ga, 'ADBE Vector Scale', LK + '[100*s,100*s]');
    dc1_gexp(ctx, ga, 'ADBE Vector Rotation', LK + '(1-lock)*140+time*16+' + jzN((d.r || 0) * 90));
    dc1_op(ctx, S, FA);
    // SCAN -> LOCK readout + percentage
    var fs = fs0 * 0.9, lx = lLeft ? cx - R * 1.5 : cx + R * 1.5, al = lLeft ? 'right' : 'left';
    var L1 = dc1_label(ctx, 'SCAN', lx, cy - R * 0.9, { size: fs, align: al, f: FA, expr: 'oe(time/0.6)>0.97?"LOCK":"SCAN"' });
    jzAnimator(L1, 'JZ Lock', [['ADBE Text Fill Color', jzHex(sc.accent)]], dc1_hd(ctx) + 'oe(time/0.6)>0.97?100:0');
    dc1_label(ctx, '000.0', lx, cy - R * 0.9 + fs * 1.3, { size: fs, align: al, a: 0.8, f: FA, expr: 'var v=(oe(time/0.6)*100).toFixed(1);while(v.length<5)v="0"+v;v' });
} });

/* ---- radar レーダー: a small scope with a sweeping beam and blips in a free corner */
jzReg('decor', 'radar', { back: false, build: function (ctx, bb0, d) {
    var bb = dc1_bb(ctx, bb0), sc = ctx.sc, u = dc1_u(ctx), fs = dc1_fs(ctx) * 0.85, k;
    var R = jzClamp(jzU(ctx) * 0.07, 40 * u, 96 * u), sp = dc1_corner(ctx, bb, R * 2 + 8 * u, R * 2 + fs * 2.2, d);
    var cx = sp.cx, cy = sp.y + R + 4 * u, lw = Math.max(1, u), a = sp.ok ? 1 : 0.35;
    var SW = 'var sw=(time*150+' + jzN((d.r || 0) * 360) + ')%360;';
    var S = dc1_layer(ctx, 'radar', cx, cy);
    jzSetExpr(jzXf(S, 'ADBE Scale'), dc1_hd(ctx) + 'var s=oe(time/0.5)*(1-0.15*ic(PO));[value[0]*s,value[1]*s]');
    // blips light up when the beam passes and fade (exp(-deg/70))
    var nb = 3 + (d.n | 0);
    for (k = 0; k < nb; k++) {
        var ang = dc1_r(d.seed, k, 1) * 360, rad = dc1_rr(0.2, 0.9, d.seed, k, 2), gb = jzGrp(S, 'blip ' + (k + 1));
        jzAddEllipse(gb, 8.4 * u, 8.4 * u); jzAddFill(gb, sc.fg);
        dc1_gset(gb, 'ADBE Vector Position', [Math.cos(ang * Math.PI / 180) * R * rad, Math.sin(ang * Math.PI / 180) * R * rad]);
        var GL = SW + 'var sn=((sw-' + jzN(ang) + ')%360+360)%360,gl=Math.exp(-sn/70);';
        dc1_gexp(ctx, gb, 'ADBE Vector Scale', GL + 'var q=(2+2.2*gl)/4.2*100;[q,q]');
        dc1_gexp(ctx, gb, 'ADBE Vector Group Opacity', GL + 'gl>0.03?gl*100:0');
    }
    // beam + fading trail (repeater, opacity 28% -> 2%)
    var gs = jzGrp(S, 'sweep'); dc1_gexp(ctx, gs, 'ADBE Vector Rotation', SW + 'sw');
    var gh = dc1_sub(gs, 'beam'); dc1_seg(gh, 0, 0, R, 0); jzAddStroke(gh, sc.accent, 1.6 * lw, 95);
    var gw = dc1_sub(gs, 'trail'); dc1_seg(gw, 0, 0, R, 0); jzAddStroke(gw, sc.accent, lw);
    var rp = dc1_rep(gw, 14, 0, 0, -3.2), rpt = rp.property('ADBE Vector Repeater Transform');
    rpt.property('ADBE Vector Repeater Opacity 1').setValue(28); rpt.property('ADBE Vector Repeater Opacity 2').setValue(2);
    rp.property('ADBE Vector Repeater Offset').setValue(1);
    // bezel ticks
    var gt = jzGrp(S, 'ticks');
    var t1 = dc1_sub(gt, 'minor'); dc1_seg(t1, R, 0, R + 2.5 * u, 0); jzAddStroke(t1, sc.fg, lw, 60); dc1_rep(t1, 36, 0, 0, 10);
    var t2 = dc1_sub(gt, 'major'); dc1_seg(t2, R, 0, R + 5 * u, 0); jzAddStroke(t2, sc.fg, lw, 60); dc1_rep(t2, 12, 0, 0, 30);
    var gc = jzGrp(S, 'cross'); dc1_seg(gc, -R, 0, R, 0); dc1_seg(gc, 0, -R, 0, R); jzAddStroke(gc, sc.sub, lw, 30);
    var fr = [1, 0.66, 0.33];
    for (k = 0; k < 3; k++) {
        var gr = jzGrp(S, 'ring ' + (k + 1)); dc1_arc(gr, 0, 0, R * fr[k], -90, 270); jzAddStroke(gr, sc.sub, lw, 55);
        dc1_trim(ctx, gr, '100*cl(oe(time/0.5)*1.4-' + jzN(k * 0.15) + ')');
    }
    dc1_op(ctx, S, '1', a);
    var ea = 'oe((time-0.3)/0.3)', ly = sp.y + R * 2 + fs * 1.4;
    dc1_label(ctx, 'RDR-' + dc1_p((ctx.cut.line | 0) + 1), cx - R, ly, { size: fs, a: a, f: ea });
    dc1_label(ctx, '000°', cx + R, ly, { size: fs, align: 'right', color: sc.fg, a: a, f: ea, expr: SW + 'var q=""+Math.floor(Math.max(0,sw));while(q.length<3)q="0"+q;q+"\\u00B0"' });
} });

/* ---- progressRing 進行リング: a thin gauge that fills with the cut's progress */
jzReg('decor', 'progressRing', { back: false, build: function (ctx, bb0, d) {
    var bb = dc1_bb(ctx, bb0), sc = ctx.sc, u = dc1_u(ctx), R = jzClamp(jzU(ctx) * 0.05, 34 * u, 64 * u), q;
    var sp = dc1_near(ctx, bb, R * 2 + 24 * u, R * 2 + 24 * u, d, 22 * u), cx = sp.cx, cy = sp.cy, lw = Math.max(1, u), a = sp.ok ? 1 : 0.4;
    var PG = 'var e=oe(time/0.5),pg=cl(time/' + jzN(Math.max(0.1, ctx.cut.dur)) + ');';
    var S = dc1_layer(ctx, 'progress ring', cx, cy);
    if ((d.v | 0) % 2) {                 // 24 segments that light up in accent
        var circ = 2 * Math.PI * R, dl = circ * 11 / 360, gp = circ * 4 / 360;
        var gl = jzGrp(S, 'lit'); dc1_arc(gl, 0, 0, R, -90, 270);
        var s1 = jzAddStroke(gl, sc.accent, 3 * u); dc1_dash(s1, dl, gp);
        dc1_trim(ctx, gl, PG + 'var n=Math.floor(pg*24+1e-3);Math.max(0,Math.min(100*e,(15*n-1)/3.6))');
        dc1_gset(gl, 'ADBE Vector Rotation', 2);
        var gu = jzGrp(S, 'unlit'); dc1_arc(gu, 0, 0, R, -90, 270);
        var s2 = jzAddStroke(gu, sc.sub, lw, 35); dc1_dash(s2, dl, gp);
        dc1_trim(ctx, gu, PG + '100*e');
        dc1_gset(gu, 'ADBE Vector Rotation', 2);
    } else {                             // continuous arc with a head dot
        var gd = jzGrp(S, 'head'); jzAddEllipse(gd, 6.4 * u, 6.4 * u, 0, -R); jzAddFill(gd, sc.accent);
        dc1_gexp(ctx, gd, 'ADBE Vector Rotation', PG + '360*pg*e');
        var gp2 = jzGrp(S, 'progress'); dc1_arc(gp2, 0, 0, R, -90, 270); jzAddStroke(gp2, sc.accent, 2.6 * u);
        dc1_trim(ctx, gp2, PG + '100*pg*e');
        var gb = jzGrp(S, 'track'); dc1_arc(gb, 0, 0, R, -90, 270); jzAddStroke(gb, sc.sub, lw, 35);
        dc1_trim(ctx, gb, PG + '100*e');
    }
    // 60 bezel ticks drawn clockwise
    var r0 = R + 6 * u, gt = jzGrp(S, 'ticks');
    for (q = 0; q < 2; q++) {
        var gq = dc1_sub(gt, q ? 'major' : 'minor'); dc1_seg(gq, 0, -r0, 0, -(r0 + (q ? 6 : 3) * u)); jzAddStroke(gq, sc.sub, lw, 55);
        var rp = dc1_rep(gq, q ? 12 : 60, 0, 0, q ? 30 : 6);
        dc1_sexp(ctx, rp.property('ADBE Vector Repeater Copies'), PG + 'Math.ceil(' + (q ? 12 : 60) + '*e-1e-6)');
    }
    dc1_op(ctx, S, '1', a);
    var fs = R * 0.52;
    dc1_label(ctx, '00', cx - fs * 0.12, cy, { size: fs, align: 'center', color: sc.fg, a: a, f: 'oe(time/0.5)', track: 0.02, expr: PG + 'var v=Math.floor(pg*100);v<10?"0"+v:""+v' });
    dc1_label(ctx, '%', cx + fs * 0.72, cy + fs * 0.12, { size: fs * 0.42, a: a, f: 'oe(time/0.5)' });
} });

/* ---- timecodeBar タイムコード: rolling SMPTE readout + a mini scrub bar with in/out points */
jzReg('decor', 'timecodeBar', { back: false, build: function (ctx, bb0, d) {
    var bb = dc1_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc1_u(ctx), m = dc1_mg(ctx), fs = dc1_fs(ctx), q;
    var w = Math.min(W * 0.38, 460 * u), h = fs * 3.4, low = !!d.low, x0 = d.right ? W - m - w : m, y0 = low ? H - m - h : m;
    if (dc1_hit(x0, y0, x0 + w, y0 + h, bb, 10 * u)) { low = !low; y0 = low ? H - m - h : m; }
    var a = dc1_hit(x0, y0, x0 + w, y0 + h, bb, 0) ? 0.3 : 1, ty = y0 + fs * 0.8, E = 'oe(time/0.5)';
    var Ltc = dc1_label(ctx, 'TC', x0, ty + fs * 0.12, { size: fs * 0.8, color: sc.accent, a: a });
    var tcW = jzSize(Ltc)[0] + fs * 0.8 * 0.7;
    dc1_label(ctx, '00:00:00:00', x0 + tcW, ty, { size: fs * 1.25, color: sc.fg, a: a, track: 0.06,
        expr: 'var t=Math.max(0,T),fr=Math.floor(t*24+1e-6);function p(n){n=Math.floor(Math.max(0,n));return n<10?"0"+n:""+n;}' +
            'var s=p(t/3600)+":"+p((t/60)%60)+":"+p(t%60)+":"+p(fr%24);s.substr(0,Math.ceil(s.length*cl(time/0.35)))' });
    dc1_label(ctx, 'F 0000', x0 + w, ty + fs * 0.12, { size: fs * 0.8, align: 'right', a: a, f: E, expr: 'var s=""+Math.floor(time*24+1e-6);while(s.length<4)s="0"+s;"F "+s' });
    var by = y0 + h - fs * 0.6, lw = Math.max(1, u), PG = 'var e=' + E + ',pg=cl(time/' + jzN(Math.max(0.1, ctx.cut.dur)) + ');';
    var S = dc1_layer(ctx, 'timecode bar', 0, 0);
    var gm = jzGrp(S, 'playhead'); jzAddPath(gm, [[x0 - 5 * u, by - 12 * u], [x0 + 5 * u, by - 12 * u], [x0, by - 4 * u]], true); jzAddFill(gm, sc.accent);
    dc1_gexp(ctx, gm, 'ADBE Vector Position', PG + '[' + jzN(w) + '*pg*e,0]');
    var gp = jzGrp(S, 'played'); dc1_seg(gp, x0, by, x0 + w, by); jzAddStroke(gp, sc.fg, 2.2 * u); dc1_trim(ctx, gp, PG + '100*pg*e');
    var gi = jzGrp(S, 'in'); dc1_seg(gi, x0, by + 4 * u, x0, by + 10 * u); jzAddStroke(gi, sc.fg, lw);
    dc1_gexp(ctx, gi, 'ADBE Vector Group Opacity', PG + '100*e');
    var go = jzGrp(S, 'out'); dc1_seg(go, x0, by + 4 * u, x0, by + 10 * u); jzAddStroke(go, sc.fg, lw);
    dc1_gexp(ctx, go, 'ADBE Vector Group Opacity', PG + '100*e');
    dc1_gexp(ctx, go, 'ADBE Vector Position', PG + '[' + jzN(w) + '*e,0]');
    var gt = jzGrp(S, 'ticks'), tk = [[48, 2], [12, 4], [4, 7]];
    for (q = 0; q < 3; q++) {
        var gq = dc1_sub(gt, 'ticks ' + tk[q][0]); dc1_seg(gq, x0, by, x0, by - tk[q][1] * u); jzAddStroke(gq, sc.sub, lw, 60);
        var rp = dc1_rep(gq, tk[q][0] + 1, w / tk[q][0], 0, 0);
        dc1_sexp(ctx, rp.property('ADBE Vector Repeater Copies'), PG + 'Math.floor(' + tk[q][0] + '*e+1e-6)+1');
    }
    var gb = jzGrp(S, 'scrub'); dc1_seg(gb, x0, by, x0 + w, by); jzAddStroke(gb, sc.sub, lw, 60); dc1_trim(ctx, gb, PG + '100*e');
    dc1_op(ctx, S, '1', a);
    var ly = by + 9 * u + fs * 0.35;
    dc1_label(ctx, 'IN', x0 + 4 * u, ly, { size: fs * 0.6, a: a * 0.8, f: E });
    var Lo = dc1_label(ctx, 'OUT', x0 + w - 4 * u, ly, { size: fs * 0.6, align: 'right', a: a * 0.8, f: E });
    jzSetExpr(jzXf(Lo, 'ADBE Position'), dc1_hd(ctx) + '[value[0]-' + jzN(w) + '*(1-' + E + '),value[1]]');
} });

/* ---- rulerEdge 端の定規: a graduated ruler on one screen edge whose markers track the lyric */
jzReg('decor', 'rulerEdge', { back: false, build: function (ctx, bb0, d) {
    var bb = dc1_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc1_u(ctx), m = dc1_mg(ctx), i, q;
    var vert = !!d.corner, fs = dc1_fs(ctx) * 0.72, lw = Math.max(1, u), st = 10 * u;
    var len = vert ? H : W, a0 = m, a1 = len - m, side = vert ? (d.right ? 1 : -1) : (d.low ? 1 : -1);
    var base = vert ? (side > 0 ? W - m * 0.55 : m * 0.55) : (side > 0 ? H - m * 0.55 : m * 0.55), inw = -side;
    var P2 = function (al, off) { return vert ? [base + inw * off, al] : [al, base + inw * off]; };
    var n = Math.floor((a1 - a0) / st), HE = 'var e=oc(time/0.55),hd=' + jzN(a0) + '+' + jzN(a1 - a0) + '*e;';
    var S = dc1_layer(ctx, 'ruler edge', 0, 0);
    // lyric markers: span (scaled out from the screen centre), mid triangle
    var lo = vert ? bb.y0 : bb.x0, hi = vert ? bb.y1 : bb.x1, from = len / 2, off = 26 * u;
    var Lc = jzClamp(lo, a0, a1), Hc = jzClamp(hi, a0, a1), Mc = jzClamp((lo + hi) / 2, a0, a1), EM = 'var em=oc((time-0.2)/0.5);';
    var gsp = jzGrp(S, 'span'), fp = P2(from, off), p1 = P2(Lc, off), p2 = P2(Hc, off);
    dc1_seg(gsp, p1[0], p1[1], p2[0], p2[1]);
    var c1 = P2(Lc, off - 5 * u), c2 = P2(Lc, off + 5 * u), c3 = P2(Hc, off - 5 * u), c4 = P2(Hc, off + 5 * u);
    dc1_seg(gsp, c1[0], c1[1], c2[0], c2[1]); dc1_seg(gsp, c3[0], c3[1], c4[0], c4[1]);
    jzAddStroke(gsp, sc.accent, 2 * u, 90);
    dc1_gset(gsp, 'ADBE Vector Anchor', fp); dc1_gset(gsp, 'ADBE Vector Position', fp);
    dc1_gexp(ctx, gsp, 'ADBE Vector Scale', EM + (vert ? '[100,100*em]' : '[100*em,100]'));
    dc1_gexp(ctx, gsp, 'ADBE Vector Group Opacity', EM + '100*em');
    var tp = P2(Mc, 3 * u), s5 = 5 * u;
    var tri = vert ? [[tp[0], tp[1]], [tp[0] + inw * s5 * 1.6, tp[1] - s5], [tp[0] + inw * s5 * 1.6, tp[1] + s5]] : [[tp[0], tp[1]], [tp[0] - s5, tp[1] + inw * s5 * 1.6], [tp[0] + s5, tp[1] + inw * s5 * 1.6]];
    var gtr = jzGrp(S, 'mid'); jzAddPath(gtr, tri, true); jzAddFill(gtr, sc.fg);
    var MV = EM + 'var dm=-(' + jzN(Mc - from) + ')*(1-em);';
    dc1_gexp(ctx, gtr, 'ADBE Vector Position', MV + (vert ? '[0,dm]' : '[dm,0]'));
    dc1_gexp(ctx, gtr, 'ADBE Vector Group Opacity', EM + '100*em');
    // graduation: 1 / 5 / 10 step repeaters that follow the drawing head
    var tk = [[1, 4.5], [5, 9], [10, 14]], gt = jzGrp(S, 'ticks');
    for (q = 0; q < 3; q++) {
        var stp = st * tk[q][0], t0 = P2(a0, 0), t1 = P2(a0, tk[q][1] * u), gq = dc1_sub(gt, 'ticks ' + tk[q][0]);
        dc1_seg(gq, t0[0], t0[1], t1[0], t1[1]); jzAddStroke(gq, sc.sub, lw, 70);
        var nq = Math.floor(n / tk[q][0]) + 1, rp = dc1_rep(gq, nq, vert ? 0 : stp, vert ? stp : 0, 0);
        dc1_sexp(ctx, rp.property('ADBE Vector Repeater Copies'), HE + 'Math.min(' + nq + ',Math.floor((hd-' + jzN(a0) + ')/' + jzN(stp) + '+1e-6)+1)');
    }
    var gb = jzGrp(S, 'rail'), b0 = P2(a0, 0), b1 = P2(a1, 0);
    dc1_seg(gb, b0[0], b0[1], b1[0], b1[1]); jzAddStroke(gb, sc.sub, lw, 50); dc1_trim(ctx, gb, HE + '100*e');
    dc1_op(ctx, S, '1');
    // numbers every 10 ticks, one text layer; each shows once the head has passed it
    var strs = [], pts = [], al = vert ? (inw > 0 ? 'left' : 'right') : 'left';
    for (i = 0; i <= n; i += 10) { strs.push(dc1_p(i, 3)); pts.push(P2(a0 + i * st + (vert ? 0 : 3 * u), 20 * u + fs * 0.4)); }
    var Ln = dc1_lines(ctx, strs, pts, { size: fs, align: al, a: 0.7 });
    jzAnimator(Ln, 'JZ Reveal', [['ADBE Text Opacity', 0]], dc1_hd(ctx) + HE + 'var j=Math.floor((textIndex-1)/3);(' + jzN(a0) + '+j*' + jzN(10 * st) + '<=hd-' + jzN(20 * u) + ')?0:100');
    // measured size of the lyric
    var lp = P2(Mc, off + 8 * u + fs);
    var Lv = dc1_label(ctx, dc1_p(hi - lo, 4), lp[0] + (vert ? 0 : 6 * u), lp[1], { size: fs, color: sc.fg, align: al, f: 'oc((time-0.2)/0.5)' });
    jzSetExpr(jzXf(Lv, 'ADBE Position'), dc1_hd(ctx) + MV + (vert ? '[value[0],value[1]+dm]' : '[value[0]+dm,value[1]]'));
} });

/* ---- dimension 寸法線: drafting dimension lines measuring the lyric (width / height) */
jzReg('decor', 'dimension', { back: false, build: function (ctx, bb0, d) {
    var bb = dc1_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc1_u(ctx), m = dc1_mg(ctx);
    var lw = Math.max(1, u), fs = dc1_fs(ctx) * 0.85, arch = (d.v | 0) % 2 === 1, gap = 20 * u + bb.h * 0.1;
    var below = !!d.low, y = below ? bb.y1 + gap : bb.y0 - gap;
    if (y < m * 0.6 || y > H - m * 0.6) { below = !below; y = below ? bb.y1 + gap : bb.y0 - gap; }
    var x0 = bb.x0, x1 = bb.x1, cx = (x0 + x1) / 2, sy = below ? 1 : -1, E2 = 'oe((time-0.05)/0.35)', EA = 'var e=oe(time/0.55),ea=cl((e-0.7)/0.3);';
    var Lw = dc1_label(ctx, String(Math.round(x1 - x0)), cx, y, { size: fs, align: 'center', color: d.accent ? sc.accent : sc.fg, f: E2 });
    var LH = (jzSize(Lw)[0] + 14 * u) / 2, S = dc1_layer(ctx, 'dimension', 0, 0);
    var trim = function (half) { return EA + 'var L=' + jzN(half) + ',g=' + jzN(LH) + ';L>g?100*cl((e*L-g)/(L-g)):0'; };
    // width: arrows, line (gap for the value, grows out from the centre), extension lines
    var ga = jzGrp(S, 'arrows w');
    if (arch) { dc1_seg(ga, x0 - 5 * u, y + 5 * u, x0 + 5 * u, y - 5 * u); dc1_seg(ga, x1 - 5 * u, y + 5 * u, x1 + 5 * u, y - 5 * u); jzAddStroke(ga, sc.fg, 1.6 * u); }
    else { jzAddPath(ga, [[x0, y], [x0 + 10 * u, y - 3.5 * u], [x0 + 10 * u, y + 3.5 * u]], true); jzAddPath(ga, [[x1, y], [x1 - 10 * u, y - 3.5 * u], [x1 - 10 * u, y + 3.5 * u]], true); jzAddFill(ga, sc.fg); }
    dc1_gexp(ctx, ga, 'ADBE Vector Group Opacity', EA + '100*ea');
    var gl = jzGrp(S, 'dim w'); dc1_seg(gl, cx - LH, y, x0, y); dc1_seg(gl, cx + LH, y, x1, y); jzAddStroke(gl, sc.fg, lw, 90);
    dc1_trim(ctx, gl, trim(cx - x0));
    var ge = jzGrp(S, 'ext w'), ey0 = (below ? bb.y1 : bb.y0) + sy * 6 * u, ey1 = y + sy * 8 * u;
    dc1_seg(ge, x0, ey0, x0, ey1); dc1_seg(ge, x1, ey0, x1, ey1); jzAddStroke(ge, sc.sub, lw, 70); dc1_trim(ctx, ge, '100*' + E2);
    // height on one side
    if (d.big || (d.v | 0) % 3 === 0) {
        var gx = 20 * u + bb.w * 0.02, right = !!d.right, x = right ? bb.x1 + gx : bb.x0 - gx;
        if (x < m || x > W - m) { right = !right; x = right ? bb.x1 + gx : bb.x0 - gx; }
        var sx = right ? 1 : -1, cy = bb.cy;
        var Lh = dc1_label(ctx, String(Math.round(bb.h)), x, cy, { size: fs, align: 'center', rot: -90, color: sc.fg, f: E2 });
        LH = (jzSize(Lh)[0] + 14 * u) / 2;
        var gah = jzGrp(S, 'arrows h');
        if (arch) { dc1_seg(gah, x - 5 * u, bb.y0 + 5 * u, x + 5 * u, bb.y0 - 5 * u); dc1_seg(gah, x - 5 * u, bb.y1 + 5 * u, x + 5 * u, bb.y1 - 5 * u); jzAddStroke(gah, sc.fg, 1.6 * u); }
        else { jzAddPath(gah, [[x, bb.y0], [x - 3.5 * u, bb.y0 + 10 * u], [x + 3.5 * u, bb.y0 + 10 * u]], true); jzAddPath(gah, [[x, bb.y1], [x - 3.5 * u, bb.y1 - 10 * u], [x + 3.5 * u, bb.y1 - 10 * u]], true); jzAddFill(gah, sc.fg); }
        dc1_gexp(ctx, gah, 'ADBE Vector Group Opacity', EA + '100*ea');
        var glh = jzGrp(S, 'dim h'); dc1_seg(glh, x, cy - LH, x, bb.y0); dc1_seg(glh, x, cy + LH, x, bb.y1); jzAddStroke(glh, sc.fg, lw, 90);
        dc1_trim(ctx, glh, trim(cy - bb.y0));
        var geh = jzGrp(S, 'ext h'), ex0 = (right ? bb.x1 : bb.x0) + sx * 6 * u, ex1 = x + sx * 8 * u;
        dc1_seg(geh, ex0, bb.y0, ex1, bb.y0); dc1_seg(geh, ex0, bb.y1, ex1, bb.y1); jzAddStroke(geh, sc.sub, lw, 70); dc1_trim(ctx, geh, '100*' + E2);
    }
    dc1_op(ctx, S, '1');
} });

/* ---- indexNum 通し番号: a thin numeral "03 / 12" with rolling digits in a free corner */
jzReg('decor', 'indexNum', { back: false, build: function (ctx, bb0, d) {
    var bb = dc1_bb(ctx, bb0), sc = ctx.sc, u = dc1_u(ctx), c = ctx.cut, i, k, lines = 0;
    try { lines = ctx.plan && ctx.plan.lines ? ctx.plan.lines.length : 0; } catch (e0) { lines = 0; }
    var idx = c.line >= 0 ? (c.line | 0) + 1 : (c.index | 0) + 1, num = dc1_p(idx, 2), tot = '/' + dc1_p(Math.max(lines, idx), 2);
    var font = (d.v | 0) % 2 ? 'mincho_light' : 'gothic_light', S = jzClamp(jzU(ctx) * 0.1, 64 * u, 132 * u), ts = S * 0.3, LD = S * 1.25;
    // one text strip per digit (the digit and the ones it rolls through, one per line) behind a window mask
    var digits = jzChars(num), strips = [], nw = 0;
    for (i = 0; i < digits.length; i++) {
        var dg = parseInt(digits[i], 10), steps = d.mode === 'count' ? 6 + i * 3 : 3, ls = [];
        for (k = 0; k <= steps; k++) ls.push(String(((dg - k) % 10 + 10) % 10));
        var Ls = jzText(ctx, ls.join('\r'), { font: font, size: S, color: sc.fg, x: 0, y: 0, align: 'center', track: 0.02, leading: LD, name: 'index digit ' + (i + 1) });
        var dw = jzRect(Ls).width;
        strips.push([Ls, steps, dw]); nw += dw;
    }
    var Lt = jzText(ctx, tot, { font: font, size: ts, color: sc.sub, x: 0, y: 0, align: 'left', track: 0.06 });
    var tw = jzSize(Lt)[0], w = nw + tw + S * 0.12, h = S * 1.25;
    var sp = dc1_corner(ctx, bb, w, h, d, 1.1), A = sp.ok ? 1 : 0.35, x0 = sp.x, base = sp.y + S * 0.8, x = x0, AF = 'oc(time/0.2)', E2 = 'oe((time-0.25)/0.4)';
    for (i = 0; i < strips.length; i++) {
        var L = strips[i][0], dwi = strips[i][2];
        jzXf(L, 'ADBE Anchor Point').setValue([0, -0.36 * S]); jzXf(L, 'ADBE Position').setValue([x + dwi / 2, base]);
        dc1_mask(L, -dwi / 2 - 2, -0.36 * S - S * 0.5, dwi / 2 + 2, -0.36 * S + S * 0.48);
        jzAnimator(L, 'JZ Roll', [['ADBE Text Position 3D', [0, -LD * strips[i][1], 0]]], dc1_hd(ctx) + '(1-oe((time-' + jzN(0.04 + i * 0.08) + ')/0.55))*100');
        jzNoGhost(L); dc1_op(ctx, L, AF, A);
        x += dwi;
    }
    jzXf(Lt, 'ADBE Position').setValue([x + S * 0.1, base + S * 0.26]);
    jzNoGhost(Lt); dc1_op(ctx, Lt, AF + '*' + E2, A);
    var ry = base + S * 0.52, Sh = dc1_layer(ctx, 'index rule', 0, 0);
    var gr = jzGrp(Sh, 'accent'); jzAddRect(gr, S * 0.22, 3 * u, 0, x0 + S * 0.11, ry); jzAddFill(gr, sc.accent);
    dc1_gset(gr, 'ADBE Vector Anchor', [x0, ry]); dc1_gset(gr, 'ADBE Vector Position', [x0, ry]);
    dc1_gexp(ctx, gr, 'ADBE Vector Scale', '[100*' + E2 + ',100]');
    var gl = jzGrp(Sh, 'rule'); dc1_seg(gl, x0, ry, x0 + w, ry); jzAddStroke(gl, sc.sub, Math.max(1, u), 80); dc1_trim(ctx, gl, '100*oe((time-0.1)/0.5)');
    dc1_op(ctx, Sh, AF, A);
    dc1_label(ctx, c.line >= 0 ? 'LYRIC' : 'INTRO', x0, ry + dc1_fs(ctx) * 0.9, { size: dc1_fs(ctx) * 0.72, a: A, f: AF + '*' + E2, track: 0.3 });
} });

/* ---- dateStamp 日付写真: orange seven-segment date imprint like an old film camera */
function dc1_segDigit(x, y, dw, dh, t, dg, sk) {
    var SEG = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abcdfg'], out = [], h2 = dh / 2, k = t / 2, i, j;
    var hs = function (xa, xb, yy) { return [[xa + k, yy], [xa + 2 * k, yy - k], [xb - 2 * k, yy - k], [xb - k, yy], [xb - 2 * k, yy + k], [xa + 2 * k, yy + k]]; };
    var vs = function (xx, ya, yb) { return [[xx, ya + k], [xx + k, ya + 2 * k], [xx + k, yb - 2 * k], [xx, yb - k], [xx - k, yb - 2 * k], [xx - k, ya + 2 * k]]; };
    var S2 = { a: hs(x, x + dw, y), g: hs(x, x + dw, y + h2), d: hs(x, x + dw, y + dh), f: vs(x, y, y + h2), b: vs(x + dw, y, y + h2), e: vs(x, y + h2, y + dh), c: vs(x + dw, y + h2, y + dh) };
    var s = SEG[dg] || '';
    for (i = 0; i < s.length; i++) { var P = S2[s.charAt(i)], q = []; for (j = 0; j < P.length; j++) q.push([P[j][0] + (y + dh / 2 - P[j][1]) * sk, P[j][1]]); out.push(q); }
    return out;
}
jzReg('decor', 'dateStamp', { back: false, build: function (ctx, bb0, d) {
    var bb = dc1_bb(ctx, bb0), sc = ctx.sc, u = dc1_u(ctx), sd = d.seed, i, j, q;
    var yy = dc1_h(sd, 1) % 2 ? 90 + dc1_h(sd, 2) % 10 : dc1_h(sd, 3) % 27, mm = 1 + dc1_h(sd, 4) % 12, dd = 1 + dc1_h(sd, 5) % 28;
    var groups = [dc1_p(yy, 2), String(mm), dc1_p(dd, 2)];
    var dh = jzClamp(jzU(ctx) * 0.034, 24 * u, 46 * u), dw = dh * 0.52, t = dh * 0.12, gapD = dw * 0.42, gapG = dw * 1.35, width = gapG * 2 + dw * 0.5;
    for (i = 0; i < 3; i++) width += groups[i].length * (dw + gapD);
    var sp = dc1_corner(ctx, bb, width, dh * 1.4, { right: (d.v | 0) % 3 === 2 ? !d.right : true, low: true }, 1.2);
    var x = sp.x + dw * 0.5, y = sp.y + dh * 0.2, pieces = [];
    pieces.push([[x - dw * 0.1, y - t * 0.2], [x + t * 0.9, y - t * 0.2], [x + t * 0.2, y + dh * 0.32], [x - dw * 0.1 - t * 0.6, y + dh * 0.32]]);
    x += dw * 0.35;
    for (i = 0; i < 3; i++) {
        var gs = groups[i];
        for (j = 0; j < gs.length; j++) { var sg = dc1_segDigit(x, y, dw, dh, t, parseInt(gs.charAt(j), 10), 0.1); for (q = 0; q < sg.length; q++) pieces.push(sg[q]); x += dw + gapD; }
        x += gapG - gapD;
    }
    // every segment flickers on at its own time, then stays lit
    var S = dc1_layer(ctx, 'date stamp', 0, 0), A = sp.ok ? 1 : 0.4, LHX = dc1_lh(ctx);
    for (i = 0; i < pieces.length; i++) {
        var g = jzGrp(S, 'seg ' + (i + 1)); jzAddPath(g, pieces[i], true); jzAddFill(g, sc.accent);
        var t0 = 0.05 + dc1_r(sd, i, 7) * 0.35;
        jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), LHX + 'var t0=' + jzN(t0) + ';time<t0?0:((time-t0<0.12&&hh(ST*7.13+' + (i * 13 + 1) + '+SD)<0.5)?30:' + jzN(92 * A) + ')');
    }
    // the browser's soft accent glow (canvas shadowBlur)
    var ds = jzEffect(S, 'ADBE Drop Shadow', 'JZ Glow');
    jzEP(ds, 1, jzHex(sc.accent)); jzEP(ds, 2, 204); jzEP(ds, 3, 0); jzEP(ds, 4, 0); jzEP(ds, 5, 12 * u);
    dc1_op(ctx, S, '1');
} });

/* ---- qrBlock QR風: a QR-like module block that scans in, with finder squares */
jzReg('decor', 'qrBlock', { back: false, build: function (ctx, bb0, d) {
    var bb = dc1_bb(ctx, bb0), sc = ctx.sc, u = dc1_u(ctx), N = 21, sd = d.seed, i, j, b, f, NB = 10;
    var S0 = jzClamp(jzU(ctx) * 0.1, 76 * u, 140 * u), c = S0 / N, fs = dc1_fs(ctx) * 0.72;
    var sp = dc1_corner(ctx, bb, S0, S0 + fs * 2, d, 1.1), x0 = sp.x, y0 = sp.y, A = sp.ok ? 1 : 0.35, buckets = [];
    for (i = 0; i < NB * 2; i++) buckets.push([]);
    var finder = function (fi, fj) {
        var F = [[0, 0], [N - 7, 0], [0, N - 7]];
        for (var q = 0; q < 3; q++) {
            var di = fi - F[q][0], dj = fj - F[q][1];
            if (di >= 0 && di < 7 && dj >= 0 && dj < 7) { var r = Math.max(Math.abs(di - 3), Math.abs(dj - 3)); return r === 3 || r <= 1 ? (r <= 1 ? 2 : 1) : 0; }
        }
        return -1;
    };
    // modules grouped by the moment the diagonal scan reaches them
    for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
        f = finder(i, j);
        if (f === -1) {
            if ((i === 7 || j === 7) && (i < 8 && j < 8 || i > N - 9 && j < 8 || i < 8 && j > N - 9)) f = 0;
            else if (i === 6 || j === 6) f = (i + j) % 2 === 0 ? 1 : 0;
            else f = dc1_r(sd, i, j, 3) < 0.48 ? 1 : 0;
        }
        if (!f) continue;
        var te = ((i + j) / (2 * N - 2) + 0.1 - (dc1_r(sd, i, j, 9) - 0.5) * 0.1) / 1.25;
        b = jzClamp(Math.floor(te * NB), 0, NB - 1);
        buckets[b + (f === 2 && d.accent ? NB : 0)].push([x0 + i * c, y0 + j * c]);
    }
    var S = dc1_layer(ctx, 'qr block', 0, 0), cs = c + 0.35;
    var gs = jzGrp(S, 'scan'); dc1_seg(gs, x0 - 6 * u, y0, x0 + S0 + 6 * u, y0); jzAddStroke(gs, sc.accent, 1.5 * u);
    dc1_gexp(ctx, gs, 'ADBE Vector Position', 'var e=cl(time/0.55);[0,' + jzN(S0 * 1.1) + '*e]');
    dc1_gexp(ctx, gs, 'ADBE Vector Group Opacity', 'var e=cl(time/0.55);(e<1&&e*1.1<1)?100:0');
    for (b = 0; b < NB * 2; b++) {
        var lst = buckets[b]; if (!lst.length) continue;
        var g = jzGrp(S, (b >= NB ? 'finder ' : 'modules ') + ((b % NB) + 1));
        for (i = 0; i < lst.length; i++) jzAddRect(g, cs, cs, 0, lst[i][0] + cs / 2, lst[i][1] + cs / 2);
        jzAddFill(g, b >= NB ? sc.accent : sc.fg);
        jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), 'time>=' + jzN(0.55 * ((b % NB) + 0.5) / NB) + '?100:0');
    }
    // exit: modules drop out at random (browser: r < pOut * 1.1)
    var bd = jzEffect(S, 'ADBE Block Dissolve', 'JZ Out');
    jzEX(bd, 1, dc1_hd(ctx) + 'Math.min(100,PO*110)'); jzEP(bd, 2, c); jzEP(bd, 3, c);
    dc1_op(ctx, S, '1', A);
    var hx = (dc1_h(sd, 12) % 0xffffff).toString(16).toUpperCase();
    while (hx.length < 6) hx = '0' + hx;
    dc1_label(ctx, 'ID ' + hx, x0, y0 + S0 + fs * 1.2, { size: fs, a: A, f: 'oe((time-0.4)/0.3)', track: 0.14 });
} });

/* ---- glitchRects グリッチ片: flickering data slivers and hollow frames hugging the lyric's sides
   a pool of rects re-rolled every 12 fps step by expressions (the browser's per-step random set) */
jzReg('decor', 'glitchRects', { back: false, build: function (ctx, bb0, d) {
    var bb = dc1_bb(ctx, bb0), W = ctx.W, sc = ctx.sc, u = dc1_u(ctx), i, ly;
    var gap = 10 * u + bb.h * 0.06, ns = 0.7 + 0.2 * (d.n | 0), M = Math.round(13 * ns);
    var cols = [sc.fg, sc.accent, sc.ghostA || sc.accent, sc.ghostB || sc.sub], CX = '[' + dc1_col(cols[0]) + ',' + dc1_col(cols[1]) + ',' + dc1_col(cols[2]) + ',' + dc1_col(cols[3]) + ']';
    var BX = 'var U=' + jzN(u) + ',W=' + jzN(W) + ',X0=' + jzN(bb.x0) + ',X1=' + jzN(bb.x1) + ',Y0=' + jzN(bb.y0) + ',Y1=' + jzN(bb.y1) + ',GP=' + jzN(gap) + ';' +
        'var bu=Math.max(1-cl(time/0.45),PO>0?1-PO*0.6:0),idle=hh(ST*7.7+SD*0.11)<0.2;';
    var code = function (I) {
        return dc1_lh(ctx) + BX + 'var I=' + I + ';function R(k){return hh(ST*113.7+I*17.31+k*3.17+SD*0.37);}' +
            'var n=Math.round((bu>0?7+6*bu:(idle?3:1))*' + jzN(ns) + ');' +
            'var right=R(1)<0.5,h=(1.5+R(3)*9)*U,room=right?W-X1-GP:X0-GP,w=(18+R(4)*R(4)*220)*U,x,y;' +
            'if(room>60*U&&R(8)<0.75){y=Y0+(Y1-Y0)*R(2);w=Math.min(w,room-8*U);var sl=R(5)*Math.max(0,room-w-8*U)*0.5;x=right?X1+GP+sl:X0-GP-w-sl;}' +
            'else{y=R(9)<0.5?Y0-GP-R(2)*40*U:Y1+GP+R(2)*40*U;x=X0+(X1-w-X0)*R(5);}' +
            'x=Math.max(4*U,Math.min(W-w-4*U,x));' +
            'var hit=!(x+w<X0-2||x>X1+2||y+h<Y0-2||y>Y1+2),vis=I<n&&!hit,hol=R(6)<0.25,k=Math.floor(R(7)*4);' +
            'if(hol){y-=h*1.5;w*=0.7;h*=3.5;}';
    };
    // layer A (ghosted like the browser): solid fg / accent slivers; layer B (main pass only): ghost-tint slivers + hollow frames
    var SA = jzShapeLayer(ctx, 'glitch slivers', 0, 0), SB = dc1_layer(ctx, 'glitch frames', 0, 0);
    for (i = 0; i < M; i++) {
        var cd = code(i);
        for (ly = 0; ly < 2; ly++) {
            var g = jzGrp(ly ? SB : SA, 'sliver ' + (i + 1)), rc = jzAddRect(g, 10, 10);
            jzSetExpr(rc.property('ADBE Vector Rect Size'), cd + '[w,h]');
            jzSetExpr(rc.property('ADBE Vector Rect Position'), cd + '[x+w/2,y+h/2]');
            if (ly) { var st = jzAddStroke(g, sc.fg, Math.max(1, u), 80); jzSetExpr(st.property('ADBE Vector Stroke Opacity'), cd + 'hol?80:0'); }
            var fl = jzAddFill(g, cols[0], 90);
            jzSetExpr(fl.property('ADBE Vector Fill Color'), cd + CX + '[k]');
            if (ly) jzSetExpr(fl.property('ADBE Vector Fill Opacity'), cd + 'hol?0:90');
            jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), cd + (ly ? '(vis&&(hol||k>=2))?100:0' : '(vis&&!hol&&k<2)?100:0'));
        }
    }
    dc1_op(ctx, SA, '1'); dc1_op(ctx, SB, '1');
    // hex readout beside the lyric during bursts / idle ticks
    var fs = dc1_fs(ctx) * 0.75, Lb = dc1_label(ctx, '0xFFFF', 0, 0, { size: fs, color: sc.accent }), lwd = jzSize(Lb)[0];
    var LC = dc1_lh(ctx) + BX + 'function R(k){return hh(ST*57.3+1683+k*3.17+SD*0.37);}var right=R(1)<0.5;';
    jzSetExpr(Lb.property('ADBE Text Properties').property('ADBE Text Document'), LC + 'var v=Math.floor(hh(ST*31.7+SD*0.53)*65535).toString(16).toUpperCase();while(v.length<4)v="0"+v;"0x"+v');
    jzSetExpr(jzXf(Lb, 'ADBE Position'), LC + '[right?X1+GP:X0-GP-' + jzN(lwd) + ',Y0+(Y1-Y0)*R(2)-10*U]');
    jzSetExpr(jzXf(Lb, 'ADBE Opacity'), LC + '(bu>0.2||idle)?100*(1-ic(PO)):0');
} });

// ================================================================ geometry

/* ---- concentricSquares 同心四角: nested hairline squares, a slow twist or an endless tunnel */
jzReg('decor', 'concentricSquares', { back: false, build: function (ctx, bb0, d) {
    var bb = dc1_bb(ctx, bb0), sc = ctx.sc, u = dc1_u(ctx), S0 = jzClamp(jzU(ctx) * 0.17, 100 * u, 220 * u), i, k;
    var sp = d.corner ? dc1_corner(ctx, bb, S0 * 1.2, S0 * 1.2, d) : dc1_near(ctx, bb, S0 * 1.2, S0 * 1.2, d, 24 * u);
    var n = 5 + (d.n | 0), lw = Math.max(1, 1.2 * u), tunnel = (d.v | 0) % 2 === 1, A = sp.ok ? 1 : 0.35, dir = d.right ? 1 : -1;
    var S = dc1_layer(ctx, 'concentric squares', sp.cx, sp.cy);
    var gd = jzGrp(S, 'centre'); jzAddEllipse(gd, 4.8 * u, 4.8 * u); jzAddFill(gd, sc.accent);
    dc1_gexp(ctx, gd, 'ADBE Vector Group Opacity', '100*oe((time-0.3)/0.3)');
    for (i = 0; i < n; i++) {
        var s = tunnel ? S0 * 0.5 : S0 * 0.5 * (1 - i / n * 0.86), pts = [], acc = i === (d.n | 0), w = acc ? lw * 1.6 : lw;
        for (k = 0; k <= 4; k++) { var an = (45 + k * 90) * Math.PI / 180; pts.push([Math.cos(an) * s * Math.SQRT2, Math.sin(an) * s * Math.SQRT2]); }
        var F = 'var f=((' + jzN(i / n) + '+time*0.18)%1);';
        var g = jzGrp(S, 'square ' + (i + 1)); jzAddPath(g, pts, false);
        var st = jzAddStroke(g, acc ? sc.accent : sc.fg, w, (0.45 + 0.55 * (1 - i / n)) * 100);
        if (tunnel) jzSetExpr(st.property('ADBE Vector Stroke Width'), F + jzN(w) + '/(0.08+0.92*f)');
        dc1_trim(ctx, g, '100*oe((time-' + jzN(i * 0.045) + ')/0.5)');
        if (tunnel) {
            dc1_gset(g, 'ADBE Vector Rotation', (d.r || 0) > 0.5 ? 45 : 0);
            dc1_gexp(ctx, g, 'ADBE Vector Scale', F + 'var q=100*(0.08+0.92*f);[q,q]');
            dc1_gexp(ctx, g, 'ADBE Vector Group Opacity', F + '100*Math.sin(Math.PI*f)');
        } else dc1_gexp(ctx, g, 'ADBE Vector Rotation', jzN(i * (6 + (d.r || 0) * 8)) + '+time*' + jzN(7 * dir));
    }
    dc1_op(ctx, S, '1', A);
} });

/* ---- triangleSpin 回転三角: a huge hairline triangle around the lyric, or a counter-rotating pair with an orbiting solid */
jzReg('decor', 'triangleSpin', { back: false, build: function (ctx, bb0, d) {
    var bb = dc1_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc1_u(ctx), lw = Math.max(1, 1.4 * u), dir = d.right ? 1 : -1, PR = (d.r || 0) * 120;
    var rin = dc1_len(bb.w / 2, bb.h / 2) + 18 * u, E = 'var e=oe(time/0.6);', S, g1, g2;
    if (d.big && rin * 2 < Math.max(W, H) * 0.62) {           // one big triangle whose edges stay clear of the lyric
        var RB = rin * 2, ROT = E + 'var rot=' + jzN(dir) + '*((1-e)*-70+time*5)+' + jzN(PR) + ';', SCL = 'var s=100*(1+0.08*ic(PO));[s,s]';
        S = dc1_layer(ctx, 'triangle', bb.cx, bb.cy);
        g1 = jzGrp(S, 'inner'); jzAddPath(g1, dc1_tri(RB), false); jzAddStroke(g1, sc.fg, lw, 75);
        dc1_trim(ctx, g1, E + '100*e');
        dc1_gexp(ctx, g1, 'ADBE Vector Rotation', ROT + 'rot'); dc1_gexp(ctx, g1, 'ADBE Vector Scale', SCL);
        g2 = jzGrp(S, 'outer'); jzAddPath(g2, dc1_tri(RB * 1.07), false); jzAddStroke(g2, d.accent ? sc.accent : sc.sub, lw, 45);
        dc1_trim(ctx, g2, '100*oe((time-0.12)/0.6)');
        dc1_gexp(ctx, g2, 'ADBE Vector Rotation', ROT + '-rot*0.6+60'); dc1_gexp(ctx, g2, 'ADBE Vector Scale', SCL);
        dc1_op(ctx, S, '1');
        return;
    }
    var S0 = jzClamp(Math.min(W, H) * 0.19, 110 * u, 230 * u), sp = d.corner ? dc1_corner(ctx, bb, S0, S0, d) : dc1_near(ctx, bb, S0, S0, d, 24 * u), A = sp.ok ? 1 : 0.35;
    var cx = sp.cx, cy = sp.cy + S0 * 0.06, R = S0 * 0.42;
    S = dc1_layer(ctx, 'triangle pair', cx, cy);
    var gd = jzGrp(S, 'centre'); jzAddEllipse(gd, 4.4 * u, 4.4 * u); jzAddFill(gd, sc.accent);
    dc1_gexp(ctx, gd, 'ADBE Vector Group Opacity', '100*oe(time/0.6)');
    g1 = jzGrp(S, 'outer'); jzAddPath(g1, dc1_tri(R), false); jzAddStroke(g1, sc.fg, lw * 1.1);
    dc1_trim(ctx, g1, E + '100*e');
    dc1_gexp(ctx, g1, 'ADBE Vector Rotation', E + jzN(dir) + '*(time*16+(1-e)*-90)+' + jzN(PR));
    g2 = jzGrp(S, 'inner'); jzAddPath(g2, dc1_tri(R * 0.62), false); jzAddStroke(g2, sc.sub, lw, 80);
    dc1_trim(ctx, g2, '100*oe((time-0.1)/0.6)');
    dc1_gexp(ctx, g2, 'ADBE Vector Rotation', E + jzN(-dir) + '*(time*24+(1-e)*-140)+60');
    dc1_op(ctx, S, '1', A);
    // the small solid triangle orbiting the pair (ghosted in the browser -> no jzNoGhost)
    var So = jzShapeLayer(ctx, 'triangle orbit', cx, cy), go = jzGrp(So, 'orbiter');
    jzAddPath(go, dc1_tri(R * 0.13), true); jzAddFill(go, sc.accent);
    var AN = 'var an=(time*' + jzN(50 * dir) + '+' + jzN((d.r || 0) * 360) + ')*Math.PI/180;';
    dc1_gexp(ctx, go, 'ADBE Vector Position', AN + '[Math.cos(an)*' + jzN(R * 1.18) + ',Math.sin(an)*' + jzN(R * 1.18) + ']');
    dc1_gexp(ctx, go, 'ADBE Vector Rotation', 'time*' + jzN(90 * dir));
    dc1_gexp(ctx, go, 'ADBE Vector Scale', 'var x=cl((time-0.25)/0.35),q=x<=0?0:100*ob(x,1.8);[q,q]');
    dc1_op(ctx, So, '1', A);
} });

/* ---- lineBurst 放射線: short emphasis dashes radiating from the lyric's outline */
function dc1_superR(a, b, p, th) { var c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th)); return 1 / Math.pow(Math.pow(c / a, p) + Math.pow(s / b, p), 1 / p); }
jzReg('decor', 'lineBurst', { back: false, build: function (ctx, bb0, d) {
    var bb = dc1_bb(ctx, bb0), sc = ctx.sc, u = dc1_u(ctx), sd = d.seed, i, j = 1, b;
    var pad = 18 * u + bb.h * 0.14, A = bb.w / 2 * 1.08 + pad, B = bb.h / 2 * 1.12 + pad, M = 180, pts = [], cum = [0];
    for (i = 0; i <= M; i++) {
        var th = i / M * Math.PI * 2, r = dc1_superR(A, B, 4, th); pts.push([Math.cos(th) * r, Math.sin(th) * r]);
        if (i) cum.push(cum[i - 1] + dc1_len(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    // dashes evenly spaced along the outline, grouped by start delay (4 buckets) and colour
    var L = cum[M], N = Math.round(jzClamp(L / (34 * u), 24, 76) * (0.8 + 0.1 * (d.n | 0))), NBK = 4, sets = [];
    for (i = 0; i < NBK * 2; i++) sets.push([]);
    for (i = 0; i < N; i++) {
        var s = ((i + 0.5 + dc1_rs(sd, i, 1) * 0.3) / N) * L;
        while (j < M && cum[j] < s) j++;
        var k = (s - cum[j - 1]) / Math.max(1e-6, cum[j] - cum[j - 1]);
        var px = pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * k, py = pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * k;
        var tx = pts[j][0] - pts[j - 1][0], ty = pts[j][1] - pts[j - 1][1], tl = dc1_len(tx, ty) || 1; tx /= tl; ty /= tl;
        var nx = ty, ny = -tx; if (nx * px + ny * py < 0) { nx = -nx; ny = -ny; }
        var len = dc1_rr(10, 30, sd, i, 3) * u * (d.big ? 1.5 : 1) * 1.2, d0 = dc1_r(sd, i, 2) * 8 * u;
        b = Math.min(NBK - 1, Math.floor(dc1_r(sd, i, 5) * NBK)) + (i % 6 === 0 ? NBK : 0);
        sets[b].push([px + nx * d0, py + ny * d0, px + nx * (d0 + len), py + ny * (d0 + len)]);
    }
    var S = dc1_layer(ctx, 'line burst', bb.cx, bb.cy);
    for (b = NBK * 2 - 1; b >= 0; b--) {
        if (!sets[b].length) continue;
        var acc = b >= NBK, g = jzGrp(S, (acc ? 'accent ' : 'dashes ') + ((b % NBK) + 1));
        for (i = 0; i < sets[b].length; i++) dc1_seg(g, sets[b][i][0], sets[b][i][1], sets[b][i][2], sets[b][i][3]);
        dc1_cap(jzAddStroke(g, acc ? sc.accent : sc.fg, acc ? 2.4 * u : 1.6 * u, acc ? 100 : 85));
        dc1_trim(ctx, g, 'var be=0.5+0.5*Math.sin(time*5);100*oe((time-' + jzN(((b % NBK) + 0.5) * 0.18 / NBK) + ')/0.35)*(1+0.1*be)/1.2');
    }
    // exit: the dashes fly outward (browser: +60 px along the normal)
    jzSetExpr(jzXf(S, 'ADBE Scale'), dc1_hd(ctx) + 'var s=1+ic(PO)*' + jzN(60 * u / ((A + B) / 2)) + ';[value[0]*s,value[1]*s]');
    dc1_op(ctx, S, '1');
} });

/* ---- plusGrid プラス格子: a precise grid of + marks with a scanning highlight */
jzReg('decor', 'plusGrid', { back: false, build: function (ctx, bb0, d) {
    var bb = dc1_bb(ctx, bb0), sc = ctx.sc, u = dc1_u(ctx), v = d.v | 0, i, j;
    var cols = 4 + (d.n | 0) + v % 3, rows = 2 + v % 2 + (d.big ? 1 : 0), s = jzClamp(jzU(ctx) * 0.034, 24 * u, 44 * u), ps = s * 0.22;
    var w = (cols - 1) * s + ps * 2, h = (rows - 1) * s + ps * 2;
    var sp = d.corner ? dc1_corner(ctx, bb, w, h, d) : dc1_near(ctx, bb, w, h, d, 26 * u), A = sp.ok ? 1 : 0.35, NC = cols * rows;
    var HL = 'var hl=Math.floor(time*7+' + jzN((d.r || 0) * 50) + ')%' + NC + ';', S = dc1_layer(ctx, 'plus grid', 0, 0), k = ps * 1.5;
    var gx = jzGrp(S, 'highlight'); dc1_seg(gx, -k, -k, k, k); dc1_seg(gx, -k, k, k, -k); jzAddStroke(gx, sc.accent, 1.8 * u);
    dc1_gexp(ctx, gx, 'ADBE Vector Position', HL + '[' + jzN(sp.x + ps) + '+(hl%' + cols + ')*' + jzN(s) + ',' + jzN(sp.y + ps) + '+Math.floor(hl/' + cols + ')*' + jzN(s) + ']');
    dc1_gexp(ctx, gx, 'ADBE Vector Group Opacity', 'time>0.5?100:0');
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
        var g = jzGrp(S, 'plus ' + (j * cols + i + 1)); dc1_seg(g, -ps, 0, ps, 0); dc1_seg(g, 0, -ps, 0, ps); jzAddStroke(g, sc.sub, Math.max(1, 1.3 * u));
        dc1_gset(g, 'ADBE Vector Position', [sp.x + ps + i * s, sp.y + ps + j * s]);
        dc1_gexp(ctx, g, 'ADBE Vector Scale', HL + 'var x=cl((time-' + jzN((i + j) * 0.03) + ')/0.3),q=x<=0?0:100*ob(x,2);(hl==' + (j * cols + i) + '&&time>0.5)?[0,0]:[q,q]');
    }
    dc1_op(ctx, S, '1', A);
} });

/* ---- guides ガイド線: dashed layout guides along the lyric's edges, with handles and readouts */
jzReg('decor', 'guides', { back: false, build: function (ctx, bb0, d) {
    var bb = dc1_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc1_u(ctx), i;
    var pad = 10 * u + bb.h * 0.05, lw = Math.max(1, 1.1 * u), X0 = bb.x0 - pad, X1 = bb.x1 + pad, Y0 = bb.y0 - pad, Y1 = bb.y1 + pad, cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2;
    var col = d.accent ? sc.accent : (sc.accent2 && jzContrast(sc.accent2, sc.bg) > 2 ? sc.accent2 : sc.accent);
    var vert = d.big || (d.v | 0) % 2 === 1 || bb.h > bb.w, EA = 'oe((time-0.3)/0.3)', hs = 3.5 * u;
    var S = dc1_layer(ctx, 'guides', 0, 0);
    var gh = jzGrp(S, 'handles'), cn = [[X0, Y0], [X1, Y0], [X0, Y1], [X1, Y1]];
    for (i = 0; i < 4; i++) jzAddPath(gh, [[cn[i][0] - hs, cn[i][1] - hs], [cn[i][0] + hs, cn[i][1] - hs], [cn[i][0] + hs, cn[i][1] + hs], [cn[i][0] - hs, cn[i][1] + hs]], true);
    jzAddStroke(gh, sc.fg, lw); dc1_gexp(ctx, gh, 'ADBE Vector Group Opacity', '100*' + EA);
    var gl = jzGrp(S, 'guides'), ys = [Y0, Y1], xs = [X0, X1];
    for (i = 0; i < 2; i++) if (ys[i] > 0 && ys[i] < H) dc1_seg(gl, cx - W * 0.55, ys[i], cx + W * 0.55, ys[i]);
    if (vert) for (i = 0; i < 2; i++) if (xs[i] > 0 && xs[i] < W) dc1_seg(gl, xs[i], cy - H * 0.55, xs[i], cy + H * 0.55);
    var st = jzAddStroke(gl, col, lw, 75); dc1_dash(st, 7 * u, 5 * u);
    dc1_trim(ctx, gl, '50+50*oe(time/0.6)', '50-50*oe(time/0.6)');
    dc1_op(ctx, S, '1');
    var fs = dc1_fs(ctx) * 0.75, m = dc1_mg(ctx) * 0.5;
    dc1_label(ctx, 'Y ' + dc1_p(Y0, 4), m, Y0 - fs * 0.8, { size: fs, color: col, f: EA });
    dc1_label(ctx, 'Y ' + dc1_p(Y1, 4), m, Y1 + fs * 0.9, { size: fs, color: col, f: EA });
    if (vert) dc1_label(ctx, 'X ' + dc1_p(X1, 4), X1 + 6 * u, m + fs * 0.6, { size: fs, color: col, f: EA });
} });

/* ---- waveLine 波線: a long, precise sine hairline pair drifting across the free band
   the wave travels (group position, wrapped per wavelength) inside layer masks: soft ends, draw-on and wipe-off by mask expansion */
jzReg('decor', 'waveLine', { back: false, build: function (ctx, bb0, d) {
    var bb = dc1_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc1_u(ctx), m = dc1_mg(ctx), q, x;
    var above = bb.y0 - m * 0.5, below = H - m * 0.5 - bb.y1, lo = !!d.low;
    if ((lo ? below : above) < 60 * u && (lo ? above : below) > (lo ? below : above)) lo = !lo;
    var room = lo ? below : above, y = lo ? bb.y1 + Math.min(room * 0.5, 40 * u + room * 0.22) : bb.y0 - Math.min(room * 0.5, 40 * u + room * 0.22);
    if (room < 30 * u) return;
    var A = jzClamp(room * 0.1, 5 * u, 14 * u), lam = jzClamp(jzU(ctx) * 0.07, 44 * u, 96 * u), dir = d.right ? 1 : -1, x0 = m, x1 = W - m;
    var dots = (d.v | 0) % 3 === 2;
    var lines = dots ? [[A, 0, sc.fg, 3.6 * u, 85, 0]] : [[A * 0.55, Math.PI * 0.6, d.accent ? sc.accent : sc.sub, Math.max(1, u), 60, 0.12], [A, 0, sc.fg, 1.4 * u, 85, 0]];
    for (q = 0; q < lines.length; q++) {
        var amp = lines[q][0], off = lines[q][1], pts = [];
        for (x = x0 - lam; x <= x1 + 0.1; x += 6 * u) pts.push([x, y + Math.sin((x - x0) / lam * Math.PI * 2 + off) * amp]);
        var S = dc1_layer(ctx, dots ? 'wave dots' : 'wave line', 0, 0), g = jzGrp(S, 'wave');
        jzAddPath(g, pts, false);
        var st = jzAddStroke(g, lines[q][2], lines[q][3], lines[q][4]);
        if (dots) { dc1_cap(st); dc1_dash(st, 0, 12 * u); }
        dc1_gexp(ctx, g, 'ADBE Vector Position', 'var s=-time*' + jzN(2.4 * dir * lam / (2 * Math.PI)) + ';s-=Math.floor(s/' + jzN(lam) + ')*' + jzN(lam) + ';[s,0]');
        dc1_mask(S, x0 + lam * 0.6, y - lam * 2, x1 - lam * 0.6, y + lam * 2, null, [lam * 1.2, 0]);
        dc1_mask(S, x0 - 10, y - lam * 2, x0, y + lam * 2, MaskMode.INTERSECT, 0, dc1_hd(ctx) + jzN(x1 - x0) + '*ioc((time-' + jzN(lines[q][5]) + ')/0.7)');
        dc1_mask(S, x0 - 10, y - lam * 2, x0, y + lam * 2, MaskMode.SUBTRACT, 0, dc1_hd(ctx) + jzN(x1 - x0) + '*ic(PO)');
        dc1_op(ctx, S, '1');
    }
} });

/* ---- spiralLine 渦巻き: an Archimedean or square spiral drawn on from its centre */
jzReg('decor', 'spiralLine', { back: false, build: function (ctx, bb0, d) {
    var bb = dc1_bb(ctx, bb0), sc = ctx.sc, u = dc1_u(ctx), R = jzClamp(jzU(ctx) * 0.085, 54 * u, 104 * u), k, j = 1;
    var sp = dc1_near(ctx, bb, R * 2.3, R * 2.3, d, 20 * u), A = sp.ok ? 1 : 0.35, turns = 3 + (d.n | 0) * 0.5, pts = [], sq = (d.v | 0) % 2 === 1;
    if (sq) {
        var n = Math.round(turns * 4), dd = R / (n / 2), x = 0, y = 0, DR = [[1, 0], [0, 1], [-1, 0], [0, -1]];
        pts.push([0, 0]);
        for (k = 0; k < n; k++) { var Lk = dd * (Math.floor(k / 2) + 1); x += DR[k % 4][0] * Lk; y += DR[k % 4][1] * Lk; pts.push([x, y]); }
    } else {
        var M = Math.round(turns * 40);
        for (k = 0; k <= M; k++) { var th = k / M * turns * Math.PI * 2, r = R * k / M; pts.push([Math.cos(th) * r, Math.sin(th) * r]); }
    }
    // arc-length table so the head dot rides the drawing end
    var cum = [0], tab = [], NT = 40;
    for (k = 1; k < pts.length; k++) cum.push(cum[k - 1] + dc1_len(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    var Lt = cum[cum.length - 1];
    for (k = 0; k <= NT; k++) {
        var sv = Lt * k / NT; while (j < pts.length - 1 && cum[j] < sv) j++;
        var f = jzClamp((sv - cum[j - 1]) / Math.max(1e-6, cum[j] - cum[j - 1]), 0, 1);
        tab.push('[' + jzN(pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * f) + ',' + jzN(pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * f) + ']');
    }
    var S = dc1_layer(ctx, 'spiral', sp.cx, sp.cy), g = jzGrp(S, 'spiral');
    dc1_gexp(ctx, g, 'ADBE Vector Rotation', 'time*' + jzN(18 * (d.right ? 1 : -1)) + '+' + jzN((d.r || 0) * 360));
    var gd = dc1_sub(g, 'head'); jzAddEllipse(gd, 6.4 * u, 6.4 * u); jzAddFill(gd, sc.accent);
    dc1_gexp(ctx, gd, 'ADBE Vector Position', 'var e=ioc(time/0.7),P=[' + tab.join(',') + '],f=e*' + NT + ',i=Math.min(' + (NT - 1) + ',Math.floor(f)),k=f-i;[P[i][0]+(P[i+1][0]-P[i][0])*k,P[i][1]+(P[i+1][1]-P[i][1])*k]');
    dc1_gexp(ctx, gd, 'ADBE Vector Group Opacity', 'ioc(time/0.7)>ic(PO)?100:0');
    var gl = dc1_sub(g, 'line'); jzAddPath(gl, pts, false); dc1_cap(jzAddStroke(gl, sc.fg, 1.4 * u, 85));
    dc1_trim(ctx, gl, '100*ioc(time/0.7)', '100*Math.min(ic(PO),ioc(time/0.7))');
    dc1_op(ctx, S, '1', A);
} });

/* ---- halftonePatch 網点: a halftone (dot or line screen) gradient bleeding from a screen corner, under the lyric
   AE-native screen: a luma matte solid = one radial (dot) / mirrored linear (line) cell -> Motion Tile -> + corner falloff ramp (50% blend)
   -> Threshold, so the dot radius / line weight follows the falloff; a colour solid below takes it as LUMA matte and grows in by mask */
jzReg('decor', 'halftonePatch', { back: true, build: function (ctx, bb0, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc1_u(ctx), sd = d.seed, dur = ctx.comp.duration;
    var sx = d.right ? 1 : -1, sy = d.low ? 1 : -1, ox = sx > 0 ? W : 0, oy = sy > 0 ? H : 0;
    var pw = W * dc1_rr(0.38, 0.58, sd, 1), ph = H * dc1_rr(0.38, 0.6, sd, 2), g = jzClamp(jzU(ctx) * 0.018, 12 * u, 22 * u);
    while ((pw / g) * (ph / g) > 1100) g *= 1.15;
    var col = d.accent ? sc.accent : sc.sub, al = (d.accent ? 0.3 : 0.2) * (jzLum(sc.bg) < 0.5 ? 1 : 0.8), lines = (d.v | 0) % 2 === 1;
    var R = Math.sqrt(pw * ph), bx = ox - sx * g * 0.5, by = oy - sy * g * 0.5;
    // colour (below): a soft pw x ph ellipse at the corner, scaled out of the corner with the browser's growth front (d < 1.3 * t / 0.7)
    var C = ctx.comp.layers.addSolid(jzHex(col), 'halftone', W, H, 1, dur), mk = C.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), es = new Shape(), K4 = 0.5523;
    es.vertices = [[ox, oy - ph], [ox + pw, oy], [ox, oy + ph], [ox - pw, oy]];
    es.inTangents = [[-pw * K4, 0], [0, -ph * K4], [pw * K4, 0], [0, ph * K4]]; es.outTangents = [[pw * K4, 0], [0, ph * K4], [-pw * K4, 0], [0, -ph * K4]]; es.closed = true;
    mk.property('ADBE Mask Shape').setValue(es);
    mk.property('ADBE Mask Feather').setValue([R * 0.25, R * 0.25]);
    jzXf(C, 'ADBE Anchor Point').setValue([ox, oy]); jzXf(C, 'ADBE Position').setValue([ox, oy]);
    jzSetExpr(jzXf(C, 'ADBE Scale'), dc1_hd(ctx) + 'var s=100*Math.max(0,cl(time/0.7)*1.3-0.1);[s,s]');
    jzNoGhost(C); dc1_op(ctx, C, '1', al);
    // screen (above, used as luma matte)
    var Mt = ctx.comp.layers.addSolid([0, 0, 0], 'halftone screen', W, H, 1, dur), r1, tl;
    r1 = jzEffect(Mt, 'ADBE Ramp', 'JZ Cell');
    if (lines) { jzEP(r1, 1, [bx, by]); jzEP(r1, 2, [1, 1, 1]); jzEP(r1, 3, [bx, by + g * 0.5]); jzEP(r1, 4, [0, 0, 0]); jzEP(r1, 5, 1); }
    else { jzEP(r1, 1, [bx, by]); jzEP(r1, 2, [1, 1, 1]); jzEP(r1, 3, [bx + g * 0.5, by]); jzEP(r1, 4, [0, 0, 0]); jzEP(r1, 5, 2); }
    if (lines) { var mr = jzEffect(Mt, 'ADBE Mirror', 'JZ Cell Mirror'); jzEP(mr, 1, [bx, by]); jzEP(mr, 2, 270); }
    tl = jzEffect(Mt, 'ADBE Tile', 'JZ Screen');
    jzEP(tl, 1, [bx, by]); jzEP(tl, 2, lines ? 100 : g / W * 100); jzEP(tl, 3, g / H * 100);
    if (!lines) { jzEP(tl, 7, 180); jzEP(tl, 8, 1); }          // alternate rows shifted by half a cell, like the browser
    // falloff: dots use a round ramp (radius = geometric mean of pw, ph); the line screen uses radius ph and the layer is
    // stretched horizontally around the corner to pw (horizontal lines stay horizontal), max line weight 92% like the browser
    var r2 = jzEffect(Mt, 'ADBE Ramp', 'JZ Falloff'), RF = lines ? ph : R, top = lines ? 0.92 : 1;
    jzEP(r2, 1, [ox, oy]); jzEP(r2, 2, [top, top, top]); jzEP(r2, 3, [ox - sx * RF, oy]); jzEP(r2, 4, [0, 0, 0]); jzEP(r2, 5, 2); jzEP(r2, 7, 0.5);
    var th = jzEffect(Mt, 'ADBE Threshold2', 'JZ Dots'); jzEP(th, 1, 128);
    if (lines) { jzXf(Mt, 'ADBE Anchor Point').setValue([ox, oy]); jzXf(Mt, 'ADBE Position').setValue([ox, oy]); jzXf(Mt, 'ADBE Scale').setValue([pw / ph * 100, 100]); }
    jzNoGhost(Mt);
    C.trackMatteType = TrackMatteType.LUMA;
} });

/* ---- checkerStrip 市松: a small checkerboard band that wipes open and scrolls */
jzReg('decor', 'checkerStrip', { back: false, build: function (ctx, bb0, d) {
    var bb = dc1_bb(ctx, bb0), W = ctx.W, sc = ctx.sc, u = dc1_u(ctx), v = (d.v | 0) % 3, rows = v === 1 ? 3 : (v === 2 ? 1 : 2), i, j;
    var c = jzClamp(jzU(ctx) * 0.016, 10 * u, 18 * u), L = Math.min(W * 0.32, 400 * u), h = rows * c;
    var sp = dc1_corner(ctx, bb, L, h + (v === 2 ? 10 * u : 0), d, 1), A = sp.ok ? 1 : 0.35, x0 = sp.x, y0 = sp.y + (v === 2 ? 5 * u : 0);
    var S = dc1_layer(ctx, 'checker strip', 0, 0);
    if (v === 2) { var gr = jzGrp(S, 'rules'); dc1_seg(gr, x0, y0 - 5 * u, x0 + L, y0 - 5 * u); dc1_seg(gr, x0, y0 + h + 5 * u, x0 + L, y0 + h + 5 * u); jzAddStroke(gr, sc.fg, Math.max(1, u), 80); }
    var g = jzGrp(S, 'cells');
    for (j = 0; j < rows; j++) for (i = -2; i * c < L + 2 * c; i++) {
        if ((i + j) % 2 !== 0) continue;
        var cw = c * (v === 1 ? jzClamp(1 - (i * c) / L * 0.95, 0, 1) : 1);
        if (cw > 0.01) jzAddRect(g, cw, cw, 0, x0 + i * c + c / 2, y0 + j * c + c / 2);
    }
    jzAddFill(g, d.accent ? sc.accent : sc.fg, 90);
    dc1_gexp(ctx, g, 'ADBE Vector Position', '[(time*' + jzN(c * 1.6 * (d.right ? -1 : 1)) + ')%' + jzN(2 * c) + ',0]');
    // window: static strip clip + a growing intersect mask (the browser's clip to x0 .. x0 + L * e)
    dc1_mask(S, x0, y0 - 10 * u, x0 + L, y0 + h + 10 * u, null, 0);
    dc1_mask(S, x0 - 10, y0 - 10 * u, x0, y0 + h + 10 * u, MaskMode.INTERSECT, 0, dc1_hd(ctx) + jzN(L) + '*oe(time/0.55)');
    dc1_op(ctx, S, '1', A);
} });
