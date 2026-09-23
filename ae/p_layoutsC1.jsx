// ================================================================ pack layoutsC part 1 (AE port of src/11p_layoutsC.js, entries 1-16)
// magazine, headlineDeck, contents, footnote, proofread, numbered, poster, swissGrid, dictionary, ema, ransom, newspaper,
// vinyl, cassette, bookSpine, polaroid
//
// Techniques used here:
// - print objects that move as a whole (pages, plaques, cassettes, polaroids, the spinning newspaper) are one shape layer
//   (or a null) whose transform is driven by expressions; the texts that ride on them are parented to it, so the cut's
//   enter / hold / exit expressions on the lyric stay untouched.
// - secondary copy (body rows, greeked columns, leaders, crop marks) are text / shape layers faded or trimmed in with
//   expressions on `time` (0 = cut start); lc1_H(ctx) = jzTH(ctx) (DUR IN OS OD PO K + easings) + ioc (inOutCubic).
// - glyph positions of the lyric (footnote marks, proofreading marks) are estimated like the browser's layoutText
//   (exact for full-width Japanese) and scaled to the AE text layer's measured width.

var LC1_CY = 0.38;       // glyph centre above the baseline (em)
var LC1_FX = 'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}\n';
var LC1_VROT = 'ー〜～…‥―—-()（）「」『』【】〈〉《》〔〕[]［］→←:：;；=＝';
var LC1_SMALL = 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ';
var LC1_VPUNCT = '、。，．';

/* ================================================================ small helpers */
function lc1_H(ctx) { return jzTH(ctx) + LC1_FX; }
function lc1_k(ctx) { return jzU(ctx) / 1080; }                                 // browser design px -> comp px
function lc1_ls(ctx) { var k = lc1_k(ctx); return jzClamp(jzU(ctx) * 0.024, 14 * k, 34 * k); }   // smallSize
function lc1_pad3(n) { return jzPad(n, 3); }
function lc1_lineN(ctx) { return Math.max(0, ctx.cut.line || 0) + 1; }
function lc1_isSmall(ch) { return LC1_SMALL.indexOf(ch) >= 0 && ch.length > 0; }
function lc1_isBad(ch) { return lc1_isSmall(ch) || jzIsPunct(ch) || ch === 'ー' || ch === ' '; }
function lc1_romaOf(t) { if (!t || jzHasLatin(t)) return null; var r = jzRomaji(jzStrip(t)); return r ? r.toUpperCase() : null; }
function lc1_vtext(t) { return jzHasLatin(t) ? jzFlat(t) : jzStrip(t); }
function lc1_deck(ctx) { var c = ctx.cut; if (c.lineText && jzStrip(c.lineText) !== jzStrip(c.text)) return jzFlat(c.lineText); return c.note || jzRomajiOf(ctx) || null; }
function lc1_meta(ctx) { return 'No.' + jzLineNo(ctx) + '  ／  ' + jzFmtTime(ctx.cut.start) + '  ／  ' + jzCount(ctx.cut.text) + (jzHasLatin(ctx.cut.text) ? ' CHARS' : '字'); }
function lc1_cut(s, n) { var a = jzChars(String(s)); return a.length > n ? a.slice(0, n).join('') : String(s); }
function lc1_ell(s, maxC) { var a = jzChars(String(s)); return a.length > maxC ? a.slice(0, maxC - 1).join('') + '…' : String(s); }
function lc1_plateHold(ctx) { return jzIndexOf(['still', 'jitter', 'breathe', 'glitchtick'], ctx.cut.hold || 'still') < 0; }
function lc1_mi(ctx, t) { return Math.max(0, t) / (ctx.cut.stagger || 0.04); }  // motion index whose entrance starts at local time t
var LC1_KNUM = '〇一二三四五六七八九';
function lc1_kanjiNum(n) {
    n = Math.max(0, Math.floor(n));
    if (n < 10) return LC1_KNUM.charAt(n);
    if (n < 20) return '十' + (n % 10 ? LC1_KNUM.charAt(n % 10) : '');
    if (n < 100) return LC1_KNUM.charAt(Math.floor(n / 10)) + '十' + (n % 10 ? LC1_KNUM.charAt(n % 10) : '');
    return String(n);
}
function lc1_box(x0, y0, x1, y1) { return { x0: x0, y0: y0, x1: x1, y1: y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }; }
// true comp-space bbox of an unparented, unrotated layer
function lc1_bb(L) {
    var r = jzRect(L), a = jzXf(L, 'ADBE Anchor Point').value, p = jzXf(L, 'ADBE Position').value, s = jzXf(L, 'ADBE Scale').value;
    var x0 = p[0] + (r.left - a[0]) * s[0] / 100, y0 = p[1] + (r.top - a[1]) * s[1] / 100;
    return lc1_box(x0, y0, x0 + r.width * s[0] / 100, y0 + r.height * s[1] / 100);
}

/* ---- colour (scheme colours only) */
function lc1_onCol(sc, fill) {
    var c = [sc.bg, sc.fg, sc.ink, sc.accent, sc.sub], best = null, bv = 0;
    for (var i = 0; i < c.length; i++) { if (!c[i] || String(c[i]).toUpperCase() === String(fill).toUpperCase()) continue; var k = jzContrast(c[i], fill); if (k > bv) { bv = k; best = c[i]; } }
    return bv >= 2.4 ? best : (jzLum(fill) > 0.5 ? '#111111' : '#FFFFFF');
}
function lc1_plateCol(sc, pref, against, min) {
    var bgc = against || sc.bg; if (min == null) min = 1.6;
    for (var i = 0; i < pref.length; i++) if (pref[i] && jzContrast(pref[i], bgc) >= min) return pref[i];
    return jzContrast(sc.fg, bgc) >= jzContrast(sc.bg, bgc) ? sc.fg : sc.bg;
}
function lc1_card(sc) {
    var fill = jzLightest(sc), text = lc1_onCol(sc, fill);
    return { fill: fill, edge: jzContrast(fill, sc.bg) < 1.4, text: text, acc: lc1_plateCol(sc, [sc.accent, sc.accent2, sc.ink], fill, 2), faint: jzMixHex(fill, text, 0.22), line: jzMixHex(fill, text, 0.35) };
}
function lc1_shA(sc) { return jzLum(sc.bg) > 0.5 ? 0.22 : 0.5; }
// hard offset shadow under a paper object (browser shadowR: offset (0.6d, d) in the darkest colour)
function lc1_shadow(S, sc, d) {
    var e = jzEffect(S, 'ADBE Drop Shadow', 'JZ Shadow'); if (!e) return;
    jzEP(e, 1, jzHex(jzDarkest(sc))); jzEP(e, 2, lc1_shA(sc) * 255); jzEP(e, 3, 149); jzEP(e, 4, d * 1.166); jzEP(e, 5, 0);
}

/* ---- text splitting (balanced chunks at natural boundaries; = splitK / brk in the browser pack) */
function lc1_bounds(word) { var out = {}, ch = jzChunk(word), acc = 0; for (var i = 0; i < ch.length; i++) { acc += jzChars(ch[i]).length; out[acc] = 1; } return out; }
function lc1_split2(word, force) {
    var ch = jzChars(word), n = ch.length, sb = lc1_bounds(word), best = Math.max(1, Math.floor(n / 2)), bs = -1e9;
    for (var c = 1; c < n; c++) {
        var a = ch[c - 1], b = ch[c];
        if (!force && ((c === 1 && !jzIsKanji(a)) || (c === n - 1 && !jzIsKanji(b)))) continue;
        var s = -Math.abs(c - n / 2) * 0.9;
        if (a === ' ' || a === '　' || (jzIsPunct(a) && a !== 'ー')) s += 5;
        if (jzIsHira(a) && !jzIsHira(b) && !lc1_isBad(b)) s += 3;
        if (sb[c]) s += 2;
        if (lc1_isBad(b)) s -= 6;
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
function lc1_splitK(text, k, force) {
    var t = jzTrim(String(text || '')), i;
    if (!t) return [''];
    var latin = jzHasLatin(t), pcs = t.split(/\s+/), words = [], sp = [];
    for (var pi = 0; pi < pcs.length; pi++) {
        var raw = latin ? [pcs[pi]] : jzChunk(pcs[pi]);
        for (i = 0; i < raw.length; i++) { var w0 = jzTrim(raw[i]); if (w0) { words.push(w0); sp.push(false); } }
        if (!latin && sp.length) sp[sp.length - 1] = pi < pcs.length - 1;
    }
    if (!words.length) { words = [t]; sp = [false]; }
    k = Math.max(1, Math.min(k, jzCount(t)));
    var hard = {}, parts, guard;
    for (guard = 0; words.length < k && guard < 16; guard++) {
        var bi = -1, bl = 1;
        for (i = 0; i < words.length; i++) { var l = jzCount(words[i]); if (l > bl && !hard[words[i]]) { bl = l; bi = i; } }
        if (bi < 0) break;
        parts = latin ? [words[bi]] : lc1_split2(words[bi]);
        if (parts.length < 2 && force && words.length < force) parts = lc1_split2(words[bi], true);
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
        var mx = -1, mn = 1e9, gi = 0;
        for (i = 0; i < groups.length; i++) { var sum = 0; for (var q2 = 0; q2 < groups[i].length; q2++) sum += jzCount(groups[i][q2]); if (sum > mx) { mx = sum; gi = i; } if (sum < mn) mn = sum; }
        if (mx <= mn * 1.7 + 1) break;
        var g0 = groups[gi], bw = null;
        for (i = 0; i < g0.length; i++) { if (!hard[g0[i]] && jzCount(g0[i]) >= 3 && (!bw || jzCount(g0[i]) > jzCount(bw))) bw = g0[i]; }
        if (!bw) break;
        parts = latin ? [bw] : lc1_split2(bw);
        if (parts.length < 2) { hard[bw] = 1; continue; }
        var wi = jzIndexOf(words, bw);
        sp.splice(wi, 1, false, sp[wi]); words.splice(wi, 1, parts[0], parts[1]);
        groups = part(words);
    }
    var res = [];
    for (i = 0; i < groups.length; i++) res.push(groups[i].join(sep));
    return res;
}
function lc1_brk(text, maxPer) { var t = jzTrim(String(text || '')), n = jzCount(t); if (n <= maxPer) return t; return lc1_splitK(t, Math.ceil(n / maxPer)).join('\r'); }
function lc1_charUnits(text) { var a = jzChars(jzStrip(text)), out = []; for (var i = 0; i < a.length; i++) { if (out.length && lc1_isBad(a[i])) out[out.length - 1] += a[i]; else out.push(a[i]); } return out; }
function lc1_chunks(ctx) { var ch = jzP(ctx, 'chunks', null), out = [], i; if (ch && ch.length) { for (i = 0; i < ch.length; i++) if (ch[i]) out.push(String(ch[i])); } if (!out.length) out.push(jzTrim(ctx.cut.text)); return out; }
function lc1_lines(s) { return String(s).split(/\r\n|\r|\n/); }

/* ---- text layers & measuring */
// o: font, size, color, x, y, align ('left' -> x = left edge, 'right' -> right edge, else centre), track, lead (em), fill, stroke,
//    strokeColor, opacity, rot, name; y = vertical centre of the block
function lc1_T(ctx, str, o) {
    var s = String(str).replace(/\r\n|\n/g, '\r'), multi = /\r/.test(s), size = o.size || 100;
    var L = jzText(ctx, s, { font: o.font, size: size, color: o.color || ctx.sc.fg, x: o.x || 0, y: o.y || 0, align: o.align, track: o.track || 0,
        leading: multi ? size * (o.lead || 1.2) : null, fill: o.fill, stroke: o.stroke, strokeColor: o.strokeColor, opacity: o.opacity, rot: o.rot, name: o.name });
    if (!o.lyric) jzNoGhost(L);          // secondary copy: the browser draws it with ghost off
    return L;
}
function lc1_meas(ctx, str, font, size, o) {
    o = o || {};
    var L = lc1_T(ctx, str, { font: font, size: size, x: -9999, y: -9999, align: 'left', track: o.track, lead: o.lead }), r = jzRect(L);
    L.remove();
    return { w: Math.max(1, r.width), h: Math.max(1, r.height) };
}
function lc1_fitSize(ctx, str, font, aw, ah, o) { var m = lc1_meas(ctx, str, font, 100, o); return 100 * Math.min(aw / m.w, ah / m.h); }
// vertical block (columns right -> left): size that fits aw x ah; lines = columns
function lc1_vfit(lines, aw, ah, o) {
    var lead = o.lead || 1.2, tr = o.track || 0, mr = 1;
    for (var i = 0; i < lines.length; i++) mr = Math.max(mr, jzCount(lines[i]));
    return Math.min(aw / (1 + (lines.length - 1) * lead), ah / (mr * (1 + tr) - tr));
}
function lc1_vmeas(lines, size, o) {
    var lead = o.lead || 1.2, tr = o.track || 0, mr = 1;
    for (var i = 0; i < lines.length; i++) mr = Math.max(mr, jzCount(lines[i]));
    return { w: size * (1 + (lines.length - 1) * lead), h: size * (mr * (1 + tr) - tr) };
}
// best line break + size for a text block that must fit aw x ah (browser fitBlock); returns { text ('\r' breaks), size, lines }
function lc1_fitBlock(ctx, text, font, aw, ah, o, maxLines) {
    o = o || {};
    var t = jzTrim(String(text || '')), n = Math.max(1, jzCount(t)), best = null, seen = {}, L, i;
    var cands = [];
    for (L = 1; L <= Math.min(maxLines, n); L++) {
        var s0 = L === 1 ? t : lc1_brk(t, Math.ceil(n / L));
        cands.push(s0);
        // the browser's word segmenter can break inside words the panel's chunker keeps whole: also try a forced split
        if (L > 1 && lc1_lines(s0).length < L && !jzHasLatin(t)) cands.push(lc1_splitK(t, L, L).join('\r'));
    }
    for (var ci = 0; ci < cands.length; ci++) {
        var s = cands[ci];
        if (seen[s]) continue; seen[s] = 1;
        var ls = lc1_lines(s), nl = ls.length;
        if (nl > maxLines) continue;
        var size = o.vertical ? lc1_vfit(ls, aw, ah, o) : lc1_fitSize(ctx, s, font, aw, ah, o);
        var lone = false;
        if (nl > 1 && n > 2) for (i = 0; i < nl; i++) if (jzCount(ls[i]) < 2) lone = true;
        var score = size * (1 - 0.06 * (nl - 1)) * (lone ? 0.8 : 1);
        if (!best || score > best.score) best = { text: s, size: size, lines: nl, score: score };
    }
    return best || { text: t, size: o.vertical ? lc1_vfit([t], aw, ah, o) : lc1_fitSize(ctx, t, font, aw, ah, o), lines: 1, score: 0 };
}
// block size as the browser lays it out: w measured in AE, h = lines x lead
function lc1_blockM(L, str, size, lead) { var n = lc1_lines(str).length; return { w: jzRect(L).width, h: size * (1 + (n - 1) * (lead || 1.2)) }; }
// the lyric (or a part of it): text + the cut's motion; o as lc1_T plus mi, noHold, treat (false = plain)
function lc1_main(ctx, str, o) { o.lyric = true; var L = lc1_T(ctx, str, o); jzAnimate(ctx, L, { mi: o.mi || 0, noHold: o.noHold, treat: o.treat }); return L; }

/* ---- glyph layout estimate (browser layoutText): full-width glyphs = 1 em */
function lc1_adv(ch) {
    var c = ch.charCodeAt(0);
    if (ch === ' ') return 0.3;
    if (c < 0x80) {
        if (/[A-Z]/.test(ch)) return /[MW]/.test(ch) ? 0.9 : (ch === 'I' ? 0.32 : 0.7);
        if (/[a-z]/.test(ch)) return /[mw]/.test(ch) ? 0.88 : /[ijl]/.test(ch) ? 0.28 : /[frt]/.test(ch) ? 0.42 : 0.61;
        if (/[0-9]/.test(ch)) return 0.62;
        return /[.,:;!'|]/.test(ch) ? 0.28 : 0.42;
    }
    if (c < 0x250) return 0.56;
    if (c >= 0xFF61 && c <= 0xFF9F) return 0.5;
    return 1;
}
// glyph centres (spaces skipped) relative to the anchor: x from the left edge (align left) / centre, y from the block centre;
// kx rescales x so the widest line matches the AE layer's measured width
function lc1_gpts(str, size, o) {
    o = o || {};
    var lines = lc1_lines(str), nL = lines.length, lead = (o.lead || 1.2) * size, tr = (o.track || 0) * size, out = [], raw = [], maxW = 1, li, j;
    for (li = 0; li < nL; li++) {
        var a = jzChars(lines[li]), ws = [], w = 0;
        for (j = 0; j < a.length; j++) { ws.push(lc1_adv(a[j]) * size); w += ws[j] + (j < a.length - 1 ? tr : 0); }
        maxW = Math.max(maxW, w); raw.push({ a: a, ws: ws, w: w });
    }
    var kx = o.w ? o.w / maxW : 1;
    for (li = 0; li < nL; li++) {
        var R = raw[li], x = o.align === 'left' ? 0 : o.align === 'right' ? -R.w : -R.w / 2, y = (li - (nL - 1) / 2) * lead;
        for (j = 0; j < R.a.length; j++) {
            if (R.a[j] !== ' ' && R.a[j] !== '　') out.push({ ch: R.a[j], x: (x + R.ws[j] / 2) * kx, y: y, w: R.ws[j] * kx, h: size, li: li, i: out.length });
            x += R.ws[j] + tr;
        }
    }
    return out;
}

/* ---- vertical text: glyphs of ONE text layer placed in columns (right -> left); one glyph per line + per-glyph offsets */
function lc1_cells(ctx, gl, cells, o) {
    var size = o.size, k;
    var L = jzText(ctx, gl.join('\r'), { font: o.font, size: size, color: o.color || ctx.sc.fg, x: 0, y: 0, leading: size, name: o.name, fill: o.fill, stroke: o.stroke, strokeColor: o.strokeColor });
    var ox = cells[0][0], oy = cells[0][1] + LC1_CY * size;
    jzXf(L, 'ADBE Anchor Point').setValue([o.px - ox, o.py - oy]);
    jzXf(L, 'ADBE Position').setValue([o.px, o.py]);
    var offs = [], rots = [], anyO = false, anyR = false;
    for (k = 0; k < gl.length; k++) {
        var dx = cells[k][0] - ox, dy = cells[k][1] - (oy + k * size - LC1_CY * size);
        offs.push([dx, dy]); rots.push(cells[k][2] || 0);
        if (Math.abs(dx) + Math.abs(dy) > 0.05) anyO = true;
        if (cells[k][2]) anyR = true;
    }
    if (anyO) jzCharOffsets(L, offs, 'JZ Columns');
    if (anyR) jzCharRotations(L, rots, 'JZ Upright');
    if (o.opacity != null) jzXf(L, 'ADBE Opacity').setValue(o.opacity * 100);
    if (!o.lyric) jzNoGhost(L);
    return L;
}
// o: font, size, color, x (block centre), top (top edge), lead (column pitch, em), track (glyph gap, em) -> { L, bb }
function lc1_vcols(ctx, lines, o) {
    var size = o.size, lead = o.lead || 1.2, st = size * (1 + (o.track || 0)), cols = lines.length, gl = [], cells = [], i, j, maxN = 1;
    for (i = 0; i < cols; i++) {
        var ch = jzChars(lc1_vtext(lines[i])), cx = o.x + ((cols - 1) / 2 - i) * lead * size;
        maxN = Math.max(maxN, ch.length);
        for (j = 0; j < ch.length; j++) {
            var cc = ch[j], vx = 0, vy = 0, rot = 0;
            if (cc === ' ') continue;
            if (lc1_isSmall(cc)) { vx = 0.11 * size; vy = -0.11 * size; }
            if (LC1_VPUNCT.indexOf(cc) >= 0) { vx = 0.3 * size; vy = -0.3 * size; }
            if (LC1_VROT.indexOf(cc) >= 0 || /[A-Za-z0-9]/.test(cc)) rot = 90;
            gl.push(cc); cells.push([cx + vx, o.top + size / 2 + j * st + vy, rot]);
        }
    }
    if (!gl.length) { gl.push(' '); cells.push([o.x, o.top + size / 2, 0]); }
    var bw = size * (1 + (cols - 1) * lead), bh = maxN * st - (st - size);
    var L = lc1_cells(ctx, gl, cells, { font: o.font, size: size, color: o.color, name: o.name, px: o.x, py: o.top + bh / 2, fill: o.fill, stroke: o.stroke, strokeColor: o.strokeColor, opacity: o.opacity, lyric: o.lyric });
    if (o.rot) jzXf(L, 'ADBE Rotate Z').setValue(o.rot);
    return { L: L, bb: lc1_box(o.x - bw / 2, o.top, o.x + bw / 2, o.top + bh), w: bw, h: bh };
}

/* ---- expression-driven secondary layers */
function lc1_e(d, len, ease) { return (ease || 'oe') + '((time-' + jzN(d) + ')/' + jzN(Math.max(0.01, len)) + ')'; }   // browser tin(env, d, len, ease)
function lc1_op(ctx, L, expr, alpha, head) {
    if (alpha != null) jzXf(L, 'ADBE Opacity').setValue(jzClamp(alpha, 0, 1) * 100);
    jzSetExpr(jzXf(L, 'ADBE Opacity'), lc1_H(ctx) + (head || '') + 'value*Math.max(0,Math.min(1,' + expr + '))');
}
// fade in (outCubic by default) and follow the cut's exit
function lc1_fade(ctx, L, d, len, alpha, ease) { lc1_op(ctx, L, (ease || 'oc') + '((time-' + jzN(d) + ')/' + jzN(len || 0.4) + ')*K', alpha); }
// fade + slide in from (dx, dy)
function lc1_slide(ctx, L, d, len, dx, dy, alpha) {
    jzSetExpr(jzXf(L, 'ADBE Position'), lc1_H(ctx) + 'var a=oc((time-' + jzN(d) + ')/' + jzN(len) + ');[value[0]+' + jzN(dx) + '*(1-a),value[1]+' + jzN(dy) + '*(1-a)]');
    lc1_fade(ctx, L, d, len, alpha);
}
// AE draws the first group of a shape layer on top: bring a new group to the front so groups stack in creation order
// (moveTo invalidates the reference, so the fresh one is returned)
function lc1_front(g) { var par = g.parentProperty; if (g.propertyIndex > 1) { g.moveTo(1); return par.property(1); } return g; }
// every shape / null / secondary text layer of this pack is main-pass-only in the browser (ghost off): jzNoGhost
function lc1_S(ctx, name, x, y) { return jzNoGhost(jzShapeLayer(ctx, name, x || 0, y || 0)); }
function lc1_sub(g, name) { var q = jzVecs(g).addProperty('ADBE Vector Group'); if (name) q.name = name; return q; }
function lc1_rect(S, name, w, h, x, y, fill, o) {
    o = o || {};
    var g = jzGrp(S, name); jzAddRect(g, Math.max(0.5, w), Math.max(0.5, h), o.round || 0, x || 0, y || 0);
    if (o.stroke) jzAddStroke(g, o.stroke, o.sw || 2, o.sop);
    if (fill) jzAddFill(g, fill, o.fop);
    if (o.op != null) jzGX(g).property('ADBE Vector Group Opacity').setValue(o.op * 100);
    return lc1_front(g);
}
function lc1_ellipse(S, name, w, h, x, y, fill, o) {
    o = o || {};
    var g = jzGrp(S, name); jzAddEllipse(g, Math.max(0.5, w), Math.max(0.5, h), x || 0, y || 0);
    if (o.stroke) jzAddStroke(g, o.stroke, o.sw || 2, o.sop);
    if (fill) jzAddFill(g, fill, o.fop);
    if (o.op != null) jzGX(g).property('ADBE Vector Group Opacity').setValue(o.op * 100);
    return lc1_front(g);
}
function lc1_path(S, name, pts, col, w, o) {
    o = o || {};
    var g = jzGrp(S, name); jzAddPath(g, pts, !!o.closed);
    if (o.fill) jzAddFill(g, o.fill, o.fop);
    if (col) { var st = jzAddStroke(g, col, w || 2, o.sop); if (o.cap) try { st.property('ADBE Vector Stroke Line Cap').setValue(o.cap); } catch (e) {} if (o.join) try { st.property('ADBE Vector Stroke Line Join').setValue(o.join); } catch (e2) {} if (o.dash) lc1_dash(st, o.dash[0], o.dash[1]); }
    if (o.op != null) jzGX(g).property('ADBE Vector Group Opacity').setValue(o.op * 100);
    return lc1_front(g);
}
// (each dash entry is added AND set before the next one is added: in AE adding to the Dashes group invalidates the
//  references already held to its other entries)
function lc1_dashP(D, mn, v) {
    var p = null;
    try { p = D.addProperty(mn); } catch (e) { p = null; }
    if (!p) { try { p = D.property(mn); } catch (e2) { p = null; } }
    if (p) p.setValue(v);
}
function lc1_dash(st, d, gp) {
    var D = st.property('ADBE Vector Stroke Dashes');
    lc1_dashP(D, 'ADBE Vector Stroke Dash 1', d);
    lc1_dashP(D, 'ADBE Vector Stroke Gap 1', gp);
}
function lc1_trim(ctx, g, eExpr, sExpr, head) {
    var t = jzVecs(g).addProperty('ADBE Vector Filter - Trim');
    jzSetExpr(t.property('ADBE Vector Trim End'), lc1_H(ctx) + (head || '') + '100*Math.max(0,Math.min(1,' + eExpr + '))');
    if (sExpr) jzSetExpr(t.property('ADBE Vector Trim Start'), lc1_H(ctx) + (head || '') + '100*Math.max(0,Math.min(1,' + sExpr + '))');
    return t;
}
function lc1_gOp(ctx, g, expr, head) { jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), lc1_H(ctx) + (head || '') + 'value*Math.max(0,Math.min(1,' + expr + '))'); }
function lc1_gSc(ctx, g, sxE, syE, head) { jzSetExpr(jzGX(g).property('ADBE Vector Scale'), lc1_H(ctx) + (head || '') + '[value[0]*(' + sxE + '),value[1]*(' + (syE || sxE) + ')]'); }
function lc1_gRot(ctx, g, expr, head) { jzSetExpr(jzGX(g).property('ADBE Vector Rotation'), lc1_H(ctx) + (head || '') + 'value+(' + expr + ')'); }
// line from pts[0] along pts drawn progressively with eExpr (0..1); alpha = opacity
function lc1_line(ctx, name, pts, col, w, alpha, eExpr, o) {
    var S = lc1_S(ctx, name, 0, 0), g = lc1_path(S, name, pts, col, w, o);
    if (eExpr) lc1_trim(ctx, g, eExpr, null, o && o.head);
    if (alpha != null && alpha < 1) jzXf(S, 'ADBE Opacity').setValue(Math.max(0, alpha) * 100);
    return S;
}
// bar from x0 towards dir (+1 right / -1 left) of width w, height h centred on y; grows with eExpr
function lc1_bar(ctx, name, x0, y, w, h, col, eExpr, dir, alpha, head) {
    dir = dir || 1;
    var S = lc1_S(ctx, name, x0, y); lc1_rect(S, name, w, h, dir * w / 2, 0, col);
    if (alpha != null && alpha < 1) jzXf(S, 'ADBE Opacity').setValue(alpha * 100);
    jzSetExpr(jzXf(S, 'ADBE Scale'), lc1_H(ctx) + (head || '') + 'var e=Math.max(0,' + eExpr + ');[value[0]*e,value[1]]');
    return S;
}
// vertical bar from y0 downwards (dir 1) / upwards (-1)
function lc1_vbar(ctx, name, x, y0, w, h, col, eExpr, dir, alpha, head) {
    dir = dir || 1;
    var S = lc1_S(ctx, name, x, y0); lc1_rect(S, name, w, h, 0, dir * h / 2, col);
    if (alpha != null && alpha < 1) jzXf(S, 'ADBE Opacity').setValue(alpha * 100);
    jzSetExpr(jzXf(S, 'ADBE Scale'), lc1_H(ctx) + (head || '') + 'var e=Math.max(0,' + eExpr + ');[value[0],value[1]*e]');
    return S;
}
// dotted leader (round dots of radius r every `step` px) from p0 to p1, grows with eExpr
function lc1_leader(ctx, name, p0, p1, col, alpha, step, r, eExpr) {
    return lc1_line(ctx, name, [p0, p1], col, r * 2, alpha, eExpr, { cap: 2, dash: [0.01, step] });
}
// parent a layer to P and place it at (x, y) in P's space (P's anchor is its origin)
function lc1_parent(L, P, x, y) { L.setParentWithJump(P); jzXf(L, 'ADBE Position').setValue([x, y]); }
function lc1_null(ctx, name, x, y) {
    var N = ctx.comp.layers.addNull(ctx.comp.duration); N.name = name;
    jzXf(N, 'ADBE Anchor Point').setValue([0, 0]); jzXf(N, 'ADBE Position').setValue([x, y]);
    return jzNoGhost(N);
}
function lc1_matte(L, M) {
    var ok = false;
    if (typeof L.setTrackMatte === 'function') { try { L.setTrackMatte(M, TrackMatteType.ALPHA); ok = true; } catch (e) { ok = false; } }
    if (!ok) { try { L.trackMatteType = TrackMatteType.ALPHA; } catch (e2) { jzWarn('matte: ' + e2.toString()); } }
}
// rows of real body copy (browser bodyRows): row strings of ~cpr glyphs, short paragraph ends at random
function lc1_bodyRows(src, w, fs, rows, seed) {
    var ch = jzChars(src), out = [], r, j;
    if (!ch.length || rows <= 0) return out;
    var lat = jzHasLatin(src), cpr = Math.max(2, Math.floor(w / (fs * (lat ? 0.56 : 1.04)))), off = (seed | 0) % ch.length;
    for (r = 0; r < rows && r < 80; r++) {
        var last = r === rows - 1 || jzR(seed, r, 5) < 0.14, m = last ? Math.max(2, Math.floor(cpr * (0.3 + 0.5 * jzR(seed, r, 6)))) : cpr, row = '';
        for (j = 0; j < m; j++) row += ch[(off + j) % ch.length];
        off += m; out.push(row);
    }
    return out;
}
// one left-aligned text layer holding body rows; first row centred on y; rows appear with rvExpr (0..1, row-wise like the browser)
function lc1_rowsText(ctx, rows, o) {
    if (!rows.length) return null;
    var fs = o.size, lat = jzHasLatin(rows.join('')), cpr = Math.max(2, Math.floor(o.w / (fs * (lat ? 0.56 : 1.04))));
    var tr = lat ? 0.02 : jzClamp((o.w / cpr - fs) / fs, 0, 0.2);
    var L = lc1_T(ctx, rows.join('\r'), { font: o.font, size: fs, color: o.color, x: o.x, y: o.y + (rows.length - 1) * o.lh / 2, align: 'left', track: tr, lead: o.lh / fs, name: o.name || 'body copy', opacity: o.alpha });
    if (o.rv) {
        var C = [], acc = 0;
        for (var i = 0; i < rows.length; i++) { acc += jzChars(rows[i]).length; C.push(acc); }
        jzAnimator(L, 'JZ Rows', [['ADBE Text Opacity', 0]], lc1_H(ctx) + (o.head || '') + 'var C=' + jzArrExpr(C) + ',NR=' + C.length + ';var i=textIndex-1,r=0;while(r<NR-1&&i>=C[r])r++;var rv=' + o.rv + ';(1-cl(rv*NR*1.2-r))*100');
    }
    return L;
}
function lc1_shp(g, sh) { var p = jzVecs(g).addProperty('ADBE Vector Shape - Group'); p.property('ADBE Vector Shape').setValue(sh); return p; }
// circular arc (degrees, screen angles a0 -> a1) as an open bezier Shape
function lc1_arcShape(cx, cy, r, a0, a1) {
    var segs = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 90)), da = (a1 - a0) / segs, k = 4 / 3 * Math.tan(da * Math.PI / 720) * r, V = [], I = [], O = [];
    for (var i = 0; i <= segs; i++) {
        var a = (a0 + da * i) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
        V.push([cx + c * r, cy + s * r]); I.push(i ? [s * k, -c * k] : [0, 0]); O.push(i < segs ? [-s * k, c * k] : [0, 0]);
    }
    var sh = new Shape(); sh.vertices = V; sh.inTangents = I; sh.outTangents = O; sh.closed = false;
    return sh;
}
// text colour switch for the "current" row (contents): CUR is defined in head
function lc1_curCol(ctx, L, hex, i, head) { return jzAnimator(L, 'JZ Current', [['ADBE Text Fill Color', jzHex(hex)]], lc1_H(ctx) + head + '(CUR==' + i + ')?100:0'); }
function lc1_strokeOf(g) { return jzVecs(g).property('ADBE Vector Graphic - Stroke'); }
function lc1_fillOf(g) { return jzVecs(g).property('ADBE Vector Graphic - Fill'); }
function lc1_colExpr(a, b, cond) { var A = jzHex(a), B = jzHex(b); return cond + '?[' + jzN(B[0]) + ',' + jzN(B[1]) + ',' + jzN(B[2]) + ',1]:[' + jzN(A[0]) + ',' + jzN(A[1]) + ',' + jzN(A[2]) + ',1]'; }
function lc1_mixExpr(a, b, t) { var A = jzHex(a), B = jzHex(b); return '[' + jzN(A[0]) + '+' + jzN(B[0] - A[0]) + '*' + t + ',' + jzN(A[1]) + '+' + jzN(B[1] - A[1]) + '*' + t + ',' + jzN(A[2]) + '+' + jzN(B[2] - A[2]) + '*' + t + ',1]'; }

/* ================================================================== 1 magazine — 見開き */
jzReg('layout', 'magazine', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif', 'serif'])), qf: rng.pick(jzFontsOf(st, ['serif'])), variant: rng.pick(['headline', 'vertical', 'plate']), folio: 2 * rng.int(6, 90),
            kicker: rng.pick(['FEATURE', 'ESSAY', 'INTERVIEW', 'COLUMN', 'STORY']), seed: rng.int(1, 9999), img: rng.pick(['sun', 'bars', 'arc']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), k = lc1_k(ctx), port = jzPortrait(ctx), C = lc1_card(sc), i;
        var font = jzP(ctx, 'font', jzSerifF(ctx)), qf = jzP(ctx, 'qf', jzSerifF(ctx)), variant = jzP(ctx, 'variant', 'headline'), folio = jzP(ctx, 'folio', 24), kicker = jzP(ctx, 'kicker', 'FEATURE');
        var seed = jzP(ctx, 'seed', 7), img = jzP(ctx, 'img', 'sun'), mono = jzMonoF(ctx), t0 = jzTrim(c.text), latin = jzHasLatin(c.text);
        var pw, ph;
        if (!port) { ph = Math.min(H * 0.84, W * 0.44 / 0.72); pw = ph * 0.72; } else { pw = W * 0.88; ph = Math.min(H * 0.445, pw * 1.02); }
        var cx = W / 2, cy = H / 2, vert = variant === 'vertical' && !latin, plate = variant === 'plate';
        var Ax = port ? cx - pw / 2 : vert ? cx : cx - pw, Ay = port ? cy - ph : cy - ph / 2, sideB = port ? 1 : vert ? -1 : 1;
        var ls = jzClamp(pw * 0.03, 11 * k, 26 * k), mx = pw * 0.1, my = ph * 0.075, lw = Math.max(1, u * 0.0014);
        var HM = 'var OUT=1-cl((PO-0.72)/0.28),AA=oc(time/0.28)*OUT,UF=ioc((time-0.06)/0.5),FO=ioc(PO),Q=UF*(1-2*FO),CA=AA*cl((Q-0.3)/0.5);';
        var gx = port ? Ax : cx, gy = port ? cy : Ay;
        var scQ = port ? '[value[0],value[1]*Q]' : '[value[0]*Q,value[1]]';
        // ---- page A
        var PA = lc1_S(ctx, 'page A', Ax, Ay);
        lc1_rect(PA, 'page', pw, ph, pw / 2, ph / 2, C.fill, C.edge ? { stroke: C.line, sw: lw, sop: 70 } : null);
        lc1_shadow(PA, sc, u * 0.016);
        lc1_op(ctx, PA, 'AA', 1, HM);
        // ---- page B (unfolds from the gutter; content rides on it)
        function bx(xp) { return (!port && sideB < 0) ? xp - pw : xp; }
        var PB = lc1_S(ctx, 'page B', gx, gy);
        lc1_rect(PB, 'page', pw, ph, bx(pw / 2), ph / 2, C.fill, C.edge ? { stroke: C.line, sw: lw, sop: 70 } : null);
        lc1_shadow(PB, sc, u * 0.016);
        jzSetExpr(jzXf(PB, 'ADBE Scale'), lc1_H(ctx) + HM + scQ);
        lc1_op(ctx, PB, 'Q>0.002?AA:0', 1, HM);
        var bX = mx, bY = my, iw = pw - mx * 2, ih = ph - my * 2, imgH = ih * (plate ? 0.3 : 0.46);
        var imgC = lc1_plateCol(sc, [img === 'sun' ? jzDarkest(sc) : sc.accent, sc.ink, sc.fg], C.fill, 1.8), iy = plate ? bY + ih - imgH : bY;
        var oc2 = lc1_plateCol(sc, [sc.accent, sc.accent2, C.fill], imgC, 1.6);
        var IM = lc1_S(ctx, 'page B picture', 0, 0);
        lc1_rect(IM, 'picture', iw, imgH, bx(bX + iw / 2), iy + imgH / 2, imgC);
        if (img === 'sun') { var sr = Math.min(iw, imgH) * 0.3; lc1_ellipse(IM, 'sun', sr * 2, sr * 2, bx(bX + iw * 0.62), iy + imgH * 0.52, oc2); }
        else if (img === 'bars') for (i = 0; i < 5; i++) { var bh0 = imgH * 0.75 * (1 - 0.5 * jzR(seed, i, 9)), by0 = iy + imgH * (0.25 + 0.5 * jzR(seed, i, 9)); lc1_rect(IM, 'bar ' + i, iw * 0.08, bh0, bx(bX + iw * (0.12 + i * 0.16) + iw * 0.04), by0 + bh0 / 2, oc2); }
        else { var ga = jzGrp(IM, 'arc'); lc1_shp(ga, lc1_arcShape(bx(bX + iw * 0.5), iy + imgH * 1.02, imgH * 0.7, 180, 360)); jzAddStroke(ga, oc2, Math.max(3 * k, imgH * 0.09)); lc1_front(ga); }
        lc1_parent(IM, PB, 0, 0); lc1_op(ctx, IM, 'CA', 1, HM);
        var fs = jzClamp(pw * 0.022, 9 * k, 20 * k), lh = fs * 1.75, src = jzFlat(c.lineText || c.text) + (latin ? '. ' : '。'), colW = (iw - fs * 1.5) / 2;
        var ty = plate ? bY + ls * 2 : iy + imgH + fs * 2, tAvail = plate ? ih - imgH - ls * 3 : ih - imgH - fs * 2, qc = lc1_deck(ctx), r0 = ty, rows;
        var bRows = [];
        if (plate && qc) {
            var qb = lc1_fitBlock(ctx, '「' + qc + '」', qf, iw, tAvail * 0.42, { lead: 1.3 }, 3), qs = Math.min(qb.size, pw * 0.07);
            var QT = lc1_T(ctx, qb.text, { font: qf, size: qs, lead: 1.3, align: 'left', x: gx + bx(bX), y: gy + ty + qs * qb.lines * 0.65, color: C.acc, name: 'pull quote' });
            lc1_parent(QT, PB, bx(bX), ty + qs * qb.lines * 0.65); lc1_op(ctx, QT, 'CA', 1, HM); bRows.push(QT);
            r0 = ty + qs * (qb.lines * 1.3 + 0.8); rows = Math.max(0, Math.floor((bY + ih - imgH - fs - r0) / lh));
        } else rows = Math.max(0, Math.floor((plate ? ih - imgH - fs * 2 : tAvail) / lh));
        for (i = 0; i < 2; i++) {
            var BR = lc1_rowsText(ctx, lc1_bodyRows(src, colW, fs, rows, seed + i * 77), { font: jzBodyF(ctx), size: fs, w: colW, lh: lh, x: 0, y: 0, color: C.text, rv: 'UF', head: HM, name: 'body column ' + (i + 1) });
            if (!BR) continue;
            lc1_parent(BR, PB, bx(bX + i * (colW + fs * 1.5)), r0 + (rows - 1) * lh / 2);
            lc1_op(ctx, BR, 'CA*0.55', 1, HM);
        }
        var FB = lc1_T(ctx, lc1_pad3(folio + 1), { font: mono, size: ls * 0.85, align: 'right', color: C.text, name: 'folio B' });
        lc1_parent(FB, PB, bx(pw - mx * 0.5), ph - my * 0.45); lc1_op(ctx, FB, 'CA*0.8', 1, HM);
        var SH = lc1_S(ctx, 'page B shade', 0, 0); lc1_rect(SH, 'shade', pw, ph, bx(pw / 2), ph / 2, jzDarkest(sc));
        lc1_parent(SH, PB, 0, 0); lc1_op(ctx, SH, '(Q>0.002&&Q<0.98)?AA*(1-Q)*0.35:0', 1, HM);
        // ---- gutter shade
        var gw = pw * 0.07, GS = lc1_S(ctx, 'gutter', port ? Ax + pw / 2 : cx, port ? cy : Ay + ph / 2);
        lc1_rect(GS, 'gutter', port ? pw : gw * 0.9, port ? gw * 0.9 : ph, 0, 0, C.text);
        var gb = jzEffect(GS, 'ADBE Gaussian Blur 2', 'JZ Soft'); jzEP(gb, 1, gw * 0.55); jzEP(gb, 2, port ? 3 : 2);
        lc1_op(ctx, GS, 'AA*0.16', 1, HM);
        // ---- page A content
        var FA = 'oc((time-0.12)/0.4)*OUT', ax = Ax + mx, ay = Ay + my, aw = pw - mx * 2, ah = ph - my * 2, bb = null, L, T, size, fb;
        if (plate) {
            var plC = lc1_plateCol(sc, [jzDarkest(sc), sc.accent, sc.ink], C.fill, 2.2), tc = lc1_onCol(sc, plC);
            var PL = lc1_vbar(ctx, 'plate', Ax + pw / 2, Ay + ph, pw, ph, plC, 'ioc(time/0.45)*OUT', -1, null, HM);
            lc1_op(ctx, PL, 'AA', 1, HM);
            var BG = lc1_T(ctx, jzChars(jzStrip(t0))[0] || '', { font: font, size: ph * 0.7, x: Ax + pw * 0.62, y: Ay + ph * 0.36, color: tc, name: 'big initial' });
            lc1_op(ctx, BG, '0.07*ioc(time/0.45)*OUT', 1, HM);
            T = lc1_T(ctx, kicker + '  —  No.' + jzLineNo(ctx), { font: mono, size: ls, track: 0.2, align: 'left', x: ax, y: ay + ls * 0.5, color: tc, name: 'kicker' }); lc1_op(ctx, T, FA, 1, HM);
            fb = lc1_fitBlock(ctx, t0, font, aw, ah * 0.5, { lead: 1.12, track: 0.02 }, 4); size = Math.min(fb.size, u * 0.15);
            var mh = size * (1 + (fb.lines - 1) * 1.12);
            L = lc1_main(ctx, fb.text, { font: font, size: size, x: ax, y: Ay + ph - my - ls * 2 - mh / 2, align: 'left', lead: 1.12, track: 0.02, color: tc, noHold: lc1_plateHold(ctx) });
            T = lc1_T(ctx, lc1_pad3(folio), { font: mono, size: ls * 0.85, align: 'left', x: Ax + mx * 0.5, y: Ay + ph - my * 0.45, color: tc, name: 'folio A' }); lc1_op(ctx, T, FA + '*0.8', 1, HM);
            bb = lc1_bb(L);
        } else if (vert) {
            fb = lc1_fitBlock(ctx, jzStrip(t0), font, aw * (port ? 0.6 : 0.55), ah * 0.86, { vertical: true, lead: 1.25, track: 0.04 }, 3);
            size = Math.min(fb.size, u * 0.15);
            var vl = lc1_lines(fb.text), vm = lc1_vmeas(vl, size, { lead: 1.25, track: 0.04 });
            var V = lc1_vcols(ctx, vl, { font: font, size: size, x: ax + aw - vm.w / 2, top: ay + ls * 2.2, lead: 1.25, track: 0.04, color: C.text, name: t0, lyric: true });
            jzAnimate(ctx, V.L, { mi: 0, noHold: lc1_plateHold(ctx) }); bb = V.bb;
            T = lc1_T(ctx, kicker, { font: mono, size: ls, track: 0.2, align: 'right', x: ax + aw, y: ay + ls * 0.5, color: C.acc, name: 'kicker' }); lc1_op(ctx, T, FA, 1, HM);
            var gw2 = aw - vm.w - size * 0.8, gh = ah * 0.55, vfs = jzClamp(pw * 0.024, 9 * k, 20 * k);
            if (gw2 > ls * 3) {
                var vch = jzChars(jzStrip(c.lineText || t0)), vc = [], vcs = [];
                for (i = 0; i < vch.length; i++) if (!jzIsLatin(vch[i])) vc.push(vch[i]);
                if (vc.length) {
                    var per = Math.max(2, Math.floor(gh / (vfs * 1.02))), ncol = Math.min(Math.floor(gw2 / (vfs * 1.7)), Math.max(1, Math.floor(260 / per))), off = seed % vc.length;
                    for (var cI = 0; cI < ncol; cI++) { var last = cI === ncol - 1 || jzR(seed, cI, 5) < 0.14, mm = last ? Math.max(2, Math.floor(per * (0.3 + 0.5 * jzR(seed, cI, 6)))) : per, s = ''; for (var j = 0; j < mm; j++) s += vc[(off + j) % vc.length]; off += mm; vcs.push(s); }
                    if (vcs.length) {
                        var VB = lc1_vcols(ctx, vcs, { font: jzBodyF(ctx), size: vfs, x: ax + gw2 - vcs.length * vfs * 1.7 / 2, top: ay + ah - gh, lead: 1.7, track: 0.02, color: C.text, name: 'vertical body' });
                        lc1_op(ctx, VB.L, FA + '*0.55', 1, HM);
                    }
                }
            }
            lc1_line(ctx, 'rule', [[ax, ay + ah - gh - ls], [ax + gw2, ay + ah - gh - ls]], C.acc, Math.max(2 * k, lw * 2), null, lc1_e(0.12, 0.4, 'oc') + '*OUT', { head: HM });
            T = lc1_T(ctx, lc1_pad3(folio), { font: mono, size: ls * 0.85, align: 'right', x: Ax + pw - mx * 0.5, y: Ay + ph - my * 0.45, color: C.text, name: 'folio A' }); lc1_op(ctx, T, FA + '*0.8', 1, HM);
        } else {
            var SQ = lc1_S(ctx, 'kicker mark', ax + ls * 0.4, ay + ls * 0.5); lc1_rect(SQ, 'mark', ls * 0.8, ls * 0.8, 0, 0, C.acc); lc1_op(ctx, SQ, FA, 1, HM);
            T = lc1_T(ctx, kicker + '  No.' + jzLineNo(ctx), { font: mono, size: ls, track: 0.2, align: 'left', x: ax + ls * 1.4, y: ay + ls * 0.5, color: C.text, name: 'kicker' }); lc1_op(ctx, T, FA, 1, HM);
            fb = lc1_fitBlock(ctx, t0, font, aw, ah * 0.52, { lead: 1.1, track: 0.01 }, 4); size = Math.min(fb.size, u * 0.15);
            var mh2 = size * (1 + (fb.lines - 1) * 1.1), hy = ay + ls * 2.4 + mh2 / 2;
            L = lc1_main(ctx, fb.text, { font: font, size: size, x: ax, y: hy, align: 'left', lead: 1.1, track: 0.01, color: C.text, noHold: lc1_plateHold(ctx) });
            bb = lc1_bb(L);
            var ry = hy + mh2 / 2 + size * 0.35;
            var RL = lc1_line(ctx, 'rule', [[ax, ry], [ax + aw, ry]], C.text, Math.max(2 * k, lw * 2), null, lc1_e(0.15, 0.6, 'ioc') + '*OUT', { head: HM });
            lc1_op(ctx, RL, '0.9*AA', 1, HM);
            var deck = lc1_deck(ctx) || lc1_meta(ctx), ds = jzClamp(pw * 0.034, 11 * k, 30 * k), dper = Math.max(4, Math.floor(aw / (ds * 1.05)));
            var dl = lc1_lines(jzSplitLines(deck, dper)).slice(0, 3);
            T = lc1_T(ctx, dl.join('\r'), { font: jzSerifF(ctx), size: ds, lead: 1.55, align: 'left', x: ax, y: ry + ds * 1.2 + (dl.length - 1) * ds * 0.78, color: C.text, name: 'deck' }); lc1_op(ctx, T, FA + '*0.75', 1, HM);
            T = lc1_T(ctx, lc1_pad3(folio) + '   ' + lc1_cut(jzRomajiOf(ctx) || 'JIZURA', 18), { font: mono, size: ls * 0.85, track: 0.1, align: 'left', x: Ax + mx * 0.5, y: Ay + ph - my * 0.45, color: C.text, name: 'folio A' }); lc1_op(ctx, T, FA + '*0.8', 1, HM);
        }
        // ---- exit: page B folds over page A (blank back of the page)
        var PF = lc1_S(ctx, 'page B (folding)', gx, gy);
        lc1_rect(PF, 'page', pw, ph, bx(pw / 2), ph / 2, C.fill, C.edge ? { stroke: C.line, sw: lw, sop: 70 } : null);
        var fsd = lc1_rect(PF, 'shade', pw, ph, bx(pw / 2), ph / 2, jzDarkest(sc));
        lc1_gOp(ctx, fsd, '(1+Q)*0.3', HM);
        jzSetExpr(jzXf(PF, 'ADBE Scale'), lc1_H(ctx) + HM + scQ);
        lc1_op(ctx, PF, 'Q<-0.002?AA:0', 1, HM);
        return bb;
    }
});

/* ================================================================== 2 headlineDeck — 見出しとリード */
jzReg('layout', 'headlineDeck', {
    plan: function (rng, cut, st) {
        var port = cut.H > cut.W * 1.08;
        return { font: rng.pick(jzFontsOf(st, ['display', 'display', 'serif'])), variant: port ? rng.pick(['top', 'bottom']) : rng.pick(['top', 'bottom', 'split']),
            kicker: rng.pick(['特集', 'FEATURE', 'COVER STORY', 'ESSAY', '連載', 'REPORT']), mark: rng.pick(['none', 'bar', 'none', 'dot']), dbl: rng.chance(0.5) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), k = lc1_k(ctx), port = jzPortrait(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), variant = jzP(ctx, 'variant', 'top'), mark = jzP(ctx, 'mark', 'none'), dbl = jzP(ctx, 'dbl', false), kick = jzP(ctx, 'kicker', 'FEATURE');
        var mono = jzMonoF(ctx), mx = W * (port ? 0.08 : 0.075), aw = W - mx * 2, split = variant === 'split' && !port, hw = split ? aw * 0.6 : aw, t0 = jzTrim(c.text);
        var fb = lc1_fitBlock(ctx, t0, font, hw, H * (split ? 0.62 : 0.46), { lead: 1.02, track: -0.01 }, port ? 5 : 3);
        var size = Math.min(fb.size, u * (port ? 0.27 : 0.24)), nL = fb.lines, mh = size * (1 + (nL - 1) * 1.02);
        var ls = lc1_ls(ctx) * 1.1, ds = jzClamp(u * 0.032, 16 * k, 44 * k), dc = lc1_deck(ctx);
        var dw = split ? aw * 0.32 : Math.min(aw, port ? aw : aw * 0.62), dper = Math.max(5, Math.floor(dw / (ds * (jzHasLatin(dc || '') ? 0.55 : 1.02))));
        var dlines = dc ? lc1_lines(jzSplitLines(dc, dper)).slice(0, 4) : [lc1_meta(ctx)];
        var dfont = dc ? jzSerifF(ctx) : mono, dsz = dc ? ds : ls, deckH = dlines.length * ds * 1.6, kickH = ls * 2.2, lw = Math.max(2 * k, u * 0.003);
        var top, hy, ry, dy, tot;
        if (split) { top = H / 2 - mh / 2; hy = H / 2; ry = null; dy = H / 2 - deckH / 2; }
        else if (variant === 'bottom') { tot = deckH + ls * 1.6 + mh + kickH; top = Math.max(H * 0.08, H * 0.9 - tot); dy = top; ry = top + deckH + ls * 0.6; hy = ry + ls + kickH + mh / 2; }
        else { tot = kickH + mh + size * 0.3 + ls + deckH; top = Math.max(H * 0.07, (H - tot) / 2 - H * 0.03); hy = top + kickH + mh / 2; ry = hy + mh / 2 + size * 0.22; dy = ry + ls * 1.2; }
        // kicker tab
        var ky = hy - mh / 2 - ls * 1.1, KT = lc1_T(ctx, kick + '  ' + jzLineNo(ctx), { font: mono, size: ls, track: 0.2, align: 'left', x: mx + ls * 0.6, y: ky, color: lc1_onCol(sc, sc.accent), name: 'kicker' });
        var kw = jzRect(KT).width + ls * 1.2, KP = lc1_bar(ctx, 'kicker tab', mx, ky, kw, ls * 1.6, sc.accent, lc1_e(0.05, 0.4) + '*K');
        lc1_op(ctx, KP, 'K', 1); KP.moveAfter(KT);
        lc1_op(ctx, KT, 'cl(' + lc1_e(0.05, 0.4) + '*K*2-1)', 1);
        // headline
        var L = lc1_main(ctx, fb.text, { font: font, size: size, x: mx, y: hy, align: 'left', lead: 1.02, track: -0.01, color: sc.fg });
        var bb = lc1_bb(L);
        if (mark !== 'none') {
            var lastW = lc1_meas(ctx, lc1_lines(fb.text)[nL - 1], font, size, { track: -0.01 }).w, ly = hy + (nL - 1) / 2 * size * 1.02, me = lc1_e(c.inDur * 0.8, 0.45, 'ioc') + '*K';
            if (mark === 'bar') lc1_bar(ctx, 'headline bar', mx, ly + size * 0.5 + Math.max(4 * k, size * 0.07) / 2, lastW, Math.max(4 * k, size * 0.07), sc.accent, me);
            else {
                var D = lc1_S(ctx, 'headline dot', mx + lastW + size * 0.25, ly + size * 0.3); lc1_ellipse(D, 'dot', size * 0.18, size * 0.18, 0, 0, sc.accent);
                jzSetExpr(jzXf(D, 'ADBE Scale'), lc1_H(ctx) + 'var e=' + me + ';var s=e<=0?0:ob(e,2);[value[0]*s,value[1]*s]');
            }
        }
        // rules
        var re = lc1_e(0.1, 0.7, 'ioc') + '*K';
        if (split) {
            var vx = mx + aw * 0.64, vh = Math.max(mh, deckH) / 2, VS = lc1_S(ctx, 'column rule', 0, 0), vg = lc1_path(VS, 'rule', [[vx, H / 2 - vh], [vx, H / 2 + vh]], sc.fg, lw * 0.6);
            lc1_trim(ctx, vg, '0.5+0.5*(' + re + ')', '0.5-0.5*(' + re + ')'); jzXf(VS, 'ADBE Opacity').setValue(80);
            if (dbl) lc1_line(ctx, 'top rule', [[mx, H * 0.1], [mx + aw, H * 0.1]], sc.fg, lw, null, re);
        } else {
            lc1_line(ctx, 'rule', [[mx, ry], [mx + aw, ry]], sc.fg, lw, null, re);
            if (dbl) lc1_line(ctx, 'rule 2', [[mx, ry + lw * 2.5], [mx + aw, ry + lw * 2.5]], sc.fg, lw * 0.4, 0.8, re);
        }
        // deck
        var dx = split ? mx + aw * 0.68 : mx;
        for (i = 0; i < dlines.length; i++) {
            var DL = lc1_T(ctx, dlines[i], { font: dfont, size: dsz, track: dc ? 0 : 0.12, align: 'left', x: dx, y: dy + ds * 0.8 + i * ds * 1.6, color: i === 0 && dc ? sc.fg : sc.sub, name: 'deck ' + (i + 1) });
            lc1_slide(ctx, DL, c.inDur * 0.6 + 0.08 * i, 0.4, 0, ds * 0.5);
        }
        var by = split ? dy + deckH + ls * 1.5 : (variant === 'bottom' ? top - ls * 1.4 : dy + deckH + ls * 0.8);
        if (dc && by < H * 0.95 && by > H * 0.04) {
            var BYL = lc1_T(ctx, '— ' + jzFmtTime(c.start) + '  /  ' + lc1_cut(jzRomajiOf(ctx) || 'No.' + jzLineNo(ctx), 22), { font: mono, size: ls * 0.85, track: 0.12, align: split ? 'left' : 'right', x: split ? dx : mx + aw, y: by, color: sc.sub, name: 'byline' });
            lc1_fade(ctx, BYL, c.inDur + 0.15, 0.4);
        }
        return bb;
    }
});

/* ================================================================== 3 contents — 目次 */
jzReg('layout', 'contents', {
    plan: function (rng, cut, st) {
        var n = cut.n, port = cut.H > cut.W * 1.08, kk = n <= 4 ? 1 : n <= 9 ? 2 : n <= 14 ? 3 : 4;
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), chunks: lc1_splitK(cut.text, kk, kk), variant: port || jzHasLatin(cut.text) ? 'rows' : rng.pick(['rows', 'rows', 'tate']),
            page0: rng.int(3, 40), step: rng.int(6, 22), mark: rng.pick(['bar', 'tri', 'dot']), ctx: rng.chance(0.75) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), k = lc1_k(ctx), port = jzPortrait(ctx), i;
        var chunks = lc1_chunks(ctx), nk = chunks.length, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), page0 = jzP(ctx, 'page0', 12), step = jzP(ctx, 'step', 12), mark = jzP(ctx, 'mark', 'bar');
        var ls = lc1_ls(ctx), lw = Math.max(1.2 * k, u * 0.0016), mono = jzMonoF(ctx), serif = jzSerifF(ctx), bb = null, pages = [];
        for (i = 0; i < nk; i++) pages.push(lc1_pad3(page0 + i * step));
        var ctxRows = jzP(ctx, 'ctx', true) ? [['序', '000'], ['終', lc1_pad3(page0 + nk * step + 14)]] : null;
        var CH = 'var NK=' + nk + ',CUR=Math.min(NK-1,Math.floor(cl(time/Math.max(0.3,DUR*0.92))*NK));';
        var L, T, a;
        if (jzP(ctx, 'variant', 'rows') === 'tate' && !jzHasLatin(c.text)) {
            var cols = nk + (ctxRows ? 2 : 0), colW = Math.min(W * 0.86 / (cols + 1), u * 0.22), hTop = H * 0.14, hBot = H * 0.86, x0 = W / 2 + (cols + 1.2) * colW / 2;
            var size = colW * 0.7;
            for (i = 0; i < nk; i++) size = Math.min(size, (hBot - hTop) * 0.62 / Math.max(1, jzCount(chunks[i])) / 1.03);
            var TT = lc1_vcols(ctx, ['目次'], { font: serif, size: colW * 0.5, x: x0 - colW * 0.45, top: hTop, track: 0.6, color: sc.fg, name: 'title' });
            lc1_fade(ctx, TT.L, 0, 0.4);
            lc1_line(ctx, 'title rule', [[x0 - colW * 1.05, hTop], [x0 - colW * 1.05, hBot]], sc.fg, lw, null, lc1_e(0.05, 0.6, 'ioc') + '*K');
            var ci = 0;
            var colX = function (cc) { return x0 - colW * 1.2 - (cc + 0.5) * colW; };
            var drawCtxV = function (lab, pg, cc, d) {
                var A = lc1_e(d, 0.4, 'oc') + '*K', V1 = lc1_vcols(ctx, [lab], { font: serif, size: size * 0.6, x: colX(cc), top: hTop, color: sc.sub, name: lab });
                lc1_op(ctx, V1.L, A, 0.5);
                var LD = lc1_leader(ctx, 'leader ' + lab, [colX(cc), hTop + size * 1.2], [colX(cc), hBot - ls * 3.5], sc.sub, null, ls * 0.6, Math.max(1 * k, ls * 0.07), null);
                lc1_op(ctx, LD, A, 0.5);
                var V2 = lc1_vcols(ctx, [pg], { font: mono, size: ls * 0.9, x: colX(cc), top: hBot - ls * 2.7, color: sc.sub, name: pg });
                lc1_op(ctx, V2.L, A, 0.5);
            };
            if (ctxRows) drawCtxV(ctxRows[0][0], ctxRows[0][1], ci++, 0.05);
            for (i = 0; i < nk; i++) {
                var x = colX(ci++), txt = jzStrip(chunks[i]);
                var VM = lc1_vcols(ctx, [txt], { font: font, size: size, x: x, top: hTop, track: 0.03, color: sc.fg, name: txt, lyric: true });
                jzAnimate(ctx, VM.L, { mi: i * 3 }); bb = jzUnion(bb, VM.bb);
                var endY = hTop + jzCount(txt) * size * 1.03, ly = endY + size * 0.4, py = hBot - ls * 2.7;
                a = lc1_e(0.15 + i * 0.1, 0.5, 'oc') + '*K';
                var LV = lc1_leader(ctx, 'leader ' + (i + 1), [x, ly], [x, py - ls * 0.9], sc.sub, null, ls * 0.6, Math.max(1.2 * k, ls * 0.08), a);
                jzSetExpr(lc1_strokeOf(LV.property('ADBE Root Vectors Group').property(1)).property('ADBE Vector Stroke Color'), lc1_H(ctx) + CH + lc1_colExpr(sc.sub, sc.accent, '(CUR==' + i + ')'));
                lc1_op(ctx, LV, a, 1);
                var PG = lc1_vcols(ctx, [pages[i]], { font: mono, size: ls, x: x, top: py, color: sc.fg, name: 'page ' + pages[i] });
                lc1_curCol(ctx, PG.L, sc.accent, i, CH); lc1_op(ctx, PG.L, a, 1);
                var MK = lc1_S(ctx, 'current ' + (i + 1), x, hTop - ls * 1.6 + ls * 0.175); lc1_rect(MK, 'mark', colW, ls * 0.35, 0, 0, sc.accent);
                lc1_op(ctx, MK, '(CUR==' + i + ')?cl((' + a + ')*2-0.5):0', 1, CH);
            }
            if (ctxRows) drawCtxV(ctxRows[1][0], ctxRows[1][1], ci++, 0.1 + nk * 0.1);
            return bb || lc1_box(colX(cols - 1) - colW / 2, hTop, x0, hBot);
        }
        // horizontal rows
        var bw = W * (port ? 0.84 : 0.66), bx = (W - bw) / 2, numW = ls * 3.4, pgW = ls * 5, tw = bw - numW - pgW - ls * 2, cxH = ls * 2.6;
        var rowH0 = Math.min((H * 0.66 - (ctxRows ? cxH * 2 : 0)) / nk, u * 0.26), sz = rowH0 * 0.64;
        for (i = 0; i < nk; i++) sz = Math.min(sz, lc1_fitSize(ctx, chunks[i], font, tw * 0.92, rowH0 * 0.7, { track: 0.03 }));
        var rowH = Math.max(sz * 1.62, ls * 2.4), blockH = nk * rowH + (ctxRows ? cxH * 2 : 0), y0 = H / 2 - blockH / 2 + ls * 1.8, hy = y0 - ls * 2.8;
        T = lc1_T(ctx, '目次', { font: serif, size: ls * 2.1, track: 0.5, align: 'left', x: bx, y: hy - ls * 0.2, color: sc.fg, name: 'title' }); lc1_fade(ctx, T, 0, 0.4);
        T = lc1_T(ctx, 'CONTENTS', { font: mono, size: ls * 0.85, track: 0.3, align: 'right', x: bx + bw, y: hy, color: sc.sub, name: 'CONTENTS' }); lc1_fade(ctx, T, 0, 0.4);
        var le = lc1_e(0.05, 0.6, 'ioc') + '*K';
        lc1_line(ctx, 'head rule', [[bx, hy + ls * 1.4], [bx + bw, hy + ls * 1.4]], sc.fg, lw * 1.6, null, le);
        lc1_line(ctx, 'foot rule', [[bx + bw, y0 + blockH + ls * 0.2], [bx, y0 + blockH + ls * 0.2]], sc.fg, lw, 0.7, le);
        var off0 = ctxRows ? cxH : 0;
        var drawCtx = function (lab, pg, y, d) {
            var A = lc1_e(d, 0.4, 'oc') + '*K', T1 = lc1_T(ctx, lab + '章', { font: serif, size: ls * 1.1, align: 'left', x: bx + numW, y: y, color: sc.sub, name: lab });
            lc1_op(ctx, T1, A, 0.45);
            var LD = lc1_leader(ctx, 'leader ' + lab, [bx + numW + ls * 3.4, y + ls * 0.3], [bx + bw - pgW, y + ls * 0.3], sc.sub, null, ls * 0.55, Math.max(1 * k, ls * 0.07), null);
            lc1_op(ctx, LD, A, 0.45);
            var T2 = lc1_T(ctx, pg, { font: mono, size: ls, align: 'right', x: bx + bw, y: y, color: sc.sub, name: pg }); lc1_op(ctx, T2, A, 0.45);
        };
        if (ctxRows) drawCtx(ctxRows[0][0], ctxRows[0][1], y0 + cxH * 0.5, 0.05);
        for (i = 0; i < nk; i++) {
            var y = y0 + off0 + (i + 0.5) * rowH;
            a = lc1_e(0.1 + i * 0.1, 0.5, 'oc') + '*K';
            var NT = lc1_T(ctx, jzPad(i + 1, 2), { font: mono, size: ls * 1.2, align: 'left', x: bx, y: y, color: sc.sub, name: 'no ' + (i + 1) });
            lc1_curCol(ctx, NT, sc.accent, i, CH); lc1_op(ctx, NT, a, 1);
            L = lc1_main(ctx, chunks[i], { font: font, size: sz, x: bx + numW, y: y, align: 'left', track: 0.03, color: sc.fg, mi: i * 3 });
            var lb = lc1_bb(L); bb = jzUnion(bb, lb);
            var tx1 = lb.x1 + ls * 0.8, lx1 = bx + bw - pgW;
            if (lx1 - tx1 > ls) {
                var LR = lc1_leader(ctx, 'leader ' + (i + 1), [tx1, y + sz * 0.3], [lx1, y + sz * 0.3], sc.sub, null, ls * 0.55, Math.max(1.2 * k, ls * 0.08), a);
                jzSetExpr(lc1_strokeOf(LR.property('ADBE Root Vectors Group').property(1)).property('ADBE Vector Stroke Color'), lc1_H(ctx) + CH + lc1_colExpr(sc.sub, sc.accent, '(CUR==' + i + ')'));
                lc1_op(ctx, LR, a, 1);
            }
            var PT = lc1_T(ctx, pages[i], { font: mono, size: ls * 1.4, align: 'right', x: bx + bw, y: y, color: sc.fg, name: 'page ' + pages[i] });
            lc1_curCol(ctx, PT, sc.accent, i, CH); lc1_op(ctx, PT, a, 1);
            var MS = lc1_S(ctx, 'current ' + (i + 1), 0, 0);
            if (mark === 'bar') lc1_rect(MS, 'bar', ls * 0.35, sz * 0.9, bx - ls * 1.1 + ls * 0.175, y, sc.accent);
            else if (mark === 'tri') lc1_path(MS, 'tri', [[bx - ls * 1.3, y - ls * 0.5], [bx - ls * 0.4, y], [bx - ls * 1.3, y + ls * 0.5]], null, 0, { closed: true, fill: sc.accent });
            else lc1_ellipse(MS, 'dot', ls * 0.6, ls * 0.6, bx - ls * 0.9, y, sc.accent);
            lc1_op(ctx, MS, '(CUR==' + i + ')?cl((' + a + ')*2-0.4):0', 1, CH);
        }
        if (ctxRows) drawCtx(ctxRows[1][0], ctxRows[1][1], y0 + off0 + nk * rowH + cxH * 0.5, 0.1 + nk * 0.1);
        return bb || lc1_box(bx, y0, bx + bw, y0 + blockH);
    }
});

/* ================================================================== 4 footnote — 脚注 */
jzReg('layout', 'footnote', {
    plan: function (rng, cut, st) {
        var n = cut.n, kk = n <= 3 ? 1 : n <= 8 ? 2 : 3;
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display', 'serif'])), chunks: lc1_splitK(cut.text, kk), marks: rng.pick(['num', 'kome', 'star']), align: rng.pick(['left', 'center', 'left']), top: rng.chance(0.5) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), k = lc1_k(ctx), port = jzPortrait(ctx), i;
        var chunks = lc1_chunks(ctx), nk = chunks.length, latin = jzHasLatin(c.text), t0 = chunks.join(latin ? ' ' : ''), font = jzP(ctx, 'font', jzSerifF(ctx)), marks = jzP(ctx, 'marks', 'num');
        var mx = W * 0.09, aw = W - mx * 2, ls = lc1_ls(ctx), mono = jzMonoF(ctx), notesH = nk * ls * 1.95 + ls * 2.2, areaTop = H * 0.12, areaBot = H - notesH - H * 0.1;
        var fb = lc1_fitBlock(ctx, t0, font, aw * (port ? 0.95 : 0.88), (areaBot - areaTop) * 0.8, { lead: 1.25, track: 0.03 }, port ? 5 : 3);
        var size = Math.min(fb.size, u * 0.17), left = jzP(ctx, 'align', 'left') === 'left', X = left ? mx : W / 2, Y = (areaTop + areaBot) / 2;
        var L = lc1_main(ctx, fb.text, { font: font, size: size, x: X, y: Y, align: left ? 'left' : 'center', lead: 1.25, track: 0.03, color: sc.fg });
        var bb = lc1_bb(L);
        var gl = lc1_gpts(fb.text, size, { lead: 1.25, track: 0.03, align: left ? 'left' : 'center', w: jzRect(L).width });
        function markOf(q) { return marks === 'num' ? String(q + 1) : marks === 'kome' ? '※' + (q + 1) : '*' + (q + 1); }
        var acc = 0, ms = Math.max(ls * 1.05, size * 0.3);
        for (i = 0; i < nk; i++) {
            acc += jzCount(chunks[i]);
            var g = gl[Math.min(gl.length - 1, acc - 1)];
            if (!g) continue;
            var t = c.inDur * 0.7 + 0.12 + i * 0.14;
            var M = lc1_T(ctx, markOf(i), { font: mono, size: ms, align: 'left', x: X + g.x + g.w * 0.5, y: Y + g.y - size * 0.42, color: sc.accent, name: 'mark ' + (i + 1) });
            jzSetExpr(jzXf(M, 'ADBE Scale'), lc1_H(ctx) + 'var q=cl((time-' + jzN(t) + ')/0.25);var s=q<=0?0:ob(q,2.2)*K;[value[0]*s,value[1]*s]');
        }
        var ny = H - notesH - H * 0.04 + ls, rw = Math.min(aw * 0.32, u * 0.5), re = lc1_e(c.inDur * 0.6, 0.5, 'ioc') + '*K';
        lc1_line(ctx, 'footnote rule', [[mx, ny], [mx + rw, ny]], sc.fg, Math.max(1.2 * k, u * 0.0018), 0.9, re);
        var nfs = ls * 1.15;
        for (i = 0; i < nk; i++) {
            var d = c.inDur * 0.7 + 0.2 + i * 0.12, y = ny + ls * 1.5 + i * ls * 1.95, rom = lc1_romaOf(chunks[i]);
            var note = jzFlat(chunks[i]) + '　' + (rom ? rom : jzFmtTime(c.start + c.dur * i / nk)) + (i === nk - 1 && c.lineText && jzStrip(c.lineText) !== jzStrip(c.text) ? '　／　' + lc1_cut(jzFlat(c.lineText), 24) : '');
            var NM = lc1_T(ctx, markOf(i), { font: mono, size: nfs, align: 'left', x: mx, y: y, color: sc.accent, name: 'note mark ' + (i + 1) });
            lc1_slide(ctx, NM, d, 0.4, ls, 0);
            var NT = lc1_T(ctx, note, { font: jzBodyF(ctx), size: nfs, track: 0.05, align: 'left', x: mx + ls * 2.4, y: y, color: sc.sub, name: 'note ' + (i + 1) });
            lc1_slide(ctx, NT, d, 0.4, ls, 0);
        }
        var FO = lc1_T(ctx, '— ' + lc1_pad3(lc1_lineN(ctx) * 7 + 3) + ' —', { font: mono, size: ls * 0.8, track: 0.2, x: W / 2, y: H - H * 0.045, color: sc.sub, name: 'folio' });
        lc1_fade(ctx, FO, 0.2, 0.4, 0.7);
        if (jzP(ctx, 'top', false)) {
            var NO = lc1_T(ctx, 'NOTES  ' + jzLineNo(ctx), { font: mono, size: ls * 0.8, track: 0.3, align: 'right', x: W - mx, y: H * 0.06, color: sc.sub, name: 'NOTES' });
            lc1_fade(ctx, NO, 0.2, 0.4, 0.7);
            lc1_line(ctx, 'notes rule', [[W - mx, H * 0.06 + ls], [W - mx - rw, H * 0.06 + ls]], sc.sub, 1 * k, 0.6, re);
        }
        return bb;
    }
});

/* ================================================================== 5 proofread — 校正刷り */
var LC1_PROOF = { circle: 'ママ', wave: '強調', box: '太字', dots: 'イキ' };
jzReg('layout', 'proofread', {
    plan: function (rng, cut, st) {
        var all = ['circle', 'wave', 'box', 'dots'], first = rng.pick(['circle', 'circle', 'box']), rest = [];
        for (var i = 0; i < all.length; i++) if (all[i] !== first) rest.push(all[i]);
        var marks = [first, rng.pick(rest)];
        return { font: rng.pick(jzFontsOf(st, ['serif', 'serif', 'display'])), pen: rng.chance(0.6) ? 'klee' : rng.pick(jzFontsOf(st, ['body'])), marks: marks,
            stamp: rng.chance(0.65), tombo: rng.chance(0.8), g1: rng.int(0, 99), g2: rng.int(0, 99), rot: rng.range(-8, 8) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), k = lc1_k(ctx), port = jzPortrait(ctx), i, j;
        var font = jzP(ctx, 'font', jzSerifF(ctx)), penF = jzP(ctx, 'pen', 'klee'), marksP = jzP(ctx, 'marks', ['circle', 'box']), t0 = jzTrim(c.text), ls = lc1_ls(ctx);
        var HP = 'var OP=1-oc(PO*1.15);';
        var aw = W * (port ? 0.7 : 0.62), ah = H * (port ? 0.34 : 0.4);
        var fb = lc1_fitBlock(ctx, t0, font, aw, ah, { lead: 1.45, track: 0.06 }, port ? 5 : 3), size = Math.min(fb.size, u * 0.14);
        var cx = W / 2 - (port ? 0 : W * 0.06), cy = H / 2 + (port ? H * 0.02 : 0);
        var L = lc1_main(ctx, fb.text, { font: font, size: size, x: cx, y: cy, lead: 1.45, track: 0.06, color: sc.fg });
        var bb = lc1_bb(L), mw = jzRect(L).width, mh = size * (1 + (fb.lines - 1) * 1.45), lw = Math.max(1, u * 0.0014);
        var pad = size * 0.75, x0 = cx - mw / 2 - pad, x1 = cx + mw / 2 + pad, y0 = cy - mh / 2 - pad, y1 = cy + mh / 2 + pad;
        // crop marks (トンボ)
        if (jzP(ctx, 'tombo', true)) {
            var g = size * 0.18, TL = size * 0.55, TS = lc1_S(ctx, 'crop marks', 0, 0), tg = jzGrp(TS, 'tombo'), cn = [[x0, y0, -1, -1], [x1, y0, 1, -1], [x0, y1, -1, 1], [x1, y1, 1, 1]];
            for (i = 0; i < 4; i++) {
                var X = cn[i][0], Y = cn[i][1], dx = cn[i][2], dy = cn[i][3];
                jzAddPath(tg, [[X + dx * g, Y], [X + dx * (g + TL), Y]]); jzAddPath(tg, [[X + dx * g * 1.8, Y + dy * g * 0.8], [X + dx * (g + TL), Y + dy * g * 0.8]]);
                jzAddPath(tg, [[X, Y + dy * g], [X, Y + dy * (g + TL)]]); jzAddPath(tg, [[X + dx * g * 0.8, Y + dy * g * 1.8], [X + dx * g * 0.8, Y + dy * (g + TL)]]);
            }
            var cm = [[cx, y0 - g - TL / 2, 0], [cx, y1 + g + TL / 2, 0], [x0 - g - TL / 2, cy, 1], [x1 + g + TL / 2, cy, 1]];
            for (i = 0; i < 4; i++) {
                var qx = cm[i][0], qy = cm[i][1];
                if (cm[i][2]) { jzAddPath(tg, [[qx - TL / 2, qy], [qx + TL / 2, qy]]); jzAddPath(tg, [[qx, qy - TL * 0.9], [qx, qy + TL * 0.9]]); }
                else { jzAddPath(tg, [[qx - TL * 0.9, qy], [qx + TL * 0.9, qy]]); jzAddPath(tg, [[qx, qy - TL / 2], [qx, qy + TL / 2]]); }
            }
            jzAddStroke(tg, sc.sub, lw);
            lc1_trim(ctx, tg, 'oc(time/0.5)*OP', null, HP);
            lc1_op(ctx, TS, '0.8*oc(time/0.5)*OP', 1, HP);
            TS.moveAfter(L);
        }
        // red-pen marks
        var pen = lc1_plateCol(sc, [sc.accent, sc.accent2, sc.fg]), gl = lc1_gpts(fb.text, size, { lead: 1.45, track: 0.06, align: 'center', w: mw });
        if (!gl.length) return bb;
        for (i = 0; i < gl.length; i++) { gl[i].x += cx; gl[i].y += cy; }
        var pw = Math.max(2 * k, size * 0.035), ns = Math.max(ls * 1.5, size * 0.42), t1 = c.inDur * 0.8 + 0.1;
        var nChunks = c.words && c.words.length ? c.words : [t0], used = {};
        function pickGlyph(seed, pred) {
            var cand = [], list = [], q;
            for (q = 0; q < gl.length; q++) if (!used[gl[q].i]) { list.push(gl[q]); if (pred(gl[q].ch)) cand.push(gl[q]); }
            if (cand.length) list = cand;
            var gg = list.length ? list[seed % list.length] : gl[0];
            used[gg.i] = 1; return gg;
        }
        var marks = gl.length <= 4 ? [marksP[0]] : marksP, noteRight = !port;
        for (var mi = 0; mi < marks.length; mi++) {
            var mk = marks[mi], seed = mi ? jzP(ctx, 'g2', 30) : jzP(ctx, 'g1', 10), T = t1 + mi * 0.35;
            var HE = HP + 'var E=cl((time-' + jzN(T) + ')/0.45);', anchor = null;
            var PS = lc1_S(ctx, 'pen ' + mk, 0, 0);
            if (mk === 'circle') {
                var gc = pickGlyph(seed, function (ch) { return jzIsKanji(ch) || jzIsKata(ch); }), pts = [];
                for (j = 0; j <= 40; j++) { var uu = j / 40, an = -2.2 + uu * Math.PI * 2 * 1.12, kk = 1 + (jzR(seed, j >> 2, 7) * 2 - 1) * 0.05 + uu * 0.06; pts.push([gc.x + Math.cos(an) * gc.w * 0.72 * kk, gc.y + Math.sin(an) * gc.h * 0.66 * kk]); }
                lc1_trim(ctx, lc1_path(PS, 'circle', pts, pen, pw, { cap: 2, join: 2 }), 'oc(cl(E*1.6))', null, HE);
                anchor = [gc.x + gc.w * 0.5, gc.y - gc.h * 0.55];
            } else {
                var g0 = pickGlyph(seed, function (ch) { return !jzIsPunct(ch); }), want = Math.max(2, Math.min(4, jzCount(nChunks[0] || ''))), run = [g0];
                for (j = 0; j < gl.length; j++) { if (run.length >= want) break; var gq = gl[j], lastR = run[run.length - 1]; if (gq.i > lastR.i && gq.li === g0.li && !used[gq.i] && gq.i === lastR.i + 1) run.push(gq); }
                var rx0 = 1e9, rx1 = -1e9, ry = g0.y;
                for (j = 0; j < run.length; j++) { used[run[j].i] = 1; rx0 = Math.min(rx0, run[j].x - run[j].w / 2); rx1 = Math.max(rx1, run[j].x + run[j].w / 2); }
                if (mk === 'box') {
                    var q = size * 0.14;
                    lc1_trim(ctx, lc1_path(PS, 'box', [[rx0 - q, ry - size * 0.62], [rx1 + q, ry - size * 0.6], [rx1 + q * 0.8, ry + size * 0.6], [rx0 - q * 1.1, ry + size * 0.62], [rx0 - q, ry - size * 0.7]], pen, pw, { cap: 2, join: 2 }), 'oc(cl(E*1.5))', null, HE);
                    anchor = [rx1 + q, ry - size * 0.6];
                } else if (mk === 'wave') {
                    var wp = [], yy = ry + size * 0.66;
                    for (j = 0; j <= 30; j++) { var xx = jzLerp(rx0, rx1, j / 30); wp.push([xx, yy + Math.sin(j / 30 * (rx1 - rx0) / (size * 0.18)) * size * 0.06]); }
                    lc1_trim(ctx, lc1_path(PS, 'wave', wp, pen, pw, { cap: 2, join: 2 }), 'ioc(cl(E*1.5))', null, HE);
                    anchor = [rx1, yy];
                } else {
                    for (j = 0; j < run.length; j++) {
                        var dg = lc1_ellipse(PS, 'dot ' + j, pw * 2.4, pw * 2.4, 0, 0, pen);
                        jzGX(dg).property('ADBE Vector Position').setValue([run[j].x, ry + size * 0.7]);
                        lc1_gSc(ctx, dg, 'cl(E*1.6*' + run.length + '-' + j + ')', null, HE);
                    }
                    anchor = [rx1, ry + size * 0.7];
                }
            }
            lc1_op(ctx, PS, 'OP', 1, HP);
            // leader to the margin + handwritten note
            var nx, ny;
            if (noteRight) { nx = Math.min(W * 0.93 - ns * 2.2, x1 + size * 0.7 + mi * ns * 0.4); ny = y0 + (mi ? mh * 0.7 : mh * 0.15); }
            else { nx = jzClamp(anchor[0] + (mi ? ns * 2 : -ns * 2), W * 0.1, W * 0.85); ny = y0 - size * 0.9 - mi * ns * 1.6; }
            var mxp = noteRight ? [jzLerp(anchor[0], nx, 0.5), anchor[1] - size * 0.25] : [anchor[0], jzLerp(anchor[1], ny, 0.5)];
            var LE = HE + 'var LE=oc(cl(E*1.4-0.4));';
            var LL = lc1_line(ctx, 'pen leader ' + mk, [anchor, mxp, [nx - ns * 0.2, ny]], pen, pw * 0.7, null, 'LE', { head: LE, cap: 2, join: 2 });
            lc1_op(ctx, LL, 'OP', 1, HP);
            var NT = lc1_T(ctx, LC1_PROOF[mk] || 'ママ', { font: penF, size: ns, align: 'left', x: nx, y: ny, rot: -4, color: pen, name: 'note ' + mk });
            lc1_op(ctx, NT, 'cl((LE-0.6)/0.4)*OP', 1, LE);
        }
        // 校了 stamp
        if (jzP(ctx, 'stamp', true)) {
            var ts = c.inDur + 0.55 + marks.length * 0.25, S = Math.max(ls * 4.2, size * 1.05);
            var sx = port ? W * 0.78 : Math.min(W * 0.9 - S * 0.6, x1 + S * 0.5), sy = port ? Math.min(H * 0.88, y1 + S * 0.9) : y1 - S * 0.1;
            var HS = HP + 'var X=(time-' + jzN(ts) + ')/0.18,SA=X<=0?0:cl(X*3)*OP*0.9;';
            var ST = lc1_S(ctx, 'stamp', sx, sy), w2 = S * 1.25, h2 = S * 0.72;
            lc1_rect(ST, 'outer', w2, h2, 0, 0, null, { round: S * 0.08, stroke: pen, sw: Math.max(2 * k, S * 0.05) });
            lc1_rect(ST, 'inner', w2 - S * 0.14, h2 - S * 0.14, 0, 0, null, { round: S * 0.05, stroke: pen, sw: Math.max(1 * k, S * 0.02) });
            jzXf(ST, 'ADBE Rotate Z').setValue(jzP(ctx, 'rot', 0));
            jzSetExpr(jzXf(ST, 'ADBE Scale'), lc1_H(ctx) + HS + 'var s=1.5+(1-1.5)*ob(cl(X),1.4);[value[0]*s,value[1]*s]');
            lc1_op(ctx, ST, 'SA', 1, HS);
            var S1 = lc1_T(ctx, '校了', { font: jzSerifF(ctx), size: S * 0.36, track: 0.2, color: pen, name: 'stamp text' }); lc1_parent(S1, ST, 0, -S * 0.06); lc1_op(ctx, S1, 'SA', 1, HS);
            var S2 = lc1_T(ctx, jzFmtTime(c.start), { font: jzMonoF(ctx), size: S * 0.12, color: pen, name: 'stamp time' }); lc1_parent(S2, ST, 0, S * 0.2); lc1_op(ctx, S2, 'SA', 1, HS);
        }
        return bb;
    }
});

/* ================================================================== 6 numbered — 番号付き */
jzReg('layout', 'numbered', {
    plan: function (rng, cut, st) {
        var n = cut.n, port = cut.H > cut.W * 1.08, kk = n <= 3 ? Math.min(3, n) : n <= 7 ? 2 : n <= 12 ? 3 : 4;
        var chunks = n <= 3 ? lc1_charUnits(cut.text).slice(0, 3) : lc1_splitK(cut.text, kk, kk);
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), numFont: rng.pick(jzFontsOf(st, ['display'])), chunks: chunks,
            variant: port ? rng.pick(['rows', 'rows', 'behind']) : rng.pick(['cols', 'rows', 'behind']), num: rng.pick(['outline', 'accent', 'dim']), label: rng.pick(['STEP', 'PART', 'No.', 'SCENE']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), k = lc1_k(ctx), port = jzPortrait(ctx), i;
        var chunks = lc1_chunks(ctx), nk = chunks.length, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), numFont = jzP(ctx, 'numFont', jzFontKeyOf(ctx.st, 'display'));
        var num = jzP(ctx, 'num', 'outline'), label = jzP(ctx, 'label', 'STEP'), variant = jzP(ctx, 'variant', 'rows'), ls = lc1_ls(ctx), lw = Math.max(1.2 * k, u * 0.0018), mono = jzMonoF(ctx), bb = null, L;
        // numerals rise inside a clip box (layer mask + a text Position animator), one after another; they sink on exit
        function drawNum(q, size, x, y, align, big, box) {
            var o = { font: numFont, size: size, x: x, y: y, align: align, track: -0.02, color: sc.fg, name: 'number ' + (q + 1) };
            if (num === 'outline' || big) { o.fill = false; o.stroke = Math.max(1.5 * k, size * (big ? 0.008 : 0.012)); o.strokeColor = num === 'accent' ? sc.accent : sc.fg; o.opacity = big ? 0.55 : 1; }
            else if (num === 'accent') o.color = sc.accent;
            else { o.color = sc.sub; o.opacity = 0.45; }
            var N = lc1_T(ctx, jzPad(q + 1, 2), o);
            var p = jzXf(N, 'ADBE Position').value, a = jzXf(N, 'ADBE Anchor Point').value;
            jzMaskRect(N, box[0] - p[0] + a[0], box[1] - p[1] + a[1], box[0] + box[2] - p[0] + a[0], box[1] + box[3] - p[1] + a[1]);
            jzAnimator(N, 'JZ Rise', [['ADBE Text Position 3D', [0, size * 1.1, 0]]], lc1_H(ctx) + '(1-' + lc1_e(0.04 + q * 0.1, 0.55) + '+ic(PO))*100');
            return N;
        }
        function lab(q, x, y, align, a) {
            var T = lc1_T(ctx, label, { font: mono, size: ls * 0.85, track: 0.3, align: align, x: x, y: y, color: q === 0 ? sc.accent : sc.sub, name: 'label' });
            lc1_op(ctx, T, a, 1);
        }
        if (variant === 'cols' && !port && nk <= 3) {
            var cw = W * 0.86 / nk, x0 = W * 0.07, csize = u * 0.2;
            for (i = 0; i < nk; i++) csize = Math.min(csize, lc1_fitSize(ctx, chunks[i], font, cw * 0.86, H * 0.3, { track: 0.02 }));
            var nsz = Math.min(cw * 0.42, Math.max(csize * 1.5, u * 0.14), H * 0.3), top = H / 2 - (nsz * 1.05 + csize * 1.4) / 2 + ls;
            for (i = 0; i < nk; i++) {
                var x = x0 + i * cw, re = lc1_e(0.1 + i * 0.08, 0.6, 'ioc') + '*K', xl = x + cw * 0.07;
                if (i > 0) { var VS = lc1_S(ctx, 'divider ' + i, 0, 0), vg = lc1_path(VS, 'divider', [[x, H / 2 - H * 0.28], [x, H / 2 + H * 0.28]], sc.sub, lw); lc1_trim(ctx, vg, '0.5+0.5*' + re, '0.5-0.5*' + re); jzXf(VS, 'ADBE Opacity').setValue(70); }
                lab(i, xl, top - ls * 0.9, 'left', lc1_e(0.1 + i * 0.1, 0.4, 'oc') + '*K');
                drawNum(i, nsz, xl, top + nsz * 0.5, 'left', false, [x, top, cw, nsz * 1.02]);
                lc1_line(ctx, 'rule ' + (i + 1), [[xl, top + nsz * 1.05], [xl + cw * 0.82, top + nsz * 1.05]], sc.fg, lw * 1.4, null, re);
                L = lc1_main(ctx, chunks[i], { font: font, size: csize, x: xl, y: top + nsz * 1.05 + csize * 0.85, align: 'left', track: 0.02, color: sc.fg, mi: i * 3 });
                bb = jzUnion(bb, lc1_bb(L));
            }
            return bb;
        }
        if (variant === 'behind') {
            var bw = W * (port ? 0.8 : 0.66), rowH = H * (port ? 0.66 : 0.72) / nk, cs = u * 0.2;
            for (i = 0; i < nk; i++) cs = Math.min(cs, lc1_fitSize(ctx, chunks[i], font, bw * 0.8, rowH * 0.62, { track: 0.02 }));
            for (i = 0; i < nk; i++) {
                var y = H / 2 + (i - (nk - 1) / 2) * rowH, sh = nk > 1 ? (i / (nk - 1) - 0.5) * bw * 0.2 : 0, cmw = lc1_meas(ctx, chunks[i], font, cs, { track: 0.02 }).w;
                var xb = W / 2 + sh - cmw / 2, nz = Math.min(rowH * 1.02, u * 0.5), nw = lc1_meas(ctx, '00', numFont, nz).w;
                var nx = jzClamp(xb + Math.min(cmw, nw) * 0.3, W * 0.04 + nw / 2, W * 0.96 - nw / 2);
                drawNum(i, nz, nx, y, 'center', true, [0, y - rowH * 0.75, W, rowH * 1.5]);
                L = lc1_main(ctx, chunks[i], { font: font, size: cs, x: xb, y: y, align: 'left', track: 0.02, color: sc.fg, mi: i * 3 });
                bb = jzUnion(bb, lc1_bb(L));
            }
            return bb;
        }
        var bw2 = W * (port ? 0.86 : 0.7), bx = (W - bw2) / 2, rh = Math.min(H * (port ? 0.62 : 0.72) / nk, u * (port ? 0.3 : 0.34)), nsz2 = rh * (port ? 0.56 : 0.72);
        var nW = lc1_meas(ctx, '00', numFont, nsz2).w + nsz2 * 0.3, cs2 = u * 0.2, y0 = H / 2 - nk * rh / 2;
        for (i = 0; i < nk; i++) cs2 = Math.min(cs2, lc1_fitSize(ctx, chunks[i], font, (bw2 - nW) * 0.96, rh * 0.6, { track: 0.02 }));
        for (i = 0; i < nk; i++) {
            var yy = y0 + (i + 0.5) * rh, re2 = lc1_e(0.06 + i * 0.08, 0.6, 'ioc') + '*K';
            lc1_line(ctx, 'row rule ' + (i + 1), [[bx, y0 + (i + 1) * rh], [bx + bw2, y0 + (i + 1) * rh]], sc.sub, lw, 0.8, re2);
            if (i === 0) { lc1_line(ctx, 'top rule', [[bx + bw2, y0], [bx, y0]], sc.fg, lw * 1.6, null, re2); lab(0, bx + bw2, y0 - ls * 0.9, 'right', lc1_e(0.1, 0.4, 'oc') + '*K'); }
            drawNum(i, nsz2, bx, yy + nsz2 * 0.02, 'left', false, [bx - 2, yy - rh / 2 + 2, nW, rh - 4]);
            L = lc1_main(ctx, chunks[i], { font: font, size: cs2, x: bx + nW, y: yy, align: 'left', track: 0.02, color: sc.fg, mi: i * 3 });
            bb = jzUnion(bb, lc1_bb(L));
        }
        return bb;
    }
});

/* ================================================================== 7 poster — ポスター */
jzReg('layout', 'poster', {
    plan: function (rng, cut, st) {
        var n = cut.n, port = cut.H > cut.W * 1.08, nl = n <= 3 ? 1 : Math.min(4, Math.ceil(n / (port ? 3.2 : 4.6)));
        return { font: rng.pick(jzFontsOf(st, ['display'])), lines: lc1_splitK(cut.text, nl, nl), variant: rng.pick(['stack', 'stack', 'block', 'tate']),
            dot: rng.chance(0.55), head: rng.pick(['LYRIC', 'SIDE A', 'VOL.', 'LIVE', 'TOUR']), ang: rng.pick([0, 0, -90]) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), k = lc1_k(ctx), port = jzPortrait(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), variant = jzP(ctx, 'variant', 'stack'), lines = jzP(ctx, 'lines', null), latin = jzHasLatin(c.text), mono = jzMonoF(ctx);
        var li = []; if (lines && lines.length) { for (i = 0; i < lines.length; i++) if (lines[i]) li.push(lines[i]); } if (!li.length) li.push(jzTrim(c.text));
        var ls = lc1_ls(ctx), mx = W * 0.07, my = H * 0.07, aw = W - mx * 2, credH = ls * 4.2, topH = ls * 2, y0 = my + topH + ls * 0.6, y1 = H - my - credH - ls * 0.8, avH = y1 - y0;
        var block = variant === 'block', tate = variant === 'tate' && !latin, plate = block ? lc1_plateCol(sc, [sc.accent, sc.ink]) : null, tc = block ? lc1_onCol(sc, plate) : sc.fg, lw = Math.max(1.2 * k, u * 0.0016);
        if (block) lc1_vbar(ctx, 'colour block', W / 2, 0, W, y1 + ls * 0.4, plate, 'ioe(time/0.5)*(1-ic(PO))', 1);
        var T = lc1_T(ctx, jzP(ctx, 'head', 'LYRIC') + '  ' + jzLineNo(ctx), { font: mono, size: ls, track: 0.3, align: 'left', x: mx, y: my + ls * 0.5, color: tc, name: 'head' }); lc1_fade(ctx, T, 0.1, 0.4);
        T = lc1_T(ctx, jzFmtTime(c.start), { font: mono, size: ls, track: 0.2, align: 'right', x: mx + aw, y: my + ls * 0.5, color: tc, name: 'time' }); lc1_fade(ctx, T, 0.1, 0.4);
        var re = lc1_e(0.05, 0.6, 'ioc') + '*K';
        lc1_line(ctx, 'head rule', [[mx, my + ls * 1.5], [mx + aw, my + ls * 1.5]], tc, lw, 0.8, re);
        var DQ = 'var q=cl((time-0.05)/0.45);var s=q<=0?0:ob(q,1.3)*(1-ic(PO));[value[0]*s,value[1]*s]', D, r, bb = null;
        var t = jzStrip(c.text), n = jzCount(t), per = port ? 6 : 5;
        if (tate) {
            if (!block) {
                var kc = Math.ceil(n / per), mxG0 = Math.min(per, Math.ceil(n / kc)), sz0 = Math.min(avH / (mxG0 * 0.98), aw * 0.8 / (kc * 1.14)), free = aw - kc * sz0 * 1.14;
                r = Math.min(avH * 0.36, free * 0.42);
                if (r > u * 0.06) { D = lc1_S(ctx, 'dot', mx + free * 0.48, y0 + avH / 2); lc1_ellipse(D, 'dot', r * 2, r * 2, 0, 0, sc.accent); jzSetExpr(jzXf(D, 'ADBE Scale'), lc1_H(ctx) + DQ); }
            }
        } else if (jzP(ctx, 'dot', false) && !block) {
            r = Math.min(aw, avH) * (port ? 0.34 : 0.3);
            D = lc1_S(ctx, 'dot', mx + aw - r * 0.9, y0 + r * 0.95); lc1_ellipse(D, 'dot', r * 2, r * 2, 0, 0, sc.accent); jzSetExpr(jzXf(D, 'ADBE Scale'), lc1_H(ctx) + DQ);
        }
        if (tate) {
            var cols = lc1_splitK(t, Math.ceil(n / per), Math.ceil(n / per)), mxG = 1, gap = 0.14;
            for (i = 0; i < cols.length; i++) { cols[i] = jzStrip(cols[i]); mxG = Math.max(mxG, jzCount(cols[i])); }
            var sz = Math.min(avH / (mxG * 0.98), aw * 0.8 / (cols.length * (1 + gap))), x = mx + aw - sz / 2;
            for (i = 0; i < cols.length; i++) {
                var V = lc1_vcols(ctx, [cols[i]], { font: font, size: sz, x: x, top: y0 + (avH - mxG * sz * 0.98) / 2, track: -0.02, color: tc, name: cols[i], lyric: true });
                jzAnimate(ctx, V.L, { mi: i * 3 }); bb = jzUnion(bb, V.bb);
                x -= sz * (1 + gap);
            }
        } else {
            var szs = [], tot = 0, th = 0;
            for (i = 0; i < li.length; i++) { szs.push(aw / Math.max(0.5, lc1_meas(ctx, li[i], font, 100, { track: -0.02 }).w / 100)); tot += szs[i] * 0.98; }
            var f = Math.min(1, avH / tot);
            for (i = 0; i < li.length; i++) { szs[i] *= f; th += szs[i] * 0.98; }
            var y = y0 + (avH - th) * (block ? 1 : 0.5);
            for (i = 0; i < li.length; i++) {
                y += szs[i] * 0.49;
                var L = lc1_main(ctx, li[i], { font: font, size: szs[i], x: mx, y: y, align: 'left', track: -0.02, color: tc, mi: i * 3 });
                bb = jzUnion(bb, lc1_bb(L));
                y += szs[i] * 0.49;
            }
        }
        // credits block
        var cy = H - my - credH, lw2 = Math.max(4 * k, u * 0.008);
        lc1_bar(ctx, 'credit bar', mx, cy + lw2 / 2, aw, lw2, sc.fg, re);
        var cols3 = [['DATE', jzFmtTime(c.start)], ['No.', jzLineNo(ctx) + ' / ' + jzPad(n, 2)], ['WORDS', lc1_deck(ctx) || jzRomajiOf(ctx) || jzFlat(c.text)]], cw3 = aw / 3;
        for (i = 0; i < 3; i++) {
            var a = lc1_e(0.2 + i * 0.08, 0.4, 'oc') + '*K', xc = mx + i * cw3, v = cols3[i][1];
            T = lc1_T(ctx, cols3[i][0], { font: mono, size: ls * 0.8, track: 0.3, align: 'left', x: xc, y: cy + lw2 + ls * 0.9, color: sc.sub, name: cols3[i][0] }); lc1_op(ctx, T, a, 1);
            var maxC = Math.max(3, Math.floor(cw3 * 0.9 / (ls * (jzHasLatin(v) ? 0.62 : 1.05))));
            T = lc1_T(ctx, lc1_ell(v, maxC), { font: jzBodyF(ctx), size: ls * 1.05, align: 'left', x: xc, y: cy + lw2 + ls * 2.4, color: sc.fg, name: 'credit ' + (i + 1) }); lc1_op(ctx, T, a, 1);
            if (i > 0) { var SL = lc1_line(ctx, 'credit rule ' + i, [[xc - ls * 0.5, cy + lw2 + ls * 0.4], [xc - ls * 0.5, cy + credH - ls * 0.3]], sc.sub, lw); lc1_op(ctx, SL, a, 0.6); }
        }
        return bb || lc1_box(mx, y0, mx + aw, y1);
    }
});

/* ================================================================== 8 swissGrid — スイスグリッド */
jzReg('layout', 'swissGrid', {
    plan: function (rng, cut, st) {
        var n = cut.n, kk = n <= 4 ? 1 : n <= 9 ? 2 : 3;
        return { font: rng.pick(jzFontsOf(st, ['display'])), chunks: lc1_splitK(cut.text, kk, kk), variant: rng.pick(['a', 'b']), shape: rng.pick(['circle', 'square', 'circle', 'bar']), label: rng.chance(0.7) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), k = lc1_k(ctx), port = jzPortrait(ctx), i, j;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), variant = jzP(ctx, 'variant', 'a'), shape = jzP(ctx, 'shape', 'circle'), ls = lc1_ls(ctx), mono = jzMonoF(ctx);
        var cols = port ? 4 : 6, rows = port ? 8 : 6, m = u * 0.07, gx0 = m * 1.35, gx1 = W - m, gy0 = m, gy1 = H - m, cw = (gx1 - gx0) / cols, rh = (gy1 - gy0) / rows;
        function X(q) { return gx0 + q * cw; }
        function Y(q) { return gy0 + q * rh; }
        var lw = Math.max(1 * k, u * 0.0012), G = lc1_S(ctx, 'grid', 0, 0);
        for (i = 0; i <= cols; i++) lc1_trim(ctx, lc1_path(G, 'col ' + i, [[X(i), gy0], [X(i), gy1]], sc.sub, lw), lc1_e(i * 0.035, 0.55, 'ioc') + '*K');
        for (i = 0; i <= rows; i++) lc1_trim(ctx, lc1_path(G, 'row ' + i, [[gx0, Y(i)], [gx1, Y(i)]], sc.sub, lw), lc1_e(0.05 + i * 0.035, 0.55, 'ioc') + '*K');
        jzXf(G, 'ADBE Opacity').setValue(38);
        for (i = 0; i < cols; i++) { var CN = lc1_T(ctx, jzPad(i + 1, 2), { font: mono, size: ls * 0.7, align: 'left', x: X(i) + ls * 0.3, y: gy0 - ls * 0.6, color: sc.sub, name: 'col ' + (i + 1) }); lc1_fade(ctx, CN, 0.2, 0.4, 0.8); }
        var chunks = lc1_chunks(ctx), nk = Math.min(3, chunks.length), half = Math.ceil(cols / 2), pl = [];
        if (nk === 1) pl = [{ c: 0, r: port ? 2 : 1, span: cols, hr: port ? 2.4 : 2.6 }];
        else if (variant === 'a') pl = [{ c: 0, r: 1, span: cols, hr: port ? 2 : 2.2 }, { c: port ? 1 : half, r: rows - (nk > 2 ? 3 : 2), span: cols - (port ? 1 : half), hr: 1 }, { c: port ? 1 : half, r: rows - 2 + (port ? 0.2 : 0.1), span: cols - (port ? 1 : half), hr: 1 }];
        else for (i = 0; i < 3; i++) { var cc = Math.round(i * cols / (nk + (port ? 1.5 : 0.8))); pl.push({ c: cc, r: (port ? 1 : 0.6) + i * (rows - 1.6) / nk, span: cols - cc, hr: port ? 1.6 : 1.4 }); }
        var sizes = [];
        for (i = 0; i < nk; i++) sizes.push(Math.min(lc1_fitSize(ctx, chunks[i], font, pl[i].span * cw - cw * 0.12, pl[i].hr * rh * 0.9, { track: -0.01 }), u * 0.28));
        if (nk > 1 && variant === 'a') { var mn = 1e9; for (i = 1; i < nk; i++) mn = Math.min(mn, sizes[i]); for (i = 1; i < nk; i++) sizes[i] = Math.min(sizes[i], sizes[0] * 0.6, mn); }
        var boxes = [], bb = null, th = Math.max(3 * k, u * 0.005);
        for (i = 0; i < nk; i++) {
            var q = pl[i], sz = sizes[i], x = X(q.c) + cw * 0.06, y = Y(q.r) + sz * 0.56;
            var L = lc1_main(ctx, chunks[i], { font: font, size: sz, x: x, y: y, align: 'left', track: -0.01, color: sc.fg, mi: i * 3 });
            var w = jzRect(L).width;
            boxes.push([x, Y(q.r), x + w, Y(q.r) + sz * 1.12]);
            lc1_bar(ctx, 'rule ' + (i + 1), X(q.c), Y(q.r) - th / 2, Math.min(q.span * cw, w + cw * 0.12), th, sc.fg, lc1_e(0.12 + i * 0.1, 0.5, 'ioc') + '*K');
            bb = jzUnion(bb, lc1_bb(L));
        }
        var cands = [[cols - 2, rows - 2, 2], [0, rows - 2, 2], [cols - 2, 0, 2], [cols - 1, rows - 1, 1], [0, rows - 1, 1], [cols - 1, 0, 1]], free = null;
        for (i = 0; i < cands.length && !free; i++) {
            var cq = cands[i], hit = false;
            for (j = 0; j < boxes.length; j++) { var b = boxes[j]; if (b[0] < X(cq[0] + cq[2]) && b[2] > X(cq[0]) && b[1] < Y(cq[1] + cq[2]) && b[3] > Y(cq[1])) hit = true; }
            if (!hit) free = cq;
        }
        if (free) {
            var bw2 = free[2] * cw, bh2 = free[2] * rh, cxs = X(free[0]) + bw2 / 2, cys = Y(free[1]) + bh2 / 2, R = Math.min(bw2, bh2) * 0.46;
            var QX = 'var q=cl((time-0.25)/0.45);var s=q<=0?0:ob(q,1.2)*(1-ic(PO));', SH;
            if (shape === 'bar') { SH = lc1_S(ctx, 'accent bar', X(free[0]) + cw * 0.06, cys); lc1_rect(SH, 'bar', bw2 - cw * 0.12, rh * 0.24, (bw2 - cw * 0.12) / 2, 0, sc.accent); jzSetExpr(jzXf(SH, 'ADBE Scale'), lc1_H(ctx) + QX + '[value[0]*s,value[1]]'); }
            else {
                SH = lc1_S(ctx, 'accent ' + shape, cxs, cys);
                if (shape === 'square') lc1_rect(SH, 'square', R * 2, R * 2, 0, 0, sc.accent); else lc1_ellipse(SH, 'circle', R * 2, R * 2, 0, 0, sc.accent);
                jzSetExpr(jzXf(SH, 'ADBE Scale'), lc1_H(ctx) + QX + '[value[0]*s,value[1]*s]');
            }
        }
        if (jzP(ctx, 'label', true)) {
            var LB = lc1_T(ctx, 'JIZURA  ／  No.' + jzLineNo(ctx) + '  ／  ' + jzFmtTime(c.start), { font: mono, size: ls * 0.8, track: 0.25, x: m * 0.62, y: (gy0 + gy1) / 2, rot: -90, color: sc.sub, name: 'label' });
            lc1_fade(ctx, LB, 0.3, 0.4);
        }
        return bb;
    }
});

/* ---- greeked copy (dashed lines = rows / columns of small glyphs) and halftone "photos", as shape groups */
function lc1_greek(S, name, x, y, w, h, lh, col, seed, vertical) {
    var g = jzGrp(S, name), gz = lh / 1.45, n = Math.min(160, Math.floor((vertical ? w : h) / lh)), span = vertical ? h : w;
    for (var r = 0; r < n; r++) {
        var endP = jzR(seed, r, 3) < 0.12, ind = (r === 0 || jzR(seed, r - 1, 3) < 0.12) ? gz * 1.02 : 0;
        var len = (endP ? span * (0.2 + 0.55 * jzR(seed, r, 4)) : span) - ind;
        if (len <= gz) continue;
        if (vertical) { var xx = x + w - (r + 0.5) * lh; jzAddPath(g, [[xx, y + ind], [xx, y + ind + len]]); }
        else { var yy = y + (r + 0.5) * lh; jzAddPath(g, [[x + ind, yy], [x + ind + len, yy]]); }
    }
    var st = jzAddStroke(g, col, Math.max(1, gz * 0.72)); lc1_dash(st, gz * 0.78, gz * 0.24);
    return lc1_front(g);
}
// dot screen whose dot size follows a silhouette (kind 0 = head + shoulders, 1 = landscape); coarser than the browser's
function lc1_halftone(S, name, x, y, w, h, col, bgc, seed, kind) {
    var g = jzGrp(S, name), dg = lc1_sub(g, 'dots'), d = Math.max(4, Math.min(w, h) / 12), cols = Math.min(40, Math.ceil(w / d)), rows = Math.min(40, Math.ceil(h / d));
    var hx = 0.35 + 0.3 * jzR(seed, 1), hy = 0.36;
    for (var j = 0; j <= rows; j++) for (var i = 0; i <= cols; i++) {
        var px = (i + (j % 2) * 0.5) / cols, py = j / rows, v;
        if (kind === 0) {
            var ex = (px - hx) * w / h, dh = Math.sqrt(ex * ex + (py - hy) * (py - hy)) / 0.2, e2 = ex * 0.55, ds = Math.sqrt(e2 * e2 + ((py - 1.05) / 0.9) * ((py - 1.05) / 0.9)) / 0.36;
            v = Math.max(0, 1 - Math.min(dh, ds) * 0.85) * 0.9 + 0.12 * (1 - py);
        } else v = py > 0.62 ? 0.75 - (py - 0.62) : 0.18 + 0.5 * Math.max(0, 1 - Math.sqrt((px - hx) * (px - hx) + (py - 0.4) * (py - 0.4)) / 0.18);
        var r = d * 0.5 * Math.sqrt(jzClamp(v, 0, 1)), cx = x + px * w, cy = y + py * h;
        if (r < 0.4 || cx - r < x || cx + r > x + w || cy - r < y || cy + r > y + h) continue;
        jzAddEllipse(dg, r * 2, r * 2, cx, cy);
    }
    jzAddFill(dg, col);
    var bgG = lc1_sub(g, 'paper');                  // added after the dots = drawn behind them
    jzAddRect(bgG, Math.max(1, w), Math.max(1, h), 0, x + w / 2, y + h / 2); jzAddFill(bgG, bgc);
    return lc1_front(g);
}

/* ================================================================== 9 dictionary — 辞書 */
jzReg('layout', 'dictionary', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), variant: rng.pick(['entry', 'page', 'page']), pos: rng.pick(['名', '連語', '感', '形動', '副']),
            page: rng.int(120, 1480), tabY: rng.range(0.2, 0.75), mark: rng.pick(['◆', '▼', '■']), seed: rng.int(1, 9999) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), k = lc1_k(ctx), port = jzPortrait(ctx), i;
        var font = jzP(ctx, 'font', jzSerifF(ctx)), page = jzP(ctx, 'variant', 'page') === 'page', pos = jzP(ctx, 'pos', '名'), seed = jzP(ctx, 'seed', 5), t0 = jzTrim(c.text), latin = jzHasLatin(t0);
        var ls = lc1_ls(ctx), mono = jzMonoF(ctx), serif = jzSerifF(ctx), mx = W * (port ? 0.08 : 0.1), aw = W - mx * 2 - (port ? W * 0.04 : W * 0.03), lw = Math.max(1, u * 0.0014);
        var fb = lc1_fitBlock(ctx, t0, font, aw * (port ? 0.84 : 0.72), H * (port ? 0.26 : 0.3), { track: 0.02, lead: 1.1 }, port ? 3 : 2);
        var size = Math.min(fb.size, u * 0.17), nL = fb.lines, mh = size * (1 + (nL - 1) * 1.1), hx = mx + size * 0.62, hy = H * (page ? 0.44 : 0.4);
        var fs = jzClamp(u * 0.02, 11 * k, 24 * k), lh = fs * 1.8, src = jzFlat(c.lineText || t0) + (latin ? ' — ' : '。');
        var top = hy - mh / 2 - size * 0.55 - ls * 1.6;
        var defs = [lc1_deck(ctx) || ('歌詞 第' + lc1_kanjiNum(lc1_lineN(ctx)) + '行。'), jzFmtTime(c.start) + ' ─ ' + jzFmtTime(c.end) + '　' + jzCount(t0) + (latin ? ' chars' : '字')];
        var dfs = jzClamp(u * 0.028, 14 * k, 36 * k), defTop = hy + mh / 2 + size * 0.45, defBot = defTop + defs.length * dfs * 1.7 + dfs, T;
        var lines = lc1_lines(fb.text);
        if (page) {
            var CA = 'oc(time/0.5)*K', rowsA = Math.max(0, Math.floor((top - H * 0.1) / lh)), rowsB = Math.max(0, Math.floor((H * 0.9 - defBot) / lh));
            var RA = lc1_rowsText(ctx, lc1_bodyRows(src, aw, fs, rowsA, seed), { font: jzBodyF(ctx), size: fs, w: aw, lh: lh, x: mx, y: top - rowsA * lh, color: sc.sub, rv: CA, name: 'entries above' });
            if (RA) lc1_op(ctx, RA, CA + '*0.4', 1);
            var RB = lc1_rowsText(ctx, lc1_bodyRows(src, aw, fs, rowsB, seed + 31), { font: jzBodyF(ctx), size: fs, w: aw, lh: lh, x: mx, y: defBot + lh * 0.5, color: sc.sub, rv: CA, name: 'entries below' });
            if (RB) lc1_op(ctx, RB, CA + '*0.4', 1);
            // highlighter sweep behind the headword
            var HE = 'var HE=ioc((time-' + jzN(c.inDur * 0.6) + ')/0.5)*(1-oc(PO*1.15));';
            for (i = 0; i < nL; i++) {
                var w = lc1_meas(ctx, lines[i], font, size, { track: 0.02 }).w, ly0 = hy + (i - (nL - 1) / 2) * size * 1.1;
                var HB = lc1_bar(ctx, 'highlight ' + (i + 1), hx - size * 0.1, ly0 - size * 0.05 + size * 0.25, w + size * 0.2, size * 0.5, sc.accent, 'cl(HE*' + nL + '-' + i + ')', 1, 0.45, HE);
            }
        }
        // guide header
        var GA = lc1_e(0.1, 0.4, 'oc') + '*K';
        T = lc1_T(ctx, lc1_pad3(jzP(ctx, 'page', 300) % 1000), { font: mono, size: ls, align: 'left', x: mx, y: H * 0.055, color: sc.sub, name: 'page' }); lc1_op(ctx, T, GA, 1);
        T = lc1_T(ctx, (jzChars(jzStrip(t0))[0] || '') + '  ─  ' + lc1_cut(jzRomajiOf(ctx) || jzFlat(t0), 14), { font: serif, size: ls, align: 'right', x: mx + aw, y: H * 0.055, color: sc.sub, name: 'guide word' }); lc1_op(ctx, T, GA, 1);
        lc1_line(ctx, 'guide rule', [[mx, H * 0.055 + ls * 0.9], [mx + aw, H * 0.055 + ls * 0.9]], sc.sub, lw, 0.6, GA);
        // entry furniture
        var FA = lc1_e(0.05, 0.35, 'oc') + '*K';
        T = lc1_T(ctx, jzP(ctx, 'mark', '◆'), { font: jzBodyF(ctx), size: size * 0.32, x: mx, y: hy - mh / 2 + size * 0.5, color: sc.accent, name: 'mark' }); lc1_op(ctx, T, FA, 1);
        var rom = jzRomajiOf(ctx);
        if (rom) { T = lc1_T(ctx, rom.toLowerCase(), { font: serif, size: ls * 1.2, track: 0.15, align: 'left', x: hx, y: hy - mh / 2 - ls * 1.2, color: sc.sub, name: 'reading' }); lc1_op(ctx, T, FA, 1); }
        var L = lc1_main(ctx, fb.text, { font: font, size: size, x: hx, y: hy, align: 'left', track: 0.02, lead: 1.1, color: sc.fg });
        var bb = lc1_bb(L);
        var lastW = lc1_meas(ctx, lines[nL - 1], font, size, { track: 0.02 }).w, ly = hy + (nL - 1) / 2 * size * 1.1;
        var pw = ls * (pos.length * 1.25 + 0.9), over = hx + lastW + size * 0.3 > W - mx - pw, px = Math.min(hx + lastW + size * 0.3, W - mx - pw), pyy = ly + (over ? size * 0.75 : 0);
        var PA = 'cl(ob((time-' + jzN(c.inDur * 0.7) + ')/0.35,1.70158)*K)';
        var PB = lc1_S(ctx, 'part of speech', px + pw / 2, pyy); lc1_rect(PB, 'box', pw, ls * 1.7, 0, 0, null, { round: ls * 0.3, stroke: sc.fg, sw: lw * 1.4 }); lc1_op(ctx, PB, PA, 1);
        T = lc1_T(ctx, pos, { font: serif, size: ls * 1.1, x: px + pw / 2, y: pyy, color: sc.fg, name: pos }); lc1_op(ctx, T, PA, 1);
        // definitions
        for (i = 0; i < defs.length; i++) {
            var d = c.inDur * 0.8 + 0.1 + i * 0.12, y = defTop + dfs * 0.8 + i * dfs * 1.7, A = lc1_e(d, 0.4, 'oc') + '*K';
            var DC = lc1_S(ctx, 'def ' + (i + 1), hx + dfs * 0.45, y); lc1_ellipse(DC, 'badge', dfs * 0.96, dfs * 0.96, 0, 0, sc.fg); lc1_op(ctx, DC, A, 1);
            T = lc1_T(ctx, String(i + 1), { font: mono, size: dfs * 0.62, x: hx + dfs * 0.45, y: y, color: sc.bg, name: 'def no ' + (i + 1) }); lc1_op(ctx, T, A, 1);
            var maxC = Math.max(4, Math.floor((aw - dfs * 2) / (dfs * (jzHasLatin(defs[i]) ? 0.55 : 1.02))));
            T = lc1_T(ctx, lc1_ell(defs[i], maxC), { font: serif, size: dfs, align: 'left', x: hx + dfs * 1.4, y: y, color: sc.fg, name: 'definition ' + (i + 1) });
            lc1_slide(ctx, T, d, 0.4, dfs, 0);
        }
        // thumb index tab on the page edge
        var tw = u * 0.075, th = u * 0.16, ty = H * 0.1 + (H * 0.8 - th) * jzP(ctx, 'tabY', 0.5), tabC = lc1_plateCol(sc, [sc.ink, sc.fg]), TQ = 'var TQ=' + lc1_e(0.15, 0.5) + '*K;';
        var EL = lc1_line(ctx, 'page edge', [[W - tw * 1.05, H * 0.04], [W - tw * 1.05, H * 0.96]], sc.sub, lw); lc1_op(ctx, EL, 'TQ', 0.35, TQ);
        var TB = lc1_S(ctx, 'thumb tab', W, ty + th / 2); lc1_rect(TB, 'tab', tw + 2, th, (tw + 2) / 2, 0, tabC);
        jzSetExpr(jzXf(TB, 'ADBE Position'), lc1_H(ctx) + TQ + '[value[0]-' + jzN(tw) + '*TQ,value[1]]');
        lc1_op(ctx, TB, 'TQ>0.01?1:0', 1, TQ);
        T = lc1_T(ctx, jzChars(jzStrip(t0))[0] || '', { font: font, size: tw * 0.62, color: lc1_onCol(sc, tabC), name: 'tab initial' }); lc1_parent(T, TB, tw * 0.5, 0);
        return bb;
    }
});

/* ================================================================== 10 ema — 絵馬 */
function lc1_emaPts(w, h, oy) { var r = h * 0.26; oy = oy || 0; return [[-w / 2, -h / 2 + r + oy], [0, -h / 2 + oy], [w / 2, -h / 2 + r + oy], [w / 2, h / 2 + oy], [-w / 2, h / 2 + oy]]; }
jzReg('layout', 'ema', {
    plan: function (rng, cut, st) {
        var font = rng.chance(0.55) ? rng.pick(['klee', 'brush']) : rng.pick(jzFontsOf(st, ['serif', 'display']));
        var vert = !jzHasLatin(cut.text) && rng.chance(0.5), emblem = rng.pick(['sun', 'wave', 'mount', 'knot']), swing = rng.range(12, 20) * rng.pick([1, -1]), back = [];
        for (var i = 0; i < 7; i++) back.push([rng.range(-1, 1), rng.range(-8, 8), rng.range(0.8, 1.05), rng.int(0, 99)]);
        return { font: font, vert: vert, emblem: emblem, swing: swing, back: back };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), k = lc1_k(ctx), port = jzPortrait(ctx), i;
        var font = jzP(ctx, 'font', 'klee'), swing = jzP(ctx, 'swing', 15), back = jzP(ctx, 'back', null), emblem = jzP(ctx, 'emblem', 'sun'), ls = lc1_ls(ctx), C = lc1_card(sc);
        if (!back || !back.length) { back = []; for (i = 0; i < 7; i++) back.push([jzR(c.seed, i, 1) * 2 - 1, jzR(c.seed, i, 2) * 16 - 8, 0.8 + 0.25 * jzR(c.seed, i, 3), Math.floor(jzR(c.seed, i, 4) * 99)]); }
        var wood = jzMixHex(C.fill, lc1_plateCol(sc, [sc.accent, sc.accent2, sc.sub], C.fill, 1.3), 0.16), woodD = jzMixHex(wood, jzDarkest(sc), 0.35), ink = lc1_onCol(sc, wood);
        var cord = lc1_plateCol(sc, [sc.accent, sc.accent2, sc.fg], wood, 1.6);
        var hw = port ? W * 0.8 : Math.min(W * 0.52, H * 0.9), ph = hw * 0.7, cordL = H * (port ? 0.06 : 0.08), rackY = port ? H / 2 - cordL - ph * 0.55 : H * 0.13;
        // rack beam
        lc1_bar(ctx, 'rack', W * 0.04, rackY, W * 0.92, u * 0.024, woodD, 'oc(time/0.45)*K');
        // plaques hanging behind
        var nb = port ? 4 : 7, bw = port ? W * 0.22 : Math.min(W * 0.12, H * 0.22), bh = bw * 0.72;
        for (i = 0; i < nb; i++) {
            var b = back[i % back.length], x = W * (0.08 + 0.84 * (i + 0.5) / nb) + b[0] * bw * 0.12, k2 = b[2], oy = bh * 0.55 * k2 + bh * 0.2;
            var BP = lc1_S(ctx, 'plaque ' + (i + 1), x, rackY);
            lc1_path(BP, 'cord', [[-bw * 0.08, -bh * 0.55 * k2 - bh * 0.2 + 2 + oy], [0, -bh * 0.3 * k2 + oy], [bw * 0.08, -bh * 0.55 * k2 - bh * 0.2 + 2 + oy]], cord, Math.max(1.5 * k, u * 0.002));
            lc1_path(BP, 'board', lc1_emaPts(bw * k2, bh * k2, oy), woodD, Math.max(1, u * 0.0016), { closed: true, fill: jzMixHex(wood, sc.bg, 0.35) });
            var gG = lc1_greek(BP, 'wish', -bw * k2 * 0.34, -bh * k2 * 0.05 + oy, bw * k2 * 0.68, bh * k2 * 0.4, bh * k2 * 0.13, ink, b[3], false);
            jzGX(gG).property('ADBE Vector Group Opacity').setValue(35);
            jzSetExpr(jzXf(BP, 'ADBE Rotate Z'), lc1_H(ctx) + 'value+' + jzN(b[1]) + '+Math.sin(time*1.1+' + i + ')*1.2');
            lc1_op(ctx, BP, 'cl(ob(cl((time-' + jzN(0.02 + i * 0.03) + ')/0.4),1.2)*2)*K*0.8', 1);
        }
        // the hero plaque swings in on its cord and settles
        var HS = 'var TD=Math.max(0,time-0.08),HA=cl(time/0.12)*(1-cl((PO-0.5)/0.5));';
        var R = lc1_S(ctx, 'ema', W / 2, rackY), PY = cordL + ph * 0.5, r = ph * 0.26;
        jzSetExpr(jzXf(R, 'ADBE Position'), lc1_H(ctx) + HS + '[value[0],value[1]+(1-ob(cl(TD/0.45),1.3))*' + jzN(-H * 0.5) + ']');
        jzSetExpr(jzXf(R, 'ADBE Rotate Z'), lc1_H(ctx) + HS + 'var SW=' + jzN(swing) + ';value+SW*Math.exp(-TD*2.6)*Math.cos(TD*6)*cl(TD/0.1)+Math.sin(time*0.9)*0.8+ic(PO)*SW');
        lc1_op(ctx, R, 'HA', 1, HS);
        lc1_path(R, 'cord', [[0, 0], [-hw * 0.06, cordL], [0, cordL + ph * 0.1], [hw * 0.06, cordL], [0, 0]], cord, Math.max(2 * k, u * 0.003), { join: 2 });
        var sh = lc1_emaPts(hw, ph, PY), shp = [];
        for (i = 0; i < sh.length; i++) shp.push([sh[i][0] + u * 0.01, sh[i][1] + u * 0.014]);
        lc1_path(R, 'shadow', shp, null, 0, { closed: true, fill: jzDarkest(sc), fop: lc1_shA(sc) * 100 });
        lc1_path(R, 'board', sh, null, 0, { closed: true, fill: wood });
        var grain = jzGrp(R, 'grain');
        for (i = 0; i < 7; i++) { var gy = -ph / 2 + r + (ph - r) * (i + 0.5) / 7 + PY; jzAddPath(grain, [[-hw / 2 + 4, gy], [-hw * 0.2, gy + ph * 0.02 * Math.sin(i)], [hw * 0.2, gy - ph * 0.02], [hw / 2 - 4, gy + ph * 0.01]]); }
        jzAddStroke(grain, woodD, Math.max(1, u * 0.0015), 12); lc1_front(grain);
        lc1_path(R, 'roof', [[-hw / 2, -ph / 2 + r + PY], [0, -ph / 2 + PY], [hw / 2, -ph / 2 + r + PY]], woodD, Math.max(4 * k, ph * 0.05), { join: 2 });
        lc1_ellipse(R, 'hole', ph * 0.07, ph * 0.07, 0, -ph / 2 + ph * 0.1 + PY, sc.bg, { stroke: woodD, sw: 1.5 * k });
        var ey = -ph / 2 + r * 1.05 + PY, es = ph * 0.1, emb = lc1_plateCol(sc, [sc.accent, sc.accent2, ink], wood, 1.8), j;
        if (emblem === 'sun') lc1_ellipse(R, 'sun', es * 2, es * 2, -hw * 0.3, ey, emb);
        else if (emblem === 'wave') for (j = 0; j < 2; j++) { var pp = []; for (i = 0; i <= 12; i++) pp.push([-hw * 0.38 + hw * 0.16 * i / 12, ey + j * es * 0.7 + Math.sin(i / 12 * Math.PI * 2) * es * 0.25]); lc1_path(R, 'wave ' + j, pp, emb, Math.max(2 * k, es * 0.18), { cap: 2 }); }
        else if (emblem === 'mount') lc1_path(R, 'mount', [[-hw * 0.4, ey + es * 0.7], [-hw * 0.3, ey - es * 0.8], [-hw * 0.2, ey + es * 0.7]], null, 0, { closed: true, fill: emb });
        else { lc1_ellipse(R, 'knot 1', es * 1.2, es * 1.2, -hw * 0.32, ey, null, { stroke: emb, sw: Math.max(2 * k, es * 0.2) }); lc1_ellipse(R, 'knot 2', es * 1.2, es * 1.2, -hw * 0.26, ey, null, { stroke: emb, sw: Math.max(2 * k, es * 0.2) }); }
        var T = lc1_T(ctx, '奉納', { font: jzSerifF(ctx), size: es * 1.1, track: 0.3, x: hw * 0.3, y: ey, color: ink, name: 'hounou' });
        T.setParentWithJump(R); lc1_op(ctx, T, 'HA*0.8', 1, HS);
        // the wish (lyric), handwritten
        var t0 = jzTrim(c.text), ax = -hw * 0.42, aw = hw * 0.84, ay = -ph / 2 + r * 1.6, ah = ph / 2 - ay - ph * 0.14, fb, size, L, mi = lc1_mi(ctx, 0.35);
        if (jzP(ctx, 'vert', false) && !jzHasLatin(t0)) {
            fb = lc1_fitBlock(ctx, lc1_vtext(t0), font, aw, ah, { vertical: true, lead: 1.3, track: 0.04 }, 3); size = Math.min(fb.size, ph * 0.34);
            var vl = lc1_lines(fb.text), vm = lc1_vmeas(vl, size, { lead: 1.3, track: 0.04 });
            L = lc1_vcols(ctx, vl, { font: font, size: size, x: 0, top: ay + (ah - vm.h) / 2 + PY, lead: 1.3, track: 0.04, rot: 1.5, color: ink, name: t0, lyric: true }).L;
        } else {
            fb = lc1_fitBlock(ctx, t0, font, aw, ah, { lead: 1.2, track: 0.02 }, 3); size = Math.min(fb.size, ph * 0.3);
            L = lc1_T(ctx, fb.text, { font: font, size: size, x: 0, y: ay + ah / 2 + PY, lead: 1.2, track: 0.02, rot: -1.5, color: ink, name: t0, lyric: true });
        }
        L.setParentWithJump(R);
        jzAnimate(ctx, L, { mi: mi, noHold: true, treat: false });
        T = lc1_T(ctx, 'No.' + jzLineNo(ctx) + '  ' + jzFmtTime(c.start), { font: jzMonoF(ctx), size: ls * 0.8, track: 0.15, align: 'right', x: hw * 0.44, y: ph * 0.42 + PY, color: ink, name: 'number' });
        T.setParentWithJump(R); lc1_op(ctx, T, 'HA*0.6', 1, HS);
        return lc1_box(W / 2 - hw / 2, rackY + cordL, W / 2 + hw / 2, rackY + cordL + ph);
    }
});

/* ================================================================== 11 ransom — 切り抜き文字 */
function lc1_slots(t) { return jzChars(jzTrim(String(t || '')).replace(/[\s　]+/g, ' ')); }
jzReg('layout', 'ransom', {
    plan: function (rng, cut, st) {
        var base = jzFontsOf(st, ['display', 'serif', 'body']).concat(jzFontsOf(st, ['mono'])), extra = ['mincho_black', 'gothic_black', 'pop', 'dot', 'brush'], fonts = [], i;
        for (i = 0; i < extra.length; i++) if (JZ_FONT_CANDIDATES[extra[i]] && rng.chance(0.35)) base.push(extra[i]);
        for (i = 0; i < base.length; i++) if (jzIndexOf(fonts, base[i]) < 0) fonts.push(base[i]);
        var units = lc1_slots(cut.text), look = [];
        for (i = 0; i < units.length; i++) look.push([rng.int(0, fonts.length - 1), rng.int(0, 5), rng.range(-9, 9), rng.range(0.84, 1.16), rng.range(-0.1, 0.1), rng.int(0, 999)]);
        return { fonts: fonts, look: look, tilt: rng.range(-3, 3), shadow: rng.chance(0.7) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), k = lc1_k(ctx), port = jzPortrait(ctx), i, j;
        var units = lc1_slots(c.text), n = units.length;
        if (!n) return null;
        var perRow = port ? Math.min(n, n <= 4 ? 4 : Math.ceil(n / Math.ceil(n / 4))) : Math.min(n, n <= 8 ? 8 : Math.ceil(n / 2)), rowsA = [], cur;
        if (jzHasLatin(c.text)) {
            var words = [], i0 = 0, len = 0, target = perRow;
            cur = [];
            for (i = 0; i <= n; i++) if (i === n || units[i] === ' ') { if (i > i0) words.push([i0, i]); i0 = i + 1; }
            for (i = 0; i < words.length; i++) target = Math.max(target, words[i][1] - words[i][0]);
            for (i = 0; i < words.length; i++) {
                var wl = words[i][1] - words[i][0];
                if (cur.length && len + 1 + wl > target) { rowsA.push(cur); cur = []; len = 0; }
                if (cur.length) { cur.push(-1); len++; }
                for (j = words[i][0]; j < words[i][1]; j++) cur.push(j);
                len += wl;
            }
            if (cur.length) rowsA.push(cur);
        } else for (i = 0; i < n; i += perRow) { cur = []; for (j = i; j < Math.min(n, i + perRow); j++) cur.push(j); rowsA.push(cur); }
        perRow = 1;
        for (i = 0; i < rowsA.length; i++) perRow = Math.max(perRow, rowsA[i].length);
        var rowsN = rowsA.length, base = Math.min(W * 0.84 / (perRow * 1.18), H * 0.64 / (rowsN * 1.35), u * 0.26), place = {};
        for (i = 0; i < rowsN; i++) for (j = 0; j < rowsA[i].length; j++) if (rowsA[i][j] >= 0) place[rowsA[i][j]] = [i, j, rowsA[i].length];
        var C = lc1_card(sc), pal = [[lc1_plateCol(sc, [sc.ink, sc.fg]), null], [C.fill, null], [lc1_plateCol(sc, [sc.accent, sc.ink]), null], [lc1_plateCol(sc, [sc.accent2, sc.sub, sc.accent]), null], [jzDarkest(sc), null], [C.fill, 'line']];
        var fonts = jzP(ctx, 'fonts', null), look = jzP(ctx, 'look', []), tilt = jzP(ctx, 'tilt', 0), shadow = jzP(ctx, 'shadow', true), bb = null;
        if (!fonts || !fonts.length) fonts = ['gothic_black'];
        for (i = 0; i < n; i++) {
            var ch = units[i]; if (ch === ' ') continue;
            var lk = look[i] || [0, 0, 0, 1, 0, i], pl = place[i]; if (!pl) continue;
            var sz = base * lk[3], x = W / 2 + (pl[1] - (pl[2] - 1) / 2) * base * 1.18 + (jzR(lk[5], 1) * 2 - 1) * base * 0.05, y = H / 2 + (pl[0] - (rowsN - 1) / 2) * base * 1.35 + lk[4] * base;
            var font = fonts[lk[0] % fonts.length], fill = pal[lk[1] % pal.length][0], mode = pal[lk[1] % pal.length][1];
            if (jzContrast(fill, sc.bg) < 1.25 && mode !== 'line') mode = 'edge';
            var tc = lc1_onCol(sc, fill), t0 = 0.03 + i * jzClamp(0.4 / n, 0.025, 0.07);
            var w = sz * (Math.max(0.55, lc1_adv(ch)) + 0.26 + 0.14 * jzR(lk[5], 11)), h = sz * (1.2 + 0.18 * jzR(lk[5], 12)), pts = [];
            for (var s2 = 0; s2 < 4; s2++) for (var m = 0; m < 4; m++) {
                var f = m / 4, jit = (jzR(lk[5], s2, m) * 2 - 1) * sz * 0.045;
                if (s2 === 0) pts.push([-w / 2 + w * f, -h / 2 + jit]); else if (s2 === 1) pts.push([w / 2 + jit, -h / 2 + h * f]);
                else if (s2 === 2) pts.push([w / 2 - w * f, h / 2 + jit]); else pts.push([-w / 2 + jit, h / 2 - h * f]);
            }
            var QH = 'var Q=cl((time-' + jzN(t0) + ')/0.16);';
            var S = lc1_S(ctx, 'scrap ' + (i + 1), x, y);
            if (shadow) { var sp = []; for (j = 0; j < pts.length; j++) sp.push([pts[j][0] + sz * 0.05, pts[j][1] + sz * 0.07]); lc1_path(S, 'shadow', sp, null, 0, { closed: true, fill: jzDarkest(sc), fop: 45 }); }
            if (mode === 'line') lc1_path(S, 'scrap', pts, sc.fg, Math.max(1.5 * k, sz * 0.02), { closed: true, fill: sc.bg });
            else lc1_path(S, 'scrap', pts, mode === 'edge' ? jzMixHex(sc.fg, fill, 0.4) : null, Math.max(1 * k, sz * 0.012), { closed: true, fill: fill });
            jzXf(S, 'ADBE Rotate Z').setValue(lk[2] + tilt);
            jzSetExpr(jzXf(S, 'ADBE Scale'), lc1_H(ctx) + QH + 'var s=(1.5-0.5*oc(Q))*(1-ic(PO)*0.25);[value[0]*s,value[1]*s]');
            lc1_op(ctx, S, 'Q<=0?0:cl(Q*2.5)*(1-oc(PO*1.1))', 1, QH);
            var L = lc1_T(ctx, ch, { font: font, size: sz, x: 0, y: sz * 0.02, color: mode === 'line' ? sc.fg : tc, name: ch, lyric: true });
            L.setParentWithJump(S);
            jzAnimate(ctx, L, { mi: lc1_mi(ctx, t0), noHold: lc1_plateHold(ctx), treat: false });
            bb = jzUnion(bb, lc1_box(x - w / 2, y - h / 2, x + w / 2, y + h / 2));
        }
        return bb;
    }
});

/* ================================================================== 12 newspaper — 新聞 */
jzReg('layout', 'newspaper', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), variant: jzHasLatin(cut.text) ? 'yoko' : rng.pick(['yoko', 'tate', 'tate']), spin: rng.chance(0.45), rev: rng.chance(0.6),
            seed: rng.int(1, 9999), mast: rng.pick(['字面新聞', '歌詞新報', '夜更新聞']), issue: rng.int(1000, 29999) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), k = lc1_k(ctx), port = jzPortrait(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), spin = jzP(ctx, 'spin', false), rev = jzP(ctx, 'rev', true), seed = jzP(ctx, 'seed', 3), mast = String(jzP(ctx, 'mast', '字面新聞'));
        var C = lc1_card(sc), ls = lc1_ls(ctx), pw = W * (port ? 0.92 : 0.9), ph = H * 0.9, cx = W / 2, cy = H / 2, t0 = jzTrim(c.text);
        // the sheet: classic spinning newspaper, or a slide up; everything else rides on it
        var R = lc1_S(ctx, 'newspaper', cx, cy);
        if (spin) {
            jzSetExpr(jzXf(R, 'ADBE Rotate Z'), lc1_H(ctx) + 'value+(1-oc(time/0.6))*720');
            jzSetExpr(jzXf(R, 'ADBE Scale'), lc1_H(ctx) + 'var s=Math.max(0.001,oc(time/0.6));[value[0]*s,value[1]*s]');
            jzSetExpr(jzXf(R, 'ADBE Position'), lc1_H(ctx) + '[value[0],value[1]+ic(PO)*' + jzN(H * 0.08) + ']');
        } else jzSetExpr(jzXf(R, 'ADBE Position'), lc1_H(ctx) + '[value[0],value[1]+(1-oe(time/0.45))*' + jzN(H * 0.9) + '+ic(PO)*' + jzN(H * 0.08) + ']');
        lc1_op(ctx, R, '1-ic(PO)', 1);
        lc1_shadow(R, sc, u * 0.02);
        function P(x, y) { return [x - pw / 2, y - ph / 2]; }
        function rectP(name, x, y, w, h, col, o) { return lc1_rect(R, name, w, h, x + w / 2 - pw / 2, y + h / 2 - ph / 2, col, o); }
        rectP('sheet', 0, 0, pw, ph, C.fill, C.edge ? { stroke: C.line, sw: 1 * k } : null);
        var m = pw * 0.035, tx = C.text, lw = Math.max(1, u * 0.0013), hl = lc1_plateCol(sc, [sc.accent], C.fill, 2) === sc.accent ? sc.accent : tx;
        var mw = Math.min(pw * 0.13, ph * 0.12), mh = Math.min(ph * 0.34, mw * 2.6), mX = pw - m - mw, mY = m;
        rectP('masthead', mX, mY, mw, mh, hl);
        var fs = jzClamp(u * 0.012, 7 * k, 15 * k), lh = fs * 1.45, bodyX1 = mX - m * 0.6, RV = 'cl((time-0.2)/0.9)', rules = [];
        function tier(x0, y0, x1, y1, sd) { if (x1 - x0 < lh || y1 - y0 < fs * 2) return; var g = lc1_greek(R, 'copy', x0 - pw / 2, y0 + fs * 0.4 - ph / 2, x1 - x0, y1 - y0 - fs * 0.8, lh, tx, sd, true); lc1_gOp(ctx, g, '0.42*' + RV); }
        function photo(x0, y0, w, h, kind) {
            if (w < 4 || h < 4) return;
            var g = lc1_halftone(R, 'photo', x0 - pw / 2, y0 - ph / 2, w, h, tx, jzMixHex(C.fill, tx, 0.12), seed, kind); lc1_gOp(ctx, g, RV);
            var cg = lc1_path(R, 'caption', [P(x0, y0 + h + fs * 0.6), P(x0 + w * 0.7, y0 + h + fs * 0.6)], tx, fs * 0.5); jzGX(cg).property('ADBE Vector Group Opacity').setValue(35);
        }
        function rule(x0, y, x1) { rules.push([P(x0, y), P(x1, y)]); }
        var size, fb, L, bb, mi = lc1_mi(ctx, spin ? 0.45 : 0.3), T;
        if (jzP(ctx, 'variant', 'yoko') === 'tate' && !jzHasLatin(t0)) {
            var hw = pw * (port ? 0.34 : 0.26), hh = ph - m * 2, hX1 = mX - m * 0.8;
            fb = lc1_fitBlock(ctx, jzStrip(t0), font, hw * 0.92, hh * 0.94, { vertical: true, lead: 1.1, track: -0.02 }, 2); size = fb.size;
            var vl = lc1_lines(fb.text), mm = lc1_vmeas(vl, size, { lead: 1.1, track: -0.02 });
            if (rev) rectP('reverse', hX1 - mm.w - size * 0.3, m, mm.w + size * 0.3, mm.h + size * 0.4, tx);
            var bx1 = hX1 - mm.w - size * 0.5, sub = lc1_deck(ctx);
            var gx1 = bx1 - (sub ? size * 0.5 : 0), tiers = port ? 5 : 4, th2 = (ph - m * 2) / tiers;
            for (i = 0; i < tiers; i++) {
                var y0 = m + i * th2;
                if (i > 0) rule(m, y0, gx1);
                if (i === 1 && !port) { var iw = (gx1 - m) * 0.42; photo(m, y0 + fs, iw, th2 * 2 - fs * 3, 0); tier(m + iw + fs, y0, gx1, y0 + th2, seed + i); continue; }
                if (i === 2 && !port) { tier(m + (gx1 - m) * 0.42 + fs, y0, gx1, y0 + th2, seed + i); continue; }
                tier(m, y0, gx1, y0 + th2, seed + i);
            }
            rule(bodyX1 + m * 0.3, m + mh + ls * 2.6, pw - m);
            tier(mX, m + mh + ls * 2.8, pw - m, ph - m, seed + 9);
            var V = lc1_vcols(ctx, vl, { font: font, size: size, x: hX1 - size * 0.15 - mm.w / 2 - pw / 2, top: m + size * 0.2 - ph / 2, lead: 1.1, track: -0.02, color: rev ? C.fill : tx, name: t0, lyric: true });
            L = V.L;
            if (sub) {
                var sv = jzChars(jzStrip(sub)).slice(0, 14).join(''), ssz = Math.min(size * 0.3, (ph - m * 2) / 15);
                var SV = lc1_vcols(ctx, [sv], { font: font, size: ssz, x: bx1 - size * 0.2 - pw / 2, top: m + size * 0.2 - ph / 2, color: tx, name: 'sub headline' });
                SV.L.setParentWithJump(R); lc1_op(ctx, SV.L, '1-ic(PO)', 1);
            }
        } else {
            var hbw = bodyX1 - m, hbh = ph * (port ? 0.3 : 0.32);
            fb = lc1_fitBlock(ctx, t0, font, hbw * 0.94, hbh * 0.84, { lead: 1.05, track: -0.02 }, port ? 3 : 2); size = fb.size;
            if (rev) rectP('reverse', m, m, hbw, hbh, tx);
            var yb = m + hbh + fs, tiersY = port ? 5 : 3, th3 = (ph - m - yb) / tiersY;
            rule(m, yb, bodyX1);
            for (i = 0; i < tiersY; i++) {
                var yy0 = yb + i * th3, x1 = i === 0 ? bodyX1 : pw - m;
                if (i > 0) rule(m, yy0, pw - m);
                if (i === 1) { var iw2 = (x1 - m) * (port ? 0.5 : 0.3); photo(x1 - iw2, yy0 + fs, iw2, th3 - fs * 3, 1); tier(m, yy0, x1 - iw2 - fs, yy0 + th3, seed + i); continue; }
                tier(m, yy0, x1, yy0 + th3, seed + i);
            }
            tier(mX, m + mh + ls * 2.8, pw - m, yb, seed + 9);
            L = lc1_T(ctx, fb.text, { font: font, size: size, x: m + hbw / 2 - pw / 2, y: m + hbh / 2 - ph / 2, lead: 1.05, track: -0.02, color: rev ? C.fill : tx, name: t0, lyric: true });
        }
        if (rules.length) { var rg = jzGrp(R, 'rules'); for (i = 0; i < rules.length; i++) jzAddPath(rg, rules[i]); jzAddStroke(rg, tx, lw, 70); lc1_front(rg); }
        // masthead type
        var MT = lc1_vcols(ctx, [mast], { font: font, size: Math.min(mw * 0.62, mh * 0.9 / jzChars(mast).length), x: mX + mw / 2 - pw / 2, top: 0, track: 0.05, color: lc1_onCol(sc, hl), name: 'masthead' });
        jzXf(MT.L, 'ADBE Position').setValue([mX + mw / 2 - pw / 2, mY + mh / 2 - ph / 2]); MT.L.setParentWithJump(R); lc1_op(ctx, MT.L, '1-ic(PO)', 1);
        T = lc1_T(ctx, '第' + jzP(ctx, 'issue', 12000) + '号', { font: jzBodyF(ctx), size: ls * 0.7, x: mX + mw / 2 - pw / 2, y: mY + mh + ls * 0.8 - ph / 2, color: tx, name: 'issue' }); T.setParentWithJump(R); lc1_op(ctx, T, '1-ic(PO)', 0.8);
        T = lc1_T(ctx, jzFmtTime(c.start), { font: jzMonoF(ctx), size: ls * 0.7, x: mX + mw / 2 - pw / 2, y: mY + mh + ls * 1.8 - ph / 2, color: tx, name: 'date' }); T.setParentWithJump(R); lc1_op(ctx, T, '1-ic(PO)', 0.8);
        L.moveToBeginning(); L.setParentWithJump(R);
        jzAnimate(ctx, L, { mi: mi, noHold: lc1_plateHold(ctx) });
        return lc1_box(cx - pw / 2, cy - ph / 2, cx + pw / 2, cy + ph / 2);
    }
});

/* ================================================================== 13 vinyl — レコード */
// text along a circle, centred on midDeg (screen degrees), reading clockwise; the layer's anchor is the circle centre
function lc1_arcText(ctx, txt, font, size, cx, cy, r, midDeg, color, track) {
    var L = jzNoGhost(jzText(ctx, txt, { font: font, size: size, color: color, x: cx, y: cy, track: track || 0, name: 'label text' }));
    var tw = jzRect(L).width, a0 = midDeg - (tw / 2) / r * 180 / Math.PI, sh = lc1_arcShape(cx, cy, r, a0, a0 + 359.9);
    jzTextOnPath(L, sh, null, ctx);
    jzXf(L, 'ADBE Anchor Point').setValue([cx, cy]); jzXf(L, 'ADBE Position').setValue([cx, cy]);
    return L;
}
// the disc: one rotating shape layer (vinyl, grooves, label, label arc), a fixed sheen and the label text on a circle.
// o: head (expression vars), ang (deg expr), dx / dy (px exprs), s (scale expr), a (alpha expr)
function lc1_disc(ctx, cx, cy, R, labC, big, txt, o) {
    var sc = ctx.sc, vin = jzLum(sc.bg) < 0.3 ? jzMixHex(jzDarkest(sc), jzLightest(sc), 0.1) : jzDarkest(sc), lite = jzLightest(sc), LR = R * (big ? 0.5 : 0.36), lc = lc1_onCol(sc, labC), i;
    var HD = lc1_H(ctx) + (o.head || ''), POS = HD + '[value[0]+(' + (o.dx || '0') + '),value[1]+(' + (o.dy || '0') + ')]', SC = HD + 'var s=' + (o.s || '1') + ';[value[0]*s,value[1]*s]';
    var D = lc1_S(ctx, 'record', cx, cy);
    lc1_ellipse(D, 'vinyl', R * 2, R * 2, 0, 0, vin);
    var gr = jzGrp(D, 'grooves');
    for (i = 0; i < 16; i++) { var rr = R * (0.42 + 0.55 * i / 15); jzAddEllipse(gr, rr * 2, rr * 2, 0, 0); }
    jzAddStroke(gr, lite, Math.max(1, R * 0.004), 10); lc1_front(gr);
    lc1_ellipse(D, 'label', LR * 2, LR * 2, 0, 0, labC);
    var ag = jzGrp(D, 'label arc'); lc1_shp(ag, lc1_arcShape(0, 0, LR * 0.7, 20, 160)); jzAddStroke(ag, lc, Math.max(1, R * 0.004), 60); lc1_front(ag);
    lc1_ellipse(D, 'hole', R * 0.044, R * 0.044, 0, 0, sc.bg);
    jzSetExpr(jzXf(D, 'ADBE Rotate Z'), HD + 'value+(' + o.ang + ')');
    jzSetExpr(jzXf(D, 'ADBE Position'), POS); jzSetExpr(jzXf(D, 'ADBE Scale'), SC); lc1_op(ctx, D, o.a, 1, o.head);
    // sheen (stays put while the disc turns): two soft light wedges
    var SH = lc1_S(ctx, 'record sheen', cx, cy), wd = [[-0.6, 0.405], [2.54, 3.545]];
    for (i = 0; i < 2; i++) for (var q = 0; q < 2; q++) {
        var m0 = (wd[i][0] + wd[i][1]) / 2, hw = (wd[i][1] - wd[i][0]) / 2 * (q ? 0.45 : 1), pts = [], j;
        for (j = 0; j <= 8; j++) { var an = m0 - hw + 2 * hw * j / 8; pts.push([Math.cos(an) * R * 0.98, Math.sin(an) * R * 0.98]); }
        for (j = 8; j >= 0; j--) { var an2 = m0 - hw + 2 * hw * j / 8; pts.push([Math.cos(an2) * R * 0.42, Math.sin(an2) * R * 0.42]); }
        lc1_path(SH, 'sheen', pts, null, 0, { closed: true, fill: lite, fop: 5 });
    }
    var sb = jzEffect(SH, 'ADBE Gaussian Blur 2', 'JZ Soft'); jzEP(sb, 1, R * 0.04);
    jzSetExpr(jzXf(SH, 'ADBE Position'), POS); jzSetExpr(jzXf(SH, 'ADBE Scale'), SC); lc1_op(ctx, SH, o.a, 1, o.head);
    var T = lc1_arcText(ctx, txt, jzMonoF(ctx), R * 0.034, cx, cy, LR * 0.84, -90, lc, 0.25);
    jzSetExpr(jzXf(T, 'ADBE Rotate Z'), HD + 'value+(' + o.ang + ')');
    jzSetExpr(jzXf(T, 'ADBE Position'), POS); jzSetExpr(jzXf(T, 'ADBE Scale'), SC); lc1_op(ctx, T, '(' + o.a + ')*0.9', 1, o.head);
    return D;
}
jzReg('layout', 'vinyl', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), variant: cut.n <= 6 ? rng.pick(['sleeve', 'label']) : 'sleeve', side: rng.pick(['A', 'B']), rpm: rng.pick(['33⅓', '45']),
            sleeve: rng.pick(['ink', 'accent', 'card']), cat: rng.int(100, 9999), arm: rng.chance(0.7) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), k = lc1_k(ctx), port = jzPortrait(ctx);
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), side = jzP(ctx, 'side', 'A'), cat = jzP(ctx, 'cat', 1234), ls = lc1_ls(ctx), mono = jzMonoF(ctx), t0 = jzTrim(c.text);
        var labC = lc1_plateCol(sc, [sc.accent, sc.accent2, sc.fg], jzDarkest(sc), 1.5), arc = 'SIDE ' + side + '  ·  ' + jzP(ctx, 'rpm', '45') + ' RPM  ·  No.' + jzLineNo(ctx) + '  ·  ';
        var L, fb, T;
        if (jzP(ctx, 'variant', 'sleeve') === 'label') {
            var R = Math.min(H * 0.44, W * 0.44), cx = W / 2, cy = H / 2, TT = Math.max(0.5, c.inDur + 0.35);
            var HV = 'var A=oc(time/0.3)*(1-cl((PO-0.6)/0.4)),ANG=540*(1-oc(time/' + jzN(TT) + '))-300*ic(PO),KS=0.9+0.1*oc(time/0.4);';
            var D = lc1_disc(ctx, cx, cy, R, labC, true, arc + arc, { head: HV, ang: 'ANG', s: 'KS', a: 'A' });
            if (jzP(ctx, 'arm', true)) {
                var AR = lc1_S(ctx, 'tone arm', cx + R * 1.02, cy - R * 0.92), AL = R * 1.05;
                lc1_path(AR, 'arm', [[0, 0], [AL, 0]], sc.sub, Math.max(3 * k, R * 0.02), { cap: 2 });
                lc1_rect(AR, 'head', R * 0.07, R * 0.07, AL, 0, sc.fg);
                jzXf(AR, 'ADBE Rotate Z').setValue(32);
                jzSetExpr(jzXf(AR, 'ADBE Rotate Z'), lc1_H(ctx) + 'value+30*' + lc1_e(0.2, 0.7, 'ioc') + '*K');
                lc1_op(ctx, AR, 'A', 1, HV);
                var PV = lc1_S(ctx, 'arm pivot', cx + R * 1.02, cy - R * 0.92); lc1_ellipse(PV, 'pivot', R * 0.12, R * 0.12, 0, 0, sc.sub); lc1_op(ctx, PV, 'A', 1, HV);
            }
            var lab = R * 0.5;
            fb = lc1_fitBlock(ctx, t0, font, lab * 1.3, lab * 0.8, { lead: 1.1 }, 2);
            L = lc1_T(ctx, fb.text, { font: font, size: Math.min(fb.size, lab * 0.55), x: 0, y: 0, lead: 1.1, color: lc1_onCol(sc, labC), name: t0, lyric: true });
            L.setParentWithJump(D);
            jzAnimate(ctx, L, { mi: 0, noHold: true, treat: false });
            return lc1_box(cx - lab, cy - lab, cx + lab, cy + lab);
        }
        // sleeve + disc sliding out
        var S = port ? Math.min(W * 0.74, H * 0.4) : Math.min(H * 0.74, W * 0.42), sx = port ? W / 2 : W / 2 - S * 0.28, sy = port ? H / 2 - S * 0.28 : H / 2, Rd = S * 0.47;
        var HS = 'var EIN=oe(time/0.45),SL=ioc((time-0.25)/0.7)*(1-ioc(PO)),A=cl(EIN*2)*(1-cl((PO-0.5)/0.5)),OFF=(1-EIN)*' + jzN(S * 0.25) + ';';
        var dMove = 'SL*' + jzN(S * 0.56) + '+OFF';
        lc1_disc(ctx, sx, sy, Rd, labC, false, arc + arc, { head: HS, ang: 'time*120', dx: port ? '0' : dMove, dy: port ? dMove : '0', a: 'A' });
        var sl = jzP(ctx, 'sleeve', 'ink'), slC = sl === 'card' ? lc1_card(sc).fill : lc1_plateCol(sc, sl === 'accent' ? [sc.accent, sc.ink] : [sc.ink, sc.fg]), tc = lc1_onCol(sc, slC);
        var SV = lc1_S(ctx, 'sleeve', sx, sy);
        lc1_rect(SV, 'sleeve', S, S, 0, 0, slC, jzContrast(slC, sc.bg) < 1.4 ? { stroke: jzMixHex(sc.fg, slC, 0.4), sw: 1.5 * k } : null);
        lc1_shadow(SV, sc, u * 0.015);
        jzSetExpr(jzXf(SV, 'ADBE Position'), lc1_H(ctx) + HS + (port ? '[value[0],value[1]+OFF]' : '[value[0]+OFF,value[1]]'));
        lc1_op(ctx, SV, 'A', 1, HS);
        var m = S * 0.07, FA = 'A*' + lc1_e(0.15, 0.4, 'oc') + '*K', x0 = -S / 2, y0 = -S / 2;
        T = lc1_T(ctx, 'JZR-' + cat, { font: mono, size: ls * 0.9, track: 0.2, align: 'right', x: x0 + S - m, y: y0 + m + ls * 0.3, color: tc, name: 'catalogue' }); T.setParentWithJump(SV); lc1_op(ctx, T, FA, 1, HS);
        T = lc1_T(ctx, 'SIDE ' + side, { font: mono, size: ls * 0.9, track: 0.2, align: 'left', x: x0 + m, y: y0 + m + ls * 0.3, color: tc, name: 'side' }); T.setParentWithJump(SV); lc1_op(ctx, T, FA, 1, HS);
        var RL = lc1_S(ctx, 'sleeve rule', 0, 0), rg = lc1_path(RL, 'rule', [[x0 + m, y0 + m + ls * 1.3], [x0 + S - m, y0 + m + ls * 1.3]], tc, Math.max(1, u * 0.0015));
        lc1_trim(ctx, rg, lc1_e(0.15, 0.4, 'oc') + '*K'); RL.setParentWithJump(SV); lc1_op(ctx, RL, 'A*0.8', 1, HS);
        fb = lc1_fitBlock(ctx, t0, font, S - m * 2, S * 0.52, { lead: 1.05, track: 0.01 }, 4);
        var size = Math.min(fb.size, S * 0.3), mh = size * (1 + (fb.lines - 1) * 1.05);
        L = lc1_T(ctx, fb.text, { font: font, size: size, x: x0 + m, y: y0 + S - m - ls * 1.6 - mh / 2, align: 'left', lead: 1.05, track: 0.01, color: tc, name: t0, lyric: true });
        var lb = lc1_bb(L);
        L.setParentWithJump(SV);
        jzAnimate(ctx, L, { mi: lc1_mi(ctx, 0.22), noHold: lc1_plateHold(ctx) });
        T = lc1_T(ctx, lc1_cut(jzRomajiOf(ctx) || jzFmtTime(c.start), 26), { font: mono, size: ls * 0.8, track: 0.15, align: 'left', x: x0 + m, y: y0 + S - m, color: tc, name: 'reading' }); T.setParentWithJump(SV); lc1_op(ctx, T, FA + '*0.8', 1, HS);
        return lc1_box(lb.x0 + sx, lb.y0 + sy, lb.x1 + sx, lb.y1 + sy);
    }
});

/* ================================================================== 14 cassette — カセット */
jzReg('layout', 'cassette', {
    plan: function (rng, cut, st) {
        return { font: rng.chance(0.55) ? 'klee' : rng.pick(jzFontsOf(st, ['body', 'display'])), shell: rng.pick(['ink', 'accent', 'clear']), band: rng.pick(['accent', 'ink', 'stripe']),
            side: rng.pick(['A', 'B']), tilt: rng.range(-4, 4), len: rng.pick(['C-46', 'C-60', 'C-90']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), k = lc1_k(ctx), port = jzPortrait(ctx), i, j;
        var font = jzP(ctx, 'font', 'klee'), shell = jzP(ctx, 'shell', 'ink'), band = jzP(ctx, 'band', 'accent'), side = jzP(ctx, 'side', 'A'), tilt = jzP(ctx, 'tilt', 0), ls = lc1_ls(ctx);
        var cw = port ? W * 0.92 : Math.min(W * 0.66, H * 0.8 * 1.58), ch = cw / 1.58, clear = shell === 'clear';
        var shellC = clear ? sc.bg : lc1_plateCol(sc, shell === 'accent' ? [sc.accent, sc.ink] : [sc.ink, sc.fg]), lineC = clear ? sc.fg : jzMixHex(shellC, lc1_onCol(sc, shellC), 0.3), C = lc1_card(sc);
        var labF = jzContrast(C.fill, shellC) > 1.3 ? C.fill : lc1_plateCol(sc, [sc.bg, sc.fg], shellC, 1.5), labT = lc1_onCol(sc, labF);
        var bandC = band === 'ink' ? lc1_plateCol(sc, [sc.ink, sc.fg], labF, 2) : lc1_plateCol(sc, [sc.accent, sc.accent2, sc.ink], labF, 1.6);
        var HC = 'var EIN=oc(time/0.5),EO=ic(PO),A=cl(EIN*2)*(1-EO);';
        var R = lc1_S(ctx, 'cassette', W / 2, H / 2);
        jzSetExpr(jzXf(R, 'ADBE Position'), lc1_H(ctx) + HC + '[value[0],value[1]+(1-EIN)*' + jzN(H * 0.6) + '+EO*' + jzN(H * 0.15) + ']');
        jzSetExpr(jzXf(R, 'ADBE Rotate Z'), lc1_H(ctx) + HC + 'value+' + jzN(tilt) + '*(1-EO)+(1-EIN)*12');
        lc1_op(ctx, R, 'A', 1, HC);
        lc1_shadow(R, sc, u * 0.015);
        var x0 = -cw / 2, y0 = -ch / 2;
        lc1_rect(R, 'shell', cw, ch, 0, 0, shellC, { round: ch * 0.05, stroke: clear ? sc.fg : null, sw: Math.max(2 * k, u * 0.003) });
        var scr = [[x0 + ch * 0.07, y0 + ch * 0.07], [x0 + cw - ch * 0.07, y0 + ch * 0.07], [x0 + ch * 0.07, y0 + ch - ch * 0.07], [x0 + cw - ch * 0.07, y0 + ch - ch * 0.07], [0, y0 + ch * 0.9]], sg = jzGrp(R, 'screws');
        for (i = 0; i < scr.length; i++) jzAddEllipse(sg, ch * 0.044, ch * 0.044, scr[i][0], scr[i][1]);
        jzAddStroke(sg, lineC, Math.max(1, u * 0.0015)); lc1_front(sg);
        var lx = x0 + cw * 0.06, ly = y0 + ch * 0.08, lw2 = cw * 0.88, lh2 = ch * 0.62;
        lc1_rect(R, 'label', lw2, lh2, lx + lw2 / 2, ly + lh2 / 2, labF, { round: ch * 0.02 });
        if (band === 'stripe') { lc1_rect(R, 'stripe 1', lw2, lh2 * 0.06, lx + lw2 / 2, ly + lh2 * 0.65, lc1_plateCol(sc, [sc.accent], labF, 1.4)); lc1_rect(R, 'stripe 2', lw2, lh2 * 0.06, lx + lw2 / 2, ly + lh2 * 0.73, lc1_plateCol(sc, [sc.accent2, sc.ink], labF, 1.4)); }
        else lc1_rect(R, 'band', lw2, lh2 * 0.12, lx + lw2 / 2, ly + lh2 * 0.68, bandC);
        var sb = lh2 * 0.3;
        lc1_rect(R, 'side box', sb, sb, lx + lw2 * 0.03 + sb / 2, ly + lh2 * 0.08 + sb / 2, labT);
        var tx0 = lx + lw2 * 0.06 + sb, tw = lw2 * 0.9 - sb, rl = ly + lh2 * 0.5;
        lc1_path(R, 'writing line', [[tx0, rl], [tx0 + tw, rl]], labT, Math.max(1, u * 0.0012), { op: 0.35 });
        var wy0 = y0 + ch * 0.44;
        lc1_rect(R, 'window', cw * 0.6, ch * 0.24, 0, wy0 + ch * 0.12, jzMixHex(shellC, jzDarkest(sc), 0.35), { round: ch * 0.12 });
        var rr = ch * 0.1, rxs = [-cw * 0.19, cw * 0.19], ry = wy0 + ch * 0.12;
        for (i = 0; i < 2; i++) {
            lc1_ellipse(R, 'tape ' + i, rr * (i ? 0.75 : 1.05) * 2, rr * (i ? 0.75 : 1.05) * 2, rxs[i], ry, jzMixHex(jzDarkest(sc), shellC, 0.2));
            lc1_ellipse(R, 'hub ' + i, rr, rr, rxs[i], ry, labF);
            var sp = jzGrp(R, 'spokes ' + i);
            for (j = 0; j < 6; j++) { var an = j * Math.PI / 3; jzAddPath(sp, [[Math.cos(an) * rr * 0.2, Math.sin(an) * rr * 0.2], [Math.cos(an) * rr * 0.46, Math.sin(an) * rr * 0.46]]); }
            jzAddStroke(sp, labT, Math.max(2 * k, rr * 0.08));
            sp = lc1_front(sp);
            jzGX(sp).property('ADBE Vector Position').setValue([rxs[i], ry]);
            lc1_gRot(ctx, sp, 'time*200+ic(PO)*time*600');
        }
        var T = lc1_T(ctx, side, { font: 'gothic_black', size: sb * 0.78, x: lx + lw2 * 0.03 + sb / 2, y: ly + lh2 * 0.08 + sb / 2, color: labF, name: 'side' }); T.setParentWithJump(R); lc1_op(ctx, T, 'A', 1, HC);
        T = lc1_T(ctx, jzP(ctx, 'len', 'C-60') + '  ·  NR  ·  No.' + jzLineNo(ctx), { font: jzMonoF(ctx), size: ls * 0.75, track: 0.2, align: 'right', x: lx + lw2 * 0.97, y: ly + lh2 * 0.9, color: labT, name: 'tape info' });
        T.setParentWithJump(R); lc1_op(ctx, T, 'A*0.8', 1, HC);
        // lyric handwritten on the top line
        var t0 = jzTrim(c.text), fb = lc1_fitBlock(ctx, t0, font, tw, lh2 * 0.46, { lead: 1.05 }, 2), size = Math.min(fb.size, lh2 * 0.32), mh = size * (1 + (fb.lines - 1) * 1.05);
        var L = lc1_T(ctx, fb.text, { font: font, size: size, x: tx0 + size * 0.1, y: rl - mh / 2 - size * 0.08, align: 'left', lead: 1.05, rot: -1.2, color: labT, name: t0, lyric: true });
        L.setParentWithJump(R);
        jzAnimate(ctx, L, { mi: lc1_mi(ctx, 0.28), noHold: lc1_plateHold(ctx) });
        return lc1_box(W / 2 - cw / 2, H / 2 - ch / 2, W / 2 + cw / 2, H / 2 + ch / 2);
    }
});

/* ================================================================== 15 bookSpine — 背表紙 */
jzReg('layout', 'bookSpine', {
    plan: function (rng, cut, st) {
        var port = cut.H > cut.W * 1.08, nb = port ? rng.int(5, 7) : rng.int(8, 12);
        var font = rng.pick(jzFontsOf(st, ['serif', 'display'])), variant = jzHasLatin(cut.text) ? 'pile' : rng.pick(['shelf', 'shelf', 'pile']), books = [];
        for (var i = 0; i < nb; i++) books.push([rng.range(0.5, 1), rng.range(0.62, 0.92), rng.int(0, 5), rng.int(0, 3)]);
        return { font: font, variant: variant, books: books, hero: rng.pick(['accent', 'ink']), vol: rng.int(1, 24) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), k = lc1_k(ctx), port = jzPortrait(ctx), i;
        var font = jzP(ctx, 'font', jzSerifF(ctx)), books = jzP(ctx, 'books', null), vol = jzP(ctx, 'vol', 3), t0 = jzTrim(c.text);
        if (!books || !books.length) { books = []; for (i = 0; i < (port ? 6 : 10); i++) books.push([0.5 + 0.5 * jzR(c.seed, i, 1), 0.62 + 0.3 * jzR(c.seed, i, 2), Math.floor(jzR(c.seed, i, 3) * 6), Math.floor(jzR(c.seed, i, 4) * 4)]); }
        var heroC = lc1_plateCol(sc, jzP(ctx, 'hero', 'accent') === 'accent' ? [sc.accent, sc.ink] : [sc.ink, sc.accent]), htc = lc1_onCol(sc, heroC);
        var pal = [jzMixHex(sc.bg, sc.fg, 0.18), jzMixHex(sc.bg, sc.sub, 0.45), jzMixHex(sc.bg, sc.accent, 0.35), sc.dim || jzMixHex(sc.bg, sc.fg, 0.25), jzMixHex(sc.bg, sc.fg, 0.32), jzMixHex(sc.bg, sc.accent2 || sc.sub, 0.3)];
        var bb = null, L, T, nb, hi;
        if (jzP(ctx, 'variant', 'shelf') === 'pile' || jzHasLatin(t0)) {
            // books lying flat, spines facing us; the hero sits mid-pile
            var bw = port ? W * 0.84 : Math.min(W * 0.62, H * 1.1), fb = lc1_fitBlock(ctx, t0, font, bw * 0.78, H * 0.16, { track: 0.04 }, 1), size = Math.min(fb.size, u * 0.12), hh = size * 1.7;
            nb = Math.min(6, books.length); hi = Math.floor(nb / 2);
            var hs = [], total = 0;
            for (i = 0; i < nb; i++) { hs.push(i === hi ? hh : H * 0.045 + books[i][0] * H * 0.05); total += hs[i]; }
            var y = H / 2 + total / 2 + H * 0.03, flo = y;
            var FL = lc1_line(ctx, 'floor', [[W * 0.08, flo], [W * 0.92, flo]], sc.sub, Math.max(2 * k, u * 0.003)); lc1_fade(ctx, FL, 0, 0.4, 1, 'oe');
            for (i = 0; i < nb; i++) {
                var b = books[i], h = hs[i], w = i === hi ? bw : bw * (0.72 + 0.26 * b[1]), xo = (jzR(b[2], i, 3) * 2 - 1) * bw * 0.05, t = 0.04 + i * 0.09;
                y -= h;
                var col = i === hi ? heroC : pal[b[2] % pal.length], bc = i === hi ? htc : jzMixHex(col, sc.fg, 0.35);
                var HB = 'var E=oc((time-' + jzN(t) + ')/0.3),EO=ic(PO);';
                var BK = lc1_S(ctx, i === hi ? 'hero book' : 'book ' + (i + 1), W / 2 + xo, y + h / 2);
                lc1_rect(BK, 'cover', w, h - 2, 0, -1, col);
                lc1_rect(BK, 'band L', Math.max(2 * k, w * 0.008), h - 2, -w / 2 + w * 0.06 + Math.max(2 * k, w * 0.008) / 2, -1, bc, { op: 0.7 });
                lc1_rect(BK, 'band R', Math.max(2 * k, w * 0.008), h - 2, w / 2 - w * 0.07 + Math.max(2 * k, w * 0.008) / 2, -1, bc, { op: 0.7 });
                if (i !== hi && h > H * 0.05) lc1_rect(BK, 'title', w * 0.3 * b[1], h * 0.16, -w * 0.22 + w * 0.15 * b[1], 0, jzMixHex(col, sc.fg, 0.3), { op: 0.7 });
                jzSetExpr(jzXf(BK, 'ADBE Position'), lc1_H(ctx) + HB + '[value[0],value[1]-(1-E)*' + jzN(H * 0.6) + '-EO*' + jzN((nb - i) * H * 0.02) + ']');
                lc1_op(ctx, BK, 'cl(E*3)*(1-EO)', 1, HB);
                if (i === hi) {
                    T = lc1_T(ctx, jzPad(vol, 2), { font: jzMonoF(ctx), size: h * 0.24, x: w / 2 - w * 0.035, y: 0, rot: -90, color: htc, name: 'volume' }); T.setParentWithJump(BK); lc1_op(ctx, T, 'cl(E*3)*(1-EO)', 1, HB);
                    L = lc1_T(ctx, fb.text, { font: font, size: size, x: -w * 0.02, y: 0, track: 0.04, color: htc, name: t0, lyric: true });
                    L.setParentWithJump(BK);
                    jzAnimate(ctx, L, { mi: lc1_mi(ctx, 0.1 + hi * 0.09 + 0.2), noHold: lc1_plateHold(ctx) });
                    bb = lc1_box(W / 2 + xo - w / 2, y, W / 2 + xo + w / 2, y + h);
                }
            }
            return bb;
        }
        // shelf of standing books rising from the shelf board
        var n = jzCount(t0), cols = n > (port ? 12 : 10) ? 2 : 1, vt = cols > 1 ? lc1_brk(jzStrip(t0), Math.ceil(n / 2)) : jzStrip(t0), vl = lc1_lines(vt), per = 1;
        for (i = 0; i < vl.length; i++) per = Math.max(per, jzCount(vl[i]));
        var shelfY = H * (port ? 0.84 : 0.88), maxH = H * (port ? 0.7 : 0.78);
        var sz = Math.min((maxH * 0.76) / (Math.max(per, 3) * 1.02 + 1.9), u * (cols > 1 ? 0.09 : port ? 0.14 : 0.115));
        var hw = sz * (cols > 1 ? 2.9 : 1.75), hh2 = Math.min(maxH, (per * sz * 1.02 + sz * 1.9) / 0.76);
        nb = books.length; hi = Math.floor(nb / 2);
        var ws = [], tot = 0;
        for (i = 0; i < nb; i++) { ws.push(i === hi ? hw : sz * (0.9 + 0.8 * books[i][0])); tot += ws[i] + 2; }
        var x = W / 2 - tot / 2, th = Math.max(4 * k, u * 0.008);
        var SHV = lc1_bar(ctx, 'shelf', W * 0.03, shelfY + th / 2, W * 0.94, th, sc.sub, lc1_e(0, 0.4) + '*K');
        var BS = lc1_S(ctx, 'books', 0, 0), hx = 0, hwid = 0, hht = 0, HX = '';
        for (i = 0; i < nb; i++) {
            var bk = books[i], wd = ws[i], hb = i === hi ? hh2 : Math.min(maxH, hh2 * (0.7 + 0.3 * bk[1])), bx = x, top = shelfY - hb;
            x += wd + 2;
            if (bx + wd < 0 || bx > W) continue;
            var cl0 = i === hi ? heroC : pal[bk[2] % pal.length], bcol = i === hi ? htc : jzMixHex(cl0, sc.fg, 0.3), bH = Math.max(2 * k, hb * 0.012), fr = [0.06, 0.08, 0.92, 0.94];
            // parts in drawing order; added in reverse (AE draws the first sub-group on top)
            var parts = [['r', wd, hb, bx + wd / 2, top + hb / 2, cl0, 100]];
            for (var q = 0; q < 4; q++) parts.push(['r', wd, bH, bx + wd / 2, top + hb * fr[q] + bH / 2, bcol, 75]);
            if (i === hi) {
                parts.push(['r', wd * 0.6, sz * 0.8, bx + wd / 2, top + hb * 0.11 + sz * 0.4, htc, 100]);
                parts.push(['o', sz * 0.52, sz * 0.52, bx + wd / 2, top + hb * 0.87 - sz * 0.3, htc, Math.max(1.5 * k, sz * 0.04)]);
                hx = bx; hwid = wd; hht = hb;
            } else {
                var tl = hb * (0.25 + 0.3 * bk[1]);
                if (bk[3] > 0) parts.push(['r', wd * 0.24, tl, bx + wd / 2, top + hb * 0.16 + tl / 2, bcol, 55]);
                if (bk[3] === 2) parts.push(['e', wd * 0.28, wd * 0.28, bx + wd / 2, top + hb * 0.84, bcol, 55]);
            }
            var g = jzGrp(BS, i === hi ? 'hero book' : 'book ' + (i + 1));
            for (q = parts.length - 1; q >= 0; q--) {
                var pp = parts[q], pg = lc1_sub(g, 'part ' + q);
                if (pp[0] === 'r') jzAddRect(pg, pp[1], pp[2], 0, pp[3], pp[4]); else jzAddEllipse(pg, pp[1], pp[2], pp[3], pp[4]);
                if (pp[0] === 'o') jzAddStroke(pg, pp[5], pp[6]); else jzAddFill(pg, pp[5], pp[6]);
            }
            g = lc1_front(g);
            var BE = 'var E=oe((time-' + jzN(0.03 + Math.abs(i - hi) * 0.05) + ')/0.4),EO=ic(PO),LF=' + (i === hi ? 'ioc((time-0.35)/0.4)*' + jzN(sz * 0.6) + '*(1-EO)' : '0') + ';';
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), lc1_H(ctx) + BE + '[value[0],value[1]+' + jzN(hb) + '*(1-E)-LF+EO*' + jzN(hb * 1.05) + ']');
            if (i === hi) HX = BE;
        }
        jzMaskRect(BS, -W, -H, W * 2, shelfY);
        lc1_op(ctx, BS, '1-ic(PO)*0.4', 1);
        SHV.moveBefore(BS);
        // hero texts ride on a null that follows the hero book; track mattes clip them at the shelf board
        var N = lc1_null(ctx, 'hero book', 0, 0), htop = shelfY - hht;
        jzSetExpr(jzXf(N, 'ADBE Position'), lc1_H(ctx) + HX + '[value[0],value[1]+' + jzN(hht) + '*(1-E)-LF+EO*' + jzN(hht * 1.05) + ']');
        function clip(Lx) { var M = lc1_S(ctx, 'shelf clip', 0, 0); lc1_rect(M, 'clip', W * 3, H + shelfY, W / 2, (shelfY - H) / 2, '#FFFFFF'); M.moveBefore(Lx); lc1_matte(Lx, M); }
        T = lc1_T(ctx, lc1_kanjiNum(vol), { font: jzSerifF(ctx), size: sz * 0.46, x: hx + hwid / 2, y: htop + hht * 0.11 + sz * 0.4, color: heroC, name: 'volume' });
        T.setParentWithJump(N); lc1_op(ctx, T, '1-ic(PO)*0.4', 1); clip(T);
        var V = lc1_vcols(ctx, vl, { font: font, size: sz, x: hx + hwid / 2, top: htop + hht * 0.11 + sz * 1.2, lead: 1.24, track: 0.02, color: htc, name: t0, lyric: true });
        V.L.setParentWithJump(N);
        jzAnimate(ctx, V.L, { mi: lc1_mi(ctx, 0.3), noHold: lc1_plateHold(ctx) });
        clip(V.L);
        return lc1_box(hx, htop - sz * 0.6, hx + hwid, shelfY);
    }
});

/* ================================================================== 16 polaroid — ポラロイド */
jzReg('layout', 'polaroid', {
    plan: function (rng, cut, st) {
        var n = cut.n, kk = n <= 5 ? 1 : n <= 10 ? 2 : 3;
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), pen: rng.chance(0.6) ? 'klee' : rng.pick(jzFontsOf(st, ['body'])), chunks: lc1_splitK(cut.text, kk, kk),
            tilts: [rng.range(-7, 7), rng.range(-7, 7), rng.range(-7, 7)], img: rng.pick(['dark', 'accent', 'dusk']), tape: rng.chance(0.5) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), k = lc1_k(ctx), port = jzPortrait(ctx), i;
        var chunks = lc1_chunks(ctx), nk = chunks.length, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), penF = jzP(ctx, 'pen', 'klee'), tilts = jzP(ctx, 'tilts', [3, -4, 2]), img = jzP(ctx, 'img', 'dark');
        var C = lc1_card(sc), fw;
        if (port) fw = Math.min(W * (nk === 1 ? 0.78 : 0.62), H * 0.78 / (nk === 1 ? 1.2 : 1 + (nk - 1) * 0.72) / 1.2);
        else fw = Math.min(H * 0.8 / 1.2, W * 0.86 / (nk === 1 ? 1 : nk * 0.92));
        var fh = fw * 1.2, iw = fw * 0.88, lite = jzLightest(sc);
        var imgC = img === 'accent' ? lc1_plateCol(sc, [sc.accent, sc.ink], C.fill, 1.8) : img === 'dusk' ? jzMixHex(jzDarkest(sc), sc.accent, 0.35) : jzDarkest(sc), tc = lc1_onCol(sc, imgC), bb = null;
        for (i = 0; i < nk; i++) {
            var x = nk === 1 ? W / 2 : port ? W / 2 + (i % 2 ? 1 : -1) * W * 0.07 : W / 2 + (i - (nk - 1) / 2) * fw * 0.92;
            var y = nk === 1 ? H / 2 : port ? H / 2 + (i - (nk - 1) / 2) * fh * 0.72 : H / 2 + (i % 2 ? 1 : -1) * H * 0.025;
            var t = 0.02 + i * 0.16, rot = tilts[i % 3] * (nk === 1 ? 0.6 : 1);
            var HP = 'var E=oc((time-' + jzN(t) + ')/0.4),EO=ic(PO),A=cl(E*2.5)*(1-EO),DEV=ioc((time-' + jzN(t + 0.1) + ')/0.9);';
            var F = lc1_S(ctx, 'polaroid ' + (i + 1), x, y);
            jzSetExpr(jzXf(F, 'ADBE Position'), lc1_H(ctx) + HP + '[value[0],value[1]-(1-E)*' + jzN(H * 0.15) + '+EO*' + jzN(H * 0.1 * (i + 1)) + ']');
            jzXf(F, 'ADBE Rotate Z').setValue(rot);
            jzSetExpr(jzXf(F, 'ADBE Rotate Z'), lc1_H(ctx) + HP + 'value+(1-E)*14');
            lc1_op(ctx, F, 'A', 1, HP);
            lc1_shadow(F, sc, u * 0.014);
            lc1_rect(F, 'frame', fw, fh, 0, 0, C.fill, C.edge ? { stroke: C.line, sw: 1.2 * k, round: fw * 0.01 } : { round: fw * 0.01 });
            var iy = -fh / 2 + fw * 0.06, pic = lc1_rect(F, 'picture', iw, iw, 0, iy + iw / 2, imgC);
            jzSetExpr(lc1_fillOf(pic).property('ADBE Vector Fill Color'), lc1_H(ctx) + HP + lc1_mixExpr(jzMixHex(C.fill, sc.sub, 0.35), imgC, 'DEV'));
            var l1 = lc1_ellipse(F, 'light leak', iw * 0.6, iw * 0.6, -iw / 2 + iw * 0.72, iy + iw * 0.26, lite); lc1_gOp(ctx, l1, '0.07*DEV', HP);
            var l2 = lc1_ellipse(F, 'light leak core', iw * 0.32, iw * 0.32, -iw / 2 + iw * 0.72, iy + iw * 0.26, lite); lc1_gOp(ctx, l2, '0.08*DEV', HP);
            if (jzP(ctx, 'tape', false)) lc1_rect(F, 'tape', fw * 0.32, fw * 0.1, 0, -fh / 2, lite, { op: 0.55 });
            var fb = lc1_fitBlock(ctx, chunks[i], font, iw * 0.84, iw * 0.7, { lead: 1.1 }, 3);
            var L = lc1_T(ctx, fb.text, { font: font, size: Math.min(fb.size, iw * 0.34), x: 0, y: iy + iw / 2, lead: 1.1, color: tc, name: chunks[i], lyric: true });
            L.setParentWithJump(F);
            jzAnimator(L, 'JZ Develop', [['ADBE Text Opacity', 0]], lc1_H(ctx) + HP + '(1-(0.25+0.75*DEV))*100');
            jzAnimate(ctx, L, { mi: lc1_mi(ctx, t + 0.15), noHold: lc1_plateHold(ctx) });
            var cap = i === nk - 1 ? (jzRomajiOf(ctx) || jzFmtTime(c.start)) : ('No.' + jzLineNo(ctx) + '-' + (i + 1));
            cap = lc1_cut(cap, 20);
            var CT = lc1_T(ctx, cap, { font: penF, size: Math.min(fw * 0.07, (fw * 0.84) / Math.max(6, cap.length * 0.62)), x: 0, y: iy + iw + (fh / 2 - iy - iw) * 0.5, rot: -2, color: C.text, name: 'caption ' + (i + 1) });
            CT.setParentWithJump(F); lc1_op(ctx, CT, 'cl((time-' + jzN(t + 0.5) + ')/0.4)*A*0.85', 1, HP);
            bb = jzUnion(bb, lc1_box(x - fw / 2, y - fh / 2, x + fw / 2, y + fh / 2));
        }
        return bb;
    }
});
