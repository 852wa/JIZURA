// ================================================================ pack x2horrorA part 1 (AE port of src/11p_x2_horrorA.js, layouts 1-8)
// hzKeyhole, hzEmptyRoom, hzWrongCopy, hzHangSign, hzElevator, hzReflection, hzFogWindow, hzVoicemail
// + the helpers shared with part 2 (ahza_)
//
// How these are built (uneasy scenes drawn with type and simple shapes):
// - a "kit" (ahza_kit) is ONE shape layer in comp space. The browser's drawing calls become shape groups, collected in the
//   browser's paint order and written in reverse (AE draws the first group on top).
// - darkness with a hole (keyhole, lamp cone) = one group with a huge rectangle + the hole path and an even-odd fill
// - soft light / gradients = solids with feathered masks (AE shape fills have no alpha gradients here)
// - anything that moves a whole object (the sign, the torn pieces, the card) is a kit with anchor == position, the lyric is
//   parented to it without a jump, so the cut's enter / hold / exit expressions stay untouched and the text can be retyped
// - small animation (doors opening, lamps failing, counters) = expressions on group transforms, Trim Paths, text sources,
//   written against the cut-local time like the browser's lt; flicker uses a 12 Hz step counter (ST) like env.step
// - everything except the lyric is main-pass only in the browser (ghost: false): those layers are marked jzNoGhost

/* ================================================================ shared helpers (ahza_) */
// the browser's deterministic hash J.h / J.r / J.rs / J.rr (same numbers as the web frame)
function ahza_h(a, b, c, d, e) {
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
function ahza_r(a, b, c, d, e) { return ahza_h(a, b, c, d, e) / 4294967296; }
function ahza_rs(a, b, c, d, e) { return ahza_r(a, b, c, d, e) * 2 - 1; }
function ahza_rr(lo, hi, a, b, c, d, e) { return lo + (hi - lo) * ahza_r(a, b, c, d, e); }
function ahza_noise1(x, seed) { var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return jzLerp(ahza_rs(seed, i), ahza_rs(seed, i + 1), u); }
// colours (same rules as the browser pack)
function ahza_isDark(c) { return jzLum(c) < 0.45; }
function ahza_light(sc) { return jzLum(sc.fg) > jzLum(sc.bg) ? sc.fg : sc.bg; }
function ahza_darkOf(sc) { return jzLum(sc.fg) > jzLum(sc.bg) ? sc.bg : sc.fg; }
function ahza_night(sc) { return jzMixHex(sc.bg, '#000000', ahza_isDark(sc.bg) ? 0.72 : 0.9); }
function ahza_dim(sc, k) { return ahza_isDark(sc.bg) ? jzMixHex(sc.bg, sc.fg, k) : jzMixHex(sc.bg, '#000000', Math.min(1, k * 1.1)); }   // faint line over the background
function ahza_glow(sc) { return ahza_isDark(sc.bg) ? ahza_light(sc) : jzMixHex(sc.bg, '#FFFFFF', 0.85); }                         // light falling on the background
function ahza_onCol(sc, fill) {
    var c = [sc.bg, sc.fg, sc.ink, sc.sub], best = null, bv = 0, i, k;
    for (i = 0; i < c.length; i++) { if (!c[i] || c[i] === fill) continue; k = jzContrast(c[i], fill); if (k > bv) { bv = k; best = c[i]; } }
    return bv >= 3 ? best : (jzLum(fill) > 0.5 ? '#111111' : '#FFFFFF');
}
function ahza_acc(sc, on) { return jzFitContrast(sc.accent, on, 3); }
function ahza_px(ctx) { return jzU(ctx) / 1080; }                  // one browser design px in comp px
function ahza_start(c) { return c && c.start ? c.start : 0; }
function ahza_dist(bb, x, y) { var dx = Math.max(bb.x0 - x, 0, x - bb.x1), dy = Math.max(bb.y0 - y, 0, y - bb.y1); return Math.sqrt(dx * dx + dy * dy); }
function ahza_over(bb, x0, y0, x1, y1, pad) { pad = pad || 0; return !(x1 < bb.x0 - pad || x0 > bb.x1 + pad || y1 < bb.y0 - pad || y0 > bb.y1 + pad); }
function ahza_box(x0, y0, x1, y1) { return { x0: x0, y0: y0, x1: x1, y1: y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }; }
function ahza_q(s) { return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r\n|\r|\n/g, '\\r') + '"'; }
// expression functions added after jzTH / the bg header: ios inOutSine, ioc inOutCubic, rn seeded 0..1 hash, nz smooth value
// noise -1..1 (browser noise1 look-alike), wr wrap, lamp = the browser's failing light (24 Hz clock, mostly on)
var AHZA_F = 'function ios(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}' +
    'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}' +
    'function rn(a,b){return hh(SD*0.0173+a*1.31+b*7.77);}' +
    'function nz(x,s){var i=Math.floor(x),f=x-i,w=f*f*(3-2*f),a=hh(i*1.31+s*0.017)*2-1,b=hh((i+1)*1.31+s*0.017)*2-1;return a+(b-a)*w;}' +
    'function wr(v,m){return ((v%m)+m)%m;}' +
    'function lamp(t,sd,rate){var st=Math.floor(t*24),run=Math.floor(st/4);if(hh(sd*0.013+run*0.731+7)<0.1*rate)return hh(sd*0.013+st*1.37+8)<0.5?0.15:0.55;return 0.88+0.12*hh(sd*0.013+st*0.917+9);}\n';
// content-comp header: jzTH (DUR IN OS OD SD PO K + easings) + the functions above + ST (12 Hz step) and T (song time)
function ahza_TH(ctx) { return jzTH(ctx) + AHZA_F + 'var ST=Math.floor(time*12+0.001),T=time+' + jzN(ahza_start(ctx.cut)) + ';\n'; }
function ahza_ex(prop, ex) { try { prop.expression = ex; } catch (e) { jzWarn('x2horrorA expr: ' + e.toString()); } }
function ahza_parent(L, P) { try { L.setParentWithJump(P); } catch (e) { try { L.parent = P; } catch (e2) { jzWarn('parent: ' + e2.toString()); } } }
function ahza_pivot(L, x, y) { jzXf(L, 'ADBE Anchor Point').setValue([x, y]); jzXf(L, 'ADBE Position').setValue([x, y]); return L; }

/* ---------------------------------------------------------------- text */
function ahza_setSize(L, s, lead, align) {
    s = Math.max(1, s);
    jzTextDoc(L, function (td) { td.fontSize = s; try { td.autoLeading = false; td.leading = s * lead; } catch (e) {} });
    jzAnchor(L, align);
    return L;
}
// a text layer fitted into maxW x maxH (capped at maxSize) with a fixed leading (lead x size)
function ahza_fit(ctx, text, o) {
    var lead = o.lead || 1.2;
    var L = jzText(ctx, text, { font: o.font, size: 100, color: o.color, x: o.x, y: o.y, track: o.track || 0, align: o.align, leading: 100 * lead, name: o.name });
    var r = jzRect(L), k = Math.min((o.maxW || 1e6) / Math.max(1, r.width), (o.maxH || 1e6) / Math.max(1, r.height));
    var s = 100 * k; if (o.maxSize) s = Math.min(s, o.maxSize);
    ahza_setSize(L, s, lead, o.align);
    jzXf(L, 'ADBE Position').setValue([o.x, o.y]);
    return L;
}
function ahza_refit(L, maxW, maxH, maxSize, lead) {
    var r = jzRect(L), cur = jzFontSize(L), s = Math.min(cur * Math.min(maxW / Math.max(1, r.width), maxH / Math.max(1, r.height)), maxSize);
    return ahza_setSize(L, s, lead);
}
function ahza_lines(ctx, raw, perL, perP) { return jzSplitLines(raw, jzPortrait(ctx) ? perP : perL); }
function ahza_font(ctx, role) { return jzP(ctx, 'font', jzFontKeyOf(ctx.st, role || 'serif')); }
// small helper text (label): opacity expression, kept out of the ghosts
function ahza_label(ctx, str, o, opEx) {
    var L = jzText(ctx, str, o);
    if (opEx) jzSetExpr(jzXf(L, 'ADBE Opacity'), opEx);
    return jzNoGhost(L);
}
function ahza_srcEx(L, ex) { try { L.property('ADBE Text Properties').property('ADBE Text Document').expression = ex; } catch (e) { jzWarn('x2horrorA text: ' + e.toString()); } }
// advance of one glyph in em (estimate) and the estimated centres of the glyphs of a text layer (spaces left out)
function ahza_cw(ch) {
    if (ch === ' ') return 0.3;
    var c = ch.charCodeAt(0);
    if (c < 0x2000) { if (/[A-Z]/.test(ch)) return 0.68; if (/[a-z]/.test(ch)) return 0.55; if (/[0-9]/.test(ch)) return 0.6; return 0.4; }
    if (c >= 0xFF61 && c <= 0xFF9F) return 0.5;
    return 1;
}
function ahza_slots(L) {
    var td = L.property('ADBE Text Properties').property('ADBE Text Document').value;
    var text = String(td.text), size = td.fontSize, tr = (td.tracking || 0) / 1000, lead = size * 1.2;
    try { if (!td.autoLeading && td.leading) lead = td.leading; } catch (e0) {}
    var lines = text.split(/\r\n|\r|\n/), nl = lines.length, wl = [], cs = [], i, j, mx = 0;
    for (i = 0; i < nl; i++) {
        var a = jzChars(lines[i]), w = 0, q = [];
        for (j = 0; j < a.length; j++) { var cw = (ahza_cw(a[j]) + tr) * size; q.push(cw); w += cw; }
        cs.push(a); wl.push(q); mx = Math.max(mx, w);
    }
    var r = jzRect(L), an = jzXf(L, 'ADBE Anchor Point').value, p = jzXf(L, 'ADBE Position').value;
    var k = mx > 0 ? r.width / mx : 1, cxL = r.left + r.width / 2, cyL = r.top + r.height / 2, out = [];
    for (i = 0; i < nl; i++) {
        var tot = 0; for (j = 0; j < wl[i].length; j++) tot += wl[i][j] * k;
        var yl = cyL + (i - (nl - 1) / 2) * lead, acc = cxL - tot / 2;
        for (j = 0; j < cs[i].length; j++) {
            var gw = wl[i][j] * k, gx = acc + gw / 2;
            acc += gw;
            if (cs[i][j] !== ' ' && cs[i][j] !== '　') out.push({ x: p[0] + (gx - an[0]), y: p[1] + (yl - an[1]), w: gw, h: size });
        }
    }
    return out;
}

/* ---------------------------------------------------------------- kits: shape groups collected in paint order */
// op: { t: 'p' (path: pts, closed, inT, outT, pathX) | 'r' (rect: cx, cy, w, h, round, sizeX, rposX) | 'e' (ellipse: cx, cy, w, h),
//       more: [further shapes of the same group], rc (round corners), stroke, sw, sop, cap, fill, fop, eo (even-odd), trim, trimS,
//       ganchor, gpos, grot, gscale, gop (values) and posX, rotX, scaleX, opX (expressions on the group transform) }
function ahza_kit(ctx, name) { return { ctx: ctx, name: name, ops: [] }; }
function ahza_op(k, o) { k.ops.push(o); return o; }
function ahza_shape(g, q) {
    var p, sh;
    if (q.t === 'r') {
        p = jzAddRect(g, Math.max(0.01, q.w), Math.max(0.01, q.h), q.round || 0, q.cx || 0, q.cy || 0);
        if (q.sizeX) ahza_ex(p.property('ADBE Vector Rect Size'), q.sizeX);
        if (q.rposX) ahza_ex(p.property('ADBE Vector Rect Position'), q.rposX);
    } else if (q.t === 'e') {
        p = jzAddEllipse(g, Math.max(0.01, q.w), Math.max(0.01, q.h), q.cx || 0, q.cy || 0);
    } else {
        p = jzVecs(g).addProperty('ADBE Vector Shape - Group'); sh = new Shape();
        sh.vertices = q.pts; if (q.inT) { sh.inTangents = q.inT; sh.outTangents = q.outT; } sh.closed = !!q.closed;
        p.property('ADBE Vector Shape').setValue(sh);
        if (q.pathX) ahza_ex(p.property('ADBE Vector Shape'), q.pathX);
    }
}
function ahza_emit(S, o, idx) {
    var g = jzGrp(S, o.name || ('g' + idx)), i, st, fl, gx;
    ahza_shape(g, o);
    if (o.more) for (i = 0; i < o.more.length; i++) ahza_shape(g, o.more[i]);
    if (o.rc) { var rc = jzVecs(g).addProperty('ADBE Vector Filter - RC'); rc.property('ADBE Vector RoundCorner Radius').setValue(o.rc); }
    if (o.stroke) { st = jzAddStroke(g, o.stroke, o.sw || 2, o.sop); if (o.cap) try { st.property('ADBE Vector Stroke Line Cap').setValue(o.cap); } catch (e) {} }
    if (o.fill) { fl = jzAddFill(g, o.fill, o.fop); if (o.eo) try { fl.property('ADBE Vector Fill Rule').setValue(2); } catch (e2) {} }
    if (o.trim || o.trimS) jzAddTrimPaths(g, o.trim, o.trimS);
    gx = jzGX(g);
    if (o.ganchor) gx.property('ADBE Vector Anchor').setValue(o.ganchor);
    if (o.gpos) gx.property('ADBE Vector Position').setValue(o.gpos);
    if (o.grot) gx.property('ADBE Vector Rotation').setValue(o.grot);
    if (o.gscale) gx.property('ADBE Vector Scale').setValue(o.gscale);
    if (o.gop != null) gx.property('ADBE Vector Group Opacity').setValue(o.gop);
    if (o.posX) ahza_ex(gx.property('ADBE Vector Position'), o.posX);
    if (o.rotX) ahza_ex(gx.property('ADBE Vector Rotation'), o.rotX);
    if (o.scaleX) ahza_ex(gx.property('ADBE Vector Scale'), o.scaleX);
    if (o.opX) ahza_ex(gx.property('ADBE Vector Group Opacity'), o.opX);
}
// writes the kit as a shape layer (comp space, main pass only); opEx = layer opacity expression
function ahza_done(k, opEx) {
    var S = jzShapeLayer(k.ctx, k.name, 0, 0), i;
    for (i = k.ops.length - 1; i >= 0; i--) ahza_emit(S, k.ops[i], i);
    if (opEx) jzSetExpr(jzXf(S, 'ADBE Opacity'), opEx);
    return jzNoGhost(S);
}
// bezier ellipse (optionally rotated by rot radians) as a path op
function ahza_ell(cx, cy, rx, ry, rot) {
    var k = 0.5523, c = Math.cos(rot || 0), s = Math.sin(rot || 0);
    function v(x, y) { return [cx + x * c - y * s, cy + x * s + y * c]; }
    function d(x, y) { return [x * c - y * s, x * s + y * c]; }
    return { t: 'p', closed: true, pts: [v(0, -ry), v(rx, 0), v(0, ry), v(-rx, 0)],
        inT: [d(-k * rx, 0), d(0, -k * ry), d(k * rx, 0), d(0, k * ry)], outT: [d(k * rx, 0), d(0, k * ry), d(-k * rx, 0), d(0, -k * ry)] };
}

/* ---------------------------------------------------------------- solids with feathered masks (soft light / gradients) */
function ahza_solid(comp, hex, name, w, h) { return comp.layers.addSolid(jzHex(hex), name, Math.max(4, Math.round(w)), Math.max(4, Math.round(h)), 1, comp.duration); }
function ahza_mask(L, pts, fe, mode, op) {
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = pts; sh.closed = true;
    m.property('ADBE Mask Shape').setValue(sh);
    if (fe) m.property('ADBE Mask Feather').setValue(fe);
    if (op != null) m.property('ADBE Mask Opacity').setValue(op);
    if (mode) try { m.maskMode = mode; } catch (e) {}
    return m;
}
function ahza_ellMask(L, cx, cy, rx, ry, fe, mode, inv) {
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape(), kx = 0.5523 * rx, ky = 0.5523 * ry;
    sh.vertices = [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]];
    sh.inTangents = [[-kx, 0], [0, -ky], [kx, 0], [0, ky]];
    sh.outTangents = [[kx, 0], [0, ky], [-kx, 0], [0, -ky]];
    sh.closed = true;
    m.property('ADBE Mask Shape').setValue(sh);
    if (fe) m.property('ADBE Mask Feather').setValue(fe);
    if (mode) try { m.maskMode = mode; } catch (e) {}
    if (inv) m.inverted = true;
    return m;
}
function ahza_rectPts(x0, y0, x1, y1) { return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; }

/* ================================================================ 1. hzKeyhole — 鍵穴
   the line sits in the round head of a keyhole cut out of the dark; the hole drifts, something walks past inside */
jzReg('layout', 'hzKeyhole', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), sh: rng.range(0.36, 0.6), dir: rng.pick([-1, 1]), dr: rng.range(0.5, 1), pass: rng.chance(0.85) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed | 0, u = jzU(ctx), px = ahza_px(ctx), a;
        var R = Math.min(W * 0.42, H * 0.32), cx = W / 2, cy = H / 2 - R * 0.4;
        var raw = jzFlat(c.text), n = jzCount(raw);
        var text = jzSplitLines(raw, jzHasLatin(raw) ? 8 : (n <= 3 ? 3 : n <= 8 ? 4 : n <= 12 ? 5 : 6));
        var L = ahza_fit(ctx, text, { font: ahza_font(ctx), color: sc.fg, x: cx, y: cy, track: 0.04, lead: 1.15, maxW: R * 1.36, maxH: R * 1.12, maxSize: R * 0.85 });
        var bb = jzBB(L), dk = ahza_night(sc), HD = ahza_TH(ctx), dr = jzP(ctx, 'dr', 0.75);
        jzAnimate(ctx, L, { mi: 0 });
        // something passes on the other side (between the words and the dark)
        if (jzP(ctx, 'pass', true)) {
            var kp = ahza_kit(ctx, 'hz passer'), PE = HD + 'var p=(time-DUR*' + jzN(jzP(ctx, 'sh', 0.45)) + ')/0.9;';
            ahza_op(kp, { t: 'r', cx: cx, cy: cy + R * 0.5, w: R * 1.1, h: R * 3.4, fill: dk, fop: 40 });
            ahza_op(kp, { t: 'r', cx: cx, cy: cy + R * 0.5, w: R * 0.72, h: R * 3.4, fill: dk, fop: 50 });
            var Sp = ahza_done(kp, PE + 'p>0&&p<1?100:0');
            jzSetExpr(jzXf(Sp, 'ADBE Position'), PE + '[value[0]+' + jzN(jzP(ctx, 'dir', 1) * R * 1.7) + '*(cl(p)*2-1),value[1]]');
        }
        // the dark with the keyhole: round head (312 degrees of a circle) on a widening shaft
        var pts = [], pts2 = [];
        for (a = 66; a >= -246; a -= 4) { pts.push([Math.cos(a * Math.PI / 180) * R, Math.sin(a * Math.PI / 180) * R]); }
        pts.push([-R * 0.62, R * 1.86]); pts.push([R * 0.62, R * 1.86]);
        for (a = 0; a < pts.length; a++) pts2.push([pts[a][0] * 1.07, pts[a][1] * 1.07]);
        var BIG = Math.max(W, H) * 80, rim = jzMixHex(dk, ahza_light(sc), 0.42), kk = ahza_kit(ctx, 'hz keyhole');
        ahza_op(kk, { name: 'dark', t: 'r', cx: 0, cy: 0, w: BIG, h: BIG, more: [{ t: 'p', pts: pts, closed: true }], fill: dk, fop: 96.5, eo: true });
        ahza_op(kk, { name: 'rim', t: 'p', pts: pts, closed: true, stroke: rim, sw: Math.max(1.5 * px, u * 0.004), sop: 80 });
        ahza_op(kk, { name: 'rim outer', t: 'p', pts: pts2, closed: true, stroke: rim, sw: Math.max(px, u * 0.002), sop: 30 });
        var S = ahza_done(kk, null);
        jzXf(S, 'ADBE Position').setValue([cx, cy]);
        jzSetExpr(jzXf(S, 'ADBE Position'), HD + '[value[0]+nz(time*0.45,' + ((s + 1) % 997) + ')*' + jzN(R * 0.07 * dr) + ',value[1]+nz(time*0.4,' + ((s + 2) % 997) + ')*' + jzN(R * 0.05 * dr) + ']');
        jzSetExpr(jzXf(S, 'ADBE Scale'), HD + 'var k=Math.max(0.02,oc(time/0.55)*(1-ie(PO)))*100;[k,k]');
        return bb;
    }
});

/* ================================================================ 2. hzEmptyRoom — 広すぎる部屋
   a small line pressed against one wall, the rest is an empty room in faint lines with a door at the far end */
jzReg('layout', 'hzEmptyRoom', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif', 'body'])), side: rng.pick([-1, 1]), vy: rng.range(-1, 1), door: rng.chance(0.85), open: rng.range(0.3, 0.6) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), px = ahza_px(ctx), port = jzPortrait(ctx), side = jzP(ctx, 'side', 1), i;
        var bx = W * (0.5 - side * (port ? 0.14 : 0.17)), by = H * 0.47, bw = W * (port ? 0.13 : 0.12), bh = H * (port ? 0.075 : 0.14);
        var edge = side > 0 ? W * 0.94 : W * 0.06, tw = W * (W > H * 1.3 ? 0.32 : 0.42);
        // the clear band on the side wall at the inner end of the text
        var xin = edge - side * tw, wallX = bx + side * bw, cornerX = side > 0 ? W : 0;
        var f = jzClamp((cornerX - xin) / (cornerX - wallX), 0, 1), yTop = (by - bh) * f, yBot = H - (H - (by + bh)) * f;
        var L = ahza_fit(ctx, ahza_lines(ctx, jzFlat(c.text), 6, 4), { font: ahza_font(ctx), color: sc.fg, x: edge, y: by, track: 0.05, lead: 1.2, maxW: tw, maxH: Math.min(H * 0.24, (yBot - yTop) * 0.8), maxSize: H * 0.15 });
        var m = jzSize(L), slack = Math.max(0, (yBot - yTop) * 0.9 - m[1]) / 2, ty = (yTop + yBot) / 2 + jzP(ctx, 'vy', 0) * slack * 0.6;
        jzXf(L, 'ADBE Position').setValue([edge - side * m[0] / 2, ty]);
        var col = ahza_dim(sc, 0.24), lw = Math.max(1.2 * px, u * 0.0022), HD = ahza_TH(ctx), k = ahza_kit(ctx, 'hz room');
        var back = [[bx - bw, by - bh], [bx + bw, by - bh], [bx + bw, by + bh], [bx - bw, by + bh]], cor = [[0, 0], [W, 0], [W, H], [0, H]], corners = [];
        ahza_op(k, { name: 'far wall', t: 'p', pts: back.concat([back[0]]), stroke: col, sw: lw, trim: HD + '100*ioc(time/1)' });
        for (i = 1; i < 4; i++) corners.push({ t: 'p', pts: [back[i], cor[i]] });
        ahza_op(k, { name: 'edges', t: 'p', pts: [back[0], cor[0]], more: corners, stroke: col, sw: lw, sop: 85, trim: HD + '100*cl(ioc(time/1)*1.3-0.3)' });
        if (jzP(ctx, 'door', true)) {
            // a door in the far wall, away from the words; it opens a little while nobody watches
            var dw = bw * 0.36, dh = bh * 1.3, dx = bx - side * bw * 0.4 - dw / 2, dy = by + bh - dh, yb = by + bh, yb2 = yb + (H - by - bh) * 0.3, Lc = ahza_glow(sc);
            var OP = 'var op=0.1+0.5*ios((time-' + jzN(c.dur * jzP(ctx, 'open', 0.45)) + ')/1.6),lv=lamp(T,SD,0.8)*ioc(time/1);';
            ahza_op(k, { name: 'door', t: 'p', pts: [[dx, yb], [dx, dy], [dx + dw, dy], [dx + dw, yb]], stroke: col, sw: lw, opX: HD + '100*ioc(time/1)' });
            ahza_op(k, { name: 'door light', t: 'r', cx: side > 0 ? dw / 2 : -dw / 2, cy: 0, w: dw, h: dh - lw, fill: Lc, gpos: [side > 0 ? dx : dx + dw, dy + lw + (dh - lw) / 2],
                scaleX: HD + OP + '[op*100,100]', opX: HD + OP + '80*lv' });
            ahza_op(k, { name: 'door spill', t: 'p', pts: [[dx, yb], [dx + dw * 0.35, yb], [dx + dw * 0.7 + side * bw * 0.5, yb2], [dx + side * bw * 0.5 - dw * 0.35, yb2]], closed: true, fill: Lc,
                pathX: HD + OP + 'var w=' + jzN(dw) + '*op,x=' + (side > 0 ? jzN(dx) : jzN(dx + dw) + '-w') + ',q=' + jzN(side * bw * 0.5) + ';createPath([[x,' + jzN(yb) + '],[x+w,' + jzN(yb) + '],[x+w+q+w,' + jzN(yb2) + '],[x+q-w,' + jzN(yb2) + ']],[],[],true)',
                opX: HD + OP + '7*lv' });
        }
        ahza_done(k, HD + '100*K');
        L.moveToBeginning();
        jzAnimate(ctx, L, { mi: 0 });
        return jzBB(L);
    }
});

/* ================================================================ 3. hzWrongCopy — 一行だけ違う
   the same line again and again, and one copy is wrong (mirrored / upside down / reversed / one glyph missing) */
jzReg('layout', 'hzWrongCopy', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), k: rng.int(3, 5), wr: rng.next(), kind: rng.pick(['mirror', 'reverse', 'drop', 'flip']), acc: rng.chance(0.55), gi: rng.next() };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = jzPortrait(ctx), font = ahza_font(ctx, 'display'), r, i;
        var raw = jzFlat(c.text), n = jzCount(raw), unit = jzSplitLines(raw, port ? 6 : 14), lines = unit.split('\r'), Ln = lines.length;
        var K = Math.max(2, Math.min(jzP(ctx, 'k', 4) + (port && Ln === 1 ? 1 : 0), Ln === 1 ? 6 : Ln === 2 ? 3 : 2));
        var L0 = ahza_fit(ctx, unit, { font: font, color: sc.fg, x: W / 2, y: H / 2, track: 0.05, lead: 1.1, maxW: W * 0.84, maxH: (H * 0.84 / K) * 0.8, maxSize: H * 0.24 });
        var size = jzFontSize(L0), m = jzSize(L0), rowH = Math.min(H * 0.84 / K, m[1] + size * 0.42), y0 = H / 2 - rowH * (K - 1) / 2;
        var wr = 1 + Math.min(K - 2, Math.floor(jzP(ctx, 'wr', 0.5) * (K - 1))), kind = jzP(ctx, 'kind', 'mirror');
        if (n < 2 && (kind === 'reverse' || kind === 'drop')) kind = 'mirror';
        var wrong = unit;
        if (kind === 'reverse') { var rl = []; for (i = 0; i < Ln; i++) rl.push(jzChars(lines[i]).reverse().join('')); wrong = rl.join('\r'); }
        else if (kind === 'drop') {
            var a = jzChars(unit), idx = [];
            for (i = 0; i < a.length; i++) if (a[i] !== '\r' && a[i] !== ' ') idx.push(i);
            if (idx.length) { var gi = idx[Math.min(idx.length - 1, Math.floor(jzP(ctx, 'gi', 0.5) * idx.length))]; a[gi] = jzHasLatin(a[gi]) ? '_' : '　'; wrong = a.join(''); }
        }
        var HD = ahza_TH(ctx), OK = 'var ok=rn(Math.floor(time*6),5)<0.06;', bb = null;
        for (r = 0; r < K; r++) {
            var y = y0 + r * rowH, isW = r === wr, L;
            if (r === 0) { L = L0; jzXf(L, 'ADBE Position').setValue([W / 2, y]); }
            else L = jzText(ctx, isW ? wrong : unit, { font: font, size: size, color: isW && jzP(ctx, 'acc', false) ? ahza_acc(sc, sc.bg) : sc.fg, x: W / 2, y: y, track: 0.05, leading: size * 1.1 });
            bb = jzUnion(bb, jzBB(L));
            if (isW) {
                // the wrong copy hangs on a pivot: mirrored / turned there, twitching sideways, and now and then it looks right for a frame
                var Pv = jzNoGhost(ahza_pivot(jzShapeLayer(ctx, 'hz wrong pivot', 0, 0), W / 2, y));
                ahza_parent(L, Pv);
                if (kind === 'mirror') jzSetExpr(jzXf(Pv, 'ADBE Scale'), HD + OK + 'ok?[100,100]:[-100,100]');
                else if (kind === 'flip') jzSetExpr(jzXf(Pv, 'ADBE Rotate Z'), HD + OK + 'ok?0:180');
                else ahza_srcEx(L, HD + OK + 'ok?' + ahza_q(unit) + ':value');
                jzSetExpr(jzXf(Pv, 'ADBE Position'), HD + 'var q=Math.floor(time*3);[value[0]+(rn(q,8)<0.22?(rn(q,7)*2-1)*' + jzN(size * 0.05) + ':0),value[1]]');
            }
            jzAnimate(ctx, L, { mi: r });
        }
        return bb;
    }
});

/* ================================================================ 4. hzHangSign — 傾いた吊り看板
   a sign hanging from the ceiling: one of its wires has snapped, it hangs crooked and creaks */
jzReg('layout', 'hzHangSign', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), v: rng.pick(['snap', 'snap', 'two']), side: rng.pick([-1, 1]), amp: rng.range(0.7, 1.2), tilt: rng.range(5, 8.5), ph: rng.range(0, 6) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), px = ahza_px(ctx), side = jzP(ctx, 'side', 1), snap = jzP(ctx, 'v', 'snap') === 'snap';
        var plate = sc.ink || sc.fg, tc = ahza_onCol(sc, plate), C0x = W / 2, C0y = H * 0.55;
        var L = ahza_fit(ctx, ahza_lines(ctx, jzFlat(c.text), 9, 5), { font: ahza_font(ctx, 'display'), color: tc, x: C0x, y: C0y, track: 0.06, lead: 1.15, maxW: W * 0.6, maxH: H * 0.3, maxSize: H * 0.2 });
        var size = jzFontSize(L), m = jzSize(L);
        if (m[0] + size * 1.3 > W * 0.74) { ahza_setSize(L, size * W * 0.74 / (m[0] + size * 1.3), 1.15); size = jzFontSize(L); m = jzSize(L); }
        var pw = m[0] + size * 1.3, ph = m[1] + size * 0.9, a1x = side * pw * 0.32, ay = -ph / 2, Lw = C0y - ph / 2 + 12 * px, A1 = [C0x + a1x, -12 * px], A2 = [C0x - a1x, -12 * px];
        var amp = jzP(ctx, 'amp', 1), tilt = jzP(ctx, 'tilt', 6.5), PH = jzP(ctx, 'ph', 1), HD = ahza_TH(ctx);
        // the browser's pendulum: cx, cy = plate centre, th = its angle (radians)
        var DYN = HD + 'var dmp=0.45+0.55*Math.exp(-Math.max(0,time)*0.5),phi=' + jzN(amp * (snap ? 2.4 : 3.2)) + '*dmp*Math.sin(time*1.5+' + jzN(PH) + ')*Math.PI/180;' +
            'var drop=' + jzN(-H * 0.95) + '*(1-oc(time/0.55))+' + jzN(H * 1.15) + '*ic(PO),th,cx,cy,AX=' + jzN(a1x) + ',AY=' + jzN(ay) + ',LW=' + jzN(Lw) + ';' +
            (snap ? 'th=(' + jzN(-side * tilt) + '+phi*180/Math.PI*1.6+Math.sin(time*2.3+' + jzN(PH) + ')*0.7*dmp)*Math.PI/180+' + jzN(side * 0.5) + '*ic(PO);' +
                    'var qx=' + jzN(A1[0]) + '+Math.sin(phi)*LW,qy=' + jzN(A1[1]) + '+Math.cos(phi)*LW;cx=qx-(Math.cos(th)*AX-Math.sin(th)*AY);cy=qy-(Math.sin(th)*AX+Math.cos(th)*AY);'
                  : 'th=0;cx=' + jzN(C0x) + '+Math.sin(phi)*LW;cy=' + jzN(C0y) + '+(Math.cos(phi)-1)*LW;') + 'cy+=drop;\n';
        var wc = ahza_dim(sc, 0.5), lw = Math.max(1.2 * px, u * 0.0028), kw = ahza_kit(ctx, 'hz wires');
        function wp(sgn) { return '[cx+Math.cos(th)*(' + sgn + 'AX)-Math.sin(th)*AY,cy+Math.sin(th)*(' + sgn + 'AX)+Math.cos(th)*AY]'; }
        ahza_op(kw, { name: 'wire', t: 'p', pts: [A1, [C0x + a1x, C0y - ph / 2]], stroke: wc, sw: lw, pathX: DYN + 'createPath([' + '[' + jzN(A1[0]) + ',' + jzN(A1[1]) + '],' + wp('') + '],[],[],false)' });
        if (snap) {
            // the snapped wire: a stub swinging from the ceiling
            var sl = Math.min(H * 0.13, Lw * 0.3);
            ahza_op(kw, { name: 'stub', t: 'p', pts: [[0, 0], [0, sl]], stroke: wc, sw: lw, gpos: A2, rotX: HD + '-Math.sin(time*2.6+1)*9', opX: HD + '100*cl(time/0.3)' });
        } else ahza_op(kw, { name: 'wire 2', t: 'p', pts: [A2, [C0x - a1x, C0y - ph / 2]], stroke: wc, sw: lw, pathX: DYN + 'createPath([' + '[' + jzN(A2[0]) + ',' + jzN(A2[1]) + '],' + wp('-') + '],[],[],false)' });
        ahza_done(kw, HD + '100*K');
        // the plate (drawn around its rest centre; the layer swings about that point)
        var ks = ahza_kit(ctx, 'hz sign');
        ahza_op(ks, { name: 'shadow', t: 'r', cx: C0x + size * 0.06, cy: C0y + size * 0.08, w: pw, h: ph, fill: '#000000', fop: 25 });
        ahza_op(ks, { name: 'plate', t: 'r', cx: C0x, cy: C0y, w: pw, h: ph, fill: plate });
        ahza_op(ks, { name: 'border', t: 'r', cx: C0x, cy: C0y, w: pw - size * 0.28, h: ph - size * 0.28, stroke: tc, sw: Math.max(1.5 * px, size * 0.025), sop: 45 });
        ahza_op(ks, { name: 'eyelets', t: 'e', cx: C0x + a1x, cy: C0y + ay + size * 0.07, w: size * 0.07, h: size * 0.07, more: [{ t: 'e', cx: C0x - a1x, cy: C0y + ay + size * 0.07, w: size * 0.07, h: size * 0.07 }], fill: tc, fop: 70 });
        if (snap) ahza_op(ks, { name: 'loose end', t: 'p', pts: [[C0x - a1x, C0y + ay], [C0x - a1x - side * size * 0.12, C0y + ay + size * 0.5]], stroke: wc, sw: lw });
        var S = ahza_pivot(ahza_done(ks, HD + '100*K'), C0x, C0y);
        L.moveToBeginning();
        ahza_parent(L, S);
        jzSetExpr(jzXf(S, 'ADBE Position'), DYN + '[cx,cy]');
        jzSetExpr(jzXf(S, 'ADBE Rotate Z'), DYN + 'th*180/Math.PI');
        jzAnimate(ctx, L, { mi: 0 });
        // where the plate hangs at rest
        var th0 = snap ? -side * tilt * Math.PI / 180 : 0, rx = snap ? C0x + a1x - (Math.cos(th0) * a1x - Math.sin(th0) * ay) : C0x, ry = snap ? C0y - ph / 2 - (Math.sin(th0) * a1x + Math.cos(th0) * ay) : C0y;
        return ahza_box(rx - m[0] / 2, ry - m[1] / 2, rx + m[0] / 2, ry + m[1] / 2);
    }
});

/* ================================================================ 5. hzElevator — 存在しない階
   the floor indicator: the light travels along the floors and stops where there is no floor; then the doors part */
jzReg('layout', 'hzElevator', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), v: rng.pick(['gap', 'beyond', 'below']), n0: rng.int(5, 7), stop: rng.range(0.4, 0.55) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), px = ahza_px(ctx), port = jzPortrait(ctx), mono = jzMonoF(ctx), i;
        var v = jzP(ctx, 'v', 'gap'), n0 = jzP(ctx, 'n0', 6), labels = [], from, to;
        if (v === 'gap') { var g = n0 - 2; for (i = 1; i <= n0; i++) { if (labels.length === g) labels.push(''); labels.push(String(i)); } from = 0; to = g; }
        else if (v === 'beyond') { for (i = 1; i <= n0; i++) labels.push(String(i)); labels.push(''); from = Math.max(0, n0 - 4); to = n0; }
        else { labels.push(''); labels.push('B1'); for (i = 1; i < n0; i++) labels.push(String(i)); from = Math.min(labels.length - 1, 4); to = 0; }
        var N = labels.length, Ts = Math.max(0.5, c.dur * jzP(ctx, 'stop', 0.47));
        var pitch = Math.min(W * 0.84 / N, u * 0.115), r = pitch * 0.34, ry = H * (port ? 0.2 : 0.17), x0 = W / 2 - pitch * (N - 1) / 2;
        var L = ahza_fit(ctx, ahza_lines(ctx, jzFlat(c.text), 10, 5), { font: ahza_font(ctx, 'display'), color: sc.fg, x: W / 2, y: H * 0.58, track: 0.05, lead: 1.18, maxW: W * 0.76, maxH: H * 0.4, maxSize: H * 0.22 });
        var size = jzFontSize(L), m = jzSize(L), bb = jzBB(L);
        var col = ahza_dim(sc, 0.38), lw = Math.max(1.2 * px, u * 0.0024), Lc = ahza_light(sc), acc = ahza_acc(sc, sc.bg), HD = ahza_TH(ctx);
        var HC = HD + 'var TS=' + jzN(Ts) + ',cur=Math.round(' + from + '+' + jzN(to - from) + '*ios(time/TS)),arr=time>=TS;\n';
        var k = ahza_kit(ctx, 'hz lift');
        // the doors: one seam that parts once the car has stopped (broken around the words while it is still narrow)
        var yA = ry + pitch * 0.9, yB = H * 0.95, tY0 = Math.max(yA + 1, H * 0.58 - m[1] / 2 - size * 0.25), tY1 = Math.min(yB - 1, H * 0.58 + m[1] / 2 + size * 0.25);
        var GAP = 'var gap=' + jzN(m[0] + size * 1.1) + '*ioc((time-TS-0.15)/0.8)*K;', sgs = [-1, 1];
        for (i = 0; i < 2; i++) {
            ahza_op(k, { name: 'seam ' + i, t: 'p', pts: [[W / 2, yA], [W / 2, tY0]], more: [{ t: 'p', pts: [[W / 2, tY1], [W / 2, yB]] }], stroke: col, sw: lw, sop: 80,
                posX: HC + GAP + '[' + sgs[i] + '*gap/2,0]', trim: HD + '100*oc(time/0.5)' });
            ahza_op(k, { name: 'seam mid ' + i, t: 'p', pts: [[W / 2, tY0], [W / 2, tY1]], stroke: col, sw: lw, sop: 80,
                posX: HC + GAP + '[' + sgs[i] + '*gap/2,0]', opX: HC + GAP + 'gap>' + jzN(m[0] + size * 0.4) + '?100:0' });
        }
        ahza_op(k, { name: 'rail', t: 'p', pts: [[x0 - pitch * 0.7, ry + pitch * 0.62], [x0 + pitch * (N - 0.3), ry + pitch * 0.62]], stroke: col, sw: lw, trim: HD + '100*oc(time/0.5)' });
        var lo = Math.min(from, to), hi = Math.max(from, to), labs = [];
        for (i = 0; i < N; i++) {
            var x = x0 + i * pitch, inR = i >= lo && i <= hi, IN0 = '100*oc((time-' + jzN(i * 0.04) + ')/0.3)';
            if (labels[i]) {
                if (inR) ahza_op(k, { name: 'lit ' + labels[i], t: 'e', cx: x, cy: ry, w: r * 2, h: r * 2, fill: Lc, opX: HC + 'cur==' + i + '?100:0' });
                ahza_op(k, { name: 'floor ' + labels[i], t: 'e', cx: x, cy: ry, w: r * 2, h: r * 2, stroke: col, sw: lw, opX: HD + IN0 });
                labs.push([i, x, inR]);
            } else if (inR) {
                // the slot that is not on the panel
                ahza_op(k, { name: 'no floor', t: 'e', cx: x, cy: ry, w: r * 2, h: r * 2, fill: acc, opX: HC + 'cur==' + i + '?(arr&&rn(ST,3)<0.14?30:100):0' });
                ahza_op(k, { name: 'no floor ring', t: 'e', cx: x, cy: ry, w: r * 3, h: r * 3, stroke: acc, sw: lw, opX: HC + 'cur==' + i + '?35*(0.5+0.5*Math.sin(time*5)):0' });
            }
        }
        // direction arrow: blinks while travelling, dead once stopped
        var up = to > from, ax = x0 + pitch * (N - 0.05), ar = r * 0.7;
        var tri = up ? [[ax, ry - ar], [ax + ar, ry + ar * 0.7], [ax - ar, ry + ar * 0.7]] : [[ax, ry + ar], [ax + ar, ry - ar * 0.7], [ax - ar, ry - ar * 0.7]];
        ahza_op(k, { name: 'arrow', t: 'p', pts: tri, closed: true, fill: Lc, opX: HC + 'arr?0:100*oc(time/0.5)*(ST%8<5?1:0.2)' });
        ahza_op(k, { name: 'arrow dead', t: 'p', pts: tri, closed: true, fill: col, opX: HC + 'arr?25:0' });
        ahza_done(k, HD + '100*K');
        for (i = 0; i < labs.length; i++) {
            var li = labs[i][0], Lb = ahza_label(ctx, labels[li], { font: mono, size: r * (labels[li].length > 1 ? 0.8 : 1), color: col, x: labs[i][1], y: ry, name: 'hz floor ' + labels[li] },
                HD + '100*oc((time-' + jzN(li * 0.04) + ')/0.3)*K');
            if (labs[i][2]) jzAnimator(Lb, 'hz Lit', [['ADBE Text Fill Color', jzHex(ahza_darkOf(sc))]], HC + 'cur==' + li + '?100:0');
        }
        L.moveToBeginning();
        jzAnimate(ctx, L, { mi: 0 });
        return bb;
    }
});

/* ================================================================ 6. hzReflection — 遅れる水鏡
   the line over dark water: its reflection arrives late, ripples, and once moves by itself */
jzReg('layout', 'hzReflection', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), lag: rng.range(0.4, 0.8), rip: rng.range(0.7, 1.3), odd: rng.chance(0.7), at: rng.range(0.45, 0.7), dir: rng.pick([-1, 1]) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed | 0, u = jzU(ctx), px = ahza_px(ctx), font = ahza_font(ctx), i;
        var text = ahza_lines(ctx, jzFlat(c.text), 10, 5), y0 = H * 0.52;
        var L = ahza_fit(ctx, text, { font: font, color: sc.fg, x: W / 2, y: y0, track: 0.06, lead: 1.12, maxW: W * 0.82, maxH: H * 0.3, maxSize: H * 0.2 });
        var size = jzFontSize(L), m = jzSize(L), gapY = size * 0.1, HD = ahza_TH(ctx);
        jzXf(L, 'ADBE Position').setValue([W / 2, y0 - m[1] / 2 - gapY]);
        var bb = jzBB(L);
        // the water: darker towards the bottom edge
        var Wt = ahza_solid(ctx.comp, ahza_night(sc), 'hz water', W, H);
        ahza_mask(Wt, ahza_rectPts(-W, y0, W * 2, H * 2), null, null, 26);
        ahza_mask(Wt, ahza_rectPts(-W, y0 + (H - y0) * 0.55, W * 2, H * 2), [0, (H - y0) * 0.9]);
        jzSetExpr(jzXf(Wt, 'ADBE Opacity'), HD + '70*oc(time/0.6)*K');
        jzNoGhost(Wt);
        var col = ahza_dim(sc, 0.35), lw = Math.max(px, u * 0.002), k = ahza_kit(ctx, 'hz water lines');
        ahza_op(k, { name: 'surface', t: 'p', pts: [[0, y0], [W, y0]], stroke: col, sw: lw, sop: 70, ganchor: [W / 2, y0], gpos: [W / 2, y0], scaleX: HD + '[100*oc(time/0.6),100]' });
        for (i = 0; i < 5; i++) {
            var yy = y0 + (H - y0) * (0.2 + 0.16 * i), ww = W * ahza_rr(0.05, 0.16, s, i, 1);
            ahza_op(k, { name: 'ripple ' + i, t: 'p', pts: [[-ww / 2, 0], [ww / 2, 0]], stroke: col, sw: lw, sop: 35, gpos: [W * ahza_r(s, i, 2), yy],
                posX: HD + '[wr(' + jzN(W * ahza_r(s, i, 2)) + '+time*' + jzN(W * 0.012 * (i % 2 ? 1 : -1)) + ',' + jzN(W) + '),' + jzN(yy) + ']' });
        }
        ahza_done(k, HD + '100*oc(time/0.6)*K');
        L.moveToBeginning();
        jzAnimate(ctx, L, { mi: 0 });
        // the reflection: a flipped, squashed copy that is typed in late, wobbles in bands and fades with depth
        var kq = 0.82, rh = m[1] * kq, top = y0 + gapY * 0.8, lag = jzP(ctx, 'lag', 0.6), t0 = (c.inDur || 0.3) * 0.5 + lag;
        var Rf = jzText(ctx, text, { font: font, size: size, color: jzMixHex(sc.fg, sc.bg, 0.15), x: W / 2, y: top + rh / 2, track: 0.06, leading: size * 1.12, sy: -kq, name: 'hz reflection' });
        jzAnimator(Rf, 'hz Late', [['ADBE Text Opacity', 0]], HD + 'var a=cl((time-' + jzN(t0) + '-(textIndex-1)/Math.max(1,textTotal)*' + jzN(lag * 1.6) + ')/0.55);(1-a)*100');
        var ww2 = jzEffect(Rf, 'ADBE Wave Warp', 'hz Ripple');
        jzEP(ww2, 1, 1); jzEP(ww2, 2, size * 0.04); jzEP(ww2, 3, Math.max(8, m[1] * 0.82)); jzEP(ww2, 4, 0); jzEP(ww2, 5, 0.27 * jzP(ctx, 'rip', 1)); jzEP(ww2, 6, 1);
        var lwp = jzEffect(Rf, 'ADBE Linear Wipe', 'hz Depth');
        jzEP(lwp, 1, 22); jzEP(lwp, 2, 180); jzEP(lwp, 3, Math.max(4, m[1] * 0.9));
        jzSetExpr(jzXf(Rf, 'ADBE Opacity'), HD + '42*K*(1-cl(PO*2.2))');
        // the moment the reflection moves and the words do not
        if (jzP(ctx, 'odd', true)) jzSetExpr(jzXf(Rf, 'ADBE Position'), HD + 'var q=(time-DUR*' + jzN(jzP(ctx, 'at', 0.55)) + ')/0.9,d=0;if(q>0&&q<1)d=' + jzN(jzP(ctx, 'dir', 1) * size * 0.42) + '*Math.sin(Math.PI*q)*(rn(Math.floor(time*6),9)<0.8?1:0.6);[value[0]+d,value[1]]');
        jzNoGhost(Rf);
        return bb;
    }
});

/* ================================================================ 7. hzFogWindow — 曇り窓の指文字
   a fogged window: the line is wiped into the condensation with a finger and starts to run */
jzReg('layout', 'hzFogWindow', {
    plan: function (rng, cut, st) {
        return { font: rng.chance(0.7) ? 'klee' : rng.pick(jzFontsOf(st, ['body', 'serif'])), bar: rng.range(0.22, 0.3), drip: rng.range(0.45, 0.9), tilt: rng.range(-2.5, 2.5) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed | 0, u = jzU(ctx), px = ahza_px(ctx), i;
        var mg = u * 0.07, fx0 = mg, fx1 = W - mg, fy0 = mg, fy1 = H - mg, barY = fy0 + (fy1 - fy0) * jzP(ctx, 'bar', 0.26), barH = u * 0.022;
        var dk = ahza_darkOf(sc), fogC = jzMixHex(dk, ahza_light(sc), 0.46), inkC = jzMixHex(dk, '#000000', 0.6), wallC = jzMixHex(dk, '#000000', 0.4);
        var HD = ahza_TH(ctx), INA = HD + '100*oc(time/0.3)', tilt = jzP(ctx, 'tilt', 0);
        var k1 = ahza_kit(ctx, 'hz window');
        ahza_op(k1, { name: 'wall', t: 'r', cx: W / 2, cy: H / 2, w: W + 4, h: H + 4, fill: wallC });
        ahza_op(k1, { name: 'fogged glass', t: 'r', cx: W / 2, cy: H / 2, w: fx1 - fx0, h: fy1 - fy0, fill: fogC });
        ahza_done(k1, INA);
        // the fog is thinner towards the frame
        var Sh = ahza_solid(ctx.comp, inkC, 'hz thin fog', W, H);
        ahza_mask(Sh, ahza_rectPts(fx0, fy0, fx1, fy1));
        ahza_mask(Sh, ahza_rectPts(fx0 + u * 0.08, fy0 + u * 0.08, fx1 - u * 0.08, fy1 - u * 0.08), [u * 0.16, u * 0.16], MaskMode.SUBTRACT);
        jzSetExpr(jzXf(Sh, 'ADBE Opacity'), HD + '40*oc(time/0.3)');
        jzNoGhost(Sh);
        var k2 = ahza_kit(ctx, 'hz sash');
        ahza_op(k2, { name: 'bar', t: 'r', cx: W / 2, cy: barY, w: fx1 - fx0, h: barH, fill: wallC });
        ahza_op(k2, { name: 'frame', t: 'r', cx: W / 2, cy: H / 2, w: fx1 - fx0, h: fy1 - fy0, round: 2 * px, stroke: jzMixHex(wallC, ahza_light(sc), 0.18), sw: Math.max(2 * px, u * 0.006) });
        ahza_done(k2, INA);
        var ah = fy1 - barY - barH, tx = W / 2, ty = barY + barH / 2 + ah * 0.44;
        var L = ahza_fit(ctx, ahza_lines(ctx, jzFlat(c.text), 9, 5), { font: jzP(ctx, 'font', 'klee'), color: inkC, x: tx, y: ty, track: 0.05, lead: 1.2, maxW: (fx1 - fx0) * 0.8, maxH: ah * 0.56, maxSize: H * 0.2 });
        var size = jzFontSize(L), bb = jzBB(L), sl = ahza_slots(L);
        if (tilt) jzXf(L, 'ADBE Rotate Z').setValue(tilt);
        jzAnimate(ctx, L, { mi: 0 });
        // water runs down from the strokes
        var kd = ahza_kit(ctx, 'hz drips'), lim = fy1 - u * 0.02, lw = Math.max(1.5 * px, size * 0.035), IN = (c.inDur || 0.3) * 0.7, ca = Math.cos(tilt * Math.PI / 180), sa = Math.sin(tilt * Math.PI / 180), any = false;
        for (i = 0; i < sl.length && i < 24; i++) {
            if (ahza_r(s, i, 11) > jzP(ctx, 'drip', 0.7)) continue;
            var gx = sl[i].x - tx, gy = sl[i].y - ty, g = { x: tx + gx * ca - gy * sa, y: ty + gx * sa + gy * ca, w: sl[i].w, h: sl[i].h };
            var x = g.x + ahza_rs(s, i, 12) * g.w * 0.22, yb = g.y + g.h * 0.2, Ld = Math.min(size * ahza_rr(0.5, 1.7, s, i, 15), lim - yb);
            if (Ld < 2 * px) continue;
            ahza_op(kd, { name: 'drip ' + i, t: 'p', pts: [[x, yb], [x + ahza_rs(s, i, 16) * lw, yb + Ld]], stroke: inkC, sw: lw * ahza_rr(0.6, 1, s, i, 17), cap: 2,
                trim: HD + '100*oc((time-' + jzN(IN + ahza_r(s, i, 13) * 1.4) + ')/' + jzN(2.2 + ahza_r(s, i, 14) * 3) + ')', opX: HD + 'time>' + jzN(IN + ahza_r(s, i, 13) * 1.4 + 0.02) + '?100:0' });
            any = true;
        }
        if (any) ahza_done(kd, HD + '85*K');
        return bb;
    }
});

/* ================================================================ 8. hzVoicemail — 非通知の留守電
   a voicemail from a number that does not exist: an unknown caller, a waveform with a dead stretch, the line as the message */
jzReg('layout', 'hzVoicemail', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['body', 'serif', 'display'])), hh: rng.int(2, 4), mm: rng.int(0, 59), z0: rng.range(0.3, 0.55), zw: rng.range(0.12, 0.22), gl: rng.range(0.45, 0.75) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed | 0, u = jzU(ctx), px = ahza_px(ctx), port = jzPortrait(ctx), mono = jzMonoF(ctx), i;
        var cw = port ? W * 0.86 : Math.min(W * 0.72, H * 1.3), ch = port ? Math.min(H * 0.62, cw * 1.2) : H * 0.74, fs = jzClamp(u * 0.032, 12 * px, 40 * px);
        var x0 = (W - cw) / 2, y0 = (H - ch) / 2, x1 = x0 + cw, plate = jzMixHex(sc.bg, sc.fg, 0.08), lc = jzMixHex(sc.bg, sc.fg, 0.32), LC = sc.fg, pd = fs * 1.5, acc = ahza_acc(sc, plate);
        var yw = y0 + fs * 6.4, yL0 = yw + fs * 3.2, yL1 = y0 + ch - fs * 1.1, lw = Math.max(1.2 * px, u * 0.002), HD = ahza_TH(ctx), A = HD + '100*oe(time/0.45)*K';
        var L = ahza_fit(ctx, ahza_lines(ctx, jzFlat(c.text), 9, 5), { font: ahza_font(ctx, 'body'), color: LC, x: W / 2, y: (yL0 + yL1) / 2, track: 0.05, lead: 1.2, maxW: cw * 0.84, maxH: Math.max(10, (yL1 - yL0) * 0.88), maxSize: H * 0.18 });
        var bb = jzBB(L);
        // the card (everything rides on it: it settles from a little lower)
        var ax = x0 + pd + fs * 1.25, ay = y0 + fs * 2.5, kc = ahza_kit(ctx, 'hz card');
        ahza_op(kc, { name: 'card', t: 'r', cx: W / 2, cy: H / 2, w: cw, h: ch, round: u * 0.028, fill: plate, stroke: lc, sw: lw });
        ahza_op(kc, { name: 'caller', t: 'e', cx: ax, cy: ay, w: fs * 2.5, h: fs * 2.5, stroke: lc, sw: lw });
        ahza_op(kc, { name: 'rule', t: 'p', pts: [[x0 + pd, y0 + fs * 4.7], [x1 - pd, y0 + fs * 4.7]], stroke: lc, sw: lw, sop: 70, trim: HD + '100*oe(time/0.45)' });
        var Card = ahza_pivot(ahza_done(kc, A), W / 2, H / 2);
        jzSetExpr(jzXf(Card, 'ADBE Position'), HD + '[value[0],value[1]+(1-oe(time/0.45))*' + jzN(u * 0.05) + ']');
        // waveform with a stretch of nothing in it: all bars faint, the played part bright (revealed by a matte that follows the playhead)
        var NB = port ? 34 : 48, wx0 = x0 + pd, ww = cw - pd * 2, bw = ww / NB, bars = [], PD = jzN(Math.max(0.2, c.dur));
        for (i = 0; i < NB; i++) {
            var f = (i + 0.5) / NB, dead = f > jzP(ctx, 'z0', 0.4) && f < jzP(ctx, 'z0', 0.4) + jzP(ctx, 'zw', 0.17);
            var hgt = fs * 1.25 * (dead ? 0.05 : 0.14 + 0.86 * Math.abs(ahza_noise1(i * 0.7, s + 3)) * (0.6 + 0.4 * ahza_r(s, i, 4)));
            bars.push({ t: 'r', cx: wx0 + i * bw + bw * 0.5, cy: yw, w: bw * 0.56, h: Math.max(px, hgt * 2) });
        }
        function wave(name, colr, fop, head) {
            var kb = ahza_kit(ctx, name), first = jzCopy(bars[0]);
            first.name = 'bars'; first.more = bars.slice(1); first.fill = colr; first.fop = fop;
            ahza_op(kb, first);
            if (head) ahza_op(kb, { name: 'playhead', t: 'r', cx: 0, cy: yw, w: lw * 2, h: fs * 3, fill: acc, posX: HD + '[' + jzN(wx0) + '+' + jzN(ww) + '*cl(time/' + PD + '),0]' });
            var Sb = ahza_pivot(ahza_done(kb, A), W / 2, yw);
            jzSetExpr(jzXf(Sb, 'ADBE Scale'), HD + '[100,100*oc((time-0.1)/0.45)]');
            ahza_parent(Sb, Card);
            return Sb;
        }
        wave('hz wave', lc, 70, true);
        var Pl = wave('hz wave played', LC, 90, false), km = ahza_kit(ctx, 'hz wave matte');
        ahza_op(km, { name: 'played', t: 'r', cx: ww / 2, cy: 0, w: ww, h: fs * 4, fill: '#FFFFFF', gpos: [wx0, yw], scaleX: HD + '[100*cl(time/' + PD + '),100]' });
        var Mt = ahza_done(km, null);
        ahza_parent(Mt, Card);
        try { Mt.moveBefore(Pl); Pl.trackMatteType = TrackMatteType.ALPHA; Mt.enabled = false; } catch (e) { jzWarn('hzVoicemail matte: ' + e.toString()); }
        // labels
        function lab(str, o, src) { var T = ahza_label(ctx, str, o, A); if (src) ahza_srcEx(T, src); ahza_parent(T, Card); return T; }
        lab('?', { font: mono, size: fs * 1.3, color: lc, x: ax, y: ay });
        lab('UNKNOWN', { font: mono, size: fs * 1.2, color: LC, x: ax + fs * 2.1, y: y0 + fs * 1.9, align: 'left', track: 0.14 });
        // the number never settles on anything but zeros, and loses them for a moment
        var GL = 'var gq=time-DUR*' + jzN(jzP(ctx, 'gl', 0.6)) + ',gl=gq>0&&gq<0.35;';
        var Num = lab('000-0000-0000', { font: mono, size: fs * 0.92, color: lc, x: ax + fs * 2.1, y: y0 + fs * 3.35, align: 'left', track: 0.08, name: 'hz number' },
            HD + GL + 'var s="";for(var i=0;i<11;i++){if(i==3||i==7)s+="-";var live=time<0.25+i*0.07||(gl&&rn(i*3+ST*17,2)<0.6);s+=live?String(Math.floor(rn(i*5+ST*13,1)*10)%10):"0";}s');
        jzAnimator(Num, 'hz Alarm', [['ADBE Text Fill Color', jzHex(acc)]], HD + GL + 'gl?100:0');
        lab(jzPad(jzP(ctx, 'hh', 3), 2) + ':' + jzPad(jzP(ctx, 'mm', 0), 2), { font: mono, size: fs * 0.92, color: lc, x: x1 - pd, y: y0 + fs * 1.9, align: 'right' });
        lab('0:00', { font: mono, size: fs * 0.8, color: lc, x: wx0, y: yw + fs * 2.1, align: 'left', name: 'hz elapsed' }, 'var n=Math.floor(Math.max(0,time))%60;"0:"+(n<10?"0":"")+n');
        lab('--:--', { font: mono, size: fs * 0.8, color: lc, x: x1 - pd, y: yw + fs * 2.1, align: 'right' });
        L.moveToBeginning();
        ahza_parent(L, Card);
        jzAnimate(ctx, L, { mi: 0 });
        return bb;
    }
});
