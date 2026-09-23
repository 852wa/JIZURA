// ================================================================ pack layoutsC part 2 (AE port of src/11p_layoutsC.js, entries 17-34)
// stampSheet, postcard, letterPaper, calendar, chochin, routeMap, stationSign, noren, tanzaku, omikuji, kakejiku, shoji,
// clapper, warningLabel, priceTag, nameTag, stickyNotes, karuta
//
// Techniques:
// - paper objects are shape layers ("rigs") whose transform expressions carry the object's motion (fly in, swing, tear…);
//   their text layers are parented to the rig, so the lyric keeps the cut's enter / hold / exit on its own layer.
// - glyph positions are estimated like the browser's layoutText (full-width glyphs = 1 em), used for fitting and placing.
// - vertical columns (right → left) = one text layer with one glyph per line + a per-glyph Position animator (lc2_V).
// - many small labels (zip digits, dates, station codes …) = one text layer, one label per line, moved per glyph (lc2_multi).
// - clip windows that open (folded paper, unrolling scroll) = a thin static rectangle mask + animated Mask Expansion.
// - dotted lines / perforations = stroke with dash 0 and round caps.

var LC2_CY = 0.38;        // glyph centre above the baseline (em)
var LC2_FX = 'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}function lp(a,b,t){return a+(b-a)*t;}\n';
var LC2_WD_J = '日月火水木金土', LC2_WD_E = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
var LC2_MON_E = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
var LC2_ROKUYO = ['大安', '赤口', '先勝', '友引', '先負', '仏滅'];
var LC2_KUJI = ['大吉', '吉', '中吉', '小吉', '末吉', '大吉'];
var LC2_KUJI_CAT = ['願望', '待人', '失物', '旅行', '商売', '学問', '恋愛', '健康'];
var LC2_WARN = [['WARNING', '警告'], ['CAUTION', '注意'], ['DANGER', '危険'], ['NOTICE', 'お知らせ']];
var LC2_KNUM = '〇一二三四五六七八九';

/* ---------------------------------------------------------------- text splitting (browser splitK / charUnits / brk) */
function lc2_isSmall(c) { return 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ'.indexOf(c) >= 0 && c.length > 0; }
function lc2_isPunct(c) { return /[、。，．,.!?！？…‥・「」『』（）()【】〈〉《》〔〕［］\[\]'"“”‘’ー〜～:：;；\-—―]/.test(c); }
function lc2_isBad(c) { return lc2_isSmall(c) || lc2_isPunct(c) || c === 'ー' || c === ' '; }
var lc2_VROT = 'ー〜～…‥―—-()（）「」『』【】〈〉《》〔〕[]［］→←:：;；=＝';
// chunk boundaries (glyph offsets) of a word — stands in for the browser's Intl word segments
function lc2_bounds(word) {
    var out = {}, ch = jzChunk(word), acc = 0;
    for (var i = 0; i < ch.length; i++) { acc += jzChars(ch[i]).length; out[acc] = 1; }
    return out;
}
function lc2_split2(word, force) {
    var ch = jzChars(word), n = ch.length, sb = lc2_bounds(word), best = Math.max(1, Math.floor(n / 2)), bs = -1e9;
    for (var c = 1; c < n; c++) {
        var a = ch[c - 1], b = ch[c];
        if (!force && ((c === 1 && !jzIsKanji(a)) || (c === n - 1 && !jzIsKanji(b)))) continue;
        var s = -Math.abs(c - n / 2) * 0.9;
        if (a === ' ' || a === '　' || (lc2_isPunct(a) && a !== 'ー')) s += 5;
        if (jzIsHira(a) && !jzIsHira(b) && !lc2_isBad(b)) s += 3;
        if (sb[c]) s += 2;
        if (lc2_isBad(b)) s -= 6;
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
function lc2_splitK(text, k, force) {
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
        parts = latin ? [words[bi]] : lc2_split2(words[bi]);
        if (parts.length < 2 && force && words.length < force) parts = lc2_split2(words[bi], true);
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
        parts = latin ? [bw] : lc2_split2(bw);
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
function lc2_charUnits(text) {
    var a = jzChars(jzStrip(text)), out = [];
    for (var i = 0; i < a.length; i++) { if (out.length && lc2_isBad(a[i])) out[out.length - 1] += a[i]; else out.push(a[i]); }
    return out;
}
// balanced display line breaks at chunk boundaries (AE line break = \r)
function lc2_brk(text, maxPer) {
    var t = jzTrim(String(text || '')), n = jzCount(t);
    if (n <= maxPer) return t;
    return lc2_splitK(t, Math.ceil(n / maxPer)).join('\n');
}

/* ---------------------------------------------------------------- small helpers */
function lc2_H(ctx) { return jzTH(ctx) + LC2_FX; }
function lc2_k(ctx) { return jzU(ctx) / 1080; }               // browser design px -> comp px
function lc2_vt(t) { return jzHasLatin(t) ? jzFlat(t) : jzStrip(t); }
function lc2_rom(t) { if (!t || jzHasLatin(t)) return null; var r = jzRomaji(jzStrip(t)); return r ? r.toUpperCase() : null; }
function lc2_deck(ctx) { var c = ctx.cut; if (c.lineText && jzStrip(c.lineText) !== jzStrip(c.text)) return jzFlat(c.lineText); return c.note || jzRomajiOf(ctx) || null; }
function lc2_hold(ctx) { return jzIndexOf(['still', 'jitter', 'breathe', 'glitchtick'], ctx.cut.hold || 'still') < 0; }
function lc2_mi(ctx, t) { return Math.max(0, t) / Math.max(0.005, ctx.cut.stagger || 0.04); }
function lc2_box4(x0, y0, x1, y1) { return { x0: x0, y0: y0, x1: x1, y1: y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }; }
function lc2_port(cut) { return cut.H > cut.W * 1.08; }
function lc2_kanjiNum(n) {
    n = Math.max(0, Math.floor(n));
    var K = LC2_KNUM;
    if (n < 10) return K.charAt(n);
    if (n < 20) return '十' + (n % 10 ? K.charAt(n % 10) : '');
    if (n < 100) return K.charAt(Math.floor(n / 10)) + '十' + (n % 10 ? K.charAt(n % 10) : '');
    return String(n);
}
function lc2_charUnitsOf(text) { return lc2_charUnits(text); }
// the lyric: cut motion + treatment, entrance starting at local time t (browser miAt)
// ghosts: everything this pack draws besides the lyric is ghost-off in the browser (plates, papers, labels …), so every
// helper layer is created with jzNoGhost; the lyric (and only the lyric) passes through lc2_main, which clears the mark
function lc2_ghostOn(L) { try { L.comment = String(L.comment || '').replace(/\s*JZ_NOGHOST/g, ''); } catch (e) {} return L; }
function lc2_main(ctx, L, t, o) {
    o = o || {};
    lc2_ghostOn(L);
    return jzAnimate(ctx, L, { mi: lc2_mi(ctx, t || 0), noHold: o.noHold != null ? o.noHold : lc2_hold(ctx), treat: o.treat });
}

/* ---------------------------------------------------------------- colour (scheme colours only) */
function lc2_onCol(sc, fill) {
    var c = [sc.bg, sc.fg, sc.ink, sc.accent, sc.sub], best = null, bv = 0;
    for (var i = 0; i < c.length; i++) { if (!c[i] || String(c[i]).toUpperCase() === String(fill).toUpperCase()) continue; var k = jzContrast(c[i], fill); if (k > bv) { bv = k; best = c[i]; } }
    return bv >= 2.4 ? best : (jzLum(fill) > 0.5 ? '#111111' : '#FFFFFF');
}
function lc2_plate(sc, pref, against, min) {
    var b = against || sc.bg; if (min == null) min = 1.6;
    for (var i = 0; i < pref.length; i++) if (pref[i] && jzContrast(pref[i], b) >= min) return pref[i];
    return jzContrast(sc.fg, b) >= jzContrast(sc.bg, b) ? sc.fg : sc.bg;
}
function lc2_card(sc) {
    var fill = jzLightest(sc), text = lc2_onCol(sc, fill);
    return { fill: fill, edge: jzContrast(fill, sc.bg) < 1.4, text: text, acc: lc2_plate(sc, [sc.accent, sc.accent2, sc.ink], fill, 2), faint: jzMixHex(fill, text, 0.22), line: jzMixHex(fill, text, 0.35) };
}
function lc2_shCol(sc) { return jzDarkest(sc); }
function lc2_shOp(sc) { return jzLum(sc.bg) > 0.5 ? 22 : 50; }

/* ---------------------------------------------------------------- text metrics (estimates like the browser's layoutText) */
function lc2_adv(ch, mono) {
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
function lc2_vadv(ch, size) { return /[A-Za-z0-9]/.test(ch) ? lc2_adv(ch) * size : size; }
function lc2_lines(str) { return String(str).split(/\r\n|\r|\n/); }
// { w, h } of a block (o: vertical, lead (em), track (em), mono)
function lc2_meas(str, size, o) {
    o = o || {};
    var tr = (o.track || 0) * size, lead = o.lead || 1.3, ls = lc2_lines(str), nL = ls.length, mx = 1, i, j, a, w;
    for (i = 0; i < nL; i++) {
        a = jzChars(ls[i]); w = 0;
        for (j = 0; j < a.length; j++) w += (o.vertical ? lc2_vadv(a[j], size) : lc2_adv(a[j], o.mono) * size) + (j < a.length - 1 ? tr : 0);
        mx = Math.max(mx, w);
    }
    var cross = nL * lead * size - (lead - 1) * size;
    return o.vertical ? { w: cross, h: mx } : { w: mx, h: cross };
}
function lc2_fitSize(str, aw, ah, o) { var m = lc2_meas(str, 100, o); return 100 * Math.min(aw / Math.max(1, m.w), ah / Math.max(1, m.h)); }
// best line break + size for a block that must fit aw x ah (browser fitBlock); text uses '\n'
function lc2_fitBlock(text, aw, ah, o, maxLines) {
    var t = jzTrim(String(text || '')), n = Math.max(1, jzCount(t)), best = null, seen = {}, L, i;
    maxLines = maxLines || 4;
    var cands = [];
    for (L = 1; L <= Math.min(maxLines, n); L++) {
        var s0 = L === 1 ? t : lc2_brk(t, Math.ceil(n / L));
        cands.push(s0);
        // the browser's word segmenter splits short kana words that the chunker keeps whole: add a forced split too
        if (L > 1 && lc2_lines(s0).length < L && !jzHasLatin(t)) cands.push(lc2_splitK(t, L, L).join('\n'));
    }
    for (var ci = 0; ci < cands.length; ci++) {
        var s = cands[ci];
        if (seen['k' + s]) continue; seen['k' + s] = 1;
        var ls = lc2_lines(s), lines = ls.length;
        if (lines > maxLines) continue;
        var size = lc2_fitSize(s, aw, ah, o), lone = false;
        if (lines > 1 && n > 2) for (i = 0; i < ls.length; i++) if (jzCount(ls[i]) < 2) lone = true;
        var score = size * (1 - 0.06 * (lines - 1)) * (lone ? 0.8 : 1);
        if (!best || score > best.score) best = { text: s, size: size, lines: lines, score: score };
    }
    return best || { text: t, size: lc2_fitSize(t, aw, ah, o), lines: 1, score: 0 };
}

/* ---------------------------------------------------------------- text layers */
// horizontal block: x = centre / left / right edge (o.align), y = vertical centre of the block (browser item semantics)
function lc2_T(ctx, str, o) {
    var size = o.size, lead = o.lead || 1.3, txt = String(str).replace(/\r\n|\n/g, '\r'), nL = txt.split('\r').length, LD = size * lead;
    var L = jzNoGhost(jzText(ctx, txt, { font: o.font, size: size, color: o.color || ctx.sc.fg, x: o.x, y: o.y, align: o.align, track: o.track || 0, leading: nL > 1 ? LD : null,
        name: o.name, fill: o.fill, stroke: o.stroke, strokeColor: o.strokeColor }));
    jzXf(L, 'ADBE Anchor Point').setValue([0, -LC2_CY * size + (nL - 1) / 2 * LD]);
    jzXf(L, 'ADBE Position').setValue([o.x, o.y]);
    if (o.rot) jzXf(L, 'ADBE Rotate Z').setValue(o.rot);
    if (o.op != null) jzXf(L, 'ADBE Opacity').setValue(o.op * 100);
    return L;
}
// vertical block (columns right -> left, one glyph per line + per-glyph offsets); x = block centre, y = top (o.mid: each column centred on y)
// returns { L, bb }
function lc2_V(ctx, str, o) {
    var size = o.size, tr = (o.track || 0) * size, lead = o.lead || 1.3, cols = lc2_lines(str), nc = cols.length, gl = [], tg = [], rot = [], anyR = false, i, j, mH = size;
    var colH = [];
    for (i = 0; i < nc; i++) { var a0 = jzChars(cols[i]), h0 = 0; for (j = 0; j < a0.length; j++) h0 += lc2_vadv(a0[j], size) + (j < a0.length - 1 ? tr : 0); colH.push(h0); mH = Math.max(mH, h0); }
    var top = o.mid ? o.y - mH / 2 : o.y;
    for (i = 0; i < nc; i++) {
        var a = jzChars(cols[i]), xc = o.x - (i - (nc - 1) / 2) * lead * size, y = o.mid ? o.y - colH[i] / 2 : top;
        for (j = 0; j < a.length; j++) {
            var ch = a[j], ad = lc2_vadv(ch, size), vx = 0, vy = 0, r90 = lc2_VROT.indexOf(ch) >= 0 || /[A-Za-z0-9]/.test(ch);
            if (lc2_isSmall(ch)) { vx = 0.11 * size; vy = -0.11 * size; }
            if ('、。，．'.indexOf(ch) >= 0) { vx = 0.3 * size; vy = -0.3 * size; }
            gl.push(ch === ' ' ? '　' : ch); tg.push([xc + vx, y + ad / 2 + vy]); rot.push(r90 ? 90 : 0); if (r90) anyR = true;
            y += ad + tr;
        }
    }
    if (!gl.length) { gl.push(' '); tg.push([o.x, top + size / 2]); rot.push(0); }
    var LD = size + tr, bw = nc * lead * size - (lead - 1) * size;
    var L = jzNoGhost(jzText(ctx, gl.join('\r'), { font: o.font, size: size, color: o.color || ctx.sc.fg, x: o.x, y: top + mH / 2, track: 0, leading: LD, name: o.name || jzStrip(str) }));
    var P = [o.x, top + mH / 2], x0 = tg[0][0], y0 = tg[0][1];
    jzXf(L, 'ADBE Anchor Point').setValue([P[0] - x0, P[1] - y0 - LC2_CY * size]);
    jzXf(L, 'ADBE Position').setValue(P);
    var offs = [], any = false;
    for (i = 0; i < gl.length; i++) { var d = [tg[i][0] - x0, tg[i][1] - (y0 + i * LD)]; if (Math.abs(d[0]) + Math.abs(d[1]) > 0.05) any = true; offs.push(d); }
    if (any) jzCharOffsets(L, offs, 'JZ Columns');
    if (anyR) jzCharRotations(L, rot, 'JZ Upright');
    return { L: L, bb: lc2_box4(o.x - bw / 2, top, o.x + bw / 2, top + mH), w: bw, h: mH };
}
// many small labels in ONE text layer (one per line): items [{ t, x, y, c }], y = label centre; o: font size align track color name
function lc2_multi(ctx, items, o) {
    var lines = [], map = [], offs = [], size = o.size, LD = size * 1.25, i, j, cols = [], lineOf = [];
    for (i = 0; i < items.length; i++) {
        var t = String(items[i].t == null ? '' : items[i].t).replace(/[\r\n]/g, ' ');
        if (!t) { lineOf.push(-1); continue; }
        var l = lines.length; lines.push(t); lineOf.push(l);
        var ch = jzChars(t);
        for (j = 0; j < ch.length; j++) { map.push(l); offs.push([items[i].x, items[i].y + LC2_CY * size - l * LD]); }
        cols.push(items[i].c || null);
    }
    if (!lines.length) return null;
    var L = jzNoGhost(jzText(ctx, lines.join('\r'), { font: o.font, size: size, color: o.color, x: 0, y: 0, align: o.align, track: o.track || 0, leading: LD, name: o.name || 'labels' }));
    jzXf(L, 'ADBE Anchor Point').setValue([0, 0]); jzXf(L, 'ADBE Position').setValue([0, 0]);
    jzCharOffsets(L, offs, 'JZ Labels');
    var done = {};
    for (i = 0; i < cols.length; i++) {
        var cc = cols[i];
        if (!cc || String(cc).toUpperCase() === String(o.color).toUpperCase() || done[cc]) continue;
        done[cc] = 1;
        var fl = []; for (j = 0; j < map.length; j++) fl.push(cols[map[j]] === cc);
        jzCharColors(L, cc, fl, 'JZ Label Colour');
    }
    if (o.op != null) jzXf(L, 'ADBE Opacity').setValue(o.op * 100);
    return { L: L, map: map, lineOf: lineOf };
}
// per-line alpha for lc2_multi layers: body sets a from l (line index)
function lc2_lineAlpha(M, head, body) {
    return jzAnimator(M.L, 'JZ Line Alpha', [['ADBE Text Opacity', 0]], head + 'var LM=' + jzArrExpr(M.map) + ';var l=LM[textIndex-1]||0;var a=1;' + body + ';(1-cl(a))*100');
}
// layer opacity = value * factor (alpha = static base 0..1)
function lc2_op(ctx, L, factor, alpha, pre) {
    if (alpha != null) jzXf(L, 'ADBE Opacity').setValue(alpha * 100);
    jzSetExpr(jzXf(L, 'ADBE Opacity'), lc2_H(ctx) + (pre || '') + 'value*(' + factor + ')');
}
// per-glyph alpha animator on a text layer (keeps the layer's own opacity expression free for the motion system)
function lc2_alphaAnim(L, head, aExpr) { return jzAnimator(L, 'JZ Alpha', [['ADBE Text Opacity', 0]], head + 'var a=' + aExpr + ';(1-cl(a))*100'); }

/* ---------------------------------------------------------------- rigs + shapes */
function lc2_S(ctx, name, x, y) { return jzNoGhost(jzShapeLayer(ctx, name, x || 0, y || 0)); }
// parent L to rig R (R: anchor 0, static scale 100 / rotation 0 — its motion lives in expressions); L keeps its comp place
function lc2_kid(L, R) {
    var p = jzXf(L, 'ADBE Position').value, q = jzXf(R, 'ADBE Position').value;
    L.setParentWithJump(R);
    jzXf(L, 'ADBE Position').setValue([p[0] - q[0], p[1] - q[1]]);
    return L;
}
function lc2_G(S, name) { return jzGrp(S, name); }
function lc2_sub(g, name) { var n = jzVecs(g).addProperty('ADBE Vector Group'); if (name) n.name = name; return n; }
function lc2_rr(g, x, y, w, h, r) { return jzAddRect(g, Math.max(0.5, w), Math.max(0.5, h), Math.max(0, Math.min(r || 0, w / 2, h / 2)), x + w / 2, y + h / 2); }
function lc2_stroke(g, col, w, op, cap) {
    var s = jzAddStroke(g, col, Math.max(0.5, w), op);
    if (cap) { try { s.property('ADBE Vector Stroke Line Cap').setValue(cap); s.property('ADBE Vector Stroke Line Join').setValue(cap === 2 ? 2 : 1); } catch (e) {} }
    return s;
}
// o: { r, stroke, sw, op (fill 0..100), sop }
function lc2_box(g, name, x, y, w, h, fill, o) {
    o = o || {};
    var s = lc2_sub(g, name); lc2_rr(s, x, y, w, h, o.r || 0);
    if (o.stroke) lc2_stroke(s, o.stroke, o.sw || 2, o.sop);
    if (fill) jzAddFill(s, fill, o.op);
    return s;
}
function lc2_circ(g, name, cx, cy, r, fill, o) {
    o = o || {};
    var s = lc2_sub(g, name); jzAddEllipse(s, r * 2, r * 2, cx, cy);
    if (o.stroke) lc2_stroke(s, o.stroke, o.sw || 2, o.sop);
    if (fill) jzAddFill(s, fill, o.op);
    return s;
}
function lc2_poly(g, name, pts, fill, o) {
    o = o || {};
    var s = lc2_sub(g, name); jzAddPath(s, pts, true);
    if (o.stroke) lc2_stroke(s, o.stroke, o.sw || 2, o.sop, o.cap);
    if (fill) jzAddFill(s, fill, o.op);
    return s;
}
function lc2_line(g, name, pts, col, w, o) {
    o = o || {};
    var s = lc2_sub(g, name); jzAddPath(s, pts, !!o.closed);
    lc2_stroke(s, col, w, o.op, o.cap);
    return s;
}
// several open polylines with one stroke
function lc2_lines2(g, name, list, col, w, o) {
    o = o || {};
    var s = lc2_sub(g, name);
    for (var i = 0; i < list.length; i++) jzAddPath(s, list[i], false);
    lc2_stroke(s, col, w, o.op, o.cap);
    return s;
}
function lc2_dash(st, d, gp, off) {
    var D = st.property('ADBE Vector Stroke Dashes'), p1 = null, p2 = null, p3 = null;
    try { p1 = D.addProperty('ADBE Vector Stroke Dash 1'); p2 = D.addProperty('ADBE Vector Stroke Gap 1'); if (off) p3 = D.addProperty('ADBE Vector Stroke Offset'); } catch (e) { p1 = null; p2 = null; }
    if (!p1) p1 = D.property('ADBE Vector Stroke Dash 1');
    if (!p2) p2 = D.property('ADBE Vector Stroke Gap 1');
    if (off && !p3) { try { p3 = D.property('ADBE Vector Stroke Offset'); } catch (e2) {} }
    if (p1) p1.setValue(d); if (p2) p2.setValue(gp); if (p3 && off) p3.setValue(off);
}
// dotted polylines (dots of radius r every `step` px): zero-length dashes with round caps
function lc2_dots(g, name, list, col, r, step, op) {
    var s = lc2_sub(g, name);
    for (var i = 0; i < list.length; i++) jzAddPath(s, list[i], false);
    var st = lc2_stroke(s, col, r * 2, op, 2);
    lc2_dash(st, 0, Math.max(1, step));
    return s;
}
// soft offset shadow under a paper object
function lc2_shadow(g, sc, x, y, w, h, r, d) { return lc2_box(g, 'shadow', x + d * 0.6, y + d, w, h, lc2_shCol(sc), { r: r, op: lc2_shOp(sc) }); }
function lc2_gx(g, key, ex) {
    var mn = { pos: 'ADBE Vector Position', sc: 'ADBE Vector Scale', rot: 'ADBE Vector Rotation', op: 'ADBE Vector Group Opacity', anc: 'ADBE Vector Anchor' }[key];
    jzSetExpr(jzGX(g).property(mn), ex);
}
function lc2_gset(g, key, v) {
    var mn = { pos: 'ADBE Vector Position', sc: 'ADBE Vector Scale', rot: 'ADBE Vector Rotation', op: 'ADBE Vector Group Opacity', anc: 'ADBE Vector Anchor' }[key];
    jzGX(g).property(mn).setValue(v);
}
// clip windows follow the UNLAGGED time (browser ltU / pOutU), so the lyric's ghost passes are clipped like the main pass:
// inside the ghost copy of the content comp (named '… ghost' by jzBuild, running LC2_LAG s late) the clock is advanced again
var LC2_LAG = 1.2 / 24;   // mean of the build's two ghost lags (0.8 / 1.6 frames): both ghosts end within 0.4 frame of the main clip
function lc2_unlag(ex) { return 'var tU=time+(thisComp.name.indexOf(" ghost")>=0?' + jzN(LC2_LAG) + ':0);\n' + String(ex).replace(/\btime\b/g, 'tU'); }
// rectangle mask in comp px on an unparented, unrotated layer, grown by an animated Mask Expansion (px expression)
function lc2_clip(L, x0, y0, x1, y1, expEx) {
    var p = jzXf(L, 'ADBE Position').value, a = jzXf(L, 'ADBE Anchor Point').value, dx = a[0] - p[0], dy = a[1] - p[1];
    var m = jzMaskRect(L, x0 + dx, y0 + dy, x1 + dx, y1 + dy, 0);
    if (expEx) jzSetExpr(m.property('ADBE Mask Offset'), lc2_unlag(expEx));
    return m;
}
// diagonal stripes (browser stripes()) clipped to x..x+w: list of polygons
function lc2_clipX(poly, xa, xb) {
    function cut(pts, xl, keepGreater) {
        var out = [], n = pts.length;
        for (var i = 0; i < n; i++) {
            var A = pts[i], B = pts[(i + 1) % n], ina = keepGreater ? A[0] >= xl : A[0] <= xl, inb = keepGreater ? B[0] >= xl : B[0] <= xl;
            if (ina) out.push(A);
            if (ina !== inb) { var t = (xl - A[0]) / (B[0] - A[0]); out.push([xl, A[1] + (B[1] - A[1]) * t]); }
        }
        return out;
    }
    return cut(cut(poly, xa, true), xb, false);
}
function lc2_stripes(x, y, w, h, sw, ang, clip) {
    var t = Math.tan(ang * Math.PI / 180), n = Math.min(160, Math.ceil((w + h * Math.abs(t)) / (sw * 2)) + 2), out = [];
    for (var i = -1; i < n + 1; i++) {
        var xa = x - h * Math.abs(t) + i * sw * 2;
        var q = [[xa, y + h], [xa + sw, y + h], [xa + sw + h * t, y], [xa + h * t, y]];
        if (clip) { q = lc2_clipX(q, x, x + w); if (q.length < 3) continue; }
        out.push(q);
    }
    return out;
}
function lc2_polys(g, name, list, fill, op) {
    var s = lc2_sub(g, name);
    for (var i = 0; i < list.length; i++) jzAddPath(s, list[i], true);
    jzAddFill(s, fill, op);
    return s;
}
// smooth closed path through points (Catmull-Rom tangents)
function lc2_smooth(g, name, pts, closed) {
    var n = pts.length, I = [], O = [], i;
    for (i = 0; i < n; i++) {
        var a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
        if (!closed && (i === 0 || i === n - 1)) { I.push([0, 0]); O.push([0, 0]); continue; }
        var tx = (b[0] - a[0]) / 6, ty = (b[1] - a[1]) / 6;
        I.push([-tx, -ty]); O.push([tx, ty]);
    }
    var sh = new Shape(); sh.vertices = pts; sh.inTangents = I; sh.outTangents = O; sh.closed = !!closed;
    var p = jzVecs(g).addProperty('ADBE Vector Shape - Group'); p.property('ADBE Vector Shape').setValue(sh);
    return p;
}
// paint order: groups are written back-to-front (like canvas code); AE draws the FIRST group on top, so every container that
// holds only groups is reversed at the end (call after all expressions of the layer are set — moving invalidates references)
function lc2_flipV(v) {
    var n = v.numProperties, i, allG = true;
    for (i = 1; i <= n; i++) if (v.property(i).matchName !== 'ADBE Vector Group') allG = false;
    for (i = 1; i <= n; i++) if (v.property(i).matchName === 'ADBE Vector Group') lc2_flipV(v.property(i).property('ADBE Vectors Group'));
    if (allG && n > 1) for (i = 1; i < n; i++) v.property(n).moveTo(i);
}
function lc2_paint(S) { lc2_flipV(S.property('ADBE Root Vectors Group')); return S; }

/* ================================================================== 17 stampSheet — 切手シート */
jzReg('layout', 'stampSheet', {
    plan: function (rng, cut, st) {
        var port = lc2_port(cut), cols = port ? 3 : 5, rows = port ? 5 : 3;
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), cols: cols, rows: rows, hc: port ? rng.int(0, 1) : 1, hr: port ? 1 : rng.int(0, 1),
            val: rng.pick([63, 84, 94, 110, 120, 140]), motif: rng.pick(['circle', 'wave', 'char']), tear: rng.chance(0.6) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), k = lc2_k(ctx), ls = jzSmallSize(ctx), port = jzPortrait(ctx), HD = lc2_H(ctx), r, q, i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), cols = jzP(ctx, 'cols', port ? 3 : 5), rows = jzP(ctx, 'rows', port ? 5 : 3);
        var val = jzP(ctx, 'val', 84), motif = jzP(ctx, 'motif', 'circle'), tear = !!jzP(ctx, 'tear', true), C = lc2_card(sc);
        var cell = Math.min(W * 0.86 / (cols + 0.4), H * 0.84 / (rows + 0.6)), sw = cols * cell, sh = rows * cell, sx = W / 2 - sw / 2, sy = H / 2 - sh / 2 + cell * 0.1, m = cell * 0.2;
        var SA = HD + 'var sa=oc(time/0.35)*(1-cl((PO-0.5)/0.5));';
        var perfC = String(sc.bg).toUpperCase() === String(C.fill).toUpperCase() ? jzMixHex(C.fill, C.text, 0.2) : sc.bg;
        // sheet (selvage) + header line
        var S = lc2_S(ctx, 'stamp sheet', 0, 0), g = lc2_G(S, 'sheet');
        lc2_shadow(g, sc, sx - m, sy - m * 1.8, sw + m * 2, sh + m * 2.8, 0, u * 0.012);
        lc2_box(g, 'selvage', sx - m, sy - m * 1.8, sw + m * 2, sh + m * 2.8, C.fill, C.edge ? { stroke: C.line, sw: 1.2 * k } : null);
        jzSetExpr(jzXf(S, 'ADBE Opacity'), SA + 'value*sa');
        lc2_paint(S);
        var hdr = lc2_T(ctx, 'JIZURA POST  ·  ' + val + ' × ' + (cols * rows - 3) + '  ·  No.' + jzLineNo(ctx), { font: jzMonoF(ctx), size: Math.min(ls * 0.8, m * 0.7), track: 0.2, align: 'left', x: sx, y: sy - m * 0.9, color: C.text });
        jzSetExpr(jzXf(hdr, 'ADBE Opacity'), SA + 'value*sa*0.7');
        // the small stamps (pop in diagonally)
        var spc = rows > cols ? 2 : 3, spr = rows > cols ? 3 : 2;
        var hc = Math.min(jzP(ctx, 'hc', 1), cols - spc), hr = Math.min(jzP(ctx, 'hr', 0), rows - spr);
        var tones = [lc2_plate(sc, [sc.accent], C.fill, 1.3), jzMixHex(C.fill, C.text, 0.18), lc2_plate(sc, [sc.accent2, sc.sub], C.fill, 1.3), jzMixHex(C.fill, sc.accent, 0.45)];
        var t0 = jzTrim(c.text), first = jzChars(jzStrip(t0))[0] || '', hole = cell * 0.035, pad = cell * 0.1, qq = cell - pad * 2;
        var S2 = lc2_S(ctx, 'stamps', 0, 0), G2 = lc2_G(S2, 'stamps'), labs = [], chs = [], D = [], DC = [];
        for (r = 0; r < rows; r++) for (q = 0; q < cols; q++) {
            if (q >= hc && q < hc + spc && r >= hr && r < hr + spr) continue;
            var d0 = 0.05 + (q + r) * 0.03, x = sx + q * cell, y = sy + r * cell, tone = tones[(q + r * 2) % 4], tt = lc2_onCol(sc, tone);
            var gs = lc2_sub(G2, 'stamp ' + (r + 1) + '-' + (q + 1));
            lc2_box(gs, 'face', -qq / 2, -qq / 2, qq, qq, tone);
            var lw0 = Math.max(1.5 * k, qq * 0.03);
            if (motif === 'circle') lc2_gx(lc2_circ(gs, 'motif', 0, qq * 0.08, qq * 0.24, null, { stroke: tt, sw: lw0, sop: 60 }), 'op', HD + 'var e=ob(cl((time-' + jzN(d0) + ')/0.3),1.5)*K;e>0.6?100:0');
            else if (motif === 'wave') {
                var wp = []; for (i = 0; i <= 16; i++) wp.push([-qq * 0.35 + qq * 0.7 * i / 16, qq * 0.1 + Math.sin(i / 16 * Math.PI * 3) * qq * 0.08]);
                lc2_gx(lc2_line(gs, 'motif', wp, tt, lw0, { op: 60, cap: 2 }), 'op', HD + 'var e=ob(cl((time-' + jzN(d0) + ')/0.3),1.5)*K;e>0.6?100:0');
            } else if (first) { chs.push({ t: first, x: x + cell / 2, y: y + cell / 2 + qq * 0.08, c: tt }); DC.push(d0); }
            lc2_gset(gs, 'pos', [x + cell / 2, y + cell / 2]);
            lc2_gx(gs, 'sc', HD + 'var e=ob(cl((time-' + jzN(d0) + ')/0.3),1.5)*K;[100*e,100*e]');
            labs.push({ t: String(val), x: x + pad + qq * 0.08, y: y + pad + qq * 0.13, c: tt }); D.push(d0);
        }
        lc2_paint(S2);
        if (labs.length) {
            var ML = lc2_multi(ctx, labs, { font: jzMonoF(ctx), size: qq * 0.16, align: 'left', color: labs[0].c, name: 'stamp values' });
            lc2_lineAlpha(ML, HD + 'var D=' + jzArrExpr(D) + ';', 'var e=ob(cl((time-D[l])/0.3),1.5)*K;a=e>0.6?0.9:0');
        }
        if (chs.length) {
            var MC = lc2_multi(ctx, chs, { font: font, size: qq * 0.45, color: chs[0].c, name: 'stamp motifs' });
            lc2_lineAlpha(MC, HD + 'var D=' + jzArrExpr(DC) + ';', 'var e=ob(cl((time-D[l])/0.3),1.5)*K;a=e>0.6?0.5:0');
        }
        // perforations between all stamps
        var P = lc2_S(ctx, 'perforations', 0, 0), gp = lc2_G(P, 'perf'), nx = Math.max(2, Math.round(cell / (hole * 3.2))), rowsL = [];
        for (r = 0; r <= rows; r++) rowsL.push([[sx, sy + r * cell], [sx + sw, sy + r * cell]]);
        for (q = 0; q <= cols; q++) rowsL.push([[sx + q * cell, sy], [sx + q * cell, sy + sh]]);
        lc2_dots(gp, 'holes', rowsL, perfC, hole, cell / nx);
        jzSetExpr(jzXf(P, 'ADBE Opacity'), SA + 'value*sa*0.9');
        // the hero stamp (3x2 / 2x3): lifts and tears away on exit
        var hx = sx + hc * cell, hy = sy + hr * cell, hw = cell * spc, hh = cell * spr, hs = Math.min(hw, hh), ip = hs * 0.07;
        var HE = HD + 'var he=ob(cl((time-0.12)/0.35),1.3),tr=' + (tear ? 'ic(PO)' : '0') + ',ha=cl(he*2)*' + (tear ? '(1-cl((PO-0.6)/0.4))' : 'K') + ';';
        var R = lc2_S(ctx, 'hero stamp', hx + hw / 2, hy + hh / 2), gh = lc2_G(R, 'hero'), dS = u * 0.02;
        var gsd = lc2_box(gh, 'lift shadow', -hw / 2, -hh / 2, hw, hh, lc2_shCol(sc), { op: lc2_shOp(sc) });
        lc2_gx(gsd, 'pos', HE + '[' + jzN(dS * 0.6) + '*(1+tr*2),' + jzN(dS) + '*(1+tr*2)]'); lc2_gx(gsd, 'op', HE + 'tr>0.001?100:0');
        lc2_box(gh, 'paper', -hw / 2, -hh / 2, hw, hh, C.fill);
        var hl = hole * 1.2, nxh = Math.max(2, Math.round(hw / (hl * 3.2))), nyh = Math.max(2, Math.round(hh / (hl * 3.2)));
        lc2_dots(gh, 'perf h', [[[-hw / 2, -hh / 2], [hw / 2, -hh / 2]], [[-hw / 2, hh / 2], [hw / 2, hh / 2]]], perfC, hl, hw / nxh);
        lc2_dots(gh, 'perf v', [[[-hw / 2, -hh / 2], [-hw / 2, hh / 2]], [[hw / 2, -hh / 2], [hw / 2, hh / 2]]], perfC, hl, hh / nyh);
        var heroC = lc2_plate(sc, [sc.accent, sc.ink], C.fill, 1.8), htc = lc2_onCol(sc, heroC);
        lc2_box(gh, 'plate', -hw / 2 + ip, -hh / 2 + ip, hw - ip * 2, hh - ip * 2, heroC);
        jzSetExpr(jzXf(R, 'ADBE Position'), HE + '[value[0]+tr*' + jzN(cell * 0.4) + ',value[1]-tr*' + jzN(cell * 0.8) + ']');
        jzSetExpr(jzXf(R, 'ADBE Rotate Z'), HE + 'value+tr*14+(1-he)*-6');
        jzSetExpr(jzXf(R, 'ADBE Scale'), HE + 'var s=0.9+0.1*he+tr*0.06;[value[0]*s,value[1]*s]');
        jzSetExpr(jzXf(R, 'ADBE Opacity'), HE + 'value*ha');
        lc2_paint(R);
        var ox = hx + hw / 2, oy = hy + hh / 2;
        var V1 = lc2_T(ctx, String(val), { font: jzMonoF(ctx), size: hs * 0.1, align: 'left', x: ox - hw / 2 + ip * 1.8, y: oy - hh / 2 + ip * 2.4, color: htc });
        var V2 = lc2_T(ctx, 'LYRIC  ' + jzLineNo(ctx), { font: jzMonoF(ctx), size: hs * 0.045, track: 0.3, align: 'right', x: ox + hw / 2 - ip * 1.8, y: oy + hh / 2 - ip * 1.9, color: htc });
        lc2_kid(V1, R); lc2_kid(V2, R);
        jzSetExpr(jzXf(V1, 'ADBE Opacity'), HE + 'value*ha'); jzSetExpr(jzXf(V2, 'ADBE Opacity'), HE + 'value*ha*0.8');
        var fb = lc2_fitBlock(t0, hw * 0.76, hh * 0.56, { lead: 1.08 }, 3);
        var T = lc2_T(ctx, fb.text, { font: font, size: Math.min(fb.size, hs * 0.34), x: ox, y: oy + hs * 0.03, lead: 1.08, color: htc, name: t0 });
        lc2_kid(T, R);
        lc2_main(ctx, T, 0.15);
        return lc2_box4(hx, hy, hx + hw, hy + hh);
    }
});

/* ================================================================== 18 postcard — はがき */
jzReg('layout', 'postcard', {
    plan: function (rng, cut, st) {
        var font = rng.chance(0.4) ? 'klee' : rng.pick(jzFontsOf(st, ['serif', 'display'])), tilt = rng.range(-5, 5), val = rng.pick([63, 85, 110]), z = '';
        for (var i = 0; i < 7; i++) z += rng.int(0, 9);
        return { font: font, tilt: tilt, val: val, zip: z, mark: rng.range(-18, 18), stamp: rng.pick(['circle', 'mount', 'wave']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), k = lc2_k(ctx), ls = jzSmallSize(ctx), port = jzPortrait(ctx), HD = lc2_H(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'serif')), tilt = jzP(ctx, 'tilt', 0), val = jzP(ctx, 'val', 63), zip = String(jzP(ctx, 'zip', '1500001'));
        var mark = jzP(ctx, 'mark', 0), stamp = jzP(ctx, 'stamp', 'circle'), C = lc2_card(sc), vertCard = port;
        var cw = vertCard ? Math.min(W * 0.8, H * 0.8 / 1.48) : Math.min(W * 0.66, H * 0.84 * 1.48), ch = vertCard ? cw * 1.48 : cw / 1.48;
        var CX = W / 2, CY = H / 2, EX = HD + 'var ein=oc(time/0.55),eo=ic(PO),a=cl(ein*2)*(1-eo);';
        var R = lc2_S(ctx, 'postcard', CX, CY), g = lc2_G(R, 'card');
        var x0 = -cw / 2, y0 = -ch / 2;
        lc2_shadow(g, sc, x0, y0, cw, ch, cw * 0.012, u * 0.016);
        lc2_box(g, 'card', x0, y0, cw, ch, C.fill, { r: cw * 0.012, stroke: C.edge ? C.line : null, sw: 1.2 * k });
        var red = lc2_plate(sc, [sc.accent, sc.accent2, C.text], C.fill, 1.8), m = Math.min(cw, ch) * 0.07;
        // stamp (top-left) with a perforated edge
        var stw = Math.min(cw, ch) * 0.2, sth = stw * 1.2, stx = x0 + m, sty = y0 + m, stC = lc2_plate(sc, [sc.accent2, sc.accent, sc.ink], C.fill, 1.5), stt = lc2_onCol(sc, stC);
        var gS = lc2_sub(g, 'stamp'), hole = stw * 0.035, np = Math.max(2, Math.round(stw / (hole * 3.2))), npv = Math.max(2, Math.round(sth / (hole * 3.2)));
        lc2_box(gS, 'paper', stx, sty, stw, sth, stC);
        lc2_dots(gS, 'perf h', [[[stx, sty], [stx + stw, sty]], [[stx, sty + sth], [stx + stw, sty + sth]]], C.fill, hole, stw / np);
        lc2_dots(gS, 'perf v', [[[stx, sty], [stx, sty + sth]], [[stx + stw, sty], [stx + stw, sty + sth]]], C.fill, hole, sth / npv);
        if (stamp === 'circle') lc2_circ(gS, 'sun', stx + stw / 2, sty + sth * 0.56, stw * 0.26, stt, { op: 80 });
        else if (stamp === 'mount') lc2_poly(gS, 'mount', [[stx + stw * 0.12, sty + sth * 0.78], [stx + stw * 0.5, sty + sth * 0.3], [stx + stw * 0.88, sty + sth * 0.78]], stt, { op: 80 });
        else { var wp = []; for (i = 0; i <= 12; i++) wp.push([stx + stw * (0.12 + 0.76 * i / 12), sty + sth * 0.6 + Math.sin(i / 12 * Math.PI * 2) * sth * 0.08]); lc2_line(gS, 'wave', wp, stt, Math.max(2 * k, stw * 0.05), { cap: 2 }); }
        // postal code boxes
        var bs = Math.min(cw, ch) * 0.062, gap = bs * 0.22, zx1 = x0 + cw - m, zy = y0 + m * 0.9, gz = lc2_sub(g, 'zip boxes'), zi = [];
        for (i = 0; i < 7; i++) {
            var bx = zx1 - (7 - i) * (bs + gap) - (i < 3 ? gap * 1.5 : 0);
            lc2_box(gz, 'box', bx, zy, bs, bs * 1.25, null, { r: bs * 0.08, stroke: red, sw: Math.max(1.2 * k, bs * 0.06) });
            if (i === 3) lc2_line(gz, 'dash', [[bx - gap * 2.2, zy + bs * 0.62], [bx - gap * 0.6, zy + bs * 0.62]], red, Math.max(1.2 * k, bs * 0.06));
            zi.push({ t: zip.charAt(i), x: CX + bx + bs / 2, y: CY + zy + bs * 0.66 });
        }
        var ZA = 'oc(cl((time-0.25)/0.4))*K';
        lc2_gx(gz, 'op', HD + '100*' + ZA);
        // address lines + lyric
        var t0 = jzTrim(c.text), bb, LA = 'oc(cl((time-0.2)/0.5))*K', texts = [], gl = lc2_sub(g, 'address lines');
        var lyr, lastSama = null;
        if (vertCard && !jzHasLatin(t0)) {
            var top = y0 + m + sth + ls * 2.4, bot = y0 + ch - m * 1.4, vo = { vertical: true, lead: 1.3, track: 0.06 };
            var fb = lc2_fitBlock(jzStrip(t0), cw * 0.5, (bot - top) * 0.84, vo, 2), size = Math.min(fb.size, cw * 0.2), mm = lc2_meas(fb.text, size, vo);
            var lx = x0 + cw * 0.62, cl0 = [];
            for (i = 0; i < 4; i++) { var xx = x0 + cw * (0.84 - i * 0.2); cl0.push([[xx, top], [xx, bot]]); }
            lc2_dots(gl, 'leaders', cl0, C.text, Math.max(1 * k, ls * 0.05), ls * 0.45, 30);
            var ty = top + Math.max(0, (bot - top) - mm.h - size * 1.3) * 0.3;
            var VV = lc2_V(ctx, fb.text, { font: font, size: size, color: C.text, x: CX + lx, y: CY + ty, lead: 1.3, track: 0.06, name: t0 });
            lyr = VV.L;
            var lls = lc2_lines(fb.text), lastLen = jzCount(lls[lls.length - 1]);
            lastSama = lc2_T(ctx, '様', { font: font, size: size * 0.7, x: CX + lx - (fb.lines - 1) * size * 0.65, y: CY + ty + lastLen * size * 1.06 + size * 0.75, color: C.text });
        } else {
            var top2 = y0 + m + sth + ls * 1.8, bot2 = y0 + ch - m, lh = (bot2 - top2) / 4, rl = [];
            for (i = 1; i <= 4; i++) rl.push([[x0 + m, top2 + lh * i], [x0 + cw - m, top2 + lh * i]]);
            lc2_dots(gl, 'leaders', rl, C.text, Math.max(1 * k, ls * 0.05), ls * 0.45, 30);
            var fb2 = lc2_fitBlock(t0, cw - m * 2.4, lh * 2.4, { lead: 1.2, track: 0.02 }, 2), size2 = Math.min(fb2.size, lh * 1.05), nL = fb2.lines;
            lyr = lc2_T(ctx, fb2.text, { font: font, size: size2, x: CX + x0 + m * 1.2, y: CY + top2 + lh * (nL > 1 ? 2.5 : 2.0) - size2 * 0.3, align: 'left', lead: lh / size2, track: 0.02, color: C.text, name: t0 });
        }
        lc2_gx(gl, 'op', HD + '100*' + LA);
        // postmark thumps onto the stamp
        var pmx = stx + stw * 0.95, pmy = sty + sth * 0.62, RR = stw * 0.62, PT = 'var pt=(time-' + jzN((c.inDur || 0) + 0.2) + ')/0.18,q=lp(1.4,1,ob(cl(pt),1.3)),pa=pt>0?cl(pt*3)*K*0.85:0;';
        var gm = lc2_sub(g, 'postmark');
        lc2_circ(gm, 'ring', 0, 0, RR, null, { stroke: C.text, sw: Math.max(1.5 * k, RR * 0.05) });
        lc2_circ(gm, 'ring 2', 0, 0, RR * 0.8, null, { stroke: C.text, sw: Math.max(1 * k, RR * 0.025) });
        lc2_lines2(gm, 'bars', [[[-RR * 0.8, -RR * 0.36], [RR * 0.8, -RR * 0.36]], [[-RR * 0.8, RR * 0.36], [RR * 0.8, RR * 0.36]]], C.text, Math.max(1 * k, RR * 0.025));
        var wl = [];
        for (var k2 = 0; k2 < 3; k2++) { var pts = []; for (i = 0; i <= 20; i++) pts.push([RR * 1.15 + i * RR * 0.1, (k2 - 1) * RR * 0.32 + Math.sin(i * 0.9) * RR * 0.08]); wl.push(pts); }
        lc2_lines2(gm, 'cancel waves', wl, C.text, Math.max(1.5 * k, RR * 0.04), { cap: 2 });
        lc2_gset(gm, 'pos', [pmx, pmy]); lc2_gset(gm, 'rot', mark);
        lc2_gx(gm, 'sc', HD + PT + '[100*q,100*q]'); lc2_gx(gm, 'op', HD + PT + '100*pa');
        jzSetExpr(jzXf(R, 'ADBE Position'), EX + '[value[0]-(1-ein)*' + jzN(W * 0.4) + '+eo*' + jzN(W * 0.3) + ',value[1]+(1-ein)*' + jzN(H * 0.05) + ']');
        jzSetExpr(jzXf(R, 'ADBE Rotate Z'), EX + 'value+' + jzN(tilt) + '+(1-ein)*-18+eo*10');
        jzSetExpr(jzXf(R, 'ADBE Opacity'), EX + 'value*a');
        lc2_paint(R);
        // text layers riding on the card
        var tv = lc2_T(ctx, String(val), { font: jzMonoF(ctx), size: stw * 0.2, align: 'left', x: CX + stx + stw * 0.1, y: CY + sty + sth * 0.14, color: stt });
        lc2_kid(tv, R); jzSetExpr(jzXf(tv, 'ADBE Opacity'), EX + 'value*a');
        var ZM = lc2_multi(ctx, zi, { font: font, size: bs * 0.8, color: C.text, name: 'zip code' });
        lc2_kid(ZM.L, R); lc2_op(ctx, ZM.L, ZA, 0.9);
        var lab = lc2_T(ctx, vertCard ? '郵便はがき' : 'POST CARD', { font: vertCard ? jzSerifF(ctx) : jzMonoF(ctx), size: ls * (vertCard ? 1.2 : 0.9), track: 0.5, x: CX + (vertCard ? 0 : x0 + cw * 0.46), y: CY + (vertCard ? y0 + m + sth + ls * 0.9 : y0 + m * 0.75), color: C.text });
        lc2_kid(lab, R); jzSetExpr(jzXf(lab, 'ADBE Opacity'), EX + 'value*a*0.75');
        if (lastSama) { lc2_kid(lastSama, R); lc2_op(ctx, lastSama, LA); }
        var tm = lc2_T(ctx, jzFmtTime(c.start), { font: jzMonoF(ctx), size: RR * 0.26, x: CX + pmx, y: CY + pmy, color: C.text, rot: mark });
        lc2_kid(tm, R);
        jzSetExpr(jzXf(tm, 'ADBE Scale'), HD + PT + '[value[0]*q,value[1]*q]'); jzSetExpr(jzXf(tm, 'ADBE Opacity'), HD + PT + 'value*pa');
        lc2_kid(lyr, R);
        lc2_main(ctx, lyr, 0.3);
        return lc2_box4(CX - cw / 2, CY - ch / 2, CX + cw / 2, CY + ch / 2);
    }
});

/* ================================================================== 19 letterPaper — 便箋 */
jzReg('layout', 'letterPaper', {
    plan: function (rng, cut, st) {
        return { font: rng.chance(0.5) ? 'klee' : rng.pick(jzFontsOf(st, ['serif'])), variant: jzHasLatin(cut.text) ? 'yoko' : rng.pick(['tate', 'tate', 'yoko']),
            rule: rng.pick(['accent', 'accent', 'accent', 'sub']), sign: rng.chance(0.7) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), k = lc2_k(ctx), ls = jzSmallSize(ctx), port = jzPortrait(ctx), HD = lc2_H(ctx), i;
        var font = jzP(ctx, 'font', jzSerifF(ctx)), t0 = jzTrim(c.text), tate = jzP(ctx, 'variant', 'tate') === 'tate' && !jzHasLatin(t0), sign = !!jzP(ctx, 'sign', true);
        var C = lc2_card(sc), pw, ph;
        if (tate) { pw = port ? W * 0.88 : Math.min(W * 0.8, H * 0.86 * 1.45); ph = port ? Math.min(H * 0.74, pw * 1.5) : pw / 1.45; }
        else { ph = port ? Math.min(H * 0.8, W * 0.9 * 1.35) : H * 0.86; pw = port ? ph / 1.35 : Math.min(W * 0.8, ph * 1.1); }
        var x0 = W / 2 - pw / 2, y0 = H / 2 - ph / 2;
        var ruleC = jzP(ctx, 'rule', 'accent') === 'accent' ? lc2_plate(sc, [sc.accent, sc.accent2], C.fill, 1.6) : jzMixHex(C.fill, C.text, 0.4);
        var lw = Math.max(1.5 * k, u * 0.002), third = tate ? pw / 3 : ph / 3;
        // kk = how far the outer thirds are unfolded (portrait: the sheet slides up instead)
        var KX = HD + 'var uf=' + (port ? '1' : 'ioc(cl((time-0.05)/0.45))') + ',fo=' + (port ? '0' : 'ioc(cl(PO/0.7))') + ',kk=uf*(1-fo),a0=oc(cl(time/0.2))*(1-cl((PO-0.55)/0.45)),T3=' + jzN(third) + ';';
        // visible window (comp px): vx0/vy0/vw/vh
        var VIS = tate ? 'var vx0=' + jzN(x0) + '+T3*(1-kk),vy0=' + jzN(y0) + ',vw=T3*(1+2*kk),vh=' + jzN(ph) + ';'
            : 'var vx0=' + jzN(x0) + ',vy0=' + jzN(y0) + '+T3*(1-kk),vw=' + jzN(pw) + ',vh=T3*(1+2*kk);';
        var R = lc2_S(ctx, 'letter rig', W / 2, H / 2);
        if (port) jzSetExpr(jzXf(R, 'ADBE Position'), HD + '[value[0],value[1]+(1-oc(cl(time/0.45)))*' + jzN(H * 0.25) + '+ic(PO)*' + jzN(H * 0.05) + ']');
        // shadow + edge follow the visible window
        var SH = lc2_S(ctx, 'letter shadow', 0, 0), gsh = lc2_G(SH, 'shadow'), d = u * 0.014;
        var rs = lc2_sub(gsh, 'drop'), rp = jzAddRect(rs, 10, 10, 0); jzAddFill(rs, lc2_shCol(sc), lc2_shOp(sc));
        jzSetExpr(rp.property('ADBE Vector Rect Size'), KX + VIS + '[vw,vh]'); jzSetExpr(rp.property('ADBE Vector Rect Position'), KX + VIS + '[vx0+vw/2+' + jzN(d * 0.6) + ',vy0+vh/2+' + jzN(d) + ']');
        var rf = lc2_sub(gsh, 'sheet'), rpf = jzAddRect(rf, 10, 10, 0); if (C.edge) lc2_stroke(rf, C.line, 1.2 * k); jzAddFill(rf, C.fill);
        jzSetExpr(rpf.property('ADBE Vector Rect Size'), KX + VIS + '[vw,vh]'); jzSetExpr(rpf.property('ADBE Vector Rect Position'), KX + VIS + '[vx0+vw/2,vy0+vh/2]');
        jzSetExpr(jzXf(SH, 'ADBE Opacity'), KX + 'value*a0');
        lc2_paint(SH);
        // rules, creases and the shading of the swinging thirds (clipped to the window)
        var S = lc2_S(ctx, 'letter', 0, 0), g = lc2_G(S, 'rules'), mT = ph * 0.1, mS = pw * 0.06, texts = [], bb;
        var ctxT = lc2_deck(ctx), A2 = 'cl((kk-0.6)/0.4)*K';
        if (tate) {
            var top = y0 + mT, bot = y0 + ph - mT;
            lc2_box(g, 'border top', x0 + mS, top - lw * 4, pw - mS * 2, lw * 2.5, ruleC);
            lc2_box(g, 'border bottom', x0 + mS, bot + lw * 1.5, pw - mS * 2, lw * 2.5, ruleC);
            var vo = { vertical: true, lead: 1.55, track: 0.08 }, fb = lc2_fitBlock(jzStrip(t0), port ? pw * 0.6 : third * 0.9, (bot - top) * 0.92, vo, 3);
            var size = Math.min(fb.size, u * (port ? 0.17 : 0.13)), pitch = size * 1.55, nl = fb.lines, base = W / 2 - nl / 2 * pitch;
            var iMin = Math.ceil((x0 + mS - base) / pitch), iMax = Math.floor((x0 + pw - mS - base) / pitch), vl = [];
            for (i = iMin; i <= iMax; i++) vl.push([[base + i * pitch, top], [base + i * pitch, bot]]);
            lc2_lines2(g, 'column rules', vl, ruleC, lw, { op: 75 });
            var VV = lc2_V(ctx, fb.text, { font: font, size: size, color: C.text, x: W / 2, y: top + size * 0.35, lead: 1.55, track: 0.08, name: t0 });
            bb = VV.bb; texts.push([VV.L, null]);
            var cs = size * 0.62, cxp = base + (nl + 1.5) * pitch;
            if (ctxT && cxp < x0 + pw - mS) {
                var cc = jzChars(jzStrip(ctxT)).slice(0, Math.max(1, Math.floor((bot - top) / (cs * 1.1)))).join('');
                texts.push([lc2_V(ctx, cc, { font: font, size: cs, color: C.text, x: cxp, y: top + cs * 0.4, track: 0.08 }).L, A2 + '*0.5']);
            }
            if (sign && base - 1.5 * pitch > x0 + mS) texts.push([lc2_V(ctx, 'No.' + jzLineNo(ctx), { font: font, size: ls, color: C.text, x: base - 1.5 * pitch, y: bot - ls * 5 }).L, A2 + '*0.7']);
            var gsl = lc2_box(g, 'shade left', 0, 0, 10, 10, jzDarkest(sc)), gsr = lc2_box(g, 'shade right', 0, 0, 10, 10, jzDarkest(sc));
            lc2_gx(gsl, 'sc', KX + '[T3*kk*10,' + jzN(ph * 10) + ']'); lc2_gx(gsl, 'pos', KX + '[' + jzN(x0) + '+T3*(1-kk),' + jzN(y0) + ']');
            lc2_gx(gsr, 'sc', KX + '[T3*kk*10,' + jzN(ph * 10) + ']'); lc2_gx(gsr, 'pos', KX + '[' + jzN(x0 + third * 2) + ',' + jzN(y0) + ']');
            lc2_gx(gsl, 'op', KX + '(1-kk)*35'); lc2_gx(gsr, 'op', KX + '(1-kk)*35');
            var cr = jzMixHex(C.fill, C.text, 0.12);
            lc2_line(g, 'crease 1', [[x0 + third, y0], [x0 + third, y0 + ph]], cr, lw, { op: 80 });
            lc2_gx(lc2_line(g, 'crease 2', [[x0 + third * 2, y0], [x0 + third * 2, y0 + ph]], cr, lw, { op: 80 }), 'op', KX + '100*kk');
        } else {
            var left = x0 + pw * 0.1, right = x0 + pw * 0.9, top2 = y0 + ph * 0.1, bot2 = y0 + ph * 0.92, ho = { lead: 1.7, track: 0.04 };
            var fb2 = lc2_fitBlock(t0, right - left, (bot2 - top2) * 0.46, ho, port ? 3 : 2), size2 = Math.min(fb2.size, u * 0.15), pitch2 = size2 * 1.7;
            var nRow = Math.max(3, Math.floor((bot2 - top2) / pitch2)), hl = [];
            for (i = 0; i <= nRow; i++) hl.push([[left - pw * 0.03, top2 + i * pitch2], [right + pw * 0.03, top2 + i * pitch2]]);
            lc2_lines2(g, 'rules', hl, ruleC, lw, { op: 75 });
            lc2_line(g, 'top rule', [[left - pw * 0.03, top2 - lw * 5], [right + pw * 0.03, top2 - lw * 5]], ruleC, lw * 2.5);
            var nl2 = fb2.lines, r0 = Math.max(0, Math.floor(nRow / 2 - nl2 / 2)), ly = top2 + (r0 + nl2 / 2) * pitch2 - size2 * 0.12;
            var TL = lc2_T(ctx, fb2.text, { font: font, size: size2, x: left, y: ly, align: 'left', lead: 1.7, track: 0.04, color: C.text, name: t0 });
            var mm2 = lc2_meas(fb2.text, size2, ho); bb = lc2_box4(left, ly - mm2.h / 2, left + mm2.w, ly + mm2.h / 2); texts.push([TL, null]);
            if (ctxT && r0 > 0) texts.push([lc2_T(ctx, ctxT, { font: font, size: size2 * 0.6, x: left, y: top2 + (r0 - 0.5) * pitch2 - size2 * 0.1, align: 'left', color: C.text }), A2 + '*0.45']);
            if (sign) texts.push([lc2_T(ctx, '— No.' + jzLineNo(ctx), { font: font, size: ls, x: right, y: top2 + (nRow - 0.5) * pitch2 - ls * 0.2, align: 'right', color: C.text }), A2 + '*0.7']);
            var gst = lc2_box(g, 'shade top', 0, 0, 10, 10, jzDarkest(sc)), gsb = lc2_box(g, 'shade bottom', 0, 0, 10, 10, jzDarkest(sc));
            lc2_gx(gst, 'sc', KX + '[' + jzN(pw * 10) + ',T3*kk*10]'); lc2_gx(gst, 'pos', KX + '[' + jzN(x0) + ',' + jzN(y0) + '+T3*(1-kk)]');
            lc2_gx(gsb, 'sc', KX + '[' + jzN(pw * 10) + ',T3*kk*10]'); lc2_gx(gsb, 'pos', KX + '[' + jzN(x0) + ',' + jzN(y0 + third * 2) + ']');
            lc2_gx(gst, 'op', KX + '(1-kk)*35'); lc2_gx(gsb, 'op', KX + '(1-kk)*35');
            var cr2 = jzMixHex(C.fill, C.text, 0.12);
            lc2_gx(lc2_lines2(g, 'creases', [[[x0, y0 + third], [x0 + pw, y0 + third]], [[x0, y0 + third * 2], [x0 + pw, y0 + third * 2]]], cr2, lw, { op: 80 }), 'op', KX + '100*kk');
        }
        jzSetExpr(jzXf(S, 'ADBE Opacity'), KX + 'value*a0');
        lc2_paint(S);
        // clip window: the middle third, grown by the unfold
        var BIG = Math.max(W, H);
        function clip(L) {
            if (port) return;
            if (tate) lc2_clip(L, x0 + third, y0 - BIG, x0 + third * 2, y0 + ph + BIG, KX + 'T3*kk');
            else lc2_clip(L, x0 - BIG, y0 + third, x0 + pw + BIG, y0 + third * 2, KX + 'T3*kk');
        }
        clip(S);
        lc2_kid(SH, R); lc2_kid(S, R);
        for (i = 0; i < texts.length; i++) {
            var L = texts[i][0];
            clip(L); lc2_kid(L, R);
            if (texts[i][1]) lc2_op(ctx, L, texts[i][1], null, 'var uf=' + (port ? '1' : 'ioc(cl((time-0.05)/0.45))') + ',fo=' + (port ? '0' : 'ioc(cl(PO/0.7))') + ',kk=uf*(1-fo);');
            else { lc2_main(ctx, L, 0); lc2_alphaAnim(L, HD, 'oc(cl(time/0.2))*(1-cl((PO-0.55)/0.45))>0.01?1:0'); }   // the browser skips the lyric while the sheet is invisible
        }
        return bb;
    }
});

/* ================================================================== 20 calendar — カレンダー */
jzReg('layout', 'calendar', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), variant: rng.pick(['month', 'himekuri']), month: rng.int(0, 11), off: rng.int(0, 6), day: rng.int(3, 27), days: rng.pick([30, 31]) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), k = lc2_k(ctx), ls = jzSmallSize(ctx), port = jzPortrait(ctx), HD = lc2_H(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), variant = jzP(ctx, 'variant', 'month'), month = jzP(ctx, 'month', 3), off = jzP(ctx, 'off', 2), pday = jzP(ctx, 'day', 10), days = jzP(ctx, 'days', 30);
        var C = lc2_card(sc), t0 = jzTrim(c.text), day = ((pday + (c.line || 0)) % days) + 1, wd = (off + day - 1) % 7;
        var red = lc2_plate(sc, [sc.accent, sc.accent2], C.fill, 2.2), blue = lc2_plate(sc, [sc.accent2, sc.accent], C.fill, 2.2);
        function dayCol(w) { return w === 0 ? red : w === 6 ? blue : C.text; }
        var mon = LC2_MON_E[month % 12];
        if (variant === 'himekuri') {
            // tear-off day pad: the lyric takes the place of the big date
            var pw = port ? W * 0.84 : Math.min(W * 0.6, H * 0.86 * 0.95), ph = port ? Math.min(H * 0.7, pw * 1.3) : H * 0.84;
            var x0 = W / 2 - pw / 2, y0 = H / 2 - ph / 2 + ph * 0.03, bindH = ph * 0.08, A = 'oc(cl(time/0.3))';
            var bc = [jzDarkest(sc), sc.ink, sc.accent, sc.sub], bindC = sc.sub;
            for (i = 0; i < bc.length; i++) if (bc[i] && jzContrast(bc[i], sc.bg) >= 1.5 && jzContrast(bc[i], C.fill) >= 1.8) { bindC = bc[i]; break; }
            var S = lc2_S(ctx, 'day pad', 0, 0), g = lc2_G(S, 'pad');
            for (i = 3; i >= 1; i--) lc2_box(g, 'page ' + i, x0 + i * 2 * k, y0 + bindH, pw, ph - bindH + i * u * 0.006, jzMixHex(C.fill, C.text, 0.08 * i));
            lc2_shadow(g, sc, x0, y0, pw, ph, 0, u * 0.012);
            lc2_box(g, 'next page', x0, y0 + bindH, pw, ph - bindH, C.fill);
            jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + 'value*' + A);
            lc2_paint(S);
            var nx = lc2_T(ctx, String(day % days + 1), { font: font, size: ph * 0.3, x: W / 2, y: y0 + ph * 0.55, color: dayCol((wd + 1) % 7) });
            lc2_op(ctx, nx, A, 0.18);
            // this page: tears away from its hinge on exit
            var hx = x0 + pw * (pday % 2 ? 0.1 : 0.9), hy = y0 + bindH, sg = pday % 2 ? 1 : -1;
            var TE = HD + 'var tr=ic(PO),pa=' + A + '*(1-cl((PO-0.7)/0.3)),fa=oc(cl((time-0.1)/0.4))*pa;';
            var R = lc2_S(ctx, 'this page', hx, hy), gp = lc2_G(R, 'page'), lx0 = x0 - hx, ly0 = y0 - hy, m = pw * 0.07;
            lc2_box(gp, 'page', lx0, 0, pw, ph - bindH, C.fill, C.edge ? { stroke: C.line, sw: 1.2 * k } : null);
            var gq = lc2_sub(gp, 'print');
            lc2_box(gq, 'rokuyo box', lx0 + pw - m - ls * 3.2, ph * 0.06, ls * 3.2, ls * 1.6, null, { r: ls * 0.2, stroke: red, sw: Math.max(1.5 * k, ls * 0.08) });
            lc2_line(gq, 'rule', [[lx0 + m, ly0 + ph * 0.8], [lx0 + pw - m, ly0 + ph * 0.8]], C.text, Math.max(1 * k, u * 0.0015), { op: 50 });
            lc2_gx(gq, 'op', TE + '100*oc(cl((time-0.1)/0.4))');
            jzSetExpr(jzXf(R, 'ADBE Rotate Z'), TE + 'value+' + sg + '*tr*28');
            jzSetExpr(jzXf(R, 'ADBE Position'), TE + '[value[0],value[1]+tr*tr*' + jzN(ph * 0.6) + ']');
            jzSetExpr(jzXf(R, 'ADBE Opacity'), TE + 'value*pa');
            lc2_paint(R);
            var dcol0 = dayCol(wd), dcol = jzContrast(dcol0, C.fill) >= 3 ? dcol0 : C.text, kids = [];
            kids.push(lc2_T(ctx, String(month + 1), { font: font, size: ph * 0.1, align: 'left', x: x0 + m, y: y0 + bindH + ph * 0.09, color: C.text }));
            kids.push(lc2_T(ctx, mon, { font: jzMonoF(ctx), size: ls * 0.9, track: 0.3, align: 'left', x: x0 + m + ph * 0.1 * 0.9 * (month >= 9 ? 1.25 : 1), y: y0 + bindH + ph * 0.1, color: C.text, op: 0.8 }));
            kids.push(lc2_T(ctx, LC2_ROKUYO[(day + month) % 6], { font: jzSerifF(ctx), size: ls * 1.05, x: x0 + pw - m - ls * 1.6, y: y0 + bindH + ph * 0.06 + ls * 0.8, color: red }));
            kids.push(lc2_T(ctx, LC2_WD_J.charAt(wd) + '曜日', { font: jzSerifF(ctx), size: ls * 1.5, align: 'left', x: x0 + m, y: y0 + ph * 0.88, color: dcol }));
            kids.push(lc2_T(ctx, day + '  ' + LC2_WD_E[wd], { font: jzMonoF(ctx), size: ls * 1.1, track: 0.2, align: 'right', x: x0 + pw - m, y: y0 + ph * 0.88, color: dcol }));
            for (i = 0; i < kids.length; i++) { lc2_kid(kids[i], R); jzSetExpr(jzXf(kids[i], 'ADBE Opacity'), TE + 'value*fa'); }
            var fb = lc2_fitBlock(t0, pw - m * 2, ph * 0.46, { lead: 1.08, track: 0.02 }, 3), size = Math.min(fb.size, u * 0.24);
            var T = lc2_T(ctx, fb.text, { font: font, size: size, x: W / 2, y: y0 + bindH + ph * 0.47, lead: 1.08, track: 0.02, color: dcol, name: t0 });
            lc2_kid(T, R); lc2_main(ctx, T, 0);
            // binding with rings (on top)
            var B = lc2_S(ctx, 'binding', 0, 0), gb = lc2_G(B, 'binding');
            lc2_box(gb, 'bar', x0 - pw * 0.02, y0, pw * 1.04, bindH, bindC);
            lc2_circ(gb, 'ring', x0 + pw * 0.3, y0 + bindH * 0.5, bindH * 0.22, sc.bg);
            lc2_circ(gb, 'ring', x0 + pw * 0.7, y0 + bindH * 0.5, bindH * 0.22, sc.bg);
            jzSetExpr(jzXf(B, 'ADBE Opacity'), HD + 'value*' + A);
            lc2_paint(B);
            var mb = lc2_meas(fb.text, size, { lead: 1.08, track: 0.02 }), cy = y0 + bindH + ph * 0.47;
            return lc2_box4(W / 2 - mb.w / 2, cy - mb.h / 2, W / 2 + mb.w / 2, cy + mb.h / 2);
        }
        // month grid; today's cell zooms into the lyric panel
        var cols = 7, rows = 5, gw = port ? W * 0.9 : Math.min(W * 0.84, H * 1.5), cell = gw / cols, gh = cell * rows * (port ? 1 : 0.72), rh = gh / rows, hdrH = ls * 2.2;
        var gx = W / 2 - gw / 2, gy = H / 2 - (gh + hdrH + ls * 3) / 2 + ls * 3 + hdrH, GA = 'oc(cl(time/0.3))*K', ZM = 'var z=ioc(cl((time-0.12)/0.35)),dim=1-z*0.55;';
        var h1 = lc2_T(ctx, String(month + 1), { font: font, size: ls * 2.6, align: 'left', x: gx, y: gy - hdrH - ls * 1.7, color: sc.fg });
        var h2 = lc2_T(ctx, mon, { font: jzMonoF(ctx), size: ls, track: 0.4, align: 'left', x: gx + ls * 2.6 * (month >= 9 ? 1.25 : 1), y: gy - hdrH - ls * 1.3, color: sc.sub });
        lc2_op(ctx, h1, GA); lc2_op(ctx, h2, GA);
        var wdi = [], a2c = jzContrast(sc.accent2, sc.bg) > 1.6 ? sc.accent2 : sc.sub;
        for (i = 0; i < 7; i++) wdi.push({ t: LC2_WD_E[i], x: gx + (i + 0.5) * cell, y: gy - hdrH * 0.45, c: i === 0 ? sc.accent : i === 6 ? a2c : sc.sub });
        var WM = lc2_multi(ctx, wdi, { font: jzMonoF(ctx), size: ls * 0.8, track: 0.2, color: sc.sub, name: 'weekdays' });
        lc2_op(ctx, WM.L, GA);
        var GL = lc2_S(ctx, 'grid', 0, 0), gg = lc2_G(GL, 'rows');
        for (i = 0; i <= rows; i++) {
            var gl1 = lc2_line(gg, 'row ' + i, [[gx, gy + i * rh], [gx + gw, gy + i * rh]], sc.sub, 1 * k);
            jzAddTrimPaths(gl1, HD + '100*ioc(cl((time-' + jzN(i * 0.03) + ')/0.4))*K');
        }
        jzSetExpr(jzXf(GL, 'ADBE Opacity'), HD + ZM + '45*dim');
        lc2_paint(GL);
        var its = [], D = [], tcx = gx, tcy = gy, d2;
        for (d2 = 1; d2 <= days; d2++) {
            var idx = off + d2 - 1, cc = idx % 7, rr = Math.floor(idx / 7) % rows, x = gx + cc * cell, y = gy + rr * rh;
            if (d2 === day) { tcx = x; tcy = y; continue; }
            its.push({ t: String(d2), x: x + cell * 0.08, y: y + rh * 0.22, c: cc === 0 ? sc.accent : sc.fg }); D.push(0.02 + idx * 0.006);
        }
        var DM = lc2_multi(ctx, its, { font: jzMonoF(ctx), size: Math.min(rh * 0.28, cell * 0.24), align: 'left', color: sc.fg, name: 'dates' });
        lc2_lineAlpha(DM, HD + ZM + 'var D=' + jzArrExpr(D) + ';', 'a=cl((time-D[l])/0.15)*K*dim*0.8');
        // today's panel (a rig scaled from the cell up to the panel; the lyric rides on it)
        var PW = port ? W * 0.84 : Math.min(W * 0.7, gw * 0.9), PH = port ? H * 0.34 : H * 0.5, X1 = W / 2 - PW / 2, Y1 = gy + gh / 2 - PH / 2;
        var plate = lc2_plate(sc, [sc.accent, sc.ink]), tc = lc2_onCol(sc, plate);
        var PZ = HD + ZM + 'var bx=lp(' + jzN(tcx) + ',' + jzN(X1) + ',z),by=lp(' + jzN(tcy) + ',' + jzN(Y1) + ',z),bw=lp(' + jzN(cell) + ',' + jzN(PW) + ',z),bh=lp(' + jzN(rh) + ',' + jzN(PH) + ',z),pa=cl(time/0.12)*K;';
        var PR = lc2_S(ctx, 'today', X1, Y1), gpn = lc2_G(PR, 'panel');
        var gsd = lc2_shadow(gpn, sc, 0, 0, PW, PH, 0, u * 0.015); lc2_gx(gsd, 'op', PZ + lc2_shOp(sc) + '*z');
        lc2_box(gpn, 'plate', 0, 0, PW, PH, plate);
        jzSetExpr(jzXf(PR, 'ADBE Position'), PZ + '[bx,by]');
        jzSetExpr(jzXf(PR, 'ADBE Scale'), PZ + '[100*bw/' + jzN(PW) + ',100*bh/' + jzN(PH) + ']');
        jzSetExpr(jzXf(PR, 'ADBE Opacity'), PZ + 'value*pa');
        lc2_paint(PR);
        var s0 = PH * 0.12, DN = lc2_T(ctx, String(day), { font: jzMonoF(ctx), size: s0, align: 'left', x: X1, y: Y1, color: tc });
        jzSetExpr(jzXf(DN, 'ADBE Position'), PZ + '[bx+bw*0.04,by+bh*0.13]');
        jzSetExpr(jzXf(DN, 'ADBE Scale'), PZ + 'var s=Math.max(' + jzN(rh * 0.28) + ',' + jzN(s0) + '*bw/' + jzN(PW) + ')/' + jzN(s0) + ';[value[0]*s,value[1]*s]');
        jzSetExpr(jzXf(DN, 'ADBE Opacity'), PZ + 'value*pa');
        var s1 = Math.max(6 * k, PH * 0.06), WDN = lc2_T(ctx, LC2_WD_E[wd], { font: jzMonoF(ctx), size: s1, track: 0.3, align: 'right', x: X1, y: Y1, color: tc });
        jzSetExpr(jzXf(WDN, 'ADBE Position'), PZ + '[bx+bw*0.96,by+bh*0.12]');
        jzSetExpr(jzXf(WDN, 'ADBE Scale'), PZ + 'var s=Math.max(' + jzN(6 * k) + ',' + jzN(s1) + '*bw/' + jzN(PW) + ')/' + jzN(s1) + ';[value[0]*s,value[1]*s]');
        jzSetExpr(jzXf(WDN, 'ADBE Opacity'), PZ + 'value*pa*z');
        var fb2 = lc2_fitBlock(t0, PW * 0.88, PH * 0.62, { lead: 1.08, track: 0.02 }, 3);
        var T2 = lc2_T(ctx, fb2.text, { font: font, size: Math.min(fb2.size, u * 0.2), x: X1 + PW / 2, y: Y1 + PH * 0.57, lead: 1.08, track: 0.02, color: tc, name: t0 });
        lc2_kid(T2, PR); lc2_main(ctx, T2, 0.2);
        return lc2_box4(X1, Y1, X1 + PW, Y1 + PH);
    }
});

/* ================================================================== 21 chochin — 提灯 */
// a paper lantern drawn around its top-centre (0, 0): body polygon, bamboo ribs, top / bottom caps; returns { y0, bh }
function lc2_lantern(g, sc, lw, lh, bodyC, k) {
    var capH = lh * 0.07, capC = lc2_plate(sc, [jzDarkest(sc), sc.ink], bodyC, 1.6), y0 = capH, y1 = lh - capH, bh = y1 - y0, pts = [], M = 24, i;
    function hw(t) { return lw / 2 * (0.62 + 0.38 * Math.sin(Math.PI * t)); }
    for (i = 0; i <= M; i++) pts.push([hw(i / M), y0 + bh * i / M]);
    for (i = M; i >= 0; i--) pts.push([-hw(i / M), y0 + bh * i / M]);
    lc2_poly(g, 'body', pts, bodyC);
    var ribs = [], R = 13;
    for (i = 1; i < R; i++) { var t = i / R, y = y0 + bh * t, w2 = hw(t); ribs.push([[-w2, y], [-w2 * 0.5, y + bh * 0.026], [0, y + bh * 0.035], [w2 * 0.5, y + bh * 0.026], [w2, y]]); }
    lc2_lines2(g, 'ribs', ribs, lc2_onCol(sc, bodyC), Math.max(1 * k, lw * 0.006), { op: 22 });
    lc2_box(g, 'cap top', -lw * 0.33, 0, lw * 0.66, capH * 1.05, capC, { r: capH * 0.2 });
    lc2_box(g, 'cap bottom', -lw * 0.33, y1 - capH * 0.05, lw * 0.66, capH * 1.05, capC, { r: capH * 0.2 });
    return { y0: y0, bh: bh };
}
jzReg('layout', 'chochin', {
    plan: function (rng, cut, st) {
        var n = cut.n, lat = jzHasLatin(cut.text), variant = n <= 6 && !lat ? rng.pick(['single', 'single', 'row']) : 'row', m = Math.min(6, Math.ceil(n / 2));
        var units = variant === 'row' ? (lat ? lc2_splitK(cut.text, 6) : n <= 6 ? lc2_charUnits(cut.text) : lc2_splitK(cut.text, m, m)) : [lat ? jzFlat(cut.text) : jzStrip(cut.text)];
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), variant: variant, units: units, body: rng.pick(['accent', 'accent', 'paper']), ph: rng.range(0, 6) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), k = lc2_k(ctx), port = jzPortrait(ctx), HD = lc2_H(ctx), i, j;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), variant = jzP(ctx, 'variant', 'row'), ph = jzP(ctx, 'ph', 0), C = lc2_card(sc);
        var paperB = jzP(ctx, 'body', 'accent') === 'paper' && jzContrast(C.fill, sc.bg) >= 1.5;
        var bodyC = paperB ? C.fill : lc2_plate(sc, [sc.accent, sc.ink], sc.bg, 1.3), tc = paperB ? lc2_plate(sc, [sc.accent, jzDarkest(sc)], C.fill, 2.2) : lc2_onCol(sc, bodyC);
        var u0 = jzP(ctx, 'units', null), units = [];
        if (u0 && u0.length) { for (i = 0; i < u0.length; i++) if (u0[i]) units.push(String(u0[i])); }
        if (!units.length) units = [jzStrip(c.text)];
        var FL = 'var fl=0.8+0.2*(0.5+0.5*Math.sin(time*5.3+SD)*Math.cos(time*2.1+SD*0.7));';
        var AL = 'var ein=oc(cl(time/0.5)),a=cl(ein*2)*(1-cl((PO-0.4)/0.6));';
        function glowLayer(name) { var GLw = lc2_S(ctx, name, 0, 0); jzXf(GLw, 'ADBE Opacity').setValue(100); return GLw; }
        function blur(L, r) { var e = jzEffect(L, 'ADBE Gaussian Blur 2', 'JZ Lantern Glow'); jzEP(e, 1, r); jzEP(e, 3, 1); }
        if (variant === 'single' && !jzHasLatin(units[0])) {
            var t = units[0], n = jzCount(t), lw = port ? W * 0.56 : Math.min(W * 0.34, H * 0.56), lh = Math.min(lw * 1.45, H * 0.8);
            var top = H / 2 - lh / 2 + H * 0.03, TOPX = HD + AL + 'var dy=-(1-ein)*' + jzN(H * 0.3) + ';';
            var ST = lc2_S(ctx, 'cord', 0, 0);
            var sp = lc2_sub(lc2_G(ST, 'cord'), 'line'), rp = jzAddRect(sp, 10, 10, 0); jzAddFill(sp, sc.sub);
            jzSetExpr(rp.property('ADBE Vector Rect Size'), TOPX + '[' + jzN(Math.max(2 * k, u * 0.003)) + ',Math.max(1,' + jzN(top + 5 * k) + '+dy)]');
            jzSetExpr(rp.property('ADBE Vector Rect Position'), TOPX + '[' + jzN(W / 2) + ',(' + jzN(top - 5 * k) + '+dy)/2]');
            jzSetExpr(jzXf(ST, 'ADBE Opacity'), TOPX + 'value*a');
            var G = glowLayer('lantern glow'); lc2_circ(lc2_G(G, 'glow'), 'glow', W / 2, top + lh / 2, lw * 1.05, bodyC, { op: jzLum(sc.bg) > 0.5 ? 12 : 22 }); blur(G, lw * 0.55);
            jzSetExpr(jzXf(G, 'ADBE Position'), TOPX + '[value[0],value[1]+dy]');
            jzSetExpr(jzXf(G, 'ADBE Opacity'), TOPX + FL + 'value*a*fl');
            var R = lc2_S(ctx, 'lantern', W / 2, top), LL = lc2_lantern(lc2_G(R, 'lantern'), sc, lw, lh, bodyC, k);
            jzSetExpr(jzXf(R, 'ADBE Position'), TOPX + '[value[0],value[1]+dy]');
            jzSetExpr(jzXf(R, 'ADBE Rotate Z'), TOPX + 'value+Math.sin(time*1.3+' + jzN(ph) + ')*2.2+(1-ein)*6');
            jzSetExpr(jzXf(R, 'ADBE Opacity'), TOPX + 'value*a');
            lc2_paint(R);
            var cols = n > 5 ? 2 : 1, vt = cols > 1 ? lc2_brk(t, Math.ceil(n / 2)) : t, vl = lc2_lines(vt), per = 1;
            for (i = 0; i < vl.length; i++) per = Math.max(per, jzCount(vl[i]));
            var size = Math.min(LL.bh * 0.8 / per, lw * (cols > 1 ? 0.3 : 0.46));
            var VV = lc2_V(ctx, vt, { font: font, size: size, color: tc, x: W / 2, y: top + LL.y0 + LL.bh / 2 - per * size * 0.5, lead: 1.15, name: t });
            lc2_kid(VV.L, R); lc2_main(ctx, VV.L, 0.2);
            return lc2_box4(W / 2 - lw / 2, top, W / 2 + lw / 2, top + lh);
        }
        // a string of festival lanterns
        var kq = units.length, rowsN = port && kq > 3 ? 2 : 1, perR = Math.ceil(kq / rowsN), spx = W * 0.88 / perR;
        var lw2 = Math.min(spx * 0.78, H * (rowsN > 1 ? 0.2 : 0.3)), lh2 = lw2 * 1.4, bb = null, r;
        var WR = lc2_S(ctx, 'wires', 0, 0), gw = lc2_G(WR, 'wires');
        var GLo = glowLayer('lantern glow'), gG = lc2_G(GLo, 'glows'), rigs = [];
        for (r = 0; r < rowsN; r++) {
            var cnt = Math.min(perR, kq - r * perR), wireY = rowsN > 1 ? H * (r ? 0.55 : 0.14) : H * 0.22, x0 = W / 2 - (cnt - 1) / 2 * spx, sag = H * 0.05;
            var wy = function (x) { return wireY + sag * (1 - Math.pow((x - W / 2) / (W * 0.5), 2)); };
            var wp = []; for (i = 0; i <= 30; i++) { var xw = jzLerp(-10 * k, W + 10 * k, i / 30); wp.push([xw, wy(xw)]); }
            var wl = lc2_line(gw, 'wire ' + r, wp, sc.sub, Math.max(1.5 * k, u * 0.0025), { op: 80 });
            jzAddTrimPaths(wl, HD + '100*ioc(cl(time/0.5))*K');
            for (j = 0; j < cnt; j++) {
                var ii = r * perR + j, tt = units[ii], x = x0 + j * spx, ty = wy(x) + lw2 * 0.1, t1 = 0.08 + ii * 0.07;
                var EQ = HD + AL + 'var e=ob(cl((time-' + jzN(t1) + ')/0.35),1.4);';
                var R2 = lc2_S(ctx, 'lantern ' + (ii + 1), x, ty), g2 = lc2_G(R2, 'lantern');
                lc2_line(g2, 'hook', [[0, -lw2 * 0.1], [0, 0]], sc.sub, Math.max(1.5 * k, u * 0.002));
                var L2 = lc2_lantern(g2, sc, lw2, lh2, bodyC, k);
                jzSetExpr(jzXf(R2, 'ADBE Rotate Z'), EQ + 'value+Math.sin(time*1.6+' + jzN(ii * 1.1 + ph) + ')*3+(1-e)*10*' + (ii % 2 ? 1 : -1));
                jzSetExpr(jzXf(R2, 'ADBE Scale'), EQ + 'var s=Math.max(0,e);[value[0]*s,value[1]*s]');
                jzSetExpr(jzXf(R2, 'ADBE Opacity'), EQ + 'value*a*(time<' + jzN(t1) + '?0:1)');
                lc2_paint(R2);
                var gl = lc2_circ(gG, 'glow ' + ii, x, ty + lh2 / 2, lw2 * 1.0, bodyC, { op: jzLum(sc.bg) > 0.5 ? 12 : 22 });
                lc2_gx(gl, 'sc', EQ + 'var s=100*Math.max(0,e);[s,s]'); lc2_gx(gl, 'anc', '[' + jzN(x) + ',' + jzN(ty + lh2 / 2) + ']'); lc2_gset(gl, 'pos', [x, ty + lh2 / 2]);
                var lat = jzHasLatin(tt), n2 = jzCount(tt), TL;
                if (lat) {
                    var sz = Math.min(lc2_fitSize(tt, lw2 * 0.8, L2.bh * 0.5, {}), lw2 * 0.4);
                    TL = lc2_T(ctx, tt, { font: font, size: sz, x: x, y: ty + L2.y0 + L2.bh / 2, color: tc });
                } else {
                    var sz2 = Math.min(L2.bh * 0.78 / Math.max(1, n2), lw2 * 0.5);
                    TL = lc2_V(ctx, jzStrip(tt), { font: font, size: sz2, color: tc, x: x, y: ty + L2.y0 + L2.bh / 2 - n2 * sz2 * 0.5, lead: 1.3 }).L;
                }
                lc2_kid(TL, R2); lc2_main(ctx, TL, t1 + 0.12);
                bb = jzUnion(bb, lc2_box4(x - lw2 / 2, ty, x + lw2 / 2, ty + lh2));
            }
        }
        lc2_paint(WR);
        jzSetExpr(jzXf(GLo, 'ADBE Opacity'), HD + AL + FL + 'value*a*fl');
        blur(GLo, lw2 * 0.5);
        lc2_paint(GLo);
        GLo.moveAfter(WR);
        return bb;
    }
});

/* ================================================================== 22 routeMap — 路線図 */
jzReg('layout', 'routeMap', {
    plan: function (rng, cut, st) {
        var n = cut.n, kk = n <= 6 ? 2 : n <= 10 ? 3 : 4;
        return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), chunks: n <= 3 ? lc2_charUnits(cut.text) : lc2_splitK(cut.text, kk),
            shape: rng.pick(['straight', 'bend', 'straight']), letter: rng.pick(['Z', 'J', 'M', 'K', 'S']), num0: rng.int(1, 14) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), kx = lc2_k(ctx), ls = jzSmallSize(ctx), port = jzPortrait(ctx), HD = lc2_H(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), letter = jzP(ctx, 'letter', 'Z'), num0 = jzP(ctx, 'num0', 1), c0 = jzP(ctx, 'chunks', null), chunks = [];
        if (c0 && c0.length) { for (i = 0; i < c0.length; i++) if (c0[i]) chunks.push(jzTrim(String(c0[i]))); }
        if (!chunks.length) chunks = [jzTrim(c.text)];
        var k = chunks.length, lineC = lc2_plate(sc, [sc.accent, sc.accent2, sc.fg]), lw = Math.max(8 * kx, u * 0.024);
        var bend = !port && jzP(ctx, 'shape', 'straight') === 'bend' && k >= 2, pts;
        if (port) pts = [[W * 0.22, H * 0.07], [W * 0.22, H * 0.93]];
        else if (bend) pts = [[W * 0.04, H * 0.36], [W * 0.42, H * 0.36], [W * 0.58, H * 0.64], [W * 0.96, H * 0.64]];
        else pts = [[W * 0.04, H * 0.54], [W * 0.96, H * 0.54]];
        var segL = [], tot = 0, PX = [], PY = [];
        for (i = 1; i < pts.length; i++) { var dd = Math.sqrt(Math.pow(pts[i][0] - pts[i - 1][0], 2) + Math.pow(pts[i][1] - pts[i - 1][1], 2)); segL.push(dd); tot += dd; }
        for (i = 0; i < pts.length; i++) { PX.push(pts[i][0]); PY.push(pts[i][1]); }
        function spread(a0, a1, m, j) { return m > 1 ? jzLerp(a0, a1, j / (m - 1)) : (a0 + a1) / 2; }
        var st = [];
        if (port) for (i = 0; i < k; i++) { var yy = spread(H * 0.15, H * 0.85, k, i); st.push({ x: pts[0][0], y: yy, f: (yy - pts[0][1]) / tot, side: 1, maxW: W * 0.66 }); }
        else if (bend) {
            var cu = Math.ceil(k / 2), cl0 = k - cu;
            for (i = 0; i < k; i++) {
                var up = i < cu, j = up ? i : i - cu, mm = up ? cu : cl0, xx = up ? spread(W * 0.09, W * 0.38, mm, j) : spread(W * 0.63, W * 0.92, mm, j);
                st.push({ x: xx, y: up ? pts[0][1] : pts[2][1], f: up ? (xx - pts[0][0]) / tot : (segL[0] + segL[1] + xx - pts[2][0]) / tot, side: up ? -1 : 1, maxW: mm > 1 ? W * 0.29 * 0.84 : W * 0.34 });
            }
        } else {
            var alt = k >= 3, gap = W * 0.76 / Math.max(1, k - 1);
            for (i = 0; i < k; i++) { var x2 = spread(W * 0.12, W * 0.88, k, i); st.push({ x: x2, y: pts[0][1], f: (x2 - pts[0][0]) / tot, side: alt && i % 2 ? 1 : -1, maxW: Math.min(W * 0.42, (alt ? gap * 2 : gap) * 0.88) }); }
        }
        var maxH = port ? Math.min(H * 0.7 / k * 0.45, H * 0.1) : H * 0.13, size = u * (port ? 0.15 : 0.13);
        for (i = 0; i < k; i++) size = Math.min(size, lc2_fitSize(chunks[i], st[i].maxW, maxH, { track: 0.02 }));
        var F = []; for (i = 0; i < k; i++) F.push(st[i].f);
        var LE = HD + 'var le=ioc(cl(time/0.6))*(1-ic(PO)),prog=cl((time-0.3)/' + jzN(Math.max(0.4, c.dur * 0.7)) + '),NK=' + k + ',cur=Math.min(NK-1,Math.floor(prog*NK)),F=' + jzArrExpr(F) + ';';
        // the line + the train running on it
        var S = lc2_S(ctx, 'route line', 0, 0), g = lc2_G(S, 'route');
        var ln = lc2_line(g, 'line', pts, lineC, lw, { cap: 2 });
        jzAddTrimPaths(ln, LE + '100*le');
        var tw = lw * (port ? 1.3 : 2.6), th = lw * (port ? 2.6 : 1.3), gt = lc2_box(g, 'train', -tw / 2, -th / 2, tw, th, sc.fg, { r: Math.min(tw, th) * 0.45, stroke: sc.bg, sw: Math.max(2 * kx, lw * 0.18) });
        lc2_gx(gt, 'pos', LE + 'var f1=F[cur],f0=cur>0?F[cur-1]:Math.max(0,f1-0.08),f=lp(f0,f1,ioc(cl(prog*NK-cur))),PX=' + jzArrExpr(PX) + ',PY=' + jzArrExpr(PY) + ',SL=' + jzArrExpr(segL) +
            ';var d=f*' + jzN(tot) + ',x=PX[PX.length-1],y=PY[PY.length-1];for(var i=0;i<SL.length;i++){if(d<=SL[i]||i==SL.length-1){var q=cl(d/SL[i]);x=lp(PX[i],PX[i+1],q);y=lp(PY[i],PY[i+1],q);break;}d-=SL[i];}[x,y]');
        lc2_gx(gt, 'op', LE + 'le>0.9?100*K:0');
        lc2_paint(S);
        // stations, code badges, line badge
        var S2 = lc2_S(ctx, 'stations', 0, 0), g2 = lc2_G(S2, 'stations'), bs = ls * 0.9, codes = [], roms = [], bb = null;
        for (i = 0; i < k; i++) {
            var P = st[i], r = lw * 0.8, rC = lw * 1.05, TA = LE + 'var ta=cl((le*1.05-' + jzN(P.f) + ')*6);';
            var gs = lc2_sub(g2, 'station ' + (i + 1));
            var gc = lc2_circ(gs, 'stop', 0, 0, r, sc.bg, { stroke: sc.fg, sw: Math.max(3 * kx, lw * 0.32) });
            lc2_gx(gc, 'sc', TA + '[100*ta,100*ta]'); lc2_gx(gc, 'op', TA + '(cur==' + i + ')?0:100');
            var gk = port ? lc2_box(gs, 'here', -rC * 1.05, -rC * 1.5, rC * 2.1, rC * 3, sc.bg, { r: rC, stroke: sc.fg, sw: Math.max(3 * kx, lw * 0.35) })
                : lc2_box(gs, 'here', -rC * 1.5, -rC * 1.05, rC * 3, rC * 2.1, sc.bg, { r: rC, stroke: sc.fg, sw: Math.max(3 * kx, lw * 0.35) });
            lc2_gx(gk, 'op', TA + '(cur==' + i + '&&ta>0)?100:0');
            lc2_gset(gs, 'pos', [P.x, P.y]);
            var code = letter + jzPad(num0 + i, 2), rom = lc2_rom(chunks[i]), bx, by, T;
            if (port) {
                bx = -lw * 1.4 - bs * 2.8; by = -bs * 0.9;
                codes.push({ t: code, x: P.x - lw * 1.4 - bs * 1.4, y: P.y });
                var lx = P.x + lw * 1.8;
                T = lc2_T(ctx, chunks[i], { font: font, size: size, x: lx, y: P.y - (rom ? ls * 0.4 : 0), align: 'left', track: 0.02, color: sc.fg, name: chunks[i] });
                var mw = lc2_meas(chunks[i], size, { track: 0.02 });
                bb = jzUnion(bb, lc2_box4(lx, P.y - size / 2, lx + mw.w, P.y + size / 2));
                if (rom) roms.push({ t: rom, x: lx, y: P.y + size * 0.55, f: P.f });
            } else {
                var dS = P.side, w = lc2_meas(chunks[i], size, { track: 0.02 }).w, lx2 = jzClamp(P.x, W * 0.04 + w / 2, W * 0.96 - w / 2);
                bx = -bs * 1.4; by = dS * (lw * 1.25) + (dS < 0 ? -bs * 1.8 : 0);
                codes.push({ t: code, x: P.x, y: P.y + by + bs * 0.9 });
                var ny = P.y + dS * (lw * 1.25 + bs * 2.2 + size * 0.5 + (dS < 0 && rom ? ls * 1.2 : 0));
                T = lc2_T(ctx, chunks[i], { font: font, size: size, x: lx2, y: ny, track: 0.02, color: sc.fg, name: chunks[i] });
                bb = jzUnion(bb, lc2_box4(lx2 - w / 2, ny - size / 2, lx2 + w / 2, ny + size / 2));
                if (rom) roms.push({ t: rom, x: lx2, y: dS < 0 ? ny + size * 0.5 + ls * 0.7 : ny + size * 0.5 + ls * 0.9, f: P.f });
            }
            var gb = lc2_box(gs, 'code badge', bx, by, bs * 2.8, bs * 1.8, null, { r: bs * 0.3, stroke: lineC, sw: Math.max(2 * kx, bs * 0.12) });
            lc2_gx(gb, 'op', TA + '100*ta*K');
            lc2_main(ctx, T, 0.1 + i * 0.12);
        }
        var R = lw * 1.7, cx2 = port ? pts[0][0] : pts[0][0] + R * 0.2, cy2 = port ? pts[0][1] + R * 0.1 : pts[0][1] + (st[0].side < 0 ? 1 : -1) * R * 2;
        var BA = HD + 'var ba=ob(cl((time-0.05)/0.4),1.70158)*K;';
        var gl = lc2_circ(g2, 'line badge', 0, 0, R, sc.bg, { stroke: lineC, sw: Math.max(3 * kx, lw * 0.5) });
        lc2_gset(gl, 'pos', [cx2, cy2]); lc2_gx(gl, 'sc', BA + 'var s=100*Math.max(0,ba);[s,s]');
        lc2_paint(S2);
        S2.moveBefore(S);
        var CM = lc2_multi(ctx, codes, { font: jzMonoF(ctx), size: bs * 0.8, color: sc.fg, name: 'station codes' });
        lc2_lineAlpha(CM, LE + '', 'a=cl((le*1.05-F[l])*6)*K');
        if (roms.length) {
            var FR = []; for (i = 0; i < roms.length; i++) FR.push(roms[i].f);
            var RM = lc2_multi(ctx, roms, { font: jzMonoF(ctx), size: ls * (port ? 0.8 : 0.75), track: 0.15, align: port ? 'left' : null, color: sc.sub, name: 'readings' });
            lc2_lineAlpha(RM, LE + 'var FR=' + jzArrExpr(FR) + ';', 'a=cl((le*1.05-FR[l])*6)*K');
        }
        var BL = lc2_T(ctx, letter, { font: 'gothic_black', size: R * 1.1, x: cx2, y: cy2, color: sc.fg });
        jzSetExpr(jzXf(BL, 'ADBE Scale'), BA + 'var s=Math.max(0,ba);[value[0]*s,value[1]*s]');
        return bb;
    }
});

/* ================================================================== 23 stationSign — 駅名標 */
jzReg('layout', 'stationSign', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), letter: rng.pick(['JZ', 'LY', 'KT', 'SN']), num: rng.int(1, 36), band: rng.pick(['accent', 'accent2', 'ink']), posts: rng.chance(0.7) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), k = lc2_k(ctx), ls = jzSmallSize(ctx), port = jzPortrait(ctx), HD = lc2_H(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), letter = jzP(ctx, 'letter', 'JZ'), num = jzP(ctx, 'num', 1), band = jzP(ctx, 'band', 'accent'), posts = !!jzP(ctx, 'posts', true);
        var C = lc2_card(sc), t0 = jzTrim(c.text), bw = port ? W * 0.92 : Math.min(W * 0.86, H * 2.2), bh = port ? bw * 0.62 : bw * 0.36;
        var CX = W / 2, CY = H / 2, x0 = -bw / 2, y0 = -bh / 2 - (port ? H * 0.04 : H * 0.03);
        var E = HD + 'var e=oc(cl(time/0.45)),eo=ic(PO),a=cl(e*2)*(1-eo),be=ioc(cl((time-0.15)/0.5))*K,fa=oc(cl((time-0.25)/0.4))*K;';
        var boardC = jzContrast(C.fill, sc.bg) >= 1.4 ? C.fill : lc2_plate(sc, [sc.ink, sc.fg]), txC = lc2_onCol(sc, boardC);
        var bandC = lc2_plate(sc, band === 'accent2' ? [sc.accent2, sc.accent] : band === 'ink' ? [sc.ink, sc.accent] : [sc.accent, sc.accent2], boardC, 1.4);
        var R = lc2_S(ctx, 'station sign', CX, CY), g = lc2_G(R, 'sign');
        if (posts) { var pw = bw * 0.018; lc2_box(g, 'post', x0 + bw * 0.12 - pw / 2, y0 + bh, pw, H * 1.3, sc.sub); lc2_box(g, 'post', x0 + bw * 0.88 - pw / 2, y0 + bh, pw, H * 1.3, sc.sub); }
        lc2_shadow(g, sc, x0, y0, bw, bh, bh * 0.04, u * 0.012);
        lc2_box(g, 'board', x0, y0, bw, bh, boardC, { r: bh * 0.04 });
        var bandY = y0 + bh * (port ? 0.66 : 0.64), bandH = bh * (port ? 0.075 : 0.1), bxW = bw * 0.28;
        var gB = lc2_box(g, 'band', x0, bandY, bw, bandH, bandC);
        lc2_gset(gB, 'anc', [x0, bandY]); lc2_gset(gB, 'pos', [x0, bandY]); lc2_gx(gB, 'sc', E + '[100*be,100]');
        lc2_gx(lc2_box(g, 'name box', -bxW / 2, bandY - bandH * 0.25, bxW, bandH * 1.5, bandC), 'op', E + 'be>0.5?100:0');
        lc2_gx(lc2_poly(g, 'arrow', [[x0 + bw * 0.97, bandY - bandH * 0.4], [x0 + bw, bandY + bandH / 2], [x0 + bw * 0.97, bandY + bandH * 1.4]], bandC), 'op', E + '100*cl((be-0.5)*2)');
        var bs = bh * (port ? 0.16 : 0.2), ny = y0 + bh * 0.3, bx2 = x0 + bw * 0.06, by2 = ny - bs / 2;
        var gN = lc2_sub(g, 'number badge');
        lc2_box(gN, 'badge', bx2, by2, bs, bs * 1.1, boardC, { r: bs * 0.12, stroke: bandC, sw: Math.max(2 * k, bs * 0.08) });
        lc2_box(gN, 'badge top', bx2, by2, bs, bs * 0.34, bandC);
        lc2_gx(gN, 'op', E + '100*fa');
        jzSetExpr(jzXf(R, 'ADBE Position'), E + '[value[0],value[1]-(1-e)*' + jzN(H * 0.2) + '+eo*' + jzN(H * 0.05) + ']');
        jzSetExpr(jzXf(R, 'ADBE Opacity'), E + 'value*a');
        lc2_paint(R);
        // prev / next from the rest of the line
        var Lt = jzFlat(c.lineText || ''), Tt = jzFlat(t0), idx = Lt.indexOf(Tt);
        function cutS(s2, n2, fromEnd) { var arr = jzChars(jzTrim(s2)); return (fromEnd ? arr.slice(Math.max(0, arr.length - n2)) : arr.slice(0, n2)).join(''); }
        var prev = idx > 0 ? cutS(Lt.slice(0, idx), 6, true) : '', next = idx >= 0 && idx + Tt.length < Lt.length ? cutS(Lt.slice(idx + Tt.length), 6, false) : '';
        var rom = jzRomajiOf(ctx), sub2 = rom ? rom.charAt(0) + rom.slice(1).toLowerCase() : ('No.' + jzLineNo(ctx));
        var py = bandY + bandH + (bh - (bandY - y0) - bandH) * 0.5, kids = [];
        kids.push([lc2_T(ctx, sub2, { font: jzBodyF(ctx), size: ls * (port ? 1.1 : 1.2), track: 0.1, x: CX, y: CY + bandY - bandH * 0.25 - ls * 1.3, color: txC }), 1]);
        kids.push([lc2_T(ctx, letter, { font: jzMonoF(ctx), size: bs * 0.24, x: CX + bx2 + bs / 2, y: CY + by2 + bs * 0.17, color: lc2_onCol(sc, bandC) }), 1]);
        kids.push([lc2_T(ctx, jzPad(num, 2), { font: 'gothic_black', size: bs * 0.5, x: CX + bx2 + bs / 2, y: CY + by2 + bs * 0.72, color: txC }), 1]);
        kids.push([lc2_T(ctx, prev || ('← ' + letter + jzPad(Math.max(0, num - 1), 2)), { font: prev ? font : jzMonoF(ctx), size: ls * 1.25, align: 'left', x: CX + x0 + bw * 0.04, y: CY + py, color: txC }), prev ? 1 : 0.7]);
        kids.push([lc2_T(ctx, next || (letter + jzPad(num + 1, 2) + ' →'), { font: next ? font : jzMonoF(ctx), size: ls * 1.25, align: 'right', x: CX + x0 + bw * 0.96, y: CY + py, color: txC }), next ? 1 : 0.7]);
        for (i = 0; i < kids.length; i++) { lc2_kid(kids[i][0], R); jzSetExpr(jzXf(kids[i][0], 'ADBE Opacity'), E + 'value*fa*' + jzN(kids[i][1])); }
        var fb = lc2_fitBlock(t0, bw - (bw * 0.06 + bs * 1.4) * 2, bh * (port ? 0.42 : 0.4), { track: 0.12, lead: 1.05 }, port ? 2 : 1), size = Math.min(fb.size, bh * 0.36);
        var T = lc2_T(ctx, fb.text, { font: font, size: size, x: CX, y: CY + ny, track: 0.12, lead: 1.05, color: txC, name: t0 });
        lc2_kid(T, R); lc2_main(ctx, T, 0.15);
        return lc2_box4(CX + x0, CY + y0, CX + x0 + bw, CY + y0 + bh);
    }
});

/* ================================================================== 24 noren — 暖簾 */
jzReg('layout', 'noren', {
    plan: function (rng, cut, st) {
        var n = cut.n, m = Math.min(4, Math.ceil(n / 3));
        var units = n <= 4 ? lc2_charUnits(cut.text) : lc2_splitK(cut.text, m, m);
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), units: units, cloth: rng.pick(['ink', 'accent', 'ink']), mon: rng.chance(0.35), ph: rng.range(0, 6), wind: rng.pick([1, -1]) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), kx = lc2_k(ctx), port = jzPortrait(ctx), HD = lc2_H(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'serif')), mon = !!jzP(ctx, 'mon', false), ph = jzP(ctx, 'ph', 0), wind = jzP(ctx, 'wind', 1);
        var u0 = jzP(ctx, 'units', null), units = [];
        if (u0 && u0.length) { for (i = 0; i < u0.length; i++) if (u0[i]) units.push(lc2_vt(String(u0[i]))); }
        if (!units.length) units = [lc2_vt(c.text)];
        if (units.length === 1) units = ['', units[0], ''];
        var k = units.length, clothC = lc2_plate(sc, jzP(ctx, 'cloth', 'ink') === 'accent' ? [sc.accent, sc.ink] : [sc.ink, sc.accent]), tc = lc2_onCol(sc, clothC);
        var nw = port ? W * 0.88 : Math.min(W * 0.74, H * 1.3), nh = port ? H * 0.56 : H * 0.7, rodY = H * (port ? 0.18 : 0.12);
        var x0 = W / 2 - nw / 2, gap = nw * 0.012, pw = (nw - gap * (k - 1)) / k, lw = Math.max(4 * kx, u * 0.012), dark = jzDarkest(sc);
        var FO = HD + 'var fo=1-cl((PO-0.55)/0.45),part=ioc(PO);';
        var maxG = 1; for (i = 0; i < k; i++) maxG = Math.max(maxG, jzCount(units[i]));
        var hem = nh * 0.08, size = Math.min((nh - hem * 1.6) * 0.84 / Math.max(maxG, 1.6), pw * 0.66), bb = null;
        for (i = 0; i < k; i++) {
            var t1 = 0.04 + i * 0.06, px = x0 + i * (pw + gap), side = (i + 0.5) / k - 0.5, sg = side === 0 ? 1 : (side > 0 ? 1 : -1);
            var DR = FO + 'var drop=oc(cl((time-' + jzN(t1) + ')/0.45));';
            var R = lc2_S(ctx, 'noren ' + (i + 1), px + pw / 2, rodY), g = lc2_G(R, 'cloth');
            lc2_box(g, 'cloth', -pw / 2, -lw * 0.2, pw, nh, clothC);
            lc2_box(g, 'hem', -pw / 2, -lw * 0.2, pw, hem, jzMixHex(clothC, dark, 0.25));
            lc2_box(g, 'fold left', -pw / 2, hem, pw * 0.22, nh - hem - lw * 0.2, dark, { op: 13 });
            lc2_box(g, 'fold right', pw / 2 - pw * 0.18, hem, pw * 0.18, nh - hem - lw * 0.2, dark, { op: 9 });
            if (mon && k > 1 && i === Math.floor(k / 2) - (k % 2 ? 0 : 1)) {
                var mx0 = k % 2 ? 0 : pw / 2 + gap / 2, my0 = hem + pw * 0.2, mr = pw * 0.1, gm = lc2_sub(g, 'crest');
                lc2_circ(gm, 'disc', mx0, my0, mr, tc); lc2_circ(gm, 'ring', mx0, my0, mr * 0.62, clothC); lc2_circ(gm, 'core', mx0, my0, mr * 0.3, tc);
            }
            jzSetExpr(jzXf(R, 'ADBE Rotate Z'), DR + 'value+Math.sin(time*1.2+' + jzN(i * 0.8 + ph) + ')*1.1*' + wind + '+part*' + sg + '*26*' + jzN(0.4 + Math.abs(side) * 1.4));
            jzSetExpr(jzXf(R, 'ADBE Opacity'), DR + 'value*fo*(drop>0?1:0)');
            lc2_paint(R);
            // the cloth drops from the rod: a thin mask under the rod grown by the drop
            var EXP = DR + jzN(nh) + '*drop+' + jzN(lw - 2 * kx);
            lc2_clip(R, px - 2 * kx, rodY - lw, px + pw + 2 * kx, rodY - lw + 2 * kx, EXP);
            var t = units[i];
            if (t) {
                var g2 = jzCount(t), VV = lc2_V(ctx, t, { font: font, size: size, color: tc, x: px + pw / 2, y: rodY + hem + (nh - hem) * 0.5 - g2 * size * 0.52 + (mon ? pw * 0.12 : 0), track: 0.04, lead: 1.3, name: t });
                lc2_clip(VV.L, px - 2 * kx, rodY - lw, px + pw + 2 * kx, rodY - lw + 2 * kx, EXP);
                lc2_kid(VV.L, R); lc2_main(ctx, VV.L, t1 + 0.15);
                bb = jzUnion(bb, lc2_box4(px, rodY, px + pw, rodY + nh));
            }
        }
        // the rod on top
        var RD = lc2_S(ctx, 'rod', 0, 0), gr = lc2_box(lc2_G(RD, 'rod'), 'rod', x0 - nw * 0.06, rodY - lw / 2, nw * 1.12, lw, sc.sub, { r: lw / 2 });
        lc2_gset(gr, 'anc', [x0 - nw * 0.06, rodY]); lc2_gset(gr, 'pos', [x0 - nw * 0.06, rodY]); lc2_gx(gr, 'sc', HD + '[100*oc(cl(time/0.4)),100]');
        jzSetExpr(jzXf(RD, 'ADBE Opacity'), FO + 'value*fo');
        lc2_paint(RD);
        return bb;
    }
});

/* ================================================================== 25 tanzaku — 短冊 */
jzReg('layout', 'tanzaku', {
    plan: function (rng, cut, st) {
        var n = cut.n, k = n <= 6 ? 1 : n <= 11 ? 2 : 3;
        var font = rng.chance(0.4) ? 'brush' : rng.pick(jzFontsOf(st, ['serif', 'display']));
        var chunks = jzHasLatin(cut.text) ? lc2_splitK(cut.text, k) : lc2_splitK(jzStrip(cut.text), k, k), extra = rng.int(2, 3), cols = [];
        for (var i = 0; i < 6; i++) cols.push(rng.int(0, 4));
        return { font: font, chunks: chunks, extra: extra, cols: cols, ph: rng.range(0, 6), dir: rng.pick([1, -1]) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), kx = lc2_k(ctx), port = jzPortrait(ctx), HD = lc2_H(ctx), i;
        var font = jzP(ctx, 'font', jzSerifF(ctx)), extra = jzP(ctx, 'extra', 2), pc = jzP(ctx, 'cols', [0, 1, 2, 3, 4, 0]), ph = jzP(ctx, 'ph', 0), dir = jzP(ctx, 'dir', 1);
        var c0 = jzP(ctx, 'chunks', null), chunks = [];
        if (c0 && c0.length) { for (i = 0; i < c0.length; i++) if (c0[i]) chunks.push(lc2_vt(String(c0[i]))); }
        if (!chunks.length) chunks = [lc2_vt(c.text)];
        var k = chunks.length, C = lc2_card(sc), dark = jzDarkest(sc);
        var pal = [lc2_plate(sc, [sc.accent, sc.ink]), C.fill, lc2_plate(sc, [sc.accent2, sc.sub, sc.accent]), jzMixHex(sc.bg, sc.accent, 0.55), lc2_plate(sc, [sc.ink, sc.fg])];
        function by(x) { return H * 0.1 + (x / W) * H * 0.06 * dir + Math.sin(x / W * 3) * H * 0.012; }
        var BE = HD + 'var be=ioc(cl(time/0.5))*K;', stemC = jzMixHex(lc2_plate(sc, [sc.accent2, sc.sub]), sc.sub, 0.3);
        // bamboo branch, nodes, leaves
        var B = lc2_S(ctx, 'bamboo', 0, 0), gb = lc2_G(B, 'bamboo'), bp = [];
        for (i = 0; i <= 24; i++) { var xb = jzLerp(-20 * kx, W + 20 * kx, i / 24); bp.push([xb, by(xb)]); }
        jzAddTrimPaths(lc2_line(gb, 'stem', bp, stemC, Math.max(5 * kx, u * 0.01), { cap: 2 }), BE + '100*be');
        for (i = 1; i < 8; i++) {
            var nx = W * i / 8;
            lc2_gx(lc2_line(gb, 'node', [[nx, by(nx) - u * 0.009], [nx, by(nx) + u * 0.009]], jzMixHex(stemC, dark, 0.4), Math.max(3 * kx, u * 0.005)), 'op', BE + '(be>' + jzN(nx / W) + ')?100*K:0');
        }
        var Lf = u * 0.07, wd = u * 0.018;
        for (i = 0; i < 9; i++) {
            var lx = W * (0.05 + i * 0.115), gl = lc2_sub(gb, 'leaf');
            lc2_smooth(gl, 'leaf', [[0, 0], [Lf * 0.5, wd], [Lf, 0], [Lf * 0.5, -wd]], true); jzAddFill(gl, stemC);
            lc2_gset(gl, 'pos', [lx, by(lx)]);
            lc2_gx(gl, 'rot', HD + (i % 2 ? '35' : '-35') + '+Math.sin(time*1.4+' + i + ')*6');
            lc2_gx(gl, 'op', BE + '85*cl(be*9-' + i + ')*K');
        }
        lc2_paint(B);
        // strips: lyric strips in the middle, blank ones around
        var nS = k + (port ? 1 : extra), mid = Math.floor((nS - k) / 2), maxG = 1;
        for (i = 0; i < k; i++) maxG = Math.max(maxG, jzCount(chunks[i]));
        var sw = Math.min(W * (port ? 0.9 : 0.62) / (nS * 1.3), u * (port ? 0.2 : 0.16)), shMax = H * (port ? 0.7 : 0.72);
        var size = Math.min(sw * 0.64, (shMax - sw * 0.4) / (Math.max(maxG, 2.5) * 1.08 + 1.6)), bb = null;
        for (i = 0; i < nS; i++) {
            var isL = i >= mid && i < mid + k, t = isL ? chunks[i - mid] : '', x = W / 2 + (i - (nS - 1) / 2) * sw * 1.3 * (port ? 1 : 1.1), top = by(x) + u * 0.012;
            var sh = isL ? Math.max(sw * 2.6, jzCount(t) * size * 1.08 + size * 1.6) : sw * (2.4 + (i % 3) * 0.5), string = u * (0.03 + (i % 3) * 0.022);
            var t1 = 0.05 + Math.abs(i - (nS - 1) / 2) * 0.07, pci = pc[i % 6] || 0;
            var col = isL ? pal[pci % 3 === 1 ? 1 : pci % 3 === 2 ? 2 : 0] : pal[(pci + 3) % 5];
            var EQ = HD + 'var e=cl((time-' + jzN(t1) + ')/0.5),a=cl(e*3)*(1-cl((PO-0.4)/0.6));';
            var R = lc2_S(ctx, 'tanzaku ' + (i + 1), x, top), g = lc2_G(R, 'strip');
            lc2_line(g, 'string', [[0, 0], [0, string]], sc.sub, Math.max(1 * kx, u * 0.0016));
            lc2_shadow(g, sc, -sw / 2, string, sw, sh, 0, u * 0.008);
            lc2_box(g, 'paper', -sw / 2, string, sw, sh, col, jzContrast(col, sc.bg) < 1.3 ? { stroke: jzMixHex(sc.fg, col, 0.5), sw: 1.2 * kx } : null);
            lc2_circ(g, 'hole', 0, string + sw * 0.18, sw * 0.05, sc.bg);
            jzSetExpr(jzXf(R, 'ADBE Position'), EQ + '[value[0],value[1]-(1-ob(e,1.6))*' + jzN(H * 0.25) + ']');
            jzSetExpr(jzXf(R, 'ADBE Rotate Z'), EQ + 'value+Math.sin(time*1.3+' + jzN(i * 0.9 + ph) + ')*2.5+ic(PO)*' + (i % 2 ? 20 : -20));
            jzSetExpr(jzXf(R, 'ADBE Opacity'), EQ + 'value*a');
            lc2_paint(R);
            if (isL) {
                var VV = lc2_V(ctx, t, { font: font, size: size, color: lc2_onCol(sc, col), x: x, y: top + string + size * 0.9, track: 0.06, name: t });
                lc2_kid(VV.L, R); lc2_main(ctx, VV.L, t1 + 0.25);
                bb = jzUnion(bb, lc2_box4(x - sw / 2, top + string, x + sw / 2, top + string + sh));
            }
        }
        return bb;
    }
});

/* ================================================================== 26 omikuji — おみくじ */
// greeked copy: dashed rows / columns that read as small glyphs
function lc2_greek(g, name, x, y, w, h, lh, col, op, seed, vertical) {
    var gg = lh / 1.45, n = Math.min(160, Math.floor((vertical ? w : h) / lh)), span = vertical ? h : w, list = [], r;
    for (r = 0; r < n; r++) {
        var endP = jzR(seed, r, 3) < 0.12, ind = (r === 0 || jzR(seed, r - 1, 3) < 0.12) ? gg * 1.02 : 0;
        var len = (endP ? span * (0.2 + 0.55 * jzR(seed, r, 4)) : span) - ind;
        if (len <= gg) continue;
        if (vertical) { var xx = x + w - (r + 0.5) * lh; list.push([[xx, y + ind], [xx, y + ind + len]]); }
        else { var yy = y + (r + 0.5) * lh; list.push([[x + ind, yy], [x + ind + len, yy]]); }
    }
    if (!list.length) return null;
    var s = lc2_lines2(g, name, list, col, Math.max(1, gg * 0.72), { op: op });
    lc2_dash(s.property('ADBE Vectors Group').property(list.length + 1), gg * 0.78, gg * 0.24);
    return s;
}
// vertical labels at free positions (one glyph per line of ONE text layer): labels [{ t, x (column centre), y (top) }]
function lc2_vlabels(ctx, labels, o) {
    var it = [], i, j;
    for (i = 0; i < labels.length; i++) { var ch = jzChars(jzStrip(labels[i].t)); for (j = 0; j < ch.length; j++) it.push({ t: ch[j], x: labels[i].x, y: labels[i].y + (j + 0.5) * o.size * (1 + (o.track || 0)) }); }
    return lc2_multi(ctx, it, { font: o.font, size: o.size, color: o.color, name: o.name });
}
jzReg('layout', 'omikuji', {
    plan: function (rng, cut, st) {
        var font = rng.chance(0.4) ? 'brush' : rng.pick(jzFontsOf(st, ['serif'])), rank = rng.pick(LC2_KUJI), a = LC2_KUJI_CAT.slice(0), i;
        for (i = a.length - 1; i > 0; i--) { var j = Math.floor(rng.next() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
        return { font: font, rank: rank, cats: a.slice(0, 4) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), kx = lc2_k(ctx), ls = jzSmallSize(ctx), port = jzPortrait(ctx), HD = lc2_H(ctx), i;
        var font = jzP(ctx, 'font', jzSerifF(ctx)), rank = String(jzP(ctx, 'rank', '大吉')), cats = jzP(ctx, 'cats', ['願望', '待人', '失物', '旅行']);
        var C = lc2_card(sc), red = lc2_plate(sc, [sc.accent, sc.accent2, C.text], C.fill, 1.7), t0 = lc2_vt(c.text);
        var sw = port ? W * 0.84 : Math.min(W * 0.88, H * 1.7), sh = port ? Math.min(H * 0.82, sw * 1.7) : Math.min(H * 0.66, sw * 0.46), x0 = W / 2 - sw / 2, y0 = H / 2 - sh / 2;
        var OP = HD + 'var op=ioc(cl((time-0.03)/0.55))*(1-ioc(cl((PO-0.1)/0.8))),vis=Math.max(0.12,op),a=oc(cl(time/0.2))*(1-cl((PO-0.75)/0.25));';
        var VIS = port ? 'var vx0=' + jzN(x0) + ',vy0=' + jzN(y0) + ',vw=' + jzN(sw) + ',vh=' + jzN(sh) + '*vis;' : 'var vx0=' + jzN(x0 + sw) + '-' + jzN(sw) + '*vis,vy0=' + jzN(y0) + ',vw=' + jzN(sw) + '*vis,vh=' + jzN(sh) + ';';
        // slip (shadow + paper follow the unfolded part)
        var SH = lc2_S(ctx, 'omikuji paper', 0, 0), gs = lc2_G(SH, 'paper'), d = u * 0.012;
        var s1 = lc2_sub(gs, 'shadow'), r1 = jzAddRect(s1, 10, 10, 0); jzAddFill(s1, lc2_shCol(sc), lc2_shOp(sc));
        jzSetExpr(r1.property('ADBE Vector Rect Size'), OP + VIS + '[vw,vh]'); jzSetExpr(r1.property('ADBE Vector Rect Position'), OP + VIS + '[vx0+vw/2+' + jzN(d * 0.6) + ',vy0+vh/2+' + jzN(d) + ']');
        var s2 = lc2_sub(gs, 'slip'), r2 = jzAddRect(s2, 10, 10, 0); if (C.edge) lc2_stroke(s2, C.line, 1.2 * kx); jzAddFill(s2, C.fill);
        jzSetExpr(r2.property('ADBE Vector Rect Size'), OP + VIS + '[vw,vh]'); jzSetExpr(r2.property('ADBE Vector Rect Position'), OP + VIS + '[vx0+vw/2,vy0+vh/2]');
        jzSetExpr(jzXf(SH, 'ADBE Opacity'), OP + 'value*a');
        lc2_paint(SH);
        var S = lc2_S(ctx, 'omikuji print', 0, 0), g = lc2_G(S, 'print'), m = Math.min(sw, sh) * 0.05, lw = Math.max(1.5 * kx, u * 0.002);
        lc2_box(g, 'frame', x0 + m, y0 + m, sw - m * 2, sh - m * 2, null, { stroke: red, sw: lw * 1.8 });
        lc2_box(g, 'frame 2', x0 + m * 1.35, y0 + m * 1.35, sw - m * 2.7, sh - m * 2.7, null, { stroke: red, sw: lw * 0.7 });
        var ix0 = x0 + m * 2, iy0 = y0 + m * 2, iw = sw - m * 4, ih = sh - m * 4, no = '第' + lc2_kanjiNum((c.line || 0) + 1) + '番', texts = [], labs = [], lyr, bb, vo = { vertical: true, lead: 1.35, track: 0.06 };
        if (!port) {
            var colW = ih * 0.14, hx = ix0 + iw - colW * 0.6;
            texts.push(lc2_V(ctx, no, { font: jzSerifF(ctx), size: Math.min(colW * 0.6, ih * 0.8 / jzCount(no)), color: C.text, x: hx, y: iy0 + ih * 0.06 }).L);
            var rw = colW * 1.2, rx = hx - colW * 0.5 - rw - m * 0.4;
            lc2_box(g, 'rank plate', rx, iy0 + ih * 0.04, rw, ih * 0.92, red);
            texts.push(lc2_V(ctx, rank, { font: jzSerifF(ctx), size: Math.min(rw * 0.7, ih * 0.8 / jzCount(rank)), color: lc2_onCol(sc, red), x: rx + rw / 2, y: iy0 + ih / 2, mid: true, track: 0.2 }).L);
            var px1 = rx - m, catW = iw * 0.3, pw = px1 - (ix0 + catW) - m;
            var fb = lc2_fitBlock(t0, pw, ih * 0.9, vo, 3), size = Math.min(fb.size, ih * 0.3), mm = lc2_meas(fb.text, size, vo);
            var VV = lc2_V(ctx, fb.text, { font: font, size: size, color: C.text, x: px1 - pw / 2, y: iy0 + (ih - mm.h) / 2, lead: 1.35, track: 0.06, name: t0 });
            lyr = VV.L; bb = VV.bb;
            lc2_line(g, 'divider', [[ix0 + catW + m * 0.5, iy0], [ix0 + catW + m * 0.5, iy0 + ih]], red, lw);
            for (i = 0; i < 4; i++) {
                var cx = ix0 + catW - (i % 2 + 0.5) * catW / 2, cy = iy0 + Math.floor(i / 2) * ih / 2;
                labs.push({ t: cats[i] || '', x: cx + catW * 0.12, y: cy + ls * 0.8 });
                lc2_greek(g, 'greek ' + i, cx - catW * 0.24, cy + ls * 0.8, catW * 0.28, ih / 2 - ls * 2, ls * 0.9, C.text, 35, i + 7, true);
                if (i === 0) lc2_line(g, 'cat rule', [[ix0, cy + ih / 2], [ix0 + catW, cy + ih / 2]], red, lw * 0.6);
            }
            var cr = []; for (i = 1; i < 4; i++) cr.push([[x0 + sw * i / 4, y0], [x0 + sw * i / 4, y0 + sh]]);
            lc2_lines2(g, 'creases', cr, jzMixHex(C.fill, C.text, 0.12), 1 * kx, { op: 80 });
            var LB = lc2_vlabels(ctx, labs, { font: jzSerifF(ctx), size: ls * 1.05, color: red, name: 'fortunes' });
        } else {
            var hh = ih * 0.1, rw2 = iw * 0.4, rh = hh * 1.2;
            texts.push(lc2_T(ctx, no, { font: jzSerifF(ctx), size: hh * 0.5, track: 0.3, x: W / 2, y: iy0 + hh * 0.45, color: C.text }));
            lc2_box(g, 'rank plate', W / 2 - rw2 / 2, iy0 + hh, rw2, rh, red);
            texts.push(lc2_T(ctx, rank, { font: jzSerifF(ctx), size: rh * 0.62, track: 0.3, x: W / 2, y: iy0 + hh + rh / 2, color: lc2_onCol(sc, red) }));
            var catH = ih * 0.2, pt = iy0 + hh + rh + m, pb = iy0 + ih - catH - m;
            var fb2 = lc2_fitBlock(t0, iw * 0.84, pb - pt, vo, 3), size2 = Math.min(fb2.size, iw * 0.3), mm2 = lc2_meas(fb2.text, size2, vo);
            var V2 = lc2_V(ctx, fb2.text, { font: font, size: size2, color: C.text, x: W / 2, y: pt + (pb - pt - mm2.h) / 2, lead: 1.35, track: 0.06, name: t0 });
            lyr = V2.L; bb = V2.bb;
            lc2_line(g, 'divider', [[ix0, pb + m * 0.5], [ix0 + iw, pb + m * 0.5]], red, lw);
            for (i = 0; i < 4; i++) {
                var cw2 = iw / 4, cx2 = ix0 + iw - (i + 0.5) * cw2;
                labs.push({ t: cats[i] || '', x: cx2 + cw2 * 0.22, y: pb + m });
                lc2_greek(g, 'greek ' + i, cx2 - cw2 * 0.4, pb + m, cw2 * 0.5, catH - m, ls * 0.8, C.text, 35, i + 7, true);
            }
            var cr2 = []; for (i = 1; i < 4; i++) cr2.push([[x0, y0 + sh * i / 4], [x0 + sw, y0 + sh * i / 4]]);
            lc2_lines2(g, 'creases', cr2, jzMixHex(C.fill, C.text, 0.12), 1 * kx, { op: 80 });
            var LB = lc2_vlabels(ctx, labs, { font: jzSerifF(ctx), size: ls, color: red, name: 'fortunes' });
        }
        jzSetExpr(jzXf(S, 'ADBE Opacity'), OP + 'value*a');
        lc2_paint(S);
        if (LB) texts.push(LB.L);
        var BIG = Math.max(W, H);
        function clip(L) {
            if (port) lc2_clip(L, x0 - BIG, y0 - 1, x0 + sw + BIG, y0 + 1, OP + jzN(sh) + '*vis-1');
            else lc2_clip(L, x0 + sw - 1, y0 - BIG, x0 + sw + 1, y0 + sh + BIG, OP + jzN(sw) + '*vis-1');
        }
        clip(S);
        for (i = 0; i < texts.length; i++) { clip(texts[i]); jzSetExpr(jzXf(texts[i], 'ADBE Opacity'), OP + 'value*a'); }
        clip(lyr); lc2_main(ctx, lyr, port ? 0.25 : 0.22);
        return bb;
    }
});

/* ================================================================== 27 kakejiku — 掛け軸 */
jzReg('layout', 'kakejiku', {
    plan: function (rng, cut, st) {
        return { font: rng.chance(0.5) ? 'brush' : rng.pick(jzFontsOf(st, ['serif'])), variant: lc2_port(cut) ? 'kake' : rng.pick(['kake', 'kake', 'yoko']),
            mount: rng.pick(['accent', 'ink', 'sub']), seal: rng.chance(0.7) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), kx = lc2_k(ctx), port = jzPortrait(ctx), HD = lc2_H(ctx), i;
        var font = jzP(ctx, 'font', jzSerifF(ctx)), mount = jzP(ctx, 'mount', 'accent'), hasSeal = !!jzP(ctx, 'seal', true), C = lc2_card(sc), t0 = lc2_vt(c.text), dark = jzDarkest(sc);
        var mountC = jzMixHex(lc2_plate(sc, mount === 'accent' ? [sc.accent, sc.ink] : mount === 'ink' ? [sc.ink, sc.accent] : [sc.sub, sc.ink]), dark, 0.3);
        var goldC = jzMixHex(lc2_plate(sc, [sc.accent, sc.accent2, sc.sub], mountC, 1.5), mountC, 0.25), rodC = jzMixHex(dark, sc.sub, 0.35), seal = lc2_plate(sc, [sc.accent, sc.accent2], C.fill, 1.6);
        var OP = HD + 'var op=ioc(cl((time-0.08)/0.7))*(1-ioc(cl(PO/0.85))),a=oc(cl(time/0.2))*(1-cl((PO-0.8)/0.2));', BIG = Math.max(W, H), vo, fb, size, mm, VV, S, g, bb;
        if (jzP(ctx, 'variant', 'kake') === 'yoko' && !port) {
            // horizontal scroll unrolling right -> left
            var sw = W * 0.86, sh = Math.min(H * 0.56, sw * 0.4), x1 = W / 2 + sw / 2, y0 = H / 2 - sh / 2, rodW = sh * 0.07;
            S = lc2_S(ctx, 'scroll', 0, 0); g = lc2_G(S, 'scroll');
            lc2_box(g, 'mount', x1 - sw, y0, sw, sh, mountC);
            var px0 = x1 - sw + sw * 0.08, pw = sw * 0.84, py0 = y0 + sh * 0.12, ph2 = sh * 0.76;
            lc2_box(g, 'gold', px0 - sh * 0.02, py0 - sh * 0.02, pw + sh * 0.04, ph2 + sh * 0.04, goldC);
            lc2_box(g, 'paper', px0, py0, pw, ph2, C.fill);
            vo = { vertical: true, lead: 1.4, track: 0.06 };
            fb = lc2_fitBlock(t0, pw * 0.8, ph2 * 0.86, vo, 4); size = Math.min(fb.size, ph2 * 0.4); mm = lc2_meas(fb.text, size, vo);
            if (hasSeal) lc2_gx(lc2_box(g, 'seal', px0 + pw / 2 - mm.w * 0.5 - size * 0.7, py0 + (ph2 + mm.h) / 2 - size * 0.55, size * 0.45, size * 0.45, seal), 'op', HD + '100*cl((time-0.6)*4)');
            jzSetExpr(jzXf(S, 'ADBE Opacity'), OP + 'value*a');
            lc2_paint(S);
            VV = lc2_V(ctx, fb.text, { font: font, size: size, color: C.text, x: px0 + pw / 2 + mm.w * 0.1, y: py0 + (ph2 - mm.h) / 2, lead: 1.4, track: 0.06, name: t0 });
            var EX = OP + jzN(sw) + '*op+' + jzN(rodW - 1);
            lc2_clip(S, x1 + rodW - 1, y0 - BIG, x1 + rodW + 1, y0 + sh + BIG, EX);
            lc2_clip(VV.L, x1 + rodW - 1, y0 - BIG, x1 + rodW + 1, y0 + sh + BIG, EX);
            lc2_main(ctx, VV.L, 0.25);
            var RL = lc2_S(ctx, 'rollers', 0, 0), gr = lc2_G(RL, 'rollers');
            lc2_box(gr, 'roller right', x1, y0 - rodW * 0.8, rodW, sh + rodW * 1.6, rodC, { r: rodW * 0.4 });
            var gm = lc2_box(gr, 'roller left', x1 - rodW, y0 - rodW * 1.4, rodW * 1.3, sh + rodW * 2.8, rodC, { r: rodW * 0.5 });
            lc2_gx(gm, 'pos', OP + '[-' + jzN(sw) + '*op,0]');
            jzSetExpr(jzXf(RL, 'ADBE Opacity'), OP + 'value*a');
            lc2_paint(RL);
            return VV.bb;
        }
        // hanging scroll unrolling downwards
        var sw2 = port ? W * 0.6 : Math.min(W * 0.32, H * 0.42), sh2 = H * (port ? 0.8 : 0.86), cx = W / 2, y02 = H / 2 - sh2 / 2 + H * 0.03, rodH = sw2 * 0.06;
        var CD = lc2_S(ctx, 'cord', 0, 0), gc = lc2_G(CD, 'cord');
        lc2_line(gc, 'cord', [[cx - sw2 * 0.28, y02], [cx, y02 - H * 0.06], [cx + sw2 * 0.28, y02]], sc.sub, Math.max(1.5 * kx, u * 0.0025));
        lc2_circ(gc, 'hook', cx, y02 - H * 0.06, u * 0.006, sc.fg);
        jzSetExpr(jzXf(CD, 'ADBE Opacity'), OP + 'value*a');
        lc2_paint(CD);
        S = lc2_S(ctx, 'scroll', 0, 0); g = lc2_G(S, 'scroll');
        lc2_box(g, 'mount', cx - sw2 / 2, y02, sw2, sh2, mountC);
        var pt = y02 + sh2 * 0.2, pb = y02 + sh2 * 0.84, pw2 = sw2 * 0.78;
        lc2_box(g, 'gold', cx - pw2 / 2 - sw2 * 0.02, pt - sh2 * 0.03, pw2 + sw2 * 0.04, pb - pt + sh2 * 0.06, goldC);
        lc2_box(g, 'paper', cx - pw2 / 2, pt, pw2, pb - pt, C.fill);
        vo = { vertical: true, lead: 1.35, track: 0.08 };
        fb = lc2_fitBlock(t0, pw2 * 0.82, (pb - pt) * 0.86, vo, 2); size = Math.min(fb.size, pw2 * 0.5); mm = lc2_meas(fb.text, size, vo);
        var ty = pt + ((pb - pt) - mm.h) * 0.4;
        if (hasSeal) {
            var ss = Math.min(Math.max(size * 0.42, pw2 * 0.1), pw2 * 0.16), sxx = Math.max(cx - pw2 / 2 + ss * 0.3, cx - mm.w / 2 - ss * 1.1), syy = Math.min(pb - ss * 1.3, ty + mm.h - ss * 0.6);
            var gsl = lc2_sub(g, 'seal');
            lc2_box(gsl, 'seal', sxx, syy, ss, ss, seal);
            lc2_box(gsl, 'seal inner', sxx + ss * 0.18, syy + ss * 0.18, ss * 0.64, ss * 0.64, jzMixHex(seal, C.fill, 0.35), { op: 50 });
            lc2_gx(gsl, 'op', HD + '100*cl((time-0.7)*4)');
        }
        jzSetExpr(jzXf(S, 'ADBE Opacity'), OP + 'value*a');
        lc2_paint(S);
        VV = lc2_V(ctx, fb.text, { font: font, size: size, color: C.text, x: cx, y: ty, lead: 1.35, track: 0.08, name: t0 });
        var EX2 = OP + jzN(sh2) + '*Math.max(0.03,op)';
        lc2_clip(S, cx - sw2, y02 - 2 * kx, cx + sw2, y02, EX2);
        lc2_clip(VV.L, cx - sw2, y02 - 2 * kx, cx + sw2, y02, EX2);
        lc2_main(ctx, VV.L, 0.2);
        // top rod + bottom roller (follows the unrolled edge) with knobs
        var RD = lc2_S(ctx, 'rods', 0, 0), grd = lc2_G(RD, 'rods');
        lc2_box(grd, 'top rod', cx - sw2 * 0.53, y02 - rodH * 0.5, sw2 * 1.06, rodH, rodC, { r: rodH * 0.4 });
        var gro = lc2_sub(grd, 'roller');
        lc2_box(gro, 'roller', cx - sw2 * 0.55, -rodH * 0.3, sw2 * 1.1, rodH * 1.3, rodC, { r: rodH * 0.5 });
        lc2_box(gro, 'knob', cx - sw2 * 0.62, -rodH * 0.45, sw2 * 0.08, rodH * 1.6, goldC, { r: rodH * 0.3 });
        lc2_box(gro, 'knob', cx + sw2 * 0.54, -rodH * 0.45, sw2 * 0.08, rodH * 1.6, goldC, { r: rodH * 0.3 });
        lc2_gx(gro, 'pos', OP + '[0,' + jzN(y02) + '+' + jzN(sh2) + '*Math.max(0.03,op)]');
        jzSetExpr(jzXf(RD, 'ADBE Opacity'), OP + 'value*a');
        lc2_paint(RD);
        return lc2_box4(cx - sw2 / 2, y02, cx + sw2 / 2, y02 + sh2);
    }
});

/* ================================================================== 28 shoji — 障子 */
// frame + kumiko lattice of one panel (one fill for all bars)
function lc2_shojiFrame(g, name, x, y, w, h, woodC, cols, rows, kx) {
    var s = lc2_sub(g, name), fw = Math.max(4 * kx, w * 0.045), bw = Math.max(2 * kx, w * 0.012), i;
    lc2_rr(s, x, y, w, fw, 0); lc2_rr(s, x, y + h - fw * 1.6, w, fw * 1.6, 0); lc2_rr(s, x, y, fw, h, 0); lc2_rr(s, x + w - fw, y, fw, h, 0);
    for (i = 1; i < cols; i++) lc2_rr(s, x + fw + (w - fw * 2) * i / cols - bw / 2, y, bw, h, 0);
    for (i = 1; i < rows; i++) lc2_rr(s, x, y + fw + (h - fw * 2.6) * i / rows - bw / 2, w, bw, 0);
    jzAddFill(s, woodC);
    return s;
}
jzReg('layout', 'shoji', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), variant: rng.pick(['shadow', 'open', 'shadow']), rows: rng.int(4, 6), cols: rng.int(2, 3) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), kx = lc2_k(ctx), port = jzPortrait(ctx), HD = lc2_H(ctx), i;
        var font = jzP(ctx, 'font', jzSerifF(ctx)), rows = jzP(ctx, 'rows', 5), cols = jzP(ctx, 'cols', 2), C = lc2_card(sc), dark = jzDarkest(sc);
        var paperC = jzLum(sc.bg) < 0.5 ? jzMixHex(C.fill, sc.accent, 0.08) : jzMixHex(C.fill, sc.dim || sc.sub, 0.2), woodC = jzMixHex(dark, lc2_plate(sc, [sc.accent, sc.sub]), 0.35);
        var nP = port ? 2 : 4, pw = W / nP, t0 = jzTrim(c.text), fb, size, T, mm;
        var GLW = 'var glow=0.92+0.08*(0.5+0.5*Math.sin(time*1.9+SD)*Math.cos(time*0.7+SD*0.3));';
        if (jzP(ctx, 'variant', 'shadow') === 'shadow') {
            // the lyric is a silhouette behind the paper; the lattice sits in front of it
            var A = HD + 'var a=oc(cl(time/0.3))*(1-cl((PO-0.5)/0.5));';
            var PP = lc2_S(ctx, 'shoji paper', 0, 0); lc2_box(lc2_G(PP, 'paper'), 'paper', 0, 0, W, H, paperC);
            jzSetExpr(jzXf(PP, 'ADBE Opacity'), A + GLW + 'value*a*glow');
            lc2_paint(PP);
            var LT = lc2_S(ctx, 'shoji light', 0, 0); lc2_box(lc2_G(LT, 'light'), 'light', 0, 0, W, H, '#FFFFFF');
            var ramp = jzEffect(LT, 'ADBE Ramp', 'JZ Lamp');
            jzEP(ramp, 1, [W / 2, H / 2]); jzEP(ramp, 2, jzHex(jzLightest(sc))); jzEP(ramp, 3, [W / 2 + Math.sqrt(W * W + H * H) * 0.6, H / 2]); jzEP(ramp, 4, jzHex(dark)); jzEP(ramp, 5, 2);
            jzXf(LT, 'ADBE Opacity').setValue(25);
            jzSetExpr(jzXf(LT, 'ADBE Opacity'), A + 'value*a');
            lc2_paint(LT);
            fb = lc2_fitBlock(t0, W * 0.8, H * 0.5, { lead: 1.15, track: 0.04 }, port ? 4 : 2); size = Math.min(fb.size, u * 0.26);
            var shade = jzMixHex(paperC, dark, 0.86), NR = HD + 'var near=oc(cl(time/0.9));';
            var RG = lc2_S(ctx, 'silhouette rig', W / 2, H / 2);
            jzSetExpr(jzXf(RG, 'ADBE Position'), NR + '[value[0]+(1-near)*' + jzN(W * 0.03) + ',value[1]]');
            jzSetExpr(jzXf(RG, 'ADBE Scale'), NR + 'var s=lp(1.06,1,near);[value[0]*s,value[1]*s]');
            T = lc2_T(ctx, fb.text, { font: font, size: size, x: W / 2, y: H / 2, lead: 1.15, track: 0.04, color: shade, name: t0 });
            var bl = jzEffect(T, 'ADBE Gaussian Blur 2', 'JZ Behind Paper');
            jzEX(bl, 1, NR + 'lp(' + jzN(size * 0.08) + ',' + jzN(size * 0.012) + ',near)'); jzEP(bl, 3, 1);
            lc2_kid(T, RG); lc2_main(ctx, T, 0);
            lc2_alphaAnim(T, A, 'a>0.01?1:0');     // no silhouette while the paper is invisible (browser returns early)
            var LA = lc2_S(ctx, 'shoji lattice', 0, 0), gl = lc2_G(LA, 'lattice');
            for (i = 0; i < nP; i++) lc2_shojiFrame(gl, 'panel ' + (i + 1), i * pw, 0, pw, H, woodC, cols, rows, kx);
            jzSetExpr(jzXf(LA, 'ADBE Opacity'), A + 'value*a');
            lc2_paint(LA);
            mm = lc2_meas(fb.text, size, { lead: 1.15, track: 0.04 });
            return lc2_box4(W / 2 - mm.w / 2, H / 2 - mm.h / 2, W / 2 + mm.w / 2, H / 2 + mm.h / 2);
        }
        // panels slide open to reveal the lyric; they close again on exit
        fb = lc2_fitBlock(t0, W * (port ? 0.6 : 0.5), H * 0.46, { lead: 1.15, track: 0.04 }, port ? 4 : 3); size = Math.min(fb.size, u * 0.24);
        mm = lc2_meas(fb.text, size, { lead: 1.15, track: 0.04 });
        T = lc2_T(ctx, fb.text, { font: font, size: size, x: W / 2, y: H / 2, lead: 1.15, track: 0.04, color: sc.fg, name: t0 });
        lc2_main(ctx, T, 0.12);
        var gapW = Math.min(W * (port ? 0.76 : 0.9), mm.w + size * 1.4), OPN = HD + 'var op=ioc(cl((time-0.05)/0.55))*(1-ioc(PO));';
        var SP = lc2_S(ctx, 'shoji panels', 0, 0), half = nP / 2, sides = [lc2_G(SP, 'left'), lc2_G(SP, 'right')];
        for (i = 0; i < nP; i++) {
            var gg = sides[i < half ? 0 : 1];
            lc2_box(gg, 'paper', i * pw, 0, pw, H, paperC);
            lc2_gx(lc2_box(gg, 'dim', i * pw, 0, pw, H, sc.bg), 'op', HD + GLW + '(1-glow)*60');
            lc2_shojiFrame(gg, 'frame', i * pw, 0, pw, H, woodC, cols, rows, kx);
        }
        lc2_gx(sides[0], 'pos', OPN + '[-' + jzN(gapW / 2) + '*op,0]');
        lc2_gx(sides[1], 'pos', OPN + '[' + jzN(gapW / 2) + '*op,0]');
        lc2_paint(SP);
        return lc2_box4(W / 2 - mm.w / 2, H / 2 - mm.h / 2, W / 2 + mm.w / 2, H / 2 + mm.h / 2);
    }
});

/* ================================================================== 29 clapper — カチンコ */
jzReg('layout', 'clapper', {
    plan: function (rng, cut, st) {
        return { font: rng.chance(0.5) ? 'klee' : rng.pick(jzFontsOf(st, ['display', 'body'])), tilt: rng.range(-6, 6), roll: 'A' + rng.int(1, 9), take: rng.int(1, 12) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), kx = lc2_k(ctx), ls = jzSmallSize(ctx), port = jzPortrait(ctx), HD = lc2_H(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), tilt = jzP(ctx, 'tilt', 0), roll = String(jzP(ctx, 'roll', 'A1')), take = jzP(ctx, 'take', 1);
        var bw = port ? W * 0.88 : Math.min(W * 0.56, H * 0.74 * 1.3), bh = bw * 0.62, slate = lc2_plate(sc, [jzDarkest(sc), sc.ink, sc.fg], sc.bg, 1.4), chalk = lc2_onCol(sc, slate);
        var CX = W / 2, CY = H / 2 + bh * 0.1, TC = 0.42;
        var E = HD + 'var e=oc(cl(time/0.4)),eo=ic(PO),a=cl(e*2)*(1-eo),sk=(time>' + TC + '&&time<' + (TC + 0.15) + ')?(hh(Math.floor(time*24)+SD)*2-1)*' + jzN(u * 0.006) + '*(1-(time-' + TC + ')/0.15):0;';
        var R = lc2_S(ctx, 'clapperboard', CX, CY), g = lc2_G(R, 'board'), x0 = -bw / 2, y0 = -bh / 2, sh = bh * 0.14;
        lc2_shadow(g, sc, x0, y0 - bh * 0.3, bw, bh * 1.3, bh * 0.03, u * 0.016);
        lc2_box(g, 'slate', x0, y0, bw, bh, slate, jzContrast(slate, sc.bg) < 1.5 ? { r: bh * 0.03, stroke: sc.fg, sw: 2 * kx } : { r: bh * 0.03 });
        function stick(gp, yy) {
            lc2_box(gp, 'base', x0, yy, bw, sh, slate);
            lc2_polys(gp, 'stripes', lc2_stripes(x0, yy, bw, sh, bw * 0.055, -35, true), chalk);
            lc2_box(gp, 'edge', x0, yy, bw, sh, null, { stroke: chalk, sw: 1.5 * kx });
        }
        var yb = y0 - sh - bh * 0.01;
        stick(lc2_sub(g, 'stick'), yb);
        var gt = lc2_sub(g, 'clap stick'); stick(gt, y0 - sh * 2 - bh * 0.02);
        lc2_gset(gt, 'anc', [x0, yb]); lc2_gset(gt, 'pos', [x0, yb]);
        lc2_gx(gt, 'rot', HD + 'time<' + TC + '?-28*oc(cl(time/0.25))*(1-iq(cl((time-0.28)/' + jzN(TC - 0.28) + '))):0');
        lc2_circ(g, 'hinge', x0 + sh * 0.5, y0 - sh * 1.05, sh * 0.22, chalk);
        var lw = Math.max(1.5 * kx, u * 0.0022), r1 = y0 + bh * 0.5, r2 = y0 + bh * 0.76;
        lc2_lines2(g, 'grid', [[[x0, r1], [x0 + bw, r1]], [[x0, r2], [x0 + bw, r2]], [[x0 + bw / 3, r1], [x0 + bw / 3, y0 + bh]], [[x0 + bw * 2 / 3, r1], [x0 + bw * 2 / 3, y0 + bh]]], chalk, lw, { op: 80 });
        jzSetExpr(jzXf(R, 'ADBE Position'), E + '[value[0]+sk,value[1]+(1-e)*' + jzN(H * 0.5) + '+eo*' + jzN(H * 0.2) + '+sk*0.6]');
        jzSetExpr(jzXf(R, 'ADBE Rotate Z'), 'value+' + jzN(tilt));
        jzSetExpr(jzXf(R, 'ADBE Opacity'), E + 'value*a');
        lc2_paint(R);
        var pad = bw * 0.025, rowH = r2 - r1, labs = [{ t: 'PROD.', x: CX + x0 + pad, y: CY + y0 + pad + ls * 0.4 }], v1 = [], v2 = [];
        var k1 = [['SCENE', jzLineNo(ctx)], ['TAKE', String(take)], ['ROLL', roll]], k2 = [['DATE', jzFmtTime(c.start)], ['DIR.', 'JIZURA'], ['CAM.', 'A']];
        for (i = 0; i < 3; i++) {
            labs.push({ t: k1[i][0], x: CX + x0 + bw * i / 3 + pad, y: CY + r1 + ls * 0.6 }); v1.push({ t: k1[i][1], x: CX + x0 + bw * i / 3 + pad, y: CY + r1 + rowH * 0.62 });
            labs.push({ t: k2[i][0], x: CX + x0 + bw * i / 3 + pad, y: CY + r2 + ls * 0.6 }); v2.push({ t: k2[i][1], x: CX + x0 + bw * i / 3 + pad + ls * 3.2, y: CY + r2 + (y0 + bh - r2) * 0.55 });
        }
        var M1 = lc2_multi(ctx, labs, { font: jzMonoF(ctx), size: ls * 0.72, track: 0.2, align: 'left', color: chalk, name: 'slate labels' });
        var M2 = lc2_multi(ctx, v1, { font: font, size: rowH * 0.46, align: 'left', color: chalk, name: 'slate values' });
        var M3 = lc2_multi(ctx, v2, { font: font, size: Math.min((y0 + bh - r2) * 0.42, ls * 1.3), align: 'left', color: chalk, name: 'slate values 2' });
        lc2_kid(M1.L, R); lc2_kid(M2.L, R); lc2_kid(M3.L, R);
        jzSetExpr(jzXf(M1.L, 'ADBE Opacity'), E + 'value*a*0.75');
        jzSetExpr(jzXf(M2.L, 'ADBE Opacity'), E + 'value*a*cl((time-0.2)*4)'); jzSetExpr(jzXf(M3.L, 'ADBE Opacity'), E + 'value*a*cl((time-0.2)*4)');
        var fb = lc2_fitBlock(jzTrim(c.text), bw - pad * 2, (r1 - y0) - ls * 1.6, { lead: 1.08 }, 2), size = Math.min(fb.size, bh * 0.3);
        var T = lc2_T(ctx, fb.text, { font: font, size: size, x: CX + x0 + pad * 1.4, y: CY + y0 + ls * 1.2 + ((r1 - y0) - ls * 1.2) / 2, align: 'left', lead: 1.08, color: chalk, name: c.text });
        lc2_kid(T, R); lc2_main(ctx, T, 0.25);
        return lc2_box4(CX - bw / 2, CY - bh / 2, CX + bw / 2, CY + bh / 2);
    }
});

/* ================================================================== 30 warningLabel — 警告ラベル */
// warning triangle with a (flashing) exclamation mark; returns the mark group
function lc2_warnTri(g, cx, cy, s, fill, mark, kx) {
    var pts = [[cx, cy - s * 0.52], [cx + s * 0.58, cy + s * 0.46], [cx - s * 0.58, cy + s * 0.46]];
    lc2_poly(g, 'triangle', pts, fill, { stroke: fill, sw: Math.max(2 * kx, s * 0.1), cap: 2 });
    var gm = lc2_sub(g, 'mark');
    lc2_box(gm, 'bar', cx - s * 0.055, cy - s * 0.24, s * 0.11, s * 0.42, mark, { r: s * 0.05 });
    lc2_circ(gm, 'dot', cx, cy + s * 0.3, s * 0.065, mark);
    return gm;
}
jzReg('layout', 'warningLabel', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display'])), variant: rng.pick(['header', 'stripe', 'side']), word: rng.int(0, 3), tilt: rng.range(-3, 3) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), kx = lc2_k(ctx), ls = jzSmallSize(ctx), port = jzPortrait(ctx), HD = lc2_H(ctx);
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), variant = jzP(ctx, 'variant', 'header'), tilt = jzP(ctx, 'tilt', 0), C = lc2_card(sc);
        var lw0 = port ? W * 0.9 : Math.min(W * 0.78, H * 1.55), lh0 = lw0 * (port ? 0.78 : 0.5), CX = W / 2, CY = H / 2;
        var Q = HD + 'var q=ob(cl(time/0.32),1.5),eo=ic(PO),a=cl(q*3)*(1-eo),fl=time<0.9?(Math.floor(time/0.12)%2?0.25:1):1,he=oc(cl((time-0.06)/0.35));';
        var warnC = lc2_plate(sc, [sc.accent, sc.accent2, sc.ink], C.fill, 1.6), inkC = lc2_plate(sc, [jzDarkest(sc), sc.ink, sc.fg], C.fill, 3), hazard = lc2_plate(sc, [sc.accent, sc.accent2, C.fill], inkC, 1.8);
        var wp = LC2_WARN[(jzP(ctx, 'word', 0) || 0) % 4], we = wp[0], wj = wp[1], onW = lc2_onCol(sc, warnC);
        var R = lc2_S(ctx, 'warning label', CX, CY), g = lc2_G(R, 'label'), x0 = -lw0 / 2, y0 = -lh0 / 2, kids = [], stripes = null;
        lc2_shadow(g, sc, x0, y0, lw0, lh0, lh0 * 0.04, u * 0.014);
        lc2_box(g, 'label', x0, y0, lw0, lh0, C.fill, { r: lh0 * 0.04, stroke: inkC, sw: Math.max(3 * kx, u * 0.004) });
        var ax0 = x0, ay0 = y0, aw = lw0, ah = lh0, gm;
        if (variant === 'header') {
            var hh = lh0 * 0.26, gh = lc2_sub(g, 'header');
            lc2_box(gh, 'band', x0, y0, lw0, hh, warnC, { r: lh0 * 0.04 }); lc2_box(gh, 'band low', x0, y0 + hh * 0.5, lw0, hh * 0.5, warnC);
            var gtri = lc2_sub(g, 'sign'); gm = lc2_warnTri(gtri, x0 + hh * 0.75, y0 + hh * 0.52, hh * 0.72, onW, warnC, kx);
            lc2_gx(gtri, 'op', Q + '100*he');
            var ht = we + '  ' + wj, hs = Math.min(hh * 0.46, lc2_fitSize(ht, lw0 - hh * 1.8, hh, { track: 0.12 }));
            kids.push([lc2_T(ctx, ht, { font: 'gothic_black', size: hs, track: 0.12, align: 'left', x: CX + x0 + hh * 1.45, y: CY + y0 + hh * 0.52, color: onW }), 'a*he']);
            ay0 = y0 + hh; ah = lh0 - hh;
        } else if (variant === 'stripe') {
            var sb = lh0 * 0.11;
            gm = lc2_warnTri(lc2_sub(g, 'sign'), x0 + lw0 / 2, y0 + sb + lh0 * 0.16, lh0 * 0.2, warnC, onW, kx);
            kids.push([lc2_T(ctx, wj + '　' + we, { font: 'gothic_black', size: lh0 * 0.06, track: 0.2, x: CX, y: CY + y0 + sb + lh0 * 0.33, color: inkC }), 'a']);
            ay0 = y0 + sb + lh0 * 0.38; ah = lh0 - sb * 2 - lh0 * 0.38;
            // hazard bands: stripes crawl sideways inside two band masks
            stripes = lc2_S(ctx, 'hazard stripes', CX, CY);
            var sw = sb * 0.7, per = sw * 2, V = sb * 1.2, bands = [[y0 + 2 * kx, 1], [y0 + lh0 - sb - 2 * kx, -1]];
            for (var bi = 0; bi < 2; bi++) {
                var by = bands[bi][0], gb = lc2_G(stripes, 'band ' + (bi + 1));
                lc2_box(gb, 'base', x0 + 2 * kx, by, lw0 - 4 * kx, sb, inkC);
                var gs = lc2_polys(gb, 'stripes', lc2_stripes(x0 - per, by, lw0 + per * 2, sb, sw, 45, false), hazard);
                lc2_gx(gs, 'pos', 'var P=' + jzN(per) + ',o=((' + bands[bi][1] + '*time*' + jzN(V) + ')%P+P)%P;[o-P,0]');
                jzMaskRect(stripes, x0 + 2 * kx, by, x0 + lw0 - 2 * kx, by + sb, 0);
            }
            jzSetExpr(jzXf(stripes, 'ADBE Opacity'), Q + 'value*a');
            lc2_paint(stripes);
        } else {
            var sw2 = lw0 * (port ? 0.3 : 0.26), gside = lc2_sub(g, 'side');
            lc2_box(gside, 'band', x0, y0, sw2, lh0, warnC, { r: lh0 * 0.04 }); lc2_box(gside, 'band right', x0 + sw2 * 0.5, y0, sw2 * 0.5, lh0, warnC);
            gm = lc2_warnTri(lc2_sub(g, 'sign'), x0 + sw2 / 2, y0 + lh0 * 0.42, sw2 * 0.68, onW, warnC, kx);
            kids.push([lc2_T(ctx, we, { font: 'gothic_black', size: sw2 * 0.14, track: 0.1, x: CX + x0 + sw2 / 2, y: CY + y0 + lh0 * 0.78, color: onW }), 'a']);
            ax0 = x0 + sw2; aw = lw0 - sw2;
        }
        lc2_gx(gm, 'op', Q + '100*fl');
        jzSetExpr(jzXf(R, 'ADBE Rotate Z'), Q + 'value+' + jzN(tilt) + '+(1-q)*4');
        jzSetExpr(jzXf(R, 'ADBE Scale'), Q + 'var s=0.85+0.15*q;[value[0]*s,value[1]*s]');
        jzSetExpr(jzXf(R, 'ADBE Opacity'), Q + 'value*a');
        lc2_paint(R);
        if (stripes) lc2_kid(stripes, R);
        if (variant !== 'stripe') kids.push([lc2_T(ctx, 'No.' + jzLineNo(ctx) + '  —  ' + jzFmtTime(c.start), { font: jzMonoF(ctx), size: ls * 0.8, track: 0.2, align: 'right', x: CX + ax0 + aw - ls, y: CY + ay0 + ah - ls * 0.9, color: inkC }), 'a*0.6*K']);
        for (var i = 0; i < kids.length; i++) { lc2_kid(kids[i][0], R); jzSetExpr(jzXf(kids[i][0], 'ADBE Opacity'), Q + 'value*' + kids[i][1]); }
        var fb = lc2_fitBlock(jzTrim(c.text), aw * 0.86, ah * 0.66, { lead: 1.08, track: 0.02 }, port ? 3 : 2), size = Math.min(fb.size, u * 0.2);
        var T = lc2_T(ctx, fb.text, { font: font, size: size, x: CX + ax0 + aw / 2, y: CY + ay0 + ah / 2 - (variant === 'stripe' ? 0 : ah * 0.04), lead: 1.08, track: 0.02, color: inkC, name: c.text });
        lc2_kid(T, R); lc2_main(ctx, T, 0.12);
        return lc2_box4(CX - lw0 / 2, CY - lh0 / 2, CX + lw0 / 2, CY + lh0 / 2);
    }
});

/* ================================================================== 31 priceTag — 値札 */
function lc2_yen(v) { var s = String(Math.round(v)), o = ''; while (s.length > 3) { o = ',' + s.substr(s.length - 3) + o; s = s.substr(0, s.length - 3); } return '¥' + s + o; }
jzReg('layout', 'priceTag', {
    plan: function (rng, cut, st) {
        var price = rng.pick([980, 1280, 1980, 2480, 3300, 4980, 580, 12800]);
        var font = rng.pick(jzFontsOf(st, ['display', 'body'])), variant = rng.pick(['hang', 'hang', 'shelf']), was = Math.round(price * rng.range(1.25, 1.6) / 10) * 10, col = rng.pick(['card', 'accent']);
        var sw = rng.range(10, 18); sw *= rng.pick([1, -1]);
        return { font: font, variant: variant, price: price, was: was, col: col, swing: sw };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), kx = lc2_k(ctx), ls = jzSmallSize(ctx), port = jzPortrait(ctx), HD = lc2_H(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), price = jzP(ctx, 'price', 1980), was = jzP(ctx, 'was', 2980), swing = jzP(ctx, 'swing', 14), C = lc2_card(sc), t0 = jzTrim(c.text);
        var tagC = jzP(ctx, 'col', 'card') === 'accent' ? lc2_plate(sc, [sc.accent, sc.ink]) : C.fill, tc = lc2_onCol(sc, tagC), red = lc2_plate(sc, [sc.accent, sc.accent2, tc], tagC, 1.8);
        var fb, size, T, R, g;
        if (jzP(ctx, 'variant', 'hang') === 'shelf') {
            // supermarket shelf label
            var bw = port ? W * 0.9 : Math.min(W * 0.8, H * 1.8), bh = bw * (port ? 0.5 : 0.34), x0 = -bw / 2, y0 = -bh / 2, CX = W / 2, CY = H / 2;
            var E = HD + 'var e=cl(time/0.45),eo=ic(PO),a=cl(e*3)*(1-eo),pa=cl(ob(cl((time-0.3)/0.35),1.70158)*K);';
            R = lc2_S(ctx, 'shelf label', CX, CY); g = lc2_G(R, 'label');
            lc2_shadow(g, sc, x0, y0, bw, bh, bh * 0.03, u * 0.012);
            lc2_box(g, 'label', x0, y0, bw, bh, tagC, jzContrast(tagC, sc.bg) < 1.4 ? { r: bh * 0.03, stroke: jzMixHex(sc.fg, tagC, 0.4), sw: 1.5 * kx } : { r: bh * 0.03 });
            var hdr = bh * 0.2; lc2_box(g, 'header', x0, y0, bw, hdr, red);
            var gbc = lc2_sub(g, 'barcode'), bx = x0 + bw * 0.04, byy = y0 + bh * 0.88, xb = bx;
            for (i = 0; i < 36 && xb < bx + bw * 0.22; i++) { var w2 = bw * (0.002 + 0.004 * jzR(price, i, 3)); lc2_rr(gbc, xb, byy - bh * 0.06, w2, bh * 0.09, 0); xb += w2 + bw * (0.002 + 0.003 * jzR(price, i, 4)); }
            jzAddFill(gbc, tc, 80);
            jzSetExpr(jzXf(R, 'ADBE Position'), E + '[value[0],value[1]+(1-ob(e,1.3))*' + jzN(H * 0.3) + '+eo*' + jzN(H * 0.1) + ']');
            jzSetExpr(jzXf(R, 'ADBE Opacity'), E + 'value*a');
            lc2_paint(R);
            var hT = lc2_T(ctx, 'お買い得  ·  No.' + jzLineNo(ctx), { font: jzBodyF(ctx), size: hdr * 0.5, track: 0.2, align: 'left', x: CX + x0 + bw * 0.03, y: CY + y0 + hdr / 2, color: lc2_onCol(sc, red) });
            lc2_kid(hT, R); jzSetExpr(jzXf(hT, 'ADBE Opacity'), E + 'value*a');
            var nameW = bw * (port ? 0.9 : 0.62), nTop = y0 + hdr, nBot = y0 + bh * (port ? 0.62 : 0.8);
            fb = lc2_fitBlock(t0, nameW * 0.92, (nBot - nTop) * 0.86, { lead: 1.05 }, 2); size = Math.min(fb.size, bh * 0.3);
            var px = x0 + bw * 0.96, py = port ? y0 + bh * 0.76 : y0 + hdr + (bh - hdr) * 0.44, ps = Math.min((bh - hdr) * (port ? 0.26 : 0.3), size * 0.8);
            var PT = lc2_T(ctx, lc2_yen(price), { font: 'gothic_black', size: ps, align: 'right', x: CX + px, y: CY + py, color: red });
            var TX = lc2_T(ctx, '税込', { font: jzBodyF(ctx), size: ls * 0.9, align: 'right', x: CX + px, y: CY + py + ps * 0.62, color: tc });
            lc2_kid(PT, R); lc2_kid(TX, R);
            jzSetExpr(jzXf(PT, 'ADBE Scale'), E + '[value[0]*pa,value[1]*pa]'); jzSetExpr(jzXf(PT, 'ADBE Opacity'), E + 'value*pa'); jzSetExpr(jzXf(TX, 'ADBE Opacity'), E + 'value*pa*0.8');
            T = lc2_T(ctx, fb.text, { font: font, size: size, x: CX + x0 + bw * 0.04, y: CY + (nTop + nBot) / 2, align: 'left', lead: 1.05, color: tc, name: t0 });
            lc2_kid(T, R); lc2_main(ctx, T, 0.2);
            return lc2_box4(CX + x0, CY + y0, CX + x0 + bw, CY + y0 + bh);
        }
        // hanging swing tag
        var tw = port ? W * 0.62 : Math.min(W * 0.34, H * 0.46), th = tw * 1.45, hx = W / 2 + (port ? 0 : W * 0.04), hy = H * 0.08, cord = H * (port ? 0.12 : 0.1);
        var E2 = HD + 'var e=cl(time/0.45),eo=ic(PO),a=cl(e*3)*(1-eo),pa=cl(ob(cl((time-0.35)/0.35),1.70158)*K),SW=' + jzN(swing) + ',tt=Math.max(0,time);';
        var NL = lc2_S(ctx, 'nail', 0, 0); lc2_circ(lc2_G(NL, 'nail'), 'nail', hx, hy, u * 0.008, sc.sub);
        jzSetExpr(jzXf(NL, 'ADBE Opacity'), E2 + 'value*a'); lc2_paint(NL);
        R = lc2_S(ctx, 'swing tag', hx, hy); g = lc2_G(R, 'tag');
        lc2_line(g, 'string', [[0, 0], [-tw * 0.1, cord], [0, cord + tw * 0.12], [tw * 0.1, cord], [0, 0]], sc.sub, Math.max(1.5 * kx, u * 0.002), { cap: 2 });
        var top = cord + tw * 0.05, chn = tw * 0.22, pts = [[-tw / 2 + chn, top], [tw / 2 - chn, top], [tw / 2, top + chn], [tw / 2, top + th], [-tw / 2, top + th], [-tw / 2, top + chn]], sp = [];
        for (i = 0; i < pts.length; i++) sp.push([pts[i][0] + u * 0.008, pts[i][1] + u * 0.012]);
        lc2_poly(g, 'shadow', sp, lc2_shCol(sc), { op: lc2_shOp(sc) });
        lc2_poly(g, 'tag', pts, tagC, jzContrast(tagC, sc.bg) < 1.4 ? { stroke: jzMixHex(sc.fg, tagC, 0.4), sw: 1.5 * kx } : null);
        lc2_circ(g, 'eyelet', 0, top + tw * 0.13, tw * 0.045, sc.bg, { stroke: jzMixHex(tagC, tc, 0.3), sw: Math.max(1.5 * kx, tw * 0.012) });
        var m = tw * 0.1, ws = tw * 0.1, wasS = lc2_yen(was), wm = lc2_meas(wasS, ws, { mono: true }).w;
        lc2_line(g, 'rule', [[-tw / 2 + m, top + th * 0.62], [tw / 2 - m, top + th * 0.62]], tc, Math.max(1 * kx, u * 0.0015), { op: 50 });
        var gk = lc2_line(g, 'strike', [[-wm / 2 - ws * 0.2, top + th * 0.71], [wm / 2 + ws * 0.2, top + th * 0.71]], red, Math.max(2 * kx, ws * 0.12));
        jzAddTrimPaths(gk, E2 + '100*pa');
        jzSetExpr(jzXf(R, 'ADBE Position'), E2 + '[value[0],value[1]-(1-ob(e,1.4))*' + jzN(H * 0.4) + ']');
        jzSetExpr(jzXf(R, 'ADBE Rotate Z'), E2 + 'value+SW*Math.exp(-tt*2.2)*Math.cos(tt*5.2)*(1-eo)+Math.sin(time*1.1)*1.2+eo*SW*1.5');
        jzSetExpr(jzXf(R, 'ADBE Opacity'), E2 + 'value*a');
        lc2_paint(R);
        var WT = lc2_T(ctx, wasS, { font: jzMonoF(ctx), size: ws, x: hx, y: hy + top + th * 0.71, color: tc });
        var NT = lc2_T(ctx, lc2_yen(price), { font: 'gothic_black', size: tw * 0.17, x: hx, y: hy + top + th * 0.86, color: red });
        lc2_kid(WT, R); lc2_kid(NT, R);
        jzSetExpr(jzXf(WT, 'ADBE Opacity'), E2 + 'value*pa*0.6');
        jzSetExpr(jzXf(NT, 'ADBE Scale'), E2 + '[value[0]*pa,value[1]*pa]'); jzSetExpr(jzXf(NT, 'ADBE Opacity'), E2 + 'value*pa');
        fb = lc2_fitBlock(t0, tw - m * 2, th * 0.4, { lead: 1.08 }, 3); size = Math.min(fb.size, tw * 0.3);
        T = lc2_T(ctx, fb.text, { font: font, size: size, x: hx, y: hy + top + th * 0.36, lead: 1.08, color: tc, name: t0 });
        lc2_kid(T, R); lc2_main(ctx, T, 0.2, { noHold: true, treat: false });
        return lc2_box4(hx - tw / 2, hy + cord, hx + tw / 2, hy + cord + th);
    }
});

/* ================================================================== 32 nameTag — 名札 */
jzReg('layout', 'nameTag', {
    plan: function (rng, cut, st) {
        return { font: rng.chance(0.6) ? 'klee' : rng.pick(jzFontsOf(st, ['display', 'body'])), variant: rng.pick(['hello', 'hello', 'school']), tilt: rng.range(-6, 6), grade: rng.int(1, 6), cls: rng.int(1, 4) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), kx = lc2_k(ctx), port = jzPortrait(ctx), HD = lc2_H(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), hello = jzP(ctx, 'variant', 'hello') !== 'school', tilt = jzP(ctx, 'tilt', 0), C = lc2_card(sc), t0 = jzTrim(c.text);
        var bandC = lc2_plate(sc, [sc.accent, sc.accent2, sc.ink], C.fill, 1.6), bw = port ? W * 0.86 : Math.min(W * 0.62, H * 1.2), bh = bw * (hello ? 0.66 : 0.56);
        var E = HD + 'var e=cl(time/0.5),eo=ic(PO),a=cl(e*3)*(1-cl((PO-0.5)/0.5)),q=ob(e,1.6);', CX = W / 2, CY = H / 2;
        var R = lc2_S(ctx, 'name tag', CX, CY), g = lc2_G(R, 'tag'), x0 = -bw / 2, y0 = -bh / 2, r = bh * 0.08, kids = [], fb, size, ty, rot = 0;
        lc2_shadow(g, sc, x0, y0, bw, bh, r, u * 0.014);
        if (hello) {
            var hh = bh * 0.3, hc = lc2_onCol(sc, bandC);
            lc2_box(g, 'badge', x0, y0, bw, bh, bandC, { r: r });
            lc2_box(g, 'name field', x0 + bw * 0.035, y0 + hh, bw * 0.93, bh * 0.58, C.fill);
            kids.push(lc2_T(ctx, 'HELLO', { font: 'gothic_black', size: hh * 0.52, track: 0.08, x: CX, y: CY + y0 + hh * 0.4, color: hc }));
            kids.push(lc2_T(ctx, 'my name is', { font: jzBodyF(ctx), size: hh * 0.2, track: 0.15, x: CX, y: CY + y0 + hh * 0.82, color: hc }));
            fb = lc2_fitBlock(t0, bw * 0.84, bh * 0.46, { lead: 1.05 }, 2); size = Math.min(fb.size, bh * 0.36); ty = y0 + hh + bh * 0.29; rot = -2;
        } else {
            lc2_box(g, 'badge', x0, y0, bw, bh, C.fill, { r: r, stroke: bandC, sw: Math.max(4 * kx, bw * 0.014) });
            var pinY = y0 - bh * 0.06, fy = y0 + bh * 0.2;
            lc2_line(g, 'pin', [[x0 + bw * 0.2, pinY], [x0 + bw * 0.8, pinY]], sc.sub, Math.max(3 * kx, u * 0.004), { cap: 2 });
            lc2_circ(g, 'pin head', x0 + bw * 0.8, pinY, u * 0.008, sc.sub);
            lc2_line(g, 'field rule', [[x0 + bw * 0.06, fy + bh * 0.09], [x0 + bw * 0.94, fy + bh * 0.09]], bandC, Math.max(2 * kx, u * 0.003));
            lc2_circ(g, 'mark', x0 + bw * 0.88, y0 + bh * 0.2, bh * 0.08, bandC);
            kids.push(lc2_T(ctx, jzP(ctx, 'grade', 1) + ' ねん　' + jzP(ctx, 'cls', 1) + ' くみ', { font: font, size: bh * 0.1, align: 'left', x: CX + x0 + bw * 0.08, y: CY + fy, color: C.text }));
            kids.push(lc2_T(ctx, 'なまえ', { font: jzBodyF(ctx), size: bh * 0.07, align: 'left', x: CX + x0 + bw * 0.08, y: CY + fy + bh * 0.19, color: bandC }));
            fb = lc2_fitBlock(t0, bw * 0.84, bh * 0.44, { lead: 1.05 }, 2); size = Math.min(fb.size, bh * 0.34); ty = y0 + bh * 0.66;
        }
        jzSetExpr(jzXf(R, 'ADBE Position'), E + '[value[0]+eo*' + jzN(W * 0.1) + ',value[1]+(1-q)*' + jzN(-H * 0.35) + '+eo*' + jzN(H * 0.5) + ']');
        jzSetExpr(jzXf(R, 'ADBE Rotate Z'), E + 'value+' + jzN(tilt) + '*q+(1-q)*-25+eo*18');
        jzSetExpr(jzXf(R, 'ADBE Opacity'), E + 'value*a');
        lc2_paint(R);
        for (i = 0; i < kids.length; i++) { lc2_kid(kids[i], R); jzSetExpr(jzXf(kids[i], 'ADBE Opacity'), E + 'value*a'); }
        var T = lc2_T(ctx, fb.text, { font: font, size: size, x: CX, y: CY + ty, lead: 1.05, color: C.text, rot: rot, name: t0 });
        lc2_kid(T, R); lc2_main(ctx, T, 0.3);
        return lc2_box4(CX - bw / 2, CY - bh / 2, CX + bw / 2, CY + bh / 2);
    }
});

/* ================================================================== 33 stickyNotes — 付箋 */
jzReg('layout', 'stickyNotes', {
    plan: function (rng, cut, st) {
        var n = cut.n, k = n <= 4 ? 1 : n <= 9 ? 2 : n <= 14 ? 3 : 4, i;
        var font = rng.chance(0.6) ? 'klee' : rng.pick(jzFontsOf(st, ['display', 'body'])), chunks = lc2_splitK(cut.text, k, k), layout = rng.pick(['scatter', 'cascade']), rots = [], offs = [], cols = [];
        for (i = 0; i < 4; i++) rots.push(rng.range(-7, 7));
        for (i = 0; i < 4; i++) offs.push(rng.range(-1, 1));
        for (i = 0; i < 4; i++) cols.push(rng.int(0, 3));
        return { font: font, chunks: chunks, layout: layout, rots: rots, offs: offs, cols: cols, pin: rng.pick(['glue', 'tape']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), kx = lc2_k(ctx), port = jzPortrait(ctx), HD = lc2_H(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), rots = jzP(ctx, 'rots', [-3, 4, -2, 5]), offs = jzP(ctx, 'offs', [0, 0.5, -0.5, 0.2]), pcols = jzP(ctx, 'cols', [0, 1, 2, 3]);
        var glue = jzP(ctx, 'pin', 'glue') === 'glue', C = lc2_card(sc), dark = jzDarkest(sc), c0 = jzP(ctx, 'chunks', null), chunks = [];
        if (c0 && c0.length) { for (i = 0; i < c0.length; i++) if (c0[i]) chunks.push(jzTrim(String(c0[i]))); }
        if (!chunks.length) chunks = [jzTrim(c.text)];
        var k = chunks.length, acc = lc2_plate(sc, [sc.accent, sc.ink]);
        var col2 = sc.accent2 && jzLum(sc.accent2) > 0.3 && jzContrast(sc.accent2, sc.bg) > 1.3 ? sc.accent2 : jzMixHex(C.fill, acc, 0.2), pal = [acc, jzMixHex(C.fill, acc, 0.45), col2, C.fill];
        var ns, pos = [];
        if (k === 1) { ns = Math.min(W, H) * 0.62; pos = [[W / 2, H / 2]]; }
        else if (jzP(ctx, 'layout', 'scatter') === 'cascade' || port) {
            var dx = port ? 0.14 : 0.88, dy = port ? 0.86 : 0.3;
            ns = Math.min(W * 0.86 / (1 + (k - 1) * dx), H * 0.84 / (1 + (k - 1) * dy), Math.min(W, H) * 0.62);
            for (i = 0; i < k; i++) pos.push([W / 2 + (i - (k - 1) / 2) * ns * dx, H / 2 + (i - (k - 1) / 2) * ns * dy]);
        } else {
            ns = Math.min(W * 0.84 / (k * 1.02), H * 0.62);
            for (i = 0; i < k; i++) pos.push([W / 2 + (i - (k - 1) / 2) * ns * 1.02, H / 2 + (offs[i % 4] || 0) * H * 0.06]);
        }
        var bb = null, hs = ns / 2;
        for (i = 0; i < k; i++) {
            var x = pos[i][0], y = pos[i][1], t1 = 0.03 + i * 0.13, col = pal[(pcols[i % 4] || 0) % pal.length], tc = lc2_onCol(sc, col);
            var E = HD + 'var e=cl((time-' + jzN(t1) + ')/0.22),sq=lp(1.18,1,oc(e)),pl=ic(cl(PO*1.3-' + jzN(i * 0.1) + ')),a=cl(e*3)*(1-cl((pl-0.6)/0.4));';
            var R = lc2_S(ctx, 'note ' + (i + 1), x, y - hs), g = lc2_G(R, 'note');
            // curled-corner shadow, note with a folded corner, glue strip / tape
            var sh = [[-hs + ns * 0.02, ns * 0.04], [hs + ns * 0.025, ns * 0.04], [hs + ns * 0.02, ns - ns * 0.02]], qa = [hs + ns * 0.02, ns - ns * 0.02], qc = [hs - ns * 0.1, ns + ns * 0.05], qb = [-hs + ns * 0.04, ns + ns * 0.03];
            for (var j = 1; j <= 8; j++) { var t = j / 8; sh.push([(1 - t) * (1 - t) * qa[0] + 2 * (1 - t) * t * qc[0] + t * t * qb[0], (1 - t) * (1 - t) * qa[1] + 2 * (1 - t) * t * qc[1] + t * t * qb[1]]); }
            lc2_poly(g, 'curl shadow', sh, lc2_shCol(sc), { op: jzLum(sc.bg) > 0.5 ? 22 : 55 });
            var np = [[-hs, 0], [hs, 0], [hs, ns - ns * 0.06], [hs - ns * 0.1, ns], [-hs, ns]];
            lc2_poly(g, 'note', np, col, jzContrast(col, sc.bg) < 1.3 ? { stroke: jzMixHex(sc.fg, col, 0.4), sw: 1.2 * kx } : null);
            lc2_poly(g, 'fold', [[hs, ns - ns * 0.06], [hs - ns * 0.1, ns], [hs - ns * 0.085, ns - ns * 0.075]], jzMixHex(col, dark, 0.25));
            if (glue) lc2_box(g, 'glue', -hs, 0, ns, ns * 0.1, jzMixHex(col, dark, 0.08));
            else lc2_box(g, 'tape', -ns * 0.18, -ns * 0.05, ns * 0.36, ns * 0.11, jzLightest(sc), { op: 55 });
            jzSetExpr(jzXf(R, 'ADBE Position'), E + '[value[0],value[1]+pl*' + jzN(H * 0.3) + ']');
            jzSetExpr(jzXf(R, 'ADBE Rotate Z'), E + 'value+' + jzN(rots[i % 4] || 0) + '+pl*25*' + (i % 2 ? 1 : -1));
            jzSetExpr(jzXf(R, 'ADBE Scale'), E + '[value[0]*sq,value[1]*sq*(1-pl*0.3)]');
            jzSetExpr(jzXf(R, 'ADBE Opacity'), E + 'value*a');
            lc2_paint(R);
            var fb = lc2_fitBlock(chunks[i], ns * 0.8, ns * 0.64, { lead: 1.12 }, 3);
            var T = lc2_T(ctx, fb.text, { font: font, size: Math.min(fb.size, ns * 0.36), x: x, y: y + ns * 0.04, lead: 1.12, color: tc, rot: -1.5, name: chunks[i] });
            lc2_kid(T, R); lc2_main(ctx, T, t1 + 0.08);
            bb = jzUnion(bb, lc2_box4(x - hs, y - hs, x + hs, y + hs));
        }
        return bb;
    }
});

/* ================================================================== 34 karuta — かるた札 */
jzReg('layout', 'karuta', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), variant: lc2_port(cut) ? rng.pick(['single', 'pair']) : rng.pick(['pair', 'pair', 'single']),
            from: rng.pick([1, -1]), tilt: rng.range(-4, 4), art: rng.pick(['sun', 'wave', 'mount']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), kx = lc2_k(ctx), port = jzPortrait(ctx), HD = lc2_H(ctx), i;
        var font = jzP(ctx, 'font', jzSerifF(ctx)), pair = jzP(ctx, 'variant', 'pair') === 'pair', from = jzP(ctx, 'from', 1), tilt = jzP(ctx, 'tilt', 0), art = jzP(ctx, 'art', 'sun');
        var C = lc2_card(sc), t0 = lc2_vt(c.text), first = jzChars(t0)[0] || '', fc = [sc.accent, sc.accent2, sc.ink, C.text], frameC = C.text;
        for (i = 0; i < fc.length; i++) if (fc[i] && jzContrast(fc[i], C.fill) >= 1.3 && jzContrast(fc[i], sc.bg) >= 1.3) { frameC = fc[i]; break; }
        var red = lc2_plate(sc, [sc.accent, sc.accent2, C.text], C.fill, 1.7);
        var ch = port ? Math.min(H * (pair ? 0.42 : 0.72), W * (pair ? 0.56 : 0.8) / 0.72) : Math.min(H * 0.8, pair ? W * 0.9 / 2.2 / 0.72 : H), cw = ch * 0.72;
        var hyp = Math.sqrt(cw * cw + ch * ch);
        // a card that slaps down (slides in, settles with a wobble, impact lines); returns its rig
        function card(idx, cx, cy) {
            var t1 = idx * 0.12, SL = HD + 'var T1=' + jzN(t1) + ',e=cl((time-T1)/0.28),q=oc(e),bp=e>=1?Math.exp(-(time-T1-0.28)*14)*Math.sin((time-T1-0.28)*40)*0.02:0,eo=ic(PO),a=cl(e*3)*(1-eo);';
            var IM = lc2_S(ctx, 'impact ' + (idx + 1), cx, cy), gi = lc2_G(IM, 'impact'), ls0 = [];
            for (var j = 0; j < 10; j++) {
                var ang = j / 10 * Math.PI * 2 + 0.3, r0 = hyp * 0.55, r1 = r0 + u * 0.05, fx = Math.cos(ang) * (cw / hyp) * 1.4, fy = Math.sin(ang) * (ch / hyp) * 1.4;
                ls0.push([[fx * r0, fy * r0], [fx * r1, fy * r1]]);
            }
            var gl = lc2_lines2(gi, 'lines', ls0, sc.sub, Math.max(2 * kx, u * 0.003));
            jzAddTrimPaths(gl, SL + 'var k=(time-T1-0.26)/0.25;100*(1-cl(k))');
            lc2_gx(gi, 'sc', SL + 'var k=cl((time-T1-0.26)/0.25),s=100*(0.55+k*0.1)/0.55;[s,s]');
            jzSetExpr(jzXf(IM, 'ADBE Opacity'), SL + 'var k=(time-T1-0.26)/0.25;(k>0&&k<1)?100*(1-k):0');
            lc2_paint(IM);
            var R = lc2_S(ctx, 'karuta ' + (idx + 1), cx, cy), g = lc2_G(R, 'card');
            lc2_shadow(g, sc, -cw / 2, -ch / 2, cw, ch, cw * 0.05, u * 0.014);
            lc2_box(g, 'frame', -cw / 2, -ch / 2, cw, ch, frameC, { r: cw * 0.05 });
            lc2_box(g, 'face', -cw / 2 + cw * 0.06, -ch / 2 + cw * 0.06, cw * 0.88, ch - cw * 0.12, C.fill, { r: cw * 0.03 });
            jzSetExpr(jzXf(R, 'ADBE Position'), SL + '[value[0]+(1-q)*' + jzN(W * 0.7 * from) + ',value[1]+eo*' + jzN(H * 0.15) + ']');
            jzSetExpr(jzXf(R, 'ADBE Rotate Z'), SL + 'value+(1-q)*' + jzN(35 * from) + '+' + jzN(tilt * (idx ? -0.6 : 1)));
            jzSetExpr(jzXf(R, 'ADBE Scale'), SL + '[value[0]*(1+bp),value[1]*(1-bp)]');
            jzSetExpr(jzXf(R, 'ADBE Opacity'), SL + 'value*a');
            return { R: R, g: g, SL: SL, t1: t1, cx: cx, cy: cy };
        }
        function stat(K2, L) { lc2_kid(L, K2.R); jzSetExpr(jzXf(L, 'ADBE Opacity'), K2.SL + 'value*a'); }
        function ring(K2) {
            var Rr = cw * 0.2, ccx = cw * 0.2, ccy = -ch / 2 + cw * 0.3;
            lc2_circ(K2.g, 'ring', ccx, ccy, Rr, C.fill, { stroke: red, sw: Math.max(3 * kx, cw * 0.02) });
            return lc2_T(ctx, first, { font: font, size: Rr * 1.3, x: K2.cx + ccx, y: K2.cy + ccy, color: red });
        }
        function verse(K2, big) {
            var iw = cw * 0.72, ih = big ? ch - cw * 0.72 : ch * 0.8, vo = { vertical: true, lead: 1.3, track: 0.05 };
            var fb = lc2_fitBlock(t0, iw, ih, vo, 3), size = Math.min(fb.size, cw * 0.3), mm = lc2_meas(fb.text, size, vo);
            var y = big ? -ch / 2 + cw * 0.58 + (ih - mm.h) * 0.3 : -mm.h / 2;
            var VV = lc2_V(ctx, fb.text, { font: font, size: size, color: C.text, x: K2.cx, y: K2.cy + y, lead: 1.3, track: 0.05, name: t0 });
            lc2_kid(VV.L, K2.R); lc2_main(ctx, VV.L, K2.t1 + 0.2);
        }
        if (pair) {
            var gap = cw * 0.18, ax = port ? W / 2 : W / 2 + (cw + gap) / 2, ay = port ? H / 2 - (ch + gap) / 2 : H / 2, bx = port ? W / 2 : W / 2 - (cw + gap) / 2, by = port ? H / 2 + (ch + gap) / 2 : H / 2;
            // 読み札 (the verse) + 取り札 (the first glyph + a picture)
            var A = card(0, ax, ay);
            lc2_paint(A.R);
            stat(A, lc2_T(ctx, '読', { font: jzSerifF(ctx), size: cw * 0.1, x: ax + cw * 0.34, y: ay - ch / 2 + cw * 0.16, color: red }));
            verse(A, false);
            var B = card(1, bx, by), aY = ch * 0.12, aw = cw * 0.66, artC = lc2_plate(sc, [sc.accent2, sc.accent, sc.sub], C.fill, 1.3), ga = lc2_sub(B.g, 'picture');
            if (art === 'sun') { lc2_circ(ga, 'sun', 0, aY, aw * 0.26, artC, { op: 90 }); lc2_box(ga, 'horizon', -aw / 2, aY + aw * 0.2, aw, aw * 0.05, C.text, { op: 60 }); }
            else if (art === 'wave') {
                var wl = [];
                for (var j2 = 0; j2 < 3; j2++) { var pts = []; for (i = 0; i <= 20; i++) pts.push([-aw / 2 + aw * i / 20, aY + j2 * aw * 0.14 + Math.sin(i / 20 * Math.PI * 3) * aw * 0.05]); wl.push(pts); }
                lc2_lines2(ga, 'waves', wl, artC, Math.max(3 * kx, aw * 0.03), { op: 90, cap: 2 });
            } else lc2_poly(ga, 'mountain', [[-aw / 2, aY + aw * 0.3], [-aw * 0.1, aY - aw * 0.25], [aw * 0.1, aY + aw * 0.02], [aw * 0.25, aY - aw * 0.12], [aw / 2, aY + aw * 0.3]], artC, { op: 90 });
            var fl = ring(B);
            lc2_paint(B.R);
            stat(B, fl);
            return lc2_box4(ax - cw / 2, ay - ch / 2, ax + cw / 2, ay + ch / 2);
        }
        var S = card(0, W / 2, H / 2), fl2 = ring(S);
        lc2_paint(S.R);
        stat(S, fl2);
        verse(S, true);
        return lc2_box4(W / 2 - cw / 2, H / 2 - ch / 2, W / 2 + cw / 2, H / 2 + ch / 2);
    }
});
