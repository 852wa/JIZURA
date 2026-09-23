// ================================================================ pack layoutsA part 1 (AE port of src/11p_layoutsA.js)
// Worked example for porting: lowerThird. Keep the browser's parameter keys in plan() — the panel gets the
// browser's params when a JSON plan is imported and uses this plan() when it plans by itself.

/* ---------------------------------------------------------------- 1 lowerThird — 下部テロップ */
jzReg('layout', 'lowerThird', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'display', 'serif'])), side: rng.pick(['left', 'left', 'right']), bar: rng.pick(['line', 'tab', 'line']), label: rng.pick(['romaji', 'no', 'copy']), lift: rng.range(0, 0.04) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx);
        var t0 = jzTrim(c.text), n = jzCount(t0);
        var text = port ? jzSplitLines(t0, 6) : (n > 13 ? jzSplitLines(t0, Math.ceil(n / 2)) : t0);
        var left = jzP(ctx, 'side', 'left') !== 'right', mx = W * 0.07, x = left ? mx : W - mx;
        var barY = H * ((port ? 0.8 : 0.83) - jzP(ctx, 'lift', 0));
        // the lyric: fit, then sit it on the bar
        var L = jzText(ctx, text, { font: jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), size: 200, color: sc.fg, x: x, y: barY, align: left ? 'left' : 'right', track: 0.03,
            maxW: W * 0.84, maxH: H * (port ? 0.24 : 0.3), maxSize: u * (port ? 0.17 : 0.14) });
        var size = jzFontSize(L), sz = jzSize(L), cy = barY - size * 0.24 - sz[1] / 2;
        jzXf(L, 'ADBE Position').setValue([x, cy]);
        jzAnimate(ctx, L, { mi: 0 });
        // accent bar from the screen edge to just past the text (grows in, retracts on exit) + end square
        var th = Math.max(3 * ctx.u, size * 0.055), reach = mx + sz[0] + size * 0.45, sq = th * 2.6;
        var B = jzShapeLayer(ctx, 'bar', left ? 0 : W, barY + th / 2), g = jzGrp(B, 'bar');
        jzAddRect(g, reach, th, 0, left ? reach / 2 : -reach / 2, 0); jzAddFill(g, sc.accent);
        var g2 = jzGrp(B, 'tip'); jzAddRect(g2, sq, sq, 0, left ? reach : -reach, 0); jzAddFill(g2, sc.accent);
        jzSetExpr(jzXf(B, 'ADBE Scale'), jzTH(ctx) + 'var e=oe(time/0.55)*K;[value[0]*e,value[1]]');
        // label above the lyric: tag (LINE no.) + copy, slides in from the side
        var ls = jzSmallSize(ctx), ly = cy - sz[1] / 2 - size * 0.22 - ls * 0.7, tag = jzPad((c.line || 0) + 1, 2), lab = jzP(ctx, 'label', 'romaji');
        var copy = lab === 'romaji' ? (jzRomajiOf(ctx) || jzAltCopy(ctx)) : lab === 'no' ? 'LINE ' + tag : jzAltCopy(ctx);
        if (/^No\./.test(copy)) copy = jzFmtTime(c.start);
        var cx = x, dir = left ? 1 : -1, items = [];
        if (jzP(ctx, 'bar', 'line') === 'tab') {
            var T = jzText(ctx, tag, { font: jzMonoF(ctx), size: ls, color: jzOnCol(sc, sc.ink), x: 0, y: ly, track: 0.1 });
            var tw = jzSize(T)[0] + ls * 1.1, th2 = ls * 1.6;
            var R = jzRectLayer(ctx, 'tab', cx + dir * tw / 2, ly, tw, th2, sc.ink);
            jzXf(T, 'ADBE Position').setValue([cx + dir * tw / 2, ly]);
            T.moveBefore(R); items.push(R, T);
            cx += (tw + ls * 0.7) * dir;
        } else {
            var q = ls * 0.55, Q = jzRectLayer(ctx, 'mark', cx + dir * q / 2, ly, q, q, sc.accent);
            cx += (q + ls * 0.6) * dir;
            var T2 = jzText(ctx, tag, { font: jzMonoF(ctx), size: ls, color: sc.fg, x: cx, y: ly, align: left ? 'left' : 'right', track: 0.1 });
            items.push(Q, T2);
            cx += (jzSize(T2)[0] + ls * 0.8) * dir;
        }
        items.push(jzText(ctx, copy, { font: lab === 'copy' ? jzBodyF(ctx) : jzMonoF(ctx), size: ls, color: sc.sub, x: cx, y: ly, align: left ? 'left' : 'right', track: 0.12 }));
        for (var i = 0; i < items.length; i++) { jzSlideIn(ctx, items[i], -dir * ls * 2, 0, 0.12, 0.4); jzNoGhost(items[i]); }   // label: main pass only (the bar is ghosted)
        return jzBB(L);
    }
});

/* ================================================================ la1 helpers (ports of the browser pack's shared helpers) */
// extra easing for expressions (in-out cubic) — append after jzTH(ctx)
var la1_FNS = 'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}\n';
function la1_H(ctx) { return jzTH(ctx) + la1_FNS; }
function la1_isSmall(c) { return 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ'.indexOf(c) >= 0 && c.length > 0; }
function la1_isPunct(c) { return /[、。，．,.!?！？…‥・「」『』（）()【】〈〉《》〔〕［］\[\]'"“”‘’ー〜～:：;；\-—―]/.test(c); }
function la1_isBad(c) { return la1_isSmall(c) || la1_isPunct(c) || c === 'ー' || c === ' '; }
var la1_VROT = 'ー〜～…‥―—-()（）「」『』【】〈〉《》〔〕[]［］→←:：;；=＝';
// chunk boundaries (glyph offsets) of a word — stands in for the browser's Intl word segments
function la1_bounds(word) {
    var out = {}, ch = jzChunk(word), acc = 0;
    for (var i = 0; i < ch.length; i++) { acc += jzChars(ch[i]).length; out[acc] = 1; }
    return out;
}
function la1_split2(word, force) {
    var ch = jzChars(word), n = ch.length, sb = la1_bounds(word), best = Math.max(1, Math.floor(n / 2)), bs = -1e9;
    for (var c = 1; c < n; c++) {
        var a = ch[c - 1], b = ch[c];
        if (!force && ((c === 1 && !jzIsKanji(a)) || (c === n - 1 && !jzIsKanji(b)))) continue;
        var s = -Math.abs(c - n / 2) * 0.9;
        if (a === ' ' || a === '　' || (la1_isPunct(a) && a !== 'ー')) s += 5;
        if (jzIsHira(a) && !jzIsHira(b) && !la1_isBad(b)) s += 3;
        if (sb[c]) s += 2;
        if (la1_isBad(b)) s -= 6;
        if (jzIsKanji(a) && jzIsKanji(b)) s -= 2;
        if (jzIsKanji(a) && jzIsHira(b)) s -= sb[c] ? 0.5 : 2.5;
        if (jzIsHira(a) && jzIsHira(b) && !sb[c]) s -= 2.5;
        if (s > bs) { bs = s; best = c; }
    }
    if (!force && bs < -1.5 && !jzHasLatin(word)) return [word];
    var out = [], p1 = jzTrim(ch.slice(0, best).join('')), p2 = jzTrim(ch.slice(best).join(''));
    if (p1) out.push(p1);
    if (p2) out.push(p2);
    return out;
}
// split text into k balanced chunks (browser splitK): word chunks first, long chunks cut at the most natural boundary
function la1_splitK(text, k, force) {
    var t = jzTrim(String(text || '')), i;
    if (!t) return [''];
    // words (latin: by spaces; Japanese: chunks of each space-separated phrase); sp[i] = a space follows word i
    var latin = jzHasLatin(t), pcs = t.split(/\s+/), words = [], sp = [];
    for (var pi = 0; pi < pcs.length; pi++) {
        var raw = latin ? [pcs[pi]] : jzChunk(pcs[pi]);
        for (i = 0; i < raw.length; i++) { var w0 = jzTrim(raw[i]); if (w0) { words.push(w0); sp.push(false); } }
        if (!latin && sp.length) sp[sp.length - 1] = pi < pcs.length - 1;
    }
    if (!words.length) { words = [t]; sp = [false]; }
    k = Math.max(1, Math.min(k, jzCount(t)));
    var hard = {}, parts;
    for (var guard = 0; words.length < k && guard < 16; guard++) {
        var bi = -1, bl = 1;
        for (i = 0; i < words.length; i++) { var l = jzCount(words[i]); if (l > bl && !hard[words[i]]) { bl = l; bi = i; } }
        if (bi < 0) break;
        parts = latin ? [words[bi]] : la1_split2(words[bi]);
        if (parts.length < 2 && force && words.length < force) parts = la1_split2(words[bi], true);
        if (parts.length < 2) { hard[words[bi]] = 1; continue; }
        sp.splice(bi, 1, false, sp[bi]); words.splice(bi, 1, parts[0], parts[1]);
    }
    var sep = latin ? ' ' : '';
    if (k <= 1) return [words.join(sep)];
    if (words.length <= k) return words;
    function part(ws) {
        var pre = [0], n = ws.length, j;
        for (j = 0; j < n; j++) pre.push(pre[j] + jzCount(ws[j]) + 0.5);
        var tgt = pre[n] / k, best = null, bestS = 1e18, cnt = 0;
        function rec(start, g, cuts) {
            if (++cnt > 5000) return;
            if (g === k - 1) {
                var s = 0, prev = 0, all = cuts.concat([n]);
                for (var q = 0; q < all.length; q++) { var d = pre[all[q]] - pre[prev] - tgt; s += d * d; prev = all[q]; if (q < all.length - 1 && sp[all[q] - 1]) s -= tgt * tgt * 0.25; }
                if (s < bestS) { bestS = s; best = all; }
                return;
            }
            for (var c = start + 1; c <= n - (k - 1 - g); c++) rec(c, g + 1, cuts.concat([c]));
        }
        rec(0, 0, []);
        var out = [], prv = 0;
        if (!best) { for (j = 0; j < n; j++) out.push([ws[j]]); return out; }
        for (j = 0; j < best.length; j++) { out.push(ws.slice(prv, best[j])); prv = best[j]; }
        return out;
    }
    var groups = part(words);
    for (var it = 0; it < 3; it++) {
        var gl = [], mx = -1, mn = 1e9, gi = 0;
        for (i = 0; i < groups.length; i++) { var sum = 0; for (var q2 = 0; q2 < groups[i].length; q2++) sum += jzCount(groups[i][q2]); gl.push(sum); if (sum > mx) { mx = sum; gi = i; } if (sum < mn) mn = sum; }
        if (mx <= mn * 1.7 + 1) break;
        var g0 = groups[gi], bw = null;
        for (i = 0; i < g0.length; i++) { if (!hard[g0[i]] && jzCount(g0[i]) >= 3 && (!bw || jzCount(g0[i]) > jzCount(bw))) bw = g0[i]; }
        if (!bw) break;
        parts = latin ? [bw] : la1_split2(bw);
        if (parts.length < 2) { hard[bw] = 1; continue; }
        var wi = jzIndexOf(words, bw);
        sp.splice(wi, 1, false, sp[wi]); words.splice(wi, 1, parts[0], parts[1]);
        groups = part(words);
    }
    var res = [];
    for (i = 0; i < groups.length; i++) res.push(groups[i].join(sep));
    return res;
}
// single glyphs, small kana / punctuation / ー kept on the preceding glyph
function la1_charUnits(text) {
    var a = jzChars(jzStrip(text)), out = [];
    for (var i = 0; i < a.length; i++) { if (out.length && la1_isBad(a[i])) out[out.length - 1] += a[i]; else out.push(a[i]); }
    return out;
}
// balanced display line breaks at chunk boundaries (AE line break = \r)
function la1_brk(text, maxPer) {
    var t = jzTrim(String(text || '')), n = jzCount(t);
    if (n <= maxPer) return t;
    return la1_splitK(t, Math.ceil(n / maxPer)).join('\r');
}
function la1_box(x0, y0, x1, y1) { return { x0: x0, y0: y0, x1: x1, y1: y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }; }
// true comp-space bbox of an unrotated layer (text rect, anchor, position, scale)
function la1_bb(L) {
    var r = jzRect(L), a = jzXf(L, 'ADBE Anchor Point').value, p = jzXf(L, 'ADBE Position').value, s = jzXf(L, 'ADBE Scale').value;
    var x0 = p[0] + (r.left - a[0]) * s[0] / 100, y0 = p[1] + (r.top - a[1]) * s[1] / 100;
    return la1_box(x0, y0, x0 + r.width * s[0] / 100, y0 + r.height * s[1] / 100);
}
// { w, h } of a string at font size 100 (temporary layer)
function la1_meas(ctx, str, font, track, lead) {
    var L = jzText(ctx, str, { font: font, size: 100, color: '#FFFFFF', x: -9999, y: -9999, track: track || 0, leading: /\r/.test(str) ? 100 * (lead || 1.2) : null });
    var r = jzRect(L); L.remove();
    return { w: Math.max(1, r.width), h: Math.max(1, r.height) };
}
function la1_fit(m, maxW, maxH) { return 100 * Math.min(maxW / m.w, maxH / m.h); }
// text layer at a given size: o { align, x, y, color, track, lead, fill, stroke, strokeColor, opacity, name }
function la1_T(ctx, str, font, size, o) {
    o = o || {};
    return jzText(ctx, str, { font: font, size: size, color: o.color || ctx.sc.fg, x: o.x || 0, y: o.y || 0, align: o.align, track: o.track || 0,
        leading: /\r/.test(str) ? size * (o.lead || 1.2) : null, fill: o.fill, stroke: o.stroke, strokeColor: o.strokeColor, opacity: o.opacity, name: o.name });
}
// move plates / guides directly under layer L, keeping their creation order
function la1_behind(list, L) { for (var i = 0; i < list.length; i++) list[i].moveAfter(L); }
// keep helper layers out of the tinted ghosts (the browser draws them with ghost off / main pass only)
function la1_ng(list) { for (var i = 0; i < list.length; i++) if (list[i]) jzNoGhost(list[i]); return list; }
function la1_opx(ctx, L, alphaExpr) { jzSetExpr(jzXf(L, 'ADBE Opacity'), la1_H(ctx) + 'value*(' + alphaExpr + ')'); }
function la1_shape(g, sh) { var p = jzVecs(g).addProperty('ADBE Vector Shape - Group'); p.property('ADBE Vector Shape').setValue(sh); return p; }
function la1_len(a, b) { return Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1])); }
// circular arc (degrees, screen angles, a0 -> a1) as an open bezier Shape
function la1_arc(cx, cy, r, a0, a1) {
    var segs = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 90)), da = (a1 - a0) / segs, k = 4 / 3 * Math.tan(da * Math.PI / 720) * r;
    var V = [], I = [], O = [];
    for (var i = 0; i <= segs; i++) {
        var a = (a0 + da * i) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
        V.push([cx + c * r, cy + s * r]); I.push(i ? [s * k, -c * k] : [0, 0]); O.push(i < segs ? [-s * k, c * k] : [0, 0]);
    }
    var sh = new Shape(); sh.vertices = V; sh.inTangents = I; sh.outTangents = O; sh.closed = false;
    return sh;
}
// ONE text layer holding glyphs placed anywhere (keeps the lyric one editable text): one glyph per line, centre-justified,
// moved to its target centre by a per-glyph Position animator; o: { size, font, color, rots[], scales[], name, fill, stroke, strokeColor }
function la1_glyphLayer(ctx, gl, pts, o) {
    var size = o.size, lead = size * 1.2, bo = size * 0.38, n = gl.length, i, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (i = 0; i < n; i++) { x0 = Math.min(x0, pts[i][0]); x1 = Math.max(x1, pts[i][0]); y0 = Math.min(y0, pts[i][1]); y1 = Math.max(y1, pts[i][1]); }
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    var L = jzText(ctx, gl.join('\r'), { font: o.font, size: size, color: o.color || ctx.sc.fg, x: cx, y: cy, leading: lead, fill: o.fill, stroke: o.stroke, strokeColor: o.strokeColor, name: o.name || gl.join('') });
    jzXf(L, 'ADBE Anchor Point').setValue([0, 0]);
    jzXf(L, 'ADBE Position').setValue([cx, cy]);
    var offs = [];
    for (i = 0; i < n; i++) offs.push([pts[i][0] - cx, pts[i][1] + bo - cy - i * lead]);
    jzCharOffsets(L, offs, 'JZ Place');
    if (o.rots) jzCharRotations(L, o.rots, 'JZ Turn');
    if (o.scales) jzCharScales(L, o.scales, 'JZ Size');
    return L;
}
// the lyric as separate glyph items (the browser draws these glyphs as items with their own motion index): one centre-justified
// text layer per glyph, anchored on its em-box centre, placed / turned / sized per glyph; o: { size, font, color, colors[], rots[], scales[] }
function la1_glyphItems(ctx, gl, pts, o) {
    var out = [];
    for (var i = 0; i < gl.length; i++) {
        var sz = o.size * (o.scales ? o.scales[i] : 1);
        var L = jzText(ctx, gl[i], { font: o.font, size: sz, color: (o.colors && o.colors[i]) || o.color || ctx.sc.fg, x: pts[i][0], y: pts[i][1] });
        jzXf(L, 'ADBE Anchor Point').setValue([0, -sz * 0.38]);
        jzXf(L, 'ADBE Position').setValue([pts[i][0], pts[i][1]]);
        if (o.rots && o.rots[i]) jzXf(L, 'ADBE Rotate Z').setValue(o.rots[i]);
        out.push(L);
    }
    return out;
}
function la1_ptsBox(pts, h) {
    var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (var i = 0; i < pts.length; i++) { x0 = Math.min(x0, pts[i][0]); x1 = Math.max(x1, pts[i][0]); y0 = Math.min(y0, pts[i][1]); y1 = Math.max(y1, pts[i][1]); }
    return la1_box(x0 - h, y0 - h, x1 + h, y1 + h);
}

/* ---------------------------------------------------------------- 2 corners — 対角配置 */
jzReg('layout', 'corners', {
    plan: function (rng, cut, st) {
        return { chunks: la1_splitK(cut.text, 2, 2), font: rng.pick(jzFontsOf(st, ['display', 'serif'])), diag: rng.pick(['main', 'main', 'anti']), link: rng.pick(['elbow', 'straight', 'elbow']), ratio: rng.pick([1, 1, 0.76]) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i;
        var ch = jzP(ctx, 'chunks', null);
        if (!ch || ch.length < 2) ch = la1_splitK(c.text, 2, 2);
        var A0 = ch[0], B0 = ch.length > 1 ? ch.slice(1).join(jzHasLatin(ch[0]) ? ' ' : '') : '';
        var maxPer = port ? 5 : 9, A = la1_brk(A0, maxPer), B = B0 ? la1_brk(B0, maxPer) : '';
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), ratio = jzP(ctx, 'ratio', 1) || 1;
        var bw = W * (port ? 0.84 : 0.58), bh = H * (port ? 0.24 : 0.3);
        var mA = la1_meas(ctx, A, font, 0.02, 1.1), mB = B ? la1_meas(ctx, B, font, 0.02, 1.1) : null;
        var s = Math.min(la1_fit(mA, bw, bh), mB ? la1_fit(mB, bw, bh) / ratio : 1e9, u * 0.22), sA = s, sB = s * ratio;
        var mx = W * 0.075, my = H * (port ? 0.15 : 0.13), aL = jzP(ctx, 'diag', 'main') !== 'anti';
        var ax = aL ? mx : W - mx, bx = aL ? W - mx : mx;
        // the two halves in opposite corners
        var LA = la1_T(ctx, A, font, sA, { align: aL ? 'left' : 'right', x: ax, y: my + mA.h * sA / 200, track: 0.02, lead: 1.1 });
        var Ab = la1_bb(LA), LB = null, Bb;
        if (B) { LB = la1_T(ctx, B, font, sB, { align: aL ? 'right' : 'left', x: bx, y: H - my - mB.h * sB / 200, track: 0.02, lead: 1.1 }); Bb = la1_bb(LB); }
        else Bb = la1_box(bx, H - my, bx, H - my);
        // connector (draws itself after half the entrance), end dots, small caption on its longest segment
        var g = u * 0.028, link = jzP(ctx, 'link', 'elbow'), pts;
        if (link === 'elbow') {
            var xb = aL ? Bb.x0 + sB * 0.5 : Bb.x1 - sB * 0.5, clear = aL ? xb > Ab.x1 + g * 2 : xb < Ab.x0 - g * 2;
            if (clear) pts = [[aL ? Ab.x1 + g : Ab.x0 - g, Ab.cy], [xb, Ab.cy], [xb, Bb.y0 - g]];
            else { var xm = aL ? Math.max(Ab.x0, Bb.x0) + sB * 0.5 : Math.min(Ab.x1, Bb.x1) - sB * 0.5; pts = [[xm, Ab.y1 + g], [xm, Bb.y0 - g]]; }
        } else pts = [[aL ? Ab.x1 : Ab.x0, Ab.y1 + g], [aL ? Bb.x0 : Bb.x1, Bb.y0 - g]];
        var HD = la1_H(ctx), E = 'var e=ioc((time-' + jzN((c.inDur || 0.3) * 0.5) + ')/0.55)*K;';
        var lw = Math.max(1.5 * ctx.u, u * 0.0022), r0 = u * 0.007, deco = [];
        deco.push(jzPathLayer(ctx, 'link', pts, sc.sub, { width: lw, trim: HD + E + '100*e' }));
        var D0 = jzEllipseLayer(ctx, 'link start', pts[0][0], pts[0][1], r0 * 2, r0 * 2, sc.bg, { stroke: sc.sub, strokeW: lw });
        jzSetExpr(jzXf(D0, 'ADBE Opacity'), HD + E + 'value*Math.min(1,e*4)');
        var z = pts[pts.length - 1], D1 = jzEllipseLayer(ctx, 'link end', z[0], z[1], r0 * 2, r0 * 2, sc.accent);
        jzSetExpr(jzXf(D1, 'ADBE Opacity'), HD + E + 'e>0.97?value:0');
        deco.push(D0, D1);
        var bi = 1, bl = 0;
        for (i = 1; i < pts.length; i++) { var l = la1_len(pts[i - 1], pts[i]); if (l > bl) { bl = l; bi = i; } }
        var q0 = pts[bi - 1], q1 = pts[bi], ls = jzSmallSize(ctx) * 0.9;
        var horiz = Math.abs(q1[1] - q0[1]) < Math.abs(q1[0] - q0[0]) * 0.3, mxp = (q0[0] + q1[0]) / 2, myp = (q0[1] + q1[1]) / 2;
        var cap = jzTrim('No.' + jzLineNo(ctx) + '  ' + (jzRomajiOf(ctx) || ''));
        if (bl > ls * 8) {
            var C = horiz ? jzText(ctx, cap, { font: jzMonoF(ctx), size: ls, color: sc.sub, x: mxp, y: myp - ls * 1.1, track: 0.1 })
                : jzText(ctx, cap, { font: jzMonoF(ctx), size: ls, color: sc.sub, x: mxp + (aL ? ls * 0.8 : -ls * 0.8) * (link === 'straight' ? -1 : 1), y: myp, align: aL ? 'left' : 'right', track: 0.1 });
            jzSetExpr(jzXf(C, 'ADBE Opacity'), HD + E + 'value*cl((e-0.5)*3)');
            deco.push(C);
        }
        la1_behind(la1_ng(deco), LA);
        jzAnimate(ctx, LA, { mi: 0 });
        if (LB) jzAnimate(ctx, LB, { mi: Math.min(8, jzCount(A0) + 2) });
        return LB ? jzUnion(Ab, Bb) : Ab;
    }
});

/* ---------------------------------------------------------------- 3 staircase — 階段 */
jzReg('layout', 'staircase', {
    plan: function (rng, cut, st) {
        var port = cut.H > cut.W * 1.08, n = cut.n, latin = /[A-Za-z]/.test(cut.text);
        var units = latin ? la1_splitK(cut.text, port ? 6 : 4)
            : port ? (n <= 9 ? la1_charUnits(cut.text) : la1_splitK(cut.text, Math.min(6, Math.ceil(n / 2.6))))
            : (n <= 6 ? la1_charUnits(cut.text) : la1_splitK(cut.text, n <= 10 ? 3 : 4));
        return { units: units, dir: port ? 'down' : rng.pick(['down', 'down', 'up']), flip: !port && rng.chance(0.22), shrink: rng.range(0.82, 0.9), font: rng.pick(jzFontsOf(st, ['display', 'display', 'serif'])), tread: rng.pick(['line', 'line', 'none']), nums: rng.chance(0.55) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i;
        var units = jzP(ctx, 'units', null);
        if (!units || !units.length) units = [jzStrip(c.text)];
        var k = units.length, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display'));
        var r = k > 1 ? Math.max(jzP(ctx, 'shrink', 0.86) || 0.86, Math.pow(0.5, 1 / (k - 1))) : 1;
        var up = jzP(ctx, 'dir', 'down') === 'up' && !port, fx = up ? 1 : port ? 0.5 : 0.92, flip = !!jzP(ctx, 'flip', false);
        // step geometry in design units (size 100 for the first step), then fitted to the frame
        var Q = [], x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        for (i = 0; i < k; i++) {
            var s = 100 * Math.pow(r, i), w = la1_meas(ctx, units[i], font, 0.02).w * s / 100, x = 0, y = 0;
            if (i > 0) { var q = Q[i - 1]; x = q.x + q.w * fx + q.s * 0.14; y = q.y + (q.s + s) / 2 * 1.05 * (up ? -1 : 1); }
            Q.push({ t: units[i], s: s, w: w, x: x, y: y });
            x0 = Math.min(x0, x); x1 = Math.max(x1, x + w); y0 = Math.min(y0, y - s / 2); y1 = Math.max(y1, y + s * 0.62);
        }
        var k2 = Math.min(W * 0.86 / (x1 - x0), H * 0.78 / (y1 - y0), u * 0.3 / 100);
        var ox = W / 2 - (x0 + x1) / 2 * k2, oy = H / 2 - (y0 + y1) / 2 * k2;
        function X(q) { return ox + q.x * k2; }
        function Y(q) { return oy + q.y * k2; }
        function mir(xx) { return flip ? W - xx : xx; }
        // the steps (one text item per step, like the browser)
        var Ls = [], bb = null;
        for (i = 0; i < k; i++) {
            var qq = Q[i], xl = X(qq);
            var L = la1_T(ctx, qq.t, font, qq.s * k2, { align: 'left', x: flip ? W - xl - qq.w * k2 : xl, y: Y(qq), track: 0.02 });
            Ls.push(L); bb = jzUnion(bb, la1_bb(L));
        }
        // tread / riser guide drawing itself along the steps + step numbers
        var tread = jzP(ctx, 'tread', 'line') !== 'none', nums = !!jzP(ctx, 'nums', false), deco = [];
        if (tread || nums) {
            var HD = la1_H(ctx), E = 'var e=ioc(time/' + jzN(Math.max(0.5, (c.inDur || 0.3) * 1.6)) + ')*K;';
            var lw = Math.max(2 * ctx.u, 100 * k2 * 0.022), pts = [];
            for (i = 0; i < k; i++) {
                var q3 = Q[i], yb = Y(q3) + q3.s * k2 * 0.58, gap = q3.s * k2 * 0.14;
                if (i === 0) pts.push([mir(X(q3) - gap), yb]);
                if (i < k - 1) { var nx = Q[i + 1], xr = X(nx) - gap / 2; pts.push([mir(xr), yb], [mir(xr), Y(nx) + nx.s * k2 * 0.58]); }
                else pts.push([mir(X(q3) + q3.w * k2 + gap), yb]);
            }
            if (tread) deco.push(jzPathLayer(ctx, 'tread', pts, sc.accent, { width: lw, trim: HD + E + '100*e' }));
            if (nums) {
                var ls = jzSmallSize(ctx) * 0.85;
                for (i = 0; i < k; i++) {
                    var q4 = Q[i], yb2 = Y(q4) + q4.s * k2 * 0.58;
                    var T = jzText(ctx, jzPad(i + 1, 2), { font: jzMonoF(ctx), size: ls, color: sc.sub, x: mir(X(q4)), y: yb2 + ls * 1.1, align: flip ? 'right' : 'left' });
                    jzSetExpr(jzXf(T, 'ADBE Opacity'), HD + E + 'value*cl((e*' + k + '-' + i + ')*1.5)');
                    deco.push(T);
                }
            }
        }
        la1_behind(la1_ng(deco), Ls[0]);
        for (i = 0; i < k; i++) jzAnimate(ctx, Ls[i], { mi: i * 2 });
        return bb;
    }
});

/* ---------------------------------------------------------------- 4 zigzag — ジグザグ */
jzReg('layout', 'zigzag', {
    plan: function (rng, cut, st) {
        var port = cut.H > cut.W * 1.08;
        return { font: rng.pick(jzFontsOf(st, ['display'])), orient: port && cut.n > 5 ? 'v' : 'h', amp: rng.range(0.24, 0.34), phase: rng.pick([1, -1]), rails: rng.pick(['under', 'both', 'under', 'over']), tilt: rng.chance(0.35) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), i;
        var t = jzHasLatin(c.text) ? jzTrim(c.text).replace(/\s+/g, ' ') : jzStrip(c.text), chars = jzChars(t), n = Math.max(1, chars.length);
        var v = jzP(ctx, 'orient', 'h') === 'v', amp = jzP(ctx, 'amp', 0.3), ph = jzP(ctx, 'phase', 1) < 0 ? -1 : 1, tilt = !!jzP(ctx, 'tilt', false);
        var size = Math.min((v ? H * 0.78 : W * 0.8) / n / 1.08, u * 0.2), step = size * 1.08, A = size * amp;
        function pos(j) { var s = (j % 2 ? 1 : -1) * ph, kk = j - (n - 1) / 2; return v ? [W / 2 + s * A, H / 2 + kk * step] : [W / 2 + kk * step, H / 2 + s * A]; }
        // the lyric: every glyph on the zigzag (one text layer, per-glyph placement)
        var gl = [], gp = [], rots = [], mis = [];
        for (i = 0; i < chars.length; i++) {
            var ch = chars[i];
            if (ch === ' ' || ch === '　') continue;
            gl.push(ch); gp.push(pos(i)); mis.push(i);
            rots.push((tilt ? (i % 2 ? 1 : -1) * ph * 6 * (v ? -1 : 1) : 0) + (v && (la1_VROT.indexOf(ch) >= 0 || jzIsLatin(ch)) ? 90 : 0));
        }
        var GL = la1_glyphItems(ctx, gl, gp, { size: size, font: jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), rots: rots });
        // zigzag rails riding just outside the glyphs, extended to the frame margins
        var off = size * (0.52 + amp * 0.9), lw = Math.max(2 * ctx.u, size * 0.03), lim = (v ? H : W) * 0.04;
        var ext = Math.ceil(((v ? H : W) / 2 - n * step / 2 - lim) / step);
        var HD = la1_H(ctx), E = 'var e=ioc(time/' + jzN(Math.max(0.45, (c.inDur || 0.3) * 1.5)) + ')*K;';
        var rails = jzP(ctx, 'rails', 'under'), sides = rails === 'both' ? [1, -1] : rails === 'over' ? [-1] : [1], deco = [];
        for (var sI = 0; sI < sides.length; sI++) {
            var sg = sides[sI], pts = [];
            for (i = -ext; i <= n - 1 + ext; i++) {
                var q = pos(i), pt = v ? [q[0] + sg * off, q[1]] : [q[0], q[1] + sg * off], cc = v ? pt[1] : pt[0];
                if (cc < lim || cc > (v ? H : W) - lim) continue;
                pts.push(pt);
            }
            if (pts.length < 2) continue;
            var col = sI === 0 ? sc.accent : sc.sub;
            var R = jzPathLayer(ctx, 'rail', pts, col, { width: lw, trim: HD + E + '100*e' });
            var g0 = jzGrp(R, 'start'); jzAddEllipse(g0, lw * 4.4, lw * 4.4, pts[0][0], pts[0][1]); jzAddFill(g0, col);
            jzSetExpr(jzGX(g0).property('ADBE Vector Group Opacity'), HD + E + 'e>0?100:0');
            var z = pts[pts.length - 1], g1 = jzGrp(R, 'end'); jzAddEllipse(g1, lw * 4.4, lw * 4.4, z[0], z[1]); jzAddFill(g1, col);
            jzSetExpr(jzGX(g1).property('ADBE Vector Group Opacity'), HD + E + 'e>0.98?100:0');
            deco.push(R);
        }
        la1_ng(deco);
        if (GL.length) la1_behind(deco, GL[0]);
        for (i = 0; i < GL.length; i++) jzAnimate(ctx, GL[i], { mi: mis[i] });
        return gp.length ? la1_ptsBox(gp, size / 2) : la1_box(W / 2 - step, H / 2 - step, W / 2 + step, H / 2 + step);
    }
});

/* ---------------------------------------------------------------- 5 arcTop — 虹の弧 */
jzReg('layout', 'arcTop', {
    plan: function (rng, cut, st) {
        var port = cut.H > cut.W * 1.08;
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif', 'display'])), span: port ? rng.range(150, 190) : rng.range(105, 145), guide: rng.pick(['double', 'ticks', 'double']), under: rng.pick(['copy', 'romaji', 'no']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), i, DEG = Math.PI / 180;
        var chars = jzChars(jzTrim(c.text)), n = Math.max(1, chars.length);
        var spanDeg = Math.min(jzP(ctx, 'span', 125), Math.max(50, n * 30));
        var half = spanDeg / 2 * DEG, dth = spanDeg * DEG / n, k = dth / 1.1;
        var wid = half < Math.PI / 2 ? 2 * Math.sin(half) : 2, hollow = half >= 70 * DEG;
        var R = Math.min(W * 0.86 / (wid + k), H * 0.66 / (1 - Math.cos(half) + k * 1.3 + (hollow ? 0 : 0.18)), u * 0.21 / k);
        var size = R * k, ls = jzSmallSize(ctx);
        var topOff = -(R + size * 0.8), endY = -R * Math.cos(half) + size * 0.55;
        var capY = hollow ? Math.max(0, -R * Math.cos(half) - R * 0.1) : endY + ls * 1.6;
        var botOff = Math.max(endY, capY + ls * 2.2), cx = W / 2, cy = H / 2 - (topOff + botOff) / 2;
        // the lyric along the arc, tops outward
        var gl = [], gp = [], rots = [], mis = [];
        for (i = 0; i < chars.length; i++) {
            if (chars[i] === ' ' || chars[i] === '　') continue;
            var th = -90 + (i - (n - 1) / 2) * spanDeg / n;
            gl.push(chars[i]); gp.push([cx + Math.cos(th * DEG) * R, cy + Math.sin(th * DEG) * R]); rots.push(th + 90); mis.push(i);
        }
        var GL = la1_glyphItems(ctx, gl, gp, { size: size, font: jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), rots: rots });
        // guide arcs open symmetrically from the top; accent dots ride the outer arc's ends
        var HD = la1_H(ctx), E = 'var e=ioc(time/0.7)*K;', lw = Math.max(1.2 * ctx.u, size * 0.018);
        var a0 = -90 - spanDeg / 2 - 3, a1 = -90 + spanDeg / 2 + 3, hs = (a1 - a0) / 2, Ro = R + size * 0.74, Ri = R - size * 0.72;
        var G = jzShapeLayer(ctx, 'arc guides', cx, cy), deco = [G];
        var trimS = HD + E + '50*(1-e)', trimE = HD + E + '50*(1+e)';
        function arcG(name, r, op) { var g = jzGrp(G, name); la1_shape(g, la1_arc(0, 0, r, a0, a1)); jzAddStroke(g, sc.sub, lw, op); jzAddTrimPaths(g, trimE, trimS); }
        if (jzP(ctx, 'guide', 'double') === 'double') { arcG('outer', Ro, 90); arcG('inner', Ri, 60); }
        else {
            arcG('inner', Ri, 80);
            for (i = 0; i <= n; i++) {
                var tt = -90 + (i - n / 2) * spanDeg / n, co = Math.cos(tt * DEG), si = Math.sin(tt * DEG), r1 = Ri - size * (i % 2 ? 0.12 : 0.22);
                var gt = jzGrp(G, 'tick ' + i); jzAddPath(gt, [[co * Ri, si * Ri], [co * r1, si * r1]], false); jzAddStroke(gt, sc.sub, lw, 80);
                jzSetExpr(jzGX(gt).property('ADBE Vector Group Opacity'), HD + E + 'e>0&&' + jzN(Math.abs(tt + 90)) + '<=' + jzN(hs) + '*e+0.01?100:0');
            }
        }
        for (var d = -1; d <= 1; d += 2) {
            var gd = jzGrp(G, d < 0 ? 'dot L' : 'dot R'); jzAddEllipse(gd, size * 0.1, size * 0.1); jzAddFill(gd, sc.accent);
            jzSetExpr(jzGX(gd).property('ADBE Vector Position'), HD + E + 'var a=(-90+(' + d + ')*' + jzN(hs) + '*e)*Math.PI/180;[Math.cos(a)*' + jzN(Ro) + ',Math.sin(a)*' + jzN(Ro) + ']');
            jzSetExpr(jzGX(gd).property('ADBE Vector Group Opacity'), HD + E + 'e>0?100:0');
        }
        // caption under the arc + accent rule
        var under = jzP(ctx, 'under', 'copy');
        var copy = under === 'romaji' ? (jzRomajiOf(ctx) || jzAltCopy(ctx)) : under === 'no' ? 'No.' + jzLineNo(ctx) + '  —  ' + jzFmtTime(c.start || 0) : jzAltCopy(ctx);
        var maxW = hollow ? 2 * (R - size) * 0.8 : W * 0.7, bf = jzBodyF(ctx);
        var cs = Math.min(ls * 1.15, la1_fit(la1_meas(ctx, copy, bf, 0.12), maxW, ls * 2));
        var CA = 'var ca=oc((time-0.25)/0.4)*K;';
        var C = jzText(ctx, copy, { font: bf, size: cs, color: sc.sub, x: cx, y: cy + capY, track: 0.12 });
        jzSetExpr(jzXf(C, 'ADBE Opacity'), HD + CA + 'value*ca');
        var rw = Math.min(maxW * 0.5, size * 1.4), Rl = jzRectLayer(ctx, 'caption rule', cx, cy + capY + cs * 1.1, rw, Math.max(2 * ctx.u, lw * 1.4), sc.accent);
        jzSetExpr(jzXf(Rl, 'ADBE Scale'), HD + CA + '[value[0]*ca,value[1]]');
        jzSetExpr(jzXf(Rl, 'ADBE Opacity'), HD + CA + 'value*ca');
        deco.push(C, Rl);
        la1_ng(deco);
        if (GL.length) la1_behind(deco, GL[0]);
        for (i = 0; i < GL.length; i++) jzAnimate(ctx, GL[i], { mi: mis[i] });
        return gp.length ? la1_ptsBox(gp, size / 2) : la1_box(cx - R, cy - R, cx + R, cy);
    }
});

/* ---------------------------------------------------------------- 6 spiral — 螺旋 */
jzReg('layout', 'spiral', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), dir: rng.pick([1, -1]), speed: rng.range(4, 9), guide: rng.chance(0.7), fill: cut.n <= 7 ? 'repeat' : cut.n <= 11 ? rng.pick(['repeat', 'single']) : 'single' };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), i, j, DEG = Math.PI / 180;
        var t = jzHasLatin(c.text) ? jzTrim(c.text).replace(/\s+/g, ' ') : jzStrip(c.text), chars = jzChars(t), n = Math.max(1, chars.length);
        var dir = jzP(ctx, 'dir', 1) < 0 ? -1 : 1, speed = jzP(ctx, 'speed', 6), fill = jzP(ctx, 'fill', 'single'), font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display'));
        var seq = [];
        for (i = 0; i < chars.length; i++) seq.push({ c: chars[i], main: true });
        if (fill === 'repeat') {
            var reps = Math.max(1, Math.ceil(20 / (n + 1)) - 1);
            for (var rr = 0; rr < reps && seq.length < 40; rr++) { seq.push({ c: '・', main: false }); for (i = 0; i < chars.length; i++) seq.push({ c: chars[i], main: false }); }
        }
        var N = seq.length, f = fill === 'repeat' ? 0.8 : 0.58, cc = Math.min(0.42, 0.92 * Math.sqrt(5.82 * f / N)), dth = cc * 1.08, TH = N * dth;
        var R0 = u * 0.45 / (1 + cc * 0.55);
        function rAt(th) { return R0 * (1 - f * th / TH); }
        var mid = dir > 0 ? -90 : 90, base = mid - dir * Math.min((n - 1) * dth / 2 / DEG, 70);
        // centre the glyph cloud (at rest = mid-cut) on screen
        var bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
        for (j = 0; j < N; j++) {
            var th0 = j * dth, r0 = rAt(th0), sz0 = cc * r0 * 0.5, p0 = (base + dir * th0 / DEG) * DEG, x0 = Math.cos(p0) * r0, y0 = Math.sin(p0) * r0;
            bx0 = Math.min(bx0, x0 - sz0); bx1 = Math.max(bx1, x0 + sz0); by0 = Math.min(by0, y0 - sz0); by1 = Math.max(by1, y0 + sz0);
        }
        var cx = W / 2 - (bx0 + bx1) / 2, cy = H / 2 - (by0 + by1) / 2;
        // pivot layer at the spiral centre: guide + centre dot; it turns slowly and carries the glyph layers (parented)
        var HD = la1_H(ctx), Pv = jzNoGhost(jzShapeLayer(ctx, 'spiral', cx, cy));   // guide + dot: main pass only (still the glyphs' parent in the ghosts)
        if (jzP(ctx, 'guide', true)) {
            var gg = jzGrp(Pv, 'guide'), gpts = [];
            for (var m = 0; m <= 100; m++) {
                var tg = (m / 100) * (TH - dth * 0.5), rg = rAt(tg) * (1 + cc * 0.62), pg = (base + dir * tg / DEG) * DEG;
                gpts.push([Math.cos(pg) * rg, Math.sin(pg) * rg]);
            }
            jzAddPath(gg, gpts, false); jzAddStroke(gg, sc.sub, Math.max(1.2 * ctx.u, u * 0.0016), 55);
            jzAddTrimPaths(gg, HD + '100*ioc(time/0.9)*K');
        }
        var gdot = jzGrp(Pv, 'centre'); jzAddEllipse(gdot, u * 0.016, u * 0.016); jzAddFill(gdot, sc.accent);
        jzSetExpr(jzGX(gdot).property('ADBE Vector Scale'), HD + 'var q=cl(time/0.35);var s=(q<=0?0:ob(q,2))*K*100;[s,s]');
        // glyphs: main = the lyric (one text layer); the repeats = faint copies running on towards the centre
        var sMax = cc * R0, mg = [], mp = [], mr = [], ms = [], mis = [], rg2 = [], rp = [], rro = [], rs = [], rj = [], ra = [];
        for (j = 0; j < N; j++) {
            var q = seq[j];
            if (q.c === ' ' || q.c === '　') continue;
            var th = j * dth, r = rAt(th), ph = base + dir * th / DEG;
            var pt = [cx + Math.cos(ph * DEG) * r, cy + Math.sin(ph * DEG) * r], rot = dir > 0 ? ph + 90 : ph - 90;
            if (q.main) { mg.push(q.c); mp.push(pt); mr.push(rot); ms.push(r / R0); mis.push(j); }
            else { rg2.push(q.c); rp.push(pt); rro.push(rot); rs.push(r / R0); rj.push(j); ra.push(jzLerp(0.22, 0.7, r / R0)); }
        }
        var RL = null;
        if (rg2.length) {
            RL = la1_glyphLayer(ctx, rg2, rp, { size: sMax, font: font, color: sc.sub, rots: rro, scales: rs, name: 'spiral repeats' });
            jzAnimator(RL, 'JZ Fade', [['ADBE Text Opacity', 0]], HD + 'var J=' + jzArrExpr(rj) + ',A=' + jzArrExpr(ra) + ';var k=textIndex-1;var a=cl((time-0.15-((J[k]||0)-' + n + ')*0.025)/0.25)*K*(A[k]||0);100*(1-a)');
            RL.parent = Pv; jzNoGhost(RL);
        }
        var GL = la1_glyphItems(ctx, mg, mp, { size: sMax, font: font, rots: mr, scales: ms });
        for (i = 0; i < GL.length; i++) GL[i].parent = Pv;
        jzSetExpr(jzXf(Pv, 'ADBE Rotate Z'), 'value+(time-' + jzN(c.dur / 2) + ')*' + jzN(speed * dir));   // set after parenting (no parenting jump)
        for (i = 0; i < GL.length; i++) jzAnimate(ctx, GL[i], { mi: mis[i], noHold: true });
        return mp.length ? la1_ptsBox(mp, sMax / 2) : la1_box(cx - R0, cy - R0, cx + R0, cy + R0);
    }
});

// bar that grows from (x, y) to the right (dir 1) or left (dir -1): shape layer anchored at its growth origin
// alpha track matte M (a layer directly above L): AE 23+ API when present, else the legacy property
function la1_matte(L, M) {
    try { if (L.setTrackMatte) { L.setTrackMatte(M, TrackMatteType.ALPHA); return; } } catch (e) {}
    L.trackMatteType = TrackMatteType.ALPHA;
}
function la1_bar(ctx, name, x, y, w, h, col, dir) {
    var S = jzShapeLayer(ctx, name, x, y), g = jzGrp(S, name);
    jzAddRect(g, w, h, 0, (dir < 0 ? -1 : 1) * w / 2, 0); jzAddFill(g, col);
    return S;
}
// several polylines drawn one after another as progress e (an expression variable) runs 0..1 (browser segsPartial)
function la1_segs(S, segs, col, lw, op, HD, E) {
    var lens = [], tot = 0, i, j;
    for (i = 0; i < segs.length; i++) { var l = 0; for (j = 1; j < segs[i].length; j++) l += la1_len(segs[i][j - 1], segs[i][j]); lens.push(Math.max(1e-3, l)); tot += lens[i]; }
    var acc = 0;
    for (i = 0; i < segs.length; i++) {
        var g = jzGrp(S, 'seg ' + (i + 1)); jzAddPath(g, segs[i], false); jzAddStroke(g, col, lw, op);
        jzAddTrimPaths(g, HD + E + '100*cl((e*' + jzN(tot) + '-' + jzN(acc) + ')/' + jzN(lens[i]) + ')');
        acc += lens[i];
    }
}
// rough advance of a string in em (for choosing line breaks before anything is measured)
function la1_estW(t, tr) {
    var a = jzChars(t), w = 0;
    for (var i = 0; i < a.length; i++) w += /[A-Za-z0-9]/.test(a[i]) ? 0.58 : (a[i] === ' ' ? 0.3 : 1);
    return w + Math.max(0, a.length - 1) * (tr || 0);
}

/* ---------------------------------------------------------------- 7 gridCells — 升目 */
jzReg('layout', 'gridCells', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), gap: rng.pick([0, 0, 0.1, 0.16]), acc: rng.int(0, 99), fill: rng.pick(['outline', 'outline', 'ink']), nums: rng.chance(0.6) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i;
        var chars = jzChars(jzStrip(c.text)), n = Math.max(1, chars.length);
        var maxCols = port ? (n <= 8 ? 4 : 5) : (n <= 10 ? 10 : 8);
        var rows = Math.ceil(n / Math.min(n, maxCols)), cols = Math.ceil(n / rows), g = jzP(ctx, 'gap', 0) || 0;
        var cell = Math.min(W * 0.86 / (cols + (cols - 1) * g), H * 0.72 / (rows + (rows - 1) * g), u * 0.3), stp = cell * (1 + g);
        var gw = cols * cell + (cols - 1) * cell * g, gh = rows * cell + (rows - 1) * cell * g, x0 = W / 2 - gw / 2, y0 = H / 2 - gh / 2;
        var kan = [], ok = [];
        for (i = 0; i < chars.length; i++) { if (jzIsKanji(chars[i])) kan.push(i); if (!la1_isPunct(chars[i]) && !la1_isSmall(chars[i])) ok.push(i); }
        var acc = Math.abs(jzP(ctx, 'acc', 0) | 0), ai = kan.length ? kan[acc % kan.length] : ok.length ? ok[acc % ok.length] : acc % n;
        var plate = jzP(ctx, 'fill', 'outline') === 'ink', lw = Math.max(1.5 * ctx.u, cell * 0.012), HD = la1_H(ctx), total = rows * cols;
        function cx(j) { return x0 + (j % cols) * stp; }
        function cy(j) { return y0 + Math.floor(j / cols) * stp; }
        // plates (accent cell always; every lyric cell when fill = ink) pop in from their centres
        // (the accent plate is ghosted in the browser, the ink plates are not: separate layers)
        var PA = jzShapeLayer(ctx, 'accent plate', 0, 0), PL = plate ? jzNoGhost(jzShapeLayer(ctx, 'cell plates', 0, 0)) : null;
        for (i = 0; i < total; i++) {
            if (!(i === ai || (plate && i < n))) continue;
            var gp = jzGrp(i === ai ? PA : PL, 'plate ' + (i + 1)); jzAddRect(gp, cell, cell); jzAddFill(gp, i === ai ? sc.accent : sc.ink);
            jzGX(gp).property('ADBE Vector Position').setValue([cx(i) + cell / 2, cy(i) + cell / 2]);
            jzSetExpr(jzGX(gp).property('ADBE Vector Scale'), HD + 'var q=cl((time-' + jzN(i * 0.03 + 0.08) + ')/0.28);var s=(q<=0?0:ob(q,1.6))*K*100;[s,s]');
        }
        // cell outlines draw themselves one after another (empty cells faint)
        var OL = jzNoGhost(jzShapeLayer(ctx, 'cells', 0, 0));
        for (i = 0; i < total; i++) {
            var X = cx(i), Y = cy(i), go = jzGrp(OL, 'cell ' + (i + 1)), empty = i >= n;
            jzAddPath(go, [[X, Y], [X + cell, Y], [X + cell, Y + cell], [X, Y + cell], [X, Y]], false);
            jzAddStroke(go, empty ? sc.sub : sc.fg, lw, empty ? 35 : 90);
            jzAddTrimPaths(go, HD + '100*ioc((time-' + jzN(i * 0.03) + ')/0.35)*K');
        }
        // cell numbers: one text layer, a line per number, each moved to its cell's corner
        if (jzP(ctx, 'nums', false)) {
            var ns = Math.max(10 * ctx.u, cell * 0.1), lead = ns * 1.2, nl = [], offs = [], flags = [];
            for (i = 0; i < chars.length; i++) {
                var tg = jzPad(i + 1, 2), tgc = jzChars(tg);
                nl.push(tg);
                for (var q = 0; q < tgc.length; q++) { offs.push([cx(i) + ns * 0.6, cy(i) + ns * 1.1 + ns * 0.36 - i * lead]); flags.push(i === ai); }
            }
            var NL = jzNoGhost(jzText(ctx, nl.join('\r'), { font: jzMonoF(ctx), size: ns, color: plate ? jzOnCol(sc, sc.ink) : sc.sub, x: 0, y: 0, align: 'left', leading: lead, opacity: 0.85, name: 'cell numbers' }));
            jzXf(NL, 'ADBE Anchor Point').setValue([0, 0]); jzXf(NL, 'ADBE Position').setValue([0, 0]);
            jzCharOffsets(NL, offs, 'JZ Place');
            jzCharColors(NL, jzOnCol(sc, sc.accent), flags, 'JZ Accent');
            jzAnimator(NL, 'JZ Fade', [['ADBE Text Opacity', 0]], HD + 'var i=Math.floor((textIndex-1)/2);var e=ioc((time-i*0.03)/0.35)*K;100*(1-cl(e*1.5-0.5))');
        }
        // the lyric: a glyph centred in each cell
        var gl = [], gpts = [], cols2 = [];
        for (i = 0; i < chars.length; i++) { gl.push(chars[i]); gpts.push([cx(i) + cell / 2, cy(i) + cell / 2 + cell * 0.02]); cols2.push(i === ai ? jzOnCol(sc, sc.accent) : plate ? jzOnCol(sc, sc.ink) : sc.fg); }
        var GL = la1_glyphItems(ctx, gl, gpts, { size: cell * 0.64, font: jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), colors: cols2 });
        for (i = 0; i < GL.length; i++) jzAnimate(ctx, GL[i], { mi: i });
        return la1_box(x0, y0, x0 + gw, y0 + gh);
    }
});

/* ---------------------------------------------------------------- 8 dropCap — 大きな頭文字 */
jzReg('layout', 'dropCap', {
    plan: function (rng, cut, st) {
        return { capFont: rng.pick(jzFontsOf(st, ['serif', 'display'])), font: rng.pick(jzFontsOf(st, ['serif', 'body', 'display'])), cap: rng.pick(['fill', 'accent', 'outline']), rules: rng.chance(0.65), meta: rng.chance(0.7) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, j;
        var arr = jzChars(jzTrim(c.text)), cap = arr[0] || '', rest = jzTrim(arr.slice(1).join('')), nR = jzCount(rest);
        var font = jzP(ctx, 'font', jzSerifF(ctx)), capFont = jzP(ctx, 'capFont', jzSerifF(ctx));
        var colW = W * (port ? 0.84 : 0.66), lead = 1.3, tr = 0.04;
        var capAdv = Math.max(la1_estW(cap || '　'), la1_meas(ctx, cap || '　', capFont).w / 100);
        // choose line breaks + size: every candidate split gets its largest fitting size (browser algorithm, estimated advances)
        var nat = {}, ck = jzChunk(rest), accn = 0;
        for (i = 0; i < ck.length; i++) { accn += jzCount(ck[i]); nat[accn] = 1; }
        var best = null, bs = -1, seen = {};
        for (var m = 1; m <= Math.max(1, nR); m++) {
            var tt = jzSplitLines(rest, m);
            if (seen[tt]) continue;
            seen[tt] = 1;
            var raw = tt.split('\r'), lines = [];
            for (i = 0; i < raw.length; i++) if (jzTrim(raw[i])) lines.push(jzTrim(raw[i]));
            if (!lines.length) continue;
            var qq = 1, cum = 0, few = false;
            for (i = 0; i < lines.length; i++) { cum += jzCount(lines[i]); if (i < lines.length - 1 && !nat[cum] && !jzHasLatin(lines[i])) qq *= 0.82; if (jzCount(lines[i]) < 2) few = true; }
            if (nR >= 4 && lines.length < 2) continue;
            if (nR >= 4 && few) continue;
            if (nR <= 3 && lines.length > 1) continue;
            var cls = nR <= 10 ? [2] : [3, 2];
            for (j = 0; j < cls.length; j++) {
                var cl = cls[j], kc = ((cl - 1) * lead + 1) / 0.86, nl0 = Math.max(lines.length, cl);
                var sm = Math.min(u * 0.12, H * 0.62 / ((nl0 - 1) * lead + 1));
                for (i = 0; i < lines.length; i++) sm = Math.min(sm, i < cl ? colW / (la1_estW(lines[i], tr) + capAdv * kc + 0.5) : colW / la1_estW(lines[i], tr));
                var score = sm * qq * (1 - 0.1 * Math.max(0, lines.length - cl));
                if (score > bs) { bs = score; best = { s: sm, cl: cl, lines: lines, capS: sm * kc, gap: sm * 0.5 }; }
            }
        }
        if (!best) best = { s: u * 0.06, cl: 2, lines: rest ? [rest] : [], capS: u * 0.06 * 2.67, gap: u * 0.03 };
        var s = best.s, capLines = best.cl, capS = best.capS, gap = best.gap, LN = best.lines, nl = LN.length;
        // the lines (measured for real), shrunk if the estimate was optimistic
        var LL = [], wl = [];
        for (i = 0; i < nl; i++) { var Li = la1_T(ctx, LN[i], font, s, { align: 'left', track: tr }); LL.push(Li); wl.push(jzSize(Li)[0]); }
        var capW = capAdv * capS, usedW = capW + gap + s;
        for (i = 0; i < nl; i++) usedW = Math.max(usedW, (i < capLines ? capW + gap : 0) + wl[i]);
        if (usedW > colW * 1.02) {
            var kk = colW / usedW;
            s *= kk; capS *= kk; capW *= kk; gap *= kk; usedW *= kk;
            for (i = 0; i < nl; i++) { (function (L0) { jzTextDoc(L0, function (td) { td.fontSize = s; }); jzAnchor(L0, 'left'); })(LL[i]); wl[i] *= kk; }
        }
        var besideOnly = nl <= capLines, hBlock = (Math.max(nl, capLines) - 1) * lead * s + s, meta = !!jzP(ctx, 'meta', false);
        var x0 = W / 2 - usedW / 2, top = H / 2 - hBlock / 2 - (meta ? s * 0.3 : 0);
        var capBand = ((capLines - 1) * lead + 1) * s, capCy = top + capBand / 2;
        function lineY(k) { return besideOnly ? capCy + (k - (nl - 1) / 2) * lead * s * (nl < capLines ? 1.15 : 1) : top + s / 2 + k * lead * s; }
        for (i = 0; i < nl; i++) jzXf(LL[i], 'ADBE Position').setValue([i < capLines ? x0 + capW + gap : x0, lineY(i)]);
        // the initial
        var cst = jzP(ctx, 'cap', 'fill'), co = { font: capFont, size: capS, color: cst === 'accent' ? sc.accent : sc.fg, x: x0 + capW / 2, y: capCy + capS * 0.02 };
        if (cst === 'outline') { co.fill = false; co.stroke = Math.max(2 * ctx.u, capS * 0.014); co.strokeColor = sc.fg; }
        var CL = cap ? jzText(ctx, cap, co) : null;
        // rules above / below (draw in from opposite ends) + meta line
        var HD = la1_H(ctx), yT = top - s * 0.45, yB = top + hBlock + s * 0.45, deco = [];
        if (jzP(ctx, 'rules', false)) {
            var lw = Math.max(1.5 * ctx.u, s * 0.02), E = 'var e=ioc((time-0.05)/0.6)*K;';
            var R1 = la1_bar(ctx, 'rule top', x0, yT, usedW, lw, sc.fg, 1), R2 = la1_bar(ctx, 'rule bottom', x0 + usedW, yB, usedW, lw, sc.fg, -1);
            jzSetExpr(jzXf(R1, 'ADBE Scale'), HD + E + '[value[0]*e,value[1]]'); jzSetExpr(jzXf(R2, 'ADBE Scale'), HD + E + '[value[0]*e,value[1]]');
            jzXf(R1, 'ADBE Opacity').setValue(90); jzXf(R2, 'ADBE Opacity').setValue(90);
            deco.push(R1, R2);
        }
        if (meta) {
            var ls = jzSmallSize(ctx) * 0.9, yM = yB + ls * 1.3, A = 'oc((time-0.3)/0.4)*K';
            var M1 = jzText(ctx, 'No.' + jzLineNo(ctx), { font: jzMonoF(ctx), size: ls, color: sc.accent, x: x0, y: yM, align: 'left', track: 0.1 });
            var M2 = jzText(ctx, jzRomajiOf(ctx) || jzAltCopy(ctx), { font: jzMonoF(ctx), size: ls, color: sc.sub, x: x0 + usedW, y: yM, align: 'right', track: 0.1 });
            la1_opx(ctx, M1, A); la1_opx(ctx, M2, A);
            deco.push(M1, M2);
        }
        if (deco.length) la1_behind(la1_ng(deco), CL || LL[0]);
        var bb = null;
        if (CL) { jzAnimate(ctx, CL, { mi: 0 }); bb = la1_bb(CL); }
        for (i = 0; i < nl; i++) { jzAnimate(ctx, LL[i], { mi: 2 + i * 2 }); bb = jzUnion(bb, la1_bb(LL[i])); }
        return bb || la1_box(x0, top, x0 + usedW, top + hBlock);
    }
});

/* ---------------------------------------------------------------- 9 justified — 版面 */
jzReg('layout', 'justified', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), fillFont: rng.pick(jzFontsOf(st, ['body', 'serif'])), mark: rng.pick(['band', 'under', 'bracket']), pos: rng.pick([0.28, 0.5, 0.66]), dens: rng.range(0.062, 0.078) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), i;
        var text = jzTrim(c.text), n = jzCount(text), font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), fillFont = jzP(ctx, 'fillFont', jzBodyF(ctx));
        var bx0 = W * 0.08, bw = W * 0.84, by0 = H * 0.09, bh = H * 0.82;
        var rowsN = Math.max(8, Math.round(bh / (u * (jzP(ctx, 'dens', 0.07) || 0.07)))), rowH = bh / rowsN, fs = rowH * 0.6;
        // lyric: one line set to the full measure, or two lines (left / right)
        var capH = rowH * (n <= 5 ? 3.4 : 2.6), mT = la1_meas(ctx, text, font, 0.04);
        function fitL(m0, hmax) { return Math.min(hmax, la1_fit(m0, bw, hmax)); }
        var lines = [text];
        if (fitL(mT, capH) < rowH * 1.6 && n >= 4) lines = la1_splitK(text, 2);
        var two = lines.length > 1, sizes = [], lyH = 0;
        if (two) { var s2 = 1e9; for (i = 0; i < lines.length; i++) s2 = Math.min(s2, fitL(la1_meas(ctx, lines[i], font, 0.04), rowH * 2.4)); for (i = 0; i < lines.length; i++) sizes.push(s2); }
        else sizes.push(fitL(mT, capH));
        for (i = 0; i < sizes.length; i++) lyH += sizes[i];
        lyH += (lines.length - 1) * rowH * 0.25;
        var span = Math.ceil(lyH / rowH + 0.8), r0 = Math.round(jzP(ctx, 'pos', 0.5) * (rowsN - span)), HD = la1_H(ctx);
        // filler: the whole line set solid, running on through the rows (one text layer, rows fade in top to bottom)
        var src = jzChars(jzFlat(c.lineText || text) + (jzHasLatin(text) ? ' / ' : '。'));
        var cpr = Math.max(4, Math.floor(bw / (fs * 1.06))), off = 0, rowsT = [], row0 = null;
        for (var r = 0; r < rowsN; r++) {
            if (r >= r0 && r < r0 + span) { rowsT.push(''); continue; }
            var row = '';
            for (var j = 0; j < cpr; j++) row += src[(off + j) % src.length];
            off += cpr; rowsT.push(row);
            if (row0 === null) row0 = row;
        }
        if (row0 !== null) {
            var wr = la1_meas(ctx, row0, fillFont, 0).w * fs / 100, sp = (bw - wr) / Math.max(1, cpr - 1);
            var F = jzNoGhost(jzText(ctx, rowsT.join('\r'), { font: fillFont, size: fs, color: sc.sub, x: 0, y: 0, align: 'left', track: sp / fs, leading: rowH, name: 'filler' }));
            jzXf(F, 'ADBE Anchor Point').setValue([0, 0]); jzXf(F, 'ADBE Position').setValue([bx0, by0 + rowH * 0.5 + fs * 0.36]);
            jzAnimator(F, 'JZ Rows', [['ADBE Text Opacity', 0]], HD + 'var ri=Math.floor((textIndex-1)/' + cpr + ');var r=ri<' + r0 + '?ri:ri+' + span + ';100*(1-cl((time-r*0.018)/0.2))');
            jzXf(F, 'ADBE Opacity').setValue(34);
            la1_opx(ctx, F, 'K');
        }
        // mark around the lyric
        var yc = by0 + (r0 + span / 2) * rowH, mx = sizes[0], mark = jzP(ctx, 'mark', 'band'), plate = mark === 'band', E = 'var e=ioe((time-0.05)/0.5)*K;';
        if (plate) {
            var B = jzNoGhost(la1_bar(ctx, 'band', bx0 - mx * 0.2, yc, bw + mx * 0.4, lyH + mx * 0.4, sc.accent, 1));
            jzSetExpr(jzXf(B, 'ADBE Scale'), HD + E + '[value[0]*e,value[1]]');
        } else if (mark === 'under') {
            var lw = Math.max(3 * ctx.u, mx * 0.05);
            var U1 = la1_bar(ctx, 'rule under', bx0, yc + lyH / 2 + mx * 0.2 + lw / 2, bw, lw, sc.accent, 1);
            var U2 = la1_bar(ctx, 'rule over', bx0 + bw, yc - lyH / 2 - mx * 0.2 - lw / 2, bw, lw, sc.accent, -1);
            jzSetExpr(jzXf(U1, 'ADBE Scale'), HD + E + '[value[0]*e,value[1]]'); jzSetExpr(jzXf(U2, 'ADBE Scale'), HD + E + '[value[0]*e,value[1]]');
        } else {
            var aL = mx * 0.45, bl = Math.max(2 * ctx.u, mx * 0.04), yt = yc - lyH / 2 - mx * 0.16, yb = yc + lyH / 2 + mx * 0.16, g = mx * 0.14;
            var BR = jzNoGhost(jzShapeLayer(ctx, 'brackets', 0, 0));
            for (var sd = -1; sd <= 1; sd += 2) {
                var Xb = sd < 0 ? bx0 - g : bx0 + bw + g, ins = -sd;
                var gv = jzGrp(BR, 'bracket stem'); jzAddPath(gv, [[Xb, yt], [Xb, yb]], false); jzAddStroke(gv, sc.accent, bl);
                jzSetExpr(jzGX(gv).property('ADBE Vector Group Opacity'), HD + E + 'e>0?100:0');
                var arms = [yt, yb];
                for (var a = 0; a < 2; a++) {
                    var ga = jzGrp(BR, 'bracket arm'); jzAddPath(ga, [[Xb, arms[a]], [Xb + ins * aL, arms[a]]], false); jzAddStroke(ga, sc.accent, bl);
                    jzAddTrimPaths(ga, HD + E + '100*e');
                }
            }
        }
        // small print: line number / grid size
        var ms = Math.max(11 * ctx.u, rowH * 0.28), FA = 'oc((time-0.1)/0.4)*K';
        la1_opx(ctx, jzNoGhost(jzText(ctx, 'No.' + jzLineNo(ctx), { font: jzMonoF(ctx), size: ms, color: sc.sub, x: bx0, y: by0 - rowH * 0.45, align: 'left' })), FA);
        la1_opx(ctx, jzNoGhost(jzText(ctx, rowsN + ' × ' + cpr, { font: jzMonoF(ctx), size: ms, color: sc.sub, x: bx0 + bw, y: by0 + bh + rowH * 0.45, align: 'right' })), FA);
        // the lyric
        var col = plate ? jzOnCol(sc, sc.accent) : sc.fg, y = yc - lyH / 2, bb = null;
        for (i = 0; i < lines.length; i++) {
            var ls = sizes[i], nG = jzChars(lines[i]).length, L;
            y += ls / 2;
            if (two) L = la1_T(ctx, lines[i], font, ls, { align: i === 0 ? 'left' : 'right', x: i === 0 ? bx0 : bx0 + bw, y: y, track: 0.04, color: col });
            else if (nG > 1) {
                var w0 = la1_meas(ctx, lines[i], font, 0).w * ls / 100;
                L = la1_T(ctx, lines[i], font, ls, { align: 'left', x: bx0, y: y, track: (bw - w0) / (ls * (nG - 1)), color: col });
            } else L = la1_T(ctx, lines[i], font, ls, { x: bx0 + bw / 2, y: y, color: col });
            jzAnimate(ctx, L, { mi: i * 3 });
            bb = jzUnion(bb, la1_bb(L));
            y += ls / 2 + rowH * 0.25;
        }
        return bb || la1_box(bx0, yc - lyH / 2, bx0 + bw, yc + lyH / 2);
    }
});

/* ---------------------------------------------------------------- 10 frameBox — 額縁 */
jzReg('layout', 'frameBox', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif', 'serif'])), style: rng.pick(['full', 'double', 'corners']), caps: rng.pick(['tl-br', 'top-bottom']), shape: rng.pick(['tight', 'wide']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i;
        var text = la1_brk(jzTrim(c.text), port ? 6 : 12), font = jzP(ctx, 'font', jzSerifF(ctx));
        var mm = la1_meas(ctx, text, font, 0.04, 1.2), size = Math.min(la1_fit(mm, W * (port ? 0.74 : 0.68), H * 0.36), u * 0.19);
        var L = la1_T(ctx, text, font, size, { x: W / 2, y: H / 2, track: 0.04, lead: 1.2 });
        var sz = jzSize(L), fw = sz[0] + size * 1.6, fh = sz[1] + size * 1.4;
        if (jzP(ctx, 'shape', 'tight') === 'wide') { fw = Math.max(fw, W * (port ? 0.82 : 0.62)); fh = Math.max(fh, fw * (port ? 0.9 : 0.5)); }
        fw = Math.min(fw, W * 0.9); fh = Math.min(fh, H * 0.86);
        var x0 = W / 2 - fw / 2, y0 = H / 2 - fh / 2, x1 = x0 + fw, y1 = y0 + fh;
        var ls = jzSmallSize(ctx) * 0.9, gp = ls * 0.7, mono = jzMonoF(ctx);
        var c1 = 'No.' + jzLineNo(ctx), c2 = jzRomajiOf(ctx) || jzFmtTime(c.start || 0);
        var w1 = la1_meas(ctx, c1, mono, 0.12).w * ls / 100, w2 = la1_meas(ctx, c2, mono, 0.12).w * ls / 100;
        var tb = jzP(ctx, 'caps', 'tl-br') === 'top-bottom', a1 = tb ? W / 2 - w1 / 2 : x0 + ls * 2.2, b2 = tb ? W / 2 + w2 / 2 : x1 - ls * 2.2;
        var HD = la1_H(ctx), E = 'var e=ioc(time/0.85)*K;', lw = Math.max(2 * ctx.u, size * 0.02), style = jzP(ctx, 'style', 'full');
        var S = jzShapeLayer(ctx, 'frame', 0, 0), deco = [S];
        if (style === 'corners') {
            var arm = Math.min(fw, fh) * 0.22, cs = [[x0, y0, 1, 1], [x1, y0, -1, 1], [x1, y1, -1, -1], [x0, y1, 1, -1]];
            for (i = 0; i < 4; i++) {
                var X = cs[i][0], Y = cs[i][1], gc = jzGrp(S, 'corner ' + (i + 1));
                jzAddPath(gc, [[X + cs[i][2] * arm, Y], [X, Y], [X, Y + cs[i][3] * arm]], false); jzAddStroke(gc, sc.fg, lw * 1.4);
                jzAddTrimPaths(gc, HD + E + '50*(1+e)', HD + E + '50*(1-e)');
            }
        } else {
            // the frame line runs round from the top-left, leaving gaps for the two captions
            la1_segs(S, [[[x0, y0], [a1 - gp, y0]], [[a1 + w1 + gp, y0], [x1, y0], [x1, y1], [b2 + gp, y1]], [[b2 - w2 - gp, y1], [x0, y1], [x0, y0]]], sc.fg, lw, 100, HD, E);
            if (style === 'double') {
                var d = size * 0.16, gi = jzGrp(S, 'inner');
                jzAddPath(gi, [[x0 + d, y0 + d], [x1 - d, y0 + d], [x1 - d, y1 - d], [x0 + d, y1 - d], [x0 + d, y0 + d]], false);
                jzAddStroke(gi, sc.sub, Math.max(1 * ctx.u, lw * 0.5), 80);
                jzAddTrimPaths(gi, HD + E + '100*cl(e*1.15-0.15)');
            }
        }
        var CA = 'cl(e*2-0.6)';
        var C1 = jzText(ctx, c1, { font: mono, size: ls, color: sc.accent, x: a1, y: y0, align: 'left', track: 0.12 });
        var C2 = jzText(ctx, c2, { font: mono, size: ls, color: sc.sub, x: b2, y: y1, align: 'right', track: 0.12 });
        jzSetExpr(jzXf(C1, 'ADBE Opacity'), HD + E + 'value*' + CA); jzSetExpr(jzXf(C2, 'ADBE Opacity'), HD + E + 'value*' + CA);
        deco.push(C1, C2);
        la1_behind(la1_ng(deco), L);
        jzAnimate(ctx, L, { mi: 0 });
        return la1_bb(L);
    }
});

/* ---------------------------------------------------------------- 11 bubble — 吹き出し */
// speech-bubble outline (browser bubblePoly): rounded box or ellipse with a tail towards tailSide; returns { pts, tip }
function la1_bubblePoly(shape, cx, cy, w, h, size, tailSide) {
    var x0 = cx - w / 2, y0 = cy - h / 2, x1 = cx + w / 2, y1 = cy + h / 2, tipX = cx + tailSide * w * 0.36, tipY = y1 + size * 0.75, pts = [], i, DEG = Math.PI / 180;
    if (shape === 'ellipse') {
        var rx = w / 2, ry = h / 2, M = 56, ta = (tailSide > 0 ? 62 : 118) * DEG, dA = 0.16, done = false;
        for (i = 0; i < M; i++) {
            var a = i / M * Math.PI * 2;
            if (Math.abs(a - ta) < dA) { if (Math.abs(a - ta) < Math.PI / M + 1e-6 || (!done && a > ta)) { pts.push([tipX, tipY]); done = true; } continue; }
            pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
        }
        if (!done) pts.push([tipX, tipY]);
        return { pts: pts, tip: [tipX, tipY] };
    }
    var r = Math.min(h * 0.42, size * 0.9), seg = 6;
    function corner(ccx, ccy, a0) { for (var k = 0; k <= seg; k++) { var an = (a0 + 90 * k / seg) * DEG; pts.push([ccx + Math.cos(an) * r, ccy + Math.sin(an) * r]); } }
    corner(x1 - r, y0 + r, -90); corner(x1 - r, y1 - r, 0);
    var bw = Math.min(size * 0.55, w * 0.18), bc = cx + tailSide * w * 0.2;
    pts.push([bc + bw / 2, y1], [tipX, tipY], [bc - bw / 2, y1]);
    corner(x0 + r, y1 - r, 90); corner(x0 + r, y0 + r, 180);
    return { pts: pts, tip: [tipX, tipY] };
}
// smooth closed curve through the midpoints of a polygon (browser env.blob: quadratic curves), as a bezier Shape
function la1_blob(pts) {
    var n = pts.length, V = [], I = [], O = [];
    for (var i = 0; i < n; i++) {
        var p = pts[i], q = pts[(i + 1) % n], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        V.push(m); I.push([(p[0] - m[0]) * 2 / 3, (p[1] - m[1]) * 2 / 3]); O.push([(q[0] - m[0]) * 2 / 3, (q[1] - m[1]) * 2 / 3]);
    }
    var sh = new Shape(); sh.vertices = V; sh.inTangents = I; sh.outTangents = O; sh.closed = true;
    return sh;
}
jzReg('layout', 'bubble', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), shape: rng.pick(['round', 'ellipse', 'thought', 'round']), style: rng.pick(['fill', 'outline', 'fill']), tail: rng.pick([1, -1]), off: rng.range(-0.05, 0.05), tilt: rng.range(-3, 3), burst: rng.chance(0.6) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, DEG = Math.PI / 180;
        var shape = jzP(ctx, 'shape', 'round'), ell = shape !== 'round', t0 = jzTrim(c.text), n0 = jzCount(t0);
        var text = ell && n0 >= 5 && !port ? la1_brk(t0, Math.max(3, Math.ceil(n0 / 2))) : la1_brk(t0, port ? 6 : 10);
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display'));
        var mm = la1_meas(ctx, text, font, 0.02, 1.2), size = Math.min(la1_fit(mm, W * (port ? 0.62 : ell ? 0.5 : 0.6), H * 0.32), u * 0.15);
        var mw = mm.w * size / 100, mh = mm.h * size / 100;
        var w = mw * (ell ? 1.34 : 1) + size * (ell ? 1.1 : 1.2), h = mh * (ell ? 1.3 : 1) + size * (ell ? 1.0 : 0.95);
        var tail = jzP(ctx, 'tail', 1) < 0 ? -1 : 1, cx = W / 2 + jzP(ctx, 'off', 0) * W, cy = H / 2 - size * 0.3;
        var fill = jzP(ctx, 'style', 'fill') === 'fill' || shape === 'thought', plate = sc.ink, tcol = fill ? jzOnCol(sc, plate) : sc.fg;
        var B = la1_bubblePoly(shape === 'thought' ? 'ellipse' : shape, cx, cy, w, h, size, tail), pv = shape === 'thought' ? [cx, cy] : B.tip;
        // the balloon: one shape layer pivoting on the tail tip (thought: the centre); pops in with a small twist
        var S = jzNoGhost(jzShapeLayer(ctx, 'bubble', pv[0], pv[1]));   // main pass only in the browser (still the lyric's parent in the ghosts)
        jzXf(S, 'ADBE Anchor Point').setValue([pv[0], pv[1]]);
        var gb = jzGrp(S, 'balloon');
        if (shape === 'thought') {
            var bp = [];
            for (i = 0; i < 22; i++) { var a = i / 22 * Math.PI * 2, k = i % 2 ? 1.08 : 0.97; bp.push([cx + Math.cos(a) * w / 2 * k, cy + Math.sin(a) * h / 2 * k]); }
            la1_shape(gb, la1_blob(bp)); jzAddFill(gb, plate);
            var tx = cx + tail * w * 0.34, ty = cy + h / 2, dots = [[0.45, 0.2], [0.85, 0.12], [1.15, 0.07]];
            for (i = 0; i < 3; i++) { var gd = jzGrp(S, 'puff ' + (i + 1)); jzAddEllipse(gd, size * dots[i][1] * 2.8, size * dots[i][1] * 2.8, tx + tail * size * dots[i][0] * 0.8, ty + size * dots[i][0] * 0.75); jzAddFill(gd, plate); }
        } else {
            jzAddPath(gb, B.pts, true);
            if (fill) jzAddFill(gb, plate);
            else { var sk = jzAddStroke(gb, sc.fg, Math.max(3 * ctx.u, size * 0.05)); try { sk.property('ADBE Vector Stroke Line Join').setValue(2); } catch (e0) {} }
        }
        // the lyric rides inside the balloon (parented, so it pops and twists with it)
        var L = la1_T(ctx, text, font, size, { x: cx, y: cy + size * 0.02, track: 0.02, lead: 1.2, color: tcol }), bb = la1_bb(L);
        L.parent = S;
        var HD = la1_H(ctx), Q = 'var q=cl(time/0.32);q=(q<=0?0:ob(q,1.7))*(1-ic(cl(PO*1.2)));';
        jzSetExpr(jzXf(S, 'ADBE Scale'), HD + Q + '[value[0]*q,value[1]*q]');
        jzSetExpr(jzXf(S, 'ADBE Rotate Z'), HD + Q + 'value+' + jzN(jzP(ctx, 'tilt', 0)) + '*(1-q)*3');
        jzAnimate(ctx, L, { mi: 0 });
        // emphasis strokes at the top corner away from the tail
        if (jzP(ctx, 'burst', false)) {
            var bx = cx - tail * (w / 2 + size * 0.05), by = cy - h / 2 - size * 0.05, r0 = size * 0.25, Lm = size * 0.45, BS = jzNoGhost(jzShapeLayer(ctx, 'burst', 0, 0)), dd = [-30, 0, 30];
            for (i = 0; i < 3; i++) {
                var ang = (-90 - tail * 45 + dd[i] * 0.9) * DEG, r1 = r0 + Lm * (i === 1 ? 1.2 : 0.9), gs = jzGrp(BS, 'stroke ' + (i + 1));
                jzAddPath(gs, [[bx + Math.cos(ang) * r0, by + Math.sin(ang) * r0], [bx + Math.cos(ang) * r1, by + Math.sin(ang) * r1]], false);
                var st2 = jzAddStroke(gs, sc.accent, Math.max(3 * ctx.u, size * 0.05)); try { st2.property('ADBE Vector Stroke Line Cap').setValue(2); } catch (e1) {}
                jzAddTrimPaths(gs, HD + '100*oe(cl((time-0.2)/0.2)*K)');
            }
        }
        return bb;
    }
});

/* ---------------------------------------------------------------- 12 subtitleBar — 字幕帯 */
jzReg('layout', 'subtitleBar', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['body', 'serif'])), bigFont: rng.pick(jzFontsOf(st, ['display', 'serif'])), big: rng.pick(['dim', 'outline']), bar: rng.range(0.1, 0.13), tc: rng.pick(['rec', 'scene']), place: rng.pick(['bar', 'band']), drift: rng.pick([1, -1]) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i;
        var text = jzTrim(c.text), cand = [sc.bg, sc.fg, sc.ink, sc.dim], barC = sc.bg;
        for (i = 0; i < cand.length; i++) if (cand[i] && jzLum(cand[i]) < jzLum(barC)) barC = cand[i];
        var pic = barC === sc.bg && !!sc.dim && Math.abs(jzLum(sc.dim) - jzLum(sc.bg)) > 0.03;   // dark scheme: lift the picture area instead
        var bh = H * (port ? jzP(ctx, 'bar', 0.115) * 0.62 : jzP(ctx, 'bar', 0.115)), HD = la1_H(ctx), E = 'var e=oe(time/0.55)*K;';
        if (pic) {
            var PR = jzNoGhost(jzRectLayer(ctx, 'picture', W / 2, H / 2, W + 4, H, sc.dim));
            jzSetExpr(jzXf(PR, 'ADBE Scale'), HD + E + '[value[0],value[1]*(1-2*' + jzN(bh) + '*e/' + jzN(H) + ')]');
            jzSetExpr(jzXf(PR, 'ADBE Opacity'), HD + E + 'value*cl(e*1.4)');
        }
        // huge faint copy behind, drifting a little
        var bt = jzFlat(text), bf = jzP(ctx, 'bigFont', jzFontKeyOf(ctx.st, 'display')), bs = Math.min(la1_fit(la1_meas(ctx, bt, bf, 0), W * 0.94, H * 0.6), H * 0.6);
        var big = jzP(ctx, 'big', 'dim') === 'outline';
        var BG = jzText(ctx, bt, big ? { font: bf, size: bs, x: W / 2, y: H / 2, fill: false, stroke: Math.max(1.2 * ctx.u, bs * 0.006), strokeColor: sc.sub, opacity: 0.4, name: 'big copy' }
            : { font: bf, size: bs, x: W / 2, y: H / 2, color: pic ? sc.bg : (sc.dim || sc.sub), opacity: pic ? 0.7 : 1, name: 'big copy' });
        la1_opx(ctx, BG, 'oc((time-0.05)/0.6)*K'); jzNoGhost(BG);
        jzSetExpr(jzXf(BG, 'ADBE Position'), '[value[0]+(time/' + jzN(Math.max(1, c.dur)) + '-0.5)*' + jzN(W * 0.03 * (jzP(ctx, 'drift', 1) < 0 ? -1 : 1)) + ',value[1]]');
        // letterbox bars slide in, a hairline on each inner edge
        for (var sd = -1; sd <= 1; sd += 2) {
            var BL = jzNoGhost(jzShapeLayer(ctx, sd < 0 ? 'bar top' : 'bar bottom', W / 2, sd < 0 ? 0 : H)), g = jzGrp(BL, 'bar');
            jzAddRect(g, W + 4, bh + 2, 0, 0, sd < 0 ? -(bh + 2) / 2 : (bh + 2) / 2); jzAddFill(g, barC);
            var gl = jzGrp(BL, 'edge'); jzAddPath(gl, [[-W / 2, 0], [W / 2, 0]], false); jzAddStroke(gl, sc.sub, 1.2 * ctx.u, 35);
            jzSetExpr(jzXf(BL, 'ADBE Position'), HD + E + '[value[0],value[1]' + (sd < 0 ? '+' : '-') + jzN(bh) + '*e]');
            jzSetExpr(jzXf(BL, 'ADBE Opacity'), HD + E + 'e*' + jzN(bh) + '>0.5?value:0');
        }
        // timecode furniture in the top bar
        var ls = Math.min(jzSmallSize(ctx) * 0.9, bh * 0.3), mono = jzMonoF(ctx), TA = 'cl((e-0.6)*2.5)*K', YP = HD + E + '[value[0],' + jzN(bh) + '*e/2]';
        var tcs = [];
        if (jzP(ctx, 'tc', 'rec') === 'rec') {
            var DOT = jzNoGhost(jzEllipseLayer(ctx, 'rec dot', W * 0.05, bh / 2, ls * 0.7, ls * 0.7, sc.accent));
            jzSetExpr(jzXf(DOT, 'ADBE Opacity'), HD + E + 'value*' + TA + '*(Math.floor(time*12)%2==0?1:0)');
            jzSetExpr(jzXf(DOT, 'ADBE Position'), YP);
            tcs.push(jzText(ctx, 'REC', { font: mono, size: ls, color: jzOnCol(sc, barC), x: W * 0.05 + ls * 0.8, y: bh / 2, align: 'left', track: 0.12 }));
        } else tcs.push(jzText(ctx, 'SCENE ' + jzLineNo(ctx) + '  /  CUT ' + jzPad((c.index | 0) + 1, 2), { font: mono, size: ls, color: jzOnCol(sc, barC), x: W * 0.05, y: bh / 2, align: 'left', track: 0.12 }));
        var TC = jzText(ctx, jzFmtTime(c.start || 0), { font: mono, size: ls, color: sc.sub, x: W * 0.95, y: bh / 2, align: 'right', track: 0.08, name: 'timecode' });
        try { TC.property('ADBE Text Properties').property('ADBE Text Document').expression = 'var t=time+' + jzN(c.start || 0) + ';function p(v){return (v<10?"0":"")+v;}p(Math.floor(t/60))+":"+p(Math.floor(t%60))+":"+p(Math.floor((t%1)*24))'; } catch (e2) {}
        tcs.push(TC);
        for (i = 0; i < tcs.length; i++) { la1_opx(ctx, tcs[i], 'cl((oe(time/0.55)*K-0.6)*2.5)*K'); jzSetExpr(jzXf(tcs[i], 'ADBE Position'), YP); jzNoGhost(tcs[i]); }
        // the subtitle
        var font = jzP(ctx, 'font', jzBodyF(ctx)), place = jzP(ctx, 'place', 'bar'), maxH = place === 'bar' ? bh * 0.62 : bh * 0.8, t2 = text;
        var ss = Math.min(la1_fit(la1_meas(ctx, t2, font, 0.06, 1.25), W * 0.84, maxH), u * 0.058);
        if (ss < u * 0.04 && jzCount(text) > 8) { t2 = la1_brk(text, Math.ceil(jzCount(text) / 2)); ss = Math.min(la1_fit(la1_meas(ctx, t2, font, 0.06, 1.25), W * 0.84, maxH * 1.5), u * 0.05); }
        var scol = jzOnCol(sc, barC), L = la1_T(ctx, t2, font, ss, { x: W / 2, y: H - bh / 2, track: 0.06, lead: 1.25, color: scol }), m = jzSize(L);
        if (place !== 'bar') {
            var sy = H - bh - m[1] / 2 - ss * 0.9;
            jzXf(L, 'ADBE Position').setValue([W / 2, sy]);
            var PL = jzRectLayer(ctx, 'subtitle plate', W / 2, sy, m[0] + ss * 1.6, m[1] + ss * 0.7, barC, { opacity: 0.72 });
            la1_opx(ctx, PL, 'cl((oe(time/0.55)*K-0.3)*2)*K');
            PL.moveAfter(L); jzNoGhost(PL);
        }
        jzAnimate(ctx, L, { mi: 0 });
        return la1_bb(L);
    }
});

/* ---------------------------------------------------------------- 13 ticker — ティッカー */
jzReg('layout', 'ticker', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display'])), tag: rng.pick(['LIVE', 'NOW', 'ON AIR', 'LIVE']), speed: rng.range(0.8, 1.3), main: rng.pick(['center', 'left', 'center']), bug: rng.chance(0.6) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx);
        var text0 = jzTrim(c.text), mono = jzMonoF(ctx), body = jzBodyF(ctx), tag = String(jzP(ctx, 'tag', 'LIVE'));
        var bandH = u * 0.075, bandY = H - bandH - H * (port ? 0.12 : 0.085), bcy = bandY + bandH / 2;
        var tagC = sc.accent, bandC = sc.ink === sc.accent ? sc.fg : sc.ink, ts = bandH * 0.42, x0 = W * 0.04;
        var tagW = la1_meas(ctx, tag, mono, 0.12).w * ts / 100 + ts * 2.6, HD = la1_H(ctx), EB = 'var eB=oe(time/0.5)*K;';
        // band grows out from the left
        var BD = jzNoGhost(la1_bar(ctx, 'band', x0, bcy, W - x0, bandH, bandC, 1));
        jzSetExpr(jzXf(BD, 'ADBE Scale'), HD + EB + '[value[0]*eB,value[1]]');
        // scrolling copy inside the band (alpha matte = the band's visible part right of the tag)
        var unit = jzFlat(c.lineText || text0) + '　◆　', fs = bandH * 0.46;
        var per = Math.max(10, (la1_meas(ctx, unit + unit, body, 0).w - la1_meas(ctx, unit, body, 0).w) * fs / 100);
        var reps = Math.min(40, Math.ceil(W * 1.2 / per) + 2), row = '';
        for (var r = 0; r < reps; r++) row += unit;
        var SR = jzText(ctx, row, { font: body, size: fs, color: jzOnCol(sc, bandC), x: x0 + tagW + ts * 0.8, y: bcy, align: 'left', name: 'ticker copy' });
        jzSetExpr(jzXf(SR, 'ADBE Position'), 'var v=' + jzN(jzP(ctx, 'speed', 1) * u * 0.22) + ',per=' + jzN(per) + ';var o=((time*v)%per+per)%per;[value[0]-o,value[1]]');
        var cw = W - x0 - tagW, MT = la1_bar(ctx, 'ticker clip', x0 + tagW, bcy, cw, bandH, '#FFFFFF', 1);
        jzSetExpr(jzXf(MT, 'ADBE Scale'), HD + EB + '[value[0]*Math.max(0,' + jzN(W - x0) + '*eB-' + jzN(tagW) + ')/' + jzN(cw) + ',value[1]]');
        la1_matte(SR, MT); la1_ng([SR, MT]);
        // tag box with a blinking dot, pops open vertically
        var TQ = 'var tq=cl((time-0.08)/0.3);tq=(tq<=0?0:ob(tq,1.6))*K;', tc = jzOnCol(sc, tagC);
        var TB = jzRectLayer(ctx, 'tag', x0 + tagW / 2, bcy, tagW, bandH * 1.24, tagC);
        jzSetExpr(jzXf(TB, 'ADBE Scale'), HD + TQ + '[value[0],value[1]*tq]');
        var TD = jzNoGhost(jzEllipseLayer(ctx, 'tag dot', x0 + ts * 0.95, bcy, ts * 0.56, ts * 0.56, tc));
        jzSetExpr(jzXf(TD, 'ADBE Scale'), HD + TQ + '[value[0]*tq,value[1]*tq]');
        jzSetExpr(jzXf(TD, 'ADBE Opacity'), 'Math.floor(time*12)%3!=0?value:0');
        var TT = jzNoGhost(jzText(ctx, tag, { font: mono, size: ts, color: tc, x: x0 + ts * 1.6, y: bcy, align: 'left', track: 0.12 }));
        jzSetExpr(jzXf(TT, 'ADBE Scale'), HD + TQ + '[value[0]*tq,value[1]*tq]');
        // small running clock above the band's right end
        var tsz = ts * 0.9, tw = la1_meas(ctx, '00:00.00', mono, 0.08).w * tsz / 100 + tsz * 1.4, CA = 'cl((oe(time/0.5)*K-0.7)*3.3)';
        var CB = jzRectLayer(ctx, 'clock box', W - W * 0.04 - tw / 2, bandY - tsz * 0.85, tw, tsz * 1.7, sc.fg);
        var CT = jzText(ctx, jzFmtTime(c.start || 0), { font: mono, size: tsz, color: jzOnCol(sc, sc.fg), x: W - W * 0.04 - tw / 2, y: bandY - tsz * 0.85, track: 0.08, name: 'clock' });
        try { CT.property('ADBE Text Properties').property('ADBE Text Document').expression = 'var t=time+' + jzN(c.start || 0) + ';function p(v){return (v<10?"0":"")+v;}p(Math.floor(t/60))+":"+p(Math.floor(t%60))+"."+p(Math.floor((t%1)*100))'; } catch (e1) {}
        la1_opx(ctx, CB, CA); la1_opx(ctx, CT, CA); la1_ng([CB, CT]);
        // channel bug
        if (jzP(ctx, 'bug', false)) {
            var bs = jzSmallSize(ctx) * 0.85, BA = 'oc((time-0.2)/0.4)*K';
            la1_opx(ctx, jzNoGhost(jzText(ctx, 'CH.' + jzLineNo(ctx), { font: mono, size: bs, color: sc.sub, x: W * 0.95, y: H * 0.07, align: 'right', track: 0.2 })), BA);
            la1_opx(ctx, jzNoGhost(jzRectLayer(ctx, 'bug mark', W * 0.95 - bs * 0.15, H * 0.07 + bs * 1.05, bs * 0.3, bs * 0.3, sc.accent)), BA);
        }
        // headline above the band (centred, or left with an accent rule)
        var left = jzP(ctx, 'main', 'center') === 'left', text = la1_brk(text0, port ? 6 : 11), font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display'));
        var avail = bandY - H * 0.1, mm = la1_meas(ctx, text, font, 0.03, 1.15), size = Math.min(la1_fit(mm, W * 0.84, avail * 0.7), u * 0.2), mh = mm.h * size / 100;
        var y = left ? bandY - bandH * 0.55 - mh / 2 - size * 0.2 : H * 0.1 + avail / 2, x = left ? x0 + size * 0.1 : W / 2;
        if (left) {
            var rh = Math.max(3 * ctx.u, size * 0.06), RL = la1_bar(ctx, 'headline rule', x0, y - mh / 2 - size * 0.28 + rh / 2, size * 1.2, rh, sc.accent, 1);
            jzSetExpr(jzXf(RL, 'ADBE Scale'), HD + '[value[0]*oe((time-0.1)/0.5)*K,value[1]]'); jzNoGhost(RL);
        }
        var L = la1_T(ctx, text, font, size, { align: left ? 'left' : null, x: x, y: y, track: 0.03, lead: 1.15 });
        jzAnimate(ctx, L, { mi: 0 });
        return la1_bb(L);
    }
});

/* ---------------------------------------------------------------- 14 splitScreen — 二分割 */
jzReg('layout', 'splitScreen', {
    plan: function (rng, cut, st) {
        var port = cut.H > cut.W * 1.08;
        return { font: rng.pick(jzFontsOf(st, ['display'])), split: port ? rng.pick(['h', 'diag', 'h']) : rng.pick(['v', 'diag', 'v', 'h']), plate: rng.pick(['fg', 'accent', 'fg']), side: rng.pick([1, -1]), tilt: rng.range(12, 22) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), DEG = Math.PI / 180;
        var tOff = jzContrast(sc.fg, sc.bg) > 2 ? sc.fg : jzOnCol(sc, sc.bg);
        var plateC = jzP(ctx, 'plate', 'fg') === 'accent' ? sc.accent : sc.fg;
        if (String(jzOnCol(sc, plateC)).toUpperCase() === String(tOff).toUpperCase() || jzContrast(plateC, sc.bg) < 1.6) plateC = sc.fg;   // keep the inversion readable
        var tOn = jzOnCol(sc, plateC), split = jzP(ctx, 'split', port ? 'h' : 'v'), sd = jzP(ctx, 'side', 1) < 0 ? -1 : 1;
        // plate polygon (at rest) + the sweep that brings its boundary in from the plate's outer edge
        var poly, sweep, HD = la1_H(ctx), E = 'var e=oe(time/0.5)*(1-ie(PO));';
        if (split === 'h') {
            poly = sd > 0 ? [[-W, H / 2], [2 * W, H / 2], [2 * W, 2 * H], [-W, 2 * H]] : [[-W, -H], [2 * W, -H], [2 * W, H / 2], [-W, H / 2]];
            sweep = '[value[0],value[1]+' + jzN(sd * H * 0.55) + '*(1-e)]';
        } else {
            var dx = split === 'diag' ? Math.tan(jzP(ctx, 'tilt', 16) * DEG) * H / 2 : 0;
            var top = [W / 2 + dx - 2 * dx * (-H) / H, -H], bot = [W / 2 + dx - 2 * dx * (2 * H) / H, 2 * H];
            poly = sd > 0 ? [top, [3 * W, -H], [3 * W, 2 * H], bot] : [[-2 * W, -H], top, bot, [-2 * W, 2 * H]];
            sweep = '[value[0]+' + jzN(sd * (W * 0.55 + Math.abs(dx))) + '*(1-e),value[1]]';
        }
        function plateLayer(name, col) {
            var S = jzShapeLayer(ctx, name, 0, 0), g = jzGrp(S, name);
            jzAddPath(g, poly, true); jzAddFill(g, col);
            jzSetExpr(jzXf(S, 'ADBE Position'), HD + E + sweep);
            return jzNoGhost(S);   // plate + its matte copies: main pass only
        }
        var text = la1_brk(jzTrim(c.text), port ? 5 : 10), font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display'));
        var mm = la1_meas(ctx, text, font, 0.02, 1.08), size = Math.min(la1_fit(mm, W * 0.86, H * (split === 'h' ? 0.36 : 0.42)), u * 0.3);
        var cy = split === 'h' ? H / 2 + (mm.h * size / 100 > size * 1.5 ? 0 : size * 0.04) : H / 2;
        var ls = jzSmallSize(ctx) * 0.9, mono = jzMonoF(ctx), LA = 'oc((time-0.25)/0.4)*K', yA = sd > 0 || split !== 'h' ? H * 0.07 : H * 0.93, yB = sd > 0 || split !== 'h' ? H * 0.93 : H * 0.07;
        // off the plate: lyric in the text colour + line number (the plate covers them where it lies)
        var L1 = la1_T(ctx, text, font, size, { x: W / 2, y: cy, track: 0.02, lead: 1.08, color: tOff });
        la1_opx(ctx, jzNoGhost(jzText(ctx, 'No.' + jzLineNo(ctx), { font: mono, size: ls, color: sc.sub, x: sd > 0 ? W * 0.05 : W * 0.95, y: yA, align: sd > 0 ? 'left' : 'right', track: 0.15 })), LA);
        plateLayer('plate', plateC);
        // on the plate: the same lyric inverted + romaji / time, each matted by a copy of the plate
        var L2 = la1_T(ctx, text, font, size, { x: W / 2, y: cy, track: 0.02, lead: 1.08, color: tOn, name: jzTrim(c.text) + ' (on plate)' });
        la1_matte(L2, plateLayer('plate matte', '#FFFFFF'));          // a track matte sits directly above its layer
        var T2 = jzText(ctx, jzRomajiOf(ctx) || jzFmtTime(c.start || 0), { font: mono, size: ls, color: tOn, x: sd > 0 ? W * 0.95 : W * 0.05, y: yB, align: sd > 0 ? 'right' : 'left', track: 0.15 });
        la1_opx(ctx, T2, LA); jzNoGhost(T2);
        la1_matte(T2, plateLayer('plate matte', '#FFFFFF'));
        jzAnimate(ctx, L1, { mi: 0, treat: false });
        jzAnimate(ctx, L2, { mi: 0, treat: false });
        return la1_bb(L1);
    }
});
