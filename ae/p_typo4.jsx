// ================================================================ pack typo part 4: decor, text treatments, transitions (helpers: p_typo1, p_typo3)

/* ---------------------------------------------------------------- decor helpers */
function aty_FS(ctx) { return 16 * aty_k(ctx); }
function aty_MG(ctx) { return Math.round(jzU(ctx) * 0.05); }
function aty_hit(x0, y0, x1, y1, bb, pad) { pad = pad || 0; return !(x1 < bb.x0 - pad || x0 > bb.x1 + pad || y1 < bb.y0 - pad || y0 > bb.y1 + pad); }
// a screen corner (inside the margin) clear of the lyric; ok=false when none is free
function aty_corner(ctx, bb, w, h, right, low) {
    var W = ctx.W, H = ctx.H, m = aty_MG(ctx), sx0 = right ? 1 : -1, sy0 = low ? 1 : -1, c = [[sx0, sy0], [-sx0, sy0], [sx0, -sy0], [-sx0, -sy0]];
    for (var i = 0; i < 4; i++) {
        var X = c[i][0] > 0 ? W - m - w : m, Y = c[i][1] > 0 ? H - m - h : m;
        if (!aty_hit(X, Y, X + w, Y + h, bb, 14 * aty_k(ctx))) return { x: X, y: Y, ok: true, sx: c[i][0], sy: c[i][1] };
    }
    return { x: m, y: m, ok: false };
}
function aty_keyChar(text) {
    var a = jzChars(String(text || '')), i;
    for (i = 0; i < a.length; i++) if (jzIsKanji(a[i])) return a[i];
    for (i = 0; i < a.length; i++) if (!aty_isSp(a[i]) && !jzIsPunct(a[i]) && !aty_isSmall(a[i])) return a[i];
    for (i = 0; i < a.length; i++) if (!aty_isSp(a[i])) return a[i];
    return null;
}
function aty_bbok(ctx, bb) {
    if (bb && bb.x1 > bb.x0 && bb.y1 > bb.y0) return { x0: Math.max(bb.x0, -ctx.W * 0.1), x1: Math.min(bb.x1, ctx.W * 1.1), y0: Math.max(bb.y0, -ctx.H * 0.1), y1: Math.min(bb.y1, ctx.H * 1.1) };
    return { x0: ctx.W * 0.35, x1: ctx.W * 0.65, y0: ctx.H * 0.4, y1: ctx.H * 0.6 };
}

/* ================================================================ DECOR */

/* 奥付 — a small colophon block (line, time, glyph count, reading) typed into a free corner, with an accent hairline */
jzReg('decor', 'tyColophon', { back: false, build: function (ctx, bb0, d) {
    var bb = aty_bbok(ctx, bb0), sc = ctx.sc, c = ctx.cut, k = aty_k(ctx), fs = aty_FS(ctx) * 1.1, lead = fs * 1.7, i;
    var txt = jzTrim(c.text || ''), rom = aty_roma(txt), lt = jzTrim(String(c.lineText || txt).replace(/\s+/g, ' ')), la = jzChars(lt);
    var rows = [[la.length > 18 ? la.slice(0, 17).join('') + '…' : lt, jzBodyF(ctx), sc.fg],
        ['No.' + aty_p2((c.line | 0) + 1) + '  ' + jzFmtTime(c.start) + ' – ' + jzFmtTime(c.end != null ? c.end : c.start + c.dur), jzMonoF(ctx), sc.sub],
        [jzCount(txt) + ' CHARS' + (rom ? '  /  ' + (rom.length > 16 ? rom.substr(0, 15) + '…' : rom) : ''), jzMonoF(ctx), sc.sub]];
    var w = 0; for (i = 0; i < 3; i++) w = Math.max(w, aty_tw(rows[i][0], rows[i][1], fs, 0.12));
    var h = lead * 3, sp = aty_corner(ctx, bb, w + fs * 1.4, h, !!d.right, !!d.low);
    if (!sp.ok) return;
    var hd = aty_hd(ctx);
    var S = jzShapeLayer(ctx, 'colophon rule', 0, 0), g = jzGrp(S, 'rule');
    jzAddPath(g, [[sp.x, sp.y], [sp.x, sp.y + h]], false); jzAddStroke(g, aty_acc(sc), Math.max(1.5 * k, 2 * k)); jzAddTrimPaths(g, hd + '100*oe(time/0.6)*K');
    aty_op(ctx, S, 'K');
    for (i = 0; i < 3; i++) {       // each row is typed in
        var L = aty_label(ctx, rows[i][0], sp.x + fs * 1.4, sp.y + lead * (i + 0.5), { font: rows[i][1], size: fs, color: rows[i][2], alpha: i ? 0.85 : 1, op: 'K' });
        jzAnimator(L, 'JZ Type', [['ADBE Text Opacity', 0]], ATY_FNS + 'textIndex>Math.floor(textTotal*cl((time-' + jzN(0.1 + i * 0.14) + ')/0.45))?100:0');
    }
} });

/* 柱とノンブル — a running head (line number + lyric line + hairline) at the top and a folio number at the bottom */
jzReg('decor', 'tyRunningHead', { back: false, build: function (ctx, bb0, d) {
    var bb = aty_bbok(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, k = aty_k(ctx), m = aty_MG(ctx), fs = aty_FS(ctx) * 0.9, hd = aty_hd(ctx), e = 'oe(time/0.7)*K';
    var yH = m + fs * 0.6, right = !!d.right;
    if (!aty_hit(0, yH - fs, W, yH + fs, bb, 8 * k)) {
        var hs = jzChars(aty_p2((c.line | 0) + 1) + '　' + jzTrim(String(c.lineText || c.text || '').replace(/\s+/g, ' '))).slice(0, 30).join('');
        var tw = aty_tw(hs, jzBodyF(ctx), fs, 0.2), x0 = right ? W - m - tw : m;
        aty_label(ctx, hs, x0, yH, { font: jzBodyF(ctx), size: fs, track: 0.2, op: e });
        var a0 = right ? x0 - fs : x0 + tw + fs, a1 = right ? m : W - m;
        if ((a1 - a0) * (right ? -1 : 1) > 20 * k) aty_lines(ctx, 'running head rule', [[[a0, yH], [a1, yH]]], sc.sub, { width: Math.max(1, k), alpha: 0.6, trim: hd + '100*' + e, op: 'K' });
    }
    var yF = H - m - fs * 0.2, folio = jzPad((c.index | 0) + 1, 3), fw = aty_tw(folio, jzMonoF(ctx), fs * 1.3, 0.2), xF = right ? m + fw / 2 : W - m - fw / 2;
    if (!aty_hit(xF - fw, yF - fs * 1.2, xF + fw, yF + fs, bb, 8 * k)) {
        var a = 'oc((time-0.2)/0.4)*K';
        aty_label(ctx, folio, xF, yF, { size: fs * 1.3, align: 'center', color: sc.fg, track: 0.2, op: a });
        aty_lines(ctx, 'folio rule', [[[xF - fw * 0.9, yF - fs * 1.1], [xF + fw * 0.9, yF - fs * 1.1]]], aty_acc(sc), { width: Math.max(1.5 * k, 2 * k), op: a });
    }
} });

/* 字割り線 — hairlines at the glyph body edges run from the lyric out to the frame edges, like a type specimen */
jzReg('decor', 'tyGlyphBody', { back: false, build: function (ctx, bb0, d) {
    var bb = aty_bbok(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, k = aty_k(ctx), m = aty_MG(ctx) * 0.6, bw = bb.x1 - bb.x0, bh = bb.y1 - bb.y0, i;
    if (bh > bw * 1.3) return;           // vertical lyrics: nothing to divide horizontally
    var n = Math.max(1, Math.min(16, jzCount(String(ctx.cut.text || '')))), gap = 10 * k + bh * 0.06, lw = Math.max(1, 0.9 * k), hd = aty_hd(ctx);
    var S = jzShapeLayer(ctx, 'glyph body lines', 0, 0);
    for (i = 0; i <= n; i++) {
        var x = jzLerp(bb.x0, bb.x1, i / n), t0 = bb.y0 - gap, b0 = bb.y1 + gap, segs = [];
        if (t0 > m) segs.push([[x, t0], [x, m]]);
        if (b0 < H - m) segs.push([[x, b0], [x, H - m]]);
        if (segs.length) aty_grp(S, 'edge ' + (i + 1), segs, sc.sub, { width: lw, alpha: 0.45, trim: hd + '100*oe((time-' + jzN(i * 0.015) + ')/0.7)' });
    }
    var e = 'oe((time-0.1)/0.8)', sides = [];
    for (i = 0; i < 2; i++) { var y = i ? bb.y1 : bb.y0; sides.push([[bb.x0 - gap, y], [m, y]]); sides.push([[bb.x1 + gap, y], [W - m, y]]); }
    aty_grp(S, 'body', sides, sc.sub, { width: lw, alpha: 0.45, trim: hd + '100*' + e });
    aty_op(ctx, S, 'K');
    var fs = aty_FS(ctx) * 0.75;
    if (bb.y0 - gap > m + fs * 2) aty_label(ctx, aty_p2(jzCount(String(ctx.cut.text || ''))) + ' / W' + Math.round(bw / k), bb.x0 + 4 * k, bb.y0 - gap - fs * 0.8, { size: fs, color: aty_acc(sc), op: e + '*K' });
} });

/* 文字罫 — a rule made of tiny repeated lyric text runs along the top and bottom edges, drifting in opposite directions */
jzReg('decor', 'tyTextRule', { back: false, build: function (ctx, bb0, d) {
    var bb = aty_bbok(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, k = aty_k(ctx), m = aty_MG(ctx), fs = aty_FS(ctx) * 0.72;
    var font = (d.v | 0) % 2 ? jzMonoF(ctx) : jzBodyF(ctx), unit = jzTrim(String(c.lineText || c.text || '').replace(/\s+/g, ' ')) + '　／　', per = aty_tw(unit, font, fs, 0.18);
    if (per < 4 * k) return;
    var rows = d.n >= 2 ? [m * 0.75, H - m * 0.75] : [d.low ? H - m * 0.75 : m * 0.75], hd = aty_hd(ctx), Lw = W - m * 1.2, x0 = (W - Lw) / 2;
    for (var r = 0; r < rows.length; r++) {
        var y = rows[r];
        if (aty_hit(0, y - fs, W, y + fs, bb, 6 * k)) continue;
        var e = 'oe((time-' + jzN(r * 0.1) + ')/0.8)', dir = r % 2 ? 1 : -1, reps = Math.min(30, Math.ceil(W * 1.2 / per) + 2), s = '';
        for (var q = 0; q < reps; q++) s += unit;
        var T = aty_text(ctx, s, { font: font, size: fs, align: 'left', track: 0.18, x: x0 - per, y: y, color: sc.sub, alpha: 0.8, name: 'text rule ' + (r + 1) });
        // glyphs drift inside a window that opens from the centre (the mask stays put: the drift is a text animator)
        jzAnimator(T, 'JZ Drift', [['ADBE Text Position 3D', [per, 0, 0]]], 'var per=' + jzN(per) + ';(((time*' + jzN(26 * k * dir) + ')%per+per)%per)/per*100');
        var ay = -ATY_CY * fs, cxL = W / 2 - (x0 - per);
        var mk = jzMaskRect(T, cxL - 0.01, ay - fs, cxL + 0.01, ay + fs);
        mk.property('ADBE Mask Offset').expression = hd + jzN(Lw / 2) + '*' + e;
        aty_op(ctx, T, 'K');
        var ry = y + (r || d.low ? -1 : 1) * fs * 1.05;
        aty_lines(ctx, 'text rule line ' + (r + 1), [[[x0, ry], [x0 + Lw, ry]]], sc.sub, { width: Math.max(1, 0.8 * k), alpha: 0.5, trim: hd + '50+50*' + e, start: hd + '50-50*' + e, op: 'K' });
    }
} });

/* 級数見本 — the key glyph of the lyric set at five falling sizes on one baseline, each with its size, in a free corner */
jzReg('decor', 'tyTypeScale', { back: false, build: function (ctx, bb0, d) {
    var bb = aty_bbok(ctx, bb0), sc = ctx.sc, k = aty_k(ctx), ch = aty_keyChar(ctx.cut.text), i;
    if (!ch) return;
    var S0 = jzU(ctx) * 0.085, ks = [1, 0.72, 0.52, 0.37, 0.26], font = (d.v | 0) % 2 ? jzSerifF(ctx) : jzFontKeyOf(ctx.st, 'display'), gapK = 0.18, w = 0;
    for (i = 0; i < 5; i++) w += S0 * ks[i] * (1 + gapK);
    var fs = aty_FS(ctx) * 0.7, h = S0 + fs * 2.2, sp = aty_corner(ctx, bb, w, h, !!d.right, !!d.low);
    if (!sp.ok) return;
    var yb = sp.y + S0 * 0.95, x = sp.x, gs = [], gp = [], ls = [], lp2 = [];
    for (i = 0; i < 5; i++) { var s = S0 * ks[i]; gs.push(ch); gp.push([x + s / 2, yb - s * 0.46]); ls.push(String(Math.round(s / k * 0.75))); lp2.push([x + s / 2, yb + fs * 1.1]); x += s * (1 + gapK); }
    // the five glyphs: one layer, placed and scaled per glyph
    var G = aty_multi(ctx, gs, gp, { font: font, size: S0, align: 'center', track: 0, color: sc.sub, name: 'type scale' });
    jzCharScales(G.L, ks, 'JZ Size');
    jzAnimator(G.L, 'JZ First', [['ADBE Text Fill Color', jzHex(sc.fg)]], 'textIndex===1?100:0');
    aty_multiFade(ctx, G, 'oc((time-0.1-j*0.07)/0.3)*K');
    var Lb = aty_multi(ctx, ls, lp2, { size: fs, align: 'center', track: 0.05, alpha: 0.9, name: 'type sizes' });
    aty_multiFade(ctx, Lb, 'oc((time-0.1-j*0.07)/0.3)*K');
    aty_lines(ctx, 'type scale base', [[[sp.x, yb + fs * 0.25], [x, yb + fs * 0.25]]], aty_acc(sc), { width: Math.max(1, k), alpha: 0.8, trim: aty_hd(ctx) + '100*oe(time/0.6)', op: 'K' });
} });

/* 大きな約物 — huge dim 「 」 (or 『 』 / “ ”) glyphs set behind the lyric at its opposite corners */
jzReg('decor', 'tyBigPunct', { back: false, build: function (ctx, bb0, d) {
    var bb = aty_bbok(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, v = (d.v | 0) % 3, pairs = [['「', '」'], ['『', '』'], ['“', '”']], quote = v === 2;
    var S = jzClamp((bb.y1 - bb.y0) * (quote ? 1.6 : 2.1), Math.min(W, H) * 0.22, Math.min(W, H) * 0.55), gap = S * 0.04;
    var font = jzSerifF(ctx), col = d.accent ? jzMixHex(sc.bg, sc.accent, 0.42) : jzMixHex(sc.bg, sc.fg, 0.2), xl, yt, xr, yb;
    if (!quote) { xl = bb.x0 - gap - 0.2 * S; yt = bb.y0 - gap + 0.4 * S; xr = bb.x1 + gap + 0.2 * S; yb = bb.y1 + gap - 0.4 * S; }
    else { xl = bb.x0 - gap - 0.22 * S; yt = bb.y0 + 0.42 * S; xr = bb.x1 + gap + 0.22 * S; yb = bb.y1 + 0.12 * S; }
    var hd = aty_hd(ctx), sl = jzN(S * 0.25);
    for (var i = 0; i < 2; i++) {
        var L = aty_text(ctx, pairs[v][i], { font: font, size: S, x: i ? xr : xl, y: i ? yb : yt, color: col, name: 'big punct ' + (i + 1) });
        jzSetExpr(jzXf(L, 'ADBE Position'), hd + 'var sl=(1-oc(time/0.7))*' + sl + ';[value[0]' + (i ? '+' : '-') + 'sl,value[1]' + (i ? '+' : '-') + 'sl]');
        aty_op(ctx, L, 'oc(time/0.7)*K');
    }
} });

/* ================================================================ TREATMENTS */
function aty_alive(L, amin) {
    var td; try { td = L.property('ADBE Text Properties').property('ADBE Text Document').value; } catch (e) { return false; }
    if (!td || td.applyFill === false || !jzTrim(String(td.text || '')) || !(td.fontSize > 1)) return false;
    try { if (jzXf(L, 'ADBE Opacity').valueAtTime(0, true) < (amin || 0.9) * 100) return false; } catch (e2) {}
    return true;
}
function aty_tm(ctx, L, o) { return { L: L, ctx: ctx, c: ctx.cut, o: o || {}, size: jzFontSize(L), u: ctx.H / 1080, W: ctx.W, H: ctx.H }; }

/* 一字抜き — the key glyph is set hollow (outline only) among solid glyphs, or the reverse */
jzReg('treat', 'tyHollowKey', {
    plan: function (rng, st) { return { rev: rng.chance(0.35) }; },
    apply: function (ctx, L, P, o) {
        if (!aty_alive(L, 0.5)) return;
        var m = aty_tm(ctx, L, o), G = aty_geo(m), plain = G.plain, flags = [], i, ki = -1;
        if (!plain.length) return;
        if (plain.length === 1) { if (plain[0].ch !== aty_keyChar(ctx.cut.text) || P.rev) return; ki = plain[0].ti; }
        else { var kc = aty_keyChar(jzTrim(String(L.property('ADBE Text Properties').property('ADBE Text Document').value.text))); ki = plain[0].ti; for (i = 0; i < plain.length; i++) if (plain[i].ch === kc) { ki = plain[i].ti; break; } }
        for (i = 0; i < G.N; i++) flags.push(G.g[i].sp ? 0 : ((i === ki) !== !!P.rev ? 1 : 0));
        jzTextDoc(L, function (d) { if (!d.applyStroke) { d.applyStroke = true; d.strokeColor = d.fillColor; d.strokeWidth = 0; } });
        jzAnimator(L, 'JZ Hollow', [['ADBE Text Stroke Width', Math.max(1.5 * m.u, m.size * 0.035)], ['ADBE Text Fill Opacity', 0]], 'var a=' + aty_arr(flags) + ';(a[textIndex-1]||0)*100');
    }
});

/* 天地罫 — a heavy rule above and a hairline below every line (right / left of a vertical column) */
jzReg('treat', 'tyHeadRules', {
    plan: function (rng, st) { return { k: rng.range(0.06, 0.09), acc: rng.chance(0.5) }; },
    apply: function (ctx, L, P, o) {
        if (!aty_alive(L) || jzCount(String(L.property('ADBE Text Properties').property('ADBE Text Document').value.text)) < 2) return;
        var m = aty_tm(ctx, L, o), G = aty_geo(m), s = m.size, V = G.V, col = P.acc ? aty_acc(ctx.sc) : jzTextColor(L), i;
        var dl = (o && o.mi || 0) * (ctx.cut.stagger || 0.04), hd = aty_hd(ctx), S = aty_post(m, 'JZ head rules'), pad = s * 0.12;
        var thick = Math.max(3 * aty_k(ctx), s * (P.k || 0.075)), thin = Math.max(aty_k(ctx), s * 0.018);
        for (var kk = 0; kk < G.ln.length; kk++) {
            var Ln = G.ln[kk]; if (!Ln.n) continue;
            var a0 = Ln.a0 - pad, a1 = Ln.a1 + pad, top = Ln.c + (V ? 1 : -1) * s * 0.66, bot = Ln.c + (V ? -1 : 1) * s * 0.66;
            var q = hd + 'var q=oe((time-' + jzN(dl + 0.05 + kk * 0.08) + ')/0.5),o=ic(PO);';
            var pt = function (u, dd) { return V ? [dd, u] : [u, dd]; };
            aty_grp(S, 'head ' + (kk + 1), [[pt(a0, top), pt(a1, top)]], col, { width: thick, start: q + '100*o', trim: q + '100*Math.max(o,q)' });
            aty_grp(S, 'foot ' + (kk + 1), [[pt(a1, bot), pt(a0, bot)]], col, { width: thin, start: q + '100*o', trim: q + '100*Math.max(o,q)' });
        }
        jzXf(S, 'ADBE Opacity').setValue(100);
        i = 0;
    }
});

/* 頭字強調 — the first glyph of the line is set larger (baseline kept) in the accent colour, the rest make room */
jzReg('treat', 'tyHeadBig', {
    plan: function (rng, st) { return { k: rng.range(1.35, 1.6), acc: rng.chance(0.7) }; },
    apply: function (ctx, L, P, o) {
        if (!aty_alive(L) || jzCount(String(L.property('ADBE Text Properties').property('ADBE Text Document').value.text)) < 2) return;
        var m = aty_tm(ctx, L, o), G = aty_geo(m), g0 = null, i, V = G.V;
        for (i = 0; i < G.N; i++) if (!G.g[i].sp && !jzIsPunct(G.g[i].ch)) { g0 = G.g[i]; break; }
        if (!g0) return;
        var k = P.k || 1.45, extra = (k - 1) * (V ? g0.h : g0.w), td = L.property('ADBE Text Properties').property('ADBE Text Document').value;
        var just = td.justification, center = just !== ParagraphJustification.LEFT_JUSTIFY && just !== ParagraphJustification.RIGHT_JUSTIFY;
        var sh = V ? -extra / 2 : center ? -extra / 2 : just === ParagraphJustification.RIGHT_JUSTIFY ? -extra : 0, off = [], KB = 1;
        for (i = 0; i < G.N; i++) {
            var g = G.g[i], dx = 0, dy = 0;
            if (V || g.li === g0.li) {
                if (i === g0.ti) { if (V) dy = sh + extra / 2; else { dx = sh + extra / 2; dy = -(k - 1) * g.h * 0.36; } }
                else if (i < g0.ti) { if (V) dy = sh; else dx = sh; }
                else { if (V) dy = sh + extra; else dx = sh + extra; }
            }
            off.push([dx, dy]); KB = Math.max(KB, Math.abs(dx), Math.abs(dy));
        }
        jzCharOffsets(L, off, 'JZ Head Room');
        var sc2 = []; for (i = 0; i < G.N; i++) sc2.push(i === g0.ti ? k : 1);
        jzCharScales(L, sc2, 'JZ Head Size');
        var ac = P.acc && jzContrast(ctx.sc.accent, ctx.sc.bg) >= 1.8 ? ctx.sc.accent : null;
        if (ac) jzAnimator(L, 'JZ Head Colour', [['ADBE Text Fill Color', jzHex(ac)]], 'textIndex===' + (g0.ti + 1) + '?100:0');
    }
});

/* 字番号 — a tiny superscript index number beside every glyph */
jzReg('treat', 'tyIndexSup', {
    plan: function (rng, st) { return { acc: rng.chance(0.6) }; },
    apply: function (ctx, L, P, o) {
        if (!aty_alive(L)) return;
        var m = aty_tm(ctx, L, o), G = aty_geo(m), V = G.V, col = P.acc ? aty_acc(ctx.sc) : ctx.sc.sub, base = G.plain.length === 1 ? Math.round(o && o.mi || 0) : 0;
        var fs = Math.max(10 * aty_k(ctx), m.size * 0.26), LD = fs * 1.2, strs = [], off = [], n = base, i;
        for (i = 0; i < G.N; i++) {
            var g = G.g[i]; if (g.sp) continue;
            n++; if (n > 40 + base) break;
            var t = String(n), x = g.x + (V ? g.w * 0.55 : g.w * 0.52), y = g.y + (V ? -g.h * 0.3 : -g.h * 0.42), cs = jzChars(t);
            for (var c2 = 0; c2 < cs.length; c2++) off.push([x, y + ATY_CY * fs - strs.length * LD]);
            strs.push(t);
        }
        if (!strs.length) return;
        var T = jzText(ctx, strs.join('\r'), { font: jzMonoF(ctx), size: fs, color: col, x: 0, y: 0, align: 'left', track: 0, leading: LD, name: 'JZ glyph indices' });
        T.parent = L;
        jzXf(T, 'ADBE Anchor Point').setValue([0, 0]); jzXf(T, 'ADBE Position').setValue([0, 0]); jzXf(T, 'ADBE Scale').setValue([100, 100]); jzXf(T, 'ADBE Rotate Z').setValue(0);
        jzCharOffsets(T, off, 'JZ Place');
        var dl = (o && o.mi || 0) * (ctx.cut.stagger || 0.04);
        jzSetExpr(jzXf(T, 'ADBE Opacity'), aty_hd(ctx) + 'var p=thisLayer.parent;(p?p.transform.opacity:100)*cl((time-' + jzN(dl + 0.15) + ')/0.3)*(1-ic(PO))');
        jzNoGhost(T);
    }
});

/* ================================================================ TRANSITIONS */
function aty_tacc(t) {
    var sc = t.sc, pb = (t.scPrev || sc).bg, l = [sc.accent, sc.accent2, sc.fg];
    for (var i = 0; i < l.length; i++) if (l[i] && jzContrast(l[i], sc.bg) >= 1.8 && jzContrast(l[i], pb) >= 1.4) return l[i];
    return sc.fg;
}
// the old cut on top for the transition only, cut away by an inverted alpha matte M (built by the caller, groups = revealed parts)
function aty_tcopy(t, name) { var C = t.A.duplicate(); C.name = name; C.moveBefore(t.B); C.inPoint = t.t0; C.outPoint = t.t0 + t.dur; return C; }
function aty_tmatte(M, C) { M.moveBefore(C); C.trackMatteType = TrackMatteType.ALPHA_INVERTED; M.enabled = false; }
function aty_ths(t) { return 'var T0=' + jzN(t.t0) + ',TD=' + jzN(Math.max(1 / 240, t.dur)) + ';' + ATY_FNS + 'var p=cl((time-T0)/TD);'; }

/* 罫線ワイプ — the frame is ruled into text lines; each line is "typed" across, a cursor bar leading it */
jzReg('trans', 'tyRuleWipe', {
    plan: function (rng, st) { return { n: rng.int(7, 12), rtl: rng.chance(0.25) }; },
    build: function (t) {
        var W = t.W, H = t.H, n = Math.max(2, Math.round(t.P.n || 9)), rtl = !!t.P.rtl, bh = H / n, ac = aty_tacc(t), lw = Math.max(1, Math.min(W, H) * 0.0015), st = 0.5 / n, i;
        var HS = aty_ths(t), C = aty_tcopy(t, 'JZ Trans rule wipe (prev cut)');
        var M = jzEvShape(t.comp, 'JZ Trans rule wipe matte', t.t0, t.dur), Ln = jzEvShape(t.comp, 'JZ Trans rule wipe lines', t.t0, t.dur), cw = Math.max(3, bh * 0.14);
        for (i = 0; i < n; i++) {
            var y0 = Math.round(i * bh), y1 = Math.round((i + 1) * bh), Q = HS + 'var q=ioc(cl((p-' + jzN(i * st) + ')/' + jzN(1 - (n - 1) * st) + '));', px = rtl ? W : 0;
            aty_rectGrp(M, 'band ' + (i + 1), 0, y0, W, y1 - y0 + 1, '#FFFFFF', { piv: [px, y0], gsc: Q + '[100*q,100]' });
            aty_rectGrp(Ln, 'cursor ' + (i + 1), rtl ? -cw : 0, y0 + bh * 0.2, cw, bh * 0.6, ac, { gpos: Q + '[' + (rtl ? jzN(W) + '*(1-q)' : jzN(W) + '*q') + ',0]', gop: Q + '(q>0&&q<1)?100:0' });
        }
        var rules = []; for (i = 1; i < n; i++) rules.push([[0, Math.round(i * bh)], [W, Math.round(i * bh)]]);
        aty_grp(Ln, 'rules', rules, ac, { width: lw, gop: HS + '60*Math.sin(Math.PI*p)' });
        aty_tmatte(M, C);
    }
});

/* 升目送り — a manuscript grid; the new cut fills in cell by cell in reading order (vertical: columns right to left) */
jzReg('trans', 'tyGridCells', {
    plan: function (rng, st) { return { rows: rng.int(4, 6), tate: rng.chance(0.7) }; },
    build: function (t) {
        var W = t.W, H = t.H, rows = Math.max(2, Math.round(t.P.rows || 5)), tate = !!t.P.tate, cell = H / rows, cols = Math.ceil(W / cell), ox = (W - cols * cell) / 2;
        var N = rows * cols, ac = aty_tacc(t), lw = Math.max(1, Math.min(W, H) * 0.0016), j, c, r, X = [], Y = [];
        var HS = aty_ths(t) + 'var kk=ioc(cl(p/0.92))*' + N + ',fk=Math.floor(kk);';
        var C = aty_tcopy(t, 'JZ Trans grid cells (prev cut)'), M = jzEvShape(t.comp, 'JZ Trans grid cells matte', t.t0, t.dur);
        for (j = 0; j < N; j++) {
            if (tate) { c = cols - 1 - Math.floor(j / rows); r = j % rows; } else { r = Math.floor(j / cols); c = j % cols; }
            var x = ox + c * cell, y = r * cell; X.push(x + cell / 2); Y.push(y + cell / 2);
            aty_rectGrp(M, 'cell ' + (j + 1), x, y, cell + 1, cell + 1, '#FFFFFF', { gop: HS + (j + '<fk?100:(' + j + '===fk?(kk-fk)*100:0)') });
        }
        var G = jzEvShape(t.comp, 'JZ Trans grid lines', t.t0, t.dur), segs = [];
        for (c = 0; c <= cols; c++) segs.push([[Math.round(ox + c * cell), 0], [Math.round(ox + c * cell), H]]);
        for (r = 1; r < rows; r++) segs.push([[0, Math.round(r * cell)], [W, Math.round(r * cell)]]);
        aty_grp(G, 'grid', segs, ac, { width: lw, gop: HS + '50*Math.sin(Math.PI*p)' });
        var gc = jzGrp(G, 'current');
        jzAddRect(gc, cell - lw * 3, cell - lw * 3, 0, 0, 0); jzAddStroke(gc, ac, lw * 3);
        gc = G.property('ADBE Root Vectors Group').property('current');
        jzSetExpr(jzGX(gc).property('ADBE Vector Position'), HS + 'var X=' + aty_arr(X) + ',Y=' + aty_arr(Y) + ',q=Math.min(fk,' + (N - 1) + ');[X[q],Y[q]]');
        jzSetExpr(jzGX(gc).property('ADBE Vector Group Opacity'), HS + '(p>0&&fk<' + N + ')?100:0');
        aty_tmatte(M, C);
    }
});
