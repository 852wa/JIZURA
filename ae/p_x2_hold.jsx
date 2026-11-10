// ================================================================ pack x2hold (AE port of src/11p_x2_hold.js) — 30 holds (待機中の動き)
// whole line : xkDepthRock xkParallax xkTallBreath xkBeatBump xkMetronome xkBuoy xkTiltSnap xkStopMotion xkSlideBunch xkWallBounce
// optical    : xkFocusBreath xkDoubleVision xkReflection xkMarchEdge xkHeatHaze xkSplitShear
// loudness   : xkLevelFill xkLoudWeight xkLoudArch
// per glyph  : xkMagnifier xkNod xkKaraoke xkPairUp xkRippleOut xkZigzagFlip xkSpinOne xkBlink xkStairStep xkBigSmall xkCradle
// Every hold scales by xkK = AMT × motionK (browser: amt × clamp(fx.motion / 0.7, 0, 1.6)), so it eases in after the entrance
// and fades out with the exit; xkKK = min(1, xkK).
// Rigid motions of the whole line = layer transform snippets (m.parts) with a pivot correction; per-glyph motions = text
// animators with Expression Selectors: every part writes ONE body that sets the browser's per-glyph values (dx dy rot sx sy al)
// for the glyph i = textIndex - 1, and axk_emit() turns it into Move / Turn / Size / Fade animators. Per-glyph constants the
// browser takes from its layout (place along the reading axis, index in the line, seeded choices) are computed here and
// embedded as arrays. Optical copies (double image, reflection, marching edge, karaoke / level fill, the lower half of the
// split shear) are linked copies of the lyric ("twins": duplicates parented to it) clipped by masks or a shape track matte.
// There is no beat grid inside the content comp: beat-driven holds tick on the cut length divided evenly (the nearest
// division to the browser's fallback period); loudness-driven holds follow the browser's slow swell (sine + smooth noise).

// ---------------------------------------------------------------- shared helpers (axk_*)
var AXK_TAU = Math.PI * 2;
// expression helpers (xk-prefixed: they also go into the merged layer transform expressions):
// xkio inOutCubic, xkis inOutSine, xkfr fract, xkn smooth value noise -1..1, xkth tanh, xklv loudness 0..1 (rate, seed)
var AXK_FNS = 'function xkio(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}' +
    'function xkis(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}' +
    'function xkfr(x){return x-Math.floor(x);}' +
    'function xkn(x,s){var i=Math.floor(x),f=x-i,u=f*f*(3-2*f),a=hh(i*1.618+s*0.7311)*2-1,b=hh((i+1)*1.618+s*0.7311)*2-1;return a+(b-a)*u;}' +
    'function xkth(x){x=Math.max(-9,Math.min(9,x));var e=Math.exp(2*x);return (e-1)/(e+1);}' +
    'function xklv(r,s){return cl(0.5+0.34*Math.sin(time*r+s%7)+0.3*xkn(time*r*1.9,s));}\n';
// hold strength; xkX hides helper copies quickly once the exit starts (they do not carry the exit's animators)
var AXK_K = 'var xkK=AMT*Math.max(0,Math.min(1.6,M/0.7)),xkKK=Math.min(1,xkK),xkX=Math.max(0,1-PO*6);';
var AXK_PRE = AXK_FNS + AXK_K;        // in front of every m.parts snippet (the header m.HD is already there)
function axk_td(L) { try { return L.property('ADBE Text Properties').property('ADBE Text Document').value; } catch (e) { return null; } }
// the lyric's real font size (layer units): layouts fit the text after asking for a size, so m.size can differ from it
function axk_sz(m) { var td = axk_td(m.L); return (td && td.fontSize > 1) ? td.fontSize : (m.size || 100); }
function axk_hd(m) { return m.HD + AXK_FNS + 'var SZ=' + jzN(axk_sz(m)) + ';' + AXK_K + '\n'; }
function axk_s(v) { return typeof v === 'number' ? jzN(v) : String(v); }
function axk_arr(a) { var s = [], i; for (i = 0; i < a.length; i++) s.push(jzN(a[i])); return '[' + s.join(',') + ']'; }
function axk_isHex(c) { return typeof c === 'string' && c.charAt(0) === '#' && (c.length === 7 || c.length === 4); }
// the browser's J.h (seeded choices that are fixed per cut match the web version)
function axk_h(a, b, c, d, e) {
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
function axk_isSp(ch) { return ch === ' ' || ch === '　' || ch === '\t'; }
function axk_adv(ch) { var c = ch.charCodeAt(0); if (ch === ' ') return 0.3; if (c >= 0xFF61 && c <= 0xFF9F) return 0.5; return c < 0x2000 ? 0.56 : 1; }
function axk_T(m) { var c = m.c; return { IN: Math.max(0.02, c.inDur || 0.3), DL: (m.o.mi || 0) * (c.stagger || 0.04), OS: c.dur - (c.outDur || 0), DUR: c.dur }; }
// the text box at rest (entrance done, hold barely started)
function axk_rect(m) {
    var t = axk_T(m), tt = Math.max(0, Math.min(t.OS - 0.01, t.DL + t.IN + 0.03));
    try { var r = m.L.sourceRectAtTime(tt, false); if (r && r.width > 0 && r.height > 0) return r; } catch (e) {}
    return jzRect(m.L);
}
// glyph geometry in the text layer's own space (textIndex order, spaces included):
//   G.g[i] {li, ci, nl (chars in the line), sp, x, y (centre), w}; G.r source rect; G.fs; G.vert (one glyph per line); G.n; G.nk; G.nL
function axk_geo(m) {
    var td = axk_td(m.L), r = axk_rect(m), i, j;
    var fs = (td && td.fontSize) || axk_sz(m), text = String(td ? td.text : ''), trk = ((td && td.tracking) || 0) / 1000 * fs;
    var lines = text.split(/\r\n|\r|\n|\u0003/), nL = lines.length, lead = fs * 1.2;
    try { if (!td.autoLeading && td.leading > 0) lead = td.leading; } catch (e0) {}
    var just = 'c';
    try { if (td.justification === ParagraphJustification.LEFT_JUSTIFY) just = 'l'; else if (td.justification === ParagraphJustification.RIGHT_JUSTIFY) just = 'r'; } catch (e1) {}
    var G = { fs: fs, lead: lead, nL: nL, r: r, n: 0, nk: 0, g: [], vert: nL > 1 }, rows = [], maxW = 0;
    for (i = 0; i < nL; i++) {
        var cs = jzChars(lines[i]), ws = [], w = 0;
        for (j = 0; j < cs.length; j++) { var a = axk_adv(cs[j]) * fs; ws.push(a); w += a + (j < cs.length - 1 ? trk : 0); }
        if (cs.length > 1) G.vert = false;
        rows.push({ cs: cs, ws: ws, w: w }); if (w > maxW) maxW = w;
    }
    var k = maxW > 0 ? r.width / maxW : 1; if (!(k > 0.5 && k < 2)) k = 1;
    var lh = r.height - (nL - 1) * lead; if (!(lh > fs * 0.5 && lh < fs * 1.6)) lh = fs * 0.95;
    var cx = r.left + r.width / 2;
    for (i = 0; i < nL; i++) {
        var R = rows[i], x = just === 'l' ? r.left : (just === 'r' ? r.left + r.width - R.w * k : cx - R.w * k / 2), y = r.top + lh / 2 + i * lead;
        for (j = 0; j < R.cs.length; j++) {
            var sp = axk_isSp(R.cs[j]);
            G.g.push({ li: i, ci: j, nl: R.cs.length, sp: sp, x: x + R.ws[j] * k / 2, y: y, w: Math.max(1, R.ws[j] * k) });
            x += (R.ws[j] + trk) * k; G.n++;
            if (!sp) G.nk++;
        }
    }
    return G;
}
function axk_xf(L) { var tr = L.property('ADBE Transform Group'); return { a: tr.property('ADBE Anchor Point').value, p: tr.property('ADBE Position').value, s: tr.property('ADBE Scale').value, r: tr.property('ADBE Rotate Z').value }; }
// everything a hold needs to know about its line. Sizes: fs = font size in layer units, szc = the same in comp px.
//   box x0 y0 x1 y1 cx cy (layer space), half = half length along the reading axis, U[] glyph place -1..1 along it,
//   CI[] index in the line (vertical text: in the column), NL[] glyphs in that line, VI[] indices of the non-space glyphs,
//   single = one glyph per layer (scatter layouts): its place in the cut (mi of N) stands in for the glyph index
function axk_info(m) {
    var L = m.L, G = axk_geo(m), r = G.r, X = axk_xf(L), s0 = (Math.abs(X.s[0]) + Math.abs(X.s[1])) / 200, cs = m.c.seed | 0, i;
    var N = Math.max(1, jzCount(String(m.c.text || ''))), mi = Math.max(0, Math.round(m.o.mi || 0));
    if (!(s0 > 0.01)) s0 = 1;
    var I = { L: L, G: G, r: r, X: X, fs: G.fs, s0: s0, szc: G.fs * s0, cs: cs, csn: ((cs % 99991) + 99991) % 99991, cph: (cs % 97) / 97 * AXK_TAU,
        N: N, mi: mi, single: G.nk === 1 && N > 1, vert: G.vert, x0: r.left, y0: r.top, x1: r.left + r.width, y1: r.top + r.height,
        cx: r.left + r.width / 2, cy: r.top + r.height / 2, U: [], CI: [], NL: [], VI: [] };
    I.half = Math.max(1, (G.vert ? r.height : r.width) / 2);
    for (i = 0; i < G.n; i++) {
        var g = G.g[i];
        I.U.push(jzClamp(((G.vert ? g.y - I.cy : g.x - I.cx)) / I.half, -1, 1));
        I.CI.push(G.vert ? g.li : g.ci); I.NL.push(G.vert ? G.nL : g.nl);
        if (!g.sp) I.VI.push(i);
    }
    I.ord = N > 1 ? jzClamp(mi / (N - 1), 0, 1) : 0;
    // expression pieces (browser seqOf / orderOf)
    I.exIdx = I.single ? jzN(mi) : 'i'; I.exTot = I.single ? jzN(N) : 'textTotal';
    I.exCi = I.single ? jzN(mi) : '(CI[i]||0)'; I.exNl = I.single ? jzN(N) : '(NL[i]||1)';
    I.exOrd = '(textTotal>1?i/(textTotal-1):' + jzN(I.ord) + ')';
    I.exCI = I.single ? '' : 'var CI=' + axk_arr(I.CI) + ',NL=' + axk_arr(I.NL) + ';';
    I.exU = 'var U=' + axk_arr(I.U) + ',HALF=' + jzN(I.half) + ';';
    return I;
}
// the beat: the cut length divided evenly, as close to the browser's fallback period fb as it gets -> xkB (length), xkbi (index), xkbs (since)
function axk_beat(m, fb) {
    var dur = m.c.dur || fb, n = Math.max(1, Math.round(dur / fb)), bl = dur / n;
    if (!(bl > fb * 0.67 && bl < fb * 1.5)) bl = fb;
    return 'var xkB=' + jzN(bl) + ',xkbi=Math.floor(time/xkB),xkbs=time-xkbi*xkB;';
}
// keep the point (px, py) of L's own space (numbers or expression strings) fixed while L is scaled by [fx, fy] and turned by
// rot degrees on top of its own transform (expression strings) -> snippet for m.parts.pos
function axk_pivot(I, fx, fy, rot, px, py) {
    var X = I.X;
    if (typeof px === 'number' && typeof py === 'number' && Math.abs((px - X.a[0]) * X.s[0] / 100) + Math.abs((py - X.a[1]) * X.s[1] / 100) < 0.5) return '';
    return 'var xkpa0=' + jzN(X.r * Math.PI / 180) + ',xkpa=xkpa0+(' + rot + ')*Math.PI/180,xkpx=((' + axk_s(px) + ')-' + jzN(X.a[0]) + ')*' + jzN(X.s[0] / 100) +
        ',xkpy=((' + axk_s(py) + ')-' + jzN(X.a[1]) + ')*' + jzN(X.s[1] / 100) + ',xkqx=(' + fx + ')*xkpx,xkqy=(' + fy + ')*xkpy;' +
        'd=[d[0]+Math.cos(xkpa0)*xkpx-Math.sin(xkpa0)*xkpy-(Math.cos(xkpa)*xkqx-Math.sin(xkpa)*xkqy),d[1]+Math.sin(xkpa0)*xkpx+Math.cos(xkpa0)*xkpy-(Math.sin(xkpa)*xkqx+Math.cos(xkpa)*xkqy)];';
}
// rigid motion of the whole line (pre = AXK_PRE + the part's own variables)
function axk_rot(m, I, pre, ang, px, py) {
    m.parts.rot.push(pre + 'r+=(' + ang + ');');
    var pv = axk_pivot(I, '1', '1', ang, px, py);
    if (pv) m.parts.pos.push(pre + pv);
}
function axk_scale(m, I, pre, fx, fy, px, py) {
    m.parts.sc.push(pre + 'f=[f[0]*(' + fx + '),f[1]*(' + fy + ')];');
    var pv = axk_pivot(I, fx, fy, '0', px, py);
    if (pv) m.parts.pos.push(pre + pv);
}
function axk_move(m, pre, dx, dy) { m.parts.pos.push(pre + 'd=[d[0]+(' + dx + '),d[1]+(' + dy + ')];'); }
// per-glyph animators from one body. o: p = largest offset (px), r = largest turn (deg), s = scale (sx, sy 0..2), a = fade (al)
function axk_emit(m, name, body, o) {
    var L = m.L, q = axk_hd(m) + 'var i=textIndex-1,dx=0,dy=0,rot=0,sx=1,sy=1,al=1;function xkc(v){return Math.max(-100,Math.min(100,v));}' + body + '\n';
    if (o.s) jzAnimator(L, 'JZ Hold ' + name + ' Size', [['ADBE Text Scale 3D', [200, 200, 100]]], q + '[xkc((sx-1)*100),xkc((sy-1)*100),0]');
    if (o.r) jzAnimator(L, 'JZ Hold ' + name + ' Turn', [['ADBE Text Rotation', o.r]], q + 'xkc(rot/' + jzN(o.r) + '*100)');
    if (o.p) jzAnimator(L, 'JZ Hold ' + name + ' Move', [['ADBE Text Position 3D', [o.p, o.p, 0]]], q + '[xkc(dx/' + jzN(o.p) + '*100),xkc(dy/' + jzN(o.p) + '*100),0]');
    if (o.a) jzAnimator(L, 'JZ Hold ' + name + ' Fade', [['ADBE Text Opacity', 0]], q + 'xkc((1-al)*100)');
}
// offsets along / across the reading axis (browser along() / across(): + across = below the baseline)
function axk_along(I, v) { return I.vert ? 'dy=' + v + ';' : 'dx=' + v + ';'; }
function axk_across(I, v) { return I.vert ? 'dx=-(' + v + ');' : 'dy=' + v + ';'; }
// ---- optical copies
function axk_matted(L) { try { return !!L.trackMatteType && L.trackMatteType !== TrackMatteType.NO_TRACK_MATTE; } catch (e) { return false; } }
function axk_nMask(L) { try { return L.property('ADBE Mask Parade').numProperties; } catch (e) { return 0; } }
// the real lyric (opaque, filled): optical copies only go there (browser primary())
function axk_main(m, minOp) {
    try {
        var td = axk_td(m.L);
        if (minOp >= 85 && td && td.applyFill === false) return false;
        return jzXf(m.L, 'ADBE Opacity').value >= minOp;
    } catch (e) { return true; }
}
// no copies for matted lyrics, very long lines, one-glyph-per-layer layouts of long lyrics and crowded comps
function axk_noCopies(m, I) {
    if (axk_matted(m.L)) return true;
    if (I.G.n > 60 || (I.single && I.N > 8)) return true;
    try { return m.ctx.comp.numLayers > 70; } catch (e) { return false; }
}
// linked copy of the lyric: parented to L (follows every move of it), opacity = L's own value × fac (expression);
// link = takes L's final text style by expression (the treatment comes later)
function axk_twin(m, tag, fac, below, link) {
    var L = m.L, D = L.duplicate(), i, mns = ['ADBE Position', 'ADBE Scale', 'ADBE Rotate Z', 'ADBE Opacity', 'ADBE Anchor Point'];
    try { D.name = String(L.name).substr(0, 20) + ' ' + tag; } catch (e0) {}
    var tr = D.property('ADBE Transform Group');
    for (i = 0; i < mns.length; i++) { try { if (tr.property(mns[i]).expression) tr.property(mns[i]).expression = ''; } catch (e1) {} }
    D.parent = L;
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    jzSetExpr(tr.property('ADBE Position'), 'parent.transform.anchorPoint');
    jzSetExpr(tr.property('ADBE Opacity'), axk_hd(m) + 'value*(' + fac + ')');
    if (link) { try { D.property('ADBE Text Properties').property('ADBE Text Document').expression = 'parent.text.sourceText.style'; } catch (e2) {} }
    try { if (below) D.moveAfter(L); else D.moveBefore(L); } catch (e3) {}
    return D;
}
// alpha track matte shape layer for the twin T, in L's own space (parented to L), right above T
function axk_matte(m, T, name) {
    var S = m.ctx.comp.layers.addShape(), ok = false;
    try { S.name = name; } catch (e0) {}
    try { S.moveBefore(T); } catch (e1) {}
    S.parent = m.L;
    var tr = S.property('ADBE Transform Group');
    tr.property('ADBE Anchor Point').setValue([0, 0]); tr.property('ADBE Position').setValue([0, 0]);
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    if (typeof T.setTrackMatte === 'function') { try { T.setTrackMatte(S, TrackMatteType.ALPHA); ok = true; } catch (e2) { ok = false; } }
    if (!ok) { try { T.trackMatteType = TrackMatteType.ALPHA; } catch (e3) { jzWarn('x2hold matte: ' + e3.toString()); } }
    try { S.enabled = false; } catch (e4) {}
    jzNoGhost(S);
    return S;
}
// rectangular mask in layer space; feather px or [fx, fy]; expEx = Mask Expansion expression
function axk_mask(Lx, x0, y0, x1, y1, name, feather, expEx) {
    var mk = Lx.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = [[x1, y0], [x1, y1], [x0, y1], [x0, y0]]; sh.closed = true;
    mk.property('ADBE Mask Shape').setValue(sh);
    try { if (name) mk.name = name; } catch (e0) {}
    if (feather) mk.property('ADBE Mask Feather').setValue(typeof feather === 'number' ? [feather, feather] : feather);
    if (expEx) jzSetExpr(mk.property('ADBE Mask Offset'), expEx);
    return mk;
}
// Transform effect that only translates (layer space, after the masks): the position expression gives the offset
function axk_shift(Lx, name, posEx) {
    var e = jzEffect(Lx, 'ADBE Geometry2', name);
    jzEP(e, 1, [0, 0]); jzEP(e, 2, [0, 0]); jzEX(e, 2, posEx);
    return e;
}
// colour distance 0..1 and the browser's accFor(): a scheme colour that reads as "the other colour" next to the lyric's own
function axk_cdist(a, b) { if (!axk_isHex(a) || !axk_isHex(b)) return 0; var p = jzHex(a), q = jzHex(b); return (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2])) / 3; }
function axk_acc(m, c0) {
    var sc = m.ctx.sc, c = [sc.accent, sc.accent2, sc.fg, sc.sub], i;
    for (i = 0; i < c.length; i++) if (axk_isHex(c[i]) && axk_cdist(c[i], c0) > 0.16 && axk_cdist(c[i], sc.bg) > 0.16) return c[i];
    return axk_isHex(sc.accent) ? sc.accent : c0;
}
// the lyric's own colour (outline text: its stroke colour)
function axk_c0(L, td) {
    if (td && td.applyFill === false) { try { var c = td.strokeColor; return jzToHex(c[0] * 255, c[1] * 255, c[2] * 255); } catch (e) { return '#FFFFFF'; } }
    return jzTextColor(L);
}
// swell with the loudness about the box centre (the browser's fallback of the loudness holds for outline / gradient text)
function axk_swell(m, I, rate, amp) {
    axk_scale(m, I, AXK_PRE + 'var xksw=1+' + jzN(amp) + '*xklv(' + jzN(rate) + ',' + I.csn + ')*xkK;', 'xksw', 'xksw', I.cx, I.cy);
}

/* ================================================================ whole-line motions */

/* ---- xkDepthRock — 奥行きゆれ: the line turns about its vertical axis like a card: one end comes forward (bigger, wider
   spaced), the other recedes. One glyph per layer: the glyph grows / shrinks with its place on the screen. */
jzReg('hold', 'xkDepthRock', { apply: function (m) {
    var I = axk_info(m), A = 'var xka=Math.sin(time*' + jzN(AXK_TAU / 5.2) + '+' + jzN(I.cph) + ')*Math.min(xkK,1.4);';
    if (I.single) {
        var W = m.W, H = m.H, pv = H > W * 1.2, u = jzClamp((pv ? I.X.p[1] - H / 2 : I.X.p[0] - W / 2) / ((pv ? H : W) * 0.4), -1, 1);
        axk_scale(m, I, AXK_PRE + A + 'var xkf=1+0.1*xka*' + jzN(u) + ';', 'xkf', 'xkf', I.cx, I.cy);
        return;
    }
    axk_emit(m, 'Depth', I.exU + A + 'var u=U[i]||0,c=0.12*xka,nar=1-0.06*xka*xka,v=HALF*((u+0.5*c*(u*u-1/3))*nar-u);' + axk_along(I, 'v') + 'sx=sy=1+c*u;',
        { p: I.half * 0.2, s: 1 });
} });

/* ---- xkParallax — 視差ゆれ: every glyph sits on one of three depth planes (seeded like the browser); the planes slide against
   each other as if the camera trucked sideways; the far plane is a little smaller and dimmer */
jzReg('hold', 'xkParallax', { apply: function (m) {
    var I = axk_info(m), D = [], i;
    for (i = 0; i < Math.max(1, I.G.n); i++) D.push((axk_h(I.cs, I.single ? I.mi : i, I.single ? 0 : I.mi, 711) % 3) - 1);
    axk_emit(m, 'Parallax', 'var PL=' + axk_arr(D) + ',q=PL[i]||0,sway=Math.sin(time*' + jzN(AXK_TAU / 4.6) + '+' + jzN(I.cph) + '),bob=Math.sin(time*' + jzN(AXK_TAU / 6.3) + '+1);' +
        'dx=sway*SZ*0.075*q*xkK;dy=bob*SZ*0.022*q*xkK;sx=sy=1+0.06*q*xkKK;al=q<0?1-0.22*xkKK:1;', { p: I.fs * 0.125, s: 1, a: 1 });
} });

/* ---- xkTallBreath — 縦の呼吸: the letters grow taller from the foot of the block and sink back: a slow inhale, a quicker
   exhale; the width never changes (vertical text: the column widens about its centre, as in the browser) */
jzReg('hold', 'xkTallBreath', { apply: function (m) {
    var I = axk_info(m), pre = AXK_PRE + 'var xku=xkfr(time/3.8),xkb=xku<0.62?xkis(xku/0.62):1-xkis((xku-0.62)/0.38),xkf=1+0.1*xkb*xkK;';
    if (I.vert) axk_scale(m, I, pre, 'xkf', '1', I.cx, I.cy);
    else axk_scale(m, I, pre, '1', 'xkf', I.cx, I.y1);
} });

/* ---- xkBeatBump — 拍で小突く: on every beat something nudges the line from a new side; it gives way and springs back */
jzReg('hold', 'xkBeatBump', { apply: function (m) {
    var I = axk_info(m), pre = AXK_PRE + axk_beat(m, 0.6) +
        'var xkv=Math.exp(-xkbs*5.5)*Math.cos(xkbs*20)*Math.min(1,xkbs/0.03),xkan=hh(xkbi*7.31+' + I.csn + ')*6.2832,xkd=' + jzN(I.szc * 0.14) + '*xkK*xkv;';
    axk_move(m, pre, 'Math.cos(xkan)*xkd', 'Math.sin(xkan)*xkd*0.75');
    axk_rot(m, I, pre, '(hh(xkbi*3.77+' + I.csn + '+5)*2-1)*2*xkK*xkv', I.cx, I.cy);
} });

/* ---- xkMetronome — メトロノーム: an inverted pendulum pivoting below the text: it swings over on the beat and waits at each end */
jzReg('hold', 'xkMetronome', { apply: function (m) {
    var I = axk_info(m), pre = AXK_PRE + axk_beat(m, 0.62) + 'var xkto=xkbi%2?1:-1,xkr=(-xkto+2*xkto*xkio(cl(xkbs/(xkB*0.55))))*2.4*xkK;';
    axk_rot(m, I, pre, 'xkr', I.cx, I.y1 + Math.max(I.fs * 1.2, (I.y1 - I.y0) * 0.8));
} });

/* ---- xkBuoy — 波に浮かぶ: the whole line rides a slow swell as one rigid body: it rises, and tips as each wave passes under it */
jzReg('hold', 'xkBuoy', { apply: function (m) {
    var I = axk_info(m), w = AXK_TAU / 3.4, ph = I.cph;
    var pre = AXK_PRE + 'var xkw=' + jzN(w) + '*time,xky=Math.sin(xkw+' + jzN(ph) + ')+0.35*Math.sin(xkw*1.83+' + jzN(ph * 2) + '),' +
        'xkt=Math.cos(xkw+' + jzN(ph - 0.5) + ')+0.35*Math.cos(xkw*1.83+' + jzN(ph * 2 - 0.5) + ');';
    axk_move(m, pre, 'Math.sin(xkw*0.5+' + jzN(ph) + ')*' + jzN(I.szc * 0.03) + '*xkK', 'xky*' + jzN(I.szc * 0.045) + '*xkK');
    axk_rot(m, I, pre, 'xkt*1.5*xkK', I.cx, I.cy);
} });

/* ---- xkTiltSnap — ずれて直る: the line slowly slips out of true (2.6 s), then is knocked straight again with a small overshoot */
jzReg('hold', 'xkTiltSnap', { apply: function (m) {
    var I = axk_info(m), par = axk_h(I.cs, 731) % 2;
    var pre = AXK_PRE + 'var xkT=time/2.6,xkc=Math.floor(xkT),xku=xkT-xkc,xkdr=(' + par + '+xkc)%2?1:-1,xkv=xku<0.9?Math.pow(xku/0.9,1.4):1-ob((xku-0.9)/0.1,2.4);';
    axk_rot(m, I, pre, 'xkdr*3.4*xkK*xkv', I.cx, I.cy);
    axk_move(m, pre, '0', 'xkv*' + jzN(I.szc * 0.02) + '*xkK');
} });

/* ---- xkStopMotion — コマ撮りゆれ: a slow sway and bob shot on threes (8 poses a second): the line holds each pose like a
   puppet film, every glyph a hair out of place in each pose */
jzReg('hold', 'xkStopMotion', { apply: function (m) {
    var I = axk_info(m), pre = AXK_PRE + 'var xkq=Math.floor(time*8+0.001);';
    axk_move(m, pre, 'xkn(xkq*0.31,' + (I.csn % 977 + 3) + ')*' + jzN(I.szc * 0.06) + '*xkK', 'xkn(xkq*0.37,' + (I.csn % 977 + 11) + ')*' + jzN(I.szc * 0.045) + '*xkK');
    axk_rot(m, I, pre, 'Math.sin(xkq*0.42+' + jzN(I.cph) + ')*2.2*xkK', I.cx, I.cy);
    axk_emit(m, 'Pose', 'var q=Math.floor(time*8+0.001);rot=(hh(q*3.13+i*7.7+SD)*2-1)*1.6*xkK;dy=(hh(q*5.71+i*3.3+SD+9)*2-1)*SZ*0.008*xkK;', { p: I.fs * 0.014, r: 2.6 });
} });

/* ---- xkSlideBunch — 片寄り: the floor tilts; the glyphs slide downhill and crowd at the low end, then it tips the other way */
jzReg('hold', 'xkSlideBunch', { apply: function (m) {
    var I = axk_info(m), T = 'time*' + jzN(AXK_TAU / 4.4) + '+' + jzN(I.cph);
    axk_rot(m, I, AXK_PRE, 'Math.sin(' + T + ')*3*xkK', I.cx, I.cy);
    if (I.single) return;
    axk_emit(m, 'Bunch', I.exU + 'var c=0.15*Math.min(xkK,1.3)*Math.sin(' + T + '-0.9),u=U[i]||0,v=HALF*c*(1-u*u);' + axk_along(I, 'v'), { p: I.half * 0.2 });
} });

/* ---- xkWallBounce — 壁で弾む: the line glides to and fro along its reading axis at a steady pace and rebounds off invisible
   walls, flattening a little against the wall it has just hit */
jzReg('hold', 'xkWallBounce', { apply: function (m) {
    var I = axk_info(m), R = Math.min((I.vert ? m.H : m.W) * 0.028, I.szc * 0.4);
    var pre = AXK_PRE + 'var xkp=time/1.5,xktr=Math.asin(Math.sin(Math.PI*xkp))*2/Math.PI*' + jzN(R) + '*xkK,xkq=0,xksd=1;' +
        'if(xkp>0.5){var xkta=xkfr(xkp-0.5)*1.5;xkq=0.07*xkK*Math.exp(-xkta*9)*Math.cos(xkta*24);xksd=Math.floor(xkp-0.5)%2?-1:1;}';
    if (I.vert) {
        axk_move(m, pre, '0', 'xktr');
        axk_scale(m, I, pre, '(1+xkq*0.5)', '(1-xkq)', I.cx, '(xksd>0?' + jzN(I.y1) + ':' + jzN(I.y0) + ')');
    } else {
        axk_move(m, pre, 'xktr', '0');
        axk_scale(m, I, pre, '(1-xkq)', '(1+xkq*0.5)', '(xksd>0?' + jzN(I.x1) + ':' + jzN(I.x0) + ')', I.cy);
    }
} });

/* ================================================================ optical */

/* ---- xkFocusBreath — ピントの呼吸: every 2.9 s the lens drifts: the text swells a touch, goes soft and dim, then pulls sharp */
jzReg('hold', 'xkFocusBreath', { apply: function (m) {
    var I = axk_info(m), V = 'var xkT=time-0.55,xku=xkT<0?9:xkfr(xkT/2.9)/0.42,xkp=xku>=1?0:Math.pow(Math.max(0,Math.sin(Math.PI*xku)),1.5);';
    axk_scale(m, I, AXK_PRE + V + 'var xkf=1+0.03*xkp*xkK;', 'xkf', 'xkf', I.cx, I.cy);
    m.parts.op.push(AXK_PRE + V + 'f*=1-0.14*xkp*xkKK;');
    var B = Math.min(I.fs * 0.04, 9 * m.u / I.s0);
    jzAnimator(m.L, 'JZ Hold Soft Focus', [['ADBE Text Blur', [B, B]]], axk_hd(m) + V + 'xkp*xkKK*100');
} });

/* ---- xkDoubleVision — 二重像: two faint images of the line slide out sideways from behind it and merge back, like eyes losing
   and finding focus (two linked copies below the lyric, moved screen-horizontally) */
jzReg('hold', 'xkDoubleVision', { apply: function (m) {
    var I = axk_info(m), s, X = I.X;
    if (!axk_main(m, 90) || axk_noCopies(m, I)) return;
    var rr = X.r * Math.PI / 180, c = Math.cos(rr), sn = Math.sin(rr), kx = (X.s[0] / 100) || 1, ky = (X.s[1] / 100) || 1;
    for (s = -1; s <= 1; s += 2) {
        var D = axk_twin(m, 'JZ Hold Double ' + (s < 0 ? 'L' : 'R'), '0.36*xkKK*xkX', true, true);
        jzNoGhost(D);
        jzSetExpr(jzXf(D, 'ADBE Position'), axk_hd(m) + 'var xko=Math.pow(Math.max(0,0.5-0.5*Math.cos(time*' + jzN(AXK_TAU / 3.6) + '+' + jzN(I.cph) + ')),1.6),' +
            'xksx=' + jzN(s * I.szc * 0.085) + '*xkK*xko,xksy=xksx*0.22*Math.sin(time*' + jzN(AXK_TAU / 5.1) + '+' + jzN(I.cph) + '),xka=parent.transform.anchorPoint;' +
            '[xka[0]+(' + jzN(c) + '*xksx+' + jzN(sn) + '*xksy)/' + jzN(kx) + ',xka[1]+(' + jzN(c) + '*xksy-' + jzN(sn) + '*xksx)/' + jzN(ky) + ']');
    }
} });

/* ---- xkReflection — 床の映り込み: the bottom line stands on a glossy floor: a faint mirrored image below it that ripples like
   water (a linked copy flipped about the foot of the last line, faded towards its far end by a feathered mask) */
jzReg('hold', 'xkReflection', { apply: function (m) {
    var I = axk_info(m), fs = I.fs, sq = 0.72;
    if (!axk_main(m, 90) || axk_noCopies(m, I)) return;
    var D = axk_twin(m, 'JZ Hold Reflection', '0.34*xkKK*xkX', true, true), Y0 = I.y1 - fs * 0.03, big = (I.x1 - I.x0) * 2 + fs * 20;
    jzNoGhost(D);
    jzXf(D, 'ADBE Scale').setValue([100, -100 * sq]);
    jzSetExpr(jzXf(D, 'ADBE Position'), '[parent.transform.anchorPoint[0],' + jzN(Y0 + sq * (Y0 - I.X.a[1])) + ']');
    // only the foot of the last line (vertical text: of the last glyph), opaque at the floor and fading away from it
    axk_mask(D, I.x0 - big, I.y1 - fs * 0.5, I.x1 + big, I.y1 + big, 'JZ Reflection Fade', [0, fs * 0.9], null);
    var q = axk_hd(m) + 'var ph=time*2.6+(textIndex-1)*1.3;';
    jzAnimator(D, 'JZ Hold Ripple', [['ADBE Text Position 3D', [fs * 0.014 * 1.6, 0, 0]]], q + 'Math.sin(ph)*xkK/1.6*100');
    jzAnimator(D, 'JZ Hold Ripple Lean', [['ADBE Text Skew', 5]], q + 'Math.sin(ph+1)*xkKK*100');
    jzAnimator(D, 'JZ Hold Ripple Height', [['ADBE Text Scale 3D', [100, 105, 100]]], q + '[0,Math.sin(ph*1.3)*100,0]');
} });

/* ---- xkMarchEdge — 走る破線: a broken contour in the second colour runs round every glyph like the "marching ants" of a
   selection. AE cannot dash a text stroke: an outline-only copy of the lyric is seen through diagonal stripes that keep
   sliding (a dashed fat line as its track matte), which breaks the contour into travelling dashes. */
jzReg('hold', 'xkMarchEdge', { apply: function (m) {
    var I = axk_info(m), fs = I.fs, td = axk_td(m.L), sc = m.ctx.sc;
    if (!td || !axk_main(m, 50) || axk_noCopies(m, I)) return;
    var filled = td.applyFill !== false, c0 = axk_c0(m.L, td), col = axk_acc(m, c0);
    if (filled && (jzLum(c0) > 0.5) === (jzLum(col) > 0.5) && axk_cdist(col, c0) < 0.3 && axk_isHex(sc.bg)) col = sc.bg;
    var lw = Math.max(1.5 * m.u / I.s0, fs * (filled ? 0.028 : 0.034)), d = fs * 0.11;
    var T = axk_twin(m, 'JZ Hold March', 'xkKK*xkX', false, false);
    jzNoGhost(T);
    jzTextDoc(T, function (q) {
        q.applyFill = false; q.applyStroke = true; q.strokeColor = jzHex(col); q.strokeWidth = lw;
    });
    var S = axk_matte(m, T, 'JZ Hold March Matte'), g = jzGrp(S, 'stripes');
    var Dg = Math.sqrt((I.x1 - I.x0) * (I.x1 - I.x0) + (I.y1 - I.y0) * (I.y1 - I.y0)) / 2 + fs * 1.5;
    jzAddPath(g, [[-Dg, 0], [Dg, 0]], false);
    var st = jzAddStroke(g, '#FFFFFF', Dg * 2), DS = st.property('ADBE Vector Stroke Dashes'), p;
    try { p = DS.addProperty('ADBE Vector Stroke Dash 1'); p.setValue(d); } catch (e1) { jzWarn('hold xkMarchEdge: ' + e1.toString()); }
    try { p = DS.addProperty('ADBE Vector Stroke Gap 1'); p.setValue(d * 0.8); } catch (e2) { jzWarn('hold xkMarchEdge: ' + e2.toString()); }
    try { p = DS.addProperty('ADBE Vector Stroke Offset'); jzSetExpr(p, axk_hd(m) + '-time*SZ*0.42*(0.4+0.6*xkKK)'); } catch (e3) { jzWarn('hold xkMarchEdge: ' + e3.toString()); }
    jzGX(g).property('ADBE Vector Position').setValue([I.cx, I.cy]);
    jzGX(g).property('ADBE Vector Rotation').setValue(45);
} });

/* ---- xkHeatHaze — 陽炎: the line shimmers as if seen through rising hot air: horizontal slices waver in a travelling ripple
   (Wave Warp: a sine of the browser's wavelength and speed + a smaller smooth-noise wave; vertical text: vertical slices) */
jzReg('hold', 'xkHeatHaze', { apply: function (m) {
    var I = axk_info(m), fs = I.fs, ext = (I.vert ? I.x1 - I.x0 : I.y1 - I.y0) + fs * 0.24, HD = axk_hd(m), k;
    var W = [[1, 0.7, ext / 9 * AXK_TAU / 0.85, 4.2 / AXK_TAU, 'JZ Hold Haze'], [9, 0.5, ext / 9 / 0.6 * 2, 0.85, 'JZ Hold Haze Flutter']];
    for (k = 0; k < W.length; k++) {
        var ww = jzEffect(m.L, 'ADBE Wave Warp', W[k][4]);
        jzEP(ww, 1, W[k][0]); jzEP(ww, 3, Math.max(4, W[k][2])); jzEP(ww, 4, I.vert ? 90 : 0); jzEP(ww, 5, W[k][3]); jzEP(ww, 6, 1);
        jzEX(ww, 2, HD + 'SZ*0.03*' + jzN(W[k][1]) + '*xkK');
    }
} });

/* ---- xkSplitShear — 上下すれ違い: every 2.4 s the upper and lower halves of the line glide past each other and lock back
   together (vertical text: the left and right halves, up and down). The lyric keeps the first half (mask, switched off by its
   expansion while resting), a linked copy shows the second; each is moved by a Transform effect. */
jzReg('hold', 'xkSplitShear', { apply: function (m) {
    var I = axk_info(m), L = m.L, fs = I.fs, par = axk_h(I.cs, 751) % 2;
    if (axk_noCopies(m, I) || axk_nMask(L) > 0) return;
    var V = axk_hd(m) + 'var xkT=time-0.4,xkc=Math.floor(xkT/2.4),xku=xkT<0?9:xkT-xkc*2.4,xkdr=(' + par + '+xkc)%2?1:-1,' +
        'xkv=xku>=1?0:(xku<0.3?oc(xku/0.3):(xku<0.7?1:1-xkio((xku-0.7)/0.3))),xkd=xkdr*SZ*0.055*xkK*xkv,xkon=Math.abs(xkd)>=' + jzN(0.3 * m.u / I.s0) + '&&PO<=0;';
    var big = (I.x1 - I.x0) + (I.y1 - I.y0) + fs * 20, eps = fs * 0.006, off = I.vert ? '[0,xkon?xkd:0]' : '[xkon?xkd:0,0]', off2 = I.vert ? '[0,xkon?-xkd:0]' : '[xkon?-xkd:0,0]';
    var D = axk_twin(m, 'JZ Hold Shear', 'xkon?1:0', false, true);
    jzSetExpr(jzXf(D, 'ADBE Opacity'), V + 'value*(xkon?1:0)');
    if (I.vert) {
        axk_mask(L, I.x0 - big, I.y0 - big, I.cx + eps, I.y1 + big, 'JZ Shear Half', 0, V + 'xkon?0:1e4');
        axk_mask(D, I.cx - eps, I.y0 - big, I.x1 + big, I.y1 + big, 'JZ Shear Half', 0, null);
    } else {
        axk_mask(L, I.x0 - big, I.y0 - big, I.x1 + big, I.cy + eps, 'JZ Shear Half', 0, V + 'xkon?0:1e4');
        axk_mask(D, I.x0 - big, I.cy - eps, I.x1 + big, I.y1 + big, 'JZ Shear Half', 0, null);
    }
    axk_shift(L, 'JZ Hold Shear', V + off);
    axk_shift(D, 'JZ Hold Shear', V + off2);
} });

/* ================================================================ loudness-driven (no audio analysis here: the browser's slow swell) */

/* ---- xkLevelFill — 音量の水位: the glyphs are vessels: the second colour stands in them like a liquid and its level follows
   the loudness (a linked copy in the second colour behind a mask whose upper edge is the level). Outline text, matted text
   and crowded comps swell with the loudness instead (the browser's fallback). */
jzReg('hold', 'xkLevelFill', { apply: function (m) {
    var I = axk_info(m), td = axk_td(m.L), fs = I.fs, h = I.y1 - I.y0;
    if (!td || td.applyFill === false || axk_noCopies(m, I)) { axk_swell(m, I, 1.3, 0.035); return; }
    var acc = axk_acc(m, jzTextColor(m.L)), big = (I.x1 - I.x0) * 2 + fs * 20;
    var T = axk_twin(m, 'JZ Hold Level', 'xkX', false, true);
    jzNoGhost(T);
    jzAnimator(T, 'JZ Hold Level Colour', [['ADBE Text Fill Color', jzHex(acc)]], '100');
    axk_mask(T, I.x0 - big, I.y1, I.x1 + big, I.y1 + big, 'JZ Level', [0, Math.max(1, h * 0.03)],
        axk_hd(m) + jzN(h) + '*(0.12+0.8*xklv(1.3,' + I.csn + '))*xkKK');
} });

/* ---- xkLoudWeight — 音圧で太る: the strokes put on weight with the loudness: the type goes from its own weight to extra bold
   and back (a Stroke Width animator in the text's own colour; text that already has an outline over a fill swells instead) */
jzReg('hold', 'xkLoudWeight', { apply: function (m) {
    var I = axk_info(m), L = m.L, td = axk_td(L), fs = I.fs;
    if (!td || (td.applyStroke && td.strokeWidth > 0 && td.applyFill !== false)) { axk_swell(m, I, 2.1, 0.04); return; }
    var q = axk_hd(m) + 'var xkw=Math.min(0.08,0.065*xklv(2.1,' + I.csn + ')*xkK)/0.08*100;';
    if (td.applyFill === false) { jzAnimator(L, 'JZ Hold Weight', [['ADBE Text Stroke Width', fs * 0.08]], q + 'xkw'); return; }
    jzTextDoc(L, function (d) {
        d.applyStroke = true; d.strokeWidth = 0;
        try { d.strokeColor = d.fillColor; } catch (e) {}
        try { d.strokeOverFill = false; } catch (e2) {}
    });
    // s0 > 0.5: a treatment gave the text its own outline afterwards -> leave it alone
    jzAnimator(L, 'JZ Hold Weight', [['ADBE Text Stroke Width', fs * 0.08]], q + 'var s0=0;try{s0=text.sourceText.style.strokeWidth;}catch(err){}s0>0.5?0:xkw');
} });

/* ---- xkLoudArch — 音圧アーチ: the baseline bows upward with the loudness: a flat line when quiet, a proud arch when loud
   (glyphs follow the slope; one glyph per layer: each layer takes its place on the arch) */
jzReg('hold', 'xkLoudArch', { apply: function (m) {
    var I = axk_info(m), LV = 'xklv(1.7,' + I.csn + ')';
    if (!I.single && I.G.nk < 2) { axk_swell(m, I, 1.7, 0.04); return; }
    if (I.single) {
        var u = I.mi / Math.max(1, I.N - 1) * 2 - 1, pre = AXK_PRE + 'var xklo=' + LV + ';';
        axk_move(m, pre, '0', '-' + jzN(I.szc * 0.26 * 0.7 * (0.5 - u * u)) + '*xklo*Math.min(xkK,1.3)');
        m.parts.rot.push(pre + 'r+=' + jzN(u * 7) + '*xklo*xkK;');
        return;
    }
    axk_emit(m, 'Arch', I.exU + 'var A0=SZ*0.26*' + LV + '*Math.min(xkK,1.3),u=U[i]||0,v=-A0*(0.5-u*u);' + axk_across(I, 'v') +
        (I.vert ? '' : 'rot=Math.atan(Math.min(0.35,2*A0/HALF)*u)*57.2958;'), { p: I.fs * 0.18, r: I.vert ? 0 : 20 });
} });

/* ================================================================ per-glyph sequences */

/* ---- xkMagnifier — 虫めがね: an invisible lens travels to and fro along the line; glyphs under it swell (standing on the
   baseline) and push their neighbours aside */
jzReg('hold', 'xkMagnifier', { apply: function (m) {
    var I = axk_info(m);
    axk_emit(m, 'Lens', 'var tot=' + I.exTot + ',per=1.6+tot*0.3,pos=(tot+1)*(0.5-0.5*Math.cos(time*6.2832/per))-1,d=' + I.exIdx + '-pos,w=Math.exp(-d*d/1.3),kk=Math.min(xkK,1.2),' +
        'push=' + (I.single ? '0' : 'xkth(d/1.1)*(1-Math.exp(-d*d*4))*SZ*0.2*kk*cl(1.6-Math.abs(d)*0.12)') + ',s=1+' + (I.single ? '0.13' : '0.24') + '*kk*w;sx=sy=s;' +
        (I.vert ? 'dy=push;' : 'dx=push;dy=-(s-1)*SZ*0.3;'), { p: I.fs * 0.4, s: 1 });
} });

/* ---- xkNod — 順にうなずく: one glyph after another bows forward from its foot and straightens up, a beat apart */
jzReg('hold', 'xkNod', { apply: function (m) {
    var I = axk_info(m), nv = I.VI.length;
    if (!nv) return;
    var gi = I.single ? '(((xkbi%' + I.N + ')+' + I.N + ')%' + I.N + '==' + I.mi + '?VI[0]:-1)' : 'VI[xkbi%' + nv + ']';
    axk_emit(m, 'Nod', axk_beat(m, 0.5) + 'var VI=' + axk_arr(I.VI) + ',u=xkbs/Math.min(xkB*0.95,0.6),gi=' + gi + ';' +
        'if(u<1&&i==gi){var hv=u<0.35?oc(u/0.35):Math.cos((u-0.35)/0.65*Math.PI*1.5)*Math.exp(-(u-0.35)*3.2),th=17*xkK*hv*Math.PI/180;' +
        'dx=SZ*0.5*Math.sin(th);dy=SZ*0.5*(1-Math.cos(th));rot=th*57.2958;}', { p: I.fs * 0.26, r: 28 });
} });

/* ---- xkKaraoke — カラオケ塗り: the second colour wipes through the line from its first glyph to its last, stays a moment and
   drains the same way (a linked copy in the second colour seen through a rectangle matte whose two edges travel; crowded
   comps / one glyph per layer: the glyphs take the colour one after another instead) */
jzReg('hold', 'xkKaraoke', { apply: function (m) {
    var I = axk_info(m), L = m.L, td = axk_td(L), fs = I.fs, per = jzClamp(1.5 + I.N * 0.16, 2.2, 4), i;
    if (!td || !axk_main(m, 50)) return;
    var acc = axk_acc(m, axk_c0(L, td)), pad = fs * 0.2;
    var x0 = I.x0 - pad, y0 = I.y0 - pad, w = I.x1 - I.x0 + pad * 2, h = I.y1 - I.y0 + pad * 2;
    var V = 'var xkT=time-0.25,xku=xkT<0?0:xkfr(xkT/' + jzN(per) + '),xkF=xkT<0?0:xkis(cl(xku/0.5)),xkTl=xkT<0?0:xkis(cl((xku-0.62)/0.38));' +
        (I.single ? 'xkF=cl(xkF*' + I.N + '-' + I.mi + ');xkTl=cl(xkTl*' + I.N + '-' + I.mi + ');' : '');
    var cols = [['ADBE Text Fill Color', jzHex(acc)]];
    if (td.applyFill === false || !(td.applyStroke && td.strokeWidth > 0)) cols.push(['ADBE Text Stroke Color', jzHex(acc)]);
    if (axk_noCopies(m, I)) {
        var PP = [], gw = I.single ? 1 : jzClamp(fs / Math.max(1, I.vert ? h : w), 0.02, 1);
        for (i = 0; i < I.G.n; i++) PP.push(I.single ? 0.5 : (I.vert ? (I.G.g[i].y - y0) / h : (I.G.g[i].x - x0) / w));
        jzAnimator(L, 'JZ Hold Karaoke', cols, axk_hd(m) + V + 'var PP=' + axk_arr(PP) + ',p=PP[textIndex-1];p=p==null?0.5:p;(cl((xkF-p)/' + jzN(gw) + '+0.5)-cl((xkTl-p)/' + jzN(gw) + '+0.5))*xkKK*100');
        return;
    }
    var T = axk_twin(m, 'JZ Hold Karaoke', 'xkKK*xkX', false, true);
    jzNoGhost(T);
    jzAnimator(T, 'JZ Hold Karaoke Colour', cols, '100');
    var S = axk_matte(m, T, 'JZ Hold Karaoke Matte'), g = jzGrp(S, 'fill'), rc = jzAddRect(g, w, h, 0), HD = axk_hd(m) + V;
    jzSetExpr(rc.property('ADBE Vector Rect Size'), HD + (I.vert ? '[' + jzN(w) + ',' + jzN(h) + '*Math.max(0,xkF-xkTl)]' : '[' + jzN(w) + '*Math.max(0,xkF-xkTl),' + jzN(h) + ']'));
    jzSetExpr(rc.property('ADBE Vector Rect Position'), HD + (I.vert ? '[' + jzN(x0 + w / 2) + ',' + jzN(y0) + '+' + jzN(h) + '*(xkTl+xkF)/2]' : '[' + jzN(x0) + '+' + jzN(w) + '*(xkTl+xkF)/2,' + jzN(y0 + h / 2) + ']'));
    jzAddFill(g, '#FFFFFF');       // after the rect is set up (adding the fill invalidates rc in AE)
} });

/* ---- xkPairUp — 寄り添う: neighbours lean together two by two; then everyone lets go and pairs up with the neighbour on the
   other side */
jzReg('hold', 'xkPairUp', { apply: function (m) {
    var I = axk_info(m), dur = m.c.dur || 1.5, n = Math.max(1, Math.round(dur / 1.5)), per = dur / n;
    if (!(per > 1 && per < 2.25)) per = 1.5;
    axk_emit(m, 'Pair', I.exCI + 'function xksd(ci,n,par){return ((ci-par)%2+2)%2==0?(ci+1<n?1:0):(ci-1>=par?-1:0);}' +
        'var T=time/' + jzN(per) + ',cyc=Math.floor(T),e=xkio(cl((T-cyc)/0.4)),ci=' + I.exCi + ',nl=' + I.exNl + ',v=xksd(ci,nl,(cyc+1)%2)*(1-e)+xksd(ci,nl,cyc%2)*e;' +
        (I.vert ? 'dy=v*SZ*0.06*xkK;' : 'dx=v*SZ*0.06*xkK;rot=v*5*xkK;'), { p: I.fs * 0.1, r: I.vert ? 0 : 8 });
} });

/* ---- xkRippleOut — 波紋: every 2.3 s a drop lands on one glyph; a ring travels outward along the line both ways, lifting
   each glyph as it passes */
jzReg('hold', 'xkRippleOut', { apply: function (m) {
    var I = axk_info(m), span = Math.max(3, Math.min(I.N, 16)) * 0.075;
    axk_emit(m, 'Ripple', 'var T=time-0.3,cyc=Math.floor(T/2.3),e0=hh(cyc*9.17+' + I.csn + '+1),d=Math.abs(' + I.exOrd + '-e0),tau=T<0?0:T-cyc*2.3-d*' + jzN(span * 2.2) + ',' +
        'y=tau<=0?0:Math.exp(-tau*3)*Math.sin(tau*12)/(1+d*1.4);' + axk_across(I, '-y*SZ*0.17*xkK') + 'sx=sy=1+0.06*y*xkK;', { p: I.fs * 0.28, s: 1 });
} });

/* ---- xkZigzagFlip — 互い違い拍: odd glyphs sit a little high, even ones a little low, and on every beat they trade places
   with a snap */
jzReg('hold', 'xkZigzagFlip', { apply: function (m) {
    var I = axk_info(m);
    axk_emit(m, 'Zigzag', I.exCI + axk_beat(m, 0.55) + 'var to=xkbi%2?1:-1,v=(-to+2*to*ob(cl(xkbs/0.16),2.4))*SZ*0.042*xkK*(' + I.exCi + '%2?1:-1);' + axk_across(I, 'v'),
        { p: I.fs * 0.1 });
} });

/* ---- xkSpinOne — 一字くるり: every 1.5 s a single glyph turns one full turn on the spot, like a coin spun on a table, and
   settles (at low motion it only rocks) */
jzReg('hold', 'xkSpinOne', { apply: function (m) {
    var I = axk_info(m), nv = I.VI.length, full = jzClamp(m.ctx.fx.motion / 0.7, 0, 1.6) >= 0.4;
    if (!nv) return;
    var gi = I.single ? '(pk%' + I.N + '==' + I.mi + '?VI[0]:-1)' : 'VI[pk%' + nv + ']';
    axk_emit(m, 'Spin', 'var VI=' + axk_arr(I.VI) + ',T=time-0.35,cyc=Math.floor(T/1.5),u=T<0?9:(T-cyc*1.5)/0.8,pk=Math.floor(hh(cyc*5.3+' + I.csn + '+0.25)*10007),gi=' + gi +
        ',dr=hh(cyc*7.9+' + I.csn + '+3)<0.5?1:-1;if(u<1&&i==gi){rot=' + (full ? 'dr*360*xkio(u)*AMT' : 'dr*14*xkK*Math.sin(6.2832*u)') + ';sx=sy=1+0.12*Math.sin(Math.PI*u)*xkKK;}',
        { r: full ? 360 : 23, s: 1 });
} });

/* ---- xkBlink — まばたき: every 2.5 s the whole line blinks like an eye: the glyphs shut to a slit in a quick ripple and open
   again, sometimes twice */
jzReg('hold', 'xkBlink', { apply: function (m) {
    var I = axk_info(m);
    axk_emit(m, 'Blink', 'function xksh(x){return x>0&&x<0.2?Math.pow(Math.sin(Math.PI*x/0.2),0.8):0;}' +
        'var T=time-0.7,cyc=Math.floor(T/2.5),tau=T-cyc*2.5,tw=hh(cyc*4.7+' + I.csn + '+2)<0.4,x=tau-' + I.exOrd + '*0.09,c=0;' +
        'if(T>=0&&tau<=0.75){c=Math.max(xksh(x),tw?xksh(x-0.3):0);}sy=1-0.62*xkKK*c;', { s: 1 });
} });

/* ---- xkStairStep — 階段送り: the glyphs stand on a three-step staircase that moves along the line one glyph per tick, in
   hard steps */
jzReg('hold', 'xkStairStep', { apply: function (m) {
    var I = axk_info(m);
    axk_emit(m, 'Stair', I.exCI + axk_beat(m, 0.375) + 'function xkl3(ci,b){return ((ci-b)%3+3)%3-1;}' +
        'var e=cl(xkbs/0.07),ci=' + I.exCi + ',v=-(xkl3(ci,xkbi-1)*(1-e)+xkl3(ci,xkbi)*e)*SZ*0.05*xkK;' + axk_across(I, 'v'), { p: I.fs * 0.09 });
} });

/* ---- xkBigSmall — 大小交代: every other glyph grows while its neighbours shrink, all standing on the baseline; then they
   trade sizes */
jzReg('hold', 'xkBigSmall', { apply: function (m) {
    var I = axk_info(m);
    axk_emit(m, 'Swap', I.exCI + 'var v=Math.max(-1,Math.min(1,Math.sin(time*' + jzN(AXK_TAU / 3.2) + '+' + jzN(I.cph) + ')*1.7))*0.1*Math.min(xkK,1.3),s=1+(' + I.exCi + '%2?v:-v);sx=sy=s;' +
        (I.vert ? '' : 'dy=-(s-1)*SZ*0.36;'), { p: I.vert ? 0 : I.fs * 0.05, s: 1 });
} });

/* ---- xkCradle — 振り子玉: like Newton's cradle: the last glyph of each line swings out and falls back, the knock runs
   through the line, and the first one swings out */
jzReg('hold', 'xkCradle', { apply: function (m) {
    var I = axk_info(m), G = I.G, RO = [], first = [], last = [], i, g;
    // role per glyph: 1 = first of its line, 2 = last, 3 = alone, 0 = in between (spaces: 0)
    if (I.single) RO.push(I.mi <= 0 ? 1 : (I.mi >= I.N - 1 ? 2 : 0));
    else {
        for (i = 0; i < G.n; i++) { g = G.g[i]; if (g.sp) continue; var li = I.vert ? 0 : g.li; if (first[li] == null) first[li] = i; last[li] = i; }
        for (i = 0; i < G.n; i++) { g = G.g[i]; var l2 = I.vert ? 0 : g.li; RO.push(g.sp ? 0 : (first[l2] === last[l2] ? 3 : (i === first[l2] ? 1 : (i === last[l2] ? 2 : 0)))); }
    }
    axk_emit(m, 'Cradle', axk_beat(m, 0.62) + 'var RO=' + axk_arr(RO) + ',ro=RO[i]||0,end=xkbi%2?-1:1,u=xkbs/xkB,sw=Math.sin(Math.PI*u),th=13*xkK*sw*Math.PI/180,kn=Math.exp(-u*14)*SZ*0.012*xkK;' +
        'if(ro==3){' + (I.vert ? '' : 'rot=end*sw*3*xkK;') + '}else if(ro==(end>0?2:1)){var out=end*SZ*1.25*Math.sin(th),up=-SZ*1.25*(1-Math.cos(th));' +
        (I.vert ? 'dy=out;dx=-up;' : 'dx=out;dy=up;rot=-end*th*57.2958;') + '}else{' + (I.vert ? 'dy=end*kn;' : 'dx=end*kn;') + '}',
        { p: I.fs * 0.47, r: I.vert ? 0 : 21 });
} });
