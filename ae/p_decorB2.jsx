// ================================================================ decor B part 2 (AE port of 28 decor entries in src/11p_decorB.js)
// nature / atmosphere (vines … fireflies), graphic shapes (memphis … tally), UI widgets (cursorClick … musicNotes).
// decor.build(ctx, bb, d): layers live in the CONTENT comp (time 0 = cut start). Every entry here is drawn by the browser on the
// main pass only, so all its layers are kept out of the tinted ghosts (jzNoGhost, done once in db2_reg).
// Entries the browser wraps in withSettle() start after the lyric's entrance has settled: expressions use t = time - ST.
// Particles are one shape layer with a group per particle; per-cycle random values are pre-computed into small arrays.

// ---------------------------------------------------------------- shared helpers (prefix db2_)
// the browser's deterministic hash J.h / J.r / J.rs / J.rr and value noise J.noise1 (so seeded placements match the web frame)
function db2_h(a, b, c, d, e) {
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
function db2_r(a, b, c, d, e) { return db2_h(a, b, c, d, e) / 4294967296; }
function db2_rs(a, b, c, d, e) { return db2_r(a, b, c, d, e) * 2 - 1; }
function db2_rr(lo, hi, a, b, c, d, e) { return lo + (hi - lo) * db2_r(a, b, c, d, e); }
function db2_noise1(x, seed) { var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return jzLerp(db2_rs(seed, i), db2_rs(seed, i + 1), u); }
// lattice values of J.noise1(x, seed) for x in [x0, x1] as an expression fragment "I,[a,b,…]" (use with nz(x, I, A))
function db2_ntab(seed, x0, x1) { var I = Math.floor(x0) - 1, n = Math.floor(x1) - I + 3, o = [], k; for (k = 0; k < n; k++) o.push(jzN(db2_rs(seed, I + k))); return I + ',[' + o.join(',') + ']'; }
var DB2_D = Math.PI / 180;
function db2_u(ctx) { return jzU(ctx) / 1080; }                       // browser U(env) at comp scale
function db2_mg(ctx) { return Math.round(jzU(ctx) * 0.05); }          // safe margin
function db2_fs(ctx) { return Math.max(12, 16 * db2_u(ctx)); }       // small label size
function db2_dark(sc) { return jzLum(sc.bg) < 0.5; }
function db2_vis(sc, c, mn) { return (c && jzContrast(c, sc.bg) >= (mn || 1.5)) ? c : sc.fg; }
function db2_acc(sc) { return db2_vis(sc, sc.accent); }
function db2_acc2(sc) { return db2_vis(sc, sc.accent2 || sc.accent); }
function db2_dispF(ctx) { var f = ctx.st && ctx.st.fonts && ctx.st.fonts.display; return (f && f[0]) || 'gothic_black'; }
function db2_settle(ctx) { return jzClamp((ctx.cut.inDur || 0) * 0.6, 0, 0.35); }
function db2_pad(n, k) { return jzPad(Math.max(0, Math.floor(n)), k || 2); }
function db2_arr(a) { var o = [], i; for (i = 0; i < a.length; i++) o.push(jzN(a[i])); return '[' + o.join(',') + ']'; }
function db2_pt(p) { return '[' + jzN(p[0]) + ',' + jzN(p[1]) + ']'; }
// colour as an expression literal [r,g,b,1]
function db2_cx(hex) { var c = jzHex(hex); return '[' + jzN(c[0]) + ',' + jzN(c[1]) + ',' + jzN(c[2]) + ',1]'; }
// expression header: jzTH (DUR IN OS OD SD, easings, PO, K) + ioc / wr / nz (table noise) / co (clearOf the lyric box) + t, V
var DB2_FNS = 'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}function wr(v,lo,sp){return lo+((v-lo)%sp+sp)%sp;}' +
    'function nz(x,I,A){var k=Math.floor(x),f=x-k,u=f*f*(3-2*f),i0=Math.max(0,Math.min(A.length-1,k-I)),i1=Math.max(0,Math.min(A.length-1,k+1-I));return A[i0]+(A[i1]-A[i0])*u;}' +
    'function co(x,y,p,s){var dx=Math.max(B0-p-x,0,x-B2-p),dy=Math.max(B1-p-y,0,y-B3-p);return cl(Math.sqrt(dx*dx+dy*dy)/s);}\n';
var DB2_BB = null;   // lyric box of the entry being built (for co())
function db2_H(ctx, st) {
    var b = DB2_BB || { x0: 0, y0: 0, x1: 0, y1: 0 };
    return jzTH(ctx) + DB2_FNS + 'var B0=' + jzN(b.x0) + ',B1=' + jzN(b.y0) + ',B2=' + jzN(b.x1) + ',B3=' + jzN(b.y1) + ',ST=' + jzN(st || 0) + ',t=time-ST,V=t<0?0:1;\n';
}
// layer opacity = value × started × exit fade × extra factor
function db2_op(ctx, L, st, ex, pre) { jzSetExpr(jzXf(L, 'ADBE Opacity'), db2_H(ctx, st) + (pre || '') + 'value*V*K' + (ex ? '*(' + ex + ')' : '')); }
function db2_lx(ctx, L, mn, st, ex) { jzSetExpr(jzXf(L, mn), db2_H(ctx, st) + ex); }
function db2_sub(g, name) { var s = jzVecs(g).addProperty('ADBE Vector Group'); if (name) s.name = name; return s; }
// AE rule: adding / removing / moving a property invalidates the script's references to its siblings (and below) ->
// re-fetch named items after adding the next sibling: db2_kid = inside a group's contents, db2_top = a layer's top-level group
function db2_kid(g, name) { return jzVecs(g).property(name); }
function db2_top(S, name) { return S.property('ADBE Root Vectors Group').property(name); }
function db2_gx(ctx, g, mn, st, ex) { jzSetExpr(jzGX(g).property(mn), db2_H(ctx, st) + ex); }
function db2_gop(ctx, g, st, ex, pre) { db2_gx(ctx, g, 'ADBE Vector Group Opacity', st, (pre || '') + 'value*(' + ex + ')'); }
function db2_gpos(g, x, y) { var T = jzGX(g); T.property('ADBE Vector Anchor').setValue([x, y]); T.property('ADBE Vector Position').setValue([x, y]); }
function db2_st(g, col, w, op, cap, join) {
    var s = jzAddStroke(g, col, w, op);
    try { if (cap) s.property('ADBE Vector Stroke Line Cap').setValue(cap); if (join) s.property('ADBE Vector Stroke Line Join').setValue(join); } catch (e) {}
    return s;
}
// (each dash property is added, then re-fetched by matchName: adding the next one invalidates the previous reference)
function db2_dash(s, on, off) {
    var D = s.property('ADBE Vector Stroke Dashes'), p3 = null;
    try { D.addProperty('ADBE Vector Stroke Dash 1'); } catch (e) {}
    try { D.property('ADBE Vector Stroke Dash 1').setValue(on); } catch (e1) {}
    try { D.addProperty('ADBE Vector Stroke Gap 1'); } catch (e2) {}
    try { D.property('ADBE Vector Stroke Gap 1').setValue(off); } catch (e3) {}
    try { D.addProperty('ADBE Vector Stroke Offset'); } catch (e4) {}
    try { p3 = D.property('ADBE Vector Stroke Offset'); } catch (e5) { p3 = null; }
    return p3;
}
// trim paths with expressions (end / start / offset), all in one header
function db2_trim(ctx, g, st, endEx, startEx, offEx, pre) {
    var tr = jzVecs(g).addProperty('ADBE Vector Filter - Trim'), H = db2_H(ctx, st) + (pre || '');
    if (endEx != null) jzSetExpr(tr.property('ADBE Vector Trim End'), H + 'Math.max(0,Math.min(100,' + endEx + '))');
    if (startEx != null) jzSetExpr(tr.property('ADBE Vector Trim Start'), H + 'Math.max(0,Math.min(100,' + startEx + '))');
    if (offEx != null) jzSetExpr(tr.property('ADBE Vector Trim Offset'), H + offEx);
    return tr;
}
function db2_trimV(g, s, e, off) { var tr = jzVecs(g).addProperty('ADBE Vector Filter - Trim'); tr.property('ADBE Vector Trim Start').setValue(s); tr.property('ADBE Vector Trim End').setValue(e); if (off) tr.property('ADBE Vector Trim Offset').setValue(off); return tr; }
function db2_rep(g, n, px, py, rot, off) {
    var rp = jzVecs(g).addProperty('ADBE Vector Filter - Repeater');
    rp.property('ADBE Vector Repeater Copies').setValue(n);
    if (off) rp.property('ADBE Vector Repeater Offset').setValue(off);
    var rt = rp.property('ADBE Vector Repeater Transform');
    rt.property('ADBE Vector Repeater Position').setValue([px || 0, py || 0]);
    if (rot) rt.property('ADBE Vector Repeater Rotation').setValue(rot);
    return rp;
}
// point lists
function db2_arc(cx, cy, r, a0, a1, n) { var o = [], i; n = n || 48; for (i = 0; i <= n; i++) { var a = (a0 + (a1 - a0) * i / n) * DB2_D; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; }
function db2_ell(cx, cy, rx, ry, rot, a0, a1, n) { var o = [], c = Math.cos(rot), s = Math.sin(rot), i; for (i = 0; i <= n; i++) { var a = (a0 + (a1 - a0) * i / n) * DB2_D, x = Math.cos(a) * rx, y = Math.sin(a) * ry; o.push([cx + x * c - y * s, cy + x * s + y * c]); } return o; }
function db2_bez(p0, p1, p2, p3, n) { var o = [], i; for (i = 0; i <= n; i++) { var t = i / n, m = 1 - t; o.push([m * m * m * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t * t * t * p3[0], m * m * m * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t * t * t * p3[1]]); } return o; }
function db2_off(pts, dx, dy) { var o = [], i; for (i = 0; i < pts.length; i++) o.push([pts[i][0] + dx, pts[i][1] + dy]); return o; }
function db2_scl(pts, s) { var o = [], i; for (i = 0; i < pts.length; i++) o.push([pts[i][0] * s, pts[i][1] * s]); return o; }
// the browser's part(pts, e0, e1) / along(pts, t)
function db2_cum(pts) { var d = [0], i; for (i = 1; i < pts.length; i++) { var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1]; d.push(d[i - 1] + Math.sqrt(dx * dx + dy * dy)); } return d; }
function db2_part(pts, e0, e1) {
    e0 = jzClamp(e0, 0, 1); e1 = jzClamp(e1, 0, 1);
    if (e1 <= e0 || pts.length < 2) return [];
    var d = db2_cum(pts), L = d[d.length - 1], i; if (L <= 0) return [];
    var A = e0 * L, B = e1 * L;
    function at(s) { var j = 1; while (j < d.length - 1 && d[j] < s) j++; var k = jzClamp((s - d[j - 1]) / Math.max(1e-6, d[j] - d[j - 1]), 0, 1); return [pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * k, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * k]; }
    var out = [at(A)];
    for (i = 1; i < pts.length - 1; i++) if (d[i] > A && d[i] < B) out.push(pts[i]);
    out.push(at(B));
    return out;
}
function db2_along(pts, t) {
    var p = db2_part(pts, 0, jzClamp(t, 0.0005, 1)), a = p[p.length - 1], b = p.length > 1 ? p[p.length - 2] : pts[0];
    return { x: a[0], y: a[1], ang: Math.atan2(a[1] - b[1], a[0] - b[0]) };
}
function db2_rectShape(x0, y0, x1, y1) { var sh = new Shape(); sh.vertices = [[x1, y0], [x1, y1], [x0, y1], [x0, y0]]; sh.closed = true; return sh; }
function db2_mask(L, sh, mode, feather) {
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
    m.property('ADBE Mask Shape').setValue(sh);
    if (mode) m.maskMode = mode;
    if (feather) m.property('ADBE Mask Feather').setValue([feather, feather]);
    return m;
}
// small secondary text (mono, sub colour, left aligned, like the browser's label())
function db2_label(ctx, text, x, y, o) {
    o = o || {};
    return jzText(ctx, String(text), { font: o.font || jzMonoF(ctx), size: o.size || db2_fs(ctx), color: o.color || ctx.sc.sub, x: x, y: y,
        align: o.align || 'left', track: o.track == null ? 0.08 : o.track, rot: o.rot, opacity: o.alpha == null ? 1 : o.alpha, name: o.name, maxW: o.maxW, maxSize: o.maxSize });
}
function db2_textW(L) { var r = jzRect(L); return r.width; }
// a text colour animator switched on by an amount expression (0..100)
function db2_txtCol(ctx, L, hex, st, amtEx) { return jzAnimator(L, 'JZ Colour', [['ADBE Text Fill Color', jzHex(hex)]], db2_H(ctx, st) + amtEx); }
// source text driven by an expression
function db2_srcText(ctx, L, st, ex) { try { L.property('ADBE Text Properties').property('ADBE Text Document').expression = db2_H(ctx, st) + ex; } catch (e) { jzWarn('db2 source text: ' + e.toString()); } }
// the expression's pad2
var DB2_PAD = 'function p2(n){n=Math.max(0,Math.floor(n));return n<10?"0"+n:""+n;}';

// lyric bbox clamped like the browser's getBB
function db2_bb(ctx, bb) {
    var W = ctx.W, H = ctx.H;
    var b = { x0: Math.max(bb.x0, -W * 0.1), x1: Math.min(bb.x1, W * 1.1), y0: Math.max(bb.y0, -H * 0.1), y1: Math.min(bb.y1, H * 1.1) };
    if (b.x1 <= b.x0) { b.x0 = bb.x0; b.x1 = bb.x1; }
    if (b.y1 <= b.y0) { b.y0 = bb.y0; b.y1 = bb.y1; }
    b.cx = bb.cx != null ? bb.cx : (b.x0 + b.x1) / 2; b.cy = bb.cy != null ? bb.cy : (b.y0 + b.y1) / 2;
    return b;
}
function db2_bw(bb) { return bb.x1 - bb.x0; }
function db2_bh(bb) { return bb.y1 - bb.y0; }
function db2_hit(x0, y0, x1, y1, bb, pad) { pad = pad || 0; return !(x1 < bb.x0 - pad || x0 > bb.x1 + pad || y1 < bb.y0 - pad || y0 > bb.y1 + pad); }
// 0 (touching the lyric) … 1 (clear by soft)
function db2_clear(bb, x, y, pad, soft) { var dx = Math.max(bb.x0 - pad - x, 0, x - bb.x1 - pad), dy = Math.max(bb.y0 - pad - y, 0, y - bb.y1 - pad); return jzClamp(Math.sqrt(dx * dx + dy * dy) / soft, 0, 1); }
// a screen corner (inside the margin) that keeps clear of the lyric
function db2_corner(ctx, bb, w, h, P, mk) {
    var W = ctx.W, H = ctx.H, m = db2_mg(ctx) * (mk || 1), sx0 = P.right ? 1 : -1, sy0 = P.low ? 1 : -1;
    var order = [[sx0, sy0], [-sx0, sy0], [sx0, -sy0], [-sx0, -sy0]], best = null, bestA = 1e18, i;
    for (i = 0; i < 4; i++) {
        var sx = order[i][0], sy = order[i][1], X = sx > 0 ? W - m - w : m, Y = sy > 0 ? H - m - h : m;
        if (!db2_hit(X, Y, X + w, Y + h, bb, 8)) return { x: X, y: Y, cx: X + w / 2, cy: Y + h / 2, ok: true, sx: sx, sy: sy };
        var ov = Math.max(0, Math.min(X + w, bb.x1) - Math.max(X, bb.x0)) * Math.max(0, Math.min(Y + h, bb.y1) - Math.max(Y, bb.y0));
        if (ov < bestA) { bestA = ov; best = { x: X, y: Y, cx: X + w / 2, cy: Y + h / 2, ok: false, sx: sx, sy: sy }; }
    }
    return best;
}
// place a w×h box next to the lyric (outside it, inside the safe margin)
function db2_near(ctx, bb, w, h, P, gap) {
    var W = ctx.W, H = ctx.H, m = db2_mg(ctx) * 0.8, sx0 = P.right ? 1 : -1, sy0 = P.low ? 1 : -1, i;
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
        if (!db2_hit(X, Y, X + w, Y + h, bb, gap * 0.4)) return { x: X, y: Y, cx: X + w / 2, cy: Y + h / 2, ok: true, sx: tries[i][2], sy: tries[i][3] };
    }
    return db2_corner(ctx, bb, w, h, P);
}
function db2_spot(ctx, bb, w, h, P, gap) { return P.corner ? db2_corner(ctx, bb, w, h, P) : db2_near(ctx, bb, w, h, P, gap); }
// a w×h block in the free band under (or over) the lyric, centred on it; falls back to spot()
function db2_band(ctx, bb, w, h, P, gap) {
    var W = ctx.W, H = ctx.H, m = db2_mg(ctx) * 0.8, order = P.low ? [false, true] : [true, false], i;
    for (i = 0; i < 2; i++) {
        var below = order[i], y = below ? bb.y1 + gap : bb.y0 - gap - h;
        if (y < m || y + h > H - m) continue;
        var x = jzClamp((bb.x0 + bb.x1) / 2 - w / 2, m, W - m - w);
        return { x: x, y: y, cx: x + w / 2, cy: y + h / 2, ok: true };
    }
    return db2_spot(ctx, bb, w, h, P, gap);
}
// free rectangles around the lyric, biggest usable first
function db2_free(ctx, bb, gap) {
    var W = ctx.W, H = ctx.H, m = db2_mg(ctx) * 0.8, i, j;
    var all = [{ x: m, y: m, w: W - 2 * m, h: bb.y0 - gap - m, side: 't' }, { x: m, y: bb.y1 + gap, w: W - 2 * m, h: H - m - bb.y1 - gap, side: 'b' },
        { x: m, y: m, w: bb.x0 - gap - m, h: H - 2 * m, side: 'l' }, { x: bb.x1 + gap, y: m, w: W - m - bb.x1 - gap, h: H - 2 * m, side: 'r' }], out = [];
    for (i = 0; i < all.length; i++) if (all[i].w > 30 && all[i].h > 30) out.push(all[i]);
    for (i = 1; i < out.length; i++) for (j = i; j > 0 && Math.min(out[j].w, out[j].h * 1.5) > Math.min(out[j - 1].w, out[j - 1].h * 1.5); j--) { var tmp = out[j]; out[j] = out[j - 1]; out[j - 1] = tmp; }
    return out;
}
// a point on the padded lyric box perimeter at arc length pt (clockwise from the top-left corner)
function db2_perim(X0, Y0, X1, Y1, pt) {
    if (pt < X1 - X0) return [X0 + pt, Y0];
    pt -= X1 - X0; if (pt < Y1 - Y0) return [X1, Y0 + pt];
    pt -= Y1 - Y0; if (pt < X1 - X0) return [X1 - pt, Y1];
    pt -= X1 - X0; return [X0, Y1 - pt];
}
// a character from the lyric: prefer kanji, then kana / latin
function db2_lyricChar(ctx, salt) {
    var c = ctx.cut, s = jzChars(String(c.text || c.lineText || '')), arr = [], kan = [], kana = [], i;
    for (i = 0; i < s.length; i++) if (jzTrim(s[i]) && !jzIsPunct(s[i])) arr.push(s[i]);
    if (!arr.length) return '';
    for (i = 0; i < arr.length; i++) { if (jzIsKanji(arr[i])) kan.push(arr[i]); else if (jzIsKata(arr[i]) || jzIsHira(arr[i]) || jzIsLatin(arr[i])) kana.push(arr[i]); }
    var p = kan.length ? kan : (kana.length ? kana : arr);
    return p[db2_h(c.seed, salt | 0, 5) % p.length];
}
// register an entry; all its layers are main-pass only in the browser -> keep them out of the ghosts
function db2_reg(k, back, fn) {
    jzReg('decor', k, { back: !!back, build: function (ctx, bb, d) {
        var n0 = ctx.comp.numLayers, i, b = db2_bb(ctx, bb);
        DB2_BB = b;
        try { fn(ctx, b, d); } finally { DB2_BB = null; }
        var added = ctx.comp.numLayers - n0;
        for (i = 1; i <= added; i++) jzNoGhost(ctx.comp.layer(i));
    } });
}

// ================================================================ nature / atmosphere

/* ---- vines — 蔓: a tendril growing in from a screen corner, sprouting leaves and curls, stopping short of the lyric */
db2_reg('vines', false, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db2_u(ctx), ST = db2_settle(ctx), v, i, k;
    var nV = d.big ? 2 : 1, ac = db2_acc(sc), leafC = jzMixHex(ac, sc.fg, 0.15);
    for (v = 0; v < nV; v++) {
        var sx = (d.right ? 1 : -1) * (v ? -1 : 1), sy = (d.low ? 1 : -1) * (v ? -1 : 1);
        var x0 = sx > 0 ? W - W * 0.08 : W * 0.08, y0 = sy > 0 ? H + 4 * u : -4 * u;
        var th = Math.atan2(-sy, -sx * 0.55), x = x0, y = y0, step = 7 * u, Lmax = jzU(ctx) * 0.62, pts = [[x, y]], seed = d.seed + v * 17, s;
        for (s = 0; s < Lmax && pts.length < 200; s += step) {
            th += Math.sin(s / (90 * u) + seed % 7) * 0.05 + db2_noise1(s / (60 * u), seed) * 0.03;
            x += Math.cos(th) * step; y += Math.sin(th) * step;
            if (db2_clear(bb, x, y, 22 * u, 1) < 1 || x < 4 || x > W - 4 || y < -8 || y > H + 8) break;
            pts.push([x, y]);
        }
        if (pts.length < 6) continue;
        var E = 'var e=oc((t-' + jzN(v * 0.12) + ')/1);';
        var S = jzShapeLayer(ctx, 'vine ' + (v + 1), 0, 0), gV = jzGrp(S, 'vine');
        db2_gpos(gV, x0, y0);
        db2_gx(ctx, gV, 'ADBE Vector Rotation', ST, 'Math.sin(t*0.9+' + v + ')*1.2');
        // growing tip (a bud riding the end of the stem)
        var tab = [], NS = 24;
        for (i = 0; i <= NS; i++) tab.push(db2_pt(db2_part(pts, 0, Math.max(0.0005, i / NS)).slice(-1)[0]));
        var gT = db2_sub(gV, 'bud'), eT = jzAddEllipse(gT, 4.8 * u, 4.8 * u);
        jzSetExpr(eT.property('ADBE Vector Ellipse Position'), db2_H(ctx, ST) + E + 'var P=[' + tab.join(',') + '],k=e*' + NS + ',i=Math.min(' + (NS - 1) + ',Math.floor(k)),f=k-i;[P[i][0]+(P[i+1][0]-P[i][0])*f,P[i][1]+(P[i+1][1]-P[i][1])*f]');
        jzAddFill(gT, ac);
        db2_gop(ctx, gT, ST, 'e<0.999?1:0', E);
        // curls and leaves sprout where the stem has passed
        db2_sub(gV, 'curls');
        var gL = db2_sub(gV, 'leaves'), gC = db2_kid(gV, 'curls');
        for (k = 1; k < 12; k++) {
            var f = k / 12 + db2_rs(seed, k, 1) * 0.02, p = db2_along(pts, f), side = k % 2 ? 1 : -1;
            var GR = E + 'var gw=ob(cl((e-' + jzN(f) + ')/0.12),1.8);';
            if (k % 4 === 3) {
                var cp = [], an0 = p.ang + side * 1.2, R0 = 12 * u, ccx = p.x + Math.cos(an0) * R0, ccy = p.y + Math.sin(an0) * R0;
                for (i = 0; i <= 20; i++) { var tt = i / 20, an = an0 + Math.PI + side * tt * 8, rr = R0 * (1 - tt * 0.85); cp.push([ccx + Math.cos(an) * rr, ccy + Math.sin(an) * rr]); }
                var gc = db2_sub(gC, 'curl ' + k); jzAddPath(gc, cp, false);
                db2_trim(ctx, gc, ST, '100*gw', null, null, GR);
                continue;
            }
            var Ll = (17 + db2_r(seed, k, 2) * 12) * u, an2 = p.ang + side * 0.95, c = Math.cos(an2), sn = Math.sin(an2), lp = [];
            for (i = 0; i <= 10; i++) { var t1 = i / 10, a1 = Math.sin(t1 * Math.PI) * Ll * 0.3; lp.push([t1 * Ll * c - a1 * sn, t1 * Ll * sn + a1 * c]); }
            for (i = 10; i >= 0; i--) { var t2 = i / 10, a2 = -Math.sin(t2 * Math.PI) * Ll * 0.3; lp.push([t2 * Ll * c - a2 * sn, t2 * Ll * sn + a2 * c]); }
            var gl = db2_sub(gL, 'leaf ' + k); jzAddPath(gl, lp, true);
            jzGX(gl).property('ADBE Vector Position').setValue([p.x, p.y]);
            db2_gx(ctx, gl, 'ADBE Vector Scale', ST, GR + '[100*gw,100*gw]');
        }
        db2_st(gC, sc.fg, Math.max(1, 1.2 * u), 85, 2, 2);
        jzAddFill(gL, leafC, 90);
        // the stem draws on over ~1 s
        var gS = db2_sub(gV, 'stem'); jzAddPath(gS, pts, false);
        db2_trim(ctx, gS, ST, '100*e', null, null, E);
        db2_st(gS, sc.fg, Math.max(1.2, 1.7 * u), 90, 2, 2);
        db2_op(ctx, S, ST);
    }
});

/* ---- cloudPuffs — 雲: puffy line-art cumulus clouds drifting slowly through the free band (one layer per cloud; the body fill is
   clipped at the flat base by a layer mask) */
function db2_cloud(Wc, seed) {            // the browser's cloudOutline(0, 0, Wc, seed): base line at y = 0
    var base = [[-0.38, 0.15, 0.3], [-0.21, 0.22, 0.5], [0.02, 0.26, 0.75], [0.23, 0.2, 0.5], [0.39, 0.13, 0.3], [-0.07, 0.19, 1.35]], cs = [], runs = [], i, j;
    for (i = 0; i < base.length; i++) { var r = base[i][1] * Wc * (0.9 + 0.2 * db2_r(seed, i, 1)); cs.push([base[i][0] * Wc, -r * base[i][2], r]); }
    function hid(px, py, x, y) {
        if (py > 0) return true;
        for (var k = 0; k < cs.length; k++) { var c = cs[k]; if ((c[0] !== x || c[1] !== y) && Math.sqrt((px - c[0]) * (px - c[0]) + (py - c[1]) * (py - c[1])) < c[2] - 0.5) return true; }
        return false;
    }
    function run(x, y, rr, a0, a1, n) {
        var cur = null;
        for (var q = 0; q <= n; q++) {
            var an = a0 + q / n * (a1 - a0), px = x + Math.cos(an) * rr, py = y + Math.sin(an) * rr;
            if (hid(px, py, x, y)) { cur = null; continue; }
            if (!cur) { cur = []; runs.push(cur); }
            cur.push([px, py]);
        }
    }
    for (j = 0; j < cs.length; j++) { run(cs[j][0], cs[j][1], cs[j][2], Math.PI, 2 * Math.PI, 40); run(cs[j][0], cs[j][1], cs[j][2], 0, Math.PI, 20); }
    var xl = 1e9, xr = -1e9;
    for (j = 0; j < cs.length; j++) { var c2 = cs[j]; if (-c2[1] < c2[2]) { var dd = Math.sqrt(c2[2] * c2[2] - c2[1] * c2[1]); xl = Math.min(xl, c2[0] - dd); xr = Math.max(xr, c2[0] + dd); } }
    var out = [];
    for (i = 0; i < runs.length; i++) if (runs[i].length > 1) out.push(runs[i]);
    return { runs: out, base: xl < 1e8 ? [[xl, 0], [xr, 0]] : null, circles: cs };
}
db2_reg('cloudPuffs', false, function (ctx, bb, d) {
    var sc = ctx.sc, u = db2_u(ctx), ST = db2_settle(ctx), i, k;
    var fr0 = db2_free(ctx, bb, 20 * u), fr = [];
    for (i = 0; i < fr0.length; i++) if (fr0[i].side === 't' || fr0[i].side === 'b' || fr0[i].h > fr0[i].w) fr.push(fr0[i]);
    if (!fr.length) return;
    var reg = fr[0], n = 2 + ((d.n | 0) % 2), lw = Math.max(1.2, 1.6 * u);
    for (i = 0; i < n; i++) {
        var r1 = db2_r(d.seed, i, 1), r2 = db2_r(d.seed, i, 2), r3 = db2_r(d.seed, i, 3), r4 = db2_r(d.seed, i, 4);
        var Wc = Math.min(jzClamp(reg.w * 0.42 * (0.6 + 0.4 * r1), 90 * u, 260 * u), reg.h / 0.56);
        if (Wc < 50 * u) continue;
        var lane = (i + 0.5) / n, dir = (d.right ? 1 : -1) * (i % 2 ? -1 : 1);
        var CX = 'var cx=wr(' + jzN(reg.x + reg.w * (lane + (r2 - 0.5) * 0.25)) + '+(' + dir + ')*t*' + jzN((6 + r3 * 8) * u) + ',' + jzN(reg.x - Wc * 0.2) + ',' + jzN(reg.w + Wc * 0.4) + ');';
        var BY = jzN(reg.y + Wc * 0.52 + Math.max(0, reg.h - Wc * 0.56) * r4);
        var Q = 'var q=ob(cl((t-' + jzN(i * 0.12) + ')/0.45),1.5);';
        var cld = db2_cloud(Wc, d.seed + i), S = jzShapeLayer(ctx, 'cloud ' + (i + 1), 0, 0);
        // inner shading curl
        var c0 = cld.circles[2], gc = jzGrp(S, 'curl');
        jzAddPath(gc, db2_arc(c0[0] - c0[2] * 0.1, c0[1] + c0[2] * 0.12, c0[2] * 0.55, 200, 290, 16), false); db2_st(gc, sc.sub, Math.max(1, u), 60, 2);
        // outline: the visible arcs of the circle union + the flat base
        var go = jzGrp(S, 'outline');
        for (k = 0; k < cld.runs.length; k++) jzAddPath(go, cld.runs[k], false);
        if (cld.base) jzAddPath(go, cld.base, false);
        db2_st(go, sc.fg, lw, 90, 2, 2);
        // soft body (union of the circles, one fill = no alpha build-up)
        var gf = jzGrp(S, 'body');
        for (k = 0; k < cld.circles.length; k++) jzAddEllipse(gf, cld.circles[k][2] * 2, cld.circles[k][2] * 2, cld.circles[k][0], cld.circles[k][1]);
        jzAddFill(gf, sc.dim, 50);
        db2_mask(S, db2_rectShape(-Wc * 2, -Wc * 2, Wc * 2, lw / 2));
        db2_lx(ctx, S, 'ADBE Position', ST, CX + '[cx,' + BY + '+Math.sin(t*0.8+' + i + ')*' + jzN(2 * u) + ']');
        db2_lx(ctx, S, 'ADBE Scale', ST, Q + 'var s=100*(0.6+0.4*q);[s,s]');
        db2_op(ctx, S, ST, '(q>0?1:0)*((cx-' + jzN(Wc * 0.6) + '<' + jzN(reg.x - Wc * 0.1) + '||cx+' + jzN(Wc * 0.6) + '>' + jzN(reg.x + reg.w + Wc * 0.1) + ')?0:1)', CX + Q);
    }
});

/* ---- starField — 星空: a fine twinkling star field behind the lyric with an occasional shooting star.
   Stars are static ellipses sorted into (size level × twinkle bucket) groups; each bucket twinkles on its own clock. */
db2_reg('starField', true, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db2_u(ctx), dur = ctx.cut.dur, i, b, lv;
    var dk = db2_dark(sc), col = dk ? sc.fg : sc.sub, kk = dk ? 1 : 0.7, N = Math.min(160, 90 + (d.n | 0) * 25), NB = 4;
    var LA = [0.45, 0.65, 0.9], LR = [1.2, 1.9, 2.8], stars = [[], [], []], bright = [];
    for (lv = 0; lv < 3; lv++) for (b = 0; b < NB; b++) stars[lv].push([]);
    for (i = 0; i < N; i++) {
        var x = db2_r(d.seed, i, 2) * W, y = db2_r(d.seed, i, 3) * H, r6 = db2_r(d.seed, i, 6), l = r6 < 0.6 ? 0 : r6 < 0.9 ? 1 : 2;
        stars[l][i % NB].push([x, y]);
        if (l === 2 && db2_r(d.seed, i, 7) < 0.5) bright.push([x, y, 1.5 + db2_r(d.seed, i, 4) * 3, db2_r(d.seed, i, 5) * 6, db2_r(d.seed, i, 1) * 0.5]);
    }
    var S = jzShapeLayer(ctx, 'star field', 0, 0);
    // shooting star: a fresh streak every 2.4 s (per-cycle start / angle pre-computed)
    var T = 2.4, PH = 0.6 + (d.r || 0) * 0.8, Ls = jzU(ctx) * 0.35, TL = Ls * 0.35, nc = Math.ceil(dur / T) + 2, Q = [], cy;
    for (cy = 0; cy < nc; cy++) Q.push('[' + jzN(W * db2_rr(0.15, 0.85, d.seed, cy, 1)) + ',' + jzN(H * db2_rr(0.05, 0.4, d.seed, cy, 2)) + ',' + (db2_r(d.seed, cy, 3) < 0.5 ? 25 : 155) + ']');
    var SH = 'var ph=t-' + jzN(PH) + ',cy=Math.max(0,Math.floor(ph/' + T + ')),tt=(ph-cy*' + T + ')/0.55,QQ=[' + Q.join(',') + '],q=QQ[Math.min(cy,QQ.length-1)],an=q[2]*Math.PI/180,tl=Math.sin(Math.PI*cl(tt));';
    var gs = jzGrp(S, 'shooting star');
    db2_gx(ctx, gs, 'ADBE Vector Position', 0, SH + 'var e=oc(tt)*' + jzN(Ls) + ';[q[0]+Math.cos(an)*e,q[1]+Math.sin(an)*e]');
    db2_gx(ctx, gs, 'ADBE Vector Rotation', 0, SH + 'q[2]');
    db2_gop(ctx, gs, 0, '(ph>=0&&tt<=1)?1:0', SH);
    for (i = 0; i < 6; i++) {
        var gk = db2_sub(gs, 'tail ' + (i + 1)); jzAddPath(gk, [[0, 0], [-TL, 0]], false);
        db2_trim(ctx, gk, 0, '100*' + jzN((i + 1) / 6) + '*tl', '100*' + jzN(i / 6) + '*tl', null, SH);
        db2_st(gk, col, 1.4 * u * (1 - i / 6), 80 * (1 - i / 6) * kk, 2);
    }
    // cross flares on some bright stars
    for (i = 0; i < bright.length; i++) {
        var B = bright[i], TW = 'var tw=0.5+0.5*Math.sin(t*' + jzN(B[2]) + '+' + jzN(B[3]) + '),f=cl((t-' + jzN(B[4]) + ')/0.3);';
        var gf = jzGrp(S, 'flare ' + (i + 1));
        jzAddPath(gf, [[B[0] - 14 * u, B[1]], [B[0] + 14 * u, B[1]]], false); jzAddPath(gf, [[B[0], B[1] - 14 * u], [B[0], B[1] + 14 * u]], false);
        db2_trim(ctx, gf, 0, '50+25*(1+tw)', '50-25*(1+tw)', null, TW);
        db2_st(gf, col, Math.max(1, 0.8 * u), 50 * kk);
        db2_gop(ctx, gf, 0, 'tw*f', TW);
    }
    // the stars: brightest level on top
    for (lv = 2; lv >= 0; lv--) for (b = 0; b < NB; b++) {
        var L = stars[lv][b]; if (!L.length) continue;
        var g = jzGrp(S, 'stars ' + lv + '.' + b), rr = LR[lv] * u * 0.85;
        for (i = 0; i < L.length; i++) jzAddEllipse(g, rr * 2, rr * 2, L[i][0], L[i][1]);
        jzAddFill(g, col, LA[lv] * kk * 100);
        var s7 = lv * 7 + b;
        db2_gop(ctx, g, 0, '(0.45+0.55*(0.5+0.5*Math.sin(t*' + jzN(1.5 + db2_r(d.seed, s7, 81) * 3) + '+' + jzN(db2_r(d.seed, s7, 82) * 6) + ')))*cl((t-' + jzN(db2_r(d.seed, s7, 83) * 0.5) + ')/0.3)');
    }
    db2_op(ctx, S, 0);
});

/* ---- moonPhases — 月齢: a row of moon-phase icons (new → full → new) with the evening's phase ringed and named */
var DB2_MOON = ['新月', '三日月', '上弦', '十三夜', '満月', '居待月', '下弦', '有明'];
db2_reg('moonPhases', false, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db2_u(ctx), m = db2_mg(ctx), ST = db2_settle(ctx), k, i;
    var n = 8, fs = db2_fs(ctx) * 0.95, r = jzClamp(jzU(ctx) * 0.025, 14 * u, 27 * u), dx = r * 2.8;
    if (dx * (n - 1) + r * 2 > W - 2 * m) { dx = (W - 2 * m - r * 2) / (n - 1); r = Math.min(r, dx / 2.6); }
    var w = dx * (n - 1) + r * 2, h = r * 2 + fs * 2.6, gap = 26 * u, above = !d.low;
    var y0 = above ? bb.y0 - gap - h : bb.y1 + gap;
    if (y0 < m * 0.6 || y0 + h > H - m * 0.6) y0 = above ? bb.y1 + gap : bb.y0 - gap - h;
    var sp = { x: jzClamp((bb.x0 + bb.x1) / 2 - w / 2, m, W - m - w), y: y0, ok: true };
    if (y0 < m * 0.4 || y0 + h > H - m * 0.4) sp = db2_spot(ctx, bb, w, h, d, gap);
    var a = sp.ok ? 1 : 0.35, cy = sp.y + r, ac = db2_acc(sc), target = db2_h(ctx.cut.seed, 3) % n;
    var SEL = 'var sel=ioc((t-0.25)/0.7)*' + target + ';', ly = cy + r * 1.8;
    var S = jzShapeLayer(ctx, 'moon phases', 0, 0);
    // the current phase: ring + tick riding along the row
    var gH = jzGrp(S, 'current');
    var gHt = db2_sub(gH, 'tick'); jzAddPath(gHt, [[0, r * 1.8 - 3 * u], [0, r * 1.8 + 3 * u]], false); db2_st(gHt, ac, Math.max(1, 1.4 * u));
    var gHr = db2_sub(gH, 'ring'); jzAddEllipse(gHr, r * 2.9, r * 2.9); db2_st(gHr, ac, Math.max(1.2, 1.6 * u)); db2_gop(ctx, gHr, ST, 'oe((t-0.2)/0.3)');
    db2_gx(ctx, gH, 'ADBE Vector Position', ST, SEL + '[' + jzN(sp.x + r) + '+sel*' + jzN(dx) + ',' + jzN(cy) + ']');
    var gB = jzGrp(S, 'baseline'); jzAddPath(gB, [[sp.x, ly], [sp.x + w, ly]], false);
    db2_trim(ctx, gB, ST, '100*oe((t-0.1)/0.5)'); db2_st(gB, sc.sub, Math.max(1, u), 50);
    for (k = 0; k < n; k++) {
        var cx = sp.x + r + k * dx, p = k / n, f = (1 - Math.cos(p * Math.PI * 2)) / 2, wax = p <= 0.5, g = jzGrp(S, 'moon ' + (k + 1));
        db2_gpos(g, cx, cy);
        db2_gx(ctx, g, 'ADBE Vector Scale', ST, 'var q=100*ob(cl((t-' + jzN(k * 0.05) + ')/0.3),1.8);[q,q]');
        if (f > 0.02) {
            var kx = 1 - 2 * f, pts = [], gl = db2_sub(g, 'lit');
            for (i = 0; i <= 16; i++) { var t1 = (-90 + 180 * i / 16) * DB2_D; pts.push([cx + (wax ? 1 : -1) * Math.cos(t1) * r, cy + Math.sin(t1) * r]); }
            for (i = 16; i >= 0; i--) { var t2 = (-90 + 180 * i / 16) * DB2_D; pts.push([cx + (wax ? 1 : -1) * kx * Math.cos(t2) * r, cy + Math.sin(t2) * r]); }
            jzAddPath(gl, pts, true); jzAddFill(gl, sc.fg, 92);
        }
        var go = db2_sub(g, 'outline'); jzAddEllipse(go, r * 2, r * 2, cx, cy); db2_st(go, sc.sub, Math.max(1, u), 80);
    }
    jzXf(S, 'ADBE Opacity').setValue(a * 100); db2_op(ctx, S, ST);
    var T = db2_label(ctx, DB2_MOON[target], sp.x + r + target * dx, ly + fs * 1.1, { font: jzSerifF(ctx), size: fs, align: 'center', color: sc.fg, track: 0.2, alpha: a });
    db2_srcText(ctx, T, ST, SEL + '["' + DB2_MOON.join('","') + '"][Math.round(sel)]');
    db2_lx(ctx, T, 'ADBE Position', ST, SEL + '[' + jzN(sp.x + r) + '+sel*' + jzN(dx) + ',value[1]]');
    db2_op(ctx, T, ST, '0.5+0.5*cl((t-0.9)/0.3)');
});

/* ---- sunRays — 陽射し: faint sunburst wedges slowly turning out of a corner (or the bottom edge), behind the lyric */
db2_reg('sunRays', true, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db2_u(ctx);
    var bottom = (d.v | 0) % 3 === 2, cx = bottom ? W / 2 : d.right ? W + W * 0.02 : -W * 0.02, cy = bottom ? H + H * 0.08 : d.low ? H + H * 0.03 : -H * 0.03;
    var N = 16 + (d.n | 0) * 4, R = Math.sqrt(W * W + H * H) * 1.05, dk = db2_dark(sc), ac = db2_acc(sc), R0 = jzU(ctx) * 0.13;
    var S = jzShapeLayer(ctx, 'sun rays', cx, cy);
    // the sun: glow disc + two rings, popping in
    var gS = jzGrp(S, 'sun');
    var g3 = db2_sub(gS, 'disc'); jzAddEllipse(g3, R0 * 1.6, R0 * 1.6); jzAddFill(g3, ac, 12);
    var g2 = db2_sub(gS, 'ring 2'); jzAddEllipse(g2, R0 * 2.36, R0 * 2.36); db2_st(g2, ac, Math.max(1, u), 25);
    var g1 = db2_sub(gS, 'ring'); jzAddEllipse(g1, R0 * 2, R0 * 2); db2_st(g1, ac, Math.max(1, 1.4 * u), 50);
    db2_gx(ctx, gS, 'ADBE Vector Scale', 0, 'var q=100*ob(cl(t/0.5),1.4);[q,q]');
    // wedges: one ray + a Repeater, turning slowly
    var gW = jzGrp(S, 'rays'), a1 = Math.PI * 2 / N * 0.5, gw = db2_sub(gW, 'ray');
    jzAddPath(gw, [[0, 0], [R, 0], [Math.cos(a1) * R, Math.sin(a1) * R]], true);
    db2_rep(gW, N, 0, 0, 360 / N);
    jzAddFill(gW, d.accent ? ac : sc.dim, (d.accent ? (dk ? 0.07 : 0.09) : (dk ? 0.45 : 0.6)) * 100);
    db2_gx(ctx, gW, 'ADBE Vector Rotation', 0, jzN((d.r || 0) * 30) + '+t*' + jzN(2.2 * (d.right ? -1 : 1)));
    db2_gx(ctx, gW, 'ADBE Vector Scale', 0, 'var e=100*oc(t/0.8);[e,e]');
    db2_op(ctx, S, 0);
});

/* ---- rainRipples — 雨の波紋: raindrops landing on a still ground plane in the lower screen, perspective ripple rings (under the lyric).
   One group per drop; each landing cycle's spot / size is pre-computed. */
db2_reg('rainRipples', true, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db2_u(ctx), dur = ctx.cut.dur, i, j, cy;
    var dk = db2_dark(sc), col = dk ? sc.fg : sc.sub, kk = dk ? 0.55 : 0.6, N = 9 + (d.n | 0) * 3, y0 = H * 0.6, y1 = H * 0.97, lw = Math.max(1, 1.1 * u);
    var S = jzShapeLayer(ctx, 'rain ripples', 0, 0);
    for (i = 0; i < N; i++) {
        var T = 1.5 + db2_r(d.seed, i, 1) * 0.9, off = db2_r(d.seed, i, 2) * T, nc = Math.ceil((dur + 1) / T) + 2, Q = [];
        for (cy = 0; cy < nc; cy++) {
            var x = W * db2_rr(0.03, 0.97, d.seed, i, cy, 3), f = db2_r(d.seed, i, cy, 4), y = jzLerp(y0, y1, f * f * 0.3 + f * 0.7);
            var dep = 0.45 + 0.55 * (y - y0) / (y1 - y0), Rm = (70 + db2_r(d.seed, i, cy, 5) * 90) * u * dep;
            Q.push(db2_arr([x, y, Rm, 0.26 * (0.8 + 0.4 * dep), dep]));
        }
        var HD = 'var TT=t+' + jzN(off) + ',cy=Math.floor(TT/' + jzN(T) + '),tau=TT-cy*' + jzN(T) + '-0.22,QQ=[' + Q.join(',') + '],q=QQ[Math.min(cy,QQ.length-1)];';
        var g = jzGrp(S, 'drop ' + (i + 1));
        db2_gx(ctx, g, 'ADBE Vector Position', 0, HD + '[q[0],q[1]]');
        // the falling drop (just before landing)
        var gd = db2_sub(g, 'drop'), gdl = db2_sub(gd, 'streak');
        jzAddPath(gdl, [[0, -26 * u], [0, 0]], false);
        db2_gx(ctx, gdl, 'ADBE Vector Scale', 0, HD + '[100,100*q[4]]');
        db2_gx(ctx, gd, 'ADBE Vector Position', 0, HD + 'var qq=1+tau/0.22;[0,-(1-qq)*' + jzN(H * 0.18) + ']');
        db2_gop(ctx, gd, 0, 'tau<0?0.6:0', HD);
        db2_st(gd, col, lw, kk * 100, 2);
        // three ripple rings, spreading and fading
        for (j = 0; j < 3; j++) {
            var TJ = HD + 'var tj=(tau-' + jzN(j * 0.14) + ')/1.1,r=q[2]*oc(tj)*' + jzN(1 - j * 0.18) + ',al=Math.pow(Math.max(0,1-tj),1.4);';
            var gr = db2_sub(g, 'ring ' + (j + 1)), el = jzAddEllipse(gr, 10, 10);
            jzSetExpr(el.property('ADBE Vector Ellipse Size'), db2_H(ctx, 0) + TJ + '[2*r,2*r*q[3]]');
            db2_gop(ctx, gr, 0, '(tj>0&&tj<1)?(al>0.6?0.8:al>0.3?0.5:0.22):0', TJ);
            db2_st(gr, col, lw, kk * 100);
        }
    }
    db2_op(ctx, S, 0, 'oc(t/0.4)');
});

/* ---- bubbles — シャボン玉: soap bubbles rising and wobbling; bubbles that drift up under the lyric pop just before touching it.
   One group per bubble (body + pop burst); each cycle's spot / size / speed / life is pre-computed. */
db2_reg('bubbles', false, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db2_u(ctx), m = db2_mg(ctx), dur = ctx.cut.dur, i, cy;
    var N = Math.min(14, 7 + (d.n | 0) * 2), iri = db2_acc2(sc), pad = 10 * u, lw = Math.max(1, 1.2 * u);
    var S = jzShapeLayer(ctx, 'bubbles', 0, 0);
    for (i = 0; i < N; i++) {
        var born = db2_r(d.seed, i, 9) < 0.4 && bb.y0 - pad - 30 * u > m, r1 = db2_r(d.seed, i, 1), r2 = db2_r(d.seed, i, 2);
        var Tc = born ? 2.2 + r1 * 1.2 : 3.4 + r1 * 1.6, T0 = born ? -(0.1 + r2 * 1.4) : r2 * Tc, nc = Math.ceil((dur + Tc + 1) / Tc) + 1, Q = [];
        for (cy = 0; cy < nc; cy++) {
            var rc3 = db2_r(d.seed, i, cy, 3), rc4 = db2_r(d.seed, i, cy, 4), rc5 = db2_r(d.seed, i, cy, 5), rc6 = db2_r(d.seed, i, cy, 6), rc7 = db2_r(d.seed, i, cy, 7);
            var R = (14 + rc3 * rc3 * 30) * u * (born ? 0.8 : 1), v = (born ? 45 + rc4 * 40 : 60 + rc4 * 60) * u;
            var x0 = born ? jzLerp(bb.x0 + R, bb.x1 - R, rc5) : m + (W - 2 * m) * rc5;
            var yy0 = born ? bb.y0 - pad - R : H + R + 10 * u, life = born ? Math.min(Tc - 0.3, (yy0 + R) / v) : 2.2 + rc6 * (Tc - 2.6);
            var over = x0 + R + 16 * u > bb.x0 - pad && x0 - R - 16 * u < bb.x1 + pad;
            if (!born && over && yy0 > bb.y1) life = Math.min(life, (yy0 - (bb.y1 + pad + R)) / v);
            Q.push(db2_arr([x0, yy0, R, v, life, rc7 * 6]));
        }
        var HD = 'var TT=t+' + jzN(T0) + ',on=TT>=0?1:0,cy=Math.max(0,Math.floor(TT/' + jzN(Tc) + ')),tau=TT-cy*' + jzN(Tc) + ',QQ=[' + Q.join(',') + '],q=QQ[Math.min(cy,QQ.length-1)],R=q[2],LF=q[4];' +
            'var x=q[0]+Math.sin(tau*1.4+q[5])*' + jzN(16 * u) + (born ? '*Math.min(1,tau)' : '') + ',y=q[1]-q[3]*Math.min(tau,LF);' +
            'var inf=' + (born ? 'ob(cl(tau/0.45),1.6)' : 'ob(cl(t/0.35+((cy>0||' + (r2 * Tc > 0.4 ? 1 : 0) + ')?1:0)),1.6)') + ',wob=Math.sin(tau*5+' + i + ')*0.05,rx=R*(1+wob)*inf,ry=R*(1-wob)*inf;';
        var g = jzGrp(S, 'bubble ' + (i + 1));
        db2_gx(ctx, g, 'ADBE Vector Position', 0, HD + '[x,y]');
        db2_gop(ctx, g, 0, 'on', HD);
        // pop: 8 short sparks flying out from the rim
        var gp = db2_sub(g, 'pop'), gps = db2_sub(gp, 'spark');
        jzAddPath(gps, [[0, 0], [100, 0]], false);
        var PQ = HD + 'var pq=cl((tau-LF)/0.24);';
        db2_gx(ctx, gps, 'ADBE Vector Position', 0, PQ + '[R*(1+pq*0.6),0]');
        db2_gx(ctx, gps, 'ADBE Vector Scale', 0, PQ + '[' + jzN(5 * u) + '*(1-pq),100]');
        db2_rep(gp, 8, 0, 0, 45);
        jzGX(gp).property('ADBE Vector Rotation').setValue((i / DB2_D) % 360);
        db2_st(gp, sc.fg, lw, 100, 2);
        db2_gop(ctx, gp, 0, '(tau>=LF&&tau<LF+0.24)?(1-pq)*0.9:0', PQ);
        // body: rim, iridescent arc, highlight arc, glint
        var gb = db2_sub(g, 'body');
        db2_gop(ctx, gb, 0, '(tau<LF&&co(x,y,' + jzN(pad * 0.5) + '+R,1)>=1)?1:0', HD);
        var g4 = db2_sub(gb, 'glint'), e4 = jzAddEllipse(g4, 3.2 * u, 3.2 * u);
        jzSetExpr(e4.property('ADBE Vector Ellipse Position'), db2_H(ctx, 0) + HD + '[-rx*0.36,-ry*0.44]');
        jzSetExpr(e4.property('ADBE Vector Ellipse Size'), db2_H(ctx, 0) + HD + 'var s=' + jzN(3.2 * u) + '*inf;[s,s]');
        jzAddFill(g4, sc.fg, 90);
        var g3 = db2_sub(gb, 'highlight'), e3 = jzAddEllipse(g3, 10, 10);
        jzSetExpr(e3.property('ADBE Vector Ellipse Size'), db2_H(ctx, 0) + HD + '[1.6*rx,1.6*ry]');
        db2_trimV(g3, 0, 38 / 3.6, 292 + 90); db2_st(g3, sc.fg, 1.6 * u, 70, 2);
        var g2 = db2_sub(gb, 'iridescence'), e2 = jzAddEllipse(g2, 10, 10);
        jzSetExpr(e2.property('ADBE Vector Ellipse Size'), db2_H(ctx, 0) + HD + '[1.6*rx,1.6*ry]');
        db2_trimV(g2, 0, 62 / 3.6, 200 + 90); db2_st(g2, iri, 1.8 * u, 80, 2);
        var g1 = db2_sub(gb, 'rim'), e1 = jzAddEllipse(g1, 10, 10);
        jzSetExpr(e1.property('ADBE Vector Ellipse Size'), db2_H(ctx, 0) + HD + '[2*rx,2*ry]');
        db2_st(g1, sc.fg, lw, 70);
    }
    db2_op(ctx, S, 0);
});

/* ---- smoke — 煙: thin wisps of smoke curling upward (optionally from a stick of incense with a glowing tip), under the lyric.
   AE-native: the wisps are drawn once (the browser's curve at t ≈ 1.2 s), a skew expression sways each strand more the higher it
   gets, Wave Warp sends a ripple up through them, and a layer mask grows them from the base. */
db2_reg('smoke', true, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db2_u(ctx), m = db2_mg(ctx), w, s, q, dd;
    var incense = (d.v | 0) % 2 === 1, dk = db2_dark(sc), col = dk ? sc.fg : sc.sub, kk = dk ? 0.5 : 0.6, ac = db2_acc(sc);
    var nW = incense ? 1 : 2 + ((d.n | 0) % 2), Hm = H * 0.72, T = 1.2;
    var yb = incense ? H - m - 90 * u : H + 10 * u;
    var S = jzShapeLayer(ctx, 'smoke', 0, 0);
    for (w = 0; w < nW; w++) {
        var xb = incense ? (d.right ? W - W * 0.12 : W * 0.12) : W * db2_rr(0.15, 0.85, d.seed, w, 1), seed = d.seed + w * 31;
        var gw = jzGrp(S, 'wisp ' + (w + 1));
        for (s = 0; s < 4; s++) {
            var pts = [], spd = s - 1.5;
            for (dd = 0; dd <= Hm; dd += 8 * u) {
                var A = 6 * u + dd * 0.17, x = xb + spd * dd * 0.035 + db2_noise1(dd / (130 * u) - T * 0.8 + s * 0.45, seed) * A + Math.sin(dd / (75 * u) - T * 1.5 + s * 0.8) * A * 0.4;
                pts.push([x, yb - dd]);
            }
            if (pts.length < 3) continue;
            var gs = db2_sub(gw, 'strand ' + (s + 1));
            db2_gpos(gs, xb, yb);
            db2_gx(ctx, gs, 'ADBE Vector Skew', 0, 'Math.sin(t*' + jzN(0.7 + 0.25 * s) + '+' + jzN(w * 1.7 + s * 0.9) + ')*' + jzN(9 + 3 * s));
            for (q = 3; q >= 0; q--) {
                var gq = db2_sub(gs, 'part ' + (q + 1)); jzAddPath(gq, pts, false);
                db2_trimV(gq, q * 25, Math.min(100, (q + 1) * 25 + 0.5));
                db2_st(gq, col, (1.7 - s * 0.25) * u, (0.6 - q * 0.13) * (1 - s * 0.18) * kk * 100, 2, 2);
            }
        }
    }
    var mk = db2_mask(S, db2_rectShape(-W, yb, 2 * W, yb + 2 * H), null, 6 * u);
    jzSetExpr(mk.property('ADBE Mask Offset'), db2_H(ctx, 0) + jzN(Hm) + '*oc(t/1)');
    var wv = jzEffect(S, 'ADBE Wave Warp', 'JZ Smoke Ripple');
    jzEP(wv, 1, 1); jzEP(wv, 2, 5 * u); jzEP(wv, 3, 470 * u); jzEP(wv, 4, 0); jzEP(wv, 5, 0.24);
    db2_op(ctx, S, 0);
    if (incense) {
        var xi = d.right ? W - W * 0.12 : W * 0.12, I = jzShapeLayer(ctx, 'incense', 0, 0);
        var gt = jzGrp(I, 'ember'); jzAddEllipse(gt, 4.8 * u, 4.8 * u, xi, yb); jzAddFill(gt, ac);
        var gg = jzGrp(I, 'glow'); jzAddEllipse(gg, 12 * u, 12 * u, xi, yb); jzAddFill(gg, ac, 15);
        db2_gop(ctx, gg, 0, '0.7+0.3*Math.sin(t*7)');
        var gk = jzGrp(I, 'stick'); jzAddPath(gk, [[xi, yb], [xi + 1.5 * u, H - m * 0.4]], false); db2_st(gk, sc.sub, 2 * u, 80);
        db2_op(ctx, I, 0);
    }
});

/* ---- dandelion — 綿毛: dandelion seeds (stalk + umbrella of filaments) drifting on the wind, optionally shed from a puffball */
db2_reg('dandelion', false, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db2_u(ctx), m = db2_mg(ctx), i, k;
    var dir = d.right ? 1 : -1, N = 6 + (d.n | 0) * 2 + (d.big ? 3 : 0), lw = Math.max(1, 0.9 * u), ac = db2_acc(sc);
    var puff = !!d.big, px = d.right ? W * 0.1 : W * 0.9, py = H - m - H * 0.16;
    var S = jzShapeLayer(ctx, 'dandelion', 0, 0);
    // one seed (local coords, scale 1): stalk + 13 filaments + tips + the seed body
    var fil = [[[0, 2 * u], [0, -24 * u]]], tips = [];
    for (k = 0; k < 13; k++) { var an = (-90 + (k - 6) * 14) * DB2_D, L = 17 * u, pp = [Math.cos(an) * L, -24 * u + Math.sin(an) * L * 0.75]; fil.push([[0, -24 * u], pp]); tips.push(pp); }
    for (i = 0; i < N; i++) {
        var r = [], j; for (j = 0; j < 10; j++) r.push(db2_r(d.seed, i, j));
        var v = (40 + r[2] * 50) * u, XY;
        if (puff) {
            var TT = (W * 0.9) / v;
            XY = 'var TT=' + jzN(TT) + ',age=wr(t+' + jzN(r[4] * TT) + ',0,TT),x=' + jzN(px) + '+(' + dir + ')*' + jzN(v) + '*age,y=' + jzN(py) + '-' + jzN(v * 0.38) + '*age+Math.sin(t*' + jzN(1 + r[7]) + '+' + jzN(r[8] * 6) + ')*' + jzN(14 * u) + '*Math.min(1,age),ok=age>=0.15;';
        } else {
            XY = 'var x=wr(' + jzN(r[3] * W) + '+(' + dir + ')*' + jzN(v) + '*(t+' + jzN(r[4] * 8) + '),' + jzN(-60 * u) + ',' + jzN(W + 120 * u) + '),y=wr(' + jzN(H * (0.12 + 0.76 * r[5])) + '-' + jzN((18 + r[6] * 20) * u) + '*t+Math.sin(t*' + jzN(1 + r[7]) + '+' + jzN(r[8] * 6) + ')*' + jzN(18 * u) + ',' + jzN(-40 * u) + ',' + jzN(H + 80 * u) + '),ok=true;';
        }
        var QQ = 'var q=oc((t-' + jzN(r[1] * 0.35) + ')/0.4);';
        var g = jzGrp(S, 'seed ' + (i + 1));
        var gb = db2_sub(g, 'body'); jzAddPath(gb, [[0, 2 * u], [0, 10 * u]], false); db2_st(gb, ac, 2.2 * u, 90, 2);
        var gt = db2_sub(g, 'tips'); for (k = 0; k < tips.length; k++) jzAddEllipse(gt, 2.2 * u, 2.2 * u, tips[k][0], tips[k][1]); jzAddFill(gt, sc.fg, 80);
        var gf = db2_sub(g, 'filaments'); for (k = 0; k < fil.length; k++) jzAddPath(gf, fil[k], false); db2_st(gf, sc.fg, lw, 70);
        db2_gx(ctx, g, 'ADBE Vector Position', 0, XY + '[x,y]');
        db2_gx(ctx, g, 'ADBE Vector Rotation', 0, jzN(dir * 12) + '+Math.sin(t*1.2+' + i + ')*18');
        db2_gx(ctx, g, 'ADBE Vector Scale', 0, QQ + 'var s=' + jzN((0.8 + r[9] * 0.5) * 100) + '*q;[s,s]');
        db2_gop(ctx, g, 0, '(ok&&q>0&&co(x,y,' + jzN(14 * u) + ',' + jzN(26 * u) + ')>=0.6)?1:0', XY + QQ);
    }
    if (puff) {                     // the puffball the seeds come from
        var E = 'var e=oc(t/0.5);', gP = jzGrp(S, 'puffball');
        var gc = db2_sub(gP, 'centre'), ec = jzAddEllipse(gc, 8 * u, 8 * u, px, py);
        jzSetExpr(ec.property('ADBE Vector Ellipse Size'), db2_H(ctx, 0) + E + 'var s=' + jzN(8 * u) + '*e;[s,s]');
        jzAddFill(gc, sc.sub);
        var gh = db2_sub(gP, 'head'); db2_sub(gh, 'tips');
        var ghl = db2_sub(gh, 'lines'), ght = db2_kid(gh, 'tips');
        for (k = 0; k < 30; k++) {
            if (db2_r(d.seed, k, 44) < 0.25) continue;
            var a2 = k / 30 * Math.PI * 2, x1 = px + Math.cos(a2) * 30 * u, y1 = py + Math.sin(a2) * 30 * u;
            jzAddPath(ghl, [[px, py], [x1, y1]], false); jzAddEllipse(ght, 2.6 * u, 2.6 * u, x1, y1);
        }
        jzAddFill(ght, sc.fg, 80); db2_st(ghl, sc.fg, lw, 70);
        db2_gpos(gh, px, py); db2_gx(ctx, gh, 'ADBE Vector Scale', 0, E + '[100*e,100*e]');
        var gs = db2_sub(gP, 'stem'), gss = db2_sub(gs, 'path'), st = [];
        for (k = 0; k <= 12; k++) { var f = k / 12; st.push([px + Math.sin(f * 2) * 8 * u * (d.right ? -1 : 1), H + 4 * u - (H + 4 * u - py) * f]); }
        jzAddPath(gss, st, false); db2_gpos(gss, px, H + 4 * u);
        db2_gx(ctx, gss, 'ADBE Vector Scale', 0, E + '[100,100*e]');
        db2_st(gs, sc.sub, 1.6 * u, 90, 2);
    }
    db2_op(ctx, S, 0);
});

/* ---- fireflies — 蛍: fireflies wandering around the lyric, glowing on and off with soft halos and faint trails */
db2_reg('fireflies', false, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db2_u(ctx), m = db2_mg(ctx), dur = ctx.cut.dur, i;
    var col = db2_acc(sc);
    if (db2_dark(sc)) { var c2 = db2_acc2(sc); if (jzLum(c2) > jzLum(col)) col = c2; }
    var N = Math.min(16, 9 + (d.n | 0) * 2), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2;
    var S = jzShapeLayer(ctx, 'fireflies', 0, 0);
    for (i = 0; i < N; i++) {
        var r = [], j; for (j = 0; j < 6; j++) r.push(db2_r(d.seed, i, j));
        var PS = 'function ps(T){var th=' + jzN(r[2] * Math.PI * 2) + '+nz(T*0.18+' + jzN(i * 3.1) + ',' + db2_ntab(d.seed, i * 3.1 - 0.1, i * 3.1 + (dur + 1) * 0.18) + ')*1.6,' +
            'rd=' + jzN(0.55 + 0.45 * r[3]) + '+0.12*nz(T*0.3+' + jzN(i * 5.3) + ',' + db2_ntab(d.seed + 1, i * 5.3 - 0.1, i * 5.3 + (dur + 1) * 0.3) + ');' +
            'return [Math.max(' + jzN(m * 0.5) + ',Math.min(' + jzN(W - m * 0.5) + ',' + jzN(cx) + '+Math.cos(th)*' + jzN(W * 0.5 - m) + '*rd)),Math.max(' + jzN(m * 0.5) + ',Math.min(' + jzN(H - m * 0.5) + ',' + jzN(cy) + '+Math.sin(th)*' + jzN(H * 0.5 - m) + '*rd))];}var p=ps(t);';
        var g = jzGrp(S, 'firefly ' + (i + 1));
        var gc = db2_sub(g, 'core'); jzAddEllipse(gc, 6 * u, 6 * u); jzAddFill(gc, col);
        var gt = db2_sub(g, 'trail'), gts = db2_sub(gt, 'seg'); jzAddPath(gts, [[0, 0], [100, 0]], false);
        db2_gx(ctx, gts, 'ADBE Vector Rotation', 0, PS + 'var q=ps(t-0.25);Math.atan2(q[1]-p[1],q[0]-p[0])*180/Math.PI');
        db2_gx(ctx, gts, 'ADBE Vector Scale', 0, PS + 'var q=ps(t-0.25);[Math.sqrt((q[0]-p[0])*(q[0]-p[0])+(q[1]-p[1])*(q[1]-p[1])),100]');
        db2_st(gt, col, 1.2 * u, 20, 2);
        var gh2 = db2_sub(g, 'halo'); jzAddEllipse(gh2, 17 * u, 17 * u); jzAddFill(gh2, col, 26);
        var gh1 = db2_sub(g, 'glow'); jzAddEllipse(gh1, 40 * u, 40 * u); jzAddFill(gh1, col, 10);
        db2_gx(ctx, g, 'ADBE Vector Position', 0, PS + 'p');
        db2_gop(ctx, g, 0, 'al>0.02?cl((t-' + jzN(r[1] * 0.4) + ')/0.4)*al*(Math.pow(Math.max(0,Math.sin(t*' + jzN(1.6 + r[4] * 1.4) + '+' + jzN(r[5] * 6) + ')),2)*0.85+0.15):0',
            PS + 'var al=co(p[0],p[1],' + jzN(10 * u) + ',' + jzN(34 * u) + ');');
    }
    db2_op(ctx, S, 0);
});

// ================================================================ graphic shapes

/* ---- memphis — メンフィス: Memphis-style squiggles, zigzags, outlined triangles, dot grids and hatch strokes placed round the lyric */
db2_reg('memphis', false, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db2_u(ctx), ST = db2_settle(ctx), i, k;
    var K = Math.min(8, 5 + (d.n | 0)), pad = 34 * u + db2_bh(bb) * 0.22;
    var X0 = bb.x0 - pad, X1 = bb.x1 + pad, Y0 = bb.y0 - pad, Y1 = bb.y1 + pad, per = 2 * (X1 - X0 + Y1 - Y0);
    var cols = [db2_acc(sc), db2_acc2(sc), sc.fg], S0 = jzClamp(jzU(ctx) * 0.036, 24 * u, 44 * u), lw = 3.4 * u;
    var types = ['squig', 'zig', 'tri', 'dots', 'half', 'hatch'];
    var S = jzShapeLayer(ctx, 'memphis', 0, 0);
    for (i = 0; i < K; i++) {
        var p = db2_perim(X0, Y0, X1, Y1, ((i + 0.2 + db2_r(d.seed, i, 1) * 0.6) / K) * per);
        var x = jzClamp(p[0], S0 * 1.6, W - S0 * 1.6), y = jzClamp(p[1], S0 * 1.6, H - S0 * 1.6);
        if (db2_clear(bb, x, y, S0 * 1.3, 1) < 1) continue;
        var type = types[(i + (d.v | 0)) % types.length], col = cols[i % 3], pts = [];
        var Q = 'var q=cl((t-' + jzN(0.04 + i * 0.06) + ')/0.4),s2=ob(q,2),de=ioc(q);';
        var g = jzGrp(S, type + ' ' + (i + 1)), gi = db2_sub(g, 'shape');
        jzGX(g).property('ADBE Vector Position').setValue([x, y]);
        db2_gx(ctx, g, 'ADBE Vector Rotation', ST, jzN(db2_r(d.seed, i, 3) * 360) + '+Math.sin(t*1.3+' + i + ')*6');
        db2_gop(ctx, g, ST, 'q>0?1:0', Q);
        if (type === 'squig' || type === 'zig') {
            if (type === 'squig') for (k = 0; k <= 24; k++) { var f = k / 24; pts.push([(f - 0.5) * S0 * 2.6, Math.sin(f * Math.PI * 3) * S0 * 0.28]); }
            else for (k = 0; k <= 6; k++) pts.push([(k / 6 - 0.5) * S0 * 2.4, (k % 2 ? -1 : 1) * S0 * 0.3]);
            jzAddPath(gi, pts, false);
            db2_trim(ctx, g, ST, '100*de', null, null, Q);
            db2_st(g, col, lw, 100, 2, 2);
        } else if (type === 'tri') {
            for (k = 0; k < 3; k++) { var an = (-90 + k * 120) * DB2_D; pts.push([Math.cos(an) * S0 * 0.8, Math.sin(an) * S0 * 0.8]); }
            jzAddPath(gi, pts, true);
            db2_gx(ctx, gi, 'ADBE Vector Scale', ST, Q + '[100*s2,100*s2]');
            db2_st(g, col, lw * 0.8, 100, 1, 2);
        } else if (type === 'dots') {
            var gd = db2_sub(gi, 'dot'), ed = jzAddEllipse(gd, 5.2 * u, 5.2 * u, -S0 * 0.5, -S0 * 0.5);
            jzSetExpr(ed.property('ADBE Vector Ellipse Size'), db2_H(ctx, ST) + Q + 'var r=' + jzN(5.2 * u) + '*s2;[r,r]');
            db2_rep(gi, 3, S0 * 0.5, 0);
            var rp2 = db2_rep(gi, 3, 0, S0 * 0.5);
            jzAddFill(g, col);
        } else if (type === 'half') {
            jzAddPath(gi, db2_arc(0, 0, S0 * 0.7, 180, 360, 20), true);
            db2_gx(ctx, gi, 'ADBE Vector Scale', ST, Q + '[100*s2,100*s2]');
            jzAddFill(g, col);
        } else {
            for (k = -1; k <= 1; k++) jzAddPath(gi, [[k * S0 * 0.45 - S0 * 0.3, S0 * 0.5], [k * S0 * 0.45 + S0 * 0.3, -S0 * 0.5]], false);
            db2_trim(ctx, g, ST, '50+50*de', '50-50*de', null, Q);
            db2_st(g, col, lw * 0.9, 100, 2);
        }
    }
    db2_op(ctx, S, ST);
});

/* ---- zigzagRibbon — ジグザグリボン: an accordion-folded two-tone ribbon unfurling in from a screen corner.
   Each fold is a parallelogram that grows out of its start point as the ribbon unfurls (uniform scale instead of the browser's
   lengthening). */
db2_reg('zigzagRibbon', false, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db2_u(ctx), ST = db2_settle(ctx), k;
    var rw = jzClamp(jzU(ctx) * 0.3, 200 * u, 420 * u), rh = rw * 0.42;
    var sp = db2_corner(ctx, bb, rw, rh, d, 0.6), a = sp.ok ? 1 : 0.3;
    var sx = sp.sx, sy = sp.sy, ox = sx > 0 ? W + 20 * u : -20 * u, oy = sy > 0 ? sp.y + rh * 0.75 : sp.y + rh * 0.25;
    var ix = sx > 0 ? sp.x : sp.x + rw, iy = sy > 0 ? sp.y + rh * 0.2 : sp.y + rh * 0.8;
    var L = Math.sqrt((ix - ox) * (ix - ox) + (iy - oy) * (iy - oy)), dx = (ix - ox) / L, dy = (iy - oy) / L, nx = -dy, ny = dx;
    var seg = 7, Z = rh * 0.22, wv = rh * 0.3, vx = nx * 0.35, vy = 1, vl = Math.sqrt(vx * vx + vy * vy), VX = vx / vl * wv, VY = vy / vl * wv;
    function C(k) { var s = L * k / seg, z = k % 2 ? Z : -Z; return [ox + dx * s + nx * z, oy + dy * s + ny * z]; }
    var c1 = db2_acc(sc), a2 = db2_acc2(sc), c2 = jzContrast(a2, sc.bg) > 1.6 && a2 !== c1 ? a2 : jzMixHex(c1, sc.bg, 0.4);
    var S = jzShapeLayer(ctx, 'zigzag ribbon', 0, 0);
    jzGrp(S, 'fold edges'); jzGrp(S, 'front folds'); jzGrp(S, 'back folds');
    var gE = db2_top(S, 'fold edges'), gF = db2_top(S, 'front folds'), gB = db2_top(S, 'back folds');
    for (k = 0; k < seg; k++) {
        var p0 = C(k), p1 = C(k + 1), F = 'var f=cl(oc(t/0.6)*' + seg + '-' + k + ');';
        var gq = db2_sub(k % 2 ? gB : gF, 'fold ' + (k + 1));
        jzAddPath(gq, [p0, p1, [p1[0] + VX, p1[1] + VY], [p0[0] + VX, p0[1] + VY]], true);
        var ge = db2_sub(gE, 'edges ' + (k + 1));
        jzAddPath(ge, [p0, p1], false); jzAddPath(ge, [[p0[0] + VX, p0[1] + VY], [p1[0] + VX, p1[1] + VY]], false);
        for (var q = 0; q < 2; q++) {
            var gg = q ? ge : gq;
            db2_gpos(gg, p0[0], p0[1]);
            db2_gx(ctx, gg, 'ADBE Vector Scale', ST, F + '[100*f,100*f]');
        }
    }
    db2_st(gE, sc.bg, Math.max(1, 0.8 * u), 25);
    jzAddFill(gF, c1, 95); jzAddFill(gB, c2, 95);
    jzXf(S, 'ADBE Opacity').setValue(a * 100); db2_op(ctx, S, ST);
});

/* ---- polkaPatch — 水玉: a patch of polka dots whose sizes breathe in a travelling diagonal wave.
   Dots on the same diagonal share their size; a few light up in the other colour at the wave crest. */
db2_reg('polkaPatch', false, function (ctx, bb, d) {
    var sc = ctx.sc, u = db2_u(ctx), ST = db2_settle(ctx), i, j;
    var cols = 6 + (d.n | 0), rows = 3 + ((d.v | 0) % 2), s = jzClamp(jzU(ctx) * 0.03, 20 * u, 36 * u);
    var w = (cols - 0.5) * s, h = (rows - 1) * s * 0.87 + s;
    var sp = db2_spot(ctx, bb, w, h, d, 24 * u), a = sp.ok ? 1 : 0.35;
    var round = (d.v | 0) % 3 === 2, ac = db2_acc(sc), dir = d.right ? 1 : -1, cMain = d.accent ? ac : sc.fg, cHot = d.accent ? sc.fg : ac;
    var S = jzShapeLayer(ctx, 'polka patch', 0, 0), groups = {};
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
        var x = sp.x + s * 0.5 + i * s + (j % 2 ? s * 0.5 : 0), y = sp.y + s * 0.5 + j * s * 0.87;
        if (x > sp.x + w) continue;
        if (round) { var fx = (x - sp.x - w / 2) / (w / 2), fy = (y - sp.y - h / 2) / (h / 2); if (fx * fx + fy * fy > 1.05) continue; }
        var dd = (dir > 0 ? i : cols - i) + j, hot = (i + j) % 3 === 0, key = dd + (hot ? 'h' : '');
        if (!groups[key]) {
            var gn = 'diagonal ' + dd + (hot ? ' hot' : '');
            jzGrp(S, gn);
            groups[key] = { name: gn, dd: dd, hot: hot, list: [] };
        }
        groups[key].list.push([x, y]);
    }
    for (var kk in groups) {
        if (!groups.hasOwnProperty(kk)) continue;
        var G = groups[kk], gG = db2_top(S, G.name), WV = 'var q=ob(cl((t-' + jzN(G.dd * 0.03) + ')/0.3),2),wv=0.5+0.5*Math.sin(t*3.2-' + jzN(G.dd * 0.7) + '),r=' + jzN(s * 0.84) + '*(0.35+0.65*wv)*q;';
        for (i = 0; i < G.list.length; i++) {
            var el = jzAddEllipse(gG, s * 0.84, s * 0.84, G.list[i][0], G.list[i][1]);
            jzSetExpr(el.property('ADBE Vector Ellipse Size'), db2_H(ctx, ST) + WV + '[r,r]');
        }
        var fl = jzAddFill(gG, cMain, 90);
        if (G.hot) {
            jzSetExpr(fl.property('ADBE Vector Fill Color'), db2_H(ctx, ST) + WV + 'wv>0.93?' + db2_cx(cHot) + ':' + db2_cx(cMain));
            jzSetExpr(fl.property('ADBE Vector Fill Opacity'), db2_H(ctx, ST) + WV + 'wv>0.93?100:90');
        }
    }
    jzXf(S, 'ADBE Opacity').setValue(a * 100); db2_op(ctx, S, ST);
});

/* ---- stripeCircle — 縞の円: a disc filled with fine rotating stripes, ringed, with an off-register outline "shadow"
   (variant: a half disc of sliding stripes under fine concentric arcs). Stripes are clipped by a layer mask. */
db2_reg('stripeCircle', false, function (ctx, bb, d) {
    var sc = ctx.sc, u = db2_u(ctx), ST = db2_settle(ctx), k;
    var R = jzClamp(jzU(ctx) * 0.062, 40 * u, 80 * u), sp = db2_spot(ctx, bb, R * 2.4, R * 2.4, d, 22 * u), a = sp.ok ? 1 : 0.35;
    var cx = sp.cx - 3 * u, cy = sp.cy - 3 * u, half = (d.v | 0) % 2 === 1, ac = db2_acc(sc), sp2 = 8 * u;
    var E = 'var e=ob(cl(t/0.45),1.5);', SCL = E + '[100*e,100*e]';
    // off-register shadow ring
    var C = jzShapeLayer(ctx, 'stripe circle shadow', cx, cy), gc = jzGrp(C, 'shadow'); jzAddEllipse(gc, R * 2, R * 2, 7 * u, 7 * u);
    db2_st(gc, sc.sub, Math.max(1, u), 70);
    db2_lx(ctx, C, 'ADBE Scale', ST, SCL); jzXf(C, 'ADBE Opacity').setValue(a * 100); db2_op(ctx, C, ST, 'cl((t-0.2)/0.3)');
    // stripes, clipped to the disc (or its lower half)
    var B = jzShapeLayer(ctx, 'stripe circle stripes', cx, cy), gS = jzGrp(B, 'stripes'), gm = db2_sub(gS, 'slide'), gl = db2_sub(gm, 'stripe');
    var n = Math.ceil(R / sp2) + 1;
    jzAddPath(gl, [[0, -R * 1.2], [0, R * 1.2]], false);
    db2_rep(gm, 2 * n + 1, sp2, 0, 0, -n);
    if (half) db2_gx(ctx, gm, 'ADBE Vector Position', ST, '[(t*' + jzN(14 * u) + ')%' + jzN(sp2) + ',0]');
    db2_st(gS, ac, 3.2 * u);
    db2_gx(ctx, gS, 'ADBE Vector Rotation', ST, '45' + (half ? '' : '+t*' + jzN(18 * (d.right ? 1 : -1))));
    var sh = new Shape(), kk = 0.5523 * R;
    if (half) { sh.vertices = [[R, 0], [0, R], [-R, 0]]; sh.inTangents = [[0, 0], [kk, 0], [0, kk]]; sh.outTangents = [[0, kk], [-kk, 0], [0, 0]]; sh.closed = true; }
    else sh = jzCircleShape(0, 0, R);
    db2_mask(B, sh);
    db2_lx(ctx, B, 'ADBE Scale', ST, SCL); jzXf(B, 'ADBE Opacity').setValue(a * 100); db2_op(ctx, B, ST);
    // ring (+ arcs and diameter on the half variant)
    var A = jzShapeLayer(ctx, 'stripe circle', cx, cy), gr = jzGrp(A, 'ring'); jzAddEllipse(gr, R * 2, R * 2);
    db2_st(gr, sc.fg, Math.max(1, 1.5 * u));
    if (half) {
        var gd = jzGrp(A, 'diameter'); jzAddPath(gd, [[-R, 0], [R, 0]], false); db2_st(gd, sc.fg, Math.max(1, 1.2 * u));
        var ga = jzGrp(A, 'arcs');
        for (k = 1; k <= 3; k++) jzAddEllipse(ga, R * k / 2, R * k / 2);
        var tr = db2_trim(ctx, ga, ST, '50*ioc((t-0.2)/0.5)'); tr.property('ADBE Vector Trim Offset').setValue(270);
        db2_st(ga, sc.fg, Math.max(1, 1.1 * u), 80);
    }
    db2_lx(ctx, A, 'ADBE Scale', ST, SCL); jzXf(A, 'ADBE Opacity').setValue(a * 100); db2_op(ctx, A, ST);
});

/* ---- decoCorners — 装飾コーナー: art-deco corner ornaments (stepped double L, quarter arc, diamonds) drawn out from two screen corners */
db2_reg('decoCorners', false, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db2_u(ctx), m = db2_mg(ctx), k, j;
    var Lc = jzClamp(jzU(ctx) * 0.15, 90 * u, 190 * u), g = 9 * u, lw = Math.max(1, 1.3 * u), ac = db2_acc(sc);
    var cs = d.big ? [[-1, -1], [1, -1], [1, 1], [-1, 1]] : d.corner ? [[-1, -1], [1, 1]] : [[1, -1], [-1, 1]];
    var S = jzShapeLayer(ctx, 'deco corners', 0, 0);
    for (k = 0; k < cs.length; k++) {
        var sx = cs[k][0], sy = cs[k][1], X = sx < 0 ? m * 0.7 : W - m * 0.7, Y = sy < 0 ? m * 0.7 : H - m * 0.7;
        if (db2_hit(Math.min(X, X - sx * Lc), Math.min(Y, Y - sy * Lc), Math.max(X, X - sx * Lc), Math.max(Y, Y - sy * Lc), bb, 6 * u)) continue;
        var ix = -sx, iy = -sy, dk = jzN(k * 0.06);
        var P2 = function (ddx, ddy) { return [X + ix * ddx, Y + iy * ddy]; };
        var E1 = 'var e=oc((t-' + dk + ')/0.55);', E2 = 'var e2=oc((t-0.15-' + dk + ')/0.5);', Q = 'var q=ob(cl((t-0.35-' + dk + ')/0.3),2);';
        var G = jzGrp(S, 'corner ' + (k + 1));
        // diamonds + dot (pop in last, on top)
        var dia = [[P2(Lc, 0), 4 * u, ac, 100], [P2(0, Lc), 4 * u, ac, 100], [P2(Lc * 0.42 * 0.7071, Lc * 0.42 * 0.7071), 5.5 * u, sc.fg, 90]];
        var gdt = db2_sub(G, 'dot'), pdt = P2(g * 3.4, g * 3.4); jzAddEllipse(gdt, 3.6 * u, 3.6 * u); jzAddFill(gdt, ac);
        jzGX(gdt).property('ADBE Vector Position').setValue(pdt); db2_gx(ctx, gdt, 'ADBE Vector Scale', 0, Q + '[100*q,100*q]');
        for (j = 0; j < dia.length; j++) {
            var r = dia[j][1], gd = db2_sub(G, 'diamond ' + (j + 1));
            jzAddPath(gd, [[0, -r], [r, 0], [0, r], [-r, 0]], true); jzAddFill(gd, dia[j][2], dia[j][3]);
            jzGX(gd).property('ADBE Vector Position').setValue(dia[j][0]); db2_gx(ctx, gd, 'ADBE Vector Scale', 0, Q + '[100*q,100*q]');
        }
        // quarter arcs opening from their middle
        var a0 = Math.atan2(iy, 0) / DB2_D, a1 = Math.atan2(0, ix) / DB2_D, s0 = a0, s1 = a1;
        if (Math.abs(s1 - s0) > 180) { if (s1 < s0) s1 += 360; else s0 += 360; }
        var mid = (s0 + s1) / 2, hs = (s1 - s0) / 2;
        var ga2 = db2_sub(G, 'arc 2'); jzAddPath(ga2, db2_arc(X, Y, Lc * 0.42 + 5 * u, mid - hs * 0.6, mid + hs * 0.6, 20), false);
        db2_trim(ctx, ga2, 0, '50+50*e2', '50-50*e2', null, E2); db2_st(ga2, sc.sub, Math.max(1, 0.8 * u), 50);
        var ga = db2_sub(G, 'arc'); jzAddPath(ga, db2_arc(X, Y, Lc * 0.42, mid - hs, mid + hs, 30), false);
        db2_trim(ctx, ga, 0, '50+50*e2', '50-50*e2', null, E2); db2_st(ga, sc.fg, lw, 50);
        // stepped inner L and the outer L, drawn out from the corner
        var gi = db2_sub(G, 'inner'); jzAddPath(gi, [P2(Lc * 0.62, g), P2(g * 2, g), P2(g * 2, g * 2), P2(g, g * 2), P2(g, Lc * 0.62)], false);
        db2_trim(ctx, gi, 0, '50+50*e', '50-50*e', null, E1); db2_st(gi, sc.fg, lw, 60);
        var go = db2_sub(G, 'outer'); jzAddPath(go, [P2(Lc, 0), P2(0, 0), P2(0, Lc)], false);
        db2_trim(ctx, go, 0, '50+50*e', '50-50*e', null, E1); db2_st(go, sc.fg, lw, 85);
    }
    db2_op(ctx, S, 0);
});

/* ---- halfCircles — 半円の積層: Bauhaus half-circles: a stacked tower of domes, a scalloped row, or nested rainbow arches */
db2_reg('halfCircles', false, function (ctx, bb, d) {
    var sc = ctx.sc, u = db2_u(ctx), ST = db2_settle(ctx), k;
    var v = (d.v | 0) % 3, R = jzClamp(jzU(ctx) * 0.058, 38 * u, 74 * u), lw = Math.max(1.2, 1.6 * u);
    var bw0 = v === 1 ? R * 7.4 : R * 2.2, bh0 = v === 0 ? R * 2.5 : v === 1 ? R * 1.3 : R * 1.2;
    var sp = db2_spot(ctx, bb, bw0, bh0, d, 24 * u), a = sp.ok ? 1 : 0.35, ac = db2_acc(sc), a2 = db2_acc2(sc);
    function grow(k) { return 'ob(cl((t-' + jzN(k * 0.08) + ')/0.35),1.6)'; }
    var S = jzShapeLayer(ctx, 'half circles', 0, 0), g;
    if (v === 0) {                                     // tower of domes (each sits on the one below)
        var yb = sp.y + bh0;
        for (k = 3; k >= 0; k--) {
            var r = R * (1 - k * 0.2), stack = [], j;
            for (j = 0; j < k; j++) stack.push(jzN(R * (1 - j * 0.2) * 0.62) + '*' + grow(j));
            g = jzGrp(S, 'dome ' + (k + 1));
            var gp = db2_sub(g, 'dome'); jzAddPath(gp, db2_arc(0, 0, r, 180, 360, 28), true);
            db2_gx(ctx, gp, 'ADBE Vector Scale', ST, 'var q=100*' + grow(k) + ';[q,q]');
            db2_gx(ctx, g, 'ADBE Vector Position', ST, '[' + jzN(sp.cx) + '+Math.sin(t*1.2+' + k + ')*' + jzN(2 * u * k) + ',' + jzN(yb) + (stack.length ? '-(' + stack.join('+') + ')' : '') + ']');
            if (k % 2 === 0) jzAddFill(g, k === 0 ? ac : sc.fg, 95); else db2_st(g, sc.fg, lw, 100, 1, 2);
        }
    } else if (v === 1) {                              // scalloped row, alternating up / down
        var r1 = R * 0.6, y = sp.cy;
        g = jzGrp(S, 'baseline'); jzAddPath(g, [[sp.x, y], [sp.x + bw0, y]], false);
        db2_trim(ctx, g, ST, '100*oe(t/0.5)'); db2_st(g, sc.fg, Math.max(1, u), 60);
        for (k = 0; k < 6; k++) {
            var cx = sp.x + r1 + k * r1 * 2, up = k % 2 === 0;
            g = jzGrp(S, 'scallop ' + (k + 1));
            var gs = db2_sub(g, 'arc'); jzAddPath(gs, db2_arc(0, 0, r1, up ? 180 : 0, up ? 360 : 180, 20), true);
            db2_gx(ctx, gs, 'ADBE Vector Scale', ST, 'var q=100*' + grow(k) + ';[q,q]');
            db2_gx(ctx, g, 'ADBE Vector Position', ST, '[' + jzN(cx) + ',' + jzN(y) + '+Math.sin(t*2+' + k + ')*' + jzN(2 * u) + ']');
            if (k % 3 === 0) jzAddFill(g, ac, 95); else if (k % 3 === 1) jzAddFill(g, a2, 90); else db2_st(g, sc.fg, lw);
        }
    } else {                                           // nested arches drawing on, with a filled core
        var yb2 = sp.y + bh0;
        g = jzGrp(S, 'baseline'); jzAddPath(g, [[sp.cx - R * 1.1, yb2], [sp.cx + R * 1.1, yb2]], false);
        db2_st(g, sc.fg, Math.max(1, u), 70); db2_gop(ctx, g, ST, 'oe(t/0.4)');
        g = jzGrp(S, 'core'); var gcc = db2_sub(g, 'disc'); jzAddPath(gcc, db2_arc(0, 0, R * 0.28, 180, 360, 20), true);
        db2_gx(ctx, gcc, 'ADBE Vector Scale', ST, 'var q=100*' + grow(0) + ';[q,q]');
        jzAddFill(g, ac);
        jzGX(g).property('ADBE Vector Position').setValue([sp.cx, yb2]);
        for (k = 3; k >= 0; k--) {
            var rk = R * (1 - k * 0.18);
            g = jzGrp(S, 'arch ' + (k + 1)); jzAddEllipse(g, rk * 2, rk * 2, sp.cx, yb2);
            db2_trim(ctx, g, ST, '50*oc(cl(' + grow(4 - k) + '))', null, '270+Math.sin(t*0.8)*3');
            db2_st(g, k % 2 ? ac : sc.fg, 3 * u);
        }
    }
    jzXf(S, 'ADBE Opacity').setValue(a * 100); db2_op(ctx, S, ST);
});

/* ---- loopArrows — 循環矢印: circular chasing arrows (2 or 3) rotating round a small readout, like a repeat / refresh glyph */
db2_reg('loopArrows', false, function (ctx, bb, d) {
    var sc = ctx.sc, u = db2_u(ctx), ST = db2_settle(ctx), k;
    var R = jzClamp(jzU(ctx) * 0.055, 36 * u, 70 * u), sp = db2_spot(ctx, bb, R * 2.8, R * 2.8, d, 22 * u), a = sp.ok ? 1 : 0.35;
    var n = 2 + ((d.n | 0) % 2), dir = d.right ? 1 : -1, ac = db2_acc(sc), lw = Math.max(1.4, 2.4 * u), seg = 360 / n, hs = 7 * u;
    var E = 'var e=oc(t/0.5),sw=' + jzN(seg - 38) + '*e;';
    var S = jzShapeLayer(ctx, 'loop arrows', sp.cx, sp.cy), gA = jzGrp(S, 'arrows');
    db2_gx(ctx, gA, 'ADBE Vector Rotation', ST, 'var e=oc(t/0.5);' + dir + '*(t*70+(1-e)*-120)+' + jzN((d.r || 0) * 360));
    for (k = 0; k < n; k++) {
        var gh = db2_sub(gA, 'head ' + (k + 1));
        jzAddPath(gh, [[R, 1.3 * dir * hs], [R + hs, -0.4 * dir * hs], [R - hs, -0.4 * dir * hs]], true); jzAddFill(gh, ac);
        jzGX(gh).property('ADBE Vector Anchor').setValue([R, 0]);
        var A1 = E + 'var a1=' + jzN(k * seg) + '+(' + dir + ')*sw;';
        db2_gx(ctx, gh, 'ADBE Vector Position', ST, A1 + '[' + jzN(R) + '*Math.cos(a1*Math.PI/180),' + jzN(R) + '*Math.sin(a1*Math.PI/180)]');
        db2_gx(ctx, gh, 'ADBE Vector Rotation', ST, A1 + 'a1');
        db2_gx(ctx, gh, 'ADBE Vector Scale', ST, E + '[100*e,100*e]');
        var gc = db2_sub(gA, 'arc ' + (k + 1)); jzAddEllipse(gc, R * 2, R * 2);
        db2_trim(ctx, gc, ST, 'sw/3.6', null, jzN(k * seg + 90) + (dir < 0 ? '-sw' : ''), E);
        db2_st(gc, sc.fg, lw, 100, 2);
    }
    var gr = jzGrp(S, 'ring'); jzAddEllipse(gr, R * 2.64, R * 2.64); db2_st(gr, sc.sub, Math.max(1, 0.8 * u), 35);
    db2_gop(ctx, gr, ST, 'oc(t/0.5)');
    jzXf(S, 'ADBE Opacity').setValue(a * 100); db2_op(ctx, S, ST);
    var T = db2_label(ctx, '×1', sp.cx, sp.cy, { size: R * 0.5, align: 'center', color: sc.fg, track: 0.02, alpha: a });
    db2_srcText(ctx, T, ST, '"×"+(1+Math.floor(Math.max(0,t)/1.1))');
    db2_op(ctx, T, ST, 'oe((t-0.2)/0.3)');
});

/* ---- starburst — スターバースト: a zig-zag "sale sticker" badge that spins in beside the lyric, with a word / number inside */
db2_reg('starburst', false, function (ctx, bb, d) {
    var sc = ctx.sc, u = db2_u(ctx), ST = db2_settle(ctx);
    var R = jzClamp(jzU(ctx) * 0.068, 44 * u, 88 * u), sp = db2_near(ctx, bb, R * 2.2, R * 2.2, d, 14 * u), a = sp.ok ? 1 : 0.35;
    var ac = db2_acc(sc), txtC = jzLum(ac) > 0.55 ? '#000000' : sc.bg, Q = 'var q=ob(cl((t-0.05)/0.4),2.2);';
    var ROT = Q + 'var rot=t*9+(1-q)*-120+' + jzN((d.r || 0) * 30) + ';';
    var S = jzShapeLayer(ctx, 'starburst', sp.cx, sp.cy);
    var gi = jzGrp(S, 'inner ring'); jzAddEllipse(gi, R * 1.4, R * 1.4); db2_st(gi, txtC, Math.max(1, 1.2 * u), 55);
    var gs = jzGrp(S, 'badge'), st = jzAddStar(gs, 22, R, R * 0.83);
    st.property('ADBE Vector Star Rotation').setValue(90); jzAddFill(gs, ac, 97);
    db2_lx(ctx, S, 'ADBE Rotate Z', ST, ROT + 'rot');
    db2_lx(ctx, S, 'ADBE Scale', ST, Q + '[100*q,100*q]');
    jzXf(S, 'ADBE Opacity').setValue(a * 100); db2_op(ctx, S, ST);
    var v = (d.v | 0) % 5, ch = db2_lyricChar(ctx, 9);
    var txt = ['No.' + db2_pad((ctx.cut.line | 0) + 1), 'NEW', 'HIT!', ch || '♪', 'LOVE'][v];
    var font = v === 3 ? jzSerifF(ctx) : db2_dispF(ctx), fs = R * (v === 3 ? 0.7 : 0.42);
    var T = jzText(ctx, txt, { font: font, size: fs, color: txtC, x: sp.cx, y: sp.cy, track: 0.02, opacity: a });
    var tw = db2_textW(T); if (tw > R * 1.15) jzFit(T, R * 1.15, 1e6), jzAnchor(T, 'center');
    db2_lx(ctx, T, 'ADBE Rotate Z', ST, ROT + 'rot*0.15');
    db2_lx(ctx, T, 'ADBE Scale', ST, Q + '[value[0]*q,value[1]*q]');
    db2_op(ctx, T, ST);
});

/* ---- tally — 正の字: hand-drawn tally marks (正) counting up stroke by stroke through the cut */
var DB2_SEI = [[[0.1, 0.12], [0.9, 0.12]], [[0.5, 0.12], [0.5, 0.9]], [[0.5, 0.5], [0.84, 0.5]], [[0.22, 0.46], [0.22, 0.9]], [[0.02, 0.9], [0.98, 0.9]]];
db2_reg('tally', false, function (ctx, bb, d) {
    var sc = ctx.sc, u = db2_u(ctx), ST = db2_settle(ctx), c, k, i;
    var nC = 2 + ((d.n | 0) % 2), S0 = jzClamp(jzU(ctx) * 0.064, 40 * u, 76 * u), gp = S0 * 0.3, fs = db2_fs(ctx) * 1.05;
    var w = nC * S0 + (nC - 1) * gp + fs * 3.2, h = S0 * 1.1;
    var sp = db2_spot(ctx, bb, w, h, d, 24 * u), a = sp.ok ? 1 : 0.35;
    var total = nC * 5, dt = jzClamp((ctx.cut.dur * 0.75 - 0.2) / total, 0.09, 0.26), dd = Math.min(0.14, dt * 0.9);
    var col = d.accent ? db2_acc(sc) : sc.fg, lw = Math.max(1.6, 3 * u);
    var S = jzShapeLayer(ctx, 'tally', 0, 0);
    for (c = 0; c < nC; c++) {
        var x0 = sp.x + c * (S0 + gp), y0 = sp.y + (h - S0) / 2, tilt = db2_rs(d.seed, c, 1) * 4 * DB2_D, g = jzGrp(S, '正 ' + (c + 1));
        for (k = 4; k >= 0; k--) {
            var idx = c * 5 + k, pts = [];
            for (i = 0; i < 2; i++) {
                var X = (DB2_SEI[k][i][0] + db2_rs(d.seed, idx, i * 2) * 0.035 - 0.5) * S0, Y = (DB2_SEI[k][i][1] + db2_rs(d.seed, idx, i * 2 + 1) * 0.035 - 0.5) * S0;
                pts.push([x0 + S0 / 2 + X * Math.cos(tilt) - Y * Math.sin(tilt), y0 + S0 / 2 + X * Math.sin(tilt) + Y * Math.cos(tilt)]);
            }
            var gk = db2_sub(g, 'stroke ' + (k + 1)); jzAddPath(gk, pts, false);
            db2_trim(ctx, gk, ST, '100*oc((t-' + jzN(0.1 + idx * dt) + ')/' + jzN(dd) + ')');
        }
        db2_st(g, col, lw, 95, 2);
    }
    jzXf(S, 'ADBE Opacity').setValue(a * 100); db2_op(ctx, S, ST);
    var lx = sp.x + nC * (S0 + gp) - gp + fs * 0.8, CNT = 'var n=Math.max(0,Math.min(' + total + ',Math.floor((t-' + jzN(0.1 + dd) + ')/' + jzN(dt) + ')+1));';
    var T1 = db2_label(ctx, '×', lx, sp.y + h / 2, { size: fs, alpha: a });
    db2_op(ctx, T1, ST, 'oe((t-0.1)/0.3)');
    var T2 = db2_label(ctx, '00', lx + fs * 0.9, sp.y + h / 2, { size: fs * 1.3, color: sc.fg, track: 0.04, alpha: a });
    db2_srcText(ctx, T2, ST, DB2_PAD + CNT + 'p2(n)');
    db2_txtCol(ctx, T2, db2_acc(sc), ST, CNT + 'n>=' + total + '?100:0');
    db2_op(ctx, T2, ST, 'oe((t-0.1)/0.3)');
});

// ================================================================ UI widgets

/* ---- cursorClick — カーソル: a mouse pointer glides in and clicks beside the lyric (ripple + tooltip),
   or drags a marching-ants selection round it (variant) */
var DB2_CURSOR = [[0, 0], [0, 1], [0.27, 0.76], [0.45, 1.13], [0.6, 1.06], [0.42, 0.7], [0.74, 0.7]];
db2_reg('cursorClick', false, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db2_u(ctx), m = db2_mg(ctx), i;
    var Sc = jzClamp(jzU(ctx) * 0.034, 24 * u, 42 * u), ac = db2_acc(sc), marquee = (d.v | 0) % 2 === 1;
    var pad = 14 * u + db2_bh(bb) * 0.06, lw = Math.max(1, 1.2 * u), TIP, SCL = '100';
    if (marquee) {
        var A = [jzClamp(bb.x0 - pad, m * 0.4, W), jzClamp(bb.y0 - pad, m * 0.4, H)], B = [jzClamp(bb.x1 + pad, 0, W - m * 0.4), jzClamp(bb.y1 + pad, 0, H - m * 0.4)];
        var s0 = [A[0] - 60 * u, A[1] - 90 * u];
        TIP = 'var en=oc(t/0.3),dr=ioc((t-0.3)/0.6),tip;if(t>0.95){var z=oc((t-0.95)/0.4);tip=[' + jzN(B[0]) + '+' + jzN(18 * u) + '*z,' + jzN(B[1]) + '+' + jzN(12 * u) + '*z];}' +
            'else if(dr<=0)tip=[' + jzN(s0[0]) + '+' + jzN(A[0] - s0[0]) + '*en,' + jzN(s0[1]) + '+' + jzN(A[1] - s0[1]) + '*en];' +
            'else tip=[' + jzN(A[0]) + '+' + jzN(B[0] - A[0]) + '*dr,' + jzN(A[1]) + '+' + jzN(B[1] - A[1]) + '*dr];var C=dr<1?tip:' + db2_pt(B) + ';';
        var M = jzShapeLayer(ctx, 'marquee', 0, 0);
        // resize handles pop in when the drag ends
        var gH = jzGrp(M, 'handles'), x0 = A[0], y0 = A[1], x1 = B[0], y1 = B[1];
        var hp = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [(x0 + x1) / 2, y0], [(x0 + x1) / 2, y1], [x0, (y0 + y1) / 2], [x1, (y0 + y1) / 2]];
        for (i = 0; i < hp.length; i++) {
            var rh = jzAddRect(gH, 7 * u, 7 * u, 0, hp[i][0], hp[i][1]);
            jzSetExpr(rh.property('ADBE Vector Rect Size'), db2_H(ctx, 0) + 'var h=' + jzN(7 * u) + '*ob(cl((t-0.9)/0.25),2);[h,h]');
        }
        jzAddFill(gH, ac);
        // marching-ants rectangle from the anchor corner to the pointer
        var gR = jzGrp(M, 'selection'), rr = jzAddRect(gR, 10, 10);
        jzSetExpr(rr.property('ADBE Vector Rect Size'), db2_H(ctx, 0) + TIP + '[Math.abs(C[0]-' + jzN(A[0]) + '),Math.abs(C[1]-' + jzN(A[1]) + ')]');
        jzSetExpr(rr.property('ADBE Vector Rect Position'), db2_H(ctx, 0) + TIP + '[(C[0]+' + jzN(A[0]) + ')/2,(C[1]+' + jzN(A[1]) + ')/2]');
        var sk = db2_st(gR, sc.fg, lw, 90), dof = db2_dash(sk, 6 * u, 4 * u);
        if (dof) jzSetExpr(dof, 'time*' + jzN(30 * u));
        db2_gop(ctx, gR, 0, 'dr>0?1:0', TIP);
        db2_op(ctx, M, 0);
        var fsz = db2_fs(ctx);
        var TL = db2_label(ctx, Math.round(x1 - x0) + ' × ' + Math.round(y1 - y0), x1, y1 + fsz * 1.1, { size: fsz * 0.8, align: 'right', color: sc.fg });
        db2_op(ctx, TL, 0, 'cl((t-1)/0.3)');
    } else {
        var sx = d.right ? 1 : -1, T0 = [sx > 0 ? bb.x1 + 10 * u : bb.x0 - 10 * u - Sc * 0.7, (d.low ? bb.y1 : bb.y0) + (d.low ? 8 * u : -Sc * 1.2)];
        T0[0] = jzClamp(T0[0], m * 0.5, W - m * 0.5 - Sc); T0[1] = jzClamp(T0[1], m * 0.5, H - m * 0.5 - Sc * 1.2);
        var F0 = [T0[0] + sx * W * 0.22, T0[1] + H * 0.18];
        TIP = 'var mv=oc(t/0.55),aw=ic(PO),tip=[' + jzN(F0[0]) + '+' + jzN(T0[0] - F0[0]) + '*mv+Math.sin(mv*Math.PI)*' + jzN(30 * u) + '+' + jzN(sx * 60 * u) + '*aw,' + jzN(F0[1]) + '+' + jzN(T0[1] - F0[1]) + '*mv+' + jzN(40 * u) + '*aw];';
        SCL = '((t>0.62&&t<0.72)||(t>0.84&&t<0.94)||(t>1.9&&t<2))?86:100';
        var K1 = jzShapeLayer(ctx, 'click', 0, 0), tcs = [0.62, 0.84, 1.9];
        for (i = 0; i < 3; i++) {
            var Q = 'var q=(t-' + tcs[i] + ')/0.5;', gq = jzGrp(K1, 'click ripple ' + (i + 1)), eq = jzAddEllipse(gq, 12 * u, 12 * u, T0[0], T0[1]);
            jzSetExpr(eq.property('ADBE Vector Ellipse Size'), db2_H(ctx, 0) + Q + 'var r=' + jzN(2 * u) + '*(6+26*oc(q));[r,r]');
            var sq = db2_st(gq, ac, 2 * u);
            jzSetExpr(sq.property('ADBE Vector Stroke Width'), db2_H(ctx, 0) + Q + jzN(2 * u) + '*Math.max(0.001,1-cl(q))');
            db2_gop(ctx, gq, 0, '(q>0&&q<1)?1-q:0', Q);
        }
        // tooltip under the click
        var txt = 'LYRIC ' + db2_pad((ctx.cut.line | 0) + 1), fs = db2_fs(ctx) * 0.85;
        var TT = db2_label(ctx, txt, 0, 0, { size: fs, align: 'center', color: sc.bg, track: 0.1 });
        var tw = db2_textW(TT) + 16 * u, th = fs * 1.9;
        var bx = jzClamp(T0[0] + Sc * 0.9, m * 0.4, W - m * 0.4 - tw), by = jzClamp(T0[1] + Sc * 1.25, m * 0.4, H - m * 0.4 - th);
        if (!db2_hit(bx, by, bx + tw, by + th, bb, 2)) {
            var gt = jzGrp(K1, 'tooltip'), gtr = db2_sub(gt, 'box'); jzAddRect(gtr, tw, th, 4 * u, bx + tw / 2, by + th / 2);
            db2_gpos(gtr, bx + tw / 2, by);
            db2_gx(ctx, gtr, 'ADBE Vector Scale', 0, 'var q=cl((t-0.9)/0.25);[100,100*ob(q,1.5)]');
            jzAddFill(gt, sc.fg, 92);
            TT.moveToBeginning();
            jzXf(TT, 'ADBE Position').setValue([bx + tw / 2, by + th / 2]);
            db2_op(ctx, TT, 0, 'cl((t-0.9)/0.25)');
        } else TT.remove();
        db2_op(ctx, K1, 0);
    }
    // the pointer (shadow, body, outline)
    var S = jzShapeLayer(ctx, 'cursor', 0, 0), g = jzGrp(S, 'cursor'), pts = db2_scl(DB2_CURSOR, Sc);
    var gb = db2_sub(g, 'body'); jzAddPath(gb, pts, true); db2_st(gb, sc.bg, Math.max(1, 1.4 * u), 100, 1, 2); jzAddFill(gb, sc.fg);
    var gs = db2_sub(g, 'shadow'); jzAddPath(gs, db2_off(pts, 3 * u, 4 * u), true); jzAddFill(gs, sc.sub, 30);
    db2_gx(ctx, g, 'ADBE Vector Position', 0, TIP + 'tip');
    db2_gx(ctx, g, 'ADBE Vector Scale', 0, 'var s=' + SCL + ';[s,s]');
    db2_op(ctx, S, 0);
});

/* ---- windowChrome — ウィンドウ: an OS window frame opening round the lyric: title bar with buttons, file name, scrollbar and status line */
db2_reg('windowChrome', false, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db2_u(ctx), m = db2_mg(ctx), ST = db2_settle(ctx), k;
    var bar = jzClamp(jzU(ctx) * 0.036, 26 * u, 44 * u), px = 30 * u + db2_bw(bb) * 0.03, py = 20 * u + db2_bh(bb) * 0.08;
    var X0 = Math.max(bb.x0 - px, m * 0.35), X1 = Math.min(bb.x1 + px, W - m * 0.35), Y0 = Math.max(bb.y0 - py - bar, m * 0.35), Y1 = Math.min(bb.y1 + py + bar * 0.6, H - m * 0.35);
    if (Y0 + bar > bb.y0 - 4 * u) Y0 = bb.y0 - 4 * u - bar;
    var cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2, lw = Math.max(1, 1.4 * u), r = 8 * u, ac = db2_acc(sc), mac = (d.v | 0) % 2 === 0;
    var SC = 'var e=oe(t/0.45)*(1-0.06*ic(PO)),s=0.94+0.06*e;', BE = 'var be=oe((t-0.2)/0.3);';
    var by = Y0 + bar / 2 - cy, br = bar * 0.17, fs = db2_fs(ctx) * 0.92;
    function lx(x) { return x - cx; }
    var S = jzShapeLayer(ctx, 'window', cx, cy);
    // buttons
    var gb = jzGrp(S, 'buttons');
    if (mac) {
        var cs = [ac, db2_acc2(sc), sc.sub];
        for (k = 0; k < 3; k++) {
            var gk = db2_sub(gb, 'button ' + (k + 1)); jzAddEllipse(gk, br * 2, br * 2); jzAddFill(gk, cs[k]);
            jzGX(gk).property('ADBE Vector Position').setValue([lx(X0 + bar * 0.55 + k * br * 3), by]);
            db2_gx(ctx, gk, 'ADBE Vector Scale', ST, BE + '[100*be,100*be]');
        }
    } else {
        var bx = lx(X1 - bar * 0.6);
        db2_sub(gb, 'close'); db2_sub(gb, 'maximise'); db2_sub(gb, 'minimise');
        var gw = [db2_kid(gb, 'close'), db2_kid(gb, 'maximise'), db2_kid(gb, 'minimise')];
        jzAddPath(gw[0], [[-br, -br], [br, br]], false); jzAddPath(gw[0], [[-br, br], [br, -br]], false);
        jzAddRect(gw[1], br * 2, br * 2); jzAddPath(gw[2], [[-br, 0], [br, 0]], false);
        var xs = [bx, bx - bar * 0.95, bx - bar * 1.9];
        for (k = 0; k < 3; k++) { jzGX(gw[k]).property('ADBE Vector Position').setValue([xs[k], by]); db2_gx(ctx, gw[k], 'ADBE Vector Scale', ST, BE + '[100*be,100*be]'); }
        db2_st(gb, sc.fg, lw);
    }
    // scrollbar
    var sbx = lx(X1 - 9 * u), st = Y0 + bar + 8 * u - cy, sbH = (Y1 - 8 * u - cy) - st;
    if (sbH > 30 * u && X1 - 9 * u > bb.x1 + 12 * u) {
        var gt = jzGrp(S, 'scroll thumb'), tr = jzAddRect(gt, 4 * u, sbH * 0.35, 2 * u), thb = sbH * 0.35;
        var TY = BE + 'var h=' + jzN(thb) + '*be,ty=' + jzN(st) + '+' + jzN(sbH - thb) + '*cl(t/' + jzN(Math.max(1, ctx.cut.dur)) + ');';
        jzSetExpr(tr.property('ADBE Vector Rect Size'), db2_H(ctx, ST) + TY + '[' + jzN(4 * u) + ',h]');
        jzSetExpr(tr.property('ADBE Vector Rect Position'), db2_H(ctx, ST) + TY + '[' + jzN(sbx) + ',ty+h/2]');
        jzAddFill(gt, sc.sub, 80);
        var gs = jzGrp(S, 'scroll track'); jzAddPath(gs, [[sbx, st], [sbx, st + sbH]], false);
        db2_trim(ctx, gs, ST, '100*be', null, null, BE); db2_st(gs, sc.sub, Math.max(1, u), 40);
    }
    // title bar, separator, frame
    var gl = jzGrp(S, 'separator'); jzAddPath(gl, [[lx(X0), Y0 + bar - cy], [lx(X1), Y0 + bar - cy]], false); db2_st(gl, sc.fg, lw, 80);
    var gT = jzGrp(S, 'title bar'); jzAddRect(gT, X1 - X0, bar, r, 0, Y0 + bar / 2 - cy); jzAddFill(gT, sc.fg, 10);
    var gF = jzGrp(S, 'frame'); jzAddRect(gF, X1 - X0, Y1 - Y0, r); db2_st(gF, sc.fg, lw, 90);
    db2_lx(ctx, S, 'ADBE Scale', ST, SC + '[100*s,100*s]');
    db2_op(ctx, S, ST, 'cl(t/0.15)');
    // labels follow the window's scale about its centre
    function follow(L, x, y, al) {
        db2_lx(ctx, L, 'ADBE Position', ST, SC + '[' + jzN(cx) + '+' + jzN(x - cx) + '*s,' + jzN(cy) + '+' + jzN(y - cy) + '*s]');
        db2_lx(ctx, L, 'ADBE Scale', ST, SC + '[value[0]*s,value[1]*s]');
        db2_op(ctx, L, ST, 'cl(t/0.15)*oe((t-0.2)/0.3)*' + jzN(al));
    }
    var T1 = db2_label(ctx, 'lyric_' + db2_pad((ctx.cut.line | 0) + 1) + '.txt', cx, Y0 + bar / 2, { size: fs, align: 'center', color: sc.fg, track: 0.08 });
    follow(T1, cx, Y0 + bar / 2, 1);
    if (Y1 - bb.y1 > fs * 1.4) {
        var T2 = db2_label(ctx, 'Ln ' + db2_pad((ctx.cut.line | 0) + 1) + ', Col ' + jzChars(String(ctx.cut.text || '')).length + '   UTF-8', X1 - 14 * u, Y1 - fs * 0.8, { size: fs * 0.8, align: 'right', track: 0.08 });
        follow(T2, X1 - 14 * u, Y1 - fs * 0.8, 0.8);
    }
});

/* ---- progressBar — 読み込みバー: a UI progress bar: pill track, barber-pole fill that loads in uneven bursts, file-size readout.
   The fill (accent + moving stripes) is clipped by a rounded-rect alpha matte that grows with the progress. */
db2_reg('progressBar', false, function (ctx, bb, d) {
    var W = ctx.W, sc = ctx.sc, u = db2_u(ctx), ST = db2_settle(ctx), k;
    var fs = db2_fs(ctx) * 0.9, th = jzClamp(jzU(ctx) * 0.014, 10 * u, 18 * u);
    var w = Math.min(W * 0.4, 460 * u, Math.max(db2_bw(bb) * 0.65, 260 * u)), h = th + fs * 3.2;
    var sp = db2_band(ctx, bb, w, h, d, 26 * u), a = sp.ok ? 1 : 0.35, ac = db2_acc(sc);
    var x0 = sp.x, ty = sp.y + fs * 1.5, xc = x0 + w / 2, yc = ty + th / 2;
    var T = Math.max(0.8, ctx.cut.dur * 0.85 - 0.3), terms = [];
    for (k = 0; k < 5; k++) terms.push('0.2*ioc((t-' + jzN(0.25 + T * k / 5 + db2_r(d.seed, k, 1) * T * 0.08) + ')/' + jzN(T / 5 * (0.35 + db2_r(d.seed, k, 2) * 0.4)) + ')');
    var PR = 'var e=oe(t/0.45),tw=' + jzN(w) + '*e,tx=' + jzN(x0) + '+(' + jzN(w) + '-tw)/2,p=cl(' + terms.join('+') + '),done=p>=0.999;';
    // fill: accent + barber-pole stripes, matted by the growing rounded bar
    var F = jzShapeLayer(ctx, 'progress fill', 0, 0), gS = jzGrp(F, 'stripes'), gm = db2_sub(gS, 'slide'), gl = db2_sub(gm, 'stripe');
    var gap = 12 * u, nS = Math.ceil((w + 2 * th) / gap) + 2;
    jzAddPath(gl, [[x0 - th - gap, ty + th], [x0 - gap, ty]], false);
    db2_rep(gm, nS, gap, 0);
    db2_gx(ctx, gm, 'ADBE Vector Position', ST, '[(Math.max(0,t)*' + jzN(26 * u) + ')%' + jzN(gap) + ',0]');
    db2_st(gS, jzLum(ac) > 0.5 ? '#000000' : '#ffffff', 4 * u, 16);
    var gA = jzGrp(F, 'accent'); jzAddRect(gA, w, th, 0, xc, yc); jzAddFill(gA, ac);
    jzXf(F, 'ADBE Opacity').setValue(a * 100); db2_op(ctx, F, ST);
    var Mt = jzShapeLayer(ctx, 'progress matte', 0, 0), gM = jzGrp(Mt, 'bar'), rm = jzAddRect(gM, 10, th - 4 * u, (th - 4 * u) / 2);
    jzSetExpr(rm.property('ADBE Vector Rect Size'), db2_H(ctx, ST) + PR + '[Math.max(0,(tw-' + jzN(4 * u) + ')*p),' + jzN(th - 4 * u) + ']');
    jzSetExpr(rm.property('ADBE Vector Rect Position'), db2_H(ctx, ST) + PR + '[tx+' + jzN(2 * u) + '+Math.max(0,(tw-' + jzN(4 * u) + ')*p)/2,' + jzN(yc) + ']');
    jzAddFill(gM, '#ffffff');
    F.trackMatteType = TrackMatteType.ALPHA; Mt.enabled = false;
    // track outline + check mark
    var S = jzShapeLayer(ctx, 'progress bar', 0, 0);
    var gc = jzGrp(S, 'check'), Yc = ty + th + fs * 1.1;
    jzAddPath(gc, [[x0 + 2 * u, Yc], [x0 + 6 * u, Yc + 4 * u], [x0 + 13 * u, Yc - 5 * u]], false);
    db2_trim(ctx, gc, ST, '100*cl((t-' + jzN(T + 0.3) + ')*4)'); db2_st(gc, ac, 2 * u, 100, 2, 2);
    db2_gop(ctx, gc, ST, 'done?1:0', PR);
    var gt = jzGrp(S, 'track'), rt = jzAddRect(gt, w, th, th / 2, xc, yc);
    jzSetExpr(rt.property('ADBE Vector Rect Size'), db2_H(ctx, ST) + 'var e=oe(t/0.45);[' + jzN(w) + '*e,' + jzN(th) + ']');
    db2_st(gt, sc.fg, Math.max(1, 1.2 * u), 80);
    jzXf(S, 'ADBE Opacity').setValue(a * 100); db2_op(ctx, S, ST);
    // readouts
    var LE = 'oe((t-0.15)/0.3)', tot = 8 + (db2_h(d.seed, 3) % 400) / 10;
    var L1 = db2_label(ctx, 'Loading...', x0, sp.y + fs * 0.6, { size: fs, font: jzBodyF(ctx), color: sc.fg, track: 0.04, alpha: a });
    db2_srcText(ctx, L1, ST, PR + 'done?"Complete":"Loading"+"...".substr(0,Math.floor(Math.max(0,t)*3)%4)');
    db2_lx(ctx, L1, 'ADBE Position', ST, PR + '[tx,value[1]]'); db2_op(ctx, L1, ST, LE);
    var L2 = db2_label(ctx, '100%', x0 + w, sp.y + fs * 0.6, { size: fs, align: 'right', color: sc.fg, alpha: a });
    db2_srcText(ctx, L2, ST, PR + 'Math.floor(p*100)+"%"');
    db2_lx(ctx, L2, 'ADBE Position', ST, PR + '[tx+tw,value[1]]'); db2_txtCol(ctx, L2, ac, ST, PR + 'done?100:0'); db2_op(ctx, L2, ST, LE);
    var L3 = db2_label(ctx, tot.toFixed(1) + ' MB / ' + tot.toFixed(1) + ' MB', x0 + w, Yc, { size: fs * 0.78, align: 'right', alpha: a });
    db2_srcText(ctx, L3, ST, PR + '(' + jzN(tot) + '*p).toFixed(1)+" MB / ' + tot.toFixed(1) + ' MB"');
    db2_lx(ctx, L3, 'ADBE Position', ST, PR + '[tx+tw,value[1]]'); db2_op(ctx, L3, ST, LE + '*0.85');
});

/* ---- toggleSwitch — トグル: a small settings panel: two or three iOS-style switches flicking on one after another */
var DB2_TOGGLE = [['SHUFFLE', 'REPEAT', 'LYRICS'], ['想い', '記憶', '未練'], ['LOVE', 'MEMORY', 'REPLAY'], ['声', '光', '夜']];
db2_reg('toggleSwitch', false, function (ctx, bb, d) {
    var sc = ctx.sc, u = db2_u(ctx), ST = db2_settle(ctx), i;
    var n = 2 + ((d.n | 0) % 2), th = jzClamp(jzU(ctx) * 0.034, 24 * u, 44 * u), tw = th * 1.8, rowH = th * 1.7, fs = th * 0.58;
    var labs = DB2_TOGGLE[(d.v | 0) % DB2_TOGGLE.length], Ls = [], lw0 = 0;
    for (i = 0; i < n; i++) { Ls.push(db2_label(ctx, labs[i], 0, 0, { size: fs, font: jzBodyF(ctx), color: sc.fg, track: 0.12 })); lw0 = Math.max(lw0, db2_textW(Ls[i])); }
    var w = lw0 + 16 * u + tw, h = n * rowH, sp = db2_spot(ctx, bb, w, h, d, 24 * u), a = sp.ok ? 1 : 0.35, ac = db2_acc(sc);
    var knobC = jzLum(ac) > 0.6 ? '#000000' : sc.bg;
    var S = jzShapeLayer(ctx, 'toggles', 0, 0);
    for (i = 0; i < n; i++) {
        var y = sp.y + i * rowH + (rowH - th) / 2, x = sp.x + w - tw, Q = 'var q=oc((t-' + jzN(i * 0.08) + ')/0.3),on=ob(cl((t-' + jzN(0.45 + i * 0.32) + ')/0.25),1.6);';
        var g = jzGrp(S, 'switch ' + (i + 1));
        var gk = db2_sub(g, 'knob'), fk = (jzAddEllipse(gk, th * 0.76, th * 0.76), jzAddFill(gk, sc.fg));
        jzSetExpr(fk.property('ADBE Vector Fill Color'), db2_H(ctx, ST) + Q + 'cl(on)>0.5?' + db2_cx(knobC) + ':' + db2_cx(sc.fg));
        db2_gx(ctx, gk, 'ADBE Vector Position', ST, Q + '[' + jzN(x + th / 2) + '+' + jzN(tw - th) + '*on,' + jzN(y + th / 2) + ']');
        db2_gx(ctx, gk, 'ADBE Vector Scale', ST, Q + '[100*q,100*q]');
        var gs = db2_sub(g, 'track'); jzAddRect(gs, tw, th, th / 2, x + tw / 2, y + th / 2);
        var sk = db2_st(gs, sc.sub, Math.max(1, 1.2 * u));
        jzSetExpr(sk.property('ADBE Vector Stroke Color'), db2_H(ctx, ST) + Q + 'cl(on)>0.5?' + db2_cx(ac) + ':' + db2_cx(sc.sub));
        var fl = jzAddFill(gs, ac);
        jzSetExpr(fl.property('ADBE Vector Fill Opacity'), db2_H(ctx, ST) + Q + '100*cl(on)');
        db2_gop(ctx, g, ST, 'q', Q);
        if (i < n - 1) {
            var gl = jzGrp(S, 'rule ' + (i + 1)), yl = sp.y + (i + 1) * rowH;
            jzAddPath(gl, [[sp.x, yl], [sp.x + w, yl]], false); db2_trim(ctx, gl, ST, '100*q', null, null, Q); db2_st(gl, sc.sub, Math.max(1, 0.8 * u), 30);
        }
        jzXf(Ls[i], 'ADBE Position').setValue([sp.x, y + th / 2]);
        jzXf(Ls[i], 'ADBE Opacity').setValue(a * 100); db2_op(ctx, Ls[i], ST, 'oc((t-' + jzN(i * 0.08) + ')/0.3)');
    }
    jzXf(S, 'ADBE Opacity').setValue(a * 100); db2_op(ctx, S, ST);
});

/* ---- notifBell — 通知: a line-art bell that rings each time its red badge counts up */
db2_reg('notifBell', false, function (ctx, bb, d) {
    var sc = ctx.sc, u = db2_u(ctx), ST = db2_settle(ctx);
    var S0 = jzClamp(jzU(ctx) * 0.075, 48 * u, 92 * u), fs = db2_fs(ctx) * 0.95;
    var sp = db2_spot(ctx, bb, S0 * 1.9, S0 * 1.7 + fs * 1.8, d, 22 * u), a = sp.ok ? 1 : 0.35, ac = db2_acc(sc);
    var cx = sp.cx - S0 * 0.15, cy = sp.y + S0 * 0.95, MX = 3 + (db2_h(d.seed, 2) % 7);
    var CNT = 'var k=Math.max(0,Math.floor((t-0.35)/0.5)+1),cnt=Math.min(' + MX + ',k),since=t-(0.35+(Math.min(k,' + MX + ')-1)*0.5),ring=cnt>0?Math.exp(-since*5)*Math.sin(since*30)*16:0,bump=1+0.35*Math.exp(-Math.max(0,since)*9);';
    var S = jzShapeLayer(ctx, 'bell', cx, cy), gO = jzGrp(S, 'swing');
    jzGX(gO).property('ADBE Vector Anchor').setValue([0, -S0 / 2]); jzGX(gO).property('ADBE Vector Position').setValue([0, -S0 / 2]);
    db2_gx(ctx, gO, 'ADBE Vector Rotation', ST, CNT + 'ring');
    var gI = db2_sub(gO, 'bell');
    db2_gx(ctx, gI, 'ADBE Vector Scale', ST, 'var e=100*ob(cl(t/0.4),1.6);[e,e]');
    var blw = Math.max(1.4, 2 * u);
    var gc = db2_sub(gI, 'clapper'), gcp = db2_sub(gc, 'arc'); jzAddPath(gcp, db2_arc(0, 0.44 * S0, 0.1 * S0, 0, 180, 12), false);
    db2_gx(ctx, gcp, 'ADBE Vector Position', ST, CNT + '[Math.sin(ring*2*Math.PI/180)*' + jzN(S0 * 0.08) + ',0]');
    db2_st(gc, sc.fg, blw, 100, 2);
    var gr = db2_sub(gI, 'loop'); jzAddEllipse(gr, 0.12 * S0, 0.12 * S0, 0, -0.52 * S0); db2_st(gr, sc.fg, Math.max(1.2, 1.6 * u));
    var body = [[-0.44, 0.36]].concat(db2_bez([-0.34, 0.26], [-0.38, -0.12], [-0.3, -0.45], [0, -0.47], 12), db2_bez([0, -0.47], [0.3, -0.45], [0.38, -0.12], [0.34, 0.26], 12), [[0.44, 0.36]]);
    var gb = db2_sub(gI, 'body'); jzAddPath(gb, db2_scl(body, S0), true); db2_st(gb, sc.fg, blw, 100, 2, 2);
    jzXf(S, 'ADBE Opacity').setValue(a * 100); db2_op(ctx, S, ST);
    // badge + count
    var bx = cx + S0 * 0.36, by = cy - S0 * 0.42, br = S0 * 0.26;
    var B = jzShapeLayer(ctx, 'bell badge', bx, by);
    var g2 = jzGrp(B, 'rim'); jzAddEllipse(g2, br * 2 + 4 * u, br * 2 + 4 * u); db2_st(g2, sc.bg, 2 * u);
    var g1 = jzGrp(B, 'badge'); jzAddEllipse(g1, br * 2, br * 2); jzAddFill(g1, ac);
    db2_lx(ctx, B, 'ADBE Scale', ST, CNT + '[100*bump,100*bump]');
    jzXf(B, 'ADBE Opacity').setValue(a * 100); db2_op(ctx, B, ST, 'cnt>0?1:0', CNT);
    var TB = jzText(ctx, '1', { font: db2_dispF(ctx), size: br * 1.15, color: jzLum(ac) > 0.6 ? '#000000' : sc.bg, x: bx, y: by, opacity: a });
    db2_srcText(ctx, TB, ST, CNT + 'cnt>=9?"9+":String(cnt)');
    db2_lx(ctx, TB, 'ADBE Scale', ST, CNT + '[value[0]*bump,value[1]*bump]');
    db2_op(ctx, TB, ST, 'cnt>0?1:0', CNT);
    var TL = db2_label(ctx, '通知 00件', cx, cy + S0 * 0.72 + fs * 0.8, { size: fs, font: jzBodyF(ctx), align: 'center', track: 0.1, alpha: a });
    db2_srcText(ctx, TL, ST, DB2_PAD + CNT + '"通知 "+p2(cnt)+"件"');
    db2_op(ctx, TL, ST, 'oe((t-0.3)/0.3)');
});

/* ---- likeCounter — いいね: a heart button that fills with a burst when "liked", beside a rolling like counter */
function db2_heart(cx, cy, s) { var o = [], i; for (i = 0; i < 36; i++) { var t = i / 36 * Math.PI * 2, x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); o.push([cx + x * s / 17, cy - y * s / 17]); } return o; }
db2_reg('likeCounter', false, function (ctx, bb, d) {
    var sc = ctx.sc, u = db2_u(ctx), ST = db2_settle(ctx), i;
    var S0 = jzClamp(jzU(ctx) * 0.042, 28 * u, 52 * u), fs = S0 * 0.85, font = jzMonoF(ctx), ac = db2_acc(sc);
    var base = 1000 + db2_h(d.seed, 5) % 90000, STEP = 1 + db2_h(d.seed, 6) % 3, tLike = 0.45;
    function inc(t) { return t < tLike ? 0 : 1 + Math.floor(Math.max(0, t - tLike - 0.4) / 0.38) * STEP; }
    function fmt(n) { var s = String(Math.floor(n)), o = ''; while (s.length > 3) { o = ',' + s.substr(s.length - 3) + o; s = s.substr(0, s.length - 3); } return s + o; }
    var LK = 'function fm(n){var s=String(Math.floor(n)),o="";while(s.length>3){o=","+s.substr(s.length-3)+o;s=s.substr(0,s.length-3);}return s+o;}' +
        'function inc(x){return x<' + tLike + '?0:1+Math.floor(Math.max(0,x-' + (tLike + 0.4) + ')/0.38)*' + STEP + ';}' +
        'var cur=' + base + '+inc(t),prev=' + base + '+inc(Math.max(0,t-0.16)),roll=cur!=prev,f=oc((((t-' + (tLike + 0.4) + ')%0.38+0.38)%0.38)/0.16),liked=cl((t-' + tLike + ')/0.3);';
    var TC = db2_label(ctx, fmt(base + inc(ctx.cut.dur)), 0, 0, { size: fs, font: font, color: sc.fg, track: 0.04 });
    var w = S0 * 2.4 + db2_textW(TC) + 10 * u, h = S0 * 2.4, sp = db2_spot(ctx, bb, w, h, d, 20 * u), a = sp.ok ? 1 : 0.35;
    var hx = sp.x + S0 * 1.2, hy = sp.cy, lx = hx + S0 * 1.25, ly = hy;
    // heart + burst
    var S = jzShapeLayer(ctx, 'like', 0, 0);
    var gd = jzGrp(S, 'burst dots'), gdd = db2_sub(gd, 'dot'), ed = jzAddEllipse(gdd, 4.8 * u, 4.8 * u);
    jzSetExpr(ed.property('ADBE Vector Ellipse Position'), db2_H(ctx, ST) + LK + '[' + jzN(S0) + '*(0.9+0.7*oc(liked)),0]');
    jzSetExpr(ed.property('ADBE Vector Ellipse Size'), db2_H(ctx, ST) + LK + 'var r=' + jzN(4.8 * u) + '*(1-liked);[r,r]');
    db2_rep(gd, 7, 0, 0, 360 / 7); jzAddFill(gd, ac);
    jzGX(gd).property('ADBE Vector Position').setValue([hx, hy]); jzGX(gd).property('ADBE Vector Rotation').setValue(-90);
    db2_gop(ctx, gd, ST, '(liked>0&&liked<1)?1:0', LK);
    var gr = jzGrp(S, 'burst ring'), er = jzAddEllipse(gr, S0, S0, hx, hy);
    jzSetExpr(er.property('ADBE Vector Ellipse Size'), db2_H(ctx, ST) + LK + 'var r=' + jzN(2 * S0) + '*(0.6+0.8*liked);[r,r]');
    var sr = db2_st(gr, ac, 2 * u);
    jzSetExpr(sr.property('ADBE Vector Stroke Width'), db2_H(ctx, ST) + LK + jzN(2 * u) + '*Math.max(0.001,1-liked)');
    db2_gop(ctx, gr, ST, '(liked>0&&liked<1)?1-liked:0', LK);
    var gh = jzGrp(S, 'heart'); jzAddPath(gh, db2_heart(hx, hy + S0 * 0.05, S0), true);
    var sh = db2_st(gh, sc.fg, Math.max(1.4, 2 * u), 100, 1, 2);
    jzSetExpr(sh.property('ADBE Vector Stroke Color'), db2_H(ctx, ST) + LK + 'liked>0?' + db2_cx(ac) + ':' + db2_cx(sc.fg));
    var fh = jzAddFill(gh, ac);
    jzSetExpr(fh.property('ADBE Vector Fill Opacity'), db2_H(ctx, ST) + LK + 'liked>0?100:0');
    db2_gpos(gh, hx, hy + S0 * 0.05);
    db2_gx(ctx, gh, 'ADBE Vector Scale', ST, LK + 'var p=liked>0?1+0.35*Math.sin(Math.PI*cl(liked*1.4)):ob(cl(t/0.3),1.6);[100*p,100*p]');
    jzXf(S, 'ADBE Opacity').setValue(a * 100); db2_op(ctx, S, ST);
    // rolling counter: the old value slides up and out as the new one slides in (clipped to its row by a mask)
    var TP = db2_label(ctx, fmt(base), lx, ly, { size: fs, font: font, color: sc.fg, track: 0.04 });
    jzXf(TC, 'ADBE Position').setValue([lx, ly]); TC.moveToBeginning();
    var CL = [[TC, 'cur', [0, fs * 1.2], 'roll?100*(1-f):0', 'roll?f:oe((t-0.1)/0.3)'], [TP, 'prev', [0, -fs * 1.2], 'roll?100*f:0', 'roll?1-f:0']];
    for (i = 0; i < 2; i++) {
        var L = CL[i][0], an = jzXf(L, 'ADBE Anchor Point').value;
        db2_srcText(ctx, L, ST, LK + 'fm(' + CL[i][1] + ')');
        jzAnimator(L, 'JZ Roll', [['ADBE Text Position 3D', [CL[i][2][0], CL[i][2][1], 0]]], db2_H(ctx, ST) + LK + CL[i][3]);
        if (i === 0) db2_txtCol(ctx, L, ac, ST, LK + 'liked>0?100:0');
        jzMaskRect(L, an[0] - 2 * u, an[1] - fs * 0.75, an[0] - 2 * u + w, an[1] + fs * 0.75);
        jzXf(L, 'ADBE Opacity').setValue(a * 100); db2_op(ctx, L, ST, CL[i][4], LK);
    }
});

/* ---- mediaControls — 再生ボタン: transport controls (prev / play / next); play turns into pause on a click, with a running time readout.
   The play → pause morph is a quick cross-scale of the triangle into the two bars. */
db2_reg('mediaControls', false, function (ctx, bb, d) {
    var sc = ctx.sc, u = db2_u(ctx), ST = db2_settle(ctx), k;
    var R = jzClamp(jzU(ctx) * 0.04, 28 * u, 52 * u), fs = db2_fs(ctx) * 0.9, w = R * 6.4, h = R * 2.2 + fs * 1.8;
    var sp = db2_band(ctx, bb, w, h, d, 34 * u), a = sp.ok ? 1 : 0.35, ac = db2_acc(sc), cx = sp.cx, cy = sp.y + R * 1.1, lw = Math.max(1.2, 1.6 * u);
    var MM = 'var e=ob(cl(t/0.35),1.6),m=ioc((t-0.55)/0.22);', s2 = R * 0.84;
    var S = jzShapeLayer(ctx, 'media controls', cx, cy);
    for (k = 0; k < 2; k++) {                          // prev / next
        var dir = k ? 1 : -1, x = dir * R * 2.3, ss = R * 0.36, g = jzGrp(S, k ? 'next' : 'prev');
        jzAddPath(g, [[x - dir * ss * 0.6, -ss], [x + dir * ss * 0.9, 0], [x - dir * ss * 0.6, ss]], true);
        jzAddRect(g, 2.4 * u, ss * 2, 0, x + dir * ss * 0.9 - (dir > 0 ? 0 : 2.4 * u) + 1.2 * u, 0);
        jzAddFill(g, sc.fg); db2_gpos(g, x, 0);
        db2_gx(ctx, g, 'ADBE Vector Scale', ST, 'var q=100*ob(cl((t-' + jzN(0.1 + k * 0.06) + ')/0.3),1.6);[q,q]');
    }
    var gp = jzGrp(S, 'pause');
    jzAddRect(gp, 0.28 * s2, s2, 0, -0.26 * s2, 0); jzAddRect(gp, 0.28 * s2, s2, 0, 0.26 * s2, 0); jzAddFill(gp, sc.fg);
    db2_gx(ctx, gp, 'ADBE Vector Scale', ST, MM + '[100*e*(0.5+0.5*m),100*e]');
    db2_gop(ctx, gp, ST, 'm', MM);
    var gy = jzGrp(S, 'play');
    jzAddPath(gy, [[-0.35 * s2, -0.5 * s2], [0.5 * s2, 0], [-0.35 * s2, 0.5 * s2]], true); jzAddFill(gy, sc.fg);
    db2_gx(ctx, gy, 'ADBE Vector Position', ST, MM + '[' + jzN(R * 0.42 * 0.12) + '*e*(1-m),0]');
    db2_gx(ctx, gy, 'ADBE Vector Scale', ST, MM + '[100*e*(1-0.5*m),100*e]');
    db2_gop(ctx, gy, ST, '1-m', MM);
    var gq = jzGrp(S, 'click ripple'), eq = jzAddEllipse(gq, R * 2, R * 2), RQ = 'var q=cl((t-0.55)/0.45);';
    jzSetExpr(eq.property('ADBE Vector Ellipse Size'), db2_H(ctx, ST) + RQ + 'var r=' + jzN(R * 2) + '*(1+0.5*oc(q));[r,r]');
    var sq = db2_st(gq, ac, 2 * u);
    jzSetExpr(sq.property('ADBE Vector Stroke Width'), db2_H(ctx, ST) + RQ + jzN(2 * u) + '*Math.max(0.001,1-q)');
    db2_gop(ctx, gq, ST, 't>0.55?1-q:0', RQ);
    var gc = jzGrp(S, 'ring'); jzAddEllipse(gc, R * 2, R * 2); db2_st(gc, sc.fg, lw);
    db2_gx(ctx, gc, 'ADBE Vector Scale', ST, 'var e=100*ob(cl(t/0.35),1.6);[e,e]');
    jzXf(S, 'ADBE Opacity').setValue(a * 100); db2_op(ctx, S, ST);
    var tot = (ctx.plan && ctx.plan.duration) ? ctx.plan.duration : 200;
    var T = db2_label(ctx, '0:00 / 0:00', cx, cy + R * 1.1 + fs * 1.1, { size: fs, align: 'center', track: 0.1, alpha: a });
    db2_srcText(ctx, T, ST, DB2_PAD + 'function ms(x){return Math.floor(x/60)+":"+p2(x%60);}ms(Math.max(0,' + jzN(ctx.cut.start || 0) + '+time))+" / ' + Math.floor(tot / 60) + ':' + db2_pad(tot % 60) + '"');
    db2_op(ctx, T, ST, 'oe((t-0.2)/0.3)');
});

/* ---- volumeBars — 音量: a speaker glyph with an ascending stepped volume meter that follows the music (the browser's fallback level:
   smooth noise, as AE has no audio energy here) */
db2_reg('volumeBars', false, function (ctx, bb, d) {
    var sc = ctx.sc, u = db2_u(ctx), ST = db2_settle(ctx), i;
    var S0 = jzClamp(jzU(ctx) * 0.042, 28 * u, 52 * u), nB = 8, bwid = S0 * 0.3, gap = S0 * 0.18, fs = db2_fs(ctx) * 0.9;
    var w = S0 * 1.9 + nB * (bwid + gap), h = S0 * 1.8 + fs * 1.6, sp = db2_spot(ctx, bb, w, h, d, 22 * u), a = sp.ok ? 1 : 0.35, ac = db2_acc(sc);
    var x0 = sp.x, yb = sp.y + S0 * 1.6, lw = Math.max(1.2, 1.6 * u), cy = yb - S0 * 0.55;
    var LV = 'var en=0.55+0.4*nz(Math.max(0,t)*3,' + db2_ntab(d.seed, 0, (ctx.cut.dur + 1) * 3) + '),lvl=Math.round(cl(en)*' + nB + '*oc((t-0.15)/0.5));';
    var S = jzShapeLayer(ctx, 'volume', 0, 0);
    for (i = 0; i < nB; i++) {
        var bh0 = S0 * (0.3 + 1.3 * (i + 1) / nB), x = x0 + S0 * 1.5 + i * (bwid + gap), g = jzGrp(S, 'bar ' + (i + 1));
        jzAddRect(g, bwid, bh0, 0, x + bwid / 2, yb - bh0 / 2);
        var fl = jzAddFill(g, sc.sub, 30);
        jzSetExpr(fl.property('ADBE Vector Fill Color'), db2_H(ctx, ST) + LV + i + '<lvl?(' + i + '==lvl-1?' + db2_cx(ac) + ':' + db2_cx(sc.fg) + '):' + db2_cx(sc.sub));
        jzSetExpr(fl.property('ADBE Vector Fill Opacity'), db2_H(ctx, ST) + LV + i + '<lvl?(' + i + '==lvl-1?100:90):30');
        db2_gpos(g, x + bwid / 2, yb);
        db2_gx(ctx, g, 'ADBE Vector Scale', ST, '[100,100*ob(cl((t-' + jzN(0.05 + i * 0.03) + ')/0.25),1.6)]');
    }
    for (i = 0; i < 2; i++) {
        var gw = jzGrp(S, 'wave ' + (i + 1)); jzAddPath(gw, db2_arc(x0 + S0 * 0.62, cy, S0 * (i ? 0.62 : 0.35), -45, 45, 16), false);
        db2_st(gw, sc.fg, lw, 100, 2); db2_gop(ctx, gw, ST, 'lvl>' + (i ? nB / 2 : 0) + '?1:0', LV);
    }
    var gs = jzGrp(S, 'speaker');
    jzAddPath(gs, [[x0, cy - S0 * 0.2], [x0 + S0 * 0.25, cy - S0 * 0.2], [x0 + S0 * 0.6, cy - S0 * 0.48], [x0 + S0 * 0.6, cy + S0 * 0.48], [x0 + S0 * 0.25, cy + S0 * 0.2], [x0, cy + S0 * 0.2]], true);
    jzAddFill(gs, sc.fg); db2_gpos(gs, x0, cy);
    db2_gx(ctx, gs, 'ADBE Vector Scale', ST, '[100,100*ob(cl(t/0.3),1.6)]');
    jzXf(S, 'ADBE Opacity').setValue(a * 100); db2_op(ctx, S, ST);
    var T = db2_label(ctx, 'VOL 00', x0, yb + fs, { size: fs, track: 0.16, alpha: a });
    db2_srcText(ctx, T, ST, DB2_PAD + LV + '"VOL "+p2(lvl)');
    db2_op(ctx, T, ST, 'oe((t-0.2)/0.3)');
});

/* ---- musicNotes — 音符: eighth / beamed / quarter notes floating up and swaying out of the free space beside the lyric.
   One group per note slot; each rise cycle's start point, size and note type are pre-computed. */
db2_reg('musicNotes', false, function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = db2_u(ctx), ST = db2_settle(ctx), dur = ctx.cut.dur, i, cy;
    var N = Math.min(10, 5 + (d.n | 0) * 2), S0 = jzClamp(jzU(ctx) * 0.036, 24 * u, 44 * u), pad = 26 * u + db2_bh(bb) * 0.15;
    var X0 = bb.x0 - pad, X1 = bb.x1 + pad, Y0 = bb.y0 - pad, Y1 = bb.y1 + pad, per = 2 * (X1 - X0 + Y1 - Y0), bcx = (bb.x0 + bb.x1) / 2;
    var cols = [sc.fg, db2_acc(sc), db2_acc2(sc)], s = S0, lw = Math.max(1.2, s * 0.07);
    var S = jzShapeLayer(ctx, 'music notes', 0, 0);
    function head(g, hx) { var gh = db2_sub(g, 'head'); jzAddEllipse(gh, s * 0.6, s * 0.42, hx, 0); db2_gpos(gh, hx, 0); jzGX(gh).property('ADBE Vector Rotation').setValue(-22); return gh; }
    for (i = 0; i < N; i++) {
        var T = 2.2 + db2_r(d.seed, i, 1) * 1.2, off = db2_r(d.seed, i, 2) * 0.8, nc = Math.ceil((dur + 1) / T) + 1, Q = [];
        for (cy = 0; cy < nc; cy++) {
            var p = db2_perim(X0, Y0, X1, Y1, ((i + db2_r(d.seed, i, cy, 3)) / N) * per);
            Q.push(db2_arr([p[0], p[1], p[0] - bcx > 0 ? 1 : (p[0] - bcx < 0 ? -1 : 1), 0.75 + 0.4 * db2_r(d.seed, i, cy, 4), (i + db2_h(d.seed, cy)) % 3]));
        }
        var HD = 'var tt=t-' + jzN(off) + ',cy=Math.max(0,Math.floor(tt/' + jzN(T) + ')),tau=(tt-cy*' + jzN(T) + ')/' + jzN(T) + ',QQ=[' + Q.join(',') + '],q=QQ[Math.min(cy,QQ.length-1)];' +
            'var x=Math.max(' + jzN(s) + ',Math.min(' + jzN(W - s) + ',q[0]+q[2]*tau*' + jzN(40 * u) + '+Math.sin(tau*2*Math.PI+' + i + ')*' + jzN(12 * u) + ')),' +
            'y=Math.max(' + jzN(s * 1.5) + ',Math.min(' + jzN(H - s) + ',q[1]-tau*' + jzN(90 * u) + ')),al=co(x,y,' + jzN(s * 1.1) + ',' + jzN(20 * u) + ')*Math.sin(Math.PI*tau)*1.4;';
        var col = cols[i % 3], g = jzGrp(S, 'note ' + (i + 1)), k;
        db2_gx(ctx, g, 'ADBE Vector Position', ST, HD + '[x,y]');
        db2_gx(ctx, g, 'ADBE Vector Rotation', ST, HD + 'Math.sin(tau*5+' + i + ')*14-6');
        db2_gx(ctx, g, 'ADBE Vector Scale', ST, HD + 'var z=100*q[3]*ob(cl(tau*5),1.8);[z,z]');
        db2_gop(ctx, g, ST, '(tt>=0&&al>0.02)?Math.min(1,al):0', HD);
        for (k = 0; k < 3; k++) {
            var gt = db2_sub(g, ['eighth', 'quarter', 'beamed'][k]);
            if (k === 2) {
                var gB = db2_sub(gt, 'beam'); jzAddPath(gB, [[-s * 0.09 - lw / 2, -s * 1.05], [s * 0.71 + lw / 2, -s * 1.15], [s * 0.71 + lw / 2, -s * 0.97], [-s * 0.09 - lw / 2, -s * 0.87]], true); jzAddFill(gB, col);
                var gS = db2_sub(gt, 'stems'); jzAddPath(gS, [[-s * 0.09, -s * 0.05], [-s * 0.09, -s * 1.05]], false); jzAddPath(gS, [[s * 0.71, -s * 0.05], [s * 0.71, -s * 1.15]], false); db2_st(gS, col, lw);
                var gH = db2_sub(gt, 'heads'); head(gH, -s * 0.35); head(gH, s * 0.45); jzAddFill(gH, col);
            } else {
                if (k === 0) { var gf = db2_sub(gt, 'flag'); jzAddPath(gf, db2_bez([s * 0.26, -s * 1.05], [s * 0.3, -s * 0.8], [s * 0.72, -s * 0.72], [s * 0.55, -s * 0.35], 10), false); db2_st(gf, col, lw * 1.3, 100, 2); }
                var gs2 = db2_sub(gt, 'stem'); jzAddPath(gs2, [[s * 0.26, -s * 0.05], [s * 0.26, -s * 1.05]], false); db2_st(gs2, col, lw);
                var gh2 = db2_sub(gt, 'heads'); head(gh2, 0); jzAddFill(gh2, col);
            }
            db2_gop(ctx, gt, ST, 'q[4]==' + k + '?1:0', HD);
        }
    }
    db2_op(ctx, S, ST);
});
