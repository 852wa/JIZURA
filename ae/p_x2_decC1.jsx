// ================================================================ 追加分2 decor C part 1 (AE port of src/11p_x2_decC.js, pack x2decC)
// Typographic / infographic / interface decor: small text, numbers and widgets around the lyric.
// Part 1: shared helpers (prefix axn_) + typed text lines, readouts and charts (xnPrompt … xnAxes); part 2 = p_x2_decC2.jsx.
// decor.build(ctx, bb, d): layers live in the CONTENT comp (time 0 = cut start). The browser draws every entry of this pack on
// the main pass only, so all layers are kept out of the tinted ghosts (jzNoGhost, done once in axn_reg).
// Per part: ONE shape layer for the widgets (groups with Trim Paths / group-transform expressions) under a few small text layers.
// Running readouts (typed text, counters, time codes) are expression-driven Source Text.
// The browser's local time is t = lt - 0.04 and everything fades with the cut's exit: expressions use t and K (see axn_H).
// 飾りの数字・時刻を出さない: the hide switches are read from the plan's fx (hideNo / hideTime), like env.fx in the browser.

// ---------------------------------------------------------------- shared helpers
// the browser's deterministic hash J.h / J.r / J.rs / J.noise1 (so seeded values match the web frame)
function axn_h(a, b, c, d, e) {
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
function axn_r(a, b, c, d, e) { return axn_h(a, b, c, d, e) / 4294967296; }
function axn_rs(a, b, c, d, e) { return axn_r(a, b, c, d, e) * 2 - 1; }
function axn_noise1(x, seed) { var i = Math.floor(x), f = x - i, w = f * f * (3 - 2 * f); return jzLerp(axn_rs(seed, i), axn_rs(seed, i + 1), w); }
var AXN_D = Math.PI / 180;
function axn_u(ctx) { return jzU(ctx) / 1080; }                       // browser U(env): 1 at a 1080 short side
function axn_mg(ctx) { return jzU(ctx) * 0.05; }                      // safe margin
function axn_fs(ctx) { return Math.max(12, 17 * axn_u(ctx)); }       // small text size
function axn_vis(sc, c, mn) { return (c && jzContrast(c, sc.bg) >= (mn || 1.6)) ? c : sc.fg; }
function axn_acc(sc) { return axn_vis(sc, sc.accent); }
function axn_acc2(sc) { return axn_vis(sc, sc.accent2 || sc.accent); }
function axn_sub(sc) { return axn_vis(sc, sc.sub, 1.8); }
function axn_on(sc, c) { return jzContrast(sc.bg, c) >= 3 ? sc.bg : (jzLum(c) > 0.5 ? '#000000' : '#ffffff'); }
function axn_fxOf(ctx) { return (ctx.plan && ctx.plan.fx) || ctx.fx || {}; }
function axn_noNo(ctx) { return !!axn_fxOf(ctx).hideNo; }
function axn_noTime(ctx) { return !!axn_fxOf(ctx).hideTime; }
// the browser's J.decoTextKind / J.hideDecoText: every drawn decor text that is only a number or a time is dropped as well
// (unless it is part of the lyric), on top of the explicit num / time flags
function axn_decoKind(t) {
    t = jzTrim(String(t || ''));
    if (!t || !/\d/.test(t) || /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af]/.test(t)) return null;
    if (/\d{1,2}[:\uFF1A]\d{2}/.test(t) && /^[A-Za-z]{0,4}[\s.#]*[\d:\uFF1A.;'"\s\/\-\u2013\u2014+]+[A-Za-z]{0,3}$/.test(t)) return 'time';
    var m = t.match(/[A-Za-z]/g);
    if ((m ? m.length : 0) <= 5 && /^[A-Za-z#\u2116.\s\d\/\-\u2013\u2014+\u00D7x%:,'\u00B0]+$/.test(t)) return 'no';
    return null;
}
function axn_hideDeco(ctx, text) {
    var nn = axn_noNo(ctx), nt = axn_noTime(ctx), k;
    if (!nn && !nt) return false;
    k = axn_decoKind(text);
    if (!k || !(k === 'no' ? nn : nt)) return false;
    return String((ctx.cut && (ctx.cut.lineText || ctx.cut.text)) || '').indexOf(jzTrim(String(text))) < 0;
}
function axn_bw(bb) { return bb.x1 - bb.x0; }
function axn_bh(bb) { return bb.y1 - bb.y0; }
function axn_hit(x0, y0, x1, y1, bb, pad) { pad = pad || 0; return !(x1 < bb.x0 - pad || x0 > bb.x1 + pad || y1 < bb.y0 - pad || y0 > bb.y1 + pad); }
function axn_pad(n, k) { return jzPad(Math.max(0, Math.floor(n)), k || 2); }
function axn_glyphs(s) { var a = jzChars(s == null ? '' : s), o = [], i; for (i = 0; i < a.length; i++) if (jzTrim(a[i])) o.push(a[i]); return o; }
function axn_flat(s) { return jzTrim(String(s || '').replace(/\s+/g, ' ')); }
function axn_clip(s, n) { var a = jzChars(axn_flat(s)); return a.length > n ? a.slice(0, Math.max(1, n - 1)).join('') + '…' : a.join(''); }
function axn_cutText(ctx) { return axn_flat(ctx.cut && ctx.cut.text); }
function axn_lineText(ctx) { return axn_flat(ctx.cut && (ctx.cut.lineText || ctx.cut.text)); }
function axn_hasCJK(s) { return /[\u3040-\u30FF\u3400-\u9FFF]/.test(s); }
function axn_nopunct(s) { return axn_flat(String(s).replace(/[、。！？!?,.・「」]/g, ' ')); }
// string / colour as expression literals
function axn_q(s) { return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ') + '"'; }
function axn_cx(hex) { var c = jzHex(hex); return '[' + jzN(c[0]) + ',' + jzN(c[1]) + ',' + jzN(c[2]) + ',1]'; }
// lyric bbox clamped to the frame, like the browser's getBB
function axn_bb(ctx, bb) {
    var b = { x0: Math.max(bb.x0, 0), x1: Math.min(bb.x1, ctx.W), y0: Math.max(bb.y0, 0), y1: Math.min(bb.y1, ctx.H) };
    if (b.x1 <= b.x0) { b.x0 = bb.x0; b.x1 = bb.x1; }
    if (b.y1 <= b.y0) { b.y0 = bb.y0; b.y1 = bb.y1; }
    return b;
}
// a free w×h box near the lyric or in a screen corner -> { x, y, ok } (top-left)
function axn_spot(ctx, bb, w, h, p, gap) {
    var W = ctx.W, H = ctx.H, m = axn_mg(ctx) * 0.8, sx = p.right ? 1 : -1, sy = p.low ? 1 : -1;
    var ord = [[sx, sy], [-sx, sy], [sx, -sy], [-sx, -sy]], near = [], cor = [], i, a, b, x, y;
    for (i = 0; i < 4; i++) {
        a = ord[i][0]; b = ord[i][1];
        near.push([a > 0 ? bb.x1 - w : bb.x0, b > 0 ? bb.y1 + gap : bb.y0 - gap - h]);
        near.push([a > 0 ? bb.x1 + gap : bb.x0 - gap - w, (bb.y0 + bb.y1) / 2 - h / 2]);
        cor.push([a > 0 ? W - m - w : m, b > 0 ? H - m - h : m]);
    }
    var all = p.corner ? cor.concat(near) : near.concat(cor);
    for (i = 0; i < all.length; i++) {
        x = all[i][0]; y = all[i][1];
        if (x < m - 1 || y < m - 1 || x + w > W - m + 1 || y + h > H - m + 1) continue;
        if (!axn_hit(x, y, x + w, y + h, bb, gap * 0.4)) return { x: x, y: y, ok: true };
    }
    return { x: jzClamp(cor[0][0], 0, Math.max(0, W - w)), y: jzClamp(cor[0][1], 0, Math.max(0, H - h)), ok: false };
}
// a w×h block centred in the free band under (or over) the lyric; falls back to axn_spot
function axn_band(ctx, bb, w, h, p, gap) {
    var W = ctx.W, H = ctx.H, m = axn_mg(ctx) * 0.8, order = p.low ? [true, false] : [false, true], i, y;
    for (i = 0; i < 2; i++) {
        y = order[i] ? bb.y1 + gap : bb.y0 - gap - h;
        if (y < m || y + h > H - m || w > W - 2 * m) continue;
        return { x: jzClamp((bb.x0 + bb.x1) / 2 - w / 2, m, W - m - w), y: y, ok: true, below: order[i] };
    }
    return axn_spot(ctx, bb, w, h, p, gap);
}
// measured width of a small text (a probe layer, removed again; cached per content comp)
function axn_tw(ctx, text, size, f, tr) {
    text = String(text == null ? '' : text);
    if (text === '') return 0;
    f = f || jzMonoF(ctx); tr = tr == null ? 0.06 : tr;
    var cache = ctx.axnW || (ctx.axnW = {}), key = f + '|' + jzN(size) + '|' + jzN(tr) + '|' + text;
    if (cache.hasOwnProperty(key)) return cache[key];
    var L = jzText(ctx, text, { font: f, size: size, track: tr, x: 0, y: 0, align: 'left', color: '#ffffff', name: 'probe' });
    var w = jzRect(L).width;
    try { L.remove(); } catch (e) {}
    cache[key] = w;
    return w;
}
// advance of one monospaced character at tracking 0 (side bearings cancel out)
function axn_adv(ctx, size, f) { return Math.max(1, (axn_tw(ctx, '000000000000', size, f, 0) - axn_tw(ctx, '00', size, f, 0)) / 10); }
// x of the end of every prefix of a string (0..n): a proportional estimate scaled to the measured width (for carets)
function axn_cum(cs, total) {
    var ws = [], sum = 0, out = [0], acc = 0, i, c;
    for (i = 0; i < cs.length; i++) { c = cs[i].charCodeAt(0); ws.push(c > 0x2000 ? 1 : (cs[i] === ' ' ? 0.3 : 0.56)); sum += ws[i]; }
    for (i = 0; i < cs.length; i++) { acc += ws[i]; out.push(total * acc / Math.max(0.001, sum)); }
    return out;
}
// ---- expressions: jzTH (DUR IN OS OD SD, easings cl oe oc ic ob …, PO, K) + ioc / pd + t (browser local time), V (started)
var AXN_FNS = 'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}function pd(n,k){var s=String(Math.max(0,Math.floor(n)));while(s.length<k)s="0"+s;return s;}\n';
function axn_H(ctx) { return jzTH(ctx) + AXN_FNS + 'var t=time-0.04,V=t>0?1:0;\n'; }
// ease(clamp((t - delay) / d)) as expression source: the browser's ein(t, d, delay, ease)
function axn_e(d, dl, fn, s) { return (fn || 'oe') + '((t-' + jzN(dl || 0) + ')/' + jzN(d) + (s != null ? ',' + jzN(s) : '') + ')'; }
// layer opacity = value × started × exit fade × extra factor
function axn_op(ctx, L, ex, pre) { jzSetExpr(jzXf(L, 'ADBE Opacity'), axn_H(ctx) + (pre || '') + 'value*V*K' + (ex ? '*cl(' + ex + ')' : '')); }
// layer pivot (anchor = position) and expressions on the layer's scale (factor) / position (px offset)
function axn_pivot(L, ax, ay) { jzXf(L, 'ADBE Anchor Point').setValue([ax, ay]); jzXf(L, 'ADBE Position').setValue([ax, ay]); }
function axn_lx(ctx, L, scEx, posEx, pre) {
    var H = axn_H(ctx) + (pre || '');
    if (scEx) jzSetExpr(jzXf(L, 'ADBE Scale'), H + 'var s=' + scEx + ';[value[0]*s,value[1]*s]');
    if (posEx) jzSetExpr(jzXf(L, 'ADBE Position'), H + 'var d=' + posEx + ';[value[0]+d[0],value[1]+d[1]]');
}
// small secondary text. o: { a, c, al, f, tr, leading, name, num, time (obey the hide switches), pre (statements),
//   e (opacity factor), src (Source Text), posEx ([dx,dy] px), scEx (factor), colEx (condition) + col2 (its colour) }
function axn_T(ctx, text, x, y, size, o) {
    o = o || {};
    if (text === '' || text == null) return null;
    if ((o.num && axn_noNo(ctx)) || (o.time && axn_noTime(ctx)) || axn_hideDeco(ctx, text)) return null;
    var L = jzText(ctx, String(text), { font: o.f || jzMonoF(ctx), size: size, color: o.c || axn_sub(ctx.sc), x: x, y: y, align: o.al || 'left',
        track: o.tr == null ? 0.06 : o.tr, opacity: o.a == null ? 1 : Math.min(1, o.a), name: o.name, leading: o.leading });
    var H = axn_H(ctx) + (o.pre || '');
    if (o.src) { try { L.property('ADBE Text Properties').property('ADBE Text Document').expression = H + o.src; } catch (e) { jzWarn('axn source text: ' + e.toString()); } }
    if (o.colEx) jzAnimator(L, 'JZ Colour', [['ADBE Text Fill Color', jzHex(o.col2)]], H + '(' + o.colEx + ')?100:0');
    axn_lx(ctx, L, o.scEx, o.posEx, o.pre);
    axn_op(ctx, L, o.e, o.pre);
    return L;
}
// ---- widgets: a display list drawn into one shape layer (comp px). Items are listed in the browser's draw order and
// emitted last-first (the first group of a shape layer is the top one). Every group is finished before the next is added
// (adding a sibling invalidates references to the earlier ones).
// item: { shapes: [{k:'p',pts,closed} | {k:'r',x,y,w,h,r,gx,gc,gy} | {k:'e',x,y,rx,ry}] or sub: [items],
//   stroke, lw, cap, join, dash:[on,off], strokeEx, fill, fillEx, trimE, trimS (0..1), a (0..1), pre (statements),
//   at:[x,y] (group position), pivot:[x,y] (anchor = position), rot (deg), posEx ([dx,dy]), scEx ([sx,sy] factors), rotEx (deg), opEx }
function axn_S(ctx, name, A) {
    var L = jzShapeLayer(ctx, name, 0, 0);
    if (A != null && A < 1) jzXf(L, 'ADBE Opacity').setValue(A * 100);
    return { ctx: ctx, L: L, items: [] };
}
function axn_add(S, it, o) { if (o) for (var k in o) if (o.hasOwnProperty(k)) it[k] = o[k]; S.items.push(it); return it; }
function axn_dash(s, on, off) {
    var D = s.property('ADBE Vector Stroke Dashes'), mn = ['ADBE Vector Stroke Dash 1', 'ADBE Vector Stroke Gap 1'], v = [Math.max(0.1, on), Math.max(0.1, off)], i, p;
    for (i = 0; i < 2; i++) {
        p = null;
        try { p = D.addProperty(mn[i]); } catch (e) { p = null; }
        if (!p) { try { p = D.property(mn[i]); } catch (e1) { p = null; } }
        try { if (p) p.setValue(v[i]); } catch (e2) {}
    }
}
function axn_emit(ctx, vecs, it) {
    var g = vecs.addProperty('ADBE Vector Group'), H = axn_H(ctx) + (it.pre || ''), i, p, q, sp = it.shapes || [];
    if (it.name) g.name = it.name;
    if (it.sub) for (i = it.sub.length - 1; i >= 0; i--) axn_emit(ctx, jzVecs(g), it.sub[i]);
    for (i = 0; i < sp.length; i++) {
        q = sp[i];
        if (q.k === 'p') jzAddPath(g, q.pts, !!q.closed);
        else if (q.k === 'e') jzAddEllipse(g, q.rx * 2, q.ry * 2, q.x, q.y);
        else {
            p = jzAddRect(g, q.w, q.h, q.r || 0, q.x + q.w / 2, q.y + q.h / 2);
            if (q.gx) {          // width factor: grows from the left edge (gc: from the centre)
                jzSetExpr(p.property('ADBE Vector Rect Size'), H + 'var f=cl(' + q.gx + '/2)*2;[Math.max(0.01,value[0]*f),value[1]]');
                if (!q.gc) jzSetExpr(p.property('ADBE Vector Rect Position'), H + 'var f=cl(' + q.gx + '/2)*2;[value[0]-' + jzN(q.w / 2) + '*(1-f),value[1]]');
            } else if (q.gy) {   // height factor: grows down from the top edge
                jzSetExpr(p.property('ADBE Vector Rect Size'), H + 'var f=cl(' + q.gy + ');[value[0],Math.max(0.01,value[1]*f)]');
                jzSetExpr(p.property('ADBE Vector Rect Position'), H + 'var f=cl(' + q.gy + ');[value[0],value[1]-' + jzN(q.h / 2) + '*(1-f)]');
            }
        }
    }
    if (it.trimE != null || it.trimS != null) {
        p = jzVecs(g).addProperty('ADBE Vector Filter - Trim');
        if (it.trimE != null) jzSetExpr(p.property('ADBE Vector Trim End'), H + '100*cl(' + it.trimE + ')');
        if (it.trimS != null) jzSetExpr(p.property('ADBE Vector Trim Start'), H + '100*cl(' + it.trimS + ')');
    }
    if (it.stroke) {
        p = jzAddStroke(g, it.stroke, it.lw || 2);
        try { if (it.cap) p.property('ADBE Vector Stroke Line Cap').setValue(it.cap); if (it.join) p.property('ADBE Vector Stroke Line Join').setValue(it.join); } catch (e) {}
        if (it.strokeEx) jzSetExpr(p.property('ADBE Vector Stroke Color'), H + it.strokeEx);
        if (it.dash) axn_dash(p, it.dash[0], it.dash[1]);
    }
    if (it.fill) {
        p = jzAddFill(g, it.fill);
        if (it.fillEx) jzSetExpr(p.property('ADBE Vector Fill Color'), H + it.fillEx);
    }
    var X = jzGX(g);
    if (it.pivot) { X.property('ADBE Vector Anchor').setValue(it.pivot); X.property('ADBE Vector Position').setValue(it.pivot); }
    if (it.at) X.property('ADBE Vector Position').setValue(it.at);
    if (it.rot) X.property('ADBE Vector Rotation').setValue(it.rot);
    if (it.a != null && it.a < 1) X.property('ADBE Vector Group Opacity').setValue(Math.max(0, it.a) * 100);
    if (it.posEx) jzSetExpr(X.property('ADBE Vector Position'), H + 'var d=' + it.posEx + ';[value[0]+d[0],value[1]+d[1]]');
    if (it.scEx) jzSetExpr(X.property('ADBE Vector Scale'), H + 'var s=' + it.scEx + ';[value[0]*s[0],value[1]*s[1]]');
    if (it.rotEx) jzSetExpr(X.property('ADBE Vector Rotation'), H + it.rotEx);
    if (it.opEx) jzSetExpr(X.property('ADBE Vector Group Opacity'), H + 'value*cl(' + it.opEx + ')');
}
function axn_done(S) {
    if (!S.items.length) { try { S.L.remove(); } catch (e) {} return null; }
    for (var i = S.items.length - 1; i >= 0; i--) axn_emit(S.ctx, S.L.property('ADBE Root Vectors Group'), S.items[i]);
    axn_op(S.ctx, S.L);
    return S.L;
}
// the browser's drawing helpers as display-list items (cap: 1 butt 2 round; join: 1 miter 2 round)
function axn_seg(S, list, c, lw, a, o) {          // separate straight lines [[x0,y0,x1,y1], …], butt caps
    var sh = [], i; for (i = 0; i < list.length; i++) sh.push({ k: 'p', pts: [[list[i][0], list[i][1]], [list[i][2], list[i][3]]] });
    return axn_add(S, { shapes: sh, stroke: c, lw: lw, a: a, cap: 1 }, o);
}
function axn_line(S, pts, c, lw, a, o) { return axn_add(S, { shapes: [{ k: 'p', pts: pts }], stroke: c, lw: lw, a: a, cap: 2, join: 2 }, o); }   // polyline, round
function axn_poly(S, pts, c, a, o) { return axn_add(S, { shapes: [{ k: 'p', pts: pts, closed: true }], fill: c, a: a }, o); }
function axn_rr(S, x, y, w, h, r, fill, a, strokeC, lw, o) {      // (rounded) rect: fill and / or stroke; o.gx / o.gc / o.gy go to the rect
    var q = { k: 'r', x: x, y: y, w: Math.max(0.01, w), h: Math.max(0.01, h), r: r || 0 }, it = { shapes: [q], a: a }, k;
    if (fill) it.fill = fill;
    if (strokeC && lw > 0) { it.stroke = strokeC; it.lw = lw; }
    if (o) for (k in o) if (o.hasOwnProperty(k)) { if (k === 'gx' || k === 'gc' || k === 'gy') q[k] = o[k]; else it[k] = o[k]; }
    S.items.push(it); return it;
}
function axn_box(S, x, y, w, h, c, a, o) { return axn_rr(S, x, y, w, h, 0, c, a, null, 0, o); }
function axn_dot(S, x, y, r, c, a, o) { return axn_add(S, { shapes: [{ k: 'e', x: x, y: y, rx: r, ry: r }], fill: c, a: a }, o); }
function axn_ring(S, x, y, r, c, lw, a, o) { return axn_add(S, { shapes: [{ k: 'e', x: x, y: y, rx: r, ry: r }], stroke: c, lw: lw, a: a, cap: 1 }, o); }
// register an entry: normalised params (like the browser's wrapper), front layer, main pass only
function axn_reg(k, fn) {
    jzReg('decor', k, { back: false, build: function (ctx, bb, d) {
        var n0 = ctx.comp.numLayers, i;
        var p = { n: jzClamp((d.n == null ? 1 : d.n) | 0, 1, 3), v: Math.abs(d.v | 0), r: d.r == null ? 0.5 : d.r, seed: d.seed == null ? 1 : d.seed,
            right: !!d.right, low: !!d.low, accent: !!d.accent, corner: !!d.corner, big: !!d.big };
        fn(ctx, axn_bb(ctx, bb || { x0: ctx.W * 0.35, x1: ctx.W * 0.65, y0: ctx.H * 0.4, y1: ctx.H * 0.6 }), p, axn_u(ctx));
        var added = ctx.comp.numLayers - n0;
        for (i = 1; i <= added; i++) jzNoGhost(ctx.comp.layer(i));
    } });
}

// ================================================================ typed / text lines

/* ---- xnPrompt — 入力行: a shell prompt that types the cut as a command, answers, and leaves a blinking block cursor */
axn_reg('xnPrompt', function (ctx, bb, p, u) {
    var sc = ctx.sc, fs = axn_fs(ctx), mf = jzMonoF(ctx), bf = jzBodyF(ctx), pre = ['$ say', '> print', '>>> sing', '# echo'][p.v % 4];
    var ct = axn_cutText(ctx), body = '"' + axn_clip(ct, 14) + '"', twp = axn_tw(ctx, pre, fs, mf), wp = twp + fs * 0.6, wb = axn_tw(ctx, body, fs, bf);
    var w = wp + wb + fs * 0.9, lh = fs * 1.55, h = lh * 3, sp = axn_spot(ctx, bb, w, h, p, 22 * u), A = sp.ok ? 1 : 0.3;
    var np = jzChars(pre).length, cb = jzChars(body), nT = np + cb.length, dT = Math.min(0.75, nT * 0.045), tD = 0.12 + dT + 0.18, y1 = sp.y + lh * 0.5;
    var KX = 'var k=Math.floor(' + nT + '*cl((t-0.12)/' + jzN(dT) + ')+1e-6),kb=Math.max(0,k-' + np + ');', cum = axn_cum(cb, wb), xs = [], i;
    for (i = 0; i <= np; i++) xs.push(twp * i / np);
    for (i = 1; i <= cb.length; i++) xs.push(wp + cum[i]);
    var pre0 = pre.split(' ')[0], n = axn_glyphs(ct).length, e2 = axn_e(0.25, tD);
    var S = axn_S(ctx, 'prompt cursor', A * 0.85);
    axn_box(S, sp.x + fs * 0.15, y1 - fs * 0.55, fs * 0.55, fs * 1.1, sc.fg, 1, { pre: KX, posEx: '[' + jzArrExpr(xs) + '[k],0]', opEx: '(t>' + jzN(tD) + '?0:1)*oe(t/0.25)' });
    axn_box(S, sp.x + axn_tw(ctx, pre0, fs, mf) + fs * 0.5, y1 + lh * 2 - fs * 0.55, fs * 0.55, fs * 1.1, sc.fg, 1, { opEx: '(Math.floor(time*2.6)%2===0?1:0)*' + e2 });
    axn_done(S);
    axn_T(ctx, pre, sp.x, y1, fs, { c: axn_acc(sc), a: A, e: 'oe(t/0.25)', pre: KX, src: axn_q(pre) + '.substr(0,k)' });
    axn_T(ctx, body, sp.x + wp, y1, fs, { f: bf, c: sc.fg, a: A * 0.9, pre: KX, src: axn_q(body) + '.substr(0,kb)' });
    axn_T(ctx, axn_noNo(ctx) ? '[ok]' : '[ok] ' + n + ' glyph' + (n === 1 ? '' : 's') + ' out', sp.x, y1 + lh, fs * 0.92, { a: A, e: e2 });
    axn_T(ctx, pre0, sp.x, y1 + lh * 2, fs, { c: axn_acc(sc), a: A, e: e2 });
});

/* ---- xnMicroPara — 小さな段落: the lyric line repeated as a tiny set paragraph with a pilcrow and a side rule, revealed line by line */
axn_reg('xnMicroPara', function (ctx, bb, p, u) {
    var sc = ctx.sc, lt = axn_lineText(ctx), src = axn_glyphs(lt).length ? lt : 'lyric', cj = axn_hasCJK(src);
    var fs = axn_fs(ctx) * 0.82, f = jzBodyF(ctx), per = cj ? 12 : 24, nL = 3 + p.n, lh = fs * 1.6, unit = jzChars(src + (cj ? '／' : ' / ')), lines = [], i, j, s, w = 0, e;
    for (i = 0; i < nL; i++) { s = ''; for (j = 0; j < per; j++) s += unit[(i * per + j) % unit.length]; lines.push(jzTrim(s)); }
    for (i = 0; i < nL; i++) w = Math.max(w, axn_tw(ctx, lines[i], fs, f, 0.04));
    var ind = fs * 1.5, W2 = w + ind, h = nL * lh, sp = axn_spot(ctx, bb, W2, h, p, 24 * u), A = sp.ok ? 1 : 0.3, rt = p.right, rx = rt ? sp.x + W2 : sp.x;
    var S = axn_S(ctx, 'paragraph rule', A * 0.9);
    axn_seg(S, [[rx, sp.y, rx, sp.y + h]], p.accent ? axn_acc(sc) : axn_sub(sc), Math.max(1, 1.5 * u), 1, { trimE: 'oe(t/0.5)' });
    axn_done(S);
    axn_T(ctx, '¶', rt ? sp.x + W2 - ind * 0.45 : sp.x + ind * 0.45, sp.y + lh * 0.5, fs * 1.15, { c: axn_acc(sc), a: A, al: 'center', f: f, e: axn_e(0.3, 0.1) });
    for (i = 0; i < nL; i++) {
        e = axn_e(0.4, 0.08 + i * 0.07, 'oc');
        axn_T(ctx, lines[i], rt ? sp.x + w : sp.x + ind, sp.y + lh * (i + 0.5), fs, { f: f, tr: 0.04, a: A * (i === 0 ? 0.95 : 0.6), c: i === 0 ? sc.fg : axn_sub(sc),
            al: rt ? 'right' : 'left', e: e, posEx: '[' + jzN((rt ? -10 : 10) * u) + '*(1-' + e + '),0]' });
    }
});

/* ---- xnFootnote — 脚注: a reference mark beside the lyric and its footnote (short rule + note line) at the foot of the screen */
axn_reg('xnFootnote', function (ctx, bb, p, u) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, m = axn_mg(ctx), fs = axn_fs(ctx), mk = ['*', '†', '※', '‡'][p.v % 4], f = jzBodyF(ctx), ac = axn_acc(sc);
    // the mark: just outside the lyric's top-right corner
    var ms = fs * 1.7, mx = bb.x1 + ms * 0.55, my = bb.y0 + ms * 0.1;
    if (mx > W - m * 0.5) { mx = jzClamp((bb.x0 + bb.x1) / 2, m, W - m); my = bb.y0 - ms * 0.7; }
    if (my > m * 0.4) axn_T(ctx, mk, mx, my, ms, { f: f, c: ac, al: 'center', tr: 0, scEx: 'ob((t-0.1)/0.35,1.8)', name: 'footnote mark' });
    // the note
    var ct = axn_cutText(ctx), rj = jzRomaji(axn_nopunct(ct)), lt2 = axn_lineText(ctx);
    var note = c.note ? String(c.note) : (lt2 && lt2 !== ct ? lt2 : (rj ? rj : lt2));
    var txt = axn_clip(note, axn_hasCJK(note) ? 26 : 44), nw = axn_tw(ctx, txt, fs * 0.9, f, 0.05) + fs * 1.4, h = fs * 2.3;
    var below = !(H - bb.y1 < h + m + 16 * u);
    if (!below && bb.y0 < h + m + 16 * u) below = H - bb.y1 > bb.y0;
    var y0 = below ? H - m - h : m, A = (axn_hit(0, y0, W, y0 + h, bb, 4 * u) && (bb.x0 < m + nw && bb.x1 > m)) ? 0.3 : 1;
    var x0 = p.right ? W - m - nw : m, e1 = axn_e(0.45, 0.25), n = jzChars(txt).length;
    var S = axn_S(ctx, 'footnote rule', A * 0.8);
    axn_seg(S, [[x0, y0, x0 + Math.min(nw, 150 * u), y0]], axn_sub(sc), Math.max(1, u), 1, { trimE: e1 });
    axn_done(S);
    axn_T(ctx, mk, x0, y0 + fs * 1.25, fs * 1.05, { f: f, c: ac, a: A, tr: 0, e: e1 });
    axn_T(ctx, txt, x0 + fs * 1.3, y0 + fs * 1.3, fs * 0.9, { f: f, tr: 0.05, a: A * 0.85, src: axn_q(txt) + '.substr(0,Math.ceil(' + n + '*cl((t-0.35)/' + jzN(Math.min(0.7, Math.max(1, n) * 0.03)) + ')))' });
});

/* ---- xnDiff — 差分表示: a two-line diff: the old wording struck out, the new one added on a tinted row */
axn_reg('xnDiff', function (ctx, bb, p, u) {
    var sc = ctx.sc, fs = axn_fs(ctx), bf = jzBodyF(ctx), lh = fs * 1.7, ac = axn_acc(sc), ct = axn_cutText(ctx), g = jzChars(ct), neu = axn_clip(ct, 14);
    var old = g.length > 2 ? axn_clip(g.slice(0, Math.max(1, g.length - 1 - (p.v % 2))).join(''), 12) + (axn_hasCJK(neu) ? '？' : '?') : '……';
    var ln = (ctx.cut.line | 0) + 1, gut = axn_noNo(ctx) ? 0 : fs * 2.1, sg = fs * 1.2, ow = axn_tw(ctx, old, fs, bf), n = jzChars(neu).length;
    var w = gut + sg + Math.max(axn_tw(ctx, neu, fs, bf), ow) + fs * 0.8, h = lh * 2 + fs * 1.3, sp = axn_spot(ctx, bb, w, h, p, 22 * u), A = sp.ok ? 1 : 0.3;
    var y1 = sp.y + fs * 1.3 + lh * 0.5, y2 = y1 + lh, e1 = axn_e(0.35, 0.08), e2 = axn_e(0.4, 0.32);
    var S = axn_S(ctx, 'diff row', A * 0.16);
    axn_box(S, sp.x + gut - fs * 0.3, y2 - lh * 0.46, w - gut + fs * 0.3, lh * 0.92, ac, 1, { gx: e2 });
    axn_done(S);
    axn_T(ctx, '@@ lyric.txt @@', sp.x, sp.y + fs * 0.5, fs * 0.72, { a: A * 0.7, e: 'oe(t/0.3)' });
    axn_T(ctx, axn_pad(ln), sp.x, y1, fs * 0.8, { num: 1, a: A * 0.6, e: e1 });
    axn_T(ctx, axn_pad(ln + 1), sp.x, y2, fs * 0.8, { num: 1, a: A * 0.6, e: e2 });
    axn_T(ctx, '-', sp.x + gut, y1, fs, { a: A, e: e1 });
    axn_T(ctx, old, sp.x + gut + sg, y1, fs, { f: bf, a: A * 0.75, e: e1 });
    axn_T(ctx, '+', sp.x + gut, y2, fs, { c: ac, a: A, e: e2 });
    axn_T(ctx, neu, sp.x + gut + sg, y2, fs, { f: bf, c: sc.fg, a: A * 0.95, src: axn_q(neu) + '.substr(0,Math.ceil(' + n + '*cl((t-0.4)/' + jzN(Math.min(0.5, Math.max(1, n) * 0.04)) + ')))' });
    var S2 = axn_S(ctx, 'diff strike', A);        // over the old wording
    axn_seg(S2, [[sp.x + gut + sg - 3 * u, y1, sp.x + gut + sg + 3 * u + ow, y1]], axn_sub(sc), Math.max(1, 1.4 * u), 1, { trimE: 'ioc((t-0.45)/0.3)' });
    axn_done(S2);
});

/* ---- xnSyllables — 音節分け: the cut respelled glyph by glyph (kana -> romaji) as spaced syllable chips joined by mid dots */
function axn_syllables(s) {
    var a = jzChars(s), out = [], i, c, tok, kana, grp, r, wd;
    for (i = 0; i < a.length && out.length < 12; i++) {
        c = a[i];
        if (!jzTrim(c) || jzIsPunct(c) || c === 'ー' || c === '〜') continue;
        tok = c; kana = false;
        if (jzIsHira(c) || jzIsKata(c)) {
            grp = c;
            while (i + 1 < a.length && (/[ゃゅょャュョーぁぃぅぇぉァィゥェォ]/.test(a[i + 1]) || (/[っッ]/.test(grp) && grp.length === 1 && (jzIsHira(a[i + 1]) || jzIsKata(a[i + 1]))))) grp += a[++i];
            r = jzRomaji(grp);
            if (r) { tok = r; kana = true; } else tok = grp;
        } else if (jzIsLatin(c)) {
            wd = c;
            while (i + 1 < a.length && jzTrim(a[i + 1]) && jzIsLatin(a[i + 1]) && wd.length < 10) wd += a[++i];
            tok = wd.toLowerCase(); kana = true;
        }
        out.push([tok, kana]);
    }
    return out;
}
axn_reg('xnSyllables', function (ctx, bb, p, u) {
    var toks = axn_syllables(axn_cutText(ctx)); if (!toks.length) return;
    var W = ctx.W, sc = ctx.sc, m = axn_mg(ctx), mf = jzMonoF(ctx), bf = jzBodyF(ctx), fs0 = axn_fs(ctx) * 1.05, fs = fs0, w0 = [], ws, gap, tot, it, i, e;
    for (i = 0; i < toks.length; i++) w0.push(axn_tw(ctx, toks[i][0], fs0, toks[i][1] ? mf : bf, 0.04));
    for (it = 0; it < 4; it++) {
        gap = fs * 1.1; ws = []; tot = gap * (toks.length - 1);
        for (i = 0; i < toks.length; i++) { ws.push(w0[i] * fs / fs0); tot += ws[i]; }
        if (tot <= W - m * 2.4) break;
        fs *= 0.8;
    }
    var h = fs * 2.2, sp = axn_band(ctx, bb, tot, h, p, 20 * u + axn_bh(bb) * 0.06), A = sp.ok ? 1 : 0.3, y = sp.y + h * 0.42, x = sp.x, yb = sp.y + h * 0.92;
    var S = axn_S(ctx, 'syllable marks', A);
    for (i = 0; i < toks.length - 1; i++) { axn_dot(S, x + ws[i] + gap / 2, y, 1.8 * u, p.accent ? axn_acc(sc) : axn_sub(sc), 0.9, { opEx: axn_e(0.3, 0.08 + i * 0.055, 'oc') }); x += ws[i] + gap; }
    axn_line(S, [[sp.x, yb - 5 * u], [sp.x, yb], [sp.x + tot, yb], [sp.x + tot, yb - 5 * u]], axn_acc(sc), Math.max(1, 1.2 * u), 0.8, { cap: 1, join: 1, trimE: axn_e(0.5, 0.25) });
    axn_done(S);
    for (i = 0, x = sp.x; i < toks.length; i++) {
        e = axn_e(0.3, 0.08 + i * 0.055, 'oc');
        axn_T(ctx, toks[i][0], x + ws[i] / 2, y, fs, { f: toks[i][1] ? mf : bf, tr: 0.04, al: 'center', a: A, c: toks[i][1] ? axn_sub(sc) : sc.fg, e: e, posEx: '[0,' + jzN(fs * 0.5) + '*(1-' + e + ')]' });
        x += ws[i] + gap;
    }
});

// ================================================================ readouts

/* ---- xnGlyphStats — 字種の内訳: a stacked proportion bar of the cut's kanji / kana / latin glyphs with counted labels */
axn_reg('xnGlyphStats', function (ctx, bb, p, u) {
    var sc = ctx.sc, g0 = axn_glyphs(axn_cutText(ctx)), g = [], i, cnt = [0, 0, 0, 0], c;
    for (i = 0; i < g0.length; i++) if (!jzIsPunct(g0[i])) g.push(g0[i]);
    if (!g.length) return;
    for (i = 0; i < g.length; i++) { c = g[i]; cnt[jzIsKanji(c) ? 0 : (jzIsHira(c) || jzIsKata(c)) ? 1 : jzIsLatin(c) ? 2 : 3]++; }
    var names = ['漢字', 'かな', 'ABC', '他'], pal = [sc.fg, axn_acc(sc), axn_acc2(sc), axn_sub(sc)], ci = 0, nn = axn_noNo(ctx);
    var fs = axn_fs(ctx) * 0.9, bf = jzBodyF(ctx), w = jzClamp(axn_bw(bb) * 0.6, 220 * u, 340 * u), barH = Math.max(6, 9 * u), h = fs * 1.5 + barH + fs * 1.9;
    var sp = axn_spot(ctx, bb, w, h, p, 22 * u), A = sp.ok ? 1 : 0.3, e = axn_e(0.55, 0.05), by = sp.y + fs * 1.5, x = sp.x, lx = sp.x, labs = [], sw, e2, col, lab;
    var S = axn_S(ctx, 'glyph bar', A);
    axn_box(S, sp.x, by, w, barH, axn_sub(sc), 0.18, { gx: e });
    for (i = 0; i < 4; i++) {
        if (!cnt[i]) continue;
        sw = w * cnt[i] / g.length; e2 = axn_e(0.45, 0.15 + i * 0.1, 'oc'); col = pal[ci++ % 4];
        axn_box(S, x + 1, by, Math.max(0.5, sw - 2), barH, col, 1, { gx: e2 });
        axn_box(S, lx, by + barH + fs * 0.75, fs * 0.55, fs * 0.55, col, 1, { opEx: e2 });
        lab = nn ? names[i] : names[i] + ' ' + cnt[i];
        labs.push([lab, lx + fs * 0.85, e2, nn ? null : axn_q(names[i] + ' ') + '+Math.round(' + cnt[i] + '*' + e2 + ')']);
        lx += fs * 0.85 + axn_tw(ctx, lab, fs * 0.82, bf) + fs * 0.9; x += sw;
    }
    axn_done(S);
    axn_T(ctx, 'GLYPHS', sp.x, sp.y + fs * 0.5, fs * 0.8, { a: A, e: 'oe(t/0.3)', tr: 0.14 });
    axn_T(ctx, axn_pad(g.length), sp.x + w, sp.y + fs * 0.5, fs, { al: 'right', c: sc.fg, a: A, num: 1, src: 'pd(Math.round(' + g.length + '*' + e + '),2)' });
    for (i = 0; i < labs.length; i++) axn_T(ctx, labs[i][0], labs[i][1], by + barH + fs * 1.03, fs * 0.82, { f: bf, a: A * 0.9, e: labs[i][2], src: labs[i][3] });
});

/* ---- xnBoxCoords — 隅の座標: coordinates of the bounding-box corners: small crosses with x / y readouts that roll to their values */
axn_reg('xnBoxCoords', function (ctx, bb, p, u) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, m = axn_mg(ctx) * 0.5, fs = axn_fs(ctx) * 0.8, pd = 12 * u, c = p.accent ? axn_acc(sc) : sc.fg, k = 6 * u, nn = axn_noNo(ctx);
    var all = [[bb.x0, bb.y0, -1, -1, 'TL'], [bb.x1, bb.y1, 1, 1, 'BR'], [bb.x1, bb.y0, 1, -1, 'TR'], [bb.x0, bb.y1, -1, 1, 'BL']];
    var list = p.big ? all : (p.v % 2 ? all.slice(2) : all.slice(0, 2)), S = axn_S(ctx, 'corner crosses', 1), txts = [], i;
    for (i = 0; i < list.length; i++) {
        var x = list[i][0], y = list[i][1], sx = list[i][2], sy = list[i][3], nm = list[i][4];
        var pre = 'var e=' + axn_e(0.45, i * 0.08) + ';', off = '[' + jzN(sx * pd) + '*(1-e),' + jzN(sy * pd) + '*(1-e)]';     // settles from 2·pd out to pd
        var px = jzClamp(x + sx * pd, m, W - m), py = jzClamp(y + sy * pd, m, H - m);
        axn_seg(S, [[px - k, py, px + k, py], [px, py - k, px, py + k]], c, Math.max(1, 1.3 * u), 1, { pre: pre, posEx: off, opEx: 'e' });
        var txt = nn ? nm : nm + ' ' + axn_pad(x, 4) + ',' + axn_pad(y, 4), wt = axn_tw(ctx, txt, fs);
        var ty = py + sy * (k + fs * 0.9); if (ty < m + fs * 0.5 || ty > H - m - fs * 0.5) ty = py - sy * (k + fs * 0.9);
        var tx = sx < 0 ? jzClamp(px - k, m, W - m - wt) : jzClamp(px + k - wt, m, W - m - wt);
        if (!axn_hit(tx, ty - fs * 0.6, tx + wt, ty + fs * 0.6, bb, 0))
            txts.push([txt, tx, ty, pre, off, nn ? null : axn_q(nm + ' ') + '+pd(' + jzN(Math.max(0, x)) + '*e,4)+","+pd(' + jzN(Math.max(0, y)) + '*e,4)']);
    }
    axn_done(S);
    for (i = 0; i < txts.length; i++) axn_T(ctx, txts[i][0], txts[i][1], txts[i][2], fs, { a: 0.9, pre: txts[i][3], e: 'e', posEx: txts[i][4], src: txts[i][5] });
});

/* ---- xnRemain — 残り時間: a countdown of the time left in the cut over a rule that shortens toward zero */
axn_reg('xnRemain', function (ctx, bb, p, u) {
    if (axn_noTime(ctx)) return;
    var sc = ctx.sc, fs = axn_fs(ctx), dur = Math.max(0.2, ctx.cut.dur || 1), w = 230 * u, h = fs * 3.6, sp = axn_spot(ctx, bb, w, h, p, 22 * u), A = sp.ok ? 1 : 0.3;
    var PRE = 'var rem=Math.max(0,' + jzN(dur) + '-time),fr=cl(rem/' + jzN(dur) + '),e=oe(t/0.45),hot=fr<0.22;', COL = 'hot?' + axn_cx(axn_acc(sc)) + ':' + axn_cx(sc.fg);
    var y = sp.y + h - fs * 0.5, n = Math.min(12, Math.ceil(dur)), tk = [], i, x;
    for (i = 0; i <= n; i++) { x = sp.x + w - w * Math.min(1, i / dur); tk.push([x, y - 4 * u, x, y + 4 * u]); }
    var S = axn_S(ctx, 'remain rule', A);
    axn_seg(S, tk, axn_sub(sc), Math.max(1, u), 0.6, { opEx: 'oe(t/0.45)' });
    axn_seg(S, [[sp.x, y, sp.x + w, y]], axn_sub(sc), Math.max(1, u), 0.35, { trimE: 'oe(t/0.45)' });
    axn_seg(S, [[sp.x + w, y, sp.x, y]], sc.fg, Math.max(2, 3 * u), 1, { pre: PRE, trimE: 'fr*e', strokeEx: COL });
    axn_dot(S, sp.x + w, y, 4 * u, sc.fg, 1, { pre: PRE, posEx: '[-' + jzN(w) + '*fr*e,0]', fillEx: COL });
    axn_done(S);
    axn_T(ctx, 'REMAIN', sp.x, sp.y + fs * 0.45, fs * 0.72, { a: A * 0.8, e: 'oe(t/0.45)', tr: 0.16 });
    axn_T(ctx, '-00:00.00', sp.x + w, sp.y + fs * 1.6, fs * 1.45, { al: 'right', c: sc.fg, a: A, time: 1, tr: 0.04, e: 'e', posEx: '[0,(1-e)*' + jzN(fs * 0.4) + ']', colEx: 'hot', col2: axn_acc(sc),
        pre: PRE + 'function fm(x){var mi=Math.floor(x/60),s=Math.floor(x%60),f=Math.floor((x%1)*100);return pd(mi,2)+":"+pd(s,2)+"."+pd(f,2);}', src: '"-"+fm(rem)' });
});

/* ---- xnAsciiGauge — 文字ゲージ: an ASCII progress gauge [####----] with a spinner glyph and percent, set character by character.
   ONE monospaced text (tracking sets the cell width); its Source Text fills up, animators colour the filled / empty cells. */
axn_reg('xnAsciiGauge', function (ctx, bb, p, u) {
    var sc = ctx.sc, fs = axn_fs(ctx) * 1.05, N = 12 + 4 * (p.n - 1), cw = fs * 0.66, dur = Math.max(0.3, ctx.cut.dur || 1);
    var w = cw * (N + 2) + fs * 3.4, h = fs * 2.9, sp = axn_band(ctx, bb, w, h, p, 22 * u), A = sp.ok ? 1 : 0.3, y = sp.y + fs * 2.1, ac = axn_acc(sc);
    var fillC = ['#', '=', '|', '■'][p.v % 4], adv = axn_adv(ctx, fs), full = '[', i, H = axn_H(ctx);
    var PR = 'var N=' + N + ',pr=cl((time-0.2)/' + jzN(Math.max(0.2, dur * 0.88 - 0.2)) + '),k=Math.floor(pr*N+1e-6);', IX = 'var i=textIndex-2;';
    for (i = 0; i < N; i++) full += '-';
    axn_T(ctx, '*', sp.x + cw * 0.5, sp.y + fs * 0.6, fs * 0.85, { al: 'center', c: ac, a: A, e: 'oe(t/0.3)', pre: PR, src: 'pr>=1?"*":"|/-\\\\".charAt(Math.floor(time*9)%4)', name: 'gauge spinner' });
    axn_T(ctx, 'rendering', sp.x + cw * 1.4, sp.y + fs * 0.6, fs * 0.8, { a: A, e: 'oe(t/0.3)', tr: 0.1, pre: PR, src: 'pr>=1?"done":"rendering"' });
    var G = axn_T(ctx, full + ']', sp.x + (cw - adv) / 2, y, fs, { tr: jzClamp((cw - adv) / fs, -0.3, 1), c: sc.fg, a: A, pre: PR, name: 'ascii gauge',
        src: 'var s="[",i;for(i=0;i<N;i++)s+=i<k?' + axn_q(fillC) + ':"-";s+"]"' });
    if (G) jzAnimator(G, 'JZ In', [['ADBE Text Opacity', 0]], H + '100*(1-oc((t-(textIndex-1)*0.018)/0.2))');
    if (G) jzAnimator(G, 'JZ Filled', [['ADBE Text Fill Color', jzHex(ac)]], H + PR + IX + '(i>=0&&i<N&&i<k)?100:0');
    if (G) jzAnimator(G, 'JZ Empty', [['ADBE Text Fill Color', jzHex(axn_sub(sc))], ['ADBE Text Opacity', 60]], H + PR + IX + '(i>=0&&i<N&&i>=k)?100:0');
    if (G) jzAnimator(G, 'JZ Hop', [['ADBE Text Position 3D', [0, -fs * 0.3, 0]]], H + PR + IX + '(pr<1&&i>=0&&i===k-1)?100*Math.exp(-((pr*N)%1)*5):0');
    axn_T(ctx, '000%', sp.x + w, y, fs, { al: 'right', c: sc.fg, a: A, e: axn_e(0.3, 0.2), num: 1, pre: PR, src: 'pd(pr*100,3)+"%"' });
});

/* ---- xnBreadcrumb — パンくず: a breadcrumb path (song › line › cut › word) whose levels slide in one after another */
axn_reg('xnBreadcrumb', function (ctx, bb, p, u) {
    var sc = ctx.sc, c = ctx.cut, fs = axn_fs(ctx) * 0.95, mf = jzMonoF(ctx), bf = jzBodyF(ctx), nn = axn_noNo(ctx);
    var items = [[['song', 'lyrics', 'home', 'track'][p.v % 4], mf], [nn ? 'verse' : 'line ' + axn_pad((c.line | 0) + 1), mf], [nn ? 'cut' : 'cut ' + axn_pad((c.index | 0) + 1), mf], [axn_clip(axn_cutText(ctx), 7), bf]];
    var gap = fs * 1.5, ws = [], tot = gap * (items.length - 1), h = fs * 1.6, i, e, last, cx, k = fs * 0.24;
    for (i = 0; i < items.length; i++) { ws.push(axn_tw(ctx, items[i][0], fs, items[i][1])); tot += ws[i]; }
    var sp = axn_band(ctx, bb, tot, h, p, 22 * u + axn_bh(bb) * 0.05), A = sp.ok ? 1 : 0.3, y = sp.y + h / 2, x = sp.x, S = axn_S(ctx, 'breadcrumb marks', A), xs = [];
    for (i = 0; i < items.length; i++) {
        xs.push(x);
        if (i === items.length - 1) axn_seg(S, [[x, y + fs * 0.75, x + ws[i], y + fs * 0.75]], axn_acc(sc), Math.max(1.5, 2 * u), 1, { trimE: axn_e(0.4, 0.55) });
        else { cx = x + ws[i] + gap / 2; axn_line(S, [[cx - k * 0.6, y - k], [cx + k * 0.6, y], [cx - k * 0.6, y + k]], axn_acc(sc), Math.max(1, 1.4 * u), 1, { opEx: axn_e(0.35, i * 0.13) }); }
        x += ws[i] + gap;
    }
    axn_done(S);
    for (i = 0; i < items.length; i++) {
        e = axn_e(0.35, i * 0.13); last = i === items.length - 1;
        axn_T(ctx, items[i][0], xs[i], y, fs, { f: items[i][1], a: A * (last ? 1 : 0.8), c: last ? sc.fg : axn_sub(sc), e: e, posEx: '[-' + jzN(14 * u) + '*(1-' + e + '),0]' });
    }
});

/* ---- xnVersionTags — 版数タグ: version / file-name style pills (v1.03, take 02, draft) that pop open in a row */
axn_reg('xnVersionTags', function (ctx, bb, p, u) {
    var sc = ctx.sc, fs = axn_fs(ctx) * 0.9, nn = axn_noNo(ctx), ln = (ctx.cut.line | 0) + 1, ix = (ctx.cut.index | 0) + 1, ac = axn_acc(sc);
    var word = ['draft', 'final', 'beta', 'wip', 'stable', 'demo'][p.v % 6];
    var tags = (nn ? ['lyric.txt', word, 'text'] : ['v' + (1 + (ln % 3)) + '.' + axn_pad(ix), word, 'take ' + axn_pad(ln)]).slice(0, 1 + p.n);
    var ph = fs * 1.9, px = fs * 0.8, gap = fs * 0.55, ws = [], tot = gap * (tags.length - 1), i, e, fill;
    for (i = 0; i < tags.length; i++) { ws.push(axn_tw(ctx, tags[i], fs) + px * 2); tot += ws[i]; }
    var sp = axn_spot(ctx, bb, tot, ph, p, 20 * u), A = sp.ok ? 1 : 0.3, x = sp.x, S = axn_S(ctx, 'tag pills', A), xs = [];
    for (i = 0; i < tags.length; i++) {
        e = axn_e(0.4, 0.05 + i * 0.12, 'ob', 1.4); fill = i === (p.accent ? 0 : 1) % tags.length;
        axn_rr(S, x, sp.y, ws[i], ph, p.big ? 4 * u : ph / 2, fill ? ac : null, 1, fill ? null : axn_sub(sc), Math.max(1, 1.2 * u), { gx: 'Math.min(1.06,' + e + ')', opEx: '2*' + e });
        xs.push(x); x += ws[i] + gap;
    }
    axn_done(S);
    for (i = 0; i < tags.length; i++) {
        fill = i === (p.accent ? 0 : 1) % tags.length;
        axn_T(ctx, tags[i], xs[i] + ws[i] / 2, sp.y + ph / 2, fs, { al: 'center', c: fill ? axn_on(sc, ac) : sc.fg, a: A, e: axn_e(0.25, 0.2 + i * 0.12) });
    }
});

/* ---- xnTooltip — ヒント吹き出し: a small filled tooltip with a pointer aimed at the lyric, naming the font or the reading.
   The label is parented to the bubble layer, which pops (scale from the pointer tip) and bobs. */
axn_reg('xnTooltip', function (ctx, bb, p, u) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, m = axn_mg(ctx), fs = axn_fs(ctx) * 0.9, bf = jzBodyF(ctx), ct = axn_cutText(ctx), rj = jzRomaji(axn_nopunct(ct)), cj = axn_hasCJK(ct);
    var txt = p.v % 3 === 0 ? String((ctx.st.fonts.display && ctx.st.fonts.display[0]) || 'display').replace(/_/g, ' ') : (p.v % 3 === 1 ? (cj ? 'クリックして編集' : 'click to edit') : (rj ? axn_clip(rj, 22) : (cj ? 'テキストレイヤー' : 'text layer')));
    var w = axn_tw(ctx, txt, fs, bf) + fs * 1.6, h = fs * 2, tip = 9 * u, gap = 10 * u + axn_bh(bb) * 0.04, below = p.low;
    if (below ? bb.y1 + gap + tip + h > H - m : bb.y0 - gap - tip - h < m) below = !below;
    var ok = below ? bb.y1 + gap + tip + h <= H - m * 0.6 : bb.y0 - gap - tip - h >= m * 0.6, A = ok ? 1 : 0.3;
    var ax = jzClamp(jzLerp(bb.x0, bb.x1, p.right ? 0.72 : 0.28), m + 20 * u, W - m - 20 * u), ay = below ? bb.y1 + gap : bb.y0 - gap;
    var s = below ? 1 : -1, x0 = jzClamp(ax - w / 2, m, W - m - w), c = sc.fg, by = below ? ay + tip : ay - tip - h;
    var S = axn_S(ctx, 'tooltip', A);
    axn_poly(S, [[ax, ay], [ax - tip * 0.8, ay + s * (tip + 1)], [ax + tip * 0.8, ay + s * (tip + 1)]], c, 1);
    axn_rr(S, x0, by, w, h, 5 * u, c, 1);
    axn_done(S);
    axn_pivot(S.L, ax, ay);
    var T = axn_T(ctx, txt, x0 + w / 2, by + h / 2, fs, { f: bf, al: 'center', c: axn_on(sc, c), a: A });
    try { if (T) T.parent = S.L; } catch (e) { jzWarn('axn tooltip parent: ' + e.toString()); }      // before the pop expression: the bubble is still at rest
    axn_lx(ctx, S.L, 'ob((t-0.3)/0.35,1.7)', '[0,Math.sin(time*2.2)*' + jzN(2 * u * ctx.fx.motion) + ']');
});

// ================================================================ charts

/* ---- xnSparkline — スパークライン: a tiny trend line that draws on, with its low / high marked and the latest value at the head */
axn_reg('xnSparkline', function (ctx, bb, p, u) {
    var sc = ctx.sc, fs = axn_fs(ctx) * 0.85, w = 190 * u + 40 * u * p.n, gh = 46 * u, h = gh + fs * 1.6, n = 18;
    var sp = axn_spot(ctx, bb, w + fs * 3.2, h, p, 22 * u), A = sp.ok ? 1 : 0.3, ac = axn_acc(sc), vals = [], lo = 0, hi = 0, i, v, pts = [], top = sp.y + fs * 1.4;
    for (i = 0; i < n; i++) {
        v = 0.5 + 0.42 * axn_noise1(i * 0.55, p.seed) + (i / n - 0.5) * 0.35 * (p.right ? 1 : -1) + axn_rs(p.seed, i, 3) * 0.07;
        vals.push(v); if (v < vals[lo]) lo = i; if (v > vals[hi]) hi = i;
    }
    var mn = vals[lo], mx = vals[hi], E = 'ioc((t-0.1)/0.8)';
    for (i = 0; i < n; i++) pts.push([sp.x + w * i / (n - 1), top + gh * (1 - (vals[i] - mn) / Math.max(0.001, mx - mn))]);
    // q = the head of the line (the point at fraction e of its length)
    var HD = 'var P=' + jzArrExpr(pts) + ',e=' + E + ',L=[0],i,q=P[P.length-1],a,b,kk;for(i=1;i<P.length;i++){a=P[i][0]-P[i-1][0];b=P[i][1]-P[i-1][1];L.push(L[i-1]+Math.sqrt(a*a+b*b));}' +
        'var rem=L[L.length-1]*e;for(i=1;i<P.length;i++){if(rem<=L[i]){kk=(rem-L[i-1])/Math.max(0.0001,L[i]-L[i-1]);q=[P[i-1][0]+(P[i][0]-P[i-1][0])*kk,P[i-1][1]+(P[i][1]-P[i-1][1])*kk];break;}}' +
        'var gy=cl((q[1]-' + jzN(top) + ')/' + jzN(gh) + ');';
    var S = axn_S(ctx, 'sparkline', A);
    axn_line(S, [[sp.x, top + gh], [sp.x + w, top + gh]], axn_sub(sc), Math.max(1, u), 0.5, { cap: 1, dash: [2 * u, 4 * u], trimE: 'oe(t/0.4)' });
    axn_line(S, pts, sc.fg, Math.max(1.4, 2 * u), 1, { trimE: E });
    axn_ring(S, pts[lo][0], pts[lo][1], 3.5 * u, axn_sub(sc), Math.max(1, 1.2 * u), 1, { opEx: E + '>' + jzN(lo / (n - 1)) + '?1:0' });
    axn_ring(S, pts[hi][0], pts[hi][1], 3.5 * u, ac, Math.max(1, 1.2 * u), 1, { opEx: E + '>' + jzN(hi / (n - 1)) + '?1:0' });
    axn_dot(S, 0, 0, 4 * u, ac, 1, { pre: HD, posEx: 'q', opEx: 'e>0?1:0' });
    axn_done(S);
    axn_T(ctx, ['TREND', 'PULSE', 'MOOD', 'TEMPO'][p.v % 4], sp.x, sp.y + fs * 0.5, fs * 0.82, { a: A, e: 'oe(t/0.3)', tr: 0.14 });
    axn_T(ctx, '00.0', sp.x + w + fs * 0.5, top, fs, { c: sc.fg, a: A, e: axn_e(0.3, 0.2), num: 1, pre: HD, posEx: '[0,gy*' + jzN(gh) + ']', src: '(100*(0.12+0.8*(1-gy))).toFixed(1)' });
});

/* ---- xnVowels — 母音グラフ: horizontal bars counting the vowels (A I U E O) sung in the lyric line; glyph counts when there are none */
axn_reg('xnVowels', function (ctx, bb, p, u) {
    var sc = ctx.sc, g0 = axn_glyphs(axn_lineText(ctx).toLowerCase()), g = [], i, j, c, r, ch, cv = { a: 0, i: 0, u: 0, e: 0, o: 0 }, tot = 0, rows = [];
    for (i = 0; i < g0.length; i++) if (!jzIsPunct(g0[i])) g.push(g0[i]);
    if (!g.length) return;
    for (i = 0; i < g.length; i++) {
        c = g[i]; r = (jzIsHira(c) || jzIsKata(c)) ? jzRomaji(c) : (/[a-z]/.test(c) ? c : null);
        if (r) for (j = 0; j < r.length; j++) { ch = r.charAt(j); if (cv.hasOwnProperty(ch)) { cv[ch]++; tot++; } }
    }
    var vow = tot >= 2;
    if (vow) rows = [['A', cv.a], ['I', cv.i], ['U', cv.u], ['E', cv.e], ['O', cv.o]];
    else {
        for (i = 0; i < g.length; i++) { for (j = 0; j < rows.length; j++) if (rows[j][0] === g[i]) break; if (j < rows.length) rows[j][1]++; else rows.push([g[i], 1]); }
        for (i = 1; i < rows.length; i++) for (j = i; j > 0 && rows[j][1] > rows[j - 1][1]; j--) { c = rows[j]; rows[j] = rows[j - 1]; rows[j - 1] = c; }      // stable, most frequent first
        rows = rows.slice(0, 3 + p.n);
    }
    var mx = 1, top = 0;
    for (i = 0; i < rows.length; i++) mx = Math.max(mx, rows[i][1]);
    for (i = 0; i < rows.length; i++) if (rows[i][1] === mx) { top = i; break; }
    var fs = axn_fs(ctx), f = vow ? jzMonoF(ctx) : jzBodyF(ctx), rh = fs * 1.45, barW = 150 * u, w = fs * 1.6 + barW + fs * 1.8, h = rows.length * rh;
    var sp = axn_spot(ctx, bb, w, h, p, 22 * u), A = sp.ok ? 1 : 0.3, x0 = sp.x + fs * 1.6, S = axn_S(ctx, 'vowel bars', A), e, y, bwd;
    axn_seg(S, [[x0 - 4 * u, sp.y, x0 - 4 * u, sp.y + h]], axn_sub(sc), Math.max(1, u), 0.7, { trimE: 'oe(t/0.4)' });
    for (i = 0; i < rows.length; i++) {
        y = sp.y + rh * (i + 0.5); bwd = Math.max(2 * u, barW * (rows[i][1] / mx));
        axn_box(S, x0, y - rh * 0.26, bwd, rh * 0.52, i === top ? axn_acc(sc) : axn_sub(sc), i === top ? 1 : 0.55, { gx: axn_e(0.5, 0.1 + i * 0.07) });
    }
    axn_done(S);
    for (i = 0; i < rows.length; i++) {
        e = axn_e(0.5, 0.1 + i * 0.07); y = sp.y + rh * (i + 0.5); bwd = Math.max(2 * u, barW * (rows[i][1] / mx));
        axn_T(ctx, rows[i][0], sp.x + fs * 0.6, y, fs, { f: f, al: 'center', c: sc.fg, a: A * 0.9, tr: 0, e: '2*' + e });
        axn_T(ctx, String(rows[i][1]), x0 + bwd + fs * 0.4, y, fs * 0.85, { a: A, num: 1, pre: 'var e=' + e + ';', e: 'e', posEx: '[-' + jzN(bwd) + '*(1-e),0]', src: 'String(Math.round(' + rows[i][1] + '*e))' });
    }
});

/* ---- xnLegend — 凡例: a chart legend: line / dash / dot samples keyed to pieces of the cut */
axn_reg('xnLegend', function (ctx, bb, p, u) {
    var sc = ctx.sc, txt = axn_cutText(ctx), g = axn_glyphs(txt), labs = [], w0 = txt.split(' '), wds = [], i, k, per;
    if (!g.length) return;
    for (i = 0; i < w0.length; i++) if (w0[i]) wds.push(w0[i]);
    if (wds.length >= 2) { k = Math.min(3, wds.length); per = Math.ceil(wds.length / k); for (i = 0; i < wds.length; i += per) labs.push(wds.slice(i, i + per).join(' ')); }
    else { k = Math.min(3, g.length); per = Math.ceil(g.length / k); for (i = 0; i < g.length; i += per) labs.push(g.slice(i, i + per).join('')); }
    labs = labs.slice(0, 3);
    var fs = axn_fs(ctx) * 0.95, bf = jzBodyF(ctx), rh = fs * 1.7, sw = 34 * u, pd = p.big ? fs * 0.8 : 0, mw = 0;
    for (i = 0; i < labs.length; i++) { labs[i] = axn_clip(labs[i], 9); mw = Math.max(mw, axn_tw(ctx, labs[i], fs, bf)); }
    var w = sw + fs * 0.7 + mw + pd * 2, h = labs.length * rh + pd * 2, sp = axn_spot(ctx, bb, w, h, p, 22 * u), A = sp.ok ? 1 : 0.3, cols = [sc.fg, axn_acc(sc), axn_acc2(sc)];
    var S = axn_S(ctx, 'legend keys', A), e, y, x;
    if (p.big) axn_rr(S, sp.x, sp.y, w, h, 3 * u, null, 0.6, axn_sub(sc), Math.max(1, u), { opEx: 'oe(t/0.3)' });
    for (i = 0; i < labs.length; i++) {
        e = axn_e(0.45, 0.08 + i * 0.12); y = sp.y + pd + rh * (i + 0.5); x = sp.x + pd; k = (i + p.v) % 3;
        if (k === 0) axn_seg(S, [[x, y, x + sw, y]], cols[i], Math.max(2, 2.6 * u), 1, { trimE: e });
        else if (k === 1) axn_seg(S, [[x, y, x + sw, y]], cols[i], Math.max(2, 2.6 * u), 1, { dash: [6 * u, 4 * u], trimE: e });
        else {
            axn_seg(S, [[x, y, x + sw, y]], cols[i], Math.max(1, 1.2 * u), 1, { trimE: e });
            axn_dot(S, x + sw * 0.5, y, 4.5 * u, cols[i], 1, { pivot: [x + sw * 0.5, y], pre: 'var e=' + e + ';', scEx: '[e,e]', posEx: '[-' + jzN(sw * 0.5) + '*(1-e),0]' });
        }
    }
    axn_done(S);
    for (i = 0; i < labs.length; i++) {
        e = axn_e(0.45, 0.08 + i * 0.12);
        axn_T(ctx, labs[i], sp.x + pd + sw + fs * 0.7, sp.y + pd + rh * (i + 0.5), fs, { f: bf, a: A * 0.9, e: e, posEx: '[' + jzN(8 * u) + '*(1-' + e + '),0]' });
    }
});

/* ---- xnAxes — グラフ軸: x / y chart axes drawn round the lyric: ticks per glyph, arrow heads and axis titles.
   The ticks are the dashes of one thick dashed line, so Trim Paths reveals them as the axis passes; the tick numbers are
   ONE monospaced text (cell = tick pitch) with a per-character fade. */
axn_reg('xnAxes', function (ctx, bb, p, u) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, m = axn_mg(ctx) * 0.5, fs = axn_fs(ctx) * 0.78, bw = axn_bw(bb), bh = axn_bh(bb), pd = 18 * u + Math.min(bw, bh) * 0.1;
    var c = p.accent ? axn_acc(sc) : sc.fg, lw = Math.max(1, 1.4 * u), ct = axn_cutText(ctx);
    var ox = Math.max(m, bb.x0 - pd), oy = Math.min(H - m - fs * 1.7, bb.y1 + pd), xe = Math.min(W - m, bb.x1 + pd * 1.7), ye = Math.max(m, bb.y0 - pd * 1.7);
    if (oy < bb.y1 + 4 * u || ox > bb.x0 - 4 * u) return;
    var E1 = 'ioc(t/0.5)', E2 = 'ioc((t-0.12)/0.5)', ah = 6 * u, n = Math.max(1, Math.min(axn_glyphs(ct).length, 12, Math.floor(bw / (fs * 1.5)))), tl = 6 * u;
    var xs = bb.x0 + bw * 0.5 / n - lw / 2, xl = bb.x0 + bw * (n - 0.5) / n + lw / 2, S = axn_S(ctx, 'chart axes', 1);
    axn_seg(S, [[ox, oy, xe, oy]], c, lw, 1, { trimE: E1 });
    axn_seg(S, [[ox, oy, ox, ye]], c, lw, 1, { trimE: E2 });
    axn_line(S, [[xe - ah, oy - ah * 0.7], [xe, oy], [xe - ah, oy + ah * 0.7]], c, lw, 1, { pre: 'var e=' + E1 + ';', posEx: '[' + jzN(ox - xe) + '*(1-e),0]', opEx: 'e*3' });
    axn_line(S, [[ox - ah * 0.7, ye + ah], [ox, ye], [ox + ah * 0.7, ye + ah]], c, lw, 1, { pre: 'var e=' + E2 + ';', posEx: '[0,' + jzN(oy - ye) + '*(1-e)]', opEx: 'e*3' });
    // x ticks (one per glyph column) and the three y ticks: shown where the growing axis has reached them
    axn_seg(S, [[xs, oy + tl / 2, xl, oy + tl / 2]], c, tl, 0.9, { dash: [lw, Math.max(0.1, bw / n - lw)], trimE: '(' + jzN(ox) + '+' + jzN(xe - ox) + '*' + E1 + '-' + jzN(xs) + ')/' + jzN(Math.max(0.01, xl - xs)) });
    axn_seg(S, [[ox - tl / 2, bb.y1 + lw / 2, ox - tl / 2, bb.y0 - lw / 2]], c, tl, 0.9, { dash: [lw, Math.max(0.1, bh / 2 - lw)], trimE: '(' + jzN(bb.y1 + lw / 2 - oy) + '+' + jzN(oy - ye) + '*' + E2 + ')/' + jzN(bh + lw) });
    axn_done(S);
    if (!axn_noNo(ctx)) {
        var step = n <= 8 ? 1 : 2, adv = axn_adv(ctx, fs), P = bw / n * step, mc = Math.max(2, Math.round(P / adv)), s = '', i, j, lab;
        for (i = 0; i < n; i += step) { lab = String(i + 1); s += lab; if (i + step < n) for (j = lab.length; j < mc; j++) s += ' '; }
        var G = axn_T(ctx, s, bb.x0 + bw * 0.5 / n - adv / 2, oy + tl + fs * 0.8, fs, { tr: jzClamp((P / mc - adv) / fs, -0.3, 1), a: 0.85, name: 'axis numbers' });
        if (G) jzAnimator(G, 'JZ In', [['ADBE Text Opacity', 0]], axn_H(ctx) + 'var j=Math.floor((textIndex-1)/' + mc + ');100*(1-oe((t-(0.25+j*' + jzN(step * 0.03) + '))/0.3))');
    }
    var cj = axn_hasCJK(ct), bf = jzBodyF(ctx), e3 = axn_e(0.35, 0.45), tx = cj ? ['とき', 'ことば'] : ['time', 'words'], ty = cj ? ['想い', '声'] : ['feeling', 'voice'];
    if (xe - bb.x1 > 10 * u) axn_T(ctx, tx[p.v % 2], xe, oy - fs * 0.9, fs, { f: bf, al: 'right', a: 0.9, e: e3 });
    if (bb.y0 - ye > fs * 1.7) axn_T(ctx, ty[p.v % 2], ox + 9 * u, ye + fs * 0.6, fs, { f: bf, a: 0.9, e: e3 });
});
