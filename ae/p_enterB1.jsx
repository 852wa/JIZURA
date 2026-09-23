// ================================================================ pack enterB part 1 (AE port of src/11p_enterB.js)
// springIn pendulum rollIn slingshot rockSettle bounceBall snapRail fanOpen cylinder shuffle stopMotion ripple zipper zoomAlt
// tiltUp stickerPeel crumple noteUnfold tornJoin splitFlap overexpose glint loupe filmFeed backlight lightLeak
// Per-glyph motion = text animators with Expression Selectors (amount −100..100 % of the animator's value per glyph, via
// textIndex / textTotal). Graphics the browser draws around the item (pins, rails, balls, lenses …) are shape layers parented
// to the text layer (they follow the layout + hold / exit transforms). Clips the browser does per glyph are made with
// linked copies of the text layer ("twins", parented to it, only alive during the entrance) + masks or track mattes.
// Helper graphics the browser draws with ghost off (main pass only) are marked jzNoGhost; twins that stand for the lyric itself are not.

// ---------------------------------------------------------------- shared helpers (eb1_*)
// easings not in JZ_FNS: o4 outQuart, o5 outQuint, io3 inOutCubic, ios inOutSine, sm smoothstep(a, b, x), spr damped spring (1 → 0)
var EB1_FNS = 'function o4(x){x=cl(x);return 1-Math.pow(1-x,4);}function o5(x){x=cl(x);return 1-Math.pow(1-x,5);}' +
    'function io3(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}function ios(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}' +
    'function sm(a,b,x){x=cl((x-a)/(b-a));return x*x*(3-2*x);}' +
    'function spr(t,k,f){t=cl(t);return Math.exp(-k*t)*Math.cos(f*Math.PI*t)*(1-t*t*t);}\n';
// entrance timing of this layer (same numbers as jzHead)
function eb1_T(m) { var c = m.c; return { IN: Math.max(0.02, c.inDur || 0.3), DL: (m.o.mi || 0) * (c.stagger || 0.04) }; }
// compact header for helper layers (IN, DL, SZ, SD, P + easings)
function eb1_head(m) { var t = eb1_T(m); return 'var IN=' + jzN(t.IN) + ',DL=' + jzN(t.DL) + ',SZ=' + jzN(m.size) + ',SD=' + ((m.c.seed % 99991) + (m.o.mi || 0) * 101) + ';' + JZ_FNS + EB1_FNS + 'var P=cl((time-DL)/IN);\n'; }
function eb1_hd(m) { return m.HD + EB1_FNS; }
// browser stg(p, ordLR | ordRL, spread) inside an Expression Selector -> q
function eb1_q(spread, rl) { return 'var n=textTotal,o=n>1?' + (rl ? '1-' : '') + '(textIndex-1)/(n-1):0,q=cl((P-' + jzN(spread) + '*o)/' + jzN(1 - spread) + ');'; }
function eb1_arr(a) { var s = [], i; for (i = 0; i < a.length; i++) s.push(jzN(a[i])); return '[' + s.join(',') + ']'; }
function eb1_isHex(c) { return typeof c === 'string' && c.charAt(0) === '#' && (c.length === 7 || c.length === 4); }
function eb1_pick(a, b, c) { if (eb1_isHex(a)) return a; if (eb1_isHex(b)) return b; if (eb1_isHex(c)) return c; return '#FFFFFF'; }
// the browser's J.h / J.r / J.rs (so seeded directions and per-glyph randoms match the web version)
function eb1_h(a, b, c, d, e) {
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
function eb1_r(a, b, c, d) { return eb1_h(a, b, c, d) / 4294967296; }
function eb1_rs(a, b, c, d) { return eb1_r(a, b, c, d) * 2 - 1; }
function eb1_dir(m, salt) { return eb1_r(m.c.seed | 0, salt, 5) < 0.5 ? -1 : 1; }
function eb1_isSp(ch) { return ch === ' ' || ch === '　' || ch === '\t'; }
function eb1_adv(ch) {
    var c = ch.charCodeAt(0);
    if (ch === ' ') return 0.3;
    if (c >= 0xFF61 && c <= 0xFF9F) return 0.5;
    return c < 0x2000 ? 0.56 : 1;
}
// glyph geometry in the text layer's own space, one entry per AE character (textIndex order, spaces included):
//   G.g[i] {i, li (line), ci (index in line), sp, k (index among non-spaces), x, y (centre), w, h}; G.r source rect; G.fs; G.vert (one glyph per line)
//   G.lines[{cy, x0, x1, n}]; G.n = textTotal; G.nk = glyphs without spaces; G.arranged (layout animators / path); G.masked
function eb1_geo(m) {
    var L = m.L, TP = L.property('ADBE Text Properties'), td = TP.property('ADBE Text Document').value, r = jzRect(L), i, j;
    var fs = td.fontSize || m.size, text = String(td.text), trk = (td.tracking || 0) / 1000 * fs;
    var lines = text.split(/\r\n|\r|\n|\u0003/), nL = lines.length, lead = fs * 1.2;
    try { if (!td.autoLeading && td.leading > 0) lead = td.leading; } catch (e0) {}
    var just = 'c';
    try { if (td.justification === ParagraphJustification.LEFT_JUSTIFY) just = 'l'; else if (td.justification === ParagraphJustification.RIGHT_JUSTIFY) just = 'r'; } catch (e1) {}
    var G = { fs: fs, lead: lead, nL: nL, r: r, n: 0, nk: 0, g: [], lines: [], vert: nL > 1, arranged: false, masked: false };
    try { G.arranged = TP.property('ADBE Text Animators').numProperties > 0; } catch (e2) {}
    try { if (TP.property('ADBE Text Path Options').property('ADBE Text Path').value > 0) G.arranged = true; } catch (e3) {}
    try { G.masked = L.property('ADBE Mask Parade').numProperties > 0; } catch (e4) {}
    var rows = [], maxW = 0;
    for (i = 0; i < nL; i++) {
        var cs = jzChars(lines[i]), ws = [], w = 0;
        for (j = 0; j < cs.length; j++) { var a = eb1_adv(cs[j]) * fs; ws.push(a); w += a + (j < cs.length - 1 ? trk : 0); }
        if (cs.length > 1) G.vert = false;
        rows.push({ cs: cs, ws: ws, w: w }); if (w > maxW) maxW = w;
    }
    var k = maxW > 0 ? r.width / maxW : 1; if (!(k > 0.5 && k < 2)) k = 1;
    var lh = r.height - (nL - 1) * lead; if (!(lh > fs * 0.5 && lh < fs * 1.6)) lh = fs * 0.95;
    var cx = r.left + r.width / 2;
    for (i = 0; i < nL; i++) {
        var R = rows[i], x = just === 'l' ? r.left : (just === 'r' ? r.left + r.width - R.w * k : cx - R.w * k / 2), y = r.top + lh / 2 + i * lead;
        var ln = { cy: y, x0: x, x1: x + R.w * k, n: 0 };
        for (j = 0; j < R.cs.length; j++) {
            var sp = eb1_isSp(R.cs[j]);
            G.g.push({ i: G.n, li: i, ci: j, sp: sp, k: sp ? -1 : G.nk, x: x + R.ws[j] * k / 2, y: y, w: Math.max(1, R.ws[j] * k), h: fs });
            x += (R.ws[j] + trk) * k; G.n++;
            if (!sp) { G.nk++; ln.n++; }
        }
        G.lines.push(ln);
    }
    G.cx = cx; G.cy = r.top + r.height / 2;
    return G;
}
// the lyric's main copy (not a faded / outline copy): helper graphics only go there
function eb1_main(m) {
    try {
        var td = m.L.property('ADBE Text Properties').property('ADBE Text Document').value;
        if (td.applyFill === false) return false;
        return jzXf(m.L, 'ADBE Opacity').value >= 85;
    } catch (e) { return true; }
}
function eb1_matted(L) { try { return L.trackMatteType !== TrackMatteType.NO_TRACK_MATTE; } catch (e) { return false; } }
// helper layers / twins are skipped for very long lines, for one-glyph-per-layer layouts of long lyrics and when the comp is crowded
function eb1_crowded(m, G) {
    if (G && (G.n > 60 || (G.nk <= 1 && jzCount(m.c.text || '') > 14))) return true;
    try { return m.ctx.comp.numLayers > 60; } catch (e) { return false; }
}
// the layer new helper layers go above (above the lyric's own track matte when it has one)
function eb1_top(m) { var L = m.L; if (eb1_matted(L)) { try { return m.ctx.comp.layer(L.index - 1); } catch (e) {} } return L; }
// helper shape layer in the text layer's own space (parented to it, right above it), only alive during the entrance unless keep
function eb1_shape(m, name, keep, below) {
    var L = m.L, S = m.ctx.comp.layers.addShape(), t = eb1_T(m);
    S.name = name;
    try { if (below) S.moveAfter(L); else S.moveBefore(eb1_top(m)); } catch (e0) {}
    S.parent = L;
    var tr = S.property('ADBE Transform Group');
    tr.property('ADBE Anchor Point').setValue([0, 0]); tr.property('ADBE Position').setValue([0, 0]);
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    if (!keep) { try { S.outPoint = Math.max(S.inPoint + 0.05, Math.min(S.outPoint, t.DL + t.IN + 0.1)); } catch (e1) {} }
    return S;
}
function eb1_sub(g, name) { var s = jzVecs(g).addProperty('ADBE Vector Group'); if (name) s.name = name; return s; }
// linked copy of the text layer: parented to L (follows every move of it), takes L's final text style by expression
// (the treatment is applied later), shows only during the entrance (opacity expression can be replaced)
function eb1_twin(m, tag) {
    var L = m.L, D = L.duplicate(), t = eb1_T(m), i, mns = ['ADBE Position', 'ADBE Scale', 'ADBE Rotate Z', 'ADBE Opacity', 'ADBE Anchor Point'];
    try { D.name = String(L.name).substr(0, 20) + ' ' + (tag || 'JZ In B'); } catch (e0) {}
    var tr = D.property('ADBE Transform Group');
    for (i = 0; i < mns.length; i++) { try { if (tr.property(mns[i]).expression) tr.property(mns[i]).expression = ''; } catch (e1) {} }
    D.parent = L;
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    jzSetExpr(tr.property('ADBE Position'), 'parent.transform.anchorPoint');
    jzSetExpr(tr.property('ADBE Opacity'), eb1_head(m) + 'time>=DL&&time<DL+IN?value:0');
    try { D.property('ADBE Text Properties').property('ADBE Text Document').expression = 'parent.text.sourceText.style'; } catch (e2) {}
    try { D.outPoint = Math.max(D.inPoint + 0.05, Math.min(D.outPoint, t.DL + t.IN + 0.1)); } catch (e3) {}
    return D;
}
// comp position of a point of L's own space (L's static transform)
function eb1_toComp(L, x, y) {
    var tr = L.property('ADBE Transform Group'), a = tr.property('ADBE Anchor Point').value, p = tr.property('ADBE Position').value;
    var s = tr.property('ADBE Scale').value, r = tr.property('ADBE Rotate Z').value * Math.PI / 180;
    var ux = (x - a[0]) * s[0] / 100, uy = (y - a[1]) * s[1] / 100;
    return [p[0] + Math.cos(r) * ux - Math.sin(r) * uy, p[1] + Math.sin(r) * ux + Math.cos(r) * uy];
}
// keep the point (px, py) of L's own space fixed while the layer is scaled by [fx, fy] and rotated by rot degrees on top of its
// own transform (expression strings) -> snippet for m.parts.pos (the browser scales / rotates items about their own box)
function eb1_pivot(m, fx, fy, rot, px, py) {
    var tr = m.L.property('ADBE Transform Group'), a = tr.property('ADBE Anchor Point').value, s = tr.property('ADBE Scale').value;
    var r0 = tr.property('ADBE Rotate Z').value, rr = r0 * Math.PI / 180;
    var ux = (px - a[0]) * s[0] / 100, uy = (py - a[1]) * s[1] / 100;
    if (Math.abs(ux) + Math.abs(uy) < 0.5) return '';
    var vx = Math.cos(rr) * ux - Math.sin(rr) * uy, vy = Math.sin(rr) * ux + Math.cos(rr) * uy;
    return 'var pv_a=(' + jzN(r0) + '+(' + (rot || '0') + '))*Math.PI/180,pv_c=Math.cos(pv_a),pv_s=Math.sin(pv_a),pv_x=(' + (fx || '1') + ')*' + jzN(ux) + ',pv_y=(' + (fy || '1') + ')*' + jzN(uy) + ';' +
        'd=[d[0]+' + jzN(vx) + '-(pv_c*pv_x-pv_s*pv_y),d[1]+' + jzN(vy) + '-(pv_s*pv_x+pv_c*pv_y)];';
}
// add a stroke to the text document (width 0, grown by a Stroke Width animator) when it has none
function eb1_addStroke(L, hex) {
    var td = L.property('ADBE Text Properties').property('ADBE Text Document').value;
    if (td.applyStroke && td.strokeWidth > 0) return false;
    jzTextDoc(L, function (d) {
        d.applyStroke = true; d.strokeWidth = 0;
        try { d.strokeColor = hex ? jzHex(hex) : d.fillColor; } catch (e) {}
        try { d.strokeOverFill = false; } catch (e2) {}
    });
    return true;
}

/* ================================================================ PHYSICS */

/* ---- springIn — バネ: every glyph is fired up from below on a loose spring: overshoots the line, dips back, settles */
jzReg('enter', 'springIn', { selfHide: true, apply: function (m) {
    var L = m.L, G = eb1_geo(m), D = G.fs * 1.7, vert = G.vert;
    var q = eb1_hd(m) + eb1_q(0.45) + 'var f=spr(q,4.2,3),v=(spr(q+0.01,4.2,3)-f)/0.01,st=1+Math.min(0.5,Math.abs(v)*0.075),cp=1/Math.sqrt(st),on=q>0&&q<1;';
    jzAnimator(L, 'JZ In Spring', [['ADBE Text Position 3D', vert ? [-D, 0, 0] : [0, D, 0]]], q + 'var a=on?f*100:0;[a,a,0]');
    jzAnimator(L, 'JZ In Stretch', [['ADBE Text Scale 3D', [200, 200, 100]]], q + 'on?' + (vert ? '[(st-1)*100,(cp-1)*100,0]' : '[(cp-1)*100,(st-1)*100,0]') + ':[0,0,0]');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-cl(q*6))*100');
} });

/* ---- pendulum — 振り子: glyphs hang from a pin above them and swing into place like hanging tags */
jzReg('enter', 'pendulum', { selfHide: true, apply: function (m) {
    var L = m.L, G = eb1_geo(m), fs = G.fs, dir = eb1_dir(m, 41), Lp = fs * 0.95, i;
    var sw = 'var th=' + dir + '*62*spr(q,3.1,2.4),rr=th*Math.PI/180;';
    var q = eb1_hd(m) + eb1_q(0.45) + sw;
    jzAnimator(L, 'JZ In Swing', [['ADBE Text Rotation', 100]], q + 'q<=0||q>=1?0:th');
    jzAnimator(L, 'JZ In Hang', [['ADBE Text Position 3D', [Lp, Lp, 0]]], q + 'q<=0||q>=1?[0,0,0]:[-Math.sin(rr)*100,(Math.cos(rr)-1)*100,0]');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-cl(q*5))*100');
    if (!eb1_main(m) || G.arranged || eb1_crowded(m, G)) return;
    // the pins and strings (browser postLocal): one group per glyph, pivoting at its pin
    var S = jzNoGhost(eb1_shape(m, 'JZ In Pins')), H = eb1_head(m), lw = Math.max(1.2 * m.u, m.size * 0.012), sl = Lp - fs * 0.5, pr = Math.max(2 * m.u, m.size * 0.035);
    for (i = 0; i < G.n; i++) {
        var g = G.g[i]; if (g.sp) continue;
        var o = G.n > 1 ? i / (G.n - 1) : 0, hq = H + 'var q=cl((P-' + jzN(0.45 * o) + ')/0.55);' + sw;
        var grp = jzGrp(S, 'pin ' + (i + 1)), gx = jzGX(grp);
        var pin = eb1_sub(grp, 'pin'); jzAddEllipse(pin, pr * 2, pr * 2); jzAddFill(pin, m.ctx.sc.accent || '#FFFFFF');
        var str = eb1_sub(grp, 'string'); jzAddRect(str, lw, sl, 0, 0, sl / 2); jzAddFill(str, m.ctx.sc.sub || m.ctx.sc.fg || '#FFFFFF');
        jzGX(str).property('ADBE Vector Group Opacity').setValue(80);
        gx.property('ADBE Vector Position').setValue([g.x, g.y - Lp]);
        jzSetExpr(gx.property('ADBE Vector Rotation'), hq + 'q<=0||q>=1?0:th');
        jzSetExpr(gx.property('ADBE Vector Group Opacity'), hq + 'q<=0||q>=1?0:(1-sm(0.45,0.9,q))*cl(q*5)*100');
    }
} });

/* ---- rollIn — 転がり: glyphs roll in along the line like wheels (rotation coupled to the distance travelled) */
jzReg('enter', 'rollIn', { selfHide: true, apply: function (m) {
    var L = m.L, G = eb1_geo(m), vert = G.vert, dir = eb1_dir(m, 43), D = G.fs * 2.3 * (0.75 + 0.4 * m.ctx.fx.motion), rr = [], i;
    for (i = 0; i < G.n; i++) rr.push(Math.max(4, Math.min(G.g[i].w, G.fs) * 0.5));
    // the glyph at the front of the train starts first, so the wheels never roll through each other
    var q = eb1_hd(m) + eb1_q(0.22, dir < 0) + 'var R=' + eb1_arr(rr) + ',rr=R[textIndex-1]||SZ*0.5,off=' + dir + '*' + jzN(D) + '*(1-ob(q,1.25)),rot=-off/rr*180/Math.PI,k=0.72+0.28*oc(q),on=q>0&&q<1;';
    jzAnimator(L, 'JZ In Roll', [['ADBE Text Position 3D', vert ? [0, D, 0] : [D, 0, 0]]], q + 'var a=on?off/' + jzN(D) + '*100:0;[a,a,0]');
    jzAnimator(L, 'JZ In Turn', [['ADBE Text Rotation', 720]], q + 'on?' + (vert ? '-' : '') + 'rot/7.2:0');
    jzAnimator(L, 'JZ In Size', [['ADBE Text Scale 3D', [0, 0, 100]]], q + 'on?(1-k)*100:0');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-cl(q*5))*100');
} });

/* ---- slingshot — パチンコ: the line is drawn back on two elastic bands, released, overshoots and settles */
jzReg('enter', 'slingshot', { apply: function (m) {
    var L = m.L, G = eb1_geo(m), vert = G.vert, r = G.r, fs = G.fs, pull = m.size * 0.7 + (vert ? r.width : r.height) * 0.35;
    var sc = jzXf(L, 'ADBE Scale').value, s0 = Math.abs((vert ? sc[0] : sc[1]) / 100) || 1, pullW = pull * s0;
    var ev = EB1_FNS + 'var sg_f,sg_al=1,sg_ac=1,sg_a=1;if(P<0.36){var sg_t=P/0.36,sg_e=oc(sg_t);sg_f=0.2+0.8*sg_e;sg_a=cl(sg_t*3);sg_al=1-0.14*sg_e;sg_ac=1+0.07*sg_e;}' +
        'else{var sg_t=(P-0.36)/0.64,sg_v=(spr(sg_t+0.01,4.6,2.6)-spr(sg_t,4.6,2.6))/0.01;sg_f=spr(sg_t,4.6,2.6);sg_al=1+Math.min(0.4,Math.abs(sg_v)*0.05);sg_ac=1/Math.sqrt(sg_al);}' +
        'var sg_x=' + (vert ? 'sg_al' : 'sg_ac') + ',sg_y=' + (vert ? 'sg_ac' : 'sg_al') + ';';
    m.parts.sc.push(ev + 'f=[f[0]*sg_x,f[1]*sg_y];');
    m.parts.pos.push(ev + eb1_pivot(m, 'sg_x', 'sg_y', '0', G.cx, G.cy) + 'd=[d[0]' + (vert ? '+sg_f*' + jzN(pullW) : '') + ',d[1]' + (vert ? '' : '+sg_f*' + jzN(pullW)) + '];');
    m.parts.op.push(ev + 'f*=sg_a;');
    if (!eb1_main(m) || G.nk <= 1 || eb1_crowded(m, G)) return;
    // the two elastic bands: from fixed posts beside the rest position to the corners of the moving line
    var S = jzNoGhost(eb1_shape(m, 'JZ In Bands')), H = eb1_head(m), mg = m.size * 0.35, lw = Math.max(1.5 * m.u, m.size * 0.03) / s0, col = m.ctx.sc.accent || '#FFFFFF', k;
    var x0 = r.left, x1 = r.left + r.width, y0 = r.top, y1 = r.top + r.height, cxx = (x0 + x1) / 2, cyy = (y0 + y1) / 2;
    var posts = vert ? [[cxx, y0 - mg], [cxx, y1 + mg]] : [[x0 - mg, cyy], [x1 + mg, cyy]];
    var ends = vert ? [[x1, y0 + (y1 - y0) * 0.15], [x1, y1 - (y1 - y0) * 0.15]] : [[x0 + (x1 - x0) * 0.12, y1], [x1 - (x1 - x0) * 0.12, y1]];
    var bd = 'var t2=(P-0.36)/0.64,bd=P<0.36?cl(P/0.36*3):1-sm(0.03,0.2,t2);';
    for (k = 0; k < 2; k++) {
        var W0 = eb1_toComp(L, posts[k][0], posts[k][1]);
        var pts = 'var A=parent.fromComp([' + jzN(W0[0]) + ',' + jzN(W0[1]) + ']),ax=A[0],ay=A[1],bx=' + jzN(ends[k][0]) + ',by=' + jzN(ends[k][1]) + ';';
        var grp = jzGrp(S, 'band ' + (k + 1)), gx = jzGX(grp);
        var dot = eb1_sub(grp, 'post'); jzAddEllipse(dot, lw * 3.2, lw * 3.2); jzAddFill(dot, col);
        // (each shape item is fully set up before the next item is added to the same contents: AE invalidates older references)
        var band = eb1_sub(grp, 'band'), rc = jzAddRect(band, 10, lw, 0);
        // group sits on the post, the band rect points at the line's corner
        jzSetExpr(rc.property('ADBE Vector Rect Size'), H + pts + '[Math.sqrt((bx-ax)*(bx-ax)+(by-ay)*(by-ay)),' + jzN(lw) + ']');
        jzSetExpr(rc.property('ADBE Vector Rect Position'), H + pts + '[Math.sqrt((bx-ax)*(bx-ax)+(by-ay)*(by-ay))/2,0]');
        jzAddFill(band, col);
        jzSetExpr(gx.property('ADBE Vector Position'), H + pts + '[ax,ay]');
        jzSetExpr(jzGX(band).property('ADBE Vector Rotation'), H + pts + 'Math.atan2(by-ay,bx-ax)*180/Math.PI');
        jzSetExpr(gx.property('ADBE Vector Group Opacity'), H + bd + 'bd*100');
    }
} });

/* ---- rockSettle — ぐらぐら着地: glyphs drop in tilted, land on a corner and rock side to side until they sit flat */
jzReg('enter', 'rockSettle', { selfHide: true, apply: function (m) {
    var L = m.L, G = eb1_geo(m), seed = m.c.seed | 0, TH = [], HW = [], i, K = G.fs * 2.6;
    for (i = 0; i < G.n; i++) { TH.push((eb1_r(seed, i, 45) < 0.5 ? -1 : 1) * (16 + 10 * eb1_r(seed, i, 46))); HW.push(G.g[i].w / 2); }
    var q = eb1_hd(m) + eb1_q(0.4) + 'var TH=' + eb1_arr(TH) + ',HW=' + eb1_arr(HW) + ',t0=TH[textIndex-1]||0,hw=HW[textIndex-1]||SZ*0.5,hy=' + jzN(G.fs * 0.5) + ',th,dy=0;' +
        'if(q<0.3){var t=q/0.3;th=t0;dy=-(1-t*t)*hy*4;}else{var t=(q-0.3)/0.7;th=t0*Math.pow(1-t,1.5)*Math.cos(Math.PI*(1.4*t+1.9*t*t));}' +
        'var rr=th*Math.PI/180,c=Math.cos(rr),s=Math.sin(rr),cx=th>=0?hw:-hw,cy=hy,dx=cx-(cx*c-cy*s),dy2=dy+cy-(cx*s+cy*c),on=q>0&&q<1;';
    jzAnimator(L, 'JZ In Rock', [['ADBE Text Rotation', 100]], q + 'on?th:0');
    jzAnimator(L, 'JZ In Pivot', [['ADBE Text Position 3D', [K, K, 0]]], q + 'on?[dx/' + jzN(K) + '*100,dy2/' + jzN(K) + '*100,0]:[0,0,0]');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-cl(q*8))*100');
} });

/* ---- bounceBall — バウンドボール: karaoke ball hops from glyph to glyph, each landing kicks its glyph into place */
jzReg('enter', 'bounceBall', { selfHide: true, apply: function (m) {
    var L = m.L, G = eb1_geo(m), vert = G.vert, fs = G.fs, n = G.nk, HT = [], i;
    if (!n) return;
    var hit = function (k) { return n > 1 ? 0.16 + 0.6 * k / (n - 1) : 0.45; };
    for (i = 0; i < G.n; i++) HT.push(G.g[i].sp ? -1 : hit(G.g[i].k));
    var q = eb1_hd(m) + 'var HT=' + eb1_arr(HT) + ',h=HT[textIndex-1],u=(P-h)/0.2,on=h>=0&&P>=h&&u<1,sq=0.55+0.45*ob(u,2.4),st=1+0.3*(1-o5(u));';
    jzAnimator(L, 'JZ In Squash', [['ADBE Text Scale 3D', [200, 200, 100]]], q + 'on?' + (vert ? '[(sq-1)*100,(st-1)*100,0]' : '[(st-1)*100,(sq-1)*100,0]') + ':[0,0,0]');
    jzAnimator(L, 'JZ In Land', [['ADBE Text Position 3D', vert ? [fs / 2, 0, 0] : [0, fs / 2, 0]]], q + 'var a=on?(1-sq)*100:0;[a,a,0]');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'h>=0&&P<h?100:0');
    if (!eb1_main(m) || G.arranged || eb1_crowded(m, G)) return;
    // the ball: contact point on top of each glyph (right edge for vertical text)
    var R = Math.max(3 * m.u, m.size * 0.13), X = [], Y = [];
    for (i = 0; i < G.n; i++) { var g = G.g[i]; if (g.sp) continue; if (vert) { X.push(g.x + g.w * 0.5 + R); Y.push(g.y); } else { X.push(g.x); Y.push(g.y - fs * 0.5 - R); } }
    var S = jzNoGhost(eb1_shape(m, 'JZ In Ball')), grp = jzGrp(S, 'ball'), gx = jzGX(grp);
    jzAddEllipse(grp, R * 2, R * 2); jzAddFill(grp, m.ctx.sc.accent || '#FFFFFF');
    var uX = vert ? 1 : 0, uY = vert ? 0 : -1, fX = vert ? 0 : 1, fY = vert ? 1 : 0, Z = jzN(m.size);
    var bb = eb1_head(m) + 'var X=' + eb1_arr(X) + ',Y=' + eb1_arr(Y) + ',n=' + n + ',S=' + Z + ',H=S*0.6,ux=' + uX + ',uy=' + uY + ',fx=' + fX + ',fy=' + fY + ',solo=n==1;' +
        'function hit(k){return n>1?0.16+0.6*k/(n-1):0.45;}var ax,ay,bx,by,s,al=1;' +
        'if(P<hit(0)){var back=solo?0:1.3,t0=solo?hit(0)*0.2:0;bx=X[0];by=Y[0];ax=solo?bx:bx-fx*S*back+ux*S*0.5;ay=solo?by:by-fy*S*back+uy*S*0.5;s=(P-t0)/(hit(0)-t0);al=cl(s*6);}' +
        'else if(P>=hit(n-1)){ax=X[n-1];ay=Y[n-1];bx=ax+fx*S*1.4-ux*S*0.2;by=ay+fy*S*1.4-uy*S*0.2;s=(P-hit(n-1))/0.2;al=1-sm(0.4,1,s);}' +
        'else{var k=1;while(k<n-1&&P>=hit(k))k++;ax=X[k-1];ay=Y[k-1];bx=X[k];by=Y[k];s=(P-hit(k-1))/(hit(k)-hit(k-1));}' +
        'var arc=solo&&P<hit(0)?S*0.85*(1-s*s):4*H*s*(1-s);';
    jzSetExpr(gx.property('ADBE Vector Position'), bb + '[ax+(bx-ax)*s+ux*arc,ay+(by-ay)*s+uy*arc]');
    jzSetExpr(gx.property('ADBE Vector Group Opacity'), bb + 's<=0||s>1?0:al*100');
} });

/* ---- snapRail — スナップ整列: glyphs float off the line at random heights; an accent rail draws in and they all snap onto it */
jzReg('enter', 'snapRail', { selfHide: true, apply: function (m) {
    var L = m.L, G = eb1_geo(m), vert = G.vert, seed = m.c.seed | 0, DD = [], TS = [], SG = [], OF = [], RT = [], i, K = m.size;
    for (i = 0; i < G.n; i++) {
        DD.push(eb1_r(seed, i, 53) * 0.2); TS.push(0.46 + eb1_r(seed, i, 54) * 0.06); SG.push(eb1_r(seed, i, 51) < 0.5 ? -1 : 1);
        OF.push((eb1_r(seed, i, 51) < 0.5 ? -1 : 1) * (0.3 + 0.6 * eb1_r(seed, i, 52))); RT.push(eb1_rs(seed, i, 55) * 16);
    }
    var q = eb1_hd(m) + 'var i=textIndex-1,DD=' + eb1_arr(DD) + ',TS=' + eb1_arr(TS) + ',SG=' + eb1_arr(SG) + ',OF=' + eb1_arr(OF) + ',RT=' + eb1_arr(RT) + ';' +
        'var a=cl((P-DD[i])/0.2),ts=TS[i],sg=SG[i],o0=OF[i]*SZ,r0=RT[i],off=0,rot=0,sq=1;' +
        'if(P<ts){var k=1-0.14*(P/ts);off=o0*k;rot=r0*k;}else{var t=(P-ts)/0.13;if(t<1){var e=ic(t);off=o0*0.86*(1-e);rot=r0*0.86*(1-e);}' +
        'else{var u=cl((t-1)/1.6);if(u<1){off=-sg*SZ*0.06*Math.sin(Math.PI*u)*(1-u);sq=1-0.16*Math.sin(Math.PI*cl(u*2))*(1-u);}}}var on=a>0;';
    jzAnimator(L, 'JZ In Float', [['ADBE Text Position 3D', vert ? [K, 0, 0] : [0, K, 0]]], q + 'var v=on?off/' + jzN(K) + '*100:0;[v,v,0]');
    jzAnimator(L, 'JZ In Tilt', [['ADBE Text Rotation', 100]], q + 'on?rot:0');
    jzAnimator(L, 'JZ In Snap', [['ADBE Text Scale 3D', [200, 200, 100]]], q + 'var c=1/Math.sqrt(sq);on?' + (vert ? '[(sq-1)*100,(c-1)*100,0]' : '[(c-1)*100,(sq-1)*100,0]') + ':[0,0,0]');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + '(1-a)*100');
    if (!eb1_main(m) || G.nk <= 1 || G.arranged || eb1_crowded(m, G)) return;
    // the rail(s): one accent bar per line, just under it (left of a vertical column)
    var S = jzNoGhost(eb1_shape(m, 'JZ In Rail')), H = eb1_head(m), t = Math.max(2 * m.u, m.size * 0.028), acc = m.ctx.sc.accent || '#FFFFFF', r = G.r;
    var ev = 'var grow=o4(P/0.4),fl=Math.exp(-Math.pow((P-0.6)/0.05,2)),gone=sm(0.68,0.95,P),th=' + jzN(t) + '*(1+fl*1.2);';
    var rails = [];
    if (vert) rails.push({ c: r.top + r.height / 2, half: r.height / 2 + m.size * 0.15, v: G.cx - m.size * 0.62 });
    else for (i = 0; i < G.lines.length; i++) { var ln = G.lines[i]; if (ln.n) rails.push({ c: (ln.x0 + ln.x1) / 2, half: (ln.x1 - ln.x0) / 2 + m.size * 0.15, v: ln.cy + m.size * 0.62 }); }
    for (i = 0; i < rails.length; i++) {
        var R = rails[i], grp = jzGrp(S, 'rail ' + (i + 1)), rc = jzAddRect(grp, 10, 10, 0), len = jzN(R.half) + '*grow*(1-gone)*2';
        jzSetExpr(rc.property('ADBE Vector Rect Size'), H + ev + (vert ? '[th,' + len + ']' : '[' + len + ',th]'));   // before the fill is added (keeps rc valid)
        jzAddFill(grp, acc);
        jzGX(grp).property('ADBE Vector Position').setValue(vert ? [R.v, R.c] : [R.c, R.v]);
        jzSetExpr(jzGX(grp).property('ADBE Vector Group Opacity'), H + ev + 'grow>0&&gone<1?100:0');
    }
} });

/* ---- fanOpen — 扇開き: glyphs start stacked like the ribs of a closed folding fan and sweep open around a pivot */
jzReg('enter', 'fanOpen', { apply: function (m) {
    var L = m.L, G = eb1_geo(m), vert = G.vert, r = G.r, sz = m.size, i;
    // pivot under the start of the line (left of the top of a vertical column)
    var R0 = sz * 0.8 + (vert ? r.width : r.height) / 2;
    var pv = vert ? [r.left - R0, r.top + sz * 0.5] : [r.left + sz * 0.5, r.top + r.height + R0];
    var VX = [], VY = [], DA = [], aMin = 1e9, big = 0;
    for (i = 0; i < G.n; i++) {
        var vx = G.g[i].x - pv[0], vy = G.g[i].y - pv[1];
        VX.push(vx); VY.push(vy); aMin = Math.min(aMin, Math.atan2(vy, vx)); big = Math.max(big, Math.sqrt(vx * vx + vy * vy));
    }
    var a0 = aMin - 0.45;
    for (i = 0; i < G.n; i++) DA.push(a0 - Math.atan2(VY[i], VX[i]));
    var K = big * 2.2 + 1;
    var q = eb1_hd(m) + 'var i=textIndex-1,VX=' + eb1_arr(VX) + ',VY=' + eb1_arr(VY) + ',DA=' + eb1_arr(DA) + ',e=ob(P,1.15),dd=(DA[i]||0)*(1-e),c=Math.cos(dd),s=Math.sin(dd),vx=VX[i]||0,vy=VY[i]||0;';
    jzAnimator(L, 'JZ In Fan', [['ADBE Text Position 3D', [K, K, 0]]], q + '[(c*vx-s*vy-vx)/' + jzN(K) + '*100,(s*vx+c*vy-vy)/' + jzN(K) + '*100,0]');
    jzAnimator(L, 'JZ In Rib', [['ADBE Text Rotation', 360]], q + 'dd*180/Math.PI/3.6');
    m.parts.op.push('f*=cl(P*3.5);');
} });

/* ---- cylinder — 円筒回転: the line is printed on a turning drum: glyphs wrap round from the back, then the drum unrolls flat */
jzReg('enter', 'cylinder', { apply: function (m) {
    var L = m.L, G = eb1_geo(m), vert = G.vert, r = G.r, i;
    var U0 = vert ? r.top : r.left, U1 = U0 + (vert ? r.height : r.width), uc = (U0 + U1) / 2, R = Math.max(m.size * 0.6, (U1 - U0) / 2) / 1.2;
    var U = [], mx = 0;
    for (i = 0; i < G.n; i++) { var u = (vert ? G.g[i].y : G.g[i].x) - uc; U.push(u); mx = Math.max(mx, Math.abs(u)); }
    var K = R + mx + 1, bg = eb1_pick(m.ctx.sc.bg, '#000000');
    var q = eb1_hd(m) + 'var U=' + eb1_arr(U) + ',u=U[textIndex-1]||0,R=' + jzN(R) + ',phi=' + eb1_dir(m, 61) + '*(1-o4(P))*2.4,fl=sm(0.5,1,P),A=cl(P*6);' +
        'var th=u/R+phi,cu=Math.cos(th),hide=cu<=0.04&&fl<0.5,sn=R*Math.sin(th),nu=sn+(u-sn)*fl,k0=Math.max(0.04,cu),k=k0+(1-k0)*fl,c1=cl(cu*1.6),c2=cl(cu);';
    jzAnimator(L, 'JZ In Drum', [['ADBE Text Position 3D', vert ? [0, K, 0] : [K, 0, 0]]], q + 'var a=(nu-u)/' + jzN(K) + '*100;[a,a,0]');
    jzAnimator(L, 'JZ In Wrap', [['ADBE Text Scale 3D', vert ? [100, 0, 100] : [0, 100, 100]]], q + '(1-k)*100');
    jzAnimator(L, 'JZ In Side', [['ADBE Text Fill Color', jzHex(bg)]], q + '(1-(c2+(1-c2)*fl))*60');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'hide?100:(1-A*(c1+(1-c1)*fl))*100');
} });

/* ---- shuffle — シャッフル: glyphs appear in shuffled slots, then trade places along over/under arcs like a shell game */
jzReg('enter', 'shuffle', { apply: function (m) {
    var L = m.L, G = eb1_geo(m), vert = G.vert, seed = m.c.seed | 0, ids = [], arr = [], i, k;
    for (i = 0; i < G.n; i++) if (!G.g[i].sp) { ids.push(i); arr.push(i); }
    var n = ids.length;
    for (k = n - 1; k > 0; k--) { var j = Math.floor(eb1_r(seed, k, 71) * (k + 1)), tt = arr[k]; arr[k] = arr[j]; arr[j] = tt; }
    var same = true; for (k = 0; k < n; k++) if (arr[k] !== ids[k]) same = false;
    if (n > 1 && same) arr.push(arr.shift());
    var EX = [], EY = [], NX = [], NY = [], HM = [], SG = [], RQ = [], big = 1;
    for (i = 0; i < G.n; i++) { EX.push(0); EY.push(0); NX.push(0); NY.push(0); HM.push(0); SG.push(0); RQ.push(eb1_r(seed, i, 72)); }
    for (k = 0; k < n; k++) {
        var t = ids[k], s = arr[k], ex = G.g[s].x - G.g[t].x, ey = G.g[s].y - G.g[t].y, d = Math.sqrt(ex * ex + ey * ey);
        if (d < 0.5) continue;
        var sg = (vert ? ey : ex) > 0 ? 1 : -1, vs = vert ? -1 : 1;
        EX[t] = ex; EY[t] = ey; NX[t] = -ey / d * sg * vs; NY[t] = ex / d * sg * vs; HM[t] = Math.min(m.size * 0.85, d * 0.4); SG[t] = sg;
        big = Math.max(big, Math.abs(ex) + HM[t], Math.abs(ey) + HM[t]);
    }
    var K = big * 1.1;
    var q = eb1_hd(m) + 'var i=textIndex-1,EX=' + eb1_arr(EX) + ',EY=' + eb1_arr(EY) + ',NX=' + eb1_arr(NX) + ',NY=' + eb1_arr(NY) + ',HM=' + eb1_arr(HM) + ',SG=' + eb1_arr(SG) + ',RQ=' + eb1_arr(RQ) + ';' +
        'var q=cl((cl((P-0.16)/0.84)-0.3*RQ[i])/0.7),e=io3(q),mv=HM[i]>0,h=HM[i]*Math.sin(Math.PI*e),on=q<1;';
    jzAnimator(L, 'JZ In Swap', [['ADBE Text Position 3D', [K, K, 0]]], q + 'on&&mv?[(EX[i]*(1-e)+NX[i]*h)/' + jzN(K) + '*100,(EY[i]*(1-e)+NY[i]*h)/' + jzN(K) + '*100,0]:[0,0,0]');
    jzAnimator(L, 'JZ In Arc', [['ADBE Text Scale 3D', [200, 200, 100]]], q + 'var s=!on?1:(mv?1+SG[i]*0.14*Math.sin(Math.PI*e):0.8+0.2*ob(q,2));(s-1)*100');
    m.parts.op.push('f*=cl(P/0.12);');
} });

/* ---- stopMotion — コマ撮り: glyphs jump toward their place in a handful of held key poses, each slightly off */
jzReg('enter', 'stopMotion', { selfHide: true, apply: function (m) {
    var L = m.L, K = m.size * 1.3;
    var q = eb1_hd(m) + 'var i=textIndex,n=textTotal,o=n>1?(i-1)/(n-1):0,q=cl((P-0.45*(hh(i*13+SD)*0.5+o*0.5))/0.55),k=Math.min(4,Math.floor(q*5)),on=q>0&&k<4,f=1-oc(k/4);' +
        'function j(s){return hh(i*31+k*7+s+SD)*2-1;}var an=hh(i*17+SD+1)*Math.PI*2,D=SZ*(0.7+0.5*hh(i*19+SD+2));';
    jzAnimator(L, 'JZ In Pose', [['ADBE Text Position 3D', [K, K, 0]]], q + 'on?[(Math.cos(an)*D*f+j(84)*SZ*0.05)/' + jzN(K) + '*100,(Math.sin(an)*D*f+j(85)*SZ*0.05)/' + jzN(K) + '*100,0]:[0,0,0]');
    jzAnimator(L, 'JZ In Tilt', [['ADBE Text Rotation', 30]], q + 'on?(j(86)*22*f+(hh(i*23+SD+87)*2-1)*6*f)/0.3:0');
    jzAnimator(L, 'JZ In Size', [['ADBE Text Scale 3D', [200, 200, 100]]], q + 'on?j(88)*14*f:0');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:0');
} });

/* ---- ripple — 波紋: a ring wave spreads from the middle; each glyph surfaces as the crest passes and bobs once */
jzReg('enter', 'ripple', { selfHide: true, apply: function (m) {
    var L = m.L, G = eb1_geo(m), r = G.r, i, VX = [], VY = [], DD = [];
    var Rmax = Math.sqrt(r.width * r.width + r.height * r.height) / 2 + m.size * 0.3, K = m.size * 0.3;
    for (i = 0; i < G.n; i++) { var vx = G.g[i].x - G.cx, vy = G.g[i].y - G.cy; VX.push(vx); VY.push(vy); DD.push(Math.sqrt(vx * vx + vy * vy)); }
    var q = eb1_hd(m) + 'var i=textIndex-1,VX=' + eb1_arr(VX) + ',VY=' + eb1_arr(VY) + ',DD=' + eb1_arr(DD) + ',d=DD[i]||0,q=cl((P-0.68*d/' + jzN(Rmax) + ')/0.32),on=q>0&&q<1;' +
        'var w=Math.sin(q*Math.PI*2)*Math.pow(1-q,2),pu=SZ*0.28*w,s=1+0.4*Math.sin(q*Math.PI)*(1-q);';
    jzAnimator(L, 'JZ In Wave', [['ADBE Text Position 3D', [K, K, 0]]], q + 'on&&d>1?[(VX[i]||0)/d*pu/' + jzN(K) + '*100,(VY[i]||0)/d*pu/' + jzN(K) + '*100,0]:[0,0,0]');
    jzAnimator(L, 'JZ In Bob', [['ADBE Text Scale 3D', [200, 200, 100]]], q + 'on?(s-1)*100:0');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-cl(q*5))*100');
    if (!eb1_main(m) || G.arranged || eb1_crowded(m, G)) return;
    // two accent rings spreading from the centre
    var S = jzNoGhost(eb1_shape(m, 'JZ In Rings')), H = eb1_head(m), lw = Math.max(1.5 * m.u, m.size * 0.022), k;
    for (k = 0; k < 2; k++) {
        var ev = 'var f=cl(P/0.68-' + jzN(k * 0.12) + '),rd=' + jzN(Rmax * 1.05) + '*f;';
        var grp = jzGrp(S, 'ring ' + (k + 1)), gx = jzGX(grp), el = jzAddEllipse(grp, 10, 10);
        jzSetExpr(el.property('ADBE Vector Ellipse Size'), H + ev + '[rd*2,rd*2]');    // before the stroke is added (keeps el valid)
        var st = jzAddStroke(grp, m.ctx.sc.accent || '#FFFFFF', lw);
        jzSetExpr(st.property('ADBE Vector Stroke Width'), H + ev + jzN(lw) + '*(1-f*0.5)');
        gx.property('ADBE Vector Position').setValue([G.cx, G.cy]);
        jzSetExpr(gx.property('ADBE Vector Group Opacity'), H + ev + 'f<=0||rd<1?0:(1-f)*' + (k ? 50 : 85));
    }
} });

/* ---- zipper — ジッパー: a zip slider runs along the line; ahead of it the glyphs are split up/down like open teeth */
jzReg('enter', 'zipper', { apply: function (m) {
    var L = m.L, G = eb1_geo(m), vert = G.vert, r = G.r, sz = m.size, i, UU = [], SG = [];
    var U0 = vert ? r.top : r.left, U1 = U0 + (vert ? r.height : r.width), A = sz * 0.8, solo = G.nk <= 1;
    for (i = 0; i < G.n; i++) { UU.push(vert ? G.g[i].y : G.g[i].x); SG.push(((solo ? (m.o.mi || 0) : G.g[i].ci) % 2) ? 1 : -1); }
    var sl = 'var s=' + jzN(U0 - sz * 0.3) + '+' + jzN(U1 + sz * 0.4 - (U0 - sz * 0.3)) + '*ios(cl(P/0.92)),fd=cl(P*5);';
    var q = eb1_hd(m) + sl + 'var UU=' + eb1_arr(UU) + ',SG=' + eb1_arr(SG) + ',i=textIndex-1,o=cl(((UU[i]||0)-s)/' + jzN(sz * 2.4) + '+0.25),sg=SG[i]||1;';
    jzAnimator(L, 'JZ In Teeth', [['ADBE Text Position 3D', vert ? [A, 0, 0] : [0, A, 0]]], q + 'var a=o>0?sg*Math.pow(o,0.8)*100:0;[a,a,0]');
    jzAnimator(L, 'JZ In Tilt', [['ADBE Text Rotation', 14]], q + 'o>0?' + (vert ? '-' : '') + 'sg*o*100:0');
    jzAnimator(L, 'JZ In Fade', [['ADBE Text Opacity', 0]], q + 'o>0?(1-fd)*100:0');
    if (!eb1_main(m) || solo || G.arranged || eb1_crowded(m, G)) return;
    // the slider (+ pull tab) on every line
    var S = jzNoGhost(eb1_shape(m, 'JZ In Zip')), H = eb1_head(m), w = sz * 0.3, h = sz * 0.46, tab = sz * 0.2, acc = m.ctx.sc.accent || '#FFFFFF', vs = [];
    if (vert) vs.push(G.cx); else for (i = 0; i < G.lines.length; i++) if (G.lines[i].n) vs.push(G.lines[i].cy);
    for (i = 0; i < vs.length; i++) {
        var grp = jzGrp(S, 'slider ' + (i + 1)), gx = jzGX(grp);
        if (vert) { jzAddRect(grp, h, w, w * 0.2); jzAddRect(grp, tab, tab * 0.5, 0, h / 2 + tab / 2, 0); }
        else { jzAddRect(grp, w, h, w * 0.2); jzAddRect(grp, tab * 0.5, tab, 0, 0, h / 2 + tab / 2); }
        jzAddFill(grp, acc);
        jzSetExpr(gx.property('ADBE Vector Position'), H + sl + (vert ? '[' + jzN(vs[i]) + ',s]' : '[s,' + jzN(vs[i]) + ']'));
        jzSetExpr(gx.property('ADBE Vector Group Opacity'), H + sl + 'fd*(1-sm(0.82,0.98,P))*100');
    }
} });

/* ---- zoomAlt — 交互ズーム: depth alternates: odd glyphs dive in from in front of the lens, even ones grow from far away */
jzReg('enter', 'zoomAlt', { selfHide: true, apply: function (m) {
    var L = m.L, G = eb1_geo(m), PA = [], i, bl = Math.min(30, m.size * 0.1), solo = G.nk <= 1;
    for (i = 0; i < G.n; i++) PA.push(((solo ? (m.o.mi || 0) : G.g[i].ci)) % 2);
    var q = eb1_hd(m) + eb1_q(0.35) + 'var PA=' + eb1_arr(PA) + ',ev=PA[textIndex-1]==0,e=o5(q),on=q>0&&q<1,s=ev?2.4+(1-2.4)*e:Math.max(0.02,ob(q,2.2)),a=ev?cl(q*2.5):cl(q*4);';
    jzAnimator(L, 'JZ In Depth', [['ADBE Text Scale 3D', [300, 300, 100]]], q + 'on?(s-1)*50:0');
    jzAnimator(L, 'JZ In Focus', [['ADBE Text Blur', [bl, bl]]], q + 'on&&ev?(1-e)*100:0');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-a)*100');
} });

/* ---- tiltUp — 起立: the line lies flat on the floor and swings up on a hinge along its bottom edge */
jzReg('enter', 'tiltUp', { apply: function (m) {
    var L = m.L, G = eb1_geo(m), r = G.r, sz = m.size, bg = eb1_pick(m.ctx.sc.bg, '#000000');
    var kk = EB1_FNS + 'var tu_k=Math.max(0.03,Math.cos(86*spr(P,3.2,1.25)*Math.PI/180));';
    var y1 = r.top + r.height;
    m.parts.sc.push(kk + 'f=[f[0],f[1]*tu_k];');
    m.parts.pos.push(kk + eb1_pivot(m, '1', 'tu_k', '0', G.cx, y1));
    m.parts.op.push('f*=cl(P*6);');
    jzAnimator(L, 'JZ In Floor', [['ADBE Text Fill Color', jzHex(bg)]], eb1_hd(m) + kk + '(1-tu_k)*55');
    if (!eb1_main(m) || eb1_crowded(m, G)) return;
    // accent floor line under the hinge (counter-scaled against the layer's squash)
    var S = jzNoGhost(eb1_shape(m, 'JZ In Hinge')), H = eb1_head(m), mg = sz * 0.2, t = Math.max(1.5 * m.u, sz * 0.025), grp = jzGrp(S, 'floor'), gx = jzGX(grp);
    jzAddRect(grp, r.width + mg * 2, t, 0); jzAddFill(grp, m.ctx.sc.accent || '#FFFFFF');
    jzSetExpr(gx.property('ADBE Vector Position'), H + kk + '[' + jzN(G.cx) + ',' + jzN(y1) + '+' + jzN(t * 1.5) + '/tu_k]');
    jzSetExpr(gx.property('ADBE Vector Scale'), H + kk + '[100,100/tu_k]');
    jzSetExpr(gx.property('ADBE Vector Group Opacity'), H + '(1-sm(0.35,0.8,P))*cl(P*6)*100');
} });

/* ================================================================ PAPER */

/* ---- crumple — くしゃ戻り: each glyph arrives as a crumpled ball and springs open flat
   (browser: every stroke piece is pulled in and twisted; here: glyph scale + twist per glyph and a decaying Turbulent Displace crinkle) */
jzReg('enter', 'crumple', { selfHide: true, apply: function (m) {
    var L = m.L, q = eb1_hd(m) + eb1_q(0.45) + 'var e=ob(q,1.6),on=q>0&&q<1;';
    jzAnimator(L, 'JZ In Ball', [['ADBE Text Scale 3D', [0, 0, 100]]], q + 'on?(1-(0.3+0.7*e))*100:0');
    jzAnimator(L, 'JZ In Twist', [['ADBE Text Rotation', 120]], q + 'on?(hh(textIndex*29+SD)*2-1)*(1-e)*100:0');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-cl(q*4))*100');
    var td = jzEffect(L, 'ADBE Turbulent Displace', 'JZ In Crumple');
    jzEP(td, 1, 1); jzEP(td, 3, Math.max(8, m.size * 0.22)); jzEP(td, 5, 2); jzEP(td, 6, (m.c.seed % 360));
    jzEX(td, 2, eb1_hd(m) + 'P>=1?0:SZ*0.5*Math.pow(1-sm(0,0.95,P),1.5)');
} });

/* ================================================================ LIGHT */

/* ---- overexpose — 露出オーバー: the line flashes in blown-out white (bloom + glow), then the exposure is pulled down to its real colour */
jzReg('enter', 'overexpose', { apply: function (m) {
    var L = m.L, G = eb1_geo(m), sc = m.ctx.sc, sz = m.size;
    var hot = jzLum(eb1_pick(sc.bg, '#000000')) < 0.5 ? '#FFFFFF' : eb1_pick(sc.accent, sc.fg);
    var ex = EB1_FNS + 'var ox_e=P<0.12?1:1-ios((P-0.12)/0.88);', hd = eb1_hd(m) + ex;
    m.parts.op.push('f*=P<0.12?oc(P/0.12):1;');
    m.parts.sc.push(ex + 'f=[f[0]*(1+0.06*ox_e),f[1]*(1+0.06*ox_e)];');
    m.parts.pos.push(ex + eb1_pivot(m, '1+0.06*ox_e', '1+0.06*ox_e', '0', G.cx, G.cy));
    jzAnimator(L, 'JZ In Burn', [['ADBE Text Fill Color', jzHex(hot)]], hd + 'ox_e*96');
    eb1_addStroke(L, hot);
    jzAnimator(L, 'JZ In Bloom', [['ADBE Text Stroke Width', sz * 0.045], ['ADBE Text Stroke Color', jzHex(hot)]], hd + 'ox_e>0.02?ox_e*100:0');
    var bl = Math.min(14, sz * 0.04);
    jzAnimator(L, 'JZ In Soft', [['ADBE Text Blur', [bl, bl]]], hd + 'ox_e*ox_e*100');
    // the glow (browser: a hot shadow with no offset)
    var ds = jzEffect(L, 'ADBE Drop Shadow', 'JZ In Glow');
    jzEP(ds, 1, jzHex(hot)); jzEP(ds, 3, 135); jzEP(ds, 4, 0);
    jzEX(ds, 2, hd + '229.5*ox_e'); jzEX(ds, 5, hd + jzN(Math.min(90, sz * 0.5)) + '*ox_e');
    var gl = jzEffect(L, 'ADBE Glo2', 'JZ In Flare');
    jzEP(gl, 2, 25);
    jzEX(gl, 3, hd + jzN(Math.min(60, sz * 0.35)) + '*ox_e'); jzEX(gl, 4, hd + '0.8*ox_e*ox_e');
} });

/* ---- backlight — 逆光: a halo rises behind the line first, the glyphs read as dark silhouettes against it, then light up */
jzReg('enter', 'backlight', { apply: function (m) {
    var L = m.L, G = eb1_geo(m), sc = m.ctx.sc, sz = m.size, r = G.r;
    var bg = eb1_pick(sc.bg, '#000000'), col = jzTextColor(L), glow = eb1_pick(sc.accent, sc.fg);
    var ev = EB1_FNS + 'var bl_r=oc(P/0.4),bl_l=ios(cl((P-0.3)/0.6)),bl_h=bl_r*(1-sm(0.45,1,P));', hd = eb1_hd(m) + ev;
    jzAnimator(L, 'JZ In Silhouette', [['ADBE Text Fill Color', jzHex(jzMixHex(bg, col, 0.12))]], hd + '(1-bl_l)*100');
    m.parts.op.push('f*=cl(P*5);');
    m.parts.sc.push(ev + 'f=[f[0]*(1+0.035*(1-bl_l)),f[1]*(1+0.035*(1-bl_l))];');
    m.parts.pos.push(ev + eb1_pivot(m, '1+0.035*(1-bl_l)', '1+0.035*(1-bl_l)', '0', G.cx, G.cy));
    var ds = jzEffect(L, 'ADBE Drop Shadow', 'JZ In Rim');
    jzEP(ds, 1, jzHex(glow)); jzEP(ds, 3, 135); jzEP(ds, 4, 0);
    jzEX(ds, 2, hd + '242*bl_h'); jzEX(ds, 5, hd + jzN(Math.min(110, sz * 0.55)) + '*(0.5+0.5*bl_r)');
    if (!eb1_main(m) || eb1_crowded(m, G)) return;
    // the halo behind the line (browser: radial gradient) = soft accent ellipse under the text
    var R = Math.sqrt(r.width * r.width + r.height * r.height) / 2 + sz * 0.8, S = jzNoGhost(eb1_shape(m, 'JZ In Halo', false, true)), H = eb1_head(m) + ev;
    var grp = jzGrp(S, 'halo'); jzAddEllipse(grp, R * 1.3, R * 1.3); jzAddFill(grp, glow);
    jzGX(grp).property('ADBE Vector Position').setValue([G.cx, G.cy]);
    var gb = jzEffect(S, 'ADBE Gaussian Blur 2', 'JZ Halo Soft'); jzEP(gb, 1, R * 0.45);
    jzSetExpr(jzXf(S, 'ADBE Opacity'), H + 'cl(P*5)*bl_h*26');
} });

/* ---- lightLeak — 光漏れ: a warm light leak drifts along the line; each glyph burns in hot where it passes and cools to its colour */
jzReg('enter', 'lightLeak', { selfHide: true, apply: function (m) {
    var L = m.L, G = eb1_geo(m), vert = G.vert, r = G.r, sc = m.ctx.sc, sz = m.size, i, F = [];
    var warm = eb1_pick(sc.accent, sc.fg), dark = jzLum(eb1_pick(sc.bg, '#000000')) < 0.5, core = jzMixHex(warm, '#FFFFFF', dark ? 0.45 : 0.2);
    var U0 = vert ? r.top : r.left, U1 = U0 + (vert ? r.height : r.width), span = Math.max(1, U1 - U0), bl = Math.min(20, sz * 0.06);
    for (i = 0; i < G.n; i++) F.push(((vert ? G.g[i].y : G.g[i].x) - U0) / span);
    var q = eb1_hd(m) + 'var F=' + eb1_arr(F) + ',q=cl((P-0.55*(F[textIndex-1]||0))/0.45),on=q>0&&q<1,ht=1-oc(q),a1=Math.min(1,ht*1.5);';
    jzAnimator(L, 'JZ In Warm', [['ADBE Text Fill Color', jzHex(warm)]], q + 'on?a1*100:0');
    jzAnimator(L, 'JZ In Core', [['ADBE Text Fill Color', jzHex(core)]], q + 'on&&ht>0.6?(ht-0.6)/0.4*a1*100:0');
    jzAnimator(L, 'JZ In Swell', [['ADBE Text Scale 3D', [200, 200, 100]], ['ADBE Text Blur', [bl, bl]]], q + 'on?[ht*7,ht*7,0]:[0,0,0]');
    jzAnimator(L, 'JZ In Haze', [['ADBE Text Blur', [bl, bl]]], q + 'on?ht*ht*100:0');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-cl(q*4))*100');
    if (!eb1_main(m) || G.nk <= 1 || eb1_crowded(m, G)) return;
    // the leak: a soft blob sliding along the line (screen on dark backgrounds, multiply on light ones)
    var S = jzNoGhost(eb1_shape(m, 'JZ In Leak')), H = eb1_head(m), R = Math.max(sz * 1.4, (vert ? r.width : r.height) * 1.1);
    var grp = jzGrp(S, 'leak'), gx = jzGX(grp), tint = dark ? warm : jzMixHex(warm, '#FFFFFF', 0.55);
    jzAddEllipse(grp, R * 1.1, R * 1.1); jzAddFill(grp, dark ? core : tint);
    var hp = jzN(U0 - sz * 0.5) + '+' + jzN(U1 - U0 + sz) + '*cl(P/0.62)';
    jzSetExpr(gx.property('ADBE Vector Position'), H + (vert ? '[' + jzN(G.cx) + ',' + hp + ']' : '[' + hp + ',' + jzN(G.cy) + ']'));
    var gb = jzEffect(S, 'ADBE Gaussian Blur 2', 'JZ Leak Soft'); jzEP(gb, 1, R * 0.5);
    try { S.blendingMode = dark ? BlendingMode.SCREEN : BlendingMode.MULTIPLY; } catch (e) {}
    jzSetExpr(jzXf(S, 'ADBE Opacity'), H + 'cl(P*6)*(1-sm(0.55,0.95,P))*' + (dark ? 75 : 55));
} });

/* ---- loupe — ルーペ: a magnifying glass slides along the line; glyphs swell under the lens and are left sharp behind it */
jzReg('enter', 'loupe', { apply: function (m) {
    var L = m.L, G = eb1_geo(m), vert = G.vert, r = G.r, sz = m.size, i, UU = [], VV = [];
    var U0 = vert ? r.top : r.left, U1 = U0 + (vert ? r.height : r.width), V0 = vert ? r.left : r.top, V1 = V0 + (vert ? r.width : r.height), vc = (V0 + V1) / 2;
    var R = Math.max(sz * 0.95, (V1 - V0) * 0.62), K = R * 0.4;
    for (i = 0; i < G.n; i++) { UU.push(vert ? G.g[i].y : G.g[i].x); VV.push(vert ? G.g[i].x : G.g[i].y); }
    var lc = 'var Lc=' + jzN(U0 - R * 0.7) + '+' + jzN(U1 + R * 1.4 - (U0 - R * 0.7)) + '*ios(cl(P/0.9)),pre=0.14*cl(P*5),fin=cl(P*6);';
    var q = eb1_hd(m) + lc + 'var UU=' + eb1_arr(UU) + ',VV=' + eb1_arr(VV) + ',du=(UU[textIndex-1]||0)-Lc,dv=(VV[textIndex-1]||0)-(' + jzN(vc) + '),d=Math.sqrt(du*du+dv*dv)/' + jzN(R) + ',mm=d<1?1-d*d:0;';
    jzAnimator(L, 'JZ In Lens', [['ADBE Text Scale 3D', [200, 200, 100]]], q + 'mm*60');
    jzAnimator(L, 'JZ In Push', [['ADBE Text Position 3D', [K, K, 0]]], q + 'var pu=0.35*mm/' + jzN(K) + '*100;' + (vert ? '[dv*pu,du*pu,0]' : '[du*pu,dv*pu,0]'));
    jzAnimator(L, 'JZ In Fade', [['ADBE Text Opacity', 0]], q + 'var a=d>=1?(du>0?pre:1):fin*(du>0?pre+(1-pre)*Math.min(1,mm*3):1);(1-a)*100');
    if (!eb1_main(m) || G.arranged || eb1_crowded(m, G)) return;
    // the magnifier: accent ring, faint highlight arc, handle
    var S = jzNoGhost(eb1_shape(m, 'JZ In Loupe')), H = eb1_head(m), lw = Math.max(2 * m.u, sz * 0.05), acc = m.ctx.sc.accent || '#FFFFFF';
    var grp = jzGrp(S, 'loupe'), gx = jzGX(grp);
    var hdl = eb1_sub(grp, 'handle'); jzAddRect(hdl, R * 0.778, lw * 2, lw); jzAddFill(hdl, acc);
    jzGX(hdl).property('ADBE Vector Position').setValue([R * 0.982, R * 0.982]); jzGX(hdl).property('ADBE Vector Rotation').setValue(45);
    var ring = eb1_sub(grp, 'ring'); jzAddEllipse(ring, R * 2, R * 2); jzAddStroke(ring, acc, lw);
    var arc = eb1_sub(grp, 'glint'); jzAddEllipse(arc, R * 1.6, R * 1.6); jzAddStroke(arc, m.ctx.sc.fg || '#FFFFFF', lw * 0.5, 50);
    jzAddTrimPaths(arc, '94.4', '80.6');
    jzSetExpr(gx.property('ADBE Vector Position'), H + lc + (vert ? '[' + jzN(vc) + ',Lc]' : '[Lc,' + jzN(vc) + ']'));
    jzSetExpr(gx.property('ADBE Vector Group Opacity'), H + 'cl(P*8)*(1-sm(0.8,0.97,P))*100');
} });

/* ---- stickerPeel — シール貼り: every glyph is pressed on like a die-cut sticker: the stuck part grows from its bottom-left corner
   along the diagonal while the free part is still lifted, foreshortened toward the fold line (stuck part = a linked copy clipped by a
   track matte of growing right triangles; lifted part = a second copy in a lighter tone, compressed across the 45° fold, clipped by
   the inverted matte) */
function eb1_tris(m, S, G, pad) {
    var H = eb1_head(m), i;
    for (i = 0; i < G.n; i++) {
        var g = G.g[i]; if (g.sp) continue;
        var hx = g.w / 2 + pad, hy = g.h / 2 + pad, o = G.n > 1 ? i / (G.n - 1) : 0;
        var hq = H + 'var q=cl((P-' + jzN(0.5 * o) + ')/0.5),c=(-0.02+1.04*io3(q))*' + jzN(2 * (hx + hy)) + ';';
        var grp = jzGrp(S, 'tri ' + (i + 1)), gx = jzGX(grp);
        jzAddPath(grp, [[0, 0], [100, 0], [0, -100]], true); jzAddFill(grp, '#FFFFFF');
        gx.property('ADBE Vector Position').setValue([g.x - hx, g.y + hy]);
        jzSetExpr(gx.property('ADBE Vector Scale'), hq + '[Math.max(0,c),Math.max(0,c)]');
        jzSetExpr(gx.property('ADBE Vector Group Opacity'), hq + 'q>0&&c>0.5?100:0');
    }
}
jzReg('enter', 'stickerPeel', { selfHide: true, apply: function (m) {
    var L = m.L, G = eb1_geo(m), sz = m.size, pad = sz * 0.12, bg = eb1_pick(m.ctx.sc.bg, '#000000'), col = jzTextColor(L), lift = jzMixHex(col, bg, 0.3), i;
    var q = eb1_hd(m) + eb1_q(0.5) + 'var on=q>0&&q<1;';
    var soft = G.arranged || G.masked || eb1_matted(L) || eb1_crowded(m, G) || !G.nk || !eb1_main(m);
    if (soft) {       // no linked copies: each glyph is laid down from its bottom-left corner
        var hw = [], K0 = sz * 1.2;
        for (i = 0; i < G.n; i++) hw.push(G.g[i].w / 2);
        var qs = q + 'var W=' + eb1_arr(hw) + ',hw=W[textIndex-1]||SZ*0.5,hy=' + jzN(G.fs / 2) + ',k=0.25+0.75*io3(q);';
        jzAnimator(L, 'JZ In Press', [['ADBE Text Scale 3D', [0, 0, 100]]], qs + 'on?(1-k)*100:0');
        jzAnimator(L, 'JZ In Corner', [['ADBE Text Position 3D', [K0, K0, 0]]], qs + 'on?[-(1-k)*hw/' + jzN(K0) + '*100,(1-k)*hy/' + jzN(K0) + '*100,0]:[0,0,0]');
        jzAnimator(L, 'JZ In Lift', [['ADBE Text Fill Color', jzHex(lift)]], qs + 'on?(1-io3(q))*100:0');
        jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], qs + 'q<=0?100:(1-cl(q*6))*100');
        return;
    }
    var D = eb1_twin(m, 'JZ In Stuck'), F = eb1_twin(m, 'JZ In Flap');
    jzAnimator(D, 'JZ In Set', [['ADBE Text Opacity', 0]], q + 'on?0:100');
    jzAnimator(F, 'JZ In Set', [['ADBE Text Opacity', 0]], q + 'on?(1-cl(q*6))*100:100');
    jzAnimator(F, 'JZ In Lift', [['ADBE Text Fill Color', jzHex(lift)], ['ADBE Text Stroke Color', jzHex(lift)]], '100');
    // the free part is lifted ~62°: seen from the front it is compressed by cos 62° across the fold (the 45° diagonal) toward the fold line.
    // That matrix = rotation 19.85° · skew 39.7° · scale 78.1 / 60.1 %; about the fold's middle point it moves the glyph by b·(hx+hy−c)·(−1, 1)
    var HS = [], K = sz * 0.6, b = (1 - Math.cos(62 * Math.PI / 180)) / 2;
    for (i = 0; i < G.n; i++) HS.push(G.g[i].w / 2 + G.g[i].h / 2 + pad * 2);
    jzAnimator(F, 'JZ In Fold', [['ADBE Text Rotation', 19.85], ['ADBE Text Skew', 39.7], ['ADBE Text Scale 3D', [78.1, 60.1, 100]]], q + 'on?100:0');
    jzAnimator(F, 'JZ In Hinge', [['ADBE Text Position 3D', [K, K, 0]]], q + 'var HS=' + eb1_arr(HS) + ',hs=HS[textIndex-1]||SZ,c=(-0.02+1.04*io3(q))*2*hs,v=' + jzN(b) + '*(hs-c)/' + jzN(K) + '*100;on?[-v,v,0]:[0,0,0]');
    var M = eb1_shape(m, 'JZ In Stuck Matte'), MF = eb1_shape(m, 'JZ In Flap Matte');
    eb1_tris(m, M, G, pad); eb1_tris(m, MF, G, pad);
    try {
        D.moveBefore(L); M.moveBefore(D); F.moveBefore(M); MF.moveBefore(F);
        D.trackMatteType = TrackMatteType.ALPHA; F.trackMatteType = TrackMatteType.ALPHA_INVERTED;
    } catch (e1) { jzWarn('stickerPeel matte: ' + e1.toString()); }
    // the lyric layer itself shows each glyph once it is stuck down completely
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<1?100:0');
} });

/* ---- noteUnfold — 手紙開き: every glyph is a note folded in four: the top-left quarter shows, the right half swings open on the
   vertical crease, then the bottom half swings down on the horizontal crease (quarter clips = per-glyph rect masks, the swinging
   halves = two linked copies squashed toward the creases, each clipped to its half) */
jzReg('enter', 'noteUnfold', { selfHide: true, apply: function (m) {
    var L = m.L, G = eb1_geo(m), sz = m.size, bg = eb1_pick(m.ctx.sc.bg, '#000000'), fs = G.fs, i;
    var st = eb1_q(0.45) + 'var on=q>0&&q<1,e1=oc((q-0.14)/0.38),e2=oc((q-0.5)/0.44);';
    var q = eb1_hd(m) + st;
    var soft = G.arranged || G.masked || eb1_matted(L) || eb1_crowded(m, G) || G.nk > 24 || !G.nk;
    if (soft) {       // no clips: the glyph opens from its top-left corner (half width, half height → full)
        var hw = [], K = sz;
        for (i = 0; i < G.n; i++) hw.push(G.g[i].w / 2);
        var qs = q + 'var W=' + eb1_arr(hw) + ',hw=W[textIndex-1]||SZ*0.5,hy=' + jzN(fs / 2) + ',sx=q<0.14?0.5:0.5+0.5*e1,sy=q<0.5?0.5:0.5+0.5*e2;';
        jzAnimator(L, 'JZ In Unfold', [['ADBE Text Scale 3D', [0, 0, 100]]], qs + 'on?[(1-sx)*100,(1-sy)*100,0]:[0,0,0]');
        jzAnimator(L, 'JZ In Corner', [['ADBE Text Position 3D', [K, K, 0]]], qs + 'on?[-(1-sx)*hw/' + jzN(K) + '*100,-(1-sy)*hy/' + jzN(K) + '*100,0]:[0,0,0]');
        jzAnimator(L, 'JZ In Shade', [['ADBE Text Fill Color', jzHex(bg)]], qs + 'on?(q<0.5?1-e1:1-e2)*55:0');
        jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], qs + 'q<=0?100:(1-cl(q/0.14))*100');
        return;
    }
    var H = eb1_head(m), shade = function (Lx, ex) { jzAnimator(Lx, 'JZ In Shade', [['ADBE Text Fill Color', jzHex(bg)]], eb1_hd(m) + st + '(1-' + ex + ')*55'); };
    // the swinging right half (stage 1) and bottom half (stage 2): linked copies squashed toward the crease (glyph centre)
    var R = eb1_twin(m, 'JZ In Flap R'), B = eb1_twin(m, 'JZ In Flap B');
    jzAnimator(R, 'JZ In Swing', [['ADBE Text Scale 3D', [0, 100, 100]]], eb1_hd(m) + st + 'q>0.14&&q<0.52?[(1-Math.max(0.03,e1))*100,0,0]:[0,0,0]');
    jzAnimator(R, 'JZ In Set', [['ADBE Text Opacity', 0]], eb1_hd(m) + st + 'q>0.14&&q<0.52?0:100');
    shade(R, 'e1');
    jzAnimator(B, 'JZ In Swing', [['ADBE Text Scale 3D', [100, 0, 100]]], eb1_hd(m) + st + 'q>0.5&&q<1?[0,(1-Math.max(0.03,e2))*100,0]:[0,0,0]');
    jzAnimator(B, 'JZ In Set', [['ADBE Text Opacity', 0]], eb1_hd(m) + st + 'q>0.5&&q<1?0:100');
    shade(B, 'e2');
    // per-glyph clips (layer space): L = top-left quarter, + top-right quarter after stage 1, + bottom half when done
    var hy = fs * 0.66, mk;
    for (i = 0; i < G.n; i++) {
        var g = G.g[i]; if (g.sp) continue;
        var o = G.n > 1 ? i / (G.n - 1) : 0, hq = H + 'var q=cl((P-' + jzN(0.45 * o) + ')/0.55);', w = g.w * 0.53, x = g.x, y = g.y;
        mk = jzMaskRect(L, x - w, y - hy, x + 0.004 * fs, y + 0.004 * fs); jzSetExpr(mk.property('ADBE Mask Opacity'), hq + 'q>0?100:0');
        mk = jzMaskRect(L, x, y - hy, x + w, y + 0.004 * fs); jzSetExpr(mk.property('ADBE Mask Opacity'), hq + 'q>=0.52?100:0');
        mk = jzMaskRect(L, x - w, y, x + w, y + hy); jzSetExpr(mk.property('ADBE Mask Opacity'), hq + 'q>=1?100:0');
        mk = jzMaskRect(R, x, y - hy, x + w, y + 0.004 * fs);
        mk = jzMaskRect(B, x - w, y, x + w, y + hy);
    }
    var r = G.r;
    mk = jzMaskRect(L, r.left - fs, r.top - fs, r.left + r.width + fs, r.top + r.height + fs);
    try { mk.name = 'JZ In Open'; } catch (e0) {}
    jzSetExpr(mk.property('ADBE Mask Opacity'), H + 'time>=DL+IN?100:0');
    jzSetExpr(mk.property('ADBE Mask Offset'), H + 'time>=DL+IN?1e4:0');
    // the lyric layer: appears with a small pop in the first stage
    jzAnimator(L, 'JZ In Pop', [['ADBE Text Scale 3D', [0, 0, 100]]], q + 'q>0&&q<0.14?(1-(0.9+0.1*ob(q/0.14,2)))*100:0');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-cl(q/0.14))*100');
    if (!eb1_main(m)) return;
    // faint creases while the note is still folded
    var S = jzNoGhost(eb1_shape(m, 'JZ In Creases')), lw = Math.max(1 * m.u, sz * 0.012), cc = m.ctx.sc.sub || m.ctx.sc.fg || '#FFFFFF';
    for (i = 0; i < G.n; i++) {
        var g2 = G.g[i]; if (g2.sp) continue;
        var o2 = G.n > 1 ? i / (G.n - 1) : 0, hq2 = H + 'var q=cl((P-' + jzN(0.45 * o2) + ')/0.55),a=q<=0||q>=1?0:0.6*(1-sm(0.85,1,q))*cl(q*6)*100;';
        var ch = g2.w * 0.55, cv = fs * 0.58;
        // (the rect is set up before the fill is added: adding to the contents invalidates older item references)
        var gv = jzGrp(S, 'crease v ' + (i + 1)), rv = jzAddRect(gv, lw, cv, 0);
        jzSetExpr(rv.property('ADBE Vector Rect Size'), hq2 + '[' + jzN(lw) + ',q<0.52?' + jzN(cv) + ':' + jzN(cv * 2) + ']');
        jzAddFill(gv, cc);
        jzSetExpr(jzGX(gv).property('ADBE Vector Position'), hq2 + '[' + jzN(g2.x) + ',q<0.52?' + jzN(g2.y - cv / 2) + ':' + jzN(g2.y) + ']');
        jzSetExpr(jzGX(gv).property('ADBE Vector Group Opacity'), hq2 + 'a');
        var gh = jzGrp(S, 'crease h ' + (i + 1)), rh = jzAddRect(gh, ch, lw, 0);
        jzSetExpr(rh.property('ADBE Vector Rect Size'), hq2 + '[q<0.14?' + jzN(ch) + ':' + jzN(ch * 2) + ',' + jzN(lw) + ']');
        jzAddFill(gh, cc);
        jzSetExpr(jzGX(gh).property('ADBE Vector Position'), hq2 + '[q<0.14?' + jzN(g2.x - ch / 2) + ':' + jzN(g2.x) + ',' + jzN(g2.y) + ']');
        jzSetExpr(jzGX(gh).property('ADBE Vector Group Opacity'), hq2 + 'a');
    }
} });

/* ---- tornJoin — 破れ合わせ: the line is torn in two along a ragged seam; the halves slide in from opposite sides and butt together */
jzReg('enter', 'tornJoin', { apply: function (m) {
    var L = m.L, G = eb1_geo(m), vert = G.vert, r = G.r, sz = m.size, seed = m.c.seed | 0, i;
    var s0 = Math.abs(jzXf(L, 'ADBE Scale').value[vert ? 1 : 0] / 100) || 1, D = (sz * 2 + (vert ? r.height : r.width) * 0.25) * s0;
    var ev = EB1_FNS + 'var tj_k=1-o4(P/0.72),tj_j=sm(0.62,0.72,P)*(1-sm(0.72,1,P))*' + jzN(sz * 0.035 * s0) + '*Math.sin(P*90);';
    var soft = G.masked || eb1_matted(L) || eb1_crowded(m, G);
    m.parts.op.push('f*=cl(P*5);');
    m.parts.rot.push(ev + 'r+=-5*tj_k;');
    m.parts.pos.push(ev + eb1_pivot(m, '1', '1', '-5*tj_k', G.cx, G.cy) + (vert ? 'd=[d[0]+tj_j,d[1]-' + jzN(D) + '*tj_k];' : 'd=[d[0]-' + jzN(D) + '*tj_k,d[1]+tj_j];'));
    if (soft) return;
    // the ragged seam across the reading axis (layer space), the two halves as masks on L and on a linked copy
    var U = vert ? G.cy : G.cx, V0 = (vert ? r.left : r.top) - sz * 0.15, V1 = (vert ? r.left + r.width : r.top + r.height) + sz * 0.15;
    var far = (vert ? r.height : r.width) + sz * 6, K = 11, seam = [];
    for (i = 0; i <= K; i++) seam.push([U + eb1_rs(seed, i, 95) * sz * 0.1 + (i % 2 ? 1 : -1) * sz * 0.03, V0 + (V1 - V0) * i / K]);
    var poly = function (side, ov) {
        var pts = [], j;
        for (j = 0; j < seam.length; j++) { var u = seam[j][0] - side * ov, v = seam[j][1]; pts.push(vert ? [v, u] : [u, v]); }
        pts.push(vert ? [V1, U + side * far] : [U + side * far, V1]); pts.push(vert ? [V0, U + side * far] : [U + side * far, V0]);
        return pts;
    };
    var H = eb1_head(m), D2 = eb1_twin(m, 'JZ In Torn B');
    var addPoly = function (Lx, pts, name) {
        var mk = Lx.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
        sh.vertices = pts; sh.closed = true; mk.property('ADBE Mask Shape').setValue(sh);
        try { mk.name = name; } catch (e0) {}
        return mk;
    };
    var mA = addPoly(L, poly(-1, 0), 'JZ In Torn A');
    jzSetExpr(mA.property('ADBE Mask Offset'), H + 'P>=0.72?1e4:0');
    addPoly(D2, poly(1, 1.2), 'JZ In Torn B');
    // the other half: slides in from the opposite side (its offset is given in L's own, rotated space) and turns the other way
    var tr = D2.property('ADBE Transform Group');
    tr.property('ADBE Anchor Point').setValue([G.cx, G.cy]);
    jzSetExpr(tr.property('ADBE Position'), H + ev + 'var a=-parent.transform.rotation*Math.PI/180,sc=parent.transform.scale,wx=' + (vert ? '0' : '2*' + jzN(D) + '*tj_k') + ',wy=' + (vert ? '2*' + jzN(D) + '*tj_k' : '0') + ';' +
        '[' + jzN(G.cx) + '+(Math.cos(a)*wx-Math.sin(a)*wy)/(sc[0]/100),' + jzN(G.cy) + '+(Math.sin(a)*wx+Math.cos(a)*wy)/(sc[1]/100)]');
    jzSetExpr(tr.property('ADBE Rotate Z'), H + ev + '10*tj_k');
    jzSetExpr(tr.property('ADBE Opacity'), H + 'time>=DL&&P<0.72?cl(P*5)*100:0');
    if (!eb1_main(m) || G.nk <= 1) return;
    // paper fibres along both torn edges
    var fib = jzMixHex(eb1_pick(m.ctx.sc.fg, '#FFFFFF'), eb1_pick(m.ctx.sc.bg, '#000000'), 0.35), lw = Math.max(1 * m.u, sz * 0.018), sp = [];
    for (i = 0; i < seam.length; i++) sp.push(vert ? [seam[i][1], seam[i][0]] : [seam[i][0], seam[i][1]]);
    var k2;
    for (k2 = 0; k2 < 2; k2++) {
        var S = jzNoGhost(eb1_shape(m, 'JZ In Fibres ' + (k2 + 1))), grp = jzGrp(S, 'seam');
        jzAddPath(grp, sp, false); jzAddStroke(grp, fib, lw);
        jzSetExpr(jzXf(S, 'ADBE Opacity'), H + 'cl(P*5)*(1-sm(0.7,0.95,P))*80');
        if (k2) { try { S.parent = D2; S.moveBefore(D2); } catch (e2) {} }
    }
} });

/* ---- splitFlap — パタパタ: each glyph flaps through a few random characters before landing on its own
   (browser: top / bottom half-leaves of old and new character; here: the leaf squashes to the hinge and back, the character changes
   at the hinge through a Character Offset, a hairline gap splits every glyph) */
jzReg('enter', 'splitFlap', { selfHide: true, apply: function (m) {
    var L = m.L, G = eb1_geo(m), sz = m.size, bg = eb1_pick(m.ctx.sc.bg, '#000000'), SP = [], i;
    for (i = 0; i < G.n; i++) SP.push(G.g[i].sp ? 1 : 0);
    var q = eb1_hd(m) + eb1_q(0.4) + 'var i=textIndex-1,SP=' + eb1_arr(SP) + ',F=3+(i%2),x=q*F,j=Math.min(F-1,Math.floor(x)),fr=x-j,on=q>0&&q<1&&!SP[i],ch=fr<0.5?j:j+1,' +
        'cs=fr<0.5?Math.cos(fr*Math.PI):-Math.cos(fr*Math.PI),sy=Math.max(0.03,cs);';
    // the character on the leaf: step 0 = blank, step F = the glyph itself, else a random sign
    jzAnimator(L, 'JZ In Flap', [['ADBE Text Character Offset', 100]], q + 'on&&ch>0&&ch<F?8+Math.floor(hh(textIndex*31+ch*7+SD)*50):0');
    jzAnimator(L, 'JZ In Leaf', [['ADBE Text Scale 3D', [100, 0, 100]]], q + 'on?[0,(1-sy)*100,0]:[0,0,0]');
    jzAnimator(L, 'JZ In Shade', [['ADBE Text Fill Color', jzHex(bg)]], q + 'on?(1-sy)*50:0');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0||(on&&ch<=0)?100:0');
    if (G.arranged || eb1_crowded(m, G) || G.nk > 40) return;
    // the hairline gap between the two flaps of every glyph
    var S = jzNoGhost(eb1_shape(m, 'JZ In Gap')), H = eb1_head(m), t = Math.max(1 * m.u, sz * 0.018);
    for (i = 0; i < G.n; i++) {
        var g = G.g[i]; if (g.sp) continue;
        var o = G.n > 1 ? i / (G.n - 1) : 0, grp = jzGrp(S, 'gap ' + (i + 1));
        jzAddRect(grp, g.w * 1.04, t, 0); jzAddFill(grp, bg);
        jzGX(grp).property('ADBE Vector Position').setValue([g.x, g.y]);
        jzSetExpr(jzGX(grp).property('ADBE Vector Group Opacity'), H + 'var q=cl((P-' + jzN(0.4 * o) + ')/0.6);q>0&&q<1?100:0');
    }
} });

/* ---- glint — グリント: the line waits as a faint ghost; a slanted glint sweeps across and leaves it lit behind the highlight
   (lit part and highlight = linked copies clipped by slanted shape-layer track mattes that ride with the glint) */
jzReg('enter', 'glint', { apply: function (m) {
    var L = m.L, G = eb1_geo(m), vert = G.vert, r = G.r, sz = m.size, sc = m.ctx.sc, kS = 0.45;
    var col = jzTextColor(L), hot = (jzLum(col) > 0.7 || jzLum(eb1_pick(sc.bg, '#000000')) > 0.5) ? eb1_pick(sc.accent, sc.fg) : '#FFFFFF';
    var U0 = vert ? r.top : r.left, U1 = U0 + (vert ? r.height : r.width), V0 = (vert ? r.left : r.top) - sz * 0.3, V1 = (vert ? r.left + r.width : r.top + r.height) + sz * 0.3, vc = (V0 + V1) / 2;
    var bw = sz * 0.55, sl = kS * (V1 - V0) / 2, big = (U1 - U0) + sz * 8, hv = (V1 - V0) / 2;
    var bx = 'var B=' + jzN(U0 - bw - sl) + '+' + jzN(U1 + bw + sl - (U0 - bw - sl)) + '*ios(cl(P/0.9));';
    var soft = eb1_matted(L) || eb1_crowded(m, G) || !eb1_main(m);
    if (soft) {       // per glyph: ghost until the glint passes it, hot while it is under the glint
        var UU = [], VV = [], i;
        for (i = 0; i < G.n; i++) { UU.push(vert ? G.g[i].y : G.g[i].x); VV.push(vert ? G.g[i].x : G.g[i].y); }
        var q = eb1_hd(m) + bx + 'var UU=' + eb1_arr(UU) + ',VV=' + eb1_arr(VV) + ',w=(UU[textIndex-1]||0)+' + jzN(kS) + '*((VV[textIndex-1]||0)-(' + jzN(vc) + ')),z=(B-w)/' + jzN(bw) + ';';
        jzAnimator(L, 'JZ In Glint', [['ADBE Text Fill Color', jzHex(hot)]], q + 'z>0&&z<1?(1-z)*100*(1-sm(0.85,1,P)):0');
        jzAnimator(L, 'JZ In Ghost', [['ADBE Text Opacity', 0]], q + 'P>=1?0:(w<B?0:(1-0.2*cl(P*6))*100)');
        return;
    }
    var H = eb1_head(m), dv0 = -hv, dv1 = hv;
    var P2 = function (du, dv) { return vert ? [dv, du] : [du, dv]; };
    var band = function (grp, a, b) { jzAddPath(grp, [P2(a - kS * dv0, dv0), P2(b - kS * dv0, dv0), P2(b - kS * dv1, dv1), P2(a - kS * dv1, dv1)], true); jzAddFill(grp, '#FFFFFF'); };
    var at = H + bx + (vert ? '[' + jzN(vc) + ',B]' : '[B,' + jzN(vc) + ']');
    // lit part: everything behind the glint's leading edge
    var T1 = eb1_twin(m, 'JZ In Lit'), M1 = eb1_shape(m, 'JZ In Lit Matte'), g1 = jzGrp(M1, 'lit');
    band(g1, -big, 0);
    jzSetExpr(jzGX(g1).property('ADBE Vector Position'), at);
    // the highlight: a hot copy seen through two slanted bands (soft outer band, bright core)
    var T3 = jzNoGhost(eb1_twin(m, 'JZ In Hot'));    // the highlight is drawn in the main pass only
    jzAnimator(T3, 'JZ In Hot', [['ADBE Text Fill Color', jzHex(hot)], ['ADBE Text Stroke Color', jzHex(hot)]], '100');
    jzSetExpr(jzXf(T3, 'ADBE Opacity'), H + 'time>=DL&&time<DL+IN?(1-sm(0.85,1,P))*100:0');
    var M3 = jzNoGhost(eb1_shape(m, 'JZ In Hot Matte')), g3 = jzGrp(M3, 'glint');
    var go = eb1_sub(g3, 'outer'); band(go, -bw, bw * 0.15); jzGX(go).property('ADBE Vector Group Opacity').setValue(45);
    var gi = eb1_sub(g3, 'core'); band(gi, -bw * 0.45, 0);
    jzSetExpr(jzGX(g3).property('ADBE Vector Position'), at);
    try {
        T1.moveBefore(L); M1.moveBefore(T1); T3.moveBefore(M1); M3.moveBefore(T3);
        T1.trackMatteType = TrackMatteType.ALPHA; T3.trackMatteType = TrackMatteType.ALPHA;
    } catch (e1) { jzWarn('glint matte: ' + e1.toString()); }
    // the lyric layer waits as a faint ghost under the lit copy
    m.parts.op.push('f*=time>=DL+IN?1:0.2*cl(P*6);');
} });

/* ---- filmFeed — フィルム送り: projector losing its loop: the frame rolls through the gate with a frame line, the lamp flickers, then it locks
   (the text rolls inside a fixed gate mask through a text animator; a linked copy is the frame above it) */
jzReg('enter', 'filmFeed', { apply: function (m) {
    var L = m.L, G = eb1_geo(m), r = G.r, sz = m.size, FH = r.height + sz * 0.7, g0 = G.cy - FH / 2, g1 = G.cy + FH / 2;
    var s0 = Math.abs(jzXf(L, 'ADBE Scale').value[0] / 100) || 1, F = jzN(FH);
    var ev = 'var ff_e=oc(P/0.82),ff_o=((' + F + '*2.35*(1-ff_e))%' + F + '+' + F + ')%' + F + ',ff_l=1-sm(0.55,0.95,P),ff_n=Math.floor(time*24);';
    m.parts.op.push(EB1_FNS + ev + 'f*=cl(P*7)*(1-0.45*ff_l*hh(ff_n*3+SD+99));');
    m.parts.pos.push(EB1_FNS + ev + 'd=[d[0]+(hh(ff_n*7+SD+98)*2-1)*' + jzN(sz * 0.02 * s0) + '*ff_l,d[1]];');
    var soft = G.masked || eb1_matted(L) || eb1_crowded(m, G), H = eb1_head(m);
    if (soft) {       // no gate: the frame only settles with a small stepped roll
        jzAnimator(L, 'JZ In Roll', [['ADBE Text Position 3D', [0, sz * 0.4, 0]]], eb1_hd(m) + ev + 'var a=ff_o/' + F + '*100;[a,a,0]');
        return;
    }
    // the gate: fixed in the layer's own space (glyphs move inside it), opens when the entrance is over
    var mk = jzMaskRect(L, r.left - sz * 2, g0, r.left + r.width + sz * 2, g1);
    try { mk.name = 'JZ In Gate'; } catch (e0) {}
    jzSetExpr(mk.property('ADBE Mask Offset'), H + 'time>=DL+IN?1e4:0');
    // the frame above (a linked copy one frame height higher, same gate)
    var D = eb1_twin(m, 'JZ In Frame');
    jzSetExpr(jzXf(D, 'ADBE Opacity'), H + 'time>=DL&&time<DL+IN?parent.transform.opacity:0');
    jzAnimator(D, 'JZ In Roll', [['ADBE Text Position 3D', [0, FH, 0]]], H + ev + 'var a=(ff_o-' + F + ')/' + F + '*100;[a,a,0]');
    jzAnimator(L, 'JZ In Roll', [['ADBE Text Position 3D', [0, FH, 0]]], H + ev + 'var a=ff_o/' + F + '*100;[a,a,0]');
    if (!eb1_main(m)) return;
    // the frame line rolling with the film (behind the text)
    var S = jzNoGhost(eb1_shape(m, 'JZ In Frame Line', false, true)), grp = jzGrp(S, 'frame line'), sc = m.ctx.sc;
    jzAddRect(grp, r.width + sz * 1.2, sz * 0.12, 0); jzAddFill(grp, jzMixHex(eb1_pick(sc.bg, '#000000'), eb1_pick(sc.fg, '#FFFFFF'), 0.18));
    jzSetExpr(jzGX(grp).property('ADBE Vector Position'), H + ev + '[' + jzN(G.cx) + ',' + jzN(g0) + '+ff_o]');
    jzSetExpr(jzXf(S, 'ADBE Opacity'), H + ev + 'ff_o>=0.5&&P<1?parent.transform.opacity*(1-sm(0.6,0.82,P)):0');
} });
