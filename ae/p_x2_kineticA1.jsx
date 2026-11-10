// ================================================================ x2kineticA part 1 (AE port of src/11p_x2_kineticA.js — キネティック 追加分2)
// Shared helpers (prefix akza_) + the word-driven layouts kzShove … kzSagLine. Part 2 (p_x2_kineticA2.jsx) holds the layouts
// kzSlingshot … kzInchworm, the motion-accent decor and the moving backgrounds.
// Layout pattern (same as the kinetic set, ae/p_kinetic1.jsx): every word is its own text layer parented to a null ("rig").
// The rig carries the layout's choreography — an embedded function U(i, t) -> [x, y, sx, sy, rot, alpha] evaluated in the
// rig's position / scale / rotation expressions — and the text layer keeps the cut's own enter / hold / exit / treatment.
// Word onsets are spread evenly over the cut (no beat grid in AE). Line work (belts, rods, bands, marks …) is drawn on the
// main pass only in the browser, so those shape layers are kept out of the ghosts (jzNoGhost); shapes that change form
// use createPath().

// ---------------------------------------------------------------- shared helpers
// easing / helpers for expressions (added to JZ_FNS: cl oe ioe oc ic iq ie ob bo)
var AKZA_FNS = 'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}function lrp(a,b,t){return a+(b-a)*t;}' +
    'function sprg(t,k,f){return t<=0?1:Math.exp(-k*t)*Math.cos(f*t);}function spr(t,k,f){return 1-sprg(t,k,f);}function pls(t,k,f){return t<=0?0:Math.exp(-k*t)*Math.sin(f*t);}' +
    'function smo(a,b,x){x=cl((x-a)/(b-a));return x*x*(3-2*x);}function ios(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}function oq(x){x=cl(x);return 1-(1-x)*(1-x);}' +
    'function cix(ts,t){var k=-1;for(var q=0;q<ts.length;q++)if(t>=ts[q])k=q;return k;}function rvx(x,y,a){var c=Math.cos(a*0.0174533),s=Math.sin(a*0.0174533);return [x*c-y*s,x*s+y*c];}' +
    'function wr(v,m){return ((v%m)+m)%m;}\n';
// numbers / nested arrays as expression source; akza_D({ A: 1, B: [..] }) -> 'var A=1,B=[..];'
function akza_v(v) {
    if (v && typeof v === 'object' && typeof v.length === 'number') { var s = [], i; for (i = 0; i < v.length; i++) s.push(akza_v(v[i])); return '[' + s.join(',') + ']'; }
    if (v === true) return '1';
    if (v === false) return '0';
    return typeof v === 'number' ? jzN(v) : String(v);
}
function akza_D(o) { var s = [], k; for (k in o) if (o.hasOwnProperty(k)) s.push(k + '=' + akza_v(o[k])); return s.length ? 'var ' + s.join(',') + ';' : ''; }
// expression header inside the content comp: timing (DUR, IN, OS, OD, PO, K = fade with the cut's exit) + easings + W, H + data + code
function akza_H(ctx, data, code) { return jzTH(ctx) + AKZA_FNS + 'var W=' + jzN(ctx.W) + ',H=' + jzN(ctx.H) + ';' + akza_D(data || {}) + (code || '') + '\n'; }
function akza_cx(hex) { var c = jzHex(hex); return '[' + jzN(c[0]) + ',' + jzN(c[1]) + ',' + jzN(c[2]) + ',1]'; }
function akza_pl(a, k) { var o = [], i; for (i = 0; i < a.length; i++) o.push(a[i][k]); return o; }
// the browser's numeric hash J.h / J.r / J.rs (seeded placements match the web frame)
function akza_h(a, b, c, d, e) {
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
function akza_r(a, b, c, d, e) { return akza_h(a, b, c, d, e) / 4294967296; }
function akza_rs(a, b, c, d, e) { return akza_r(a, b, c, d, e) * 2 - 1; }
// colours that read on the background
function akza_acc(sc) { return jzContrast(sc.accent, sc.bg) >= 1.7 ? sc.accent : sc.fg; }
function akza_sub(sc) { return jzContrast(sc.sub, sc.bg) >= 1.4 ? sc.sub : sc.fg; }
function akza_tall(ctx) { return ctx.W < ctx.H * 1.45; }
function akza_font(ctx, role) { return jzP(ctx, 'font', jzFontKeyOf(ctx.st, role || 'display')); }

// ---- word units: the cut's word chunks, merged / split to a usable count (browser unitsOf / wu)
function akza_gc(t) { return jzCount(t); }
function akza_splitUnit(s) {
    var t = jzTrim(s), i;
    if (/\s/.test(t)) {
        var mid = t.length / 2, bi = -1, bd = 1e9;
        for (i = 0; i < t.length; i++) if (t.charAt(i) === ' ' && Math.abs(i - mid) < bd) { bd = Math.abs(i - mid); bi = i; }
        return [jzTrim(t.substr(0, bi)), jzTrim(t.substr(bi + 1))];
    }
    var n = jzChars(t).length, parts = jzSplitLines(t, Math.ceil(n / 2)).split('\r');
    return parts.length >= 2 ? [parts[0], parts.slice(1).join('')] : [t];
}
function akza_units(cut, maxU, minU) {
    var text = String(cut.text || ''), lat = jzHasLatin(text), w = [], src = (cut.words && cut.words.length) ? cut.words : (lat ? text.split(/\s+/) : jzChunk(text)), i, g, s;
    for (i = 0; i < src.length; i++) { s = jzTrim(String(src[i])); if (s) w.push(s); }
    if (jzStrip(w.join('')) !== jzStrip(text)) { w = []; src = lat ? text.split(/\s+/) : jzChunk(text); for (i = 0; i < src.length; i++) { s = jzTrim(String(src[i])); if (s) w.push(s); } }
    if (!w.length) w = [jzTrim(text) || '…'];
    while (w.length > maxU) {
        var bi = 0, bv = 1e9;
        for (i = 0; i < w.length - 1; i++) { var v = akza_gc(w[i]) + akza_gc(w[i + 1]); if (v < bv) { bv = v; bi = i; } }
        w.splice(bi, 2, w[bi] + (lat ? ' ' : '') + w[bi + 1]);
    }
    for (g = 0; g < 8 && w.length < minU; g++) {
        var bj = -1, bn = 1;
        for (i = 0; i < w.length; i++) { var n = akza_gc(w[i]), ok = /\s/.test(w[i]) || (!jzHasLatin(w[i]) && n >= 2); if (ok && n > bn) { bn = n; bj = i; } }
        if (bj < 0) break;
        var parts = akza_splitUnit(w[bj]);
        if (parts.length < 2 || !parts[0] || !parts[1]) break;
        w.splice(bj, 1, parts[0], parts[1]);
    }
    return w;
}
// at most mxL / mxP (portrait) units, and enough of them that long lyrics can wrap
function akza_wu(ctx, mxL, mxP, mn) {
    var mx = jzPortrait(ctx) ? mxP : mxL;
    if (mn == null) mn = 2;
    return akza_units(ctx.cut, mx, jzClamp(Math.ceil(akza_gc(ctx.cut.text) / (akza_tall(ctx) ? 4 : 6)), Math.min(mn, mx), mx));
}
// word clock: onset of each unit inside the cut
function akza_onsets(cut, n, frac, gap) {
    var dur = cut.dur || 2, last = Math.max(0, Math.min(dur * frac, (n - 1) * gap)), v = [], i;
    for (i = 0; i < n; i++) v.push(n > 1 ? last * i / (n - 1) : 0);
    return v;
}
function akza_mi(ctx, t) { return Math.max(0, t) / Math.max(0.005, ctx.cut.stagger || 0.04); }
// index of the "key" word: the longest unit (r picks among ties)
function akza_keyOf(units, r) {
    var g = [], m = 0, c = [], i;
    for (i = 0; i < units.length; i++) { g.push(akza_gc(units[i])); if (g[i] > m) m = g[i]; }
    for (i = 0; i < g.length; i++) if (g[i] === m) c.push(i);
    return c[((r | 0) % c.length + c.length) % c.length];
}
// measuring with a probe layer (size 100): [w, h] per 1 px of font size
var AKZA_MEAS = {};
function akza_m(ctx, text, font, track) {
    var key = [text, font, track || 0].join('\u0001');
    if (AKZA_MEAS[key]) return AKZA_MEAS[key];
    var P = jzText(ctx, text, { font: font, size: 100, color: '#FFFFFF', x: -9999, y: -9999, track: track || 0 });
    var s = jzSize(P); P.remove();
    var r = { w: Math.max(0.05, s[0] / 100), h: Math.max(0.05, s[1] / 100) };
    AKZA_MEAS[key] = r;
    return r;
}
function akza_em(ctx, text, font, track) { return akza_m(ctx, text, font, track).w; }
function akza_fit(ctx, text, font, maxW, maxH, track) { var m = akza_m(ctx, text, font, track); return Math.min(maxW / m.w, maxH / m.h); }
// flow units into balanced lines (browser flowUnits); pos = unit centres relative to the block centre, a / b = first / last unit of its line
function akza_parts(n, L) {
    var out = [];
    function rec(start, left, acc) {
        if (out.length >= 80) return;
        if (left === 1) { out.push(acc.concat([[start, n]])); return; }
        for (var e = start + 1; e <= n - left + 1; e++) rec(e, left - 1, acc.concat([[start, e]]));
    }
    if (L >= 1 && L <= n) rec(0, L, []);
    return out;
}
function akza_flow(ctx, units, font, maxW, maxH, o) {
    o = o || {};
    var lat = false, i, L, q, li;
    for (i = 0; i < units.length; i++) if (jzHasLatin(units[i])) lat = true;
    var sp = o.sp != null ? o.sp : (lat ? 0.32 : 0.08), lead = o.lead || 1.22, track = o.track || 0, ws = [], n = units.length, best = null;
    for (i = 0; i < n; i++) ws.push(akza_em(ctx, units[i], font, track));
    for (L = 1; L <= Math.min(n, o.maxLines || 4); L++) {
        var pts = akza_parts(n, L), bp = null, bw = 1e9;
        for (q = 0; q < pts.length; q++) {
            var lw = [], mw = 0;
            for (li = 0; li < pts[q].length; li++) { var a = pts[q][li][0], b = pts[q][li][1], w = 0; for (i = a; i < b; i++) w += ws[i] + (i > a ? sp : 0); lw.push(w); if (w > mw) mw = w; }
            if (mw < bw) { bw = mw; bp = { pt: pts[q], lw: lw }; }
        }
        if (!bp) continue;
        var size = Math.min(maxW / bw, maxH / (L * lead - (lead - 1)), o.maxSize || 1e9);
        if (!best || size > best.size * (o.lineBonus || 1.1)) best = { size: size, L: L, pt: bp.pt, lw: bp.lw };
    }
    var S = best.size, pos = [], mx = 0, lwp = [];
    for (li = 0; li < best.pt.length; li++) {
        var y = (li - (best.L - 1) / 2) * lead * S, x = -best.lw[li] * S / 2;
        if (best.lw[li] > mx) mx = best.lw[li];
        lwp.push(best.lw[li] * S);
        for (i = best.pt[li][0]; i < best.pt[li][1]; i++) { var ww = ws[i] * S; pos[i] = { x: x + ww / 2, y: y, w: ww, li: li, a: best.pt[li][0], b: best.pt[li][1] - 1 }; x += ww + sp * S; }
    }
    return { size: S, pos: pos, L: best.L, w: mx * S, h: (best.L * lead - (lead - 1)) * S, ws: ws, sp: sp, lw: lwp, pt: best.pt };
}

// ---- layers
function akza_null(ctx, name, x, y) {
    var N = ctx.comp.layers.addNull(ctx.comp.duration); N.name = name;
    jzXf(N, 'ADBE Anchor Point').setValue([0, 0]); jzXf(N, 'ADBE Position').setValue([x, y]);
    return jzNoGhost(N);
}
// box of a text layer made with jzText at (x, y) with the given alignment
function akza_bbT(L, x, y, align) {
    var s = jzSize(L), x0 = align === 'left' ? x : (align === 'right' ? x - s[0] : x - s[0] / 2);
    return { x0: x0, x1: x0 + s[0], y0: y - s[1] / 2, y1: y + s[1] / 2, cx: x0 + s[0] / 2, cy: y };
}
// a lyric piece on a rig. o: jzText options + mi, noHold, H (header that defines the rig function), I (unit index), fn (rig function
// name, default U), use ('p' position, 's' scale, 'r' rotation; default all), a (true: u[5] is an alpha 0..1),
// tint ([hex, expression 0..100]: the glyphs take that colour by that amount)
function akza_word(ctx, str, o) {
    var N = akza_null(ctx, 'kz rig ' + String(str).substr(0, 12), o.x, o.y), L = jzText(ctx, str, o), bb = akza_bbT(L, o.x, o.y, o.align);
    L.parent = N;
    var u = 'var u=' + (o.fn || 'U') + '(' + o.I + ',time);', use = o.use || 'psr';
    if (o.a) jzAnimator(L, 'JZ Layout Alpha', [['ADBE Text Opacity', 0]], o.H + u + '(1-cl(u[5]))*100');
    if (o.tint) jzAnimator(L, 'JZ Layout Colour', [['ADBE Text Fill Color', jzHex(o.tint[0])]], o.H + o.tint[1]);
    jzAnimate(ctx, L, { mi: o.mi || 0, noHold: o.noHold });
    if (use.indexOf('p') >= 0) jzSetExpr(jzXf(N, 'ADBE Position'), o.H + u + '[u[0],u[1]]');
    if (use.indexOf('s') >= 0) jzSetExpr(jzXf(N, 'ADBE Scale'), o.H + u + '[u[2]*100,u[3]*100]');
    if (use.indexOf('r') >= 0) jzSetExpr(jzXf(N, 'ADBE Rotate Z'), o.H + u + 'u[4]');
    return { N: N, L: L, bb: bb };
}
function akza_bbL(list) { var b = null, i; for (i = 0; i < list.length; i++) b = jzUnion(b, list[i].bb); return b; }
// main-pass line work
function akza_shape(ctx, name, x, y) { return jzNoGhost(jzShapeLayer(ctx, name, x || 0, y || 0)); }
function akza_op(L, ex) { jzSetExpr(jzXf(L, 'ADBE Opacity'), ex); }
function akza_gop(g, ex) { jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), ex); }
// add a path whose form is an expression (ending in createPath(...)) to group g
function akza_px(g, ex, closed) { var p = jzAddPath(g, [[0, 0], [1, 0]], !!closed); jzSetExpr(p.property('ADBE Vector Shape'), ex); }
// one stroked expression path as its own group; returns the group
function akza_line(S, name, ex, col, lw, op) { var g = jzGrp(S, name); akza_px(g, ex, false); jzAddStroke(g, col, lw, op); return g; }
function akza_rep(g, copies, dx, dy) {
    var rp = jzVecs(g).addProperty('ADBE Vector Filter - Repeater');
    rp.property('ADBE Vector Repeater Copies').setValue(copies);
    jzVecs(g).property('ADBE Vector Filter - Repeater').property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([dx, dy]);
}

/* ================================================================================================ LAYOUTS */

/* 1 kzShove — 押し出し列: every new word rams the row from the right; the row gives way as a chain and re-centres */
jzReg('layout', 'kzShove', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), hot: rng.chance(0.65), mark: rng.chance(0.7), from: rng.pick(['side', 'side', 'diag']) }; },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, m, s, p;
        var font = akza_font(ctx), units = akza_wu(ctx, 5, 6), n = units.length, ts = akza_onsets(c, n, 0.45, 0.36);
        var F = akza_flow(ctx, units, font, W * 0.84, H * (port ? 0.5 : 0.44), { maxLines: akza_tall(ctx) ? 4 : 2, maxSize: H * (port ? 0.12 : 0.2), track: 0.02 });
        var size = F.size, accC = akza_acc(sc), cx = W / 2, cy = H / 2, hot = jzP(ctx, 'hot', false);
        var HD = akza_H(ctx, { TS: ts, PX: akza_pl(F.pos, 'x'), PY: akza_pl(F.pos, 'y'), PW: akza_pl(F.pos, 'w'), PA: akza_pl(F.pos, 'a'), PB: akza_pl(F.pos, 'b'), SZ: size, FLY: 0.13,
            DG: jzP(ctx, 'from', 'side') === 'diag' ? 1 : 0, CX: cx, CY: cy },
            'function off(a,j){return -(PX[a]-PW[a]/2+PX[j]+PW[j]/2)/2;}' +
            'function U(I,t){var k=cix(TS,t);if(k<I)k=I;var a=PA[I],j=Math.min(k,PB[I]),hit=TS[j]+FLY,oN=off(a,j),oO=j>a?off(a,j-1):oN,d=j-I,tau=t-hit-d*0.03;' +
            'var x=PX[I]+oN+(oO-oN)*sprg(tau,8,15),y=PY[I],sx=1,rot=0;' +
            'if(I===j){var f=1-iq((t-TS[I])/FLY);x+=W*0.75*f;if(DG)y-=SZ*1.2*f;if(tau>0){sx=1-0.16*Math.exp(-tau*13);x-=PW[I]*(1-sx)/2;}}else rot=-3.5*pls(tau,8,18)*Math.pow(0.7,d-1);' +
            'return [CX+x,CY+y,sx,1,rot,1];}');
        var Ls = [];
        for (i = 0; i < n; i++) {
            p = F.pos[i];
            Ls.push(akza_word(ctx, units[i], { font: font, size: size, color: sc.fg, x: cx + p.x, y: cy + p.y, track: 0.02, mi: akza_mi(ctx, ts[i]), H: HD, I: i,
                tint: hot ? [accC, i < n - 1 ? '(1-cl((time-TS[' + (i + 1) + ']-FLY)/0.3))*100' : '100'] : null }));
        }
        // impact marks at the joint where a word hits its line
        if (jzP(ctx, 'mark', false)) {
            var lw = Math.max(2 * ctx.u, u * 0.004), S = null;
            for (i = 0; i < n; i++) {
                p = F.pos[i];
                if (i <= p.a) continue;
                if (!S) S = akza_shape(ctx, 'kz shove marks');
                var g = jzGrp(S, 'mark ' + i), M = 'var tau=time-TS[' + i + ']-FLY,q=tau/0.32,e=oe(q),jx=CX+PX[' + i + ']-PW[' + i + ']/2+off(' + p.a + ',' + (i - 1) + ')-SZ*0.03,yy=CY+PY[' + i + '];';
                for (s = -1; s <= 1; s += 2) for (m = 0; m < 2; m++) {
                    akza_px(g, HD + M + 'var y0=yy+(' + s + ')*SZ*(0.5+0.22*e),y1=y0+(' + s + ')*SZ*0.2*(1-q),dx=(' + (m ? -1 : 0.4) + ')*SZ*0.16*(0.4+e);createPath([[jx+dx*0.5,y0],[jx+dx,y1]],[],[],false)');
                }
                jzAddStroke(g, accC, lw);
                akza_gop(g, HD + M + '(tau>0&&tau<0.32)?(1-q)*K*100:0');
            }
        }
        return akza_bbL(Ls);
    }
});

/* 2 kzConveyor — コンベア: the words ride in on belts that brake to a halt; the key word hops when the belt stops */
jzReg('layout', 'kzConveyor', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), dir: rng.pick([1, -1]), key: rng.int(0, 5), rollers: rng.chance(0.7), alt: rng.chance(0.6) }; },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = jzPortrait(ctx), i, li, k;
        var font = akza_font(ctx), units = akza_wu(ctx, 5, 6, 1), n = units.length;
        var F = akza_flow(ctx, units, font, W * 0.84, H * (port ? 0.5 : 0.42), { maxLines: akza_tall(ctx) ? 3 : 2, maxSize: H * (port ? 0.11 : 0.17), lead: 1.75, track: 0.02 });
        var size = F.size, T = jzClamp(c.dur * 0.34, 0.4, 0.95), key = akza_keyOf(units, jzP(ctx, 'key', 0)), accC = akza_acc(sc), subC = akza_sub(sc);
        var cx = W / 2, cy = H / 2 - size * 0.12, th = Math.max(3 * ctx.u, size * 0.07), dir0 = jzP(ctx, 'dir', 1), alt = jzP(ctx, 'alt', false), DR = [], LY = [];
        for (li = 0; li < F.L; li++) { DR.push((alt && li % 2 ? -1 : 1) * dir0); LY.push(cy + (li - (F.L - 1) / 2) * 1.75 * size); }
        var HD = akza_H(ctx, { PX: akza_pl(F.pos, 'x'), LI: akza_pl(F.pos, 'li'), DR: DR, LY: LY, TT: T, TH0: T + 0.16, KEY: n > 1 ? key : -1, SZ: size, CX: cx },
            'function SS(li,t){return DR[li]*W*1.15*(1-oc((t-li*0.06)/TT));}' +
            'function U(I,t){var li=LI[I],tau=t-TT-li*0.06,x=CX+PX[I]+SS(li,t),y=LY[li],rot=-DR[li]*5*pls(tau,5.5,13),sy=1;' +
            'if(I===KEY){var hq=cl((t-TH0)/0.36);y-=SZ*0.5*Math.sin(Math.PI*hq);if(hq>=1){sy=1-0.2*Math.exp(-(t-TH0-0.36)*12);y+=SZ*(1-sy)*0.5;}}return [x,y,1,sy,rot,1];}');
        var Ls = [];
        for (i = 0; i < n; i++) {
            Ls.push(akza_word(ctx, units[i], { font: font, size: size, color: sc.fg, x: cx + F.pos[i].x, y: LY[F.pos[i].li], track: 0.02, mi: i, H: HD, I: i,
                tint: (n > 1 && i === key) ? [accC, 'cl((time-TH0)/0.36)>0.5?100:0'] : null }));
        }
        var E0 = 'var e0=oe(time/0.3);';
        for (li = 0; li < F.L; li++) {
            var by = LY[li] + size * 0.62, d = DR[li];
            // the belt + its running marks
            var B = akza_shape(ctx, 'kz belt', d > 0 ? W : 0, by + th / 2), g = jzGrp(B, 'belt');
            jzAddRect(g, W, th, 0, d > 0 ? -W / 2 : W / 2, 0); jzAddFill(g, subC);
            jzSetExpr(jzXf(B, 'ADBE Scale'), HD + E0 + '[e0*100,100]');
            akza_op(B, HD + '85*K');
            var gs = size * 0.8, m0 = Math.min(70, Math.ceil(W / gs) + 1), tw = Math.max(2 * ctx.u, size * 0.03);
            var Tk = akza_shape(ctx, 'kz belt marks', 0, by + th), g2 = jzGrp(Tk, 'marks');
            jzAddRect(g2, tw, size * 0.09, 0, tw / 2, size * 0.045); jzAddFill(g2, subC);
            akza_rep(g2, m0 + 2, gs, 0);
            jzSetExpr(jzXf(Tk, 'ADBE Position'), HD + 'var g=' + jzN(gs) + ';[wr(SS(' + li + ',time),g)-g*1.5,' + jzN(by + th) + ']');
            akza_op(Tk, HD + E0 + '55*K*e0');
            if (jzP(ctx, 'rollers', false)) for (k = 0; k < 2; k++) {
                var r = size * 0.2, Ro = akza_shape(ctx, 'kz roller', W * (k ? 0.84 : 0.16), by + th + size * 0.14 + r), g3 = jzGrp(Ro, 'roller');
                jzAddEllipse(g3, r * 2, r * 2); jzAddPath(g3, [[-r, 0], [r, 0]], false); jzAddPath(g3, [[0, -r], [0, r]], false);
                jzAddStroke(g3, subC, Math.max(2 * ctx.u, size * 0.03));
                jzSetExpr(jzXf(Ro, 'ADBE Scale'), HD + E0 + '[e0*100,e0*100]');
                jzSetExpr(jzXf(Ro, 'ADBE Rotate Z'), HD + 'SS(' + li + ',time)/' + jzN(r) + '*57.2958');
                akza_op(Ro, HD + '80*K');
            }
        }
        // the key word's stretch of belt lights up when it lands
        if (n > 1) {
            var kp = F.pos[key], Mk = akza_shape(ctx, 'kz key mark', cx + kp.x, LY[kp.li] + size * 0.62 + th / 2), g4 = jzGrp(Mk, 'mark');
            jzAddRect(g4, kp.w, th); jzAddFill(g4, accC);
            jzSetExpr(jzXf(Mk, 'ADBE Scale'), HD + '[oe((time-TH0-0.34)/0.3)*100,100]');
            akza_op(Mk, HD + 'K*100');
        }
        return akza_bbL(Ls);
    }
});

/* 3 kzSwingKnock — スイング打ち: each word swings in on a long rod like a wrecking ball; the hit sends a tilt wave down the row */
jzReg('layout', 'kzSwingKnock', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), R: rng.pick([0.55, 0.9, 0.9]), amp: rng.range(30, 40), rod: rng.chance(0.75), acc: rng.int(0, 5) }; },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i;
        var font = akza_font(ctx), units = akza_wu(ctx, 5, 6), n = units.length, ts = akza_onsets(c, n, 0.46, 0.42);
        var F = akza_flow(ctx, units, font, W * 0.8, H * (port ? 0.46 : 0.4), { maxLines: akza_tall(ctx) ? 4 : 2, maxSize: H * (port ? 0.12 : 0.19), lead: 1.3, track: 0.02 });
        var size = F.size, R = H * jzP(ctx, 'R', 0.9), cx = W / 2, cy = H / 2 + size * 0.1, accC = akza_acc(sc), subC = akza_sub(sc), acc = jzP(ctx, 'acc', 0);
        var HD = akza_H(ctx, { TS: ts, PX: akza_pl(F.pos, 'x'), PY: akza_pl(F.pos, 'y'), LI: akza_pl(F.pos, 'li'), RR: R, AMP: jzP(ctx, 'amp', 35), FLY: 0.2, SZ: size, CX: cx, CY: cy },
            'function AG(I,t){var k=cix(TS,t);if(k<I)k=I;var tau=t-TS[I],ang=tau<FLY?AMP*(1-iq(tau/FLY)):-AMP*0.2*pls(tau-FLY,5.5,12),dx=0;' +
            'if(I<k&&LI[k]===LI[I]){var d=k-I,t2=t-TS[k]-FLY-(d-1)*0.05,w=pls(t2,6,15)*Math.pow(0.72,d-1);ang+=7*w;dx=-SZ*0.08*w;}return [ang,dx];}' +
            'function U(I,t){var a=AG(I,t),r=a[0]*0.0174533;return [CX+PX[I]+RR*Math.sin(r)+a[1],CY+PY[I]-RR+RR*Math.cos(r),1,1,-a[0],1];}');
        var Ls = [];
        for (i = 0; i < n; i++) {
            var p = F.pos[i];
            Ls.push(akza_word(ctx, units[i], { font: font, size: size, color: i === acc % n ? accC : sc.fg, x: cx + p.x, y: cy + p.y, track: 0.02, mi: akza_mi(ctx, ts[i]), H: HD, I: i, use: 'pr' }));
            if (jzP(ctx, 'rod', false)) {
                // the rod hangs from the pivot above the frame and fades once the word has settled
                var r0 = R - size * 0.58, px = cx + p.x, py = cy + p.y - R, dd = Math.max(3 * ctx.u, size * 0.045) * 2;
                var Rd = akza_shape(ctx, 'kz rod', px, py), g = jzGrp(Rd, 'rod');
                jzAddPath(g, [[0, 0], [0, r0]], false); jzAddStroke(g, subC, Math.max(1.5 * ctx.u, u * 0.003));
                var g2 = jzGrp(Rd, 'weight');
                jzAddEllipse(g2, dd, dd, 0, r0); jzAddFill(g2, accC);
                jzSetExpr(jzXf(Rd, 'ADBE Position'), HD + '[' + jzN(px) + '+AG(' + i + ',time)[1],' + jzN(py) + ']');
                jzSetExpr(jzXf(Rd, 'ADBE Rotate Z'), HD + '-AG(' + i + ',time)[0]');
                akza_op(Rd, HD + 'var tau=time-TS[' + i + '];tau<0?0:70*(1-cl((tau-FLY-0.3)/0.35))*K');
            }
        }
        return akza_bbL(Ls);
    }
});

/* 4 kzReadLens — 読み点ズーム: the whole line is there; a reading point travels word to word and the word under it swells,
   pushing its neighbours aside */
jzReg('layout', 'kzReadLens', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), mag: rng.range(1.45, 1.7), end: rng.pick(['key', 'even', 'key']), dim: rng.chance(0.6), bar: rng.chance(0.7), key: rng.int(0, 5) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = jzPortrait(ctx), i, li, a, b;
        var font = akza_font(ctx), units = akza_wu(ctx, 6, 6), n = units.length, lat = jzHasLatin(c.text), sp = lat ? 0.36 : 0.16, lead = 1.62, ts = akza_onsets(c, n, 0.5, 0.42);
        var F = akza_flow(ctx, units, font, W * 0.84, H * (port ? 0.5 : 0.42), { maxLines: akza_tall(ctx) ? 4 : 2, maxSize: H * (port ? 0.1 : 0.16), sp: sp, lead: lead });
        var M = jzP(ctx, 'mag', 1.55), worst = 0;
        for (li = 0; li < F.pt.length; li++) {
            var lw = 0, mw = 0;
            for (i = F.pt[li][0]; i < F.pt[li][1]; i++) { lw += F.ws[i] + (i > F.pt[li][0] ? sp : 0); mw = Math.max(mw, F.ws[i]); }
            worst = Math.max(worst, lw + (M - 1) * mw);
        }
        var size = Math.min(F.size, W * 0.88 / worst), key = akza_keyOf(units, jzP(ctx, 'key', 0)), endK = jzP(ctx, 'end', 'key') === 'key', dim = jzP(ctx, 'dim', false);
        var tE = Math.max(ts[n - 1] + 0.25, Math.min(ts[n - 1] + 0.6, c.dur - (c.outDur || 0) - 0.35)), accC = akza_acc(sc), LA = [], LB = [], LY = [];
        for (i = 0; i < n; i++) { LA.push(F.pos[i].a); LB.push(F.pos[i].b + 1); LY.push(H / 2 + (F.pos[i].li - (F.L - 1) / 2) * lead * size); }
        // ST(t) -> [reading point f, strength, magnification, f before the release, release]; XW(i, s) -> [centre x, width] of word i
        var HD = akza_H(ctx, { TS: ts, WS: F.ws, LA: LA, LB: LB, LY: LY, SZ: size, SP: sp, MAG: M, KEY: key, ENDK: endK, TE: tE, DIM: dim, NU: n },
            'function ST(t){var k=Math.max(0,cix(TS,t)),str=oc(t/0.25),f=k>=1?k-1+ioc((t-TS[k])/0.22):0,rf=f,rel=ioc((t-TE)/0.4),mag=MAG;' +
            'if(ENDK){f=lrp(f,KEY,rel);mag=lrp(MAG,1+(MAG-1)*0.7,rel);}else str*=1-rel;return [f,str,mag,rf,rel];}' +
            'function SC(i,s){return 1+(s[2]-1)*smo(0,1,cl(1-Math.abs(s[0]-i)))*s[1];}' +
            'function XW(I,s){var a=LA[I],b=LB[I],tot=0,i,x,w;for(i=a;i<b;i++)tot+=WS[i]*SZ*SC(i,s)+(i>a?SP*SZ:0);x=-tot/2;' +
            'for(i=a;i<=I;i++){w=WS[i]*SZ*SC(i,s);if(i===I)return [W/2+x+w/2,w];x+=w+SP*SZ;}return [W/2,0];}' +
            'function U(I,t){var s=ST(t),z=SC(I,s),xw=XW(I,s);return [xw[0],LY[I]-(z-1)*SZ*0.3,z,z,0,DIM?lrp(0.42,1,Math.max(cl(s[3]-I+1),s[4])):1];}');
        // the resting look: the key word stays a little larger ('key'), or everything settles back ('even')
        var zf = [], bb = null;
        for (i = 0; i < n; i++) zf.push(endK && i === key ? 1 + (M - 1) * 0.7 : 1);
        for (li = 0; li < F.pt.length; li++) {
            a = F.pt[li][0]; b = F.pt[li][1];
            var tot = 0, x;
            for (i = a; i < b; i++) tot += F.ws[i] * size * zf[i] + (i > a ? sp * size : 0);
            x = -tot / 2;
            for (i = a; i < b; i++) {
                var w = F.ws[i] * size * zf[i], px = W / 2 + x + w / 2, py = LY[i] - (zf[i] - 1) * size * 0.3;
                var wd = akza_word(ctx, units[i], { font: font, size: size, color: sc.fg, x: px, y: py, mi: i, H: HD, I: i, use: 'ps', a: dim,
                    tint: [accC, 'var s=ST(time);cl(1-Math.abs(s[0]-' + i + '))*s[1]>0.5?100:0'] });
                jzXf(wd.N, 'ADBE Scale').setValue([zf[i] * 100, zf[i] * 100]);
                var hh = (wd.bb.y1 - wd.bb.y0) / 2 * zf[i];
                bb = jzUnion(bb, { x0: px - w / 2, x1: px + w / 2, y0: py - hh, y1: py + hh, cx: px, cy: py });
                x += w + sp * size;
            }
        }
        // the underline that rides with the reading point
        if (jzP(ctx, 'bar', false)) {
            var bh = Math.max(3 * ctx.u, size * 0.07), Br = akza_shape(ctx, 'kz lens bar', W / 2, H / 2), g = jzGrp(Br, 'bar');
            jzAddRect(g, 1, bh, 0, 0, bh / 2); jzAddFill(g, accC);
            var BX = HD + 'var s=ST(time),f=s[0],a=Math.min(NU-1,Math.floor(f)),b=Math.min(NU-1,a+1),fr=f-a,hop=LY[a]!==LY[b]?Math.sin(Math.PI*fr):0,A=XW(a,s),B=XW(b,s);';
            jzSetExpr(jzXf(Br, 'ADBE Position'), BX + '[lrp(A[0],B[0],fr),lrp(LY[a],LY[b],fr)+SZ*0.66]');
            jzSetExpr(jzXf(Br, 'ADBE Scale'), BX + '[lrp(A[1],B[1],fr)*(1-0.5*hop)*100,100]');
            akza_op(Br, BX + 's[1]*K*cl(time/0.2)*100');
        }
        return bb;
    }
});

/* 5 kzGateSwing — ゲート開き: words hinge on a spine and swing open like gates, one after another; open gates rattle */
jzReg('layout', 'kzGateSwing', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), mode: rng.pick(['alt', 'alt', 'left', 'right']), up: rng.pick([1, 1, -1]), acc: rng.int(0, 5), dots: rng.chance(0.75) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i;
        var font = akza_font(ctx), units = akza_wu(ctx, 4, 6), n = units.length, ts = akza_onsets(c, n, 0.46, 0.4), ms = [], mm = 0, gp = 0.3, lead = 1.24, mode = jzP(ctx, 'mode', 'alt');
        for (i = 0; i < n; i++) { ms.push(akza_em(ctx, units[i], font, 0.02)); mm = Math.max(mm, ms[i]); }
        var alt = mode === 'alt' && n > 2 && mm <= 5.2 && !port;
        var size = Math.min((alt ? W * 0.43 : W * 0.8) / (mm + gp), H * 0.72 / (n * lead), H * 0.2), SD = [], YS = [];
        for (i = 0; i < n; i++) { SD.push(alt ? (i % 2 ? -1 : 1) : (mode === 'right' ? -1 : 1)); YS.push(H / 2 + (i - (n - 1) / 2) * lead * size); }
        var spineX = alt ? W / 2 : W / 2 - SD[0] * (mm + gp) * size / 2, accC = akza_acc(sc), subC = akza_sub(sc), acc = jzP(ctx, 'acc', 0);
        var HD = akza_H(ctx, { TS: ts, SD: SD, YS: YS, UP: jzP(ctx, 'up', 1), SX: spineX, SZ: size },
            'function U(I,t){var k=cix(TS,t);if(k<I)k=I;var d=k-I,rot=-90*SD[I]*UP*sprg(t-TS[I],5.5,12);if(d>0)rot+=3*SD[I]*pls(t-TS[k]-0.08-d*0.03,6,15)*Math.pow(0.7,d-1);return [0,0,1,1,rot,1];}');
        var Ls = [];
        for (i = 0; i < n; i++) {
            Ls.push(akza_word(ctx, units[i], { font: font, size: size, color: i === acc % n ? accC : sc.fg, x: spineX + SD[i] * gp * size, y: YS[i], align: SD[i] > 0 ? 'left' : 'right', track: 0.02,
                mi: akza_mi(ctx, ts[i]), H: HD, I: i, use: 'r' }));
        }
        // the spine grows down to the newest gate
        var Sp = akza_shape(ctx, 'kz gate spine');
        akza_line(Sp, 'spine', HD + 'var k=cix(TS,time),yt=YS[0]-SZ*0.62,e=k<0?0:oe((time-TS[k])/0.3),yb=k<0?yt:lrp(YS[Math.max(0,k-1)],YS[k],e)+SZ*0.62;' +
            'createPath([[SX,yt],[SX,k<=0?lrp(yt,yb,e):yb]],[],[],false)', subC, Math.max(2 * ctx.u, u * 0.004), 90);
        akza_op(Sp, HD + 'K*100');
        if (jzP(ctx, 'dots', false)) {
            var Dt = akza_shape(ctx, 'kz gate hinges'), dd = size * 0.15;
            for (i = 0; i < n; i++) {
                var g = jzGrp(Dt, 'hinge ' + i);
                jzAddEllipse(g, dd, dd); jzAddFill(g, accC);
                jzGX(g).property('ADBE Vector Position').setValue([spineX, YS[i]]);
                jzSetExpr(jzGX(g).property('ADBE Vector Scale'), HD + 'var s=time<TS[' + i + ']?0:ob((time-TS[' + i + '])/0.25,2);[s*100,s*100]');
            }
            akza_op(Dt, HD + 'K*100');
        }
        return akza_bbL(Ls);
    }
});

/* 6 kzHopSteps — 階段ホップ: a staircase is built tread by tread and each word hops on from the previous step */
jzReg('layout', 'kzHopSteps', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), dx: rng.range(0.6, 1.05), acc: rng.int(0, 5), riser: rng.chance(0.6) }; },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, i;
        var font = akza_font(ctx), units = akza_wu(ctx, 5, 5), n = units.length, ts = akza_onsets(c, n, 0.48, 0.42), ms = [], lead = 1.34, dx = jzP(ctx, 'dx', 0.8), lo = 1e9, hi = -1e9;
        for (i = 0; i < n; i++) { ms.push(akza_em(ctx, units[i], font, 0.02)); lo = Math.min(lo, i * dx - ms[i] / 2); hi = Math.max(hi, i * dx + ms[i] / 2); }
        var size = Math.min(W * 0.82 / (hi - lo), H * 0.74 / (n * lead), H * 0.2), XS = [], YS = [], MW = [];
        for (i = 0; i < n; i++) { XS.push(W / 2 + (i * dx - (lo + hi) / 2) * size); YS.push(H / 2 + (i - (n - 1) / 2) * lead * size - size * 0.05); MW.push(ms[i] * size); }
        var accC = akza_acc(sc), subC = akza_sub(sc), lw = Math.max(3 * ctx.u, size * 0.06), pad = size * 0.14, acc = jzP(ctx, 'acc', 0);
        var HD = akza_H(ctx, { TS: ts, XS: XS, YS: YS, MW: MW, SZ: size, LS: lead * size, HOP: 0.27, PAD: pad, NU: n },
            'function DP(i,t){var tau=t-TS[i]-HOP;return tau>0?SZ*0.07*Math.exp(-tau*10)*Math.cos(tau*19):0;}' +
            'function U(I,t){var tau=t-TS[I]-HOP,dip=DP(I,t),q=cl((t-TS[I])/HOP),x0=I?XS[I-1]:XS[0]-SZ*2.2,y0=I?YS[I-1]:YS[0]-LS,' +
            'x=lrp(x0,XS[I],q),y=lrp(y0,YS[I],q)-SZ*0.85*Math.sin(Math.PI*q)+dip,sy=1,z=lrp(0.45,1,oq(q));' +
            'if(tau>0){sy=1-0.22*Math.exp(-tau*12)*Math.cos(tau*20);y+=SZ*(1-sy)*0.5;}if(I<NU-1&&t>=TS[I+1]){var pq=cl((t-TS[I+1])/0.16);sy*=1-0.12*Math.sin(Math.PI*pq);}' +
            'return [x,y,z,z*sy,12*(1-q),cl(q*5)];}');
        var Ls = [];
        for (i = 0; i < n; i++) {
            Ls.push(akza_word(ctx, units[i], { font: font, size: size, color: i === acc % n ? accC : sc.fg, x: XS[i], y: YS[i], track: 0.02, mi: akza_mi(ctx, ts[i]), H: HD, I: i, a: true }));
        }
        // treads (laid just before the hop) and risers
        var S = akza_shape(ctx, 'kz steps'), riser = jzP(ctx, 'riser', false);
        for (i = 0; i < n; i++) {
            var M = 'var te=oe((time-' + jzN(i ? ts[i] - 0.1 : 0) + ')/0.24),ty=YS[' + i + ']+SZ*0.6+DP(' + i + ',time),x0=XS[' + i + ']-MW[' + i + ']/2-PAD,on=' + (i ? 'time>=TS[' + (i - 1) + ']' : 'true') + '&&te>0;';
            var g = akza_line(S, 'tread ' + i, HD + M + 'createPath([[x0,ty],[x0+(MW[' + i + ']+PAD*2)*te,ty]],[],[],false)', subC, lw);
            akza_gop(g, HD + M + 'on?90*K:0');
            if (riser && i > 0) {
                var g2 = akza_line(S, 'riser ' + i, HD + M + 'createPath([[x0,ty],[x0,ty-(LS-' + jzN(lw) + ')*te]],[],[],false)', subC, Math.max(1.5 * ctx.u, lw * 0.4));
                akza_gop(g2, HD + M + 'on?60*K:0');
            }
        }
        return akza_bbL(Ls);
    }
});

/* 7 kzFoldOut — 折り出し: a folded leaflet: each word unfolds out of the edge of the previous one */
jzReg('layout', 'kzFoldOut', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), mode: rng.pick(['chain', 'chain', 'stack']), crease: rng.chance(0.8), acc: rng.int(0, 5) }; },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i;
        var font = akza_font(ctx), units = akza_wu(ctx, 5, 6), n = units.length, lat = jzHasLatin(c.text), ts = akza_onsets(c, n, 0.46, 0.38);
        var stack = jzP(ctx, 'mode', 'chain') === 'stack' || (port && n <= 4), lead = 1.36, sp = lat ? 0.42 : 0.26;
        var F = akza_flow(ctx, units, font, W * 0.82, H * (stack ? 0.72 : port ? 0.5 : 0.44), { maxLines: stack ? n : akza_tall(ctx) ? 4 : 2, lineBonus: stack ? 0.01 : 1.1, maxSize: H * (port ? 0.13 : 0.2), lead: lead, sp: sp });
        var size = F.size, cx = W / 2, cy = H / 2, accC = akza_acc(sc), subC = akza_sub(sc), lw = Math.max(1.5 * ctx.u, u * 0.0025), acc = jzP(ctx, 'acc', 0), VF = [];
        for (i = 0; i < n; i++) VF.push(i === F.pos[i].a ? 1 : 0);
        // a word that starts a line unfolds downwards, the others unfold sideways out of their left edge
        var HD = akza_H(ctx, { TS: ts, PX: akza_pl(F.pos, 'x'), PY: akza_pl(F.pos, 'y'), PW: akza_pl(F.pos, 'w'), VF: VF, SZ: size, CX: cx, CY: cy },
            'function FF(I,t){return Math.max(0.001,spr(t-TS[I],8.5,13));}' +
            'function U(I,t){var f=FF(I,t);return VF[I]?[CX+PX[I],CY+PY[I]-SZ/2+SZ*f/2,1,f,0,1]:[CX+PX[I]-PW[I]/2+PW[I]*f/2,CY+PY[I],f,1,0,1];}');
        var Ls = [], S = null, crease = jzP(ctx, 'crease', false);
        for (i = 0; i < n; i++) {
            var p = F.pos[i];
            var wd = akza_word(ctx, units[i], { font: font, size: size, color: i === acc % n ? accC : sc.fg, x: cx + p.x, y: cy + p.y, mi: akza_mi(ctx, ts[i]), H: HD, I: i, use: 'ps',
                tint: [subC, '(1-cl(FF(' + i + ',time)*1.2-0.2))*100'] });
            if (VF[i]) jzAnimator(wd.L, 'JZ Layout Fold Skew', [['ADBE Text Skew', -14]], HD + '(1-Math.min(1,FF(' + i + ',time)))*100');
            Ls.push(wd);
            if (!crease || (VF[i] && p.li === 0)) continue;
            if (!S) S = akza_shape(ctx, 'kz creases');
            var M = 'var ce=oe((time-TS[' + i + '])/0.3)*K;', g;
            if (VF[i]) g = akza_line(S, 'crease ' + i, HD + M + 'var y=' + jzN(cy + p.y - lead * size / 2) + ',hw=' + jzN(F.lw[p.li] / 2) + ';createPath([[CX-hw*ce,y],[CX+hw*ce,y]],[],[],false)', subC, lw);
            else g = akza_line(S, 'crease ' + i, HD + M + 'var x=' + jzN(cx + p.x - p.w / 2 - sp * size / 2) + ',y=' + jzN(cy + p.y) + ';createPath([[x,y-SZ*0.55*ce],[x,y+SZ*0.55*ce]],[],[],false)', subC, lw);
            akza_gop(g, HD + 'time<TS[' + i + ']?0:60*K');
        }
        return akza_bbL(Ls);
    }
});

/* 8 kzSagLine — たわむ線: words slide down a taut line from the edge; the line sags and bounces under each one's weight */
function akza_sagD(x, ld, W, S) {
    var d = 0, j;
    for (j = 0; j < ld.length; j++) { var aa = jzClamp(ld[j][0], 0, W); d += ld[j][1] * (x < aa ? x * (W - aa) : aa * (W - x)); }
    return d * 4 / (W * W) * S;
}
jzReg('layout', 'kzSagLine', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), sag: rng.range(0.8, 1.2), clip: rng.chance(0.75), acc: rng.int(0, 5) }; },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, li;
        var font = akza_font(ctx, 'display'), units = akza_wu(ctx, 5, 5), n = units.length, lat = jzHasLatin(c.text), ts = akza_onsets(c, n, 0.48, 0.42);
        var ropes = port ? 3 : (akza_gc(c.text) > (akza_tall(ctx) ? 6 : 10) ? 2 : 1);
        var F = akza_flow(ctx, units, font, W * 0.78, H * (port ? 0.52 : ropes > 1 ? 0.46 : 0.24), { maxLines: ropes, maxSize: H * (port ? 0.1 : 0.17), lead: 2.5, sp: lat ? 0.5 : 0.34 });
        var size = F.size, S = size * 0.55 * jzP(ctx, 'sag', 1), cx = W / 2, cy = H / 2, accC = akza_acc(sc), subC = akza_sub(sc), acc = jzP(ctx, 'acc', 0), gm = 1, MG = [], YR = [];
        for (i = 0; i < n; i++) gm = Math.max(gm, akza_gc(units[i]));
        for (i = 0; i < n; i++) MG.push(0.55 + 0.45 * akza_gc(units[i]) / gm);
        for (li = 0; li < F.L; li++) YR.push(cy + F.pos[F.pt[li][0]].y - size * 0.78 - S * 0.5);
        // LD(line, t) -> the loads on that rope [[x, mass, word] …]; DF(x, loads) -> how far the rope hangs at x
        var HD = akza_H(ctx, { TS: ts, PX: akza_pl(F.pos, 'x'), PW: akza_pl(F.pos, 'w'), LI: akza_pl(F.pos, 'li'), MG: MG, YR: YR, SG: S, SL: 0.44, SZ: size, CX: cx, NU: n },
            'function LD(li,t){var o=[];for(var i=0;i<NU;i++){if(LI[i]!==li||t<TS[i])continue;var tau=t-TS[i];o.push([lrp(W+PW[i]/2+SZ*0.2,CX+PX[i],oc(tau/SL)),MG[i]*(1+0.5*pls(tau-SL*0.55,4.5,12)),i]);}return o;}' +
            'function DF(x,ld){var d=0;for(var j=0;j<ld.length;j++){var aa=Math.max(0,Math.min(W,ld[j][0]));d+=ld[j][1]*(x<aa?x*(W-aa):aa*(W-x));}return d*4/(W*W)*SG;}' +
            'function U(I,t){var ld=LD(LI[I],Math.max(t,TS[I])),a=CX+PX[I];for(var j=0;j<ld.length;j++)if(ld[j][2]===I)a=ld[j][0];' +
            'var ry=YR[LI[I]]+DF(a,ld),sl=(DF(a+4,ld)-DF(a-4,ld))/8;return [a,ry+SZ*0.74,1,1,Math.atan(sl)*57.2958*0.8,1,ry];}');
        var Ls = [], clip = jzP(ctx, 'clip', false), Cl = null;
        for (li = 0; li < F.L; li++) {
            var ld = [];
            for (i = F.pt[li][0]; i < F.pt[li][1]; i++) ld.push([cx + F.pos[i].x, MG[i]]);
            for (i = F.pt[li][0]; i < F.pt[li][1]; i++) {
                var ax = cx + F.pos[i].x, ry = YR[li] + akza_sagD(ax, ld, W, S);
                Ls.push(akza_word(ctx, units[i], { font: font, size: size, color: i === acc % n ? accC : sc.fg, x: ax, y: ry + size * 0.74, mi: akza_mi(ctx, ts[i]), H: HD, I: i, use: 'pr' }));
                if (clip) {
                    if (!Cl) Cl = akza_shape(ctx, 'kz line clips');
                    var g = jzGrp(Cl, 'clip ' + i);
                    jzAddRect(g, size * 0.08, size * 0.24); jzAddFill(g, accC);
                    jzSetExpr(jzGX(g).property('ADBE Vector Position'), HD + 'var u=U(' + i + ',time);[u[0],u[6]+SZ*0.05]');
                    akza_gop(g, HD + 'time<TS[' + i + ']?0:100');
                }
            }
            // the rope: through every load, drawn in from the left
            var Rp = akza_shape(ctx, 'kz rope ' + (li + 1));
            var gr = akza_line(Rp, 'rope', HD + 'var ld=LD(' + li + ',time),xs=[0,W],j,p=[];for(j=0;j<ld.length;j++)xs.push(Math.max(0,Math.min(W,ld[j][0])));xs.sort(function(a,b){return a-b;});' +
                'for(j=0;j<xs.length;j++)p.push([xs[j],YR[' + li + ']+DF(xs[j],ld)]);createPath(p,[],[],false)', subC, Math.max(2 * ctx.u, u * 0.004), 90);
            jzAddTrimPaths(gr, HD + 'oe(time/0.4)*100');
            akza_op(Rp, HD + 'K*100');
        }
        if (Cl) akza_op(Cl, HD + 'K*100');
        return akza_bbL(Ls);
    }
});
