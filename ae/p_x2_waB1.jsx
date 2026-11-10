// ================================================================ pack x2waB part 1 (AE port of src/11p_x2_waB.js) — 和風: shared helpers, 9 entrances, 8 exits
// enter : wzFusuma wzKakejiku wzMisu wzHanko wzChochin wzKamifubuki wzHanabi wzOrigami wzSeigaiha
// exit  : wzShojiKage wzSumiNijimi wzHanaChiru wzKasumi wzFuroshiki wzOrizuru wzDoron wzToro
// (part 2, ae/p_x2_waB2.jsx: hold / treat / cam / fx / trans)
// The browser draws every object (doors, blind, seal block, lanterns, confetti, petals, cranes, smoke …) in the item's own
// space each frame. Here everything lives in the text layer's own space (the space of sourceRectAtTime):
//  - per-glyph motion  = text animators with Expression Selectors: each part writes ONE body that sets dx dy rot sx sy al ct
//                        (ct = tint amount) for the glyph i = textIndex - 1; awzb_emit() turns it into Move / Turn / Size /
//                        Fade / Tint animators. Seeded per-glyph constants are computed here and embedded as arrays.
//  - straight clips    = a rect mask on the lyric whose Mask Expansion follows the opening edge (thrown wide open afterwards)
//  - shaped clips      = a shape layer parented to the lyric used as its (inverted) alpha track matte
//  - objects           = shape layers parented to the lyric (jzNoGhost), alive only during the entrance / exit; one shape
//                        group per object, driven by expressions on its position / scale / opacity. Free-flying flakes and
//                        petals are single paths rebuilt by createPath() (one path + one opacity expression each).
// As in the browser, objects are only made for the lyric's main copy (opaque, filled; not one glyph of a lyric set glyph by
// glyph). Very long lines / crowded comps get the motion without the objects.

// ---------------------------------------------------------------- shared helpers (awzb_*)
// easings not in JZ_FNS (wz-prefixed: they also go into the merged layer transform expressions):
// wzio inOutCubic, wzsm smoothstep(a, b, x), wzlp lerp, wzsg stagger (the browser's stg), wzfr fract
var AWZB_FNS = 'function wzio(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}' +
    'function wzsm(a,b,x){x=cl((x-a)/(b-a));return x*x*(3-2*x);}function wzlp(a,b,t){return a+(b-a)*t;}' +
    'function wzsg(p,k,s){return cl((p-s*k)/(1-s));}function wzfr(x){return x-Math.floor(x);}\n';
var AWZB_TAU = Math.PI * 2;
// the browser's J.h / J.r / J.rs (seeded choices that are fixed per cut match the web version)
function awzb_h(a, b, c, d, e) {
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
function awzb_r(a, b, c, d, e) { return awzb_h(a, b, c, d, e) / 4294967296; }
function awzb_rs(a, b, c, d, e) { return awzb_r(a, b, c, d, e) * 2 - 1; }
function awzb_arr(a) { var s = [], i; for (i = 0; i < a.length; i++) s.push(jzN(a[i])); return '[' + s.join(',') + ']'; }
// ---- colours (scheme colours only; the browser's hotOf / sealOf / paperOf / quietOf / inkOf / popOf / shadeOf / lightOf / markOf)
function awzb_isHex(c) { return typeof c === 'string' && c.charAt(0) === '#' && (c.length === 7 || c.length === 4); }
function awzb_same(a, b) { return String(a).toUpperCase() === String(b).toUpperCase(); }
function awzb_dark(c) { return jzLum(c) < 0.45; }
function awzb_first(list, test, fb) { for (var i = 0; i < list.length; i++) if (awzb_isHex(list[i]) && (!test || test(list[i]))) return list[i]; return fb; }
function awzb_hot(sc, own) { return awzb_same(own, sc.accent) ? awzb_first([sc.accent2, sc.fg], null, '#FFFFFF') : awzb_first([sc.accent, sc.fg], null, '#FFFFFF'); }
function awzb_seal(sc, col) {
    return awzb_first([sc.accent, sc.accent2], function (c) { return !awzb_same(c, col) && jzContrast(c, sc.bg) >= 1.5; },
        awzb_first([sc.accent, sc.accent2, sc.fg], function (c) { return !awzb_same(c, col); }, sc.fg));
}
function awzb_paper(sc) { return jzMixHex(sc.bg, sc.fg, awzb_dark(sc.bg) ? 0.16 : 0.1); }
function awzb_quiet(sc, col) { return awzb_first([sc.sub], function (c) { return jzContrast(c, sc.bg) >= 1.4; }, jzMixHex(sc.bg, col, 0.5)); }
function awzb_ink(sc) { return awzb_first([sc.ink, sc.fg], function (c) { return jzContrast(c, sc.bg) >= 1.6; }, sc.fg); }
function awzb_pop(sc) { return awzb_first([sc.accent, sc.accent2, sc.fg], function (c) { return jzContrast(c, sc.bg) > 1.6; }, sc.fg); }
function awzb_shade(sc) { return awzb_dark(sc.bg) ? '#000000' : (awzb_isHex(sc.ink) && awzb_dark(sc.ink) ? sc.ink : (awzb_dark(sc.fg) ? sc.fg : '#111111')); }
function awzb_light(sc) { return awzb_dark(sc.bg) ? sc.fg : '#FFFFFF'; }
function awzb_mark(sc, col) { return awzb_first([sc.accent, sc.accent2], function (c) { return jzContrast(c, sc.bg) >= 1.8; }, col); }
// ---- the lyric layer
function awzb_td(L) { try { return L.property('ADBE Text Properties').property('ADBE Text Document').value; } catch (e) { return null; } }
function awzb_sv(L, mn) { var p = jzXf(L, mn); try { return p.valueAtTime(0, true); } catch (e) { return p.value; } }
function awzb_isSp(ch) { return ch === ' ' || ch === '　' || ch === '\t'; }
function awzb_adv(ch) { var c = ch.charCodeAt(0); if (ch === ' ') return 0.3; if (c >= 0xFF61 && c <= 0xFF9F) return 0.5; return c < 0x2000 ? 0.56 : 1; }
function awzb_matted(L) { try { return !!L.trackMatteType && L.trackMatteType !== TrackMatteType.NO_TRACK_MATTE; } catch (e) { return true; } }
// Everything a part needs to know about its line (text layer space). rest = measure after the entrance (hold / exit / treat).
//   box x0 y0 x1 y1 w h cx cy · fs font size (layer units) · g[i] {li, sp, x, y (centre), w} per glyph in textIndex order ·
//   vert (one glyph per line) · n glyphs · nk without spaces · lines[] {y, n} · lead · s0 layer scale · u = design px ·
//   Wc / Hc comp size in layer units · X static transform · own text colour · hot accent · seed · cs cut seed · mi · N glyphs
//   of the cut · single (one glyph of a lyric set glyph by glyph) · solid / main (browser solid() / isMain()) · crowded ·
//   H expression header: IN DL OS OD SD SZ + easings + P (entrance 0..1) + PO (exit 0..1)
function awzb_K(m, rest) {
    var L = m.L, c = m.c, sc = m.ctx.sc, td = awzb_td(L), i, j;
    var t = { IN: Math.max(0.02, c.inDur || 0.3), DL: (m.o.mi || 0) * (c.stagger || 0.04), OS: c.dur - (c.outDur || 0), OD: Math.max(0.001, c.outDur || 0) };
    var r = null;
    if (rest) { try { r = L.sourceRectAtTime(Math.max(0, Math.min(t.OS - 0.01, t.DL + t.IN + 0.03)), false); } catch (e0) { r = null; } }
    if (!r || !(r.width > 0) || !(r.height > 0)) r = jzRect(L);
    var fs = (td && td.fontSize > 1) ? td.fontSize : (m.size || 100), text = String(td ? td.text : ''), trk = ((td && td.tracking) || 0) / 1000 * fs;
    var lines = text.split(/\r\n|\r|\n|\u0003/), nL = lines.length, lead = fs * 1.2;
    try { if (td && td.autoLeading === false && td.leading > 0) lead = td.leading; } catch (e1) {}
    var just = 'c';
    try { if (td.justification === ParagraphJustification.LEFT_JUSTIFY) just = 'l'; else if (td.justification === ParagraphJustification.RIGHT_JUSTIFY) just = 'r'; } catch (e2) {}
    var rows = [], maxW = 0, vert = nL > 1, G = [], n = 0, nk = 0, LN = [];
    for (i = 0; i < nL; i++) {
        var cs = jzChars(lines[i]), ws = [], w = 0;
        for (j = 0; j < cs.length; j++) { var a = awzb_adv(cs[j]) * fs; ws.push(a); w += a + (j < cs.length - 1 ? trk : 0); }
        if (cs.length > 1) vert = false;
        rows.push({ cs: cs, ws: ws, w: w }); if (w > maxW) maxW = w;
    }
    var rw = Math.max(1, r.width), rh = Math.max(1, r.height), k = maxW > 0 ? rw / maxW : 1; if (!(k > 0.5 && k < 2)) k = 1;
    var lh = rh - (nL - 1) * lead; if (!(lh > fs * 0.5 && lh < fs * 1.6)) lh = fs * 0.95;
    for (i = 0; i < nL; i++) {
        var R = rows[i], x = just === 'l' ? r.left : (just === 'r' ? r.left + rw - R.w * k : r.left + rw / 2 - R.w * k / 2), y = r.top + lh / 2 + i * lead;
        LN.push({ y: y, n: R.cs.length });
        for (j = 0; j < R.cs.length; j++) {
            var sp = awzb_isSp(R.cs[j]);
            G.push({ li: i, sp: sp, x: x + R.ws[j] * k / 2, y: y, w: Math.max(1, R.ws[j] * k) });
            x += (R.ws[j] + trk) * k; n++;
            if (!sp) nk++;
        }
    }
    var X = { a: awzb_sv(L, 'ADBE Anchor Point'), p: awzb_sv(L, 'ADBE Position'), s: awzb_sv(L, 'ADBE Scale'), r: awzb_sv(L, 'ADBE Rotate Z') };
    var s0 = (Math.abs(X.s[0]) + Math.abs(X.s[1])) / 200; if (!(s0 > 0.01)) s0 = 1;
    var op = 100; try { op = awzb_sv(L, 'ADBE Opacity'); } catch (e3) {}
    var N = Math.max(1, jzCount(String(c.text || ''))), mi = Math.max(0, Math.round(m.o.mi || 0)), own = jzTextColor(L), nl = 0;
    try { nl = m.ctx.comp.numLayers; } catch (e4) {}
    var K = { m: m, L: L, sc: sc, t: t, td: td, fs: fs, lead: lead, trk: trk * k, nL: nL, lines: LN, g: G, n: n, nk: nk, vert: vert, X: X, s0: s0, u: m.u / s0,
        x0: r.left, y0: r.top, x1: r.left + rw, y1: r.top + rh, w: rw, h: rh, cx: r.left + rw / 2, cy: r.top + rh / 2,
        Wc: m.W / s0, Hc: m.H / s0, own: own, hot: awzb_hot(sc, own), cs: c.seed | 0, seed: (c.seed | 0) + mi * 101, mi: mi, N: N };
    K.big = (rw + rh) * 2 + fs * 8;
    K.single = nk <= 1 && N > 1;
    K.ord = N > 1 ? jzClamp(mi / (N - 1), 0, 1) : 0;
    K.fill = !(td && td.applyFill === false);
    K.solid = K.fill && op >= 85;
    K.main = K.solid && !(nk <= 1 && N > 2);
    K.crowded = n > 60 || n < 1 || (K.single && N > 14) || nl > 60;
    K.H = 'var IN=' + jzN(t.IN) + ',DL=' + jzN(t.DL) + ',OS=' + jzN(t.OS) + ',OD=' + jzN(t.OD) + ',SD=' + (((c.seed | 0) % 99991) + mi * 101) + ',SZ=' + jzN(fs) + ';\n' + JZ_FNS + AWZB_FNS +
        'var P=cl((time-DL)/IN),PO=(OD>0.002?cl((time-OS)/OD):0);\n';
    return K;
}
function awzb_dir(K, salt) { return awzb_r(K.cs, salt, 5) < 0.5 ? -1 : 1; }
function awzb_lw(K) { return Math.max(2 * K.u, K.fs * 0.03); }                      // the browser's lineW
// order fraction of glyph i: along the item (entrances), or along the whole cut when every glyph is its own layer (exits)
function awzb_o(K, i, cut) { return (cut && K.single) ? K.ord : (K.n > 1 ? i / (K.n - 1) : 0); }
// the same inside a selector expression (i = textIndex - 1) -> defines `o`
function awzb_oEx(K, cut) { return (cut && K.single) ? 'var o=' + jzN(K.ord) + ';' : 'var o=textTotal>1?i/(textTotal-1):0;'; }
// indices of the glyphs that get an object: every non-space glyph, thinned out evenly to at most `max`
function awzb_some(K, max) {
    var out = [], i, all = [];
    for (i = 0; i < K.n; i++) if (!K.g[i].sp) all.push(i);
    if (all.length <= max) return all;
    for (i = 0; i < max; i++) out.push(all[Math.floor(i * all.length / max)]);
    return out;
}
// (u, v) frame of the padded box: u runs along the reading direction, v across it (vertical text: u = y, v = x)
function awzb_uv(K, mg) {
    var v = K.vert; if (mg == null) mg = K.fs * 0.2;
    var g = { vert: v, U0: (v ? K.y0 : K.x0) - mg, U1: (v ? K.y1 : K.x1) + mg, V0: (v ? K.x0 : K.y0) - mg, V1: (v ? K.x1 : K.y1) + mg };
    g.L = g.U1 - g.U0; g.T = g.V1 - g.V0; g.uc = (g.U0 + g.U1) / 2; g.vc = (g.V0 + g.V1) / 2;
    return g;
}
function awzb_p2(v, a, b) { return v ? [b, a] : [a, b]; }
function awzb_xy(v, a, b) { return v ? '[' + b + ',' + a + ']' : '[' + a + ',' + b + ']'; }
// the layer new helper layers go above (above the lyric's own track matte when it has one)
function awzb_top(K) { var L = K.L; if (awzb_matted(L)) { try { return K.m.ctx.comp.layer(L.index - 1); } catch (e) {} } return L; }
// shape layer drawn in the lyric's own space (parented to it). mode 'in': helper graphic of the entrance (gone when it is over),
// 'out': helper graphic of the exit (starts with it), 'keep': full length (mattes, treatment marks). below: under the lyric
function awzb_layer(K, name, mode, below) {
    var L = K.L, S = K.m.ctx.comp.layers.addShape(), t = K.t, tr;
    try { S.name = name; } catch (e0) {}
    try { if (below) S.moveAfter(L); else S.moveBefore(awzb_top(K)); } catch (e1) {}
    S.parent = L;
    tr = S.property('ADBE Transform Group');
    tr.property('ADBE Anchor Point').setValue([0, 0]); tr.property('ADBE Position').setValue([0, 0]);
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    if (mode === 'in') { try { S.outPoint = Math.max(S.inPoint + 0.05, Math.min(S.outPoint, t.DL + t.IN + 0.1)); } catch (e2) {} jzNoGhost(S); }
    else if (mode === 'out') { try { if (t.OS - 0.05 > S.inPoint) S.inPoint = t.OS - 0.05; } catch (e3) {} jzNoGhost(S); }
    return S;
}
// S becomes the alpha (inv: inverted alpha) track matte of the layer Lx (placed right above it)
function awzb_setMatte(Lx, S, inv) {
    var tp = inv ? TrackMatteType.ALPHA_INVERTED : TrackMatteType.ALPHA, ok = false;
    try { S.moveBefore(Lx); } catch (e0) {}
    if (typeof Lx.setTrackMatte === 'function') { try { Lx.setTrackMatte(S, tp); ok = true; } catch (e1) { ok = false; } }
    if (!ok) { try { Lx.trackMatteType = tp; } catch (e2) { jzWarn('x2waB matte: ' + e2.toString()); } }
    try { S.enabled = false; } catch (e3) {}
}
// plain wipe when a shaped clip is not possible (ang: Linear Wipe angle; eEx: 0..1 revealed)
function awzb_wipeIn(K, ang, eEx) {
    var lw = jzEffect(K.L, 'ADBE Linear Wipe', 'JZ In Wipe');
    jzEP(lw, 2, ang); jzEP(lw, 3, 0);
    jzEX(lw, 1, K.H + '(1-(' + eEx + '))*100');
}
// rectangular mask in layer space. sub: subtract; else add (intersect when the layer already carries masks)
function awzb_mask(Lx, x0, y0, x1, y1, name, sub) {
    var mp = Lx.property('ADBE Mask Parade'), had = 0;
    try { had = mp.numProperties; } catch (e0) {}
    var mk = mp.addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = [[x1, y0], [x1, y1], [x0, y1], [x0, y0]]; sh.closed = true;
    mk.property('ADBE Mask Shape').setValue(sh);
    try { if (name) mk.name = name; } catch (e1) {}
    try { if (sub) mk.maskMode = MaskMode.SUBTRACT; else if (had) mk.maskMode = MaskMode.INTERSECT; } catch (e2) {}
    return mk;
}
// ---- shape items (every item is fully set up before the next one is added to the same contents: AE invalidates older references)
function awzb_sub(g, name) { var s = jzVecs(g).addProperty('ADBE Vector Group'); if (name) s.name = name; return s; }
// static rect from edges, in (u, v) when vert
function awzb_box(g, vert, a0, b0, a1, b1, round) {
    var s = awzb_p2(vert, a1 - a0, b1 - b0), c = awzb_p2(vert, (a0 + a1) / 2, (b0 + b1) / 2);
    return jzAddRect(g, Math.max(0.01, s[0]), Math.max(0.01, s[1]), round || 0, c[0], c[1]);
}
function awzb_curve(g, v, it, ot, closed) {
    var p = jzVecs(g).addProperty('ADBE Vector Shape - Group'), sh = new Shape();
    sh.vertices = v; sh.inTangents = it; sh.outTangents = ot; sh.closed = !!closed;
    p.property('ADBE Vector Shape').setValue(sh);
    return p;
}
// bezier arc: centre, radii, a0 -> a1 in degrees (canvas convention: from +x towards +y), optional turn (radians)
function awzb_arc(cx, cy, rx, ry, a0, a1, rot) {
    var n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 90 - 0.0001)), d = (a1 - a0) / n * Math.PI / 180, k = 4 / 3 * Math.tan(d / 4);
    var v = [], it = [], ot = [], i, cr = Math.cos(rot || 0), sr = Math.sin(rot || 0);
    for (i = 0; i <= n; i++) {
        var a = a0 * Math.PI / 180 + d * i, c = Math.cos(a), s = Math.sin(a), px = rx * c, py = ry * s, tx = -rx * s * k, ty = ry * c * k;
        var qx = tx * cr - ty * sr, qy = tx * sr + ty * cr;
        v.push([cx + px * cr - py * sr, cy + px * sr + py * cr]);
        ot.push(i < n ? [qx, qy] : [0, 0]);
        it.push(i > 0 ? [-qx, -qy] : [0, 0]);
    }
    return { v: v, i: it, o: ot };
}
function awzb_swap(A) {
    var i, t;
    for (i = 0; i < A.v.length; i++) { t = A.v[i]; A.v[i] = [t[1], t[0]]; t = A.i[i]; A.i[i] = [t[1], t[0]]; t = A.o[i]; A.o[i] = [t[1], t[0]]; }
    return A;
}
// closed ellipse as a path (same winding for all of them, so overlapping ones fill as one area)
function awzb_ell(g, cx, cy, rx, ry, rot) {
    var A = awzb_arc(cx, cy, rx, ry, 0, 360, rot);
    A.i[0] = A.i[4]; A.v.pop(); A.i.pop(); A.o.pop();
    return awzb_curve(g, A.v, A.i, A.o, true);
}
// closed smooth blob through the points
function awzb_blob(g, pts) {
    var n = pts.length, it = [], ot = [], i;
    for (i = 0; i < n; i++) { var a = pts[(i + n - 1) % n], b = pts[(i + 1) % n], tx = (b[0] - a[0]) / 6, ty = (b[1] - a[1]) / 6; it.push([-tx, -ty]); ot.push([tx, ty]); }
    return awzb_curve(g, pts, it, ot, true);
}
// group transform: static a p s r o, expressions pe se re oe
function awzb_xf(g, o) {
    var X = jzGX(g);
    if (o.a) X.property('ADBE Vector Anchor').setValue(o.a);
    if (o.p) X.property('ADBE Vector Position').setValue(o.p);
    if (o.s) X.property('ADBE Vector Scale').setValue(o.s);
    if (o.r) X.property('ADBE Vector Rotation').setValue(o.r);
    if (o.o != null) X.property('ADBE Vector Group Opacity').setValue(o.o);
    if (o.pe) jzSetExpr(X.property('ADBE Vector Position'), o.pe);
    if (o.se) jzSetExpr(X.property('ADBE Vector Scale'), o.se);
    if (o.re) jzSetExpr(X.property('ADBE Vector Rotation'), o.re);
    if (o.oe) jzSetExpr(X.property('ADBE Vector Group Opacity'), o.oe);
}
// rect group on S whose edges a0 b0 a1 b1 (along / across when vert) are expressions after `pre`. o: { op, round, oe }
function awzb_rc(S, name, vert, pre, a0, b0, a1, b1, col, o) {
    o = o || {};
    var g = jzGrp(S, name), rc = jzAddRect(g, 10, 10, o.round || 0);
    var q = pre + 'var ra=' + a0 + ',rb=' + b0 + ',rc=' + a1 + ',rd=' + b1 + ',rw=Math.max(0,rc-ra),rh=Math.max(0,rd-rb);';
    jzSetExpr(rc.property('ADBE Vector Rect Size'), q + awzb_xy(vert, 'rw', 'rh'));
    jzSetExpr(rc.property('ADBE Vector Rect Position'), q + awzb_xy(vert, '(ra+rc)/2', '(rb+rd)/2'));
    jzAddFill(g, col, o.op);
    if (o.oe) jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), pre + o.oe);
    return g;
}
// free-flying piece: one closed path rebuilt every frame (tail = expression ending in createPath(...)), opacity opEx (0..100)
function awzb_piece(S, name, col, pre, tail, opEx) {
    var g = jzGrp(S, name), p = jzAddPath(g, [[0, 0], [1, 0], [1, 1]], true);
    jzSetExpr(p.property('ADBE Vector Shape'), pre + tail);
    jzAddFill(g, col);
    jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), pre + opEx);
    return g;
}
function awzb_trim(g, s, e, off) {
    var t = jzVecs(g).addProperty('ADBE Vector Filter - Trim');
    if (s != null) t.property('ADBE Vector Trim Start').setValue(s);
    if (e != null) t.property('ADBE Vector Trim End').setValue(e);
    if (off) t.property('ADBE Vector Trim Offset').setValue(off);
    return t;
}
// per-glyph animators from one body (after `head`): o.p largest offset (px), o.r largest turn (deg), o.s scale (0..2),
// o.a fade, o.c tint colour (amount ct 0..1)
function awzb_emit(L, name, head, body, o) {
    var q = head + 'var i=textIndex-1,dx=0,dy=0,rot=0,sx=1,sy=1,al=1,ct=0;function wzc(v){return Math.max(-100,Math.min(100,v));}' + body + '\n';
    if (o.c) jzAnimator(L, name + ' Tint', [['ADBE Text Fill Color', jzHex(o.c)]], q + 'wzc(ct*100)');
    if (o.s) jzAnimator(L, name + ' Size', [['ADBE Text Scale 3D', [200, 200, 100]]], q + '[wzc((sx-1)*100),wzc((sy-1)*100),0]');
    if (o.r) jzAnimator(L, name + ' Turn', [['ADBE Text Rotation', o.r]], q + 'wzc(rot/' + jzN(o.r) + '*100)');
    if (o.p) jzAnimator(L, name + ' Move', [['ADBE Text Position 3D', [o.p, o.p, 0]]], q + '[wzc(dx/' + jzN(o.p) + '*100),wzc(dy/' + jzN(o.p) + '*100),0]');
    if (o.a) jzAnimator(L, name + ' Fade', [['ADBE Text Opacity', 0]], q + 'wzc((1-al)*100)');
}
// keep the point (px, py) of the lyric's own space fixed while the layer is scaled by [fx, fy] and turned by rot degrees on top
// of its own transform (expression strings) -> snippet for m.parts.pos (the browser's scaleAbout / rotAbout)
function awzb_pivot(K, fx, fy, rot, px, py) {
    var X = K.X, r0 = X.r * Math.PI / 180, ux = (px - X.a[0]) * X.s[0] / 100, uy = (py - X.a[1]) * X.s[1] / 100;
    if (Math.abs(ux) + Math.abs(uy) < 0.5) return '';
    return 'var wza1=' + jzN(r0) + '+(' + rot + ')*Math.PI/180,wzqx=(' + fx + ')*' + jzN(ux) + ',wzqy=(' + fy + ')*' + jzN(uy) + ';' +
        'd=[d[0]+' + jzN(Math.cos(r0) * ux - Math.sin(r0) * uy) + '-(Math.cos(wza1)*wzqx-Math.sin(wza1)*wzqy),d[1]+' + jzN(Math.sin(r0) * ux + Math.cos(r0) * uy) + '-(Math.sin(wza1)*wzqx+Math.cos(wza1)*wzqy)];';
}
// linked copy of the lyric for the exit: parented to it, takes its final text style, starts with the exit (main pass only)
function awzb_twin(K, tag) {
    var L = K.L, D = L.duplicate(), i, mns = ['ADBE Position', 'ADBE Scale', 'ADBE Rotate Z', 'ADBE Opacity', 'ADBE Anchor Point'];
    try { D.name = String(L.name).substr(0, 18) + ' ' + tag; } catch (e0) {}
    var tr = D.property('ADBE Transform Group');
    for (i = 0; i < mns.length; i++) { try { if (tr.property(mns[i]).expression) tr.property(mns[i]).expression = ''; } catch (e1) {} }
    D.parent = L;
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    jzSetExpr(tr.property('ADBE Position'), 'parent.transform.anchorPoint');
    try { D.property('ADBE Text Properties').property('ADBE Text Document').expression = 'parent.text.sourceText.style'; } catch (e2) {}
    try { if (K.t.OS - 0.05 > D.inPoint) D.inPoint = K.t.OS - 0.05; } catch (e3) {}
    try { D.moveBefore(awzb_top(K)); } catch (e4) {}
    jzNoGhost(D);
    return D;
}

/* =====================================================================
   ENTER
   ===================================================================== */

/* ---- wzFusuma — 襖びらき: two sliding paper doors (frame, stile, round pull) stand closed over the line, then slide apart
   into the sides. Clip = a thin mask at the middle of the line opened by its expansion; the doors = rects with moving edges. */
jzReg('enter', 'wzFusuma', { apply: function (m) {
    var K = awzb_K(m, false), L = K.L, fs = K.fs, g = awzb_uv(K, fs * 0.28), v = g.vert, B = K.big, N = jzN, sd;
    var E = K.H + 'var sh=oc(P/0.2),e=wzio((P-0.16)/0.72),h=' + N(g.L / 2) + '*e;';
    var a = awzb_p2(v, g.uc - 0.5, g.V0 - B), b = awzb_p2(v, g.uc + 0.5, g.V1 + B);
    var mk = awzb_mask(L, a[0], a[1], b[0], b[1], 'JZ In Fusuma');
    jzSetExpr(mk.property('ADBE Mask Offset'), E + 'P>=1?10000:Math.max(0,h-0.5)');
    jzSetExpr(mk.property('ADBE Mask Opacity'), E + 'e>0||P>=1?100:0');
    if (!K.main || K.crowded) return;
    var S = awzb_layer(K, 'JZ In Fusuma Doors', 'in'), lw = awzb_lw(K), col = K.own, paper = awzb_paper(K.sc), acc = K.hot;
    var D = E + 'var vh=' + N(g.T / 2) + '*sh,v0=' + N(g.vc) + '-vh,v1=' + N(g.vc) + '+vh;';
    for (sd = -1; sd <= 1; sd += 2) {
        var nm = sd < 0 ? 'door A ' : 'door B ';
        var DE = D + 'var ui=' + N(g.uc) + '+(' + sd + ')*h,uo=' + N(sd < 0 ? g.U0 : g.U1) + ',u0=Math.min(ui,uo),u1=Math.max(ui,uo),um=(u0+u1)/2;';
        var pg = jzGrp(S, nm + 'pull'), pe = jzAddEllipse(pg, 10, 10);
        jzSetExpr(pe.property('ADBE Vector Ellipse Size'), DE + 'var r=' + N(fs * 0.17) + '*sh;[r,r]');
        jzAddStroke(pg, acc, lw * 0.75);
        awzb_xf(pg, { pe: DE + awzb_xy(v, 'ui-(' + sd + ')*' + N(fs * 0.36), N(g.vc)), oe: DE + 'u1-u0>' + N(fs * 0.7) + '?100:0' });
        awzb_rc(S, nm + 'stile', v, DE, sd < 0 ? 'u1-' + N(lw) : 'u0', 'v0', sd < 0 ? 'u1' : 'u0+' + N(lw), 'v1', col);
        awzb_rc(S, nm + 'leaf', v, DE, 'um-' + N(lw * 0.3), 'v0', 'um+' + N(lw * 0.3), 'v1', col, { op: 55 });
        awzb_rc(S, nm + 'rail 1', v, DE, 'u0', 'v0', 'u1', 'v0+' + N(lw), col);
        awzb_rc(S, nm + 'rail 2', v, DE, 'u0', 'v1-' + N(lw), 'u1', 'v1', col);
        awzb_rc(S, nm + 'paper', v, DE, 'u0', 'v0', 'u1', 'v1', paper);
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), E + 'P>=1||time<DL?0:(1-wzsm(0.8,1,P))*cl(sh*1.5)*100');
} });

/* ---- wzKakejiku — 掛け軸: the top bar appears, then the weighted rod rolls down and lets the text out (always top to bottom) */
jzReg('enter', 'wzKakejiku', { apply: function (m) {
    var K = awzb_K(m, false), L = K.L, fs = K.fs, mg = fs * 0.3, B = K.big, N = jzN, Y0 = K.y0 - mg, Y1 = K.y1 + mg;
    var E = K.H + 'var tp=oc(P/0.2),e=wzio((P-0.12)/0.72),y=wzlp(' + N(Y0) + ',' + N(Y1) + ',e),hw=' + N(K.w / 2 + mg) + '*tp;';
    var mk = awzb_mask(L, K.x0 - B, Y0 - B, K.x1 + B, Y0, 'JZ In Kakejiku');
    jzSetExpr(mk.property('ADBE Mask Offset'), E + 'P>=1?10000:Math.max(0,y-' + N(Y0) + ')');
    jzSetExpr(mk.property('ADBE Mask Opacity'), E + 'e>0||P>=1?100:0');
    if (!K.main || K.crowded) return;
    var S = awzb_layer(K, 'JZ In Kakejiku Scroll', 'in'), lw = awzb_lw(K), col = K.own, acc = K.hot, rod = Math.max(4 * K.u, fs * 0.085), CX = N(K.cx);
    awzb_rc(S, 'cap A', false, E, CX + '-hw-' + N(rod * 1.3), 'y-' + N(rod * 0.72), CX + '-hw-' + N(rod * 0.4), 'y+' + N(rod * 0.72), acc, { oe: 'tp*100' });
    awzb_rc(S, 'cap B', false, E, CX + '+hw+' + N(rod * 0.4), 'y-' + N(rod * 0.72), CX + '+hw+' + N(rod * 1.3), 'y+' + N(rod * 0.72), acc, { oe: 'tp*100' });
    awzb_rc(S, 'roller', false, E, CX + '-hw-' + N(rod * 0.4), 'y-' + N(rod / 2), CX + '+hw+' + N(rod * 0.4), 'y+' + N(rod / 2), col, { round: rod / 2, oe: 'cl(tp*2)*100' });
    awzb_rc(S, 'edge A', false, E, CX + '-hw', N(Y0), CX + '-hw+' + N(lw * 0.4), 'y', col, { op: 45 });
    awzb_rc(S, 'edge B', false, E, CX + '+hw-' + N(lw * 0.4), N(Y0), CX + '+hw', 'y', col, { op: 45 });
    var cg = jzGrp(S, 'cord');
    jzAddPath(cg, [[-fs * 0.32, 0], [0, -fs * 0.26], [fs * 0.32, 0]], false); jzAddStroke(cg, col, lw * 0.5, 80);
    awzb_xf(cg, { p: [K.cx, Y0 - lw], se: E + '[tp*100,tp*100]' });
    awzb_rc(S, 'bar', false, E, CX + '-hw', N(Y0 - lw), CX + '+hw', N(Y0), col);
    jzSetExpr(jzXf(S, 'ADBE Opacity'), E + 'P>=1||time<DL?0:(1-wzsm(0.84,1,P))*100');
} });

/* ---- wzMisu — 御簾上げ: the text is first seen through the slats of a bamboo blind, which is then drawn up: the slats bunch
   at the top. Clip = the slats themselves as an inverted alpha matte; the visible blind = the same slats + cords and tassels. */
jzReg('enter', 'wzMisu', { apply: function (m) {
    var K = awzb_K(m, false), L = K.L, fs = K.fs, mg = fs * 0.22, N = jzN, Y0 = K.y0 - mg, Y1 = K.y1 + mg, i;
    var n = Math.round(jzClamp((Y1 - Y0) / (fs * 0.14), 6, 40)), pitch = (Y1 - Y0) / n, th = pitch * 0.5, bp = th * 0.4;
    var E = K.H + 'var e=wzio((P-0.14)/0.66),yb=wzlp(' + N(Y1) + ',' + N(Y0) + ',e);';
    var ys = function (q) { return 'Math.min(' + N(Y0 + (q + 0.5) * pitch) + ',yb-' + N((n - 1 - q) * bp + th / 2) + ')'; };
    m.parts.op.push('f*=cl(P/0.16);');
    if (K.crowded || awzb_matted(L)) awzb_wipeIn(K, 0, 'wzio((P-0.14)/0.66)');
    else {
        var M = awzb_layer(K, 'JZ In Misu Matte', 'keep');
        for (i = 0; i < n; i++) {
            var mg1 = jzGrp(M, 'slat ' + (i + 1));
            jzAddRect(mg1, K.w + K.big * 2, th, 0, K.cx, 0); jzAddFill(mg1, '#FFFFFF');
            awzb_xf(mg1, { pe: E + '[0,' + ys(i) + ']' });
        }
        jzSetExpr(jzXf(M, 'ADBE Opacity'), E + 'P<1&&time>=DL?100:0');
        awzb_setMatte(L, M, true);
    }
    if (!K.main || K.crowded) return;
    var S = awzb_layer(K, 'JZ In Misu Blind', 'in'), col = K.own, slat = awzb_quiet(K.sc, col), acc = K.hot, x0 = K.x0 - mg, w = K.w + mg * 2, cw = Math.max(2 * K.u, fs * 0.035);
    var fr = w > fs * 2.4 ? [0.2, 0.8] : [0.5], TOP = ys(0) + '-' + N(th);
    for (i = 0; i < fr.length; i++) {
        var cx = x0 + w * fr[i];
        awzb_rc(S, 'tassel ' + (i + 1), false, E, N(cx - cw * 1.4), 'yb', N(cx + cw * 1.4), 'yb+' + N(fs * 0.14), acc);
        awzb_rc(S, 'cord ' + (i + 1), false, E, N(cx - cw / 2), TOP, N(cx + cw / 2), 'yb', acc);
    }
    for (i = 0; i < n; i++) {
        var sg = jzGrp(S, 'slat ' + (i + 1));
        jzAddRect(sg, w, th, 0, x0 + w / 2, 0); jzAddFill(sg, slat, 90);
        awzb_xf(sg, { pe: E + '[0,' + ys(i) + ']' });
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), E + 'P>=1||time<DL?0:(1-wzsm(0.8,1,P))*100');
} });

/* ---- wzHanko — 判子: pressed like a seal: the line lands (from 120 %, a little turned) knocked out of a vermilion block, then
   the block lifts off in uneven patches and leaves the text in its own colour */
jzReg('enter', 'wzHanko', { apply: function (m) {
    var K = awzb_K(m, false), L = K.L, fs = K.fs, sc = K.sc, N = jzN, dir = awzb_dir(K, 11), seed = K.seed, i, j;
    var pre = AWZB_FNS + 'var wzt=cl((P-0.26)/0.74),wzk=P>=1?1:(P<0.26?wzlp(1.2,1,iq(P/0.26)):1-0.035*Math.exp(-wzt*10)*(1-wzt)),wzr=' + N(-5 * dir) + '*(1-iq(P/0.26));';
    m.parts.sc.push(pre + 'f=[f[0]*wzk,f[1]*wzk];');
    m.parts.rot.push(pre + 'r+=wzr;');
    var pv = awzb_pivot(K, 'wzk', 'wzk', 'wzr', K.cx, K.cy);
    if (pv) m.parts.pos.push(pre + pv);
    m.parts.op.push('f*=cl(P/0.1);');
    if (!K.main || K.crowded) return;
    var own = K.own, seal = awzb_seal(sc, own), knock = jzContrast(sc.bg, seal) >= 1.6 ? sc.bg : (awzb_dark(seal) ? '#FFFFFF' : '#000000');
    jzAnimator(L, 'JZ In Hanko Ink', [['ADBE Text Fill Color', jzHex(knock)]], K.H + '(1-wzsm(0.45,0.85,P))*100');
    var S = awzb_layer(K, 'JZ In Hanko Seal', 'in', true), mg = fs * 0.2, x0 = K.x0 - mg, y0 = K.y0 - mg, w = K.w + mg * 2, h = K.h + mg * 2;
    var cols = Math.round(jzClamp(w / (fs * 0.4), 2, 12)), rows = Math.round(jzClamp(h / (fs * 0.4), 2, 4)), cw = w / cols, ch = h / rows, ex = fs * 0.045;
    var E = K.H + 'var lf=wzsm(0.4,0.96,P);';
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
        var r1 = awzb_r(seed, i, j, 201) * 0.68, a0 = 0.84 + 0.16 * awzb_r(seed, i, j, 202);
        var ix0 = i === 0 ? awzb_r(seed, j, 203) * ex : 0, ix1 = i === cols - 1 ? awzb_r(seed, j, 204) * ex : 0;
        var iy0 = j === 0 ? awzb_r(seed, i, 205) * ex : 0, iy1 = j === rows - 1 ? awzb_r(seed, i, 206) * ex : 0;
        var g = jzGrp(S, 'patch ' + (j * cols + i + 1)), pw = cw - ix0 - ix1 + 0.6, ph = ch - iy0 - iy1 + 0.6;
        jzAddRect(g, pw, ph, 0, x0 + i * cw + ix0 + pw / 2, y0 + j * ch + iy0 + ph / 2); jzAddFill(g, seal);
        awzb_xf(g, { oe: E + N(a0 * 100) + '*(1-wzsm(' + N(r1) + ',' + N(r1 + 0.3) + ',lf))' });
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), K.H + 'P>=1||time<DL?0:cl(P/0.1)*100');
} });

/* ---- wzChochin — 提灯ともし: paper lanterns light up one after another along the line; each glyph flickers on in the accent
   colour inside its lantern (body, ribs, caps), turns to its own colour, and the lantern fades */
jzReg('enter', 'wzChochin', { selfHide: true, apply: function (m) {
    var K = awzb_K(m, false), L = K.L, fs = K.fs, N = jzN, warm = K.hot, n = K.n, i, kk;
    awzb_emit(L, 'JZ In Chochin', K.H, awzb_oEx(K) + 'var q=wzsg(P,o,0.6);if(q<=0)al=0;else if(q<1){seedRandom(i*31+SD+Math.floor(time*24)*7,true);' +
        'al=cl(q*3.5)*(q<0.45?0.55+0.45*random():1);ct=1-wzsm(0.45,1,q);}', { a: 1, c: K.fill ? warm : null });
    if (!K.main || K.crowded || K.nk > 40) return;
    var S = awzb_layer(K, 'JZ In Chochin Lanterns', 'in', true), lw = Math.max(1.5 * K.u, fs * 0.018), cap = fs * 0.07;
    for (i = 0; i < n; i++) {
        var gl = K.g[i]; if (gl.sp) continue;
        var rx = Math.max(gl.w, fs * 0.6) * 0.6, ry = fs * 0.7, G = jzGrp(S, 'lantern ' + (i + 1)), s1, s2, s3;
        s1 = awzb_sub(G, 'caps'); jzAddRect(s1, rx * 0.84, cap, 0, 0, -ry - cap / 2); jzAddRect(s1, rx * 0.84, cap, 0, 0, ry + cap / 2); jzAddFill(s1, warm, 90);
        s2 = awzb_sub(G, 'ribs');
        for (kk = -1; kk <= 1; kk++) { var hw = rx * Math.sqrt(1 - kk * kk * 0.25); jzAddPath(s2, [[-hw, kk * 0.5 * ry], [hw, kk * 0.5 * ry]], false); }
        jzAddStroke(s2, warm, lw, 45);
        s3 = awzb_sub(G, 'body'); jzAddEllipse(s3, rx * 2, ry * 2); jzAddStroke(s3, warm, lw, 90); jzAddFill(s3, warm, 20);
        awzb_xf(G, { p: [gl.x, gl.y], oe: K.H + 'var q=wzsg(P,' + N(awzb_o(K, i)) + ',0.6);q>0&&q<1?cl(q*4)*(1-wzsm(0.5,1,q))*100:0' });
    }
} });

/* ---- wzKamifubuki — 紙吹雪: paper confetti flutters down and settles where each glyph belongs; the glyph surfaces as its
   flakes land (flakes: turning, flipping quads rebuilt per frame) */
jzReg('enter', 'wzKamifubuki', { selfHide: true, apply: function (m) {
    var K = awzb_K(m, false), L = K.L, fs = K.fs, sc = K.sc, N = jzN, seed = K.seed, n = K.n, R = [], i, k;
    for (i = 0; i < Math.max(1, n); i++) R.push(awzb_r(seed, i, 221));
    awzb_emit(L, 'JZ In Kamifubuki', K.H, 'var R=' + awzb_arr(R) + ',q=wzsg(P,R[i]||0,0.36);if(q<=0.5)al=0;else if(q<1){al=wzsm(0.5,0.85,q);sx=sy=wzlp(0.82,1,oc((q-0.5)/0.5));}', { a: 1, s: 1 });
    if (!K.solid || K.crowded) return;
    var S = awzb_layer(K, 'JZ In Kamifubuki Flakes', 'in'), list = awzb_some(K, 60), Kf = Math.round(jzClamp(60 / Math.max(1, list.length), 1, 5)), j;
    var cols = [K.hot, awzb_isHex(sc.accent2) ? sc.accent2 : sc.accent, K.own, awzb_quiet(sc, K.own)];
    for (j = 0; j < list.length; j++) {
        i = list[j]; var gl = K.g[i];
        for (k = 0; k < Kf; k++) {
            var r1 = awzb_r(seed, i, k, 222), ph = awzb_r(seed, i, k, 223) * AWZB_TAU;
            var tx = gl.x + awzb_rs(seed, i, k, 224) * gl.w * 0.32, ty = gl.y + awzb_rs(seed, i, k, 225) * fs * 0.32;
            var pre = K.H + 'var q=wzsg(P,' + N(R[i]) + ',0.36),tf=cl(q/0.62*' + N(0.78 + 0.22 * r1) + '),ef=1-Math.pow(1-tf,1.5);';
            awzb_piece(S, 'flake ' + (i + 1) + '.' + (k + 1), cols[(i + k) % 4], pre,
                'var px=' + N(tx) + '+(1-ef)*' + N(awzb_rs(seed, i, k, 226) * fs * 1.5) + '+Math.sin(tf*9+' + N(ph) + ')*' + N(fs * 0.24) + '*(1-tf),py=' + N(ty) + '-(1-ef)*' + N(fs * (1.5 + 1.7 * awzb_r(seed, i, k, 227))) +
                ',ro=' + N(ph) + '+tf*8,hw=' + N(fs * 0.075) + '*(0.25+0.75*Math.abs(Math.cos(tf*11+' + N(ph) + '))),hh=' + N(fs * 0.048) + ',c=Math.cos(ro),s=Math.sin(ro);' +
                'createPath([[px-hw*c+hh*s,py-hw*s-hh*c],[px+hw*c+hh*s,py+hw*s-hh*c],[px+hw*c-hh*s,py+hw*s+hh*c],[px-hw*c-hh*s,py-hw*s+hh*c]],[],[],true)',
                'q>0&&q<1?cl(tf*5)*(1-wzsm(0.68,1,q))*100:0');
        }
    }
} });

/* ---- wzHanabi — 打ち上げ花火: a spark climbs to each glyph's place and bursts into a ring of streaks; the glyph pops out of
   the burst. Streaks = static rays cut to the moving piece by Trim Paths (two colours, the second ring a little smaller). */
jzReg('enter', 'wzHanabi', { selfHide: true, apply: function (m) {
    var K = awzb_K(m, false), L = K.L, fs = K.fs, sc = K.sc, N = jzN, seed = K.seed, n = K.n, O = [], i, j, k, c;
    for (i = 0; i < Math.max(1, n); i++) O.push(awzb_o(K, i) * 0.65 + awzb_r(seed, i, 231) * 0.35);
    awzb_emit(L, 'JZ In Hanabi', K.H, 'var O=' + awzb_arr(O) + ',q=wzsg(P,O[i]||0,0.42);if(q<=0.32)al=0;else if(q<1){var u=(q-0.32)/0.68;sx=sy=wzlp(0.3,1,ob(u/0.6,1.9));al=cl(u*4);}', { a: 1, s: 1 });
    if (!K.solid || K.crowded) return;
    var S = awzb_layer(K, 'JZ In Hanabi Bursts', 'in'), list = awzb_some(K, 24), Rn = K.n > 12 ? 8 : 12, c1 = K.hot;
    var c2 = awzb_first([sc.accent2], function (x) { return !awzb_same(x, c1); }, K.own), Rm = fs * 1.17 + 1, sw = Math.max(1.5 * K.u, fs * 0.024);
    for (j = 0; j < list.length; j++) {
        i = list[j]; var gl = K.g[i], rot0 = awzb_r(seed, i, 232) * AWZB_TAU, G = jzGrp(S, 'burst ' + (i + 1));
        var pre = K.H + 'var q=wzsg(P,' + N(O[i]) + ',0.42),u=cl((q-0.32)/0.68),r0=' + N(fs) + '*(0.2+0.72*oe(u)),ln=' + N(fs * 0.24) + '*(1-u)+1;';
        for (c = 0; c < 2; c++) {
            var rg = awzb_sub(G, c ? 'streaks B' : 'streaks A'), f = c ? 0.72 : 1;
            for (k = c; k < Rn; k += 2) { var an = rot0 + k / Rn * AWZB_TAU; jzAddPath(rg, [[0, 0], [Math.cos(an) * Rm, Math.sin(an) * Rm]], false); }
            jzAddTrimPaths(rg, pre + 'q>0.32?(r0*' + f + '+ln)/' + N(Rm) + '*100:0', pre + 'q>0.32?r0*' + f + '/' + N(Rm) + '*100:0');
            jzAddStroke(rg, c ? c2 : c1, sw);
        }
        var sg = awzb_sub(G, 'spark'), col = i % 2 ? c2 : c1;
        jzAddEllipse(sg, fs * 0.07, fs * 0.07); jzAddPath(sg, [[0, 0], [0, fs * 0.25]], false); jzAddStroke(sg, col, Math.max(1.5 * K.u, fs * 0.022)); jzAddFill(sg, col);
        awzb_xf(sg, { pe: pre + '[0,' + N(fs * 1.5) + '*(1-oc(q/0.32))]', oe: pre + 'q>0&&q<0.32?cl(q/0.32*6)*100:0' });
        awzb_xf(G, { p: [gl.x, gl.y], pe: pre + '[' + N(gl.x) + ',' + N(gl.y) + '+' + N(fs * 0.16) + '*u*u]', oe: pre + 'q>0&&q<1?(q<0.32?100:(1-wzsm(0.4,1,u))*100):0' });
    }
} });

/* ---- wzOrigami — 折り紙ひらき: every glyph sits on a folded paper square: a quarter shows first, the right half swings out,
   then the lower half folds down. Per-glyph clip = one rect per glyph on an alpha matte; paper + creases under the lyric. */
jzReg('enter', 'wzOrigami', { selfHide: true, apply: function (m) {
    var K = awzb_K(m, false), L = K.L, fs = K.fs, sc = K.sc, N = jzN, n = K.n, i;
    awzb_emit(L, 'JZ In Origami', K.H, awzb_oEx(K) + 'var q=wzsg(P,o,0.5);if(q<=0)al=0;else if(q<1){sx=sy=wzlp(0.4,1,ob(q/0.2,1.6));al=cl(q*8);}', { a: 1, s: 1 });
    if (K.crowded || K.nk > 24) return;
    var qe = function (q) { return K.H + 'var q=wzsg(P,' + N(awzb_o(K, q)) + ',0.5),s=q<=0?0:wzlp(0.4,1,ob(q/0.2,1.6)),x1=wzio((q-0.2)/0.38),y1=wzio((q-0.58)/0.42);'; };
    if (K.main) {
        var S = awzb_layer(K, 'JZ In Origami Paper', 'in', true), lw = Math.max(K.u, fs * 0.012), col = K.own;
        var papers = [K.hot, awzb_first([sc.accent2], null, sc.accent), awzb_quiet(sc, col)];
        for (i = 0; i < n; i++) {
            var gl = K.g[i]; if (gl.sp) continue;
            var hs = Math.max(gl.w, fs) * 0.56, G = jzGrp(S, 'paper ' + (i + 1)), Q = qe(i), s1, s2, s3, rc;
            s1 = awzb_sub(G, 'crease across'); jzAddPath(s1, [[-hs, 0], [hs, 0]], false); jzAddTrimPaths(s1, Q + 'y1>0?(1+x1)*50:0'); jzAddStroke(s1, col, lw, 50);
            s2 = awzb_sub(G, 'crease down'); jzAddPath(s2, [[0, -hs], [0, hs]], false); jzAddTrimPaths(s2, Q + 'x1>0?(1+y1)*50:0'); jzAddStroke(s2, col, lw, 50);
            s3 = awzb_sub(G, 'sheet'); rc = jzAddRect(s3, 10, 10, 0);
            jzSetExpr(rc.property('ADBE Vector Rect Size'), Q + '[' + N(hs) + '*(1+x1),' + N(hs) + '*(1+y1)]');
            jzSetExpr(rc.property('ADBE Vector Rect Position'), Q + '[' + N(hs / 2) + '*(x1-1),' + N(hs / 2) + '*(y1-1)]');
            jzAddFill(s3, papers[i % 3], 30);
            awzb_xf(G, { p: [gl.x, gl.y], se: Q + '[s*100,s*100]', oe: Q + 'q>0&&q<1?cl(q*8)*(1-wzsm(0.8,1,q))*100:0' });
        }
    }
    if (awzb_matted(L)) return;
    var M = awzb_layer(K, 'JZ In Origami Matte', 'keep');
    for (i = 0; i < n; i++) {
        var g2 = K.g[i]; if (g2.sp) continue;
        var hx = K.vert ? g2.w * 0.78 : g2.w * 0.5 + Math.max(0, K.trk) / 2, hy = (K.nL > 1) ? Math.min(fs * 0.78, K.lead / 2) : fs * 0.78;
        var mgp = jzGrp(M, 'window ' + (i + 1)), mr = jzAddRect(mgp, 10, 10, 0), Q2 = qe(i);
        jzSetExpr(mr.property('ADBE Vector Rect Size'), Q2 + '[' + N(hx) + '*s*(1+x1),' + N(hy) + '*s*(1+y1)]');
        jzSetExpr(mr.property('ADBE Vector Rect Position'), Q2 + '[' + N(g2.x) + '+' + N(hx / 2) + '*s*(x1-1),' + N(g2.y) + '+' + N(hy / 2) + '*s*(y1-1)]');
        jzAddFill(mgp, '#FFFFFF');
    }
    var fg = jzGrp(M, 'after entrance');
    jzAddRect(fg, 40000, 40000, 0, K.cx, K.cy); jzAddFill(fg, '#FFFFFF');
    awzb_xf(fg, { oe: K.H + 'P>=1?100:0' });
    awzb_setMatte(L, M, false);
} });

/* ---- wzSeigaiha — 青海波: the reveal rises from below as rows of overlapping wave scales, each drawn with its double arc.
   Clip = growing discs on an alpha matte (fewer, larger scales than the browser on long lines: at most about 70). */
jzReg('enter', 'wzSeigaiha', { apply: function (m) {
    var K = awzb_K(m, false), L = K.L, fs = K.fs, N = jzN, mg = fs * 0.25, x0 = K.x0 - mg, x1 = K.x1 + mg, y0 = K.y0 - mg, y1 = K.y1 + mg, i, j;
    if (K.crowded || awzb_matted(L)) { awzb_wipeIn(K, 0, 'wzio(P)'); return; }
    var r = Math.max(fs * 0.36, Math.sqrt((x1 - x0) * (y1 - y0) / 140)), dx, dy, rows, cols, guard = 0;
    do { dx = r * 1.5; dy = r * 0.62; rows = Math.ceil((y1 - y0) / dy) + 2; cols = Math.ceil((x1 - x0) / dx) + 2; if (rows * cols <= 72) break; r *= 1.12; } while (++guard < 40);
    var R0 = r * 1.32, cells = [];
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++)
        cells.push({ x: x0 + (i - 0.5 + (j % 2 ? 0.5 : 0)) * dx, y: y1 + r * 0.4 - j * dy, k: (j / Math.max(1, rows - 1)) * 0.75 + (i / Math.max(1, cols - 1)) * 0.25 });
    if (K.main) {
        var S = awzb_layer(K, 'JZ In Seigaiha Arcs', 'in'), col = K.hot, lw = Math.max(1.5 * K.u, fs * 0.022);
        for (i = 0; i < cells.length; i++) {
            var G = jzGrp(S, 'scale ' + (i + 1)), s1, s2, Q = K.H + 'var q=wzsg(P,' + N(cells[i].k) + ',0.62);';
            s1 = awzb_sub(G, 'arc'); jzAddEllipse(s1, R0 * 2, R0 * 2); awzb_trim(s1, 0, 50, -90); jzAddStroke(s1, col, lw);
            s2 = awzb_sub(G, 'inner arc'); jzAddEllipse(s2, R0 * 1.24, R0 * 1.24); awzb_trim(s2, 0, 50, -90); jzAddStroke(s2, col, lw * 0.7, 70);
            awzb_xf(G, { p: [cells[i].x, cells[i].y], se: Q + 'var s=oc(q)*100;[s,s]', oe: Q + 'q>0&&q<1?(1-q)*90:0' });
        }
    }
    var M = awzb_layer(K, 'JZ In Seigaiha Matte', 'keep');
    for (i = 0; i < cells.length; i++) {
        var mgp = jzGrp(M, 'disc ' + (i + 1)), el = jzAddEllipse(mgp, 10, 10, cells[i].x, cells[i].y);
        jzSetExpr(el.property('ADBE Vector Ellipse Size'), K.H + 'var q=wzsg(P,' + N(cells[i].k) + ',0.62),d=q>0?' + N(R0 * 2) + '*oc(q):0;[d,d]');
        jzAddFill(mgp, '#FFFFFF');
    }
    var fg = jzGrp(M, 'after entrance');
    jzAddRect(fg, 40000, 40000, 0, K.cx, K.cy); jzAddFill(fg, '#FFFFFF');
    awzb_xf(fg, { oe: K.H + 'P>=1?100:0' });
    awzb_setMatte(L, M, false);
} });

/* =====================================================================
   EXIT  (p = PO: 0 at the exit start, 1 at the cut end)
   ===================================================================== */

/* ---- wzShojiKage — 障子の影: a shoji screen slides across; behind its paper the line lingers as a soft shadow until the light
   goes out. Screen = one rigid panel (paper, lattice, frame) sliding inside a mask of the box; shadow = a tinted, blurred
   linked copy of the lyric seen only where the paper is. */
jzReg('exit', 'wzShojiKage', { apply: function (m) {
    var K = awzb_K(m, true), L = K.L, fs = K.fs, sc = K.sc, N = jzN, g = awzb_uv(K, fs * 0.25), v = g.vert, B = K.big, dir = awzb_dir(K, 21), j;
    var main = K.main && !K.crowded && !awzb_matted(L), TE = main ? '0.5' : '0.92';
    var E = K.H + 'var p=PO,e=wzio(p/' + TE + '),eu=' + (dir > 0 ? 'wzlp(' + N(g.U0) + ',' + N(g.U1) + ',e)' : 'wzlp(' + N(g.U1) + ',' + N(g.U0) + ',e)') +
        ',ex=Math.max(0,' + (dir > 0 ? 'eu-' + N(g.U0) : N(g.U1) + '-eu') + ');';
    var S = null, D = null;
    if (main) { S = awzb_layer(K, 'JZ Out Shoji Screen', 'out'); D = awzb_twin(K, 'JZ Out Shoji Shadow'); }
    // the lyric is wiped by the screen's leading edge (a subtract mask beyond the box edge the screen comes from)
    var a = awzb_p2(v, dir > 0 ? g.U0 - B : g.U1, g.V0 - B), b = awzb_p2(v, dir > 0 ? g.U0 : g.U1 + B, g.V1 + B);
    var mk = awzb_mask(L, a[0], a[1], b[0], b[1], 'JZ Out Shoji', true);
    jzSetExpr(mk.property('ADBE Mask Offset'), E + 'ex');
    jzSetExpr(mk.property('ADBE Mask Opacity'), E + 'p>0?100:0');
    m.parts.op.push(AWZB_FNS + 'f*=wzio(PO/' + TE + ')>=1?0:1;');
    if (!main) return;
    var col = K.own, paper = awzb_paper(sc), lw = Math.max(1.5 * K.u, fs * 0.02), nv = Math.max(2, Math.round(g.T / (fs * 0.5))), cu = fs * 0.78;
    var mk2 = awzb_mask(D, a[0], a[1], b[0], b[1], 'JZ Out Shoji Paper');
    jzSetExpr(mk2.property('ADBE Mask Offset'), E + 'ex');
    jzAnimator(D, 'JZ Out Shoji Tint', [['ADBE Text Fill Color', jzHex(jzMixHex(paper, awzb_dark(sc.bg) ? '#000000' : col, 0.6))]], '100');
    var gb = jzEffect(D, 'ADBE Gaussian Blur 2', 'JZ Out Shoji Soft'); jzEP(gb, 1, fs * 0.08 * K.s0);
    jzSetExpr(jzXf(D, 'ADBE Opacity'), E + 'p>0&&p<1?value*(1-wzsm(0.42,0.8,p))*(1-wzsm(0.74,1,p))*0.75:0');
    var c0 = awzb_p2(v, g.U0, g.V0), c1 = awzb_p2(v, g.U1, g.V1);
    awzb_mask(S, c0[0], c0[1], c1[0], c1[1], 'JZ Out Shoji Frame');
    var G = jzGrp(S, 'screen'), u0 = dir > 0 ? -g.L : 0, u1 = dir > 0 ? 0 : g.L, s1, s2, s3;
    s1 = awzb_sub(G, 'frame');
    awzb_box(s1, v, dir > 0 ? -lw * 1.6 : 0, g.V0, dir > 0 ? 0 : lw * 1.6, g.V1);
    awzb_box(s1, v, u0, g.V0, u1, g.V0 + lw); awzb_box(s1, v, u0, g.V1 - lw, u1, g.V1);
    jzAddFill(s1, col, 85);
    s2 = awzb_sub(G, 'lattice');
    for (j = 1; j < nv; j++) { var vv = g.V0 + g.T * j / nv; awzb_box(s2, v, u0, vv - lw * 0.35, u1, vv + lw * 0.35); }
    for (j = 1; j < 60 && j * cu < g.L; j++) awzb_box(s2, v, -dir * j * cu - lw * 0.35, g.V0, -dir * j * cu + lw * 0.35, g.V1);
    jzAddFill(s2, col, 60);
    s3 = awzb_sub(G, 'paper'); awzb_box(s3, v, u0, g.V0, u1, g.V1); jzAddFill(s3, paper, 97);
    awzb_xf(G, { pe: E + awzb_xy(v, 'eu', '0') });
    jzSetExpr(jzXf(S, 'ADBE Opacity'), E + 'p>0&&p<1?(1-wzsm(0.74,1,p))*100:0');
} });

/* ---- wzSumiNijimi — 墨にじみ: each glyph bleeds into the paper: it swells into an irregular ink blot (with a few specks)
   that thins out to nothing */
jzReg('exit', 'wzSumiNijimi', { apply: function (m) {
    var K = awzb_K(m, true), L = K.L, fs = K.fs, N = jzN, seed = K.seed, n = K.n, R = [], i, j, k;
    for (i = 0; i < Math.max(1, n); i++) R.push(awzb_r(seed, K.single ? K.mi : i, 31));
    awzb_emit(L, 'JZ Out Nijimi', K.H, 'var R=' + awzb_arr(R) + ',q=wzsg(PO,R[i]||0,0.45);if(q>=1)al=0;else if(q>0){al=1-wzsm(0.05,0.5,q);sx=sy=1+0.12*q;}', { a: 1, s: 1 });
    if (!K.solid || K.crowded) return;
    var S = awzb_layer(K, 'JZ Out Nijimi Blots', 'out'), list = awzb_some(K, 40), col = K.own;
    for (j = 0; j < list.length; j++) {
        i = list[j]; var gl = K.g[i], R0 = Math.max(gl.w, fs) * 0.72, G = jzGrp(S, 'blot ' + (i + 1)), pts = [];
        for (k = 0; k < 10; k++) { var an = k / 10 * AWZB_TAU, rr = R0 * (0.76 + 0.34 * awzb_r(seed, i, k, 32)); pts.push([Math.cos(an) * rr, Math.sin(an) * rr]); }
        awzb_blob(G, pts);
        for (k = 0; k < 3; k++) { var a2 = awzb_r(seed, i, k, 34) * AWZB_TAU, d = R0 * (1.05 + 0.5 * awzb_r(seed, i, k, 35)), rd = R0 * (0.07 + 0.09 * awzb_r(seed, i, k, 36)); awzb_ell(G, Math.cos(a2) * d, Math.sin(a2) * d, rd, rd, 0); }
        jzAddFill(G, col);
        var Q = K.H + 'var q=wzsg(PO,' + N(R[i]) + ',0.45);';
        awzb_xf(G, { p: [gl.x, gl.y], se: Q + 'var s=wzlp(0.2,0.72,oc(q))/0.72*100;[s,s]', oe: Q + 'q>0&&q<1?Math.min(1,q*3.2)*Math.pow(1-q,1.3)*90:0' });
    }
} });

/* ---- wzHanaChiru — 花びらに散る: the glyphs thin out (one after another, against the wind) while petals lift off them and
   ride the wind away */
jzReg('exit', 'wzHanaChiru', { apply: function (m) {
    var K = awzb_K(m, true), L = K.L, fs = K.fs, sc = K.sc, N = jzN, seed = K.seed, dir = awzb_dir(K, 41), i, j, k;
    awzb_emit(L, 'JZ Out Hana', K.H, awzb_oEx(K, true) + 'var q=wzsg(PO,' + (dir > 0 ? '1-o' : 'o') + ',0.45);if(q>=1)al=0;else if(q>0){al=1-wzsm(0.05,0.5,q);sx=sy=1-0.25*q;dx=' + N(dir * fs * 0.3) + '*q*q;dy=' + N(-fs * 0.08) + '*q;}',
        { a: 1, s: 1, p: fs * 0.32 });
    if (!K.solid || K.crowded) return;
    var S = awzb_layer(K, 'JZ Out Hana Petals', 'out'), list = awzb_some(K, 60), Kp = Math.round(jzClamp(60 / Math.max(1, list.length), 1, 6));
    var c1 = K.hot, c2 = awzb_isHex(sc.fg) ? jzMixHex(c1, sc.fg, 0.35) : c1;
    for (j = 0; j < list.length; j++) {
        i = list[j]; var gl = K.g[i], o = awzb_o(K, i, true);
        for (k = 0; k < Kp; k++) {
            var r1 = awzb_r(seed, i, k, 42), ph = awzb_r(seed, i, k, 44) * AWZB_TAU, sz = fs * 0.12 * (0.7 + 0.6 * awzb_r(seed, i, k, 48));
            var pre = K.H + 'var q=wzsg(PO,' + N(dir > 0 ? 1 - o : o) + ',0.45),t=cl(q*1.28-' + N(0.28 * awzb_r(seed, i, k, 43)) + ');';
            awzb_piece(S, 'petal ' + (i + 1) + '.' + (k + 1), k % 2 ? c2 : c1, pre,
                'var px=' + N(gl.x + awzb_rs(seed, i, k, 45) * gl.w * 0.3) + '+' + N(dir * (fs * 2 + K.Wc * 0.1) * (0.55 + 0.8 * r1)) + '*Math.pow(t,1.4)+Math.sin(t*7+' + N(ph) + ')*' + N(fs * 0.18) +
                ',py=' + N(gl.y + awzb_rs(seed, i, k, 46) * fs * 0.3) + '-' + N(fs * 0.55 * r1) + '*Math.sin(t*Math.PI*0.9)+' + N(fs * 0.9 * (0.4 + awzb_r(seed, i, k, 47))) + '*t*t' +
                ',ro=' + N(ph) + '+t*' + N(6 * (r1 < 0.5 ? -1 : 1)) + ',fl=0.3+0.7*Math.abs(Math.cos(t*9+' + N(ph) + ')),c=Math.cos(ro),s=Math.sin(ro),z=' + N(sz) +
                ',T=[[0,-1],[0.58,-0.3],[0.4,0.75],[0,0.5],[-0.4,0.75],[-0.58,-0.3]],pts=[],w;for(w=0;w<6;w++)pts.push([px+(T[w][0]*fl*c-T[w][1]*s)*z,py+(T[w][0]*fl*s+T[w][1]*c)*z]);createPath(pts,[],[],true)',
                't>0&&t<1?wzsm(0,0.12,t)*(1-wzsm(0.55,1,t))*100:0');
        }
    }
} });

/* ---- wzKasumi — 霞に隠れる: bands of mist with rounded heads drift in from alternating sides, row by row, until nothing of
   the line is left. The mist bands are the lyric's inverted alpha matte; their outlines (head arc + two tails) ride along. */
jzReg('exit', 'wzKasumi', { apply: function (m) {
    var K = awzb_K(m, true), L = K.L, fs = K.fs, N = jzN, seed = K.cs, mg = fs * 0.3, B = K.big, j;
    var Y0 = K.y0 - mg, Y1 = K.y1 + mg, Rn = Math.round(jzClamp((Y1 - Y0) / (fs * 0.36), 4, 18)), h = (Y1 - Y0) / Rn, r = h / 2, X0 = K.x0 - mg, X1 = K.x1 + mg, BL = (X1 - X0) + B * 2;
    m.parts.op.push('f*=PO>=0.998?0:1;');
    if (K.crowded || awzb_matted(L)) {
        var lwp = jzEffect(L, 'ADBE Linear Wipe', 'JZ Out Kasumi'); jzEP(lwp, 2, 90); jzEP(lwp, 3, 0); jzEX(lwp, 1, K.H + '100*wzio(PO)');
        return;
    }
    var rowE = function (q) {
        var sd = (q + (seed & 1)) % 2 ? 1 : -1;
        return { sd: sd, E: K.H + 'var e=wzio(wzsg(PO,' + N((q * 0.618 + awzb_r(seed, 51)) % 1) + ',0.42)),hx=' + (sd > 0 ? 'wzlp(' + N(X0 - r * 2) + ',' + N(X1 + 1) + ',e)' : 'wzlp(' + N(X1 + r * 2) + ',' + N(X0 - 1) + ',e)') + ';' };
    };
    if (K.main) {
        var S = awzb_layer(K, 'JZ Out Kasumi Lines', 'out'), lc = awzb_quiet(K.sc, K.own), lw = Math.max(2 * K.u, fs * 0.026), tail = fs * 2.6, rr = Math.max(0.5, r - lw / 2), kq = rr * 0.5523;
        for (j = 0; j < Rn; j++) {
            var Rw = rowE(j), sd = Rw.sd, G = jzGrp(S, 'mist line ' + (j + 1));
            awzb_curve(G, [[-sd * tail, -rr], [0, -rr], [sd * rr, 0], [0, rr], [-sd * tail * 0.6, rr]],
                [[0, 0], [0, 0], [0, -kq], [sd * kq, 0], [0, 0]], [[0, 0], [sd * kq, 0], [0, kq], [0, 0], [0, 0]], false);
            jzAddStroke(G, lc, lw);
            awzb_xf(G, { pe: Rw.E + '[hx,' + N(Y0 + (j + 0.5) * h) + ']', oe: Rw.E + 'e>0&&e<1?wzsm(0,0.12,e)*(1-wzsm(0.82,1,e))*100:0' });
        }
    }
    var M = awzb_layer(K, 'JZ Out Kasumi Matte', 'keep');
    for (j = 0; j < Rn; j++) {
        var R2 = rowE(j), s2 = R2.sd, g = jzGrp(M, 'mist ' + (j + 1)), yc = Y0 + (j + 0.5) * h;
        jzAddRect(g, BL, h + 1, r, -s2 * (BL / 2 - r), yc);
        if (j === 0) jzAddRect(g, BL, B + r, 0, -s2 * BL / 2, Y0 + r - (B + r) / 2);
        if (j === Rn - 1) jzAddRect(g, BL, B + r, 0, -s2 * BL / 2, Y1 - r + (B + r) / 2);
        jzAddFill(g, '#FFFFFF');
        awzb_xf(g, { pe: R2.E + '[hx,0]' });
    }
    jzSetExpr(jzXf(M, 'ADBE Opacity'), K.H + 'PO>0?100:0');
    awzb_setMatte(L, M, true);
} });

/* ---- wzFuroshiki — 風呂敷包み: four corners of a wrapping cloth fold in over the line one after another; the tied bundle
   (with its knot) is lifted away, turning and shrinking */
jzReg('exit', 'wzFuroshiki', { apply: function (m) {
    var K = awzb_K(m, true), L = K.L, fs = K.fs, sc = K.sc, N = jzN, dir = awzb_dir(K, 61), k;
    if (!K.main || K.crowded) { m.parts.op.push(AWZB_FNS + 'f*=PO>=0.64?0:1-wzsm(0.25,0.64,PO);'); return; }
    m.parts.op.push('f*=PO>=0.64?0:1;');
    var cloth = awzb_seal(sc, K.own), cloth2 = jzMixHex(cloth, sc.bg, 0.24), seam = jzMixHex(cloth, awzb_shade(sc), 0.35);
    var mg = fs * 0.28, hw = K.w / 2 + mg, hh = K.h / 2 + mg, lw = Math.max(1.5 * K.u, fs * 0.02), e0 = fs * 0.34;
    var E = K.H + 'var wr=cl((PO-0.64)/0.36),s=1-ic(wr);';
    var S = awzb_layer(K, 'JZ Out Furoshiki', 'out');
    jzSetExpr(jzXf(S, 'ADBE Position'), E + '[' + N(K.cx) + ',' + N(K.cy) + '-' + N(fs * 0.7) + '*Math.sin(wr*Math.PI/2)]');
    jzSetExpr(jzXf(S, 'ADBE Rotate Z'), E + N(dir * 0.3 * 180 / Math.PI) + '*wr');
    jzSetExpr(jzXf(S, 'ADBE Scale'), E + '[s*100,s*100]');
    jzSetExpr(jzXf(S, 'ADBE Opacity'), E + 'PO>0&&s>0.003?100:0');
    var kn = jzGrp(S, 'knot'), k1, k2;
    k1 = awzb_sub(kn, 'tie'); jzAddEllipse(k1, e0 * 0.6, e0 * 0.6); jzAddFill(k1, seam);
    k2 = awzb_sub(kn, 'ends'); jzAddPath(k2, [[0, 0], [-e0 * 1.3, -e0], [-e0 * 0.3, -e0 * 0.2]], true); jzAddPath(k2, [[0, 0], [e0 * 1.3, -e0], [e0 * 0.3, -e0 * 0.2]], true); jzAddFill(k2, cloth2);
    awzb_xf(kn, { p: [0, -hh * 0.1], se: E + 'var kk=Math.min(1,wr*4)*100;[kk,kk]', oe: E + 'wr>0?100:0' });
    var flaps = [[[-hw, -hh], [-hw, hh], [-hw, 0]], [[hw, -hh], [hw, hh], [hw, 0]], [[-hw, -hh], [hw, -hh], [0, -hh]], [[-hw, hh], [hw, hh], [0, hh]]];
    for (k = 3; k >= 0; k--) {
        var F = flaps[k], G = jzGrp(S, 'flap ' + (k + 1)), sb = awzb_sub(G, 'fold'), FE = K.H + 'var f=wzio(wzsg(cl(PO/0.64),' + N(k / 3) + ',0.5));';
        jzAddPath(sb, [F[0], [0, 0], F[1]], false);
        awzb_xf(sb, { a: F[2], p: F[2], se: FE + (k < 2 ? '[f*100,100]' : '[100,f*100]') });
        jzAddStroke(G, seam, lw, 80); jzAddFill(G, k % 2 ? cloth2 : cloth);
        awzb_xf(G, { oe: FE + 'f>0.002?100:0' });
    }
} });

/* ---- wzOrizuru — 折り鶴: each glyph folds itself away into a small paper crane that flaps off up and away (at most 16) */
jzReg('exit', 'wzOrizuru', { apply: function (m) {
    var K = awzb_K(m, true), L = K.L, fs = K.fs, N = jzN, dir = awzb_dir(K, 71), i, j, q;
    awzb_emit(L, 'JZ Out Orizuru', K.H, awzb_oEx(K, true) + 'var q=wzsg(PO,o,0.42);if(q>=0.3)al=0;else if(q>0){sx=sy=wzlp(1,0.3,oc(q/0.3));al=1-wzsm(0.1,0.3,q);}', { a: 1, s: 1 });
    if (!K.solid || K.crowded) return;
    var S = awzb_layer(K, 'JZ Out Orizuru Cranes', 'out'), list = awzb_some(K, 16), c1 = K.own, c2 = jzMixHex(c1, K.hot, 0.55), U = fs * 0.56;
    var T = function (pts) { var o = []; for (q = 0; q < pts.length; q++) o.push([pts[q][0] * dir * U, pts[q][1] * U]); return o; };
    for (j = 0; j < list.length; j++) {
        i = list[j]; var gl = K.g[i], G = jzGrp(S, 'crane ' + (i + 1)), s1, s2, s3, r1 = awzb_r(K.seed, i, 72), idx = K.single ? K.mi : i;
        var Q = K.H + 'var q=wzsg(PO,' + N(awzb_o(K, i, true)) + ',0.42),k1=wzsm(0.06,0.3,q),t=cl((q-0.22)/0.78),fp=0.25+0.75*(0.5+0.5*Math.sin(q*40+' + N(idx * 1.7) + '));';
        s1 = awzb_sub(G, 'near wing'); jzAddPath(s1, T([[-0.2, 0.02], [0.14, 0.02], [0.1, -0.56]]), true); jzAddFill(s1, c1);
        awzb_xf(s1, { a: [0, 0.06 * U], p: [0, 0.06 * U], se: Q + '[100,fp*100]' });
        s2 = awzb_sub(G, 'body');
        jzAddPath(s2, T([[-0.34, 0], [0.34, 0], [0, 0.26]]), true); jzAddPath(s2, T([[0.62, -0.4], [0.8, -0.28], [0.58, -0.3]]), true);
        jzAddPath(s2, T([[0.2, 0.02], [0.62, -0.4], [0.3, 0.12]]), true); jzAddPath(s2, T([[-0.2, 0], [-0.72, -0.3], [-0.3, 0.1]]), true);
        jzAddFill(s2, c1);
        s3 = awzb_sub(G, 'far wing'); jzAddPath(s3, T([[-0.12, 0], [0.2, 0], [-0.02, -0.72]]), true); jzAddFill(s3, c2);
        awzb_xf(s3, { se: Q + '[100,fp*100]' });
        awzb_xf(G, { p: [gl.x, gl.y],
            pe: Q + '[' + N(gl.x) + '+' + N(dir * (fs * 0.6 + K.Wc * 0.3) * (0.7 + 0.6 * r1)) + '*Math.pow(t,1.8),' + N(gl.y) + '-' + N(fs * 0.5 + K.Hc * 0.2) + '*Math.pow(t,1.4)+Math.sin(t*10+' + N(idx) + ')*' + N(fs * 0.07) + ']',
            se: Q + 'var s=k1*(1-0.3*t)*100;[s,s]', re: Q + N(-dir * 0.22 * 180 / Math.PI) + '*t', oe: Q + 'q>0.06&&q<1?k1*(1-wzsm(0.7,1,t))*100:0' });
    }
} });

/* ---- wzDoron — 煙玉 (ドロン): a puff of round smoke bursts over the line, the text is gone behind it, and the smoke drifts
   up and thins out. One outline round the whole cloud = a group stroke under the group fill of all puffs. */
jzReg('exit', 'wzDoron', { apply: function (m) {
    var K = awzb_K(m, true), L = K.L, fs = K.fs, sc = K.sc, N = jzN, seed = K.seed, k, c;
    if (!K.solid) { m.parts.op.push(AWZB_FNS + 'f*=PO>=0.2?0:1-wzsm(0,0.2,PO);'); return; }
    var pre = 'var wzd=PO>0&&PO<0.2?1-0.08*iq(PO/0.2):1;';
    m.parts.sc.push(pre + 'f=[f[0]*wzd,f[1]*wzd];');
    var pv = awzb_pivot(K, 'wzd', 'wzd', '0', K.cx, K.cy);
    if (pv) m.parts.pos.push(pre + pv);
    m.parts.op.push('f*=PO>=0.2?0:1;');
    if (K.crowded) return;
    var col = K.own, smoke = jzMixHex(sc.bg, col, 0.2), tall = K.h > K.w, len = Math.max(K.w, K.h), th = Math.min(K.w, K.h);
    var n = Math.round(jzClamp(len / (fs * 0.7) + 2, 4, 14)), lw = Math.max(1.5 * K.u, fs * 0.022), R0 = Math.max(fs * 0.62, th * 0.62);
    var E = K.H + 'var gr=oe(PO/0.3),di=cl((PO-0.3)/0.7);', S = awzb_layer(K, 'JZ Out Doron Smoke', 'out'), P = [];
    for (k = 0; k < n; k++) {
        var rk = R0 * (0.8 + 0.45 * awzb_r(seed, k, 81)), al0 = -fs * 0.15 + (k + 0.5) / n * (len + fs * 0.3), jt = awzb_rs(seed, k, 82) * fs, cr = awzb_rs(seed, k, 83) * th * 0.2, up = fs * 0.7 * (0.4 + awzb_r(seed, k, 84));
        var AL = '(' + N(al0) + '+' + N(jt) + '*(0.15+0.5*di))', UP = N(up) + '*di';
        P.push({ pe: E + (tall ? '[' + N(K.cx + cr) + ',' + N(K.y0) + '+' + AL + '-' + UP + ']' : '[' + N(K.x0) + '+' + AL + ',' + N(K.cy + cr) + '-' + UP + ']'),
            se: E + 'var s=' + N(rk * 2) + '*gr*(1-ic(di));[s,s]' });
    }
    for (c = 0; c < 2; c++) {
        var G = jzGrp(S, c ? 'cloud' : 'curls');
        for (k = 0; k < n; k++) {
            var sb = awzb_sub(G, 'puff ' + (k + 1));
            if (c) jzAddEllipse(sb, 100, 100);
            else { var A = awzb_arc(-5, 2.5, 27.5, 27.5, 200, 320, 0); awzb_curve(sb, A.v, A.i, A.o, false); }
            awzb_xf(sb, P[k]);
        }
        if (c) { jzAddFill(G, smoke); jzAddStroke(G, col, lw * 2); }
        else jzAddStroke(G, col, lw * 0.7, 60);
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), E + 'PO>0?(1-wzsm(0.4,1,di))*100:0');
} });

/* ---- wzToro — 灯籠流し: the glyphs are set afloat one by one: they glow, bob on short ripples and drift off downstream,
   growing small */
jzReg('exit', 'wzToro', { apply: function (m) {
    var K = awzb_K(m, true), L = K.L, fs = K.fs, N = jzN, dir = awzb_dir(K, 91), i, j;
    var DX = dir * (fs * 0.8 + K.Wc * 0.12), IX = K.single ? N(K.mi) : 'i';
    var mv = function (ix) { return 'dx=' + N(DX) + '*Math.pow(q,1.5);dy=' + N(-fs * 0.35) + '*q+Math.sin(q*9+' + ix + ')*' + N(fs * 0.045) + '*Math.min(1,q*4);sx=sy=1-0.5*q;'; };
    awzb_emit(L, 'JZ Out Toro', K.H, awzb_oEx(K, true) + 'var q=wzsg(PO,' + (dir > 0 ? '1-o' : 'o') + ',0.4);if(q>=1)al=0;else if(q>0){' + mv(IX) + 'al=1-wzsm(0.45,1,q);ct=0.7*Math.sin(q*Math.PI);}',
        { a: 1, s: 1, p: Math.abs(DX) + fs * 0.4, c: K.fill ? K.hot : null });
    if (!K.solid || K.crowded) return;
    var S = awzb_layer(K, 'JZ Out Toro Ripples', 'out'), list = awzb_some(K, 30), lc = awzb_quiet(K.sc, K.own), lw = Math.max(1.5 * K.u, fs * 0.018);
    for (j = 0; j < list.length; j++) {
        i = list[j]; var gl = K.g[i], o = awzb_o(K, i, true), G = jzGrp(S, 'ripple ' + (i + 1));
        var Q = K.H + 'var q=wzsg(PO,' + N(dir > 0 ? 1 - o : o) + ',0.4),dx=0,dy=0,sx=1,sy=1;' + mv(K.single ? N(K.mi) : N(i));
        jzAddPath(G, [[-gl.w / 2, 0], [gl.w / 2, 0]], false);
        jzAddPath(G, [[-gl.w * 0.3 - dir * fs * 0.1, fs * 0.08], [gl.w * 0.3 - dir * fs * 0.1, fs * 0.08]], false);
        jzAddStroke(G, lc, lw);
        awzb_xf(G, { p: [gl.x, gl.y + fs * 0.6], pe: Q + '[' + N(gl.x) + '+dx,' + N(gl.y) + '+dy+' + N(fs * 0.6) + '*sx]', se: Q + '[(0.5+0.7*q)*100,100]', oe: Q + 'q>0&&q<1?Math.min(1,q*5)*(1-wzsm(0.5,1,q))*80:0' });
    }
} });
