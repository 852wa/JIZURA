// ================================================================ decor (AE)
var JZ_DECOR = {};
var JZ_DECOR_BACK = { grid: 1, stripes: 1, blobs: 1, bars: 1, shapes: 1, counter: 1 };
function jzIO(ctx, dur) { // opacity in/out expression for decor layers
    var c = ctx.cut;
    return JZ_FNS + 'value*oc(time/' + jzN(dur || 0.3) + ')*(1-ic((time-' + jzN(c.dur - Math.max(0.12, c.outDur || 0.15)) + ')/' + jzN(Math.max(0.12, c.outDur || 0.15)) + '))';
}

JZ_DECOR.brackets = function (ctx, bb, d) {
    var sc = ctx.sc, pad = 18 + (bb.y1 - bb.y0) * 0.12, x0 = bb.x0 - pad, x1 = bb.x1 + pad, y0 = bb.y0 - pad, y1 = bb.y1 + pad;
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, L = Math.min(x1 - x0, y1 - y0) * 0.16 + 8, col = d.accent ? sc.accent : sc.fg;
    var S = jzShapeLayer(ctx, 'brackets', cx, cy), g = jzGrp(S), hw = (x1 - x0) / 2, hh = (y1 - y0) / 2;
    jzAddPath(g, [[-hw, -hh + L], [-hw, -hh], [-hw + L, -hh]], false);
    jzAddPath(g, [[hw - L, -hh], [hw, -hh], [hw, -hh + L]], false);
    jzAddPath(g, [[-hw, hh - L], [-hw, hh], [-hw + L, hh]], false);
    jzAddPath(g, [[hw - L, hh], [hw, hh], [hw, hh - L]], false);
    jzAddStroke(g, col, 2.2);
    jzSetExpr(jzXf(S, 'ADBE Scale'), JZ_FNS + 'var e=oe(time/0.35)*(1-ic((time-' + jzN(ctx.cut.dur - Math.max(0.12, ctx.cut.outDur || 0.15)) + ')/0.15));[value[0]*e,value[1]*e]');
};
JZ_DECOR.rings = function (ctx, bb, d) {
    var sc = ctx.sc, cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, R0 = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) * 0.55 + ctx.H * 0.05;
    var S = jzShapeLayer(ctx, 'rings', cx, cy);
    for (var k = 0; k < (d.n || 2); k++) {
        var R = R0 * (1 + k * 0.28 + jzR(d.seed, k, 1) * 0.1), g = jzGrp(S);
        jzAddEllipse(g, R * 2, R * 2); jzAddStroke(g, sc.fg, 1.2, 70);
        jzAddTrimPaths(g, JZ_FNS + '100*oe(time/0.5)*' + jzN(0.55 + 0.45 * jzR(d.seed, k, 3)));
        jzGX(g).property('ADBE Vector Rotation').expression = 'time*' + (k % 2 ? -14 : 10) + '+' + Math.round(jzR(d.seed, k, 2) * 360);
        var a = (jzR(d.seed, k, 2) * 360 + 40) * Math.PI / 180, px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R;
        var lab = jzText(ctx, 'X' + Math.round(px) + ' Y' + Math.round(py), { font: 'mono', size: Math.max(10, ctx.H * 0.015), color: sc.sub, x: px + 10, y: py - 12, align: 'left' });
        jzSetExpr(jzXf(lab, 'ADBE Opacity'), jzIO(ctx, 0.5));
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), jzIO(ctx, 0.3));
};
JZ_DECOR.dots = function (ctx, bb, d) {
    var sc = ctx.sc, cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, R = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) * 0.62 + ctx.H * 0.04;
    var S = jzShapeLayer(ctx, 'dot ring', cx, cy), g = jzGrp(S);
    jzAddEllipse(g, 5, 5, R, 0); jzAddFill(g, sc.fg);
    var rp = jzVecs(g).addProperty('ADBE Vector Filter - Repeater');
    rp.property('ADBE Vector Repeater Copies').setValue(36);
    var rt = jzVecs(g).property('ADBE Vector Filter - Repeater').property('ADBE Vector Repeater Transform');
    rt.property('ADBE Vector Repeater Position').setValue([0, 0]);
    rt.property('ADBE Vector Repeater Rotation').setValue(10);
    jzSetExpr(jzXf(S, 'ADBE Rotate Z'), 'time*20');
    jzSetExpr(jzXf(S, 'ADBE Opacity'), jzIO(ctx, 0.3));
};
JZ_DECOR.arrows = function (ctx, bb, d) {
    var sc = ctx.sc, cy = (bb.y0 + bb.y1) / 2, s = Math.max(14, ctx.H * 0.03), gap = s * 0.9;
    for (var side = -1; side <= 1; side += 2) {
        var xEdge = side < 0 ? bb.x0 - s * 1.2 : bb.x1 + s * 1.2, dir = -side;
        var S = jzShapeLayer(ctx, 'chevrons', xEdge, cy);
        for (var i = 0; i < 3; i++) {
            var g = jzGrp(S), x = side * i * gap;
            jzAddPath(g, [[x - dir * s * 0.35, -s * 0.5], [x + dir * s * 0.35, 0], [x - dir * s * 0.35, s * 0.5]], false);
            jzAddStroke(g, i === 0 ? sc.accent : sc.fg, Math.max(2, s * 0.14));
            jzGX(g).property('ADBE Vector Group Opacity').expression = 'posterizeTime(12);(Math.floor(time*12)+' + i + ')%3===0?30:100';
        }
        jzSetExpr(jzXf(S, 'ADBE Position'), JZ_FNS + '[value[0]+' + side + '*(1-oe(time/0.4))*thisComp.width*0.2,value[1]]');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), jzIO(ctx, 0.2));
    }
};
JZ_DECOR.slash = function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc;
    for (var k = 0; k < (d.n || 1); k++) {
        var ang = jzLerp(-70, -20, jzR(d.seed, k, 1)) * Math.PI / 180, cx = jzLerp(W * 0.3, W * 0.7, jzR(d.seed, k, 2)), cy = jzLerp(H * 0.3, H * 0.7, jzR(d.seed, k, 3)), L = Math.sqrt(W * W + H * H);
        var S = jzShapeLayer(ctx, 'slash', 0, 0), g = jzGrp(S);
        jzAddPath(g, [[cx - Math.cos(ang) * L / 2, cy - Math.sin(ang) * L / 2], [cx + Math.cos(ang) * L / 2, cy + Math.sin(ang) * L / 2]], false);
        jzAddStroke(g, k ? sc.accent : sc.fg, k ? 2 : 1.4, 90);
        jzAddTrimPaths(g, JZ_FNS + '100*oe((time-' + jzN(k * 0.06) + ')/0.35)', JZ_FNS + '100*ic((time-' + jzN(ctx.cut.dur - Math.max(0.12, ctx.cut.outDur || 0.15)) + ')/0.15)');
    }
};
JZ_DECOR.sparks = function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc;
    for (var k = 0; k < (d.n || 6); k++) {
        var x = jzLerp(W * 0.05, W * 0.95, jzR(d.seed, k, 2)), y = jzLerp(H * 0.08, H * 0.92, jzR(d.seed, k, 3)), r = jzLerp(H * 0.015, H * 0.04, jzR(d.seed, k, 4));
        var S = jzShapeLayer(ctx, 'spark', x, y), g = jzGrp(S), arms = jzR(d.seed, k, 7) < 0.5 ? 3 : 4;
        for (var a = 0; a < arms; a++) { var an = a * Math.PI / arms; jzAddPath(g, [[-Math.cos(an) * r, -Math.sin(an) * r], [Math.cos(an) * r, Math.sin(an) * r]], false); }
        jzAddStroke(g, k % 3 === 0 ? sc.accent : sc.fg, Math.max(1.5, r * 0.14));
        jzSetExpr(jzXf(S, 'ADBE Rotate Z'), 'time*' + Math.round((jzR(d.seed, k, 5) * 2 - 1) * 170));
        jzPop(ctx, S, jzR(d.seed, k, 1) * 0.4, true);
    }
};
JZ_DECOR.leaders = function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, fs = Math.max(11, H * 0.018);
    var labels = [jzRomaji(c.text.replace(/[\s　]+/g, '')) || c.lineText, 'No.' + jzPad((c.line || 0) + 1, 2)];
    var anchors = [[bb.x1, bb.y0], [bb.x0, bb.y1]];
    for (var k = 0; k < 2; k++) {
        var ax = anchors[k][0], ay = anchors[k][1], sgn = k === 1 ? -1 : 1;
        var tx = jzClamp(ax + sgn * W * jzLerp(0.06, 0.14, jzR(d.seed, k, 1)), W * 0.06, W * 0.94), ty = jzClamp(ay + (k === 0 ? -1 : 1) * H * jzLerp(0.08, 0.16, jzR(d.seed, k, 2)), H * 0.08, H * 0.92);
        var S = jzShapeLayer(ctx, 'leader', 0, 0), g = jzGrp(S);
        jzAddPath(g, [[ax, ay], [tx, ty], [tx + sgn * W * 0.05, ty]], false); jzAddStroke(g, sc.sub, 1.2);
        jzAddTrimPaths(g, JZ_FNS + '100*oe((time-0.1)/0.45)');
        var gd = jzGrp(S); jzAddEllipse(gd, 7, 7, ax, ay); jzAddFill(gd, sc.accent);
        var t = jzText(ctx, labels[k], { font: k === 0 ? 'gothic_med' : 'mono', size: fs, color: sc.fg, x: tx + sgn * W * 0.055, y: ty - fs * 0.9, align: k === 1 ? 'right' : 'left', track: 0.06 });
        jzSetExpr(jzXf(t, 'ADBE Opacity'), jzIO(ctx, 0.45));
    }
};
JZ_DECOR.waveform = function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, y = H * (d.low ? 0.86 : 0.14), pts = [], n = 60;
    for (var i = 0; i <= n; i++) { var u = i / n, a = H * 0.03 * Math.sin(u * Math.PI) * (0.4 + jzR(d.seed, i)); pts.push([jzLerp(W * 0.18, W * 0.82, u), y + (i % 2 ? a : -a)]); }
    var S = jzShapeLayer(ctx, 'waveform', 0, 0), g = jzGrp(S); jzAddPath(g, pts, false); jzAddStroke(g, sc.fg, 1.4, 90);
    jzSetExpr(jzXf(S, 'ADBE Scale'), 'posterizeTime(12);seedRandom(Math.floor(time*12),true);[100,100*random(0.5,1.2)]');
    jzXf(S, 'ADBE Anchor Point').setValue([W / 2, y]); jzXf(S, 'ADBE Position').setValue([W / 2, y]);
    jzAddTrimPaths(g, JZ_FNS + '100*oe(time/0.4)');
};
JZ_DECOR.barcode = function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, x0 = d.right ? W * 0.84 : W * 0.06, y0 = d.low ? H * 0.84 : H * 0.07, h = H * 0.05;
    var S = jzShapeLayer(ctx, 'barcode', x0, y0), g = jzGrp(S), x = 0;
    for (var i = 0; i < 34; i++) { var w = 1 + Math.floor(jzR(d.seed, i, 1) * 3.2); if (jzR(d.seed, i, 2) < 0.62) jzAddRect(g, w, h, 0, x + w / 2, h / 2); x += w + 1.5; }
    jzAddFill(g, sc.fg, 90);
    var t = jzText(ctx, jzPad(jzHash(d.seed, 5) % 1000000000, 9), { font: 'mono', size: Math.max(9, H * 0.014), color: sc.fg, x: x0, y: y0 + h + 12, align: 'left', track: 0.2 });
    jzSetExpr(jzXf(S, 'ADBE Opacity'), jzIO(ctx, 0.3)); jzSetExpr(jzXf(t, 'ADBE Opacity'), jzIO(ctx, 0.3));
};
JZ_DECOR.grid = function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, gs = H / 8;
    var S = jzShapeLayer(ctx, 'grid', 0, 0), g = jzGrp(S), x, y;
    for (x = (W / 2) % gs; x < W; x += gs) jzAddPath(g, [[x, 0], [x, H]], false);
    for (y = (H / 2) % gs; y < H; y += gs) jzAddPath(g, [[0, y], [W, y]], false);
    jzAddStroke(g, sc.sub, 1, 12);
    jzSetExpr(jzXf(S, 'ADBE Opacity'), jzIO(ctx, 0.3));
};
JZ_DECOR.stripes = function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, w = H * 0.04;
    var S = jzShapeLayer(ctx, 'stripes', d.corner ? W * 0.85 : W * 0.15, d.corner ? H * 0.15 : H * 0.85), g = jzGrp(S);
    for (var i = -6; i <= 6; i++) jzAddRect(g, w, H * 0.36, 0, i * w * 2, 0);
    jzAddFill(g, d.accent ? sc.accent : sc.dim, 90);
    jzXf(S, 'ADBE Rotate Z').setValue(-35);
    jzSetExpr(jzXf(S, 'ADBE Scale'), JZ_FNS + '[value[0],value[1]*oe(time/0.3)]');
};
JZ_DECOR.blobs = function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc;
    for (var k = 0; k < (d.n || 2); k++) {
        var cx = jzLerp(W * 0.12, W * 0.88, jzR(d.seed, k, 1)), cy = jzLerp(H * 0.15, H * 0.85, jzR(d.seed, k, 2)), R = jzLerp(H * 0.06, H * 0.16, jzR(d.seed, k, 3));
        var sh = new Shape(), v = [], inT = [], outT = [], m = 12;
        for (var i = 0; i < m; i++) {
            var a = i / m * Math.PI * 2, r = R * (0.72 + 0.5 * jzR(d.seed, k, i, 4)), tx = -Math.sin(a) * r * 0.26, ty = Math.cos(a) * r * 0.26;
            v.push([Math.cos(a) * r, Math.sin(a) * r]); inT.push([-tx, -ty]); outT.push([tx, ty]);
        }
        sh.vertices = v; sh.inTangents = inT; sh.outTangents = outT; sh.closed = true;
        var S = jzShapeLayer(ctx, 'blob', cx, cy), g = jzGrp(S);
        var p = jzVecs(g).addProperty('ADBE Vector Shape - Group'); p.property('ADBE Vector Shape').setValue(sh);
        jzAddFill(g, k % 2 ? sc.accent : (sc.accent2 || sc.accent), 95);
        jzPop(ctx, S, 0, true);
    }
};
JZ_DECOR.bars = function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc;
    for (var k = 0; k < (d.n || 3); k++) {
        var y = H * (jzR(d.seed, k, 11) < 0.5 ? jzLerp(0.1, 0.27, jzR(d.seed, k, 1)) : jzLerp(0.73, 0.9, jzR(d.seed, k, 1))), h = H * jzLerp(0.03, 0.08, jzR(d.seed, k, 2));
        var w = W * jzLerp(0.35, 0.75, jzR(d.seed, k, 4)), fromL = jzR(d.seed, k, 3) < 0.5;
        var S = jzShapeLayer(ctx, 'bar', fromL ? 0 : W, y), g = jzGrp(S);
        jzAddRect(g, w, h, 0, fromL ? w / 2 : -w / 2, 0); jzAddFill(g, k === 0 ? sc.accent : sc.ink, 92);
        jzSetExpr(jzXf(S, 'ADBE Scale'), JZ_FNS + 'var e=oe((time-' + jzN(k * 0.05) + ')/0.3)*(1-ie((time-' + jzN(ctx.cut.dur - Math.max(0.12, ctx.cut.outDur || 0.15)) + ')/0.15));[value[0]*e,value[1]]');
    }
};
JZ_DECOR.shapes = function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, cols = [sc.accent, sc.accent2 || sc.fg, sc.ink, sc.fg];
    for (var k = 0; k < (d.n || 5); k++) {
        var type = ['circle', 'square', 'tri', 'ring', 'ring'][Math.floor(jzR(d.seed, k, 1) * 5)];
        var top = jzR(d.seed, k, 4) < 0.5, x = jzLerp(W * 0.05, W * 0.95, jzR(d.seed, k, 2)), y = top ? jzLerp(H * 0.06, H * 0.24, jzR(d.seed, k, 10)) : jzLerp(H * 0.76, H * 0.94, jzR(d.seed, k, 10));
        var r = jzLerp(H * 0.018, H * 0.06, jzR(d.seed, k, 6)), col = cols[k % 4];
        var S = jzShapeLayer(ctx, 'shape', x, y), g = jzGrp(S);
        if (type === 'circle') { jzAddEllipse(g, r * 2, r * 2); jzAddFill(g, col); }
        else if (type === 'ring') { jzAddEllipse(g, r * 2, r * 2); jzAddStroke(g, col, Math.max(2, r * 0.12)); }
        else if (type === 'square') { jzAddRect(g, r * 2, r * 2); jzAddFill(g, col); }
        else { jzAddStar(g, 3, r, r * 0.5); var st = jzVecs(g).property('ADBE Vector Shape - Star'); try { st.property('ADBE Vector Star Type').setValue(2); } catch (e) {} jzAddFill(g, col); }
        jzSetExpr(jzXf(S, 'ADBE Rotate Z'), 'time*' + Math.round((jzR(d.seed, k, 8) * 2 - 1) * 60) + '+' + Math.round(jzR(d.seed, k, 7) * 360));
        jzPop(ctx, S, jzR(d.seed, k, 9) * 0.3, true);
    }
};
JZ_DECOR.counter = function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut;
    var t = jzText(ctx, '00', { font: jzFontOf(ctx, '_', 'display'), size: H * 0.5, color: d.accent ? sc.accent : sc.dim, x: d.right ? W * 0.86 : W * 0.14, y: H * (d.low ? 0.72 : 0.3) });
    var ex = d.mode === 'count' ? 'Math.floor(linear(time,0,' + jzN(c.dur * 0.8) + ',' + (d.from || 0) + ',' + (d.to || 99) + ')).toString()' : '"' + jzPad((c.index || 0) + 1, 2) + '"';
    try { t.property('ADBE Text Properties').property('ADBE Text Document').expression = ex; } catch (e) {}
    jzSetExpr(jzXf(t, 'ADBE Opacity'), jzIO(ctx, 0.3));
};

function jzDecorate(ctx, bb) {
    var list = ctx.cut.decor || [];
    bb = bb || { x0: ctx.W * 0.35, x1: ctx.W * 0.65, y0: ctx.H * 0.4, y1: ctx.H * 0.6, cx: ctx.W / 2, cy: ctx.H / 2 };
    for (var i = 0; i < list.length; i++) {
        var d = list[i], fn = JZ_DECOR[d.id];
        if (!fn) continue;
        var before = ctx.comp.numLayers;
        try { fn(ctx, bb, d); } catch (e) { jzWarn('decor ' + d.id + ': ' + e.toString()); }
        if (JZ_DECOR_BACK[d.id]) { // push newly created layers to the back, keeping their order
            var added = ctx.comp.numLayers - before;
            for (var k = 0; k < added; k++) { try { ctx.comp.layer(1).moveToEnd(); } catch (e2) {} }
        }
    }
}
