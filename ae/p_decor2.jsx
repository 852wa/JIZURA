// ================================================================ decor part 2 (AE port of src/11p_decor.js: rhythm & orbit, particles & light,
// hand-drawn marks, type ornaments). decor.build(ctx, bb, d): layers go into the cut's content comp (time 0 = cut start).
// Everything the browser draws on the main pass only is kept out of the ghosts (jzNoGhost). Particles are ONE shape layer each:
// one group per particle, its motion baked into a short Position / Scale / Rotation expression (per-index constants come from
// the browser's own hash, so placements match the web frame).

// ---------------------------------------------------------------- shared helpers (prefix dc2_)
// the browser's deterministic hash J.h / J.r / J.rs / J.rr and value noise J.noise1
function dc2_h(a, b, c, d, e) {
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
function dc2_r(a, b, c, d, e) { return dc2_h(a, b, c, d, e) / 4294967296; }
function dc2_rs(a, b, c, d, e) { return dc2_r(a, b, c, d, e) * 2 - 1; }
function dc2_rr(lo, hi, a, b, c, d, e) { return lo + (hi - lo) * dc2_r(a, b, c, d, e); }
function dc2_noise(x, seed) { var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), a = dc2_rs(seed, i), b = dc2_rs(seed, i + 1); return a + (b - a) * u; }
// browser sizes: u = 1 at a 1080 px short side, MG = safe margin, FS = small label size
function dc2_u(ctx) { return jzU(ctx) / 1080; }
function dc2_mg(ctx) { return Math.round(jzU(ctx) * 0.05); }
function dc2_fs(ctx) { return Math.max(12 * ctx.u, 16 * dc2_u(ctx)); }
function dc2_dark(ctx) { return jzLum(ctx.sc.bg) < 0.5; }
function dc2_ioc(x) { x = jzClamp(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
// lyric bbox as the browser's getBB (clamped a little outside the frame)
function dc2_bb(ctx, bb) {
    var W = ctx.W, H = ctx.H;
    if (!bb || !(bb.x1 > bb.x0) || !(bb.y1 > bb.y0)) bb = { x0: W * 0.35, x1: W * 0.65, y0: H * 0.4, y1: H * 0.6 };
    var b = { x0: Math.max(bb.x0, -W * 0.1), x1: Math.min(bb.x1, W * 1.1), y0: Math.max(bb.y0, -H * 0.1), y1: Math.min(bb.y1, H * 1.1) };
    if (b.x1 <= b.x0) { b.x0 = bb.x0; b.x1 = bb.x1; }
    if (b.y1 <= b.y0) { b.y0 = bb.y0; b.y1 = bb.y1; }
    b.cx = (b.x0 + b.x1) / 2; b.cy = (b.y0 + b.y1) / 2; b.w = b.x1 - b.x0; b.h = b.y1 - b.y0;
    return b;
}
function dc2_hit(x0, y0, x1, y1, bb, pad) { pad = pad || 0; return !(x1 < bb.x0 - pad || x0 > bb.x1 + pad || y1 < bb.y0 - pad || y0 > bb.y1 + pad); }
// a w×h box next to the lyric (browser nearBB) / a free screen corner (cornerSpot): { x, y, cx, cy, ok, sx, sy }
function dc2_corner(ctx, bb, w, h, P, mk) {
    var W = ctx.W, H = ctx.H, m = dc2_mg(ctx) * (mk || 1), sx0 = P.right ? 1 : -1, sy0 = P.low ? 1 : -1, best = null, bestA = 1e18, i;
    var order = [[sx0, sy0], [-sx0, sy0], [sx0, -sy0], [-sx0, -sy0]];
    for (i = 0; i < 4; i++) {
        var sx = order[i][0], sy = order[i][1], X = sx > 0 ? W - m - w : m, Y = sy > 0 ? H - m - h : m;
        if (!dc2_hit(X, Y, X + w, Y + h, bb, 8)) return { x: X, y: Y, cx: X + w / 2, cy: Y + h / 2, ok: true, sx: sx, sy: sy };
        var ov = Math.max(0, Math.min(X + w, bb.x1) - Math.max(X, bb.x0)) * Math.max(0, Math.min(Y + h, bb.y1) - Math.max(Y, bb.y0));
        if (ov < bestA) { bestA = ov; best = { x: X, y: Y, cx: X + w / 2, cy: Y + h / 2, ok: false, sx: sx, sy: sy }; }
    }
    return best;
}
function dc2_near(ctx, bb, w, h, P, gap) {
    var W = ctx.W, H = ctx.H, m = dc2_mg(ctx) * 0.8, sx0 = P.right ? 1 : -1, sy0 = P.low ? 1 : -1, tries = [], i;
    var order = P.corner ? [[sx0, sy0], [-sx0, sy0], [sx0, -sy0], [-sx0, -sy0]] : [[sx0, sy0], [sx0, -sy0], [-sx0, sy0], [-sx0, -sy0]];
    for (i = 0; i < 4; i++) {
        var sx = order[i][0], sy = order[i][1];
        var ax = sx > 0 ? bb.x1 - w : bb.x0, ox = sx > 0 ? bb.x1 + gap : bb.x0 - gap - w;
        var ay = sy > 0 ? bb.y1 + gap : bb.y0 - gap - h, iy = sy > 0 ? bb.y1 - h : bb.y0;
        if ((P.v | 0) % 2) tries.push([ox, iy, sx, sy], [ax, ay, sx, sy], [ox, ay, sx, sy]);
        else tries.push([ax, ay, sx, sy], [ox, iy, sx, sy], [ox, ay, sx, sy]);
    }
    for (i = 0; i < tries.length; i++) {
        var X = jzClamp(tries[i][0], m, Math.max(m, W - m - w)), Y = jzClamp(tries[i][1], m, Math.max(m, H - m - h));
        if (!dc2_hit(X, Y, X + w, Y + h, bb, gap * 0.4)) return { x: X, y: Y, cx: X + w / 2, cy: Y + h / 2, ok: true, sx: tries[i][2], sy: tries[i][3] };
    }
    return dc2_corner(ctx, bb, w, h, P, 1);
}
function dc2_clear(bb, x, y, pad, soft) {
    var dx = Math.max(bb.x0 - pad - x, 0, x - bb.x1 - pad), dy = Math.max(bb.y0 - pad - y, 0, y - bb.y1 - pad);
    return jzClamp(Math.sqrt(dx * dx + dy * dy) / soft, 0, 1);
}
// point at distance t along the rectangle's perimeter (clockwise from the top-left corner)
function dc2_perim(X0, Y0, X1, Y1, t) {
    if (t < X1 - X0) return [X0 + t, Y0];
    t -= X1 - X0; if (t < Y1 - Y0) return [X1, Y0 + t];
    t -= Y1 - Y0; if (t < X1 - X0) return [X1 - t, Y1];
    t -= X1 - X0; return [X0, Y1 - t];
}
// a character of the lyric: prefer kanji, then kana / latin (browser lyricChar)
function dc2_lyricChar(ctx, salt) {
    var c = ctx.cut, a = jzChars(String(c.text || c.lineText || '')), arr = [], kan = [], pool = [], i;
    for (i = 0; i < a.length; i++) if (jzTrim(a[i]) && !jzIsPunct(a[i])) arr.push(a[i]);
    if (!arr.length) return '';
    for (i = 0; i < arr.length; i++) if (jzIsKanji(arr[i])) kan.push(arr[i]);
    if (kan.length) pool = kan;
    else for (i = 0; i < arr.length; i++) if (jzIsKata(arr[i]) || jzIsHira(arr[i]) || /[A-Za-z]/.test(arr[i])) pool.push(arr[i]);
    var p = pool.length ? pool : arr;
    return p[dc2_h(c.seed, salt | 0, 5) % p.length];
}
// ---- expression snippets (kept short: many particle groups carry one each)
var DC2_CL = 'function cl(x){return Math.max(0,Math.min(1,x));}';
var DC2_OC = 'function oc(x){x=cl(x);return 1-Math.pow(1-x,3);}';
var DC2_OE = 'function oe(x){x=cl(x);return x>=1?1:1-Math.pow(2,-10*x);}';
var DC2_IC = 'function ic(x){x=cl(x);return x*x*x;}';
var DC2_OB = 'function ob(x,s){x=cl(x);var c=s+1;return 1+c*Math.pow(x-1,3)+s*Math.pow(x-1,2);}';
var DC2_IOC = 'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}';
var DC2_WR = 'function wr(v,lo,sp){return lo+(((v-lo)%sp)+sp)%sp;}';
var DC2_HH = 'function hh(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);}';
// light header: T = time, PO = exit progress (same timing as jzTH) + the listed helper functions
function dc2_hd(ctx, fns) {
    var c = ctx.cut, hard = c.outDur != null && c.outDur <= 0, od = hard ? 0.05 : Math.max(0.12, c.outDur || 0.15);
    return 'var T=time,OS=' + jzN(hard ? c.dur : c.dur - od) + ',OD=' + jzN(od) + ';' + DC2_CL + (fns || '') + 'var PO=cl((T-OS)/OD);';
}
// layer opacity: value × exit fade K × optional factor (JZ_FNS names available)
function dc2_op(ctx, L, mul, val) {
    if (val != null) jzXf(L, 'ADBE Opacity').setValue(jzClamp(val, 0, 100));
    jzSetExpr(jzXf(L, 'ADBE Opacity'), jzTH(ctx) + 'value*K' + (mul ? '*(' + mul + ')' : ''));
}
function dc2_sub(g, name) { var q = jzVecs(g).addProperty('ADBE Vector Group'); if (name) q.name = name; return q; }
function dc2_gx(g, mn, ex) { jzSetExpr(jzGX(g).property(mn), ex); }
function dc2_stroke(g, col, w, op, round) {
    var s = jzAddStroke(g, col, w, op);
    if (round) { try { s.property('ADBE Vector Stroke Line Cap').setValue(2); s.property('ADBE Vector Stroke Line Join').setValue(2); } catch (e) {} }
    return s;
}
function dc2_dash(st, d, gp) {   // AE starts with an empty Dashes group; the preview model has fixed children
    // add both entries first, THEN fetch them: adding the gap invalidates a reference held to the dash
    var D = st.property('ADBE Vector Stroke Dashes'), mn = ['ADBE Vector Stroke Dash 1', 'ADBE Vector Stroke Gap 1'], out = [], i, p;
    for (i = 0; i < 2; i++) { try { D.addProperty(mn[i]); } catch (e) {} }
    for (i = 0; i < 2; i++) { p = null; try { p = D.property(mn[i]); } catch (e2) { p = null; } out.push(p); }
    return out;
}
// subtract a rectangle (comp px, layer at 0,0) — front particles / orbits never cover the lyric
function dc2_hole(L, x0, y0, x1, y1, feather) {
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = [[x1, y0], [x1, y1], [x0, y1], [x0, y0]]; sh.closed = true;
    m.property('ADBE Mask Shape').setValue(sh);
    try { m.maskMode = MaskMode.SUBTRACT; } catch (e) {}
    if (feather) m.property('ADBE Mask Feather').setValue([feather, feather]);
    return m;
}
function dc2_pts(list, k) { var o = [], i; for (i = 0; i < list.length; i++) o.push([list[i][0] * k, list[i][1] * k]); return o; }
function dc2_star5(R, r) { var o = [], i; for (i = 0; i < 10; i++) { var a = (-90 + i * 36) * Math.PI / 180, q = i % 2 ? r : R; o.push([Math.cos(a) * q, Math.sin(a) * q]); } return o; }
function dc2_heart(s) {
    var o = [], i;
    for (i = 0; i < 28; i++) { var t = i / 28 * Math.PI * 2, x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); o.push([x * s / 17, -y * s / 17]); }
    return o;
}
function dc2_glint(R, w) {      // 4-point concave star
    var o = [], out = [], i;
    for (i = 0; i < 8; i++) { var a = i * Math.PI / 4, q = i % 2 ? w : R; o.push([Math.cos(a) * q, Math.sin(a) * q]); }
    for (i = 0; i < 8; i++) { var p = o[i], n = o[(i + 1) % 8]; out.push(p); out.push([(p[0] + n[0]) / 2 * 0.65, (p[1] + n[1]) / 2 * 0.65]); }
    return out;
}
// the lyric's text lines (or columns) as boxes, from the text layers the layout built inside the bbox
function dc2_lines(ctx, bb, vert) {
    var comp = ctx.comp, boxes = [], lines = [], i, j;
    for (i = 1; i <= comp.numLayers; i++) {
        var L = comp.layer(i), tp = null;
        if (L.matchName !== 'ADBE Text Layer') continue;
        try { tp = L.property('ADBE Text Properties'); } catch (e0) { tp = null; }
        if (!tp) continue;
        var txt = '', just = 0;
        try { var td = tp.property('ADBE Text Document').value; txt = String(td.text); just = td.justification; } catch (e1) { continue; }
        var r = jzRect(L), a = jzXf(L, 'ADBE Anchor Point').value, p = jzXf(L, 'ADBE Position').value, s = jzXf(L, 'ADBE Scale').value;
        var x0 = p[0] + (r.left - a[0]) * s[0] / 100, y0 = p[1] + (r.top - a[1]) * s[1] / 100, w = r.width * s[0] / 100, h = r.height * s[1] / 100;
        var cx = x0 + w / 2, cy = y0 + h / 2;
        if (cx < bb.x0 || cx > bb.x1 || cy < bb.y0 || cy > bb.y1 || w * h < (bb.x1 - bb.x0) * (bb.y1 - bb.y0) * 0.04) continue;
        var rows = txt.split(/\r\n|\r|\n/), n = rows.length, mx = 1;
        if (vert || n < 2) { boxes.push({ x0: x0, x1: x0 + w, y0: y0, y1: y0 + h }); continue; }
        for (j = 0; j < n; j++) mx = Math.max(mx, jzCount(rows[j]));
        for (j = 0; j < n; j++) {
            var lw = w * jzCount(rows[j]) / mx, lx = just === ParagraphJustification.LEFT_JUSTIFY ? x0 : just === ParagraphJustification.RIGHT_JUSTIFY ? x0 + w - lw : cx - lw / 2;
            if (lw > 0) boxes.push({ x0: lx, x1: lx + lw, y0: y0 + h * j / n, y1: y0 + h * (j + 1) / n });
        }
    }
    for (i = 0; i < boxes.length; i++) {       // group into lines by centre (as the browser groups glyph boxes)
        var b = boxes[i], key = vert ? (b.x0 + b.x1) / 2 : (b.y0 + b.y1) / 2, sz = vert ? b.x1 - b.x0 : b.y1 - b.y0, Ln = null;
        for (j = 0; j < lines.length; j++) if (Math.abs(lines[j].k - key) < sz * 0.4) { Ln = lines[j]; break; }
        if (!Ln) lines.push({ k: key, x0: b.x0, x1: b.x1, y0: b.y0, y1: b.y1 });
        else { Ln.x0 = Math.min(Ln.x0, b.x0); Ln.x1 = Math.max(Ln.x1, b.x1); Ln.y0 = Math.min(Ln.y0, b.y0); Ln.y1 = Math.max(Ln.y1, b.y1); }
    }
    lines.sort(function (p, q) { return vert ? q.k - p.k : p.k - q.k; });
    if (!lines.length) lines = [{ x0: bb.x0, x1: bb.x1, y0: bb.y0, y1: bb.y1 }];
    return lines;
}

// ================================================================ rhythm / geometry

/* ---- beatRing — 拍の輪: rings breathing out from the centre on the beat. AE has no beat data: the beat is the cut's own rhythm
   (≈0.5 s, snapped so a whole number of beats fills the cut — cuts are beat-snapped when a BPM is set). */
jzReg('decor', 'beatRing', {
    back: true,
    build: function (ctx, bb, d) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc2_u(ctx), c = ctx.cut, k;
        var len = jzClamp(c.dur / Math.max(1, Math.round(c.dur / 0.5)), 0.3, 0.9);
        var r0 = Math.min(W, H) * 0.2, r1 = Math.sqrt(W * W + H * H) * 0.55;
        var col = d.accent ? sc.accent : sc.sub, base = d.accent ? 0.45 : 0.4, dashed = (d.v | 0) % 2 === 1;
        var S = jzShapeLayer(ctx, 'beat ring', W / 2, H / 2);
        var hd = 'var LEN=' + jzN(len) + ',sn=((time%LEN)+LEN)%LEN;' + DC2_CL + DC2_OC;
        for (k = 0; k < 3; k++) {
            var g = jzGrp(S, 'ring ' + (k + 1)), hk = hd + 'var p=(sn+' + k + '*LEN)/(LEN*3),r=' + jzN(r0) + '+' + jzN(r1 - r0) + '*oc(p);';
            var e = jzAddEllipse(g, r0 * 2, r0 * 2);
            jzSetExpr(e.property('ADBE Vector Ellipse Size'), hk + '[2*r,2*r]');
            var st = jzAddStroke(g, col, 2 * u, 100);
            jzSetExpr(st.property('ADBE Vector Stroke Opacity'), hk + jzN(base * 100) + '*Math.pow(Math.max(0,1-p),1.6)');
            if (dashed) {       // 48 dashes of 4° every 7.5°
                st.property('ADBE Vector Stroke Width').setValue(1.4 * u);
                var dg = dc2_dash(st, 10, 10);
                if (dg[0]) jzSetExpr(dg[0], hk + 'r*' + jzN(Math.PI * 2 * 4 / 360));
                if (dg[1]) jzSetExpr(dg[1], hk + 'r*' + jzN(Math.PI * 2 * 3.5 / 360));
            } else jzSetExpr(st.property('ADBE Vector Stroke Width'), hk + jzN(u) + '*(1+1.5*(1-p))');
        }
        var gc = jzGrp(S, 'pulse'), ec = jzAddEllipse(gc, r0 * 2, r0 * 2);
        jzSetExpr(ec.property('ADBE Vector Ellipse Size'), hd + 'var pl=Math.exp(-sn*9),r=' + jzN(r0) + '*(1+0.03*pl);[2*r,2*r]');
        var sp = jzAddStroke(gc, col, u, base * 60);      // after the ellipse is configured (the stroke invalidates ec)
        jzSetExpr(sp.property('ADBE Vector Stroke Width'), hd + jzN(u) + '*(1+2.2*Math.exp(-sn*9))');
        jzNoGhost(S);
        dc2_op(ctx, S, 'oc(time/0.4)');
    }
});

/* ---- orbitDots — 周回する点: a tilted orbit around the lyric drawn on, 2-4 dots with fading trails; the lyric hides whatever passes behind it */
jzReg('decor', 'orbitDots', {
    back: false,
    build: function (ctx, bb0, d) {
        var bb = dc2_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc2_u(ctx), i, k;
        var cx = bb.cx, cy = bb.cy, bw = bb.w, bh = bb.h, tall = bh > bw * 1.2, r = d.r == null ? 0.5 : d.r;
        var rx = tall ? Math.max(bw * 0.9, 50 * u) : Math.min(bw / 2 + 50 * u + bw * 0.08, W * 0.47);
        var ry = tall ? Math.min(bh / 2 + 50 * u + bh * 0.08, H * 0.47) : Math.max(bh * 0.9, 50 * u);
        var tilt = (r - 0.5) * 22 * Math.PI / 180, ct = Math.cos(tilt), st = Math.sin(tilt), th0 = r * Math.PI * 2;
        var S = jzShapeLayer(ctx, 'orbit', 0, 0), pts = [];
        // dots first (the first group is drawn on top), orbit hairline last
        var nd = 2 + (d.n | 0) % 3, dir = d.right ? 1 : -1;
        var PT = 'function pt(th){var x=Math.cos(th)*' + jzN(rx) + ',y=Math.sin(th)*' + jzN(ry) + ';return [' + jzN(cx) + '+x*' + jzN(ct) + '-y*' + jzN(st) + ',' + jzN(cy) + '+x*' + jzN(st) + '+y*' + jzN(ct) + '];}';
        var HD = dc2_hd(ctx, DC2_IC + DC2_IOC) + PT + 'var E=ioc(T/0.7);';
        for (k = 0; k < nd; k++) {
            var w = (0.35 + k * 0.22) * dir, sz = (k === 0 ? 5 : 3.2) * u, col = k === 0 ? sc.accent : sc.fg;
            var hk = HD + 'var th=' + jzN(th0 + k * Math.PI * 2 / nd) + '+T*' + jzN(w) + '*(1+2*ic(PO));';
            var gd = jzGrp(S, 'dot ' + (k + 1)), gh = dc2_sub(gd, 'head');
            jzAddEllipse(gh, sz * 2, sz * 2); jzAddFill(gh, col);
            dc2_gx(gh, 'ADBE Vector Position', hk + 'pt(th)');
            dc2_gx(gh, 'ADBE Vector Scale', hk + '[100*E,100*E]');
            for (i = 0; i < 5; i++) {      // trail: 5 short round-capped pieces, thinner and fainter behind the dot
                var f = 1 - (2 * i + 0.5) / 10, a1 = i * 0.09 * (w > 0 ? 1 : -1), a2 = (i + 1) * 0.09 * (w > 0 ? 1 : -1);
                var gt = dc2_sub(gd, 'trail ' + (i + 1)), L0 = 10;
                jzAddPath(gt, [[-L0 / 2, 0], [L0 / 2, 0]], false); dc2_stroke(gt, col, sz * 0.8 * f, 60 * f, true);
                var hs = hk + 'var p1=pt(th-(' + jzN(a1) + ')),p2=pt(th-(' + jzN(a2) + ')),dx=p2[0]-p1[0],dy=p2[1]-p1[1];';
                dc2_gx(gt, 'ADBE Vector Position', hs + '[(p1[0]+p2[0])/2,(p1[1]+p2[1])/2]');
                dc2_gx(gt, 'ADBE Vector Rotation', hs + 'Math.atan2(dy,dx)*180/Math.PI');
                dc2_gx(gt, 'ADBE Vector Scale', hs + '[Math.sqrt(dx*dx+dy*dy)/' + L0 + '*100,100]');
                dc2_gx(gt, 'ADBE Vector Group Opacity', hk + '100*E');
            }
        }
        for (i = 0; i <= 160; i++) { var th = th0 + i / 160 * Math.PI * 2, x = Math.cos(th) * rx, y = Math.sin(th) * ry; pts.push([cx + x * ct - y * st, cy + x * st + y * ct]); }
        var go = jzGrp(S, 'orbit');
        jzAddPath(go, pts, false); jzAddStroke(go, sc.sub, Math.max(1, u), 55);
        jzAddTrimPaths(go, DC2_CL + DC2_IOC + '100*ioc(time/0.7)');
        var pad = 8 * u; dc2_hole(S, bb.x0 - pad, bb.y0 - pad, bb.x1 + pad, bb.y1 + pad, 0);
        jzNoGhost(S);
        dc2_op(ctx, S);
    }
});

/* ---- constellation — 星座: stars joined by hairlines, drawn in sequence, beside the lyric (or in a free corner) */
jzReg('decor', 'constellation', {
    back: false,
    build: function (ctx, bb0, d) {
        var bb = dc2_bb(ctx, bb0), sc = ctx.sc, u = dc2_u(ctx), s = d.seed, i, j;
        var w = jzClamp(jzU(ctx) * 0.3, 190 * u, 340 * u), h = w * 0.62;
        var sp = d.corner ? dc2_corner(ctx, bb, w, h, d, 1) : dc2_near(ctx, bb, w, h, d, 30 * u), a = sp.ok ? 1 : 0.35;
        var n = 5 + (d.n | 0), cells = [], raw = [];
        for (i = 0; i < 12; i++) cells.push([i % 4, Math.floor(i / 4), dc2_r(s, i, 1)]);
        cells.sort(function (p, q) { return p[2] - q[2]; });
        for (i = 0; i < n; i++) raw.push([sp.x + w * (cells[i][0] + 0.5 + dc2_rs(s, i, 2) * 0.35) / 4, sp.y + h * (cells[i][1] + 0.5 + dc2_rs(s, i, 3) * 0.35) / 3]);
        raw.sort(function (p, q) { return p[0] - q[0]; });
        var pts = [raw.shift()];
        while (raw.length) {
            var q0 = pts[pts.length - 1], bi = 0, bd = 1e18;
            for (j = 0; j < raw.length; j++) { var dd = (raw[j][0] - q0[0]) * (raw[j][0] - q0[0]) + (raw[j][1] - q0[1]) * (raw[j][1] - q0[1]); if (dd < bd) { bd = dd; bi = j; } }
            pts.push(raw.splice(bi, 1)[0]);
        }
        var mid = pts[Math.floor(n / 2)], tip = [sp.x + w * dc2_rr(0.3, 0.7, s, 9), sp.y + h * (mid[1] - sp.y > h / 2 ? 0.08 : 0.92)];
        var S = jzShapeLayer(ctx, 'constellation', 0, 0), all = pts.concat([tip]);
        // stars (on top), then the lines
        for (i = 0; i < all.length; i++) {
            var p = all[i], rr = (dc2_r(s, i, 4) < 0.3 ? 3.6 : 2.2) * u, gs = jzGrp(S, 'star ' + (i + 1));
            var pop = DC2_CL + DC2_OB + 'var q=cl((time-' + jzN(i * 0.06) + ')/0.3),s=q<=0?0:ob(q,2);';
            if (rr > 3 * u && i % 2 === 0) {      // cross glint on the bigger stars, twinkling
                var gx = dc2_sub(gs, 'glint'), L = 11 * u;
                jzAddPath(gx, [[-L, 0], [L, 0]], false); jzAddPath(gx, [[0, -L], [0, L]], false); jzAddStroke(gx, sc.accent, Math.max(1, u));
                var tw = 'var tw=0.65+0.35*noise(time*2.5+' + jzN(i * 3 + (s % 97)) + ');';
                dc2_gx(gx, 'ADBE Vector Scale', tw + '[100*tw,100*tw]');
                dc2_gx(gx, 'ADBE Vector Group Opacity', pop + tw + 'q>0?100*tw:0');
            }
            var gd = dc2_sub(gs, 'dot'); jzAddEllipse(gd, rr * 2, rr * 2); jzAddFill(gd, sc.fg);
            dc2_gx(gd, 'ADBE Vector Scale', pop + '[100*s,100*s]');
            jzGX(gs).property('ADBE Vector Position').setValue(p);
        }
        var gl = jzGrp(S, 'lines'); jzAddPath(gl, pts, false); jzAddStroke(gl, sc.sub, Math.max(1, u), 70);
        jzAddTrimPaths(gl, DC2_CL + DC2_IOC + '100*ioc((time-0.1)/0.8)');
        var gb = jzGrp(S, 'branch'); jzAddPath(gb, [mid, tip], false); jzAddStroke(gb, sc.sub, Math.max(1, u), 70);
        jzAddTrimPaths(gb, DC2_CL + '100*cl((time-0.6)/0.4)');
        jzNoGhost(S);
        dc2_op(ctx, S, null, a * 100);
        var fs = dc2_fs(ctx) * 0.72;
        var lab = jzText(ctx, 'C-' + jzLineNo(ctx), { font: jzMonoF(ctx), size: fs, color: sc.sub, x: all[0][0] + 8 * u, y: all[0][1] - 12 * u, align: 'left', track: 0.08 });
        jzNoGhost(lab);
        dc2_op(ctx, lab, 'oe((time-0.5)/0.3)', a * 100);
    }
});

// ================================================================ particles & light

/* ---- confetti — 紙吹雪: tumbling paper bits drifting down around (never over) the lyric; they fall faster as the cut leaves */
jzReg('decor', 'confetti', {
    back: false,
    build: function (ctx, bb0, d) {
        var bb = dc2_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc2_u(ctx), s = d.seed, i;
        var N = Math.min(56, 26 + (d.n | 0) * 9), cols = [sc.accent, sc.accent2 || sc.fg, sc.fg, sc.sub || sc.fg];
        var S = jzShapeLayer(ctx, 'confetti', 0, 0), HD = dc2_hd(ctx, DC2_WR);
        for (i = 0; i < N; i++) {
            var w0 = (11 + dc2_r(s, i, 8) * 11) * u, h0 = w0 * (0.4 + dc2_r(s, i, 9) * 0.3), g = jzGrp(S, 'bit ' + (i + 1));
            jzAddRect(g, w0, h0); jzAddFill(g, cols[i % 4], 95);
            dc2_gx(g, 'ADBE Vector Position', HD + '[' + jzN(dc2_r(s, i, 4) * W) + '+Math.sin(T*' + jzN(1 + dc2_r(s, i, 5) * 1.8) + '+' + jzN(dc2_r(s, i, 6) * 6) + ')*' + jzN((10 + dc2_r(s, i, 7) * 30) * u) +
                ',wr(' + jzN(dc2_r(s, i, 3) * H) + '+' + jzN((70 + dc2_r(s, i, 2) * 110) * u) + '*(1+PO*PO*PO)*T,' + jzN(-40 * u) + ',' + jzN(H + 80 * u) + ')]');
            dc2_gx(g, 'ADBE Vector Rotation', 'time*' + jzN((dc2_r(s, i, 11) - 0.5) * 8 * 180 / Math.PI) + '+' + jzN(dc2_r(s, i, 10) * 360));
            dc2_gx(g, 'ADBE Vector Scale', DC2_CL + DC2_OB + 'var q=cl((time-' + jzN(dc2_r(s, i, 1) * 0.35) + ')/0.3),k=q<=0?0:ob(q,1.8),fl=Math.max(0.15,Math.abs(Math.cos(time*' +
                jzN(2 + dc2_r(s, i, 12) * 4) + '+' + jzN(dc2_r(s, i, 13) * 6) + ')));[100*k*fl,100*k]');
        }
        dc2_hole(S, bb.x0 - 16 * u, bb.y0 - 16 * u, bb.x1 + 16 * u, bb.y1 + 16 * u, 10 * u);
        jzNoGhost(S);
        dc2_op(ctx, S);
    }
});

/* ---- petals — 花びら: cherry petals tumbling diagonally on the wind, clear of the lyric */
var DC2_PETAL = [[0, -0.5], [0.16, -0.38], [0.3, -0.18], [0.36, 0.04], [0.32, 0.24], [0.22, 0.42], [0.1, 0.5], [0, 0.4], [-0.1, 0.5], [-0.22, 0.42], [-0.32, 0.24], [-0.36, 0.04], [-0.3, -0.18], [-0.16, -0.38]];
jzReg('decor', 'petals', {
    back: false,
    build: function (ctx, bb0, d) {
        var bb = dc2_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc2_u(ctx), s = d.seed, i;
        var N = Math.min(26, 10 + (d.n | 0) * 5), dir = d.right ? 1 : -1, colB = dc2_dark(ctx) ? sc.fg : (sc.sub || sc.fg);
        var S = jzShapeLayer(ctx, 'petals', 0, 0), HD = dc2_hd(ctx, DC2_WR);
        for (i = 0; i < N; i++) {
            var L0 = (24 + dc2_r(s, i, 8) * 20) * u, g = jzGrp(S, 'petal ' + (i + 1)), a = dc2_r(s, i, 13) < 0.7;
            jzAddPath(g, dc2_pts(DC2_PETAL, L0), true); jzAddFill(g, a ? sc.accent : colB, a ? 90 : 85);
            dc2_gx(g, 'ADBE Vector Position', HD + '[wr(' + jzN(dc2_r(s, i, 4) * W) + '+' + jzN(dir * (30 + dc2_r(s, i, 3) * 50) * u) + '*T+Math.sin(T*' + jzN(0.8 + dc2_r(s, i, 5)) + '+' + jzN(dc2_r(s, i, 6) * 6) + ')*' + jzN(30 * u) +
                ',' + jzN(-60 * u) + ',' + jzN(W + 120 * u) + '),wr(' + jzN(dc2_r(s, i, 7) * H) + '+' + jzN((40 + dc2_r(s, i, 2) * 60) * u) + '*T,' + jzN(-60 * u) + ',' + jzN(H + 120 * u) + ')]');
            dc2_gx(g, 'ADBE Vector Rotation', 'time*' + jzN((dc2_r(s, i, 10) - 0.5) * 3 * 180 / Math.PI) + '+' + jzN(dc2_r(s, i, 9) * 360));
            dc2_gx(g, 'ADBE Vector Scale', DC2_CL + DC2_OC + 'var q=oc((time-' + jzN(dc2_r(s, i, 1) * 0.4) + ')/0.35),fx=Math.max(0.2,Math.abs(Math.cos(time*' +
                jzN(1.2 + dc2_r(s, i, 11) * 2) + '+' + jzN(dc2_r(s, i, 12) * 6) + ')));[100*q*fx,100*q]');
        }
        dc2_hole(S, bb.x0 - 18 * u, bb.y0 - 18 * u, bb.x1 + 18 * u, bb.y1 + 18 * u, 12 * u);
        jzNoGhost(S);
        dc2_op(ctx, S);
    }
});

/* ---- rainStreaks — 雨の筋: fine slanted streaks in three depths falling behind the lyric */
jzReg('decor', 'rainStreaks', {
    back: true,
    build: function (ctx, bb, d) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc2_u(ctx), s = d.seed, i, b, dk = dc2_dark(ctx);
        var N = Math.min(110, 60 + (d.n | 0) * 16), sl = (d.right ? 1 : -1) * (8 + (d.r || 0) * 10) * Math.PI / 180, tn = Math.tan(sl);
        var S = jzShapeLayer(ctx, 'rain', 0, 0), HD = dc2_hd(ctx, DC2_WR), g;
        var col = dk ? (sc.sub || sc.fg) : sc.fg, k = dk ? 1 : 0.75, ws = [Math.max(1, 0.9 * u), Math.max(1, 1.2 * u), 1.6 * u], as = [18, 30, 46];
        // one depth band at a time (rain 3, 2, 1 — same stacking as before), each filled completely before the next band is
        // added to the contents (a new sibling group invalidates references to the earlier bands)
        for (b = 2; b >= 0; b--) {
            var band = jzGrp(S, 'rain ' + (b + 1));
            for (i = 0; i < N; i++) {
                var z = dc2_r(s, i, 1); if ((z < 0.4 ? 0 : z < 0.8 ? 1 : 2) !== b) continue;
                var v = (1200 + z * 1300) * u, len = (36 + z * 80) * u, span = H + len + 80 * u;
                var x0 = dc2_r(s, i, 3) * (W + H * Math.abs(tn)) - (tn > 0 ? H * tn : 0);
                g = dc2_sub(band, 'streak ' + (i + 1));
                jzAddPath(g, [[0, 0], [len * tn, len]], false);
                dc2_gx(g, 'ADBE Vector Position', HD + 'var y=wr(' + jzN(dc2_r(s, i, 2) * span) + '+' + jzN(v) + '*T,' + jzN(-len - 40 * u) + ',' + jzN(span) + ');[' + jzN(x0) + '+y*' + jzN(tn) + ',y]');
            }
            jzAddStroke(band, col, ws[b], as[b] * k);
        }
        jzNoGhost(S);
        dc2_op(ctx, S, 'oc(time/0.45)');
    }
});

/* ---- snow — 雪: soft flakes in three depths, gently swaying (under the lyric) */
jzReg('decor', 'snow', {
    back: true,
    build: function (ctx, bb, d) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc2_u(ctx), s = d.seed, i, dk = dc2_dark(ctx);
        var N = Math.min(90, 46 + (d.n | 0) * 14), col = dk ? sc.fg : (sc.sub || sc.fg), k = dk ? 1 : 0.55, dir = d.right ? 1 : -1;
        var S = jzShapeLayer(ctx, 'snow', 0, 0), HD = dc2_hd(ctx, DC2_WR);
        for (i = 0; i < N; i++) {
            var z = dc2_r(s, i, 1), lay = z < 0.5 ? 0 : z < 0.85 ? 1 : 2, rad = [2, 3.4, 5.6][lay] * u * (0.8 + dc2_r(s, i, 2) * 0.4);
            var vy = (22 + lay * 22 + dc2_r(s, i, 3) * 14) * u, g = jzGrp(S, 'flake ' + (i + 1));
            var gd = dc2_sub(g, 'dot'); jzAddEllipse(gd, rad * 2, rad * 2); jzAddFill(gd, col, [35, 55, 75][lay] * k);
            if (lay) { var gh = dc2_sub(g, 'halo'); jzAddEllipse(gh, rad * 4.4, rad * 4.4); jzAddFill(gh, col, 8 * k); }
            dc2_gx(g, 'ADBE Vector Position', HD + '[wr(' + jzN(dc2_r(s, i, 5) * W) + '+Math.sin(T*' + jzN(0.6 + dc2_r(s, i, 6)) + '+' + jzN(dc2_r(s, i, 7) * 6) + ')*' + jzN((8 + lay * 10) * u) + '+' + jzN(dir * 8 * u) + '*T,' +
                jzN(-10 * u) + ',' + jzN(W + 20 * u) + '),wr(' + jzN(dc2_r(s, i, 4) * H) + '+' + jzN(vy) + '*T,' + jzN(-10 * u) + ',' + jzN(H + 20 * u) + ')]');
        }
        jzNoGhost(S);
        dc2_op(ctx, S, 'oc(time/0.5)');
    }
});

/* ---- lightLeak — 光漏れ: soft warm light breathing in from a screen edge (screen on dark schemes, multiply on light ones).
   The browser's radial gradients are solids with a big feathered elliptical mask; the optional beam is a feathered band. */
function dc2_glow(ctx, name, col, x, y, R, alpha, dy, blend) {
    var W = ctx.W, H = ctx.H, SW = W * 1.6, SH = H * 1.6, ox = (W - SW) / 2, oy = (H - SH) / 2;
    var L = ctx.comp.layers.addSolid(jzHex(col), name, Math.round(SW), Math.round(SH), 1, ctx.comp.duration);
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
    m.property('ADBE Mask Shape').setValue(jzCircleShape(x - ox, y - oy, R * 0.4));    // radial falloff ≈ disc + feather
    m.property('ADBE Mask Feather').setValue([R * 0.5, R * 0.5]);
    jzXf(L, 'ADBE Position').setValue([W / 2, H / 2]);
    if (dy) jzSetExpr(jzXf(L, 'ADBE Position'), '[value[0],value[1]+time*' + jzN(dy) + ']');
    L.blendingMode = blend;
    jzNoGhost(L);
    return L;
}
jzReg('decor', 'lightLeak', {
    back: true,
    build: function (ctx, bb, d) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc2_u(ctx), s = d.seed, dk = dc2_dark(ctx);
        function pick(c) { return c && (dk ? jzLum(c) > 0.2 : jzLum(c) < 0.85) ? c : null; }
        var c1 = pick(sc.accent) || pick(sc.accent2) || sc.sub || sc.fg, c2 = pick(sc.accent2) || c1;
        var sx = d.right ? 1 : -1, sy = d.low ? 1 : -1, M = Math.max(W, H), A = dk ? 0.5 : 0.28, dr = 18 * u * (d.corner ? 1 : -1);
        var blend = dk ? BlendingMode.SCREEN : BlendingMode.MULTIPLY, r = d.r == null ? 0.5 : d.r;
        var br = 'oc(time/0.6)*(0.85+0.15*Math.sin(time*1.4+' + jzN(r * 6) + '))';
        var L1 = dc2_glow(ctx, 'light leak', c1, (sx > 0 ? W : 0) + sx * M * 0.05, (sy > 0 ? H * 0.95 : H * 0.05), M * dc2_rr(0.42, 0.6, s, 1), A, dr, blend);
        dc2_op(ctx, L1, br, A * 115);
        var L2 = dc2_glow(ctx, 'light leak 2', c2, (sx > 0 ? W : 0) - sx * M * 0.02, H * dc2_rr(0.3, 0.7, s, 2), M * dc2_rr(0.22, 0.32, s, 3), A * 0.8, -dr, blend);
        dc2_op(ctx, L2, br, A * 92);
        if ((d.v | 0) % 2) {        // a slanted beam
            var w = W * 0.12, B = ctx.comp.layers.addSolid(jzHex(c1), 'light beam', Math.round(w * 6), Math.round(H * 2.2), 1, ctx.comp.duration);
            var bw = w * 6, bh = H * 2.2, m = B.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
            sh.vertices = [[bw / 2 + w * 0.35, -bh], [bw / 2 + w * 0.35, bh * 2], [bw / 2 - w * 0.35, bh * 2], [bw / 2 - w * 0.35, -bh]]; sh.closed = true;
            m.property('ADBE Mask Shape').setValue(sh); m.property('ADBE Mask Feather').setValue([w * 1.3, w * 1.3]);
            jzXf(B, 'ADBE Position').setValue([sx > 0 ? W * 0.82 : W * 0.18, H / 2]);
            jzXf(B, 'ADBE Rotate Z').setValue(sx * 14);
            jzSetExpr(jzXf(B, 'ADBE Position'), 'var a=' + jzN(sx * 14 * Math.PI / 180) + ',o=time*' + jzN(dr * 0.5) + ';[value[0]+o*Math.cos(a),value[1]+o*Math.sin(a)]');
            B.blendingMode = blend; jzNoGhost(B);
            dc2_op(ctx, B, br, A * 50);
        }
    }
});

/* ---- bokeh — ボケ玉: out-of-focus light discs (or aperture hexagons) pulling into focus, drifting up */
jzReg('decor', 'bokeh', {
    back: true,
    build: function (ctx, bb, d) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc2_u(ctx), s = d.seed, i, k, dk = dc2_dark(ctx);
        var N = Math.min(18, 8 + (d.n | 0) * 3), hex = (d.v | 0) % 2 === 1, M = Math.min(W, H), cols = [sc.accent, sc.accent2 || sc.fg, sc.fg];
        var S = jzShapeLayer(ctx, 'bokeh', 0, 0), HD = dc2_hd(ctx, DC2_WR);
        for (i = 0; i < N; i++) {
            var R0 = M * (0.025 + dc2_r(s, i, 2) * dc2_r(s, i, 2) * 0.075), c = cols[i % 3], al = (dk ? 0.06 + dc2_r(s, i, 7) * 0.1 : 0.05 + dc2_r(s, i, 7) * 0.07);
            var g = jzGrp(S, 'disc ' + (i + 1));
            if (hex) { var hp = []; for (k = 0; k < 6; k++) { var an = (k * 60 + 15) * Math.PI / 180; hp.push([Math.cos(an) * R0, Math.sin(an) * R0]); } jzAddPath(g, hp, true); }
            else jzAddEllipse(g, R0 * 2, R0 * 2);
            jzAddStroke(g, c, 1.6 * u, Math.min(100, al * 130)); jzAddFill(g, c, al * 100);
            var f = DC2_OC + 'var f=oc((T-' + jzN(dc2_r(s, i, 1) * 0.4) + ')/0.6);';
            dc2_gx(g, 'ADBE Vector Position', HD + '[' + jzN(dc2_r(s, i, 3) * W) + '+Math.sin(T*0.5+' + jzN(dc2_r(s, i, 4) * 6) + ')*' + jzN(14 * u) + ',wr(' + jzN(dc2_r(s, i, 5) * H) + '-T*' + jzN((6 + dc2_r(s, i, 6) * 12) * u) + ',' + jzN(-R0) + ',' + jzN(H + R0 * 2) + ')]');
            dc2_gx(g, 'ADBE Vector Scale', HD + f + 'var k=1.5-0.5*f;[100*k,100*k]');
            dc2_gx(g, 'ADBE Vector Group Opacity', HD + f + '100*f');
        }
        jzNoGhost(S);
        dc2_op(ctx, S);
    }
});

/* ---- speedCorner — 集中線: manga speed lines rushing in from the edges, stopping short of the lyric, flickering in length */
function dc2_superR(a, b, p, th) { var c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th)); return 1 / Math.pow(Math.pow(c / a, p) + Math.pow(s / b, p), 1 / p); }
jzReg('decor', 'speedCorner', {
    back: false,
    build: function (ctx, bb0, d) {
        var bb = dc2_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc2_u(ctx), s = d.seed, i;
        var cx = bb.cx, cy = bb.cy, pad = 30 * u + bb.h * 0.2, A = bb.w / 2 * 1.1 + pad, B = bb.h / 2 * 1.15 + pad;
        var N = Math.min(150, 80 + (d.n | 0) * 22), corners = !!d.corner;
        var S = jzShapeLayer(ctx, 'speed lines', 0, 0), GL = jzGrp(S, 'lines'), HD = dc2_hd(ctx, DC2_OE + DC2_IC + DC2_HH) + 'var st=Math.floor(T*12);';
        for (i = 0; i < N; i++) {
            var th = dc2_r(s, i, 1) * Math.PI * 2;
            if (corners) { var q = Math.floor(dc2_r(s, i, 2) * 4), base = Math.atan2((q < 2 ? -1 : 1) * H, (q % 2 ? 1 : -1) * W); th = base + (dc2_r(s, i, 3) - 0.5) * 0.7; }
            var c = Math.cos(th), sn = Math.sin(th);
            var tx = c > 0 ? (W + 4 - cx) / c : c < 0 ? (-4 - cx) / c : 1e9, ty = sn > 0 ? (H + 4 - cy) / sn : sn < 0 ? (-4 - cy) / sn : 1e9;
            var dEdge = Math.min(tx, ty), sr = dc2_superR(A, B, 4, th), dIn = sr + 20 * u + dc2_r(s, i, 4) * 0.35 * Math.max(0, dEdge - sr);
            if (dEdge - dIn < 30 * u) continue;
            var wd = (1.2 + dc2_r(s, i, 6) * 4.5) * u, Lm = dEdge - dIn, g = dc2_sub(GL, 'line ' + (i + 1));
            jzAddPath(g, [[0, -wd], [0, wd], [Lm, 0]], true);
            jzGX(g).property('ADBE Vector Position').setValue([cx + c * dEdge, cy + sn * dEdge]);
            jzGX(g).property('ADBE Vector Rotation').setValue(th * 180 / Math.PI + 180);
            dc2_gx(g, 'ADBE Vector Scale', HD + 'var e=oe((T-' + jzN(dc2_r(s, i, 5) * 0.15) + ')/0.3),j=0.85+0.15*hh(' + jzN((s % 9973) + i * 7.31) + '+st*1.37);[100*e*j*(1-ic(PO)),100]');
        }
        jzAddFill(GL, dc2_dark(ctx) ? sc.fg : (sc.ink || sc.fg));
        jzNoGhost(S);
        dc2_op(ctx, S, null, 80);
    }
});

/* ---- risingParticles — 立ち上る粒: embers / motes rising and swaying, fading in and out over the height (under the lyric) */
jzReg('decor', 'risingParticles', {
    back: true,
    build: function (ctx, bb, d) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc2_u(ctx), s = d.seed, i;
        var N = Math.min(54, 24 + (d.n | 0) * 10), shape = (d.v | 0) % 3, col = d.accent || shape === 1 ? sc.accent : (dc2_dark(ctx) ? sc.fg : (sc.sub || sc.fg));
        var S = jzShapeLayer(ctx, 'rising particles', 0, 0), HD = dc2_hd(ctx, DC2_WR), lw = Math.max(1, u), sw = 14 * u;
        for (i = 0; i < N; i++) {
            var vy = (40 + dc2_r(s, i, 1) * 90) * u, span = H + 120 * u, ph = dc2_r(s, i, 5) * 6, f = 0.7 + dc2_r(s, i, 4), sz = (1.6 + dc2_r(s, i, 6) * 2.6) * u, tl = vy * 0.28;
            var hk = HD + 'var y=' + jzN(H + 60 * u) + '-wr(' + jzN(dc2_r(s, i, 2) * span) + '+' + jzN(vy) + '*T,0,' + jzN(span) + '),w=T*' + jzN(f) + '+' + jzN(ph) + ';';
            var g = jzGrp(S, 'mote ' + (i + 1));
            var gh = dc2_sub(g, 'head');
            if (shape === 2) jzAddPath(gh, [[0, -sz * 1.6], [sz, 0], [0, sz * 1.6], [-sz, 0]], true); else jzAddEllipse(gh, sz * 2, sz * 2);
            jzAddFill(gh, col);
            var gt = dc2_sub(g, 'trail'); jzAddPath(gt, [[0, 0], [0, tl]], false); dc2_stroke(gt, col, lw, 31, true);
            jzGX(gt).property('ADBE Vector Position').setValue([0, sz * 1.5]);
            dc2_gx(gt, 'ADBE Vector Rotation', hk + 'Math.atan2(Math.cos(w)*' + jzN(f * sw) + ',' + jzN(vy) + ')*180/Math.PI');
            if (sz > 3 * u) { var gg = dc2_sub(g, 'glow'); jzAddEllipse(gg, sz * 6.4, sz * 6.4); jzAddFill(gg, col, 8); }
            dc2_gx(g, 'ADBE Vector Position', hk + '[' + jzN(dc2_r(s, i, 3) * W) + '+Math.sin(w)*' + jzN(sw) + ',y]');
            dc2_gx(g, 'ADBE Vector Group Opacity', hk + 'var p=cl(1-y/' + jzN(H) + '),fd=Math.pow(Math.sin(Math.PI*p),0.7);fd<=0.05?0:100*(0.2+0.65*fd)');
        }
        jzNoGhost(S);
        dc2_op(ctx, S, 'oc(time/0.45)');
    }
});

/* ---- twinkle — きらめき: four-point glints twinkling just outside the lyric's box */
jzReg('decor', 'twinkle', {
    back: false,
    build: function (ctx, bb0, d) {
        var bb = dc2_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc2_u(ctx), s = d.seed, i;
        var K = Math.min(7, 3 + (d.n | 0) + (d.big ? 1 : 0)), pad = 16 * u + bb.h * 0.12;
        var X0 = bb.x0 - pad, X1 = bb.x1 + pad, Y0 = bb.y0 - pad, Y1 = bb.y1 + pad, per = 2 * (X1 - X0 + Y1 - Y0), S = null;
        for (i = 0; i < K; i++) {
            var p = dc2_perim(X0, Y0, X1, Y1, (i + dc2_r(s, i, 1) * 0.6) / K * per);
            var x = jzClamp(p[0] + dc2_rs(s, i, 2) * 14 * u, 16 * u, W - 16 * u), y = jzClamp(p[1] + dc2_rs(s, i, 3) * 14 * u, 16 * u, H - 16 * u);
            if (dc2_clear(bb, x, y, 4 * u, 1) < 1) continue;
            if (!S) S = jzShapeLayer(ctx, 'twinkle', 0, 0);
            var R = (i === 0 ? 30 : 13 + dc2_r(s, i, 4) * 12) * u, g = jzGrp(S, 'glint ' + (i + 1)), L = R * 1.9;
            var gf = dc2_sub(g, 'star'); jzAddPath(gf, dc2_glint(R, R * 0.2), true); jzAddFill(gf, i % 3 === 0 ? sc.accent : sc.fg);
            var gl = dc2_sub(g, 'rays'); jzAddPath(gl, [[-L, 0], [L, 0]], false); jzAddPath(gl, [[0, -L], [0, L]], false); jzAddStroke(gl, sc.fg, Math.max(1, 0.9 * u), 50);
            jzGX(g).property('ADBE Vector Position').setValue([x, y]);
            var st = dc2_r(s, i, 6) * 0.3, cyc = 1.3 + dc2_r(s, i, 5) * 0.8;
            dc2_gx(g, 'ADBE Vector Scale', jzTH(ctx) + 'var ph=(((time-' + jzN(st) + ')/' + jzN(cyc) + '+' + jzN(dc2_r(s, i, 7)) + ')%1+1)%1,q=cl((time-' + jzN(st) + ')/0.3),it=q<=0?0:ob(q,2);' +
                'var k=Math.min(it,time>0.6?0.25+0.75*Math.pow(Math.sin(Math.PI*ph),2):it)*K;[100*k,100*k]');
        }
        if (!S) return;
        jzNoGhost(S);
        dc2_op(ctx, S);
    }
});

// ================================================================ hand-drawn

/* ---- brushStroke — 筆の払い: a dry-brush sweep with bristle streaks and a tapering flick, painted across (under the lyric) */
jzReg('decor', 'brushStroke', {
    back: true,
    build: function (ctx, bb, d) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc2_u(ctx), s = d.seed, v = (d.v | 0) % 3, i, j, k;
        // colour + opacity chosen so the lyric (sc.fg) keeps >= 3:1 contrast on top of the stroke
        var cands = v === 1 ? [sc.dim, sc.accent2, sc.sub] : [sc.accent, sc.accent2, sc.ghostA, sc.ghostB, sc.sub, sc.dim], col = null, al = 0;
        for (i = 0; i < cands.length && !col; i++) {
            var c = cands[i]; if (!c || jzContrast(c, sc.bg) < 1.15) continue;
            for (var a = v === 1 ? 0.9 : 0.55; a >= 0.2; a -= 0.07) if (jzContrast(jzMixHex(sc.bg, c, a), sc.fg) >= 3) { col = c; al = a; break; }
        }
        if (!col) return;
        var T = jzU(ctx) * dc2_rr(0.11, 0.16, s, 1), yc = H * 0.5 + (d.low ? 1 : -1) * H * dc2_rr(0, 0.05, s, 2) + (W < H ? 0 : T * 0.1);
        var ltr = !!d.right, xa = W * dc2_rr(0.06, 0.16, s, 3), xb = W * dc2_rr(0.84, 0.95, s, 4), tilt = dc2_rs(s, 5) * T * 0.35, bow = dc2_rs(s, 6) * T * 0.25;
        var K = 22, SN = 26, S = jzShapeLayer(ctx, 'brush stroke', 0, 0), hairs = [[], []], bn, band;
        var HEAD = DC2_CL + 'var h=1-Math.pow(1-cl(time/0.5),3);';
        // hairs are collected per band first; each band group is then filled completely before the next one is added
        // (a new sibling group invalidates references to the earlier band)
        for (j = 0; j < K; j++) {
            var f = j / (K - 1) - 0.5, edge = Math.abs(f) * 2;
            var t0 = dc2_r(s, j, 1) * 0.05 + edge * edge * 0.06, t1 = 1 - edge * dc2_rr(0.12, 0.4, s, j, 2) - dc2_r(s, j, 3) * 0.06;
            if (t1 <= t0) continue;
            var gapAt = dc2_r(s, j, 4) < 0.45 ? dc2_rr(0.55, 0.9, s, j, 5) : 2, gapL = 0.03 + dc2_r(s, j, 6) * 0.05;
            var pieces = gapAt < t1 ? [[t0, Math.min(gapAt, t1)], [gapAt + gapL, t1]] : [[t0, t1]];
            bn = edge > 0.6 || dc2_r(s, j, 7) < 0.3 ? 1 : 0;
            for (k = 0; k < pieces.length; k++) {
                var ta = pieces[k][0], tb = pieces[k][1]; if (tb - ta < 0.01) continue;
                var m = Math.max(3, Math.round(SN * (tb - ta))), pts = [];
                for (i = 0; i <= m; i++) {
                    var t = ta + (tb - ta) * i / m, tt = ltr ? t : 1 - t, taper = 1 - Math.pow(t, 3) * 0.55;
                    pts.push([jzLerp(xa, xb, tt), yc + tilt * (tt - 0.5) + bow * Math.sin(tt * Math.PI) + f * T * taper + dc2_rs(s, j, Math.round(t * SN), 8) * 0.8 * u]);
                }
                hairs[bn].push({ name: 'hair ' + (j + 1) + '.' + (k + 1), pts: pts, ta: ta, tb: tb });
            }
        }
        for (bn = 0; bn < 2; bn++) {
            band = jzGrp(S, bn ? 'bristles fine' : 'bristles');
            for (k = 0; k < hairs[bn].length; k++) {
                var hr = hairs[bn][k], g = dc2_sub(band, hr.name);
                jzAddPath(g, hr.pts, false);
                jzAddTrimPaths(g, HEAD + '100*cl((h-' + jzN(hr.ta) + ')/' + jzN(hr.tb - hr.ta) + ')');
            }
            dc2_stroke(band, col, T / K * (bn ? 1.3 : 2.2), al * 100, true);
        }
        jzNoGhost(S);
        dc2_op(ctx, S);
    }
});

/* ---- tapePieces — マスキングテープ: translucent torn-edged tape pinning the lyric's corners (printed stripes on most) */
jzReg('decor', 'tapePieces', {
    back: false,
    build: function (ctx, bb0, d) {
        var bb = dc2_bb(ctx, bb0), sc = ctx.sc, u = dc2_u(ctx), s = d.seed, i, k, r = d.r == null ? 0.5 : d.r;
        var Lt = jzClamp(jzU(ctx) * 0.115, 90 * u, 150 * u) * (0.9 + r * 0.2), Ht = Lt * 0.4, v = (d.v | 0) % 3;
        var cs = d.big ? [[-1, -1], [1, -1], [1, 1], [-1, 1]] : d.right ? [[1, -1], [-1, 1]] : [[-1, -1], [1, 1]];
        var col = [sc.accent2 && jzContrast(sc.accent2, sc.bg) > 1.6 ? sc.accent2 : (sc.sub || sc.fg), sc.accent, sc.sub || sc.fg][v];
        var S = jzShapeLayer(ctx, 'tape', 0, 0), hl = Lt / 2, hh = Ht / 2;
        for (k = 0; k < cs.length; k++) {
            var sx = cs[k][0], sy = cs[k][1], X = sx < 0 ? bb.x0 : bb.x1, Y = sy < 0 ? bb.y0 : bb.y1;
            var g = jzGrp(S, 'tape ' + (k + 1)), pts = [];
            if (v !== 1) {           // printed diagonal stripes, clipped to the tape (computed here: shape groups can't clip)
                var gs = dc2_sub(g, 'stripes'), xa = -hl + 3 * u, xb = hl - 3 * u;
                for (var x = -hl - Ht; x < hl + Ht; x += 9 * u) {
                    var s0 = jzClamp((xa - x) / Ht, 0, 1), s1 = jzClamp((xb - x) / Ht, 0, 1);
                    if (s1 - s0 > 0.02) jzAddPath(gs, [[x + Ht * s0, hh - Ht * s0], [x + Ht * s1, hh - Ht * s1]], false);
                }
                jzAddStroke(gs, dc2_dark(ctx) ? sc.bg : sc.fg, 2 * u, 14);
            }
            for (i = 0; i <= 5; i++) pts.push([-hl + (i % 2 ? 3 : 0) * u + dc2_rs(s, k, i, 2) * 2 * u, -hh + i / 5 * Ht]);
            for (i = 5; i >= 0; i--) pts.push([hl - (i % 2 ? 3 : 0) * u + dc2_rs(s, k, i, 3) * 2 * u, -hh + i / 5 * Ht]);
            var gp = dc2_sub(g, 'paper'); jzAddPath(gp, pts, true); jzAddFill(gp, col, 62);
            jzGX(g).property('ADBE Vector Position').setValue([X + sx * Ht * 0.55, Y + sy * Ht * 0.55]);
            var hd = DC2_CL + DC2_OC + 'var eq=oc((time-' + jzN(0.08 + k * 0.1) + ')/0.25);';
            dc2_gx(g, 'ADBE Vector Rotation', hd + jzN(-sx * sy * 40 + dc2_rs(s, k, 1) * 10) + '+(1-eq)*' + jzN(10 * sx));
            dc2_gx(g, 'ADBE Vector Scale', hd + 'var k=1+0.2*(1-eq);[100*k,100*k]');
            dc2_gx(g, 'ADBE Vector Group Opacity', hd + '100*eq');
        }
        jzNoGhost(S);
        dc2_op(ctx, S);
    }
});

/* ---- scribbleCircle — 手描きの囲み: a loose hand-drawn loop around the lyric, drawn on */
function dc2_handLoop(ctx, bb, d, turns) {
    var W = ctx.W, H = ctx.H, u = dc2_u(ctx), s = d.seed, pad = 14 * u + Math.min(bb.w, bb.h) * 0.08, i;
    var hw = bb.w / 2, hh = bb.h / 2, cx = bb.cx, cy = bb.cy;
    var lx = Math.max(hw * 0.9, Math.min(cx, W - cx) - 10 * u), ly = Math.max(hh * 0.9, Math.min(cy, H - cy) - 10 * u);
    var A = Math.min(hw * 1.22 + pad, lx), B = Math.min(hh * 1.22 + pad, ly);
    if ((hw / A) * (hw / A) + (hh / B) * (hh / B) > 1) {
        if (A < hw * 1.22 + pad) B = Math.min(ly, hh / Math.sqrt(Math.max(0.06, 1 - (hw / A) * (hw / A))) * 0.96 + pad * 0.3);
        else A = Math.min(lx, hw / Math.sqrt(Math.max(0.06, 1 - (hh / B) * (hh / B))) * 0.96 + pad * 0.3);
    }
    var th0 = (d.right ? -0.3 : 0.3) * Math.PI - Math.PI / 2, dir = d.right ? 1 : -1, M = 140, pts = [], tilt = dc2_rs(s, 1) * 2 * Math.PI / 180;
    for (i = 0; i <= M; i++) {
        var t = i / M, th = th0 + dir * t * turns * Math.PI * 2;
        var k = 1 + 0.03 * dc2_noise(t * 6 + (s % 97), s) + 0.05 * Math.max(0, t * turns - 0.85);
        var x = Math.cos(th) * A * k, y = Math.sin(th) * B * k;
        pts.push([cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)]);
    }
    return pts;
}
jzReg('decor', 'scribbleCircle', {
    back: false,
    build: function (ctx, bb0, d) {
        var bb = dc2_bb(ctx, bb0), sc = ctx.sc, u = dc2_u(ctx);
        var pts = dc2_handLoop(ctx, bb, d, (d.v | 0) % 2 ? 1.85 : 1.12);
        var S = jzShapeLayer(ctx, 'scribble loop', 0, 0), g = jzGrp(S, 'loop');
        jzAddPath(g, pts, false);
        dc2_stroke(g, d.accent || !dc2_dark(ctx) ? sc.accent : sc.fg, 3 * u, 95, true);
        jzAddTrimPaths(g, DC2_CL + DC2_IOC + '100*ioc((time-0.05)/0.6)');
        jzNoGhost(S);
        dc2_op(ctx, S);
    }
});

/* ---- scribbleUnder — 手描き下線: a hand-drawn underline — double swipe, wavy line or zig-zag scribble (beside vertical text) */
jzReg('decor', 'scribbleUnder', {
    back: false,
    build: function (ctx, bb0, d) {
        var bb = dc2_bb(ctx, bb0), sc = ctx.sc, u = dc2_u(ctx), s = d.seed, v = (d.v | 0) % 3, i, k;
        var vert = bb.h > bb.w * 1.3, L0 = vert ? bb.y0 : bb.x0, L1 = vert ? bb.y1 : bb.x1, len = L1 - L0;
        var base = vert ? bb.x1 + 14 * u + bb.w * 0.1 : bb.y1 + 14 * u + bb.h * 0.14;
        function mp(a, c) { return vert ? [base + c, a] : [a, base + c]; }
        function nz(t, k2) { return dc2_noise(t * 3 + k2 * 7, s) * 3 * u; }
        var strokes = [], t, x;
        if (v === 0) {
            var s1 = [], s2 = [];
            for (i = 0; i <= 24; i++) { t = i / 24; s1.push(mp(L0 - 8 * u + (len + 16 * u) * t, Math.sin(t * Math.PI) * 5 * u + nz(t, 1) - t * 4 * u)); }
            for (i = 0; i <= 16; i++) { t = i / 16; s2.push(mp(L0 + len * 0.18 + len * 0.78 * t, 11 * u + Math.sin(t * Math.PI) * 4 * u + nz(t, 2))); }
            strokes.push(s1, s2);
        } else if (v === 1) {
            var sw = [], lam = jzClamp(len / 22, 30 * u, 64 * u);
            for (x = 0; x <= len + 0.1; x += 5 * u) sw.push(mp(L0 + x, Math.sin(x / lam * Math.PI * 2) * 5 * u + nz(x / len, 3)));
            strokes.push(sw);
        } else {
            var sz = [];
            for (i = 0; i <= 5; i++) { t = i / 5; sz.push(mp(L0 + (i % 2 ? len * 0.96 : len * 0.04) + dc2_rs(s, i, 4) * 8 * u, t * 14 * u + nz(t, 5))); }
            strokes.push(sz);
        }
        var col = d.accent || !dc2_dark(ctx) ? sc.accent : sc.fg, S = jzShapeLayer(ctx, 'scribble underline', 0, 0);
        for (k = 0; k < strokes.length; k++) {
            var g = jzGrp(S, 'stroke ' + (k + 1));
            jzAddPath(g, strokes[k], false); dc2_stroke(g, col, (k ? 2.6 : 3.4) * u, 95, true);
            jzAddTrimPaths(g, DC2_CL + DC2_IOC + '100*ioc((time-' + jzN(0.05 + k * 0.28) + ')/' + (v === 2 ? '0.55' : '0.35') + ')');
        }
        jzNoGhost(S);
        dc2_op(ctx, S);
    }
});

/* ---- crossOut — 推敲の走り書き: a small "draft" word beside the lyric, struck out by hand, with a hand-drawn arrow to the lyric */
jzReg('decor', 'crossOut', {
    back: false,
    build: function (ctx, bb0, d) {
        var bb = dc2_bb(ctx, bb0), sc = ctx.sc, u = dc2_u(ctx), c = ctx.cut, i, k;
        var arr = jzChars(jzStrip(c.text)); if (arr.length < 1) return;
        var w0 = jzStrip((c.words && c.words[0]) || ''), n0 = jzChars(w0).length;
        var word = n0 >= 2 && n0 <= 4 ? w0 : arr.slice(0, Math.min(arr.length, 2 + (d.v | 0) % 3)).join('');
        var fs = jzClamp(bb.h * 0.3, 22 * u, 46 * u);
        var T = jzText(ctx, word, { font: jzSerifF(ctx), size: fs, color: sc.sub || sc.fg, x: 0, y: 0, align: 'center', track: 0.1 });
        var tw = jzSize(T)[0];
        var sp = dc2_near(ctx, bb, tw + 24 * u, fs * 1.8, { right: d.right, low: false, corner: d.corner, v: d.v }, 16 * u);
        var cx = sp.cx, cy = sp.cy, a = sp.ok ? 1 : 0.4;
        jzXf(T, 'ADBE Position').setValue([cx, cy]);
        jzNoGhost(T); dc2_op(ctx, T, 'oe(time/0.2)', a * 100);
        var x0 = cx - tw / 2 - 6 * u, x1 = cx + tw / 2 + 6 * u, strikes = [], z = [];
        if ((d.v | 0) % 2) strikes = [[[x0, cy - fs * 0.05], [x1, cy - fs * 0.12]], [[x0 + 4 * u, cy + fs * 0.1], [x1 - 2 * u, cy + fs * 0.02]]];
        else { for (i = 0; i <= 6; i++) z.push([jzLerp(x0, x1, i / 6), cy + (i % 2 ? -1 : 1) * fs * 0.28]); strikes = [z]; }
        var S = jzShapeLayer(ctx, 'strike out', 0, 0), col = sc.accent;
        // arrow to the nearest edge of the lyric
        var c1 = null, c3 = null;
        if (cy + fs * 0.6 < bb.y0) { c1 = [cx + tw * 0.25, cy + fs * 0.75]; c3 = [jzClamp(cx + tw * 0.35, bb.x0 + 10 * u, bb.x1 - 10 * u), bb.y0 - 6 * u]; }
        else if (cy - fs * 0.6 > bb.y1) { c1 = [cx + tw * 0.25, cy - fs * 0.75]; c3 = [jzClamp(cx + tw * 0.35, bb.x0 + 10 * u, bb.x1 - 10 * u), bb.y1 + 6 * u]; }
        else if (cx < bb.x0) { c1 = [cx + tw / 2 + 8 * u, cy + fs * 0.3]; c3 = [bb.x0 - 6 * u, jzClamp(cy + fs, bb.y0 + 10 * u, bb.y1 - 10 * u)]; }
        else { c1 = [cx - tw / 2 - 8 * u, cy + fs * 0.3]; c3 = [bb.x1 + 6 * u, jzClamp(cy + fs, bb.y0 + 10 * u, bb.y1 - 10 * u)]; }
        var dd = Math.sqrt((c3[0] - c1[0]) * (c3[0] - c1[0]) + (c3[1] - c1[1]) * (c3[1] - c1[1]));
        if (dd > 14 * u && dd < 260 * u) {
            var nx = -(c3[1] - c1[1]) / dd, ny = (c3[0] - c1[0]) / dd, bend = dd * 0.25, c2 = [(c1[0] + c3[0]) / 2 + nx * bend, (c1[1] + c3[1]) / 2 + ny * bend], ap = [];
            for (i = 0; i <= 12; i++) { var t = i / 12; ap.push([(1 - t) * (1 - t) * c1[0] + 2 * t * (1 - t) * c2[0] + t * t * c3[0], (1 - t) * (1 - t) * c1[1] + 2 * t * (1 - t) * c2[1] + t * t * c3[1]]); }
            var p = ap[12], q = ap[10], an = Math.atan2(p[1] - q[1], p[0] - q[0]), L = 9 * u;
            var gh = jzGrp(S, 'arrow head'); jzAddPath(gh, [[p[0] - Math.cos(an - 0.5) * L, p[1] - Math.sin(an - 0.5) * L], p, [p[0] - Math.cos(an + 0.5) * L, p[1] - Math.sin(an + 0.5) * L]], false);
            dc2_stroke(gh, col, 2 * u, 90, true);
            dc2_gx(gh, 'ADBE Vector Group Opacity', DC2_CL + DC2_OC + 'oc((time-0.6)/0.3)>0.95?100:0');
            var ga = jzGrp(S, 'arrow'); jzAddPath(ga, ap, false); dc2_stroke(ga, col, 2 * u, 90, true);
            jzAddTrimPaths(ga, DC2_CL + DC2_OC + '100*oc((time-0.6)/0.3)');
        }
        for (k = 0; k < strikes.length; k++) {
            var g = jzGrp(S, 'strike ' + (k + 1)); jzAddPath(g, strikes[k], false); dc2_stroke(g, col, 2.4 * u, 95, true);
            jzAddTrimPaths(g, DC2_CL + DC2_IOC + '100*ioc((time-' + jzN(0.3 + k * 0.14) + ')/0.25)');
        }
        jzNoGhost(S);
        dc2_op(ctx, S, null, a * 100);
    }
});

/* ---- highlightMark — 蛍光マーカー: a highlighter swipe under the lower half of each lyric line (screen / multiply, glyphs stay crisp).
   Lines come from the lyric's text layers (line breaks split a layer); without them the whole box is one line. */
jzReg('decor', 'highlightMark', {
    back: false,
    build: function (ctx, bb0, d) {
        var bb = dc2_bb(ctx, bb0), sc = ctx.sc, u = dc2_u(ctx), s = d.seed, dk = dc2_dark(ctx), i, k;
        var cands = [sc.accent, sc.accent2, sc.ghostA, sc.ghostB, sc.sub], lighten = jzLum(sc.fg) > jzLum(sc.bg), lb = jzLum(sc.bg), pool = [], col = null, weak = 1;
        for (i = 0; i < cands.length; i++) if (cands[i] && (lighten ? jzLum(cands[i]) > lb + 0.06 : jzLum(cands[i]) < lb - 0.06)) pool.push(cands[i]);
        for (i = 0; i < pool.length; i++) if (jzContrast(pool[i], sc.fg) >= 1.6) { col = pool[i]; break; }
        if (!col) { if (!pool.length) return; col = pool[0]; for (i = 1; i < pool.length; i++) if (jzContrast(pool[i], sc.fg) > jzContrast(col, sc.fg)) col = pool[i]; weak = 0.7; }
        var vert = bb.h > bb.w * 1.25, lines = dc2_lines(ctx, bb, vert), S = jzShapeLayer(ctx, 'highlighter', 0, 0), M = 14;
        for (k = 0; k < Math.min(4, lines.length); k++) {
            var Ln = lines[k], sz = vert ? Ln.x1 - Ln.x0 : Ln.y1 - Ln.y0, pts = [];
            var a0 = (vert ? Ln.y0 : Ln.x0) - sz * 0.12, a1 = (vert ? Ln.y1 : Ln.x1) + sz * 0.12;
            var c0 = vert ? Ln.x0 + sz * 0.52 : Ln.y0 + sz * 0.46, c1 = vert ? Ln.x1 + sz * 0.06 : Ln.y1 + sz * 0.06, sl = sz * 0.18, t, a;
            for (i = 0; i <= M; i++) { t = i / M; a = jzLerp(a0 + sl, a1, t); pts.push(vert ? [c1 + dc2_noise(t * 4, s) * 1.5 * u, a] : [a, c0 + dc2_noise(t * 4, s) * 1.5 * u]); }
            for (i = M; i >= 0; i--) { t = i / M; a = jzLerp(a0, a1 - sl, t); pts.push(vert ? [c0 + dc2_noise(t * 4 + 9, s) * 1.5 * u, a] : [a, c1 + dc2_noise(t * 4 + 9, s) * 1.5 * u]); }
            var g = jzGrp(S, 'swipe ' + (k + 1)), piv = vert ? [(c0 + c1) / 2, a0] : [a0, (c0 + c1) / 2];
            jzAddPath(g, pts, true); jzAddFill(g, col, (dk ? 60 : 62) * weak);
            jzGX(g).property('ADBE Vector Anchor').setValue(piv); jzGX(g).property('ADBE Vector Position').setValue(piv);
            dc2_gx(g, 'ADBE Vector Scale', DC2_CL + DC2_IOC + 'var e=ioc((time-' + jzN(0.1 + k * 0.22) + ')/0.4);' + (vert ? '[100,100*e]' : '[100*e,100]'));
        }
        S.blendingMode = lighten ? BlendingMode.SCREEN : BlendingMode.MULTIPLY;
        jzNoGhost(S);
        dc2_op(ctx, S);
    }
});

/* ---- heartsStars — ハートと星: little hearts / stars popping around the lyric, bobbing (filled ones ghost, outlined ones don't) */
jzReg('decor', 'heartsStars', {
    back: false,
    build: function (ctx, bb0, d) {
        var bb = dc2_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc2_u(ctx), s = d.seed, i;
        var K = Math.min(7, 3 + (d.n | 0) + (d.big ? 1 : 0)), v = (d.v | 0) % 3, pad = 26 * u + bb.h * 0.15;
        var X0 = bb.x0 - pad, X1 = bb.x1 + pad, Y0 = bb.y0 - pad, Y1 = bb.y1 + pad, per = 2 * (X1 - X0 + Y1 - Y0);
        var cols = [sc.accent, sc.fg, sc.accent2 && jzContrast(sc.accent2, sc.bg) > 1.8 ? sc.accent2 : sc.accent], SF = null, SL = null;
        for (i = 0; i < K; i++) {
            var p = dc2_perim(X0, Y0, X1, Y1, (i + 0.3 + dc2_r(s, i, 1) * 0.4) / K * per);
            var x = jzClamp(p[0], 24 * u, W - 24 * u), y = jzClamp(p[1], 24 * u, H - 24 * u);
            if (dc2_clear(bb, x, y, 6 * u, 1) < 1) continue;
            var sz = (i === 0 ? 36 : 18 + dc2_r(s, i, 2) * 14) * u, isHeart = v === 0 || (v === 2 && i % 2 === 0);
            var pts = isHeart ? dc2_heart(sz) : dc2_star5(sz, sz * 0.45), line = dc2_r(s, i, 4) < 0.35, S;
            if (line) { if (!SL) SL = jzShapeLayer(ctx, 'hearts outline', 0, 0); S = SL; } else { if (!SF) SF = jzShapeLayer(ctx, 'hearts', 0, 0); S = SF; }
            var g = jzGrp(S, (isHeart ? 'heart ' : 'star ') + (i + 1));
            jzAddPath(g, pts, true);
            if (line) { var sk = jzAddStroke(g, cols[i % 3], 2.2 * u); try { sk.property('ADBE Vector Stroke Line Join').setValue(2); } catch (e) {} }
            else jzAddFill(g, cols[i % 3]);
            dc2_gx(g, 'ADBE Vector Position', '[' + jzN(x) + ',' + jzN(y) + '+Math.sin(time*3+' + jzN(i * 1.7) + ')*' + jzN(3 * u) + ']');
            dc2_gx(g, 'ADBE Vector Rotation', 'Math.sin(time*2+' + i + ')*10+' + jzN(dc2_rs(s, i, 3) * 15));
            dc2_gx(g, 'ADBE Vector Scale', dc2_hd(ctx, DC2_OB + DC2_IC) + 'var q=cl((T-' + jzN(0.05 + i * 0.07) + ')/0.3),k=(q<=0?0:ob(q,2.4))*(1-ic(PO));[100*k,100*k]');
        }
        if (SF) dc2_op(ctx, SF);
        if (SL) { jzNoGhost(SL); dc2_op(ctx, SL); }
    }
});

// ================================================================ type ornaments

/* ---- watermarkKanji — 透かし大漢字: one character of the lyric, huge and dim, cropped by the screen edge, sinking slowly */
jzReg('decor', 'watermarkKanji', {
    back: true,
    build: function (ctx, bb, d) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc2_u(ctx), v = d.v | 0;
        var ch = dc2_lyricChar(ctx, v); if (!ch) return;
        var S0 = Math.min(H * 0.86, W * 0.92), outline = v % 2 === 1, font = v % 3 === 0 ? ctx.st.fonts.display[0] : jzSerifF(ctx);
        var y = H * 0.5 + (d.low ? 1 : -1) * H * 0.06;
        var o = outline ? { font: font, size: S0, color: sc.sub || sc.fg, fill: false, stroke: 1.6 * u, strokeColor: sc.sub || sc.fg, x: 0, y: y }
            : { font: font, size: S0, color: sc.dim || jzLayC(sc, 0.12), x: 0, y: y };
        var L = jzText(ctx, ch, o);
        var E = DC2_CL + DC2_OC + 'var e=oc(time/0.6),k=1.06-0.06*e;';
        jzSetExpr(jzXf(L, 'ADBE Scale'), E + '[value[0]*k,value[1]*k]');
        jzSetExpr(jzXf(L, 'ADBE Position'), E + '[' + (d.right ? jzN(W) + '-' + jzN(S0 * 0.3) + '*k' : jzN(S0 * 0.3) + '*k') + ',value[1]-time*' + jzN(5 * u) + ']');
        jzNoGhost(L);
        dc2_op(ctx, L, 'oc(time/0.6)', outline ? 32 : 100);
    }
});

/* ---- verticalStrip — 縦書き帯: the whole line set small and vertical at a screen edge (typed on), a hairline rule and the line number */
jzReg('decor', 'verticalStrip', {
    back: false,
    build: function (ctx, bb0, d) {
        var bb = dc2_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc2_u(ctx), m = dc2_mg(ctx), c = ctx.cut, i, j;
        var all = jzChars(String(c.lineText || c.text || '').replace(/\s+/g, '　')).slice(0, 26);
        if (!jzTrim(all.join(''))) return;
        var fs = jzClamp(jzU(ctx) * 0.022, 15 * u, 24 * u), track = 0.28, step = fs * (1 + track), clear = 44 * u, best = null;
        var font = (d.v | 0) % 2 ? jzSerifF(ctx) : jzBodyF(ctx), rs = [!!d.right, !d.right], ts = [!d.low, !!d.low];
        for (i = 0; i < 2; i++) for (j = 0; j < 2; j++) {
            var right = rs[i], top = ts[j], x = right ? W - m * 0.95 : m * 0.95, hClear = x + fs * 1.8 < bb.x0 - clear || x - fs * 1.8 > bb.x1 + clear;
            var y0 = top ? m * 1.6 + fs : null, yEnd = top ? null : H - m * 1.3;
            var avail = hClear ? H - m * 2.9 - fs : top ? bb.y0 - clear - y0 : yEnd - (bb.y1 + clear);
            var n = Math.min(all.length, Math.floor(avail / step));
            if (n >= 4 && (!best || n > best.n + 1)) best = { right: right, top: top, x: x, y0: y0, yEnd: yEnd, n: n };
        }
        if (!best) return;
        var chars = all.slice(0, best.n), th = best.n * step - fs * track, Y0 = best.top ? best.y0 : best.yEnd - th, X = best.x;
        var L = jzText(ctx, chars.join('\r'), { font: font, size: fs, color: sc.fg, x: X, y: Y0, align: 'center', leading: step });
        var r = jzRect(L);
        jzXf(L, 'ADBE Anchor Point').setValue([r.left + r.width / 2, r.top]); jzXf(L, 'ADBE Position').setValue([X, Y0]);
        jzAnimator(L, 'JZ Type On', [['ADBE Text Opacity', 0]], 'var sh=Math.ceil(' + best.n + '*Math.max(0,Math.min(1,(time-0.08)/0.55)));textIndex>sh?100:0');
        jzNoGhost(L); dc2_op(ctx, L, null, 90);
        var rx = X + (best.right ? -1 : 1) * fs * 1.1, S = jzShapeLayer(ctx, 'strip rule', 0, 0);
        var gt = jzGrp(S, 'tick'); jzAddRect(gt, 4 * u, 8 * u, 0, rx, Y0 - fs * 0.2 - 8 * u); jzAddFill(gt, sc.accent);
        dc2_gx(gt, 'ADBE Vector Group Opacity', DC2_CL + DC2_OE + '100*oe(time/0.6)');
        var gr = jzGrp(S, 'rule'); jzAddPath(gr, [[rx, Y0 - fs * 0.2], [rx, Y0 - fs * 0.2 + th + fs * 0.4]], false); jzAddStroke(gr, sc.sub || sc.fg, Math.max(1, u), 70);
        jzAddTrimPaths(gr, DC2_CL + DC2_OE + '100*oe(time/0.6)');
        jzNoGhost(S); dc2_op(ctx, S);
        var lab = jzText(ctx, jzLineNo(ctx), { font: jzMonoF(ctx), size: dc2_fs(ctx) * 0.75, color: sc.sub || sc.fg, x: X, y: Y0 - fs * 1.6, align: 'center', track: 0.08 });
        jzNoGhost(lab); dc2_op(ctx, lab, 'oe(time/0.6)');
    }
});

/* ---- romajiLine — ローマ字: a thin, widely tracked latin line under (or over) the lyric that decodes letter by letter */
jzReg('decor', 'romajiLine', {
    back: false,
    build: function (ctx, bb0, d) {
        var bb = dc2_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc2_u(ctx), m = dc2_mg(ctx), c = ctx.cut, i;
        var raw = jzTrim(String(c.text || '').replace(/\s+/g, ' ')); if (!raw) return;
        var str = c.note ? String(c.note) : null;
        if (!str) {
            var rj = jzRomaji(raw.replace(/[、。！？!?,.・「」]/g, ' '));
            if (rj) str = jzTrim(rj.toUpperCase().replace(/\s+/g, ' '));
            else { var cc = jzChars(raw), o = []; for (i = 0; i < cc.length && o.length < 6; i++) if (jzTrim(cc[i])) o.push('U+' + cc[i].charCodeAt(0).toString(16).toUpperCase()); str = o.join(' '); }
        }
        var font = (d.v | 0) % 2 ? jzBodyF(ctx) : jzMonoF(ctx), track = 0.34;
        var fs = jzClamp(jzU(ctx) * 0.018, 12 * u, 20 * u), maxW = Math.min(W - m * 2.4, Math.max(bb.w * 1.15, W * 0.4));
        var L = jzText(ctx, str, { font: font, size: fs, color: sc.sub || sc.fg, x: 0, y: 0, align: 'left', track: track });
        var src = L.property('ADBE Text Properties').property('ADBE Text Document');
        function setT(t2, f2) { var td = src.value; td.text = t2; if (f2) td.fontSize = f2; src.setValue(td); return jzSize(L)[0]; }
        var tw = jzSize(L)[0];
        if (tw > maxW) { fs = Math.max(10 * u, fs * maxW / tw); tw = setT(str, fs); }
        var guard = 0;
        while (tw > maxW && str.length > 4 && guard++ < 60) { str = str.slice(0, -2); tw = setT(str + '...'); if (tw <= maxW) { str += '...'; break; } }
        tw = setT(str);
        jzAnchor(L, 'left');
        var gap = 18 * u + bb.h * 0.1, below = !!d.low, y = below ? bb.y1 + gap + fs * 0.5 : bb.y0 - gap - fs * 0.5;
        if (y < m * 0.6 || y > H - m * 0.6) { below = !below; y = below ? bb.y1 + gap + fs * 0.5 : bb.y0 - gap - fs * 0.5; }
        var cx = jzClamp(bb.cx, m + tw / 2, W - m - tw / 2);
        jzXf(L, 'ADBE Position').setValue([cx - tw / 2, y]);
        // decode: hidden until 0.22 s before its turn, random capitals meanwhile (Character Offset within A–Z), then the letter
        var gl = jzGlyphs(str), codes = [], n = gl.length;
        for (i = 0; i < n; i++) { var k = gl[i].charCodeAt(0); codes.push(k >= 65 && k <= 90 ? k - 65 : -1); }
        var TI = 'var i=textIndex-1,ti=0.06+i/' + Math.max(1, n) + '*0.5;';
        jzAnimator(L, 'JZ Hide', [['ADBE Text Opacity', 0]], TI + 'time<ti-0.22?100:0');
        jzAnimator(L, 'JZ Decode', [['ADBE Text Character Offset', 25]], DC2_HH + TI + 'var P=' + jzArrExpr(codes) + ',p=P[i],r=0;if(p>=0&&time<ti&&time>=ti-0.22){var q=Math.floor(hh(' + jzN(d.seed % 9973) + '+i*13.1+Math.floor(time*12)*7.7)*26);r=(q-p)/25*100;}r');
        jzNoGhost(L); dc2_op(ctx, L, 'oc(time/0.2)');
        var g2 = 14 * u, hl = 36 * u, S = jzShapeLayer(ctx, 'romaji rules', 0, 0), gr = jzGrp(S, 'rules');
        jzAddPath(gr, [[cx - tw / 2 - g2, y], [cx - tw / 2 - g2 - hl, y]], false); jzAddPath(gr, [[cx + tw / 2 + g2, y], [cx + tw / 2 + g2 + hl, y]], false);
        jzAddStroke(gr, d.accent ? sc.accent : (sc.sub || sc.fg), Math.max(1, u), 80);
        jzAddTrimPaths(gr, DC2_CL + DC2_OE + '100*oe((time-0.1)/0.5)');
        jzNoGhost(S); dc2_op(ctx, S);
    }
});

/* ---- bracketsJP — 隅付き括弧: bold 【 】 clasping the lyric (︻ ︼ over / under vertical text), sliding in and out */
function dc2_lentil(xo, yT, yB, aw, tb, side) {
    var pts = [[xo, yT], [xo - side * aw, yT]], M = 16, h = yB - yT, i;
    for (i = 1; i < M; i++) { var t = i / M, b = Math.pow(Math.sin(t * Math.PI), 0.7); pts.push([xo - side * (aw - (aw - tb) * b), yT + h * t]); }
    pts.push([xo - side * aw, yB], [xo, yB]);
    return pts;
}
jzReg('decor', 'bracketsJP', {
    back: false,
    build: function (ctx, bb0, d) {
        var bb = dc2_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, u = dc2_u(ctx), i;
        var vert = bb.h > bb.w * 1.25, col = d.accent ? sc.accent : sc.fg, S = jzShapeLayer(ctx, 'brackets JP', 0, 0);
        var HD = dc2_hd(ctx, DC2_OE + DC2_IC) + 'var e=oe(T/0.45),sl=(1-e+ic(PO)*0.6)*' + jzN(60 * u) + ',k=0.5+0.5*e;';
        var aw, tb, gap, g;
        if (!vert) {
            var h = jzClamp(bb.h * 1.08 + 16 * u, 40 * u, H * 0.6), yc = bb.cy;
            aw = Math.min(h * 0.24, 26 * u + jzU(ctx) * 0.028); tb = aw * 0.3; gap = 12 * u + bb.h * 0.05;
            var xl = Math.max(bb.x0 - gap, aw + 6 * u), xr = Math.min(bb.x1 + gap, W - aw - 6 * u);
            var sides = [[xl - aw, -1], [xr + aw, 1]];
            for (i = 0; i < 2; i++) {
                var xo = sides[i][0], sd = sides[i][1];
                g = jzGrp(S, sd < 0 ? 'left' : 'right');
                jzAddPath(g, dc2_lentil(xo, yc - h / 2, yc + h / 2, aw, tb, sd), true); jzAddFill(g, col);
                jzGX(g).property('ADBE Vector Anchor').setValue([xo, yc]);
                dc2_gx(g, 'ADBE Vector Position', HD + '[' + jzN(xo) + (sd < 0 ? '-' : '+') + 'sl,' + jzN(yc) + ']');
                dc2_gx(g, 'ADBE Vector Scale', HD + '[100,100*k]');
            }
        } else {
            var wv = jzClamp(bb.w * 1.05 + 16 * u, 40 * u, W * 0.6), xc = bb.cx, xL = xc - wv / 2, M = 16;
            aw = Math.min(wv * 0.24, 26 * u + jzU(ctx) * 0.028); tb = aw * 0.3; gap = 12 * u + bb.w * 0.05;
            var yt = Math.max(bb.y0 - gap, aw + 6 * u), yb = Math.min(bb.y1 + gap, H - aw - 6 * u), ends = [[yt, -1], [yb, 1]];
            for (i = 0; i < 2; i++) {
                var yi = ends[i][0], dir = ends[i][1], p = [[xL, yi + dir * aw], [xL, yi]], j;
                for (j = 1; j < M; j++) { var t = j / M, b = Math.pow(Math.sin(t * Math.PI), 0.7); p.push([xL + wv * t, yi + dir * (aw - tb) * b]); }
                p.push([xL + wv, yi], [xL + wv, yi + dir * aw]);
                g = jzGrp(S, dir < 0 ? 'top' : 'bottom');
                jzAddPath(g, p, true); jzAddFill(g, col);
                jzGX(g).property('ADBE Vector Anchor').setValue([xc, yi]);
                dc2_gx(g, 'ADBE Vector Position', HD + '[' + jzN(xc) + ',' + jzN(yi) + (dir < 0 ? '-' : '+') + 'sl]');
                dc2_gx(g, 'ADBE Vector Scale', HD + '[100*k,100]');
            }
        }
        dc2_op(ctx, S, 'cl(time/0.12)');
    }
});

/* ---- seal — 落款: a red seal stamp with one character of the lyric, pressed beside it (drops in large and tilted, settles) */
jzReg('decor', 'seal', {
    back: false,
    build: function (ctx, bb0, d) {
        var bb = dc2_bb(ctx, bb0), sc = ctx.sc, u = dc2_u(ctx), s = d.seed, v = d.v | 0, i, k;
        var ch = dc2_lyricChar(ctx, 3 + v); if (!ch) return;
        var S0 = jzClamp(jzU(ctx) * 0.074, 48 * u, 92 * u), h = S0 / 2, round = v % 2 === 1;
        var sp = dc2_near(ctx, bb, S0 * 1.3, S0 * 1.3, { right: v % 3 !== 2, low: true, corner: d.corner, v: d.v }, 14 * u), ok = sp.ok ? 1 : 0.4;
        var S = jzShapeLayer(ctx, 'seal', sp.cx, sp.cy), pts = [];
        if (round) { for (i = 0; i < 28; i++) { var an = i / 28 * Math.PI * 2, rr = h * (1 + dc2_rs(s, i, 2) * 0.025); pts.push([Math.cos(an) * rr, Math.sin(an) * rr]); } }
        else {
            var cn = [[-h, -h], [h, -h], [h, h], [-h, h]];
            for (k = 0; k < 4; k++) { var p0 = cn[k], p1 = cn[(k + 1) % 4]; for (i = 0; i < 4; i++) { var t = i / 4, jt = dc2_rs(s, k, i, 3) * 1.3 * u; pts.push([jzLerp(p0[0], p1[0], t) + (k % 2 ? jt : 0), jzLerp(p0[1], p1[1], t) + (k % 2 ? 0 : jt)]); } }
        }
        var gsp = jzGrp(S, 'speckles');
        for (i = 0; i < 9; i++) { var rd = (0.6 + dc2_r(s, i, 7) * 1.6) * u; jzAddEllipse(gsp, rd * 2, rd * 2, dc2_rs(s, i, 5) * h * 0.9, dc2_rs(s, i, 6) * h * 0.9); }
        jzAddFill(gsp, sc.bg, 70);
        if (v % 3 === 2) {
            var gi = jzGrp(S, 'inner');
            if (round) jzAddEllipse(gi, h * 1.68, h * 1.68); else jzAddRect(gi, h * 1.68, h * 1.68);
            jzAddStroke(gi, sc.bg, 1.6 * u);
        }
        var gb = jzGrp(S, 'stamp'); jzAddPath(gb, pts, true); jzAddFill(gb, sc.accent, 95);
        var serif = jzSerifF(ctx), T = jzText(ctx, ch, { font: serif === 'mincho_light' ? 'mincho_bold' : serif, size: S0 * 0.62, color: sc.bg, x: sp.cx, y: sp.cy + S0 * 0.02 });
        var HD = DC2_CL + DC2_OC + 'var p=cl((time-0.08)/0.3),q=oc(p);';
        var L2 = [S, T];
        for (i = 0; i < 2; i++) {
            jzSetExpr(jzXf(L2[i], 'ADBE Scale'), HD + 'var k=1.5-0.5*q;[value[0]*k,value[1]*k]');
            jzSetExpr(jzXf(L2[i], 'ADBE Rotate Z'), HD + jzN(dc2_rs(s, 1) * 5) + '-(1-q)*12');
            jzNoGhost(L2[i]);
            dc2_op(ctx, L2[i], 'cl(cl((time-0.08)/0.3)*4)', ok * 100);
        }
    }
});
