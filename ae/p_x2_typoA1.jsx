// ================================================================ pack x2typoA part 1 (AE port of src/11p_x2_typoA.js): shared helpers + the 15 layouts
// tzWarichu tzHook tzDetail tzAlignSpec tzTrackClose tzAxis tzSlash tzHorizon tzFunnel tzZoomBox tzWideOne tzPointSym tzCanon tzMetric tzPath
//
// Techniques (same as the typo set, ae/p_typo1.jsx — its helpers are repeated here with the atza_ prefix):
// - glyph positions are computed like the browser's layoutText (full-width glyphs = 1 em, latin estimated), and every text
//   layer is anchored on the browser item's origin (atza_text), so rules / marks / labels line up with the AE text.
// - hairlines are shape paths with Trim Paths driven by the browser's easing (drawn from one end, or from the middle outwards).
// - readouts that count while the cut plays are Source Text expressions; moving marks are group-transform expressions.
// - helper graphics the browser draws with ghost off are kept out of the tinted ghosts (jzNoGhost).

var ATZA_CY = 0.38;     // glyph centre above the baseline (em)
// compact expression header for secondary layers: DUR, OS, OD, PO (exit progress), K (exit fade) + easings
var ATZA_FNS = 'function cl(x){return Math.max(0,Math.min(1,x));}function oe(x){x=cl(x);return x>=1?1:1-Math.pow(2,-10*x);}' +
    'function oc(x){x=cl(x);return 1-Math.pow(1-x,3);}function ic(x){x=cl(x);return x*x*x;}function ie(x){x=cl(x);return x<=0?0:Math.pow(2,10*x-10);}' +
    'function ob(x,s){x=cl(x);var c=s+1;return 1+c*Math.pow(x-1,3)+s*Math.pow(x-1,2);}' +
    'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}';
function atza_hd(ctx) {
    var c = ctx.cut, hard = c.outDur != null && c.outDur <= 0, od = hard ? 0.05 : Math.max(0.12, c.outDur || 0.15);
    return 'var DUR=' + jzN(c.dur) + ',OS=' + jzN(hard ? c.dur : c.dur - od) + ',OD=' + jzN(od) + ';' + ATZA_FNS + 'var PO=cl((time-OS)/OD),K=1-ic(PO);\n';
}

/* ---------------------------------------------------------------- small helpers (ports of the browser pack's helpers) */
function atza_k(ctx) { return jzU(ctx) / 1080; }                    // browser design px -> comp px
function atza_port(ctx) { return ctx.W < ctx.H; }
function atza_clean(t) { return String(t || '').replace(/[\s　]+/g, ''); }
function atza_slots(t) { return jzChars(jzTrim(String(t || '')).replace(/[\s　]+/g, ' ')); }
function atza_isSp(c) { return c === ' ' || c === '　'; }
function atza_isSmall(c) { return !!c && 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ'.indexOf(c) >= 0; }
function atza_isLatinT(t) { return /[A-Za-z]/.test(t) && !/[぀-ヿ㐀-鿿＀-￯]/.test(t); }
function atza_roma(t) { var c = atza_clean(t); if (!/[ぁ-ヿ]/.test(c)) return null; var r = jzRomaji(c); return r ? r.toUpperCase() : null; }
function atza_romaCh(ch) { if (!(jzIsHira(ch) || jzIsKata(ch))) return null; var r = jzRomaji(ch); return r ? r : null; }
function atza_p2(n) { return jzPad(n, 2); }
function atza_str(s) { return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'; }
function atza_arr(a) { var s = []; for (var i = 0; i < a.length; i++) s.push(jzN(a[i])); return '[' + s.join(',') + ']'; }
function atza_acc(sc) { return jzContrast(sc.accent, sc.bg) >= 1.8 ? sc.accent : sc.fg; }
function atza_subc(sc) { return jzContrast(sc.sub, sc.bg) >= 1.5 ? sc.sub : sc.fg; }
function atza_onCol(sc, fill) {
    var c = [sc.bg, sc.fg, sc.ink, sc.accent, sc.sub], best = null, bv = 0;
    for (var i = 0; i < c.length; i++) { if (!c[i] || String(c[i]).toUpperCase() === String(fill).toUpperCase()) continue; var k = jzContrast(c[i], fill); if (k > bv) { bv = k; best = c[i]; } }
    return bv >= 2.4 ? best : (jzLum(fill) > 0.5 ? '#111111' : '#FFFFFF');
}
function atza_plateCol(sc, pref) { for (var i = 0; i < pref.length; i++) if (pref[i] && jzContrast(pref[i], sc.bg) >= 1.6) return pref[i]; return sc.fg; }
function atza_hair(ctx) { return Math.max(atza_k(ctx), jzU(ctx) * 0.0014); }
function atza_ls(ctx) { var k = atza_k(ctx); return jzClamp(jzU(ctx) * 0.018, 11 * k, 22 * k); }
// J.splitLines, but never leave a line of punctuation only ('\n' separated)
function atza_splitL(t, per) {
    var ls = String(jzSplitLines(String(t), Math.max(1, per))).split('\r'), out = [], i, j, ok;
    for (i = 0; i < ls.length; i++) {
        var cs = jzChars(ls[i]); ok = out.length > 0;
        for (j = 0; j < cs.length && ok; j++) if (!(jzIsPunct(cs[j]) || cs[j] === ' ')) ok = false;
        if (ok) out[out.length - 1] += ls[i]; else out.push(ls[i]);
    }
    return out.join('\n');
}
// main-text lines for a width budget: portrait -> short lines
function atza_mainLines(text, W, H, perL, perP) {
    var t = jzTrim(String(text || '')), n = jzCount(t), per = W < H ? perP : perL;
    if (n <= per) return t;
    return atza_splitL(t, Math.ceil(n / Math.ceil(n / per)));
}
function atza_okCh(c) { return !!c && !atza_isSp(c) && !atza_isP(c) && !atza_isSmall(c); }
// index of the key glyph: first kanji of the longest kanji run, else the first plain glyph ('mid': the plain glyph nearest the middle)
function atza_keyIndex(arr, mode) {
    var i, j, d;
    if (mode === 'mid') {
        var mid = Math.floor((arr.length - 1) / 2);
        for (d = 0; d < arr.length; d++) { if (atza_okCh(arr[mid + d])) return mid + d; if (mid - d >= 0 && atza_okCh(arr[mid - d])) return mid - d; }
    }
    var best = -1, bl = 0;
    for (i = 0; i < arr.length; i++) {
        if (!jzIsKanji(arr[i])) continue;
        j = i; while (j < arr.length && jzIsKanji(arr[j])) j++;
        if (j - i > bl) { bl = j - i; best = i; }
        i = j;
    }
    if (best >= 0) return best;
    for (i = 0; i < arr.length; i++) if (atza_okCh(arr[i])) return i;
    return 0;
}
// browser groupLines: join units into L lines of similar glyph count
function atza_groupLines(units, L) {
    var lens = [], tot = 0, out = [], cur = '', acc = 0, i;
    for (i = 0; i < units.length; i++) { lens.push(jzCount(units[i])); tot += lens[i]; }
    for (i = 0; i < units.length; i++) {
        cur += units[i]; acc += lens[i];
        var target = tot * (out.length + 1) / L;
        if (out.length < L - 1 && acc >= target - lens[i] * 0.4 && i < units.length - 1) { out.push(jzTrim(cur)); cur = ''; }
    }
    if (jzTrim(cur)) out.push(jzTrim(cur));
    return out;
}
function atza_words(t) { var ws = jzTrim(String(t)).split(/\s+/), out = []; for (var i = 0; i < ws.length; i++) out.push((i ? ' ' : '') + ws[i]); return out; }

/* ---------------------------------------------------------------- text geometry (like the browser's layoutText) */
function atza_mono(font) { return /mono/.test(String(font || '')); }
function atza_adv(ch, mono) {
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
    if (c === 0x2014 || c === 0x2015 || c === 0x2500) return 1;
    if (c < 0x2E80 && c !== 0x2026) return 0.6;
    if (c >= 0xFF61 && c <= 0xFF9F) return 0.5;
    return 1;
}
// glyphs relative to the item origin: { ch, x, y (centre), w, h, li, ci, ti (AE textIndex-1), sp }; .W .H .nL .LD
function atza_lay(str, size, o) {
    o = o || {};
    var tr = o.track || 0, mono = atza_mono(o.font), out = [], ti = 0, j, li, s = String(str).replace(/\r\n|\r/g, '\n');
    if (o.vertical) {
        var arr = jzChars(s.replace(/\n/g, '')), n = arr.length, st = size * (1 + tr), h = n * st - tr * size;
        for (j = 0; j < n; j++) out.push({ ch: arr[j], x: 0, y: -h / 2 + j * st + size / 2, w: size, h: size, li: 0, ci: j, ti: ti++, sp: atza_isSp(arr[j]) });
        out.W = size; out.H = Math.max(size, h); out.nL = 1; out.LD = st;
        return out;
    }
    var lines = s.split('\n'), nL = lines.length, lead = (o.lead || 1.3) * size, maxW = 1;
    for (li = 0; li < nL; li++) {
        var a2 = jzChars(lines[li]), ws = [], w = 0;
        for (j = 0; j < a2.length; j++) { ws.push(atza_adv(a2[j], mono) * size); w += ws[j] + (j < a2.length - 1 ? tr * size : 0); }
        maxW = Math.max(maxW, w);
        var x = o.align === 'left' ? 0 : o.align === 'right' ? -w : -w / 2, y = (li - (nL - 1) / 2) * lead;
        for (j = 0; j < a2.length; j++) { out.push({ ch: a2[j], x: x + ws[j] / 2, y: y, w: ws[j], h: size, li: li, ci: j, ti: ti++, sp: atza_isSp(a2[j]) }); x += ws[j] + tr * size; }
    }
    out.W = maxW; out.H = nL * lead - (lead - size); out.nL = nL; out.LD = lead;
    return out;
}
function atza_meas(str, size, o) { var l = atza_lay(str, size, o); return { w: l.W, h: l.H }; }
function atza_fit(str, font, maxW, maxH, o) { var q = jzCopy(o || {}); q.font = font; var m = atza_meas(str, 100, q); return 100 * Math.min(maxW / Math.max(1, m.w), maxH / Math.max(1, m.h)); }
function atza_tw(str, font, size, track) { return atza_meas(str, size, { font: font, track: track == null ? 0.12 : track }).w; }
// item bbox in comp px (rotation: multiples of 90 only)
function atza_ibb(o) {
    var lay = atza_lay(o.text, o.size, o), x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, i, r = Math.round((o.rot || 0) / 90) % 2 !== 0;
    for (i = 0; i < lay.length; i++) {
        var g = lay[i]; if (g.sp) continue;
        var ax = g.x, ay = g.y, hw = g.w / 2, hh = g.h / 2;
        if (r) { var t = ax; ax = -ay; ay = t; t = hw; hw = hh; hh = t; }
        x0 = Math.min(x0, ax - hw); x1 = Math.max(x1, ax + hw); y0 = Math.min(y0, ay - hh); y1 = Math.max(y1, ay + hh);
    }
    if (x0 > x1) { x0 = x1 = 0; y0 = y1 = 0; }
    return { x0: o.x + x0, x1: o.x + x1, y0: o.y + y0, y1: o.y + y1, cx: o.x + (x0 + x1) / 2, cy: o.y + (y0 + y1) / 2 };
}
// non-space glyph centres in comp px: { ch, x, y, w, h, li, i (non-space order), ti }
function atza_gpts(o) {
    var lay = atza_lay(o.text, o.size, o), out = [];
    for (var i = 0; i < lay.length; i++) { var g = lay[i]; if (g.sp) continue; out.push({ ch: g.ch, x: o.x + g.x, y: o.y + g.y, w: g.w, h: g.h, li: g.li, i: out.length, ti: g.ti }); }
    return out;
}

/* ---------------------------------------------------------------- layer builders */
// a text layer whose browser item origin (o.x, o.y) is the layer position. o: text font size x y align track lead vertical color fill stroke strokeColor alpha rot name
function atza_text(ctx, str, o) {
    var size = o.size, V = !!o.vertical, txt, nL, LD, i;
    if (V) {
        var cs = jzChars(String(str).replace(/[\r\n]/g, ''));
        for (i = 0; i < cs.length; i++) if (cs[i] === ' ') cs[i] = '　';
        txt = cs.join('\r'); nL = cs.length; LD = size * (1 + (o.track || 0));
    } else { txt = String(str).replace(/\r\n|\n/g, '\r'); nL = txt.split('\r').length; LD = size * (o.lead || 1.3); }
    var L = jzText(ctx, txt, { font: o.font, size: size, color: o.color || ctx.sc.fg, x: o.x, y: o.y, align: V ? 'center' : o.align, track: V ? 0 : (o.track || 0), leading: LD,
        fill: o.fill, stroke: o.stroke, strokeColor: o.strokeColor, name: o.name, opacity: o.alpha });
    jzXf(L, 'ADBE Anchor Point').setValue([0, -ATZA_CY * size + (nL - 1) / 2 * LD]);
    jzXf(L, 'ADBE Position').setValue([o.x, o.y]);
    if (o.rot) jzXf(L, 'ADBE Rotate Z').setValue(o.rot);
    return L;
}
// the lyric item: layer + the cut's motion + treatment; returns the bbox (o.L = the layer)
function atza_draw(ctx, o) {
    var L = atza_text(ctx, o.text, o);
    jzAnimate(ctx, L, { mi: o.mi || 0 });
    o.L = L;
    return atza_ibb(o);
}
// opacity factor expression (0..1) on a secondary layer (value keeps the static alpha); the layer leaves the ghosts
function atza_op(ctx, L, f) { jzSetExpr(jzXf(L, 'ADBE Opacity'), atza_hd(ctx) + 'value*cl(' + f + ')'); jzNoGhost(L); return L; }
// small annotation label (main pass only); o: font size align track color alpha op (opacity factor expression)
function atza_label(ctx, text, x, y, o) {
    o = o || {};
    var L = atza_text(ctx, String(text), { font: o.font || jzMonoF(ctx), size: o.size || atza_ls(ctx), x: x, y: y, align: o.align || 'left', track: o.track != null ? o.track : 0.12,
        color: o.color || ctx.sc.sub, alpha: o.alpha, name: o.name || ('label ' + String(text).substr(0, 20)) });
    jzNoGhost(L);
    if (o.op) atza_op(ctx, L, o.op);
    return L;
}
// many labels in ONE text layer: strs[j] is placed with its reference point at pts[j] (align: left edge / centre / right edge, vertical centre)
// returns { L, li: line index per AE glyph (textIndex-1) }
function atza_multi(ctx, strs, pts, o) {
    var size = o.size, LD = size * 1.2, li = [], offs = [], j, k;
    var L = jzText(ctx, strs.join('\r'), { font: o.font || jzMonoF(ctx), size: size, color: o.color || ctx.sc.sub, x: 0, y: 0, align: o.align || 'center', track: o.track != null ? o.track : 0.12,
        leading: LD, name: o.name || 'labels', opacity: o.alpha });
    jzXf(L, 'ADBE Anchor Point').setValue([0, 0]); jzXf(L, 'ADBE Position').setValue([0, 0]);
    for (j = 0; j < strs.length; j++) {
        var cs = jzChars(strs[j]);
        for (k = 0; k < cs.length; k++) { li.push(j); offs.push([pts[j][0], pts[j][1] + ATZA_CY * size - j * LD]); }
    }
    if (offs.length) jzCharOffsets(L, offs, 'JZ Place');
    jzNoGhost(L);
    return { L: L, li: li };
}
// per-glyph fade of an atza_multi layer: a = factor expression using j (the label's index), e.g. 'oc((time-0.2-j*0.05)/0.3)*K'
function atza_multiFade(ctx, M, a, extra) {
    jzAnimator(M.L, 'JZ Label Fade', [['ADBE Text Opacity', 0]], atza_hd(ctx) + 'var LI=' + atza_arr(M.li) + ';var j=LI[textIndex-1]||0;' + (extra || '') + '(1-cl(' + a + '))*100');
}
// shape layer at 0,0 with one group of polylines; o: width alpha trim start closed fill dash gop op name ghost
function atza_lines(ctx, name, segs, col, o) {
    o = o || {};
    var S = jzShapeLayer(ctx, name, 0, 0);
    atza_grp(S, name, segs, col, o);
    if (o.op) atza_op(ctx, S, o.op);
    if (!o.ghost) jzNoGhost(S);
    return S;
}
// one group (finished before the caller adds the next one)
function atza_grp(S, name, segs, col, o) {
    var g = jzGrp(S, name), i;
    for (i = 0; i < segs.length; i++) jzAddPath(g, segs[i], !!o.closed);
    if (o.fill) jzAddFill(g, o.fill, o.fillOp);
    if (col) {
        var st = jzAddStroke(g, col, o.width || 1, (o.alpha != null ? o.alpha : 1) * 100);
        if (o.dash) {
            var D = st.property('ADBE Vector Stroke Dashes');
            D.addProperty('ADBE Vector Stroke Dash 1').setValue(o.dash[0]);
            D.addProperty('ADBE Vector Stroke Gap 1').setValue(o.dash[1]);
        }
    }
    if (o.trim || o.start) jzAddTrimPaths(g, o.trim, o.start);
    if (o.gop) jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), o.gop);
    if (o.gsc) { jzGX(g).property('ADBE Vector Anchor').setValue(o.anc || o.piv); jzGX(g).property('ADBE Vector Position').setValue(o.piv); jzSetExpr(jzGX(g).property('ADBE Vector Scale'), o.gsc); }
    if (o.gpos) jzSetExpr(jzGX(g).property('ADBE Vector Position'), o.gpos);
}
// filled rectangle (x0, y0 top-left) in a group; o.piv / o.gsc scale about a pivot
function atza_rectGrp(S, name, x0, y0, w, h, col, o) {
    o = o || {};
    var g = jzGrp(S, name);
    jzAddRect(g, w, h, 0, x0 + w / 2, y0 + h / 2);
    jzAddFill(g, col, o.fillOp);
    if (o.gop) jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), o.gop);
    if (o.gsc) { jzGX(g).property('ADBE Vector Anchor').setValue(o.piv); jzGX(g).property('ADBE Vector Position').setValue(o.piv); jzSetExpr(jzGX(g).property('ADBE Vector Scale'), o.gsc); }
    if (o.gpos) jzSetExpr(jzGX(g).property('ADBE Vector Position'), o.gpos);
}

/* ---------------------------------------------------------------- helpers of this pack only */
function atza_isP(c) { return !!c && (jzIsPunct(c) || c === 'ー'); }        // the browser's J.isPunct also counts the long-vowel mark
function atza_sgn(x) { return x > 0 ? 1 : (x < 0 ? -1 : 0); }
// the browser's deterministic hash J.h / J.r / J.rs (random placements match the web frame)
function atza_h(a, b, c, d, e) {
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
function atza_r(a, b, c, d, e) { return atza_h(a, b, c, d, e) / 4294967296; }
function atza_rs(a, b, c, d, e) { return atza_r(a, b, c, d, e) * 2 - 1; }
// 'U+XXXX' of a glyph
function atza_ucode(ch) {
    var c = ch.charCodeAt(0);
    if (c >= 0xD800 && c <= 0xDBFF && ch.length > 1) c = (c - 0xD800) * 0x400 + (ch.charCodeAt(1) - 0xDC00) + 0x10000;
    var s = c.toString(16).toUpperCase(); while (s.length < 4) s = '0' + s;
    return 'U+' + s;
}
function atza_rectPts(x0, y0, x1, y1) { return [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]; }
// word-like units of the cut text (latin: words with their leading space; Japanese: chunks with particles glued on)
function atza_glue(u) {
    var out = [], i;
    for (i = 0; i < u.length; i++) {
        var w = String(u[i]), a = jzChars(jzTrim(w)), c0 = a[0];
        if (out.length && c0 != null && (atza_isP(c0) || atza_isSmall(c0) || (a.length === 1 && 'はがをにでとのへもてだねよ'.indexOf(c0) >= 0))) out[out.length - 1] += w; else out.push(w);
    }
    return out;
}
// glyph units that never start with punctuation / small kana (for breaking anywhere)
function atza_charUnits(txt) {
    var out = [], cs = jzChars(atza_clean(txt)), i;
    for (i = 0; i < cs.length; i++) { if (out.length && (atza_isP(cs[i]) || atza_isSmall(cs[i]))) out[out.length - 1] += cs[i]; else out.push(cs[i]); }
    return out;
}
function atza_unitsOf(cut, want) {
    var txt = jzTrim(String(cut.text || '')), a = [], b = [], src, i;
    want = want || 2;
    if (atza_isLatinT(txt)) return atza_words(txt);
    src = cut.words || [];
    for (i = 0; i < src.length; i++) if (jzTrim(String(src[i]))) a.push(String(src[i]));
    a = atza_glue(a);
    if (a.length >= want) return a;
    src = jzChunk(txt) || [];
    for (i = 0; i < src.length; i++) if (jzTrim(String(src[i]))) b.push(String(src[i]));
    b = atza_glue(b);
    if (b.length >= want) return b;
    var cu = atza_charUnits(txt);
    return cu.length >= Math.max(a.length, b.length) ? cu : (b.length > a.length ? b : a);
}
// group units into lines at cumulative glyph fractions fr (last = 1)
function atza_groupFr(units, fr) {
    var lens = [], tot = 0, out = [], cur = '', acc = 0, i;
    for (i = 0; i < units.length; i++) { lens.push(jzCount(units[i])); tot += lens[i]; }
    for (i = 0; i < units.length; i++) {
        cur += units[i]; acc += lens[i];
        if (out.length < fr.length - 1 && i < units.length - 1 && acc >= tot * fr[out.length] - lens[i + 1] * 0.5) { out.push(jzTrim(cur)); cur = ''; }
    }
    if (jzTrim(cur)) out.push(jzTrim(cur));
    return out;
}
function atza_evenFr(L) { var o = [], i; for (i = 0; i < L; i++) o.push((i + 1) / L); return o; }
function atza_fontD(ctx) { return jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')); }
// the whole text as one centred block (fallback of several layouts)
function atza_fb(ctx, t, font, maxW, maxH, maxS, tr) {
    return atza_draw(ctx, { text: t, font: font, size: Math.min(atza_fit(t, font, maxW, maxH, { track: tr || 0 }), maxS), x: ctx.W / 2, y: ctx.H / 2, track: tr || 0, color: ctx.sc.fg });
}
// track matte: L shows only inside Mt, which goes directly above L (AE 23+ links mattes with setTrackMatte)
function atza_matte(L, Mt, type) {
    var ok = false;
    Mt.moveBefore(L);
    if (typeof L.setTrackMatte === 'function') { try { L.setTrackMatte(Mt, type); ok = true; } catch (e) { ok = false; } }
    if (!ok) { try { L.trackMatteType = type; } catch (e2) { jzWarn('matte: ' + e2.toString()); } }
    try { Mt.enabled = false; } catch (e3) {}
}
function atza_srcText(L, ex) { try { L.property('ADBE Text Properties').property('ADBE Text Document').expression = ex; } catch (e) { jzWarn('source text: ' + e.toString()); } }
// trim options: a line drawn from its start (e) / from its middle outwards (c)
function atza_te(hd, e) { return hd + '100*' + e; }

/* ================================================================ 1 tzWarichu — 割り書き */
jzReg('layout', 'tzWarichu', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), fs: rng.pick(jzFontsOf(st, ['serif', 'body', 'display'])), lead: rng.chance(0.3), mark: rng.pick(['paren', 'paren', 'rule', 'none']), acc: rng.chance(0.4), ratio: rng.range(0.38, 0.5) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), i;
        var font = atza_fontD(ctx), fs = jzP(ctx, 'fs', jzSerifF(ctx)), lead = !!jzP(ctx, 'lead', false), mark = jzP(ctx, 'mark', 'paren'), ratio = jzP(ctx, 'ratio', 0.44);
        var units = atza_unitsOf(c, 2), tot = 0;
        for (i = 0; i < units.length; i++) tot += jzCount(units[i]);
        var parts = atza_groupFr(units, [lead ? 1 - ratio : ratio, 1]);
        if (parts.length < 2) return atza_fb(ctx, jzTrim(String(c.text)), font, W * 0.8, H * 0.5, M * 0.3, 0);
        var big = lead ? parts[1] : parts[0], small = lead ? parts[0] : parts[1], nS = jzCount(small), st2 = small;
        if (atza_isLatinT(small)) { var ws = atza_words(small); if (ws.length >= 2) st2 = atza_groupFr(ws, [0.5, 1]).join('\n'); }
        else if (nS >= 2) st2 = atza_splitL(small, Math.ceil(nS / 2));
        var two = st2.indexOf('\n') >= 0, kS = two ? 0.44 : 0.5;
        var wb = atza_meas(big, 100, { font: font, track: 0.02 }).w, ms = atza_meas(st2, 100 * kS, { font: fs, lead: 1.14, track: 0.04 });
        var gap = 16, padB = mark === 'paren' ? 12 : 0, total = wb + gap + ms.w + padB * 2;
        var S = Math.min(M * 0.32, W * 0.86 / total * 100, H * 0.5), k = S / 100;
        var x0 = W / 2 - total * k / 2, cy = H / 2;
        var xBig = lead ? x0 + (ms.w + padB * 2 + gap) * k : x0, xS = lead ? x0 + padB * k : x0 + (wb + gap + padB) * k;
        var lw = atza_hair(ctx), ls = atza_ls(ctx), hd = atza_hd(ctx), e = 'oe((time-0.18)/0.6)*K';
        var bb = atza_draw(ctx, { text: big, font: font, size: S, align: 'left', x: xBig, y: cy, track: 0.02, color: sc.fg, mi: lead ? 3 : 0 });
        bb = jzUnion(bb, atza_draw(ctx, { text: st2, font: fs, size: S * kS, align: 'left', x: xS, y: two ? cy + S * 0.01 : cy + S * 0.2, color: jzP(ctx, 'acc', false) ? atza_acc(sc) : sc.fg, mi: lead ? 0 : 3, lead: 1.14, track: 0.04 }));
        var xa = xS - padB * 0.55 * k, xb = xS + ms.w * k + padB * 0.55 * k, t = S * 0.07, hh = S * 0.47, G;
        if (mark === 'paren') {        // square brackets round the note, opening from the middle
            G = jzShapeLayer(ctx, 'note brackets', 0, 0);
            atza_grp(G, 'brackets', [[[xa + t, cy - hh], [xa, cy - hh], [xa, cy + hh], [xa + t, cy + hh]], [[xb - t, cy - hh], [xb, cy - hh], [xb, cy + hh], [xb - t, cy + hh]]], sc.sub,
                { width: lw, alpha: 0.85, piv: [W / 2, cy], gsc: hd + '[100,100*' + e + ']' });
            jzNoGhost(G);
        } else if (mark === 'rule') {
            var y = cy + S * 0.62, xm = lead ? xBig - gap * k / 2 : xS - gap * k / 2;
            G = jzShapeLayer(ctx, 'note rule', 0, 0);
            atza_grp(G, 'rule', [[[x0, y], [x0 + total * k, y]]], sc.sub, { width: lw, alpha: 0.7, trim: atza_te(hd, e) });
            atza_grp(G, 'tick', [[[xm, y], [xm, y - S * 0.12]]], sc.sub, { width: lw, alpha: 0.7, trim: atza_te(hd, e) });
            jzNoGhost(G);
        }
        var nB = tot - nS;
        atza_label(ctx, lead ? atza_p2(nS) + ' : ' + atza_p2(nB) : atza_p2(nB) + ' : ' + atza_p2(nS), xS, cy + S * 0.62 + ls * 1.2, { size: ls * 0.85, alpha: 0.9, op: e });
        return bb;
    }
});

/* ================================================================ 2 tzHook — 鉤組 */
jzReg('layout', 'tzHook', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), mode: rng.pick(['kanji', 'mid', 'mid']), flip: rng.chance(0.4), key: rng.pick(['accent', 'accent', 'fg']), ext: rng.chance(0.75) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), font = atza_fontD(ctx), flip = !!jzP(ctx, 'flip', false), ext = !!jzP(ctx, 'ext', true);
        var arr = atza_slots(c.text), n = arr.length, lw = atza_hair(ctx), ls = atza_ls(ctx), hd = atza_hd(ctx), e = 'oe((time-0.12)/0.7)*K', i, d;
        var kc = jzP(ctx, 'key', 'accent') === 'accent' ? atza_acc(sc) : sc.fg, G, bb = null, size, k, left, top, g, tt = atza_te(hd, e);
        if (n < 2) return atza_draw(ctx, { text: arr.join(''), font: font, size: M * 0.3, x: W / 2, y: H / 2, color: sc.fg });
        if (atza_isLatinT(c.text)) {       // latin: the line runs right and the rest turns 90° down (or down, then right at the foot)
            var ws = atza_unitsOf(c, 2), tr = 0.04, parts = atza_groupFr(ws, [(W >= H) !== flip ? 0.62 : 0.4, 1]);
            if (parts.length < 2) return atza_fb(ctx, parts[0] || '', font, W * 0.8, H * 0.5, M * 0.24, tr);
            var hT = flip ? parts[1] : parts[0], vT = flip ? parts[0] : parts[1];
            var wH = atza_meas(hT, 100, { font: font, track: tr }).w, wV = atza_meas(vT, 100, { font: font, track: tr }).w;
            g = 34;
            var totW = wH + g + 100, totH = Math.max(100, wV);
            size = Math.min(W * 0.84 / totW * 100, H * 0.82 / totH * 100, M * 0.2); k = size / 100;
            left = W / 2 - totW * k / 2; top = H / 2 - totH * k / 2;
            var vx = flip ? left + size / 2 : left + totW * k - size / 2, vy = top + wV * k / 2;
            var hy = flip ? top + wV * k - size / 2 : top + size / 2, hx = flip ? left + size + g * k : left;
            if (ext) {
                G = jzShapeLayer(ctx, 'hook lines', 0, 0);
                if (!flip) {
                    atza_grp(G, 'onward', [[[vx + size * 0.6, hy], [Math.max(vx + size * 0.6, W * 0.96), hy]]], sc.sub, { width: lw, alpha: 0.32, trim: tt });
                    atza_grp(G, 'side', [[[vx - size * 0.62, top - size * 0.1], [vx - size * 0.62, top + wV * k + size * 0.1]]], sc.sub, { width: lw, alpha: 0.6, trim: tt });
                } else {
                    atza_grp(G, 'onward', [[[vx, top + wV * k + size * 0.15], [vx, Math.max(top + wV * k + size * 0.15, H * 0.96)]]], sc.sub, { width: lw, alpha: 0.32, trim: tt });
                    atza_grp(G, 'side', [[[hx, hy - size * 0.66], [hx + wH * k, hy - size * 0.66]]], sc.sub, { width: lw, alpha: 0.6, trim: tt });
                }
                jzNoGhost(G);
            }
            atza_label(ctx, '90°', flip ? vx + size * 0.7 : vx - size * 0.75, flip ? top + ls * 0.6 : top + wV * k - ls * 0.3, { size: ls * 0.85, align: flip ? 'left' : 'right', alpha: 0.9, op: e });
            var bH = atza_draw(ctx, { text: hT, font: font, size: size, track: tr, align: 'left', x: hx, y: hy, color: sc.fg, mi: flip ? 3 : 0 });
            atza_draw(ctx, { text: vT, font: font, size: size, track: tr, x: vx, y: vy, rot: 90, color: flip ? sc.fg : kc, mi: flip ? 0 : 3 });
            return jzUnion(bH, { x0: vx - size / 2, x1: vx + size / 2, y0: top, y1: top + wV * k, cx: vx, cy: vy });
        }
        var ki = atza_keyIndex(arr, jzP(ctx, 'mode', 'mid'));
        // the turning glyph must have text on both sides; balance the two arms against the frame
        var want = jzClamp(Math.round((n - 1) * (W >= H ? (flip ? 0.3 : 0.62) : (flip ? 0.6 : 0.34))), 1, Math.max(1, n - 2));
        if (ki < 1 || ki > n - 2 || Math.abs(ki - want) > Math.max(1, n * 0.25)) {
            ki = -1;
            for (d = 0; d < n && ki < 0; d++) { var cd = [want + d, want - d]; for (i = 0; i < 2; i++) if (ki < 0 && cd[i] >= 1 && cd[i] <= n - 2 && atza_okCh(arr[cd[i]])) ki = cd[i]; }
            if (ki < 0) ki = Math.min(n - 1, Math.max(1, want));
        }
        var tr2 = 0.06, A = jzTrim(arr.slice(0, ki).join('')), Kc = arr[ki], B = jzTrim(arr.slice(ki + 1).join(''));
        var vA = A.replace(/\s+/g, '　'), vB = B.replace(/\s+/g, '　');
        var wOf = function (s) { return s ? atza_meas(s, 100, { font: font, track: tr2 }).w : 0; };
        var hOf = function (s) { return s ? atza_meas(s, 100, { font: font, track: tr2, vertical: true }).h : 0; };
        var kw = Math.max(60, wOf(Kc));
        g = 100 * tr2 + 6;
        var armW = flip ? wOf(B) : wOf(A), armH = flip ? hOf(vA) : hOf(vB);
        var totW2 = kw + (armW ? armW + g : 0), totH2 = 100 + (armH ? armH + g : 0);
        size = Math.min(W * 0.84 / totW2 * 100, H * 0.84 / totH2 * 100, M * 0.22); k = size / 100;
        left = W / 2 - totW2 * k / 2; top = H / 2 - totH2 * k / 2;
        var kx = flip ? left + kw * k / 2 : left + totW2 * k - kw * k / 2, ky = flip ? top + totH2 * k - size / 2 : top + size / 2, hb = size * 0.58;
        G = jzShapeLayer(ctx, 'hook lines', 0, 0);
        if (ext) {     // where the line would have gone on
            if (!flip) {
                atza_grp(G, 'onward', [[[kx + hb, ky], [Math.max(kx + hb, W * 0.96), ky]]], sc.sub, { width: lw, alpha: 0.32, trim: tt });
                atza_grp(G, 'upward', [[[kx, ky - hb], [kx, Math.min(ky - hb, H * 0.04)]]], sc.sub, { width: lw, alpha: 0.32, trim: tt });
            } else {
                atza_grp(G, 'onward', [[[kx - hb, ky], [Math.min(kx - hb, W * 0.04), ky]]], sc.sub, { width: lw, alpha: 0.32, trim: tt });
                atza_grp(G, 'downward', [[[kx, ky + hb], [kx, Math.max(ky + hb, H * 0.96)]]], sc.sub, { width: lw, alpha: 0.32, trim: tt });
            }
        }
        atza_grp(G, 'turn box', [atza_rectPts(kx - hb, ky - hb, kx + hb, ky + hb)], sc.sub, { width: lw, alpha: 0.8, trim: tt });
        jzNoGhost(G);
        atza_label(ctx, atza_p2(ki + 1) + ' ⁄ 90°', flip ? kx - hb : kx + hb, flip ? ky + hb + ls : ky - hb - ls, { size: ls * 0.85, align: flip ? 'left' : 'right', alpha: 0.9, op: e });
        if (!flip) {
            if (A) bb = jzUnion(bb, atza_draw(ctx, { text: A, font: font, size: size, track: tr2, color: sc.fg, align: 'right', x: kx - kw * k / 2 - g * k, y: ky, mi: 0 }));
            bb = jzUnion(bb, atza_draw(ctx, { text: Kc, font: font, size: size, track: tr2, color: kc, x: kx, y: ky, mi: 2 }));
            if (vB) bb = jzUnion(bb, atza_draw(ctx, { text: vB, font: font, size: size, track: tr2, color: sc.fg, vertical: true, x: kx, y: ky + size / 2 + g * k + armH * k / 2, mi: 4 }));
        } else {
            if (vA) bb = jzUnion(bb, atza_draw(ctx, { text: vA, font: font, size: size, track: tr2, color: sc.fg, vertical: true, x: kx, y: top + armH * k / 2, mi: 0 }));
            bb = jzUnion(bb, atza_draw(ctx, { text: Kc, font: font, size: size, track: tr2, color: kc, x: kx, y: ky, mi: 2 }));
            if (B) bb = jzUnion(bb, atza_draw(ctx, { text: B, font: font, size: size, track: tr2, color: sc.fg, align: 'left', x: kx + kw * k / 2 + g * k, y: ky, mi: 4 }));
        }
        return bb;
    }
});

/* ================================================================ 3 tzDetail — 部分拡大 */
jzReg('layout', 'tzDetail', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), fm: rng.pick(jzFontsOf(st, ['serif', 'body', 'display'])), side: rng.pick(['a', 'b']), style: rng.pick(['solid', 'solid', 'accent', 'outline']), drift: rng.pick([1, -1]) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), port = W < H, txt = jzTrim(String(c.text)), arr = jzChars(atza_clean(txt)), kk = atza_k(ctx);
        var font = atza_fontD(ctx), fm = jzP(ctx, 'fm', jzSerifF(ctx)), a = jzP(ctx, 'side', 'a') === 'a', style = jzP(ctx, 'style', 'solid'), drift = jzP(ctx, 'drift', 1);
        var Kc = arr[atza_keyIndex(arr, 'kanji')] || '・', G, gx, gy, it, pe, mt = atza_mainLines(txt, W, H, 6, 6), o = { lead: 1.24, track: 0.04 }, sg = a ? -1 : 1, hd = atza_hd(ctx);
        var mot = ctx.fx.motion != null ? ctx.fx.motion : 0.7;
        if (!port) {
            G = Math.min(H * 1.3, W * 0.72); gx = a ? W * 0.47 - G / 2 : W * 0.53 + G / 2; gy = H * 0.5;
            it = { text: mt, font: fm, size: Math.min(atza_fit(mt, fm, W * 0.38, H * 0.56, o), M * 0.125), align: 'left', x: a ? W * 0.55 : W * 0.07, y: H / 2, color: sc.fg, lead: 1.24, track: 0.04 };
            pe = '[value[0]+' + jzN(sg * G * 0.14) + '*g,value[1]+' + jzN(drift * G * 0.02) + '*(u-0.5)]';
        } else {
            G = Math.min(W * 1.2, H * 0.6); gy = a ? H * 0.5 - G / 2 : H * 0.5 + G / 2; gx = W * 0.5 - drift * W * 0.06;
            it = { text: mt, font: fm, size: Math.min(atza_fit(mt, fm, W * 0.84, H * 0.3, o), W * 0.15), align: 'left', x: W * 0.08, y: a ? H * 0.74 : H * 0.26, color: sc.fg, lead: 1.24, track: 0.04 };
            pe = '[value[0]+' + jzN(drift * G * 0.02) + '*(u-0.5),value[1]+' + jzN(sg * G * 0.14) + '*g]';
        }
        // the key glyph blown up and cut by the frame: slides in from its edge, drifts a little, slides back out with the exit
        var gi = { text: Kc, font: font, size: G, x: gx, y: gy, color: style === 'accent' ? atza_acc(sc) : sc.fg, name: 'detail glyph' };
        if (style === 'outline') { gi.fill = false; gi.stroke = Math.max(2 * kk, G * 0.009); gi.strokeColor = sc.fg; }
        var GL = atza_text(ctx, Kc, gi);
        jzSetExpr(jzXf(GL, 'ADBE Position'), hd + 'var g=(1-oe(time/0.8))+ic(PO),u=cl(time/' + jzN(Math.max(0.5, c.dur)) + ')*' + jzN(mot) + ';' + pe);
        atza_op(ctx, GL, 'cl(oe(time/0.8)*1.4)*(1-ic(PO))');
        var bb = atza_draw(ctx, it), m = atza_meas(it.text, it.size, it), ls = atza_ls(ctx), la = 'oc((time-0.3)/0.35)*K';
        var ty = it.y - m.h / 2 - ls * 1.7, xa = it.x + ls * 4.2;
        atza_label(ctx, '×' + (G / it.size).toFixed(1), it.x, ty, { color: atza_acc(sc), op: la });
        atza_lines(ctx, 'detail rule', [[[xa, ty], [xa + Math.max(ls * 2, Math.min(m.w - ls * 4.2, W * 0.3)), ty]]], sc.sub, { width: atza_hair(ctx), alpha: 0.7, trim: hd + '100*oe((time-0.3)/0.6)', op: la });
        atza_label(ctx, atza_ucode(Kc), it.x, it.y + m.h / 2 + ls * 1.5, { size: ls * 0.85, alpha: 0.8, op: la });
        return bb;
    }
});

/* ================================================================ 4 tzAlignSpec — 揃え見本 */
jzReg('layout', 'tzAlignSpec', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), row: rng.int(0, 2), other: rng.pick(['outline', 'outline', 'dim']), acc: rng.chance(0.4) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), port = W < H, txt = jzTrim(String(c.text)).replace(/[\s　]+/g, ' '), kk = atza_k(ctx);
        var font = atza_fontD(ctx), row = jzP(ctx, 'row', 1), other = jzP(ctx, 'other', 'outline');
        var Wb = port ? W * 0.86 : W * 0.72, leadK = 1.75, tr = 0.03;
        var size = Math.min(atza_fit(txt, font, Wb * 0.64, 1e6, { track: tr }), M * 0.15, H * 0.62 / (3 * leadK));
        var x0 = W / 2 - Wb / 2, x1 = W / 2 + Wb / 2, lw = atza_hair(ctx), ls = atza_ls(ctx) * 0.85, hd = atza_hd(ctx), bb = null, i;
        var names = ['FLUSH LEFT', 'CENTERED', 'FLUSH RIGHT'], al = ['left', 'center', 'right'], e0 = 'oe(time/0.7)*K', hh = size * leadK + size * 0.95;
        var G = jzShapeLayer(ctx, 'specimen rules', 0, 0);
        atza_grp(G, 'margins', [[[x0, H / 2 - hh], [x0, H / 2 + hh]], [[x1, H / 2 - hh], [x1, H / 2 + hh]]], sc.sub, { width: lw, alpha: 0.8, trim: hd + '50+50*' + e0, start: hd + '50-50*' + e0 });
        for (i = 0; i < 3; i++) {
            var yb = H / 2 + (i - 1) * size * leadK + size * 0.64, fromR = i === 2;
            atza_grp(G, 'base ' + (i + 1), [[[fromR ? x1 : x0, yb], [fromR ? x0 : x1, yb]]], sc.sub, { width: lw, alpha: 0.4, trim: hd + '100*oe((time-' + jzN(0.08 + i * 0.1) + ')/0.6)*K' });
        }
        jzNoGhost(G);
        for (i = 0; i < 3; i++) {
            var y = H / 2 + (i - 1) * size * leadK, e = 'oe((time-' + jzN(0.08 + i * 0.1) + ')/0.6)*K';
            var it = { text: txt, font: font, size: size, track: tr, y: y, align: al[i], x: i === 0 ? x0 + size * 0.1 : i === 1 ? W / 2 : x1 - size * 0.1, name: 'specimen ' + names[i] };
            if (i === row) { it.color = jzP(ctx, 'acc', false) ? atza_acc(sc) : sc.fg; it.mi = 0; bb = atza_draw(ctx, it); }
            else if (other === 'outline') {      // the browser draws the outline on; here it fades in
                it.fill = false; it.stroke = Math.max(1.2 * kk, size * 0.012); it.strokeColor = sc.sub; it.color = sc.sub; it.alpha = 0.85;
                atza_op(ctx, atza_text(ctx, txt, it), 'cl((time-' + jzN(0.1 + i * 0.1) + ')/0.7)*K');
            } else { it.color = jzMixHex(sc.bg, sc.fg, 0.22); atza_op(ctx, atza_text(ctx, txt, it), e); }
            atza_label(ctx, atza_p2(i + 1) + ' ' + names[i], i === 0 ? x1 - ls * 0.5 : x0 + ls * 0.5, y + size * 0.64 - ls * 0.95,
                { size: ls, align: i === 0 ? 'right' : 'left', color: i === row ? atza_acc(sc) : sc.sub, alpha: i === row ? 1 : 0.7, op: e });
        }
        return bb;
    }
});

/* ================================================================ 5 tzTrackClose — 詰まる字間 */
jzReg('layout', 'tzTrackClose', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif', 'body'])), mode: rng.pick(['close', 'close', 'open']), ticks: rng.chance(0.8), jp: rng.chance(0.5) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), txt = jzTrim(String(c.text)), font = atza_fontD(ctx), open = jzP(ctx, 'mode', 'close') === 'open';
        var lines = atza_mainLines(txt, W, H, 14, 6).split('\n'), L = lines.length, leadK = 1.6, li, j;
        var size = Math.min(M * 0.19, H * 0.68 / (L * leadK));
        for (li = 0; li < L; li++) size = Math.min(size, atza_fit(lines[li], font, W * 0.66, 1e6, { track: 0.02 }));
        var T = jzClamp(c.dur * 0.55, 0.5, 1.6), span = W * 0.88 - size, lw = atza_hair(ctx), ls = atza_ls(ctx), ac = atza_acc(sc), hd = atza_hd(ctx);
        // u: 0 = spread across the frame, 1 = tight
        var X = hd + 'var q=ioc((time-0.1)/' + jzN(T) + '),u=' + (open ? '1-q' : 'q') + ';';
        var bb = null, gi = 0, C0 = 0, gotC = false, cc = size * 0.09, dd = open ? -1 : 1;
        for (li = 0; li < L; li++) {
            var y = H / 2 + (li - (L - 1) / 2) * size * leadK - (L > 1 ? 0 : size * 0.05);
            var lay = atza_lay(lines[li], size, { font: font, track: 0.02, align: 'center' }), gl = [], offs = [], sp = [], last = 0, Kmax = 1, nj = 0;
            for (j = 0; j < lay.length; j++) if (!lay[j].sp) gl.push(lay[j]);
            var m = gl.length;
            if (!m) continue;
            for (j = 0; j < lay.length; j++) {
                if (!lay[j].sp) { var s0 = m > 1 ? (nj / (m - 1) - 0.5) * span : 0; sp.push(s0); last = s0 - lay[j].x; nj++; }
                offs.push(last); Kmax = Math.max(Kmax, Math.abs(last));
            }
            // one text layer per line; a Position animator spreads its glyphs and lets them close up (or the reverse)
            var Lt = atza_text(ctx, lines[li], { font: font, size: size, track: 0.02, x: W / 2, y: y, color: sc.fg });
            jzAnimator(Lt, 'JZ Tracking', [['ADBE Text Position 3D', [Kmax, 0, 0]]], X + 'var a=' + atza_arr(offs) + ';(a[textIndex-1]||0)*(1-u)/' + jzN(Kmax) + '*100');
            jzAnimate(ctx, Lt, { mi: gi }); gi += m;
            var hs = m > 1 ? span / 2 : 0, ht = (gl[m - 1].x - gl[0].x) / 2, ct = (gl[0].x + gl[m - 1].x) / 2, hx = (open ? hs : ht) + size / 2;
            bb = jzUnion(bb, { x0: W / 2 - hx, x1: W / 2 + hx, y0: y - size / 2, y1: y + size / 2, cx: W / 2, cy: y });
            var e = 'oe((time-' + jzN(0.05 + li * 0.08) + ')/0.6)*K', yb = y + size * 0.68, off = jzN(size * 0.28);
            var HX = 'var hx=' + jzN(hs) + '+' + jzN(ht - hs) + '*u+' + jzN(size * 0.5) + ',cx=' + jzN(W / 2) + '+' + jzN(ct) + '*u;';
            var G = jzShapeLayer(ctx, 'tracking rule ' + (li + 1), 0, 0);
            atza_grp(G, 'rule', [[[-1000, 0], [1000, 0]]], sc.sub, { width: lw, alpha: 0.6, piv: [W / 2, yb], anc: [0, 0], gsc: X + HX + '[hx*cl(' + e + ')/10,100]', gpos: X + HX + '[cx,' + jzN(yb) + ']' });
            // chevrons pointing the way the tracking moves
            atza_grp(G, 'chevron L', [[[-cc * dd, -cc], [0, 0], [-cc * dd, cc]]], ac, { width: lw * 1.4, gpos: X + HX + '[cx-hx-' + off + ',' + jzN(y) + ']', gop: X + HX + '(cx-hx-' + off + ')>' + jzN(W * 0.03) + '?100*cl(' + e + '):0' });
            atza_grp(G, 'chevron R', [[[cc * dd, -cc], [0, 0], [cc * dd, cc]]], ac, { width: lw * 1.4, gpos: X + HX + '[cx+hx+' + off + ',' + jzN(y) + ']', gop: X + HX + '(cx+hx+' + off + ')<' + jzN(W * 0.97) + '?100*cl(' + e + '):0' });
            jzNoGhost(G);
            if (jzP(ctx, 'ticks', true)) {       // a tick under every glyph, riding with it
                var Gt = jzShapeLayer(ctx, 'tracking ticks ' + (li + 1), 0, 0);
                for (j = 0; j < m; j++) atza_grp(Gt, 'tick ' + (j + 1), [[[0, 0], [0, cc]]], sc.sub, { width: lw, alpha: 0.7, gpos: X + '[' + jzN(W / 2 + sp[j]) + '+' + jzN(gl[j].x - sp[j]) + '*u,' + jzN(yb) + ']' });
                atza_op(ctx, Gt, e);
            }
            if (!gotC && li === 0 && m > 1) { C0 = (span - (gl[m - 1].x - gl[0].x)) / (m - 1) / size * 1000; gotC = true; }
        }
        if (!bb) return null;
        var latin = atza_isLatinT(txt) || !jzP(ctx, 'jp', false), word = latin ? 'TRACKING' : '字送り';
        var R = atza_label(ctx, word + '  +000', W / 2, H / 2 + ((L - 1) / 2) * size * leadK + size * 0.68 + ls * 1.7, { size: ls * 0.9, align: 'center', font: latin ? jzMonoF(ctx) : jzBodyF(ctx), op: 'oc((time-0.1)/0.3)*K', name: 'tracking readout' });
        atza_srcText(R, X + 'var v=Math.max(0,Math.round((1-u)*' + jzN(C0) + '));var s=String(v);while(s.length<3)s="0"+s;' + atza_str(word + '  +') + '+s');
        return bb;
    }
});

/* ================================================================ 6 tzAxis — 軸組 */
jzReg('layout', 'tzAxis', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), first: rng.chance(0.5), axis: rng.pick(['sub', 'sub', 'accent']), idx: rng.chance(0.7), acc: rng.int(0, 5) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), txt = jzTrim(String(c.text)), n = jzCount(txt), font = atza_fontD(ctx), first = !!jzP(ctx, 'first', false), i;
        var Lw = W < H ? (n <= 3 ? 2 : n <= 7 ? 3 : n <= 11 ? 4 : 5) : (n <= 4 ? 2 : n <= 9 ? 3 : 4);
        var units = atza_unitsOf(c, Lw), lines = atza_groupFr(units, atza_evenFr(Math.min(Lw, units.length))), L = lines.length;
        if (!L) return null;
        var leadK = 1.3, tr = 0.03, gap = 20, ws = [], mL = 0, mR = 0;
        var onLeft = function (q) { return (q % 2 === 0) === first; };      // true: flush right, ending at the axis
        for (i = 0; i < L; i++) { ws.push(atza_meas(lines[i], 100, { font: font, track: tr }).w); if (onLeft(i)) mL = Math.max(mL, ws[i]); else mR = Math.max(mR, ws[i]); }
        var size = Math.min(W * 0.86 / (mL + mR + gap * 2) * 100, H * 0.8 / (L * leadK), M * 0.2), k = size / 100;
        var ax = W / 2 + (mL - mR) * k / 2, lw = atza_hair(ctx), ls = atza_ls(ctx) * 0.85, hd = atza_hd(ctx), e = 'oe(time/0.7)*K', hh = L * size * leadK / 2 + size * 0.35;
        var accAx = jzP(ctx, 'axis', 'sub') === 'accent', aCol = accAx ? atza_acc(sc) : sc.sub, bb = null, acc = jzP(ctx, 'acc', 0);
        var G = jzShapeLayer(ctx, 'axis', 0, 0);
        atza_grp(G, 'axis', [[[ax, H / 2 - hh], [ax, H / 2 + hh]]], aCol, { width: accAx ? lw * 1.6 : lw, alpha: 0.85, trim: hd + '50+50*' + e, start: hd + '50-50*' + e });
        for (i = 0; i < L; i++) {
            var y0 = H / 2 + (i - (L - 1) / 2) * size * leadK, d0 = onLeft(i) ? 1 : -1;      // d0: the empty side
            atza_grp(G, 'tick ' + (i + 1), [[[ax, y0], [ax - d0 * size * 0.12, y0]]], aCol, { width: lw, alpha: 0.85, trim: hd + '100*oc((time-' + jzN(0.15 + i * 0.08) + ')/0.3)*K' });
        }
        jzNoGhost(G);
        for (i = 0; i < L; i++) {
            var y = H / 2 + (i - (L - 1) / 2) * size * leadK, left = onLeft(i), d = left ? 1 : -1;
            bb = jzUnion(bb, atza_draw(ctx, { text: lines[i], font: font, size: size, track: tr, align: left ? 'right' : 'left', x: ax + (left ? -1 : 1) * gap * k, y: y, color: L > 2 && i === acc % L ? atza_acc(sc) : sc.fg, mi: i * 3 }));
            if (jzP(ctx, 'idx', true)) atza_label(ctx, atza_p2(i + 1), ax + d * gap * k * 0.8, y, { size: ls, align: left ? 'left' : 'right', alpha: 0.85, op: 'oc((time-' + jzN(0.15 + i * 0.08) + ')/0.3)*K' });
        }
        return bb;
    }
});

/* ================================================================ 7 tzSlash — 斜線区切り */
jzReg('layout', 'tzSlash', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), step: rng.chance(0.7), tall: rng.chance(0.6), acc: rng.int(0, 3), num: rng.chance(0.7) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), port = W < H, txt = jzTrim(String(c.text)), n = jzCount(txt), font = atza_fontD(ctx), i;
        var Gw = n <= 4 ? 2 : n <= 10 ? 3 : 4, units = atza_unitsOf(c, Gw), gs = atza_groupFr(units, atza_evenFr(Math.min(Gw, units.length))), G = gs.length;
        if (!G) return null;
        var tr = 0.03, lw = atza_hair(ctx), ls = atza_ls(ctx) * 0.85, ac = atza_acc(sc), hd = atza_hd(ctx), ws = [], bb = null;
        var step = !!jzP(ctx, 'step', true), accI = jzP(ctx, 'acc', 0) % Math.max(1, G - 1), num = !!jzP(ctx, 'num', true), e, isA;
        for (i = 0; i < G; i++) ws.push(atza_meas(gs[i], 100, { font: font, track: tr }).w);
        var S = jzShapeLayer(ctx, 'slashes', 0, 0), nSl = 0, labs = [], size, y, ym;
        if (!port) {
            var gap = step ? 90 : 64, stepK = step ? 0.5 : 0, sum = (G - 1) * gap;
            for (i = 0; i < G; i++) sum += ws[i];
            size = Math.min(W * 0.86 / sum * 100, H * 0.72 / (1 + (G - 1) * stepK), M * 0.24);
            var k = size / 100, Hs = jzP(ctx, 'tall', true) ? H * 0.84 : size * (2 + (G - 1) * stepK), tan = Math.tan(16 * Math.PI / 180), x = W / 2 - sum * k / 2, hh = Hs / 2;
            for (i = 0; i < G; i++) {
                y = H / 2 + (i - (G - 1) / 2) * size * stepK;
                bb = jzUnion(bb, atza_draw(ctx, { text: gs[i], font: font, size: size, track: tr, align: 'left', x: x, y: y, color: sc.fg, mi: i * 3 }));
                x += ws[i] * k;
                if (i < G - 1) {
                    var xs = x + gap * k / 2;
                    ym = H / 2 + (i + 0.5 - (G - 1) / 2) * size * stepK; e = 'oe((time-' + jzN(0.1 + i * 0.1) + ')/0.6)*K'; isA = i === accI;
                    atza_grp(S, 'slash ' + (i + 1), [[[xs + hh * tan, ym - hh], [xs - hh * tan, ym + hh]]], isA ? ac : sc.sub, { width: isA ? lw * 1.6 : lw, alpha: 0.9, trim: hd + '50+50*' + e, start: hd + '50-50*' + e });
                    nSl++;
                    if (num) labs.push([atza_p2(i + 1), xs + hh * tan + ls * 0.7, ym - hh + ls * 0.8, 'left', e]);
                    x += gap * k;
                }
            }
        } else {
            var pitchK = 1.75, sl = W * 0.44 * Math.tan(5 * Math.PI / 180);
            size = Math.min(H * 0.76 / (G * pitchK), M * 0.24);
            for (i = 0; i < G; i++) size = Math.min(size, W * 0.8 / ws[i] * 100);
            for (i = 0; i < G; i++) {
                y = H / 2 + (i - (G - 1) / 2) * size * pitchK;
                var al = step ? (i % 2 ? 'right' : 'left') : 'center';
                bb = jzUnion(bb, atza_draw(ctx, { text: gs[i], font: font, size: size, track: tr, align: al, x: al === 'left' ? W * 0.1 : al === 'right' ? W * 0.9 : W / 2, y: y, color: sc.fg, mi: i * 3 }));
                if (i < G - 1) {
                    var d = i % 2 ? -1 : 1;
                    ym = y + size * pitchK / 2; e = 'oe((time-' + jzN(0.1 + i * 0.1) + ')/0.6)*K'; isA = i === accI;
                    atza_grp(S, 'slash ' + (i + 1), [[[W / 2 - W * 0.44, ym + sl * d], [W / 2 + W * 0.44, ym - sl * d]]], isA ? ac : sc.sub, { width: isA ? lw * 1.6 : lw, alpha: 0.9, trim: hd + '50+50*' + e, start: hd + '50-50*' + e });
                    nSl++;
                    if (num) labs.push([atza_p2(i + 1), d > 0 ? W * 0.94 : W * 0.06, ym - sl - ls * 0.9, d > 0 ? 'right' : 'left', e]);
                }
            }
        }
        if (nSl) jzNoGhost(S); else S.remove();
        for (i = 0; i < labs.length; i++) atza_label(ctx, labs[i][0], labs[i][1], labs[i][2], { size: ls, align: labs[i][3], alpha: 0.85, op: labs[i][4] });
        return bb;
    }
});

/* ================================================================ 8 tzHorizon — 沈む基線 */
jzReg('layout', 'tzHorizon', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), mode: rng.pick(['sink', 'sink', 'hang']), crop: rng.range(0.16, 0.24), cap: rng.chance(0.85), line: rng.pick(['accent', 'sub', 'fg']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), txt = jzTrim(String(c.text)), font = atza_fontD(ctx), kk = atza_k(ctx), li;
        var mt = atza_mainLines(txt, W, H, 8, 5), L = mt.split('\n').length, lead = 1.5, o = { lead: lead, track: 0.03 };
        var size = Math.min(atza_fit(mt, font, W * 0.84, H * 0.64, o), M * 0.27);
        var sink = jzP(ctx, 'mode', 'sink') !== 'hang', crop = jzP(ctx, 'crop', 0.2), cr = sink ? crop : crop * 0.7, lineP = jzP(ctx, 'line', 'accent');
        var mot = ctx.fx.motion != null ? ctx.fx.motion : 0.7, ys = [], hz = [], hd = atza_hd(ctx);
        for (li = 0; li < L; li++) { var yc = H / 2 + (li - (L - 1) / 2) * size * lead; ys.push(yc); hz.push(sink ? yc + size * (0.5 - cr) : yc - size * (0.5 - cr)); }
        var it = { text: mt, font: font, size: size, x: W / 2, y: H / 2, color: sc.fg, lead: lead, track: 0.03 };
        var Lt = atza_text(ctx, mt, it);
        // the line keeps sinking (or rising) a little behind the horizon
        jzAnimator(Lt, 'JZ Sink', [['ADBE Text Position 3D', [0, (sink ? 1 : -1) * size * 0.03, 0]]], hd + 'cl(time/' + jzN(Math.max(0.6, c.dur)) + ')*' + jzN(mot) + '*100');
        jzAnimate(ctx, Lt, { mi: 0 });
        // clip: a track matte fixed in the frame — each line of type is cut at its own horizon
        var Mt = jzShapeLayer(ctx, 'horizon matte', 0, 0);
        for (li = 0; li < L; li++) {
            var a = ys[li] - size * lead / 2, b = ys[li] + size * lead / 2, y0, y1;
            if (sink) { y0 = li ? a : -H; y1 = hz[li]; } else { y0 = hz[li]; y1 = li < L - 1 ? b : H * 2; }
            atza_rectGrp(Mt, 'clip ' + (li + 1), -W, y0, W * 3, Math.max(1, y1 - y0), '#FFFFFF');
        }
        atza_matte(Lt, Mt, TrackMatteType.ALPHA);
        var lw = atza_hair(ctx), ls = atza_ls(ctx), col = lineP === 'accent' ? atza_acc(sc) : lineP === 'fg' ? sc.fg : sc.sub;
        var G = jzShapeLayer(ctx, 'horizon', 0, 0);
        for (li = 0; li < L; li++) {
            var e = 'oe((time-' + jzN(li * 0.08) + ')/0.7)*K';
            atza_grp(G, 'horizon ' + (li + 1), [[[W / 2 - W * 0.46, hz[li]], [W / 2 + W * 0.46, hz[li]]]], li === 0 || lineP !== 'accent' ? col : sc.sub, { width: Math.max(1.2 * kk, lw * 1.3), alpha: 0.9, trim: hd + '50+50*' + e, start: hd + '50-50*' + e });
        }
        jzNoGhost(G);
        var la = 'oc((time-0.3)/0.35)*K', mw = atza_meas(mt, size, it).w, xa = Math.max(W * 0.06, W / 2 - mw / 2), xb = Math.min(W * 0.94, W / 2 + mw / 2);
        var y = sink ? hz[L - 1] + ls * 1.5 : hz[0] - ls * 1.4, cap = txt.replace(/[\s　]+/g, ' ');
        if (jzP(ctx, 'cap', true)) atza_label(ctx, cap, xa, y, { font: jzBodyF(ctx), size: Math.min(ls * 1.05, (xb - xa) * 0.7 / Math.max(1, jzChars(cap).length)), track: 0.2, color: sc.fg, op: la });
        atza_label(ctx, (sink ? '−' : '+') + Math.round(cr * 100) + '%', xb, y, { size: ls * 0.85, align: 'right', alpha: 0.85, op: la });
        return atza_ibb(it);
    }
});

/* ================================================================ 9 tzFunnel — 逆三角組 */
jzReg('layout', 'tzFunnel', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display', 'body'])), dir: rng.pick(['down', 'down', 'up']), sides: rng.chance(0.8), mark: rng.pick(['sq', 'sq', 'none']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), txt = jzTrim(String(c.text)), n = jzCount(txt), down = jzP(ctx, 'dir', 'down') !== 'up', i;
        var font = jzP(ctx, 'font', jzSerifF(ctx)), kk = atza_k(ctx), L0 = n <= 5 ? 2 : n <= 11 ? 3 : 4;
        var frOf = function (Ln) { var w = [], s = 0, acc = 0, o = [], q; for (q = 0; q < Ln; q++) { w.push((down ? Ln - q : q + 1) + 0.4); s += w[q]; } for (q = 0; q < Ln; q++) { acc += w[q]; o.push(acc / s); } return o; };
        var isMono = function (ls0) { for (var q = 1; q < ls0.length; q++) { var a = jzCount(ls0[q]), b = jzCount(ls0[q - 1]); if (down ? a > b : a < b) return false; } return true; };
        var units = atza_unitsOf(c, L0), lines = atza_groupFr(units, frOf(Math.min(L0, units.length)));
        if (!atza_isLatinT(txt) && (lines.length < 2 || !isMono(lines))) { units = atza_charUnits(txt); lines = atza_groupFr(units, frOf(Math.min(L0, units.length))); }
        var L = lines.length, leadK = 1.5, tr = 0.1;
        if (!L) return null;
        var size = Math.min(H * 0.74 / (L * leadK), M * 0.2), ws = [], bb = null, cnt = [];
        for (i = 0; i < L; i++) size = Math.min(size, atza_fit(lines[i], font, W * 0.8, 1e6, { track: tr }));
        var yOf = function (q) { return H / 2 + (q - (L - 1) / 2) * size * leadK; };
        for (i = 0; i < L; i++) {
            ws.push(atza_meas(lines[i], size, { font: font, track: tr }).w); cnt.push(jzCount(lines[i]));
            bb = jzUnion(bb, atza_draw(ctx, { text: lines[i], font: font, size: size, track: tr, x: W / 2, y: yOf(i), color: sc.fg, mi: i * 3 }));
        }
        var lw = atza_hair(ctx), ls = atza_ls(ctx) * 0.85, hd = atza_hd(ctx), e = 'oe((time-0.12)/0.8)*K';
        var y0 = yOf(0) - size * 0.62, y1 = yOf(L - 1) + size * 0.62, pad = size * 0.3;
        var ym = down ? y1 + size * 0.16 : y0 - size * 0.16, q0 = Math.max(4 * kk, size * 0.085), sq = jzP(ctx, 'mark', 'sq') === 'sq';
        var G = jzShapeLayer(ctx, 'funnel', 0, 0), any = false;
        if (jzP(ctx, 'sides', true) && L > 1) {       // two hairlines converging along the line ends
            var h0 = ws[0] / 2 + pad, h1 = ws[L - 1] / 2 + pad, extra = 0, lim = W * 0.47;
            for (i = 1; i < L - 1; i++) { var t = (yOf(i) - y0) / (y1 - y0); extra = Math.max(extra, ws[i] / 2 + pad - jzLerp(h0, h1, t)); }
            h0 = Math.min(h0 + extra, lim); h1 = Math.min(h1 + extra, lim);
            atza_grp(G, 'sides', [[[W / 2 - h0, y0], [W / 2 - h1, y1]], [[W / 2 + h0, y0], [W / 2 + h1, y1]]], sc.sub, { width: lw, alpha: 0.6, trim: atza_te(hd, e) });
            any = true;
        }
        if (sq) { atza_rectGrp(G, 'end mark', W / 2 - q0 / 2, ym - q0 / 2, q0, q0, atza_acc(sc), { gop: hd + '100*cl(' + e + ')' }); any = true; }
        if (any) jzNoGhost(G); else G.remove();
        atza_label(ctx, cnt.join(' · '), W / 2, ym + (down ? 1 : -1) * (q0 + ls * 1.1), { size: ls, align: 'center', alpha: 0.85, op: e });
        return bb;
    }
});

/* ================================================================ 10 tzZoomBox — 拡大図 */
jzReg('layout', 'tzZoomBox', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), flip: rng.chance(0.4), big: rng.pick(['outline', 'outline', 'fill']), mode: rng.pick(['kanji', 'kanji', 'mid']), cross: rng.chance(0.7) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), port = W < H, txt = jzTrim(String(c.text)), o = { lead: 1.3, track: 0.04 }, kk = atza_k(ctx), i;
        var font = jzP(ctx, 'font', jzSerifF(ctx)), flip = !!jzP(ctx, 'flip', false), mt = atza_mainLines(txt, W, H, 7, 6), it, B, bx, by;
        if (!port) {
            B = Math.min(H * 0.62, W * 0.36);
            it = { text: mt, font: font, size: Math.min(atza_fit(mt, font, W * 0.36, H * 0.5, o), M * 0.115), align: 'left', x: flip ? W * 0.56 : W * 0.08, y: H / 2, color: sc.fg, lead: 1.3, track: 0.04 };
            bx = flip ? W * 0.08 + B / 2 : W * 0.92 - B / 2; by = H / 2;
        } else {
            B = Math.min(W * 0.68, H * 0.4);
            it = { text: mt, font: font, size: Math.min(atza_fit(mt, font, W * 0.84, H * 0.22, o), W * 0.135), align: 'left', x: W * 0.08, y: flip ? H * 0.8 : H * 0.2, color: sc.fg, lead: 1.3, track: 0.04 };
            bx = W / 2; by = flip ? H * 0.38 : H * 0.62;
        }
        var gp = atza_gpts(it), bb = atza_draw(ctx, it);
        if (!gp.length) return bb;
        var chs = [];
        for (i = 0; i < gp.length; i++) chs.push(gp[i].ch);
        var g = gp[Math.min(gp.length - 1, atza_keyIndex(chs, jzP(ctx, 'mode', 'kanji')))];
        var lw = atza_hair(ctx), ls = atza_ls(ctx) * 0.85, ac = atza_acc(sc), hd = atza_hd(ctx), hb = it.size * 0.57, HB = B / 2;
        var e1 = 'oe((time-0.2)/0.45)*K', e2 = 'oc((time-0.35)/0.5)*K', e3 = 'oe((time-0.5)/0.6)*K';
        var G = jzShapeLayer(ctx, 'enlarged detail', 0, 0);
        atza_grp(G, 'glyph box', [atza_rectPts(g.x - hb, g.y - hb, g.x + hb, g.y + hb)], ac, { width: Math.max(1.2 * kk, lw * 1.3), trim: atza_te(hd, e1) });
        var horiz = Math.abs(bx - g.x) > Math.abs(by - g.y), d = horiz ? atza_sgn(bx - g.x) : atza_sgn(by - g.y);
        var pairs = horiz
            ? [[[g.x + d * hb, g.y - hb], [bx - d * HB, by - HB]], [[g.x + d * hb, g.y + hb], [bx - d * HB, by + HB]]]
            : [[[g.x - hb, g.y + d * hb], [bx - HB, by - d * HB]], [[g.x + hb, g.y + d * hb], [bx + HB, by - d * HB]]];
        atza_grp(G, 'projection', pairs, sc.sub, { width: lw, alpha: 0.55, trim: atza_te(hd, e2) });
        atza_grp(G, 'frame', [atza_rectPts(bx - HB, by - HB, bx + HB, by + HB)], sc.sub, { width: lw, alpha: 0.9, trim: atza_te(hd, e3) });
        if (jzP(ctx, 'cross', true)) atza_grp(G, 'cross', [[[bx - HB, by], [bx + HB, by]], [[bx, by - HB], [bx, by + HB]]], sc.sub, { width: lw, alpha: 0.35, dash: [B * 0.012, B * 0.012], trim: hd + '50+50*' + e3, start: hd + '50-50*' + e3 });
        jzNoGhost(G);
        // the glyph enlarged inside the frame (the browser draws the outline on; here it fades in)
        var gi = { text: g.ch, font: font, size: B * 0.84, x: bx, y: by, name: 'enlarged glyph' };
        if (jzP(ctx, 'big', 'outline') === 'outline') {
            gi.fill = false; gi.stroke = Math.max(1.5 * kk, B * 0.007); gi.strokeColor = sc.fg; gi.color = sc.fg;
            atza_op(ctx, atza_text(ctx, g.ch, gi), 'cl((time-0.55)/0.8)*K');
        } else { gi.color = jzMixHex(sc.bg, sc.fg, 0.3); atza_op(ctx, atza_text(ctx, g.ch, gi), e3); }
        atza_label(ctx, '×' + (B * 0.84 / it.size).toFixed(1), bx - HB, by + HB + ls * 1.2, { size: ls, color: ac, op: e3 });
        atza_label(ctx, atza_ucode(g.ch), bx + HB, by + HB + ls * 1.2, { size: ls, align: 'right', alpha: 0.85, op: e3 });
        return bb;
    }
});

/* ================================================================ 11 tzWideOne — 平体一字 */
jzReg('layout', 'tzWideOne', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), mode: rng.pick(['kanji', 'mid', 'last']), acc: rng.chance(0.5), dim: rng.chance(0.8) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), port = W < H, txt = jzTrim(String(c.text)).replace(/[\s　]+/g, ' '), font = atza_fontD(ctx), mode = jzP(ctx, 'mode', 'kanji');
        var lines = (port ? atza_mainLines(txt, W, H, 99, 5) : txt).split('\n'), L = lines.length, flat = [], chs = [], li, i, fi = -1, latin = atza_isLatinT(txt);
        for (li = 0; li < L; li++) { var cs = jzChars(lines[li]); for (i = 0; i < cs.length; i++) if (!atza_isSp(cs[i])) { flat.push({ ch: cs[i], li: li, ci: i }); chs.push(cs[i]); } }
        if (!flat.length) return null;
        // which glyph: a long-vowel mark when there is one, else the key glyph
        for (i = 1; i < flat.length && fi < 0; i++) if (flat[i].ch === 'ー' || flat[i].ch === '〜' || flat[i].ch === '～') fi = i;
        if (fi < 0 && latin) for (i = 1; i < flat.length && fi < 0; i++) if ('oOaeuQ0'.indexOf(flat[i].ch) >= 0) fi = i;
        if (fi < 0) {
            if (mode === 'last') { fi = 0; for (i = flat.length - 1; i >= 0; i--) if (atza_okCh(flat[i].ch)) { fi = i; break; } }
            else fi = atza_keyIndex(chs, mode);
        }
        var Kg = flat[fi] || flat[0], tr = 0.03, Wb = W * 0.86, leadK = 1.32, size = Math.min(M * 0.2, H * 0.72 / (L * leadK));
        for (li = 0; li < L; li++) size = Math.min(size, atza_fit(lines[li], font, Wb * 0.7, 1e6, { track: tr }));
        // the key line is ONE text layer: a Scale animator stretches the key glyph, a Position animator moves it and what follows
        var lay = atza_lay(lines[Kg.li], size, { font: font, track: tr, align: 'left' }), kg = lay[Kg.ci], kw = kg.w, wB = kg.x - kw / 2, wAll = lay.W;
        var sxT = jzClamp((Wb - (wAll - kw)) / kw, 1, 4), blockW = wAll + kw * (sxT - 1);
        for (li = 0; li < L; li++) if (li !== Kg.li) blockW = Math.max(blockW, atza_meas(lines[li], size, { font: font, track: tr }).w);
        var xL = W / 2 - blockW / 2, lw = atza_hair(ctx), ls = atza_ls(ctx) * 0.85, hd = atza_hd(ctx), bb = null, E = 'var e=oe((time-0.12)/0.8);', KI = Kg.ci + 1, dk = kw * (sxT - 1);
        for (li = 0; li < L; li++) {
            var y = H / 2 + (li - (L - 1) / 2) * size * leadK;
            if (li !== Kg.li) { bb = jzUnion(bb, atza_draw(ctx, { text: lines[li], font: font, size: size, track: tr, align: 'left', x: xL, y: y, color: sc.fg, mi: li * 4 })); continue; }
            var Lt = atza_text(ctx, lines[li], { font: font, size: size, track: tr, align: 'left', x: xL, y: y, color: sc.fg });
            if (sxT > 1.01) {
                jzAnimator(Lt, 'JZ Wide', [['ADBE Text Scale 3D', [sxT * 100, 100, 100]]], hd + E + 'textIndex===' + KI + '?100*e:0');
                jzAnimator(Lt, 'JZ Wide Shift', [['ADBE Text Position 3D', [dk, 0, 0]]], hd + E + '(textIndex===' + KI + '?50:(textIndex>' + KI + '?100:0))*e');
            }
            if (jzP(ctx, 'acc', false)) { var fl = []; for (i = 0; i < lay.length; i++) fl.push(i === Kg.ci); jzCharColors(Lt, atza_acc(sc), fl, 'JZ Key Colour'); }
            jzAnimate(ctx, Lt, { mi: li * 4 });
            bb = jzUnion(bb, { x0: xL, x1: xL + wAll + dk, y0: y - size / 2, y1: y + size / 2, cx: xL + (wAll + dk) / 2, cy: y });
            if (jzP(ctx, 'dim', true)) {      // dimension line under the stretched glyph, with its width in %
                var a = 'oc((time-0.2)/0.3)*K', yd = y + size * 0.64, xa = xL + wB, t = size * 0.07;
                var G = jzShapeLayer(ctx, 'width dimension', 0, 0);
                atza_grp(G, 'dimension', [[[xa, yd], [xa + kw * sxT, yd]]], sc.sub, { width: lw, alpha: 0.8, trim: hd + E + '(1+' + jzN(sxT - 1) + '*e)/' + jzN(sxT) + '*100' });
                atza_grp(G, 'tick a', [[[xa, yd - t], [xa, yd + t]]], sc.sub, { width: lw, alpha: 0.8 });
                atza_grp(G, 'tick b', [[[0, -t], [0, t]]], sc.sub, { width: lw, alpha: 0.8, gpos: hd + E + '[' + jzN(xa + kw) + '+' + jzN(dk) + '*e,' + jzN(yd) + ']' });
                atza_op(ctx, G, a);
                if (li === L - 1 || size * (leadK - 1) > ls * 2.4) {
                    var word = latin ? 'WIDTH' : '平体';
                    var R = atza_label(ctx, word + ' 100%', xa + kw / 2, yd + ls * 1.1, { size: ls, align: 'center', font: latin ? jzMonoF(ctx) : jzBodyF(ctx), op: a, name: 'width readout' });
                    atza_srcText(R, hd + E + atza_str(word + ' ') + '+Math.round((1+' + jzN(sxT - 1) + '*e)*100)+"%"');
                    jzSetExpr(jzXf(R, 'ADBE Position'), hd + E + '[value[0]+' + jzN(dk / 2) + '*e,value[1]]');
                }
            }
        }
        return bb;
    }
});

/* ================================================================ 12 tzPointSym — 点対称 */
jzReg('layout', 'tzPointSym', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), top: rng.chance(0.75), al: rng.pick(['edge', 'edge', 'center']), copy: rng.pick(['outline', 'outline', 'dim']), mark: rng.chance(0.8) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), txt = jzTrim(String(c.text)), font = atza_fontD(ctx), kk = atza_k(ctx), top = !!jzP(ctx, 'top', true);
        var mt = atza_mainLines(txt, W, H, 9, 5), o = { lead: 1.2, track: 0.03 };
        var size = Math.min(atza_fit(mt, font, W * 0.8, H * 0.33, o), M * 0.17), m = atza_meas(mt, size, { font: font, lead: 1.2, track: 0.03 }), gapY = size * 0.34, s = top ? -1 : 1;
        var cx = jzP(ctx, 'al', 'edge') === 'edge' ? (top ? W * 0.08 + m.w / 2 : W * 0.92 - m.w / 2) : W / 2, cy = H / 2 + s * (gapY + m.h / 2);
        var lw = atza_hair(ctx), ls = atza_ls(ctx) * 0.85, hd = atza_hd(ctx), e = 'oe(time/0.8)*K';
        atza_lines(ctx, 'centre line', [[[W / 2 - W * 0.46, H / 2], [W / 2 + W * 0.46, H / 2]]], sc.sub, { width: lw, alpha: 0.7, trim: hd + '50+50*' + e, start: hd + '50-50*' + e });
        if (jzP(ctx, 'mark', true)) {
            var r = Math.max(4 * kk, size * 0.07), D = jzShapeLayer(ctx, 'centre point', W / 2, H / 2), g = jzGrp(D, 'point');
            jzAddEllipse(g, r * 2, r * 2); jzAddStroke(g, atza_acc(sc), Math.max(1.2 * kk, lw * 1.3)); jzAddFill(g, sc.bg);
            jzSetExpr(jzXf(D, 'ADBE Scale'), hd + 'var e=cl(' + e + ');[100*e,100*e]');
            jzNoGhost(D);
            atza_label(ctx, '180°', top ? W * 0.94 : W * 0.06, H / 2 + s * ls * 1.1, { size: ls, align: top ? 'right' : 'left', alpha: 0.9, op: e });
        }
        // the second setting, turned 180° about the centre of the frame
        var ci = { text: mt, font: font, size: size, x: W - cx, y: H - cy, rot: 180, lead: 1.2, track: 0.03, name: 'turned copy' };
        if (jzP(ctx, 'copy', 'outline') === 'outline') {
            ci.fill = false; ci.stroke = Math.max(1.2 * kk, size * 0.012); ci.strokeColor = sc.sub; ci.color = sc.sub; ci.alpha = 0.9;
            atza_op(ctx, atza_text(ctx, mt, ci), 'cl((time-0.15)/0.8)*K');
        } else { ci.color = jzMixHex(sc.bg, sc.fg, 0.24); atza_op(ctx, atza_text(ctx, mt, ci), 'oc((time-0.15)/0.5)*K'); }
        return atza_draw(ctx, { text: mt, font: font, size: size, x: cx, y: cy, color: sc.fg, lead: 1.2, track: 0.03 });
    }
});

/* ================================================================ 13 tzCanon — 割り出し */
jzReg('layout', 'tzCanon', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display', 'body'])), flip: rng.chance(0.5), low: rng.chance(0.35), block: rng.pick(['sub', 'sub', 'accent']), ticks: rng.chance(0.8) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), txt = jzTrim(String(c.text)), font = jzP(ctx, 'font', jzSerifF(ctx)), flip = !!jzP(ctx, 'flip', false), i;
        var px = W * 0.045, py = H * 0.055, pw = W - px * 2, ph = H - py * 2;
        var fx = function (v) { return px + pw * (flip ? 1 - v : v); }, fy = function (v) { return py + ph * v; };
        var tx0 = Math.min(fx(1 / 9), fx(7 / 9)), tx1 = Math.max(fx(1 / 9), fx(7 / 9)), ty0 = fy(1 / 9), ty1 = fy(7 / 9), Tw = tx1 - tx0, Th = ty1 - ty0;
        var mt = atza_mainLines(txt, W, H, 9, 5), o = { lead: 1.26, track: 0.03 };
        var size = Math.min(atza_fit(mt, font, Tw * 0.9, Th * 0.7, o), M * 0.165), m = atza_meas(mt, size, { font: font, lead: 1.26, track: 0.03 }), ins = Math.min(Tw, Th) * 0.06;
        var it = { text: mt, font: font, size: size, align: 'left', x: tx0 + ins, y: jzP(ctx, 'low', false) ? ty1 - ins - m.h / 2 : ty0 + ins + m.h / 2, color: sc.fg, lead: 1.26, track: 0.03 };
        var lw = atza_hair(ctx), ls = atza_ls(ctx) * 0.8, hd = atza_hd(ctx), e1 = 'oe(time/0.8)*K', e2 = 'oc((time-0.15)/0.6)*K', e3 = 'oe((time-0.3)/0.7)*K';
        var G = jzShapeLayer(ctx, 'page canon', 0, 0);
        atza_grp(G, 'page', [atza_rectPts(px, py, px + pw, py + ph)], sc.sub, { width: lw, alpha: 0.5, trim: atza_te(hd, e1) });
        // diagonals, drawn only outside the text block
        var dg = [[[0, 0], [1 / 9, 1 / 9]], [[1, 1], [7 / 9, 7 / 9]], [[1, 0], [7 / 9, 2 / 9]], [[0, 1], [2 / 9, 7 / 9]]], segs = [];
        for (i = 0; i < 4; i++) segs.push([[fx(dg[i][0][0]), fy(dg[i][0][1])], [fx(dg[i][1][0]), fy(dg[i][1][1])]]);
        atza_grp(G, 'diagonals', segs, sc.sub, { width: lw, alpha: 0.4, trim: atza_te(hd, e2) });
        if (jzP(ctx, 'ticks', true)) {       // ninths ticked on the top and left edges
            var t = M * 0.012, tk = [];
            for (i = 1; i < 9; i++) { tk.push([[px + pw * i / 9, py], [px + pw * i / 9, py + t]]); tk.push([[px, py + ph * i / 9], [px + t, py + ph * i / 9]]); }
            atza_grp(G, 'ninths', tk, sc.sub, { width: lw, alpha: 0.7, trim: atza_te(hd, e2) });
        }
        atza_grp(G, 'text block', [atza_rectPts(tx0, ty0, tx1, ty1)], jzP(ctx, 'block', 'sub') === 'accent' ? atza_acc(sc) : sc.sub, { width: lw, alpha: 0.85, trim: atza_te(hd, e3) });
        jzNoGhost(G);
        atza_label(ctx, '1/9', (fx(0) + fx(1 / 9)) / 2, ty0 + ls, { size: ls, align: 'center', alpha: 0.85, op: e3 });
        atza_label(ctx, '2/9', (fx(7 / 9) + fx(1)) / 2, ty1 - ls, { size: ls, align: 'center', alpha: 0.85, op: e3 });
        atza_label(ctx, '6/9 × 6/9   No.' + atza_p2((c.line | 0) + 1), tx0, ty1 + ls * 1.3, { size: ls, alpha: 0.85, op: e3 });
        return atza_draw(ctx, it);
    }
});

/* ================================================================ 14 tzMetric — 字面線 */
jzReg('layout', 'tzMetric', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), em: rng.chance(0.8), base: rng.pick(['accent', 'accent', 'fg']), right: rng.chance(0.3) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), txt = jzTrim(String(c.text)), font = jzP(ctx, 'font', jzSerifF(ctx)), right = !!jzP(ctx, 'right', false), kk = atza_k(ctx), li, j;
        var mt = atza_mainLines(txt, W, H, 8, 4), L = mt.split('\n').length, lead = 1.56, o = { lead: lead, track: 0.04 };
        var size = Math.min(atza_fit(mt, font, W * 0.72, H * 0.78, o), M * 0.26);
        var it = { text: mt, font: font, size: size, align: right ? 'right' : 'left', x: right ? W * 0.86 : W * 0.14, y: H / 2, color: sc.fg, lead: lead, track: 0.04 };
        var lw = atza_hair(ctx), ls = atza_ls(ctx) * 0.75, bc = jzP(ctx, 'base', 'accent') === 'accent' ? atza_acc(sc) : sc.fg, hd = atza_hd(ctx), xa = W * 0.03, xb = W * 0.97;
        var names = ['TOP', 'CTR', 'BASE', 'BTM'], offs = [-0.5, 0, 0.38, 0.5], alph = [0.5, 0.3, 0.85, 0.5], labs = [];
        // metric lines of every line of type, drawn to the frame edges (under the lyric)
        var G = jzShapeLayer(ctx, 'metric lines', 0, 0);
        for (li = 0; li < L; li++) {
            var yc = H / 2 + (li - (L - 1) / 2) * size * lead;
            for (j = 0; j < 4; j++) {
                var y = yc + size * offs[j], e = 'oe((time-' + jzN(li * 0.08 + j * 0.05) + ')/0.7)*K', from = (li + j) % 2 ? xb : xa, to = from === xa ? xb : xa;
                var go = { width: j === 2 ? Math.max(1.2 * kk, lw * 1.3) : lw, alpha: alph[j], trim: atza_te(hd, e) };
                if (j === 1) go.dash = [size * 0.05, size * 0.05];
                atza_grp(G, names[j] + ' ' + (li + 1), [[[from, y], [to, y]]], j === 2 ? bc : sc.sub, go);
                if (li === 0 || L <= 2) {
                    var leftSide = right ? j % 2 === 1 : j % 2 === 0;
                    labs.push([names[j], leftSide ? xa + ls * 0.3 : xb - ls * 0.3, y - ls * 0.85, leftSide ? 'left' : 'right', j === 2 ? bc : sc.sub, e]);
                }
            }
        }
        jzNoGhost(G);
        for (j = 0; j < labs.length; j++) atza_label(ctx, labs[j][0], labs[j][1], labs[j][2], { size: ls, align: labs[j][3], color: labs[j][4], alpha: 0.85, op: labs[j][5] });
        var bb = atza_draw(ctx, it);
        if (jzP(ctx, 'em', true)) {        // the em of the first glyph, marked by two uprights
            var gp = atza_gpts(it), g = gp[0], e2 = 'oe((time-0.3)/0.6)*K';
            if (right) { g = null; for (j = 0; j < gp.length; j++) if (gp[j].li === 0) g = gp[j]; }
            if (g) {
                var hw = Math.max(g.w, size * 0.9) / 2, yt = g.y - size * 0.7, fr = '(0.5+0.2*cl(' + e2 + '))/0.7';
                atza_lines(ctx, 'em uprights', [[[g.x - hw, yt], [g.x - hw, g.y + size * 0.7]], [[g.x + hw, yt], [g.x + hw, g.y + size * 0.7]]], sc.sub,
                    { width: lw, alpha: 0.6, trim: hd + '50+50*' + fr, start: hd + '50-50*' + fr, op: e2 });
                if (yt - ls > H * 0.04) atza_label(ctx, 'EM ' + Math.round(size / (M / 1080)), g.x, yt - ls * 0.9, { size: ls, align: 'center', alpha: 0.9, op: e2 });
            }
        }
        return bb;
    }
});

/* ================================================================ 15 tzPath — 順路 */
jzReg('layout', 'tzPath', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), seed: rng.int(1, 1e6), num: rng.chance(0.85), end: rng.chance(0.7), line: rng.pick(['sub', 'sub', 'accent']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), port = W < H, txt = jzTrim(String(c.text)), font = atza_fontD(ctx), kk = atza_k(ctx), i;
        var units = [];
        if (atza_isLatinT(txt)) { var w0 = txt.split(/\s+/); for (i = 0; i < w0.length; i++) if (w0[i]) units.push(w0[i]); } else units = atza_charUnits(txt);
        if (units.length > 12) units = atza_groupFr(units, atza_evenFr(12));
        var n = units.length;
        if (!n) return null;
        var cols = port ? Math.min(n, n <= 4 ? 2 : 3) : Math.min(n, n <= 6 ? n : Math.ceil(n / 2)), rows = Math.ceil(n / cols);
        var aw = W * 0.86, ah = Math.min(H * 0.78, rows === 1 ? M * 0.5 : 1e9), cw = aw / cols, ch = ah / rows, size = Math.min(ch * 0.58, M * 0.24);
        for (i = 0; i < n; i++) size = Math.min(size, cw * 0.62 / Math.max(0.2, atza_meas(units[i], 100, { font: font }).w / 100));
        var s = jzP(ctx, 'seed', 1) || 1, pts = [], half = [];
        for (i = 0; i < n; i++) {
            var cc = i % cols, r = Math.floor(i / cols), inRow = r === rows - 1 ? n - r * cols : cols, x0 = W / 2 - inRow * cw / 2;
            pts.push([x0 + (cc + 0.5) * cw + atza_rs(s, i, 1) * cw * 0.1, H / 2 - ah / 2 + (r + 0.5) * ch + atza_rs(s, i, 2) * ch * 0.19]);
            half.push({ w: atza_meas(units[i], size, { font: font }).w / 2 + size * 0.14, h: size * 0.62 });
        }
        var lw = atza_hair(ctx), ls = Math.min(atza_ls(ctx) * 0.85, size * 0.3), lc = jzP(ctx, 'line', 'sub') === 'accent' ? atza_acc(sc) : sc.sub, hd = atza_hd(ctx);
        // hairline from glyph to glyph, stopping short of the glyph bodies
        var G = jzShapeLayer(ctx, 'reading path', 0, 0), nSeg = 0;
        for (i = 0; i < n - 1; i++) {
            var ax = pts[i][0], ay = pts[i][1], dx = pts[i + 1][0] - ax, dy = pts[i + 1][1] - ay;
            var t0 = Math.min(Math.abs(dx) > 1e-6 ? half[i].w / Math.abs(dx) : 1e9, Math.abs(dy) > 1e-6 ? half[i].h / Math.abs(dy) : 1e9);
            var t1 = 1 - Math.min(Math.abs(dx) > 1e-6 ? half[i + 1].w / Math.abs(dx) : 1e9, Math.abs(dy) > 1e-6 ? half[i + 1].h / Math.abs(dy) : 1e9);
            if (t1 - t0 < 0.04) continue;
            atza_grp(G, 'step ' + (i + 1), [[[ax + dx * t0, ay + dy * t0], [ax + dx * t1, ay + dy * t1]]], lc, { width: lw, alpha: 0.75, trim: hd + '100*oc((time-' + jzN(0.2 + i * 0.07) + ')/0.35)*K' });
            nSeg++;
        }
        if (nSeg) jzNoGhost(G); else G.remove();
        var bb = null, ns = [], np = [];
        for (i = 0; i < n; i++) {
            bb = jzUnion(bb, atza_draw(ctx, { text: units[i], font: font, size: size, x: pts[i][0], y: pts[i][1], color: sc.fg, mi: i }));
            ns.push(atza_p2(i + 1)); np.push([pts[i][0] - half[i].w + size * 0.1, pts[i][1] - size * 0.62 - ls * 0.2]);
        }
        if (jzP(ctx, 'num', true)) {       // the reading order, one small numeral per glyph (the first in the accent colour)
            var N = atza_multi(ctx, ns, np, { size: ls, align: 'right', alpha: 0.9, name: 'path numbers' });
            jzAnimator(N.L, 'JZ First', [['ADBE Text Fill Color', jzHex(atza_acc(sc))]], 'var LI=' + atza_arr(N.li) + ';(LI[textIndex-1]||0)===0?100:0');
            atza_multiFade(ctx, N, 'oc((time-0.1-j*0.07)/0.3)*K');
        }
        if (jzP(ctx, 'end', true)) {       // end mark growing from its lower left corner
            var q = Math.max(4 * kk, size * 0.09), ex = pts[n - 1][0] + half[n - 1].w + q * 0.4, ey = pts[n - 1][1] + size * 0.36;
            var D = jzShapeLayer(ctx, 'end mark', 0, 0);
            atza_rectGrp(D, 'end mark', ex, ey - q, q, q, atza_acc(sc), { piv: [ex, ey], gsc: hd + 'var a=Math.max(0,ob(cl((time-' + jzN(0.25 + n * 0.07) + ')/0.3),2)*K);[100*a,100*a]' });
            jzNoGhost(D);
        }
        return bb;
    }
});
