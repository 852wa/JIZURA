// ================================================================ pack x2layA part 1 (AE port of src/11p_x2_layA.js): shared helpers + layouts 1-14
// xaPullQuote xaReceipt xaCatalogCard xaTimetable xaThumbIndex xaColumns xaInitialPlate xaSplitBaseline xaHalfKnock xaFormCombs
// xaWaybill xaErrata xaTabStops xaTriBand
//
// Techniques:
// - glyph positions are computed like the browser's layoutText (full-width glyphs = 1 em, latin estimated); every text layer is
//   anchored on the browser item's origin (axa_text), so rules / plates / labels line up with the AE text.
// - page furniture is collected in a "sheet" (axa_sheet + axa_R / axa_L / axa_O ...) in the browser's draw order and written
//   as ONE shape layer (axa_flush; groups are added last-first because the first group of a shape layer is the top one).
//   Growing rules are Trim Paths, growing plates are group scales about a pivot, fades are group opacities.
// - many small labels of one kind live in ONE text layer (axa_multi: one label per line, moved by a Position animator).
// - tilted cards: everything is parented to one null that carries the tilt (axa_tilt, applied by axa_reg).
// - the browser draws all furniture with ghost off: axa_reg marks every layer that is not the lyric jzNoGhost.

var AXA_CY = 0.38;     // glyph centre above the baseline (em)
var AXA_FNS = 'function cl(x){return Math.max(0,Math.min(1,x));}function oe(x){x=cl(x);return x>=1?1:1-Math.pow(2,-10*x);}' +
    'function oc(x){x=cl(x);return 1-Math.pow(1-x,3);}function ic(x){x=cl(x);return x*x*x;}function ie(x){x=cl(x);return x<=0?0:Math.pow(2,10*x-10);}' +
    'function ob(x,s){x=cl(x);var c=s+1;return 1+c*Math.pow(x-1,3)+s*Math.pow(x-1,2);}' +
    'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}' +
    'function inE(d,dl){return oe((time-dl)/d);}function inC(d,dl){return oc((time-dl)/d);}';
var AXA_LYR = [];      // lyric layers of the build in progress
var AXA_TILT = null;   // [cx, cy, deg] of the build in progress
// expression header: DUR, OS, OD, PO (exit progress), K (= the browser's out: 1 - inCubic(pOut)), XO (1 - inExpo(pOut)) + easings,
// inE(d, delay) / inC(d, delay) = the browser pack's inE / inC
function axa_hd(ctx) {
    var c = ctx.cut, hard = c.outDur != null && c.outDur <= 0, od = hard ? 0.05 : Math.max(0.12, c.outDur || 0.15);
    return 'var DUR=' + jzN(c.dur) + ',OS=' + jzN(hard ? c.dur : c.dur - od) + ',OD=' + jzN(od) + ';' + AXA_FNS + 'var PO=cl((time-OS)/OD),K=1-ic(PO),XO=1-ie(PO);\n';
}
function axa_iE(d, dl) { return 'inE(' + jzN(d) + ',' + jzN(dl || 0) + ')'; }
function axa_iC(d, dl) { return 'inC(' + jzN(d) + ',' + jzN(dl || 0) + ')'; }

/* ---------------------------------------------------------------- small helpers (ports of the browser pack's helpers) */
// the browser's deterministic hash J.h / J.r
function axa_h(a, b, c, d, e) {
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
function axa_r(a, b, c, d, e) { return axa_h(a, b, c, d, e) / 4294967296; }
function axa_k(ctx) { return jzU(ctx) / 1080; }                    // browser design px -> comp px
function axa_slots(t) { return jzChars(jzTrim(String(t || '')).replace(/[\s　]+/g, ' ')); }
function axa_isSp(c) { return c === ' ' || c === '　'; }
function axa_isSmall(c) { return !!c && 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ'.indexOf(c) >= 0; }
function axa_p2(n) { return jzPad(n, 2); }
function axa_short(t, k) { var a = jzChars(jzTrim(String(t || '').replace(/\s+/g, ' '))); return a.length > k ? a.slice(0, k).join('') + '…' : a.join(''); }
function axa_mix(o, q) { var r = jzCopy(o), k; for (k in q) if (q.hasOwnProperty(k)) r[k] = q[k]; return r; }
// J.splitLines, but never leave a line of punctuation only ('\n' separated)
function axa_splitL(t, per) {
    var ls = String(jzSplitLines(String(t), Math.max(1, per))).split('\r'), out = [], i, j, ok;
    for (i = 0; i < ls.length; i++) {
        var cs = jzChars(ls[i]); ok = out.length > 0;
        for (j = 0; j < cs.length && ok; j++) if (!(jzIsPunct(cs[j]) || cs[j] === ' ')) ok = false;
        if (ok) out[out.length - 1] += ls[i]; else out.push(ls[i]);
    }
    return out.join('\n');
}
// split into C runs of even length (Japanese: anywhere except before punctuation / small kana; Latin: between words)
function axa_evenSplit(t, C) {
    var s = jzTrim(String(t || ''));
    if (jzIsLatinText(s) || C <= 1) return axa_splitL(s, Math.ceil(jzChars(s).length / Math.max(1, C))).split('\n');
    var a = jzChars(s.replace(/\s+/g, '')), n = a.length, out = [], st = 0, i, c;
    for (i = 1; i <= C; i++) {
        c = i === C ? n : Math.round(i * n / C);
        while (c < n && c > st && (jzIsPunct(a[c]) || axa_isSmall(a[c]) || a[c] === 'ー')) c++;
        if (c > st) out.push(a.slice(st, c).join(''));
        st = c;
    }
    return out;
}
// split into at most C runs at natural break points; falls back to fewer runs, then to an even split
function axa_smartSplit(t, C, strict) {
    var s = jzTrim(String(t || '')), n = jzChars(s).length, cs = strict ? [C] : [C, C - 1], i, j;
    if (C <= 1 || n <= 1) return [s];
    for (i = 0; i < cs.length; i++) {
        var c = cs[i]; if (c < 2) break;
        var segs = axa_splitL(s, Math.ceil(n / c)).split('\n'), mx = 0;
        for (j = 0; j < segs.length; j++) mx = Math.max(mx, jzChars(segs[j]).length);
        if (segs.length <= C && mx <= Math.ceil(n / c) * 1.45 + 0.5) return segs;
    }
    return axa_evenSplit(s, C);
}
function axa_linesOf(t, L) { var s = jzTrim(String(t || '')), n = jzChars(s).length; return L <= 1 ? s : axa_splitL(s, Math.ceil(n / L)); }
function axa_mainLines(text, W, H, perL, perP) {
    var t = jzTrim(String(text || '')), n = jzCount(t), per = W < H ? perP : perL;
    return n <= per ? t : axa_splitL(t, Math.ceil(n / Math.ceil(n / per)));
}
/* colours */
function axa_onCol(sc, fill) {
    var c = [sc.bg, sc.fg, sc.ink, sc.sub], best = null, bv = 0, i;
    for (i = 0; i < c.length; i++) { if (!c[i] || String(c[i]).toUpperCase() === String(fill).toUpperCase()) continue; var k = jzContrast(c[i], fill); if (k > bv) { bv = k; best = c[i]; } }
    return bv >= 3 ? best : (jzLum(fill) > 0.45 ? '#000000' : '#FFFFFF');
}
function axa_plateCol(sc, pref) { for (var i = 0; i < pref.length; i++) if (pref[i] && jzContrast(pref[i], sc.bg) >= 1.7) return pref[i]; return sc.fg; }
function axa_paperOf(sc) { return axa_plateCol(sc, [sc.fg, sc.ink, sc.accent]); }
function axa_accOn(sc, fill) { return jzContrast(sc.accent, fill) >= 2 ? sc.accent : (sc.accent2 && jzContrast(sc.accent2, fill) >= 2 ? sc.accent2 : axa_onCol(sc, fill)); }
function axa_accentOn(sc) { return axa_accOn(sc, sc.bg); }
function axa_dimOf(sc) { return jzMixHex(sc.bg, sc.fg, 0.17); }
function axa_pickPlate(sc, k) { return axa_plateCol(sc, k === 'accent' ? [sc.accent, sc.ink, sc.fg] : k === 'ink' ? [sc.ink, sc.accent, sc.fg] : [sc.fg, sc.ink]); }
// the values every layout starts from (the browser's base(env)); lw = hairline, ls = label size
function axa_base(ctx) {
    var c = ctx.cut, M = jzU(ctx), k = M / 1080;
    return { W: ctx.W, H: ctx.H, sc: ctx.sc, c: c, M: M, k: k, port: ctx.W < ctx.H, txt: jzTrim(String(c.text || '')), seed: c.seed | 0,
        lw: Math.max(k, M * 0.0016), ls: jzClamp(M * 0.019, 11 * k, 24 * k), no: (c.line | 0) + 1 };
}

/* ---------------------------------------------------------------- text geometry (like the browser's layoutText) */
function axa_adv(ch, mono) {
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
// glyphs relative to the item origin: { ch, x, y (centre), w, h, li, sp }; .W .H .nL .LD
function axa_lay(str, size, o) {
    o = o || {};
    var tr = o.track || 0, mono = /mono/.test(String(o.font || '')), out = [], j, li, s = String(str).replace(/\r\n|\r/g, '\n');
    if (o.vertical) {
        var arr = jzChars(s.replace(/\n/g, '')), n = arr.length, st = size * (1 + tr), h = n * st - tr * size;
        for (j = 0; j < n; j++) out.push({ ch: arr[j], x: 0, y: -h / 2 + j * st + size / 2, w: size, h: size, li: 0, sp: axa_isSp(arr[j]) });
        out.W = size; out.H = Math.max(size, h); out.nL = 1; out.LD = st;
        return out;
    }
    var lines = s.split('\n'), nL = lines.length, lead = (o.lead || 1.3) * size, maxW = 1;
    for (li = 0; li < nL; li++) {
        var a2 = jzChars(lines[li]), ws = [], w = 0;
        for (j = 0; j < a2.length; j++) { ws.push(axa_adv(a2[j], mono) * size); w += ws[j] + (j < a2.length - 1 ? tr * size : 0); }
        maxW = Math.max(maxW, w);
        var x = o.align === 'left' ? 0 : o.align === 'right' ? -w : -w / 2, y = (li - (nL - 1) / 2) * lead;
        for (j = 0; j < a2.length; j++) { out.push({ ch: a2[j], x: x + ws[j] / 2, y: y, w: ws[j], h: size, li: li, sp: axa_isSp(a2[j]) }); x += ws[j] + tr * size; }
    }
    out.W = maxW; out.H = nL * lead - (lead - size); out.nL = nL; out.LD = lead;
    return out;
}
function axa_meas(str, size, o) { var l = axa_lay(str, size, o); return { w: l.W, h: l.H }; }
function axa_fit(str, font, maxW, maxH, o) { var q = jzCopy(o || {}); q.font = font; var m = axa_meas(str, 100, q); return 100 * Math.min(maxW / Math.max(1, m.w), maxH / Math.max(1, m.h)); }
// choose the line count (1..maxL) that gives the biggest type inside a box
function axa_fitBox(text, font, bw, bh, o, maxL) {
    var t = jzTrim(String(text || '')), n = jzChars(t).length, best = null, L;
    for (L = 1; L <= Math.min(maxL || 4, Math.max(1, n)); L++) {
        var tt = axa_linesOf(t, L);
        if (tt.split('\n').length < L && best) continue;
        var s = axa_fit(tt, font, bw, bh, o);
        if (!best || s > best.size * 1.04) best = { text: tt, size: s };
    }
    return best || { text: t, size: 10 };
}
function axa_ibb(o) {
    var lay = axa_lay(o.text, o.size, o), x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, i;
    for (i = 0; i < lay.length; i++) {
        var g = lay[i]; if (g.sp) continue;
        x0 = Math.min(x0, g.x - g.w / 2); x1 = Math.max(x1, g.x + g.w / 2); y0 = Math.min(y0, g.y - g.h / 2); y1 = Math.max(y1, g.y + g.h / 2);
    }
    if (x0 > x1) { x0 = x1 = 0; y0 = y1 = 0; }
    return { x0: o.x + x0, x1: o.x + x1, y0: o.y + y0, y1: o.y + y1, cx: o.x + (x0 + x1) / 2, cy: o.y + (y0 + y1) / 2 };
}
// non-space glyph centres in comp px: { ch, x, y, w, h, li }
function axa_gpts(o) {
    var lay = axa_lay(o.text, o.size, o), out = [];
    for (var i = 0; i < lay.length; i++) { var g = lay[i]; if (g.sp) continue; out.push({ ch: g.ch, x: o.x + g.x, y: o.y + g.y, w: g.w, h: g.h, li: g.li }); }
    return out;
}

/* ---------------------------------------------------------------- layer builders */
// a text layer whose browser item origin (o.x, o.y) is the layer position. o: text font size x y align track lead vertical color alpha rot name
function axa_text(ctx, str, o) {
    var size = o.size, V = !!o.vertical, txt, nL, LD, i, tr = o.track || 0;
    if (V) {
        var cs = jzChars(String(str).replace(/[\r\n]/g, ''));
        for (i = 0; i < cs.length; i++) if (cs[i] === ' ') cs[i] = '　';
        txt = cs.join('\r'); nL = cs.length; LD = size * (1 + tr);
    } else { txt = String(str).replace(/\r\n|\n/g, '\r'); nL = txt.split('\r').length; LD = size * (o.lead || 1.3); }
    var L = jzText(ctx, txt, { font: o.font, size: size, color: o.color || ctx.sc.fg, x: o.x, y: o.y, align: V ? 'center' : o.align, track: V ? 0 : tr, leading: LD,
        name: o.name, opacity: o.alpha });
    // wide tracking: After Effects also tracks after the last glyph of a line, which pushes centred / right-set lines off their axis
    var ax = (!V && tr >= 0.2) ? (o.align === 'left' ? 0 : o.align === 'right' ? tr * size : tr * size / 2) : 0;
    jzXf(L, 'ADBE Anchor Point').setValue([-ax, -AXA_CY * size + (nL - 1) / 2 * LD]);
    jzXf(L, 'ADBE Position').setValue([o.x, o.y]);
    if (o.rot) jzXf(L, 'ADBE Rotate Z').setValue(o.rot);
    return L;
}
// sizes come from estimated advance widths; when the installed face sets the block clearly wider than the box it was fitted to
// (o.fitW, e.g. Latin lyrics in a wide display face), the block is scaled down about its own origin
function axa_refit(L, o) {
    if (!o.fitW || o.vertical) return;
    var k = o.fitW / Math.max(1, jzRect(L).width);
    if (!(k < 0.97)) return;
    jzTextDoc(L, function (td) { td.fontSize = Math.max(1, td.fontSize * k); try { td.leading = td.leading * k; } catch (e) {} });
    var A = jzXf(L, 'ADBE Anchor Point').value;
    jzXf(L, 'ADBE Anchor Point').setValue([A[0] * k, A[1] * k]);
    o.size *= k;
}
// the lyric item: layer + the cut's motion + treatment; returns the bbox (o.L = the layer)
function axa_draw(ctx, o) {
    var L = axa_text(ctx, o.text, o);
    axa_refit(L, o);
    AXA_LYR.push(L);
    jzAnimate(ctx, L, { mi: o.mi || 0 });
    o.L = L;
    return axa_ibb(o);
}
// small annotation label (main pass only); o: font size align track color alpha rot vertical op (opacity factor expression 0..1)
function axa_label(ctx, text, x, y, o) {
    o = o || {};
    if (!String(text).length) return null;
    var L = axa_text(ctx, String(text), { font: o.font || jzMonoF(ctx), size: o.size || axa_base(ctx).ls, x: x, y: y, align: o.align || 'left', track: o.track != null ? o.track : 0.1,
        color: o.color || ctx.sc.sub, alpha: o.alpha, rot: o.rot, vertical: o.vertical, name: o.name || ('label ' + String(text).substr(0, 20)) });
    if (o.op) jzSetExpr(jzXf(L, 'ADBE Opacity'), axa_hd(ctx) + 'value*cl(' + o.op + ')');
    return L;
}
// many labels in ONE text layer: strs[j] sits with its reference point at pts[j] (align: left edge / centre / right edge, vertical centre)
// returns { L, li: label index per AE glyph (textIndex-1) }
function axa_multi(ctx, strs, pts, o) {
    var size = o.size, LD = size * 1.2, li = [], offs = [], j, k;
    if (!strs.length) return null;
    var L = jzText(ctx, strs.join('\r'), { font: o.font || jzMonoF(ctx), size: size, color: o.color || ctx.sc.sub, x: 0, y: 0, align: o.align || 'center', track: o.track != null ? o.track : 0.1,
        leading: LD, name: o.name || 'labels', opacity: o.alpha });
    jzXf(L, 'ADBE Anchor Point').setValue([0, 0]); jzXf(L, 'ADBE Position').setValue([0, 0]);
    for (j = 0; j < strs.length; j++) {
        var cs = jzChars(strs[j]);
        for (k = 0; k < cs.length; k++) { li.push(j); offs.push([pts[j][0], pts[j][1] + AXA_CY * size - j * LD]); }
    }
    if (offs.length) jzCharOffsets(L, offs, 'JZ Place');
    return { L: L, li: li };
}
// per-label fade of an axa_multi layer: vals[j] = one number per label, a = factor expression (0..1) that may use D (the label's number)
function axa_multiOp(ctx, Mu, vals, a) {
    if (!Mu) return;
    var v = [], i;
    for (i = 0; i < Mu.li.length; i++) v.push(jzN(vals[Mu.li[i]] || 0));
    jzAnimator(Mu.L, 'JZ Label Fade', [['ADBE Text Opacity', 0]], axa_hd(ctx) + 'var V=[' + v.join(',') + '];var D=V[textIndex-1]||0;(1-cl(' + a + '))*100');
}
// move a layer's anchor to a comp point (the layer then turns / scales about it)
function axa_pivot(L, px, py) {
    var A = jzXf(L, 'ADBE Anchor Point').value, Pp = jzXf(L, 'ADBE Position').value, r = -jzXf(L, 'ADBE Rotate Z').value * Math.PI / 180;
    var dx = px - Pp[0], dy = py - Pp[1];
    jzXf(L, 'ADBE Anchor Point').setValue([A[0] + dx * Math.cos(r) - dy * Math.sin(r), A[1] + dx * Math.sin(r) + dy * Math.cos(r)]);
    jzXf(L, 'ADBE Position').setValue([px, py]);
}
function axa_parent(L, Pn) { try { L.setParentWithJump(Pn); } catch (e) { try { L.parent = Pn; } catch (e2) { jzWarn('parent: ' + e2.toString()); } } }
// track matte: L shows only inside (ALPHA) / outside (ALPHA_INVERTED) Mt, which goes directly above L. AE 23+ links mattes with setTrackMatte
function axa_matte(L, Mt, type) {
    var ok = false;
    Mt.moveBefore(L);
    if (typeof L.setTrackMatte === 'function') { try { L.setTrackMatte(Mt, type); ok = true; } catch (e) { ok = false; } }
    if (!ok) { try { L.trackMatteType = type; } catch (e2) { jzWarn('matte: ' + e2.toString()); } }
    try { Mt.enabled = false; } catch (e3) {}
}

/* ---------------------------------------------------------------- sheets: shapes collected in draw order, written as one shape layer */
// spec options (o): trim / start (0..1 factor expressions), op (0..1 factor), sc ('[fx,fy]' expression) + piv [x, y], pos ('[dx,dy]'),
// rot (degrees expression, about piv), dash [dash, gap], cap (2 = round), closed, n (name)
function axa_sheet(ctx, name) { return { ctx: ctx, name: name, g: [], lop: null }; }
function axa_spec(S, o, q) { var s = o ? jzCopy(o) : {}, k; for (k in q) if (q.hasOwnProperty(k)) s[k] = q[k]; S.g.push(s); return s; }
function axa_R(S, x, y, w, h, col, a, o) { if (!(w > 0 && h > 0)) return null; return axa_spec(S, o, { k: 'rect', x: x, y: y, w: w, h: h, fill: col, a: a }); }
function axa_RR(S, x, y, w, h, r, fill, a, stroke, lw, o) { if (!(w > 0 && h > 0)) return null; return axa_spec(S, o, { k: 'rect', x: x, y: y, w: w, h: h, round: r, fill: fill, stroke: stroke, lw: lw, a: a }); }
function axa_F(S, x, y, w, h, col, lw, a, o) { if (!(w > 0 && h > 0)) return null; return axa_spec(S, o, { k: 'rect', x: x, y: y, w: w, h: h, stroke: col, lw: lw, a: a }); }
function axa_L(S, segs, col, lw, a, o) { if (!segs.length) return null; return axa_spec(S, o, { k: 'path', segs: segs, stroke: col, lw: lw, a: a }); }
function axa_P(S, pts, col, a, o) { return axa_spec(S, o, { k: 'path', segs: [pts], closed: true, fill: col, a: a }); }
function axa_O(S, cx, cy, r, fill, stroke, lw, a, o) { if (!(r > 0)) return null; return axa_spec(S, o, { k: 'ell', x: cx, y: cy, r: r, fill: fill, stroke: stroke, lw: lw, a: a }); }
// dashed stroke: add the dash properties first, then fetch them by matchName (each addProperty invalidates the earlier ones)
function axa_dash(st, d, gp) {
    var D = st.property('ADBE Vector Stroke Dashes'), p1 = null, p2 = null;
    try { D.addProperty('ADBE Vector Stroke Dash 1'); D.addProperty('ADBE Vector Stroke Gap 1'); } catch (e) {}
    try { p1 = D.property('ADBE Vector Stroke Dash 1'); p2 = D.property('ADBE Vector Stroke Gap 1'); } catch (e1) { jzWarn('dashes: ' + e1.toString()); }
    if (p1) p1.setValue(Math.max(0.01, d)); if (p2) p2.setValue(Math.max(0.01, gp));
}
function axa_grp(L, hd, s, idx) {
    var g = jzGrp(L, s.n || (s.k + ' ' + idx)), a = (s.a == null ? 1 : jzClamp(s.a, 0, 1)) * 100, i, st, tg, pv = s.piv || [0, 0];
    if (s.k === 'rect') jzAddRect(g, Math.max(0.01, s.w), Math.max(0.01, s.h), Math.max(0, Math.min(s.round || 0, s.w / 2, s.h / 2)), s.x + s.w / 2, s.y + s.h / 2);
    else if (s.k === 'ell') jzAddEllipse(g, s.r * 2, s.r * 2, s.x, s.y);
    else for (i = 0; i < s.segs.length; i++) jzAddPath(g, s.segs[i], !!s.closed);
    if (s.stroke) {
        st = jzAddStroke(g, s.stroke, Math.max(0.1, s.lw || 1), a);
        if (s.cap) { try { st.property('ADBE Vector Stroke Line Cap').setValue(s.cap); } catch (e) {} }
        if (s.dash) axa_dash(st, s.dash[0], s.dash[1]);
    }
    if (s.fill) jzAddFill(g, s.fill, a);
    if (s.trim || s.start) jzAddTrimPaths(g, s.trim ? hd + '100*cl(' + s.trim + ')' : null, s.start ? hd + '100*cl(' + s.start + ')' : null);
    tg = jzGX(g);
    if (s.piv) { tg.property('ADBE Vector Anchor').setValue(pv); tg.property('ADBE Vector Position').setValue(pv); }
    if (s.sc) jzSetExpr(tg.property('ADBE Vector Scale'), hd + 'var s=' + s.sc + ';[100*s[0],100*s[1]]');
    if (s.pos) jzSetExpr(tg.property('ADBE Vector Position'), hd + 'var d=' + s.pos + ';[' + jzN(pv[0]) + '+d[0],' + jzN(pv[1]) + '+d[1]]');
    if (s.rot) jzSetExpr(tg.property('ADBE Vector Rotation'), hd + s.rot);
    if (s.op) jzSetExpr(tg.property('ADBE Vector Group Opacity'), hd + '100*cl(' + s.op + ')');
}
// write the sheet; back = send it behind everything built so far (S.lop = opacity factor expression for the whole layer)
function axa_flush(S, back) {
    if (!S.g.length) return null;
    var L = jzShapeLayer(S.ctx, S.name, 0, 0), hd = axa_hd(S.ctx), i;
    for (i = S.g.length - 1; i >= 0; i--) axa_grp(L, hd, S.g[i], i + 1);
    if (S.lop) jzSetExpr(jzXf(L, 'ADBE Opacity'), hd + 'value*cl(' + S.lop + ')');
    if (back) L.moveToEnd();
    S.g = [];
    return L;
}
// greeked body text: rows of bars growing from the left (e = 0..1 factor expression)
function axa_greek(S, x, y, w, rows, pitch, c, a, seed, e, th) {
    var segs = [], r, n = Math.min(rows, 60); th = th || 0.36;
    for (r = 0; r < n; r++) {
        var k = r === rows - 1 ? 0.35 + 0.3 * axa_r(seed, r, 3) : 0.82 + 0.18 * axa_r(seed, r, 5), yy = y + r * pitch + pitch * th / 2;
        segs.push([[x, yy], [x + w * k, yy]]);
    }
    return axa_L(S, segs, c, pitch * th, a, { trim: e, n: 'greek' });
}
// barcode strip; a = opacity factor expression, e = reveal factor expression (bars appear from the left)
function axa_barcode(S, x, y, w, h, c, a, seed, e) {
    var px = 0, u = w / 96, i, segs = [], p0 = 0;
    for (i = 0; i < 48; i++) {
        var bw = 1 + (axa_h(seed, i, 41) % 3), gp = 1 + (axa_h(seed, i, 43) % 2);
        if (px + bw > 96) break;
        if (!segs.length) p0 = px;
        var xa = x + px * u, xb = xa + bw * u * 0.8;
        segs.push([[xa, y], [xb, y], [xb, y + h], [xa, y + h]]);
        px += bw + gp;
        if (segs.length >= 8) { axa_spec(S, null, { k: 'path', segs: segs, closed: true, fill: c, a: 1, n: 'barcode', op: '(' + e + ')*96>' + jzN(p0) + '?(' + a + '):0' }); segs = []; }
    }
    if (segs.length) axa_spec(S, null, { k: 'path', segs: segs, closed: true, fill: c, a: 1, n: 'barcode', op: '(' + e + ')*96>' + jzN(p0) + '?(' + a + '):0' });
}
// the whole build turns about (cx, cy) — applied by axa_reg once every layer exists
function axa_tilt(cx, cy, deg) { AXA_TILT = [cx, cy, deg || 0]; }
// registers a layout: lyric layers keep their ghosts, everything else is main-pass only; tilted builds hang on one null
function axa_reg(key, def) {
    var b = def.build;
    def.build = function (ctx) {
        AXA_LYR = []; AXA_TILT = null;
        var bb = b(ctx), keep = {}, i, L;
        for (i = 0; i < AXA_LYR.length; i++) { try { keep[AXA_LYR[i].index] = 1; } catch (e) {} }
        for (i = 1; i <= ctx.comp.numLayers; i++) if (!keep[i]) jzNoGhost(ctx.comp.layer(i));
        if (AXA_TILT && AXA_TILT[2]) {
            var N = ctx.comp.layers.addNull(ctx.comp.duration); N.name = 'card tilt';
            jzXf(N, 'ADBE Anchor Point').setValue([AXA_TILT[0], AXA_TILT[1]]); jzXf(N, 'ADBE Position').setValue([AXA_TILT[0], AXA_TILT[1]]);
            jzNoGhost(N);
            var ni = N.index;
            for (i = 1; i <= ctx.comp.numLayers; i++) { if (i === ni) continue; L = ctx.comp.layer(i); if (!L.parent) axa_parent(L, N); }
            jzXf(N, 'ADBE Rotate Z').setValue(AXA_TILT[2]);     // after parenting, so the children keep their own values
        }
        AXA_LYR = []; AXA_TILT = null;
        return bb;
    };
    jzReg('layout', key, def);
}

/* ================================================================== 1 xaPullQuote — 抜き書き */
axa_reg('xaPullQuote', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), side: rng.pick(['c', 'c', 'l', 'r']), rule: rng.pick(['thick', 'double', 'thinthick']), cols: rng.pick([3, 4]), acc: rng.chance(0.6) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, lw = B.lw, ls = B.ls;
        var font = jzP(ctx, 'font', jzSerifF(ctx)), side = jzP(ctx, 'side', 'c'), rule = jzP(ctx, 'rule', 'thick');
        var cols = port ? 2 : jzP(ctx, 'cols', 3), mx = W * 0.07, my = H * 0.08, gut = W * 0.035, colW = (W - mx * 2 - gut * (cols - 1)) / cols;
        var bw = port ? W - mx * 2 : W * 0.56, o = { lead: 1.25, track: 0.03 };
        var f = axa_fitBox(B.txt, font, bw * 0.9, H * (port ? 0.3 : 0.4), o, 3), size = Math.min(f.size, M * 0.2);
        var it = { text: f.text, font: font, size: size, color: sc.fg, lead: 1.25, track: 0.03, fitW: bw * 0.9 };
        var m = axa_meas(it.text, size, it), bh = m.h + size * 1.15;
        var bx0 = (port || side === 'c') ? (W - bw) / 2 : side === 'l' ? mx : W - mx - bw, by0 = H / 2 - bh / 2, bx1 = bx0 + bw, by1 = by0 + bh;
        // body text bars, skipping the quote box (six rows share one Trim Paths)
        var pitch = M * 0.032, rows = Math.floor((H - my * 2) / pitch), dim = axa_dimOf(sc), padX = gut * 0.7, S = axa_sheet(ctx, 'pull quote page'), c, r, q;
        for (c = 0; c < cols; c++) {
            var x = mx + c * (colW + gut), segs = [], r0 = 0;
            for (r = 0; r < rows; r++) {
                var y = my + r * pitch, k = axa_r(B.seed, c, r, 7) < 0.1 ? 0.3 + 0.4 * axa_r(B.seed, c, r, 8) : 1, ss = [[x, x + colW * k]];
                if (y + pitch > by0 - pitch * 0.6 && y < by1 + pitch * 0.6) ss = [[x, Math.min(x + colW * k, bx0 - padX)], [Math.max(x, bx1 + padX), x + colW * k]];
                for (q = 0; q < ss.length; q++) if (ss[q][1] - ss[q][0] > colW * 0.14) segs.push([[ss[q][0], y + pitch * 0.18], [ss[q][1], y + pitch * 0.18]]);
                if (r % 6 === 5 || r === rows - 1) { axa_L(S, segs, dim, pitch * 0.36, 0.9, { trim: axa_iC(0.4, 0.012 * (r0 + r) / 2 + 0.05 * c) + '*K', n: 'body ' + (c + 1) }); segs = []; r0 = r + 1; }
            }
        }
        var rc = jzP(ctx, 'acc', false) ? axa_accentOn(sc) : sc.fg, e2 = axa_iE(0.55, 0.05) + '*K', th = Math.max(3 * B.k, size * 0.05), gs = '[' + e2 + ',1]';
        if (rule === 'thick') { axa_R(S, bx0, by0, bw, th, rc, 1, { sc: gs, piv: [bx0, by0] }); axa_R(S, bx0, by1 - th, bw, th, rc, 1, { sc: gs, piv: [bx1, by1] }); }
        else if (rule === 'double') axa_L(S, [[[bx0, by0], [bx1, by0]], [[bx0, by0 + th * 0.9], [bx1, by0 + th * 0.9]], [[bx0, by1 - th * 0.9], [bx1, by1 - th * 0.9]], [[bx0, by1], [bx1, by1]]], rc, Math.max(lw, th * 0.3), 1, { trim: e2 });
        else {
            axa_L(S, [[[bx0, by0], [bx1, by0]], [[bx1, by1], [bx0, by1]]], rc, lw, 1, { trim: e2 });
            axa_R(S, bx0, by0 + th * 0.7, bw, th, rc, 1, { sc: gs, piv: [bx0, by0] }); axa_R(S, bx0, by1 - th * 1.7, bw, th, rc, 1, { sc: gs, piv: [bx1, by1] });
        }
        axa_flush(S, true);
        axa_label(ctx, 'Q.' + axa_p2(B.no), bx0, by0 - ls * 1.1, { op: axa_iC(0.3, 0.3) + '*K', color: rc });
        return axa_draw(ctx, axa_mix(it, { x: bx0 + bw / 2, y: H / 2 }));
    }
});

/* ================================================================== 2 xaReceipt — レシート */
axa_reg('xaReceipt', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['body', 'display', 'mono'])), tilt: rng.pick([0, 0, -2, 2.5]), bar: rng.chance(0.7), rows: rng.int(2, 3) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, port = B.port, lw = B.lw, ls = B.ls, font = jzP(ctx, 'font', jzBodyF(ctx));
        var pw = port ? W * 0.8 : Math.min(W * 0.46, H * 0.84), ph = H * 0.86, x0 = (W - pw) / 2, y0 = (H - ph) / 2;
        var paper = axa_paperOf(sc), ink = axa_onCol(sc, paper), faint = jzMixHex(paper, ink, 0.45), mono = jzMonoF(ctx), S = axa_sheet(ctx, 'receipt'), i, k;
        axa_tilt(W / 2, H / 2, jzP(ctx, 'tilt', 0));
        // the roll prints downwards: the paper (with its torn edge) is scaled from the top
        var nT = 22, d = pw * 0.014, pts = [[x0, y0], [x0 + pw, y0]];
        for (i = 0; i <= nT * 2; i++) pts.push([x0 + pw - pw * i / (nT * 2), y0 + ph + (i % 2 ? d : 0)]);
        axa_P(S, pts, paper, 1, { sc: '[1,' + axa_iE(0.5, 0) + ']', piv: [W / 2, y0], op: 'K', n: 'paper' });
        function vis(fy) { return 'cl((' + axa_iE(0.5, 0) + '-' + jzN(fy) + ')/0.05)*K'; }
        function Y(fy) { return y0 + ph * fy; }
        var xl = x0 + pw * 0.08, xr = x0 + pw * 0.92, dsh = [lw * 5, lw * 4];
        axa_label(ctx, 'RECEIPT', W / 2, Y(0.065), { align: 'center', size: ls * 1.35, track: 0.5, color: ink, op: vis(0.065), font: mono });
        axa_label(ctx, 'No.' + String(1000 + (axa_h(B.seed, 3) % 9000)), xl, Y(0.115), { color: faint, op: vis(0.115), size: ls * 0.9 });
        axa_label(ctx, jzFmtTime(B.c.start || 0), xr, Y(0.115), { align: 'right', color: faint, op: vis(0.115), size: ls * 0.9 });
        axa_L(S, [[[xl, Y(0.15)], [xr, Y(0.15)]]], ink, lw * 1.3, 1, { dash: dsh, op: vis(0.15) });
        for (k = 0; k < jzP(ctx, 'rows', 2); k++) {
            var fy = 0.195 + k * 0.045;
            axa_R(S, xl, Y(fy) - ls * 0.2, pw * (0.26 + 0.2 * axa_r(B.seed, k, 9)), ls * 0.4, faint, 1, { op: vis(fy) });
            axa_label(ctx, 'x' + (1 + (axa_h(B.seed, k, 5) % 3)), xr, Y(fy), { align: 'right', color: faint, op: vis(fy) });
        }
        axa_L(S, [[[xl, Y(0.35)], [xr, Y(0.35)]]], ink, lw * 1.3, 1, { dash: dsh, op: vis(0.35) });
        axa_L(S, [[[xl, Y(0.73)], [xr, Y(0.73)]]], ink, lw * 1.3, 1, { dash: dsh, op: vis(0.73) });
        axa_label(ctx, 'TOTAL', xl, Y(0.785), { color: ink, op: vis(0.785), size: ls * 1.3, track: 0.2 });
        axa_label(ctx, jzCount(B.txt) + ' GLYPHS', xr, Y(0.785), { align: 'right', color: ink, op: vis(0.785), size: ls * 1.3 });
        if (jzP(ctx, 'bar', true)) axa_barcode(S, x0 + pw * 0.2, Y(0.85), pw * 0.6, ph * 0.075, ink, vis(0.9), B.seed, '1');
        else axa_label(ctx, '* THANK YOU *', W / 2, Y(0.89), { align: 'center', color: ink, op: vis(0.9), track: 0.3 });
        axa_flush(S, true);
        var o = { lead: 1.2, track: 0.02 }, f = axa_fitBox(B.txt, font, pw * 0.82, ph * 0.31, o, 4), size = Math.min(f.size, pw * 0.36);
        return axa_draw(ctx, { text: f.text, font: font, size: size, x: W / 2, y: Y(0.54), color: ink, lead: 1.2, track: 0.02, fitW: pw * 0.82 });
    }
});

/* ================================================================== 3 xaCatalogCard — 図書カード */
axa_reg('xaCatalogCard', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['serif', 'body'])), tilt: rng.pick([-2, 0, 1.5]), back: rng.chance(0.6), cls: rng.int(100, 899) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, lw = B.lw, font = jzP(ctx, 'font', jzSerifF(ctx));
        var cw = port ? W * 0.88 : Math.min(W * 0.8, H * 0.8 * 1.62), ch = port ? Math.min(cw * 1.25, H * 0.62) : cw * 0.6, x0 = (W - cw) / 2, y0 = (H - ch) / 2;
        var paper = axa_paperOf(sc), ink = axa_onCol(sc, paper), faint = jzMixHex(paper, ink, 0.28), red = axa_accOn(sc, paper), mono = jzMonoF(ctx), S = axa_sheet(ctx, 'catalogue card'), k;
        axa_tilt(W / 2, H / 2, jzP(ctx, 'tilt', 0));
        var e = axa_iE(0.4, 0), a = e, r = M * 0.012, nR = port ? 9 : 6, g = ch * 0.69 / nR, yr = y0 + ch * (port ? 0.15 : 0.2), xm = x0 + cw * 0.17;
        S.lop = 'K';
        if (jzP(ctx, 'back', false)) axa_RR(S, x0 - M * 0.022, y0 - M * 0.026, cw, ch, r, jzMixHex(paper, sc.bg, 0.45), 1, null, 0, { op: a, pos: '[(1-' + e + ')*' + jzN(M * 0.022) + ',(1-' + e + ')*' + jzN(M * 0.026) + ']', n: 'card behind' });
        axa_RR(S, x0, y0, cw, ch, r, paper, 1, null, 0, { op: a, pos: '[0,(1-' + e + ')*' + jzN(M * 0.03) + ']', n: 'card' });
        var e2 = axa_iE(0.6, 0.12);
        axa_R(S, x0, yr - lw, cw, lw * 2.4, red, 1, { sc: '[' + e2 + ',1]', piv: [x0, yr], n: 'head rule' });
        for (k = 1; k <= nR; k++) axa_L(S, [[[x0, yr + g * k], [x0 + cw, yr + g * k]]], faint, lw, 1, { trim: axa_iE(0.6, 0.12 + k * 0.04), n: 'rule ' + k });
        axa_L(S, [[[xm, y0], [xm, y0 + ch]], [[xm + lw * 4, y0], [xm + lw * 4, y0 + ch]]], red, lw, 0.6, { trim: e2, n: 'margin' });
        axa_O(S, W / 2, y0 + ch * 0.925, ch * 0.032, sc.bg, null, 0, 1, { op: a, n: 'hole' });
        axa_flush(S, true);
        var la = axa_iC(0.3, 0.3) + '*K', cls = [String(jzP(ctx, 'cls', 100)) + '.' + (axa_h(B.seed, 2) % 10), jzIsLatinText(B.txt) ? 'Ly' : 'Ji', axa_p2(B.no)];
        for (k = 0; k < 3; k++) axa_label(ctx, cls[k], x0 + cw * 0.085, yr + g * (k + 0.5), { align: 'center', color: ink, op: la, font: mono });
        axa_label(ctx, 'CARD No. ' + jzPad(B.no, 4), xm + cw * 0.03, y0 + ch * (port ? 0.08 : 0.11), { color: faint, op: la, font: mono });
        axa_label(ctx, axa_short(B.c.lineText || B.txt, port ? 16 : 26), xm + cw * 0.03, yr + g * (nR - 0.5), { color: faint, op: la, font: jzBodyF(ctx), track: 0.04 });
        axa_label(ctx, jzCount(B.txt) + ' p. ; 21 cm.', xm + cw * 0.03, yr + g * (nR + 0.5), { color: faint, op: la, font: mono });
        var o = { lead: 1.22, track: 0.03 }, f = axa_fitBox(B.txt, font, cw * 0.74, g * (nR - 2.5), o, port ? 4 : 3), size = Math.min(f.size, ch * 0.3);
        return axa_draw(ctx, { text: f.text, font: font, size: size, align: 'left', x: xm + cw * 0.03, y: yr + g * (nR - 1) / 2 + g * 0.05, color: ink, lead: 1.22, track: 0.03, fitW: cw * 0.74 });
    }
});

/* ================================================================== 4 xaTimetable — 時刻表 */
axa_reg('xaTimetable', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), hl: rng.pick(['bar', 'tri', 'band']), pre: rng.int(1, 2), post: rng.int(1, 2), h0: rng.int(5, 22), m0: rng.int(0, 20) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, lw = B.lw, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), hl = jzP(ctx, 'hl', 'bar');
        var n = jzChars(B.txt).length, per = port ? 5 : 10, i, r;
        var lines = n <= per ? [B.txt] : axa_smartSplit(B.txt, Math.min(port ? 4 : 3, Math.ceil(n / per)), port);
        var pre = jzP(ctx, 'pre', 1), post = port && lines.length < 3 ? jzP(ctx, 'post', 1) + 1 : jzP(ctx, 'post', 1), rows = pre + lines.length + post;
        var tw = W * 0.86, x0 = W * 0.07, rh = Math.min(H * 0.82 / (rows + 0.6), M * 0.24), hh = rh * 0.6, y0 = (H - rh * rows - hh) / 2;
        var c1 = tw * (port ? 0.22 : 0.19), c3 = tw * (port ? 0.11 : 0.09), mono = jzMonoF(ctx), dim = axa_dimOf(sc), acc = axa_accentOn(sc);
        var head = axa_pickPlate(sc, 'ink'), hon = axa_onCol(sc, head), S = axa_sheet(ctx, 'timetable');
        axa_R(S, x0, y0, tw, hh, head, 1, { sc: '[' + axa_iE(0.45, 0) + '*K,1]', piv: [x0, y0], n: 'header' });
        var la = axa_iC(0.3, 0.2) + '*K';
        axa_label(ctx, 'TIME', x0 + tw * 0.015, y0 + hh / 2, { color: hon, op: la, size: hh * 0.42 });
        axa_label(ctx, 'LINE ' + axa_p2(B.no), x0 + c1 + tw * 0.02, y0 + hh / 2, { color: hon, op: la, size: hh * 0.42 });
        axa_label(ctx, 'PF', x0 + tw - tw * 0.015, y0 + hh / 2, { color: hon, op: la, size: hh * 0.42, align: 'right' });
        var lyW = tw - c1 - c3 - tw * 0.04, size = 1e9;
        for (i = 0; i < lines.length; i++) size = Math.min(size, axa_fit(lines[i], font, lyW, rh * 0.62, { track: 0.03 }));
        var bb = null, mins = jzP(ctx, 'm0', 0), h0 = jzP(ctx, 'h0', 9), its = [];
        var tA = [[], [], []], tB = [[], [], []], nA = [[], [], []], nB = [[], [], []], bs = Math.min(rh * 0.44, c3 * 0.7);     // live / other rows: [strings, points, delays]
        for (r = 0; r < rows; r++) {
            var y = y0 + hh + rh * r, cy = y + rh / 2, li = r - pre, isL = li >= 0 && li < lines.length, dl = 0.08 + r * 0.05, a = axa_iC(0.3, dl) + '*K';
            mins += 3 + (axa_h(B.seed, r, 11) % 9);
            var tm = axa_p2((h0 + Math.floor(mins / 60)) % 24) + ':' + axa_p2(mins % 60), tt = isL ? tA : tB, nn = isL ? nA : nB;
            axa_L(S, [[[x0, y + rh], [x0 + tw, y + rh]]], sc.sub, lw, 0.6, { trim: axa_iE(0.5, dl), op: 'K', n: 'row rule ' + (r + 1) });
            if (isL && hl === 'band') axa_R(S, x0, y + lw, tw, rh - lw * 2, dim, 0.7, { sc: '[' + axa_iE(0.5, 0.1 + r * 0.05) + ',1]', piv: [x0, y], op: 'K', n: 'band' });
            tt[0].push(tm); tt[1].push([x0 + tw * 0.015, cy]); tt[2].push(dl);
            if (isL) {
                if (hl === 'bar') axa_R(S, x0 - tw * 0.012, y + rh * 0.14, tw * 0.008, rh * 0.72, acc, 1, { sc: '[1,' + axa_iE(0.4, 0.15 + r * 0.05) + ']', piv: [x0, y + rh * 0.14], op: 'K', n: 'mark' });
                if (hl === 'tri') { var s = rh * 0.13, tx = x0 + c1 - s * 1.2; axa_P(S, [[tx, cy - s], [tx + s * 1.4, cy], [tx, cy + s]], acc, 1, { op: a, n: 'mark' }); }
                its.push({ text: lines[li], font: font, size: size, align: 'left', x: x0 + c1 + tw * 0.02, y: cy, track: 0.03, color: sc.fg, mi: li });
            } else axa_R(S, x0 + c1 + tw * 0.02, cy - rh * 0.07, lyW * (0.3 + 0.4 * axa_r(B.seed, r, 13)), rh * 0.14, dim, 1, { sc: '[' + axa_iE(0.5, 0.1 + r * 0.05) + ',1]', piv: [x0 + c1 + tw * 0.02, cy], op: 'K', n: 'other train' });
            axa_RR(S, x0 + tw - tw * 0.015 - bs, cy - bs / 2, bs, bs, bs * 0.2, null, isL ? 1 : 0.5, isL ? acc : sc.sub, lw * 1.4, { op: a, n: 'platform' });
            nn[0].push(String(1 + (axa_h(B.seed, r, 17) % 8))); nn[1].push([x0 + tw - tw * 0.015 - bs / 2, cy]); nn[2].push(dl);
        }
        axa_flush(S, true);
        var ts = Math.min(rh * 0.34, c1 * 0.2), fa = 'oc((time-D)/0.3)*K';
        axa_multiOp(ctx, axa_multi(ctx, tA[0], tA[1], { font: mono, size: ts, align: 'left', track: 0.02, color: sc.fg, name: 'times' }), tA[2], fa);
        axa_multiOp(ctx, axa_multi(ctx, tB[0], tB[1], { font: mono, size: ts, align: 'left', track: 0.02, color: sc.sub, alpha: 0.7, name: 'other times' }), tB[2], fa);
        axa_multiOp(ctx, axa_multi(ctx, nA[0], nA[1], { size: bs * 0.6, align: 'center', track: 0, color: acc, name: 'platforms' }), nA[2], fa);
        axa_multiOp(ctx, axa_multi(ctx, nB[0], nB[1], { size: bs * 0.6, align: 'center', track: 0, color: sc.sub, alpha: 0.6, name: 'other platforms' }), nB[2], fa);
        for (i = 0; i < its.length; i++) bb = jzUnion(bb, axa_draw(ctx, its[i]));
        return bb;
    }
});

/* ================================================================== 5 xaThumbIndex — 爪見出し */
axa_reg('xaThumbIndex', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), side: rng.pick(['r', 'r', 'l']), nT: rng.pick([6, 7, 8]), act: rng.int(0, 7), col: rng.pick(['accent', 'accent', 'ink']) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, lw = B.lw, ls = B.ls, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display'));
        var nT = jzP(ctx, 'nT', 7), act = jzP(ctx, 'act', 0) % nT, right = jzP(ctx, 'side', 'r') === 'r', th = H * 0.84 / nT, tw = M * 0.1, y0 = H * 0.08;
        var set = jzChars(jzIsLatinText(B.txt) ? 'ABCDEFGH' : 'あかさたなはまや'), dim = axa_dimOf(sc), plate = axa_pickPlate(sc, jzP(ctx, 'col', 'accent')), pon = axa_onCol(sc, plate);
        var sl = axa_slots(B.txt), first = '・', i, S = axa_sheet(ctx, 'thumb index');
        for (i = 0; i < sl.length; i++) if (!axa_isSp(sl[i]) && !jzIsPunct(sl[i])) { first = sl[i]; break; }
        var ay = 0, aw = 0, tS = [], tP = [], tD = [];
        for (i = 0; i < nT; i++) {
            var e = axa_iE(0.45, 0.04 * i) + '*K', on = i === act, w = tw * (on ? 1.55 : 1), y = y0 + th * i + th * 0.08, h = th * 0.84;
            // the tab slides in from the page edge
            axa_RR(S, right ? W - w : -th, y, w + th, h, h * 0.28, on ? plate : dim, 1, null, 0, { pos: '[' + jzN(right ? w : -w) + '*(1-' + e + '),0]', n: 'tab ' + (i + 1) });
            if (on) { ay = y + h / 2; aw = w; axa_label(ctx, first, right ? W - w / 2 : w / 2, y + h / 2, { align: 'center', font: font, size: h * 0.6, color: pon, op: e, track: 0, name: 'tab initial' }); }
            else { tS.push(set[i % set.length]); tP.push([right ? W - w / 2 : w / 2, y + h / 2]); tD.push(0.04 * i); }
        }
        axa_multiOp(ctx, axa_multi(ctx, tS, tP, { font: jzBodyF(ctx), size: th * 0.84 * 0.36, align: 'center', track: 0, color: sc.sub, name: 'tab letters' }), tD, 'oe((time-D)/0.45)*K');
        var availW = W * 0.9 - tw * 1.75, o = { lead: 1.22, track: 0.03 };
        var f = axa_fitBox(B.txt, font, availW, H * (port ? 0.5 : 0.56), o, port ? 4 : 3), size = Math.min(f.size, M * 0.26);
        var it = { text: f.text, font: font, size: size, align: right ? 'left' : 'right', x: right ? W * 0.07 : W * 0.93, y: H / 2, color: sc.fg, lead: 1.22, track: 0.03, fitW: availW };
        var m = axa_meas(it.text, size, it);
        // header rule + running head
        var hy = Math.max(H * 0.07, H / 2 - m.h / 2 - size * 0.45), e2 = axa_iE(0.6, 0.1) + '*K', hx0 = right ? W * 0.07 : W * 0.93 - availW;
        axa_L(S, [[[hx0, hy], [hx0 + availW, hy]]], sc.sub, lw, 0.8, { trim: e2, n: 'head rule' });
        axa_label(ctx, 'INDEX — ' + axa_p2(B.no), right ? hx0 : hx0 + availW, hy - ls * 0.9, { align: right ? 'left' : 'right', op: axa_iC(0.3, 0.25) + '*K' });
        // leader from the active tab to the text block
        var tx = right ? W * 0.07 + m.w + size * 0.2 : W * 0.93 - m.w - size * 0.2, ex = right ? W - aw - M * 0.012 : aw + M * 0.012;
        if ((right ? ex - tx : tx - ex) > M * 0.03) {
            axa_L(S, [[[ex, ay], [tx, ay]]], plate, lw * 1.5, 0.9, { trim: e2, n: 'leader' });
            axa_O(S, ex, ay, lw * 3, plate, null, 0, 1, { pos: '[' + jzN(tx - ex) + '*' + e2 + ',0]', op: e2, n: 'leader dot' });
        }
        axa_flush(S, true);
        return axa_draw(ctx, it);
    }
});

/* ================================================================== 6 xaColumns — 段組 */
axa_reg('xaColumns', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['serif', 'body', 'display'])), rule: rng.chance(0.8), foot: rng.chance(0.35), num: rng.chance(0.7) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, lw = B.lw, ls = B.ls, font = jzP(ctx, 'font', jzSerifF(ctx));
        var n = jzChars(B.txt).length, latin = jzIsLatinText(B.txt), C = n <= 7 ? 2 : port ? 2 : 3, segs = axa_smartSplit(B.txt, C), i;
        while (segs.length > 3) { var t = segs.pop(); segs[segs.length - 1] += (latin ? ' ' : '') + t; }
        C = segs.length;
        for (i = 0; i < C; i++) { var kk = jzChars(segs[i]).length; segs[i] = latin ? axa_splitL(segs[i], 7) : (kk <= 3 ? segs[i] : axa_evenSplit(segs[i], Math.ceil(kk / 3)).join('\n')); }
        var o = { lead: 1.2, track: 0.02 }, x0 = W * 0.07, aw = W * 0.86, gut = W * (port ? 0.06 : 0.045), colW = (aw - gut * (C - 1)) / C, headY = H * 0.13, footY = H * 0.9;
        var size = M * 0.24, foot = jzP(ctx, 'foot', false);
        for (i = 0; i < C; i++) size = Math.min(size, axa_fit(segs[i], font, colW * 0.94, H * 0.5, o));
        var e0 = axa_iE(0.5, 0) + '*K', dim = axa_dimOf(sc), pitch = M * 0.034, S = axa_sheet(ctx, 'columns'), bb = null, its = [];
        axa_R(S, x0, headY - M * 0.006, aw, M * 0.006, sc.fg, 1, { sc: '[' + e0 + ',1]', piv: [x0, headY], n: 'head rule' });
        axa_L(S, [[[x0, headY + M * 0.007], [x0 + aw, headY + M * 0.007]]], sc.fg, lw, 1, { trim: e0, n: 'head hairline' });
        axa_label(ctx, 'P.' + axa_p2(B.no), x0 + aw, headY - M * 0.006 - ls, { align: 'right', op: axa_iC(0.3, 0.2) + '*K' });
        for (i = 0; i < C; i++) {
            var cx = x0 + i * (colW + gut), it = { text: segs[i], font: font, size: size, align: 'left', x: cx, color: sc.fg, mi: i * 2, lead: 1.2, track: 0.02 }, m = axa_meas(it.text, size, it);
            var top = headY + M * 0.05, gy0 = foot ? top : top + m.h + pitch * 1.3, gy1 = foot ? footY - m.h - pitch * 1.3 : footY;
            it.y = foot ? footY - m.h / 2 : top + m.h / 2;
            var gk = axa_greek(S, cx, gy0, colW, Math.max(0, Math.floor((gy1 - gy0) / pitch)), pitch, dim, 0.9, axa_h(B.seed, i, 21), axa_iE(0.6, 0.15 + i * 0.1));
            if (gk) gk.op = 'K';
            if (jzP(ctx, 'num', true)) axa_label(ctx, axa_p2(i + 1), cx, headY - M * 0.006 - ls, { op: axa_iC(0.3, 0.15 + i * 0.08) + '*K', color: axa_accentOn(sc) });
            if (jzP(ctx, 'rule', true) && i > 0) axa_L(S, [[[cx - gut / 2, headY + M * 0.03], [cx - gut / 2, footY]]], sc.sub, lw, 0.7, { trim: axa_iE(0.7, 0.1 + i * 0.08), op: 'K', n: 'column rule' });
            its.push(it);
        }
        axa_flush(S, true);
        for (i = 0; i < its.length; i++) bb = jzUnion(bb, axa_draw(ctx, its[i]));
        return bb;
    }
});

/* ================================================================== 7 xaInitialPlate — 白抜き頭文字 */
axa_reg('xaInitialPlate', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), fs: rng.pick(jzFontsOf(st, ['serif', 'display', 'body'])), col: rng.pick(['accent', 'ink', 'fg']), shape: rng.pick(['sq', 'sq', 'circle', 'tall']), al: rng.pick(['top', 'base', 'mid']) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, port = B.port, lw = B.lw;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), fs = jzP(ctx, 'fs', jzSerifF(ctx)), shape = jzP(ctx, 'shape', 'sq'), al = jzP(ctx, 'al', 'mid');
        var arr = axa_slots(B.txt), init = arr[0] || '?', rest = jzTrim(arr.slice(1).join('')) || '…';
        var plate = axa_pickPlate(sc, jzP(ctx, 'col', 'accent')), pon = axa_onCol(sc, plate), o = { lead: 1.2, track: 0.03 }, kx = shape === 'tall' ? 0.74 : 1;
        var Sz, f, size, px, py, it, m, gap, Sw;
        if (!port) {
            Sz = Math.min(H * 0.48, W * 0.3); gap = Sz * 0.14; Sw = Sz * kx;
            f = axa_fitBox(rest, fs, W * 0.88 - Sw - gap, Sz, o, 3); size = Math.min(f.size, Sz * 0.5);
            it = { text: f.text, font: fs, size: size, align: 'left', color: sc.fg, mi: 2, lead: 1.2, track: 0.03, fitW: W * 0.88 - Sw - gap };
            m = axa_meas(it.text, size, it);
            px = (W - (Sw + gap + m.w)) / 2 + Sw / 2; py = H / 2;
            it.x = px + Sw / 2 + gap; it.y = al === 'top' ? py - Sz / 2 + m.h / 2 : al === 'base' ? py + Sz / 2 - m.h / 2 : py;
        } else {
            Sz = Math.min(W * 0.46, H * 0.26); gap = Sz * 0.16; Sw = Sz * kx;
            f = axa_fitBox(rest, fs, W * 0.84, H * 0.36, o, 4); size = Math.min(f.size, Sz * 0.5);
            it = { text: f.text, font: fs, size: size, align: 'left', color: sc.fg, mi: 2, lead: 1.2, track: 0.03, fitW: W * 0.84 };
            m = axa_meas(it.text, size, it);
            var bx = Math.max(W * 0.08, (W - Math.max(m.w, Sw)) / 2);
            px = bx + Sw / 2; py = (H - (Sz + gap + m.h)) / 2 + Sz / 2;
            it.x = bx; it.y = py + Sz / 2 + gap + m.h / 2;
        }
        var S = axa_sheet(ctx, 'initial plate'), pe = '[ob(time/0.42,1.4),ob(time/0.42,1.4)]';
        if (shape === 'circle') axa_O(S, px, py, Sz / 2, plate, null, 0, 1, { sc: pe, piv: [px, py], op: 'K', n: 'plate' });
        else axa_R(S, px - Sw / 2, py - Sz / 2, Sw, Sz, plate, 1, { sc: pe, piv: [px, py], op: 'K', n: 'plate' });
        if (!port) { var y = al === 'base' ? py - Sz / 2 : py + Sz / 2; axa_L(S, [[[px + Sw / 2, y], [it.x + m.w, y]]], plate, lw * 1.5, 1, { trim: axa_iE(0.6, 0.2) + '*K', n: 'rule' }); }
        axa_flush(S, true);
        var gs = Math.min(Sz * (shape === 'circle' ? 0.6 : 0.76), axa_fit(init, font, Sw * 0.84, Sz * 0.84));
        var bb = axa_draw(ctx, { text: init, font: font, size: gs, x: px, y: py, color: pon, mi: 0 });
        bb = jzUnion(bb, axa_draw(ctx, it));
        return jzUnion(bb, { x0: px - Sw / 2, y0: py - Sz / 2, x1: px + Sw / 2, y1: py + Sz / 2 });
    }
});

/* ================================================================== 8 xaSplitBaseline — 段違い基線 */
axa_reg('xaSplitBaseline', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), dir: rng.pick([1, 1, -1]), acc: rng.chance(0.5), tick: rng.chance(0.6) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, lw = B.lw, ls = B.ls, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), dir = jzP(ctx, 'dir', 1);
        var n = jzChars(B.txt).length, latin = jzIsLatinText(B.txt), parts = axa_splitL(B.txt, Math.ceil(n / 2)).split('\n'), k;
        if (parts.length < 2) { var ca = jzChars(B.txt), hf = Math.ceil(ca.length / 2); parts = [ca.slice(0, hf).join(''), ca.slice(hf).join('')]; }
        var A = parts[0], Bt = parts.slice(1).join(latin ? ' ' : '');
        var aw = port ? W * 0.76 : W * 0.56, mh = port ? H * 0.2 : H * 0.3;
        var size = Math.min(axa_fit(A, font, aw, mh, { track: 0.03 }), Bt ? axa_fit(Bt, font, aw, mh, { track: 0.03 }) : 1e9, M * 0.26);
        var dy = size * (port ? 0.95 : 0.6) * dir, yA = H / 2 - dy, yB = H / 2 + dy;
        var iA = { text: A, font: font, size: size, align: 'left', x: W * 0.07, y: yA, track: 0.03, color: sc.fg, mi: 0 };
        var iB = { text: Bt, font: font, size: size, align: 'right', x: W * 0.93, y: yB, track: 0.03, color: sc.fg, mi: 3 };
        var mA = axa_meas(A, size, iA), mB = Bt ? axa_meas(Bt, size, iB) : { w: 0, h: 0 }, bA = yA + size * 0.6, bB = yB + size * 0.6;
        var xa = W * 0.07 + mA.w + size * 0.18, xb = W * 0.93 - mB.w - size * 0.18, rc = jzP(ctx, 'acc', false) ? axa_accentOn(sc) : sc.fg, S = axa_sheet(ctx, 'split baseline');
        // one rule: runs in from the left, leaves towards the right with the exit
        axa_L(S, [[[-10, bA], [xa, bA], [xb, bB], [W + 10, bB]]], rc, Math.max(2 * B.k, size * 0.022), 1, { trim: 'ioc(time/0.7)', start: '1-K', n: 'baseline' });
        if (jzP(ctx, 'tick', true)) {
            var a = axa_iC(0.3, 0.45) + '*K', tk = [];
            for (k = 0; k < 5; k++) { tk.push([[W * 0.07 + k * size * 0.5, bA], [W * 0.07 + k * size * 0.5, bA + size * 0.07]]); tk.push([[W * 0.93 - k * size * 0.5, bB], [W * 0.93 - k * size * 0.5, bB + size * 0.07]]); }
            axa_L(S, tk, rc, lw, 1, { op: a, n: 'ticks' });
            axa_label(ctx, 'BL ' + (dir > 0 ? '+' : '−') + Math.round(Math.abs(dy) * 2), (xa + xb) / 2 + size * 0.12, (bA + bB) / 2 + ls * 0.9, { op: a });
        }
        axa_flush(S, true);
        var bb = axa_draw(ctx, iA);
        return Bt ? jzUnion(bb, axa_draw(ctx, iB)) : bb;      // one glyph: no second half (as in the browser)
    }
});

/* ================================================================== 9 xaHalfKnock — 版またぎ
   the browser clips two copies of the lyric; here the plate covers the positive copy and a track matte (a copy of the plate)
   cuts the reversed copy, so the lyric exists twice as editable text */
axa_reg('xaHalfKnock', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), edge: rng.pick(['h', 'h', 'v']), side: rng.pick([0, 1]), col: rng.pick(['fg', 'accent', 'ink']) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, ls = B.ls, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), side = jzP(ctx, 'side', 0);
        var mt = axa_mainLines(B.txt, W, H, 10, 5), lead = 1.2, nL = mt.split('\n').length;
        var size = Math.min(axa_fit(mt, font, W * 0.84, H * 0.6, { lead: lead, track: 0.02 }), M * 0.34);
        var plate = axa_pickPlate(sc, jzP(ctx, 'col', 'fg')), pon = axa_onCol(sc, plate), q = axa_iE(0.5, 0) + '*XO', horiz = jzP(ctx, 'edge', 'h') === 'h';
        var edge = horiz ? H / 2 + (Math.floor((nL - 1) / 2) - (nL - 1) / 2) * size * lead + size * 0.03 : W / 2;
        var it = { text: mt, font: font, size: size, x: W / 2, y: H / 2, lead: lead, track: 0.02, color: sc.fg, fitW: W * 0.84 };
        var bb = axa_draw(ctx, it), S = axa_sheet(ctx, 'plate');
        if (horiz) {
            if (side) axa_R(S, -W, edge, W * 3, H * 2, plate, 1, { pos: '[0,' + jzN(H - edge) + '*(1-' + q + ')]', n: 'plate' });
            else axa_R(S, -W, -H, W * 3, H + edge, plate, 1, { pos: '[0,' + jzN(-edge) + '*(1-' + q + ')]', n: 'plate' });
        } else {
            if (side) axa_R(S, edge, -H, W * 2, H * 3, plate, 1, { pos: '[' + jzN(W - edge) + '*(1-' + q + '),0]', n: 'plate' });
            else axa_R(S, -W, -H, W + edge, H * 3, plate, 1, { pos: '[' + jzN(-edge) + '*(1-' + q + '),0]', n: 'plate' });
        }
        var Pl = axa_flush(S, false);
        var L2 = axa_text(ctx, mt, axa_mix(it, { color: pon, name: 'reversed copy' })), Mt = Pl.duplicate();     // it.size: already refitted by the first copy
        Mt.name = 'plate matte';
        axa_matte(L2, Mt, TrackMatteType.ALPHA);       // before the motion: entrances / exits check for an existing matte
        AXA_LYR.push(L2); jzAnimate(ctx, L2, { mi: 0 });
        var a = axa_iC(0.3, 0.35) + '*K', an = a + '*(' + q + '>0.98?1:0)', s = side ? 1 : -1;
        if (horiz) { axa_label(ctx, 'NEGA', W * 0.05, edge + s * ls, { color: pon, op: an }); axa_label(ctx, 'POSI', W * 0.05, edge - s * ls, { op: a }); }
        else { axa_label(ctx, 'NEGA', edge + s * ls * 0.8, H * 0.95, { color: pon, op: an, align: s > 0 ? 'left' : 'right' }); axa_label(ctx, 'POSI', edge - s * ls * 0.8, H * 0.95, { op: a, align: s > 0 ? 'right' : 'left' }); }
        return bb;
    }
});

/* ================================================================== 10 xaFormCombs — 記入欄 (one text layer per comb cell, like the browser) */
axa_reg('xaFormCombs', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['body', 'serif', 'display'])), hd: rng.pick(['ink', 'accent']), full: rng.chance(0.5), chk: rng.chance(0.8) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, lw = B.lw, ls = B.ls, font = jzP(ctx, 'font', jzBodyF(ctx)), full = jzP(ctx, 'full', false), chk = jzP(ctx, 'chk', true);
        var slots = axa_slots(B.txt), per = port ? 5 : 8, rs = slots.length <= per ? [slots.join('')] : axa_evenSplit(slots.join(''), Math.ceil(slots.length / per)), rowsA = [], mxn = 1, r, k;
        for (r = 0; r < rs.length; r++) { rowsA.push(jzChars(rs[r])); mxn = Math.max(mxn, rowsA[r].length); }
        var rows = rowsA.length, cell = Math.min(W * 0.8 / mxn, H * 0.56 / (rows * 1.5), M * 0.26), pitch = cell * 1.5;
        var bw = cell * mxn, x0 = (W - bw) / 2, y0 = H / 2 - rows * pitch / 2 + cell * 0.1;
        var padF = cell * 0.4, fx0 = x0 - padF, fy0 = y0 - padF - ls * 2.2, fw = bw + padF * 2, fh = rows * pitch + padF * 1.4 + ls * 2.2 + (chk ? ls * 2.6 : 0);
        var e0 = axa_iE(0.5, 0) + '*K', head = axa_pickPlate(sc, jzP(ctx, 'hd', 'ink')), hon = axa_onCol(sc, head), la = axa_iC(0.3, 0.25) + '*K', S = axa_sheet(ctx, 'form');
        axa_L(S, [[[fx0, fy0], [fx0 + fw, fy0], [fx0 + fw, fy0 + fh], [fx0, fy0 + fh], [fx0, fy0]]], sc.sub, lw * 1.4, 0.9, { trim: e0, n: 'frame' });
        axa_R(S, fx0, fy0, fw * 0.36, ls * 1.9, head, 1, { sc: '[' + e0 + ',1]', piv: [fx0, fy0], n: 'form head' });
        axa_label(ctx, 'FORM ' + axa_p2(B.no) + '-A', fx0 + ls * 0.6, fy0 + ls * 0.95, { color: hon, op: la });
        axa_label(ctx, jzCount(B.txt) + ' / ' + (mxn * rows), fx0 + fw - ls * 0.6, fy0 + ls * 0.95, { align: 'right', op: la });
        var its = [], gi = 0, bb = null;
        for (r = 0; r < rows; r++) {
            var yb = y0 + r * pitch + cell * 1.12, e = axa_iE(0.5, 0.1 + r * 0.08) + '*K', tE = [], tI = [];
            axa_L(S, [[[x0, yb], [x0 + bw, yb]]], sc.fg, lw * 1.6, 1, { trim: e, n: 'comb base ' + (r + 1) });
            for (k = 0; k <= mxn; k++) { var end = k === 0 || k === mxn; (end ? tE : tI).push([[x0 + k * cell, yb], [x0 + k * cell, yb - cell * (end || full ? 1.0 : 0.3)]]); }
            axa_L(S, tE, sc.fg, lw * 1.6, 1, { trim: e, n: 'comb ends ' + (r + 1) });
            axa_L(S, tI, sc.sub, lw, 1, { trim: e, n: 'comb teeth ' + (r + 1) });
            for (k = 0; k < rowsA[r].length; k++) { if (!axa_isSp(rowsA[r][k])) its.push({ text: rowsA[r][k], font: font, size: cell * 0.72, x: x0 + (k + 0.5) * cell, y: yb - cell * 0.52, color: sc.fg, mi: gi }); gi++; }
        }
        if (chk) {
            var cy = fy0 + fh - ls * 1.5, bs = ls * 1.2, cx = fx0 + padF;
            axa_F(S, cx, cy - bs / 2, bs, bs, sc.fg, lw * 1.4, 1, { op: la, n: 'box' });
            axa_L(S, [[[cx + bs * 0.15, cy], [cx + bs * 0.42, cy + bs * 0.3], [cx + bs * 1.05, cy - bs * 0.55]]], axa_accentOn(sc), lw * 3, 1, { trim: 'oc((time-0.55)/0.25)*K', n: 'tick' });
            axa_label(ctx, 'CONFIRMED', cx + bs * 1.5, cy, { op: la });
            axa_F(S, cx + fw * 0.5, cy - bs / 2, bs, bs, sc.sub, lw * 1.4, 1, { op: la, n: 'box 2' });
            axa_label(ctx, 'VOID', cx + fw * 0.5 + bs * 1.5, cy, { op: la });
        }
        axa_flush(S, true);
        for (k = 0; k < its.length; k++) bb = jzUnion(bb, axa_draw(ctx, its[k]));
        return bb;
    }
});

/* ================================================================== 11 xaWaybill — 送り状 */
axa_reg('xaWaybill', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), code: rng.pick(['KX', 'JZ', 'TY', 'OS', 'NR', 'HK']), num: rng.int(1, 99), tilt: rng.pick([0, 0, -1.5, 1.5]), flip: rng.chance(0.5) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, ls = B.ls, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), flip = jzP(ctx, 'flip', false);
        var cw = port ? W * 0.86 : Math.min(W * 0.8, H * 0.8 * 1.5), ch = port ? Math.min(H * 0.66, cw * 1.3) : H * 0.8, x0 = (W - cw) / 2, y0 = (H - ch) / 2;
        var paper = axa_paperOf(sc), ink = axa_onCol(sc, paper), faint = jzMixHex(paper, ink, 0.35), mono = jzMonoF(ctx), S = axa_sheet(ctx, 'shipping label');
        axa_tilt(W / 2, H / 2, jzP(ctx, 'tilt', 0));
        var e = axa_iE(0.4, 0), la = axa_iC(0.3, 0.22) + '*K', bl = Math.max(3 * B.k, M * 0.006), e2 = axa_iE(0.55, 0.12);
        S.lop = 'K';
        axa_R(S, x0, y0, cw, ch, paper, 1, { sc: '[1,' + e + ']', piv: [x0, y0], n: 'paper' });
        var fx = x0 + bl * 2.5, fy = y0 + bl * 2.5, fw = cw - bl * 5, fh = ch - bl * 5, y1 = fy + fh * 0.24, y2 = fy + fh * 0.76;
        axa_L(S, [[[fx, fy], [fx + fw, fy], [fx + fw, fy + fh], [fx, fy + fh], [fx, fy]]], ink, bl, 1, { trim: e2, n: 'frame' });
        var xv = fx + fw * (flip ? 0.36 : 0.64);
        axa_L(S, [[[fx, y1], [fx + fw, y1]], [[fx + fw, y2], [fx, y2]], [[xv, fy], [xv, y1]]], ink, bl * 0.7, 1, { trim: e2, n: 'cells' });
        var fromX = flip ? xv : fx, fromW = flip ? fx + fw - xv : xv - fx, codeX = flip ? fx : xv, codeW = fw - fromW;
        axa_label(ctx, 'FROM', fromX + ls * 0.8, fy + ls * 1.3, { color: ink, op: la, size: ls * 0.9 });
        axa_greek(S, fromX + ls * 0.8, fy + ls * 2.6, fromW * 0.6, 2, ls * 1.1, faint, 1, B.seed, axa_iE(0.5, 0.25));
        axa_R(S, codeX, fy, codeW, y1 - fy, ink, 1, { sc: '[1,' + e2 + ']', piv: [codeX, fy], n: 'code plate' });
        var code = jzP(ctx, 'code', 'JZ') + '-' + axa_p2(jzP(ctx, 'num', 1));
        axa_label(ctx, code, codeX + codeW / 2, (fy + y1) / 2, { align: 'center', color: paper, op: la, font: mono, size: Math.min((y1 - fy) * 0.5, axa_fit(code, mono, codeW * 0.8, 1e6, { track: 0.06 })), track: 0.06 });
        axa_label(ctx, 'TO', fx + ls * 0.8, y1 + ls * 1.3, { color: ink, op: la, size: ls * 0.9 });
        axa_barcode(S, fx + ls * 0.8, y2 + (fy + fh - y2) * 0.22, fw * 0.5, (fy + fh - y2) * 0.56, ink, axa_iC(0.3, 0.22), B.seed, axa_iE(0.6, 0.3));
        axa_label(ctx, 'PCS 1/1', fx + fw - ls * 0.8, y2 + (fy + fh - y2) * 0.33, { align: 'right', color: ink, op: la });
        axa_label(ctx, 'No.' + String(100000 + (axa_h(B.seed, 9) % 899999)), fx + fw - ls * 0.8, y2 + (fy + fh - y2) * 0.68, { align: 'right', color: faint, op: la });
        axa_flush(S, true);
        var o = { lead: 1.2, track: 0.02 }, f = axa_fitBox(B.txt, font, fw * 0.88, (y2 - y1) * 0.7, o, port ? 4 : 3), size = Math.min(f.size, M * 0.26);
        return axa_draw(ctx, { text: f.text, font: font, size: size, x: W / 2, y: (y1 + y2) / 2 + ls * 0.5, color: ink, lead: 1.2, track: 0.02, fitW: fw * 0.88 });
    }
});

/* ================================================================== 12 xaErrata — 正誤表 */
axa_reg('xaErrata', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), strike: rng.pick(['line', 'double', 'wave']), pg: rng.int(3, 240), ln: rng.int(1, 24) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, lw = B.lw, ls = B.ls, font = jzP(ctx, 'font', jzSerifF(ctx)), strike = jzP(ctx, 'strike', 'line');
        var latin = jzIsLatinText(B.txt), labs = latin ? ['FOR', 'READ'] : ['誤', '正'], bf = jzBodyF(ctx);
        var tw = W * 0.86, x0 = W * 0.07, lc = M * (latin ? 0.15 : 0.12), hh = ls * 2.4, h1 = H * (port ? 0.2 : 0.25), h2 = H * (port ? 0.38 : 0.44), th = hh + h1 + h2, y0 = (H - th) / 2;
        var acc = axa_accentOn(sc), pad = M * 0.035, o = { lead: 1.2, track: 0.03 }, e = axa_iE(0.6, 0) + '*K', la = axa_iC(0.3, 0.2) + '*K', S = axa_sheet(ctx, 'errata table'), k, i;
        axa_R(S, x0, y0 + hh - M * 0.005, tw, M * 0.005, sc.fg, 1, { sc: '[' + e + ',1]', piv: [x0, y0 + hh], n: 'top rule' });
        axa_L(S, [[[x0, y0 + hh + h1], [x0 + tw, y0 + hh + h1]], [[x0 + lc, y0 + hh], [x0 + lc, y0 + hh + h1 + h2]]], sc.sub, lw, 0.8, { trim: e, n: 'cells' });
        axa_R(S, x0, y0 + th, tw, M * 0.005, sc.fg, 1, { sc: '[' + e + ',1]', piv: [x0 + tw, y0 + th], n: 'foot rule' });
        axa_flush(S, true);
        axa_label(ctx, latin ? 'ERRATA' : '正誤表', x0, y0 + hh * 0.42, { font: bf, size: ls * 1.25, color: sc.fg, op: la, track: 0.3 });
        axa_label(ctx, 'p.' + jzP(ctx, 'pg', 3) + '  l.' + jzP(ctx, 'ln', 1), x0 + tw, y0 + hh * 0.42, { align: 'right', op: la });
        var lsz2 = latin ? lc * 0.24 : lc * 0.44;
        axa_label(ctx, labs[0], x0 + lc / 2, y0 + hh + h1 / 2, { align: 'center', font: bf, size: lsz2, color: sc.sub, op: la, track: 0.05 });
        axa_label(ctx, labs[1], x0 + lc / 2, y0 + hh + h1 + h2 / 2, { align: 'center', font: bf, size: lsz2, color: acc, op: la, track: 0.05 });
        // the struck-out version (a plain copy of the lyric, main pass only)
        var fw = axa_fitBox(B.txt, font, tw - lc - pad * 2, h1 * 0.68, o, 2), wi = { text: fw.text, font: font, size: fw.size, align: 'left', x: x0 + lc + pad, y: y0 + hh + h1 / 2, color: sc.sub, lead: 1.2, track: 0.03 };
        var Wr = axa_text(ctx, wi.text, axa_mix(wi, { alpha: 0.8, name: 'struck-out copy' }));
        jzSetExpr(jzXf(Wr, 'ADBE Opacity'), axa_hd(ctx) + 'value*cl(' + la + ')');
        var gl = axa_gpts(wi), rowsX = [], T = axa_sheet(ctx, 'strike'), es = 'ioc((time-0.35)/0.4)*K', sw = Math.max(2 * B.k, fw.size * 0.045), segs = [];
        for (i = 0; i < gl.length; i++) { var rw = rowsX[gl[i].li] || (rowsX[gl[i].li] = { a: 1e9, b: -1e9, y: gl[i].y }); rw.a = Math.min(rw.a, gl[i].x - gl[i].w / 2); rw.b = Math.max(rw.b, gl[i].x + gl[i].w / 2); }
        for (k = 0; k < rowsX.length; k++) {
            if (!rowsX[k]) continue;
            var xa = rowsX[k].a - fw.size * 0.1, xb = rowsX[k].b + fw.size * 0.1, ry = rowsX[k].y;
            if (strike === 'wave') { var pts = [], x; for (x = xa; x <= xb; x += fw.size * 0.08) pts.push([x, ry + Math.sin((x - xa) / (fw.size * 0.16)) * fw.size * 0.07]); if (pts.length > 1) segs.push(pts); }
            else if (strike === 'double') { segs.push([[xa, ry - fw.size * 0.08], [xb, ry - fw.size * 0.08]]); segs.push([[xa, ry + fw.size * 0.08], [xb, ry + fw.size * 0.08]]); }
            else segs.push([[xa, ry], [xb, ry]]);
        }
        axa_L(T, segs, acc, strike === 'double' ? sw * 0.7 : sw, 1, { trim: es, n: 'strike' });
        axa_flush(T, false);
        var f = axa_fitBox(B.txt, font, tw - lc - pad * 2, h2 * 0.78, o, port ? 4 : 3), size = Math.min(f.size, M * 0.24);
        return axa_draw(ctx, { text: f.text, font: font, size: size, align: 'left', x: x0 + lc + pad, y: y0 + hh + h1 + h2 / 2, color: sc.fg, lead: 1.2, track: 0.03, fitW: tw - lc - pad * 2 });
    }
});

/* ================================================================== 13 xaTabStops — タブ揃え */
axa_reg('xaTabStops', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif', 'body'])), dir: rng.pick([1, 1, -1]), guide: rng.chance(0.85), arrow: rng.chance(0.7) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, lw = B.lw, ls = B.ls, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), dir = jzP(ctx, 'dir', 1);
        var n = jzChars(B.txt).length, lines = axa_smartSplit(B.txt, port ? (n <= 3 ? 1 : n <= 7 ? 2 : n <= 11 ? 3 : 4) : (n <= 4 ? 1 : n <= 10 ? 2 : 3), port), L = lines.length, k;
        var x0 = W * 0.07, tw = W * 0.86, ry = H * 0.1, stp = W * (port ? 0.075 : 0.09), acc = axa_accentOn(sc);
        function ind(q) { return stp * ((dir > 0 ? q : L - 1 - q) + (L === 1 ? 1 : 0.5)); }
        var areaH = H * 0.66, size = Math.min(M * 0.24, areaH / L * 0.78);
        for (k = 0; k < L; k++) size = Math.min(size, axa_fit(lines[k], font, tw - ind(k), 1e6, { track: 0.03 }));
        var pitch = Math.min(size * 1.4, areaH / L), cy = H * 0.56, S = axa_sheet(ctx, 'ruler'), e = axa_iE(0.6, 0) + '*K', nt = 40, tk = [], nS = [], nP = [], nD = [], bb = null, its = [];
        // ruler: the ticks and figures appear as the rule reaches them
        axa_L(S, [[[x0, ry], [x0 + tw, ry]]], sc.sub, lw * 1.4, 1, { trim: e, n: 'ruler' });
        for (k = 0; k <= nt; k++) {
            tk.push([[x0 + tw * k / nt, ry], [x0 + tw * k / nt, ry - M * (k % 5 === 0 ? 0.016 : 0.008)]]);
            if (k % 10 === 0) { nS.push(String(k)); nP.push([x0 + tw * k / nt, ry - M * 0.03]); nD.push(k); }
            if (k % 10 === 9 || k === nt) { axa_L(S, tk, sc.sub, lw, 1, { op: e + '*' + nt + '>=' + (k - tk.length + 1) + '?1:0', n: 'ticks' }); tk = []; }
        }
        axa_multiOp(ctx, axa_multi(ctx, nS, nP, { size: ls * 0.8, align: 'center', track: 0, color: sc.sub, name: 'ruler figures' }), nD, e + '*' + nt + '>=D?K:0');
        for (k = 0; k < L; k++) {
            var x = x0 + ind(k), y = cy + (k - (L - 1) / 2) * pitch, a = axa_iE(0.45, 0.15 + k * 0.1) + '*K', s = M * 0.012;
            axa_L(S, [[[x, ry + s * 0.4], [x, ry + s * 1.9], [x + s * 1.3, ry + s * 1.9]]], acc, lw * 2.5, 1, { op: a, n: 'tab stop ' + (k + 1) });
            if (jzP(ctx, 'guide', true)) axa_L(S, [[[x, ry + s * 2.6], [x, y + size * 0.55]]], sc.sub, lw, 0.7, { dash: [lw * 3, lw * 4], trim: a, n: 'guide ' + (k + 1) });
            if (jzP(ctx, 'arrow', true) && x - x0 > size * 0.5) {
                var ax = x - size * 0.14, h = size * 0.07;
                axa_L(S, [[[x0, y], [ax, y]]], sc.sub, lw * 1.3, 0.8, { trim: a, op: a, n: 'tab arrow ' + (k + 1) });
                axa_L(S, [[[ax - h, y - h], [ax, y], [ax - h, y + h]]], sc.sub, lw * 1.3, 0.8, { pos: '[' + jzN(x0 - ax) + '*(1-' + a + '),0]', op: a, n: 'arrow head ' + (k + 1) });
            }
            its.push({ text: lines[k], font: font, size: size, align: 'left', x: x, y: y, track: 0.03, color: sc.fg, mi: k * 2 });
        }
        axa_flush(S, true);
        axa_label(ctx, 'TAB ×' + L, x0 + tw, ry + ls * 1.2, { align: 'right', op: axa_iC(0.3, 0.3) + '*K' });
        for (k = 0; k < its.length; k++) bb = jzUnion(bb, axa_draw(ctx, its[k]));
        return bb;
    }
});

/* ================================================================== 14 xaTriBand — 三段表紙 */
axa_reg('xaTriBand', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), col: rng.pick(['accent', 'accent', 'ink']), k: rng.pick([0.26, 0.3, 0.33]), mark: rng.pick(['circle', 'sq', 'dia']), tilt: rng.pick([0, 0, -1.5, 1.5]) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, port = B.port, lw = B.lw, ls = B.ls, font = jzP(ctx, 'font', jzSerifF(ctx)), mark = jzP(ctx, 'mark', 'circle');
        var ch = port ? Math.min(H * 0.8, W * 0.82 * 1.5) : H * 0.86, cw = port ? W * 0.82 : Math.min(ch * 0.72, W * 0.8), x0 = (W - cw) / 2, y0 = (H - ch) / 2;
        var paper = axa_paperOf(sc), ink = axa_onCol(sc, paper), band = jzMixHex(paper, ink, 0.8), cs = jzP(ctx, 'col', 'accent') === 'ink' ? [sc.ink, sc.accent, sc.accent2] : [sc.accent, sc.accent2, sc.ink], i;
        for (i = 0; i < cs.length; i++) if (cs[i] && jzContrast(cs[i], paper) >= 1.5 && jzContrast(cs[i], sc.bg) >= 1.25) { band = cs[i]; break; }
        var bon = axa_onCol(sc, band), bh = ch * jzP(ctx, 'k', 0.3), S = axa_sheet(ctx, 'banded cover');
        axa_tilt(W / 2, H / 2, jzP(ctx, 'tilt', 0));
        var e1 = axa_iE(0.45, 0), e2 = axa_iE(0.45, 0.07), e3 = axa_iE(0.45, 0.14), la = axa_iC(0.3, 0.3) + '*K';
        axa_R(S, x0, y0 + bh - 1, cw, ch - bh * 2 + 2, paper, 1, { sc: '[' + e2 + ',1]', piv: [W / 2, y0 + ch / 2], op: 'K', n: 'title panel' });
        axa_R(S, x0, y0, cw, bh, band, 1, { pos: '[0,' + jzN(-H * 0.2) + '*(1-' + e1 + ')]', op: e1 + '*K', n: 'top band' });
        axa_R(S, x0, y0 + ch - bh, cw, bh, band, 1, { pos: '[0,' + jzN(H * 0.2) + '*(1-' + e3 + ')]', op: e3 + '*K', n: 'bottom band' });
        // cartouche
        var kw = cw * 0.56, kh = bh * 0.44, ky = y0 + bh / 2;
        axa_RR(S, W / 2 - kw / 2, ky - kh / 2, kw, kh, kh / 2, null, 1, bon, lw * 2, { op: la, n: 'cartouche' });
        axa_label(ctx, 'LYRIC  BOOKS', W / 2, ky, { align: 'center', color: bon, op: la, size: Math.min(kh * 0.36, ls * 1.3), track: 0.25 });
        // colophon mark
        var my = y0 + ch - bh / 2, r = bh * 0.22;
        if (mark === 'circle') { axa_O(S, W / 2, my, r, null, bon, lw * 2, 1, { op: la, n: 'mark' }); axa_O(S, W / 2, my, r * 0.35, bon, null, 0, 1, { op: la, n: 'mark dot' }); }
        else if (mark === 'sq') { axa_F(S, W / 2 - r, my - r, r * 2, r * 2, bon, lw * 2, 1, { op: la, n: 'mark' }); axa_R(S, W / 2 - r * 0.4, my - r * 0.4, r * 0.8, r * 0.8, bon, 1, { op: la, n: 'mark dot' }); }
        else { axa_L(S, [[[W / 2, my - r * 1.2], [W / 2 + r * 1.2, my], [W / 2, my + r * 1.2], [W / 2 - r * 1.2, my]]], bon, lw * 2, 1, { closed: true, op: la, n: 'mark' }); axa_O(S, W / 2, my, r * 0.3, bon, null, 0, 1, { op: la, n: 'mark dot' }); }
        axa_label(ctx, 'No.' + axa_p2(B.no), x0 + cw - ls, y0 + ch - ls * 1.2, { align: 'right', color: bon, op: la, size: ls * 0.9 });
        var mh = ch - bh * 2, o = { lead: 1.22, track: 0.03 }, f = axa_fitBox(B.txt, font, cw * 0.84, mh * 0.62, o, 4), size = Math.min(f.size, cw * 0.3);
        var it = { text: f.text, font: font, size: size, x: W / 2, y: y0 + ch / 2 - mh * 0.05, color: ink, lead: 1.22, track: 0.03, fitW: cw * 0.84 }, m = axa_meas(it.text, size, it);
        var ry = Math.min(y0 + ch - bh - mh * 0.09, it.y + m.h / 2 + mh * 0.09);
        axa_L(S, [[[W / 2 - cw * 0.12, ry], [W / 2 + cw * 0.12, ry]]], ink, lw * 1.5, 1, { trim: '0.5+0.5*' + e3, start: '0.5-0.5*' + e3, op: 'K', n: 'title rule' });
        axa_flush(S, true);
        return axa_draw(ctx, it);
    }
});
