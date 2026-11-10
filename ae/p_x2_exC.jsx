// ================================================================ pack x2exC (AE port of src/11p_x2_exC.js) — 26 whole-item exits
// xjGateSwing xjQuarterTurn xjNeedle xjBigWheel xjWiper xjRatchet / xjYank xjTrapdoor xjEdgeTeeter xjPuckHit xjRubberSnap xjCardToss
// xjWallSplat xjSlump xjSpringHop xjTug / xjFocusPull xjDoubleVision xjColourDrain xjComet xjShellChase xjShadowStay xjThroughFocus
// xjPanSmear / xjStepFade xjOnionSkin
// The item leaves as ONE body: every part is a small "item simulation" written as expression code that mirrors the browser's
// apply() line by line (pivot about a point, uniform scale about a point, stretch keeping a box fraction fixed, offsets). The same
// code runs in the layer's Position / Scale / Rotation / Opacity expressions (through m.parts), in the skew / colour animators,
// in the blur effects and in the helper layers that follow the item, so they always agree.
//   p = PO / 0.88 (gone a little before the cut ends, like the browser); layers holding ONE glyph of a longer cut leave one after
//   another (win(p, order, 0.4)).
// Skew = Text Skew animator. Colour mixes = Fill Color animator. Blur = Gaussian Blur. Streak / echo trails = Directional Blur.
// Strings, ledges, floors, pins, pucks = shape layers in comp space (jzNoGhost, alive only during the exit).
// Extra images of the item (double vision, comet tail, shadow, onion skins, shell + body) = linked copies parented to the lyric
// layer whose transform expressions cancel the parent's motion and place them at their own pose.

// ---------------------------------------------------------------- shared helpers (axj_*)
// expression-side names all start with axj so they never collide with other packs' snippets in the merged transform expressions
var AXJ_FNS = 'function axjG(x,a,b){return cl((x-a)/(b-a));}' +
    'function axjIo(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}' +
    'function axjIs(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}' +
    'function axjSm(a,b,x){x=cl((x-a)/(b-a));return x*x*(3-2*x);}' +
    'function axjL(a,b,t){return a+(b-a)*t;}\n';
// the item state: x, y (position), r (degrees), sx, sy (factors on the resting scale), sk (skew, degrees), a (alpha factor),
// cm (colour mix 0..1), bl (blur px), st [dx, dy, alpha] (streak)
var AXJ_SIM = 'function axjN(){return {x:axjX[0],y:axjX[1],r:axjX[2],sx:1,sy:1,sk:0,a:1,cm:0,bl:0,st:[0,0,0]};}' +
    'function axjAt(S,u,v){var a=S.r*Math.PI/180,c=Math.cos(a),s=Math.sin(a),x=axjL(axjB[0],axjB[2],u)*S.sx,y=axjL(axjB[1],axjB[3],v)*S.sy;return [S.x+x*c-y*s,S.y+x*s+y*c];}' +
    'function axjPv(S,px,py,deg){if(!deg)return;var a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a),x=S.x-px,y=S.y-py;S.x=px+x*c-y*s;S.y=py+x*s+y*c;S.r+=deg;}' +
    'function axjSc(S,px,py,k){k=Math.max(0,k);S.sx*=k;S.sy*=k;S.x=px+(S.x-px)*k;S.y=py+(S.y-py)*k;}' +
    'function axjSt(S,u,v,kx,ky){var a=S.r*Math.PI/180,c=Math.cos(a),s=Math.sin(a),x=axjL(axjB[0],axjB[2],u)*S.sx*(1-kx),y=axjL(axjB[1],axjB[3],v)*S.sy*(1-ky);S.x+=x*c-y*s;S.y+=x*s+y*c;S.sx*=kx;S.sy*=ky;}' +
    'function axjSa(S,a,kA,kC){if(axjV)axjSt(S,0.5,a,kC,kA);else axjSt(S,a,0.5,kA,kC);}' +
    'function axjAx(S){var a=S.r*Math.PI/180;return axjV?[-Math.sin(a),Math.cos(a)]:[Math.cos(a),Math.sin(a)];}' +
    'function axjCr(S){var a=S.r*Math.PI/180;return axjV?[Math.cos(a),Math.sin(a)]:[Math.sin(a),-Math.cos(a)];}' +
    'function axjLen(S){return axjV?Math.abs(axjB[3]-axjB[1])*S.sy:Math.abs(axjB[2]-axjB[0])*S.sx;}\n';
// a child of the lyric layer placed at the world pose axjS (cancels the parent's own motion)
var AXJ_LOC = 'var axjT=parent.transform,axjs=axjT.scale,axjr=-axjT.rotation*Math.PI/180,axjp=axjT.position,axja=axjT.anchorPoint,axjkx=axjs[0]/100,axjky=axjs[1]/100;' +
    'if(Math.abs(axjkx)<0.001)axjkx=0.001;if(Math.abs(axjky)<0.001)axjky=0.001;';
var AXJ_ON = '(axjP>0&&axjP<0.998?1:0)';

function axj_arr(a) { var s = [], i; for (i = 0; i < a.length; i++) s.push(jzN(a[i])); return '[' + s.join(',') + ']'; }
function axj_isHex(c) { return typeof c === 'string' && c.charAt(0) === '#' && (c.length === 7 || c.length === 4); }
function axj_pick(a, b, c) { if (axj_isHex(a)) return a; if (axj_isHex(b)) return b; if (axj_isHex(c)) return c; return '#FFFFFF'; }
// the browser's J.h (seeded choices match the web version)
function axj_h(a, b, c, d, e) {
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
function axj_bit(m, k) { return (axj_h(m.c.seed | 0, k, 977) & 1) === 1; }            // browser cutBit(env, k)
function axj_T(m) { var c = m.c; return { IN: Math.max(0.02, c.inDur || 0.3), DL: (m.o.mi || 0) * (c.stagger || 0.04), OS: c.dur - (c.outDur || 0) }; }
function axj_matted(L) { try { return !!L.trackMatteType && L.trackMatteType !== TrackMatteType.NO_TRACK_MATTE; } catch (e) { return false; } }
function axj_top(m) { var L = m.L; if (axj_matted(L)) { try { return m.ctx.comp.layer(L.index - 1); } catch (e) {} } return L; }
function axj_live(m, Lx) { var t = axj_T(m); try { if (t.OS - 0.05 > Lx.inPoint) Lx.inPoint = t.OS - 0.05; } catch (e) {} }
// everything the parts need to know about the resting lyric layer (null: no exit time, nothing to do).
//   I.X static transform; I.r source rect; I.fs font size (layer units); I.s0 mean scale; I.sz = the browser's it.size in comp px;
//   I.B the item's box relative to its position, in comp px before rotation; I.vert one glyph per line (vertical writing);
//   I.A layer opacity 0..1; I.c0 text colour; I.acc the browser's hot(); I.bg; I.lw(k, min) line width; I.solo / I.ord one-glyph layers
function axj_info(m) {
    if (!((m.c.outDur || 0) > 0.002)) return null;
    var L = m.L, tr = L.property('ADBE Transform Group'), td = null, t = axj_T(m), i, r = null, sc = m.ctx.sc;
    try { td = L.property('ADBE Text Properties').property('ADBE Text Document').value; } catch (e0) {}
    try { r = L.sourceRectAtTime(Math.max(0, Math.min(t.OS - 0.01, t.DL + t.IN + 0.03)), false); } catch (e1) { r = null; }
    if (!r || !(r.width > 0) || !(r.height > 0)) r = jzRect(L);
    var I = { r: r, X: { a: tr.property('ADBE Anchor Point').value, p: tr.property('ADBE Position').value, s: tr.property('ADBE Scale').value, r: tr.property('ADBE Rotate Z').value } };
    var kx = I.X.s[0] / 100, ky = I.X.s[1] / 100;
    if (Math.abs(kx) < 0.001) kx = 1;
    if (Math.abs(ky) < 0.001) ky = 1;
    I.kx = kx; I.ky = ky; I.s0 = (Math.abs(kx) + Math.abs(ky)) / 2;
    I.fs = td && td.fontSize > 1 ? td.fontSize : (m.size || 100);
    I.sz = I.fs * I.s0;
    I.B = [(r.left - I.X.a[0]) * kx, (r.top - I.X.a[1]) * ky, (r.left + r.width - I.X.a[0]) * kx, (r.top + r.height - I.X.a[1]) * ky];
    var text = td ? String(td.text) : '', lines = text.split(/\r\n|\r|\n|\u0003/), n = 0, nk = 0;
    I.vert = lines.length > 1;
    for (i = 0; i < lines.length; i++) { var cs = jzChars(lines[i]); if (cs.length > 1) I.vert = false; n += cs.length; nk += jzCount(lines[i]); }
    I.n = n; I.nk = nk;
    var N = Math.max(1, jzCount(String(m.c.text || '')));
    I.cutN = N; I.solo = nk === 1 && N > 1; I.ord = N > 1 ? jzClamp((m.o.mi || 0) / (N - 1), 0, 1) : 0;
    I.A = 1; try { I.A = jzClamp(tr.property('ADBE Opacity').value / 100, 0, 1); } catch (e2) {}
    I.hollow = !!(td && td.applyFill === false);
    I.c0 = jzTextColor(L);
    if (I.hollow) { try { var k = td.strokeColor; I.c0 = jzToHex(k[0] * 255, k[1] * 255, k[2] * 255); } catch (e3) {} }
    I.bg = axj_pick(sc.bg, '#000000');
    I.acc = String(I.c0).toUpperCase() === String(sc.accent || '').toUpperCase() ? axj_pick(sc.accent2, sc.fg) : axj_pick(sc.accent, sc.fg);
    I.du = jzU(m.ctx) / 1080;                       // one design px
    I.main = !I.hollow && I.A >= 0.85;
    I.crowded = n > 60 || (I.solo && N > 8);
    try { if (m.ctx.comp.numLayers > 70) I.crowded = true; } catch (e4) {}
    I.gfx = I.main && !I.crowded;                   // helper graphics: on the lyric's main copy only
    I.copies = !I.crowded && !axj_matted(L);        // linked copies of the layer
    I.lib = AXJ_FNS + 'var axjB=' + axj_arr(I.B) + ',axjV=' + (I.vert ? 1 : 0) + ',axjX=' + axj_arr([I.X.p[0], I.X.p[1], I.X.r]) + ';' + AXJ_SIM +
        'var axj0=PO/0.88,axjP=' + (I.solo ? 'axj0>=0.998?1:cl((axj0-' + jzN(I.ord * 0.4) + ')/0.6)' : 'axj0') + ';\n';
    return I;
}
function axj_lw(I, k, mn) { return Math.max(mn * I.du, I.sz * k); }
// resting geometry (comp px): point at the box fraction (u, v) / the rotated box's AABB — the browser's at() and dBox(it, 0)
function axj_at(I, u, v) {
    var a = I.X.r * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), x = jzLerp(I.B[0], I.B[2], u), y = jzLerp(I.B[1], I.B[3], v);
    return [I.X.p[0] + x * c - y * s, I.X.p[1] + x * s + y * c];
}
function axj_dbox(I) {
    var q = [axj_at(I, 0, 0), axj_at(I, 1, 0), axj_at(I, 0, 1), axj_at(I, 1, 1)], x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, i;
    for (i = 0; i < 4; i++) { x0 = Math.min(x0, q[i][0]); x1 = Math.max(x1, q[i][0]); y0 = Math.min(y0, q[i][1]); y1 = Math.max(y1, q[i][1]); }
    return { x0: x0, y0: y0, x1: x1, y1: y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
// expression source: library + this part's simulation  axjRun(p, k1, k2) -> state (p <= 0: exactly the resting item)
function axj_code(I, body) { return I.lib + 'function axjRun(p,k1,k2){var S=axjN();if(p<=0)return S;' + body + 'return S;}\n'; }
// the lyric layer follows the simulation. f: { args: extra arguments of axjRun for the layer itself, sk: max skew (deg),
// col: colour the item is mixed towards (S.cm), blur: true (S.bl), st: { n, F } streak -> directional blur, hide: true (L is
// replaced by copies while the exit runs) }.  Returns the expression prefix that defines axjS for this layer.
function axj_emit(m, I, body, f) {
    f = f || {};
    var L = m.L, C = axj_code(I, body) + 'var axjS=axjRun(axjP' + (f.args || '') + ');', H = m.HD + C;
    m.parts.pos.push(C + 'd=[d[0]+axjS.x-' + jzN(I.X.p[0]) + ',d[1]+axjS.y-' + jzN(I.X.p[1]) + '];');
    m.parts.sc.push(C + 'f=[f[0]*axjS.sx,f[1]*axjS.sy];');
    m.parts.rot.push(C + 'r+=axjS.r-' + jzN(I.X.r) + ';');
    m.parts.op.push(C + 'f*=axjP>=0.998' + (f.hide ? '||axjP>0' : '') + '?0:Math.max(0,Math.min(1,axjS.a));');
    if (f.sk) jzAnimator(L, 'JZ Out Lean', [['ADBE Text Skew', f.sk]], H + 'Math.max(-100,Math.min(100,axjS.sk/' + jzN(f.sk) + '*100))');
    if (f.col) jzAnimator(L, 'JZ Out Colour', [['ADBE Text Fill Color', jzHex(f.col)]], H + 'Math.max(0,Math.min(1,axjS.cm))*100');
    if (f.blur) { var gb = jzEffect(L, 'ADBE Gaussian Blur 2', 'JZ Out Soft'); jzEX(gb, 1, H + 'axjP>0?axjS.bl*2:0'); }
    if (f.st) {
        var db = jzEffect(L, 'ADBE Motion Blur', 'JZ Out Streak');
        jzEX(db, 1, H + 'Math.atan2(axjS.st[0],-axjS.st[1])*180/Math.PI');
        jzEX(db, 2, H + 'axjS.st[2]>0.01?Math.sqrt(axjS.st[0]*axjS.st[0]+axjS.st[1]*axjS.st[1])*' + jzN(f.st.n * f.st.F) + ':0');
    }
    return H;
}
// comp-space shape layer for the graphics the browser draws next to the item (ghost off), right above the lyric
function axj_gfx(m, name) {
    var S = m.ctx.comp.layers.addShape(), tr = S.property('ADBE Transform Group');
    try { S.name = name; } catch (e0) {}
    try { S.moveBefore(axj_top(m)); } catch (e1) {}
    tr.property('ADBE Anchor Point').setValue([0, 0]); tr.property('ADBE Position').setValue([0, 0]);
    axj_live(m, S); jzNoGhost(S);
    return S;
}
// one straight line from axjA to axjE (both defined by the expression prefix `pre`); op = opacity 0..1 expression
function axj_seg(S, name, pre, col, lw, op) {
    var g = jzGrp(S, name);
    jzAddPath(g, [[0, 0], [100, 0]], false);
    jzAddStroke(g, col, lw);
    var x = jzGX(g);
    jzSetExpr(x.property('ADBE Vector Position'), pre + '[axjA[0],axjA[1]]');
    jzSetExpr(x.property('ADBE Vector Rotation'), pre + 'Math.atan2(axjE[1]-axjA[1],axjE[0]-axjA[0])*180/Math.PI');
    jzSetExpr(x.property('ADBE Vector Scale'), pre + 'var axjdx=axjE[0]-axjA[0],axjdy=axjE[1]-axjA[1];[Math.sqrt(axjdx*axjdx+axjdy*axjdy),100]');
    jzSetExpr(x.property('ADBE Vector Group Opacity'), pre + '100*' + AXJ_ON + '*Math.max(0,Math.min(1,' + op + '))');
}
// a disc (fill) or a ring (stroke lw) of radius `rad` (expression) at `pos` (expression of a point)
function axj_dot(S, name, pre, pos, rad, fill, stroke, lw, op) {
    var g = jzGrp(S, name), el = jzAddEllipse(g, 10, 10);
    jzSetExpr(el.property('ADBE Vector Ellipse Size'), pre + 'var axjd=Math.max(0,' + rad + ')*2;[axjd,axjd]');
    if (stroke) jzAddStroke(g, stroke, lw);
    if (fill) jzAddFill(g, fill);
    var x = jzGX(g);
    jzSetExpr(x.property('ADBE Vector Position'), pre + 'var axjq=' + pos + ';[axjq[0],axjq[1]]');
    jzSetExpr(x.property('ADBE Vector Group Opacity'), pre + '100*' + AXJ_ON + '*Math.max(0,Math.min(1,' + op + '))');
}
// a filled rectangle: size / centre are expressions of [w, h] / [x, y]
function axj_box(S, name, pre, size, pos, fill, op) {
    var g = jzGrp(S, name), rc = jzAddRect(g, 10, 10, 0);
    jzSetExpr(rc.property('ADBE Vector Rect Size'), pre + 'var axjq=' + size + ';[Math.max(0,axjq[0]),Math.max(0,axjq[1])]');
    jzAddFill(g, fill);
    var x = jzGX(g);
    jzSetExpr(x.property('ADBE Vector Position'), pre + 'var axjq=' + pos + ';[axjq[0],axjq[1]]');
    jzSetExpr(x.property('ADBE Vector Group Opacity'), pre + '100*' + AXJ_ON + '*Math.max(0,Math.min(1,' + op + '))');
}
// linked copy of the lyric: parented to L (identity until axj_pose gives it its own pose), alive only during the exit.
// link: take L's final text style by expression (the treatment is applied later); after: the layer it goes below (else above L)
function axj_twin(m, tag, link, after) {
    var L = m.L, D = L.duplicate(), i, mns = ['ADBE Position', 'ADBE Scale', 'ADBE Rotate Z', 'ADBE Opacity', 'ADBE Anchor Point'];
    try { D.name = String(L.name).substr(0, 20) + ' ' + tag; } catch (e0) {}
    var tr = D.property('ADBE Transform Group');
    for (i = 0; i < mns.length; i++) { try { if (tr.property(mns[i]).expression) tr.property(mns[i]).expression = ''; } catch (e1) {} }
    D.parent = L;
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    jzSetExpr(tr.property('ADBE Position'), 'parent.transform.anchorPoint');
    if (link) { try { D.property('ADBE Text Properties').property('ADBE Text Document').expression = 'parent.text.sourceText.style'; } catch (e2) {} }
    axj_live(m, D);
    try { if (after) D.moveAfter(after); else D.moveBefore(axj_top(m)); } catch (e3) {}
    return D;
}
// place a twin at the world pose axjS defined by `pre` (position, rotation, scale), opacity = L's own × fac (0..1 expression)
function axj_pose(I, D, pre, fac) {
    var tr = D.property('ADBE Transform Group');
    jzSetExpr(tr.property('ADBE Position'), pre + AXJ_LOC + 'var axju=axjS.x-axjp[0],axjv=axjS.y-axjp[1],axjc=Math.cos(axjr),axjn=Math.sin(axjr);' +
        '[axja[0]+(axjc*axju-axjn*axjv)/axjkx,axja[1]+(axjn*axju+axjc*axjv)/axjky]');
    jzSetExpr(tr.property('ADBE Rotate Z'), pre + 'axjS.r-parent.transform.rotation');
    jzSetExpr(tr.property('ADBE Scale'), pre + AXJ_LOC + '[axjS.sx*' + jzN(I.kx * 100) + '/axjkx,axjS.sy*' + jzN(I.ky * 100) + '/axjky]');
    axj_fade(D, pre, fac);
}
function axj_fade(D, pre, fac) { jzSetExpr(jzXf(D, 'ADBE Opacity'), pre + 'value*' + AXJ_ON + '*Math.max(0,Math.min(1,' + fac + '))'); }
function axj_tint(D, hex, name) { jzAnimator(D, name || 'JZ Out Tint', [['ADBE Text Fill Color', jzHex(hex)], ['ADBE Text Stroke Color', jzHex(hex)]], '100'); }
// the copy becomes an outline of the glyphs (stroke width in comp px)
function axj_outline(I, D, hex, lw) {
    jzTextDoc(D, function (d) {
        var w = lw / I.s0;
        try { if (d.applyStroke && d.strokeWidth > w) w = d.strokeWidth; } catch (e) {}
        d.applyFill = false; d.applyStroke = true; d.strokeColor = jzHex(hex); d.strokeWidth = Math.max(0.5, w);
    });
}
function axj_offX(m, bb, dir, pad) { return (dir > 0 ? m.W - bb.x0 : bb.x1) + pad; }

/* =====================================================================
   A. TRANSFORMS
   ===================================================================== */

/* ---- xjGateSwing — 開き戸: the whole line is a door hinged on one end: it opens a hair the wrong way, then swings round edge-on
   (squeezed along the line, a little taller, shaded towards the background) and is gone; an accent hinge line stands at that end */
jzReg('exit', 'xjGateSwing', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    var end = axj_bit(m, 1) ? 1 : 0;
    var H = axj_emit(m, I, 'var q=axjG(p,0.1,1),th=axjIs(q)*Math.PI/2,s=Math.sin(th),k=Math.cos(th)+0.05*Math.sin(Math.PI*axjG(p,0,0.3))*(1-q);' +
        'if(k<0.012)S.a=0;else{axjSa(S,' + end + ',k,1+0.14*s);S.cm=s*0.5;S.a=1-axjSm(0.86,1,q);}', { col: I.bg });
    if (!I.gfx) return;
    var h0 = I.vert ? axj_at(I, -0.12, end) : axj_at(I, end, -0.12), h1 = I.vert ? axj_at(I, 1.12, end) : axj_at(I, end, 1.12);
    axj_seg(axj_gfx(m, 'JZ Out Hinge'), 'hinge', H + 'var axjA=' + axj_arr(h0) + ',axjE=' + axj_arr(h1) + ';', I.acc, axj_lw(I, 0.03, 2),
        jzN(I.A) + '*Math.sqrt(Math.sin(Math.PI*cl(axjP)))');
} });

/* ---- xjQuarterTurn — 直角に抜ける: the line turns a quarter turn on its centre (with a small overshoot, shrinking if it would not fit),
   then shoots out along its own length, stretched, with a speed streak */
jzReg('exit', 'xjQuarterTurn', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    var dir = axj_bit(m, 2) ? 1 : -1, go = axj_bit(m, 3) ? 1 : -1, sz = I.sz, room = (I.vert ? m.W : m.H) * 0.8;
    axj_emit(m, I, 'var c=axjAt(S,0.5,0.5),L0=axjLen(S);axjPv(S,c[0],c[1],' + jzN(dir * 90) + '*ob(axjG(p,0,0.5),1.3));' +
        'if(L0>' + jzN(room) + ')axjSc(S,c[0],c[1],axjL(1,' + jzN(room) + '/L0,axjIo(axjG(p,0,0.45))));' +
        'var u=ic(axjG(p,0.42,1)),ax=axjAx(S),dist=(' + jzN(Math.max(m.W, m.H) + sz) + '+axjLen(S)*0.5)*u*' + go + ';S.x+=ax[0]*dist;S.y+=ax[1]*dist;' +
        'if(u>0.004){var w=Math.min(1,u*5);axjSa(S,0.5,1+0.35*w,1-0.1*w);S.st=[ax[0]*' + jzN(sz * 0.5) + '*w,ax[1]*' + jzN(sz * 0.5) + '*w,0.32*w];}',
        { st: { n: 3, F: 0.8 } });
} });

/* ---- xjNeedle — 針になって飛ぶ: the line is pressed together into one thin needle across the writing direction (turning the accent
   colour); the needle fires off across the line with a streak */
jzReg('exit', 'xjNeedle', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    var sz = I.sz, go = axj_bit(m, 4) ? 1 : -1, cross = I.vert ? Math.abs(I.B[2] - I.B[0]) : Math.abs(I.B[3] - I.B[1]);
    var dist = (I.vert ? m.W : m.H) + cross * 4;
    axj_emit(m, I, 'var q1=axjIo(axjG(p,0,0.44)),u=ic(axjG(p,0.46,1)),cr=axjCr(S);axjSa(S,0.5,axjL(1,0.022,q1),axjL(1,1.55,q1)+1.5*u);S.cm=q1*0.85;' +
        'S.x+=cr[0]*' + jzN(dist * go) + '*u;S.y+=cr[1]*' + jzN(dist * go) + '*u;' +
        'if(u>0.004){var w=Math.min(1,u*6);S.st=[cr[0]*' + jzN(sz * 0.6) + '*w,cr[1]*' + jzN(sz * 0.6) + '*w,0.4*w];}',
        { col: I.acc, st: { n: 4, F: 0.8 } });
} });

/* ---- xjBigWheel — 大きな弧で去る: the line rides the rim of a big unseen wheel (centre far above or below it): it rolls back a little,
   then swings away along the arc */
jzReg('exit', 'xjBigWheel', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    var sz = I.sz, bb = axj_dbox(I), side = axj_bit(m, 5) ? 1 : -1, dir = axj_bit(m, 6) ? 1 : -1;
    var R = Math.max(m.H * 0.75, bb.w * 0.65), px = bb.cx, py = bb.cy + side * R;
    var travel = m.W / 2 + Math.abs(bb.cx - m.W / 2) + bb.w / 2 + sz;
    var ang = travel < R * 0.9 ? Math.asin(travel / R) * 180 / Math.PI + 14 : 150;
    axj_emit(m, I, 'var back=-5*oc(axjG(p,0,0.2))*(1-axjIo(axjG(p,0.2,0.42)));' +
        'axjPv(S,' + jzN(px) + ',' + jzN(py) + ',' + jzN(dir * side) + '*(back+' + jzN(ang) + '*ic(axjG(p,0.2,1))));S.a=1-axjSm(0.9,1,p);');
} });

/* ---- xjWiper — 角を軸に払う: pinned at a bottom corner, the line sweeps up like a wiper blade and shrinks into its pin; the pin
   (an accent dot) pops in first and closes last */
jzReg('exit', 'xjWiper', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    var c = axj_bit(m, 7) ? 0 : 1, pv = axj_at(I, c, 1), P = jzN(pv[0]) + ',' + jzN(pv[1]);
    var H = axj_emit(m, I, 'axjPv(S,' + P + ',' + jzN((c ? 1 : -1) * 112) + '*axjIo(axjG(p,0.06,0.88)));axjSc(S,' + P + ',1-0.95*iq(axjG(p,0.1,0.9)));if(p>0.9)S.a=0;');
    if (!I.gfx) return;
    axj_dot(axj_gfx(m, 'JZ Out Pin'), 'pin', H + 'var axjpr=' + jzN(I.sz * 0.085) + '*ob(axjG(axjP,0,0.12),2)*(1-ic(axjG(axjP,0.86,1)));',
        '[' + P + ']', 'axjpr', I.acc, null, 0, 'axjpr>' + jzN(0.3 * I.du) + '?' + jzN(I.A) + ':0');
} });

/* ---- xjRatchet — 歯車送り: the line is turned in five clicks, like a ratchet: every click a sharp 30° and a size smaller, the last
   click closes it */
jzReg('exit', 'xjRatchet', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    var dir = axj_bit(m, 8) ? 1 : -1;
    axj_emit(m, I, 'var c=axjAt(S,0.5,0.5),r=0,s=0,i,x;for(i=0;i<5;i++){x=axjG(p*5-i,0.05,0.5);r+=ob(x,2.2);s+=axjIo(x);}' +
        'axjPv(S,c[0],c[1],' + jzN(dir * 30) + '*r);var k=1-s/5;if(k<0.02)S.a=0;else axjSc(S,c[0],c[1],k);');
} });

/* =====================================================================
   B. PHYSICAL
   ===================================================================== */

/* ---- xjYank — 糸で引き抜く: a string comes in from off-screen (sagging, then taut) and catches the end of the line with a knot; two
   tugs, then the whole line is yanked out along it */
jzReg('exit', 'xjYank', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    var sz = I.sz, dx = axj_bit(m, 9) ? 1 : -1, v = I.vert, d = [dx * 0.8, -0.6], hu = v ? 0.5 : (dx > 0 ? 1 : 0), hv = v ? 0 : 0.5;
    var A = axj_at(I, hu, hv), bb = axj_dbox(I), far = (m.W + bb.w * 1.2 + sz) / 0.8, T = [A[0] + d[0] * far, A[1] + d[1] * far];
    var H = axj_emit(m, I, 'var j1=Math.sin(Math.PI*axjG(p,0.2,0.32)),j2=Math.sin(Math.PI*axjG(p,0.35,0.5)),u=axjG(p,0.55,1),' +
        'mv=' + jzN(sz) + '*(0.07*j1+0.16*j2)+' + jzN(far) + '*Math.pow(u,1.25);' +
        'axjPv(S,' + jzN(A[0]) + ',' + jzN(A[1]) + ',' + jzN(-dx * (v ? -0.6 : 1)) + '*(2.5*j1+5*j2+13*axjSm(0,0.3,u)));S.x+=' + jzN(d[0]) + '*mv;S.y+=' + jzN(d[1]) + '*mv;' +
        'if(u>0.02){var w=Math.min(1,u*4);S.st=[' + jzN(d[0] * sz * 0.5) + '*w,' + jzN(d[1] * sz * 0.5) + '*w,0.3*w];}', { st: { n: 3, F: 0.8 } });
    if (!I.gfx) return;
    var lw = axj_lw(I, 0.014, 1.5), S = axj_gfx(m, 'JZ Out String'), sa = jzN(I.A) + '*(1-axjG(axjP,0.9,1))';
    var pre = H + 'var axjh=axjAt(axjS,' + hu + ',' + hv + '),axjs1=oc(axjG(axjP,0,0.17)),axjT0=' + axj_arr(T) + ',axjtip=[axjL(axjT0[0],axjh[0],axjs1),axjL(axjT0[1],axjh[1],axjs1)],' +
        'axjmid=[(axjT0[0]+axjtip[0])/2,(axjT0[1]+axjtip[1])/2+' + jzN(sz * 0.35) + '*(1-axjG(axjP,0.14,0.24))];';
    axj_seg(S, 'string a', pre + 'var axjA=axjT0,axjE=axjmid;', I.acc, lw, sa);
    axj_seg(S, 'string b', pre + 'var axjA=axjmid,axjE=axjtip;', I.acc, lw, sa);
    axj_dot(S, 'knot', pre, 'axjh', jzN(lw * 2.2), I.acc, null, 0, 'axjs1>=1?' + sa + ':0');
} });

/* ---- xjTrapdoor — 床が抜ける: a floor line appears under the line; the line crouches, hops, lands with a squash, the floor swings open
   as two doors and it drops straight through */
jzReg('exit', 'xjTrapdoor', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    var sz = I.sz, bb = axj_dbox(I), yf = bb.y1 + sz * 0.1, x0 = bb.x0 - sz * 0.2, x1 = bb.x1 + sz * 0.2, half = (x1 - x0) / 2;
    var H = axj_emit(m, I, 'var h=axjG(p,0.08,0.36),sq=Math.sin(Math.PI*axjG(p,0.36,0.5)),cr=Math.sin(Math.PI*axjG(p,0,0.1));' +
        'axjSt(S,0.5,1,1+0.1*sq+0.05*cr,1-0.24*sq-0.1*cr);S.y+=-' + jzN(sz * 0.45 * 4) + '*h*(1-h)+' + jzN(m.H - bb.y0 + sz) + '*iq(axjG(p,0.46,1));');
    if (!I.gfx) return;
    var S = axj_gfx(m, 'JZ Out Floor'), lw = axj_lw(I, 0.03, 2), op = 'axjl>0.01?' + jzN(I.A) + '*(1-axjG(axjP,0.84,1)):0';
    var pre = H + 'var axjl=oc(axjG(axjP,0,0.1)),axjan=' + jzN(86 * Math.PI / 180) + '*ob(axjG(axjP,0.43,0.66),1.4),axjcx=Math.cos(axjan)*' + jzN(half) + '*axjl,axjcy=Math.sin(axjan)*' + jzN(half) + '*axjl;';
    axj_seg(S, 'door L', pre + 'var axjA=' + axj_arr([x0, yf]) + ',axjE=[axjA[0]+axjcx,axjA[1]+axjcy];', I.acc, lw, op);
    axj_seg(S, 'door R', pre + 'var axjA=' + axj_arr([x1, yf]) + ',axjE=[axjA[0]-axjcx,axjA[1]+axjcy];', I.acc, lw, op);
} });

/* ---- xjEdgeTeeter — 縁から落ちる: the line slides along a ledge until more than half of it hangs over the end; it tips over the edge,
   slips off and falls */
jzReg('exit', 'xjEdgeTeeter', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    var sz = I.sz, bb = axj_dbox(I), dir = axj_bit(m, 10) ? 1 : -1;
    var yl = bb.y1 + sz * 0.08, ex = bb.cx + dir * bb.w * 0.1, sx0 = dir > 0 ? bb.x0 - sz * 0.2 : bb.x1 + sz * 0.2;
    var H = axj_emit(m, I, 'var th=' + jzN(dir * 78) + '*iq(axjG(p,0.3,0.8)),s2=' + jzN(dir * bb.w * 0.9) + '*iq(axjG(p,0.42,1)),ta=th*Math.PI/180;' +
        'S.x+=' + jzN(dir * bb.w * 0.24) + '*oc(axjG(p,0,0.4));axjPv(S,' + jzN(ex) + ',' + jzN(yl) + ',th);' +
        'S.x+=Math.cos(ta)*s2;S.y+=Math.sin(ta)*s2+' + jzN(m.H - bb.y0 + bb.w * 0.5 + sz) + '*iq(axjG(p,0.55,1));');
    if (!I.gfx) return;
    var S = axj_gfx(m, 'JZ Out Ledge'), lw = axj_lw(I, 0.03, 2), op = 'axjl>0.01?' + jzN(I.A) + '*(1-axjG(axjP,0.8,1)):0';
    var pre = H + 'var axjl=oc(axjG(axjP,0,0.12));';
    axj_seg(S, 'ledge', pre + 'var axjA=' + axj_arr([ex, yl]) + ',axjE=[axjL(' + jzN(ex) + ',' + jzN(sx0) + ',axjl),' + jzN(yl) + '];', I.acc, lw, op);
    axj_seg(S, 'edge', pre + 'var axjA=' + axj_arr([ex, yl - lw / 2]) + ',axjE=[' + jzN(ex) + ',' + jzN(yl) + '+' + jzN(sz * 0.22) + '*axjl];', I.acc, lw, op);
} });

/* ---- xjPuckHit — 横から弾かれる: a puck slides in from the side and hits the end of the line (three impact ticks); the line shears with
   the blow and is knocked clean out, the puck stays behind a moment */
jzReg('exit', 'xjPuckHit', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    var sz = I.sz, bb = axj_dbox(I), dir = axj_bit(m, 11) ? 1 : -1, s = sz * 0.3, i;
    var hitX = (dir > 0 ? bb.x0 : bb.x1) - dir * s * 0.5;
    var H = axj_emit(m, I, 'var u=axjG(p,0.3,1);if(u>0){axjSt(S,' + (dir > 0 ? 1 : 0) + ',0.5,1-0.14*Math.sin(Math.PI*axjG(u,0,0.22)),1);' +
        'S.sk+=' + jzN(dir * 22) + '*axjG(u,0,0.05)*Math.pow(1-u,3);var c=axjAt(S,0.5,0.5);axjPv(S,c[0],c[1],' + jzN(dir * 9) + '*u);' +
        'S.x+=' + jzN(dir * axj_offX(m, bb, dir, sz * 1.5)) + '*Math.pow(u,1.15);S.y-=' + jzN(sz * 0.45) + '*u;' +
        'var w=Math.min(1,u*5)*(1-u*0.5);S.st=[' + jzN(sz * 0.4) + '*w,0,0.28*w];}', { sk: 22, st: { n: 3, F: 0.8 } });
    if (!I.gfx) return;
    var S = axj_gfx(m, 'JZ Out Puck'), pa = jzN(I.A) + '*(1-axjG(axjP,0.6,0.86))';
    var pre = H + 'var axjpx=axjP<0.3?axjL(' + jzN(dir > 0 ? -s : m.W + s) + ',' + jzN(hitX) + ',iq(axjG(axjP,0,0.3))):' + jzN(hitX) + '+' + jzN(dir * sz * 0.35) + '*oc(axjG(axjP,0.3,0.62)),' +
        'axjf=Math.sin(Math.PI*axjG(axjP,0.3,0.42));';
    for (i = -1; i <= 1; i++) {
        axj_seg(S, 'tick ' + (i + 2), pre + 'var axjA=' + axj_arr([hitX + dir * s * 0.7, bb.cy + i * s * 0.7]) + ',axjE=[axjA[0]+' + jzN(dir * s * 0.8) + '*axjf,axjA[1]+' + jzN(i * s * 0.5) + '*axjf];',
            I.acc, axj_lw(I, 0.02, 1.5), 'axjf>0.02?' + pa + '*axjf:0');
    }
    axj_box(S, 'puck', pre, '[' + jzN(s) + ',' + jzN(s) + ']', '[axjpx,' + jzN(bb.cy) + ']', I.acc, pa);
} });

/* ---- xjRubberSnap — ゴムで弾ける: pinned at one end, the line is stretched out long and thin like a rubber band (trembling); the pin
   lets go (it pops into a ring) and the line snaps away to the far side */
jzReg('exit', 'xjRubberSnap', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    var sz = I.sz, a0 = axj_bit(m, 12) ? 0 : 1, sgn = a0 ? -1 : 1, pin = I.vert ? axj_at(I, 0.5, a0) : axj_at(I, a0, 0.5);
    var H = axj_emit(m, I, 'var s1=oc(axjG(p,0,0.52));axjSa(S,' + a0 + ',1+0.36*s1,1-0.2*s1);' +
        'if(p>0.52){var u=axjG(p,0.52,1),k2=(axjL(1.36,0.5,oe(axjG(u,0,0.22)))+0.16*Math.sin(u*34)*Math.exp(-5*u))/1.36;' +
        'axjSa(S,' + (1 - a0) + ',k2,axjL(1,1.4,oc(axjG(u,0,0.2))));var ax=axjAx(S),dist=(' + jzN(Math.max(m.W, m.H) + sz) + '+axjLen(S))*iq(u)*' + sgn + ';' +
        'S.x+=ax[0]*dist;S.y+=ax[1]*dist;var w=Math.min(1,u*5);S.st=[ax[0]*' + jzN(sz * 0.5) + '*w,ax[1]*' + jzN(sz * 0.5) + '*w,0.3*w];}' +
        'else if(p>0.3){S.x+=Math.sin(p*190)*' + jzN(sz * 0.006) + '*s1;}', { st: { n: 3, F: 0.8 } });
    if (!I.gfx) return;
    var S = axj_gfx(m, 'JZ Out Pin');
    var pre = H + 'var axjpop=axjG(axjP,0.52,0.64),axjpr=' + jzN(sz * 0.07) + '*ob(axjG(axjP,0,0.1),2)*(1+1.6*axjpop),axjpa=axjpr>' + jzN(0.3 * I.du) + '?' + jzN(I.A) + '*(1-axjpop):0;';
    axj_dot(S, 'ring', pre, axj_arr(pin), 'axjpr', null, I.acc, axj_lw(I, 0.02, 1.5), 'axjpop>0?axjpa:0');
    axj_dot(S, 'pin', pre, axj_arr(pin), 'axjpr', I.acc, null, 0, 'axjpop>0?0:axjpa');
} });

/* ---- xjCardToss — 放り投げる: the line is tossed like a card: up and across in an arc, flipping over and over (its back is shaded),
   getting smaller, and down out of the frame */
jzReg('exit', 'xjCardToss', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    var sz = I.sz, bb = axj_dbox(I), dir = axj_bit(m, 13) ? 1 : -1, up = m.H * 0.7;
    axj_emit(m, I, 'var u=cl(p),c=axjAt(S,0.5,0.5),cs=Math.cos(Math.PI*3.5*Math.pow(u,1.15));axjSc(S,c[0],c[1],1-0.42*u);axjPv(S,c[0],c[1],' + jzN(dir * 22) + '*u);' +
        'axjSa(S,0.5,1,Math.max(0.045,Math.abs(cs)));if(cs<0)S.cm=0.5;' +
        'S.x+=' + jzN(dir * m.W * 0.3) + '*u;S.y+=-' + jzN(up) + '*u+' + jzN(up + (m.H - bb.y0 + sz) * 1.15) + '*u*u;S.a=1-axjSm(0.92,1,p);', { col: I.bg });
} });

/* ---- xjWallSplat — 壁にぶつかる: the line is thrown at the side of the frame, flattens against it (a small rebound), then slides down
   the wall and out */
jzReg('exit', 'xjWallSplat', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    var sz = I.sz, bb = axj_dbox(I), dir = axj_bit(m, 14) ? 1 : -1, d = dir > 0 ? m.W - bb.x1 : bb.x0;
    var turned = Math.abs(Math.sin(I.X.r * Math.PI / 180)) > 0.72;
    axj_emit(m, I, 'var q1=iq(axjG(p,0,0.4)),sq=oc(axjG(p,0.4,0.5)),rb=Math.sin(Math.PI*axjG(p,0.5,0.66)),f=axjG(p,0.58,1);' +
        'S.x+=' + jzN(dir * d) + '*q1;if(q1<1&&q1>0.01)S.st=[' + jzN(sz * 0.5) + '*q1,0,0.3*q1];' +
        'if(sq>0){var kx=1-0.7*sq+0.1*rb,ky=1+0.3*sq+0.5*f;' +
        (turned ? 'axjSt(S,0.5,0.5,ky,kx);S.x+=' + jzN(dir * bb.w * 0.5) + '*(1-kx);' : 'axjSt(S,' + (dir > 0 ? 1 : 0) + ',0.5,kx,ky);') + '}' +
        'S.y+=' + jzN(m.H - bb.y0 + bb.h + sz) + '*iq(f);', { st: { n: 3, F: 0.8 } });
} });

/* ---- xjSlump — へたり込む: the air goes out of the line in three puffs: it sags lower and leans further each time, lies flat, and is
   whisked off along the ground */
jzReg('exit', 'xjSlump', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    var sz = I.sz, bb = axj_dbox(I), dir = axj_bit(m, 15) ? 1 : -1;
    axj_emit(m, I, 'var Lv=[1,0.68,0.38,0.09],x=cl(p/0.54)*3,i=Math.min(2,Math.floor(x)),fr=x-i,' +
        'h=axjL(Lv[i],Lv[i+1],oc(axjG(fr,0,0.6)))+0.035*Math.sin(Math.PI*axjG(fr,0.6,1))*(p<0.54?1:0);' +
        'axjSt(S,0.5,1,1+0.1*(1-h),h);S.sk+=' + jzN(dir * 42) + '*(1-h);' +
        'S.x+=' + jzN(dir * axj_offX(m, bb, dir, sz * 2)) + '*iq(axjG(p,0.55,0.97))+' + jzN(dir * sz * 0.25) + '*(1-h);S.a=1-axjSm(0.9,1,p);', { sk: 42 });
} });

/* ---- xjSpringHop — ばねで跳ぶ: the line is pressed down like a spring (an accent bar grows under it), lets go and leaps out of the top
   of the frame, still bouncing in the air */
jzReg('exit', 'xjSpringHop', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    var sz = I.sz, bb = axj_dbox(I);
    var H = axj_emit(m, I, 'var c=axjIo(axjG(p,0,0.34)),u=axjG(p,0.37,1),ky=u>0?1-0.5*Math.cos(u*17)*Math.exp(-4.2*u):1-0.5*c;' +
        'axjSt(S,0.5,1,1-0.32*(ky-1),ky);S.y-=' + jzN(bb.y1 + sz * 0.8) + '*(1-Math.pow(1-u,2.2));');
    if (!I.gfx) return;
    var hh = axj_lw(I, 0.025, 2);
    axj_box(axj_gfx(m, 'JZ Out Spring Base'), 'base', H + 'var axjc=axjIo(axjG(axjP,0,0.34)),axju=axjG(axjP,0.37,1);',
        '[' + jzN(bb.w) + '*(0.5+0.5*axjc)*(1+0.5*axjG(axju,0,0.3)),' + jzN(hh) + ']', axj_arr([bb.cx, bb.y1 + sz * 0.04 + hh / 2]), I.acc,
        jzN(I.A) + '*axjc*(1-axjG(axju,0.05,0.4))');
} });

/* ---- xjTug — 揺さぶられる: something pulls the line one way, then harder the other, then harder again (it leans and stretches with
   every pull), and the last pull takes it out of the frame */
jzReg('exit', 'xjTug', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    var sz = I.sz, bb = axj_dbox(I), dir = axj_bit(m, 16) ? 1 : -1, W = m.W, off = axj_offX(m, bb, dir, sz * 2);
    axj_emit(m, I, 'function xa(q){var K=[0,' + jzN(-0.045 * W) + ',' + jzN(0.08 * W) + ',' + jzN(-0.13 * W) + '],T=[0,0.17,0.36,0.56],i;q=cl(q);' +
        'if(q>=T[3])return axjL(K[3],' + jzN(off) + '-K[3],Math.pow(axjG(q,T[3],0.97),2.4));' +
        'for(i=0;i<3;i++)if(q<T[i+1])return axjL(K[i],K[i+1],axjIo(axjG(q,T[i],T[i+1])));return K[3];}' +
        'var x=xa(p),vx=(xa(p+0.008)-xa(p-0.008))/' + jzN(W) + ',sp=Math.min(1,Math.abs(vx)*40);S.x+=' + dir + '*x;' +
        'S.sk+=' + dir + '*Math.max(-24,Math.min(24,vx*1100));axjSt(S,0.5,0.5,1+0.12*sp,1-0.05*sp);' +
        'if(p>0.56&&sp>0.05)S.st=[' + jzN(sz * 0.5) + '*sp,0,0.3*sp];', { sk: 24, st: { n: 3, F: 0.8 } });
} });

/* =====================================================================
   C. OPTICAL
   ===================================================================== */

/* ---- xjFocusPull — ピント送り: the focus hunts: the line goes soft, nearly snaps sharp again, then the focus is pulled right away from
   it (blur + a slight swell, fading) */
jzReg('exit', 'xjFocusPull', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    axj_emit(m, I, 'var c=axjAt(S,0.5,0.5),b=p<0.3?0.5*axjIo(p/0.3):p<0.48?axjL(0.5,0.08,axjIo(axjG(p,0.3,0.48))):axjL(0.08,1,iq(axjG(p,0.48,1)));' +
        'axjSc(S,c[0],c[1],1+0.1*b);S.bl=b*' + jzN(I.sz * 0.26) + ';S.a=1-axjSm(0.58,1,p);', { blur: true });
} });

/* ---- xjDoubleVision — 二重像に割れる: the image doubles across the line, each of the two doubles again along it; the four thin images
   drift apart and fade (the lyric layer is one of the four, three linked copies are the others) */
jzReg('exit', 'xjDoubleVision', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    var sz = I.sz, k, SG = [[-1, 1], [1, -1], [-1, -1]];
    var body = 'var e1=' + jzN(sz * 0.46) + '*oc(axjG(p,0,0.7)),e2=' + jzN(sz * 0.3) + '*oc(axjG(p,0.28,1)),cr=axjCr(S),ax=axjAx(S),c=axjAt(S,0.5,0.5);' +
        'axjSc(S,c[0],c[1],1+0.05*p);S.x+=k1*cr[0]*e1+k2*ax[0]*e2;S.y+=k1*cr[1]*e1+k2*ax[1]*e2;S.a=axjL(1,0.5,axjG(p,0,0.3))*(1-iq(axjG(p,0.4,1)));';
    var D = [];
    if (I.copies) for (k = 0; k < 3; k++) D.push(axj_twin(m, 'JZ Out Double ' + (k + 1), true, null));
    axj_emit(m, I, body, { args: ',1,1' });
    for (k = 0; k < D.length; k++) {
        axj_pose(I, D[k], m.HD + axj_code(I, body) + 'var axjS=axjRun(axjP,' + SG[k][0] + ',' + SG[k][1] + ');',
            k ? 'axjG(axjP,0.28,1)>0.0005?axjS.a:0' : 'axjS.a');
    }
} });

/* ---- xjColourDrain — 色が抜ける: the colour drains out of the line from one end to the other, leaving a pale print of it; the print
   then fades. Pale print = a linked copy under the lyric tinted towards the background; the lyric itself is wiped by a soft-edged
   mask (the feather stands in for the browser's three graded bands behind the edge) */
jzReg('exit', 'xjColourDrain', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    var L = m.L, r = I.r, fs = I.fs, v = I.vert, rev = axj_bit(m, 17), pad = fs * 0.3, band = fs * 0.45, N = 3;
    var a0 = (v ? r.top : r.left) - pad, a1 = (v ? r.top + r.height : r.left + r.width) + pad, big = (r.width + r.height) * 4 + fs * 10;
    var E0 = rev ? a1 + band * N * 1.5 : a0 - band * N * 1.5, lo = rev ? E0 : E0 - big, hi = rev ? E0 + big : E0;
    var P = null;
    if (I.copies) { P = axj_twin(m, 'JZ Out Pale', true, L); axj_tint(P, jzMixHex(I.c0, I.bg, 0.8), 'JZ Out Pale'); }
    var H = axj_emit(m, I, 'S.a=1-axjIo(axjG(p,0.5,1));');
    if (P) axj_fade(P, H, 'axjS.a');
    try {
        var mk = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
        sh.vertices = v ? [[r.left + r.width + big, lo], [r.left + r.width + big, hi], [r.left - big, hi], [r.left - big, lo]] :
            [[hi, r.top - big], [hi, r.top + r.height + big], [lo, r.top + r.height + big], [lo, r.top - big]];
        sh.closed = true; mk.property('ADBE Mask Shape').setValue(sh);
        try { mk.maskMode = MaskMode.SUBTRACT; } catch (e1) {}
        try { mk.name = 'JZ Out Drain'; } catch (e2) {}
        mk.property('ADBE Mask Feather').setValue([band * N, band * N]);
        jzSetExpr(mk.property('ADBE Mask Offset'), H + 'axjP>0?' + jzN(a1 - a0 + band * N) + '*axjIo(axjG(axjP,0,0.62)):0');
        jzSetExpr(mk.property('ADBE Mask Opacity'), H + 'axjP>0?100:0');
    } catch (e0) { jzWarn('xjColourDrain mask: ' + e0.toString()); }
} });

/* ---- xjComet — 尾を引いて飛ぶ: the line dips, then climbs away on a curve, shrinking, with a tail of its own earlier positions strung
   out behind it (four linked copies shading into the accent colour, main pass only) */
jzReg('exit', 'xjComet', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    var sz = I.sz, bb = axj_dbox(I), dir = axj_bit(m, 18) ? 1 : -1, off = axj_offX(m, bb, dir, sz * 2), k, prev = m.L;
    var body = 'var u=cl(p),c=axjAt(S,0.5,0.5);axjSc(S,c[0],c[1],1-0.5*u);axjPv(S,c[0],c[1],' + jzN(-dir * 10) + '*axjSm(0.1,0.7,u));' +
        'S.x+=' + jzN(dir * off) + '*Math.pow(u,2.5);S.y+=-' + jzN(m.H * 0.42) + '*Math.pow(u,1.7)+' + jzN(sz * 0.3) + '*Math.sin(Math.PI*Math.min(1,u*2.4))*(1-u);S.a=1-axjSm(0.9,1,p);';
    var D = [];
    if (I.copies && I.main) for (k = 1; k <= 4; k++) { D.push(axj_twin(m, 'JZ Out Tail ' + k, true, prev)); prev = D[k - 1]; }
    axj_emit(m, I, body);
    for (k = 1; k <= D.length; k++) {
        axj_tint(D[k - 1], jzMixHex(I.c0, I.acc, k / 5), 'JZ Out Tail');
        axj_pose(I, D[k - 1], m.HD + axj_code(I, body) + 'var axjS=axjRun(axjP-' + jzN(k * 0.055) + '*(0.4+0.6*axjP));', jzN(0.55 * Math.pow(0.7, k - 1)) + '*Math.min(1,axjP*5)');
        jzNoGhost(D[k - 1]);
    }
} });

/* ---- xjShellChase — 抜け殻が追う: the solid body of the line slips out sideways (leaning) and leaves its empty outline standing; the
   shell shivers, then is sucked out after it, stretched. Shell = an outline copy riding on the (hidden) lyric layer, body = a filled
   copy with its own motion */
jzReg('exit', 'xjShellChase', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    var sz = I.sz, bb = axj_dbox(I), dir = axj_bit(m, 19) ? 1 : -1, off = axj_offX(m, bb, dir, sz * 2);
    var body = 'var u=axjG(p,0.42,0.96);S.x+=Math.sin(p*140)*' + jzN(sz * 0.012) + '*axjG(p,0.2,0.4)*(1-u)+' + jzN(dir * off) + '*ic(u);' +
        'if(u>0){var w=Math.min(1,u*2.5);axjSt(S,0.5,0.5,1+0.45*w,1-0.1*w);S.sk-=' + jzN(dir * 10) + '*Math.min(1,u*3);}S.a=1-axjSm(0.9,1,p);';
    if (I.hollow || !I.copies) { axj_emit(m, I, body, { sk: 10 }); return; }
    var Bd = axj_twin(m, 'JZ Out Body', true, null), Sh = axj_twin(m, 'JZ Out Shell', false, null);
    var H = axj_emit(m, I, body, { hide: true });
    axj_outline(I, Sh, I.c0, axj_lw(I, 0.02, 1.5));
    axj_fade(Sh, H, 'axjS.a');
    jzAnimator(Sh, 'JZ Out Lean', [['ADBE Text Skew', 10]], H + 'Math.max(-100,Math.min(100,axjS.sk/10*100))');
    var bq = 'var axjq=axjG(axjP,0,0.48);';
    axj_pose(I, Bd, m.HD + axj_code(I, 'S.x+=' + jzN(dir * off) + '*ic(axjG(p,0,0.48));') + 'var axjS=axjRun(axjP);' + bq, 'axjq<1?1:0');
    jzAnimator(Bd, 'JZ Out Lean', [['ADBE Text Skew', -dir * 14]], m.HD + I.lib + bq + 'Math.sin(Math.PI*Math.min(1,axjq*1.4))*100');
} });

/* ---- xjShadowStay — 影だけ残る: the line lifts off the page and its shadow parts from it; the line flies out of the top, the shadow
   (a dimmed copy under it, main pass only) stays a moment longer and fades */
jzReg('exit', 'xjShadowStay', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    var sz = I.sz, bb = axj_dbox(I);
    var D = I.copies ? axj_twin(m, 'JZ Out Shadow', true, m.L) : null;
    axj_emit(m, I, 'var c=axjAt(S,0.5,0.5),q1=oc(axjG(p,0,0.32)),u=ic(axjG(p,0.26,0.74));axjSc(S,c[0],c[1],1+0.09*q1+0.45*u);' +
        'S.x-=' + jzN(sz * 0.03) + '*q1;S.y-=' + jzN(sz * 0.22) + '*q1+' + jzN(bb.y1 + bb.h * 0.8 + sz) + '*u;');
    if (!D) return;
    axj_tint(D, jzMixHex(I.bg, I.c0, 0.34), 'JZ Out Shadow');
    axj_pose(I, D, m.HD + axj_code(I, 'var c=axjAt(S,0.5,0.5),q1=oc(axjG(p,0,0.32)),u=ic(axjG(p,0.26,0.74));' +
        'S.x+=' + jzN(sz * 0.05) + '*q1;S.y+=' + jzN(sz * 0.1) + '*q1;axjSc(S,c[0],c[1]+' + jzN(sz * 0.1) + '*q1,1+0.05*u);') + 'var axjS=axjRun(axjP);',
        'axjG(axjP,0,0.1)*(1-axjIo(axjG(axjP,0.66,1)))');
    jzNoGhost(D);
} });

/* ---- xjThroughFocus — 焦点を越える: as through a lens: the image shrinks to a point at the focus, comes out the other side
   upside-down, large and soft, and dissolves */
jzReg('exit', 'xjThroughFocus', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    axj_emit(m, I, 'var c=axjAt(S,0.5,0.5);if(p<0.44)axjSc(S,c[0],c[1],1-ic(p/0.44));' +
        'else{var q=axjG(p,0.44,1),g=oc(q);axjPv(S,c[0],c[1],180);axjSc(S,c[0],c[1],1.25*g);S.a=0.7*Math.pow(1-q,1.3);S.bl=' + jzN(I.sz * 0.12) + '*g;}', { blur: true });
} });

/* ---- xjPanSmear — 流れて滲む: the camera pans off: the line smears out both ways along itself into a flat band of light and thins
   away (stretch + directional blur along the line for the browser's trails on both sides) */
jzReg('exit', 'xjPanSmear', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    axj_emit(m, I, 'var ax=axjAx(S),d=' + jzN(I.sz * 0.42 * 1.25) + '*oc(axjG(p,0,0.85)),e=iq(p);axjSa(S,0.5,1+0.3*e,1-0.45*e);' +
        'S.st=[ax[0]*d,ax[1]*d,0.55*axjG(p,0,0.14)];S.a=1-axjIo(axjG(p,0.22,1));', { st: { n: 3, F: 2 } });
} });

/* =====================================================================
   D. STEPPED (held poses)
   ===================================================================== */

/* ---- xjStepFade — コマ落ちフェード: no in-betweens: the line drops through four held exposures, each paler and a notch lower, and the
   fifth frame is empty */
jzReg('exit', 'xjStepFade', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    axj_emit(m, I, 'var T=[0.07,0.29,0.51,0.73,0.92],s=0;while(s<5&&p>=T[s])s++;' +
        'if(s>=5)S.a=0;else if(s){var c=axjAt(S,0.5,0.5);S.a=[1,0.66,0.4,0.2,0.08][s];S.cm=[0,0.12,0.26,0.4,0.5][s];axjSc(S,c[0],c[1],1-0.014*s);S.y+=' + jzN(I.sz * 0.04) + '*s;}',
        { col: I.bg });
} });

/* ---- xjOnionSkin — 残像コマ送り: the line leaves in four held poses, each a jump further along and a little more askew; the poses it
   has left stay as thin outlines for a beat (the last one in the accent colour). Outlines = four linked outline copies, one per pose */
jzReg('exit', 'xjOnionSkin', { apply: function (m) {
    var I = axj_info(m); if (!I) return;
    var sz = I.sz, dir = axj_bit(m, 20) ? 1 : -1, up = axj_bit(m, 21) ? -1 : 1, LL = Math.max(sz * 0.9, m.W * 0.07), j, prev = m.L;
    var body = 'var OF=[0,1,2.3,3.9],RT=[0,-5,4,-9],SC=[1,0.95,0.89,0.82],j=k1>=0?k1:(p<0.1?0:p<0.3?1:p<0.5?2:p<0.7?3:4);' +
        'if(j>=4)S.a=0;else if(j>0){var c=axjAt(S,0.5,0.5);axjPv(S,c[0],c[1],' + dir + '*RT[j]);axjSc(S,c[0],c[1],SC[j]);S.x+=' + jzN(dir * LL) + '*OF[j];S.y+=' + jzN(up * LL * 0.32) + '*OF[j];}';
    var D = [];
    if (I.copies) for (j = 0; j < 4; j++) { D.push(axj_twin(m, 'JZ Out Pose ' + (j + 1), false, prev)); prev = D[j]; }
    axj_emit(m, I, body, { args: ',-1' });
    for (j = 0; j < D.length; j++) {
        var pre = m.HD + axj_code(I, body) + 'var axjS=axjRun(axjP,' + j + '),axjst=axjP<0.1?0:axjP<0.3?1:axjP<0.5?2:axjP<0.7?3:4,axjnw=axjst-1==' + j + ';';
        axj_outline(I, D[j], I.c0, axj_lw(I, 0.016, 1.5));
        jzAnimator(D[j], 'JZ Out Pose Colour', [['ADBE Text Stroke Color', jzHex(I.acc)]], pre + 'axjnw?100:0');
        axj_pose(I, D[j], pre, '(axjst>' + j + '&&axjst-2<=' + j + '?(axjnw?0.75:0.35):0)*(axjst==4?1-axjG(axjP,0.7,0.98):1)');
    }
} });
