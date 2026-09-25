// ================================================================ pack typo part 1 (AE port of the typo set): shared helpers + layouts 1-9
// tyKeySplit tyCropGiant tyCross tyBandHide tyRuby tyBaseline tyScaleSteps tyJustify tyIndexTable
//
// Techniques:
// - glyph positions are computed like the browser's layoutText (full-width glyphs = 1 em, latin estimated), and every text
//   layer is anchored on the browser item's origin (aty_text), so rules / marks / labels line up with the AE text.
// - many small labels at arbitrary spots live in ONE text layer (aty_multi: one label per line, moved by a Position animator).
// - helper graphics the browser draws with ghost off are kept out of the tinted ghosts (jzNoGhost).

var ATY_CY = 0.38;     // glyph centre above the baseline (em)
// compact expression header for secondary layers: DUR, OS, OD, PO (exit progress), K (exit fade) + easings
var ATY_FNS = 'function cl(x){return Math.max(0,Math.min(1,x));}function oe(x){x=cl(x);return x>=1?1:1-Math.pow(2,-10*x);}' +
    'function oc(x){x=cl(x);return 1-Math.pow(1-x,3);}function ic(x){x=cl(x);return x*x*x;}function ie(x){x=cl(x);return x<=0?0:Math.pow(2,10*x-10);}' +
    'function ob(x,s){x=cl(x);var c=s+1;return 1+c*Math.pow(x-1,3)+s*Math.pow(x-1,2);}' +
    'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}';
function aty_hd(ctx) {
    var c = ctx.cut, hard = c.outDur != null && c.outDur <= 0, od = hard ? 0.05 : Math.max(0.12, c.outDur || 0.15);
    return 'var DUR=' + jzN(c.dur) + ',OS=' + jzN(hard ? c.dur : c.dur - od) + ',OD=' + jzN(od) + ';' + ATY_FNS + 'var PO=cl((time-OS)/OD),K=1-ic(PO);\n';
}

/* ---------------------------------------------------------------- small helpers (ports of the browser pack's helpers) */
function aty_k(ctx) { return jzU(ctx) / 1080; }                    // browser design px -> comp px
function aty_port(ctx) { return ctx.W < ctx.H; }
function aty_clean(t) { return String(t || '').replace(/[\s　]+/g, ''); }
function aty_slots(t) { return jzChars(jzTrim(String(t || '')).replace(/[\s　]+/g, ' ')); }
function aty_isSp(c) { return c === ' ' || c === '　'; }
function aty_isSmall(c) { return !!c && 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ'.indexOf(c) >= 0; }
function aty_isLatinT(t) { return /[A-Za-z]/.test(t) && !/[぀-ヿ㐀-鿿＀-￯]/.test(t); }
function aty_roma(t) { var c = aty_clean(t); if (!/[ぁ-ヿ]/.test(c)) return null; var r = jzRomaji(c); return r ? r.toUpperCase() : null; }
function aty_romaCh(ch) { if (!(jzIsHira(ch) || jzIsKata(ch))) return null; var r = jzRomaji(ch); return r ? r : null; }
function aty_p2(n) { return jzPad(n, 2); }
function aty_str(s) { return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'; }
function aty_arr(a) { var s = []; for (var i = 0; i < a.length; i++) s.push(jzN(a[i])); return '[' + s.join(',') + ']'; }
function aty_acc(sc) { return jzContrast(sc.accent, sc.bg) >= 1.8 ? sc.accent : sc.fg; }
function aty_subc(sc) { return jzContrast(sc.sub, sc.bg) >= 1.5 ? sc.sub : sc.fg; }
function aty_onCol(sc, fill) {
    var c = [sc.bg, sc.fg, sc.ink, sc.accent, sc.sub], best = null, bv = 0;
    for (var i = 0; i < c.length; i++) { if (!c[i] || String(c[i]).toUpperCase() === String(fill).toUpperCase()) continue; var k = jzContrast(c[i], fill); if (k > bv) { bv = k; best = c[i]; } }
    return bv >= 2.4 ? best : (jzLum(fill) > 0.5 ? '#111111' : '#FFFFFF');
}
function aty_plateCol(sc, pref) { for (var i = 0; i < pref.length; i++) if (pref[i] && jzContrast(pref[i], sc.bg) >= 1.6) return pref[i]; return sc.fg; }
function aty_hair(ctx) { return Math.max(aty_k(ctx), jzU(ctx) * 0.0014); }
function aty_ls(ctx) { var k = aty_k(ctx); return jzClamp(jzU(ctx) * 0.018, 11 * k, 22 * k); }
// J.splitLines, but never leave a line of punctuation only ('\n' separated)
function aty_splitL(t, per) {
    var ls = String(jzSplitLines(String(t), Math.max(1, per))).split('\r'), out = [], i, j, ok;
    for (i = 0; i < ls.length; i++) {
        var cs = jzChars(ls[i]); ok = out.length > 0;
        for (j = 0; j < cs.length && ok; j++) if (!(jzIsPunct(cs[j]) || cs[j] === ' ')) ok = false;
        if (ok) out[out.length - 1] += ls[i]; else out.push(ls[i]);
    }
    return out.join('\n');
}
// main-text lines for a width budget: portrait -> short lines
function aty_mainLines(text, W, H, perL, perP) {
    var t = jzTrim(String(text || '')), n = jzCount(t), per = W < H ? perP : perL;
    if (n <= per) return t;
    return aty_splitL(t, Math.ceil(n / Math.ceil(n / per)));
}
function aty_okCh(c) { return !!c && !aty_isSp(c) && !jzIsPunct(c) && !aty_isSmall(c); }
// index of the key glyph: first kanji of the longest kanji run, else the first plain glyph ('mid': the plain glyph nearest the middle)
function aty_keyIndex(arr, mode) {
    var i, j, d;
    if (mode === 'mid') {
        var mid = Math.floor((arr.length - 1) / 2);
        for (d = 0; d < arr.length; d++) { if (aty_okCh(arr[mid + d])) return mid + d; if (mid - d >= 0 && aty_okCh(arr[mid - d])) return mid - d; }
    }
    var best = -1, bl = 0;
    for (i = 0; i < arr.length; i++) {
        if (!jzIsKanji(arr[i])) continue;
        j = i; while (j < arr.length && jzIsKanji(arr[j])) j++;
        if (j - i > bl) { bl = j - i; best = i; }
        i = j;
    }
    if (best >= 0) return best;
    for (i = 0; i < arr.length; i++) if (aty_okCh(arr[i])) return i;
    return 0;
}
// browser groupLines: join units into L lines of similar glyph count
function aty_groupLines(units, L) {
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
function aty_words(t) { var ws = jzTrim(String(t)).split(/\s+/), out = []; for (var i = 0; i < ws.length; i++) out.push((i ? ' ' : '') + ws[i]); return out; }

/* ---------------------------------------------------------------- text geometry (like the browser's layoutText) */
function aty_mono(font) { return /mono/.test(String(font || '')); }
function aty_adv(ch, mono) {
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
function aty_lay(str, size, o) {
    o = o || {};
    var tr = o.track || 0, mono = aty_mono(o.font), out = [], ti = 0, j, li, s = String(str).replace(/\r\n|\r/g, '\n');
    if (o.vertical) {
        var arr = jzChars(s.replace(/\n/g, '')), n = arr.length, st = size * (1 + tr), h = n * st - tr * size;
        for (j = 0; j < n; j++) out.push({ ch: arr[j], x: 0, y: -h / 2 + j * st + size / 2, w: size, h: size, li: 0, ci: j, ti: ti++, sp: aty_isSp(arr[j]) });
        out.W = size; out.H = Math.max(size, h); out.nL = 1; out.LD = st;
        return out;
    }
    var lines = s.split('\n'), nL = lines.length, lead = (o.lead || 1.3) * size, maxW = 1;
    for (li = 0; li < nL; li++) {
        var a2 = jzChars(lines[li]), ws = [], w = 0;
        for (j = 0; j < a2.length; j++) { ws.push(aty_adv(a2[j], mono) * size); w += ws[j] + (j < a2.length - 1 ? tr * size : 0); }
        maxW = Math.max(maxW, w);
        var x = o.align === 'left' ? 0 : o.align === 'right' ? -w : -w / 2, y = (li - (nL - 1) / 2) * lead;
        for (j = 0; j < a2.length; j++) { out.push({ ch: a2[j], x: x + ws[j] / 2, y: y, w: ws[j], h: size, li: li, ci: j, ti: ti++, sp: aty_isSp(a2[j]) }); x += ws[j] + tr * size; }
    }
    out.W = maxW; out.H = nL * lead - (lead - size); out.nL = nL; out.LD = lead;
    return out;
}
function aty_meas(str, size, o) { var l = aty_lay(str, size, o); return { w: l.W, h: l.H }; }
function aty_fit(str, font, maxW, maxH, o) { var q = jzCopy(o || {}); q.font = font; var m = aty_meas(str, 100, q); return 100 * Math.min(maxW / Math.max(1, m.w), maxH / Math.max(1, m.h)); }
function aty_tw(str, font, size, track) { return aty_meas(str, size, { font: font, track: track == null ? 0.12 : track }).w; }
// item bbox in comp px (rotation: multiples of 90 only)
function aty_ibb(o) {
    var lay = aty_lay(o.text, o.size, o), x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, i, r = Math.round((o.rot || 0) / 90) % 2 !== 0;
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
function aty_gpts(o) {
    var lay = aty_lay(o.text, o.size, o), out = [];
    for (var i = 0; i < lay.length; i++) { var g = lay[i]; if (g.sp) continue; out.push({ ch: g.ch, x: o.x + g.x, y: o.y + g.y, w: g.w, h: g.h, li: g.li, i: out.length, ti: g.ti }); }
    return out;
}

/* ---------------------------------------------------------------- layer builders */
// a text layer whose browser item origin (o.x, o.y) is the layer position. o: text font size x y align track lead vertical color fill stroke strokeColor alpha rot name
function aty_text(ctx, str, o) {
    var size = o.size, V = !!o.vertical, txt, nL, LD, i;
    if (V) {
        var cs = jzChars(String(str).replace(/[\r\n]/g, ''));
        for (i = 0; i < cs.length; i++) if (cs[i] === ' ') cs[i] = '　';
        txt = cs.join('\r'); nL = cs.length; LD = size * (1 + (o.track || 0));
    } else { txt = String(str).replace(/\r\n|\n/g, '\r'); nL = txt.split('\r').length; LD = size * (o.lead || 1.3); }
    var L = jzText(ctx, txt, { font: o.font, size: size, color: o.color || ctx.sc.fg, x: o.x, y: o.y, align: V ? 'center' : o.align, track: V ? 0 : (o.track || 0), leading: LD,
        fill: o.fill, stroke: o.stroke, strokeColor: o.strokeColor, name: o.name, opacity: o.alpha });
    jzXf(L, 'ADBE Anchor Point').setValue([0, -ATY_CY * size + (nL - 1) / 2 * LD]);
    jzXf(L, 'ADBE Position').setValue([o.x, o.y]);
    if (o.rot) jzXf(L, 'ADBE Rotate Z').setValue(o.rot);
    return L;
}
// the lyric item: layer + the cut's motion + treatment; returns the bbox (o.L = the layer)
function aty_draw(ctx, o) {
    var L = aty_text(ctx, o.text, o);
    jzAnimate(ctx, L, { mi: o.mi || 0 });
    o.L = L;
    return aty_ibb(o);
}
// opacity factor expression (0..1) on a secondary layer (value keeps the static alpha); the layer leaves the ghosts
function aty_op(ctx, L, f) { jzSetExpr(jzXf(L, 'ADBE Opacity'), aty_hd(ctx) + 'value*cl(' + f + ')'); jzNoGhost(L); return L; }
// small annotation label (main pass only); o: font size align track color alpha op (opacity factor expression)
function aty_label(ctx, text, x, y, o) {
    o = o || {};
    var L = aty_text(ctx, String(text), { font: o.font || jzMonoF(ctx), size: o.size || aty_ls(ctx), x: x, y: y, align: o.align || 'left', track: o.track != null ? o.track : 0.12,
        color: o.color || ctx.sc.sub, alpha: o.alpha, name: o.name || ('label ' + String(text).substr(0, 20)) });
    jzNoGhost(L);
    if (o.op) aty_op(ctx, L, o.op);
    return L;
}
// many labels in ONE text layer: strs[j] is placed with its reference point at pts[j] (align: left edge / centre / right edge, vertical centre)
// returns { L, li: line index per AE glyph (textIndex-1) }
function aty_multi(ctx, strs, pts, o) {
    var size = o.size, LD = size * 1.2, li = [], offs = [], j, k;
    var L = jzText(ctx, strs.join('\r'), { font: o.font || jzMonoF(ctx), size: size, color: o.color || ctx.sc.sub, x: 0, y: 0, align: o.align || 'center', track: o.track != null ? o.track : 0.12,
        leading: LD, name: o.name || 'labels', opacity: o.alpha });
    jzXf(L, 'ADBE Anchor Point').setValue([0, 0]); jzXf(L, 'ADBE Position').setValue([0, 0]);
    for (j = 0; j < strs.length; j++) {
        var cs = jzChars(strs[j]);
        for (k = 0; k < cs.length; k++) { li.push(j); offs.push([pts[j][0], pts[j][1] + ATY_CY * size - j * LD]); }
    }
    if (offs.length) jzCharOffsets(L, offs, 'JZ Place');
    jzNoGhost(L);
    return { L: L, li: li };
}
// per-glyph fade of an aty_multi layer: a = factor expression using j (the label's index), e.g. 'oc((time-0.2-j*0.05)/0.3)*K'
function aty_multiFade(ctx, M, a, extra) {
    jzAnimator(M.L, 'JZ Label Fade', [['ADBE Text Opacity', 0]], aty_hd(ctx) + 'var LI=' + aty_arr(M.li) + ';var j=LI[textIndex-1]||0;' + (extra || '') + '(1-cl(' + a + '))*100');
}
// shape layer at 0,0 with one group of polylines; o: width alpha trim start closed fill dash gop op name ghost
function aty_lines(ctx, name, segs, col, o) {
    o = o || {};
    var S = jzShapeLayer(ctx, name, 0, 0);
    aty_grp(S, name, segs, col, o);
    if (o.op) aty_op(ctx, S, o.op);
    if (!o.ghost) jzNoGhost(S);
    return S;
}
// one group (finished before the caller adds the next one)
function aty_grp(S, name, segs, col, o) {
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
    if (o.gsc) { jzGX(g).property('ADBE Vector Anchor').setValue(o.piv); jzGX(g).property('ADBE Vector Position').setValue(o.piv); jzSetExpr(jzGX(g).property('ADBE Vector Scale'), o.gsc); }
    if (o.gpos) jzSetExpr(jzGX(g).property('ADBE Vector Position'), o.gpos);
}
// filled rectangle (x0, y0 top-left) in a group; o.piv / o.gsc scale about a pivot
function aty_rectGrp(S, name, x0, y0, w, h, col, o) {
    o = o || {};
    var g = jzGrp(S, name);
    jzAddRect(g, w, h, 0, x0 + w / 2, y0 + h / 2);
    jzAddFill(g, col, o.fillOp);
    if (o.gop) jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), o.gop);
    if (o.gsc) { jzGX(g).property('ADBE Vector Anchor').setValue(o.piv); jzGX(g).property('ADBE Vector Position').setValue(o.piv); jzSetExpr(jzGX(g).property('ADBE Vector Scale'), o.gsc); }
    if (o.gpos) jzSetExpr(jzGX(g).property('ADBE Vector Position'), o.gpos);
}

/* ================================================================ 1 tyKeySplit — 大字挟み */
jzReg('layout', 'tyKeySplit', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), fs: rng.pick(jzFontsOf(st, ['serif', 'body', 'display'])), mode: rng.pick(['kanji', 'kanji', 'mid']), big: rng.pick(['fill', 'fill', 'accent', 'outline']), rule: rng.chance(0.75) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = aty_port(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), fs = jzP(ctx, 'fs', jzSerifF(ctx)), big = jzP(ctx, 'big', 'fill');
        var arr = aty_slots(c.text), ki = aty_keyIndex(arr, jzP(ctx, 'mode', 'kanji')), key = arr[ki] || '?';
        var before = jzTrim(arr.slice(0, ki).join('')), after = jzTrim(arr.slice(ki + 1).join(''));
        if (aty_isLatinT(c.text)) {            // latin: the longest word is the key
            var ws = jzTrim(c.text).split(/\s+/), wi = 0;
            for (i = 0; i < ws.length; i++) if (ws[i].length > ws[wi].length) wi = i;
            key = ws[wi]; before = ws.slice(0, wi).join(' '); after = ws.slice(wi + 1).join(' ');
            ki = ws.slice(0, wi).join(' ').length + (wi ? 1 : 0);
        }
        var bigS = port ? Math.min(W * 0.66, H * 0.36) : Math.min(H * 0.64, W * 0.34);
        bigS = Math.min(bigS, aty_fit(key, font, port ? W * 0.84 : W * 0.5, 1e6));
        var bw = aty_meas(key, bigS, { font: font }).w, gap = bigS * 0.12, per = port ? 6 : 5;
        var bt = before ? aty_splitL(before, per) : '', at = after ? aty_splitL(after, per) : '';
        var o = { track: 0.04, lead: 1.2 }, ss;
        if (port) {
            var avail = (H * 0.86 - bigS) / 2 - gap;
            ss = Math.min(bt ? aty_fit(bt, fs, W * 0.84, avail, o) : 1e9, at ? aty_fit(at, fs, W * 0.84, avail, o) : 1e9, bigS * 0.3);
        } else {
            var side = (W * 0.9 - bw - gap * 2) / ((bt ? 1 : 0) + (at ? 1 : 0) || 1);
            ss = Math.min(bt ? aty_fit(bt, fs, side, bigS * 0.62, o) : 1e9, at ? aty_fit(at, fs, side, bigS * 0.62, o) : 1e9, bigS * 0.3);
        }
        var mB = bt ? aty_meas(bt, ss, { font: fs, track: 0.04, lead: 1.2 }) : { w: 0, h: 0 }, mA = at ? aty_meas(at, ss, { font: fs, track: 0.04, lead: 1.2 }) : { w: 0, h: 0 };
        var bx, by, itB = null, itA = null;
        if (!port) {
            var tot = (bt ? mB.w + gap : 0) + bw + (at ? mA.w + gap : 0), x0 = W / 2 - tot / 2;
            bx = x0 + (bt ? mB.w + gap : 0) + bw / 2; by = H / 2;
            if (bt) itB = { text: bt, font: fs, size: ss, align: 'right', x: bx - bw / 2 - gap, y: by - bigS * 0.46 + mB.h / 2, color: sc.fg, mi: 0, track: 0.04, lead: 1.2 };
            if (at) itA = { text: at, font: fs, size: ss, align: 'left', x: bx + bw / 2 + gap, y: by + bigS * 0.46 - mA.h / 2, color: sc.fg, mi: 4, track: 0.04, lead: 1.2 };
        } else {
            var tot2 = (bt ? mB.h + gap : 0) + bigS + (at ? mA.h + gap : 0), y0 = H / 2 - tot2 / 2;
            bx = W / 2; by = y0 + (bt ? mB.h + gap : 0) + bigS / 2;
            var Lx = W / 2 - Math.max(bw, mB.w, mA.w) / 2, Rx = W / 2 + Math.max(bw, mB.w, mA.w) / 2;
            if (bt) itB = { text: bt, font: fs, size: ss, align: 'left', x: Math.max(W * 0.08, Math.min(Lx, bx - bw / 2)), y: by - bigS / 2 - gap - mB.h / 2, color: sc.fg, mi: 0, track: 0.04, lead: 1.2 };
            if (at) itA = { text: at, font: fs, size: ss, align: 'right', x: Math.min(W * 0.92, Math.max(Rx, bx + bw / 2)), y: by + bigS / 2 + gap + mA.h / 2, color: sc.fg, mi: 4, track: 0.04, lead: 1.2 };
        }
        var hd = aty_hd(ctx);
        if (jzP(ctx, 'rule', true)) {       // hairlines linking the small blocks to the key glyph
            var segs = [], y;
            if (itB) { y = port ? itB.y + mB.h / 2 + gap * 0.5 : itB.y + mB.h / 2 + ss * 0.35; var xa = port ? itB.x : itB.x - mB.w, xb = port ? itB.x + Math.max(mB.w, bw) : bx + bw * 0.5; segs.push([[xa, y], [xb, y]]); }
            if (itA) { y = port ? itA.y - mA.h / 2 - gap * 0.5 : itA.y - mA.h / 2 - ss * 0.35; var xb2 = port ? itA.x : itA.x + mA.w, xa2 = port ? itA.x - Math.max(mA.w, bw) : bx - bw * 0.5; segs.push([[xb2, y], [xa2, y]]); }
            if (segs.length) aty_lines(ctx, 'key rules', segs, sc.sub, { width: aty_hair(ctx), alpha: 0.7, trim: hd + '100*oc((time-0.2)/0.6)*K' });
        }
        var bigO = { text: key, font: font, size: bigS, x: bx, y: by, color: big === 'accent' ? aty_acc(sc) : sc.fg, mi: 2 };
        if (big === 'outline') { bigO.fill = false; bigO.stroke = Math.max(1.5 * aty_k(ctx), bigS * 0.014); bigO.strokeColor = sc.fg; }
        var bb = aty_draw(ctx, bigO);
        if (itB) bb = jzUnion(bb, aty_draw(ctx, itB));
        if (itA) bb = jzUnion(bb, aty_draw(ctx, itA));
        var nG = 0, kiG = 0;
        for (i = 0; i < arr.length; i++) if (!aty_isSp(arr[i])) { nG++; if (i < ki) kiG++; }
        aty_label(ctx, aty_p2(kiG + 1) + ' / ' + aty_p2(nG), bx - bw / 2, by + bigS * 0.56, { size: aty_ls(ctx) * 0.9, op: 'oc((time-0.3)/0.3)*K' });
        return bb;
    }
});

/* ================================================================ 2 tyCropGiant — 見切れ大文字 */
jzReg('layout', 'tyCropGiant', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display'])), fm: rng.pick(jzFontsOf(st, ['display', 'serif'])), edge: rng.pick(['a', 'b']), style: rng.pick(['dim', 'dim', 'outline']), dir: rng.pick([1, -1]) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = aty_port(ctx), txt = jzTrim(c.text), k = aty_k(ctx);
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), fm = jzP(ctx, 'fm', font), low = jzP(ctx, 'edge', 'a') === 'a', dir = jzP(ctx, 'dir', 1);
        // the giant copy, cropped by the frame edge (slides in from the edge, drifts, sinks out with the exit)
        var gi = { text: port ? aty_clean(txt) : txt, font: font, name: 'giant copy' }, sg = low ? 1 : -1;
        if (!port) { gi.size = H * 0.66; gi.x = W / 2; gi.y = low ? H + gi.size * 0.03 : -gi.size * 0.03; }
        else { gi.size = W * 0.62; gi.vertical = true; gi.x = low ? W + gi.size * 0.03 : -gi.size * 0.03; gi.y = H / 2; }
        if (jzP(ctx, 'style', 'dim') === 'outline') { gi.fill = false; gi.stroke = Math.max(1.4 * k, gi.size * 0.006); gi.strokeColor = sc.sub; gi.color = sc.sub; gi.alpha = 0.65; }
        else gi.color = jzMixHex(sc.bg, sc.fg, 0.16);
        var G = aty_text(ctx, gi.text, gi); jzNoGhost(G);
        var mv = 'var u=cl(time/' + jzN(Math.max(0.5, c.dur)) + '),g=(1-oc(time/0.8))+ic(PO);';
        if (!port) jzSetExpr(jzXf(G, 'ADBE Position'), aty_hd(ctx) + mv + '[value[0]+(0.5-u)*' + jzN(W * 0.14 * dir) + ',value[1]+g*' + jzN(sg * gi.size * 0.45) + ']');
        else jzSetExpr(jzXf(G, 'ADBE Position'), aty_hd(ctx) + mv + '[value[0]+g*' + jzN(sg * gi.size * 0.45) + ',value[1]+(0.5-u)*' + jzN(H * 0.1 * dir) + ']');
        // the readable lyric on the free side
        var mt = aty_mainLines(txt, W, H, 10, 6), o = { lead: 1.18, track: 0.03 }, it;
        if (!port) it = { text: mt, font: fm, size: Math.min(aty_fit(mt, fm, W * 0.74, H * 0.34, o), H * 0.19), align: 'left', x: W * 0.08, y: low ? H * 0.38 : H * 0.62, color: sc.fg, lead: 1.18, track: 0.03 };
        else it = { text: mt, font: fm, size: Math.min(aty_fit(mt, fm, W * 0.58, H * 0.5, o), W * 0.2), align: low ? 'left' : 'right', x: low ? W * 0.08 : W * 0.92, y: H / 2, color: sc.fg, lead: 1.18, track: 0.03 };
        var bb = aty_draw(ctx, it), m = aty_meas(it.text, it.size, it), ls = aty_ls(ctx);
        var ty = it.y - m.h / 2 - ls * 1.6, x0 = it.align === 'right' ? it.x - m.w : it.x, la = 'oc((time-0.2)/0.35)*K';
        aty_label(ctx, 'No.' + aty_p2((c.line | 0) + 1), x0, ty, { color: aty_acc(sc), op: la });
        aty_lines(ctx, 'no rule', [[[x0 + ls * 4, ty], [x0 + ls * 4 + Math.min(m.w, W * 0.3), ty]]], sc.sub, { width: aty_hair(ctx), alpha: 0.7, trim: aty_hd(ctx) + '100*oe((time-0.25)/0.5)', op: la });
        return bb;
    }
});

/* ================================================================ 3 tyCross — 十字組 */
jzReg('layout', 'tyCross', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), mode: rng.pick(['kanji', 'mid', 'mid']), rules: rng.chance(0.8), key: rng.pick(['accent', 'accent', 'fg']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display'));
        var arr = aty_slots(c.text), n = arr.length;
        if (!n) return null;
        var ki = aty_keyIndex(arr, jzP(ctx, 'mode', 'mid')), tr = 0.08;
        var A = jzTrim(arr.slice(0, ki).join('')), Kc = arr[ki], B = jzTrim(arr.slice(ki + 1).join(''));
        function w100(s) { return s ? aty_meas(s, 100, { font: font, track: tr }).w : 0; }
        function h100(s) { return s ? aty_meas(s, 100, { font: font, track: tr, vertical: true }).h : 0; }
        var kw = w100(Kc), g100 = 100 * tr + 6;
        var Lx = (A ? w100(A) + g100 : 0) + kw / 2, Rx = (B ? w100(B) + g100 : 0) + kw / 2;
        var Ty = (A ? h100(A) + g100 : 0) + 50, By = (B ? h100(B) + g100 : 0) + 50;
        var size = Math.min(W * 0.86 / ((Lx + Rx) / 100), H * 0.86 / ((Ty + By) / 100), M * 0.2), k = size / 100;
        var cx = W / 2 - (Rx - Lx) * k / 2, cy = H / 2 - (By - Ty) * k / 2, lw = aty_hair(ctx), hd = aty_hd(ctx);
        if (jzP(ctx, 'rules', true)) {
            var e = 'oe((time-0.1)/0.7)*K';
            var S = jzShapeLayer(ctx, 'cross rules', 0, 0);
            aty_grp(S, 'cross', [[[cx - W, cy], [cx + W, cy]], [[cx, cy - H], [cx, cy + H]]], sc.sub, { width: lw, alpha: 0.28, trim: hd + '50+50*' + e, start: hd + '50-50*' + e });
            aty_grp(S, 'circle', [], null, {});
            var gC = S.property('ADBE Root Vectors Group').property('circle');
            jzAddEllipse(gC, size * 1.56, size * 1.56, cx, cy);
            jzAddStroke(gC, sc.sub, lw, 100);
            gC = S.property('ADBE Root Vectors Group').property('circle');
            jzGX(gC).property('ADBE Vector Anchor').setValue([cx, cy]); jzGX(gC).property('ADBE Vector Position').setValue([cx, cy]);
            jzSetExpr(jzGX(gC).property('ADBE Vector Scale'), hd + 'var e=' + e + ';var s=(0.6+0.4*e)*100;[s,s]');
            jzSetExpr(jzGX(gC).property('ADBE Vector Group Opacity'), hd + '50*' + e);
            jzNoGhost(S);
        }
        var g = size * tr + 6 * k, bb = null, base = { font: font, size: size, track: tr, color: sc.fg };
        function it(q) { var r = jzCopy(base); for (var kk in q) if (q.hasOwnProperty(kk)) r[kk] = q[kk]; return r; }
        if (A) bb = jzUnion(bb, aty_draw(ctx, it({ text: A, align: 'right', x: cx - kw * k / 2 - g, y: cy, mi: 0 })));
        bb = jzUnion(bb, aty_draw(ctx, it({ text: Kc, x: cx, y: cy, color: jzP(ctx, 'key', 'accent') === 'accent' ? aty_acc(sc) : sc.fg, mi: 1 })));
        if (B) bb = jzUnion(bb, aty_draw(ctx, it({ text: B, align: 'left', x: cx + kw * k / 2 + g, y: cy, mi: 2 })));
        if (A) bb = jzUnion(bb, aty_draw(ctx, it({ text: A, vertical: true, x: cx, y: cy - size / 2 - g - h100(A) * k / 2, mi: 3 })));
        if (B) bb = jzUnion(bb, aty_draw(ctx, it({ text: B, vertical: true, x: cx, y: cy + size / 2 + g + h100(B) * k / 2, mi: 4 })));
        aty_label(ctx, aty_p2(ki + 1) + '×' + aty_p2(ki + 1), cx + size * 0.62, cy - size * 0.62, { size: aty_ls(ctx) * 0.9, op: 'oc((time-0.35)/0.3)*K' });
        return bb;
    }
});

/* ================================================================ 4 tyBandHide — 帯隠れ */
jzReg('layout', 'tyBandHide', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display'])), band: rng.pick(['ink', 'accent', 'fg']), pos: rng.pick(['low', 'low', 'high']), speed: rng.range(40, 90), dir: rng.pick([1, -1]), k: rng.range(0.3, 0.38) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, txt = jzTrim(c.text), font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display'));
        var mt = aty_mainLines(txt, W, H, 10, 5), nL = mt.split('\n').length, lead = 1.32;
        var size = Math.min(aty_fit(mt, font, W * 0.8, H * 0.66, { lead: lead, track: 0.02 }), H * 0.3);
        var bb = aty_draw(ctx, { text: mt, font: font, size: size, x: W / 2, y: H / 2, lead: lead, track: 0.02, color: sc.fg });
        var band = jzP(ctx, 'band', 'ink'), pk = jzP(ctx, 'k', 0.34), dir = jzP(ctx, 'dir', 1), speed = jzP(ctx, 'speed', 60) * aty_k(ctx);
        var bandC = aty_plateCol(sc, band === 'accent' ? [sc.accent, sc.ink, sc.fg] : band === 'ink' ? [sc.ink, sc.accent, sc.fg] : [sc.fg, sc.accent]);
        var tc = aty_onCol(sc, bandC), unit = jzTrim(String(c.lineText || txt).replace(/\s+/g, ' ')) + '　／　', bf = jzBodyF(ctx);
        var hd = aty_hd(ctx);
        for (var li = 0; li < nL; li++) {
            var yl = H / 2 + (li - (nL - 1) / 2) * size * lead, h = size * (pk + 0.08);
            var y0 = jzP(ctx, 'pos', 'low') === 'low' ? yl + size * (0.5 - pk) : yl - size * 0.58, d = (li % 2 ? -1 : 1) * dir;
            var ex = hd + 'var e=oe((time-' + jzN(0.12 + li * 0.08) + ')/0.5)*(1-ie(PO));';
            // the band grows from its side edge
            var Bd = jzShapeLayer(ctx, 'band ' + (li + 1), d > 0 ? -10 : W + 10, y0 + h / 2), gb = jzGrp(Bd, 'band');
            jzAddRect(gb, W + 20, h, 0, d > 0 ? (W + 20) / 2 : -(W + 20) / 2, 0); jzAddFill(gb, bandC);
            jzSetExpr(jzXf(Bd, 'ADBE Scale'), ex + '[value[0]*e,value[1]]');
            jzNoGhost(Bd);
            // the lyric line running inside the band (clipped to the band by a matte copy of it)
            var fs = h * 0.44, per = aty_tw(unit, bf, fs, 0.12);
            if (per > 1) {
                var reps = Math.min(40, Math.ceil(W * 2 / per) + 2), s = '';
                for (var r = 0; r < reps; r++) s += unit;
                var T = aty_text(ctx, s, { font: bf, size: fs, align: 'left', track: 0.12, x: 0, y: y0 + h / 2, color: tc, name: 'band text ' + (li + 1) });
                jzSetExpr(jzXf(T, 'ADBE Position'), 'var per=' + jzN(per) + ';var off=((time*' + jzN(speed * d) + ')%per+per)%per;[value[0]-per+off,value[1]]');
                jzNoGhost(T);
                var Mt = Bd.duplicate(); Mt.name = 'band matte ' + (li + 1);
                Mt.moveBefore(T); T.trackMatteType = TrackMatteType.ALPHA; Mt.enabled = false; jzNoGhost(Mt);
            }
        }
        return bb;
    }
});

/* ================================================================ 5 tyRuby — ルビ振り */
jzReg('layout', 'tyRuby', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), idx: rng.chance(0.7), up: rng.chance(0.5) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, txt = jzTrim(c.text), font = jzP(ctx, 'font', jzSerifF(ctx)), k = aty_k(ctx);
        var mt = aty_mainLines(txt, W, H, 9, 5), o = { track: 0.16, lead: 2.0 };
        var size = Math.min(aty_fit(mt, font, W * 0.84, H * 0.62, o), H * 0.2, W * 0.24);
        var it = { text: mt, font: font, size: size, x: W / 2, y: H / 2 + size * 0.1, color: sc.fg, track: 0.16, lead: 2.0 };
        var bb = aty_draw(ctx, it), gl = aty_gpts(it), mono = jzMonoF(ctx), lw = aty_hair(ctx), hd = aty_hd(ctx), i;
        var rs = Math.max(10 * k, size * 0.3), up = jzP(ctx, 'up', false);
        var rStr = [], rPts = [], rIdx = [], fsR = rs, brk = [];
        for (i = 0; i < gl.length; i++) {
            var g = gl[i], ry = g.y - size * 0.74, rt = aty_romaCh(g.ch);
            if (rt) {
                var w0 = aty_tw(rt, mono, rs, 0.02);
                if (w0 > g.w * 1.05) fsR = Math.min(fsR, rs * g.w * 1.05 / w0);
                rStr.push(up ? rt.toUpperCase() : rt); rPts.push([g.x, ry]); rIdx.push(i);
            } else if (jzIsKanji(g.ch)) brk.push(i);
        }
        var aI = 'oc((time-0.18-D*0.045)/0.3)*K';
        if (rStr.length) {     // readings above the kana: one layer, each reading fades in and drops a little into place
            var R = aty_multi(ctx, rStr, rPts, { font: mono, size: fsR, align: 'center', track: 0.02, color: sc.sub, name: 'ruby' });
            var DI = []; for (i = 0; i < R.li.length; i++) DI.push(rIdx[R.li[i]]);
            jzAnimator(R.L, 'JZ Ruby In', [['ADBE Text Opacity', 0], ['ADBE Text Position 3D', [0, -rs * 0.5, 0]]], hd + 'var DI=' + aty_arr(DI) + ';var D=DI[textIndex-1]||0;(1-cl(' + aI + '))*100');
        }
        var S = jzShapeLayer(ctx, 'ruby marks', 0, 0), ac = aty_acc(sc);
        for (var b = 0; b < brk.length; b++) {    // kanji: a small bracket mark
            var gk = gl[brk[b]], ry2 = gk.y - size * 0.74, w = gk.w * 0.5;
            aty_grp(S, 'mark ' + (b + 1), [[[gk.x - w, ry2 + rs * 0.2], [gk.x - w, ry2 - rs * 0.15], [gk.x + w, ry2 - rs * 0.15], [gk.x + w, ry2 + rs * 0.2]]], ac,
                { width: Math.max(1.2 * k, lw * 1.2), piv: [gk.x, ry2], gsc: hd + 'var D=' + brk[b] + ';var a=cl(' + aI + ');[100*a,100]', gop: hd + 'var D=' + brk[b] + ';100*cl(' + aI + ')' });
        }
        if (jzP(ctx, 'idx', true)) {       // glyph indices below
            var nStr = [], nPts = [];
            for (i = 0; i < gl.length; i++) {
                var iy = gl[i].y + size * 0.72;
                aty_grp(S, 'tick ' + (i + 1), [[[gl[i].x, iy - rs * 0.55], [gl[i].x, iy - rs * 0.2]]], sc.sub, { width: lw, alpha: 0.6, gop: hd + 'var D=' + i + ';100*cl(' + aI + ')' });
                nStr.push(aty_p2(i + 1)); nPts.push([gl[i].x, iy + rs * 0.12]);
            }
            var N = aty_multi(ctx, nStr, nPts, { font: mono, size: rs * 0.72, align: 'center', track: 0.12, color: sc.sub, alpha: 0.75, name: 'indices' });
            aty_multiFade(ctx, N, 'oc((time-0.18-j*0.045)/0.3)*K');
        }
        jzNoGhost(S);
        return bb;
    }
});

/* ================================================================ 6 tyBaseline — 罫線組 */
jzReg('layout', 'tyBaseline', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display', 'body'])), nl: rng.pick([2, 3, 3]), key: rng.chance(0.8), right: rng.chance(0.5) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = aty_port(ctx), txt = jzTrim(c.text), nG = jzCount(txt), i, j;
        var font = jzP(ctx, 'font', jzSerifF(ctx)), nl = jzP(ctx, 'nl', 3);
        var per = port ? 4 : Math.max(4, Math.ceil(nG / nl));
        var lines = (nG <= 4 ? txt : aty_splitL(txt, per)).split('\n').slice(0, 6);
        if (aty_isLatinT(txt)) { var ws = aty_words(txt); lines = aty_groupLines(ws, Math.min(ws.length, port ? 4 : nl)); }
        var L = lines.length, leadK = 1.62;
        var size = Math.min(H * 0.7 / (L * leadK), port ? W * 0.17 : H * 0.16);
        for (i = 0; i < L; i++) size = Math.min(size, aty_fit(lines[i], font, port ? W * 0.76 : W * 0.74, 1e6, { track: 0.04 }));
        var x0 = port ? W * 0.16 : W * 0.14, mx = W * 0.06, lw = aty_hair(ctx), mono = jzMonoF(ctx), ls = aty_ls(ctx), hd = aty_hd(ctx);
        var arr = jzChars(lines.join('')), ki = aty_keyIndex(arr, 'kanji'), kEnd = ki;
        while (kEnd + 1 < arr.length && jzIsKanji(arr[kEnd + 1]) && jzIsKanji(arr[ki])) kEnd++;
        var S = jzShapeLayer(ctx, 'baselines', 0, 0), acc = 0, bb = null, nS = [], nP = [], cS = [], cP = [];
        for (var li = 0; li < L; li++) {
            var ln = lines[li], y = H / 2 + (li - (L - 1) / 2) * size * leadK, yb = y + size * 0.6, e = 'oe((time-' + jzN(li * 0.1) + ')/0.6)*K';
            aty_grp(S, 'rule ' + (li + 1), [[[mx, yb], [W - mx, yb]]], sc.sub, { width: lw, alpha: 0.55, trim: hd + '100*' + e });
            nS.push(aty_p2(li + 1)); nP.push([mx, y + size * 0.2]);
            cS.push(String(jzCount(ln))); cP.push([W - mx, y + size * 0.2]);
            var it = { text: ln, font: font, size: size, align: 'left', x: x0, y: y, track: 0.04, color: sc.fg, mi: li * 4 };
            bb = jzUnion(bb, aty_draw(ctx, it));
            var lc = jzChars(ln), n = lc.length;
            if (jzP(ctx, 'key', true) && ki >= acc && ki < acc + n) {        // accent bar on the key word's baseline
                var gp = aty_gpts(it), idx0 = 0;
                for (j = 0; j < ki - acc; j++) if (!aty_isSp(lc[j])) idx0++;
                var idx1 = Math.min(gp.length - 1, idx0 + Math.min(kEnd, acc + n - 1) - ki);
                if (gp[idx0]) {
                    var a0 = gp[idx0].x - gp[idx0].w / 2, a1 = gp[idx1].x + gp[idx1].w / 2;
                    aty_rectGrp(S, 'key bar', a0, yb - Math.max(2, size * 0.035), a1 - a0, Math.max(3, size * 0.07), aty_acc(sc),
                        { piv: [a0, yb], gsc: hd + '[100*oe((time-' + jzN(0.35 + li * 0.1) + ')/0.45)*K,100]', gop: hd + '(' + e + ')>0?100:0' });
                }
            }
            acc += n;
        }
        S.moveToEnd(); jzNoGhost(S);
        var NL = aty_multi(ctx, nS, nP, { font: mono, size: ls * 0.9, align: 'left', name: 'line numbers' });
        aty_multiFade(ctx, NL, 'oe((time-j*0.1)/0.6)*K');
        if (jzP(ctx, 'right', false)) { var CL = aty_multi(ctx, cS, cP, { font: mono, size: ls * 0.9, align: 'right', alpha: 0.8, name: 'glyph counts' }); aty_multiFade(ctx, CL, 'oe((time-j*0.1)/0.6)*K'); }
        return bb;
    }
});

/* ================================================================ 7 tyScaleSteps — 級数上げ */
jzReg('layout', 'tyScaleSteps', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), dir: rng.pick(['up', 'up', 'down']), labels: rng.chance(0.8), ratio: rng.range(2.0, 2.8) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), port = aty_port(ctx), txt = jzTrim(c.text), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), ratio = jzP(ctx, 'ratio', 2.4), up = jzP(ctx, 'dir', 'up') === 'up';
        var units = [], cw = c.words || [];
        for (i = 0; i < cw.length; i++) if (jzTrim(cw[i])) units.push(jzTrim(cw[i]));
        var sl = aty_slots(txt), chars = [];
        for (i = 0; i < sl.length; i++) if (!aty_isSp(sl[i])) chars.push(sl[i]);
        if (units.length < 2 || units.length > 7) {
            if (chars.length <= 7) units = chars;
            else { var kk = Math.min(5, Math.ceil(chars.length / 3)); units = aty_splitL(txt, Math.ceil(chars.length / kk)).split('\n'); }
        }
        var k = units.length, f = [], fmax = 0;
        for (i = 0; i < k; i++) { var t = k > 1 ? i / (k - 1) : 1; f.push(Math.pow(ratio, up ? t : 1 - t)); fmax = Math.max(fmax, f[i]); }
        var tr = 0.02, lw = aty_hair(ctx), ls = aty_ls(ctx), items = [], bb = null;
        function wOf(u, s) { return aty_meas(u, s, { font: font, track: tr }).w; }
        if (!port) {
            var gapK = 0.16, latin = aty_isLatinT(txt) && units.length > 1 && units.length < chars.length, tot = 0;
            for (i = 0; i < k; i++) tot += wOf(units[i], 100 * f[i]) + (i ? 100 * gapK * f[i] * (latin ? 1.6 : 0.6) : 0);
            var base = Math.min(W * 0.86 / tot * 100, H * 0.52 / fmax), x = W / 2 - tot * base / 100 / 2, yb = H / 2 + base * fmax * 0.36;
            for (i = 0; i < k; i++) {
                var s = base * f[i];
                if (i) x += s * gapK * (latin ? 1.6 : 0.6);
                items.push({ text: units[i], font: font, size: s, align: 'left', x: x, y: yb - s * 0.46, track: tr, color: sc.fg, mi: i * 2, _w: wOf(units[i], s), _yb: yb });
                x += wOf(units[i], s);
            }
            aty_lines(ctx, 'scale rule', [[[items[0].x, yb + base * 0.08], [x, yb + base * 0.08]]], sc.sub, { width: lw, alpha: 0.6, trim: aty_hd(ctx) + '100*oe((time-0.05)/0.7)*K' });
        } else {
            var tot2 = 0; for (i = 0; i < k; i++) tot2 += 100 * f[i] * 1.12;
            var base2 = H * 0.78 / tot2 * 100;
            for (i = 0; i < k; i++) base2 = Math.min(base2, W * 0.8 / Math.max(0.01, wOf(units[i], 100 * f[i]) / 100));
            base2 = Math.min(base2, W * 0.5 / fmax);
            var y = H / 2 - tot2 * base2 / 100 / 2;
            for (i = 0; i < k; i++) {
                var s2 = base2 * f[i];
                items.push({ text: units[i], font: font, size: s2, align: 'left', x: W * 0.1, y: y + s2 * 0.56, track: tr, color: sc.fg, mi: i * 2, _w: wOf(units[i], s2), _yb: y + s2 * 1.06 });
                y += s2 * 1.12;
            }
        }
        for (i = 0; i < items.length; i++) {
            var it = items[i];
            bb = jzUnion(bb, aty_draw(ctx, it));
            if (jzP(ctx, 'labels', true)) {
                var pt = Math.round(it.size / (M / 1080) * 0.75), a = 'oc((time-' + jzN(0.25 + i * 0.07) + ')/0.3)*K';
                if (!port) aty_label(ctx, pt + 'pt', it.x, it._yb + ls * 1.3, { size: ls * 0.85, op: a });
                else aty_label(ctx, pt + 'pt', it.x + it._w + ls * 0.8, it._yb - ls * 0.6, { size: ls * 0.85, op: a });
            }
        }
        return bb;
    }
});

/* ================================================================ 8 tyJustify — 幅揃え */
jzReg('layout', 'tyJustify', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display'])), rules: rng.chance(0.7), acc: rng.int(0, 3), align: rng.pick(['center', 'left']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = aty_port(ctx), txt = jzTrim(c.text), n = jzCount(txt), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), left = jzP(ctx, 'align', 'center') === 'left';
        var L = n <= 5 ? 2 : n <= 10 ? 3 : 4, units = [], cw = c.words || [];
        for (i = 0; i < cw.length; i++) if (jzTrim(cw[i])) units.push(String(cw[i]));
        if (aty_isLatinT(txt)) units = aty_words(txt);
        else {
            if (units.length < 2) units = jzChunk(txt);
            if (units.length < 2) units = jzChars(txt);
        }
        L = Math.min(L, units.length);
        var lines = aty_groupLines(units, L), out = [];
        for (i = 1; i < lines.length; i++) {
            var cs = jzChars(lines[i]);
            while (cs.length && jzIsPunct(cs[0])) { lines[i - 1] += cs[0]; cs.shift(); }
            lines[i] = jzTrim(cs.join(''));
        }
        for (i = 0; i < lines.length; i++) if (lines[i]) out.push(lines[i]);
        lines = out;
        if (lines.length < 2 && !aty_isLatinT(txt)) lines = aty_splitL(txt, Math.ceil(n / 2)).split('\n');
        var Wb = port ? W * 0.84 : Math.min(W * 0.62, H * 1.15), tr = 0.01, gapK = 0.1, sizes = [], tot = 0;
        for (i = 0; i < lines.length; i++) { sizes.push(Math.min(aty_fit(lines[i], font, Wb, 1e6, { track: tr }), H * 0.36)); tot += sizes[i] * (1 + gapK); }
        tot -= sizes[sizes.length - 1] * gapK;
        var k = Math.min(1, H * 0.84 / tot);
        for (i = 0; i < sizes.length; i++) sizes[i] *= k;
        tot *= k;
        var x0 = W / 2 - Wb * k / 2, y = H / 2 - tot / 2, bb = null, accI = jzP(ctx, 'acc', 0) % lines.length, hd = aty_hd(ctx), segs = [], S = null;
        for (var li = 0; li < lines.length; li++) {
            var s = sizes[li];
            bb = jzUnion(bb, aty_draw(ctx, { text: lines[li], font: font, size: s, x: left ? x0 : W / 2, align: left ? 'left' : 'center', y: y + s / 2, track: tr, color: li === accI && lines.length > 2 ? aty_acc(sc) : sc.fg, mi: li * 3 }));
            if (jzP(ctx, 'rules', true) && li < lines.length - 1) {
                var ry = y + s + s * gapK * k * 0.5, e = 'oe((time-' + jzN(0.15 + li * 0.08) + ')/0.6)*K';
                if (!S) S = jzShapeLayer(ctx, 'justify rules', 0, 0);
                aty_grp(S, 'rule ' + (li + 1), [[[W / 2 - Wb * k / 2, ry], [W / 2 + Wb * k / 2, ry]]], sc.sub, { width: aty_hair(ctx), alpha: 0.55, trim: hd + '50+50*' + e, start: hd + '50-50*' + e });
            }
            y += s * (1 + gapK);
        }
        if (S) { S.moveToEnd(); jzNoGhost(S); }
        return bb;
    }
});

/* ================================================================ 9 tyIndexTable — 一覧表 */
jzReg('layout', 'tyIndexTable', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), info: rng.pick(['roma', 'roma', 'code']), head: rng.chance(0.8) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), port = aty_port(ctx), k = aty_k(ctx), i;
        var chars = jzChars(aty_clean(c.text)), n = chars.length, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), code = jzP(ctx, 'info', 'roma') === 'code';
        if (!n) return null;
        var rowH = Math.min(H * 0.78 / n, M * 0.2), gs = rowH * 0.86, Wt = port ? W * 0.84 : Math.min(W * 0.56, H * 1.0);
        var x0 = W / 2 - Wt / 2, x1 = W / 2 + Wt / 2, xg = x0 + Wt * 0.24, top = H / 2 - n * rowH / 2;
        var lw = aty_hair(ctx), mono = jzMonoF(ctx), fs = jzClamp(rowH * 0.3, 11 * k, 34 * k), hd = aty_hd(ctx);
        var e0 = 'oe(time/0.6)*K', S = jzShapeLayer(ctx, 'table rules', 0, 0);
        aty_grp(S, 'frame', [[[x0, top], [x1, top]], [[x0, top + n * rowH], [x1, top + n * rowH]]], sc.fg, { width: lw * 2, alpha: 0.9, trim: hd + '100*' + e0 });
        var infos = [], nS = [], nP = [], iP = [];
        for (i = 0; i < n; i++) {
            var y = top + (i + 0.5) * rowH, ch = chars[i], info = null, a = 'oc((time-' + jzN(0.12 + i * 0.06) + ')/0.3)*K';
            if (!code && (jzIsHira(ch) || jzIsKata(ch))) { var r = jzRomaji(ch); if (r) info = r.toUpperCase(); }
            if (!info) { var cp = ch.length > 1 ? ((ch.charCodeAt(0) - 0xD800) * 0x400 + (ch.charCodeAt(1) - 0xDC00) + 0x10000) : ch.charCodeAt(0); info = 'U+' + jzPad(cp.toString(16).toUpperCase(), 4); }
            infos.push(info); nS.push(aty_p2(i + 1)); nP.push([x0, y]); iP.push([x1, y]);
            var iw = aty_tw(info, mono, fs, 0.12), la = xg + gs * 0.72, lb = x1 - iw - fs * 0.8;
            if (lb > la) aty_grp(S, 'leader ' + (i + 1), [[[la, y + fs * 0.2], [lb, y + fs * 0.2]]], sc.sub, { width: Math.max(2 * k, lw * 2), dash: [Math.max(2 * k, lw * 2), Math.max(5 * k, fs * 0.5)], trim: hd + '100*cl(' + a + ')', gop: hd + '100*cl(' + a + ')' });
            if (i < n - 1) aty_grp(S, 'row ' + (i + 1), [[[x0, top + (i + 1) * rowH], [x1, top + (i + 1) * rowH]]], sc.sub, { width: lw, alpha: 0.22, gop: hd + '100*cl(' + a + ')' });
        }
        jzNoGhost(S);
        if (jzP(ctx, 'head', true)) {
            aty_label(ctx, 'No.', x0, top - fs * 0.9, { size: fs * 0.8, op: e0 });
            aty_label(ctx, code ? 'CODE' : 'READING', x1, top - fs * 0.9, { size: fs * 0.8, align: 'right', op: e0 });
        }
        var bb = null;
        for (i = 0; i < n; i++) bb = jzUnion(bb, aty_draw(ctx, { text: chars[i], font: font, size: gs, x: xg, y: top + (i + 0.5) * rowH, color: sc.fg, mi: i }));
        var NL = aty_multi(ctx, nS, nP, { font: mono, size: fs, align: 'left', name: 'row numbers' });
        aty_multiFade(ctx, NL, 'oc((time-0.12-j*0.06)/0.3)*K');
        jzAnimator(NL.L, 'JZ First Row', [['ADBE Text Fill Color', jzHex(aty_acc(sc))]], 'textIndex<=2?100:0');
        var IL = aty_multi(ctx, infos, iP, { font: mono, size: fs, align: 'right', name: 'readings' });
        aty_multiFade(ctx, IL, 'oc((time-0.12-j*0.06)/0.3)*K');
        return bb;
    }
});
