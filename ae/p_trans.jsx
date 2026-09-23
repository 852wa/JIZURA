// ================================================================ cut-to-cut transitions (AE port of the trans entries in src/11p_treattrans.js)
// trans.build(t): t.comp = MAIN comp, t.A = previous cut's wrapper layer (already extended to t0+dur, holds its last state),
// t.B = this cut's wrapper layer (above A, starts at t0). Drive effects / transforms on B (and A) with expressions built on
// jzEvHead(t.t0, t.dur) → p 0..1 (linear; ease it yourself). At p = 0 the screen must look like A, at p = 1 like B.
// Extra graphics (edge bars etc.) go on the main comp with jzEvShape(t.comp, name, t.t0, t.dur) — it is created on top.

/* ---- wipe — エッジワイプ: straight wipe with a bright leading edge */
jzReg('trans', 'wipe', {
    plan: function (rng, st) { return { dir: rng.wpick([['L', 3], ['R', 2], ['U', 1.4], ['D', 0.8]]) }; },
    build: function (t) {
        var W = t.W, H = t.H, d = t.P.dir || 'L', HD = jzEvHead(t.t0, t.dur) + 'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}' + jzBellExpr() + 'var e=ioc(p);';
        // B is revealed from the side the edge travels from (Linear Wipe hides the region swept by "completion")
        var ang = { L: 90, R: 270, U: 180, D: 0 }[d];   // L: B appears from the right edge moving left …
        var lw = jzEffect(t.B, 'ADBE Linear Wipe', 'JZ Trans Wipe'); jzEP(lw, 2, ang); jzEP(lw, 3, 0);
        jzEX(lw, 1, HD + '100*(1-e)');
        // leading edge bar + hairline, fading in and out with bell(p)
        var lwid = Math.max(2, Math.min(W, H) * 0.007), S = jzEvShape(t.comp, 'JZ Trans edge', t.t0, t.dur), g = jzGrp(S, 'edge'), g2 = jzGrp(S, 'hair');
        var horiz = d === 'L' || d === 'R', side = (d === 'R' || d === 'D') ? -1 : 1;
        if (horiz) { jzAddRect(g, lwid, H, 0, 0, H / 2); jzAddRect(g2, Math.max(1, lwid * 0.35), H, 0, lwid * 3.2 * side, H / 2); }
        else { jzAddRect(g, W, lwid, 0, W / 2, 0); jzAddRect(g2, W, Math.max(1, lwid * 0.35), 0, W / 2, lwid * 3.2 * side); }
        jzAddFill(g, jzTAcc(t)); jzAddFill(g2, jzTAcc(t)); jzGX(g2).property('ADBE Vector Group Opacity').setValue(50);
        var pos = { L: '[' + W + '*(1-e),0]', R: '[' + W + '*e,0]', U: '[0,' + H + '*(1-e)]', D: '[0,' + H + '*e]' }[d];
        jzSetExpr(jzXf(S, 'ADBE Position'), HD + pos);
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + '100*Math.pow(bell(p),0.6)');
    }
});

// ================================================================ helpers for the entries below (tag tn_)
// Layer strategy: effects on the wrapper layers stay identity outside their window (so they stack when one wrapper is B of one
// transition and A of the next); anything that must sit ABOVE the new cut is a copy of a wrapper that lives only for the transition.
// tAcc(I, second): an accent that reads against both the new and the previous background
function tn_acc(t, second) {
    var sc = t.sc, pb = (t.scPrev || sc).bg;
    var list = second ? [sc.accent2, sc.accent, sc.fg] : [sc.accent, sc.accent2, sc.fg];
    for (var i = 0; i < list.length; i++) if (list[i] && jzContrast(list[i], sc.bg) >= 1.8 && jzContrast(list[i], pb) >= 1.4) return list[i];
    return sc.fg;
}
function tn_md(t) { return Math.min(t.W, t.H); }                  // minD
function tn_lw(t, k) { return Math.max(2, tn_md(t) * k); }        // lwOf
// expression header: T0, TD, p + the browser's easings (ioc inOutCubic, ioq inOutQuart, ios inOutSine, sm smoothstep, bell)
function tn_hd(t) {
    return jzEvHead(t.t0, t.dur) + jzBellExpr() +
        'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}' +
        'function ioq(x){x=cl(x);return x<0.5?8*x*x*x*x:1-8*Math.pow(1-x,4);}' +
        'function ios(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}' +
        'function sm(a,b,x){x=cl((x-a)/(b-a));return x*x*(3-2*x);}\n';
}
// compact header for expressions repeated on many layers / groups
function tn_hs(t) { return 'var T0=' + jzN(t.t0) + ',TD=' + jzN(Math.max(1 / 240, t.dur)) + ';function cl(x){return Math.max(0,Math.min(1,x));}var p=cl((time-T0)/TD);'; }
var TN_IOC = 'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}';
// Transform effect driven by the transition. o: anc [x,y] pivot (layer px) · pos [dxExpr, dyExpr] · sc factor · sw / sh factors
// (non-uniform) · rot degrees · op 0..1 — all expressions relative to the effect's own values
function tn_xf(L, name, HD, o) {
    var e = jzEffect(L, 'ADBE Geometry2', name);
    if (!e) return null;
    if (o.anc) { jzEP(e, 1, o.anc); jzEP(e, 2, o.anc); }
    if (o.pos) jzEX(e, 2, HD + '[value[0]+(' + o.pos[0] + '),value[1]+(' + o.pos[1] + ')]');
    if (o.sw || o.sh) { jzEP(e, 3, 0); jzEX(e, 4, HD + 'value*(' + (o.sh || '1') + ')'); jzEX(e, 5, HD + 'value*(' + (o.sw || '1') + ')'); }
    else if (o.sc) jzEX(e, 4, HD + 'value*(' + o.sc + ')');
    if (o.rot) jzEX(e, 8, HD + 'value+(' + o.rot + ')');
    if (o.op) jzEX(e, 9, HD + 'value*cl(' + o.op + ')');
    return e;
}
// a copy of wrapper layer L living only during the transition, directly above B (each later copy lands below the earlier ones)
function tn_copy(t, L, name) {
    var C = L.duplicate();
    C.name = name;
    C.moveBefore(t.B);
    C.inPoint = t.t0; C.outPoint = t.t0 + t.dur;
    return C;
}
function tn_solid(t, hex, name, opEx) {
    var S = jzEvSolid(t.comp, name, hex, t.t0, t.dur);
    if (opEx) jzSetExpr(jzXf(S, 'ADBE Opacity'), opEx);
    return S;
}
// rectangle mask in layer px (intersects with masks the layer may already carry)
function tn_mask(L, x0, y0, x1, y1) {
    var mp = L.property('ADBE Mask Parade'), first = mp.numProperties === 0;
    var m = mp.addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = [[x1, y0], [x1, y1], [x0, y1], [x0, y0]]; sh.closed = true;
    m.property('ADBE Mask Shape').setValue(sh);
    if (!first) { try { m.maskMode = MaskMode.INTERSECT; } catch (e) {} }
    return m;
}
// M becomes the track matte of L (placed directly above it, switched off)
function tn_matte(M, L, type) { M.moveBefore(L); L.trackMatteType = type; M.enabled = false; }
function tn_dirv(d) { return { h: d === 'L' || d === 'R', sg: (d === 'L' || d === 'U') ? -1 : 1 }; }
// soft shadow strip (black rect blurred along one axis), for cover / uncover. Returns the layer; its origin = the edge.
function tn_shadow(t, name, h, into, sw) {
    var S = jzEvShape(t.comp, name, t.t0, t.dur), g = jzGrp(S, 'shadow');
    if (h) jzAddRect(g, sw, t.H * 1.2, 0, into * sw / 2, t.H / 2); else jzAddRect(g, t.W * 1.2, sw, 0, t.W / 2, into * sw / 2);
    jzAddFill(g, '#000000');
    var b = jzEffect(S, 'ADBE Gaussian Blur 2', 'JZ Trans soft'); jzEP(b, 1, sw); jzEP(b, 2, h ? 2 : 3); jzEP(b, 3, 0);
    return S;
}

/* ---- diagonalWipe — 斜め帯ワイプ: slanted wipe, an accent band runs ahead of the new cut */
jzReg('trans', 'diagonalWipe', {
    plan: function (rng, st) { return { k: rng.range(0.3, 0.55) * (rng.chance(0.5) ? 1 : -1), rev: rng.chance(0.4) }; },
    build: function (t) {
        var W = t.W, H = t.H, k = t.P.k == null ? 0.4 : t.P.k, rev = !!t.P.rev, HD = tn_hd(t) + 'var e=ioc(p);';
        var sl = k * H, n = Math.sqrt(H * H + sl * sl);
        var dx = (rev ? H : -H) / n, dy = sl / n;                 // unit normal of the slanted edge, pointing into the B side
        var ang = Math.atan2(dx, -dy) * 180 / Math.PI; if (ang < 0) ang += 360;
        var lw = jzEffect(t.B, 'ADBE Linear Wipe', 'JZ Trans diagonalWipe'); jzEP(lw, 2, ang); jzEP(lw, 3, 0);
        jzEX(lw, 1, HD + '100*(1-e)');
        // accent band + thin second band on the A side of the edge (width follows bell(p))
        var ext = Math.abs(dx) * W / 2 + Math.abs(dy) * H / 2, band = tn_md(t) * 0.07 * H / n, LEN = (W + H) * 2;
        var S = jzEvShape(t.comp, 'JZ Trans diagonal band', t.t0, t.dur), g2 = jzGrp(S, 'band 2'), g1 = jzGrp(S, 'band');
        var r1 = jzAddRect(g1, 10, LEN, 0, 0, 0), r2 = jzAddRect(g2, 10, LEN, 0, 0, 0);
        jzAddFill(g1, tn_acc(t)); jzAddFill(g2, tn_acc(t, true), 85);
        var BW = HD + 'var bw=' + jzN(band) + '*bell(p);';
        jzSetExpr(r1.property('ADBE Vector Rect Size'), BW + '[bw,' + jzN(LEN) + ']');
        jzSetExpr(r1.property('ADBE Vector Rect Position'), BW + '[bw/2,0]');
        jzSetExpr(r2.property('ADBE Vector Rect Size'), BW + '[bw*0.25,' + jzN(LEN) + ']');
        jzSetExpr(r2.property('ADBE Vector Rect Position'), BW + '[bw*1.475,0]');
        // the layer origin rides on the wipe edge (same sweep as Linear Wipe), its +x axis points into the A side
        jzSetExpr(jzXf(S, 'ADBE Position'), HD + 'var s=' + jzN(ext) + '*(1-2*e);[' + jzN(W / 2) + '+(' + jzN(dx) + ')*s,' + jzN(H / 2) + '+(' + jzN(dy) + ')*s]');
        jzXf(S, 'ADBE Rotate Z').setValue(Math.atan2(-dy, -dx) * 180 / Math.PI);
    }
});

/* ---- clockWipe — クロックワイプ: radial sweep with a clock hand */
jzReg('trans', 'clockWipe', {
    plan: function (rng, st) { return { dir: rng.chance(0.7) ? 1 : -1, a0: rng.pick([-90, -90, 0, 180]) }; },
    build: function (t) {
        var W = t.W, H = t.H, dir = t.P.dir < 0 ? -1 : 1, a0 = t.P.a0 == null ? -90 : t.P.a0, HD = tn_hd(t) + 'var e=ioc(p);';
        var R = Math.sqrt(W * W + H * H) / 2 + 4, lw = tn_lw(t, 0.006), ac = tn_acc(t);
        // Radial Wipe hides the sector that B has NOT reached yet (AE angle 0 = 12 o'clock = canvas -90°)
        var rw = jzEffect(t.B, 'ADBE Radial Wipe', 'JZ Trans clockWipe');
        jzEX(rw, 1, HD + '100*(1-e)');
        if (dir > 0) jzEX(rw, 2, HD + jzN(a0 + 90) + '+360*e'); else jzEP(rw, 2, a0 + 90);
        jzEP(rw, 3, [W / 2, H / 2]); jzEP(rw, 4, 1); jzEP(rw, 5, 0);
        var S = jzEvShape(t.comp, 'JZ Trans clock hand', t.t0, t.dur), g2 = jzGrp(S, 'hub'), g = jzGrp(S, 'hand');
        jzAddPath(g, [[0, 0], [R, 0]], false);
        var sk = jzAddStroke(g, ac, lw); sk.property('ADBE Vector Stroke Line Cap').setValue(2);
        jzAddEllipse(g2, lw * 4.4, lw * 4.4, 0, 0); jzAddFill(g2, ac);
        jzXf(S, 'ADBE Position').setValue([W / 2, H / 2]);
        jzSetExpr(jzXf(S, 'ADBE Rotate Z'), HD + jzN(a0) + '+' + jzN(360 * dir) + '*e');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + '100*Math.pow(bell(p),0.5)');
    }
});

/* ---- irisOpen — アイリスイン: a circle opens on the new cut, rimmed by two accent rings */
jzReg('trans', 'irisOpen', {
    plan: function (rng, st) { return { x: 0.5 + rng.range(-0.12, 0.12), y: 0.5 + rng.range(-0.1, 0.1) }; },
    build: function (t) {
        var W = t.W, H = t.H, cx = W * (t.P.x == null ? 0.5 : t.P.x), cy = H * (t.P.y == null ? 0.5 : t.P.y);
        var R = Math.sqrt(Math.pow(Math.max(cx, W - cx), 2) + Math.pow(Math.max(cy, H - cy), 2)) + 4, lw = tn_lw(t, 0.009);
        var HD = tn_hd(t) + 'var r=' + jzN(R) + '*ioc(p);';
        // the old cut stays on top (copy) and the iris (32-gon) cuts a growing hole into it
        var C = tn_copy(t, t.A, 'JZ Trans iris (prev cut)');
        var iw = jzEffect(C, 'ADBE Iris Wipe', 'JZ Trans irisOpen');
        jzEP(iw, 1, [cx, cy]); jzEP(iw, 2, 32); jzEP(iw, 4, 0); jzEP(iw, 7, 0);
        jzEX(iw, 3, HD + 'r/0.995');
        var S = jzEvShape(t.comp, 'JZ Trans iris rings', t.t0, t.dur), g1 = jzGrp(S, 'ring'), g2 = jzGrp(S, 'ring 2');
        var e1 = jzAddEllipse(g1, 10, 10, 0, 0), e2 = jzAddEllipse(g2, 10, 10, 0, 0);
        jzAddStroke(g1, tn_acc(t), lw); jzAddStroke(g2, tn_acc(t, true), lw * 0.4, 60);
        jzSetExpr(e1.property('ADBE Vector Ellipse Size'), HD + 'var d=2*r+' + jzN(lw) + ';[d,d]');
        jzSetExpr(e2.property('ADBE Vector Ellipse Size'), HD + 'var d=2*(r*1.06+' + jzN(lw * 2.5) + ');[d,d]');
        jzXf(S, 'ADBE Position').setValue([cx, cy]);
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + '100*Math.pow(bell(p),0.6)');
    }
});

/* ---- pushSlide — プッシュ: the new cut shoves the old one out */
jzReg('trans', 'pushSlide', {
    plan: function (rng, st) { return { dir: rng.wpick([['L', 3], ['R', 1.6], ['U', 1.4], ['D', 0.6]]) }; },
    build: function (t) {
        var W = t.W, H = t.H, D = tn_dirv(t.P.dir || 'L'), Lx = D.h ? W : H, sg = D.sg;
        var HD = tn_hd(t) + 'var off=Math.round(ioc(p)*' + jzN(Lx) + ')*' + sg + ';';
        var bo = 'off-(' + jzN(sg * Lx) + ')';
        tn_xf(t.A, 'JZ Trans out pushSlide', HD, { pos: D.h ? ['off', '0'] : ['0', 'off'] });
        tn_xf(t.B, 'JZ Trans in pushSlide', HD, { pos: D.h ? [bo, '0'] : ['0', bo] });
        // accent line on the seam
        var lw = tn_lw(t, 0.005), S = jzEvShape(t.comp, 'JZ Trans push seam', t.t0, t.dur), g = jzGrp(S, 'seam');
        if (D.h) jzAddRect(g, lw, H, 0, 0, H / 2); else jzAddRect(g, W, lw, 0, W / 2, 0);
        jzAddFill(g, tn_acc(t));
        var q = sg < 0 ? jzN(Lx) + '+off' : 'off';
        jzSetExpr(jzXf(S, 'ADBE Position'), HD + (D.h ? '[' + q + ',0]' : '[0,' + q + ']'));
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + '100*Math.pow(bell(p),0.6)');
    }
});

/* ---- cover — カバー: the new cut slides in over the old one, which dims and drifts back */
jzReg('trans', 'cover', {
    plan: function (rng, st) { return { dir: rng.wpick([['L', 2], ['R', 2], ['U', 1.5], ['D', 1]]) }; },
    build: function (t) {
        var W = t.W, H = t.H, D = tn_dirv(t.P.dir || 'L'), Lx = D.h ? W : H, sg = D.sg, sw = tn_md(t) * 0.06;
        var HD = tn_hd(t) + 'var e=ioc(p),bq=Math.round((1-e)*' + jzN(Lx) + ')*' + (-sg) + ',ao=Math.round(e*' + jzN(Lx * 0.18) + ')*' + sg + ';';
        tn_xf(t.A, 'JZ Trans out cover', HD, { pos: D.h ? ['ao', '0'] : ['0', 'ao'] });
        tn_xf(t.B, 'JZ Trans in cover', HD, { pos: D.h ? ['bq', '0'] : ['0', 'bq'] });
        // under B: soft shadow ahead of its incoming edge, and the dimming of A
        var Sh = tn_shadow(t, 'JZ Trans cover shadow', D.h, -sg, sw);
        var edge = sg > 0 ? jzN(Lx) + '+bq' : 'bq';
        jzSetExpr(jzXf(Sh, 'ADBE Position'), HD + (D.h ? '[' + edge + ',0]' : '[0,' + edge + ']'));
        jzSetExpr(jzXf(Sh, 'ADBE Opacity'), HD + '90*bell(p)');
        var Dk = tn_solid(t, '#000000', 'JZ Trans cover dim', HD + '45*e');
        Dk.moveAfter(t.B); Sh.moveAfter(t.B);
    }
});

/* ---- uncover — アンカバー: the old cut slides away and uncovers the new one waiting underneath */
jzReg('trans', 'uncover', {
    plan: function (rng, st) { return { dir: rng.wpick([['L', 2], ['R', 2], ['U', 1.6], ['D', 1]]) }; },
    build: function (t) {
        var W = t.W, H = t.H, D = tn_dirv(t.P.dir || 'L'), Lx = D.h ? W : H, sg = D.sg, sw = tn_md(t) * 0.07;
        var HD = tn_hd(t) + 'var e=ioc(p),ao=Math.round(e*' + jzN(Lx) + ')*' + sg + ';';
        var C = tn_copy(t, t.A, 'JZ Trans uncover (prev cut)');
        tn_xf(C, 'JZ Trans uncover slide', HD, { pos: D.h ? ['ao', '0'] : ['0', 'ao'] });
        tn_xf(t.B, 'JZ Trans in uncover', HD, { sc: '1.05-0.05*oc(p)' });
        // between B and the sliding copy: dimming of B + soft shadow behind the trailing edge
        var Sh = tn_shadow(t, 'JZ Trans uncover shadow', D.h, sg, sw);
        var edge = sg > 0 ? 'ao' : jzN(Lx) + '+ao';
        jzSetExpr(jzXf(Sh, 'ADBE Position'), HD + (D.h ? '[' + edge + ',0]' : '[0,' + edge + ']'));
        jzSetExpr(jzXf(Sh, 'ADBE Opacity'), HD + '100*bell(p)');
        var Dk = tn_solid(t, '#000000', 'JZ Trans uncover dim', HD + '40*(1-e)');
        Dk.moveAfter(C); Sh.moveAfter(C);
    }
});

/* ---- zoomThrough — ズームスルー: the old cut rushes past the camera while the new one settles in */
jzReg('trans', 'zoomThrough', {
    plan: function (rng, st) { return { z: rng.range(1.5, 2.2) }; },
    build: function (t) {
        var z = t.P.z || 1.8, HD = tn_hd(t) + 'var sa=1+' + jzN(z - 1) + '*Math.pow(p,1.4),aa=1-ic(p*1.12);';
        var E = tn_copy(t, t.A, 'JZ Trans zoom echo');                 // (created first → ends up above the main copy)
        tn_xf(E, 'JZ Trans zoom echo', HD, { sc: 'sa*(1+0.08*p)', op: '(p>0.08&&aa>0.15)?aa*0.35:0' });
        var C = tn_copy(t, t.A, 'JZ Trans zoom (prev cut)');
        tn_xf(C, 'JZ Trans zoom out', HD, { sc: 'sa', op: 'aa' });
        tn_xf(t.B, 'JZ Trans in zoomThrough', HD, { sc: '0.86+0.14*oc(p)' });
        var bg = tn_solid(t, t.sc.bg, 'JZ Trans zoom bg'); bg.moveAfter(t.B);
    }
});

/* ---- doorsOpen — 観音開き: the old cut splits down the middle and swings open */
jzReg('trans', 'doorsOpen', {
    plan: function (rng, st) { return { vert: rng.chance(0.3) }; },
    build: function (t) {
        var W = t.W, H = t.H, v = !!t.P.vert, lw = tn_lw(t, 0.005), ac = tn_acc(t), Lx = v ? H : W, hw = Math.floor(Lx / 2);
        var HD = tn_hd(t) + 'var e=ioc(p),off=Math.round(e*' + jzN(Lx - hw + lw * 2) + ');';
        var D1 = tn_copy(t, t.A, 'JZ Trans door 1'), D2 = tn_copy(t, t.A, 'JZ Trans door 2');
        if (!v) { tn_mask(D1, 0, 0, hw, H); tn_mask(D2, hw, 0, W, H); } else { tn_mask(D1, 0, 0, W, hw); tn_mask(D2, 0, hw, W, H); }
        tn_xf(D1, 'JZ Trans door', HD, { pos: v ? ['0', '-off'] : ['-off', '0'] });
        tn_xf(D2, 'JZ Trans door', HD, { pos: v ? ['0', 'off'] : ['off', '0'] });
        // behind the doors: the new cut settles from 93 % over its background, dimmed at first
        var Dk = tn_solid(t, '#000000', 'JZ Trans doors dim', HD + '35*(1-e)'); Dk.moveBefore(t.B);
        tn_xf(t.B, 'JZ Trans in doorsOpen', HD, { sc: '0.93+0.07*oc(p)' });
        var bg = tn_solid(t, t.sc.bg, 'JZ Trans doors bg'); bg.moveAfter(t.B);
        // accent bars on the inner edges
        var S = jzEvShape(t.comp, 'JZ Trans door edges', t.t0, t.dur), g1 = jzGrp(S, 'edge 1'), g2 = jzGrp(S, 'edge 2');
        if (!v) { jzAddRect(g1, lw, H, 0, hw - lw / 2, H / 2); jzAddRect(g2, lw, H, 0, hw + lw / 2, H / 2); }
        else { jzAddRect(g1, W, lw, 0, W / 2, hw - lw / 2); jzAddRect(g2, W, lw, 0, W / 2, hw + lw / 2); }
        jzAddFill(g1, ac); jzAddFill(g2, ac);
        jzSetExpr(jzGX(g1).property('ADBE Vector Position'), HD + (v ? '[0,-off]' : '[-off,0]'));
        jzSetExpr(jzGX(g2).property('ADBE Vector Position'), HD + (v ? '[0,off]' : '[off,0]'));
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + '100*Math.pow(bell(p),0.5)');
    }
});

/* ---- blinds — ブラインド転換: slats flip over one after another */
jzReg('trans', 'blinds', {
    plan: function (rng, st) { return { n: rng.int(7, 12), vert: rng.chance(0.35), rev: rng.chance(0.4) }; },
    build: function (t) {
        var W = t.W, H = t.H, n = Math.max(2, Math.round(t.P.n || 9)), v = !!t.P.vert, rev = !!t.P.rev, Lx = v ? W : H;
        var lw = Math.max(1, tn_md(t) * 0.003), ac = tn_acc(t), HS = tn_hs(t) + TN_IOC;
        // the old cut stays on top (copy); a matte of growing slats cuts it away
        var C = tn_copy(t, t.A, 'JZ Trans blinds (prev cut)');
        var M = jzEvShape(t.comp, 'JZ Trans blinds matte', t.t0, t.dur), Ln = jzEvShape(t.comp, 'JZ Trans blinds lines', t.t0, t.dur);
        for (var i = 0; i < n; i++) {
            var k = rev ? n - 1 - i : i, a0 = Math.round(i * Lx / n), a1 = Math.round((i + 1) * Lx / n);
            var Q = HS + 'var q=ioc(p*1.55-' + jzN(k / n * 0.55) + ');';
            var g = jzGrp(M, 'slat ' + (i + 1));
            if (v) jzAddRect(g, a1 - a0 + 1, H, 0, a0 + (a1 - a0 + 1) / 2, H / 2); else jzAddRect(g, W, a1 - a0 + 1, 0, W / 2, a0 + (a1 - a0 + 1) / 2);
            jzAddFill(g, '#FFFFFF');
            var gx = jzGX(g);
            gx.property('ADBE Vector Anchor').setValue(v ? [a0, 0] : [0, a0]); gx.property('ADBE Vector Position').setValue(v ? [a0, 0] : [0, a0]);
            jzSetExpr(gx.property('ADBE Vector Scale'), Q + (v ? '[100*q,100]' : '[100,100*q]'));
            var gl = jzGrp(Ln, 'line ' + (i + 1));
            if (v) jzAddRect(gl, lw, H, 0, a0 + lw / 2, H / 2); else jzAddRect(gl, W, lw, 0, W / 2, a0 + lw / 2);
            jzAddFill(gl, ac);
            jzSetExpr(jzGX(gl).property('ADBE Vector Position'), Q + 'var d=' + jzN(a1 - a0) + '*q;' + (v ? '[d,0]' : '[0,d]'));
            jzSetExpr(jzGX(gl).property('ADBE Vector Group Opacity'), Q + '(q>0&&q<1)?100*(1-q):0');
        }
        tn_matte(M, C, TrackMatteType.ALPHA_INVERTED);
    }
});

/* ---- checker — 市松転換: squares open in two chequered waves */
jzReg('trans', 'checker', {
    plan: function (rng, st) { return { n: rng.int(4, 6), rev: rng.chance(0.5) }; },
    build: function (t) {
        var W = t.W, H = t.H, n = Math.max(2, Math.round(t.P.n || 5)), rev = !!t.P.rev, cell = tn_md(t) / n;
        var cols = Math.ceil(W / cell - 1e-6), rows = Math.ceil(H / cell - 1e-6), HS = tn_hs(t) + 'function oc(x){x=cl(x);return 1-Math.pow(1-x,3);}';
        var C = tn_copy(t, t.A, 'JZ Trans checker (prev cut)');
        var M = jzEvShape(t.comp, 'JZ Trans checker matte', t.t0, t.dur);
        for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
            var d = ((i + j) % 2) * 0.32 + 0.18 * ((rev ? cols - 1 - i : i) + j) / Math.max(1, cols + rows - 2);
            var x0 = Math.round(i * W / cols), x1 = Math.round((i + 1) * W / cols), y0 = Math.round(j * H / rows), y1 = Math.round((j + 1) * H / rows);
            var mx = (x0 + x1) / 2, my = (y0 + y1) / 2, g = jzGrp(M, 'cell ' + (i + 1) + '/' + (j + 1));
            jzAddRect(g, x1 - x0 + 1, y1 - y0 + 1, 0, mx, my); jzAddFill(g, '#FFFFFF');
            var gx = jzGX(g); gx.property('ADBE Vector Anchor').setValue([mx, my]); gx.property('ADBE Vector Position').setValue([mx, my]);
            jzSetExpr(gx.property('ADBE Vector Scale'), HS + 'var q=oc((p-' + jzN(d) + ')/0.5);if(q>0.97)q=1;[100*q,100*q]');
        }
        tn_matte(M, C, TrackMatteType.ALPHA_INVERTED);
    }
});

/* ---- blockDissolve — ブロック崩し: random blocks flip to the new cut, each with a short accent flash */
jzReg('trans', 'blockDissolve', {
    plan: function (rng, st) { return { n: rng.int(7, 11), side: rng.pick([0, 0, 1, 2]) }; },
    build: function (t) {
        var W = t.W, H = t.H, n = Math.max(2, Math.round(t.P.n || 9)), side = t.P.side || 0, cell = tn_md(t) / n;
        var cols = Math.ceil(W / cell - 1e-6), rows = Math.ceil(H / cell - 1e-6), bw = W / cols, bh = H / rows;
        var HD = tn_hd(t) + (side ? 'function fr(x,b){return cl(((x-0.02)/0.84-0.45*b)/0.55);}' : 'function fr(x,b){return cl((x-0.02)/0.84);}');
        // Block Dissolve has no seed: the copy of the old cut and the accent flash layer share name, size and blocks, so the flash
        // (dissolving 0.1 later, under the copy) shows exactly on the blocks that flipped last.
        // side 1 / 2 (the browser biases the flip time towards the left / top): bands of block columns / rows, each with its own
        // completion = the share of its blocks flipped by then
        var NM = 'JZ Trans blocks', N = side === 1 ? cols : side === 2 ? rows : 1, nb = side ? Math.min(5, N) : 1;
        for (var k = 0; k < nb; k++) {
            var c0 = Math.floor(k * N / nb), c1 = Math.floor((k + 1) * N / nb), bias = side ? ((c0 + c1 - 1) / 2) / Math.max(1, N - 1) : 0;
            // flash fades in two steps (blocks younger than 0.04: ~67 %, up to 0.1: 40 %) like the browser's 0.75 → 0 fade
            var C = tn_copy(t, t.A, NM), F1 = tn_solid(t, tn_acc(t), NM), F2 = tn_solid(t, tn_acc(t), NM);
            F2.moveAfter(C); F1.moveAfter(C); jzXf(F1, 'ADBE Opacity').setValue(45); jzXf(F2, 'ADBE Opacity').setValue(40);
            var Ls = [[C, 'p'], [F1, 'p-0.04'], [F2, 'p-0.1']];
            for (var i = 0; i < Ls.length; i++) {
                var L = Ls[i][0], o0 = k ? 1 : 0, o1 = k < nb - 1 ? 1 : 0;   // neighbouring bands overlap by 2 px (no seams)
                if (side === 1) tn_mask(L, Math.round(c0 * bw) - o0, 0, Math.round(c1 * bw) + o1, H);
                else if (side === 2) tn_mask(L, 0, Math.round(c0 * bh) - o0, W, Math.round(c1 * bh) + o1);
                var bd = jzEffect(L, 'ADBE Block Dissolve', 'JZ Trans blockDissolve');
                jzEP(bd, 2, bw); jzEP(bd, 3, bh); jzEP(bd, 4, 0); jzEP(bd, 5, 0);
                jzEX(bd, 1, HD + '100*fr(' + Ls[i][1] + ',' + jzN(bias) + ')');
            }
        }
    }
});

/* ---- whipPan — ホイップパン: both frames rush sideways, smeared by motion blur */
jzReg('trans', 'whipPan', {
    plan: function (rng, st) { return { dir: rng.chance(0.65) ? -1 : 1, vert: rng.chance(0.2) }; },
    build: function (t) {
        var W = t.W, H = t.H, dir = t.P.dir > 0 ? 1 : -1, v = !!t.P.vert, Lx = v ? H : W;
        var HD = tn_hd(t) + 'var off=Math.round(ioq(p)*' + jzN(Lx) + ')*' + dir + ';';
        var bo = 'off-(' + jzN(Lx * dir) + ')';
        tn_xf(t.A, 'JZ Trans out whipPan', HD, { pos: v ? ['0', 'off'] : ['off', '0'] });
        tn_xf(t.B, 'JZ Trans in whipPan', HD, { pos: v ? ['0', bo] : [bo, '0'] });
        var Aj = jzAdjLayer(t.comp, 'JZ Trans whip blur', t.t0, t.dur); Aj.moveBefore(t.B);
        var mb = jzEffect(Aj, 'ADBE Motion Blur', 'JZ Trans whip smear'); jzEP(mb, 1, v ? 0 : 90);
        jzEX(mb, 2, HD + jzN(Lx * 0.13) + '*Math.pow(bell(p),2)');
    }
});

/* ---- spinOut — 回転アウト: the old cut spins away into the distance, revealing the new one */
jzReg('trans', 'spinOut', {
    plan: function (rng, st) { return { rot: rng.range(100, 200) * (rng.chance(0.5) ? 1 : -1) }; },
    build: function (t) {
        var W = t.W, H = t.H, rot = t.P.rot || 150, md = tn_md(t), lw = tn_lw(t, 0.008);
        var HD = tn_hd(t) + 'var e=ic(p),s=1-e;';
        var C = tn_copy(t, t.A, 'JZ Trans spin (prev cut)');
        tn_xf(C, 'JZ Trans spin', HD, { sc: 's', rot: jzN(rot) + '*e' });
        // its shadow turns with it (offset 0.02 / 0.03 minD in the spinning frame)
        var ds = jzEffect(C, 'ADBE Drop Shadow', 'JZ Trans spin shadow');
        jzEP(ds, 1, [0, 0, 0]); jzEP(ds, 2, 89); jzEP(ds, 5, 0);
        jzEX(ds, 3, HD + '146.31+' + jzN(rot) + '*e');
        jzEX(ds, 4, HD + jzN(md * 0.0361) + '*s');
        var Dk = tn_solid(t, '#000000', 'JZ Trans spin dim', HD + '40*(1-oc(p))'); Dk.moveBefore(t.B);
        tn_xf(t.B, 'JZ Trans in spinOut', HD, { sc: '1.08-0.08*oc(p)' });
        // accent frame around the spinning picture (screen-constant line width)
        var S = jzEvShape(t.comp, 'JZ Trans spin frame', t.t0, t.dur), g = jzGrp(S, 'frame');
        var r = jzAddRect(g, W, H, 0, 0, 0); jzAddStroke(g, tn_acc(t), lw);
        jzSetExpr(r.property('ADBE Vector Rect Size'), HD + '[Math.max(0,' + jzN(W) + '*s-' + jzN(lw) + '),Math.max(0,' + jzN(H) + '*s-' + jzN(lw) + ')]');
        jzXf(S, 'ADBE Position').setValue([W / 2, H / 2]);
        jzSetExpr(jzXf(S, 'ADBE Rotate Z'), HD + jzN(rot) + '*e');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + 's<0.01?0:100*Math.min(1,p*6)');
    }
});

/* ---- inkBlob — インク: an organic splash spreads from a point, rimmed in accent ink */
// smooth closed blob path (Catmull-Rom tangents) of radius R around the group origin, frozen at phase ph
function tn_blob(g, s0, R, ph) {
    var n = 72, v = [], it = [], ot = [], i, TAU = Math.PI * 2;
    var q1 = jzR(s0, 1, 17, 0) * 6, q2 = jzR(s0, 2, 17, 0) * 6, q3 = jzR(s0, 3, 17, 0) * 6;
    for (i = 0; i < n; i++) {
        var a = i / n * TAU, w = 1 + 0.13 * Math.sin(a * 3 + q1 + ph) + 0.08 * Math.sin(a * 5 + q2 - ph * 1.3) + 0.05 * Math.sin(a * 9 + q3 + ph * 0.7);
        v.push([Math.cos(a) * R * w, Math.sin(a) * R * w]);
    }
    for (i = 0; i < n; i++) {
        var P0 = v[(i + n - 1) % n], P2 = v[(i + 1) % n], tx = (P2[0] - P0[0]) / 6, ty = (P2[1] - P0[1]) / 6;
        ot.push([tx, ty]); it.push([-tx, -ty]);
    }
    var p = jzVecs(g).addProperty('ADBE Vector Shape - Group'), sh = new Shape();
    sh.vertices = v; sh.inTangents = it; sh.outTangents = ot; sh.closed = true;
    p.property('ADBE Vector Shape').setValue(sh);
    return p;
}
jzReg('trans', 'inkBlob', {
    plan: function (rng, st) { return { x: rng.pick([0.5, 0.5, 0.15, 0.85]) + rng.range(-0.08, 0.08), y: rng.pick([0.5, 0.25, 0.8]) + rng.range(-0.06, 0.06) }; },
    build: function (t) {
        var W = t.W, H = t.H, cx = W * (t.P.x == null ? 0.5 : t.P.x), cy = H * (t.P.y == null ? 0.5 : t.P.y), md = tn_md(t), ac = tn_acc(t);
        var s0 = (t.cut && t.cut.seed) || 7, TAU = Math.PI * 2;
        var R = Math.sqrt(Math.pow(Math.max(cx, W - cx), 2) + Math.pow(Math.max(cy, H - cy), 2)) * 1.36;
        var HD = tn_hd(t) + 'var e=ios(p),r=' + jzN(R) + '*e,rim=' + jzN(md * 0.035) + '*(0.4+e);';
        // the old cut on top (copy) with the blob as inverted matte → the new cut shows inside the blob
        var C = tn_copy(t, t.A, 'JZ Trans ink (prev cut)');
        var M = jzEvShape(t.comp, 'JZ Trans ink matte', t.t0, t.dur), gm = jzGrp(M, 'blob');
        tn_blob(gm, s0, R, 1.2); jzAddFill(gm, '#FFFFFF');
        jzSetExpr(jzGX(gm).property('ADBE Vector Scale'), HD + 'var k=100*r/' + jzN(R) + ';[k,k]');
        jzSetExpr(jzGX(gm).property('ADBE Vector Rotation'), HD + '24*p');
        jzXf(M, 'ADBE Position').setValue([cx, cy]);
        // accent rim (blob grown by `rim`) + droplets, kept out of the blob by a second copy of the matte
        var Rm = jzEvShape(t.comp, 'JZ Trans ink rim', t.t0, t.dur);
        for (var k = 0; k < 6; k++) {
            var a = jzR(s0, k, 7, 0) * TAU, f = 1.12 + 0.3 * jzR(s0, k, 8, 0), rr = md * (0.008 + 0.02 * jzR(s0, k, 9, 0));
            var gd = jzGrp(Rm, 'drop ' + (k + 1)), ee = jzAddEllipse(gd, 10, 10, 0, 0); jzAddFill(gd, ac);
            jzSetExpr(ee.property('ADBE Vector Ellipse Size'), HD + 'var d=' + jzN(2 * rr) + '*cl(p*4);[d,d]');
            jzSetExpr(jzGX(gd).property('ADBE Vector Position'), HD + 'var d=r*' + jzN(f) + '+rim;[' + jzN(Math.cos(a)) + '*d,' + jzN(Math.sin(a)) + '*d]');
        }
        var gr = jzGrp(Rm, 'rim'); tn_blob(gr, s0, R, 1.2); jzAddFill(gr, ac);
        jzSetExpr(jzGX(gr).property('ADBE Vector Scale'), HD + 'var k=100*(r+rim)/' + jzN(R) + ';[k,k]');
        jzSetExpr(jzGX(gr).property('ADBE Vector Rotation'), HD + '24*p');
        jzXf(Rm, 'ADBE Position').setValue([cx, cy]);
        jzSetExpr(jzXf(Rm, 'ADBE Opacity'), HD + '100*(1-sm(0.75,0.98,p))');
        var M2 = M.duplicate(); M2.name = 'JZ Trans ink matte 2';
        tn_matte(M, C, TrackMatteType.ALPHA_INVERTED);
        Rm.moveBefore(M);
        tn_matte(M2, Rm, TrackMatteType.ALPHA_INVERTED);
    }
});

/* ---- shatterTiles — タイル崩落: the old cut breaks into tiles that tumble down */
jzReg('trans', 'shatterTiles', {
    plan: function (rng, st) { return { n: rng.int(6, 9), x: rng.range(0.3, 0.7), y: rng.range(0.3, 0.6) }; },
    build: function (t) {
        var W = t.W, H = t.H, n = Math.max(2, Math.round(t.P.n || 7)), cell = Math.max(W, H) / n, s0 = (t.cut && t.cut.seed) || 7;
        var cols = Math.ceil(W / cell - 1e-6), rows = Math.ceil(H / cell - 1e-6), D = Math.sqrt(W * W + H * H);
        var cx = W * (t.P.x == null ? 0.5 : t.P.x), cy = H * (t.P.y == null ? 0.45 : t.P.y);
        var HS = tn_hs(t) + 'function sm(a,b,x){x=cl((x-a)/(b-a));return x*x*(3-2*x);}';
        // one masked copy of the old cut per tile; tiles start falling outwards from (x, y)
        for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
            var x0 = Math.round(i * W / cols), x1 = Math.round((i + 1) * W / cols), y0 = Math.round(j * H / rows), y1 = Math.round((j + 1) * H / rows);
            var mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
            var d = 0.5 * Math.sqrt((mx - cx) * (mx - cx) + (my - cy) * (my - cy)) / D * 1.4 + 0.08 * jzR(s0, i, j, 3);
            var T = HS + 'var t=cl((p-' + jzN(Math.min(0.55, d)) + ')/0.45);';
            var Tl = tn_copy(t, t.A, 'JZ Trans tile ' + (i + 1) + '/' + (j + 1));
            tn_mask(Tl, x0, y0, x1, y1);
            tn_xf(Tl, 'JZ Trans tile', T, {
                anc: [mx, my],
                pos: [jzN((jzR(s0, i, j, 4) * 2 - 1) * W * 0.12) + '*t', '(t*t*1.25-' + jzN(jzR(s0, i, j, 6) * 0.08) + '*t)*' + jzN(H)],
                sc: '1-0.25*t', rot: jzN((jzR(s0, i, j, 5) * 2 - 1) * 70) + '*t', op: '1-sm(0.7,1,t)'
            });
        }
        var Dk = tn_solid(t, '#000000', 'JZ Trans shatter dim', tn_hd(t) + '30*(1-oc(p))'); Dk.moveBefore(t.B);
    }
});

/* ---- sliceShift — 短冊ずらし: strips slide in alternate directions, trading the old cut for the new */
jzReg('trans', 'sliceShift', {
    plan: function (rng, st) { return { n: rng.int(5, 9), vert: rng.chance(0.25) }; },
    build: function (t) {
        var W = t.W, H = t.H, n = Math.max(2, Math.round(t.P.n || 7)), v = !!t.P.vert, Lx = v ? W : H, Mx = v ? H : W;
        var lw = Math.max(1, tn_md(t) * 0.003), HS = tn_hs(t) + TN_IOC;
        for (var i = 0; i < n; i++) {
            var a0 = Math.round(i * Lx / n), a1 = Math.round((i + 1) * Lx / n), sg = i % 2 ? 1 : -1;
            var O = HS + 'var o=Math.round(ioc((p-' + jzN(i / Math.max(1, n - 1) * 0.3) + ')/0.7)*' + jzN(Mx) + ')*' + sg + ';';
            var pr = [[t.A, 'o', 'A'], [t.B, 'o-(' + jzN(sg * Mx) + ')', 'B']];
            for (var q = 0; q < 2; q++) {
                var C = tn_copy(t, pr[q][0], 'JZ Trans slice ' + pr[q][2] + (i + 1));
                if (v) tn_mask(C, a0, 0, a1, H); else tn_mask(C, 0, a0, W, a1);
                tn_xf(C, 'JZ Trans slice', O, { pos: v ? ['0', pr[q][1]] : [pr[q][1], '0'] });
            }
        }
        var S = jzEvShape(t.comp, 'JZ Trans slice lines', t.t0, t.dur);
        for (var k = 1; k < n; k++) {
            var a = Math.round(k * Lx / n), g = jzGrp(S, 'line ' + k);
            if (v) jzAddRect(g, lw, H, 0, a, H / 2); else jzAddRect(g, W, lw, 0, W / 2, a);
            jzAddFill(g, tn_acc(t));
        }
        jzSetExpr(jzXf(S, 'ADBE Opacity'), tn_hd(t) + '90*Math.pow(bell(p),0.7)');
    }
});

/* ---- cubeTurn — キューブ: faux-3D cube turn — each face is drawn in vertical slices (masked copies) like the browser */
jzReg('trans', 'cubeTurn', {
    plan: function (rng, st) { return { dir: rng.chance(0.6) ? 1 : -1 }; },
    build: function (t) {
        var W = t.W, H = t.H, dir = t.P.dir < 0 ? -1 : 1, K = 8, SW = W / K;
        var HS = tn_hs(t) + TN_IOC + 'var ph=ioc(p)*Math.PI/2,cs=Math.cos(ph),sn=Math.sin(ph),DR=' + dir + ',CW=' + jzN(W) + ',CH=' + jzN(H) + ';' +
            'function prj(x,z){var xr=(x*cs-z*sn)*DR,zr=x*sn+z*cs,k=2.4/(3.4-zr);return [CW/2+xr*k*CW/2,k*CH/2];}';
        // faces: A = front (edges (-1,1)→(1,1)), B = side ((1,1)→(1,-1)); shade = black Fill
        var faces = [[t.A, [-1, 1], [1, 1], '0.55*(1-cs)', 'A'], [t.B, [1, 1], [1, -1], '0.55*(1-sn)', 'B']];
        for (var f = 0; f < 2; f++) {
            var F = faces[f], e0 = F[1], e1 = F[2];
            var vis = 'var f0=prj(' + e0[0] + ',' + e0[1] + '),f1=prj(' + e1[0] + ',' + e1[1] + '),vis=(f1[0]-f0[0])*DR>0.5;';
            for (var k = 1; k <= K; k++) {
                var u0 = (k - 1) / K, u1 = k / K, su = dir > 0 ? (k - 1) / K : 1 - k / K;
                var X0 = e0[0] + (e1[0] - e0[0]) * u0, Z0 = e0[1] + (e1[1] - e0[1]) * u0, X1 = e0[0] + (e1[0] - e0[0]) * u1, Z1 = e0[1] + (e1[1] - e0[1]) * u1;
                var Q = HS + vis + 'var q0=prj(' + jzN(X0) + ',' + jzN(Z0) + '),q1=prj(' + jzN(X1) + ',' + jzN(Z1) + '),xa=Math.min(q0[0],q1[0]),xb=Math.max(q0[0],q1[0]),hv=(q0[1]+q1[1])/2;';
                var C = tn_copy(t, F[0], 'JZ Trans cube ' + F[4] + k);
                tn_mask(C, su * W - 0.5, 0, su * W + SW + 0.5, H);
                var sh = jzEffect(C, 'ADBE Fill', 'JZ Trans cube shade'); jzEP(sh, 3, [0, 0, 0]);
                jzEX(sh, 7, Q + F[3]);
                var e = jzEffect(C, 'ADBE Geometry2', 'JZ Trans cube face');
                jzEP(e, 1, [su * W + SW / 2, H / 2]); jzEP(e, 3, 0);
                jzEX(e, 2, Q + '[(xa+xb)/2,CH/2]');
                jzEX(e, 4, Q + '100*2*hv/CH');
                jzEX(e, 5, Q + '100*(xb-xa+1)/' + jzN(SW));
                jzEX(e, 9, Q + 'vis?100:0');
            }
        }
        // the void behind the cube: both backgrounds darkened, cross-fading
        var S2 = tn_solid(t, jzMixHex(t.sc.bg, '#000000', 0.55), 'JZ Trans cube back 2', tn_hd(t) + '100*p'); S2.moveBefore(t.B);
        var S1 = tn_solid(t, jzMixHex((t.scPrev || t.sc).bg, '#000000', 0.55), 'JZ Trans cube back'); S1.moveBefore(t.B);
    }
});

/* ---- flashCross — フラッシュ転換: a quick flash of light carries the cut over */
jzReg('trans', 'flashCross', {
    plan: function (rng, st) { return { c: rng.chance(0.3) ? 'accent' : 'white' }; },
    build: function (t) {
        var pb = (t.scPrev || t.sc).bg, light = jzLum(pb) > 0.62 && jzLum(t.sc.bg) > 0.62;
        var fl = (t.P.c === 'accent' || light) ? tn_acc(t) : '#FFFFFF', HD = tn_hd(t);
        // cross-dissolve: the old cut (a copy on top) fades out between p .30 and .62 …
        var C = tn_copy(t, t.A, 'JZ Trans flash (prev cut)');
        jzSetExpr(jzXf(C, 'ADBE Opacity'), HD + '100*(1-sm(0.3,0.62,p))');
        // … under a flash that peaks at p .45
        tn_solid(t, fl, 'JZ Trans flash', HD + 'var a=p<0.45?iq(p/0.45):1-oc((p-0.45)/0.55);92*a');
    }
});

/* ---- pixelate — モザイク転換: the old cut breaks into big pixels, the new one resolves out of them */
jzReg('trans', 'pixelate', {
    plan: function (rng, st) { return { k: rng.range(11, 17) }; },
    build: function (t) {
        var W = t.W, H = t.H, maxB = tn_md(t) / (t.P.k || 14);
        var HD = tn_hd(t) + 'function mb(q){var bs=1+' + jzN(maxB - 1) + '*q;return bs<1.6?[' + W + ',' + H + ']:[Math.ceil(' + W + '/bs),Math.ceil(' + H + '/bs)];}';
        var Bc = tn_copy(t, t.B, 'JZ Trans pixelate (new cut)'), Ac = tn_copy(t, t.A, 'JZ Trans pixelate (prev cut)');
        var ls = [[Ac, 'ic(p/0.55)'], [Bc, 'ic((1-p)/0.55)']];
        for (var i = 0; i < 2; i++) {
            var mo = jzEffect(ls[i][0], 'ADBE Mosaic', 'JZ Trans pixelate'); jzEP(mo, 3, 0);
            jzEX(mo, 1, HD + 'mb(' + ls[i][1] + ')[0]');
            jzEX(mo, 2, HD + 'mb(' + ls[i][1] + ')[1]');
        }
        jzSetExpr(jzXf(Bc, 'ADBE Opacity'), HD + '100*sm(0.4,0.6,p)');
    }
});
