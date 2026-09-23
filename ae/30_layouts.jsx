// ================================================================ layouts (AE)
function jzSplitLines(text, maxPer) {
    var arr = jzChars(text);
    if (arr.length <= maxPer) return text;
    var nL = Math.ceil(arr.length / maxPer), per = arr.length / nL, out = [], start = 0;
    for (var l = 1; l < nL; l++) {
        var target = Math.round(per * l), best = target, bestS = -99;
        for (var k = Math.max(start + 1, target - 3); k <= Math.min(arr.length - 1, target + 3); k++) {
            var a = arr[k - 1], b = arr[k], s = 3 - Math.abs(k - target);
            if (jzIsHira(a) && !jzIsHira(b)) s += 3;
            if (jzIsPunct(a) || a === ' ' || a === '　') s += 5;
            if ('っゃゅょー、。'.indexOf(b) >= 0) s -= 6;
            if (s > bestS) { bestS = s; best = k; }
        }
        out.push(jzTrim(arr.slice(start, best).join(''))); start = best;
    }
    out.push(jzTrim(arr.slice(start).join('')));
    return out.join('\r');
}
var JZ_KANA = { 'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o', 'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko', 'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so', 'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to', 'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no', 'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho', 'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo', 'や': 'ya', 'ゆ': 'yu', 'よ': 'yo', 'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro', 'わ': 'wa', 'を': 'wo', 'ん': 'n', 'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go', 'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo', 'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do', 'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo', 'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po' };
function jzRomaji(s) {
    var a = jzChars(s), out = '', i;
    for (i = 0; i < a.length; i++) { var c = a[i]; if (jzIsKata(c) && c !== 'ー') a[i] = String.fromCharCode(c.charCodeAt(0) - 0x60); }
    for (i = 0; i < a.length; i++) {
        var ch = a[i], nx = a[i + 1];
        if (ch === 'っ') { var q = JZ_KANA[nx]; if (q) out += q.charAt(0); continue; }
        if (ch === 'ー') { out += out.charAt(out.length - 1); continue; }
        if ((nx === 'ゃ' || nx === 'ゅ' || nx === 'ょ') && JZ_KANA[ch]) {
            var b = JZ_KANA[ch], y = nx === 'ゃ' ? 'ya' : nx === 'ゅ' ? 'yu' : 'yo';
            out += (b === 'shi' || b === 'chi' || b === 'ji') ? b.substr(0, b.length - 1) + y.substr(1) : b.substr(0, b.length - 1) + y; i++; continue;
        }
        if (JZ_KANA[ch]) out += JZ_KANA[ch]; else if (/[A-Za-z0-9 ]/.test(ch)) out += ch; else return null;
    }
    return out;
}
function jzBB(L) {
    var s = jzSize(L), p = jzXf(L, 'ADBE Position').value;
    return { x0: p[0] - s[0] / 2, x1: p[0] + s[0] / 2, y0: p[1] - s[1] / 2, y1: p[1] + s[1] / 2, cx: p[0], cy: p[1] };
}
function jzUnion(a, b) { if (!a) return b; if (!b) return a; var r = { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) }; r.cx = (r.x0 + r.x1) / 2; r.cy = (r.y0 + r.y1) / 2; return r; }
function jzP(ctx, k, d) { return (ctx.P && ctx.P[k] != null) ? ctx.P[k] : d; }
function jzFontOf(ctx, k, role) { var v = jzP(ctx, k, null); return v || (ctx.st.fonts[role] ? ctx.st.fonts[role][0] : 'gothic_black'); }
function jzMain(ctx, str, o) { var L = jzText(ctx, str, o); jzMotion(ctx, L, { size: jzFontSize(L), mi: o.mi || 0, noHold: o.noHold, enter: o.enter, exit: o.exit }); return L; }
function jzSmall(ctx, str, o) { o.font = o.font || jzFontOf(ctx, '_', 'body'); var L = jzText(ctx, str, o); return L; }

var JZ_LAYOUTS = {};

JZ_LAYOUTS.center = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, sx = jzP(ctx, 'sx', 1);
    var L = jzMain(ctx, jzSplitLines(c.text, 11), { font: jzFontOf(ctx, 'font', 'display'), size: 200, color: jzP(ctx, 'accent', false) ? sc.accent : sc.fg, x: W / 2 + jzP(ctx, 'ox', 0) * W, y: H / 2 + jzP(ctx, 'oy', 0) * H, track: jzP(ctx, 'track', 0.06), maxW: W * 0.84 / sx, maxH: H * 0.5, maxSize: H * 0.33, sx: sx });
    var bb = jzBB(L);
    if (jzP(ctx, 'sub', false) && c.lineText && c.lineText !== c.text) {
        var s = jzSmall(ctx, c.lineText, { size: Math.max(16, H * 0.026), color: sc.sub, x: bb.cx, y: bb.y1 + H * 0.07, track: 0.22 });
        jzFadeIO(ctx, s, c.inDur * 0.5, 0.3);
    }
    if (jzP(ctx, 'under', false)) {
        var U = jzShapeLayer(ctx, 'underline', bb.x0, bb.y1 + H * 0.02);
        var g = jzGrp(U, 'bar'); jzAddRect(g, bb.x1 - bb.x0, Math.max(3, H * 0.006), 0, (bb.x1 - bb.x0) / 2, 0); jzAddFill(g, sc.accent);
        jzSetExpr(jzXf(U, 'ADBE Scale'), JZ_FNS + 'var e=oe((time-' + jzN(c.inDur * 0.3) + ')/0.5);[value[0]*e,value[1]]');
    }
    return bb;
};

JZ_LAYOUTS.mixed = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, seed = c.seed;
    var chars = jzChars(c.text.replace(/[\s　]+/g, '')), n = chars.length, rows = n > 9 ? 2 : 1, per = Math.ceil(n / rows);
    var fB = jzFontOf(ctx, 'fontBig', 'display'), fS = jzFontOf(ctx, 'fontSmall', 'serif'), smallK = jzP(ctx, 'smallK', 0.52), rotA = jzP(ctx, 'rotAmp', 6), mode = jzP(ctx, 'mode', 'line');
    var bb = null, r, i;
    for (r = 0; r < rows; r++) {
        var row = chars.slice(r * per, (r + 1) * per), Ls = [], ks = [], widths = [], sum = 0;
        for (i = 0; i < row.length; i++) {
            var ch = row[i], gi = r * per + i;
            var k = jzIsKanji(ch) ? 1 : jzIsKata(ch) ? 0.88 : jzIsLatin(ch) ? 0.8 : jzIsPunct(ch) ? 0.42 : smallK + jzR(seed, gi, 3) * 0.14;
            var font = (jzIsKanji(ch) || jzIsKata(ch)) ? fB : (jzR(seed, gi, 4) < 0.55 ? fS : fB);
            var L = jzText(ctx, ch, { font: font, size: 100 * k, color: sc.fg, x: 0, y: 0 });
            var sz = jzSize(L); Ls.push(L); ks.push(k); widths.push(Math.max(sz[0], 100 * k * 0.6)); sum += widths[i];
        }
        var s = Math.min(W * 0.86 / sum, (H * (rows > 1 ? 0.3 : 0.4)) / 100);
        var x = W / 2 - sum * s / 2, base = 100 * s, baseline = H / 2 + base * 0.38 + (r - (rows - 1) / 2) * base * 1.05;
        for (i = 0; i < Ls.length; i++) {
            var gi2 = r * per + i, src = Ls[i].property('ADBE Text Properties').property('ADBE Text Document'), td = src.value;
            td.fontSize = 100 * ks[i] * s; if (gi2 === (jzP(ctx, 'accentIdx', 99) % n) && !jzIsKanji(row[i])) td.fillColor = jzHex(sc.accent);
            src.setValue(td); jzAnchor(Ls[i]);
            var size = 100 * ks[i] * s, y = baseline - size / 2 + (jzR(seed, gi2, 5) * 2 - 1) * base * 0.06;
            if (mode === 'stair') y += (i - (Ls.length - 1) / 2) * base * 0.12;
            if (mode === 'wave') y += Math.sin(i * 1.1) * base * 0.1;
            jzXf(Ls[i], 'ADBE Position').setValue([x + widths[i] * s / 2, y]);
            jzXf(Ls[i], 'ADBE Rotate Z').setValue((jzR(seed, gi2, 6) * 2 - 1) * rotA);
            jzMotion(ctx, Ls[i], { size: size, mi: gi2 });
            bb = jzUnion(bb, jzBB(Ls[i]));
            x += widths[i] * s;
        }
    }
    return bb;
};

JZ_LAYOUTS.vcols = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, text = c.text.replace(/[\s　]+/g, ''), n = jzCount(text);
    var font = jzFontOf(ctx, 'font', 'serif'), variant = jzP(ctx, 'variant', n <= 5 ? 'repeat' : 'split'), bb = null, i;
    if (variant === 'repeat' && n <= 9) {
        var cols = jzP(ctx, 'cols', 3), size = Math.min(H * 0.8 / (n * 1.04), W * 0.86 / (cols * 1.75)), mid = (cols - 1) / 2, side = jzP(ctx, 'side', 'same');
        for (i = 0; i < cols; i++) {
            var isSide = i !== Math.round(mid);
            var o = { font: font, size: size, color: sc.fg, x: W / 2 + (i - mid) * size * 1.75, y: H / 2, leading: size * 1.04, mi: Math.abs(i - mid) * 2 };
            if (isSide && side === 'outline') { o.fill = false; o.stroke = Math.max(1.2, size * 0.012); o.strokeColor = sc.fg; }
            if (isSide && side === 'dim') o.opacity = 0.38;
            var L = jzMain(ctx, jzVertical(text), o);
            if (!isSide) bb = jzBB(L);
        }
        return bb;
    }
    var arr = jzChars(text), perCol = Math.max(2, Math.min(jzP(ctx, 'perCol', 4) + 1, Math.ceil(n / Math.ceil(n / 7)))), colsA = [];
    for (i = 0; i < arr.length; i += perCol) colsA.push(arr.slice(i, i + perCol).join(''));
    var sz = Math.min(H * 0.74 / (perCol * 1.03), W * 0.8 / (colsA.length * 1.4)), top = H / 2 - perCol * sz * 1.03 / 2;
    for (i = 0; i < colsA.length; i++) {
        var x = W / 2 + ((colsA.length - 1) / 2 - i) * sz * 1.4;
        var cL = jzText(ctx, jzVertical(colsA[i]), { font: font, size: sz, color: sc.fg, x: x, y: 0, leading: sz * 1.03 });
        var h = jzSize(cL)[1]; jzXf(cL, 'ADBE Position').setValue([x, top + h / 2]);
        jzMotion(ctx, cL, { size: sz, mi: i * 3 });
        bb = jzUnion(bb, jzBB(cL));
    }
    return bb;
};

function jzScrollRow(ctx, text, o) {
    // one repeated row that scrolls sideways forever (period measured from the unit)
    var unit = text + '　';
    var probe = jzText(ctx, unit, { font: o.font, size: o.size, color: o.color, x: -9999, y: -9999, track: o.track || 0.05 });
    var per = Math.max(10, jzSize(probe)[0]); probe.remove();
    var reps = Math.ceil(ctx.W * 2.6 / per) + 1, s = '';
    for (var i = 0; i < reps; i++) s += unit;
    var L = jzText(ctx, s, { font: o.font, size: o.size, color: o.color, x: ctx.W / 2, y: o.y, track: o.track || 0.05, fill: o.fill, stroke: o.stroke, strokeColor: o.strokeColor, opacity: o.opacity, sx: o.sx });
    jzSetExpr(jzXf(L, 'ADBE Position'), 'var per=' + jzN(per * (o.sx || 1)) + ',sp=' + jzN(o.speed) + ',of=' + jzN(o.offset || 0) + ';var d=((time*sp+of)%per+per)%per-per/2;[value[0]+d,value[1]]');
    return L;
}

JZ_LAYOUTS.marquee = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, font = jzFontOf(ctx, 'font', 'display'), sx = jzP(ctx, 'sx', 1.4), style = jzP(ctx, 'rowStyle', 'outline'), rowsN = jzP(ctx, 'rows', 2), speed = jzP(ctx, 'speed', 0.8);
    var L = jzMain(ctx, c.text, { font: font, size: 200, color: sc.fg, x: W / 2, y: H / 2, track: 0.05, maxW: W * 0.84 / sx, maxH: H * 0.3, maxSize: H * 0.3, sx: sx });
    var size = jzFontSize(L), rs = size * 0.42, ks = rowsN === 2 ? [-1, 1] : [-2, -1, 1, 2];
    for (var r = 0; r < ks.length; r++) {
        var k = ks[r], y = H / 2 + (k > 0 ? 1 : -1) * (size * 0.5 + rs * 0.95) + (Math.abs(k) - 1) * (k > 0 ? 1 : -1) * rs * 1.25;
        var o = { font: font, size: rs, color: sc.fg, y: y, speed: (r % 2 ? 1 : -1) * speed * W * 0.22, offset: r * 137, sx: sx };
        if (style === 'outline') { o.fill = false; o.stroke = Math.max(1.2, rs * 0.02); o.strokeColor = sc.fg; }
        else if (style === 'dim') { o.color = sc.sub; o.opacity = 0.35; }
        else {
            var B = jzShapeLayer(ctx, 'row band', W / 2, y); var g = jzGrp(B); jzAddRect(g, W + 40, rs * 1.24); jzAddFill(g, sc.ink); B.moveToEnd();
            o.color = sc.bg;
        }
        var R = jzScrollRow(ctx, c.text, o);
        jzFadeIO(ctx, R, Math.abs(k) * 0.05, 0.12);
    }
    return jzBB(L);
};

JZ_LAYOUTS.tile = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, n = jzP(ctx, 'rowsN', 14), unit = jzP(ctx, 'unit', 'chunk') === 'line' ? c.lineText : c.text;
    var tf = jzFontOf(ctx, 'tileFont', 'serif'), rowH = H / n, ts = rowH * 0.72;
    for (var r = 0; r <= n; r++) {
        var R = jzScrollRow(ctx, unit, { font: tf, size: ts, color: sc.sub, y: (r + 0.5) * rowH, speed: (r % 2 ? 26 : -26), offset: r * 91, track: 0.02, opacity: 0.42 });
        jzFadeIO(ctx, R, jzR(c.seed, r, 91) * c.inDur * 1.6, 0.1);
    }
    var font = jzFontOf(ctx, 'font', 'display');
    var o = { font: font, size: 200, color: sc.fg, x: W / 2, y: H / 2, track: 0.04, maxW: W * 0.8, maxH: H * 0.34, maxSize: H * 0.3 };
    if (jzP(ctx, 'knock', 'stroke') === 'box') {
        var M = jzMain(ctx, c.text, o), bb = jzBB(M), pad = jzFontSize(M) * 0.35;
        var B = jzShapeLayer(ctx, 'knockout box', W / 2, H / 2); var g = jzGrp(B); jzAddRect(g, bb.x1 - bb.x0 + pad * 2, bb.y1 - bb.y0 + pad * 1.6); jzAddFill(g, sc.bg);
        B.moveAfter(M); jzSetExpr(jzXf(B, 'ADBE Scale'), JZ_FNS + 'var e=oe(time/0.4);[value[0]*e,value[1]]');
        return bb;
    }
    var K = jzText(ctx, c.text, { font: font, size: 200, color: sc.bg, x: W / 2, y: H / 2, track: 0.04, maxW: W * 0.8, maxH: H * 0.34, maxSize: H * 0.3, stroke: 1, strokeColor: sc.bg });
    var ks = jzFontSize(K), src = K.property('ADBE Text Properties').property('ADBE Text Document'), td = src.value; td.strokeWidth = ks * 0.16; src.setValue(td);
    jzMotion(ctx, K, { size: ks, mi: 0 });
    var M2 = jzMain(ctx, c.text, o);
    return jzBB(M2);
};

JZ_LAYOUTS.scatter = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, chars = jzChars(c.text.replace(/[\s　]+/g, '')), n = chars.length, bb = null, i;
    if (jzP(ctx, 'extras', true)) for (i = 0; i < 8; i++) {
        var top = jzR(s, i, 82) < 0.5;
        var E = jzSmall(ctx, c.text, { size: jzLerp(H * 0.022, H * 0.045, jzR(s, i, 83)), color: sc.sub, x: jzLerp(W * 0.08, W * 0.92, jzR(s, i, 84)), y: top ? jzLerp(H * 0.08, H * 0.26, jzR(s, i, 85)) : jzLerp(H * 0.74, H * 0.92, jzR(s, i, 85)), rot: (jzR(s, i, 86) * 2 - 1) * 18, opacity: 0.75 });
        jzFadeIO(ctx, E, jzR(s, i, 81) * c.dur * 0.5, 0.1);
    }
    var base = Math.min(H * 0.3, W * 0.9 / n * 1.15), fA = jzFontOf(ctx, 'font', 'display'), fB = jzFontOf(ctx, 'fontB', 'serif');
    for (i = 0; i < n; i++) {
        var k = 0.62 + jzR(s, i, 73) * 0.85 * (jzIsKanji(chars[i]) ? 1 : 0.7);
        var L = jzMain(ctx, chars[i], { font: i % 3 === 1 ? fB : fA, size: base * k, color: jzR(s, i, 75) < 0.15 ? sc.accent : sc.fg, x: W * (0.1 + 0.8 * (i + 0.5) / n) + (jzR(s, i, 71) * 2 - 1) * W * 0.035, y: H / 2 + (jzR(s, i, 72) * 2 - 1) * H * 0.18, rot: (jzR(s, i, 74) * 2 - 1) * 24, mi: i });
        bb = jzUnion(bb, jzBB(L));
    }
    return bb;
};

function jzCircleShape(cx, cy, R) {
    var k = 0.5523 * R, sh = new Shape();
    sh.vertices = [[cx, cy - R], [cx + R, cy], [cx, cy + R], [cx - R, cy]];
    sh.inTangents = [[-k, 0], [0, -k], [k, 0], [0, k]];
    sh.outTangents = [[k, 0], [0, k], [-k, 0], [0, -k]];
    sh.closed = true; return sh;
}
function jzTextOnPath(L, shape, firstMarginExpr, ctx) {
    // anchor == position == comp centre, so layer space equals comp space and scaling happens about the centre
    L.property('ADBE Transform Group').property('ADBE Anchor Point').setValue([ctx.W / 2, ctx.H / 2]);
    L.property('ADBE Transform Group').property('ADBE Position').setValue([ctx.W / 2, ctx.H / 2]);
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
    m.property('ADBE Mask Shape').setValue(shape);
    try { m.maskMode = MaskMode.NONE; } catch (e) {}
    var po = L.property('ADBE Text Properties').property('ADBE Text Path Options');
    try { po.property('ADBE Text Path').setValue(1); } catch (e1) { jzWarn('text path: ' + e1.toString()); }
    try { po.property('ADBE Text Perpendicular To Path').setValue(1); } catch (e2) {}
    if (firstMarginExpr) { try { L.property('ADBE Text Properties').property('ADBE Text Path Options').property('ADBE Text First Margin').expression = firstMarginExpr; } catch (e3) { jzWarn('first margin: ' + e3.toString()); } }
}

JZ_LAYOUTS.ring = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, text = c.text.replace(/[\s　]+/g, ''), n = jzCount(text), R = H * jzP(ctx, 'R', 0.31), cx = W / 2, cy = H / 2;
    var font = jzFontOf(ctx, 'font', 'display'), fontC = jzFontOf(ctx, 'fontC', 'display'), center = jzP(ctx, 'center', 'word'), speed = jzP(ctx, 'speed', 8);
    var ringS = jzShapeLayer(ctx, 'ring lines', cx, cy), g = jzGrp(ringS); jzAddEllipse(g, R * 1.72, R * 1.72); jzAddStroke(g, sc.sub, 1.2, 55);
    var g2 = jzGrp(ringS); jzAddEllipse(g2, R * 2.3, R * 2.3); jzAddStroke(g2, sc.sub, 1.2, 35); ringS.moveToEnd();
    var bb = null;
    if (center === 'disc') {
        var D = jzShapeLayer(ctx, 'disc', cx, cy), gd = jzGrp(D); jzAddEllipse(gd, R * 1.44, R * 1.44); jzAddFill(gd, sc.accent); jzPop(ctx, D, 0, true);
        bb = jzBB(jzMain(ctx, text, { font: fontC, size: 200, color: sc.bg, x: cx, y: cy, maxW: R * 1.15, maxH: R * 0.8, maxSize: H * 0.2 }));
    } else if (center === 'word') {
        bb = jzBB(jzMain(ctx, text, { font: fontC, size: 200, color: sc.fg, x: cx, y: cy, maxW: R * 1.3, maxH: R * 0.85, maxSize: H * 0.22 }));
    }
    var sizeRing = Math.min(H * 0.07, 2 * Math.PI * R / ((n + 1) * 1.25));
    var unit = text + '・', probe = jzText(ctx, unit, { font: font, size: sizeRing, x: -9999, y: -9999, color: sc.fg });
    var uw = Math.max(10, jzSize(probe)[0]); probe.remove();
    var reps = Math.max(1, Math.floor(2 * Math.PI * R / uw)), s = '';
    for (var i = 0; i < reps; i++) s += unit;
    var T = jzText(ctx, s, { font: font, size: sizeRing, color: sc.fg, x: 0, y: 0, align: 'left' });
    jzTextOnPath(T, jzCircleShape(cx, cy, R), 'time*' + jzN(speed * R * Math.PI / 180), ctx);
    var okIn = { pop: 1, spin: 1, flicker: 1, scramble: 1, type: 1, blur: 1, drop: 1 };
    jzMotion(ctx, T, { size: sizeRing, mi: 0, noHold: true, enter: okIn[c.enter] ? c.enter : 'pop', exit: (c.exit === 'stretch' || c.exit === 'slice' || c.exit === 'wipe') ? 'blur' : c.exit });
    return bb || { x0: cx - R, x1: cx + R, y0: cy - R, y1: cy + R, cx: cx, cy: cy };
};

JZ_LAYOUTS.wave = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, text = c.text.replace(/[\s　]+/g, ''), n = jzCount(text);
    var amp = H * jzP(ctx, 'amp', 0.12), freq = jzP(ctx, 'freq', 1.2), size = Math.min(H * 0.2, W * 0.72 / n), travel = jzP(ctx, 'travel', 0.35);
    var sh = new Shape(), pts = [], seg = 24, i;
    for (i = 0; i <= seg; i++) { var u = i / seg; pts.push([jzLerp(-W * 0.1, W * 1.1, u), H / 2 + amp * Math.sin(Math.PI * 2 * freq * u)]); }
    sh.vertices = pts; sh.closed = false;
    var T = jzText(ctx, text, { font: jzFontOf(ctx, 'font', 'display'), size: size, color: sc.fg, x: 0, y: 0, align: 'left' });
    var pathLen = W * 1.2 * (1 + amp / W * 2);
    var tw = jzSize(T)[0];
    jzTextOnPath(T, sh, 'var u=time/' + jzN(c.dur) + ';' + jzN(pathLen / 2 - tw / 2) + '+(u-0.5)*' + jzN(-travel * W * (travel < 0 ? -1 : 1)), ctx);
    var ec = jzEffect(T, 'ADBE Echo', 'JZ Trails');
    jzEP(ec, 1, -0.033); jzEP(ec, 2, jzP(ctx, 'trail', 7)); jzEP(ec, 3, 1); jzEP(ec, 4, 0.72); jzEP(ec, 5, 5);
    var okW = { pop: 1, spin: 1, flicker: 1, scramble: 1, type: 1, blur: 1, drop: 1, assemble: 1 };
    jzMotion(ctx, T, { size: size, mi: 0, noHold: true, enter: okW[c.enter] ? c.enter : 'pop', exit: (c.exit === 'stretch' || c.exit === 'shrink') ? 'blur' : c.exit });
    return { x0: W * 0.2, x1: W * 0.8, y0: H / 2 - amp - size / 2, y1: H / 2 + amp + size / 2, cx: W / 2, cy: H / 2 };
};

JZ_LAYOUTS.huge = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, t0 = c.text.replace(/[\s　]+/g, ''), n = jzCount(t0);
    var text = n >= 5 ? jzSplitLines(t0, Math.ceil(n / 2)) : t0, two = n >= 5;
    var size = two ? Math.min(H * 0.56, W * 1.2 / (Math.ceil(n / 2) * 0.98)) : Math.min(H * 0.98, W * 1.3 / (n * 0.96));
    var L = jzMain(ctx, text, { font: jzFontOf(ctx, 'font', 'display'), size: size, color: sc.fg, x: W / 2, y: H / 2 + H * 0.02, track: -0.02, leading: two ? size * 0.98 : null });
    var dir = jzP(ctx, 'dir', 1);
    jzSetExpr(jzXf(L, 'ADBE Anchor Point'), '[value[0]-(0.5-time/' + jzN(c.dur) + ')*thisComp.width*0.16*' + dir + ',value[1]]');
    if (sc.grad && jzP(ctx, 'grad', false)) {
        var gr = jzEffect(L, 'ADBE Ramp', 'JZ Gradient');
        jzEP(gr, 1, [W / 2, H / 2 - size / 2]); jzEP(gr, 2, jzHex(sc.grad[0])); jzEP(gr, 3, [W / 2, H / 2 + size / 2]); jzEP(gr, 4, jzHex(sc.grad[1]));
    }
    if (jzP(ctx, 'label', true)) {
        var ls = Math.max(16, H * 0.028);
        var T = jzSmall(ctx, c.text, { size: ls, color: sc.bg, x: W * 0.05 + ls * 0.7, y: H * 0.86, align: 'left', track: 0.12 });
        var tw = jzSize(T)[0];
        var B = jzShapeLayer(ctx, 'label box', W * 0.05 + (tw + ls * 1.4) / 2, H * 0.86), g = jzGrp(B); jzAddRect(g, tw + ls * 1.4, ls * 2); jzAddFill(g, sc.ink);
        B.moveAfter(T); jzFadeIO(ctx, B, c.inDur * 0.5, 0.2); jzFadeIO(ctx, T, c.inDur * 0.5, 0.2);
    }
    return jzBB(L);
};

JZ_LAYOUTS.labels = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, text = c.text.replace(/[\s　]+/g, ''), variant = jzP(ctx, 'variant', 'radial');
    var units = [], i, ch = jzChars(text);
    if (jzP(ctx, 'unit', 'char') === 'char' || !(c.words && c.words.length)) { for (i = 0; i < ch.length; i++) if (!jzIsPunct(ch[i])) units.push(ch[i]); }
    else units = c.words;
    if (!units.length) units = [text];
    var font = jzFontOf(ctx, 'font', 'display');
    function label(u, x, y, rot, fs, delay) {
        var T = jzText(ctx, u, { font: font, size: fs, color: sc.bg, x: x, y: y, track: 0.04 });
        var sz = jzSize(T), B = jzShapeLayer(ctx, 'label', x, y), g = jzGrp(B);
        jzAddRect(g, sz[0] + fs * 0.7, fs * 1.36); jzAddFill(g, sc.ink);
        jzXf(B, 'ADBE Rotate Z').setValue(rot); B.moveAfter(T);
        T.parent = B; jzPop(ctx, B, delay, true);
        return B;
    }
    if (variant === 'radial') {
        var m = Math.max(units.length, 10), R = H * 0.3, fs = H * 0.062;
        if (jzP(ctx, 'center', 'orb') === 'orb') { var O = jzShapeLayer(ctx, 'orb', W / 2, H / 2), go = jzGrp(O); jzAddEllipse(go, R * 1.04, R * 1.04); jzAddFill(go, sc.accent); jzPop(ctx, O, 0, true); O.moveToEnd(); }
        for (i = 0; i < m; i++) { var a = i / m * 360 - 90; label(units[i % units.length], W / 2 + Math.cos(a * Math.PI / 180) * R, H / 2 + Math.sin(a * Math.PI / 180) * R, a, fs, i * 0.025); }
        if (jzP(ctx, 'center', 'orb') === 'word') jzMain(ctx, text, { font: jzFontOf(ctx, 'fontC', 'display'), size: 200, color: sc.fg, x: W / 2, y: H / 2, maxW: R * 1.1, maxH: R * 0.7, maxSize: H * 0.18 });
        return { x0: W / 2 - R, x1: W / 2 + R, y0: H / 2 - R, y1: H / 2 + R, cx: W / 2, cy: H / 2 };
    }
    if (variant === 'rows') {
        var k = units.length, fr = Math.min(H * 0.14, H * 0.7 / (k * 1.5));
        for (i = 0; i < k; i++) label(units[i], W / 2 + (jzR(s, i, 5) * 2 - 1) * W * 0.12, H / 2 + (i - (k - 1) / 2) * fr * 1.55, (jzR(s, i, 6) * 2 - 1) * 4, fr, i * 0.05);
        return { x0: W * 0.3, x1: W * 0.7, y0: H / 2 - k * fr * 0.8, y1: H / 2 + k * fr * 0.8, cx: W / 2, cy: H / 2 };
    }
    var fsc = H * 0.085;
    for (i = 0; i < units.length; i++) label(units[i], W * (0.15 + 0.7 * ((i + 0.5) / units.length)) + (jzR(s, i, 7) * 2 - 1) * W * 0.04, H / 2 + (jzR(s, i, 8) * 2 - 1) * H * 0.25, (jzR(s, i, 9) * 2 - 1) * 22, fsc * (0.8 + jzR(s, i, 10) * 0.5), i * 0.05);
    return { x0: W * 0.15, x1: W * 0.85, y0: H * 0.3, y1: H * 0.7, cx: W / 2, cy: H / 2 };
};

JZ_LAYOUTS.condensed = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, text = c.text.replace(/[\s　]+/g, ''), count = jzP(ctx, 'count', 2), sx = jzP(ctx, 'sx', 0.5), sy = jzP(ctx, 'sy', 1.2);
    var slot = W * 0.92 / count, bb = null, order = [1, 0, 2, 3];
    for (var i = 0; i < count; i++) {
        var L = jzMain(ctx, text, { font: jzFontOf(ctx, 'font', 'display'), size: 200, color: sc.fg, x: W / 2 + (i - (count - 1) / 2) * slot, y: H / 2, track: 0.04, maxW: slot * 0.94 / sx, maxH: H * 0.8 / sy, maxSize: H * 0.62, sx: sx, sy: sy, mi: count > 1 ? order[i] * 2 : 0 });
        bb = jzUnion(bb, jzBB(L));
    }
    return bb;
};

JZ_LAYOUTS.gloss = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, text = c.text, font = jzFontOf(ctx, 'font', 'serif'), right = jzP(ctx, 'side', 'right') === 'right', r;
    if (jzP(ctx, 'bgText', true)) for (r = 0; r < 3; r++) jzScrollRow(ctx, text.replace(/[\s　]+/g, ''), { font: font, size: H * 0.3, color: sc.dim, y: H * (0.18 + r * 0.32), speed: r % 2 ? 20 : -20, offset: r * 200 }).moveToEnd();
    var L = jzMain(ctx, text, { font: font, size: 200, color: sc.fg, x: right ? W * 0.4 : W * 0.6, y: H * 0.54, track: 0.03, maxW: W * 0.5, maxH: H * 0.3, maxSize: H * 0.24 });
    var bb = jzBB(L), size = jzFontSize(L);
    var ax = right ? bb.x1 + size * 0.1 : bb.x0 - size * 0.1, ay = bb.y0 + size * 0.2;
    var nx = right ? Math.min(W * 0.9, bb.x1 + W * 0.1) : Math.max(W * 0.1, bb.x0 - W * 0.1), ny = Math.max(H * 0.12, bb.y0 - H * 0.12);
    var S = jzShapeLayer(ctx, 'leader', 0, 0), g = jzGrp(S);
    jzAddPath(g, [[ax, ay], [jzLerp(ax, nx, 0.45), ay], [nx, ny]], false); jzAddStroke(g, sc.sub, 1.3);
    jzAddTrimPaths(g, JZ_FNS + '100*oe((time-' + jzN(c.inDur * 0.4) + ')/0.45)');
    var gd = jzGrp(S); jzAddEllipse(gd, 8, 8, ax, ay); jzAddFill(gd, sc.accent);
    var ns = Math.max(14, H * 0.024), al = right ? 'left' : 'right', body = jzFontOf(ctx, '_', 'body');
    var t1 = jzText(ctx, '【' + text.replace(/[\s　]+/g, '') + '】', { font: font, size: ns * 1.2, color: sc.fg, x: nx, y: ny - ns * 1.2, align: al });
    var note = c.note || jzRomaji(text.replace(/[\s　]+/g, '')) || c.lineText;
    var t2 = jzText(ctx, note, { font: body, size: ns, color: sc.sub, x: nx, y: ny + ns * 0.4, align: al, track: 0.08 });
    var t3 = jzText(ctx, 'No.' + jzPad((c.line || 0) + 1, 2), { font: 'mono', size: ns * 0.8, color: sc.accent, x: nx, y: ny + ns * 2, align: al });
    jzFadeIO(ctx, t1, c.inDur * 0.5, 0.3); jzFadeIO(ctx, t2, c.inDur * 0.6, 0.3); jzFadeIO(ctx, t3, c.inDur * 0.7, 0.3);
    return bb;
};

JZ_LAYOUTS.type = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, left = jzP(ctx, 'align', 'left') === 'left';
    var text = jzSplitLines(c.text, 14), x = left ? W * 0.13 : W / 2;
    var L = jzText(ctx, text, { font: jzFontOf(ctx, 'font', 'body'), size: 200, color: sc.fg, x: x, y: H / 2, align: left ? 'left' : 'center', track: 0.06, maxW: W * 0.74, maxH: H * 0.36, maxSize: H * 0.11 });
    jzMotion(ctx, L, { size: jzFontSize(L), mi: 0, enter: c.enter === 'cut' ? 'type' : c.enter });
    var bb = jzBB(L), fs = jzFontSize(L);
    if (jzP(ctx, 'prompt', true)) { var p = jzText(ctx, '>', { font: 'mono', size: fs * 0.8, color: sc.accent, x: (left ? x : bb.x0) - fs * 0.9, y: bb.y0 + fs * 0.55 }); jzFadeIO(ctx, p, 0, 0.05); }
    var st = jzText(ctx, 'LINE ' + jzPad((c.line || 0) + 1, 2), { font: 'mono', size: Math.max(12, H * 0.02), color: sc.sub, x: W * 0.13, y: H * 0.8, align: 'left', opacity: 0.8 });
    try { st.property('ADBE Text Properties').property('ADBE Text Document').expression = '"LINE ' + jzPad((c.line || 0) + 1, 2) + ' ─ " + timeToTimecode(time + ' + jzN(c.start) + ')'; } catch (e) {}
    return bb;
};

JZ_LAYOUTS.diag = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, ang = jzP(ctx, 'ang', 16), bandCol = jzP(ctx, 'band', 'accent') === 'accent' ? sc.accent : sc.ink;
    var txtCol = jzLum(bandCol) > 0.5 ? (jzLum(sc.bg) < 0.5 ? sc.bg : '#111111') : (jzLum(sc.fg) > 0.5 ? sc.fg : '#FFFFFF');
    var L = jzText(ctx, c.text, { font: jzFontOf(ctx, 'font', 'display'), size: 200, color: txtCol, x: W / 2, y: H / 2, track: 0.05, maxW: W * 0.72, maxH: H * 0.24, maxSize: H * 0.2, rot: -ang });
    var size = jzFontSize(L), bh = size * 1.6;
    var B = jzShapeLayer(ctx, 'band', W / 2, H / 2), g = jzGrp(B); jzAddRect(g, W * 2.4, bh); jzAddFill(g, bandCol);
    jzXf(B, 'ADBE Rotate Z').setValue(-ang); B.moveAfter(L);
    jzSetExpr(jzXf(B, 'ADBE Scale'), JZ_FNS + 'var e=oe(time/' + jzN(Math.max(0.1, c.inDur * 0.8)) + ')*(1-ie((time-' + jzN(c.dur - (c.outDur || 0)) + ')/' + jzN(Math.max(0.05, c.outDur || 0.05)) + '));[value[0],value[1]*e]');
    if (jzP(ctx, 'second', true)) {
        var y2 = bh * 0.95, h2 = bh * 0.32, rad = -ang * Math.PI / 180;
        var ox = -Math.sin(rad) * y2, oy = Math.cos(rad) * y2;
        var B2 = jzShapeLayer(ctx, 'band 2', W / 2 + ox, H / 2 + oy), g2 = jzGrp(B2); jzAddRect(g2, W * 2.4, h2); jzAddFill(g2, sc.fg, 90);
        jzXf(B2, 'ADBE Rotate Z').setValue(-ang); B2.moveAfter(B);
        var R2 = jzScrollRow(ctx, c.lineText + '　／', { font: jzFontOf(ctx, '_', 'body'), size: h2 * 0.55, color: sc.bg, y: 0, speed: 120, track: 0.1 });
        R2.parent = B2; jzXf(R2, 'ADBE Rotate Z').setValue(0);
        jzXf(R2, 'ADBE Position').setValue([0, 0]);
    }
    jzMotion(ctx, L, { size: size, mi: 0 });
    return jzBB(L);
};

JZ_LAYOUTS.circle = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, text = c.text.replace(/[\s　]+/g, ''), variant = jzP(ctx, 'variant', 'disc'), font = jzFontOf(ctx, 'font', 'display');
    var cx = W / 2 + jzP(ctx, 'off', 0) * W, cy = H / 2;
    if (variant === 'eclipse') {
        var L = jzMain(ctx, jzSplitLines(text, 6), { font: font, size: 200, color: sc.fg, x: W / 2, y: H / 2, maxW: W * 0.82, maxH: H * 0.46, maxSize: H * 0.36 });
        var R = H * 0.19, E = jzShapeLayer(ctx, 'eclipse', W / 2, H / 2 + H * 0.12), g = jzGrp(E);
        jzAddEllipse(g, R * 2, R * 2); jzAddStroke(g, sc.fg, 3, 90); jzAddFill(g, '#000000');
        var gl = jzEffect(E, 'ADBE Glo2', 'JZ Corona'); jzEP(gl, 2, 20); jzEP(gl, 3, 40); jzEP(gl, 4, 1.4);
        jzSetExpr(jzXf(E, 'ADBE Position'), '[value[0]+(time/' + jzN(c.dur) + '-0.5)*thisComp.width*0.16,value[1]]');
        return jzBB(L);
    }
    var Rr = H * 0.3, D = jzShapeLayer(ctx, 'circle', cx, cy), gd = jzGrp(D);
    jzAddEllipse(gd, Rr * 2, Rr * 2);
    if (variant === 'disc') { jzAddFill(gd, sc.accent); jzPop(ctx, D, 0, true); }
    else { jzAddStroke(gd, sc.fg, 3); jzAddTrimPaths(gd, JZ_FNS + '100*oe(time/' + jzN(Math.max(0.2, c.inDur * 1.3)) + ')'); }
    var vert = !!jzP(ctx, 'vertical', false);
    var T = jzMain(ctx, vert ? jzVertical(text) : text, { font: font, size: 200, color: variant === 'disc' ? sc.bg : sc.fg, x: cx, y: cy, maxW: vert ? Rr * 1.1 : Rr * 1.45, maxH: vert ? Rr * 1.35 : Rr * 0.9, maxSize: vert ? Rr * 0.9 : Rr * 0.8 });
    return jzBB(T);
};

JZ_LAYOUTS.stack = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, n = jzP(ctx, 'copies', 4), dir = jzP(ctx, 'dir', 1), gap = jzP(ctx, 'gap', 0.92), style = jzP(ctx, 'style', 'fade'), xs = jzP(ctx, 'xs', 0);
    var probe = jzText(ctx, c.text, { font: jzFontOf(ctx, 'font', 'display'), size: 200, color: sc.fg, x: -9999, y: -9999, track: 0.03, maxW: W * 0.8, maxH: H * 0.22, maxSize: H * 0.19 });
    var size = jzFontSize(probe); probe.remove();
    var step = size * gap, y0 = H / 2 - dir * (n - 1) * step / 2, bb = null;
    for (var k = n - 1; k >= 0; k--) {
        var o = { font: jzFontOf(ctx, 'font', 'display'), size: size, color: sc.fg, x: W / 2 + xs * W * k, y: y0 + dir * k * step, track: 0.03, mi: k * 1.2 };
        if (k > 0) { if (style === 'outline') { o.fill = false; o.stroke = Math.max(1.2, size * 0.014); o.strokeColor = sc.fg; o.opacity = 0.85; } else o.opacity = 0.6 * Math.pow(0.58, k - 1); }
        var L = jzMain(ctx, c.text, o); if (k === 0) bb = jzBB(L);
    }
    return bb;
};

JZ_LAYOUTS.pill = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut;
    var grad = jzP(ctx, 'grad', false) && sc.grad, fillA = grad ? sc.grad[0] : sc.accent, tc = jzLum(fillA) > 0.55 ? '#111111' : '#FFFFFF';
    var T = jzText(ctx, c.text, { font: jzFontOf(ctx, 'font', 'display'), size: 200, color: tc, x: W / 2, y: H / 2, track: 0.04, maxW: W * 0.62, maxH: H * 0.2, maxSize: H * 0.17 });
    var size = jzFontSize(T), sz = jzSize(T), w = sz[0] + size * 1.3, h = size * 1.6;
    var P = jzShapeLayer(ctx, 'capsule', W / 2, H / 2), g = jzGrp(P); jzAddRect(g, w, h, h / 2); jzAddFill(g, fillA);
    if (grad) { var gr = jzEffect(P, 'ADBE Ramp', 'JZ Gradient'); jzEP(gr, 1, [W / 2 - w / 2, H / 2]); jzEP(gr, 2, jzHex(sc.grad[0])); jzEP(gr, 3, [W / 2 + w / 2, H / 2]); jzEP(gr, 4, jzHex(sc.grad[1])); }
    P.moveAfter(T);
    jzSetExpr(jzXf(P, 'ADBE Scale'), JZ_FNS + 'var e=oe(time/' + jzN(Math.max(0.1, c.inDur * 0.9)) + ')*(1-ie((time-' + jzN(c.dur - (c.outDur || 0)) + ')/' + jzN(Math.max(0.05, c.outDur || 0.05)) + '));[value[0]*Math.max(' + jzN(h / w) + ',e),value[1]]');
    jzMotion(ctx, T, { size: size, mi: 0 });
    if (jzP(ctx, 'smalls', true)) {
        var labs = [jzRomaji(c.text.replace(/[\s　]+/g, '')) || 'LYRIC', 'No.' + jzPad((c.line || 0) + 1, 2)], fs = Math.max(13, H * 0.022);
        for (var i = 0; i < labs.length; i++) {
            var px = W / 2 + (i === 0 ? -w * 0.3 : w * 0.42), py = H / 2 + (i === 1 ? -h * 0.95 : h * 0.95);
            var t = jzSmall(ctx, labs[i], { size: fs, color: sc.fg, x: px, y: py, track: 0.1 }), ts = jzSize(t);
            var B = jzShapeLayer(ctx, 'tag', px, py), gb = jzGrp(B); jzAddRect(gb, ts[0] + fs * 1.6, fs * 1.7, fs * 0.85); jzAddStroke(gb, sc.fg, 1.3);
            t.parent = B; jzPop(ctx, B, 0.15 + i * 0.06, true);
        }
    }
    return jzBB(T);
};

JZ_LAYOUTS.title = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut;
    var L = jzMain(ctx, c.text, { font: jzFontOf(ctx, 'font', 'display'), size: 200, color: sc.fg, x: W / 2, y: H / 2, track: 0.08, maxW: W * 0.7, maxH: H * 0.2, maxSize: H * 0.16 });
    if (c.note) { var a = jzSmall(ctx, c.note, { size: Math.max(16, H * 0.03), color: sc.sub, x: W / 2, y: H / 2 + jzFontSize(L) * 0.95, track: 0.3 }); jzFadeIO(ctx, a, 0.3, 0.4); }
    return jzBB(L);
};

JZ_LAYOUTS.interlude = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut;
    var S = jzShapeLayer(ctx, 'rings', W / 2, H / 2);
    for (var k = 0; k < 3; k++) { var g = jzGrp(S); jzAddEllipse(g, H * (0.4 + k * 0.2), H * (0.4 + k * 0.2)); jzAddStroke(g, sc.sub, 1.2, 50); }
    jzSetExpr(jzXf(S, 'ADBE Scale'), 'var s=100*(1+0.04*Math.sin(time*2));[s,s]');
    if (jzP(ctx, 'variant', 'counter') === 'counter') {
        var n = jzText(ctx, '0.0', { font: jzFontOf(ctx, '_', 'display'), size: H * 0.36, color: sc.fg, x: W / 2, y: H / 2, opacity: 0.9 });
        try { n.property('ADBE Text Properties').property('ADBE Text Document').expression = 'Math.max(0,' + jzN(c.dur) + '-time).toFixed(1)'; } catch (e) {}
    }
    jzSmall(ctx, c.text || '— interlude —', { size: Math.max(12, H * 0.022), color: sc.sub, x: W / 2, y: H * 0.82, track: 0.4 });
    return { x0: W * 0.35, x1: W * 0.65, y0: H * 0.3, y1: H * 0.7, cx: W / 2, cy: H / 2 };
};
