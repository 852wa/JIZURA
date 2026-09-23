// ================================================================ pack layoutsA part 2 (AE port of src/11p_layoutsA.js)
// mirror, sideways, edgeFrame, perspective, hanko, genkou, panels, filmstrip, quote, ruler, searchBar, chat, notification, ticket
// Helpers are prefixed la2_. Secondary graphics are shape / text layers driven by expressions on `time` (0 = cut start);
// jzTH(ctx) gives DUR, IN, OS, OD, PO and K (= the cut's exit fade), LA2_FX adds ioc (inOutCubic) and sm (smoothstep).

var LA2_FX = 'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}function sm(a,b,x){var t=cl((x-a)/(b-a));return t*t*(3-2*t);}\n';
var LA2_VROT = 'ー〜～…‥―—-()（）「」『』【】〈〉《》〔〕[]［］→←:：;；=＝';
var LA2_SMALL = 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ';
var LA2_VPUNCT = '、。，．';

function la2_hd(ctx) { return jzTH(ctx) + LA2_FX; }
function la2_isSmall(ch) { return LA2_SMALL.indexOf(ch) >= 0; }
function la2_isBad(ch) { return la2_isSmall(ch) || jzIsPunct(ch) || ch === 'ー' || ch === ' '; }
function la2_brk(text, maxPer) { return jzSplitLines(jzTrim(text), maxPer); }
function la2_lines(text) { return String(text).split(/\r\n|\r|\n/); }
// readable text colour on a plate, preferring the scheme's bg / fg (= onCol in the browser pack)
function la2_onCol(sc, plate) {
    var a = jzContrast(sc.bg, plate), b = jzContrast(sc.fg, plate);
    if (Math.max(a, b) >= 2.4) return a >= b ? sc.bg : sc.fg;
    return jzLum(plate) > 0.5 ? '#111111' : '#FFFFFF';
}
function la2_bb(x0, y0, x1, y1) { return { x0: x0, y0: y0, x1: x1, y1: y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }; }
// keep helper layers out of the tinted ghosts (the browser draws them with ghost off / main pass only)
function la2_ng(list) { for (var i = 0; i < list.length; i++) if (list[i]) jzNoGhost(list[i]); return list; }

// ---- text with a leading multiple (o.lead, in em) that survives fitting: jzText + refit keeping leading = size * lead
function la2_refit(L, maxW, maxH, maxSize, lead) {
    var r = jzRect(L), src = L.property('ADBE Text Properties').property('ADBE Text Document'), td = src.value;
    var s = td.fontSize * Math.min(maxW / Math.max(1, r.width), maxH / Math.max(1, r.height));
    if (maxSize) s = Math.min(s, maxSize);
    td.fontSize = Math.max(1, s);
    if (lead) { try { td.autoLeading = false; td.leading = td.fontSize * lead; } catch (e) {} }
    src.setValue(td);
}
function la2_txt(ctx, str, o) {
    var q = jzCopy(o);
    q.maxW = null; q.maxH = null; q.maxSize = null;
    if (o.lead) q.leading = (o.size || 100) * o.lead;
    var L = jzText(ctx, str, q);
    if (o.maxW || o.maxH) { la2_refit(L, o.maxW || 1e6, o.maxH || 1e6, o.maxSize, o.lead); jzAnchor(L, o.align); }
    return L;
}
// font size that fits a box (probe layer, removed again)
function la2_fitSize(ctx, str, font, maxW, maxH, o) {
    o = o || {};
    var P = la2_txt(ctx, str, { font: font, size: 100, color: '#FFFFFF', x: -9999, y: -9999, track: o.track || 0, lead: o.lead, maxW: maxW, maxH: maxH });
    var s = jzFontSize(P); P.remove();
    return s;
}
// width of a text run (probe)
function la2_width(ctx, str, font, size, track) {
    var P = jzText(ctx, str, { font: font, size: size, color: '#FFFFFF', x: -9999, y: -9999, track: track || 0, align: 'left' });
    var w = jzRect(P).width; P.remove();
    return w;
}
// secondary layer: fade (and optional slide from dx, dy) in at `delay` over `len` s with an outCubic ease, follows the cut's exit
// (la2_io / la2_op are only used for secondary layers the browser draws with ghost off: they are kept out of the ghosts)
function la2_io(ctx, L, delay, len, dx, dy, alpha) {
    jzNoGhost(L);
    var hd = la2_hd(ctx) + 'var ca=oc((time-' + jzN(delay) + ')/' + jzN(len) + ');';
    if (dx || dy) jzSetExpr(jzXf(L, 'ADBE Position'), hd + '[value[0]+' + jzN(dx || 0) + '*(1-ca),value[1]+' + jzN(dy || 0) + '*(1-ca)]');
    if (alpha != null) jzXf(L, 'ADBE Opacity').setValue(alpha * 100);
    jzSetExpr(jzXf(L, 'ADBE Opacity'), hd + 'value*ca*K');
}
function la2_op(ctx, L, factorExpr, alpha) {
    jzNoGhost(L);
    if (alpha != null) jzXf(L, 'ADBE Opacity').setValue(alpha * 100);
    jzSetExpr(jzXf(L, 'ADBE Opacity'), la2_hd(ctx) + 'value*(' + factorExpr + ')');
}
function la2_line(g, pts, col, w, op) { jzAddPath(g, pts, false); var s = jzAddStroke(g, col, w, op); return s; }
function la2_sub(g, name) { var q = jzVecs(g).addProperty('ADBE Vector Group'); if (name) q.name = name; return q; }   // group inside a group
// dashed stroke (AE starts with an empty Dashes group; the preview model has fixed children)
function la2_dash(st, d, gp) {
    var D = st.property('ADBE Vector Stroke Dashes'), p1 = null, p2 = null;
    try { p1 = D.addProperty('ADBE Vector Stroke Dash 1'); p2 = D.addProperty('ADBE Vector Stroke Gap 1'); } catch (e) { p1 = null; p2 = null; }
    if (!p1) p1 = D.property('ADBE Vector Stroke Dash 1');
    if (!p2) p2 = D.property('ADBE Vector Stroke Gap 1');
    if (p1) p1.setValue(d); if (p2) p2.setValue(gp);
}
function la2_gxp(g, expr) { jzSetExpr(jzGX(g).property('ADBE Vector Position'), expr); }
function la2_gxo(g, expr) { jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), expr); }
function la2_gxs(g, expr) { jzSetExpr(jzGX(g).property('ADBE Vector Scale'), expr); }

// ---- glyphs of ONE text layer placed at given centres (comp px): gl = glyph strings, cells = [[x, y, rot], ...]
// (line k of the layer holds glyph k; per-glyph offsets move it to its cell). px, py = pivot for scale / rotation.
function la2_cells(ctx, gl, cells, o) {
    var size = o.size, B = 0.38, k;
    var L = jzText(ctx, gl.join('\r'), { font: o.font, size: size, color: o.color, x: 0, y: 0, leading: size, name: o.name, fill: o.fill, stroke: o.stroke, strokeColor: o.strokeColor });
    var ox = cells[0][0], oy = cells[0][1] + B * size;           // comp position of the layer origin (baseline centre of line 1)
    var px = o.px != null ? o.px : ox, py = o.py != null ? o.py : cells[0][1];
    jzXf(L, 'ADBE Anchor Point').setValue([px - ox, py - oy]);
    jzXf(L, 'ADBE Position').setValue([px, py]);
    var offs = [], rots = [], anyO = false, anyR = false;
    for (k = 0; k < gl.length; k++) {
        var dx = cells[k][0] - ox, dy = cells[k][1] - (oy + k * size - B * size);
        offs.push([dx, dy]); rots.push(cells[k][2] || 0);
        if (Math.abs(dx) + Math.abs(dy) > 0.05) anyO = true;
        if (cells[k][2]) anyR = true;
    }
    if (anyO) jzCharOffsets(L, offs, 'JZ Cells');
    if (anyR) jzCharRotations(L, rots, 'JZ Upright');
    return L;
}
// vertical columns (right to left) in one text layer -> { L, bb }. o: font, size, color, x (block centre), y (top when o.top, else centre), lead (column pitch, em)
function la2_vcols(ctx, lines, o) {
    var size = o.size, lead = o.lead || 1.15, cols = lines.length, gl = [], cells = [], i, j, maxN = 1;
    for (i = 0; i < cols; i++) {
        var ch = jzChars(jzStrip(lines[i])), cx = o.x - (i - (cols - 1) / 2) * lead * size;
        maxN = Math.max(maxN, ch.length);
        var y0 = o.top ? o.y : o.y - ch.length * size / 2;
        for (j = 0; j < ch.length; j++) {
            var c = ch[j], vx = 0, vy = 0, rot = 0;
            if (la2_isSmall(c)) { vx = 0.11 * size; vy = -0.11 * size; }
            if (LA2_VPUNCT.indexOf(c) >= 0) { vx = 0.3 * size; vy = -0.3 * size; }
            if (LA2_VROT.indexOf(c) >= 0 || /[A-Za-z0-9]/.test(c)) rot = 90;
            gl.push(c); cells.push([cx + vx, y0 + (j + 0.5) * size + vy, rot]);
        }
    }
    var bw = size * (1 + (cols - 1) * lead), bh = maxN * size, top = o.top ? o.y : o.y - bh / 2;
    var L = la2_cells(ctx, gl, cells, { font: o.font, size: size, color: o.color, name: o.name, px: o.x, py: top + bh / 2 });
    return { L: L, bb: la2_bb(o.x - bw / 2, top, o.x + bw / 2, top + bh) };
}

// ---- balanced split into k chunks (= splitK in the browser pack; used by plan())
function la2_split2(word, force) {
    var ch = jzChars(word), n = ch.length, best = Math.max(1, Math.floor(n / 2)), bs = -1e9, c;
    for (c = 1; c < n; c++) {
        var a = ch[c - 1], b = ch[c];
        if (!force && ((c === 1 && !jzIsKanji(a)) || (c === n - 1 && !jzIsKanji(b)))) continue;
        var s = -Math.abs(c - n / 2) * 0.9;
        if (a === ' ' || a === '　' || (jzIsPunct(a) && a !== 'ー')) s += 5;
        if (jzIsHira(a) && !jzIsHira(b) && !la2_isBad(b)) s += 3;
        if (la2_isBad(b)) s -= 6;
        if (jzIsKanji(a) && jzIsKanji(b)) s -= 2;
        if (jzIsKanji(a) && jzIsHira(b)) s -= 2;
        if (jzIsHira(a) && jzIsHira(b)) s -= 2;
        if (s > bs) { bs = s; best = c; }
    }
    if (!force && bs < -1.5 && !jzHasLatin(word)) return [word];
    var out = [], p1 = jzTrim(ch.slice(0, best).join('')), p2 = jzTrim(ch.slice(best).join(''));
    if (p1) out.push(p1); if (p2) out.push(p2);
    return out;
}
function la2_splitK(text, k, force) {
    var t = jzTrim(String(text || ''));
    if (!t) return [''];
    var latin = jzHasLatin(t), words = [], i, raw = latin ? t.split(/\s+/) : jzChunk(t);
    for (i = 0; i < raw.length; i++) if (jzTrim(raw[i])) words.push(jzTrim(raw[i]));
    if (!words.length) words = [t];
    k = Math.max(1, Math.min(k, jzCount(t)));
    var hard = {}, guard;
    for (guard = 0; words.length < k && guard < 16; guard++) {
        var bi = -1, bl = 1;
        for (i = 0; i < words.length; i++) { var l = jzCount(words[i]); if (l > bl && !hard[words[i]]) { bl = l; bi = i; } }
        if (bi < 0) break;
        var parts = latin ? [words[bi]] : la2_split2(words[bi]);
        if (parts.length < 2 && force && words.length < force) parts = la2_split2(words[bi], true);
        if (parts.length < 2) { hard[words[bi]] = 1; continue; }
        words.splice(bi, 1, parts[0], parts[1]);
    }
    var sep = latin ? ' ' : '';
    if (k <= 1) return [words.join(sep)];
    if (words.length <= k) return words;
    // partition the words into k consecutive groups with balanced glyph counts (exhaustive, small n)
    var pre = [0], n = words.length;
    for (i = 0; i < n; i++) pre.push(pre[i] + jzCount(words[i]) + 0.5);
    var tgt = pre[n] / k, best = null, bestS = 1e18, cnt = 0;
    function rec(start, g, cuts) {
        if (++cnt > 5000) return;
        if (g === k - 1) {
            var s = 0, prev = 0, all = cuts.concat([n]);
            for (var q = 0; q < all.length; q++) { var d = pre[all[q]] - pre[prev] - tgt; s += d * d; prev = all[q]; }
            if (s < bestS) { bestS = s; best = all; }
            return;
        }
        for (var c = start + 1; c <= n - (k - 1 - g); c++) rec(c, g + 1, cuts.concat([c]));
    }
    rec(0, 0, []);
    if (!best) return words;
    var out = [], prev = 0;
    for (i = 0; i < best.length; i++) { out.push(words.slice(prev, best[i]).join(sep)); prev = best[i]; }
    return out;
}

/* ---------------------------------------------------------------- 15 mirror — 鏡像 */
jzReg('layout', 'mirror', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), strength: rng.range(0.34, 0.5), squash: rng.pick([1, 0.7, 0.85]), ripple: rng.chance(0.5), ticks: rng.chance(0.6) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), k;
        var font = jzFontOf(ctx, 'font', 'display'), squash = jzP(ctx, 'squash', 0.85), strength = jzP(ctx, 'strength', 0.42);
        var hd = la2_hd(ctx), eE = 'var e=ioc(time/0.7)*K;';
        // horizon (behind everything): grows from the centre, ticks appear as it passes, accent dots ride the ends
        var Hz = jzNoGhost(jzShapeLayer(ctx, 'horizon', W / 2, 0));
        var text = la2_brk(c.text, port ? 6 : 12);
        var L = la2_txt(ctx, text, { font: font, size: 100, color: sc.fg, x: W / 2, y: H / 2, track: 0.04, lead: 1.15, maxW: W * 0.84, maxH: H * 0.3, maxSize: u * 0.22 });
        var size = jzFontSize(L), sz = jzSize(L), mh = sz[1];
        var RH = mh * squash + size * 0.1, cy = H / 2 - RH * 0.42, hz = cy + mh / 2 + size * 0.08, hw = W * 0.44;
        jzXf(Hz, 'ADBE Position').setValue([W / 2, hz]);
        for (k = -1; k <= 1; k += 2) {
            var gk = jzGrp(Hz, 'dot'); jzAddEllipse(gk, u * 0.01, u * 0.01); jzAddFill(gk, sc.accent);
            la2_gxp(gk, hd + eE + '[' + k + '*' + jzN(hw) + '*e,0]'); la2_gxo(gk, hd + eE + 'e>0.001?100:0');
        }
        if (jzP(ctx, 'ticks', true)) {
            for (k = -8; k <= 8; k++) {
                var x = k * W * 0.05; if (Math.abs(x) > hw) continue;
                var gt = jzGrp(Hz, 'tick'); la2_line(gt, [[x, -u * 0.006], [x, u * 0.006 * (k % 4 === 0 ? 2 : 1)]], sc.sub, 1.2 * ctx.u, 60);
                la2_gxo(gt, hd + eE + 'e*' + jzN(hw) + '>=' + jzN(Math.abs(x)) + '-0.01?100:0');
            }
        }
        var gl = jzGrp(Hz, 'line');
        jzAddPath(gl, [[0, 0], [-hw, 0]], false); jzAddPath(gl, [[0, 0], [hw, 0]], false);
        jzAddStroke(gl, sc.sub, Math.max(1.2 * ctx.u, u * 0.0016), 85);
        jzAddTrimPaths(gl, hd + eE + '100*e');
        // the lyric
        jzXf(L, 'ADBE Position').setValue([W / 2, cy]);
        jzAnimate(ctx, L, { mi: 0 });
        // reflection: a flipped, squashed duplicate (same motion) faded with depth by a luma ramp matte, optional ripple
        var R = L.duplicate(); R.name = 'reflection'; R.moveAfter(L);
        jzXf(R, 'ADBE Position').setValue([W / 2, hz + (hz - cy) * squash]);
        jzXf(R, 'ADBE Scale').setValue([100, -100 * squash]);
        jzXf(R, 'ADBE Opacity').setValue(100 * strength);
        if (jzP(ctx, 'ripple', false)) {
            var ww = jzEffect(R, 'ADBE Wave Warp', 'JZ Ripple');
            jzEP(ww, 1, 1); jzEP(ww, 2, size * 0.022); jzEP(ww, 3, Math.max(8, RH * 0.9)); jzEP(ww, 4, 0); jzEP(ww, 5, 0.38); jzEP(ww, 6, 1);
        }
        var M = ctx.comp.layers.addSolid([1, 1, 1], 'reflection fade', W, H, 1, ctx.comp.duration);
        var rp = jzEffect(M, 'ADBE Ramp', 'JZ Depth');
        jzEP(rp, 1, [W / 2, hz]); jzEP(rp, 2, [0.92, 0.92, 0.92]); jzEP(rp, 3, [W / 2, hz + RH * 0.98]); jzEP(rp, 4, [0, 0, 0]); jzEP(rp, 5, 1);
        M.moveBefore(R);
        la2_ng([R, M]);                                  // the browser draws the reflection on the main pass only (ghost: false)
        try { R.trackMatteType = TrackMatteType.LUMA; } catch (e) { jzWarn('mirror matte: ' + e.toString()); }
        return jzBB(L);
    }
});

/* ---------------------------------------------------------------- 16 sideways — 縦倒し */
jzReg('layout', 'sideways', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'display', 'serif'])), side: rng.pick(['left', 'right']), copy: rng.pick(['stack', 'number']), rule: rng.chance(0.75) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx);
        var font = jzFontOf(ctx, 'font', 'display'), t0 = jzTrim(c.text), n = jzCount(t0);
        var text = (port ? n > 12 : n > 6) ? la2_brk(t0, Math.ceil(n / 2)) : t0;
        var L = la2_txt(ctx, text, { font: font, size: 100, color: sc.fg, x: W / 2, y: H / 2, track: 0.02, lead: 1.02, maxW: H * 0.88, maxH: W * (port ? 0.4 : 0.3), maxSize: u * (port ? 0.34 : 0.3) });
        var sz = jzSize(L), mw = sz[0], mh = sz[1];
        var left = jzP(ctx, 'side', 'left') === 'left', mx = W * 0.05, cx = left ? mx + mh / 2 : W - mx - mh / 2;
        jzXf(L, 'ADBE Position').setValue([cx, H / 2]);
        jzXf(L, 'ADBE Rotate Z').setValue(left ? -90 : 90);
        jzAnimate(ctx, L, { mi: 0 });
        var hd = la2_hd(ctx);
        // divider rule (grows downwards)
        var rx = left ? cx + mh / 2 + W * 0.035 : cx - mh / 2 - W * 0.035;
        if (jzP(ctx, 'rule', true)) jzNoGhost(jzPathLayer(ctx, 'rule', [[rx, H * 0.06], [rx, H * 0.94]], sc.accent, { width: Math.max(2 * ctx.u, u * 0.003), trim: hd + '100*ioc((time-0.05)/0.6)*K' }));
        // horizontal copy block in the free area
        var ax0 = left ? rx + W * 0.04 : W * 0.07, ax1 = left ? W * 0.93 : rx - W * 0.04, aw = ax1 - ax0;
        if (aw > u * 0.2) {
            var ls = jzSmallSize(ctx), copy = c.lineText || c.text, body = jzBodyF(ctx), mono = jzMonoF(ctx), sl = u * 0.03;
            var cs = Math.min(u * 0.05, la2_fitSize(ctx, la2_brk(copy, Math.max(4, Math.floor(aw / (u * 0.05)))), body, aw, H * 0.3, { lead: 1.5 }));
            var ct = la2_brk(copy, Math.max(4, Math.floor(aw / (cs * 1.02))));
            var CT = la2_txt(ctx, ct, { font: body, size: cs, lead: 1.5, color: sc.fg, x: ax0, y: 0, align: 'left' });
            var cmh = jzSize(CT)[1], by = H * 0.9 - cmh / 2;
            jzXf(CT, 'ADBE Position').setValue([ax0, by]);
            la2_io(ctx, CT, 0.2, 0.45, 0, -sl, 0.9);
            if (jzP(ctx, 'copy', 'stack') === 'number') {
                var ns = Math.min(aw * 0.5, H * 0.3);
                var NT = jzText(ctx, jzLineNo(ctx), { font: font, size: ns, fill: false, stroke: Math.max(1.5 * ctx.u, ns * 0.012), strokeColor: sc.sub, x: ax0 - ns * 0.04, y: H * 0.1 + ns * 0.45, align: 'left' });
                la2_io(ctx, NT, 0.2, 0.45, 0, sl, 1);
            } else {
                la2_io(ctx, jzText(ctx, 'No.' + jzLineNo(ctx), { font: mono, size: ls, track: 0.15, color: sc.accent, x: ax0, y: H * 0.1, align: 'left' }), 0.2, 0.45, 0, sl, 1);
                la2_io(ctx, jzText(ctx, jzFmtTime(c.start), { font: mono, size: ls, track: 0.15, color: sc.sub, x: ax0, y: H * 0.1 + ls * 1.6, align: 'left' }), 0.2, 0.45, 0, sl, 1);
            }
            var rom = jzRomajiOf(ctx);
            if (rom && rom !== copy) la2_io(ctx, jzText(ctx, rom, { font: mono, size: ls * 0.85, track: 0.2, color: sc.sub, x: ax0, y: by - cmh / 2 - ls * 1.4, align: 'left' }), 0.2, 0.45, 0, -sl, 1);
        }
        return la2_bb(cx - mh / 2, H / 2 - mw / 2, cx + mh / 2, H / 2 + mw / 2);
    }
});

/* ---------------------------------------------------------------- 17 edgeFrame — 外周 */
jzReg('layout', 'edgeFrame', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), edgeFont: rng.pick(['body', 'mono']), sep: rng.pick(['　／　', '　・　', '　—　']), speed: rng.range(0.6, 1.2) * rng.pick([1, -1]), corner: rng.pick(['square', 'cross']), inner: rng.chance(0.6) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), k;
        var d = u * 0.045, es = u * 0.024, band = es * 1.7, hd = la2_hd(ctx);
        var ef = jzP(ctx, 'edgeFont', 'body') === 'mono' ? jzMonoF(ctx) : jzBodyF(ctx);
        var unit = jzFlat(c.lineText || c.text) + jzP(ctx, 'sep', '　／　');
        // scroll period = width(unit x2) - width(unit): independent of how trailing spaces are measured
        var per = Math.max(10, la2_width(ctx, unit + unit, ef, es, 0.08) - la2_width(ctx, unit, ef, es, 0.08));
        var sp = jzP(ctx, 'speed', 0.9) * u * 0.07;
        var edges = [[d + band, d, W - 2 * d - 2 * band, 0], [W - d, d + band, H - 2 * d - 2 * band, 90], [W - d - band, H - d, W - 2 * d - 2 * band, 180], [d, H - d - band, H - 2 * d - 2 * band, 270]];
        for (k = 0; k < 4; k++) {
            var E = edges[k], reps = Math.min(60, Math.ceil(E[2] / per) + 2), s = '';
            for (var i = 0; i < reps; i++) s += unit;
            // the scrolling row (anchor slides along its own axis) under an alpha matte that reveals the edge
            var R = jzText(ctx, s, { font: ef, size: es, color: sc.sub, x: E[0], y: E[1], track: 0.08, align: 'left', rot: E[3], opacity: 0.85, name: 'edge copy ' + (k + 1) });
            jzSetExpr(jzXf(R, 'ADBE Anchor Point'), 'var P=' + jzN(per) + ',o=((time*' + jzN(sp) + ')%P+P)%P;[value[0]+P-o,value[1]]');
            var Mt = jzShapeLayer(ctx, 'edge clip ' + (k + 1), E[0], E[1]), gm = jzGrp(Mt, 'clip');
            jzAddRect(gm, E[2], band * 1.04, 0, E[2] / 2, 0); jzAddFill(gm, '#FFFFFF');
            jzXf(Mt, 'ADBE Rotate Z').setValue(E[3]);
            jzSetExpr(jzXf(Mt, 'ADBE Scale'), hd + 'var e=ioc((time-' + jzN(k * 0.07) + ')/0.5)*K;[value[0]*e,value[1]]');
            try { R.trackMatteType = TrackMatteType.ALPHA; } catch (e1) { jzWarn('edgeFrame matte: ' + e1.toString()); }
            la2_ng([R, Mt]);
        }
        // corner marks (outBack pop)
        var C = jzNoGhost(jzShapeLayer(ctx, 'corners', 0, 0)), cr = [[d, d], [W - d, d], [W - d, H - d], [d, H - d]], cross = jzP(ctx, 'corner', 'square') === 'cross';
        for (k = 0; k < 4; k++) {
            var gc = jzGrp(C, 'corner');
            if (cross) { var q = es * 0.6; jzAddPath(gc, [[-q, 0], [q, 0]], false); jzAddPath(gc, [[0, -q], [0, q]], false); jzAddStroke(gc, sc.accent, Math.max(1.5 * ctx.u, es * 0.08)); }
            else { jzAddRect(gc, es * 0.55, es * 0.55); jzAddFill(gc, sc.accent); }
            jzGX(gc).property('ADBE Vector Position').setValue(cr[k]);
            la2_gxs(gc, hd + 'var q=cl((time-0.1)/0.3);var s=q<=0?0:ob(q,2)*K*100;[s,s]');
        }
        if (jzP(ctx, 'inner', false)) {
            var g = d + band * 0.95;
            var IF = jzPathLayer(ctx, 'inner frame', [[g, g], [W - g, g], [W - g, H - g], [g, H - g], [g, g]], sc.sub, { width: 1.2 * ctx.u, trim: hd + '100*ioc((time-0.15)/0.8)*K' });
            jzXf(IF, 'ADBE Opacity').setValue(45); jzNoGhost(IF);
        }
        var L = la2_txt(ctx, la2_brk(c.text, port ? 6 : 11), { font: jzFontOf(ctx, 'font', 'display'), size: 100, color: sc.fg, x: W / 2, y: H / 2, track: 0.04, lead: 1.15, maxW: W * 0.72, maxH: H * 0.5, maxSize: u * 0.22 });
        jzAnimate(ctx, L, { mi: 0 });
        return jzBB(L);
    }
});

/* ---------------------------------------------------------------- 18 perspective — 奥行き */
jzReg('layout', 'perspective', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display'])), mode: rng.pick(['floor', 'side', 'floor']), copies: rng.int(4, 6), speed: rng.range(0.25, 0.45), guides: rng.chance(0.7), vx: rng.pick([1, -1]) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx);
        var font = jzFontOf(ctx, 'font', 'display'), side = jzP(ctx, 'mode', 'floor') === 'side', vx = jzP(ctx, 'vx', 1) < 0 ? -1 : 1;
        var KC = Math.round(jzClamp(jzP(ctx, 'copies', 5), 2, 8)), speed = jzP(ctx, 'speed', 0.35), hd = la2_hd(ctx);
        var text = la2_brk(c.text, port ? 6 : 12);
        var L = la2_txt(ctx, text, { font: font, size: 100, color: sc.fg, x: W / 2, y: H / 2, track: 0.03, lead: 1.1, maxW: W * (side ? 0.7 : 0.84), maxH: H * 0.22, maxSize: u * 0.18 });
        var size = jzFontSize(L), sz = jzSize(L), mw = sz[0], mh = sz[1];
        var x0 = side ? W / 2 - vx * W * 0.12 : W / 2, y0 = H * 0.74 - mh / 2 + size * 0.5;
        var V = side ? [W / 2 + vx * W * 0.36, H * 0.12] : [W / 2, H * 0.1];
        var sy = side ? 1 : 0.8, D = Math.abs(y0 - V[1]), X = 2 * D / Math.max(1, mh * sy * 1.35), r = jzClamp((X - 1) / (X + 1), 0.45, 0.8);
        jzXf(L, 'ADBE Position').setValue([x0, y0]);
        // rails from the front copy to the vanishing point (behind everything)
        if (jzP(ctx, 'guides', true)) {
            var hw = mw / 2 + size * 0.3, yb = y0 + mh / 2 + size * 0.12;
            var G = jzShapeLayer(ctx, 'perspective rails', 0, 0), gr = jzGrp(G, 'rails');
            jzAddPath(gr, [[x0 - hw, yb], V], false); jzAddPath(gr, [[x0 + hw, yb], V], false);
            jzAddStroke(gr, sc.sub, 1.2 * ctx.u, 40); jzAddTrimPaths(gr, hd + '100*ioc(time/0.8)*K');
            var gv = jzGrp(G, 'vanishing point'); jzAddEllipse(gv, u * 0.01, u * 0.01, V[0], V[1]); jzAddFill(gv, sc.accent);
            la2_gxo(gv, hd + '100*ioc(time/0.8)*K');
            G.moveAfter(L); jzNoGhost(G);
        }
        // receding copies: copy j sits at depth z = j + phase and drifts back into the distance
        for (var j = KC; j >= 1; j--) {
            var Cp = la2_txt(ctx, text, { font: font, size: size, color: sc.sub, x: x0, y: y0, track: 0.03, lead: 1.1, name: 'depth copy ' + j });
            var zh = hd + 'var z=' + j + '+((time*' + jzN(speed) + ')%1);var k=Math.pow(' + jzN(r) + ',z);';
            jzSetExpr(jzXf(Cp, 'ADBE Position'), zh + '[' + jzN(V[0]) + '+' + jzN(x0 - V[0]) + '*k,' + jzN(V[1]) + '+' + jzN(y0 - V[1]) + '*k]');
            jzSetExpr(jzXf(Cp, 'ADBE Scale'), zh + '[value[0]*k,value[1]*k*' + jzN(sy) + ']');
            jzSetExpr(jzXf(Cp, 'ADBE Opacity'), zh + 'value*oc((time-0.05)/0.4)*K*cl((z-1)/0.6)*cl((' + (KC + 1) + '-z)/1.2)*(0.8-0.45*z/' + (KC + 1) + ')');
            if (side) jzAnimator(Cp, 'JZ Recede Skew', [['ADBE Text Skew', -vx * 14]], zh + '(1-k)*100');
            Cp.moveAfter(L); jzNoGhost(Cp);                 // ghost: false in the browser
        }
        jzAnimate(ctx, L, { mi: 0 });
        return jzBB(L);
    }
});

/* ---------------------------------------------------------------- 19 hanko — 落款 */
function la2_sealGlyphs(text) {
    var all = jzChars(jzStrip(text)), g = [], kan = [], i;
    for (i = 0; i < all.length; i++) if (!jzIsPunct(all[i]) && !la2_isSmall(all[i])) { g.push(all[i]); if (jzIsKanji(all[i])) kan.push(all[i]); }
    if (kan.length >= 2 || (kan.length === 1 && g.length > 4)) return kan.slice(0, 4);
    if (g.length <= 4) return g.length ? g : all.slice(0, 1);
    return g.slice(0, 2);
}
// the seal stamp: jittered square (白文 = filled, glyphs knocked out / 朱文 = outline, red glyphs); thumps in after the lyric landed
function la2_seal(ctx, sx, sy, S) {
    var sc = ctx.sc, c = ctx.cut, seed = c.seed || 0, haku = jzP(ctx, 'seal', 'haku') !== 'shu', i;
    var T0 = (c.inDur || 0.3) * 0.7 + 0.08;
    var hx = la2_hd(ctx) + 'var x=(time-' + jzN(T0) + ')/0.2;';
    var X = jzShapeLayer(ctx, 'seal', sx, sy);
    if (haku) {
        var gs0 = jzGrp(X, 'specks');
        for (i = 0; i < 12; i++) { var rr = S * (0.004 + 0.008 * jzR(seed, i, 7)); jzAddEllipse(gs0, rr * 2, rr * 2, (jzR(seed, i, 5) * 2 - 1) * S * 0.46, (jzR(seed, i, 6) * 2 - 1) * S * 0.46); }
        jzAddFill(gs0, sc.bg, 90);
    }
    var pts = [], M = 11, h = S / 2;
    function jit(a, b) { return (jzR(seed, a, b, 3) * 2 - 1) * S * 0.014; }
    for (i = 0; i < M; i++) pts.push([-h + S * i / M, -h + jit(i, 1)]);
    for (i = 0; i < M; i++) pts.push([h + jit(i, 2), -h + S * i / M]);
    for (i = 0; i < M; i++) pts.push([h - S * i / M, h + jit(i, 3)]);
    for (i = 0; i < M; i++) pts.push([-h + jit(i, 4), h - S * i / M]);
    var gq = jzGrp(X, 'stamp'); jzAddPath(gq, pts, true);
    if (haku) jzAddFill(gq, sc.accent); else { var st = jzAddStroke(gq, sc.accent, S * 0.07); try { st.property('ADBE Vector Stroke Line Join').setValue(2); } catch (e) {} }
    var opE = hx + 'x<=0?0:value*cl(x*3)*K';
    // seal glyphs: right column first, top to bottom; each a text layer parented to the stamp
    var G = la2_sealGlyphs(ctx.cut.text), gn = G.length, cols = gn >= 3 ? 2 : 1, rows = Math.ceil(gn / cols);
    var inner = S * (haku ? 0.8 : 0.72), cw = inner / cols, chh = inner / rows, gsz = Math.min(cw, chh) * 0.92, gsx = jzClamp(cw / chh, 0.8, 1.7);
    if (gsz * gsx > cw) gsx = cw / gsz;
    var sf = jzFontOf(ctx, 'sealFont', 'serif');
    for (i = 0; i < gn; i++) {
        var col = cols - 1 - Math.floor(i / rows), row = i % rows;
        var T = jzText(ctx, G[i], { font: sf, size: gsz, color: haku ? sc.bg : sc.accent, x: sx - inner / 2 + cw * (col + 0.5), y: sy - inner / 2 + chh * (row + 0.5), sx: gsx, name: 'seal glyph' });
        T.parent = X;                                   // (parent before any transform expression exists)
        jzNoGhost(T);                                   // glyphs: ghost off (the stamp is ghosted)
        jzSetExpr(jzXf(T, 'ADBE Opacity'), opE);
    }
    jzXf(X, 'ADBE Rotate Z').setValue(jzP(ctx, 'rot', 0));
    jzSetExpr(jzXf(X, 'ADBE Scale'), hx + 'var s=x<=0?0:(1.55+(1-1.55)*ob(cl(x),1.4))*100;[s,s]');
    jzSetExpr(jzXf(X, 'ADBE Position'), hx + 'var sh=0;if(x>1&&x<1.8){var k=1.8-x;seedRandom(Math.floor(time*12)+91,true);sh=random(-1,1)*' + jzN(S * 0.015) + '*k;}[value[0]+sh,value[1]]');
    jzSetExpr(jzXf(X, 'ADBE Opacity'), opE);
    return X;
}
jzReg('layout', 'hanko', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif'])), sealFont: rng.pick(jzFontsOf(st, ['serif', 'display'])), vert: cut.H > cut.W * 1.08 ? true : rng.chance(0.6), seal: rng.pick(['haku', 'shu', 'haku']), rot: rng.range(-7, 7) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx);
        var font = jzFontOf(ctx, 'font', 'serif'), text = jzStrip(c.text), n = jzCount(text), bb, S, sx, sy, L;
        if (jzP(ctx, 'vert', port)) {
            var cols = n > (port ? 8 : 6) ? 2 : 1, vt = cols > 1 ? la2_lines(la2_brk(text, Math.ceil(n / 2))) : [text], per = 1, i;
            for (i = 0; i < vt.length; i++) per = Math.max(per, jzCount(vt[i]));
            cols = vt.length;
            var size = Math.min(H * 0.7 / Math.max(per, 2.5), u * 0.2, W * 0.3 / cols);
            S = size * (n <= 2 ? 1.35 : 1.5);
            var lead = 1.35, bw = size * (1 + (cols - 1) * lead), colH = per * size;
            var x = W / 2 + S * 0.45 + (cols - 1) * size * lead / 2, top = H / 2 - colH / 2 - S * 0.25;
            L = la2_vcols(ctx, vt, { font: font, size: size, color: sc.fg, x: x, y: top, top: true, lead: lead, name: text }).L;
            jzAnimate(ctx, L, { mi: 0 });
            bb = la2_bb(x - bw / 2, top, x + bw / 2, top + colH);
            sx = x - bw / 2 - S * 0.72; sy = Math.max(top + jzCount(vt[vt.length - 1]) * size, top + S * 0.5) + S * 0.1;
        } else {
            var sz0 = Math.min(la2_fitSize(ctx, text, font, W * 0.6, H * 0.3), u * 0.17);
            S = sz0 * 1.7;
            L = jzText(ctx, text, { font: font, size: sz0, color: sc.fg, x: W / 2 - S * 0.5, y: H / 2 });
            jzAnimate(ctx, L, { mi: 0 });
            bb = jzBB(L);
            sx = bb.x1 + S * 0.75; sy = H / 2 + sz0 * 0.3;
        }
        la2_seal(ctx, sx, sy, S);
        return bb;
    }
});

/* ---------------------------------------------------------------- 20 genkou — 原稿用紙 */
jzReg('layout', 'genkou', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif'])), lineC: rng.pick(['accent', 'sub']), indent: rng.chance(0.5), pad: rng.int(2, 4) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = jzPortrait(ctx), k, i;
        var chars = jzChars(jzStrip(c.text)), n = chars.length, ind = jzP(ctx, 'indent', false) ? 1 : 0;
        if (!n) { chars = ['　']; n = 1; }
        var maxR = port ? 14 : 10, used = Math.max(1, Math.ceil((n + ind) / maxR));
        var R = Math.max(7, Math.ceil((n + ind) / used) + (used === 1 && n + ind < maxR ? 1 : 0));
        var gapK = 0.3, cell = Math.min(H * 0.78 / R, W * 0.9 / ((used + 2) * (1 + gapK))), colW = cell * (1 + gapK);
        var C = Math.max(used + 2, Math.min(Math.floor(W * 0.92 / colW), used + jzP(ctx, 'pad', 3) * 2));
        var gw = C * colW - cell * gapK, gh = R * cell, gx0 = W / 2 - gw / 2, gy0 = H / 2 - gh / 2, cStart = Math.floor((C - used) / 2);
        function colX(q) { return gx0 + gw - cell - q * colW; }                    // left edge of column q (counted from the right)
        var lc = jzP(ctx, 'lineC', 'accent') === 'accent' ? sc.accent : sc.sub, lw = Math.max(1.5 * ctx.u, cell * 0.02), hd = la2_hd(ctx);
        // the grid: each column unrolls downwards (sides trimmed, rungs added by a repeater as the sides pass them)
        var G = jzNoGhost(jzShapeLayer(ctx, 'genkou grid', 0, 0));
        for (k = 0; k < C; k++) {
            var x = colX(k), dist = Math.abs(k - (cStart + (used - 1) / 2)) / Math.max(1, C / 2);
            var eX = hd + 'var e=ioc((time-' + jzN(k * 0.035) + ')/0.45)*K;';
            var gc = jzGrp(G, 'column ' + (k + 1));
            var gs = la2_sub(gc, 'sides'); jzAddPath(gs, [[x, gy0], [x, gy0 + gh]], false); jzAddPath(gs, [[x + cell, gy0], [x + cell, gy0 + gh]], false);
            jzAddStroke(gs, lc, lw); jzAddTrimPaths(gs, eX + '100*e');
            var gr = la2_sub(gc, 'rungs'); jzAddPath(gr, [[x, gy0], [x + cell, gy0]], false); jzAddStroke(gr, lc, lw, 85);
            var rp = jzVecs(gr).addProperty('ADBE Vector Filter - Repeater');
            jzSetExpr(rp.property('ADBE Vector Repeater Copies'), eX + 'e<=0?0:Math.min(' + (R + 1) + ',Math.floor(e*' + R + '+' + jzN(0.5 / cell) + ')+1)');
            rp.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([0, cell]);
            jzGX(gc).property('ADBE Vector Group Opacity').setValue(85 * (1 - dist * 0.6));
        }
        // footer: (rows × columns) and line number
        var fs = Math.max(11 * ctx.u, cell * 0.14), mono = jzMonoF(ctx);
        la2_io(ctx, jzText(ctx, '(' + R + '×' + C + ')', { font: mono, size: fs, color: lc, x: gx0, y: gy0 + gh + fs * 1.4, align: 'left' }), 0.3, 0.4, 0, 0, 0.8);
        la2_io(ctx, jzText(ctx, 'No.' + jzLineNo(ctx), { font: mono, size: fs, color: lc, x: gx0 + gw, y: gy0 + gh + fs * 1.4, align: 'right' }), 0.3, 0.4, 0, 0, 0.8);
        // the lyric: one text layer, one glyph per cell (top to bottom, right to left)
        var cells = [];
        for (i = 0; i < n; i++) {
            var q = i + ind, col = cStart + Math.floor(q / R), r = q % R, ch = chars[i], gx = colX(col) + cell / 2, gy = gy0 + (r + 0.5) * cell, rot = 0;
            if (la2_isSmall(ch)) { gx += cell * 0.1; gy -= cell * 0.1; }
            if (LA2_VPUNCT.indexOf(ch) >= 0) { gx += cell * 0.28; gy -= cell * 0.28; }
            if (LA2_VROT.indexOf(ch) >= 0 || jzIsLatin(ch)) rot = 90;
            cells.push([gx, gy, rot]);
        }
        var bx0 = colX(cStart + used - 1), bx1 = colX(cStart) + cell;
        var L = la2_cells(ctx, chars, cells, { font: jzFontOf(ctx, 'font', 'serif'), size: cell * 0.8, color: sc.fg, px: (bx0 + bx1) / 2, py: gy0 + gh / 2, name: jzStrip(c.text) });
        jzAnimate(ctx, L, { mi: 0 });
        // the browser writes glyph i as its own item (delay i x stagger): hold each glyph back until its turn
        jzAnimator(L, 'JZ Write Order', [['ADBE Text Opacity', 0]], 'time<(textIndex-1)*' + jzN(c.stagger || 0.04) + '?100:0');
        return la2_bb(bx0, gy0, bx1, gy0 + gh);
    }
});

/* ---------------------------------------------------------------- 21 panels — コマ割り */
function la2_mask(L, pts) {
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = pts; sh.closed = true;
    m.property('ADBE Mask Shape').setValue(sh);
    return m;
}
// Linear Wipe that reveals an identity-transform layer between comp x (or y) lo..hi as `eExpr` goes 0 -> 1
// fromRight: reveal right -> left (landscape reading order); else top -> bottom
function la2_reveal(ctx, L, lo, hi, eExpr, fromRight) {
    var lw = jzEffect(L, 'ADBE Linear Wipe', 'JZ Reveal');
    jzEP(lw, 2, fromRight ? 90 : 0); jzEP(lw, 3, 0);
    var edge = 'var ed=' + jzN(fromRight ? hi : lo) + '+(' + jzN(fromRight ? lo - hi : hi - lo) + ')*e;';
    jzEX(lw, 1, la2_hd(ctx) + eExpr + edge + (fromRight ? '100*ed/' + jzN(ctx.W) : '100*(1-ed/' + jzN(ctx.H) + ')'));
    return lw;
}
jzReg('layout', 'panels', {
    plan: function (rng, cut, st) {
        var k = cut.n >= 6 ? 3 : 2;
        return { chunks: la2_splitK(cut.text, k, 2), font: rng.pick(jzFontsOf(st, ['display', 'serif'])), acc: rng.int(0, 2), fx: rng.pick(['focus', 'tone', 'focus', 'none']), slant: rng.range(5, 11), widths: [rng.range(0.8, 1.25), rng.range(0.8, 1.25), rng.range(0.8, 1.25)] };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, j;
        var ch = jzP(ctx, 'chunks', null);
        if (!ch || !ch.length) ch = la2_splitK(c.text, 2, 2);
        var k = ch.length, m = u * 0.05, g = u * 0.028, lw = Math.max(3 * ctx.u, u * 0.0065);
        var font = jzFontOf(ctx, 'font', 'display'), acc = jzP(ctx, 'acc', 0) % k, fx = jzP(ctx, 'fx', 'focus'), widths = jzP(ctx, 'widths', [1, 1, 1]);
        var Lr = port ? H - 2 * m : W - 2 * m, cross = port ? W - 2 * m : H - 2 * m;
        var ws = [], tot = 0;
        for (i = 0; i < k; i++) { ws.push(Math.sqrt(jzCount(ch[i]) + 2) * (widths[i % 3] || 1)); tot += ws[i]; }
        var sl = Math.min(Math.tan(jzP(ctx, 'slant', 8) * Math.PI / 180) * cross / 2, Lr / k * 0.18);
        var bounds = [0], acc2 = 0;
        for (i = 0; i < k; i++) { acc2 += ws[i]; bounds.push(acc2 / tot * Lr); }
        var stag = Math.max(0.01, c.stagger || 0.04), bb = null, inkC = la2_onCol(sc, sc.ink), hd = la2_hd(ctx);
        for (i = 0; i < k; i++) {
            var a = bounds[i], b = bounds[i + 1];
            var sa = i === 0 ? 0 : sl * (i % 2 ? 1 : -1), sb = i === k - 1 ? 0 : sl * ((i + 1) % 2 ? 1 : -1);
            var a0 = a + (i === 0 ? 0 : g / 2), b0 = b - (i === k - 1 ? 0 : g / 2);
            var q = [[a0 + sa, 0], [b0 + sb, 0], [b0 - sb, cross], [a0 - sa, cross]], poly = [], cx = 0, cy = 0;
            for (j = 0; j < 4; j++) { poly.push(port ? [m + q[j][1], m + q[j][0]] : [W - m - q[j][0], m + q[j][1]]); cx += poly[j][0] / 4; cy += poly[j][1] / 4; }
            var along = Math.min((b0 + sb) - (a0 + sa), (b0 - sb) - (a0 - sa));
            var lo = 1e9, hi = -1e9;
            for (j = 0; j < 4; j++) { var vv = port ? poly[j][1] : poly[j][0]; lo = Math.min(lo, vv); hi = Math.max(hi, vv); }
            var d = 0.06 + i * 0.16, eE = 'var e=ioc((time-' + jzN(d) + ')/0.3);';
            var accent = i === acc;
            // panel: plate (accent) + border, revealed along the reading direction
            var Pn = jzNoGhost(jzShapeLayer(ctx, 'panel ' + (i + 1), 0, 0)), gp = jzGrp(Pn, 'panel');
            jzAddPath(gp, poly, true); jzAddStroke(gp, sc.fg, lw); if (accent) jzAddFill(gp, sc.ink);
            la2_reveal(ctx, Pn, lo, hi, eE, !port);
            jzSetExpr(jzXf(Pn, 'ADBE Opacity'), hd + 'value*K');
            var pw = port ? cross : along, ph = port ? along : cross, iw = Math.max(10, pw * 0.8), ih = Math.max(10, ph * 0.8);
            var vert = ih > iw * 1.25 && !jzHasLatin(ch[i]);
            var c0 = vert ? jzStrip(ch[i]) : jzTrim(ch[i]), cn = jzCount(c0), txt = c0, size, lines;
            if (vert) {
                lines = [c0]; size = Math.min(iw, ih / Math.max(1, cn));
                if (cn >= 4) { var l2 = la2_lines(la2_brk(c0, Math.ceil(cn / 2))), mx2 = 1; for (j = 0; j < l2.length; j++) mx2 = Math.max(mx2, jzCount(l2[j])); var s2 = Math.min(iw / (1 + (l2.length - 1) * 1.15), ih / mx2); if (s2 > size * 1.15) { lines = l2; size = s2; } }
            } else {
                size = la2_fitSize(ctx, c0, font, iw, ih, { lead: 1.15 });
                if (cn >= 4) { var t2 = la2_brk(c0, Math.ceil(cn / 2)), s3 = la2_fitSize(ctx, t2, font, iw, ih, { lead: 1.15 }); if (s3 > size * 1.15) { txt = t2; size = s3; } }
            }
            size = Math.min(size, u * 0.24);
            // effects inside the panel (clipped by a mask with the panel's outline)
            if (accent && fx === 'focus') {
                var Fx = jzNoGhost(jzShapeLayer(ctx, 'speed lines', 0, 0)), R0 = Math.sqrt(pw * pw + ph * ph);
                var tw = vert ? cn * size : la2_width(ctx, txt.split('\r')[0], font, size, 0);
                var rin = size * (vert ? 0.9 : 0.75) + Math.max(0, tw * 0.35), gl = [jzGrp(Fx, 'thin'), jzGrp(Fx, 'mid'), jzGrp(Fx, 'bold')];
                for (j = 0; j < 48; j++) {
                    var ang = (j / 48 + jzR(c.seed, j, 61) * 0.01) * Math.PI * 2, r1 = rin * (1 + jzR(c.seed, j, 62) * 0.5), wk = jzR(c.seed, j, 63);
                    jzAddPath(gl[wk < 0.33 ? 0 : wk < 0.66 ? 1 : 2], [[cx + Math.cos(ang) * R0, cy + Math.sin(ang) * R0], [cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1]], false);
                }
                for (j = 0; j < 3; j++) jzAddStroke(gl[j], inkC, (1.4 + j * 1.2) * ctx.u, 22);
                la2_mask(Fx, poly); la2_reveal(ctx, Fx, lo, hi, eE, !port);
                jzSetExpr(jzXf(Fx, 'ADBE Opacity'), hd + 'value*K');
            }
            if (!accent && fx === 'tone' && i === (acc + 1) % k) {
                var cellT = Math.max(4 * ctx.u, u * 0.011), x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
                for (j = 0; j < 4; j++) { x0 = Math.min(x0, poly[j][0]); x1 = Math.max(x1, poly[j][0]); y0 = Math.min(y0, poly[j][1]); y1 = Math.max(y1, poly[j][1]); }
                var To = jzNoGhost(jzShapeLayer(ctx, 'screentone', 0, 0)), gt = jzGrp(To, 'tone'), gd = la2_sub(gt, 'dots');
                jzAddEllipse(gd, cellT * 0.68, cellT * 0.68, x0 + cellT / 2, y0 + cellT / 2); jzAddFill(gd, sc.sub);
                var r1p = jzVecs(gd).addProperty('ADBE Vector Filter - Repeater');
                r1p.property('ADBE Vector Repeater Copies').setValue(Math.ceil((x1 - x0) / cellT) + 1);
                r1p.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([cellT, 0]);
                var r2p = jzVecs(gt).addProperty('ADBE Vector Filter - Repeater');
                r2p.property('ADBE Vector Repeater Copies').setValue(Math.ceil((y1 - y0) / cellT) + 1);
                r2p.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([0, cellT]);
                la2_mask(To, poly); la2_reveal(ctx, To, lo, hi, eE, !port);
                jzXf(To, 'ADBE Opacity').setValue(30);
                jzSetExpr(jzXf(To, 'ADBE Opacity'), hd + 'value*K');
            }
            // the chunk (clipped to the revealed panel by an alpha matte copy of the panel)
            var col = accent ? inkC : sc.fg, T, tb;
            if (vert) { var vc = la2_vcols(ctx, lines, { font: font, size: size, color: col, x: cx, y: cy, lead: 1.15, name: c0 }); T = vc.L; tb = vc.bb; }
            else { T = la2_txt(ctx, txt, { font: font, size: size, color: col, x: cx, y: cy, lead: 1.15 }); tb = jzBB(T); }
            jzAnimate(ctx, T, { mi: (d + 0.08) / stag });
            var Mt = jzShapeLayer(ctx, 'panel clip ' + (i + 1), 0, 0), gm = jzGrp(Mt, 'clip');
            jzAddPath(gm, poly, true); jzAddFill(gm, '#FFFFFF');
            la2_reveal(ctx, Mt, lo, hi, eE, !port);
            Mt.moveBefore(T);
            try { T.trackMatteType = TrackMatteType.ALPHA; } catch (e1) { jzWarn('panels matte: ' + e1.toString()); }
            bb = jzUnion(bb, tb);
        }
        return bb || la2_bb(m, m, W - m, H - m);
    }
});

/* ---------------------------------------------------------------- 22 filmstrip — フィルム */
jzReg('layout', 'filmstrip', {
    plan: function (rng, cut, st) {
        return { chunks: la2_splitK(cut.text, Math.min(3, cut.n), cut.n <= 4 ? 3 : 2), font: rng.pick(jzFontsOf(st, ['display', 'serif'])), dir: rng.pick([1, -1]), tone: rng.pick(['ink', 'fg']), codes: rng.chance(0.75), tilt: rng.pick([0, 0, -3, 3]) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), v = jzPortrait(ctx), i;
        var ch = jzP(ctx, 'chunks', null);
        ch = ch && ch.length ? ch.slice(0, 3) : [jzTrim(c.text)];
        var slots = ch.length === 3 ? ch : ch.length === 2 ? [ch[0], ch[1], null] : [null, ch[0], null];
        var A = v ? H : W, Bd = v ? W : H;
        var fw0 = Math.min(A * 0.88 / 3.2, Bd * 0.62 * 1.3), fh = fw0 / 1.3, band = fh / 0.72, gap = fw0 * 0.08, pitch = fw0 + gap;
        var stripC = jzP(ctx, 'tone', 'ink') === 'fg' ? sc.fg : sc.ink, oc0 = la2_onCol(sc, sc.bg), tcol = oc0 === sc.bg ? sc.fg : oc0;
        var dir = jzP(ctx, 'dir', 1) < 0 ? -1 : 1, font = jzFontOf(ctx, 'font', 'display'), hd = la2_hd(ctx);
        function P2(a, b) { return v ? [b, a] : [a, b]; }          // (along, across) from the strip centre -> px
        var fwX = v ? fh : fw0, fhY = v ? fw0 : fh;
        // the strip: frames, sprocket holes and band in one shape layer; it slides in, drifts, and leaves the other way
        var S = jzNoGhost(jzShapeLayer(ctx, 'film strip', W / 2, H / 2));
        for (i = 0; i < 3; i++) { var gf = jzGrp(S, 'frame ' + (i + 1)), pf = P2((i - 1) * pitch, 0); jzAddRect(gf, fwX, fhY, fh * 0.04, pf[0], pf[1]); jzAddFill(gf, sc.bg); }
        var bandLen = A * 1.6, hp = band * 0.11, hw = hp * 0.55, hh = hp * 0.72, hm = (band - fh) / 4, nH = Math.min(120, Math.ceil(bandLen / hp));
        for (var sd = -1; sd <= 1; sd += 2) {
            var gh = jzGrp(S, 'sprockets'), ph0 = P2(-bandLen / 2 + hp / 2, sd * (band / 2 - hm)), hs = P2(hw, hh);
            jzAddRect(gh, hs[0], hs[1], hw * 0.25, ph0[0], ph0[1]); jzAddFill(gh, sc.bg);
            var rp = jzVecs(gh).addProperty('ADBE Vector Filter - Repeater');
            rp.property('ADBE Vector Repeater Copies').setValue(nH);
            rp.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue(P2(hp, 0));
        }
        var gb = jzGrp(S, 'band'), bs = P2(bandLen, band); jzAddRect(gb, bs[0], bs[1]); jzAddFill(gb, stripC);
        var faE = '(1-sm(0.55,1,PO))', laE = 'cl(oe(time/0.6)*2-1)*' + faE;
        var kids = [], lyr = [];
        // edge codes
        if (jzP(ctx, 'codes', true)) {
            var cs = Math.max(10 * ctx.u, hm * 0.9);
            for (i = -2; i <= 2; i++) {
                var pc = P2(i * pitch - pitch / 2, (band / 2 - hm * 2.2) * (v ? 1 : -1));
                var Tc = jzText(ctx, '▸' + (12 + i + (c.index || 0)) + (i % 2 ? 'A' : ''), { font: jzMonoF(ctx), size: cs, color: sc.accent, x: W / 2 + pc[0], y: H / 2 + pc[1], rot: v ? 90 : 0, opacity: 0.9 });
                la2_op(ctx, Tc, laE); kids.push(Tc);
            }
        }
        // frames: one type size for the whole strip; empty frames get a countdown leader
        var fsz = u * 0.2;
        for (i = 0; i < 3; i++) if (slots[i]) fsz = Math.min(fsz, la2_fitSize(ctx, la2_brk(slots[i], v ? 6 : 4), font, fwX * 0.8, fhY * 0.7, { lead: 1.1 }));
        var stag = Math.max(0.01, c.stagger || 0.04), bb = null;
        for (i = 0; i < 3; i++) {
            var p = P2((i - 1) * pitch, 0), fx = W / 2 + p[0], fy = H / 2 + p[1];
            if (slots[i]) {
                var T = la2_txt(ctx, la2_brk(slots[i], v ? 6 : 4), { font: font, size: fsz, lead: 1.1, color: tcol, x: fx, y: fy });
                bb = jzUnion(bb, jzBB(T));
                kids.push(T); lyr.push([T, 0.15 * i / stag]);
            } else {
                var r = Math.min(fwX, fhY) * 0.3, Ld = jzShapeLayer(ctx, 'leader', fx, fy);
                var g1 = jzGrp(Ld, 'ring'); jzAddEllipse(g1, r * 2, r * 2); jzAddStroke(g1, sc.sub, 1.5 * ctx.u, 50);
                var g2 = jzGrp(Ld, 'cross'); jzAddPath(g2, [[-r * 1.4, 0], [r * 1.4, 0]], false); jzAddPath(g2, [[0, -r * 1.4], [0, r * 1.4]], false); jzAddStroke(g2, sc.sub, 1.2 * ctx.u, 40);
                la2_op(ctx, Ld, laE);
                var Tn = jzText(ctx, String(i === 0 ? 3 : 1), { font: font, size: r * 1.1, color: sc.sub, x: fx, y: fy, opacity: 0.6 });
                la2_op(ctx, Tn, laE);
                kids.push(Ld, Tn);
            }
        }
        for (i = 0; i < kids.length; i++) kids[i].parent = S;   // parent first, then every transform expression
        jzXf(S, 'ADBE Rotate Z').setValue(jzP(ctx, 'tilt', 0));
        var offE = hd + 'var off=(1-oe(time/0.6))*' + jzN(A * 0.9 * dir) + '-ie(PO)*' + jzN(A * 1.4 * dir) + '+(time-DUR/2)*' + jzN(u * 0.03 * dir) + ';';
        jzSetExpr(jzXf(S, 'ADBE Anchor Point'), offE + (v ? '[value[0],value[1]-off]' : '[value[0]-off,value[1]]'));
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + 'value*' + faE);
        for (i = 0; i < lyr.length; i++) jzAnimate(ctx, lyr[i][0], { mi: lyr[i][1] });
        S.moveToEnd();
        return bb || la2_bb(W / 2 - fwX * 1.6 / 2, H / 2 - fhY / 2, W / 2 + fwX * 1.6 / 2, H / 2 + fhY / 2);
    }
});

/* ---------------------------------------------------------------- 23 quote — 引用 */
jzReg('layout', 'quote', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), markFont: rng.pick(jzFontsOf(st, ['serif'])), marks: /[A-Za-z]/.test(cut.text) ? 'latin' : rng.pick(['kagi', 'double', 'kagi']), markC: rng.pick(['accent', 'sub']), attrib: rng.chance(0.75) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx);
        var attrib = jzP(ctx, 'attrib', true), hd = la2_hd(ctx);
        var L = la2_txt(ctx, la2_brk(c.text, port ? 6 : 11), { font: jzFontOf(ctx, 'font', 'serif'), size: 100, color: sc.fg, x: W / 2, y: H / 2, track: 0.04, lead: 1.25, maxW: W * (port ? 0.58 : 0.62), maxH: H * 0.4, maxSize: u * 0.16 });
        var size = jzFontSize(L), sz = jzSize(L), mw = sz[0], mh = sz[1], cy = H / 2 - (attrib ? size * 0.25 : 0);
        jzXf(L, 'ADBE Position').setValue([W / 2, cy]);
        var bx0 = W / 2 - mw / 2, bx1 = W / 2 + mw / 2, by0 = cy - mh / 2, by1 = cy + mh / 2;
        var mc = jzP(ctx, 'markC', 'accent') === 'accent' ? sc.accent : sc.sub, marks = jzP(ctx, 'marks', 'kagi'), latin = marks === 'latin';
        var o1 = latin ? '“' : marks === 'double' ? '『' : '「', c1 = latin ? '”' : marks === 'double' ? '』' : '」';
        var mf = jzFontOf(ctx, 'markFont', 'serif');
        // big quotation marks: placed by their ink boxes, fly in diagonally from far away
        var Mo = jzText(ctx, o1, { font: mf, size: 100, color: mc, x: 0, y: 0 }), Mc = jzText(ctx, c1, { font: mf, size: 100, color: mc, x: 0, y: 0 });
        var gap = size * 0.2, inkW = jzClamp(Math.max(jzRect(Mo).width, jzRect(Mc).width) / 100, 0.05, 0.55);   // ink width in em (capped: some renderers report the advance)
        var ms = Math.min(Math.max(size * (latin ? 3.2 : 4), mh * 1.8), u * 0.5, (W * 0.94 - mw - gap * 2) / (2 * inkW));
        jzTextDoc(Mo, function (td) { td.fontSize = ms; }); jzTextDoc(Mc, function (td) { td.fontSize = ms; });
        var ra = jzRect(Mo), rb = jzRect(Mc);
        jzXf(Mo, 'ADBE Anchor Point').setValue([ra.left + ra.width, ra.top]); jzXf(Mo, 'ADBE Position').setValue([bx0 - gap, by0 - size * 0.1]);
        if (latin) { jzXf(Mc, 'ADBE Anchor Point').setValue([rb.left, rb.top]); jzXf(Mc, 'ADBE Position').setValue([bx1 + gap, by1 - size * 0.95]); }
        else { jzXf(Mc, 'ADBE Anchor Point').setValue([rb.left, rb.top + rb.height]); jzXf(Mc, 'ADBE Position').setValue([bx1 + gap, by1 + size * 0.1]); }
        var eM = hd + 'var e=oe((time-0.02)/0.5)*(1-ic(PO));var f=' + jzN(u * 0.35) + '*(1-e);';
        jzSetExpr(jzXf(Mo, 'ADBE Position'), eM + '[value[0]-f,value[1]-f*0.6]');
        jzSetExpr(jzXf(Mc, 'ADBE Position'), eM + '[value[0]+f,value[1]+f*0.6]');
        jzSetExpr(jzXf(Mo, 'ADBE Opacity'), eM + 'value*cl(e*1.5)'); jzSetExpr(jzXf(Mc, 'ADBE Opacity'), eM + 'value*cl(e*1.5)');
        Mo.moveAfter(L); Mc.moveAfter(L); la2_ng([Mo, Mc]);
        // attribution: — ROMAJI / No.xx
        if (attrib) {
            var ls = jzSmallSize(ctx), body = jzBodyF(ctx), at = jzRomajiOf(ctx) || 'No.' + jzLineNo(ctx), ay = by1 + size * 0.95;
            var aw = Math.min(W * 0.4, la2_width(ctx, '— ' + at, body, ls, 0.12));
            la2_io(ctx, jzText(ctx, at, { font: body, size: ls, track: 0.12, color: sc.sub, x: W / 2, y: ay }), 0.35, 0.4, 0, 0, 1);
            la2_io(ctx, jzPathLayer(ctx, 'attribution dash', [[W / 2 - aw / 2 - ls * 2, ay], [W / 2 - aw / 2 - ls * 0.8, ay]], mc, { width: 1.5 * ctx.u }), 0.35, 0.4, 0, 0, 1);
        }
        jzAnimate(ctx, L, { mi: 0 });
        return la2_bb(bx0, by0, bx1, by1);
    }
});

/* ---------------------------------------------------------------- 24 ruler — 寸法線 */
function la2_arrow(g, s, dir) {       // arrow head with its tip at the group origin; dir: 'l' 'r' 'u' 'd'
    var p = dir === 'r' ? [[0, 0], [-s, -s * 0.35], [-s, s * 0.35]] : dir === 'l' ? [[0, 0], [s, -s * 0.35], [s, s * 0.35]] : dir === 'u' ? [[0, 0], [-s * 0.35, s], [s * 0.35, s]] : [[0, 0], [-s * 0.35, -s], [s * 0.35, -s]];
    jzAddPath(g, p, true);
}
jzReg('layout', 'ruler', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif', 'body'])), dims: rng.pick(['topRight', 'bottomLeft']), ticks: rng.chance(0.7), guides: rng.chance(0.8), unit: rng.pick(['px', 'pt', 'px']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i;
        var font = jzFontOf(ctx, 'font', 'display'), text = la2_brk(c.text, port ? 6 : 12);
        var L = la2_txt(ctx, text, { font: font, size: 100, color: sc.fg, x: W / 2, y: H / 2, track: 0.04, lead: 1.15, maxW: W * 0.66, maxH: H * 0.34, maxSize: u * 0.19 });
        var size = jzFontSize(L), sz = jzSize(L), mw = sz[0], mh = sz[1], cx = W / 2, cy = H / 2;
        var x0 = cx - mw / 2, x1 = cx + mw / 2, y0 = cy - mh / 2, y1 = cy + mh / 2;
        var eX = la2_hd(ctx) + 'var e=ioc((time-0.08)/0.75)*K;';
        var lw = Math.max(1.2 * ctx.u, u * 0.0016), ls = jzSmallSize(ctx) * 0.9, ah = ls * 0.7, top = jzP(ctx, 'dims', 'topRight') === 'topRight';
        var unit = jzP(ctx, 'unit', 'px'), mono = jzMonoF(ctx);
        // dashed guides through the text's edges, growing from the centre
        if (jzP(ctx, 'guides', true)) {
            var G = jzNoGhost(jzShapeLayer(ctx, 'guides', 0, 0)), gg = jzGrp(G, 'guides'), gx = W * 0.47, gy = H * 0.47;
            jzAddPath(gg, [[x0, cy], [x0, cy - gy]], false); jzAddPath(gg, [[x0, cy], [x0, cy + gy]], false);
            jzAddPath(gg, [[x1, cy], [x1, cy - gy]], false); jzAddPath(gg, [[x1, cy], [x1, cy + gy]], false);
            jzAddPath(gg, [[cx, y0], [cx - gx, y0]], false); jzAddPath(gg, [[cx, y0], [cx + gx, y0]], false);
            jzAddPath(gg, [[cx, y1], [cx - gx, y1]], false); jzAddPath(gg, [[cx, y1], [cx + gx, y1]], false);
            var gs = jzAddStroke(gg, sc.sub, 1 * ctx.u, 35);
            la2_dash(gs, 8 * ctx.u, 8 * ctx.u);
            jzAddTrimPaths(gg, eX + '100*e');
        }
        // dimension lines with arrow heads (width above / below, height at the side)
        var D = jzNoGhost(jzShapeLayer(ctx, 'dimensions', 0, 0));
        var dy = top ? y0 - size * 0.55 : y1 + size * 0.55, ext = top ? -1 : 1, dx = top ? x1 + size * 0.5 : x0 - size * 0.5, ex = top ? 1 : -1;
        var ga = jzGrp(D, 'arrows'), arr = [['l', cx, dy, '[' + jzN(cx) + '-' + jzN(mw / 2) + '*e,' + jzN(dy) + ']'], ['r', cx, dy, '[' + jzN(cx) + '+' + jzN(mw / 2) + '*e,' + jzN(dy) + ']'],
            ['u', dx, cy, '[' + jzN(dx) + ',' + jzN(cy) + '-' + jzN(mh / 2) + '*e]'], ['d', dx, cy, '[' + jzN(dx) + ',' + jzN(cy) + '+' + jzN(mh / 2) + '*e]']];
        for (i = 0; i < 4; i++) { var gai = la2_sub(ga, 'arrow'); la2_arrow(gai, ah, arr[i][0]); jzAddFill(gai, sc.sub); la2_gxp(gai, eX + arr[i][3]); }
        var gdl = jzGrp(D, 'dimension lines');
        jzAddPath(gdl, [[cx, dy], [x0, dy]], false); jzAddPath(gdl, [[cx, dy], [x1, dy]], false);
        jzAddPath(gdl, [[dx, cy], [dx, y0]], false); jzAddPath(gdl, [[dx, cy], [dx, y1]], false);
        jzAddStroke(gdl, sc.sub, lw); jzAddTrimPaths(gdl, eX + '100*e');
        var gxl = jzGrp(D, 'extension lines'), ey = top ? y0 - size * 0.08 : y1 + size * 0.08, exx = top ? x1 + size * 0.08 : x0 - size * 0.08;
        jzAddPath(gxl, [[x0, ey], [x0, dy + ext * ls * 0.6]], false); jzAddPath(gxl, [[x1, ey], [x1, dy + ext * ls * 0.6]], false);
        jzAddPath(gxl, [[exx, y0], [dx + ex * ls * 0.6, y0]], false); jzAddPath(gxl, [[exx, y1], [dx + ex * ls * 0.6, y1]], false);
        jzAddStroke(gxl, sc.sub, lw, 80);
        jzSetExpr(jzXf(D, 'ADBE Opacity'), eX + 'e>0.0005?value:0');
        // counting labels
        var labs = [[Math.round(mw) + ' ' + unit, cx, dy + ext * ls * 0.95, 0, mw], [Math.round(mh) + ' ' + unit, dx + ex * ls * 1.1, cy, top ? 90 : -90, mh]];
        for (i = 0; i < 2; i++) {
            var Tl = jzText(ctx, labs[i][0], { font: mono, size: ls, track: 0.08, color: sc.accent, x: labs[i][1], y: labs[i][2], rot: labs[i][3] });
            try { Tl.property('ADBE Text Properties').property('ADBE Text Document').expression = eX + 'Math.round(' + jzN(labs[i][4]) + '*e)+" ' + unit + '"'; } catch (e1) { jzWarn('ruler label: ' + e1.toString()); }
            jzSetExpr(jzXf(Tl, 'ADBE Opacity'), eX + 'value*cl(e*2-0.3)'); jzNoGhost(Tl);
        }
        // glyph ticks under the last line (top) / over the first line (bottom) + glyph count
        if (jzP(ctx, 'ticks', true)) {
            var lines = la2_lines(text), ln = top ? lines[lines.length - 1] : lines[0], nl = Math.max(1, jzChars(ln).length);
            var lwid = la2_width(ctx, ln, font, size, 0.04), lx0 = cx - lwid / 2, lx1 = cx + lwid / 2;
            var ty = top ? y1 + size * 0.28 : y0 - size * 0.28, sg = top ? 1 : -1;
            var Tk = jzShapeLayer(ctx, 'glyph ticks', 0, 0), gbl = jzGrp(Tk, 'base');
            jzAddPath(gbl, [[lx0, ty], [lx1, ty]], false); jzAddStroke(gbl, sc.sub, lw, 70); jzAddTrimPaths(gbl, eX + '100*e');
            var gtk = jzGrp(Tk, 'ticks'); jzAddPath(gtk, [[lx0, ty], [lx0, ty + sg * ls * 0.5]], false); jzAddStroke(gtk, sc.sub, lw);
            var rp = jzVecs(gtk).addProperty('ADBE Vector Filter - Repeater');
            jzSetExpr(rp.property('ADBE Vector Repeater Copies'), eX + 'e<=0?0:Math.min(' + (nl + 1) + ',Math.floor(e*' + nl + '+0.0001)+1)');
            rp.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([(lx1 - lx0) / nl, 0]);
            jzSetExpr(jzXf(Tk, 'ADBE Opacity'), eX + 'value*cl(e*1.6-0.4)');
            var Tn = jzText(ctx, 'n=' + jzCount(c.text), { font: mono, size: ls, track: 0.08, color: sc.sub, x: top ? lx0 : lx1, y: ty + sg * ls * 1.4, align: top ? 'left' : 'right' });
            jzSetExpr(jzXf(Tn, 'ADBE Opacity'), eX + 'value*cl(e*1.6-0.4)'); la2_ng([Tk, Tn]);
        }
        L.moveToBeginning();
        jzAnimate(ctx, L, { mi: 0 });
        return jzBB(L);
    }
});

/* ---------------------------------------------------------------- 25 searchBar — 検索窓 */
// left-aligned text whose anchor is the line start at em-middle height (baseline-stable, leading spaces kept)
function la2_run(ctx, str, o) {
    var q = jzCopy(o); q.align = 'left';
    var L = jzText(ctx, str, q);
    jzXf(L, 'ADBE Anchor Point').setValue([0, -0.36 * (o.size || 100)]);
    return L;
}
function la2_magnifier(g, x, y, r, col, lw, op) {     // lens + handle (sub-groups of g)
    var a = la2_sub(g, 'lens'); jzAddEllipse(a, r * 1.24, r * 1.24, x - r * 0.15, y - r * 0.15); jzAddStroke(a, col, lw, op);
    var b = la2_sub(g, 'handle'); jzAddPath(b, [[x + r * 0.3, y + r * 0.3], [x + r * 0.8, y + r * 0.8]], false); jzAddStroke(b, col, lw * 1.2, op);
}
jzReg('layout', 'searchBar', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['body', 'display'])), shape: rng.pick(['pill', 'rect']), fill: rng.pick(['outline', 'filled']), sugg: rng.int(3, 4), pos: rng.pick(['center', 'upper']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i;
        var text = jzTrim(c.text), font = jzFontOf(ctx, 'font', 'body'), bw = W * (port ? 0.9 : 0.7);
        var ts = Math.min(la2_fitSize(ctx, text, font, bw - u * 0.22, u * 0.11, { track: 0.02 }), u * 0.095);
        var bh = ts * 2.1, rad = jzP(ctx, 'shape', 'pill') === 'pill' ? bh / 2 : bh * 0.16, by = H * (jzP(ctx, 'pos', 'center') === 'upper' ? 0.28 : 0.38);
        var filled = jzP(ctx, 'fill', 'outline') === 'filled', plate = sc.ink, tc = filled ? la2_onCol(sc, plate) : sc.fg, hd = la2_hd(ctx);
        var eW = hd + 'var e=oe(time/0.45)*K;var w=' + jzN(bw) + '*(0.3+0.7*e);';
        // the search box grows from 30 % to full width; lens rides the left end, the clear mark the right end
        var B = jzNoGhost(jzShapeLayer(ctx, 'search box', W / 2, by));
        var gm = jzGrp(B, 'lens'); la2_magnifier(gm, 0, 0, ts * 0.55, tc, Math.max(2 * ctx.u, ts * 0.06)); la2_gxp(gm, eW + '[-w/2+' + jzN(bh * 0.5) + ',0]');
        var gx = jzGrp(B, 'clear'), q = ts * 0.2; jzAddPath(gx, [[-q, -q], [q, q]], false); jzAddPath(gx, [[-q, q], [q, -q]], false); jzAddStroke(gx, tc, Math.max(1.5 * ctx.u, ts * 0.04), 60);
        la2_gxp(gx, eW + '[w/2-' + jzN(bh * 0.45) + ',0]');
        var gb = jzGrp(B, 'box'), rr = jzAddRect(gb, bw, bh, rad);
        jzSetExpr(rr.property('ADBE Vector Rect Size'), eW + '[w,' + jzN(bh) + ']');
        if (filled) jzAddFill(gb, plate); else jzAddStroke(gb, sc.fg, Math.max(2 * ctx.u, ts * 0.05));
        jzSetExpr(jzXf(B, 'ADBE Opacity'), eW + 'value*e');
        // the query (typed when the cut has no entrance of its own) + blinking caret
        var tx = W / 2 - bw / 2 + bh * 0.95;
        var L = jzText(ctx, text, { font: font, size: ts, track: 0.02, color: tc, x: tx, y: by, align: 'left' });
        var tw = jzSize(L)[0];
        jzAnimate(ctx, L, { mi: 0, enter: c.enter === 'cut' ? 'type' : undefined });
        var typed = (c.enter === 'cut' || c.enter === 'type') ? (c.inDur || 0.3) + 0.05 : (c.inDur || 0.3);
        var Cr = jzRectLayer(ctx, 'caret', tx + tw + ts * 0.12 + Math.max(2 * ctx.u, ts * 0.06) / 2, by, Math.max(2 * ctx.u, ts * 0.06), ts * 1.1, sc.accent);
        jzNoGhost(Cr);
        jzSetExpr(jzXf(Cr, 'ADBE Opacity'), hd + '(time>' + jzN(typed) + '&&K>0.5&&Math.floor(time*12)%2===0)?value:0');
        // suggestion panel drops open after typing; rows fade in one by one
        var rom = jzHasLatin(text) ? null : jzRomaji(jzStrip(text));
        var rows = [text + ' lyrics', c.lineText && jzStrip(c.lineText) !== jzStrip(text) ? c.lineText : text + ' meaning', rom ? rom.toLowerCase() : text + ' mv', text + ' cover'].slice(0, jzClamp(jzP(ctx, 'sugg', 3), 1, 4));
        var rs = ts * 0.52, rh = rs * 2.4, py = by + bh / 2 + rs * 0.8, t0 = Math.max(0.3, typed), ph = rows.length * rh + rs * 0.6;
        var pE = hd + 'var pa=oc((time-' + jzN(t0) + ')/0.3)*K;';
        var Pn = jzNoGhost(jzShapeLayer(ctx, 'suggestions', W / 2, py)), rowC = filled ? la2_onCol(sc, plate) : sc.sub;
        for (i = 0; i < rows.length; i++) {
            var y = rs * 0.3 + (i + 0.5) * rh, aE = pE + 'var a=cl((time-' + jzN(t0 + 0.05 + i * 0.07) + ')/0.2)*K;a=' + jzN((i + 1) * rh) + '>' + jzN(ph) + '*pa+0.5?0:a;';
            var gr = jzGrp(Pn, 'row ' + (i + 1)); la2_magnifier(gr, -bw / 2 + bh * 0.5, y, rs * 0.7, rowC, 1.5 * ctx.u, 70); la2_gxo(gr, aE + '100*a');
            var rt = rows[i], pre = rt.indexOf(text) === 0 ? text : '', rest = rt.substr(pre.length), xt = tx, pw = 0;
            if (pre) { var Tp = la2_run(ctx, pre, { font: font, size: rs, track: 0.02, color: filled ? rowC : sc.fg, x: xt, y: py + y }); var rp = jzRect(Tp); pw = rp.left + rp.width + rs * 0.02; jzSetExpr(jzXf(Tp, 'ADBE Opacity'), aE + 'value*a'); jzNoGhost(Tp); }
            if (rest) { var Tr = la2_run(ctx, rest, { font: jzBodyF(ctx), size: rs, track: 0.02, color: rowC, x: xt + pw, y: py + y, opacity: filled ? 0.65 : 1 }); jzSetExpr(jzXf(Tr, 'ADBE Opacity'), aE + 'value*a'); jzNoGhost(Tr); }
        }
        var gp = jzGrp(Pn, 'panel'), pr = jzAddRect(gp, bw, ph, bh * 0.16);
        jzSetExpr(pr.property('ADBE Vector Rect Size'), pE + '[' + jzN(bw) + ',Math.max(0.1,' + jzN(ph) + '*pa)]');
        jzSetExpr(pr.property('ADBE Vector Rect Position'), pE + '[0,' + jzN(ph) + '*pa/2]');
        if (filled) jzAddFill(gp, plate, 90); else jzAddStroke(gp, sc.sub, 1.2 * ctx.u, 90);
        la2_gxo(gp, pE + '100*pa');
        Pn.moveAfter(B);
        return la2_bb(W / 2 - bw / 2, by - bh / 2, W / 2 + bw / 2, by + bh / 2);
    }
});

/* ---------------------------------------------------------------- 26 chat — チャット */
jzReg('layout', 'chat', {
    plan: function (rng, cut, st) {
        var nw = jzChunk(cut.text).length;
        return { msgs: cut.n <= 4 ? [jzTrim(cut.text)] : la2_splitK(cut.text, jzClamp(nw, 2, cut.n > 12 ? 4 : 3)), font: rng.pick(jzFontsOf(st, ['body', 'display'])), side0: rng.pick([1, -1]), alt: rng.chance(0.55) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, j;
        var msgs = jzP(ctx, 'msgs', null);
        if (!msgs || !msgs.length) msgs = [jzTrim(c.text)];
        var font = jzFontOf(ctx, 'font', 'body'), side0 = jzP(ctx, 'side0', 1) < 0 ? -1 : 1, alt = jzP(ctx, 'alt', false);
        var colW = W * (port ? 0.86 : W / H < 1.5 ? 0.66 : 0.52), maxW = colW * 0.8;
        var sentC = sc.accent, recvC = sc.ink !== sc.accent ? sc.ink : sc.sub;
        var list = [];
        if (msgs.length === 1) list.push({ typing: true, side: -side0 });
        for (i = 0; i < msgs.length; i++) list.push({ t: jzTrim(msgs[i]), side: alt ? (i % 2 ? -side0 : side0) : side0 });
        var nL = list.length, fs = Math.min(u * 0.088, H * 0.62 / (nL * 2.2)), longest = 1;
        for (i = 0; i < nL; i++) if (!list[i].typing) longest = Math.max(longest, jzCount(list[i].t));
        fs = Math.max(Math.min(fs, (maxW - fs * 1.4) / (longest * 1.02)), fs * 0.62);
        var lines = [];
        for (i = 0; i < nL; i++) lines.push(list[i].typing ? '' : la2_brk(list[i].t, Math.max(3, Math.floor(maxW / (fs * 1.02)))));
        for (i = 0; i < nL; i++) if (lines[i]) fs = Math.min(fs, la2_fitSize(ctx, lines[i], font, maxW - fs * 1.4, H * 0.3, { lead: 1.25 }));
        var pad = fs * 0.62, sp = fs * 0.45, dims = [], texts = [];
        for (i = 0; i < nL; i++) {
            if (list[i].typing) { dims.push([fs * 3, fs * 1.9]); texts.push(null); continue; }
            var T = la2_txt(ctx, lines[i], { font: font, size: fs, lead: 1.25, color: '#FFFFFF', x: 0, y: 0 }), s = jzSize(T);
            dims.push([s[0] + pad * 2, s[1] + pad * 1.45]); texts.push(T);
        }
        var gap = Math.min(0.3, Math.max(0.12, c.dur * 0.45 / nL));
        function tAt(k) { return list[0].typing ? (k === 0 ? 0 : 0.35 + (k - 1) * gap) : k * gap; }
        var stag = Math.max(0.01, c.stagger || 0.04), bottom = H * (port ? 0.78 : 0.8), hd = la2_hd(ctx), bb = null;
        for (i = 0; i < nL; i++) {
            var q = list[i], bw = dims[i][0], bh = dims[i][1], right = q.side > 0;
            var x0 = right ? W / 2 + colW / 2 - bw : W / 2 - colW / 2, y1 = bottom, y0 = y1 - bh;
            var col = right ? sentC : recvC, tc = la2_onCol(sc, col), px = right ? x0 + bw : x0, py = y1;
            // bubble: pops from its tail corner, pushed up by every later bubble
            var Bu = jzNoGhost(jzShapeLayer(ctx, q.typing ? 'typing' : 'bubble ' + (i + 1), px, py));
            if (q.typing) {
                for (j = 0; j < 3; j++) {
                    var gd = jzGrp(Bu, 'dot'); jzAddEllipse(gd, fs * 0.32, fs * 0.32, x0 + bw / 2 + (j - 1) * fs * 0.62 - px, y0 + bh / 2 - py); jzAddFill(gd, tc);
                    var phE = 'var ph=Math.sin(time*9-' + jzN(j * 0.9) + ')*0.5+0.5;';
                    la2_gxp(gd, phE + '[0,-ph*' + jzN(fs * 0.12) + ']'); la2_gxo(gd, phE + '(0.45+ph*0.5)*100');
                }
            }
            var gt = jzGrp(Bu, 'tail'), tail = right ? [[x0 + bw - fs * 0.5, y1 - fs * 0.3], [x0 + bw + fs * 0.28, y1 + fs * 0.05], [x0 + bw - fs * 0.1, y1 - fs * 0.8]] : [[x0 + fs * 0.5, y1 - fs * 0.3], [x0 - fs * 0.28, y1 + fs * 0.05], [x0 + fs * 0.1, y1 - fs * 0.8]];
            for (j = 0; j < 3; j++) { tail[j][0] -= px; tail[j][1] -= py; }
            jzAddPath(gt, tail, true); jzAddFill(gt, col);
            var gbx = jzGrp(Bu, 'bubble'); jzAddRect(gbx, bw, bh, Math.min(bh / 2, fs * 0.9), x0 + bw / 2 - px, y0 + bh / 2 - py); jzAddFill(gbx, col);
            var lift = 'var l=0;', lf = 0;
            for (j = i + 1; j < nL; j++) { lift += 'l+=' + jzN(dims[j][1] + sp) + '*oe((time-' + jzN(tAt(j)) + ')/0.28);'; lf += dims[j][1] + sp; }
            bb = jzUnion(bb, la2_bb(x0, y0 - lf, x0 + bw, y1 - lf));
            var Tx = texts[i];
            if (Tx) {
                jzTextDoc(Tx, function (td) { td.fillColor = jzHex(tc); });
                jzXf(Tx, 'ADBE Position').setValue([x0 + bw / 2, y0 + bh / 2]);
                Tx.moveBefore(Bu);
                Tx.parent = Bu;                                 // parent before any transform expression exists
            }
            jzSetExpr(jzXf(Bu, 'ADBE Position'), hd + lift + '[value[0],value[1]-l]');
            jzSetExpr(jzXf(Bu, 'ADBE Scale'), hd + 'var q=(time-' + jzN(tAt(i)) + ')/0.25;var s=q<0?0:ob(cl(q),1.6)*K*100;[s,s]');
            if (Tx) jzAnimate(ctx, Tx, { mi: tAt(i) / stag });
            if (i === nL - 1) {
                var ms = Math.max(11 * ctx.u, fs * 0.36);
                var Ts = jzText(ctx, (right ? 'Read ' : '') + jzFmtTime(c.start).substr(0, 5), { font: jzMonoF(ctx), size: ms, color: sc.sub, x: right ? x0 + bw : x0, y: y1 + ms * 1.4, align: right ? 'right' : 'left' });
                jzSetExpr(jzXf(Ts, 'ADBE Opacity'), hd + '(time>' + jzN(tAt(i) + 0.11) + '?value:0)*K'); jzNoGhost(Ts);
            }
        }
        return bb;
    }
});

/* ---------------------------------------------------------------- 27 notification — 通知 */
jzReg('layout', 'notification', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['body', 'display'])), pos: rng.pick(['banner', 'lock', 'center']), stack: rng.chance(0.5), app: rng.pick(['MUSIC', 'LYRICS', 'MESSAGE']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i;
        var text = jzTrim(c.text), n = jzCount(text), font = jzFontOf(ctx, 'font', 'body'), pos = jzP(ctx, 'pos', 'banner'), mono = jzMonoF(ctx), hd = la2_hd(ctx);
        var cw = W * (port ? 0.9 : W / H < 1.5 ? 0.66 : 0.54), pd = cw * 0.05, hs = Math.max(12 * ctx.u, cw * 0.032);
        var plate = sc.ink, tc = la2_onCol(sc, plate), x0 = W / 2 - cw / 2;
        var mt = text, ms = Math.min(la2_fitSize(ctx, mt, font, cw - pd * 2, u * 0.11, { track: 0.02 }), u * 0.095);
        if (ms < u * 0.07 && n > 5) { mt = la2_brk(text, Math.ceil(n / 2)); ms = Math.min(la2_fitSize(ctx, mt, font, cw - pd * 2, u * 0.2, { track: 0.02, lead: 1.3 }), u * 0.085); }
        var L = la2_txt(ctx, mt, { font: font, size: ms, track: 0.02, lead: 1.3, color: tc, x: x0 + pd, y: 0, align: 'left' });
        var msz = jzSize(L), headH = hs * 2.2, titleH = hs * 1.9, ch = pd + headH + titleH + msz[1] + pd * 1.1;
        var clockY = H * (port ? 0.2 : 0.22), cs = Math.min(u * 0.2, H * 0.2);
        if (pos === 'lock') {
            var hh = jzPad(Math.floor(c.start / 60) % 24 || 12, 2), mi2 = jzPad(Math.floor(c.start) % 60, 2);
            la2_io(ctx, jzText(ctx, hh + ':' + mi2, { font: jzFontsOf(ctx.st, ['display'])[0], size: cs, track: 0.02, color: sc.sub, x: W / 2, y: clockY }), 0, 0.5, 0, 0, 0.8);
            la2_io(ctx, jzText(ctx, 'LINE ' + jzLineNo(ctx) + '  ·  ' + jzFmtTime(c.start), { font: mono, size: hs, track: 0.2, color: sc.sub, x: W / 2, y: clockY - cs * 0.62 }), 0, 0.5, 0, 0, 0.8);
        }
        var target = pos === 'banner' ? H * 0.06 : pos === 'lock' ? clockY + cs * 0.75 : H / 2 - ch / 2;
        // the card (origin = its top centre) drops in from above the frame and slides back out
        var Cd = jzNoGhost(jzShapeLayer(ctx, 'notification card', W / 2, target));
        var iy = pd + headH / 2 - hs * 0.2, isz = hs * 1.7, ix = x0 + pd + isz / 2 - W / 2, s = isz * 0.8, nc = la2_onCol(sc, sc.accent);
        var gn = jzGrp(Cd, 'note');
        var gn1 = la2_sub(gn, 'head'); jzAddEllipse(gn1, s * 0.34, s * 0.34, ix - s * 0.18, iy + s * 0.2); jzAddFill(gn1, nc);
        var gn2 = la2_sub(gn, 'stem'); jzAddRect(gn2, s * 0.07, s * 0.52, 0, ix - s * 0.03 + s * 0.035, iy - s * 0.32 + s * 0.26); jzAddFill(gn2, nc);
        var gn3 = la2_sub(gn, 'flag'); jzAddPath(gn3, [[ix + s * 0.04, iy - s * 0.32], [ix + s * 0.3, iy - s * 0.18], [ix + s * 0.04, iy - s * 0.12]], true); jzAddFill(gn3, nc);
        var gi = jzGrp(Cd, 'app icon'); jzAddRect(gi, isz, isz, isz * 0.24, ix, iy); jzAddFill(gi, sc.accent);
        var gc = jzGrp(Cd, 'card'); jzAddRect(gc, cw, ch, pd * 0.9, 0, ch / 2); jzAddFill(gc, plate, 96);
        if (jzP(ctx, 'stack', false)) { var gs = jzGrp(Cd, 'stacked'); jzAddRect(gs, cw * 0.92, pd * 1.4, pd * 0.7, 0, ch - pd * 0.4 + pd * 0.7); jzAddFill(gs, plate, 45); }
        Cd.moveAfter(L);
        var kids = [];
        kids.push(jzText(ctx, jzP(ctx, 'app', 'MUSIC'), { font: mono, size: hs, track: 0.15, color: tc, x: x0 + pd + isz + hs * 0.7, y: target + iy, align: 'left', opacity: 0.6 }));
        kids.push(jzText(ctx, 'now', { font: mono, size: hs, track: 0.1, color: tc, x: x0 + cw - pd, y: target + iy, align: 'right', opacity: 0.5 }));
        var ty = target + pd + headH + titleH / 2;
        kids.push(jzText(ctx, jzRomajiOf(ctx) || 'No.' + jzLineNo(ctx), { font: jzBodyF(ctx), size: hs * 1.15, track: 0.06, color: tc, x: x0 + pd, y: ty, align: 'left', opacity: 0.9 }));
        la2_ng(kids);
        var my = ty + titleH / 2 + msz[1] / 2;
        jzXf(L, 'ADBE Position').setValue([x0 + pd, my]);
        kids.push(L);
        for (i = 0; i < kids.length; i++) kids[i].parent = Cd;   // parent first, then the transform expressions
        var D = target + ch + 30 * ctx.u;
        jzSetExpr(jzXf(Cd, 'ADBE Position'), hd + 'var eIn=ob(cl(time/0.45),1.1),eO=ic(PO);[value[0],value[1]-(1-eIn)*' + jzN(D) + '-eO*' + jzN(D) + ']');
        jzAnimate(ctx, L, { mi: 0 });
        return la2_bb(x0 + pd, my - msz[1] / 2, x0 + pd + msz[0], my + msz[1] / 2);
    }
});

/* ---------------------------------------------------------------- 28 ticket — チケット */
function la2_ticketParts(x0, y0, w, h, px, nr, r) {
    var seg = 8, x1 = x0 + w, y1 = y0 + h;
    function arc(cx, cy, rr, a0, a1, out) { for (var i = 0; i <= seg; i++) { var a = (a0 + (a1 - a0) * i / seg) * Math.PI / 180; out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } }
    var main = [], stub = [];
    arc(x0 + r, y0 + r, r, 180, 270, main); main.push([px - nr, y0]); arc(px, y0, nr, 180, 90, main); main.push([px, y1 - nr]); arc(px, y1, nr, 270, 180, main); arc(x0 + r, y1 - r, r, 90, 180, main);
    stub.push([px + nr, y0]); arc(x1 - r, y0 + r, r, 270, 360, stub); arc(x1 - r, y1 - r, r, 0, 90, stub); stub.push([px + nr, y1]); arc(px, y1, nr, 360, 270, stub); stub.push([px, y0 + nr]); arc(px, y0, nr, 90, 0, stub);
    return { main: main, stub: stub };
}
jzReg('layout', 'ticket', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), fill: rng.pick(['accent', 'ink', 'outline']), tilt: rng.range(-5, 5), label: rng.pick(['ADMIT ONE', 'LIVE', 'TICKET']), serial: rng.int(1, 999999) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = jzPortrait(ctx), i;
        var tw = Math.min(W * (port ? 0.9 : 0.74), H * 1.9), th = Math.min(tw * (port ? 0.46 : 0.38), H * 0.5);
        var stubW = tw * 0.22, px0 = tw / 2 - stubW, nr = th * 0.075, r = th * 0.05;
        var fill = jzP(ctx, 'fill', 'accent'), outline = fill === 'outline', plate = fill === 'accent' ? sc.accent : sc.ink;
        var tc = outline ? sc.fg : la2_onCol(sc, plate), lc = outline ? sc.sub : tc, serial = Math.round(jzP(ctx, 'serial', 1234)), label = jzP(ctx, 'label', 'TICKET');
        var cx = W / 2, cy = H / 2, mono = jzMonoF(ctx), lwO = Math.max(2 * ctx.u, th * 0.012);
        var TP = la2_ticketParts(-tw / 2, -th / 2, tw, th, px0, nr, r);
        var eH = la2_hd(ctx) + 'var eIn=ob(cl(time/0.5),1.2),eO=ic(PO),a=cl(eIn*3)*(1-eO);';
        // ticket body: rises from below with a swing, settles at its tilt
        var Tk = jzNoGhost(jzShapeLayer(ctx, 'ticket', cx, cy));
        var gl = jzGrp(Tk, 'rules'), mx0 = -tw / 2 + th * 0.12, mx1 = px0 - th * 0.12;
        jzAddPath(gl, [[mx0, -th / 2 + th * 0.24], [mx1, -th / 2 + th * 0.24]], false); jzAddPath(gl, [[mx0, th / 2 - th * 0.24], [mx1, th / 2 - th * 0.24]], false); jzAddStroke(gl, lc, 1.2 * ctx.u, 60);
        var gp = jzGrp(Tk, 'perforation'), pn = Math.max(1, Math.ceil((th - nr * 3.2) / (th * 0.05)));
        jzAddRect(gp, 2.5 * ctx.u, th * 0.025, 0, px0 + 0.25 * ctx.u, -th / 2 + nr * 1.6 + th * 0.0125); jzAddFill(gp, lc, 70);
        var rpp = jzVecs(gp).addProperty('ADBE Vector Filter - Repeater');
        rpp.property('ADBE Vector Repeater Copies').setValue(pn);
        rpp.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([0, th * 0.05]);
        var gmn = jzGrp(Tk, 'ticket'); jzAddPath(gmn, TP.main, true);
        if (outline) jzAddStroke(gmn, sc.fg, lwO); else jzAddFill(gmn, plate);
        // stub (tears away on exit) with label, serial and barcode
        var St = jzNoGhost(jzShapeLayer(ctx, 'stub', cx, cy)), sx = px0 + stubW / 2, bx = sx + stubW * 0.26, bh2 = th * 0.7;
        var gbc = jzGrp(St, 'barcode'), yb = -bh2 / 2;
        for (i = 0; i < 40 && yb < bh2 / 2; i++) { var hg = th * (0.006 + 0.014 * jzR(serial, i, 3)); jzAddRect(gbc, stubW * 0.16, hg, 0, bx, yb + hg / 2); yb += hg + th * (0.006 + 0.01 * jzR(serial, i, 4)); }
        jzAddFill(gbc, tc, 85);
        var gst = jzGrp(St, 'stub'); jzAddPath(gst, TP.stub, true);
        if (outline) jzAddStroke(gst, sc.fg, lwO); else jzAddFill(gst, plate);
        var ls = Math.max(11 * ctx.u, th * 0.07), skids = [], tkids = [];
        skids.push(jzText(ctx, label, { font: mono, size: ls, track: 0.25, color: tc, x: cx + sx - stubW * 0.22, y: cy, rot: -90 }));
        skids.push(jzText(ctx, 'No.' + jzPad(serial, 6), { font: mono, size: ls * 0.8, track: 0.12, color: lc, x: cx + sx + stubW * 0.02, y: cy, rot: -90, opacity: 0.8 }));
        tkids.push(jzText(ctx, label + '  ·  No.' + jzLineNo(ctx), { font: mono, size: ls, track: 0.2, color: lc, x: cx + mx0, y: cy - th / 2 + th * 0.14, align: 'left' }));
        var Fg = jzText(ctx, 'GATE ' + String.fromCharCode(65 + serial % 6) + '   ROW ' + jzPad(1 + serial % 30, 2) + '   SEAT ' + jzPad(1 + (serial >> 3) % 40, 2), { font: mono, size: ls * 0.9, track: 0.15, color: lc, x: cx + mx0, y: cy + th / 2 - th * 0.14, align: 'left' });
        var Ft = jzText(ctx, jzFmtTime(c.start), { font: mono, size: ls * 0.9, track: 0.1, color: lc, x: cx + mx1, y: cy + th / 2 - th * 0.14, align: 'right' });
        var fk = (mx1 - mx0) / Math.max(1, jzSize(Fg)[0] + jzSize(Ft)[0] + ls);   // keep the footer from colliding with wide mono fonts
        if (fk < 1) { jzXf(Fg, 'ADBE Scale').setValue([100 * fk, 100 * fk]); jzXf(Ft, 'ADBE Scale').setValue([100 * fk, 100 * fk]); }
        tkids.push(Fg, Ft);
        la2_ng(skids); la2_ng(tkids);                           // (before the lyric joins tkids)
        for (i = 0; i < skids.length; i++) jzSetExpr(jzXf(skids[i], 'ADBE Opacity'), eH + 'value*a');
        for (i = 0; i < tkids.length; i++) jzSetExpr(jzXf(tkids[i], 'ADBE Opacity'), eH + 'value*a');
        // title = the lyric
        var t0 = jzTrim(c.text), text = la2_brk(t0, port ? 6 : 9);
        var L = la2_txt(ctx, text, { font: jzFontOf(ctx, 'font', 'display'), size: 100, color: tc, x: cx + mx0, y: cy, align: 'left', track: 0.03, lead: 1.1, maxW: mx1 - mx0, maxH: th * 0.44, maxSize: th * 0.3 });
        tkids.push(L);
        St.parent = Tk;                                         // parent everything first, then the transform expressions
        for (i = 0; i < skids.length; i++) skids[i].parent = St;
        for (i = 0; i < tkids.length; i++) tkids[i].parent = Tk;
        St.moveAfter(Tk);
        jzXf(Tk, 'ADBE Rotate Z').setValue(jzP(ctx, 'tilt', 0));
        jzSetExpr(jzXf(Tk, 'ADBE Position'), eH + '[value[0],value[1]+(1-eIn)*' + jzN(H * 0.7) + ']');
        jzSetExpr(jzXf(Tk, 'ADBE Rotate Z'), eH + 'value*(1-eO*0.5)+(1-eIn)*10');
        jzSetExpr(jzXf(Tk, 'ADBE Opacity'), eH + 'value*a');
        jzSetExpr(jzXf(St, 'ADBE Position'), eH + '[value[0]+eO*' + jzN(tw * 0.12) + ',value[1]+eO*' + jzN(th * 0.2) + ']');
        jzSetExpr(jzXf(St, 'ADBE Rotate Z'), eH + 'value+eO*12');
        jzSetExpr(jzXf(St, 'ADBE Opacity'), eH + 'value*a');
        jzAnimate(ctx, L, { mi: 0 });
        return la2_bb(cx - tw / 2, cy - th / 2, cx + tw / 2, cy + th / 2);
    }
});
