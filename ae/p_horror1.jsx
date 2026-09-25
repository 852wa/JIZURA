// ================================================================ pack horror part 1 (AE port of the horror set, layouts 1-6)
// hrFlashlight, hrDoorGap, hrWallScrawl, hrCctv, hrOuija, hrMissing + the helpers shared by every horror pack file (ahr_)
//
// Techniques:
// - darkness with a moving hole = a big solid with an inverted, feathered mask, moved / scaled by expressions
// - glyph centres of a laid-out text layer are estimated from its measured width (ahr_slots), exact enough to aim
//   beams, planchettes and labels at single glyphs
// - rows of many little glyphs (board letters, wall writing) are ONE text layer each, arranged with per-glyph animators

/* ================================================================ shared helpers (ahr_) */
// the browser's deterministic hash J.h / J.r / J.rs / J.rr (same numbers as the web frame)
function ahr_h(a, b, c, d, e) {
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
function ahr_r(a, b, c, d, e) { return ahr_h(a, b, c, d, e) / 4294967296; }
function ahr_rs(a, b, c, d, e) { return ahr_r(a, b, c, d, e) * 2 - 1; }
function ahr_rr(lo, hi, a, b, c, d, e) { return lo + (hi - lo) * ahr_r(a, b, c, d, e); }
function ahr_noise1(x, seed) { var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return jzLerp(ahr_rs(seed, i), ahr_rs(seed, i + 1), u); }
// colours (same rules as the browser pack)
function ahr_dark(c) { return jzLum(c) < 0.45; }
function ahr_light(sc) { return jzLum(sc.fg) > jzLum(sc.bg) ? sc.fg : sc.bg; }
function ahr_darkOf(sc) { return jzLum(sc.fg) > jzLum(sc.bg) ? sc.bg : sc.fg; }
function ahr_night(sc) { return jzMixHex(sc.bg, '#000000', ahr_dark(sc.bg) ? 0.72 : 0.9); }
function ahr_onCol(sc, fill) {
    var c = [sc.bg, sc.fg, sc.ink, sc.sub, sc.accent], best = null, bv = 0, i;
    for (i = 0; i < c.length; i++) { if (!c[i] || String(c[i]).toUpperCase() === String(fill).toUpperCase()) continue; var k = jzContrast(c[i], fill); if (k > bv) { bv = k; best = c[i]; } }
    return bv >= 2.6 ? best : (jzLum(fill) > 0.5 ? '#111111' : '#FFFFFF');
}
function ahr_px(ctx) { return jzU(ctx) / 1080; }                  // one browser design px in comp px
// fake date / time strings from the cut seed (ASCII)
function ahr_date(seed, sep) { var y = 1987 + (ahr_h(seed, 1) % 19), m = 1 + (ahr_h(seed, 2) % 12), d = 1 + (ahr_h(seed, 3) % 28); return y + sep + jzPad(m, 2) + sep + jzPad(d, 2); }
function ahr_sec0(seed) { return 2 * 3600 + (ahr_h(seed, 4) % 7200); }
function ahr_clock(seed, t) { var s0 = ahr_sec0(seed) + Math.floor(Math.max(0, t)); return jzPad(Math.floor(s0 / 3600) % 24, 2) + ':' + jzPad(Math.floor(s0 / 60) % 60, 2) + ':' + jzPad(s0 % 60, 2); }
// source-text expression of a running clock (browser fakeTime(seed, lt))
function ahr_clockExpr(seed, prefix) {
    return 'function p2(n){return (n<10?"0":"")+n;}var s0=' + ahr_sec0(seed) + '+Math.floor(Math.max(0,time));"' + (prefix || '') + '"+p2(Math.floor(s0/3600)%24)+":"+p2(Math.floor(s0/60)%60)+":"+p2(s0%60)';
}
// extra easings for expressions: ios inOutSine, ioc inOutCubic, sm smoothstep, nz smooth value noise -1..1 (browser noise1 look-alike)
var AHR_FNS = 'function ios(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}' +
    'function sm(a,b,x){x=cl((x-a)/(b-a));return x*x*(3-2*x);}function nz(x,s){return Math.sin(x*1.13+s*1.7)*0.55+Math.sin(x*2.31+s*3.1)*0.3+Math.sin(x*4.7+s*0.9)*0.15;}\n';
function ahr_TH(ctx) { return jzTH(ctx) + AHR_FNS; }
function ahr_arr(a) { var s = [], i; for (i = 0; i < a.length; i++) s.push(jzN(a[i])); return '[' + s.join(',') + ']'; }
function ahr_strs(a) { var s = [], i; for (i = 0; i < a.length; i++) s.push('"' + String(a[i]).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'); return '[' + s.join(',') + ']'; }
// opacity follows the cut: fade in over `len` from `delay`, times `k`, out with the cut's exit
function ahr_fade(ctx, L, delay, len, k) { jzSetExpr(jzXf(L, 'ADBE Opacity'), jzTH(ctx) + 'value*' + jzN(k == null ? 1 : k) + '*oc((time-' + jzN(delay || 0) + ')/' + jzN(Math.max(0.01, len || 0.3)) + ')*K'); }
// a text layer fitted into maxW x maxH with a fixed leading (lead x size), so glyph rows can be located later
function ahr_fit(ctx, text, o) {
    var lead = o.lead || 1.2;
    var L = jzText(ctx, text, { font: o.font, size: 100, color: o.color, x: o.x, y: o.y, track: o.track || 0, align: o.align, leading: 100 * lead, name: o.name });
    var r = jzRect(L), k = Math.min((o.maxW || 1e6) / Math.max(1, r.width), (o.maxH || 1e6) / Math.max(1, r.height));
    var s = 100 * k; if (o.maxSize) s = Math.min(s, o.maxSize); s = Math.max(1, s);
    jzTextDoc(L, function (td) { td.fontSize = s; try { td.autoLeading = false; td.leading = s * lead; } catch (e) {} });
    jzAnchor(L, o.align);
    jzXf(L, 'ADBE Position').setValue([o.x, o.y]);
    return L;
}
// advance of one glyph in em (estimate)
function ahr_cw(ch) {
    if (ch === ' ') return 0.3;
    var c = ch.charCodeAt(0);
    if (c < 0x2000) { if (/[A-Z]/.test(ch)) return 0.68; if (/[a-z]/.test(ch)) return 0.55; if (/[0-9]/.test(ch)) return 0.6; return 0.4; }
    if (c >= 0xFF61 && c <= 0xFF9F) return 0.5;
    return 1;
}
// estimated centres of every glyph of a text layer in comp px, in textIndex order: [{x, y, sp (space), ln (line), w}]
function ahr_slots(L) {
    var td = L.property('ADBE Text Properties').property('ADBE Text Document').value;
    var text = String(td.text), size = td.fontSize, tr = (td.tracking || 0) / 1000, lead = size * 1.2;
    try { if (!td.autoLeading && td.leading) lead = td.leading; } catch (e0) {}
    var lines = text.split(/\r\n|\r|\n/), nl = lines.length, wl = [], cs = [], i, j, mx = 0;
    for (i = 0; i < nl; i++) {
        var a = jzChars(lines[i]), w = 0, q = [];
        for (j = 0; j < a.length; j++) { var cw = (ahr_cw(a[j]) + tr) * size; q.push(cw); w += cw; }
        cs.push(a); wl.push(q); mx = Math.max(mx, w);
    }
    var r = jzRect(L), an = jzXf(L, 'ADBE Anchor Point').value, p = jzXf(L, 'ADBE Position').value, sc = jzXf(L, 'ADBE Scale').value;
    var k = mx > 0 ? r.width / mx : 1, sx = sc[0] / 100, sy = sc[1] / 100;
    var cxL = r.left + r.width / 2, cyL = r.top + r.height / 2, just = td.justification, out = [];
    for (i = 0; i < nl; i++) {
        var tot = 0; for (j = 0; j < wl[i].length; j++) tot += wl[i][j] * k;
        var x0 = just === ParagraphJustification.LEFT_JUSTIFY ? r.left : (just === ParagraphJustification.RIGHT_JUSTIFY ? r.left + r.width - tot : cxL - tot / 2);
        var yl = cyL + (i - (nl - 1) / 2) * lead, acc = x0;
        for (j = 0; j < cs[i].length; j++) {
            var gw = wl[i][j] * k, gx = acc + gw / 2 - (tr * size * k) / 2;
            acc += gw;
            out.push({ x: p[0] + (gx - an[0]) * sx, y: p[1] + (yl - an[1]) * sy, sp: cs[i][j] === ' ' || cs[i][j] === '　', ln: i, w: gw * sx, ch: cs[i][j] });
        }
    }
    return out;
}
function ahr_nonSp(sl) { var o = [], i; for (i = 0; i < sl.length; i++) if (!sl[i].sp) o.push(sl[i]); return o; }
// a shape group with one path (+ stroke / fill); groups added LATER are drawn BELOW (AE draws the first group on top)
function ahr_path(S, name, pts, o) {
    var g = jzGrp(S, name);
    jzAddPath(g, pts, !!o.closed);
    if (o.stroke) { var st = jzAddStroke(g, o.stroke, o.sw || 2, o.sop); if (o.cap) try { st.property('ADBE Vector Stroke Line Cap').setValue(o.cap); } catch (e) {} }
    if (o.fill) jzAddFill(g, o.fill, o.fop);
    return g;
}
function ahr_solid(ctx, hex, name, w, h) { return ctx.comp.layers.addSolid(jzHex(hex), name, Math.max(4, Math.round(w)), Math.max(4, Math.round(h)), 1, ctx.comp.duration); }
function ahr_box(x0, y0, x1, y1) { return { x0: x0, y0: y0, x1: x1, y1: y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }; }
// a rounded / plain rectangle path (for groups that also carry other paths)
function ahr_rectPts(x0, y0, x1, y1) { return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; }

/* ================================================================ 1. hrFlashlight — 懐中電灯 */
jzReg('layout', 'hrFlashlight', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, rng.chance(0.6) ? ['serif', 'display'] : ['display'])), path: rng.pick(['read', 'read', 'search']), rk: rng.range(0.85, 1.1), dark: rng.range(0.9, 0.96), dust: rng.chance(0.7), sx: rng.range(-0.3, 0.3), sy: rng.range(-0.3, 0.3) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), s = c.seed | 0;
        var text = jzSplitLines(jzFlat(c.text), port ? 5 : 10);
        var L = ahr_fit(ctx, text, { font: jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'serif')), color: sc.fg, x: W / 2, y: H / 2, track: 0.06, lead: 1.25, maxW: W * 0.8, maxH: H * 0.42, maxSize: H * 0.24 });
        var size = jzFontSize(L), m = jzSize(L), bb = jzBB(L);
        var sl = ahr_nonSp(ahr_slots(L)), X = [], Y = [], i;
        for (i = 0; i < sl.length; i++) { X.push(sl[i].x); Y.push(sl[i].y); }
        if (!X.length) { X.push(W / 2); Y.push(H / 2); }
        jzAnimate(ctx, L, { mi: 0 });
        var R0 = Math.max(size * 0.9 * jzP(ctx, 'rk', 1), u * 0.1), Rall = Math.sqrt(m[0] * m[0] + m[1] * m[1]) * 0.55 + size * 0.5;
        var dur = c.dur, search = jzP(ctx, 'path', 'read') === 'search', t0 = search ? dur * 0.22 : 0.1, t1 = dur * 0.72;
        // the veil: a huge solid with a soft elliptic hole (radial falloff 0.32R..R), moved to the beam and scaled to its radius
        var big = Math.max(W, H) * 8, V = ahr_solid(ctx, ahr_night(sc), 'hr veil', big, big);
        V.name = 'hr veil';
        var mk = V.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
        var Rm = R0 * 0.66;
        mk.property('ADBE Mask Shape').setValue(jzCircleShape(big / 2, big / 2, Rm));
        mk.property('ADBE Mask Feather').setValue([R0 * 0.68, R0 * 0.68]);
        mk.inverted = true;
        var HD = ahr_TH(ctx) + 'var X=' + ahr_arr(X) + ',Y=' + ahr_arr(Y) + ',n=X.length,t0=' + jzN(t0) + ',t1=' + jzN(t1) + ',SZ=' + jzN(size) + ';\n';
        var pos = HD + 'var u=cl((time-t0)/Math.max(0.2,t1-t0)),bx=X[0],by=Y[0];' +
            'if(n>1){var f=u*(n-1),i=Math.min(n-2,Math.floor(f)),k=ios(f-Math.max(0,i));bx=X[i]+(X[i+1]-X[i])*k;by=Y[i]+(Y[i+1]-Y[i])*k;}' +
            (search ? 'if(time<t0){var q=ios(time/t0);var sx=' + jzN(W * (0.5 + jzP(ctx, 'sx', 0))) + '+nz(time*1.3,' + (s % 97) + ')*' + jzN(W * 0.25) + ',sy=' + jzN(H * (0.5 + jzP(ctx, 'sy', 0))) + '+nz(time*1.1,' + (s % 89 + 3) + ')*' + jzN(H * 0.2) + ';bx=sx+(bx-sx)*q*q;by=sy+(by-sy)*q*q;}' : '') +
            'bx+=(nz(time*2.2,5)*0.7+nz(time*7,6)*0.3)*SZ*0.18;by+=(nz(time*1.9,7)*0.7+nz(time*6.3,8)*0.3)*SZ*0.14;' +
            'var op=ioc((time-t1)/0.7);bx+=(' + jzN(W / 2) + '-bx)*op;by+=(' + jzN(H / 2) + '-by)*op;[bx,by]';
        jzSetExpr(jzXf(V, 'ADBE Position'), pos);
        jzSetExpr(jzXf(V, 'ADBE Scale'), HD + 'var op=ioc((time-t1)/0.7);var R=' + jzN(R0) + '+' + jzN(Math.max(0, Rall - R0)) + '*op;R*=0.3+0.7*oc(time/0.35);' +
            'posterizeTime(24);seedRandom(' + (s % 9973) + '+Math.floor(time*24),true);if(random()<0.05)R*=0.55;var k=R/' + jzN(R0) + '*100;[k,k*0.86]');
        jzSetExpr(jzXf(V, 'ADBE Opacity'), HD + jzN(jzP(ctx, 'dark', 0.93) * 100) + '*oc(time/0.25)*(1-ic(PO)*0.6)');
        jzNoGhost(V);
        // dust hanging in the beam
        if (jzP(ctx, 'dust', true)) {
            var D = jzShapeLayer(ctx, 'hr dust', W / 2, H / 2), g = jzGrp(D, 'dust');
            for (i = 0; i < 14; i++) {
                var a = ahr_r(s, i, 41) * Math.PI * 2, rr = Math.sqrt(ahr_r(s, i, 43)) * R0 * 0.75, dr = u * ahr_rr(0.0012, 0.003, s, i, 42) * 2;
                jzAddEllipse(g, dr, dr, Math.cos(a) * rr, Math.sin(a) * rr * 0.86);
            }
            jzAddFill(g, sc.fg);
            jzSetExpr(jzXf(D, 'ADBE Position'), 'thisComp.layer("hr veil").transform.position');
            jzSetExpr(jzXf(D, 'ADBE Scale'), 'var s=thisComp.layer("hr veil").transform.scale;[s[0],s[0]]');
            jzSetExpr(jzXf(D, 'ADBE Rotate Z'), 'time*9');
            jzSetExpr(jzXf(D, 'ADBE Opacity'), HD + '35*' + jzN(jzP(ctx, 'dark', 0.93)) + '*oc(time/0.25)*(1-ic(PO)*0.6)*(0.6+0.4*Math.sin(time*2))');
            jzNoGhost(D);
        }
        return bb;
    }
});

/* ================================================================ 2. hrDoorGap — 扉の隙間 */
jzReg('layout', 'hrDoorGap', {
    plan: function (rng, cut, st) {
        var n = jzCount(cut.text);
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), vert: n <= 7 && !jzHasLatin(cut.text) && rng.chance(0.75), side: rng.pick([-1, 1]), pause: rng.range(0.16, 0.26), wedge: rng.chance(0.8) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = jzPortrait(ctx), s = c.seed | 0;
        var vert = !!jzP(ctx, 'vert', false) && !jzHasLatin(c.text), font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'serif'));
        var L = vert ? ahr_fit(ctx, jzVertical(c.text), { font: font, color: sc.fg, x: W / 2, y: H / 2, track: 0, lead: 1.08, maxW: W * 0.3, maxH: H * 0.74, maxSize: Math.min(W * 0.2, H * 0.2) })
                     : ahr_fit(ctx, jzSplitLines(jzFlat(c.text), port ? 5 : 11), { font: font, color: sc.fg, x: W / 2, y: H / 2, track: 0.08, lead: 1.2, maxW: W * 0.78, maxH: H * 0.36, maxSize: H * 0.2 });
        var size = jzFontSize(L), m = jzSize(L), bb = jzBB(L);
        jzAnimate(ctx, L, { mi: 0 });
        var full = (vert ? m[0] : m[1]) + size * 0.9, cx = W / 2, cy = H / 2, lw = Math.max(1, size * 0.02);
        var span = vert ? m[1] + size * 1.6 : m[0] + size * 1.6;      // length of the gap
        // opening: a crack, a pause, then wide enough to read; slams shut on the exit
        var G = ahr_TH(ctx) + 'var FULL=' + jzN(full) + ';var a1=cl(time/0.5),a2=cl((time-' + jzN(Math.max(0.35, c.dur * jzP(ctx, 'pause', 0.2))) + ')/0.6);' +
            'var o=0.18*oc(a1)+0.82*ioc(a2);posterizeTime(24);seedRandom(' + (s % 9973) + '+Math.floor(time*24),true);o+=random(-1,1)*0.015*(a2>0&&a2<1?1:0);o*=1-ie(PO);var g=Math.max(0,FULL*o);\n';
        var D = jzShapeLayer(ctx, 'hr door', cx, cy), gd = jzGrp(D, 'dark'), BW = W * 3, BH = H * 3;
        // four panels around the gap: two slide, two change length
        var r1 = jzAddRect(gd, vert ? BW : BW, vert ? BH : BH, 0);
        if (vert) {
            r1.property('ADBE Vector Rect Position').expression = G + '[-g/2-' + jzN(BW / 2) + ',0]';
            var r2 = jzAddRect(gd, BW, BH, 0); r2.property('ADBE Vector Rect Position').expression = G + '[g/2+' + jzN(BW / 2) + ',0]';
            var r3 = jzAddRect(gd, W, BH, 0, 0, -(span / 2 + BH / 2)); r3.property('ADBE Vector Rect Size').expression = G + '[g+2,' + jzN(BH) + ']';
            var r4 = jzAddRect(gd, W, BH, 0, 0, span / 2 + BH / 2); r4.property('ADBE Vector Rect Size').expression = G + '[g+2,' + jzN(BH) + ']';
        } else {
            r1.property('ADBE Vector Rect Position').expression = G + '[0,-g/2-' + jzN(BH / 2) + ']';
            var r5 = jzAddRect(gd, BW, BH, 0); r5.property('ADBE Vector Rect Position').expression = G + '[0,g/2+' + jzN(BH / 2) + ']';
            var r6 = jzAddRect(gd, BW, H, 0, -(span / 2 + BW / 2), 0); r6.property('ADBE Vector Rect Size').expression = G + '[' + jzN(BW) + ',g+2]';
            var r7 = jzAddRect(gd, BW, H, 0, span / 2 + BW / 2, 0); r7.property('ADBE Vector Rect Size').expression = G + '[' + jzN(BW) + ',g+2]';
        }
        jzAddFill(gd, ahr_night(sc));
        jzSetExpr(jzXf(D, 'ADBE Opacity'), jzTH(ctx) + '97*oc(time/0.2)');
        jzNoGhost(D);
        // light rims on the gap edges (+ light spilling onto the floor for the vertical door)
        var Lc = ahr_light(sc), RL = jzShapeLayer(ctx, 'hr door light', cx, cy), sides = [-1, 1], k;
        for (k = 0; k < 2; k++) {
            var gr = jzGrp(RL, 'rim' + k), sg = sides[k], rim = vert ? jzAddRect(gr, lw, span, 0) : jzAddRect(gr, span, lw, 0);
            rim.property('ADBE Vector Rect Position').expression = G + (vert ? '[' + sg + '*g/2,0]' : '[0,' + sg + '*g/2]');
            jzAddFill(gr, Lc);
            jzGX(gr).property('ADBE Vector Group Opacity').expression = G + '55*Math.min(1,g/' + jzN(size * 0.3) + ')*' + ((vert ? sg < 0 : sg > 0) ? 1 : 0.6) + '*(g>1?1:0)';
        }
        if (vert && jzP(ctx, 'wedge', true)) {
            var side = jzP(ctx, 'side', 1), gw = jzGrp(RL, 'spill'), y1 = span / 2, yb = H * 1.05 - cy, off = W * 0.08 * side;
            jzAddPath(gw, [[-full / 2, y1], [full / 2, y1], [full * 2.4 + off, yb], [-full * 1.6 + off, yb]], true);
            jzAddFill(gw, Lc);
            jzGX(gw).property('ADBE Vector Scale').expression = G + '[100*o,100]';
            jzGX(gw).property('ADBE Vector Group Opacity').expression = G + '7*Math.min(1,g/' + jzN(size) + ')';
        }
        jzNoGhost(RL);
        return bb;
    }
});

/* ================================================================ 3. hrWallScrawl — 壁の落書き */
jzReg('layout', 'hrWallScrawl', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), hand: rng.chance(0.75) ? 'klee' : rng.pick(jzFontsOf(st, ['body', 'serif'])), rows: rng.int(7, 10), mainHand: rng.chance(0.4), red: rng.range(0.06, 0.16), rise: rng.range(0.55, 0.8) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = jzPortrait(ctx), s = c.seed | 0, i, j, q;
        var unit = jzFlat(c.text), hand = jzP(ctx, 'hand', 'klee'), font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display'));
        var mainFont = jzP(ctx, 'mainHand', false) ? hand : font;
        var L = ahr_fit(ctx, jzSplitLines(unit, port ? 5 : 10), { font: mainFont, color: sc.fg, x: W / 2, y: H / 2, track: 0.04, lead: 1.1, maxW: W * 0.8, maxH: H * 0.3, maxSize: H * 0.2 });
        var size = jzFontSize(L), mm = jzSize(L);
        var clear = { x0: W / 2 - mm[0] / 2 - size * 0.4, x1: W / 2 + mm[0] / 2 + size * 0.4, y0: H / 2 - mm[1] / 2 - size * 0.35, y1: H / 2 + mm[1] / 2 + size * 0.35 };
        var rows = jzP(ctx, 'rows', 8), rh = H / rows, fs = rh * 0.58, gs = jzGlyphs(unit), gN = Math.max(1, jzCount(unit));
        // measure one copy (and the gap of one space) in the hand font
        var M1 = jzText(ctx, unit, { font: hand, size: fs, x: 0, y: 0, track: 0.02 }), cw = jzRect(M1).width; M1.remove();
        var M2 = jzText(ctx, unit + ' ' + unit, { font: hand, size: fs, x: 0, y: 0, track: 0.02 }), spw = Math.max(fs * 0.2, jzRect(M2).width - cw * 2); M2.remove();
        var slots = [], r, k;
        for (r = 0; r < rows && slots.length < 240; r++) {
            var y = (r + 0.5) * rh + ahr_rs(s, r, 1) * rh * 0.12, x = W * 0.03 + ahr_r(s, r, 2) * fs * 2;
            for (k = 0; k < 16 && x < W * 0.97; k++) {
                var sz = fs * ahr_rr(0.75, 1.3, s, r, k, 3), w = cw * sz / fs;
                if (!(y + sz * 0.6 > clear.y0 && y - sz * 0.6 < clear.y1 && x + w > clear.x0 && x < clear.x1) && x + w < W * 1.02) slots.push({ x: x, y: y, sz: sz, w: w, r: r, k: k });
                x += w + fs * ahr_rr(0.4, 1.4, s, r, k, 4);
            }
        }
        var lim = Math.max(8, Math.min(64, Math.floor(420 / gN)));
        if (slots.length > lim) { var st2 = slots.length / lim, sl2 = []; for (i = 0; i < lim; i++) sl2.push(slots[Math.floor(i * st2)]); slots = sl2; }
        var K = slots.length, T = Math.max(0.6, c.dur * jzP(ctx, 'rise', 0.65));
        for (q = 0; q < K; q++) { slots[q].ta = T * Math.pow(q / Math.max(1, K), 0.62); slots[q].red = ahr_r(ahr_h(s, q, 9), 5) < jzP(ctx, 'red', 0.1); slots[q].q = q; }
        // segments: runs of copies in one row that are not split by the clear zone -> one text layer each
        var segs = [], cur = null;
        for (q = 0; q < K; q++) {
            var S0 = slots[q];
            if (!cur || cur.r !== S0.r || (cur.last.x < clear.x0 && S0.x > clear.x0)) { cur = { r: S0.r, items: [] }; segs.push(cur); }
            cur.items.push(S0); cur.last = S0;
        }
        var adv = cw / gN, TH0 = jzTH(ctx);
        for (i = 0; i < segs.length; i++) {
            var it = segs[i].items, str = [], offs = [], scl = [], rot = [], tms = [], red = [], nat = 0, x0 = it[0].x;
            for (q = 0; q < it.length; q++) {
                var S1 = it[q], ks = S1.sz / fs, seed = ahr_h(s, S1.q, 9);
                if (q) { str.push(' '); offs.push([0, 0]); scl.push(1); rot.push(0); tms.push(9999); red.push(false); nat += spw; }
                var gi = 0;
                for (j = 0; j < gs.length; j++) {
                    str.push(gs[j]);
                    var natX = nat + (j + 0.5) * adv, tx = (S1.x - x0) + (j + 0.5) * adv * ks;
                    offs.push([tx - natX, (S1.y - it[0].y) + ahr_rs(seed, gi, 7) * S1.sz * 0.12]);
                    scl.push(ks * (1 + ahr_rs(seed, gi, 10) * 0.12)); rot.push(ahr_rs(seed, 6) * 5 + ahr_rs(seed, gi, 8) * 9);
                    tms.push(S1.ta + 0.3 * (gs[j] === ' ' ? j : gi) / gN); red.push(S1.red);
                    if (gs[j] !== ' ') gi++;
                }
                nat += cw;
            }
            var TL = jzText(ctx, str.join(''), { font: hand, size: fs, color: sc.sub, x: x0, y: it[0].y, align: 'left', track: 0.02, name: 'hr scrawl ' + (i + 1) });
            jzCharOffsets(TL, offs, 'hr Place');
            jzCharScales(TL, scl, 'hr Size');
            jzCharRotations(TL, rot, 'hr Tilt');
            var anyRed = false; for (q = 0; q < red.length; q++) if (red[q]) anyRed = true;
            if (anyRed) jzCharColors(TL, sc.accent, red, 'hr Red');
            jzAnimator(TL, 'hr Write', [['ADBE Text Opacity', 0]], 'var a=' + ahr_arr(tms) + ';time<(a[textIndex-1]||0)?100:0');
            jzSetExpr(jzXf(TL, 'ADBE Opacity'), TH0 + '48*K');
            jzNoGhost(TL);
        }
        L.moveToBeginning();
        jzAnimate(ctx, L, { mi: 0 });
        return jzBB(L);
    }
});

/* ================================================================ 4. hrCctv — 監視モニター */
jzReg('layout', 'hrCctv', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), v: rng.pick(['quad', 'quad', 'single']), act: rng.int(0, 3), cam0: rng.int(1, 12), box: rng.chance(0.7) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = jzPortrait(ctx), s = c.seed | 0, u = jzU(ctx), px = ahr_px(ctx), i, k;
        var mono = jzMonoF(ctx), fs = jzClamp(u * 0.022, 11 * px, 28 * px), m = u * 0.03, lw = Math.max(1, u * 0.0016);
        var feedBg = jzMixHex(ahr_darkOf(sc), '#000000', 0.35), LC = ahr_light(sc), frameC = jzMixHex(feedBg, LC, 0.5);
        var quad = jzP(ctx, 'v', 'quad') === 'quad', act = jzP(ctx, 'act', 0) % 4, cam0 = jzP(ctx, 'cam0', 1), date = ahr_date(s, '/');
        var TH0 = jzTH(ctx), feeds = [], fx0 = m, fy0 = m, fx1 = W - m, fy1 = H - m;
        if (quad) {
            var g = lw * 3, cwid = (W - m * 2 - g) / 2, chh = (H - m * 2 - g) / 2;
            for (k = 0; k < 4; k++) {
                var x0 = m + (k % 2) * (cwid + g), y0 = m + Math.floor(k / 2) * (chh + g);
                if (k === act) { fx0 = x0; fy0 = y0; fx1 = x0 + cwid; fy1 = y0 + chh; }
                else feeds.push({ x0: x0, y0: y0, x1: x0 + cwid, y1: y0 + chh, k: k });
            }
        }
        var fw = fx1 - fx0, fh = fy1 - fy0, fe;
        // feed backgrounds (+ the corridors seen from above a doorway in the empty ones)
        var F = jzShapeLayer(ctx, 'hr feeds', 0, 0);
        if (feeds.length) {
            var gc = jzGrp(F, 'corridors');
            for (i = 0; i < feeds.length; i++) {
                fe = feeds[i];
                var ccx = (fe.x0 + fe.x1) / 2 + ahr_rs(s, fe.k, 3) * (fe.x1 - fe.x0) * 0.12, ccy = (fe.y0 + fe.y1) / 2 + ahr_rs(s, fe.k, 4) * (fe.y1 - fe.y0) * 0.08, ww = (fe.x1 - fe.x0) * 0.16, hh2 = (fe.y1 - fe.y0) * 0.2;
                jzAddPath(gc, [[fe.x0, fe.y0], [ccx - ww, ccy - hh2]], false); jzAddPath(gc, [[fe.x1, fe.y0], [ccx + ww, ccy - hh2]], false);
                jzAddPath(gc, [[fe.x0, fe.y1], [ccx - ww, ccy + hh2]], false); jzAddPath(gc, [[fe.x1, fe.y1], [ccx + ww, ccy + hh2]], false);
                jzAddPath(gc, ahr_rectPts(ccx - ww, ccy - hh2, ccx + ww, ccy + hh2), true);
            }
            jzAddStroke(gc, jzMixHex(feedBg, LC, 0.25), lw, 80);
        }
        var gb = jzGrp(F, 'feeds');
        jzAddRect(gb, fw, fh, 0, fx0 + fw / 2, fy0 + fh / 2);
        for (i = 0; i < feeds.length; i++) { fe = feeds[i]; jzAddRect(gb, fe.x1 - fe.x0, fe.y1 - fe.y0, 0, (fe.x0 + fe.x1) / 2, (fe.y0 + fe.y1) / 2); }
        jzAddFill(gb, feedBg);
        jzSetExpr(jzXf(F, 'ADBE Opacity'), TH0 + '100*oc(time/0.2)');
        jzNoGhost(F);
        // TV snow: grey solids with per-pixel noise, one per feed
        var snow = [{ x0: fx0, y0: fy0, x1: fx1, y1: fy1, a: 5 }];
        for (i = 0; i < feeds.length; i++) snow.push({ x0: feeds[i].x0, y0: feeds[i].y0, x1: feeds[i].x1, y1: feeds[i].y1, a: 9 });
        for (i = 0; i < snow.length; i++) {
            var N = ahr_solid(ctx, '#808080', 'hr snow ' + (i + 1), snow[i].x1 - snow[i].x0, snow[i].y1 - snow[i].y0);
            jzXf(N, 'ADBE Position').setValue([(snow[i].x0 + snow[i].x1) / 2, (snow[i].y0 + snow[i].y1) / 2]);
            var ne = jzEffect(N, 'ADBE Noise', 'hr Snow'); jzEP(ne, 1, 100); jzEP(ne, 2, 0);
            jzSetExpr(jzXf(N, 'ADBE Opacity'), TH0 + jzN(snow[i].a) + '*oc(time/0.2)*K');
            jzNoGhost(N);
        }
        // OSD of one feed
        var osd = [];
        function camLabel(x0, y0, x1, y1, n, live, f) {
            var a = jzText(ctx, 'CAM ' + jzPad(n, 2), { font: mono, size: f, color: LC, x: x0 + f * 0.8, y: y0 + f * 1.2, align: 'left', track: 0.1 });
            ahr_fade(ctx, a, 0, 0.2, 0.85); osd.push(a);
            var b = jzText(ctx, date + ' ' + ahr_clock(s, 0), { font: mono, size: f * 0.9, color: LC, x: x1 - f * 0.8, y: y1 - f * 1.1, align: 'right', track: 0.06 });
            jzSetExpr(b.property('ADBE Text Properties').property('ADBE Text Document'), ahr_clockExpr(s, date + ' '));
            ahr_fade(ctx, b, 0, 0.2, 0.75); osd.push(b);
            if (live) {
                var rc = jzText(ctx, 'REC', { font: mono, size: f, color: LC, x: x1 - f * 3.3, y: y0 + f * 1.2, align: 'left' });
                ahr_fade(ctx, rc, 0, 0.2, 0.85); osd.push(rc);
                var dot = jzEllipseLayer(ctx, 'hr rec', x1 - f * 3.9, y0 + f * 1.2, f * 0.64, f * 0.64, jzFitContrast(sc.accent, feedBg, 3));
                jzSetExpr(jzXf(dot, 'ADBE Opacity'), TH0 + 'posterizeTime(12);(Math.floor(time*12)%4<2?100:0)*oc(time/0.2)*K');
                osd.push(dot);
            }
        }
        for (i = 0; i < feeds.length; i++) {
            fe = feeds[i];
            camLabel(fe.x0, fe.y0, fe.x1, fe.y1, cam0 + fe.k, false, fs * 0.8);
            if (ahr_r(s, fe.k, 5) < 0.35) {
                var ns = jzText(ctx, 'NO SIGNAL', { font: mono, size: fs * 1.1, color: jzMixHex(feedBg, LC, 0.6), x: (fe.x0 + fe.x1) / 2, y: (fe.y0 + fe.y1) / 2, track: 0.2 });
                jzSetExpr(jzXf(ns, 'ADBE Opacity'), TH0 + 'posterizeTime(12);(Math.floor(time*12)%6<4?80:30)*oc(time/0.2)*K');
                osd.push(ns);
            }
        }
        // the live feed with the lyric
        var text = jzSplitLines(jzFlat(c.text), quad ? (port ? 4 : 7) : (port ? 5 : 11));
        var L = ahr_fit(ctx, text, { font: jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), color: LC, x: fx0 + fw / 2, y: fy0 + fh / 2, track: 0.05, lead: 1.2, maxW: fw * 0.82, maxH: fh * 0.46, maxSize: fh * 0.3 });
        var size = jzFontSize(L), bb = jzBB(L);
        jzAnimate(ctx, L, { mi: 0 });
        // scanlines + a slow bright band
        var sp = Math.max(3 * px, fh / 90), SL = jzShapeLayer(ctx, 'hr scan', fx0 + fw / 2, fy0), gs = jzGrp(SL, 'lines');
        jzAddRect(gs, fw, sp * 0.6, 0, 0, sp * 0.3);
        var rp = jzVecs(gs).addProperty('ADBE Vector Filter - Repeater');
        rp.property('ADBE Vector Repeater Copies').setValue(Math.floor(fh / (sp * 2)));
        rp.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([0, sp * 2]);
        jzAddFill(gs, '#000000', 12);
        var gband = jzGrp(SL, 'band');
        var rb = jzAddRect(gband, fw, fh * 0.05, 0, 0, fh * 0.025);
        rb.property('ADBE Vector Rect Position').expression = 'var T=time+' + jzN(c.start || 0) + ';[0,((T*0.13+' + jzN(ahr_r(s, 9)) + ')%1)*' + jzN(fh) + ']';
        jzAddFill(gband, LC, 3);
        jzSetExpr(jzXf(SL, 'ADBE Opacity'), TH0 + '100*oc(time/0.2)');
        jzNoGhost(SL);
        // motion-detection corners hunting the words
        if (jzP(ctx, 'box', true)) {
            var pd = size * 0.25, bx0 = bb.x0 - pd, by0 = bb.y0 - pd, bx1 = bb.x1 + pd, by1 = bb.y1 + pd, Lb = size * 0.3, acol = jzFitContrast(sc.accent, feedBg, 3);
            var B = jzShapeLayer(ctx, 'hr motion box', 0, 0), gm = jzGrp(B, 'corners');
            jzAddPath(gm, [[bx0, by0 + Lb], [bx0, by0], [bx0 + Lb, by0]], false); jzAddPath(gm, [[bx1 - Lb, by0], [bx1, by0], [bx1, by0 + Lb]], false);
            jzAddPath(gm, [[bx0, by1 - Lb], [bx0, by1], [bx0 + Lb, by1]], false); jzAddPath(gm, [[bx1 - Lb, by1], [bx1, by1], [bx1, by1 - Lb]], false);
            jzAddStroke(gm, acol, Math.max(1.2 * px, lw * 1.4));
            var jit = 'posterizeTime(12);seedRandom(' + (s % 9973) + '+Math.floor(time*12),true);[value[0]+random(-1,1)*' + jzN(size * 0.08) + ',value[1]+random(-1,1)*' + jzN(size * 0.08) + ']';
            jzSetExpr(jzXf(B, 'ADBE Position'), jit);
            var eIn = TH0 + 'var e=oc((time-' + jzN((c.inDur || 0.3) * 0.6) + ')/0.25)*K;';
            jzSetExpr(jzXf(B, 'ADBE Opacity'), eIn + '100*e');
            var ml = jzText(ctx, 'MOTION ' + jzPad(1 + (ahr_h(s, 23) % 9), 2), { font: mono, size: fs * 0.75, color: acol, x: bx0, y: by0 - fs * 0.7, align: 'left', track: 0.1 });
            jzSetExpr(jzXf(ml, 'ADBE Position'), jit);
            jzSetExpr(jzXf(ml, 'ADBE Opacity'), eIn + 'posterizeTime(12);100*e*(Math.floor(time*12)%3?1:0.4)');
            jzNoGhost(B); jzNoGhost(ml);
        }
        camLabel(fx0, fy0, fx1, fy1, cam0 + act, true, fs);
        var FR = jzRectLayer(ctx, 'hr frame', fx0 + fw / 2, fy0 + fh / 2, fw, fh, null, { stroke: quad ? jzFitContrast(sc.accent, feedBg, 3) : frameC, strokeW: lw * (quad ? 1.6 : 1) });
        ahr_fade(ctx, FR, 0, 0.2, quad ? 0.85 : 0.5);
        osd.push(FR);
        for (i = 0; i < osd.length; i++) jzNoGhost(osd[i]);
        return bb;
    }
});

/* ================================================================ 5. hrOuija — 降霊盤 */
var AHR_KANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
var AHR_ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
// one text layer holding several glyph rows, each glyph moved to its own place: items [{ch, x, y, rot}] (one glyph per line)
function ahr_glyphCloud(ctx, items, o) {
    var chs = [], i, lead = o.size * 1.3;
    for (i = 0; i < items.length; i++) chs.push(items[i].ch);
    var L = jzText(ctx, chs.join('\r'), { font: o.font, size: o.size, color: o.color, x: o.x, y: o.y, track: o.track || 0, leading: lead, name: o.name });
    var n = items.length, offs = [], rots = [], anyRot = false, j, gl;
    for (i = 0; i < n; i++) {
        gl = jzChars(items[i].ch);
        for (j = 0; j < gl.length; j++) {    // every glyph of a line moves with its line (lines are centred)
            offs.push([items[i].x - o.x, items[i].y - (o.y + (i - (n - 1) / 2) * lead)]);
            rots.push(items[i].rot || 0); if (items[i].rot) anyRot = true;
        }
    }
    jzCharOffsets(L, offs, 'hr Place');
    if (anyRot) jzCharRotations(L, rots, 'hr Tilt');
    return L;
}
jzReg('layout', 'hrOuija', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), fontB: rng.pick(jzFontsOf(st, ['serif'])), jit: rng.range(0.45, 0.9), latin: jzHasLatin(cut.text) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = jzPortrait(ctx), s = c.seed | 0, u = jzU(ctx), i, r;
        var lw = Math.max(1, u * 0.0018), fontB = jzP(ctx, 'fontB', jzSerifF(ctx)), latin = !!jzP(ctx, 'latin', jzHasLatin(c.text)), TH0 = ahr_TH(ctx);
        var bw = Math.min(W * 0.88, H * (port ? 0.62 : 1.2)), bh = bw * (port ? 0.72 : 0.52), bx = W / 2, by = port ? H * 0.34 : H * 0.36;
        var plate = jzMixHex(sc.bg, sc.fg, ahr_dark(sc.bg) ? 0.07 : 0.06), col = jzMixHex(plate, sc.fg, 0.55);
        var Bd = jzRectLayer(ctx, 'hr board', bx, by, bw, bh, plate, { round: bh * 0.14, stroke: jzMixHex(sc.bg, sc.sub, 0.6), strokeW: lw });
        ahr_fade(ctx, Bd, 0, 0.35); jzNoGhost(Bd);
        var rowsSrc = latin ? [AHR_ABC.substr(0, 13), AHR_ABC.substr(13), '1234567890'] : [AHR_KANA.substr(0, 16), AHR_KANA.substr(16, 16), AHR_KANA.substr(32)];
        var cells = [], bf = bh * (latin ? 0.1 : 0.085);
        for (r = 0; r < 3; r++) {
            var arr = jzChars(rowsSrc[r]), n = arr.length, R = bw * (0.64 - r * 0.17), cy = by + bh * (0.52 + r * 0.04), span = (r ? 96 : 112) * (port ? 0.95 : 1), row = [];
            for (i = 0; i < n; i++) {
                if (r === 2) { row.push({ ch: arr[i], x: bx + (i - (n - 1) / 2) * bw * 0.6 / Math.max(1, n - 1), y: by + bh * 0.3, rot: 0 }); continue; }
                var a = (-90 - span / 2 + span * (n > 1 ? i / (n - 1) : 0.5)) * Math.PI / 180;
                row.push({ ch: arr[i], x: bx + Math.cos(a) * R * 0.78, y: cy + Math.sin(a) * R * 0.62, rot: (a * 180 / Math.PI + 90) * 0.7 });
            }
            for (i = 0; i < row.length; i++) cells.push(row[i]);
            var RL = ahr_glyphCloud(ctx, row, { font: fontB, size: bf, color: col, x: bx, y: by, name: 'hr board row ' + (r + 1) });
            ahr_fade(ctx, RL, 0, 0.35); jzNoGhost(RL);
        }
        var cs = bf * 0.9, lab = ahr_glyphCloud(ctx, [{ ch: 'YES', x: bx - bw * 0.36, y: by - bh * 0.36 }, { ch: 'NO', x: bx + bw * 0.36, y: by - bh * 0.36 }, { ch: 'GOOD BYE', x: bx, y: by + bh * 0.42 }], { font: fontB, size: cs, color: col, x: bx, y: by, track: 0.2, name: 'hr board words' });
        ahr_fade(ctx, lab, 0, 0.35); jzNoGhost(lab);
        // lyric row + when each glyph is spelled out
        var text = jzFlat(c.text), chars = [], all = jzChars(text);
        for (i = 0; i < all.length; i++) if (all[i] !== ' ') chars.push(all[i]);
        var n2 = chars.length, rowY = port ? H * 0.74 : H * 0.8, jit = jzP(ctx, 'jit', 0.6);
        var lines = n2 > (port ? 6 : 12) ? jzSplitLines(text, Math.ceil(n2 / 2)) : text;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'serif'));
        var Mz = ahr_fit(ctx, lines, { font: font, color: sc.fg, x: W / 2, y: rowY, track: 0.18, lead: 1.2, maxW: W * 0.86, maxH: H * (port ? 0.26 : 0.2), maxSize: H * 0.13 });
        var size = jzFontSize(Mz), sl = ahr_nonSp(ahr_slots(Mz)); Mz.remove();
        var span2 = c.dur * 0.5, times = [], ws = [], acc = 0, c0 = 0.25;
        for (i = 0; i < n2; i++) { var wv = 0.35 + jit * ahr_r(s, i, 51) * 2; ws.push(wv); acc += wv; }
        for (i = 0; i < n2; i++) { c0 += ws[i] / acc * (span2 - 0.25); times.push(c0); }
        function target(i2) {
            var ch = chars[i2] || '', cc = ch.charCodeAt(0);
            if (cc >= 0x30A1 && cc <= 0x30F6) ch = String.fromCharCode(cc - 0x60);
            ch = ch.toUpperCase();
            for (var q = 0; q < cells.length; q++) if (cells[q].ch === ch) return cells[q];
            return cells[ahr_h(s, i2, 52) % cells.length];
        }
        var TX = [], TY = [], TR = [], TC = [];
        for (i = 0; i < n2; i++) { var tg = target(i); TX.push(tg.x); TY.push(tg.y); TR.push(tg.rot); TC.push(tg.ch); }
        // planchette: follows the targets (same timing as the browser)
        var pr = bf * 1.2, pc = sc.fg;
        var HP = TH0 + 'var T=' + ahr_arr(times) + ',X=' + ahr_arr(TX) + ',Y=' + ahr_arr(TY) + ',n=T.length,cur=-1;for(var i=0;i<n;i++)if(time>=T[i]-Math.min(0.4,(T[i]-(i?T[i-1]:0))*0.75))cur=i;\n';
        var P = jzShapeLayer(ctx, 'hr planchette', bx, by);
        var poly = [[0, -pr * 2.3], [pr * 1.5, pr * 0.4], [pr * 0.9, pr * 1.3], [-pr * 0.9, pr * 1.3], [-pr * 1.5, pr * 0.4]];
        var g1 = jzGrp(P, 'lens'); jzAddEllipse(g1, pr * 1.24, pr * 1.24, 0, -pr * 0.75); jzAddStroke(g1, pc, lw * 1.4);
        ahr_path(P, 'body', poly, { closed: true, stroke: pc, sw: lw * 1.4, fill: jzMixHex(plate, sc.fg, 0.12), fop: 85 });
        jzSetExpr(jzXf(P, 'ADBE Position'), HP + 'var px=' + jzN(bx) + ',py=' + jzN(by + bh * 0.1) + ';' +
            'if(cur>=0){var tA=cur?T[cur-1]:0,tB=T[cur],mv=Math.min(0.4,(tB-tA)*0.75);var ax=cur?X[cur-1]:px,ay=cur?Y[cur-1]:py;var k=ioc((time-(tB-mv))/mv);px=ax+(X[cur]-ax)*k+Math.sin(k*Math.PI)*' + jzN(bh * 0.06) + ';py=ay+(Y[cur]-ay)*k+' + jzN(bf * 1.2) + ';}else py+=' + jzN(bf * 1.2) + ';' +
            'px+=Math.sin(time*2.1+' + (s % 97) + ')*' + jzN(bf * 0.12) + ';py+=Math.cos(time*1.7+' + (s % 97) + ')*' + jzN(bf * 0.1) + ';[px,py]');
        ahr_fade(ctx, P, 0, 0.35);
        jzNoGhost(P);
        // the letter under the planchette lights up in the accent
        if (n2) {
            var HL = jzText(ctx, TC[0], { font: fontB, size: bf * 1.25, color: sc.accent, x: TX[0], y: TY[0], name: 'hr board lit' });
            jzSetExpr(HL.property('ADBE Text Properties').property('ADBE Text Document'), HP + 'var C=' + ahr_strs(TC) + ';C[Math.max(0,cur)]');
            jzSetExpr(jzXf(HL, 'ADBE Position'), HP + '[X[Math.max(0,cur)],Y[Math.max(0,cur)]]');
            jzSetExpr(jzXf(HL, 'ADBE Rotate Z'), 'var R=' + ahr_arr(TR) + ',T=' + ahr_arr(times) + ',n=T.length,cur=-1;for(var i=0;i<n;i++)if(time>=T[i]-Math.min(0.4,(T[i]-(i?T[i-1]:0))*0.75))cur=i;R[Math.max(0,cur)]');
            jzSetExpr(jzXf(HL, 'ADBE Opacity'), HP + 'var nx=cur+1<n?T[cur+1]-Math.min(0.4,(T[cur+1]-T[cur])*0.75):1e9;(cur>=0&&time>=T[cur]-0.02&&time<nx)?100*K:0');
            jzNoGhost(HL);
        }
        // the lyric: one layer per glyph, each entering when it is spelled out
        var bb = null, stg = c.stagger || 0.04;
        for (i = 0; i < sl.length && i < n2; i++) {
            var G = jzMain(ctx, sl[i].ch, { font: font, size: size, color: sc.fg, x: sl[i].x, y: sl[i].y, mi: Math.max(0, times[i]) / stg, name: sl[i].ch });
            bb = jzUnion(bb, jzBB(G));
        }
        return bb || ahr_box(W * 0.2, rowY - size, W * 0.8, rowY + size);
    }
});

/* ================================================================ 6. hrMissing — 尋ね人 */
jzReg('layout', 'hrMissing', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), fontH: rng.pick(jzFontsOf(st, ['display'])), ang: rng.range(-3.5, 3.5), off: rng.range(-0.06, 0.06), torn: rng.int(1, 3), stains: rng.int(1, 3) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = jzPortrait(ctx), s = c.seed | 0, u = jzU(ctx), i, k;
        var ph = H * 0.9, pw = Math.min(W * (port ? 0.86 : 0.5), ph * 0.72), cx = W / 2 + jzP(ctx, 'off', 0) * W * (port ? 0.3 : 1), cy = H / 2;
        var paper = ahr_dark(sc.bg) ? jzMixHex(ahr_light(sc), sc.sub, 0.12) : jzMixHex(sc.bg, '#FFFFFF', 0.62), ink = ahr_onCol(sc, paper), red = jzFitContrast(sc.accent, paper, 2.4);
        var x0 = cx - pw / 2, y0 = cy - ph / 2, TH0 = jzTH(ctx), kids = [];
        // the poster: shadow + paper, stains, photo with a faceless silhouette, tape, tear-off tabs (one shape layer)
        var S = jzShapeLayer(ctx, 'hr poster', 0, 0), sil = jzMixHex(ink, paper, 0.05), photo = jzMixHex(ink, paper, 0.25);
        var fw = pw * 0.52, fh = fw * 1.18, fxl = cx - fw / 2, fy = y0 + ph * 0.17;
        var tabs = 7, tw = pw / tabs, ty = y0 + ph * 0.86, th = ph * 0.14, line = jzMixHex(paper, ink, 0.4), gt = jzGrp(S, 'tabs');
        jzAddPath(gt, [[x0, ty], [x0 + pw, ty]], false);
        for (k = 0; k < tabs; k++) if (ahr_h(s, k, 61) % 7 >= jzP(ctx, 'torn', 2)) jzAddPath(gt, [[x0 + k * tw, ty], [x0 + k * tw, ty + th]], false);
        jzAddStroke(gt, line, Math.max(1, u * 0.001));
        var sg = [-1, 1];
        for (k = 0; k < 2; k++) {
            var gtp = jzGrp(S, 'tape' + k);
            jzAddRect(gtp, pw * 0.2, pw * 0.06, 0);
            jzAddFill(gtp, jzMixHex(paper, sc.sub, 0.25), 70);
            jzGX(gtp).property('ADBE Vector Position').setValue([cx + sg[k] * pw * 0.4, y0 + ph * 0.005]);
            jzGX(gtp).property('ADBE Vector Rotation').setValue(sg[k] * 28);
        }
        var gs = jzGrp(S, 'silhouette');
        jzAddEllipse(gs, fw * 0.4, fw * 0.4, cx, fy + fh * 0.42);
        jzAddPath(gs, [[cx - fw * 0.42, fy + fh], [cx - fw * 0.36, fy + fh * 0.76], [cx - fw * 0.12, fy + fh * 0.66], [cx + fw * 0.12, fy + fh * 0.66], [cx + fw * 0.36, fy + fh * 0.76], [cx + fw * 0.42, fy + fh]], true);
        jzAddFill(gs, sil);
        var gp = jzGrp(S, 'photo'); jzAddRect(gp, fw, fh, 0, cx, fy + fh / 2); jzAddFill(gp, photo);
        var gst = jzGrp(S, 'stains');
        for (k = 0; k < jzP(ctx, 'stains', 2); k++) {
            var sx = x0 + pw * ahr_rr(0.22, 0.78, s, k, 1), sy = y0 + ph * ahr_rr(0.2, 0.8, s, k, 2), R = pw * ahr_rr(0.05, 0.12, s, k, 3), pts = [];
            for (i = 0; i < 12; i++) { var a = i / 12 * Math.PI * 2, rr = R * (0.7 + 0.5 * ahr_r(s, k, i, 4)); pts.push([sx + Math.cos(a) * rr, sy + Math.sin(a) * rr * 0.8]); }
            jzAddPath(gst, pts, true);
        }
        jzAddFill(gst, jzMixHex(paper, sc.sub, 0.35), 35);
        var gpa = jzGrp(S, 'paper'); jzAddRect(gpa, pw, ph, 0, cx, cy); jzAddFill(gpa, paper);
        var gsh = jzGrp(S, 'shadow'); jzAddRect(gsh, pw, ph, 0, cx + u * 0.012, cy + u * 0.016); jzAddFill(gsh, '#000000', 25);
        kids.push(S);
        // texts on the poster
        var hs = pw * 0.15, mono = jzMonoF(ctx), fs = pw * 0.034, ly = fy + fh + ph * 0.24;
        var MH = jzText(ctx, 'MISSING', { font: jzP(ctx, 'fontH', jzFontKeyOf(ctx.st, 'display')), size: hs, color: red, x: cx, y: y0 + ph * 0.09, track: 0.08, sx: 0.92 });
        var MW = jzSize(MH)[0]; if (MW > pw * 0.94) jzXf(MH, 'ADBE Scale').setValue([92 * pw * 0.94 / MW, 100 * pw * 0.94 / MW]);
        kids.push(MH);
        kids.push(jzText(ctx, 'LAST SEEN ' + ahr_date(s, '.') + '  ' + ahr_clock(s, 0).substr(0, 5), { font: mono, size: fs, color: ink, x: cx, y: ly, track: 0.06, opacity: 0.85 }));
        var sub = jzFlat(c.lineText || c.text), sa = jzChars(sub);
        kids.push(jzText(ctx, sa.length > 22 ? sa.slice(0, 21).join('') + '…' : sub, { font: jzBodyF(ctx), size: fs * 1.05, color: ink, x: cx, y: ly + fs * 1.7, track: 0.05, opacity: 0.7 }));
        var tel = 'TEL 0' + (ahr_h(s, 7) % 90 + 10) + '-' + (ahr_h(s, 8) % 9000 + 1000), rowsT = [];
        for (k = 0; k < tabs; k++) rowsT.push(ahr_h(s, k, 61) % 7 < jzP(ctx, 'torn', 2) ? ' ' : tel);
        var TT = jzText(ctx, rowsT.join('\r'), { font: mono, size: Math.min(tw * 0.42, th * 0.1), color: ink, x: cx, y: ty + th / 2, leading: tw, opacity: 0.8, name: 'hr tabs' });
        jzXf(TT, 'ADBE Rotate Z').setValue(-90);
        kids.push(TT);
        for (i = 0; i < kids.length; i++) { jzSetExpr(jzXf(kids[i], 'ADBE Opacity'), TH0 + 'value*K'); jzNoGhost(kids[i]); }
        // the lyric as the name
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display'));
        var L = ahr_fit(ctx, jzSplitLines(jzFlat(c.text), port ? 6 : 7), { font: font, color: ink, x: cx, y: fy + fh + ph * 0.1, track: 0.04, lead: 1.1, maxW: pw * 0.86, maxH: ph * 0.13, maxSize: pw * 0.16 });
        var bb = jzBB(L);
        jzAnimate(ctx, L, { mi: 0 });
        kids.push(L);
        // everything rides on a null: tilt + the slap onto the wall (scale 1.06 -> 1 with overshoot)
        var N = ctx.comp.layers.addNull(ctx.comp.duration); N.name = 'hr poster pin';
        jzXf(N, 'ADBE Anchor Point').setValue([0, 0]); jzXf(N, 'ADBE Position').setValue([cx, cy]);
        for (i = 0; i < kids.length; i++) kids[i].parent = N;
        jzXf(N, 'ADBE Rotate Z').setValue(jzP(ctx, 'ang', 0));
        jzSetExpr(jzXf(N, 'ADBE Scale'), JZ_FNS + 'var q=ob(cl(time/0.3),1.3);var k=time<=0?0:(1.06-0.06*q)*100;[k,k]');
        return bb;
    }
});
