// ================================================================ pack x2entC (AE port of src/11p_x2_entC.js) — 30 whole-item entrances
// xgGate xgSignSpin xgNoseDive xgQuarterTurn xgCornerUnfurl xgWiper xgJelly xgShearUp xgNewsSpin xgCoinSettle xgPumpUp /
// xgHeavyDrop xgPushBar xgWallHit xgHangSign xgStampLift xgPaperFall xgRatchet xgZipLine / xgFocusHunt xgStrobe xgDoubleVision
// xgComet xgFillDock xgColorPour xgBlockSink xgLensFringe xgAfterimage / xgKeyPoses xgRoughCut
// Whole-item motion = the text layer's own transform. Every part writes ONE expression body that replays the browser's
// apply(env, it, p) on a small state machine: xgro(deg, lx, ly) = rotateAbout, xgsc(kx, ky, ax, ay) = scaleFrom / sizeFrom,
// xgmv(dx, dy) = moveLocal, xgX / xgY += design-space moves, xgfd(k) = fade. Pivots are given like in the browser: px from the
// item's origin (= the layer's anchor point) in the item's own rotated frame, so edges / corners / far pivots work for any
// alignment. The same body is put into the layer's Scale / Position / Rotation / Opacity expressions (m.parts) and into the
// expressions of the helper graphics, so everything stays in step and re-timable.
// Graphics the browser draws around the item (hinge, push bar, wall, chains, wire, dust line) are shape layers marked
// jzNoGhost: item-local ones are parented to the text layer (its entrance scale is cancelled so bars keep their thickness),
// screen-fixed ones sit in the layer's parent space. Extra copies of the lyric (outline die, double image, colour fringes,
// colour pour) are linked copies of the text layer ("twins", parented to it, only alive during the entrance).
// Colour changes are Fill / Stroke Colour animators; streaks are a directional blur; the comet trail is an Echo effect.

// ---------------------------------------------------------------- shared helpers (axg_*)
// expression side: xgo4 outQuart, xgio inOutCubic, xgis inOutSine, xgsm smoothstep(a, b, x), xgspr damped spring (1 -> 0),
// xglp lerp + the transform state (xgR = the layer's own rotation, xgX xgY xgA xgKX xgKY xgAL)
var AXG_FNS = 'function xgo4(x){x=cl(x);return 1-Math.pow(1-x,4);}' +
    'function xgio(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}function xgis(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}' +
    'function xgsm(a,b,x){x=cl((x-a)/(b-a));return x*x*(3-2*x);}' +
    'function xgspr(t,k,q){t=cl(t);return Math.exp(-k*t)*Math.cos(q*Math.PI*t)*(1-t*t*t);}' +
    'function xglp(a,b,t){return a+(b-a)*t;}\n';
var AXG_STATE = 'function xgmv(a,b){var q=(xgR+xgA)*Math.PI/180,c=Math.cos(q),s=Math.sin(q);xgX+=c*a-s*b;xgY+=s*a+c*b;}' +
    'function xgro(g,a,b){if(!g)return;var q=(xgR+xgA)*Math.PI/180,c=Math.cos(q),s=Math.sin(q),u=xgX+c*a-s*b,v=xgY+s*a+c*b;' +
    'xgA+=g;q=(xgR+xgA)*Math.PI/180;c=Math.cos(q);s=Math.sin(q);xgX=u-(c*a-s*b);xgY=v-(s*a+c*b);}' +
    'function xgsc(kx,ky,a,b){xgKX*=kx;xgKY*=ky;xgmv(-a*(kx-1),-b*(ky-1));}' +
    'function xgfd(k){xgAL*=cl(k);}\n';
function axg_T(m) { var c = m.c; return { IN: Math.max(0.02, c.inDur || 0.3), DL: (m.o.mi || 0) * (c.stagger || 0.04) }; }
function axg_arr(a) { var s = [], i; for (i = 0; i < a.length; i++) s.push(jzN(a[i])); return '[' + s.join(',') + ']'; }
function axg_isHex(c) { return typeof c === 'string' && c.charAt(0) === '#' && (c.length === 7 || c.length === 4); }
function axg_pick(a, b, c) { if (axg_isHex(a)) return a; if (axg_isHex(b)) return b; if (axg_isHex(c)) return c; return '#FFFFFF'; }
// the browser's J.h / J.r / J.rs (so seeded directions and corners match the web version)
function axg_h(a, b, c, d, e) {
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
function axg_r(a, b, c, d) { return axg_h(a, b, c, d) / 4294967296; }
function axg_rs(a, b, c, d) { return axg_r(a, b, c, d) * 2 - 1; }
function axg_dir(m, salt) { return axg_r(m.c.seed | 0, salt, 5) < 0.5 ? -1 : 1; }
function axg_td(L) { try { return L.property('ADBE Text Properties').property('ADBE Text Document').value; } catch (e) { return null; } }
// the item's box like the browser's box(it): px from the item origin (the anchor point) in the layer's own rotated frame.
//   B {x0 y0 x1 y1 w h cx cy}  vert (one glyph per line)  size (font px)  rot (deg)  sx sy (layer scale factors)
//   px py (rest position in the parent's space)  lcx lcy (box centre in layer coordinates)  r (source rect)  lead, nL
function axg_box(m) {
    var L = m.L, tr = L.property('ADBE Transform Group'), A = tr.property('ADBE Anchor Point').value, S = tr.property('ADBE Scale').value;
    var P0 = tr.property('ADBE Position').value, r = jzRect(L), sx = S[0] / 100, sy = S[1] / 100, td = axg_td(L), i;
    if (!(Math.abs(sx) > 0.001)) sx = 1;
    if (!(Math.abs(sy) > 0.001)) sy = 1;
    var xa = (r.left - A[0]) * sx, xb = (r.left + r.width - A[0]) * sx, ya = (r.top - A[1]) * sy, yb = (r.top + r.height - A[1]) * sy;
    var B = { x0: Math.min(xa, xb), x1: Math.max(xa, xb), y0: Math.min(ya, yb), y1: Math.max(ya, yb), sx: sx, sy: sy, r: r,
        rot: tr.property('ADBE Rotate Z').value || 0, px: P0[0], py: P0[1], lcx: r.left + r.width / 2, lcy: r.top + r.height / 2,
        size: m.size, vert: false, nL: 1, lead: m.size * 1.2, filled: true, stroked: false, n: 0 };
    B.w = Math.max(1, B.x1 - B.x0); B.h = Math.max(1, B.y1 - B.y0); B.cx = (B.x0 + B.x1) / 2; B.cy = (B.y0 + B.y1) / 2;
    if (td) {
        var lines = String(td.text).split(/\r\n|\r|\n|\u0003/);
        B.nL = lines.length; B.vert = lines.length > 1;
        for (i = 0; i < lines.length; i++) { var nc = jzChars(lines[i]).length; B.n += nc; if (nc > 1) B.vert = false; }
        try { if (!td.autoLeading && td.leading > 0) B.lead = td.leading; } catch (e0) {}
        B.filled = td.applyFill !== false;
        B.stroked = !!(td.applyStroke && td.strokeWidth > 0);
    }
    return B;
}
// rest position (parent space) of the item-local point (lx, ly)
function axg_rest(B, lx, ly) {
    var q = B.rot * Math.PI / 180, c = Math.cos(q), s = Math.sin(q);
    return [B.px + c * lx - s * ly, B.py + s * lx + c * ly];
}
// rest AABB of the box (the browser's dRange)
function axg_range(B) {
    var p = [axg_rest(B, B.x0, B.y0), axg_rest(B, B.x1, B.y0), axg_rest(B, B.x0, B.y1), axg_rest(B, B.x1, B.y1)], i;
    var R = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
    for (i = 0; i < 4; i++) { R.x0 = Math.min(R.x0, p[i][0]); R.x1 = Math.max(R.x1, p[i][0]); R.y0 = Math.min(R.y0, p[i][1]); R.y1 = Math.max(R.y1, p[i][1]); }
    return R;
}
// put the body into the layer transform; returns the full expression prelude (header + state + body) for other expressions.
// body variables must not be called f, d or r (the accumulators of m.parts)
function axg_apply(m, B, body) {
    var code = AXG_FNS + 'var xgR=' + jzN(B.rot) + ',xgX=0,xgY=0,xgA=0,xgKX=1,xgKY=1,xgAL=1;' + AXG_STATE + 'if(P<1){' + body + '}';
    if (body.indexOf('xgsc(') >= 0) m.parts.sc.push(code + 'f=[f[0]*xgKX,f[1]*xgKY];');
    if (body.indexOf('xgro(') >= 0) m.parts.rot.push(code + 'r+=xgA;');
    if (body.indexOf('xgX') >= 0 || body.indexOf('xgY') >= 0 || body.indexOf('xgsc(') >= 0 || body.indexOf('xgro(') >= 0 || body.indexOf('xgmv(') >= 0) m.parts.pos.push(code + 'd=[d[0]+xgX,d[1]+xgY];');
    m.parts.op.push(code + 'f*=cl(xgAL);');
    return m.HD + code;
}
// the lyric's primary item (not a faded / outline copy, not one glyph of a multi-item layout): props only go here
function axg_main(m, B) {
    try {
        if (!B.filled || jzCount(String(axg_td(m.L).text)) <= 1) return false;
        return jzXf(m.L, 'ADBE Opacity').value >= 85;
    } catch (e) { return true; }
}
function axg_matted(L) { try { return L.trackMatteType !== TrackMatteType.NO_TRACK_MATTE; } catch (e) { return false; } }
// helper layers / twins are skipped for one-glyph-per-layer layouts of long lyrics and when the comp is crowded
function axg_crowded(m, B) {
    if (B.n > 60 || (B.n <= 1 && jzCount(m.c.text || '') > 14)) return true;
    try { return m.ctx.comp.numLayers > 60; } catch (e) { return false; }
}
function axg_top(m) { var L = m.L; if (axg_matted(L)) { try { return m.ctx.comp.layer(L.index - 1); } catch (e) {} } return L; }
function axg_live(m, S) { var t = axg_T(m); try { S.outPoint = Math.max(S.inPoint + 0.05, Math.min(S.outPoint, t.DL + t.IN + 0.1)); } catch (e) {} }
function axg_zero(S) {
    var tr = S.property('ADBE Transform Group');
    tr.property('ADBE Anchor Point').setValue([0, 0]); tr.property('ADBE Position').setValue([0, 0]);
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
}
// helper shape layer in the item's own frame (browser postLocal): parented to the text layer, origin at its anchor point,
// units = px (the layer's own scale and the entrance's scale are cancelled). X = prelude from axg_apply
function axg_local(m, B, X, name) {
    var L = m.L, S = m.ctx.comp.layers.addShape();
    S.name = name;
    try { S.moveBefore(axg_top(m)); } catch (e0) {}
    S.parent = L; axg_zero(S);
    jzXf(S, 'ADBE Position').setValue(jzXf(L, 'ADBE Anchor Point').value);
    jzSetExpr(jzXf(S, 'ADBE Scale'), X + '[100/(' + jzN(B.sx) + '*xgKX),100/(' + jzN(B.sy) + '*xgKY)]');
    axg_live(m, S);
    return jzNoGhost(S);
}
// helper shape layer fixed on the screen (browser addPost in design space): coordinates = the text layer's parent space
function axg_world(m, name) {
    var L = m.L, S = m.ctx.comp.layers.addShape(), par = null;
    S.name = name;
    try { S.moveBefore(axg_top(m)); } catch (e0) {}
    try { par = L.parent; } catch (e1) { par = null; }
    if (par) S.parent = par;
    axg_zero(S); axg_live(m, S);
    return jzNoGhost(S);
}
// a 100 px long bar from the group origin along +x (length by group scale x %, direction by group rotation)
function axg_bar(S, name, lw, hex) {
    var g = jzGrp(S, name);
    jzAddRect(g, 100, lw, 0, 50, 0); jzAddFill(g, hex);
    return g;
}
// world position [wx, wy] of the item-local point (lx, ly) while the entrance runs (the item's scale must be untouched)
function axg_wpt(B, lx, ly) {
    return 'var q9=(xgR+xgA)*Math.PI/180,c9=Math.cos(q9),s9=Math.sin(q9),wx=' + jzN(B.px) + '+xgX+c9*' + jzN(lx) + '-s9*' + jzN(ly) +
        ',wy=' + jzN(B.py) + '+xgY+s9*' + jzN(lx) + '+c9*' + jzN(ly) + ';';
}
// linked copy of the text layer: parented to L, pivot at the box centre, shows only during the entrance. Make it BEFORE the
// entrance's own animators are added. link = takes L's final text style by expression (the treatment is applied later)
function axg_twin(m, B, tag, below, link) {
    var L = m.L, D = L.duplicate(), i, mns = ['ADBE Position', 'ADBE Scale', 'ADBE Rotate Z', 'ADBE Opacity', 'ADBE Anchor Point'];
    try { D.name = String(L.name).substr(0, 20) + ' ' + tag; } catch (e0) {}
    var tr = D.property('ADBE Transform Group');
    for (i = 0; i < mns.length; i++) { try { if (tr.property(mns[i]).expression) tr.property(mns[i]).expression = ''; } catch (e1) {} }
    D.parent = L;
    tr.property('ADBE Anchor Point').setValue([B.lcx, B.lcy]); tr.property('ADBE Position').setValue([B.lcx, B.lcy]);
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    if (link) { try { D.property('ADBE Text Properties').property('ADBE Text Document').expression = 'parent.text.sourceText.style'; } catch (e2) {} }
    axg_live(m, D);
    try { if (below) D.moveAfter(L); else D.moveBefore(axg_top(m)); } catch (e3) {}
    return D;
}
function axg_canTwin(m, B) { return !axg_matted(m.L) && !axg_crowded(m, B) && B.n > 0; }
// position expression tail of a twin moved by the design-space vector (vx, vy) (expression strings)
function axg_twinPos(B, vx, vy) {
    var q = B.rot * Math.PI / 180, c = Math.cos(q), s = Math.sin(q);
    return '[' + jzN(B.lcx) + '+((' + vx + ')*' + jzN(c) + '+(' + vy + ')*' + jzN(s) + ')/' + jzN(B.sx) + ',' +
        jzN(B.lcy) + '+((' + vy + ')*' + jzN(c) + '-(' + vx + ')*' + jzN(s) + ')/' + jzN(B.sy) + ']';
}
// colour animator on a text layer (fill and / or stroke, whatever the layer has); amt = selector expression (0..100)
function axg_ink(L, name, hex, amt, fillOnly) {
    var td = axg_td(L), props = [];
    if (!td) return;
    if (td.applyFill !== false) props.push(['ADBE Text Fill Color', jzHex(hex)]);
    if (td.applyStroke && (!fillOnly || td.applyFill === false)) props.push(['ADBE Text Stroke Color', jzHex(hex)]);
    if (props.length) jzAnimator(L, name, props, amt);
}
// a colour that differs from the item's own colour
function axg_hot(m) {
    var sc = m.ctx.sc, col = String(jzTextColor(m.L)).toUpperCase();
    return col === String(sc.accent || '').toUpperCase() ? axg_pick(sc.accent2, sc.fg) : axg_pick(sc.accent, sc.fg);
}
// speed streak (browser it.streak: a few fading copies behind the item): a directional blur. ang / len = expression tails
function axg_streak(m, B, X, ang, len) {
    var db = jzEffect(m.L, 'ADBE Motion Blur', 'JZ In Streak');
    if (typeof ang === 'number') jzEP(db, 1, ang); else jzEX(db, 1, X + ang);
    jzEX(db, 2, X + '(' + len + ')/' + jzN(Math.abs(B.sx)));
}
function axg_c(B) { return jzN(B.cx) + ',' + jzN(B.cy); }

/* =====================================================================
   A. RIGID TRANSFORMS
   ===================================================================== */

/* ---- xgGate — 片開き戸: the whole line is a door hinged on one edge: it swings shut from edge-on, rebounds open once and closes */
jzReg('enter', 'xgGate', { apply: function (m) {
    var B = axg_box(m), dir = axg_dir(m, 11), sz = B.size, vert = B.vert, sc = m.ctx.sc, prim = axg_main(m, B) && !axg_crowded(m, B);
    var X = axg_apply(m, B, 'var th=88*Math.abs(xgspr(P,1.6,2.2)),kk=Math.max(0.02,Math.cos(th*Math.PI/180));' +
        (vert ? 'xgsc(1,kk,' + jzN(B.cx) + ',' + jzN(dir > 0 ? B.y0 : B.y1) + ');' : 'xgsc(kk,1,' + jzN(dir > 0 ? B.x0 : B.x1) + ',' + jzN(B.cy) + ');') + 'xgfd(P*8);');
    axg_ink(m.L, 'JZ In Shade', axg_pick(sc.bg), X + 'P<1?(1-kk)*50:0', true);
    if (!prim) return;
    // the hinge post
    var S = axg_local(m, B, X, 'JZ In Hinge'), g = jzGrp(S, 'hinge'), t = Math.max(2 * m.u, sz * 0.035), mg = sz * 0.12;
    var edge = vert ? (dir > 0 ? B.y0 : B.y1) : (dir > 0 ? B.x0 : B.x1), og = (dir > 0 ? '-' : '+') + jzN(mg + t / 2);
    if (vert) jzAddRect(g, B.w + mg * 2, t, 0); else jzAddRect(g, t, B.h + mg * 2, 0);
    jzAddFill(g, sc.accent || '#FFFFFF');
    // (the box edge in the item's current frame = its resting coordinate x the entrance's scale)
    jzSetExpr(jzGX(g).property('ADBE Vector Position'), X + (vert ? '[' + jzN(B.cx) + ',' + jzN(edge) + '*xgKY' + og + ']' : '[' + jzN(edge) + '*xgKX' + og + ',' + jzN(B.cy) + ']'));
    jzSetExpr(jzXf(S, 'ADBE Opacity'), X + 'P<1?cl(xgAL)*(1-xgsm(0.55,0.95,P))*100:0');
} });

/* ---- xgSignSpin — 回転看板: the line turns one and a half times around its own upright axis like a revolving sign, showing its dim back
   (the back = every glyph mirrored in place + shaded towards the background) */
jzReg('enter', 'xgSignSpin', { apply: function (m) {
    var B = axg_box(m), vert = B.vert;
    var X = axg_apply(m, B, 'var th=(1-oc(P))*540,cc=Math.cos(th*Math.PI/180),kk=Math.max(0.03,Math.abs(cc));xgsc(' + (vert ? '1,kk,' : 'kk,1,') + axg_c(B) + ');xgfd(P*5);');
    jzAnimator(m.L, 'JZ In Back', [['ADBE Text Scale 3D', vert ? [100, -100, 100] : [-100, 100, 100]]], X + 'P<1&&cc<0?100:0');
    axg_ink(m.L, 'JZ In Shade', axg_pick(m.ctx.sc.bg), X + 'P<1?(cc<0?55:(1-kk)*35):0', true);
} });

/* ---- xgNoseDive — 前のめり: slides in and brakes hard: the body pitches forward on its front bottom corner, the tail lifts and drops back */
jzReg('enter', 'xgNoseDive', { apply: function (m) {
    var B = axg_box(m), dir = axg_dir(m, 13), sz = B.size;
    var D = Math.min(m.W * 0.45, Math.max(sz * 3, B.w * 0.6)) * (0.7 + 0.5 * m.ctx.fx.motion), amp = jzClamp(sz * 30 / Math.max(1, B.w), 5, 15);
    var X = axg_apply(m, B, 'var e1=xgo4(P/0.5),t1=(P-0.26)/0.74,pit=t1<=0?0:(t1<0.28?oc(t1/0.28):1-bo((t1-0.28)/0.72));' +
        'xgro(' + jzN(dir * amp) + '*pit,' + jzN(dir > 0 ? B.x1 : B.x0) + ',' + jzN(B.y1) + ');xgX-=' + jzN(dir * D) + '*(1-e1);xgfd(P*7);');
    axg_streak(m, B, X, 90, 'P<1?' + jzN(sz * 0.55) + '*(1-e1):0');
} });

/* ---- xgQuarterTurn — 四分回転: the line stands on end, turns a quarter and lands level with a small over-rotation */
jzReg('enter', 'xgQuarterTurn', { apply: function (m) {
    var B = axg_box(m), dir = axg_dir(m, 15);
    axg_apply(m, B, 'xgro(' + jzN(dir * 90) + '*(1-ob(P,1.5)),' + axg_c(B) + ');var kk=xglp(0.5,1,oc(P));xgsc(kk,kk,' + axg_c(B) + ');xgfd(P*5);');
} });

/* ---- xgCornerUnfurl — 角から展開: the line grows out of one of its own corners while swinging round that corner */
jzReg('enter', 'xgCornerUnfurl', { apply: function (m) {
    var B = axg_box(m), c = axg_h(m.c.seed | 0, 17) % 4;
    var ax = (c & 1) ? B.x1 : B.x0, ay = (c & 2) ? B.y1 : B.y0, sgn = ((c & 1) ^ ((c >> 1) & 1)) ? 1 : -1, pv = jzN(ax) + ',' + jzN(ay);
    axg_apply(m, B, 'xgro(' + jzN(sgn * 40) + '*xgspr(P,2.8,1.5),' + pv + ');var kk=Math.max(0.04,ob(P,1.3));xgsc(kk,kk,' + pv + ');xgfd(P*6);');
} });

/* ---- xgWiper — 弧で滑走: the line rides in on a wide arc around a far pivot, like the tip of a wiper blade */
jzReg('enter', 'xgWiper', { apply: function (m) {
    var B = axg_box(m), dir = axg_dir(m, 19), up = axg_h(m.c.seed | 0, 20) & 1;
    var R = Math.max(Math.min(m.W, m.H) * 0.85, B.w * 0.7);
    axg_apply(m, B, 'xgro(' + jzN(dir * 40) + '*(1-ob(P,1.2)),' + jzN(B.cx) + ',' + jzN(B.cy + (up ? -R : R)) + ');xgfd(P*6);');
} });

/* ---- xgJelly — ぷるん: the whole line pops up from the ground like jelly: width and height overshoot out of phase */
jzReg('enter', 'xgJelly', { apply: function (m) {
    var B = axg_box(m);
    axg_apply(m, B, 'var dd=Math.exp(-4*P)*(1-P*P*P),v1=dd*Math.cos(3*Math.PI*P),v2=dd*Math.cos(3*Math.PI*P-1)/Math.cos(1);' +
        'if(v1<0)v1*=0.35;if(v2<0)v2*=0.35;' +
        'xgsc(Math.max(0.03,1-v1),Math.max(0.03,1-v2*(1-0.3*xgsm(0,0.5,P))),' + jzN(B.cx) + ',' + jzN(B.y1) + ');xgfd(P*8);');
} });

/* ---- xgShearUp — 斜体起こし: the line lies sheared flat along its baseline and whips upright, leaning past vertical once
   (the shear = a Skew animator on every glyph; the item slides so the foot of the line stays put; the rows of a column
   slide sideways by tan(skew) x their height like the browser's whole-item shear) */
jzReg('enter', 'xgShearUp', { apply: function (m) {
    var L = m.L, B = axg_box(m), dir = axg_dir(m, 23), sz = B.size, tn = dir * Math.min(2.2, sz * 2.6 / Math.max(1, B.h)), i;
    var K = Math.atan(Math.abs(tn)) * 180 / Math.PI + 0.01, tq = 'var tq=P<1?' + jzN(tn) + '*xgspr(P,3,2.3):0;';
    var X = axg_apply(m, B, 'xgmv(-' + jzN(tn) + '*xgspr(P,3,2.3)*' + jzN(B.y1 - B.cy) + ',0);xgfd(P*5);');
    jzAnimator(L, 'JZ In Shear', [['ADBE Text Skew', K]], X + tq + 'Math.atan(tq)*180/Math.PI/' + jzN(K) + '*100');
    if (B.vert && B.nL > 1) {
        var dy = [], mx = 1;
        for (i = 0; i < B.nL; i++) { dy.push((i - (B.nL - 1) / 2) * B.lead * B.sy / B.sx); mx = Math.max(mx, Math.abs(dy[i])); }
        var KP = mx * Math.abs(tn) + 1;
        jzAnimator(L, 'JZ In Shear Rows', [['ADBE Text Position 3D', [KP, 0, 0]]], X + tq + 'var YS=' + axg_arr(dy) + ';tq*(YS[textIndex-1]||0)/' + jzN(KP) + '*100');
    }
} });

/* ---- xgNewsSpin — 号外スピン: the line spins in from a dot, two full turns, like a headline hitting the screen */
jzReg('enter', 'xgNewsSpin', { apply: function (m) {
    var B = axg_box(m), dir = axg_dir(m, 25);
    axg_apply(m, B, 'xgro(' + jzN(dir * 720) + '*(1-oc(P)),' + axg_c(B) + ');var kk=Math.max(0.03,xgsm(0,1,P));xgsc(kk,kk,' + axg_c(B) + ');xgfd(P*4);');
} });

/* ---- xgCoinSettle — コイン着地: the line rattles flat like a coin settling: it tips back and forth faster and faster, less and less */
jzReg('enter', 'xgCoinSettle', { apply: function (m) {
    var B = axg_box(m);
    var X = axg_apply(m, B, 'var ph=Math.PI*2*(1.5*P+4.5*P*P),dd=Math.pow(1-P,1.3),kk=Math.max(0.05,1-0.88*dd*(0.5+0.5*Math.cos(ph)));' +
        'xgro(5*dd*Math.sin(ph/2)*(1-P),' + axg_c(B) + ');xgsc(' + (B.vert ? 'kk,1,' : '1,kk,') + axg_c(B) + ');xgfd(P*7);');
    axg_ink(m.L, 'JZ In Shade', axg_pick(m.ctx.sc.bg), X + 'P<1?(1-kk)*40:0', true);
} });

/* ---- xgPumpUp — 空気入れ: pumped up in three puffs: each stroke swells the line past a size, it sags a little, the last one fills it */
jzReg('enter', 'xgPumpUp', { apply: function (m) {
    var B = axg_box(m);
    axg_apply(m, B, 'var LL=[0.02,0.45,0.75,1],x3=P*3,kk=Math.min(2,Math.floor(x3)),fr=x3-kk,ss=xglp(LL[kk],LL[kk+1],ob(fr/0.5,2.4));' +
        'if(kk<2)ss-=0.06*xgsm(0.55,1,fr);ss=Math.max(0.02,ss);var pf=Math.sin(Math.PI*cl(fr/0.5))*0.07;' +
        'xgsc(ss,ss,' + axg_c(B) + ');xgsc(1+pf,1-pf*0.6,' + jzN(B.cx) + '*ss,' + jzN(B.cy) + '*ss);xgfd(P*10);');
} });

/* =====================================================================
   B. PHYSICAL ARRIVALS
   ===================================================================== */

/* ---- xgHeavyDrop — どすん: the line falls as one heavy body, flattens on the floor and hops twice, squashing less each time */
jzReg('enter', 'xgHeavyDrop', { apply: function (m) {
    var B = axg_box(m), sz = B.size, D = sz * 2.6 + B.h * 0.5, prim = axg_main(m, B) && !axg_crowded(m, B);
    var X = axg_apply(m, B, 'var dy=0,sy=1;if(P<0.3){var t1=P/0.3;dy=-(1-t1*t1)*' + jzN(D) + ';sy=1+0.22*t1;}' +
        'else if(P<0.42)sy=1-0.34*Math.sin(Math.PI*cl((P-0.3)/0.12));' +
        'else if(P<0.7){var u1=cl((P-0.42)/0.28);dy=-4*u1*(1-u1)*' + jzN(sz * 0.55) + ';sy=1+0.1*Math.sin(Math.PI*u1);}' +
        'else if(P<0.78)sy=1-0.2*Math.sin(Math.PI*cl((P-0.7)/0.08));' +
        'else if(P<0.92){var u2=cl((P-0.78)/0.14);dy=-4*u2*(1-u2)*' + jzN(sz * 0.14) + ';}' +
        'else sy=1-0.07*Math.sin(Math.PI*cl((P-0.92)/0.08));' +
        'xgsc(1/Math.pow(sy,0.35),sy,' + jzN(B.cx) + ',' + jzN(B.y1) + ');xgY+=dy;xgfd(P*10);');
    if (!prim) return;
    // the dust line on the floor (fixed on the screen, under the resting line)
    var R0 = axg_range(B), S = axg_world(m, 'JZ In Thud'), g = jzGrp(S, 'thud'), rc = jzAddRect(g, 10, 10, 0);
    jzSetExpr(rc.property('ADBE Vector Rect Size'), X + 'var t3=cl((P-0.3)/0.4);[' + jzN(R0.x1 - R0.x0) + '*(0.6+0.6*oc(t3)),Math.max(' + jzN(2 * m.u) + ',' + jzN(sz * 0.035) + '*(1-t3))]');
    jzAddFill(g, m.ctx.sc.accent || '#FFFFFF');
    jzGX(g).property('ADBE Vector Position').setValue([(R0.x0 + R0.x1) / 2, R0.y1 + sz * 0.06 + sz * 0.0175]);
    jzSetExpr(jzXf(S, 'ADBE Opacity'), X + 'P>=0.3&&P<1?cl(xgAL)*(1-cl((P-0.3)/0.4))*90:0');
} });

/* ---- xgPushBar — 押し棒: a bar shoves the line into place at a steady pace; the bar pulls away and the squeezed line relaxes */
jzReg('enter', 'xgPushBar', { apply: function (m) {
    var B = axg_box(m), vert = B.vert, dir = axg_dir(m, 29), sz = B.size, prim = axg_main(m, B) && !axg_crowded(m, B);
    var D = Math.min((vert ? m.H : m.W) * 0.42, (vert ? B.h : B.w) * 0.35 + sz * 2.4), edge = vert ? (dir > 0 ? B.y0 : B.y1) : (dir > 0 ? B.x0 : B.x1);
    var X = axg_apply(m, B, 'var off=0,sq=1,t2=0;if(P<0.6){var t1=P/0.6,e1=t1<0.25?1.142857*t1*t1/0.5:1.142857*(t1-0.125);off=-(' + jzN(dir * D) + ')*(1-e1);sq=1-0.09*xgsm(0,0.15,t1);}' +
        'else{t2=(P-0.6)/0.4;sq=1-0.09*xgspr(t2,3.5,3);}' +
        (vert ? 'xgsc(1,sq,' + jzN(B.cx) + ',' + jzN(edge) + ');xgY+=off;' : 'xgsc(sq,1,' + jzN(edge) + ',' + jzN(B.cy) + ');xgX+=off;') + 'xgfd(P*8);');
    if (!prim) return;
    // the bar (it rides on the pushed edge, then backs off)
    var S = axg_local(m, B, X, 'JZ In Push Bar'), g = jzGrp(S, 'bar'), bw = Math.max(6 * m.u, sz * 0.09), mg = sz * 0.2;
    if (vert) jzAddRect(g, B.w + mg * 2, bw, 0); else jzAddRect(g, bw, B.h + mg * 2, 0);
    jzAddFill(g, m.ctx.sc.accent || '#FFFFFF');
    var gp = 'var gp=' + jzN(sz * 0.06 + bw / 2) + '+(P<1?ic(t2):1)*' + jzN(sz * 3) + ';';
    jzSetExpr(jzGX(g).property('ADBE Vector Position'), X + gp + (vert ? '[' + jzN(B.cx) + ',' + jzN(edge) + '*xgKY' + (dir > 0 ? '-' : '+') + 'gp]' : '[' + jzN(edge) + '*xgKX' + (dir > 0 ? '-' : '+') + 'gp,' + jzN(B.cy) + ']'));
    jzSetExpr(jzXf(S, 'ADBE Opacity'), X + 'P<1?cl(xgAL)*(P<0.6?1:1-xgsm(0.25,0.85,t2))*100:0');
} });

/* ---- xgWallHit — 壁当て: the line speeds up from the side, hits an unseen wall, crumples against it and springs back to its length */
jzReg('enter', 'xgWallHit', { apply: function (m) {
    var B = axg_box(m), dir = axg_dir(m, 31), sz = B.size, prim = axg_main(m, B) && !axg_crowded(m, B);
    var D = Math.min(m.W * 0.45, Math.max(sz * 3.5, B.w * 0.5)) * (0.7 + 0.5 * m.ctx.fx.motion), front = dir > 0 ? B.x1 : B.x0;
    var X = axg_apply(m, B, 'var off=0,sq=1,t1=0,u1=0;if(P<0.4){u1=P/0.4;off=-(' + jzN(dir * D) + ')*(1-u1*u1*u1);sq=1+0.18*u1*u1;}' +
        'else{t1=(P-0.4)/0.6;u1=cl((t1-0.16)/0.84);sq=t1<0.16?1-0.36*Math.sin(Math.PI/2*t1/0.16):1-0.36*xgspr(u1,3.2,2.6);off=-(' + jzN(dir * sz * 0.4) + ')*Math.sin(Math.PI*u1)*(1-u1);}' +
        'xgsc(sq,1/Math.pow(sq,0.5),' + jzN(front) + ',' + jzN(B.cy) + ');xgX+=off;xgfd(P*6);');
    axg_streak(m, B, X, 90, 'P<0.4?' + jzN(sz * 1.2) + '*u1*u1:0');
    if (!prim) return;
    // the wall flashes where the line hits it (fixed on the screen)
    var R0 = axg_range(B), S = axg_world(m, 'JZ In Wall'), g = jzGrp(S, 'wall'), bw = Math.max(4 * m.u, sz * 0.06), rc = jzAddRect(g, bw, 10, 0);
    jzSetExpr(rc.property('ADBE Vector Rect Size'), X + '[' + jzN(bw) + ',' + jzN(R0.y1 - R0.y0) + '+' + jzN(sz * 2) + '*(0.25+0.5*oc(P<1?t1:1))]');
    jzAddFill(g, m.ctx.sc.accent || '#FFFFFF');
    jzGX(g).property('ADBE Vector Position').setValue([dir > 0 ? R0.x1 + sz * 0.05 + bw / 2 : R0.x0 - sz * 0.05 - bw / 2, (R0.y0 + R0.y1) / 2]);
    jzSetExpr(jzXf(S, 'ADBE Opacity'), X + 'P>=0.4&&P<1?cl(xgAL)*Math.exp(-t1*5)*(1-t1)*100:0');
} });

/* ---- xgHangSign — 吊り看板: the line is let down on two chains like a hanging sign and rocks until it hangs still */
jzReg('enter', 'xgHangSign', { apply: function (m) {
    var B = axg_box(m), sz = B.size, dir = axg_dir(m, 33), Lh = sz * 0.9 + B.h * 0.5, sc = m.ctx.sc, k;
    var prim = axg_main(m, B) && !axg_crowded(m, B), amp = jzClamp(sz * 34 / Math.max(1, B.w), 3.5, 12);
    var X = axg_apply(m, B, 'xgro(' + jzN(dir * amp) + '*xgspr(P,2.2,4.4),' + jzN(B.cx) + ',' + jzN(B.cy - Lh) + ');xgY-=' + jzN(sz * 1.2) + '*(1-oc(P/0.3));xgfd(P*6);');
    if (!prim) return;
    // two chains from above the frame to the top corners + their eyelets (fixed ends on the screen, loose ends on the sign)
    var S = axg_world(m, 'JZ In Chains'), lw = Math.max(1.5 * m.u, sz * 0.02), in0 = B.w * 0.1, hasPar = false;
    try { hasPar = !!m.L.parent; } catch (e0) {}
    for (k = 0; k < 2; k++) {
        var lx = k ? B.x1 - in0 : B.x0 + in0, top = [axg_rest(B, lx, B.y0)[0], hasPar ? B.py - m.H : -20 * m.u];
        var W = X + axg_wpt(B, lx, B.y0) + 'var ux=wx-' + jzN(top[0]) + ',uy=wy-' + jzN(top[1]) + ';';
        var g = axg_bar(S, 'chain ' + (k + 1), lw, axg_pick(sc.sub, sc.fg)), gx = jzGX(g);
        gx.property('ADBE Vector Position').setValue(top);
        jzSetExpr(gx.property('ADBE Vector Rotation'), W + 'Math.atan2(uy,ux)*180/Math.PI');
        jzSetExpr(gx.property('ADBE Vector Scale'), W + '[Math.sqrt(ux*ux+uy*uy),100]');
        var e = jzGrp(S, 'eyelet ' + (k + 1));
        jzAddEllipse(e, lw * 3.4, lw * 3.4); jzAddFill(e, sc.accent || '#FFFFFF');
        jzSetExpr(jzGX(e).property('ADBE Vector Position'), W + '[wx,wy]');
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), X + 'P<1?cl(xgAL)*(1-xgsm(0.7,0.98,P))*75:0');
} });

/* ---- xgStampLift — 判子の跳ね: the line is pressed down hard like a rubber stamp; the die (an outline) lifts off again and leaves the print */
jzReg('enter', 'xgStampLift', { apply: function (m) {
    var L = m.L, B = axg_box(m), sz = B.size, dir = axg_dir(m, 35), hot = axg_hot(m), a0 = 1, D = null;
    try { a0 = jzXf(L, 'ADBE Opacity').value / 100; } catch (e0) {}
    if (a0 >= 0.3 && axg_canTwin(m, B)) D = jzNoGhost(axg_twin(m, B, 'JZ In Die', false, false));       // the die is drawn on the main pass only
    axg_apply(m, B, 'if(P<0.3){var t1=ic(P/0.3),kk=xglp(1.45,0.93,t1);xgro(' + jzN(-dir * 7) + '*(1-t1),' + axg_c(B) + ');xgsc(kk,kk,' + axg_c(B) + ');xgfd(P/0.3*2.5);}' +
        'else{var k2=xglp(0.93,1,oc((P-0.3)/0.35));xgsc(k2,k2,' + axg_c(B) + ');}');
    if (!D) return;
    jzTextDoc(D, function (d) {
        d.applyFill = false; d.applyStroke = true; d.strokeColor = jzHex(hot); d.strokeWidth = Math.max(1.5 * m.u, sz * 0.03);
        try { d.strokeOverFill = true; } catch (e1) {}
    });
    var H = m.HD + 'var lt=cl((P-0.3)/0.595),lo=oc(lt);';
    jzSetExpr(jzXf(D, 'ADBE Scale'), H + '[100+45*lo,100+45*lo]');
    jzSetExpr(jzXf(D, 'ADBE Rotate Z'), H + jzN(dir * 5) + '*lo');
    jzSetExpr(jzXf(D, 'ADBE Opacity'), H + 'P>=0.3&&lt<1?value*0.8*Math.pow(1-lt,1.4):0');
} });

/* ---- xgPaperFall — ひらり着地: the line sinks like a dropped sheet of paper, sliding from side to side and tilting with each swing */
jzReg('enter', 'xgPaperFall', { apply: function (m) {
    var B = axg_box(m), sz = B.size, dir = axg_dir(m, 37);
    axg_apply(m, B, 'var ph=P*Math.PI*3.5,dd=Math.pow(1-P,1.2);xgro(' + jzN(-dir * 12) + '*Math.cos(ph)*dd*xgsm(0,0.15,1-P),' + axg_c(B) + ');' +
        'xgsc(1,1-0.3*Math.abs(Math.sin(ph))*dd,' + axg_c(B) + ');xgX+=' + jzN(dir * sz * 0.9) + '*Math.sin(ph)*dd;xgY-=' + jzN(sz * 2.3) + '*(1-Math.sin(P*Math.PI/2));xgfd(P*4);');
} });

/* ---- xgRatchet — ラチェット: the line is cranked in click by click: four short jerks, each one stops dead with a tiny kick */
jzReg('enter', 'xgRatchet', { apply: function (m) {
    var B = axg_box(m), vert = B.vert, sz = B.size, dir = axg_dir(m, 39);
    var D = Math.min((vert ? m.H : m.W) * 0.4, sz * 2.6) * (0.7 + 0.5 * m.ctx.fx.motion);
    axg_apply(m, B, 'var x4=P*4,kk=Math.min(3,Math.floor(x4)),fr=x4-kk,e1=(kk+ob(fr/0.4,2.6))/4;' +
        'xgro(' + jzN(dir * 2.4) + '*Math.exp(-fr*7)*Math.sin(fr*18)*(1-fr),' + axg_c(B) + ');' + (vert ? 'xgY' : 'xgX') + '-=' + jzN(dir * D) + '*(1-e1);xgfd(P*10);');
} });

/* ---- xgZipLine — 滑車: the line rides down a slanted wire on a pulley, is stopped short and swings forward under it */
jzReg('enter', 'xgZipLine', { apply: function (m) {
    var B = axg_box(m), sz = B.size, dir = axg_dir(m, 41), slope = 0.42, hang = sz * 0.7, sc = m.ctx.sc;
    var D = Math.max(sz * 3, m.W * 0.42), prim = axg_main(m, B) && !axg_crowded(m, B), amp = jzClamp(sz * 40 / Math.max(1, B.w), 4, 13);
    var X = axg_apply(m, B, 'var e1=Math.pow(cl(P/0.55),1.6),t1=(P-0.55)/0.45,ang=' + jzN(dir * amp) + '*(P<0.55?xgsm(0,0.4,P/0.55):Math.cos(Math.PI*2.4*t1)*Math.pow(1-t1,1.4));' +
        'xgro(ang,' + jzN(B.cx) + ',' + jzN(B.y0 - hang) + ');xgX-=' + jzN(dir * D) + '*(1-e1);xgY-=' + jzN(slope * D) + '*(1-e1);xgfd(P*6);');
    if (!prim) return;
    // the wire (fixed), the pulley riding on it and the hanger down to the line
    var S = axg_world(m, 'JZ In Zip Line'), lw = Math.max(1.5 * m.u, sz * 0.02), far = Math.max(m.W, m.H) * 1.5, P0 = axg_rest(B, B.cx, B.y0 - hang);
    var sub = axg_pick(sc.sub, sc.fg), W = X + axg_wpt(B, B.cx, B.y0 - hang);
    var gw = jzGrp(S, 'wire');
    jzAddPath(gw, [[P0[0] - dir * far, P0[1] - slope * far], [P0[0] + dir * sz * 0.5, P0[1] + slope * sz * 0.5]], false);
    jzAddStroke(gw, sub, lw);
    var gh = axg_bar(S, 'hanger', lw, sub), gx = jzGX(gh);
    gx.property('ADBE Vector Scale').setValue([hang, 100]);
    jzSetExpr(gx.property('ADBE Vector Position'), W + '[wx,wy]');
    jzSetExpr(gx.property('ADBE Vector Rotation'), X + 'xgR+xgA+90');
    var gp = jzGrp(S, 'pulley');
    jzAddEllipse(gp, lw * 4.8, lw * 4.8); jzAddFill(gp, sc.accent || '#FFFFFF');
    jzSetExpr(jzGX(gp).property('ADBE Vector Position'), W + '[wx,wy]');
    jzSetExpr(jzXf(S, 'ADBE Opacity'), X + 'P<1?cl(xgAL)*(1-xgsm(0.72,0.98,P))*80:0');
} });

/* =====================================================================
   C. OPTICAL ARRIVALS
   ===================================================================== */

/* ---- xgFocusHunt — ピント迷い: autofocus hunting: the blurred line snaps sharp, slips out of focus once more and locks */
jzReg('enter', 'xgFocusHunt', { apply: function (m) {
    var B = axg_box(m), sz = B.size;
    var X = axg_apply(m, B, 'var fo=P<0.45?1-xgio(P/0.45):(P<0.85?0.42*Math.sin(Math.PI*(P-0.45)/0.4):0),kk=1+0.08*fo;xgsc(kk,kk,' + axg_c(B) + ');xgfd(Math.pow(cl(P*3),0.7)*(1-0.35*fo));');
    var gb = jzEffect(m.L, 'ADBE Gaussian Blur 2', 'JZ In Defocus');
    jzEP(gb, 3, 0);
    jzEX(gb, 1, X + 'P<1?' + jzN(Math.min(24 * m.u, sz * 0.12) * 2 / Math.abs(B.sy)) + '*fo:0');
} });

/* ---- xgStrobe — ストロボ: three flash exposures: the line is caught large and off to the side, closer, then on its mark, where it stays lit */
jzReg('enter', 'xgStrobe', { apply: function (m) {
    var B = axg_box(m), sz = B.size, dir = axg_dir(m, 45), hot = axg_hot(m);
    var X = axg_apply(m, B, 'var x3=P*3,kk=Math.min(2,Math.floor(x3)),fr=x3-kk,ps=[[1.3,0.34,-0.2],[1.13,-0.16,0.09],[1,0,0]][kk];' +
        'xgsc(ps[0],ps[0],' + axg_c(B) + ');xgX+=' + jzN(dir * sz) + '*ps[1];xgY+=' + jzN(sz) + '*ps[2];if(kk<2)xgfd(0.9*Math.exp(-fr*3.2)*cl(P*25));');
    axg_ink(m.L, 'JZ In Flash', hot, X + 'P<1?(kk<2?50:90*Math.exp(-fr*5)*(1-fr)):0');
} });

/* ---- xgDoubleVision — 二重視: double vision: two half-strength copies of the line drift across each other and fuse into one sharp line */
jzReg('enter', 'xgDoubleVision', { apply: function (m) {
    var B = axg_box(m), sz = B.size, vert = B.vert, D = axg_canTwin(m, B) ? axg_twin(m, B, 'JZ In Double', true, true) : null;
    var dv = 'var dv=' + jzN(sz * 0.8) + '*Math.pow(1-P,1.5)*Math.cos(2.5*Math.PI*P);';
    axg_apply(m, B, dv + (vert ? 'xgY+=dv;' : 'xgX+=dv;') + 'xgfd(cl(P*4)*xglp(0.55,1,xgsm(0.6,1,P)));');
    if (!D) return;
    // the second image mirrors the drift on the other side of the resting place
    jzSetExpr(jzXf(D, 'ADBE Position'), m.HD + dv + 'var o2=P<1?-2*dv:0;' + (vert ? axg_twinPos(B, '0', 'o2') : axg_twinPos(B, 'o2', '0')));
    jzSetExpr(jzXf(D, 'ADBE Opacity'), m.HD + AXG_FNS + 'P<1?value*0.55*(1-xgsm(0.7,1,P))*cl(P*4):0');
} });

/* ---- xgComet — 尾引き着地: the line drops in ahead of a long trail of afterimages, which then catches up with it
   (the drop = a Position animator on all glyphs, so an Echo effect can leave the afterimages of where the line just was) */
jzReg('enter', 'xgComet', { apply: function (m) {
    var L = m.L, B = axg_box(m), sz = B.size, vert = B.vert, dir = vert ? axg_dir(m, 49) : -1, t = axg_T(m);
    var D = sz * 3 * (0.7 + 0.5 * m.ctx.fx.motion);
    var q = B.rot * Math.PI / 180, cs = Math.cos(q), sn = Math.sin(q);      // the screen-space drop in the layer's own frame
    jzAnimator(L, 'JZ In Drop', [['ADBE Text Position 3D', vert ? [dir * D * cs / B.sx, -dir * D * sn / B.sy, 0] : [dir * D * sn / B.sx, dir * D * cs / B.sy, 0]]], m.HD + 'var v=P<1?(1-oe(P/0.35))*100:0;[v,v,0]');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], m.HD + 'P<1?(1-cl(P*8))*100:0');
    var ec = jzEffect(L, 'ADBE Echo', 'JZ In Trail');
    jzEP(ec, 1, -t.IN * 0.6 / 8); jzEP(ec, 2, 8); jzEP(ec, 3, 1); jzEP(ec, 4, 0.66); jzEP(ec, 5, 5);
    jzEX(ec, 2, m.HD + 'P<1?8:0');
    jzEX(ec, 4, m.HD + 'P<1?0.66:0');
} });

/* ---- xgFillDock — 塗り合わせ: a hairline outline of the line waits in place; the solid fill slides in off-register and docks into it */
jzReg('enter', 'xgFillDock', { apply: function (m) {
    var L = m.L, B = axg_box(m), sz = B.size, dir = axg_dir(m, 51), col = jzTextColor(L);
    var D = B.filled && axg_canTwin(m, B) ? axg_twin(m, B, 'JZ In Outline', true, false) : null;
    var kq = 'var q1=cl((P-0.22)/0.78),kk=P<1?1-ob(q1,1.6):0;';
    axg_apply(m, B, kq + 'xgX+=' + jzN(dir * sz * 0.5) + '*kk;xgY+=' + jzN(sz * 0.32) + '*kk;xgfd(' + (B.filled ? 'cl(q1*5)*xglp(0.8,1,q1)' : 'q1*4') + ');');
    if (!D) return;
    // the waiting outline stays on the resting place while the fill (the lyric layer) travels
    jzTextDoc(D, function (d) {
        d.applyFill = false; d.applyStroke = true; d.strokeColor = jzHex(col); d.strokeWidth = Math.max(1.2 * m.u, sz * 0.022);
        try { d.strokeOverFill = true; } catch (e1) {}
    });
    jzSetExpr(jzXf(D, 'ADBE Position'), m.HD + kq + axg_twinPos(B, '-(' + jzN(dir * sz * 0.5) + ')*kk', '-(' + jzN(sz * 0.32) + ')*kk'));
    jzSetExpr(jzXf(D, 'ADBE Opacity'), m.HD + AXG_FNS + 'P<1?value*cl(P*7)*(1-xgsm(0.8,1,P)):0');
} });

/* ---- xgColorPour — 色替わり: the line pops up in the accent colour, then its own colour pours down through the glyphs behind a thin band
   (two linked copies over the lyric — the accent-coloured one and the band — each seen through a track matte that the pour pushes away) */
jzReg('enter', 'xgColorPour', { apply: function (m) {
    var L = m.L, B = axg_box(m), sc = m.ctx.sc, up = axg_h(m.c.seed | 0, 53) & 1, alt = axg_hot(m), r = B.r, fs = B.size, j;
    var band = String(alt).toUpperCase() === String(sc.accent || '').toUpperCase() ? axg_pick(sc.accent2, sc.fg) : axg_pick(sc.accent, sc.fg);
    var kp = 'var kp=xgio((P-0.22)/0.72)*1.12,k1=cl(kp),k0=cl(kp-0.12);';
    var twins = B.filled && axg_main(m, B) && axg_canTwin(m, B) && r.height > 1, Ds = [];
    if (twins) { Ds.push(axg_twin(m, B, 'JZ In Pour', false, true)); }
    axg_apply(m, B, 'var kk=xglp(0.8,1,ob(P/0.3,2));xgsc(kk,kk,' + axg_c(B) + ');xgfd(P*8);');
    if (!twins) {       // outline / faded copies and crowded comps: the whole item changes colour
        axg_ink(L, 'JZ In Pour', alt, m.HD + AXG_FNS + kp + 'P<1?(1-cl(kp))*100:0');
        return;
    }
    var H = m.HD + AXG_FNS + kp, top = r.top, hh = r.height, cx = r.left + r.width / 2, ww = r.width + fs * 2;
    for (j = 0; j < 2; j++) {
        var D = j ? axg_twin(m, B, 'JZ In Pour Band', false, true) : Ds[0];
        axg_ink(D, 'JZ Pour Ink', j ? band : alt, '100');
        jzSetExpr(jzXf(D, 'ADBE Opacity'), m.HD + 'P<1?value:0');
        // the matte: [k1 .. 1] of the box height for the old colour, [k0 .. k1] for the band (measured from the far end when it pours upwards)
        var a = j ? 'k0' : 'k1', b = j ? 'k1' : '1', ys;
        if (up) ys = 'var ya=' + jzN(top) + '+(1-' + b + ')*' + jzN(hh) + (j ? '' : '-' + jzN(fs)) + ',yb=' + jzN(top) + '+(1-' + a + ')*' + jzN(hh) + ';';
        else ys = 'var ya=' + jzN(top) + '+' + a + '*' + jzN(hh) + ',yb=' + jzN(top) + '+' + b + '*' + jzN(hh) + (j ? '' : '+' + jzN(fs)) + ';';
        var M = m.ctx.comp.layers.addShape();
        M.name = j ? 'JZ In Pour Band Matte' : 'JZ In Pour Matte';
        M.parent = L; axg_zero(M); axg_live(m, M);
        var g = jzGrp(M, 'pour'), rc = jzAddRect(g, 10, 10, 0);
        jzSetExpr(rc.property('ADBE Vector Rect Size'), H + ys + '[' + jzN(ww) + ',Math.max(0,yb-ya)]');
        jzSetExpr(rc.property('ADBE Vector Rect Position'), H + ys + '[' + jzN(cx) + ',(ya+yb)/2]');
        jzAddFill(g, '#FFFFFF');
        try { D.moveBefore(L); M.moveBefore(D); D.trackMatteType = TrackMatteType.ALPHA; } catch (e1) { jzWarn('xgColorPour matte: ' + e1.toString()); }
    }
} });

/* ---- xgBlockSink — 厚み沈み: the line arrives as a long extruded block; the depth sinks back into the page until only the face is left
   (the block = five stacked hard shadows with doubling offsets: 31 copies along the depth) */
jzReg('enter', 'xgBlockSink', { apply: function (m) {
    var L = m.L, B = axg_box(m), sz = B.size, dir = axg_dir(m, 55), sc = m.ctx.sc, j;
    var col = jzMixHex(axg_hot(m), axg_pick(sc.bg), 0.3), ang = (Math.atan2(dir * 0.72, -0.7) * 180 / Math.PI + 360) % 360;
    var X = axg_apply(m, B, 'xgfd(P*6);') + 'var el=P<1?' + jzN(sz * 1.3) + '*(1-xgo4(P))*cl(P*5+0.25):0;';
    for (j = 0; j < 5; j++) {
        var ds = jzEffect(L, 'ADBE Drop Shadow', 'JZ In Depth ' + (j + 1));
        jzEP(ds, 1, jzHex(col)); jzEP(ds, 3, ang); jzEP(ds, 5, 0);
        jzEX(ds, 2, X + 'el>=0.5?255*cl(el/' + jzN(sz * 0.18) + '):0');
        jzEX(ds, 4, X + 'el*' + jzN(1.0042 * Math.pow(2, j) / 31 / Math.abs(B.sy)));
    }
} });

/* ---- xgLensFringe — 色収差: lens fringing: two coloured copies sit larger around the line and shrink onto it as the lens settles */
jzReg('enter', 'xgLensFringe', { apply: function (m) {
    var L = m.L, B = axg_box(m), sc = m.ctx.sc, cols = [axg_pick(sc.ghostA, sc.accent), axg_pick(sc.ghostB, sc.accent2, sc.sub)], Ds = [], j;
    if (axg_canTwin(m, B)) for (j = 0; j < 2; j++) Ds.push(jzNoGhost(axg_twin(m, B, 'JZ In Fringe ' + (j + 1), true, true)));     // main pass only
    axg_apply(m, B, 'var kk=1+0.05*Math.pow(1-P,2);xgsc(kk,kk,' + axg_c(B) + ');xgfd(P*3);');
    for (j = 0; j < Ds.length; j++) {
        var H = m.HD + 'var k2=Math.pow(1-P,2),ks=100+' + (j ? 16 : 32) + '*k2;';
        axg_ink(Ds[j], 'JZ Fringe Ink', cols[j], '100');
        jzSetExpr(jzXf(Ds[j], 'ADBE Scale'), H + '[ks,ks]');
        jzSetExpr(jzXf(Ds[j], 'ADBE Opacity'), H + 'P<1?value*0.75*Math.min(1,k2*3)*cl(P*6):0');
    }
} });

/* ---- xgAfterimage — 残像焼き: one bright flash of the line, then only a faint after-image is left, which slowly burns in to full strength */
jzReg('enter', 'xgAfterimage', { apply: function (m) {
    var B = axg_box(m), hot = axg_hot(m);
    var X = axg_apply(m, B, 'if(P<0.1){xgsc(1.05,1.05,' + axg_c(B) + ');xgfd(P/0.03);}' +
        'else{var dr=xgsm(0.1,0.2,P),ri=xgis((P-0.28)/0.72),kk=1+0.05*(1-dr);xgsc(kk,kk,' + axg_c(B) + ');xgfd(xglp(xglp(1,0.14,dr),1,ri));}');
    axg_ink(m.L, 'JZ In Flash', hot, X + 'P<1?85*(1-xgsm(0.1,0.2,P)):0');
} });

/* =====================================================================
   D. HELD POSES
   ===================================================================== */

/* ---- xgKeyPoses — キーポーズ: three held drawings and the rest pose: far and tilted, big and leaning the other way, almost there, home */
jzReg('enter', 'xgKeyPoses', { apply: function (m) {
    var B = axg_box(m), sz = B.size, dir = axg_dir(m, 61);
    var X = axg_apply(m, B, 'var KP=[[0.26,-1,0.45,-13,0.7],[0.52,0.34,-0.3,8,1.1],[0.74,-0.14,0.08,-3.5,0.95],[1,0,0,0,1]],ki=0;while(ki<3&&P>=KP[ki][0])ki++;' +
        'var t0=ki?KP[ki-1][0]:0,fr=(P-t0)/(KP[ki][0]-t0),kc=KP[ki],kq=kc[4]+(ki==3?0.06*(1-oc(fr/0.6)):0);' +
        'xgro(' + jzN(dir) + '*kc[3],' + axg_c(B) + ');xgsc(kq,kq,' + axg_c(B) + ');xgX+=' + jzN(dir * sz) + '*kc[1];xgY+=' + jzN(sz) + '*kc[2];xgfd(P*20);');
    // the smear towards the previous drawing at the start of every pose
    var sm = 'var on=P<1&&ki>0&&fr<0.22,jx=on?' + jzN(dir) + '*(KP[ki-1][1]-kc[1]):1,jy=on?KP[ki-1][2]-kc[2]:0;';
    axg_streak(m, B, X + sm, 'Math.atan2(jx,-jy)*180/Math.PI', 'on?' + jzN(sz * 0.45) + '*Math.sqrt(jx*jx+jy*jy):0');
} });

/* ---- xgRoughCut — ラフから清書: animator's pass: a shaky pencil outline on threes, a half-inked drawing, then the clean final line
   (pencil = the fill switched off + a thin stroke in a greyed colour; the browser's dashed first drawing is a plain line here) */
jzReg('enter', 'xgRoughCut', { apply: function (m) {
    var L = m.L, B = axg_box(m), sz = B.size, seed = m.c.seed | 0, sc = m.ctx.sc, col = jzTextColor(L), k;
    var w = [1, 0.85, 0.7, 0.4, 0.22], RT = [], SC = [], DX = [], DY = [], SK = [];
    for (k = 0; k < 5; k++) {
        RT.push(axg_rs(seed, k, 71) * 3 * w[k]); SC.push(1 + axg_rs(seed, k, 72) * 0.045 * w[k]);
        DX.push(axg_rs(seed, k, 73) * sz * 0.05 * w[k]); DY.push(axg_rs(seed, k, 74) * sz * 0.05 * w[k]); SK.push(axg_rs(seed, k, 75) * 5 * w[k]);
    }
    var X = axg_apply(m, B, 'var ki=Math.min(5,Math.floor(P*6));if(ki<5){var RT=' + axg_arr(RT) + ',SC=' + axg_arr(SC) + ',DX=' + axg_arr(DX) + ',DY=' + axg_arr(DY) +
        ',AL=' + (B.filled ? '[0.6,0.8,0.95,1,1]' : '[0.45,0.6,0.75,0.9,1]') + ';' +
        'xgro(RT[ki],' + axg_c(B) + ');xgsc(SC[ki],SC[ki],' + axg_c(B) + ');xgX+=DX[ki];xgY+=DY[ki];xgfd(P*14);xgfd(AL[ki]);}') + 'var on=P<1&&ki<5;';
    jzAnimator(L, 'JZ In Wobble', [['ADBE Text Skew', 5]], X + 'var SK=' + axg_arr(SK) + ';on?SK[ki]/5*100:0');
    if (!B.filled) return;
    var pencil = jzMixHex(col, axg_pick(sc.sub, sc.fg), 0.5), own = B.stroked;
    if (!own) jzTextDoc(L, function (d) {
        d.applyStroke = true; d.strokeWidth = 0;
        try { d.strokeColor = d.fillColor; } catch (e0) {}
        try { d.strokeOverFill = false; } catch (e1) {}
    });
    jzAnimator(L, 'JZ In Rough', [['ADBE Text Fill Opacity', 0]], X + 'on?(ki<3?100:(ki==3?55:20)):0');
    if (!own) jzAnimator(L, 'JZ In Pencil Line', [['ADBE Text Stroke Width', sz * 0.026]], X + 'on?(ki<3?(0.014+0.006*ki)/0.026:0.02/0.026)*100:0');
    jzAnimator(L, 'JZ In Pencil', [['ADBE Text Stroke Color', jzHex(pencil)]], X + 'on&&ki<3?100:0');
} });
