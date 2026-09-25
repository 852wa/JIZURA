// ================================================================ pack layoutsB part 1 (AE port of src/11p_layoutsB.js, entries 1-14)
// rain, hanging, orbit, tunnel, wordCloud, bounceLine, elastic, crossBands, stickerBomb, neon, keycaps, bubbles, slotMachine, flipBoard
//
// Techniques used here:
// - glyph positions are computed like the browser's layoutText (full-width glyphs = 1 em, latin estimated), so streams /
//   shadows / bands line up with the AE text (exact for Japanese).
// - "one glyph per line" text layers (lb1_glyphs) hold many freely placed glyphs in ONE editable layer: every line is
//   centre-justified, so glyph i sits at (0, i*LD) no matter how wide it is; a Position animator moves it anywhere.
// - moving plates / strings / bubbles are shape layers; the lyric glyph that rides on them is parented (setParentWithJump)
//   so the cut's enter / hold / exit expressions stay untouched on the text layer.

var LB1_CY = 0.38;     // glyph centre above the baseline (em) — CJK em box
// deterministic hash for expressions (seedRandom streams also depend on the layer / property in AE, so anything that
// several properties or layers must agree on uses this instead)
var LB1_HR = 'function hr(a,b){var x=Math.sin(a*12.9898+b*78.233)*43758.5453;return x-Math.floor(x);}';
var LB1_KATA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';

/* ---------------------------------------------------------------- small helpers */
function lb1_k(ctx) { return jzU(ctx) / 1080; }                 // browser design px -> comp px
function lb1_clean(t) { return String(t || '').replace(/[\s\u3000]+/g, ''); }
function lb1_slots(t) { return jzChars(jzTrim(String(t || '')).replace(/[\s\u3000]+/g, ' ')); }
function lb1_isSp(ch) { return ch === ' ' || ch === '\u3000'; }
function lb1_roma(t) { var c = lb1_clean(t); if (!/[\u3041-\u30ff]/.test(c)) return null; var r = jzRomaji(c); return r ? r.toUpperCase() : null; }
function lb1_stag(ctx) { return Math.max(0.005, ctx.cut.stagger || 0.04); }
function lb1_miAt(ctx, t) { return Math.floor(Math.max(0, t) / lb1_stag(ctx) + 1e-6); }   // browser: (mi | 0) * stagger
function lb1_plateHold(ctx) { return jzIndexOf(['still', 'jitter', 'breathe', 'glitchtick'], ctx.cut.hold || 'still') < 0; }
function lb1_plateCol(sc, pref) { for (var i = 0; i < pref.length; i++) if (pref[i] && jzContrast(pref[i], sc.bg) >= 1.6) return pref[i]; return sc.fg; }
function lb1_onCol(sc, fill) {
    var c = [sc.bg, sc.fg, sc.ink, sc.accent, sc.sub], best = null, bv = 0;
    for (var i = 0; i < c.length; i++) { if (!c[i] || String(c[i]).toUpperCase() === String(fill).toUpperCase()) continue; var k = jzContrast(c[i], fill); if (k > bv) { bv = k; best = c[i]; } }
    return bv >= 2.4 ? best : (jzLum(fill) > 0.5 ? '#111111' : '#FFFFFF');
}
function lb1_arr(a) { return jzArrExpr(a); }
function lb1_strArr(a) { var o = []; for (var i = 0; i < a.length; i++) o.push('"' + String(a[i]).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'); return '[' + o.join(',') + ']'; }
// glyph pool for random reels / streams: the lyric's own kana & kanji + every other katakana
function lb1_pool(c) {
    var own = jzChars(lb1_clean((c.lineText || '') + c.text)), out = [], i;
    for (i = 0; i < own.length; i++) if (!jzIsLatin(own[i]) && !jzIsPunct(own[i]) && own[i] !== '\u30FB' && !/["'\\]/.test(own[i])) out.push(own[i]);
    var ka = jzChars(jzPool('kana'));
    for (i = 0; i < ka.length; i += 2) out.push(ka[i]);
    return out;
}
// main-text lines for a width budget: portrait -> short lines ('\r' separated)
function lb1_lines(text, W, H, perL, perP) {
    var t = jzTrim(String(text || '')), n = jzCount(t), per = W < H ? perP : perL;
    if (n <= per) return t;
    return jzSplitLines(t, Math.ceil(n / Math.ceil(n / per)));
}
// advance width in em (browser measures real fonts; full-width glyphs are exactly 1 em)
function lb1_adv(ch, mono) {
    var c = ch.charCodeAt(0);
    if (ch === ' ') return mono ? 0.6 : 0.3;
    if (c < 0x80) {
        if (mono) return 0.6;
        if (/[A-Z]/.test(ch)) return /[MW]/.test(ch) ? 0.9 : (ch === 'I' ? 0.32 : 0.7);
        if (/[a-z]/.test(ch)) return /[mw]/.test(ch) ? 0.88 : /[ijl]/.test(ch) ? 0.28 : /[frt]/.test(ch) ? 0.42 : 0.61;
        if (/[0-9]/.test(ch)) return 0.62;
        return /[.,:;!'|]/.test(ch) ? 0.28 : 0.42;
    }
    if (c < 0x250) return 0.56;
    if (c >= 0xFF61 && c <= 0xFF9F) return 0.5;
    return 1;
}
// glyph layout like the browser's layoutText: centres relative to the block centre; ti = AE textIndex-1
function lb1_layout(str, size, o) {
    o = o || {};
    var tr = o.track || 0, out = [], ti = 0, j, li;
    if (o.vertical) {
        var arr = jzChars(lb1_clean(str)), n = arr.length, st = size * (1 + tr);
        for (j = 0; j < n; j++) out.push({ ch: arr[j], x: 0, y: (j - (n - 1) / 2) * st, w: size, h: size, li: j, ti: ti++, sp: false });
        out.W = size; out.H = Math.max(size, n * st - tr * size); out.nL = n;
        return out;
    }
    var lines = String(str).split(/\r\n|\r|\n/), nL = lines.length, lead = (o.lead || 1.3) * size, maxW = 1;
    for (li = 0; li < nL; li++) {
        var a2 = jzChars(lines[li]), ws = [], w = 0;
        for (j = 0; j < a2.length; j++) { ws.push(lb1_adv(a2[j], o.mono) * size); w += ws[j] + (j < a2.length - 1 ? tr * size : 0); }
        maxW = Math.max(maxW, w);
        var x = -w / 2, y = (li - (nL - 1) / 2) * lead;
        for (j = 0; j < a2.length; j++) { out.push({ ch: a2[j], x: x + ws[j] / 2, y: y, w: ws[j], h: size, li: li, ti: ti++, sp: lb1_isSp(a2[j]) }); x += ws[j] + tr * size; }
    }
    out.W = maxW; out.H = nL * lead - (lead - size); out.nL = nL;
    return out;
}
function lb1_measure(str, size, o) { var l = lb1_layout(str, size, o); return { w: l.W, h: l.H }; }
function lb1_fitSize(str, maxW, maxH, o) { var m = lb1_measure(str, 100, o); return 100 * Math.min(maxW / Math.max(1, m.w), maxH / Math.max(1, m.h)); }
// a normal text block whose layout centre (as in the browser) sits at (o.x, o.y)
function lb1_textAt(ctx, str, o) {
    var vert = !!o.vertical, size = o.size;
    var txt = vert ? jzVertical(str) : String(str).replace(/\r\n|\n/g, '\r');
    var nL = txt.split('\r').length, LD = vert ? size * (1 + (o.track || 0)) : size * (o.lead || 1.2);
    var L = jzText(ctx, txt, { font: o.font, size: size, color: o.color || '#FFFFFF', x: o.x, y: o.y, track: vert ? 0 : (o.track || 0), leading: LD,
        fill: o.fill, stroke: o.stroke, strokeColor: o.strokeColor, strokeOver: o.strokeOver, name: o.name });
    jzXf(L, 'ADBE Anchor Point').setValue([0, -LB1_CY * size + (nL - 1) / 2 * LD]);
    jzXf(L, 'ADBE Position').setValue([o.x, o.y]);
    if (o.opacity != null) jzXf(L, 'ADBE Opacity').setValue(o.opacity * 100);
    return L;
}
// bbox of a laid-out block at (cx, cy)
function lb1_bb(cx, cy, w, h) { return { x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2, cx: cx, cy: cy }; }
// "one glyph per line" layer: glyph i rests at (0, i*LD) (baseline) in comp px; move it with lb1_place / lb1_placeAnim
function lb1_glyphs(ctx, chars, o) {
    var t = [], i;
    for (i = 0; i < chars.length; i++) t.push(chars[i] === '' ? ' ' : chars[i]);
    var L = jzText(ctx, t.join('\r'), { font: o.font, size: o.size, color: o.color || '#FFFFFF', x: 0, y: 0, track: 0, leading: o.size * 1.0, fill: o.fill, stroke: o.stroke, strokeColor: o.strokeColor, name: o.name || 'glyphs' });
    jzXf(L, 'ADBE Anchor Point').setValue([0, 0]); jzXf(L, 'ADBE Position').setValue([0, 0]);
    return { L: L, fs: o.size, LD: o.size, n: chars.length };      // (no expando properties on AE layer objects)
}
// static placement: pts[i] = [x, y] = glyph centre in the layer's space
function lb1_place(G, pts, name) {
    var offs = [];
    for (var i = 0; i < pts.length; i++) offs.push([pts[i][0], pts[i][1] + LB1_CY * G.fs - i * G.LD]);
    return jzCharOffsets(G.L, offs, name || 'JZ Place');
}
// animated placement: body is expression code that sets x, y (glyph centre, layer space) from i = textIndex-1
function lb1_placeAnim(ctx, G, name, head, body, bound) {
    var KB = Math.max(1000, bound || (Math.max(ctx.W, ctx.H) * 3 + G.n * G.LD));
    return jzAnimator(G.L, name, [['ADBE Text Position 3D', [KB, KB, 0]]], head + 'var i=textIndex-1,x=0,y=0;' + body + ';var KB=' + jzN(KB) + ';[x/KB*100,(y+' + jzN(LB1_CY * G.fs) + '-i*' + jzN(G.LD) + ')/KB*100,0]');
}
// per-glyph animators: body sets a variable (a = alpha 0..1 / sx, sy = scale 0..2 / dx, dy px / r deg / m = colour mix 0..1)
function lb1_opAnim(L, name, head, body) { return jzAnimator(L, name, [['ADBE Text Opacity', 0]], head + 'var a=1;' + body + ';(1-Math.max(0,Math.min(1,a)))*100'); }
function lb1_scAnim(L, name, head, body) { return jzAnimator(L, name, [['ADBE Text Scale 3D', [0, 0, 100]]], head + 'var sx=1,sy=1;' + body + ';[(1-sx)*100,(1-sy)*100,0]'); }
function lb1_posAnim(L, name, KB, head, body) { return jzAnimator(L, name, [['ADBE Text Position 3D', [KB, KB, 0]]], head + 'var dx=0,dy=0;' + body + ';[dx/' + jzN(KB) + '*100,dy/' + jzN(KB) + '*100,0]'); }
function lb1_rotAnim(L, name, R, head, body) { return jzAnimator(L, name, [['ADBE Text Rotation', R]], head + 'var r=0;' + body + ';r/' + jzN(R) + '*100'); }
function lb1_colAnim(L, name, hex, head, body) { return jzAnimator(L, name, [['ADBE Text Fill Color', jzHex(hex)]], head + 'var m=0;' + body + ';Math.max(0,Math.min(1,m))*100'); }
// the browser draws some lyrics glyph by glyph with mi = i * f: with the 'cut' enter that is a left-to-right reveal.
// Other enters already stagger per glyph in AE, so only 'cut' gets this (MP = textIndex-1 -> glyph index, -1 = space)
function lb1_cutStagger(ctx, L, MP, f) {
    if ((ctx.cut.enter || 'cut') !== 'cut') return null;
    var D = [], st = ctx.cut.stagger || 0;
    for (var i = 0; i < MP.length; i++) D.push(MP[i] < 0 ? 0 : Math.floor(MP[i] * f + 1e-6) * st);
    return lb1_opAnim(L, 'JZ Stagger In', 'var D=' + lb1_arr(D) + ';', 'a=time<(D[textIndex-1]||0)?0:1');
}
// alpha track matte: L shows only inside M (M directly above L). AE 23+ links mattes with setTrackMatte
function lb1_matte(L, M) {
    var ok = false;
    if (typeof L.setTrackMatte === 'function') { try { L.setTrackMatte(M, TrackMatteType.ALPHA); ok = true; } catch (e) { ok = false; } }
    if (!ok) { try { L.trackMatteType = TrackMatteType.ALPHA; } catch (e2) { jzWarn('matte: ' + e2.toString()); } }
}
// shape helpers
function lb1_shape(ctx, name, x, y) { return jzShapeLayer(ctx, name, x || 0, y || 0); }
// helper layers the browser draws with ghost off (main pass only) stay out of the tinted ghosts. Plates the browser ghosts
// only while they fly in (gIn: the first 0.6 s) are marked too: their steady state has no chromatic fringe.
function lb1_ng(L) { if (L) jzNoGhost(L); return L; }
function lb1_line(g, pts, col, w, op) { jzAddPath(g, pts, false); return jzAddStroke(g, col, w, op); }
function lb1_setX(prop, ex) { jzSetExpr(prop, ex); }
function lb1_gOp(g, ex) { jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), ex); }
function lb1_gSc(g, ex) { jzSetExpr(jzGX(g).property('ADBE Vector Scale'), ex); }
function lb1_gPos(g, ex) { jzSetExpr(jzGX(g).property('ADBE Vector Position'), ex); }
function lb1_gRot(g, ex) { jzSetExpr(jzGX(g).property('ADBE Vector Rotation'), ex); }
// parent a (text) layer to a moving shape layer without moving it, then place it in the parent's space
function lb1_parent(L, P, x, y) { L.setParentWithJump(P); jzXf(L, 'ADBE Position').setValue([x, y]); }
// rounded rect path group helper (centre cx, cy)
// sub-group inside a shape group
function lb1_sub(g, name) { var n = jzVecs(g).addProperty('ADBE Vector Group'); if (name) n.name = name; return n; }
function lb1_rrect(g, w, h, r, cx, cy) { return jzAddRect(g, Math.max(0.5, w), Math.max(0.5, h), Math.max(0, Math.min(r, w / 2, h / 2)), cx || 0, cy || 0); }

/* ================================================================== 1 rain — 文字の雨 */
jzReg('layout', 'rain', {
    plan: function (rng, cut, st) {
        var port = cut.H > cut.W, mo = st.fonts.mono || [], monos = [];
        for (var i = 0; i < mo.length; i++) if (mo[i] === 'dot') monos.push(mo[i]);
        return {
            font: rng.pick(jzFontsOf(st, ['display', 'serif'])),
            rf: monos.length && rng.chance(0.5) ? 'dot' : rng.pick(jzFontsOf(st, ['body'])),
            orient: cut.n <= 7 && rng.chance(port ? 0.6 : 0.3) ? 'v' : 'h',
            density: rng.range(0.5, 0.72), speed: rng.range(0.85, 1.25), tint: rng.pick(['sub', 'sub', 'accent']),
            order: rng.pick(['ltr', 'random', 'random'])
        };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, M = jzU(ctx), k = lb1_k(ctx), i, j;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), rf = jzP(ctx, 'rf', jzBodyF(ctx)), vert = jzP(ctx, 'orient', 'h') === 'v';
        var density = jzP(ctx, 'density', 0.6), speed = jzP(ctx, 'speed', 1), tail = jzP(ctx, 'tint', 'sub') === 'accent' ? sc.accent : sc.sub, order = jzP(ctx, 'order', 'random');
        var mt = vert ? lb1_clean(c.text) : lb1_lines(c.text, W, H, 11, 6);
        var lo = { track: 0.1, lead: 1.25, vertical: vert };
        var size = Math.min(lb1_fitSize(mt, W * (vert ? 0.5 : 0.84), H * (vert ? 0.8 : 0.5), lo), vert ? H * 0.15 : H * 0.24);
        var lay = lb1_layout(mt, size, lo), gl = [];
        for (i = 0; i < lay.length; i++) if (!lay[i].sp) gl.push(lay[i]);
        var n = gl.length, cx = W / 2, cy = H / 2;
        var kx0 = cx - lay.W / 2 - size * 0.8, kx1 = cx + lay.W / 2 + size * 0.8, ky0 = cy - lay.H / 2 - size * 0.8, ky1 = cy + lay.H / 2 + size * 0.8;
        var TH = jzTH(ctx), pool = lb1_pool(c), PA = lb1_strArr(pool);
        // ---- background streams: a stationary glyph grid, a bright head sweeps down each active column (one text layer)
        var cell = jzClamp(M * 0.036, 16 * k, 64 * k), cols = Math.floor(W / cell), rows = Math.ceil(H / cell), ox = (W - cols * cell) / 2, rs = cell * 0.72;
        var init = [];
        for (var r = 0; r < rows; r++) { var row = ''; for (j = 0; j < cols; j++) row += pool[jzHash(s, r, j) % pool.length]; init.push(row); }
        var G = lb1_ng(jzText(ctx, init.join('\r'), { font: rf, size: rs, color: sc.sub, x: 0, y: 0, track: (cell - rs) / rs, leading: cell, name: 'rain streams' }));
        jzXf(G, 'ADBE Anchor Point').setValue([0, 0]); jzXf(G, 'ADBE Position').setValue([W / 2, cell * 0.5 + LB1_CY * rs]);
        try {
            G.property('ADBE Text Properties').property('ADBE Text Document').expression = 'var P=' + PA + ',NP=P.length,C=' + cols + ',R=' + rows + ',SD=' + (s % 99991) +
                ';var f=Math.floor(time*24),s="";for(var r=0;r<R;r++){if(r)s+="\\r";for(var c=0;c<C;c++){seedRandom(SD+r*7919+c*131,true);var o=Math.floor(random()*16);seedRandom(SD+c*104729+r*37+Math.floor((f+o)/14)*7331,true);s+=P[Math.floor(random()*NP)%NP];}}s';
        } catch (e0) { jzWarn('rain source: ' + e0.toString()); }
        var colHead = LB1_HR + 'var C=' + cols + ',CL=' + jzN(cell) + ',OX=' + jzN(ox) + ',DN=' + jzN(density) + ',SPD=' + jzN(speed) + ',R=' + rows + ';var j=textIndex-1,c=j%C,r=Math.floor(j/C);' +
            'var on=hr(SD+c,1)<=DN,v=(8+8*hr(SD+c,2))*SPD,Ls=6+9*hr(SD+c,3),per=R+Ls+2+(R*0.8-2)*hr(SD+c,4),ph=hr(SD+c,5);var hy=((time*v+ph*per)%per)-1,d=hy-r,vis=on&&d>=0&&d<=Ls;';
        var od = Math.max(0.12, c.outDur || 0.15), slim = 'var SD=' + (s % 99991) + ',PO=Math.max(0,Math.min(1,(time-' + jzN(c.dur - od) + ')/' + jzN(od) + ')),K=1-PO*PO*PO;';
        function oc(x) { return 'Math.max(0,1-Math.pow(1-Math.max(0,Math.min(1,' + x + ')),3))'; }
        lb1_opAnim(G, 'JZ Rain Streams', slim + colHead, 'a=0;if(vis){a=d<1?1:0.1+Math.pow(1-d/Ls,1.4)*0.6;var gx=OX+(c+0.5)*CL,gy=(r+0.5)*CL;if(gx>' + jzN(kx0) + '&&gx<' + jzN(kx1) + '&&gy>' + jzN(ky0) + '&&gy<' + jzN(ky1) + ')a*=0.22;}a*=' + oc('time/0.35') + '*K');
        lb1_colAnim(G, 'JZ Rain Heads', sc.fg, 'var SD=' + (s % 99991) + ';' + colHead, 'm=vis&&d<1?1:0');
        // ---- per-glyph delivery times
        var span = jzClamp(c.dur * 0.2, 0.1, 0.5), fd = jzClamp(c.dur * 0.1, 0.14, 0.26), rank = [], pos = [];
        for (i = 0; i < n; i++) rank.push(i);
        if (order === 'random') rank.sort(function (a, b) { return jzR(s, a, 31) - jzR(s, b, 31); });
        for (i = 0; i < n; i++) pos[rank[i]] = i;
        var TA = [], GX = [], GY = [], taMin = 1e9;
        for (i = 0; i < n; i++) {
            var kk = vert ? n - 1 - i : pos[i];
            TA.push(0.05 + fd + (n > 1 ? kk / (n - 1) : 0) * span); taMin = Math.min(taMin, TA[i]);
            GX.push(cx + gl[i].x); GY.push(cy + gl[i].y);
        }
        // ---- trails: 8 small glyphs above every lyric glyph, falling with it (one layer, glyphs placed per frame)
        var trailN = 8, ts = jzClamp(size * 0.32, cell * 0.8, cell * 1.5), tsp = ts * 1.12, tch = [];
        for (i = 0; i < n * trailN; i++) tch.push(pool[jzHash(s, i, 77) % pool.length]);
        var T = lb1_glyphs(ctx, tch, { font: rf, size: ts, color: tail, name: 'rain trails' }); lb1_ng(T.L);
        try {
            T.L.property('ADBE Text Properties').property('ADBE Text Document').expression = 'var P=' + PA + ',NP=P.length,N=' + (n * trailN) + ',SD=' + (s % 99991) +
                ';var f=Math.floor(time*12),s="";for(var q=0;q<N;q++){if(q)s+="\\r";seedRandom(SD+q*7919+f*131,true);s+=P[Math.floor(random()*NP)%NP];}s';
        } catch (e1) { jzWarn('rain trails: ' + e1.toString()); }
        var fall = 'var TA=' + lb1_arr(TA) + ',GX=' + lb1_arr(GX) + ',GY=' + lb1_arr(GY) + ',FD=' + jzN(fd) + ',TS=' + jzN(ts) + ',TSP=' + jzN(tsp) + ',SZ=' + jzN(size) + ';';
        var trI = 'var g=Math.floor((textIndex-1)/' + trailN + '),jj=(textIndex-1)%' + trailN + ',u=(time-(TA[g]-FD))/FD;var e=iq(Math.min(1,u)),yh=-TSP*2+(GY[g]+TSP*2)*e,hs=u<1?TS+(SZ-TS)*Math.pow(Math.max(0,u),3):SZ;';
        lb1_placeAnim(ctx, T, 'JZ Trail Fall', TH + fall + trI, 'x=GX[g];y=yh-hs*0.5-' + trailN + '*TSP+(jj+0.5)*TSP');
        lb1_opAnim(T.L, 'JZ Trail Fade', TH + fall + trI, 'a=(u<=0||u>=2)?0:Math.pow((jj+1)/' + trailN + ',1.6)*0.95*(u<1?1:2-u)*K');
        // ---- heads: the lyric glyphs themselves, growing while they fall (same layout as the lyric)
        var tiMap = [];
        for (i = 0; i < lay.length; i++) tiMap.push(-1);
        for (i = 0; i < n; i++) tiMap[gl[i].ti] = i;
        var HL = lb1_ng(lb1_textAt(ctx, mt, { font: font, size: size, color: sc.fg, x: cx, y: cy, track: 0.1, lead: 1.25, vertical: vert, name: 'rain heads' }));
        var hdI = 'var MP=' + lb1_arr(tiMap) + ',g=MP[textIndex-1];if(g==null)g=-1;var u=g<0?-1:(time-(g<0?0:TA[g]-FD))/FD;var e=iq(Math.min(1,Math.max(0,u))),yh=-TSP*2+((g<0?0:GY[g])+TSP*2)*e,hs=u<1?TS+(SZ-TS)*Math.pow(Math.max(0,u),3):SZ;';
        lb1_posAnim(HL, 'JZ Head Fall', H * 2, TH + fall + hdI, 'if(g>=0&&u>0&&u<1)dy=yh-GY[g]');
        lb1_scAnim(HL, 'JZ Head Size', TH + fall + hdI, 'if(g>=0&&u>0&&u<1){sx=hs/SZ;sy=sx;}');
        lb1_opAnim(HL, 'JZ Head Show', TH + fall + hdI, 'a=(g>=0&&u>0&&u<1)?(0.6+0.4*u)*K:0');
        // ---- the lyric: each glyph locks in when its stream arrives (accent flash -> fg)
        var ML = lb1_textAt(ctx, mt, { font: font, size: size, color: sc.fg, x: cx, y: cy, track: 0.1, lead: 1.25, vertical: vert, name: c.text });
        var TAg = [];
        for (i = 0; i < lay.length; i++) TAg.push(tiMap[i] >= 0 ? TA[tiMap[i]] : 0);
        var land = 'var TL=' + lb1_arr(TAg) + ',tl=TL[textIndex-1]||0;';
        lb1_opAnim(ML, 'JZ Rain Land', land, 'a=time<tl?0:1');
        lb1_colAnim(ML, 'JZ Rain Flash', sc.accent, JZ_FNS + land, 'm=1-oc((time-tl)/0.45)');
        jzAnimate(ctx, ML, { mi: lb1_miAt(ctx, taMin) });
        return lb1_bb(cx, cy, lay.W, lay.H);
    }
});

/* ================================================================== 2 hanging — 吊り下げ */
jzReg('layout', 'hanging', {
    plan: function (rng, cut, st) {
        return {
            font: rng.pick(jzFontsOf(st, ['display', 'serif'])), shape: rng.pick(['arc', 'wave', 'random', 'stair']), dir: rng.pick([1, -1]),
            tag: rng.chance(0.35), rail: rng.chance(0.6), amp: rng.range(0.06, 0.11), kick: rng.range(0.16, 0.26), ph: rng.range(0, 6)
        };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, M = jzU(ctx), k = lb1_k(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), shape = jzP(ctx, 'shape', 'arc'), dir = jzP(ctx, 'dir', 1), tag = !!jzP(ctx, 'tag', false), rail = !!jzP(ctx, 'rail', true);
        var amp = jzP(ctx, 'amp', 0.08), kick = jzP(ctx, 'kick', 0.2), ph = jzP(ctx, 'ph', 0);
        var chars = lb1_slots(c.text), n = chars.length;
        if (!n) return null;
        var rowsN = W < H && n > 5 ? 2 : 1, per = Math.ceil(n / rowsN);
        var sp = W * (rowsN > 1 ? 0.84 / (per + 0.5) : 0.88 / per);
        var size = Math.min(sp * (tag ? 0.76 : 0.84), M * 0.19), tagW = size * 1.12, tagH = size * 1.36, csize = tag ? size * 0.8 : size;
        var railY = rail ? H * 0.075 : -2 * k, gap = jzClamp(c.dur * 0.35 / n, 0.03, 0.08), strokeW = Math.max(1 * k, M * 0.0016);
        var TH = jzTH(ctx), DEG = Math.PI / 180;
        if (rail) {
            var RL = lb1_ng(lb1_shape(ctx, 'rail', W / 2, railY)), gr = jzGrp(RL, 'rail');
            lb1_line(gr, [[-W * 0.52, 0], [W * 0.52, 0]], sc.sub, Math.max(1.2 * k, M * 0.0022));
            jzSetExpr(jzXf(RL, 'ADBE Scale'), JZ_FNS + '[value[0]*oe(time/0.45),value[1]]');
            jzSetExpr(jzXf(RL, 'ADBE Opacity'), TH + '80*K');
        }
        var items = [], bb = null;
        for (i = 0; i < n; i++) {
            if (chars[i] === ' ') continue;
            var row = Math.floor(i / per), j = i - row * per, cnt = Math.min(per, n - row * per);
            var u = cnt > 1 ? j / (cnt - 1) : 0.5, am = rowsN > 1 ? 0.45 : 1, dev;
            if (shape === 'arc') dev = (Math.sin(Math.PI * u) - 0.55) * H * 0.13 * dir;
            else if (shape === 'wave') dev = Math.sin(u * Math.PI * 2 * 1.1 + ph) * H * 0.08;
            else if (shape === 'stair') dev = (u - 0.5) * H * 0.2 * dir;
            else dev = (jzR(s, i, 3) * 2 - 1) * H * 0.08;
            dev = Math.max(-H * 0.14, Math.min(H * 0.14, dev * am));
            var ax = W / 2 + (j - (cnt - 1) / 2) * sp + (rowsN > 1 ? (row ? 0.25 : -0.25) * sp : 0);
            var cyy = rowsN > 1 ? (row ? H * 0.64 : H * 0.4) + dev * 0.5 : H * 0.52 + dev;
            var attach = tag ? tagH * 0.4 : size * 0.56;
            var L = Math.max(H * 0.06, cyy - attach - railY), T = 1.5 * Math.sqrt(L / (H * 0.45)), w = Math.PI * 2 / T;
            var ta = 0.12 + i * gap, ampK = rowsN > 1 && row === 1 ? 0.5 : 1, dk = sp / L / DEG;
            var hd = 'var TA=' + jzN(ta) + ',LL=' + jzN(L) + ';var tau=time-TA,gw=oc((time-(TA-0.3))/0.3),bn=tau>0?1+0.05*Math.exp(-tau/0.18)*Math.cos(tau*30):1;';
            // string (+ pin, + tag) swinging about its rail point
            var S = lb1_ng(lb1_shape(ctx, 'string ' + (i + 1), ax, railY));   // (still the glyph's parent in the ghosts)
            var pc = i % 2 ? lb1_plateCol(sc, [sc.accent, sc.ink]) : lb1_plateCol(sc, [sc.ink, sc.fg]);
            if (tag) {
                var gt = jzGrp(S, 'tag');
                var gh = lb1_sub(gt, 'hole'); jzAddEllipse(gh, Math.max(2 * k, size * 0.055) * 2, Math.max(2 * k, size * 0.055) * 2, 0, -tagH / 2 + tagH * 0.1); jzAddFill(gh, sc.bg);
                var gp = lb1_sub(gt, 'plate'); lb1_rrect(gp, tagW, tagH, tagW * 0.12); jzAddFill(gp, pc);
                jzGX(gt).property('ADBE Vector Position').setValue([0, L + attach]);
                lb1_gPos(gt, TH + hd + '[value[0],value[1]+(bn-1)*LL]');
                lb1_gSc(gt, TH + hd + 'var e=tau<=0?0:ob(tau/0.18,1.4)*K;[value[0]*e,value[1]*e]');
            }
            if (rail) { var gd = jzGrp(S, 'pin'), pr = Math.max(2.5 * k, M * 0.004); jzAddEllipse(gd, pr * 2, pr * 2); jzAddFill(gd, sc.fg); lb1_gOp(gd, TH + hd + '(gw>0?100:0)*K'); }
            var gs = jzGrp(S, 'string');
            lb1_line(gs, [[0, 0], [0, L * 1.06]], sc.sub, strokeW, 90);
            jzAddTrimPaths(gs, TH + hd + 'Math.max(0,Math.min(100,bn*gw/1.06*100))');
            lb1_gOp(gs, TH + hd + '(gw>0?100:0)*K');
            var th = 'var th=' + jzN(amp * dk * ampK) + '*Math.sin(' + jzN(w) + '*time+' + jzN(jzR(s, i, 5) * 6) + ');if(tau>0)th+=' + jzN(kick * dk * ampK * (jzR(s, i, 6) < 0.5 ? 1 : -1)) + '*Math.exp(-tau/0.7)*Math.sin(' + jzN(w * 1.3) + '*tau);';
            jzSetExpr(jzXf(S, 'ADBE Rotate Z'), TH + hd + th + 'value-th');
            items.push({ i: i, S: S, L: L, attach: attach, ta: ta, ax: ax, cy: cyy, pc: pc, hd: hd });
            bb = jzUnion(bb, lb1_bb(ax, railY + L + attach, tag ? tagW : csize, tag ? tagH : csize));
        }
        // the glyphs ride on their strings (parented), their own motion stays on the text layer
        for (i = 0; i < items.length; i++) {
            var q = items[i], ch = chars[q.i];
            var yOff = q.L + q.attach + (tag ? tagH * 0.06 : 0);
            var TL = lb1_textAt(ctx, ch, { font: font, size: csize, color: tag ? lb1_onCol(sc, q.pc) : sc.fg, x: q.ax, y: railY + yOff, name: ch });
            lb1_parent(TL, q.S, 0, yOff);
            lb1_posAnim(TL, 'JZ Bounce', q.L * 0.06, TH + q.hd, 'if(tau>0)dy=(bn-1)*LL');
            jzAnimate(ctx, TL, { mi: lb1_miAt(ctx, q.ta), noHold: tag ? lb1_plateHold(ctx) : false, treat: tag ? false : true });
        }
        return bb;
    }
});

/* ================================================================== 3 orbit — 周回 */
jzReg('layout', 'orbit', {
    plan: function (rng, cut, st) {
        return {
            font: rng.pick(jzFontsOf(st, ['display', 'serif'])), fo: rng.pick(jzFontsOf(st, ['body', 'serif', 'display'])),
            variant: rng.pick(['ring', 'ring', 'atom', 'wide']), tilt: rng.range(5, 13) * rng.pick([1, -1]),
            speed: rng.range(22, 40) * rng.pick([1, -1]), unit: rng.pick(['line', 'self', 'line'])
        };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, M = jzU(ctx), k = lb1_k(ctx), i, j, r;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), fo = jzP(ctx, 'fo', jzBodyF(ctx)), variant = jzP(ctx, 'variant', 'ring');
        var tilt0 = jzP(ctx, 'tilt', 8), speed = jzP(ctx, 'speed', 30), unitK = jzP(ctx, 'unit', 'line');
        var port = W < H, mt = lb1_lines(c.text, W, H, 10, 5), lo = { track: 0.04, lead: 1.15 };
        var size = Math.min(lb1_fitSize(mt, W * (port ? 0.64 : 0.54), H * 0.3, lo), H * 0.19), mm = lb1_measure(mt, size, lo);
        var cx = W / 2, cy = H / 2, txt = lb1_clean(c.text), line = lb1_clean(c.lineText || ''), rom = lb1_roma(txt);
        var units = [];
        units.push(unitK === 'line' && line && line !== txt && jzChars(line).length <= 40 ? line + '\u30FB' : txt + '\u30FB');
        units.push(rom ? rom + ' \u30FB ' : (c.words && c.words.length > 1 ? c.words.join('\u30FB') + '\u30FB' : txt + ' \u30FB '));
        var nR = variant === 'atom' ? 2 : 1, rings = [], wide = variant === 'wide';
        for (r = 0; r < nR; r++) {
            var rx = jzClamp(Math.max(mm.w / 2 + size * (wide ? 1.4 : 1.05), M * (wide ? 0.44 : 0.36)), M * 0.2, W * 0.47);
            var ry = Math.min(rx * 0.62, Math.max(rx * (variant === 'atom' ? 0.36 : wide ? 0.2 : 0.27), mm.h / 2 + size * (r ? 0.75 : 0.5)));
            var tilt = (variant === 'atom' ? (r ? -1 : 1) * (Math.abs(tilt0) * 0.6 + 8) : tilt0) * Math.PI / 180;
            var os = jzClamp(M * (wide ? 0.05 : 0.042), 14 * k, 64 * k) * (r ? 0.82 : 1);
            var unit = jzChars(units[r]);
            var perim = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
            var cnt = Math.max(Math.min(unit.length, 44), Math.min(44, Math.floor(perim / (os * 1.7))));
            rings.push({ rx: rx, ry: ry, tilt: tilt, os: os, unit: unit, cnt: cnt, sp: speed * (r ? -0.8 : 1), font: r ? jzMonoF(ctx) : fo });
        }
        var TH = jzTH(ctx), lw = Math.max(1 * k, M * 0.0016), a0 = jzR(s, 9) * Math.PI * 2;
        var grow = 'var gr=(0.7+0.3*oe(time/0.7))*(1+0.25*PO);';
        function halves(front) {
            var S = lb1_ng(lb1_shape(ctx, front ? 'orbit lines front' : 'orbit lines back', 0, 0));
            for (var rr = 0; rr < rings.length; rr++) {
                var R = rings[rr], cT = Math.cos(R.tilt), sT = Math.sin(R.tilt), pts = [];
                for (var q = 0; q <= 40; q++) { var a = front ? q / 40 * Math.PI : Math.PI + q / 40 * Math.PI, lx = Math.cos(a) * R.rx, ly = Math.sin(a) * R.ry; pts.push([cx + lx * cT - ly * sT, cy + lx * sT + ly * cT]); }
                var g = jzGrp(S, 'ring ' + (rr + 1));
                lb1_line(g, pts, sc.sub, lw);
                jzGX(g).property('ADBE Vector Anchor').setValue([cx, cy]); jzGX(g).property('ADBE Vector Position').setValue([cx, cy]);
                lb1_gSc(g, TH + grow + '[value[0]*gr,value[1]*gr]');
            }
            jzSetExpr(jzXf(S, 'ADBE Opacity'), TH + (front ? 65 : 40) + '*oe(time/0.7)*K');
            return S;
        }
        function ringLayer(R, rr, front) {
            var chs = [], JJ = [], SEP = [];
            for (var q = 0; q < R.cnt; q++) { var ch = R.unit[q % R.unit.length]; if (lb1_isSp(ch)) continue; chs.push(ch); JJ.push(q); SEP.push(ch === '\u30FB'); }
            if (!chs.length) return null;
            var G = lb1_glyphs(ctx, chs, { font: R.font, size: R.os, color: sc.sub, name: 'orbit ' + (rr + 1) + (front ? ' front' : ' back') }); lb1_ng(G.L);
            var hd = TH + grow + 'var JJ=' + lb1_arr(JJ) + ',jj=JJ[textIndex-1]||0;var an=' + jzN(a0) + '+time*' + jzN(R.sp * Math.PI / 180) + '+jj/' + R.cnt + '*Math.PI*2;var z=Math.sin(an),dd=(z+1)/2;';
            lb1_placeAnim(ctx, G, 'JZ Orbit', hd, 'var lx=Math.cos(an)*' + jzN(R.rx) + '*gr,ly=z*' + jzN(R.ry) + '*gr;x=' + jzN(cx) + '+lx*' + jzN(Math.cos(R.tilt)) + '-ly*' + jzN(Math.sin(R.tilt)) + ';y=' + jzN(cy) + '+lx*' + jzN(Math.sin(R.tilt)) + '+ly*' + jzN(Math.cos(R.tilt)));
            lb1_scAnim(G.L, 'JZ Depth Size', hd, 'sx=0.55+0.62*dd;sy=sx');
            lb1_opAnim(G.L, 'JZ Depth Fade', hd, 'a=' + (front ? '(z>=0)' : '(z<0)') + '?(0.18+0.82*Math.pow(dd,1.3))*oe(time/0.7)*K:0');
            lb1_colAnim(G.L, 'JZ Depth Colour', sc.fg, hd, 'm=dd>0.5?1:0');
            jzCharColors(G.L, sc.accent, SEP, 'JZ Separators');
            return G.L;
        }
        halves(false);
        for (r = 0; r < rings.length; r++) ringLayer(rings[r], r, false);
        var ML = lb1_textAt(ctx, mt, { font: font, size: size, color: sc.fg, x: cx, y: cy, track: 0.04, lead: 1.15, name: c.text });
        jzAnimate(ctx, ML, { mi: 0 });
        var FS = halves(true);
        var hm = jzMaskRect(FS, cx - mm.w / 2 - size * 0.12, cy - mm.h / 2 - size * 0.1, cx + mm.w / 2 + size * 0.12, cy + mm.h / 2 + size * 0.1);
        try { hm.maskMode = MaskMode.SUBTRACT; } catch (e) {}
        for (r = 0; r < rings.length; r++) ringLayer(rings[r], r, true);
        return lb1_bb(cx, cy, mm.w, mm.h);
    }
});

/* ================================================================== 4 tunnel — トンネル */
jzReg('layout', 'tunnel', {
    plan: function (rng, cut, st) {
        return {
            font: rng.pick(jzFontsOf(st, ['display', 'body'])), fontC: rng.pick(jzFontsOf(st, ['display', 'serif'])),
            q: rng.range(1.42, 1.62), speed: rng.range(0.22, 0.42) * rng.pick([1, 1, -1]), style: rng.pick(['outline', 'fill', 'alt']),
            unit: rng.pick(['line', 'text', 'line']), persp: rng.chance(0.65)
        };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), k = lb1_k(ctx), i, m;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), fontC = jzP(ctx, 'fontC', jzFontKeyOf(ctx.st, 'display'));
        var q = jzP(ctx, 'q', 1.5), speed = jzP(ctx, 'speed', 0.3), style = jzP(ctx, 'style', 'outline'), unitK = jzP(ctx, 'unit', 'line'), persp = !!jzP(ctx, 'persp', true);
        var cx = W / 2, cy = H / 2, mt = lb1_lines(c.text, W, H, 10, 5), lo = { track: 0.05, lead: 1.15 };
        var size = Math.min(lb1_fitSize(mt, W * (W < H ? 0.44 : 0.5), H * 0.26, lo), H * 0.16), mm = lb1_measure(mt, size, lo);
        var hw = mm.w / 2 + size * 0.55, hh = mm.h / 2 + size * 0.5;
        var ra = W < H ? Math.min(0.95, Math.sqrt((hw / hh) * (W / H))) : W / H;
        var A = W / 2, B = A / ra, s0 = Math.max(hw / A, hh / B, 0.12);
        var Lmax = Math.log(Math.max(W * 0.66 / A, H * 0.66 / B) / s0) / Math.log(q);
        var src = (unitK === 'line' && c.lineText && lb1_clean(c.lineText) !== lb1_clean(c.text)) ? c.lineText : c.text;
        var unit = jzChars(jzTrim(String(src).replace(/\s+/g, ' ')) + '\u3000'), NU = unit.length;
        var lw = Math.max(1 * k, M * 0.0015), sg = speed < 0 ? -1 : 1, TH = jzTH(ctx);
        // which frames ever exist: L = m - 1 + phase(t) must pass through [0, Lmax + 0.2]
        var pmin = 1e9, pmax = -1e9;
        for (var t = 0; t <= c.dur + 1e-6; t += 1 / 48) {
            var e0 = t / 0.6 >= 1 ? 1 : 1 - Math.pow(2, -10 * t / 0.6), p0 = t * speed + (1 - e0) * 1.2 * sg;
            pmin = Math.min(pmin, p0); pmax = Math.max(pmax, p0);
        }
        var mLo = Math.ceil(1 - pmax - 1e-6), mHi = Math.floor(Lmax + 1.2 - pmin);
        if (mHi - mLo > 13) mLo = mHi - 13;
        var ph = 'var ph=time*' + jzN(speed) + '+(1-oe(time/0.6))*' + jzN(1.2 * sg) + ';';
        var alpha = 'var sm=cl(Lv/0.9);sm=sm*sm*(3-2*sm);var al=(Lv<0||Lv>' + jzN(Lmax + 0.2) + '||SS*' + jzN(Math.min(A, B) * 0.15) + '<' + jzN(3 * k) + ')?0:sm*(0.3+0.7*cl(Lv/' + jzN(Math.max(0.01, Lmax)) + '*1.4))*oe(time/0.6)*K;';
        // perspective rails
        if (persp) {
            var RS = lb1_ng(lb1_shape(ctx, 'tunnel rails', 0, 0)), g0 = jzGrp(RS, 'rails'), sx0 = s0 * A, sy0 = s0 * B, cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
            for (i = 0; i < 4; i++) jzAddPath(g0, [[cx + cs[i][0] * W * 0.75, cy + cs[i][1] * H * 0.75], [cx + cs[i][0] * sx0, cy + cs[i][1] * sy0]], false);
            jzAddStroke(g0, sc.sub, lw);
            jzSetExpr(jzXf(RS, 'ADBE Opacity'), TH + '28*oe(time/0.6)*K');
        }
        // thin frame lines (top / bottom of every frame)
        var LS = lb1_ng(lb1_shape(ctx, 'tunnel lines', 0, 0));
        for (m = mHi; m >= mLo; m--) {
            var gl = jzGrp(LS, 'frame ' + m), hdm = TH + ph + 'var Lv=' + m + '-1+ph,SS=' + jzN(s0) + '*Math.pow(' + jzN(q) + ',Lv);';
            // (each rect is fully set up before the next item is added: adding to the group invalidates held references in AE)
            var r1 = jzAddRect(gl, 2 * A, lw);
            jzSetExpr(r1.property('ADBE Vector Rect Size'), hdm + '[' + jzN(2 * A) + '*SS,' + jzN(lw) + ']');
            jzSetExpr(r1.property('ADBE Vector Rect Position'), hdm + '[' + jzN(cx) + ',' + jzN(cy) + '-' + jzN(B) + '*SS+' + jzN(lw / 2) + ']');
            var r2 = jzAddRect(gl, 2 * A, lw);
            jzSetExpr(r2.property('ADBE Vector Rect Size'), hdm + '[' + jzN(2 * A) + '*SS,' + jzN(lw) + ']');
            jzSetExpr(r2.property('ADBE Vector Rect Position'), hdm + '[' + jzN(cx) + ',' + jzN(cy) + '+' + jzN(B) + '*SS-' + jzN(lw / 2) + ']');
            jzAddFill(gl, sc.sub);
            lb1_gOp(gl, hdm + alpha + '50*al');
        }
        // text frames: 4 edges of glyphs per frame (one layer each), built at scale 1 and zoomed by expression
        var f0 = Math.min(A, B) * 0.15, inset = f0 * 0.62, hl = 2 * A - inset * 2.4, vl = 2 * B - inset * 2.4;
        for (m = mHi; m >= mLo; m--) {
            var gi = ((m * 7) % NU + NU) % NU, chs = [], pts = [], rots = [];
            var edge = function (len, ex, ey, ux, uy, rot) {
                var arr = [], acc = 0, tt;
                for (tt = 0; tt < 80; tt++) { var ch = unit[(gi + tt) % NU], ad = lb1_adv(ch) * f0 * 1.06; if (acc + ad > len) { gi += tt; break; } acc += ad; arr.push(ch); }
                var ws = [], tw = 0;
                for (tt = 0; tt < arr.length; tt++) { ws.push(lb1_adv(arr[tt]) * f0); tw += ws[tt] + (tt < arr.length - 1 ? 0.06 * f0 : 0); }
                var x = -tw / 2;
                for (tt = 0; tt < arr.length; tt++) {
                    var cc = x + ws[tt] / 2; x += ws[tt] + 0.06 * f0;
                    if (lb1_isSp(arr[tt])) continue;
                    chs.push(arr[tt]); pts.push([ex + ux * cc, ey + uy * cc]); rots.push(rot);
                }
            };
            edge(hl, cx, cy - B + inset, 1, 0, 0);
            edge(vl, cx + A - inset, cy, 0, 1, 90);
            edge(hl, cx, cy + B - inset, -1, 0, 180);
            edge(vl, cx - A + inset, cy, 0, -1, -90);
            if (!chs.length) continue;
            var outline = style === 'outline' || (style === 'alt' && ((m % 2) + 2) % 2 === 0);
            var col = ((m % 3) + 3) % 3 === 0 ? sc.accent : sc.fg;
            var go = { font: font, size: f0, color: col, name: 'tunnel frame ' + m };
            if (outline) { go.fill = false; go.stroke = Math.max(1 * k, f0 * 0.035); go.strokeColor = col; }
            var FL = lb1_glyphs(ctx, chs, go);
            lb1_place(FL, pts); jzCharRotations(FL.L, rots, 'JZ Edge');
            FL = lb1_ng(FL.L);
            jzXf(FL, 'ADBE Anchor Point').setValue([cx, cy]); jzXf(FL, 'ADBE Position').setValue([cx, cy]);
            var hdf = TH + ph + 'var Lv=' + m + '-1+ph,SS=' + jzN(s0) + '*Math.pow(' + jzN(q) + ',Lv);';
            jzSetExpr(jzXf(FL, 'ADBE Scale'), hdf + '[value[0]*SS,value[1]*SS]');
            jzSetExpr(jzXf(FL, 'ADBE Opacity'), hdf + alpha + 'value*al');
        }
        var ML = lb1_textAt(ctx, mt, { font: fontC, size: size, color: sc.fg, x: cx, y: cy, track: 0.05, lead: 1.15, name: c.text });
        jzAnimate(ctx, ML, { mi: 0 });
        return lb1_bb(cx, cy, mm.w, mm.h);
    }
});

/* ================================================================== 5 wordCloud — ワードクラウド */
function lb1_segType(ch) {
    if (/[\s　]/.test(ch)) return 'S';
    if (jzIsPunct(ch)) return 'P';
    if (jzIsKanji(ch)) return 'K';
    if (jzIsHira(ch)) return 'H';
    if (jzIsKata(ch) || ch === 'ー') return 'T';
    if (jzIsLatin(ch)) return 'L';
    return 'O';
}
// script runs (kanji + following kana stay together) — the browser's segmenter fallback
function lb1_segments(text) {
    var a = jzChars(String(text || '')), out = [], cur = '', ct = '';
    for (var i = 0; i < a.length; i++) { var t = lb1_segType(a[i]); if (cur && t !== ct && !(ct === 'K' && t === 'H')) { out.push(cur); cur = ''; } cur += a[i]; ct = t; }
    if (cur) out.push(cur);
    return out;
}
jzReg('layout', 'wordCloud', {
    plan: function (rng, cut, st) {
        var pool = jzFontsOf(st, ['display', 'serif', 'body']);
        return {
            font: rng.pick(jzFontsOf(st, ['display'])), fonts: [rng.pick(pool), rng.pick(pool), rng.pick(jzFontsOf(st, ['body', 'serif']))],
            vert: rng.pick([0, 0.3, 0.5]), accentN: rng.int(1, 3), outlineK: rng.pick([0, 0.2, 0.35]), wide: rng.range(1.2, 1.7)
        };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, M = jzU(ctx), k = lb1_k(ctx), i, j;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), fonts = jzP(ctx, 'fonts', null);
        if (!fonts || !fonts.length) fonts = [font, jzSerifF(ctx), jzBodyF(ctx)];
        var vertK = jzP(ctx, 'vert', 0.3), accentN = jzP(ctx, 'accentN', 2), outlineK = jzP(ctx, 'outlineK', 0.2), wide = jzP(ctx, 'wide', 1.4);
        var port = W < H, mt = lb1_lines(c.text, W, H, 9, 5), lo = { track: 0.03, lead: 1.1 };
        var size = Math.min(lb1_fitSize(mt, W * (port ? 0.7 : 0.52), H * 0.24, lo), H * 0.18), mm = lb1_measure(mt, size, lo);
        // ---- word pool (same order as the browser)
        var txt = lb1_clean(c.text), pool = [];
        function add(w) {
            w = jzTrim(String(w || ''));
            if (!w || jzCount(w) > 14 || jzIndexOf(pool, w) >= 0) return;
            var ch = jzChars(w), allP = true;
            for (var q = 0; q < ch.length; q++) if (!jzIsPunct(ch[q])) { allP = false; break; }
            if (!allP) pool.push(w);
        }
        var src = c.lineText || c.text, arr = jzChunk(src);
        for (i = 0; i < arr.length; i++) add(arr[i]);
        arr = c.words || [];
        for (i = 0; i < arr.length; i++) add(arr[i]);
        arr = lb1_segments(src);
        for (i = 0; i < arr.length; i++) { var g0 = jzTrim(arr[i]), hasK = false, gc = jzChars(g0); for (j = 0; j < gc.length; j++) if (jzIsKanji(gc[j])) hasK = true; if (jzCount(g0) >= 2 || hasK) add(g0); }
        var rom = lb1_roma(txt); if (rom) add(rom);
        if (c.note) add(c.note);
        add(txt);
        arr = jzChars(txt);
        for (i = 0; i < arr.length; i++) if (jzIsKanji(arr[i])) add(arr[i]);
        if (jzCount(c.lineText || '') <= 14) add(c.lineText);
        if (!pool.length) pool.push(txt || '・');
        // ---- spiral placement around the lyric (box collisions)
        var boxes = [[W / 2 - mm.w / 2 - size * 0.25, H / 2 - mm.h / 2 - size * 0.18, W / 2 + mm.w / 2 + size * 0.25, H / 2 + mm.h / 2 + size * 0.18]];
        var stretchX = port ? 0.75 : wide, stretchY = port ? 1.3 : 1, maxR = Math.sqrt(W * W + H * H) * 0.55, words = [], acc = 0;
        for (var kk = 0; kk < 70 && words.length < 44; kk++) {
            var word = pool[kk % pool.length], latin = /[A-Za-z]/.test(word);
            var vertical = !latin && jzCount(word) <= 6 && jzR(s, kk, 3) < vertK;
            var tier = Math.pow(0.95, words.length);
            var fs = Math.max(M * 0.018, Math.min(W * 0.4 / Math.max(1.5, jzCount(word)), size * 0.6, M * 0.125 * tier * (0.65 + 0.7 * jzR(s, kk, 4))));
            var wo = { track: 0.02, vertical: vertical }, m = lb1_measure(word, fs, wo);
            if (m.w > W * 0.9 || m.h > H * 0.9) { fs *= Math.min(W * 0.9 / m.w, H * 0.9 / m.h); m = lb1_measure(word, fs, wo); }
            var pad = fs * 0.12, w2 = m.w / 2 + pad, h2 = m.h / 2 + pad, an0 = jzR(s, kk, 5) * Math.PI * 2, placed = null;
            for (var t = 0; t < 520; t++) {
                var ang = an0 + t * 0.42, rad = (t / 520) * maxR;
                var x = W / 2 + Math.cos(ang) * rad * stretchX, y = H / 2 + Math.sin(ang) * rad * stretchY * 0.8;
                if (x - w2 < W * 0.035 || x + w2 > W * 0.965 || y - h2 < H * 0.045 || y + h2 > H * 0.955) continue;
                var hit = false;
                for (var b = 0; b < boxes.length; b++) { var bx = boxes[b]; if (x - w2 < bx[2] && x + w2 > bx[0] && y - h2 < bx[3] && y + h2 > bx[1]) { hit = true; break; } }
                if (!hit) { placed = [x, y]; break; }
            }
            if (!placed) { acc++; if (acc > 16) break; continue; }
            boxes.push([placed[0] - w2, placed[1] - h2, placed[0] + w2, placed[1] + h2]);
            var d = Math.sqrt(Math.pow((placed[0] - W / 2) / W, 2) + Math.pow((placed[1] - H / 2) / H, 2)), idx = words.length, ai = jzIndexOf([4, 9, 15], idx);
            words.push({ text: word, font: fonts[kk % fonts.length], size: fs, x: placed[0], y: placed[1], vertical: vertical, delay: 0.06 + d * 0.9 + idx * 0.012,
                col: ai >= 0 && ai < accentN ? 'a' : (idx % 2 ? 's' : 'f'), a: idx % 2 ? 0.8 : 0.5 + 0.2 * tier, outline: jzR(s, kk, 7) < outlineK });
        }
        // ---- one text layer per (font, outline) group; every glyph placed / popped per word by expression
        var TH = jzTH(ctx), groups = {}, order = [];
        for (i = 0; i < words.length; i++) { var key = words[i].font + (words[i].outline ? '|o' : '|f'); if (!groups[key]) { groups[key] = []; order.push(key); } groups[key].push(i); }
        for (var gk = 0; gk < order.length; gk++) {
            var list = groups[order[gk]], fsL = 1, chs = [], WI = [], RX = [], RY = [], SC = [], SUB = [], ACC = [];
            for (i = 0; i < list.length; i++) fsL = Math.max(fsL, words[list[i]].size);
            for (i = 0; i < list.length; i++) {
                var wd = words[list[i]], lay = lb1_layout(wd.text, wd.size, { track: 0.02, vertical: wd.vertical });
                for (j = 0; j < lay.length; j++) {
                    if (lay[j].sp) continue;
                    chs.push(lay[j].ch); WI.push(list[i]); RX.push(lay[j].x); RY.push(lay[j].y); SC.push(wd.size / fsL);
                    SUB.push(wd.col === 's'); ACC.push(wd.col === 'a');
                }
            }
            if (!chs.length) continue;
            var ol = words[list[0]].outline, go = { font: words[list[0]].font, size: fsL, color: sc.fg, name: 'word cloud ' + (gk + 1) };
            if (ol) { go.fill = false; go.stroke = Math.max(1 * k, fsL * 0.03); go.strokeColor = sc.fg; }
            var G = lb1_glyphs(ctx, chs, go); lb1_ng(G.L);
            var WX = [], WY = [], DL = [], AL = [];
            for (i = 0; i < words.length; i++) { WX.push(words[i].x); WY.push(words[i].y); DL.push(words[i].delay); AL.push(words[i].a); }
            var hd = TH + 'var WI=' + lb1_arr(WI) + ',w=WI[textIndex-1]||0,DLs=' + lb1_arr(DL) + ',q=cl((time-DLs[w])/0.32),sq=q<=0?0:ob(q,1.7)*(1-0.25*ic(PO));';
            lb1_placeAnim(ctx, G, 'JZ Cloud Place', hd + 'var WX=' + lb1_arr(WX) + ',WY=' + lb1_arr(WY) + ',RX=' + lb1_arr(RX) + ',RY=' + lb1_arr(RY) + ',NA=' + jzN(M * 0.004) + ';',
                'x=WX[w]+noise(time*0.35+w*3.1+' + (s % 97) + ')*NA+RX[i]*sq;y=WY[w]+noise(time*0.3+w*5.7+' + (s % 89 + 50) + ')*NA+RY[i]*sq');
            lb1_scAnim(G.L, 'JZ Cloud Pop', hd + 'var SC=' + lb1_arr(SC) + ';', 'sx=SC[textIndex-1]*sq;sy=sx');
            lb1_opAnim(G.L, 'JZ Cloud Fade', hd + 'var AL=' + lb1_arr(AL) + ';', 'a=Math.min(1,q*2.5)*K*AL[w]');
            if (ol) {
                jzAnimator(G.L, 'JZ Cloud Sub', [['ADBE Text Stroke Color', jzHex(sc.sub)]], 'var a=' + lb1_arr(SUB.length ? (function () { var o = []; for (var z = 0; z < SUB.length; z++) o.push(SUB[z] ? 1 : 0); return o; })() : [0]) + ';(a[textIndex-1]||0)*100');
                jzAnimator(G.L, 'JZ Cloud Accent', [['ADBE Text Stroke Color', jzHex(sc.accent)]], 'var a=' + lb1_arr((function () { var o = []; for (var z = 0; z < ACC.length; z++) o.push(ACC[z] ? 1 : 0); return o; })()) + ';(a[textIndex-1]||0)*100');
            } else {
                jzCharColors(G.L, sc.sub, SUB, 'JZ Cloud Sub');
                jzCharColors(G.L, sc.accent, ACC, 'JZ Cloud Accent');
            }
        }
        var ML = lb1_textAt(ctx, mt, { font: font, size: size, color: sc.fg, x: W / 2, y: H / 2, track: 0.03, lead: 1.1, name: c.text });
        jzAnimate(ctx, ML, { mi: 0 });
        return lb1_bb(W / 2, H / 2, mm.w, mm.h);
    }
});

/* ================================================================== 6 bounceLine — 跳ねる */
jzReg('layout', 'bounceLine', {
    plan: function (rng, cut, st) {
        return {
            font: rng.pick(jzFontsOf(st, ['display'])), mode: rng.pick(['wave', 'wave', 'beat', 'hop']), hop: rng.range(0.38, 0.6),
            tempo: rng.range(0.42, 0.6), shadow: rng.chance(0.7), line: rng.pick(['line', 'line', 'dots', 'none']), tilt: rng.chance(0.5)
        };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, M = jzU(ctx), k = lb1_k(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), mode = jzP(ctx, 'mode', 'wave'), hop = jzP(ctx, 'hop', 0.5), tempo = jzP(ctx, 'tempo', 0.5);
        var shadow = !!jzP(ctx, 'shadow', true), lineK = jzP(ctx, 'line', 'line'), tilt = !!jzP(ctx, 'tilt', false);
        var mt = lb1_lines(c.text, W, H, 11, 6), nL = mt.split('\r').length, lo = { track: 0.1, lead: 2.0 };
        var size = Math.min(lb1_fitSize(mt, W * 0.84, H * (nL > 1 ? 0.52 : 0.3), lo), H * 0.2);
        var cx = W / 2, cy = H / 2 + (nL > 1 ? 0 : H * 0.03);
        var lay = lb1_layout(mt, size, lo), gl = [], MP = [];
        for (i = 0; i < lay.length; i++) { MP.push(-1); if (!lay[i].sp) { MP[i] = gl.length; gl.push(lay[i]); } }
        var n = gl.length;
        if (!n) return null;
        var hopH = size * hop, hd = jzClamp(tempo * 0.62, 0.22, 0.34), sq = 0.13, TH = jzTH(ctx);
        // hop clock per glyph -> tau (time since take-off), then the squash / stretch / height profile
        var clock;
        if (mode === 'wave') {
            var gap = Math.min(0.09, 0.9 / n), P = Math.max(tempo * 2.2, n * gap + hd + 0.35);
            clock = 'var tt=t-gi*' + jzN(gap) + ';tau=tt<-0.1?-1:((tt+0.07)%' + jzN(P) + ')-0.07;';
        } else if (mode === 'beat') {
            clock = 'var kb=Math.floor(t/' + jzN(tempo) + ');tau=(((kb%' + n + ')+' + n + ')%' + n + ')===gi?t-kb*' + jzN(tempo) + ':-1;';
        } else {
            var PP = [], PH = [];
            for (i = 0; i < n; i++) { PP.push(0.9 + 0.8 * jzR(s, i, 7)); PH.push(jzR(s, i, 8) * PP[i]); }
            clock = 'var PP=' + lb1_arr(PP) + ',PH=' + lb1_arr(PH) + ';var pp=PP[gi],ps=PH[gi];tau=((t+ps)%pp)-0.07;if(t+ps<pp-0.07)tau=-1;';
        }
        var prof = 'var t=time-0.25,tau=-1;if(gi>=0&&t>-0.1){' + clock + '}var h=0,px=1,py=1,HD=' + jzN(hd) + ',SQ=' + sq + ';' +
            'if(tau>=-0.07&&tau<=HD+SQ){if(tau<0){var kq=Math.sin(Math.PI*(tau+0.07)/0.07);px=1+0.08*kq;py=1-0.1*kq;}else if(tau<HD){var uu=tau/HD;h=4*uu*(1-uu);px=0.94;py=1.08;}else{var kq=Math.sin(Math.PI*(tau-HD)/SQ);px=1+0.2*kq;py=1-0.24*kq;}}';
        var gHead = TH + 'var MP=' + lb1_arr(MP) + ',gi=MP[textIndex-1];if(gi==null)gi=-1;' + prof;
        // shadows under the glyphs (one shape layer)
        if (shadow) {
            var SH = lb1_ng(lb1_shape(ctx, 'hop shadows', 0, 0));
            for (i = 0; i < n; i++) {
                var gs = jzGrp(SH, 'shadow ' + (i + 1)), el = jzAddEllipse(gs, size * 0.68, size * 0.136, cx + gl[i].x, cy + gl[i].y + size * 0.56);
                var sh = TH + 'var gi=' + i + ';' + prof + 'var kk=1-h*0.55;';
                jzSetExpr(el.property('ADBE Vector Ellipse Size'), sh + '[' + jzN(size * 0.68) + '*kk*px,' + jzN(size * 0.136) + '*kk*px]');
                jzAddFill(gs, sc.sub);                              // (after the ellipse is set up: adding invalidates `el` in AE)
                lb1_gOp(gs, sh + '28*kk*K*oe(time/0.5)');
            }
        }
        // the lyric (one text layer): per-glyph hop, squash about the glyph's foot, tilt, beat colour
        var ML = lb1_textAt(ctx, mt, { font: font, size: size, color: sc.fg, x: cx, y: cy, track: 0.1, lead: 2.0, name: c.text });
        lb1_posAnim(ML, 'JZ Hop', size * 2, gHead, 'dy=' + jzN(size * 0.5) + '*(1-py)-h*' + jzN(hopH));
        lb1_scAnim(ML, 'JZ Squash', gHead, 'sx=px;sy=py');
        if (tilt) lb1_rotAnim(ML, 'JZ Hop Tilt', 7, gHead, 'if(h>0)r=Math.sin(tau/HD*Math.PI*2)*7*(gi%2?1:-1)');
        if (mode === 'beat') lb1_colAnim(ML, 'JZ Beat Colour', sc.accent, gHead, 'm=h>0?1:0');
        lb1_cutStagger(ctx, ML, MP, 1);
        jzAnimate(ctx, ML, { mi: 0 });
        // base line / dots per text line
        if (lineK !== 'none') {
            var LS = lb1_ng(lb1_shape(ctx, 'hop baseline', 0, 0)), lw = Math.max(1.5 * k, M * 0.0022), lines = {};
            for (i = 0; i < n; i++) { var g = gl[i], q = lines[g.li] || (lines[g.li] = { x0: 1e9, x1: -1e9, y: cy + g.y + size * 0.5 }); q.x0 = Math.min(q.x0, cx + g.x - g.w / 2); q.x1 = Math.max(q.x1, cx + g.x + g.w / 2); }
            for (var li in lines) if (lines.hasOwnProperty(li)) {
                var Lq = lines[li], pad = size * 0.35, x0 = Lq.x0 - pad, x1 = Lq.x1 + pad, yy = Lq.y + size * 0.1, gg = jzGrp(LS, 'line ' + li);
                if (lineK === 'line') { lb1_line(gg, [[x0, yy], [x1, yy]], sc.sub, lw, 70); jzAddTrimPaths(gg, JZ_FNS + '100*oe(time/0.5)'); }
                else {
                    var mm = Math.max(4, Math.round((x1 - x0) / (size * 0.25)));
                    jzAddEllipse(gg, lw * 2.4, lw * 2.4, x0, yy); jzAddFill(gg, sc.sub, 80);
                    var rp = jzVecs(gg).addProperty('ADBE Vector Filter - Repeater');
                    jzSetExpr(rp.property('ADBE Vector Repeater Copies'), JZ_FNS + 'Math.floor(oe(time/0.5)*' + mm + '+1e-6)+1');
                    jzVecs(gg).property('ADBE Vector Filter - Repeater').property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([(x1 - x0) / mm, 0]);
                }
            }
            jzSetExpr(jzXf(LS, 'ADBE Opacity'), TH + '100*K');
        }
        return lb1_bb(cx, cy, lay.W, lay.H);
    }
});

/* ================================================================== 7 elastic — ゴム */
jzReg('layout', 'elastic', {
    plan: function (rng, cut, st) {
        var port = cut.H > cut.W;
        return {
            font: rng.pick(jzFontsOf(st, ['display', 'serif'])), orient: port ? (cut.n <= 5 ? rng.pick(['v', 'v', 'h']) : 'v') : rng.pick(['h', 'h', 'diag']),
            ang: rng.range(6, 12) * rng.pick([1, -1]), every: rng.range(1.1, 1.6), amp: rng.range(0.3, 0.45), anchor: rng.pick(['dot', 'ring', 'pin'])
        };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), k = lb1_k(ctx), i, j;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), orient = jzP(ctx, 'orient', 'h'), every = jzP(ctx, 'every', 1.3), amp = jzP(ctx, 'amp', 0.38), anchor = jzP(ctx, 'anchor', 'dot');
        var vert = orient === 'v', txt = vert ? lb1_clean(c.text) : jzTrim(c.text), ang = orient === 'diag' ? jzP(ctx, 'ang', 8) : 0;
        var lo = { track: 0.08, vertical: vert }, avail = vert ? H * 0.58 : (W < H ? W * 0.7 : W * 0.62);
        var size = Math.min(lb1_fitSize(txt, vert ? W * 0.3 : avail, vert ? avail : H * 0.22, lo), H * 0.2);
        var lay = lb1_layout(txt, size, lo), gl = [], AL = [], MP = [];
        for (i = 0; i < lay.length; i++) { AL.push(vert ? lay[i].y : lay[i].x); MP.push(lay[i].sp ? -1 : gl.length); if (!lay[i].sp) gl.push(lay[i]); }
        var n = gl.length;
        if (!n) return null;
        var al = function (g) { return vert ? g.y : g.x; }, ext = function (g) { return vert ? g.h : g.w; };
        var a0 = al(gl[0]) - ext(gl[0]) / 2, a1 = al(gl[n - 1]) + ext(gl[n - 1]) / 2, half = (a1 - a0) / 2 + size * 0.85;
        var cx = W / 2, cy = H / 2, TH = jzTH(ctx);
        // spring stretch k(t), pluck standing wave wv(u) (u = 0..1 along the band; k cancels out of u)
        var hd = TH + 'var te=time-0.02,spr=te<=0?0:1-Math.exp(-te/0.1)*Math.cos(te*15),kk=Math.max(0.04,spr)*(1+0.6*ic(PO));' +
            'var tau=time>0.45?(time-0.45)%' + jzN(every) + ':-1,A=' + jzN(size * amp) + '*(time<0.45?0:1),HF=' + jzN(half) + ';' +
            'function wv(u){return tau<0?0:A*Math.sin(Math.PI*u)*Math.cos(tau*22)*Math.exp(-tau/0.42);}function sl(u){return tau<0?0:A*Math.PI/Math.max(1,2*HF*kk)*Math.cos(Math.PI*u)*Math.cos(tau*22)*Math.exp(-tau/0.42);}';
        // band + anchors (one shape layer in band space: x = along, y = across)
        var S = lb1_shape(ctx, 'elastic band', cx, cy), lw = Math.max(1.5 * k, size * 0.03), R = Math.max(5 * k, size * 0.1), sgn = vert ? -1 : 1;
        jzXf(S, 'ADBE Rotate Z').setValue(vert ? 90 : ang);
        var ends = [[-1, a0 - size * 0.12], [1, a1 + size * 0.12]], LMAX = Math.max(W, H) * 2, PC = 4;
        for (var e = 0; e < 2; e++) {
            var side = ends[e][0], tE = ends[e][1];
            // (anchor at side*HF*kk) -> (text end tE*kk): PC straight pieces following the wave
            for (j = 0; j < PC; j++) {
                var gp = jzGrp(S, 'band ' + (e + 1) + '.' + (j + 1));
                lb1_line(gp, [[0, 0], [LMAX, 0]], sc.sub, lw, 90);
                var seg = hd + 'var aA=' + side + '*HF*kk,aT=' + jzN(tE) + '*kk,pa=aA+(aT-aA)*' + jzN(j / PC) + ',pb=aA+(aT-aA)*' + jzN((j + 1) / PC) + ';' +
                    'var ua=(pa/kk+HF)/(2*HF),ub=(pb/kk+HF)/(2*HF),da=' + sgn + '*wv(ua),db=' + sgn + '*wv(ub);';
                jzAddTrimPaths(gp, seg + 'Math.min(100,Math.sqrt((pb-pa)*(pb-pa)+(db-da)*(db-da))/' + jzN(LMAX) + '*100)');
                lb1_gPos(gp, seg + '[pa,da]');
                lb1_gRot(gp, seg + 'Math.atan2(db-da,pb-pa)*180/Math.PI');
            }
        }
        // anchors: the accent parts are ghosted in the browser (own layer, same band space), the fg parts are not (band layer)
        var SA = lb1_shape(ctx, 'elastic anchors', cx, cy);
        jzXf(SA, 'ADBE Rotate Z').setValue(vert ? 90 : ang);
        for (e = 0; e < 2; e++) {
            var ga = anchor === 'dot' ? null : jzGrp(S, 'anchor ' + (e + 1)), gz = jzGrp(SA, 'anchor ' + (e + 1));
            if (anchor === 'dot') { var d1 = lb1_sub(gz, 'dot'); jzAddEllipse(d1, R * 2, R * 2); jzAddFill(d1, sc.accent); }
            else if (anchor === 'ring') {
                var d2 = lb1_sub(ga, 'core'); jzAddEllipse(d2, R * 0.9, R * 0.9); jzAddFill(d2, sc.fg);
                var d3 = lb1_sub(gz, 'ring'); jzAddEllipse(d3, R * 2.6, R * 2.6); jzAddStroke(d3, sc.accent, lw * 1.3);
            } else {
                var d4 = lb1_sub(gz, 'head'); jzAddEllipse(d4, R * 1.8, R * 1.8, 0, -sgn * R * 3.2); jzAddFill(d4, sc.accent);
                var d5 = lb1_sub(ga, 'foot'); jzAddEllipse(d5, R * 0.8, R * 0.8); jzAddFill(d5, sc.fg);
                var d6 = lb1_sub(ga, 'pin'); lb1_line(d6, [[0, -sgn * R * 3.2], [0, 0]], sc.fg, lw);
            }
            var gg = ga ? [ga, gz] : [gz];
            for (j = 0; j < gg.length; j++) {
                lb1_gPos(gg[j], hd + '[' + (e ? 1 : -1) + '*HF*kk,0]');
                lb1_gSc(gg[j], TH + 'var q=cl(time/0.2);var e=q<=0?0:ob(q,2)*K;[value[0]*e,value[1]*e]');
            }
        }
        lb1_ng(S);                                               // band (+ fg anchor parts): ghost off
        // the lyric rides on the band: along-stretch, squash / stretch, wave offset and slope per glyph
        var ML = lb1_textAt(ctx, txt, { font: font, size: size, color: sc.fg, x: cx, y: cy, track: 0.08, vertical: vert, name: c.text });
        if (ang) jzXf(ML, 'ADBE Rotate Z').setValue(ang);
        var gh = hd + 'var AL=' + lb1_arr(AL) + ',ag=AL[textIndex-1]||0,u=(ag+HF)/(2*HF),st=Math.max(0.15,Math.min(1.6,kk));';
        lb1_posAnim(ML, 'JZ Elastic Move', Math.max(W, H) * 2, gh, vert ? 'dx=wv(u);dy=ag*(kk-1)' : 'dx=ag*(kk-1);dy=wv(u)');
        lb1_scAnim(ML, 'JZ Elastic Stretch', gh, vert ? 'sx=1/Math.sqrt(st);sy=Math.min(2,st)' : 'sx=Math.min(2,st);sy=1/Math.sqrt(st)');
        lb1_rotAnim(ML, 'JZ Elastic Slope', 60, gh, 'r=' + (vert ? '-' : '') + 'Math.atan(sl(u))*180/Math.PI');
        lb1_cutStagger(ctx, ML, MP, 0.5);
        jzAnimate(ctx, ML, { mi: 0 });
        var bw = vert ? size : (a1 - a0), bh = vert ? (a1 - a0) : size;
        return lb1_bb(cx, cy, bw, bh);
    }
});

/* ================================================================== 8 crossBands — 交差帯 */
jzReg('layout', 'crossBands', {
    plan: function (rng, cut, st) {
        return {
            font: rng.pick(jzFontsOf(st, ['display'])), fb: rng.pick(jzFontsOf(st, ['body', 'display'])), ang: rng.range(13, 22),
            plate: rng.pick(['box', 'double', 'shadow']), speed: rng.range(0.7, 1.2), swap: rng.chance(0.5), sep: rng.pick(['／', '・', '　', '×'])
        };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), k = lb1_k(ctx), b;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), fb = jzP(ctx, 'fb', jzBodyF(ctx)), ang0 = jzP(ctx, 'ang', 16), plate = jzP(ctx, 'plate', 'box');
        var speed = jzP(ctx, 'speed', 1), swap = !!jzP(ctx, 'swap', false), sep = jzP(ctx, 'sep', '／');
        var port = W < H, ang = port ? ang0 + 16 : ang0, bh = M * (port ? 0.12 : 0.105);
        var cols = [lb1_plateCol(sc, [sc.ink, sc.fg]), lb1_plateCol(sc, [sc.accent, sc.accent2, sc.sub])];
        if (swap) cols.reverse();
        var len = Math.sqrt(W * W + H * H) * 1.15, TH = jzTH(ctx);
        var unit = jzTrim(String(c.lineText || c.text).replace(/\s+/g, ' ')) + '　' + sep + '　';
        var fsz = bh * 0.46, per = Math.max(1, lb1_measure(unit, fsz, { track: 0.08 }).w + 0.08 * fsz), reps = Math.min(40, Math.ceil(len * 1.2 / per) + 2), row = '';
        for (var r = 0; r < reps; r++) row += unit;
        for (b = 0; b < 2; b++) {
            var a = b ? -ang : ang, dir = b ? -1 : 1, ar = a * Math.PI / 180;
            // the band grows from one end (scale on the group, anchored at that end)
            var B = lb1_ng(lb1_shape(ctx, 'band ' + (b + 1), W / 2, H / 2)), gb = jzGrp(B, 'band');
            jzAddRect(gb, len, bh); jzAddFill(gb, cols[b]);
            jzGX(gb).property('ADBE Vector Anchor').setValue([-dir * len / 2, 0]); jzGX(gb).property('ADBE Vector Position').setValue([-dir * len / 2, 0]);
            lb1_gSc(gb, TH + 'var e=oe((time-' + jzN(b * 0.08) + ')/0.5)*K;[value[0]*e,value[1]]');
            jzXf(B, 'ADBE Rotate Z').setValue(a);
            // scrolling copy inside the band (alpha matte = a copy of the band)
            var T = jzText(ctx, row, { font: fb, size: fsz, color: lb1_onCol(sc, cols[b]), x: 0, y: 0, align: 'left', track: 0.08, name: 'band text ' + (b + 1) });
            jzXf(T, 'ADBE Anchor Point').setValue([0, -LB1_CY * fsz]); jzXf(T, 'ADBE Rotate Z').setValue(a);
            jzSetExpr(jzXf(T, 'ADBE Position'), 'var per=' + jzN(per) + ',off=((time*' + jzN(speed * M * 0.12 * dir) + ')%per+per)%per,xl=' + jzN(-len * 0.6 - per) + '+off;[' + jzN(W / 2) + '+' + jzN(Math.cos(ar)) + '*xl,' + jzN(H / 2) + '+' + jzN(Math.sin(ar)) + '*xl]');
            var D = B.duplicate(); D.name = 'band ' + (b + 1) + ' matte';
            D.moveBefore(T);
            lb1_matte(T, D); lb1_ng(T);
        }
        // lyric plate at the crossing
        var mt = lb1_lines(c.text, W, H, 9, 5), lo = { track: 0.04, lead: 1.12 };
        var size = Math.min(lb1_fitSize(mt, W * (port ? 0.66 : 0.5), H * 0.24, lo), H * 0.17), mm = lb1_measure(mt, size, lo);
        var pw = mm.w + size * 0.9, ph = mm.h + size * 0.7, lw = Math.max(2 * k, size * 0.035);
        var PL = lb1_ng(lb1_shape(ctx, 'plate', W / 2, H / 2));
        if (plate === 'double') { var o = lw * 2.6, g2 = jzGrp(PL, 'inner'); jzAddRect(g2, pw - o * 2, ph - o * 2); jzAddStroke(g2, sc.fg, lw * 0.5); }
        var g1 = jzGrp(PL, 'plate'); jzAddRect(g1, pw, ph); jzAddStroke(g1, sc.fg, lw); jzAddFill(g1, sc.bg);
        if (plate === 'shadow') { var os = size * 0.12, g3 = jzGrp(PL, 'shadow'); jzAddRect(g3, pw, ph, 0, os, os); jzAddFill(g3, cols[1]); }
        jzSetExpr(jzXf(PL, 'ADBE Scale'), TH + 'var q=cl((time-0.1)/0.28);var e=q<=0?0:ob(q,1.6)*K;[value[0]*e,value[1]*e]');
        var ML = lb1_textAt(ctx, mt, { font: font, size: size, color: sc.fg, x: W / 2, y: H / 2, track: 0.04, lead: 1.12, name: c.text });
        jzAnimate(ctx, ML, { mi: 0 });
        return lb1_bb(W / 2, H / 2, pw, ph);
    }
});

/* ================================================================== 9 stickerBomb — ステッカー */
function lb1_stickerShape(g, shape, w, h, grow, dx, dy) {
    var W2 = w + grow * 2, H2 = h + grow * 2;
    if (shape === 'circle') { var D = Math.max(W2, H2); return jzAddEllipse(g, D, D, dx || 0, dy || 0); }
    if (shape === 'burst') { var R = Math.max(W2, H2) / 2 * 1.08, st = jzAddStar(g, 16, R, R * 0.84); if (dx || dy) st.property('ADBE Vector Star Position').setValue([dx, dy]); return st; }
    return lb1_rrect(g, W2, H2, shape === 'pill' ? H2 / 2 : Math.min(W2, H2) * 0.2, dx || 0, dy || 0);
}
// a slapped-on sticker: border + face (+ soft shadow on light backgrounds); returns the shape layer (text children ride on it)
function lb1_sticker(ctx, name, x, y, rot, sh, w, h, fill, t0, bw, dark, border) {
    var S = lb1_ng(lb1_shape(ctx, name, x, y)), TH = jzTH(ctx);
    var gF = jzGrp(S, 'face'); lb1_stickerShape(gF, sh, w, h, 0); jzAddFill(gF, fill);
    var gB = jzGrp(S, 'border'); lb1_stickerShape(gB, sh, w, h, bw); jzAddFill(gB, border);
    if (!dark) { var gS = jzGrp(S, 'shadow'); lb1_stickerShape(gS, sh, w, h, bw, bw * 0.5, bw * 0.7); jzAddFill(gS, ctx.sc.fg, 22); }
    jzXf(S, 'ADBE Rotate Z').setValue(rot);
    var q = TH + 'var q=cl((time-' + jzN(t0) + ')/0.16);';
    jzSetExpr(jzXf(S, 'ADBE Rotate Z'), q + 'value+(1-oc(q))*14');
    jzSetExpr(jzXf(S, 'ADBE Scale'), q + 'var s=q<=0?0:(1+0.3*Math.pow(1-q,2)-0.06*Math.sin(Math.PI*q)*(q<1?1:0))*(1+0.08*oc(PO));[value[0]*s,value[1]*s]');
    jzSetExpr(jzXf(S, 'ADBE Opacity'), q + 'q<=0?0:value*Math.min(1,q*3)*K');
    return S;
}
jzReg('layout', 'stickerBomb', {
    plan: function (rng, cut, st) {
        var n = cut.n;
        return {
            font: rng.pick(jzFontsOf(st, ['display'])), fs: rng.pick(jzFontsOf(st, ['body', 'display'])),
            main: n <= 3 ? rng.pick(['circle', 'burst', 'rrect']) : n <= 5 ? rng.pick(['rrect', 'burst', 'pill']) : rng.pick(['rrect', 'pill']),
            cnt: rng.int(4, 6), rot: rng.range(-5, 5), spin: rng.range(0, 6)
        };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, M = jzU(ctx), k = lb1_k(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), fsF = jzP(ctx, 'fs', jzBodyF(ctx)), mainSh = jzP(ctx, 'main', 'rrect');
        var cnt = jzP(ctx, 'cnt', 5), rot0 = jzP(ctx, 'rot', 0), spin = jzP(ctx, 'spin', 0);
        var port = W < H, mt = lb1_lines(c.text, W, H, 8, 5), lo = { track: 0.03, lead: 1.1 };
        var size = Math.min(lb1_fitSize(mt, W * (port ? 0.64 : 0.5), H * 0.26, lo), H * (mainSh === 'circle' || mainSh === 'burst' ? 0.15 : 0.19)), mm = lb1_measure(mt, size, lo);
        var pw = mm.w + size * 0.8, ph = mm.h + size * 0.6, dark = jzLum(sc.bg) < 0.45, border = dark ? sc.fg : sc.bg, bw = Math.max(4 * k, size * 0.09);
        var TH = jzTH(ctx);
        // secondary stickers: words / romaji / chunks / No.xx / ♡ / !!
        var txt = lb1_clean(c.text), pool = [];
        function add(w) { w = jzTrim(String(w || '')); if (w && w !== txt && jzCount(w) <= 12 && jzIndexOf(pool, w) < 0) pool.push(w); }
        var ws = c.words || [];
        for (i = 0; i < ws.length; i++) add(ws[i]);
        var rom = lb1_roma(txt); if (rom) add(rom);
        ws = jzChunk(c.lineText || '');
        for (i = 0; i < ws.length; i++) add(ws[i]);
        add('No.' + jzPad((c.line || 0) + 1, 2)); add('♡'); add('!!');
        var fills = [], fc = [sc.accent, sc.ink, sc.accent2, sc.fg];
        for (i = 0; i < 4; i++) fills.push(lb1_plateCol(sc, [fc[i]]));
        var mainFill = lb1_plateCol(sc, [sc.ink, sc.accent]), hw = pw / 2, hh = ph / 2;
        for (var kk = 0; kk < cnt; kk++) {
            var word = pool[kk % pool.length], gc = jzCount(word);
            var sh = gc <= 2 ? (jzR(s, kk, 2) < 0.5 ? 'circle' : 'burst') : (jzR(s, kk, 2) < 0.5 ? 'pill' : 'rrect');
            var fsz = jzClamp(M * (0.042 + 0.018 * jzR(s, kk, 3)), 12 * k, 80 * k), m = lb1_measure(word, fsz, { track: 0.06 });
            var w = m.w + fsz, h = fsz * 1.7;
            if (sh === 'circle' || sh === 'burst') { w = h = Math.max(m.w, fsz) + fsz * 1.2; }
            var a = (kk / cnt) * Math.PI * 2 + (jzR(s, kk, 4) * 2 - 1) * 0.35 + spin;
            var x = jzClamp(W / 2 + Math.cos(a) * (hw + w * 0.32), W * 0.05 + w / 2, W * 0.95 - w / 2), y = jzClamp(H / 2 + Math.sin(a) * (hh + h * 0.4), H * 0.06 + h / 2, H * 0.94 - h / 2);
            var fill = fills[kk % 4] === mainFill ? fills[(kk + 1) % 4] : fills[kk % 4], t0 = 0.14 + kk * 0.07;
            var S = lb1_sticker(ctx, 'sticker ' + (kk + 1), x, y, (jzR(s, kk, 5) * 2 - 1) * 18, sh, w, h, fill, t0, bw, dark, border);
            var T = lb1_textAt(ctx, word, { font: fsF, size: fsz, color: lb1_onCol(sc, fill), x: x, y: y, track: 0.06, name: word });
            lb1_parent(T, S, 0, 0); lb1_ng(T);
            jzSetExpr(jzXf(T, 'ADBE Opacity'), TH + 'var q=cl((time-' + jzN(t0) + ')/0.16);q<=0?0:value*Math.min(1,q*3)*K');
        }
        // main sticker last (on top) with the lyric riding on it
        var mw = pw, mh = ph;
        if (mainSh === 'circle' || mainSh === 'burst') mw = mh = Math.max(pw, ph) * 1.02;
        var MS = lb1_sticker(ctx, 'main sticker', W / 2, H / 2, rot0, mainSh, mw, mh, mainFill, 0.02, bw, dark, border);
        var ML = lb1_textAt(ctx, mt, { font: font, size: size, color: lb1_onCol(sc, mainFill), x: W / 2, y: H / 2, track: 0.03, lead: 1.1, name: c.text });
        lb1_parent(ML, MS, 0, 0);
        jzAnimate(ctx, ML, { mi: 0, noHold: lb1_plateHold(ctx) });
        return lb1_bb(W / 2, H / 2, mw, mh);
    }
});

/* ================================================================== 10 neon — ネオン */
jzReg('layout', 'neon', {
    plan: function (rng, cut, st) {
        return {
            font: rng.pick(jzFontsOf(st, ['display', 'body'])), tube: rng.pick(['accent', 'accent', 'accent2', 'fg']),
            frame: rng.pick(['box', 'under', 'bracket', 'none']), flick: rng.chance(0.75), sub: rng.chance(0.5)
        };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, k = lb1_k(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), tubeK = jzP(ctx, 'tube', 'accent'), frame = jzP(ctx, 'frame', 'box'), flick = !!jzP(ctx, 'flick', true), sub = !!jzP(ctx, 'sub', false);
        var mt = lb1_lines(c.text, W, H, 9, 5), lo = { track: 0.08, lead: 1.25 };
        var size = Math.min(lb1_fitSize(mt, W * 0.72, H * 0.34, lo), H * 0.19), lay = lb1_layout(mt, size, lo);
        var dark = jzLum(sc.bg) < 0.45;
        var cand = tubeK === 'accent2' ? [sc.accent2, sc.accent, sc.fg] : tubeK === 'fg' ? [sc.fg, sc.accent] : [sc.accent, sc.accent2, sc.fg], tube = null;
        for (i = 0; i < cand.length; i++) if (cand[i] && jzContrast(cand[i], sc.bg) >= 2.2) { tube = cand[i]; break; }
        tube = tube || sc.fg;
        var core = jzMixHex(tube, '#FFFFFF', dark ? 0.72 : 0.35);
        var tw = Math.max(1.5 * k, size * (dark ? 0.05 : 0.06)), cw = Math.max(1 * k, size * 0.018), glowR = Math.min(60 * k, size * (dark ? 0.24 : 0.14));
        var TH = jzTH(ctx), cx = W / 2, cy = H / 2;
        function glow(L, r, amt) { var g = jzEffect(L, 'ADBE Glo2', 'JZ Neon Glow'); jzEP(g, 2, 25); jzEP(g, 3, r); jzEP(g, 4, amt); return g; }
        // ignition (random on / off while it strikes) + rare flicker, on a 24 fps step clock — the same hash on tube and core
        function on(idExpr, t0Expr, v) {     // expression code setting kk<v> (needs LB1_HR)
            return 'var tq' + v + '=time-(' + t0Expr + '),st' + v + '=Math.floor(time*24),kk' + v + '=1,ID' + v + '=' + idExpr + ';' +
                'if(tq' + v + '<0)kk' + v + '=0;else if(tq' + v + '<0.32)kk' + v + '=hr(SD+ID' + v + '*7,st' + v + ')<0.25+tq' + v + '*2?1:0.12;' +
                (flick ? 'else if(hr(SD+ID' + v + '*13,Math.floor(st' + v + '/2)+0.5)<0.007)kk' + v + '=0.2;' : '');
        }
        var T0 = [];
        for (i = 0; i < lay.length; i++) T0.push(0.04 + jzR(s, i, 5) * 0.28);
        var gOn = LB1_HR + 'var T0A=' + lb1_arr(T0) + ';' + on('textIndex', 'T0A[textIndex-1]||0', '');
        // tube (stroked, glowing) + a thin bright core on top (duplicate: same motion)
        var L = lb1_textAt(ctx, mt, { font: font, size: size, color: tube, fill: false, stroke: tw, strokeColor: tube, x: cx, y: cy, track: 0.08, lead: 1.25, name: c.text });
        glow(L, glowR, dark ? 1.4 : 0.8);
        var MPn = [], gn = 0;
        for (i = 0; i < lay.length; i++) MPn.push(lay[i].sp ? -1 : gn++);
        lb1_cutStagger(ctx, L, MPn, 0.4);
        jzAnimate(ctx, L, { mi: 0, treat: false });
        var D = L.duplicate();
        D.name = 'neon core'; lb1_ng(D);                     // the core is drawn with ghost: false (the tube is the ghosted lyric)
        jzTextDoc(D, function (td) { td.applyStroke = true; td.strokeColor = jzHex(core); td.strokeWidth = cw; });
        try { var fxp = D.property('ADBE Effect Parade'); for (i = fxp.numProperties; i >= 1; i--) if (fxp.property(i).name === 'JZ Neon Glow') fxp.property(i).remove(); } catch (e0) { jzWarn('neon core glow: ' + e0.toString()); }
        lb1_opAnim(L, 'JZ Neon Ignite', TH + gOn, 'a=kk');
        lb1_opAnim(D, 'JZ Neon Ignite', TH + gOn, 'a=kk>0.5?1:(kk>0?0.3:0)');
        // frame + sub line
        var bx0 = cx - lay.W / 2, bx1 = cx + lay.W / 2, by0 = cy - lay.H / 2, by1 = cy + lay.H / 2;
        var px = size * 0.55, py = size * 0.42, x0 = bx0 - px, x1 = bx1 + px, y0 = by0 - py, y1 = by1 + py, lw = Math.max(1.5 * k, size * 0.035);
        var fk = TH + LB1_HR + on('99', '0.22', 'F') + 'var fk=kkF*K;';
        if (frame !== 'none') {
            var F = lb1_shape(ctx, 'neon frame', 0, 0), paths = [];
            if (frame === 'under') paths.push([[x0 + px * 0.5, y1], [x1 - px * 0.5, y1]]);
            else if (frame === 'bracket') { var cc = size * 0.5; paths.push([[x0, y0 + cc], [x0, y0], [x0 + cc, y0]], [[x1 - cc, y0], [x1, y0], [x1, y0 + cc]], [[x1, y1 - cc], [x1, y1], [x1 - cc, y1]], [[x0 + cc, y1], [x0, y1], [x0, y1 - cc]]); }
            for (var pass = 0; pass < 2; pass++) {
                var g = jzGrp(F, pass ? 'tube' : 'core');
                if (frame === 'box') lb1_rrect(g, x1 - x0, y1 - y0, size * 0.3, (x0 + x1) / 2, (y0 + y1) / 2);
                else for (i = 0; i < paths.length; i++) jzAddPath(g, paths[i], false);
                var st = jzAddStroke(g, pass ? tube : core, pass ? lw : lw * 0.35);
                try { st.property('ADBE Vector Stroke Line Cap').setValue(2); } catch (e1) {}
            }
            glow(F, glowR * 0.8, dark ? 1.3 : 0.7);
            jzSetExpr(jzXf(F, 'ADBE Opacity'), fk + 'value*fk');
            if (sub) {
                var stx = lb1_roma(c.text) || (c.lineText !== c.text ? c.lineText : null);
                if (stx) {
                    var fs = jzClamp(size * 0.2, 12 * k, 34 * k), c2 = sc.sub, cs = [sc.accent2, sc.fg, sc.sub];
                    for (i = 0; i < cs.length; i++) if (cs[i] && cs[i] !== tube && jzContrast(cs[i], sc.bg) >= 2) { c2 = cs[i]; break; }
                    var SL = lb1_textAt(ctx, stx, { font: jzMonoF(ctx), size: fs, color: c2, x: (x0 + x1) / 2, y: y1 + fs * 1.6, track: 0.3, name: 'neon sub' });
                    glow(SL, fs * 0.6, 1); lb1_ng(SL);
                    jzSetExpr(jzXf(SL, 'ADBE Opacity'), fk + on('98', '0.4', 'S') + 'value*fk*kkS');
                }
            }
        }
        return lb1_bb(cx, cy, lay.W, lay.H);
    }
});

/* ================================================================== 11 keycaps — キーキャップ */
// rows of equal cells (the browser's cellRows): cells [{i, x, y, r, j}], cell size k
function lb1_cellRows(n, W, H, maxPerRow, asp, maxK, gapK, stagger) {
    var rows = Math.ceil(n / maxPerRow), per = Math.ceil(n / rows);
    var wk = per + (per - 1) * gapK + (stagger && rows > 1 ? 0.5 : 0), hk = rows * asp + (rows - 1) * gapK * 1.6;
    var k = Math.min(W * 0.86 / wk, H * 0.7 / hk, maxK), out = [];
    for (var i = 0; i < n; i++) {
        var r = Math.floor(i / per), j = i - r * per, cnt = Math.min(per, n - r * per);
        out.push({ i: i, r: r, j: j, x: W / 2 + (j - (cnt - 1) / 2) * k * (1 + gapK) + (stagger && rows > 1 ? (r % 2 ? 0.25 : -0.25) * k : 0), y: H / 2 + (r - (rows - 1) / 2) * k * (asp + gapK * 1.6) });
    }
    return { cells: out, k: k, rows: rows };
}
jzReg('layout', 'keycaps', {
    plan: function (rng, cut, st) {
        return {
            font: rng.pick(jzFontsOf(st, ['display', 'body'])), style: rng.pick(['light', 'light', 'dark']), stagger: rng.chance(0.6),
            accent: rng.int(0, 20), legend: rng.chance(0.7), plate: rng.chance(0.45)
        };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, k = lb1_k(ctx), M = jzU(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), style = jzP(ctx, 'style', 'light'), stag = !!jzP(ctx, 'stagger', true);
        var accI = jzP(ctx, 'accent', 3), legend = !!jzP(ctx, 'legend', true), plate = !!jzP(ctx, 'plate', false);
        var chs = lb1_slots(c.text), n = chs.length;
        if (!n) return null;
        var port = W < H, cr = lb1_cellRows(n, W, H, port ? 4 : (n > 8 ? 5 : 10), 1.06, M * 0.26, 0.16, stag), cells = cr.cells, kz = cr.k;
        var lightC = jzLum(sc.fg) > jzLum(sc.bg) ? sc.fg : sc.bg, darkC = lightC === sc.fg ? sc.bg : sc.fg;
        var d = kz * 0.15, rr = kz * 0.16, ins = kz * 0.09, gap = jzClamp(c.dur * 0.38 / n, 0.05, 0.13), acc = n > 2 ? accI % n : -1;
        var TH = jzTH(ctx), TIS = [], SCH = [], RE0 = 0.14 + n * gap + 0.3;
        for (i = 0; i < n; i++) TIS.push(0.14 + i * gap);
        for (i = 0; i < Math.ceil(Math.max(0, c.dur + 1 - RE0) / 0.55) + 2; i++) SCH.push(jzHash(s, i, 3) % n);
        var PZ = 'function pz(t){return t<0?0:t<0.05?t/0.05:t<0.09?1:t<0.22?1-(t-0.09)/0.13:0;}var TIS=' + lb1_arr(TIS) + ',SCH=' + lb1_arr(SCH) + ',RE0=' + jzN(RE0) + ';' +
            'function prs(I){var p=pz(time-TIS[I]),re=time-RE0;if(re>0){var kb=Math.floor(re/0.55);if(SCH[kb]===I)p=Math.max(p,pz(re-kb*0.55));}return p;}';
        var S = lb1_ng(lb1_shape(ctx, 'keycaps', 0, 0)), x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, keys = [];
        for (i = 0; i < cells.length; i++) {
            var q = cells[i]; x0 = Math.min(x0, q.x - kz / 2); x1 = Math.max(x1, q.x + kz / 2); y0 = Math.min(y0, q.y - kz / 2); y1 = Math.max(y1, q.y + kz / 2 + d);
            if (chs[i] === ' ') continue;
            var isA = i === acc, top, side, leg;
            if (isA) { top = lb1_plateCol(sc, [sc.accent, sc.ink]); side = jzMixHex(top, darkC, 0.4); leg = lb1_onCol(sc, top); }
            else if (style === 'light') { top = lightC; side = jzMixHex(lightC, darkC, 0.32); leg = darkC; }
            else { top = jzMixHex(darkC, lightC, 0.16); side = jzMixHex(darkC, lightC, 0.06); leg = lightC; }
            var g = jzGrp(S, 'key ' + (i + 1)), dyE = TH + PZ + 'var dp=prs(' + i + ')*' + jzN(d * 0.75) + ';';
            // (each sub-group is finished before the next one is added: adding a sibling invalidates held references in AE)
            var gt = lb1_sub(g, 'top'); lb1_rrect(gt, kz - ins * 2, kz - ins * 2.1, rr * 0.7, 0, -kz / 2 + ins * 0.35 + (kz - ins * 2.1) / 2);
            if (style === 'dark' && !isA) jzAddStroke(gt, sc.sub, 1 * k);
            jzAddFill(gt, top);
            lb1_gPos(gt, dyE + '[value[0],value[1]+dp]');
            var gr = lb1_sub(g, 'rim'); lb1_rrect(gr, kz - ins, kz - ins * 0.9, rr * 0.85, 0, -kz / 2 + (kz - ins * 0.9) / 2); jzAddFill(gr, jzMixHex(top, side, 0.35));
            lb1_gPos(gr, dyE + '[value[0],value[1]+dp]');
            var gs = lb1_sub(g, 'side'); lb1_rrect(gs, kz, kz + d * 0.65, rr, 0, -kz / 2 + d * 0.35 + (kz + d * 0.65) / 2); jzAddFill(gs, side);
            jzGX(g).property('ADBE Vector Position').setValue([q.x, q.y]);
            lb1_gSc(g, TH + 'var q=cl((time-' + jzN(i * 0.025) + ')/0.2);var e=q<=0?0:ob(q,1.6);[value[0]*e,value[1]*e]');
            lb1_gOp(g, TH + '100*K');
            keys.push({ i: i, q: q, leg: leg, isA: isA });
        }
        if (plate) {
            var p = kz * 0.22, gp = jzGrp(S, 'plate'), ph = y1 - y0 + p * 2;
            lb1_rrect(gp, x1 - x0 + p * 2, ph, rr * 1.4, 0, ph / 2);
            jzAddStroke(gp, sc.sub, 1 * k); jzAddFill(gp, jzMixHex(sc.bg, darkC === sc.bg ? lightC : darkC, 0.1));
            jzGX(gp).property('ADBE Vector Position').setValue([(x0 + x1) / 2, y0 - p]);
            lb1_gSc(gp, TH + '[value[0],value[1]*oe(time/0.35)*K]');
        }
        // legends (romaji, top-left of each key): one left-justified text, one legend per line
        if (legend) {
            var labs = [], LM = [], TX = [], TY = [], KI = [], LA = [];
            for (i = 0; i < keys.length; i++) {
                var rom = jzRomaji(chs[keys[i].i]);
                if (!rom) continue;
                rom = rom.toUpperCase();
                var cl = labs.length, rc = jzChars(rom);
                for (var z = 0; z < rc.length; z++) { LM.push(cl); LA.push(keys[i].isA); }
                labs.push(rom); TX.push(keys[i].q.x - kz / 2 + ins * 1.9); TY.push(keys[i].q.y - kz / 2 + ins * 1.7); KI.push(keys[i].i);
            }
            if (labs.length) {
                var ls = kz * 0.13, LD = ls * 1.2;
                var LG = jzText(ctx, labs.join('\r'), { font: jzMonoF(ctx), size: ls, color: keys.length ? (style === 'light' ? darkC : lightC) : sc.fg, x: 0, y: 0, align: 'left', leading: LD, name: 'key legends' });
                jzXf(LG, 'ADBE Anchor Point').setValue([0, 0]); jzXf(LG, 'ADBE Position').setValue([0, 0]); lb1_ng(LG);
                var lh = TH + PZ + 'var LM=' + lb1_arr(LM) + ',TX=' + lb1_arr(TX) + ',TY=' + lb1_arr(TY) + ',KI=' + lb1_arr(KI) + ',l=LM[textIndex-1]||0,ki=KI[l];';
                lb1_posAnim(LG, 'JZ Legend Place', Math.max(W, H) * 2, lh, 'dx=TX[l];dy=TY[l]+' + jzN(LB1_CY * ls) + '-l*' + jzN(LD) + '+prs(ki)*' + jzN(d * 0.75));
                lb1_opAnim(LG, 'JZ Legend Show', lh, 'a=time>TIS[ki]?0.7*K:0');
                if (acc >= 0) jzCharColors(LG, lb1_onCol(sc, lb1_plateCol(sc, [sc.accent, sc.ink])), LA, 'JZ Legend Accent');
            }
        }
        // the glyphs: typed one after another, pressed with their key
        for (i = 0; i < keys.length; i++) {
            var kq = keys[i], ch = chs[kq.i];
            var T = lb1_textAt(ctx, ch, { font: font, size: kz * 0.52, color: kq.leg, x: kq.q.x, y: kq.q.y - kz * 0.03, name: ch });
            var th = TH + PZ + 'var q=cl((time-' + jzN(kq.i * 0.025) + ')/0.2),e=q<=0?0:Math.min(1,ob(q,1.6));';
            lb1_scAnim(T, 'JZ Key Pop', th, 'sx=e;sy=e');
            lb1_posAnim(T, 'JZ Key Press', kz, th, 'dy=prs(' + kq.i + ')*' + jzN(d * 0.75) + '*e');
            jzAnimate(ctx, T, { mi: lb1_miAt(ctx, TIS[kq.i]), noHold: lb1_plateHold(ctx) });
        }
        return { x0: x0, x1: x1, y0: y0, y1: y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
    }
});

/* ================================================================== 12 bubbles — 泡 */
function lb1_isSmallKana(ch) { return 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ'.indexOf(ch) >= 0; }
jzReg('layout', 'bubbles', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), style: rng.pick(['soap', 'soap', 'solid', 'mixed']), rise: rng.range(0.018, 0.035), wob: rng.range(0.6, 1.2), motes: rng.chance(0.75) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, M = jzU(ctx), k = lb1_k(ctx), i, m;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), style = jzP(ctx, 'style', 'soap'), rise = jzP(ctx, 'rise', 0.025), wob = jzP(ctx, 'wob', 0.9), motes = !!jzP(ctx, 'motes', true);
        var chs = lb1_slots(c.text), n = chs.length;
        if (!n) return null;
        var port = W < H, cr = lb1_cellRows(n, W, H, port ? 4 : 7, 1.1, M * 0.3, 0.12, true), cells = cr.cells, kz = cr.k, TH = jzTH(ctx);
        // background motes rising (one shape layer)
        if (motes) {
            var MS = lb1_ng(lb1_shape(ctx, 'motes', 0, 0));
            for (m = 0; m < 14; m++) {
                var sp = (0.05 + 0.07 * jzR(s, m, 1)) * H, per = H * 1.2 / sp, r = (0.006 + 0.014 * jzR(s, m, 4)) * M, gm = jzGrp(MS, 'mote ' + (m + 1));
                jzAddEllipse(gm, r * 2, r * 2); jzAddStroke(gm, sc.sub, Math.max(1 * k, r * 0.12));
                lb1_gPos(gm, 'var per=' + jzN(per) + ',t=(time+' + jzN(jzR(s, m, 2) * per) + ')%per;[' + jzN((0.04 + 0.92 * jzR(s, m, 3)) * W) + '+Math.sin(time*1.7+' + m + ')*' + jzN(M * 0.012) + ',' + jzN(H * 1.08) + '-t*' + jzN(sp) + ']');
            }
            jzSetExpr(jzXf(MS, 'ADBE Opacity'), TH + '45*K*oe(time/0.5)');
        }
        var bb = null;
        for (i = 0; i < cells.length; i++) {
            var q = cells[i], ch = chs[i];
            if (ch === ' ') continue;
            var kind = jzIsKanji(ch) ? 1 : (lb1_isSmallKana(ch) || jzIsPunct(ch)) ? 0.7 : 0.86;
            var R = kz * 0.5 * kind * (0.94 + 0.12 * jzR(s, i, 5)), t0 = 0.04 + i * 0.05 + jzR(s, i, 6) * 0.08, ph = jzR(s, i, 7) * Math.PI * 2;
            var bx = q.x + (jzR(s, i, 8) * 2 - 1) * kz * 0.1, by = q.y + (jzR(s, i, 10) * 2 - 1) * kz * 0.14;
            var solid = style === 'solid' || (style === 'mixed' && jzR(s, i, 11) < 0.4), tc = sc.fg;
            var B = lb1_ng(lb1_shape(ctx, 'bubble ' + (i + 1), bx, by));   // (the glyph's parent)
            if (solid) {
                var f = i % 3 === 1 ? lb1_plateCol(sc, [sc.accent, sc.ink]) : lb1_plateCol(sc, [sc.ink, sc.accent]), gf = jzGrp(B, 'bubble');
                jzAddEllipse(gf, R * 2, R * 2); jzAddFill(gf, f); tc = lb1_onCol(sc, f);
            } else {
                var gd = jzGrp(B, 'glint dot'), dr = Math.max(1.5 * k, R * 0.05);
                jzAddEllipse(gd, dr * 2, dr * 2, R * 0.52, -R * 0.52); jzAddFill(gd, sc.fg, 90);
                var ga = jzGrp(B, 'glint arc'), pts = [];
                for (var z = 0; z <= 8; z++) { var an = (200 + 45 * z / 8) * Math.PI / 180; pts.push([Math.cos(an) * R * 0.78, Math.sin(an) * R * 0.78]); }
                var sa = lb1_line(ga, pts, sc.fg, Math.max(1.5 * k, R * 0.07), 90);
                try { sa.property('ADBE Vector Stroke Line Cap').setValue(2); } catch (e0) {}
                var go = jzGrp(B, 'film'); jzAddEllipse(go, R * 2, R * 2); jzAddStroke(go, sc.fg, Math.max(1.2 * k, R * 0.035), 85); jzAddFill(go, sc.fg, 7);
            }
            var bq = TH + 'var q0=cl((time-' + jzN(t0) + ')/0.3),q=q0<=0?0:ob(q0,2.2),pk=1+0.35*oc(PO);';
            jzSetExpr(jzXf(B, 'ADBE Position'), '[value[0]+Math.sin(time*' + jzN(1.6 * wob) + '+' + jzN(ph) + ')*' + jzN(R * 0.1) + ',value[1]-' + jzN(H * rise * (0.7 + 0.6 * jzR(s, i, 9))) + '*time+Math.cos(time*1.2+' + jzN(ph) + ')*' + jzN(R * 0.06) + ']');
            jzSetExpr(jzXf(B, 'ADBE Scale'), bq + '[value[0]*q*pk,value[1]*q*pk]');
            jzSetExpr(jzXf(B, 'ADBE Opacity'), TH + 'value*K');
            // the glyph floats inside (parented); keep its size at min(1, q) like the browser (no overshoot / pop growth)
            var T = lb1_textAt(ctx, ch, { font: font, size: R * 1.05, color: tc, x: bx, y: by, name: ch });
            lb1_parent(T, B, 0, 0);
            lb1_scAnim(T, 'JZ Bubble Size', bq, 'var qs=q*pk;sx=qs>0.001?Math.min(1,q)/qs:0;sy=sx');
            jzAnimate(ctx, T, { mi: lb1_miAt(ctx, t0), noHold: lb1_plateHold(ctx) });
            bb = jzUnion(bb, lb1_bb(bx, by, R * 2, R * 2));
        }
        return bb;
    }
});

/* ================================================================== 13 slotMachine — スロット */
jzReg('layout', 'slotMachine', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display'])), style: rng.pick(['cabinet', 'window', 'cabinet']), v: rng.range(13, 18), line: rng.chance(0.7) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, M = jzU(ctx), k = lb1_k(ctx), i, j;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), cab = jzP(ctx, 'style', 'cabinet') === 'cabinet', v = jzP(ctx, 'v', 15), line = !!jzP(ctx, 'line', true);
        var chs = lb1_slots(c.text), n = chs.length;
        if (!n) return null;
        var port = W < H, cr = lb1_cellRows(n, W, H, port ? 5 : 10, 1.34, M * 0.24, 0.1), cells = cr.cells, kz = cr.k;
        var w = kz, h = kz * 1.34, step = kz * 0.92, gsz = kz * 0.7, pool = lb1_pool(c), TH = jzTH(ctx);
        var gap = jzClamp(c.dur * 0.3 / n, 0.08, 0.2), t1 = jzClamp(c.dur * 0.16, 0.2, 0.45);
        var panel = lb1_plateCol(sc, [sc.ink, sc.fg]);
        var winC = cab ? (lb1_onCol(sc, panel) === sc.bg ? sc.bg : jzMixHex(sc.bg, sc.fg, 0.06)) : sc.bg;
        var glyC = jzContrast(sc.fg, winC) > 2.5 ? sc.fg : lb1_onCol(sc, winC);
        var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        for (i = 0; i < cells.length; i++) { x0 = Math.min(x0, cells[i].x - w / 2); x1 = Math.max(x1, cells[i].x + w / 2); y0 = Math.min(y0, cells[i].y - h / 2); y1 = Math.max(y1, cells[i].y + h / 2); }
        var inA = 'oe(time/0.25)';
        // cabinet + window backgrounds
        var CB = lb1_ng(lb1_shape(ctx, 'slot cabinet', 0, 0));
        for (i = 0; i < cells.length; i++) {
            if (chs[i] === ' ') continue;
            var gw = jzGrp(CB, 'window ' + (i + 1)); jzAddRect(gw, w, h, 0, 0, h / 2); jzAddFill(gw, winC);
            jzGX(gw).property('ADBE Vector Position').setValue([cells[i].x, cells[i].y - h / 2]);
            lb1_gSc(gw, TH + '[value[0],value[1]*' + inA + ']');
        }
        if (cab) {
            var p = kz * 0.22, gp = jzGrp(CB, 'cabinet');
            lb1_rrect(gp, x1 - x0 + p * 2, y1 - y0 + p * 2, p * 1.2, (x0 + x1) / 2, (y0 + y1) / 2); jzAddFill(gp, panel);
            lb1_gOp(gp, TH + '100*' + inA);
        }
        jzSetExpr(jzXf(CB, 'ADBE Opacity'), TH + 'value*K');
        // reels: a strip of random glyphs ending in the lyric glyph, scrolled by one Position animator, masked to the window
        var mains = [];
        for (i = 0; i < cells.length; i++) {
            var q = cells[i], ch = chs[i];
            if (ch === ' ') continue;
            var ts = t1 + i * gap, N = Math.ceil(v * ts) + 4, reel = [];
            for (j = 0; j < N - 1; j++) reel.push(pool[jzHash(s, i, j) % pool.length]);
            reel.push(ch);
            var G = lb1_glyphs(ctx, reel, { font: font, size: gsz, color: glyC, name: 'reel ' + (i + 1) }); lb1_ng(G.L);
            var rh = TH + 'var TS=' + jzN(ts) + ',FIN=' + (N - 1) + ',tau=TS-time,P=tau>0?FIN-' + jzN(v) + '*tau:FIN+0.22*Math.sin(-tau*30)*Math.exp(tau/0.08);';
            lb1_placeAnim(ctx, G, 'JZ Reel Spin', rh, 'x=' + jzN(q.x) + ';y=' + jzN(q.y) + '+(i-P)*' + jzN(step), Math.max(W, H) * 2 + N * gsz * 2);
            lb1_opAnim(G.L, 'JZ Reel Blur Fade', rh, 'a=(textIndex-1===FIN&&tau<=0)?0:(tau>0.05?0.62:0.9)*K');
            var mb = jzEffect(G.L, 'ADBE Motion Blur', 'JZ Reel Blur'); jzEP(mb, 1, 0);
            jzEX(mb, 2, rh + 'tau>0.05?' + jzN(step * 0.32) + ':0');
            jzMaskRect(G.L, q.x - w / 2, q.y - h / 2, q.x + w / 2, q.y + h / 2);
            mains.push({ i: i, q: q, ts: ts });
        }
        // the lyric glyph takes over when the reel stops (small bounce), clipped to its window
        for (i = 0; i < mains.length; i++) {
            var mq = mains[i], T = lb1_textAt(ctx, chs[mq.i], { font: font, size: gsz, color: glyC, x: mq.q.x, y: mq.q.y, name: chs[mq.i] });
            lb1_posAnim(T, 'JZ Reel Stop', step, TH + 'var tau=' + jzN(mq.ts) + '-time;', 'if(tau<=0)dy=-0.22*Math.sin(-tau*30)*Math.exp(tau/0.08)*' + jzN(step));
            jzMaskRect(T, -w / 2, -h / 2 - LB1_CY * gsz, w / 2, h / 2 - LB1_CY * gsz);
            jzAnimate(ctx, T, { mi: lb1_miAt(ctx, mq.ts), noHold: lb1_plateHold(ctx) });
        }
        // cylinder shading (stepped fade at top / bottom), window borders, pay-lines
        var SH = lb1_ng(lb1_shape(ctx, 'slot glass', 0, 0)), steps = 4;
        for (i = 0; i < mains.length; i++) {
            var cq = mains[i].q, wy = cq.y - h / 2, gs = jzGrp(SH, 'shade ' + (mains[i].i + 1));
            for (j = 0; j < steps; j++) {
                var al = 0.95 * (1 - (j + 0.5) / steps) * 100, bh = h * 0.3 / steps;
                var s1 = lb1_sub(gs, 't' + j); jzAddRect(s1, w, bh, 0, cq.x, wy + (j + 0.5) * bh); jzAddFill(s1, winC, al);
                var s2 = lb1_sub(gs, 'b' + j); jzAddRect(s2, w, bh, 0, cq.x, wy + h - (j + 0.5) * bh); jzAddFill(s2, winC, al);
            }
            var gb = jzGrp(SH, 'border ' + (mains[i].i + 1));
            lb1_rrect(gb, w, h, kz * 0.06, cq.x, cq.y); jzAddStroke(gb, cab ? jzMixHex(panel, winC, 0.5) : sc.fg, Math.max(1.5 * k, kz * 0.02));
            lb1_gOp(gb, TH + '100*' + inA);
        }
        if (line) {
            var rowsY = [], tri = kz * 0.1, xa = x0 - kz * 0.12, xb = x1 + kz * 0.12, plw = Math.max(1.2 * k, kz * 0.012);
            for (i = 0; i < cells.length; i++) if (jzIndexOf(rowsY, cells[i].y) < 0) rowsY.push(cells[i].y);
            for (i = 0; i < rowsY.length; i++) {
                var yy = rowsY[i], gl = jzGrp(SH, 'payline ' + (i + 1));
                lb1_line(gl, [[xa, yy], [xb, yy]], sc.accent, plw, 70); jzAddTrimPaths(gl, TH + '100*' + inA);
                var gt = jzGrp(SH, 'markers ' + (i + 1));
                jzAddPath(gt, [[xa - tri * 1.6, yy - tri], [xa, yy], [xa - tri * 1.6, yy + tri]], true);
                jzAddPath(gt, [[xb + tri * 1.6, yy - tri], [xb, yy], [xb + tri * 1.6, yy + tri]], true);
                jzAddFill(gt, sc.accent);
                lb1_gOp(gt, TH + '100*' + inA);
            }
        }
        jzSetExpr(jzXf(SH, 'ADBE Opacity'), TH + 'value*K');
        return { x0: x0, x1: x1, y0: y0, y1: y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
    }
});

/* ================================================================== 14 flipBoard — パタパタ */
jzReg('layout', 'flipBoard', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), header: rng.chance(0.65), flips: rng.int(3, 5), style: rng.pick(['ink', 'ink', 'fg']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, M = jzU(ctx), k = lb1_k(ctx), i, j;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), header = !!jzP(ctx, 'header', true), flips = jzP(ctx, 'flips', 4), style = jzP(ctx, 'style', 'ink');
        var all = jzChars(jzTrim(String(c.text))), chs = [];
        for (i = 0; i < all.length; i++) if (all[i] !== '　') chs.push(all[i]);
        var n = chs.length;
        if (!n) return null;
        var port = W < H, cr = lb1_cellRows(n, W, H, port ? 5 : 12, 1.32, M * 0.24, 0.08), cells = cr.cells, kz = cr.k;
        var w = kz, h = kz * 1.32, gsz = kz * 0.78, panel = lb1_plateCol(sc, style === 'fg' ? [sc.fg, sc.ink] : [sc.ink, sc.fg]);
        var flap = jzMixHex(panel, sc.bg, 0.08), gc = lb1_onCol(sc, panel), pool = lb1_pool(c), fd = 0.065, t0 = 0.06, lw = Math.max(1.5 * k, kz * 0.018);
        var TH = jzTH(ctx), FC = [], ST = [], PTS = [], x0 = 1e9, x1 = -1e9, y0 = 1e9;
        for (i = 0; i < n; i++) {
            var F = flips + i % 3 + Math.floor(i * 0.7), seq = [' '];
            for (j = 1; j <= F; j++) seq.push(j >= F ? chs[i] : pool[jzHash(s, i, j) % pool.length]);
            FC.push(seq); ST.push(t0 + F * fd); PTS.push([cells[i].x, cells[i].y]);
            x0 = Math.min(x0, cells[i].x - w / 2); x1 = Math.max(x1, cells[i].x + w / 2); y0 = Math.min(y0, cells[i].y - h / 2);
        }
        // shared flip clock: u = (t - t0) / fd, m = flip index, f = flap phase; a cell stops flipping at its settle time
        var clk = 'var FC=' + (function () { var o = []; for (var z = 0; z < FC.length; z++) o.push(lb1_strArr(FC[z])); return '[' + o.join(',') + ']'; })() + ',ST=' + lb1_arr(ST) + ';' +
            'var u=(time-' + t0 + ')/' + fd + ',m=Math.floor(u),f=u-m;function chA(i,mm){var a=FC[i];return mm<=0?" ":(a[Math.min(mm,a.length-1)]||" ");}';
        var qe = TH + clk + 'var i=textIndex-1,q=oc(cl((time-i*0.02)/0.18))*K,fl=time<ST[i]&&u>0;';
        function src(pick) { return 'var s="";for(var i=0;i<' + n + ';i++){if(i)s+="\\r";var fl=time<ST[i]&&u>0;s+=fl?(' + pick + '):" ";}s'; }
        // panels
        var PN = lb1_ng(lb1_shape(ctx, 'flip panels', 0, 0));
        for (i = 0; i < n; i++) {
            var gpn = jzGrp(PN, 'panel ' + (i + 1)); lb1_rrect(gpn, w, h, kz * 0.07, cells[i].x, cells[i].y); jzAddFill(gpn, panel);
            lb1_gOp(gpn, TH + '100*oc(cl((time-' + jzN(i * 0.02) + ')/0.18))*K');
        }
        // static halves: next glyph on top, current glyph below (clipped to the half-cells)
        function halfLayer(name, pick, top) {
            var G = lb1_glyphs(ctx, chs, { font: font, size: gsz, color: gc, name: name }); lb1_ng(G.L);
            try { G.L.property('ADBE Text Properties').property('ADBE Text Document').expression = clk + src(pick); } catch (e0) { jzWarn('flip source: ' + e0.toString()); }
            lb1_place(G, PTS);
            for (var z = 0; z < n; z++) jzMaskRect(G.L, cells[z].x - w / 2, top ? cells[z].y - h / 2 : cells[z].y, cells[z].x + w / 2, top ? cells[z].y : cells[z].y + h / 2);
            return G;
        }
        var HT = halfLayer('flip next (top)', 'chA(i,m+1)', true), HB = halfLayer('flip current (bottom)', 'chA(i,m)', false);
        lb1_opAnim(HT.L, 'JZ Flip Show', qe, 'a=fl?q:0');
        lb1_opAnim(HB.L, 'JZ Flip Show', qe, 'a=fl?q:0');
        // falling flap: plate + half glyph squashed toward the hinge, then the shade on top
        var FP = lb1_ng(lb1_shape(ctx, 'flip flaps', 0, 0)), FS = null;
        var fq = 'var sy=Math.abs(Math.cos(f*Math.PI)),HH=' + jzN(h / 2) + ';';
        for (i = 0; i < n; i++) {
            var gf = jzGrp(FP, 'flap ' + (i + 1)), rf = jzAddRect(gf, w, h / 2, 0, cells[i].x, cells[i].y - h / 4);
            var fh = TH + clk + fq + 'var fl=time<' + jzN(ST[i]) + '&&u>0;';
            jzSetExpr(rf.property('ADBE Vector Rect Size'), fh + '[' + jzN(w) + ',Math.max(0.01,HH*sy)]');
            jzSetExpr(rf.property('ADBE Vector Rect Position'), fh + '[' + jzN(cells[i].x) + ',' + jzN(cells[i].y) + '+(f<0.5?-1:1)*HH*sy/2]');
            jzAddFill(gf, flap);                                   // (after the rect is set up: adding invalidates `rf` in AE)
            lb1_gOp(gf, fh + 'fl?100*oc(cl((time-' + jzN(i * 0.02) + ')/0.18))*K:0');
        }
        var FT = halfLayer('flip flap (top)', 'chA(i,m)', true), FB = halfLayer('flip flap (bottom)', 'chA(i,m+1)', false);
        lb1_opAnim(FT.L, 'JZ Flap Show', qe, 'a=fl&&f<0.5?q:0');
        lb1_opAnim(FB.L, 'JZ Flap Show', qe, 'a=fl&&f>=0.5?q:0');
        lb1_scAnim(FT.L, 'JZ Flap Fold', TH + clk + fq, 'sy=sy');
        lb1_scAnim(FB.L, 'JZ Flap Fold', TH + clk + fq, 'sy=sy');
        FS = lb1_ng(lb1_shape(ctx, 'flip shade', 0, 0));
        for (i = 0; i < n; i++) {
            var gsd = jzGrp(FS, 'shade ' + (i + 1)), rs = jzAddRect(gsd, w, h / 2, 0, cells[i].x, cells[i].y - h / 4);
            var sh = TH + clk + fq + 'var fl=time<' + jzN(ST[i]) + '&&u>0;';
            jzSetExpr(rs.property('ADBE Vector Rect Size'), sh + '[' + jzN(w) + ',Math.max(0.01,HH*sy)]');
            jzSetExpr(rs.property('ADBE Vector Rect Position'), sh + '[' + jzN(cells[i].x) + ',' + jzN(cells[i].y) + '+(f<0.5?-1:1)*HH*sy/2]');
            jzAddFill(gsd, sc.bg);                                 // (after the rect is set up)
            lb1_gOp(gsd, sh + 'fl?100*oc(cl((time-' + jzN(i * 0.02) + ')/0.18))*K*(f<0.5?f:1-f)*0.5:0');
        }
        // settled glyphs = the lyric (one layer per cell, entering when the cell settles)
        var bb = null;
        for (i = 0; i < n; i++) {
            if (chs[i] === ' ') continue;
            var T = lb1_textAt(ctx, chs[i], { font: font, size: gsz, color: gc, x: cells[i].x, y: cells[i].y, name: chs[i] });
            lb1_opAnim(T, 'JZ Panel Fade', TH, 'a=oc(cl((time-' + jzN(i * 0.02) + ')/0.18))*K');
            jzAnimate(ctx, T, { mi: lb1_miAt(ctx, ST[i]), noHold: lb1_plateHold(ctx) });
            bb = jzUnion(bb, lb1_bb(cells[i].x, cells[i].y, w, h));
        }
        // split line + hinges on top
        var SP = lb1_ng(lb1_shape(ctx, 'flip split', 0, 0)), hc = jzMixHex(panel, sc.bg, 0.5);
        for (i = 0; i < n; i++) {
            var gsp = jzGrp(SP, 'split ' + (i + 1));
            var g1 = lb1_sub(gsp, 'hinges'); jzAddRect(g1, lw * 1.2, h * 0.14, 0, cells[i].x - w / 2, cells[i].y); jzAddRect(g1, lw * 1.2, h * 0.14, 0, cells[i].x + w / 2, cells[i].y); jzAddFill(g1, hc);
            var g2 = lb1_sub(gsp, 'line'); jzAddRect(g2, w, lw, 0, cells[i].x, cells[i].y); jzAddFill(g2, sc.bg);
            lb1_gOp(gsp, TH + '100*oc(cl((time-' + jzN(i * 0.02) + ')/0.18))*K');
        }
        if (header) {
            var fs = jzClamp(kz * 0.2, 12 * k, 30 * k), hy = y0 - fs * 1.4;
            var hl = jzText(ctx, 'LINE ' + jzLineNo(ctx), { font: jzMonoF(ctx), size: fs, color: sc.sub, x: x0, y: hy, align: 'left', track: 0.2, name: 'flip header' });
            var hr = jzText(ctx, jzFmtTime(c.start || 0), { font: jzMonoF(ctx), size: fs, color: sc.accent, x: x1, y: hy, align: 'right', track: 0.2, name: 'flip time' });
            jzSetExpr(jzXf(hl, 'ADBE Opacity'), TH + 'value*oe(time/0.2)*K');
            jzSetExpr(jzXf(hr, 'ADBE Opacity'), TH + 'value*oe(time/0.2)*K');
            lb1_ng(hl); lb1_ng(hr);
        }
        return bb || { x0: x0, x1: x1, y0: y0, y1: y0 + h, cx: (x0 + x1) / 2, cy: y0 + h / 2 };
    }
});
