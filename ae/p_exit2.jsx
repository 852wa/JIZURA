// ================================================================ pack exit 2 (AE port of src/11p_exit.js, pack exitHold)
// exits: splitApart vSliceDrop melt dissolve backspace scrambleOut glitchDissolve echoOut whipOut gravity popOut burn sweepCover shatterLite
// holds: float sway pulse shimmer colorRun rotateSlow trackBreathe skewWobble beatHop hWave heartbeat orbitSmall jelly scanBand
//        noiseDrift tilt zoomSlow stretchPulse glitchJump echoTrail
// Exits run on PO (exit progress 0..1); holds scale by AMT x motionK (browser: amt x clamp(fx.motion / 0.7, 0, 1.6)).
// Per-glyph motion = text animators with Expression Selectors. Splits = linked copies of the lyric layer (parented to it, made
// when the exit is applied, alive only during the exit) clipped by layer masks and moved by a Transform effect, so each clip
// travels with its piece (masks come before effects). Helper graphics the browser draws with ghost off (crack line, cursor,
// blocks, bursts, embers, bars, scan line) are shape layers in the text layer's own space (parented to it) marked jzNoGhost.
// Masks that must stay inactive outside the exit / hold use mask expansion 1e4 (= everything) like riseMask.

// ---------------------------------------------------------------- shared helpers (ex2_*)
// expression helpers (prefixed so they never collide with other packs' snippets in the merged transform expressions)
var EX2_FNS = 'function x2sm(a,b,x){x=cl((x-a)/(b-a));return x*x*(3-2*x);}' +
    'function x2io(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}' +
    'function x2ios(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}' +
    'function x2o2(x){x=cl(x);return 1-(1-x)*(1-x);}' +
    'function x2vn(x,s){var i=Math.floor(x),f=x-i,u=f*f*(3-2*f),a=hh(i*1.618+s*0.7311)*2-1,b=hh((i+1)*1.618+s*0.7311)*2-1;return a+(b-a)*u;}' +
    'function x2w(p,o,s){return cl((p-o*s)/(1-s));}\n';
// hold amount: AMT (0 during the entrance, 1 while holding, fades with the exit) x motionK
var EX2_K = 'var x2k=AMT*Math.max(0,Math.min(1.6,M/0.7));';
var EX2_POOL = '※◆◇■□▲△▼●○◎＃＊＋×÷＝≠∞§†01／＼＜＞';

function ex2_hd(m) { return m.HD + EX2_FNS; }
// the browser's J.h / J.r so seeded choices match the web version
function ex2_h(a, b, c, d, e) {
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
function ex2_r(a, b, c, d, e) { return ex2_h(a, b, c, d, e) / 4294967296; }
function ex2_rs(a, b, c, d, e) { return ex2_r(a, b, c, d, e) * 2 - 1; }
function ex2_bit(m, k) { return (ex2_h(m.c.seed | 0, k, 991) & 1) === 1; }          // browser cutBit(env, k)
function ex2_itSeed(m) { return ex2_h(m.c.seed | 0, (m.o.mi | 0) + 1, 7) | 0; }     // browser it.seed
function ex2_arr(a) { var s = [], i; for (i = 0; i < a.length; i++) s.push(jzN(a[i])); return '[' + s.join(',') + ']'; }
function ex2_pts(a) { var s = [], i; for (i = 0; i < a.length; i++) s.push('[' + jzN(a[i][0]) + ',' + jzN(a[i][1]) + ']'); return '[' + s.join(',') + ']'; }
function ex2_col(hex) { var c = jzHex(hex); return '[' + jzN(c[0]) + ',' + jzN(c[1]) + ',' + jzN(c[2]) + ',1]'; }
function ex2_isHex(c) { return typeof c === 'string' && c.charAt(0) === '#' && (c.length === 7 || c.length === 4); }
function ex2_pick(a, b, c) { if (ex2_isHex(a)) return a; if (ex2_isHex(b)) return b; if (ex2_isHex(c)) return c; return '#FFFFFF'; }
function ex2_mix(a, b, t) {
    var A = jzHex(a), B = jzHex(b), i, o = [];
    for (i = 0; i < 3; i++) o.push(Math.round((A[i] + (B[i] - A[i]) * t) * 255));
    return jzToHex(o[0], o[1], o[2]);
}
// string literal with every non-ASCII character escaped (expression text stays ASCII)
function ex2_esc(s) {
    var o = '', i, c, h;
    for (i = 0; i < s.length; i++) {
        c = s.charCodeAt(i);
        if (c < 128 && c !== 34 && c !== 92) o += s.charAt(i);
        else { h = c.toString(16).toUpperCase(); while (h.length < 4) h = '0' + h; o += '\\u' + h; }
    }
    return '"' + o + '"';
}
function ex2_isSp(ch) { return /^[\s　]$/.test(ch); }
function ex2_td(L) { try { return L.property('ADBE Text Properties').property('ADBE Text Document').value; } catch (e) { return null; } }
function ex2_sz(m) { var td = ex2_td(m.L); return (td && td.fontSize > 1) ? td.fontSize : (m.size || 100); }
function ex2_hasOut(m) { return (m.c.outDur || 0) > 0.002; }
function ex2_T(m) { var c = m.c; return { IN: Math.max(0.02, c.inDur || 0.3), DL: (m.o.mi || 0) * (c.stagger || 0.04), OS: c.dur - (c.outDur || 0) }; }
function ex2_matted(L) { try { return L.trackMatteType !== TrackMatteType.NO_TRACK_MATTE; } catch (e) { return false; } }
function ex2_nMask(L) { try { return L.property('ADBE Mask Parade').numProperties; } catch (e) { return 0; } }
// the layer new helper layers go above (above the lyric's own track matte when it has one)
function ex2_top(m) { var L = m.L; if (ex2_matted(L)) { try { return m.ctx.comp.layer(L.index - 1); } catch (e) {} } return L; }
// glyph count of this layer / of the whole cut
function ex2_nGl(m) { var td = ex2_td(m.L); return td ? jzCount(String(td.text)) : 1; }
function ex2_cutN(m) { return Math.max(1, jzCount(m.c.text || '')); }
function ex2_single(m) { return ex2_nGl(m) <= 1 && ex2_cutN(m) > 1; }
// one glyph per line (the panel's vertical text)
function ex2_isVert(L) {
    var td = ex2_td(L); if (!td) return false;
    var ls = String(td.text).split(/\r\n|\r|\n|\u0003/), i;
    if (ls.length < 2) return false;
    for (i = 0; i < ls.length; i++) if (jzChars(ls[i]).length > 1) return false;
    return true;
}
// helper layers are skipped for very long lines, for one-glyph-per-layer layouts of long lyrics (decided per cut, so every
// glyph of the cut is built the same way) and when the comp is already crowded
function ex2_crowded(m, maxCut) {
    if (ex2_nGl(m) > 60) return true;
    if (ex2_nGl(m) <= 1 && ex2_cutN(m) > (maxCut || 14)) return true;
    try { return m.ctx.comp.numLayers > 60; } catch (e) { return false; }
}
// the text box at rest (after the entrance; animators are included by sourceRectAtTime in AE)
function ex2_rect(m) {
    var t = ex2_T(m), tt = Math.min(Math.max(0, t.OS - 0.01), t.DL + t.IN + 0.01);
    try { return m.L.sourceRectAtTime(tt, false); } catch (e) { return jzRect(m.L); }
}
// layout animators that move glyphs (not this panel's own motion) / text on a path
function ex2_arranged(L) {
    var TP = L.property('ADBE Text Properties'), i, j;
    try { if (TP.property('ADBE Text Path Options').property('ADBE Text Path').value > 0) return true; } catch (e0) {}
    try {
        var A = TP.property('ADBE Text Animators');
        for (i = 1; i <= A.numProperties; i++) {
            var an = A.property(i), nm = String(an.name || '');
            if (/^JZ (In|Hold|Out)/.test(nm)) continue;
            var pr = an.property('ADBE Text Animator Properties');
            for (j = 1; j <= pr.numProperties; j++) { var mn = pr.property(j).matchName; if (mn === 'ADBE Text Position 3D' || mn === 'ADBE Text Rotation' || mn === 'ADBE Text Scale 3D') return true; }
        }
    } catch (e1) {}
    return false;
}
function ex2_meas(T, L, s, just) {
    var d = L.property('ADBE Text Properties').property('ADBE Text Document').value;
    d.text = s; d.justification = just;
    T.property('ADBE Text Properties').property('ADBE Text Document').setValue(d);
    var q = T.sourceRectAtTime(0, false);
    return { l: q.left, r: q.left + q.width };
}
// Geometry of the lyric in the text layer's own space.
//   G.fs, G.lead, G.rect, G.vert (one glyph per line), G.nL, G.lines[{cy, x0, x1, chars}],
//   G.g[] per AE character (textIndex order, spaces included): {i, li, sp, k (rank among non-spaces), x0, x1, cx, cy, w}, G.N = textTotal,
//   G.nv non-space count, G.arranged (layout animators / text on a path). measure: exact glyph boxes with a temporary text layer.
function ex2_geo(m, measure) {
    var L = m.L, TP = L.property('ADBE Text Properties'), td = TP.property('ADBE Text Document').value, i, j;
    var fs = td.fontSize, lead = (!td.autoLeading && td.leading > 0) ? td.leading : fs * 1.2;
    var lines = String(td.text).split(/\r\n|\r|\n|\u0003/), nL = lines.length, r = ex2_rect(m);
    var G = { fs: fs, lead: lead, nL: nL, rect: r, g: [], lines: [], N: 0, nv: 0, vert: nL > 1, arranged: ex2_arranged(L) };
    var inkH = r.height - (nL - 1) * lead; if (!(inkH > fs * 0.3 && inkH < fs * 2)) inkH = fs * 0.9;
    var cy0 = r.top + inkH / 2, trk = (td.tracking || 0) / 1000 * fs;
    for (i = 0; i < nL; i++) { var cs0 = jzChars(lines[i]); if (cs0.length > 1) G.vert = false; G.lines.push({ chars: cs0, cy: cy0 + i * lead, x0: r.left, x1: r.left + r.width }); }
    var T = null;
    if (measure && !G.arranged && jzCount(td.text) <= 60) { try { T = m.ctx.comp.layers.addText('x'); } catch (e3) { T = null; } }
    var LEFT = ParagraphJustification.LEFT_JUSTIFY;
    try {
        for (i = 0; i < nL; i++) {
            var ln = G.lines[i], cs = ln.chars, n = cs.length;
            if (!n) continue;
            var F = null, F0 = null, off = 0, prev = 0;
            if (T && !G.vert) {
                F = ex2_meas(T, L, lines[i], td.justification); ln.x0 = F.l; ln.x1 = F.r;
                if (n > 1) { F0 = ex2_meas(T, L, lines[i], LEFT); off = F.l - F0.l; }
                prev = F.l - trk;
            } else if (!G.vert) {
                var wEst = r.width / Math.max(1, n), lx = r.left + (r.width - wEst * n) / 2;
                ln.x0 = lx; ln.x1 = lx + wEst * n; prev = lx - trk;
            }
            for (j = 0; j < n; j++) {
                var sp = ex2_isSp(cs[j]), x0, x1;
                if (G.vert) { x0 = r.left; x1 = r.left + r.width; }
                else if (T) {
                    x0 = prev + trk;
                    x1 = (j === n - 1) ? F.r : off + ex2_meas(T, L, cs.slice(0, j + 1).join(''), LEFT).r;
                    if (x1 < x0) x1 = x0;
                    prev = x1;
                } else { x0 = prev + trk; x1 = x0 + (r.width + trk) / Math.max(1, n) - trk; prev = x1; }
                var gi = { i: G.N, li: i, sp: sp, k: sp ? -1 : G.nv, x0: x0, x1: x1, cx: (x0 + x1) / 2, cy: ln.cy, w: Math.max(1, x1 - x0) };
                if (G.vert) { gi.w = Math.min(r.width, fs); gi.x0 = gi.cx - gi.w / 2; gi.x1 = gi.cx + gi.w / 2; }
                if (!sp) G.nv++;
                G.g.push(gi); G.N++;
            }
        }
    } catch (e4) { jzWarn('ex2 geometry: ' + e4.toString()); }
    if (T) { try { T.remove(); } catch (e5) {} }
    return G;
}
// reading lines with glyphs: [{li, x0, x1, cy}] (vertical text = one column)
function ex2_lines(G) {
    var r = G.rect, out = [], i, j;
    if (G.vert) return [{ li: 0, x0: r.left, x1: r.left + r.width, y0: r.top, y1: r.top + r.height, cy: r.top + r.height / 2, cx: r.left + r.width / 2 }];
    for (i = 0; i < G.nL; i++) {
        var u0 = 1e9, u1 = -1e9;
        for (j = 0; j < G.N; j++) { var g = G.g[j]; if (g.li !== i || g.sp) continue; if (g.x0 < u0) u0 = g.x0; if (g.x1 > u1) u1 = g.x1; }
        if (u1 > u0) out.push({ li: i, x0: u0, x1: u1, y0: G.lines[i].cy - G.fs * 0.5, y1: G.lines[i].cy + G.fs * 0.5, cy: G.lines[i].cy, cx: (u0 + u1) / 2 });
    }
    return out;
}
// polygon mask in the layer's space; intersect = combine with masks the layer already has (enter / layout masks)
function ex2_mask(Lx, pts, intersect, name, expEx, mode) {
    var mk = Lx.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = pts; sh.closed = true;
    mk.property('ADBE Mask Shape').setValue(sh);
    try { if (name) mk.name = name; } catch (e0) {}
    try { if (mode) mk.maskMode = mode; else if (intersect) mk.maskMode = MaskMode.INTERSECT; } catch (e1) {}
    if (expEx) jzSetExpr(mk.property('ADBE Mask Offset'), expEx);
    return mk;
}
function ex2_box(x0, y0, x1, y1) { return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; }
// trim a helper layer to the exit (t0 = exit start)
function ex2_life(Lx, t0) { try { if (t0 > Lx.inPoint + 0.01 && t0 < Lx.outPoint - 0.02) Lx.inPoint = t0; } catch (e) {} }
// helper shape layer in the text layer's own space (parented to it); above = layer to go right above (default: lyric / its matte)
function ex2_shape(m, name, above, below, exitOnly) {
    var L = m.L, S = m.ctx.comp.layers.addShape();
    try { S.name = name; } catch (e0) {}
    try { if (below) S.moveAfter(L); else S.moveBefore(above || ex2_top(m)); } catch (e1) {}
    S.parent = L;
    var tr = S.property('ADBE Transform Group');
    tr.property('ADBE Anchor Point').setValue([0, 0]); tr.property('ADBE Position').setValue([0, 0]);
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    if (exitOnly) ex2_life(S, ex2_T(m).OS);
    return S;
}
function ex2_sub(g, name) { var s = jzVecs(g).addProperty('ADBE Vector Group'); if (name) s.name = name; return s; }
// linked copy of the lyric layer: parented to L (follows every move of it), same opacity as L; link = takes L's final text style
// by expression (the treatment is applied later); exitOnly = exists only during the exit
function ex2_copy(m, tag, link, exitOnly) {
    var L = m.L, D = L.duplicate(), i, mns = ['ADBE Position', 'ADBE Scale', 'ADBE Rotate Z', 'ADBE Opacity', 'ADBE Anchor Point'];
    try { D.name = String(L.name).substr(0, 20) + ' ' + tag; } catch (e0) {}
    var tr = D.property('ADBE Transform Group');
    for (i = 0; i < mns.length; i++) { try { if (tr.property(mns[i]).expression) tr.property(mns[i]).expression = ''; } catch (e1) {} }
    D.parent = L;
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    jzSetExpr(tr.property('ADBE Position'), 'parent.transform.anchorPoint');
    jzSetExpr(tr.property('ADBE Opacity'), 'parent.transform.opacity');
    if (link) { try { D.property('ADBE Text Properties').property('ADBE Text Document').expression = 'parent.text.sourceText.style'; } catch (e2) {} }
    if (exitOnly) ex2_life(D, ex2_T(m).OS);
    return D;
}
// Transform effect that only translates (layer space): anchor = position = 0, position expression gives the offset
function ex2_move(Lx, name, posEx) {
    var e = jzEffect(Lx, 'ADBE Geometry2', name);
    jzEP(e, 1, [0, 0]); jzEP(e, 2, [0, 0]); jzEX(e, 2, posEx);
    return e;
}
// keep the point (px, py) of L's own space fixed while the layer is scaled by [fx, fy] and rotated by rot degrees on top of its
// own transform (expression strings; pre defines what they need) -> snippet for m.parts.pos ('' when the point is the anchor)
function ex2_pivot(m, fx, fy, rot, px, py, pre) {
    var tr = m.L.property('ADBE Transform Group'), a = tr.property('ADBE Anchor Point').value, s = tr.property('ADBE Scale').value;
    var r0 = tr.property('ADBE Rotate Z').value, rr = r0 * Math.PI / 180;
    var ux = (px - a[0]) * s[0] / 100, uy = (py - a[1]) * s[1] / 100;
    if (Math.abs(ux) + Math.abs(uy) < 0.5) return '';
    var vx = Math.cos(rr) * ux - Math.sin(rr) * uy, vy = Math.sin(rr) * ux + Math.cos(rr) * uy;
    return (pre || '') + 'var x2pa=(' + jzN(r0) + '+(' + (rot || '0') + '))*Math.PI/180,x2pc=Math.cos(x2pa),x2ps=Math.sin(x2pa),x2px=(' + (fx || '1') + ')*' + jzN(ux) + ',x2py=(' + (fy || '1') + ')*' + jzN(uy) + ';' +
        'd=[d[0]+' + jzN(vx) + '-(x2pc*x2px-x2ps*x2py),d[1]+' + jzN(vy) + '-(x2ps*x2px+x2pc*x2py)];';
}
// scale about the text box centre: parts.sc + pivot (fx, fy: expressions, pre defines their variables)
function ex2_scaleC(m, fx, fy, pre) {
    var r = ex2_rect(m);
    m.parts.sc.push((pre || '') + 'f=[f[0]*(' + fx + '),f[1]*(' + fy + ')];');
    var pv = ex2_pivot(m, fx, fy, null, r.left + r.width / 2, r.top + r.height / 2, pre);
    if (pv) m.parts.pos.push(pv);
}
// rotate about a point of L's own space: parts.rot + pivot
function ex2_rotAt(m, ang, px, py, pre) {
    m.parts.rot.push((pre || '') + 'r+=' + ang + ';');
    var pv = ex2_pivot(m, '1', '1', ang, px, py, pre);
    if (pv) m.parts.pos.push(pv);
}
// comp position of a point of L's own space (L's static transform)
function ex2_toComp(L, x, y) {
    var tr = L.property('ADBE Transform Group'), a = tr.property('ADBE Anchor Point').value, p = tr.property('ADBE Position').value;
    var s = tr.property('ADBE Scale').value, r = tr.property('ADBE Rotate Z').value * Math.PI / 180;
    var ux = (x - a[0]) * s[0] / 100, uy = (y - a[1]) * s[1] / 100;
    return [p[0] + Math.cos(r) * ux - Math.sin(r) * uy, p[1] + Math.sin(r) * ux + Math.cos(r) * uy];
}
function ex2_scaleK(L) { var s = jzXf(L, 'ADBE Scale').value; return [Math.max(0.05, Math.abs(s[0]) / 100), Math.max(0.05, Math.abs(s[1]) / 100)]; }
// per-glyph order 0..1 (browser orderOf): glyph index in the layer, or the item's place in the cut for one-glyph layers
function ex2_ordEx(m) {
    var N = ex2_cutN(m), mi = m.o.mi || 0;
    return 'textTotal>1?(textIndex-1)/(textTotal-1):' + jzN(N > 1 ? jzClamp(mi / (N - 1), 0, 1) : 0);
}

// ================================================================ EXITS
/* ---- splitApart — 上下に割れる: a hairline accent crack runs along each line, then the top and bottom halves spring apart
   (vertical text: left / right). The bottom half is a linked copy; each half is clipped by a comb mask (one tooth per line)
   and moved by a Transform effect. */
function ex2_halfPts(G, first) {
    var r = G.rect, fs = G.fs, X0 = r.left - fs * 2, X1 = r.left + r.width + fs * 2, eps = fs * 0.006, big = fs * 3, i;
    if (G.vert) {
        var cx = r.left + r.width / 2, Y0 = r.top - big, Y1 = r.top + r.height + big;
        return first ? ex2_box(X0, Y0, cx + eps, Y1) : ex2_box(cx - eps, Y0, X1, Y1);
    }
    var cy = [];
    for (i = 0; i < G.nL; i++) if (G.lines[i].chars.length) cy.push(G.lines[i].cy);
    if (!cy.length) cy.push(r.top + r.height / 2);
    var n = cy.length, a = [], b = [], hl = G.lead / 2;
    for (i = 0; i < n; i++) {
        if (first) { a.push(i ? cy[i] - hl : r.top - big); b.push(cy[i] + eps); }
        else { a.push(cy[i] - eps); b.push(i < n - 1 ? cy[i] + hl : r.top + r.height + big); }
    }
    var sp = X0 - fs, pts = [[sp, a[0]]];
    for (i = 0; i < n; i++) {
        pts.push([X1, a[i]]); pts.push([X1, b[i]]);
        if (i < n - 1) { pts.push([X0, b[i]]); pts.push([X0, a[i + 1]]); }
    }
    pts.push([sp, b[n - 1]]);
    return pts;
}
jzReg('exit', 'splitApart', { apply: function (m) {
    if (!ex2_hasOut(m)) return;
    var L = m.L, G = ex2_geo(m, true), sz = ex2_sz(m), H = ex2_hd(m), vert = G.vert, i;
    var canCopy = !ex2_matted(L) && !G.arranged && !ex2_crowded(m, 14);
    var E = 'var x2u=cl((PO-0.16)/0.84),x2e=oc(x2u),x2o=cl(PO/0.2)*' + jzN(sz * 0.03) + '+' + jzN(sz * 0.75) + '*x2e;';
    var sq = canCopy ? 65 : 12;          // no copy possible: the line closes up along the crack instead of splitting
    jzAnimator(L, 'JZ Out Squash', [['ADBE Text Scale 3D', vert ? [sq, 100, 100] : [100, sq, 100]]], H + E + 'x2e*100');
    m.parts.op.push('var x2q=cl((cl((PO-0.16)/0.84)-0.35)/0.65);f*=1-x2q*x2q*(3-2*x2q);');
    var above = null;
    if (canCopy) {
        var nm = ex2_nMask(L), D = ex2_copy(m, 'JZ Out Half', true, true);
        ex2_mask(L, ex2_halfPts(G, true), nm > 0, 'JZ Out Half A', H + 'PO<=0?1e4:0');
        ex2_mask(D, ex2_halfPts(G, false), nm > 0, 'JZ Out Half B');
        ex2_move(L, 'JZ Out Split', H + E + (vert ? '[-x2o,-x2o*0.3]' : '[-x2o*0.3,-x2o]'));
        ex2_move(D, 'JZ Out Split', H + E + (vert ? '[x2o,x2o*0.3]' : '[x2o*0.3,x2o]'));
        above = D;
    }
    // the crack: one accent hairline per line, overshooting the line ends while the halves part
    var S = ex2_shape(m, 'JZ Out Crack', above, false, true), lns = ex2_lines(G), acc = ex2_pick(m.ctx.sc.accent, m.ctx.sc.fg);
    jzNoGhost(S);
    var CE = H + 'var x2e=oc(cl((PO-0.16)/0.84)),x2p=' + jzN(sz) + '*(0.15+0.5*x2e),x2l=Math.max(1.5,' + jzN(sz) + '*(0.02+0.05*x2e));';
    for (i = lns.length - 1; i >= 0; i--) {
        var ln = lns[i], g = jzGrp(S, 'crack ' + (i + 1)), rc = jzAddRect(g, 10, 2, 0);
        jzAddFill(g, acc);
        rc.property('ADBE Vector Rect Position').setValue([ln.cx, ln.cy]);
        jzSetExpr(rc.property('ADBE Vector Rect Size'), CE + (vert ? '[x2l,' + jzN(ln.y1 - ln.y0) + '+2*x2p]' : '[' + jzN(ln.x1 - ln.x0) + '+2*x2p,x2l]'));
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), H + 'cl(PO/0.2)*(1-x2sm(0.55,1,PO))*100');
} });

/* ---- vSliceDrop — 縦スライス落下: the line is cut into vertical strips that drop off the bottom of the frame one after another.
   Two square Wave Warps (vertical displacement, incommensurate widths) give four strip groups; their amplitudes plus a Transform
   drop are the least-squares fit of four gravity curves with staggered starts. */
jzReg('exit', 'vSliceDrop', { apply: function (m) {
    if (!ex2_hasOut(m)) return;
    var L = m.L, r = ex2_rect(m), sz = ex2_sz(m), H = ex2_hd(m), k = ex2_scaleK(L), sd = ex2_itSeed(m), i;
    var w = r.width * k[0] + sz * 0.7, n = jzClamp(Math.round(w / (sz * 0.24)), 4, 14), bw = w / n / k[0];
    var top = Math.min(ex2_toComp(L, r.left, r.top)[1], ex2_toComp(L, r.left + r.width, r.top)[1]) - sz * 0.35 * k[1];
    var D = Math.max(sz * 2, (m.H - top) / k[1] + sz);
    var E = 'var x2D=' + jzN(D) + ',x2d=[0.02,0.3,0.14,0.43],x2y=[],x2i,x2q;for(x2i=0;x2i<4;x2i++){x2q=cl((PO-x2d[x2i])/0.55);x2y.push((x2q*x2q*1.05-Math.sin(Math.PI*cl(x2q/0.25))*0.012)*x2D);}' +
        'var x2A=(x2y[0]+x2y[1]+x2y[2]+x2y[3])/4,x2B1=(x2y[1]+x2y[3]-x2y[0]-x2y[2])/4,x2B2=(x2y[2]+x2y[3]-x2y[0]-x2y[1])/4;';
    var ww = [[2 * bw, 'x2B1', ex2_r(sd, 301) * 360], [2 * bw * 1.53, 'x2B2', ex2_r(sd, 302) * 360]];
    for (i = 0; i < 2; i++) {
        var e = jzEffect(L, 'ADBE Wave Warp', 'JZ Out Strips ' + (i + 1));
        jzEP(e, 1, 2); jzEP(e, 3, ww[i][0]); jzEP(e, 4, 90); jzEP(e, 5, 0); jzEP(e, 6, 1); jzEP(e, 7, ww[i][2]);
        jzEX(e, 2, H + E + ww[i][1]);
    }
    ex2_move(L, 'JZ Out Drop', H + E + '[0,x2A]');
    m.parts.op.push('var x2f=cl((PO-0.95)/0.05);f*=1-x2f*x2f*(3-2*x2f);');
} });

/* ---- melt — 溶ける: the line stretches down from its top edge while ragged strips drip lower, warms toward the accent and fades.
   Drips = two square + one sine Wave Warp (vertical) over a Transform drop. */
jzReg('exit', 'melt', { apply: function (m) {
    if (!ex2_hasOut(m)) return;
    var L = m.L, r = ex2_rect(m), sz = ex2_sz(m), H = ex2_hd(m), k = ex2_scaleK(L), sd = ex2_itSeed(m), i;
    var one = ex2_nGl(m) <= 1, st = one ? 0.3 : 0.15;
    var pre = 'var x2mx=1-0.05*PO,x2my=1+0.8*iq(PO);';
    m.parts.sc.push(pre + 'f=[f[0]*x2mx,f[1]*x2my];');
    var pv = ex2_pivot(m, 'x2mx', 'x2my', null, r.left + r.width / 2, r.top, pre);
    if (pv) m.parts.pos.push(pv);
    var WW = [[2, 2 * st, 0.28], [2, 2 * st * 1.57, 0.22], [1, 7.3 * st, 0.32]];
    for (i = 0; i < WW.length; i++) {
        var e = jzEffect(L, 'ADBE Wave Warp', 'JZ Out Drip ' + (i + 1));
        jzEP(e, 1, WW[i][0]); jzEP(e, 3, sz * WW[i][1] / k[0]); jzEP(e, 4, 90); jzEP(e, 5, 0); jzEP(e, 6, 1); jzEP(e, 7, ex2_r(sd, i, 311) * 360);
        jzEX(e, 2, H + 'iq(PO)*' + jzN(sz * WW[i][2] / k[1]) + '/(1+0.8*iq(PO))');
    }
    ex2_move(L, 'JZ Out Sag', H + '[0,iq(PO)*' + jzN(sz * 0.92 / k[1]) + '/(1+0.8*iq(PO))]');
    var acc = ex2_pick(m.ctx.sc.accent, m.ctx.sc.fg);
    jzAnimator(L, 'JZ Out Melt Colour', [['ADBE Text Fill Color', jzHex(acc)]], H + 'x2sm(0.3,0.9,PO)*45');
    m.parts.op.push('var x2f=cl((PO-0.55)/0.45);f*=1-x2f*x2f*(3-2*x2f);');
} });

/* ---- dissolve — ほろほろ: the line crumbles into small flakes that lift and fade, with a soft left-to-right sweep.
   Block Dissolve (random flakes) x a per-glyph fade / lift staggered left to right. */
jzReg('exit', 'dissolve', { apply: function (m) {
    if (!ex2_hasOut(m)) return;
    var L = m.L, sz = ex2_sz(m), H = ex2_hd(m), bw = Math.max(2, sz * 0.065);
    var bd = jzEffect(L, 'ADBE Block Dissolve', 'JZ Out Flakes');
    jzEP(bd, 2, bw); jzEP(bd, 3, bw); jzEP(bd, 4, 0); jzEP(bd, 5, 1);
    jzEX(bd, 1, H + '100*cl(PO*1.05)');
    jzAnimator(L, 'JZ Out Crumble', [['ADBE Text Opacity', 0], ['ADBE Text Position 3D', [0, -sz * 0.06, 0]], ['ADBE Text Scale 3D', [112, 112, 100]]],
        H + 'var o=' + ex2_ordEx(m) + ',x=x2sm(0.2+0.3*o,0.72+0.28*o,PO);x*100');
} });

/* ---- backspace — バックスペース: an accent cursor deletes the line from the end, accelerating like key repeat; or (per cut)
   selects everything from the end (accent highlight, glyphs in the background colour) and deletes it in one stroke.
   One-glyph layers delete in reverse reading order with the cursor hopping back. */
function ex2_curAfter(G, g, sz, cw) { return G.vert ? [g.cx, g.cy + G.fs * 0.5 + sz * 0.05 + cw / 2, sz * 0.96, cw] : [g.x1 + sz * 0.05 + cw / 2, g.cy, cw, sz]; }
function ex2_curBefore(G, g, sz, cw) { return G.vert ? [g.cx, g.cy - G.fs * 0.5 - sz * 0.05 - cw / 2, sz * 0.96, cw] : [g.x0 - sz * 0.05 - cw / 2, g.cy, cw, sz]; }
jzReg('exit', 'backspace', { apply: function (m) {
    if (!ex2_hasOut(m)) return;
    var L = m.L, G = ex2_geo(m, true), sz = ex2_sz(m), H = ex2_hd(m), sc = m.ctx.sc, i;
    var vis = [];
    for (i = 0; i < G.N; i++) if (!G.g[i].sp) vis.push(G.g[i]);
    if (!vis.length) return;
    var nv = vis.length, N = ex2_cutN(m), single = nv === 1 && N > 1;
    var sel = !single && (ex2_h(m.c.seed | 0, 601) & 1) === 1;
    var acc = ex2_pick(sc.accent, sc.fg), bg = ex2_pick(sc.bg, '#000000'), cw = Math.max(2, sz * 0.07);
    var helper = !G.arranged && !ex2_crowded(m, 30);
    var DEL = 'var x2del=Math.pow(cl((PO-0.1)/0.8),1.3),x2bl=Math.floor(time*5)%2==0;';
    var R = [], rk = -1;
    for (i = 0; i < G.N; i++) { if (!G.g[i].sp) rk = G.g[i].k; R.push(rk); }
    var RA = 'var R=' + ex2_arr(R) + ',x2r=R[textIndex-1];';
    var C = [], posEx = null, opEx = null, cs = null;
    if (single) {
        var j = jzClamp(Math.round(m.o.mi || 0), 0, N - 1), tj = (N - 1 - j) / N;
        jzAnimator(L, 'JZ Out Delete', [['ADBE Text Opacity', 0]], H + DEL + 'x2del>' + jzN(tj) + '?100:0');
        var ca = ex2_curAfter(G, vis[0], sz, cw), cb = ex2_curBefore(G, vis[0], sz, cw);
        var md = 'var x2m=0;if(PO>0&&PO<0.94){if(' + (j === N - 1 ? 'x2del<=0' : 'false') + ')x2m=x2bl?1:0;else if(x2del>' + jzN(tj) + '&&(' + (j === 0 ? 'true' : 'x2del<=' + jzN(tj + 1 / N)) + '))x2m=(' + (j === 0 ? 'x2del>=1&&!x2bl' : 'false') + ')?0:2;}';
        posEx = H + DEL + md + 'x2m==1?' + ex2_pts([ca]).slice(1, -1) + ':' + ex2_pts([cb]).slice(1, -1);
        opEx = H + DEL + md + 'x2m>0?100:0';
        cs = [ca[2], ca[3]];
    } else if (sel) {
        var SEL = DEL + 'var x2s=Math.ceil(' + nv + '*x2o2(PO/0.42)),x2from=' + nv + '-x2s;';
        jzAnimator(L, 'JZ Out Delete', [['ADBE Text Opacity', 0]], H + 'PO>=0.55?100:0');
        jzAnimator(L, 'JZ Out Selected', [['ADBE Text Fill Color', jzHex(bg)]], H + SEL + RA + 'PO>0&&PO<0.55&&x2r>=x2from&&x2r>=0?100:0');
        for (i = 0; i < nv; i++) { var q0 = ex2_curBefore(G, vis[i], sz, cw); C.push([q0[0], q0[1]]); cs = [q0[2], q0[3]]; }
        var q1 = ex2_curAfter(G, vis[nv - 1], sz, cw); C.push([q1[0], q1[1]]);
        posEx = H + SEL + 'var C=' + ex2_pts(C) + ';PO>=0.55?C[0]:C[Math.max(0,Math.min(' + nv + ',x2from))]';
        opEx = H + SEL + 'PO<=0||PO>=0.94?0:((PO>=0.55||x2s==0)?(x2bl?100:0):100)';
        if (helper) {        // the selection highlight behind the glyphs (the browser draws it in the ghost passes too)
            var S2 = ex2_shape(m, 'JZ Out Selection', null, true, true), trk = ((ex2_td(L) || {}).tracking || 0) / 1000 * G.fs;
            for (i = nv - 1; i >= 0; i--) {
                var g = vis[i], grp = jzGrp(S2, 'sel ' + (i + 1));
                if (G.vert) jzAddRect(grp, sz * 1.2, G.lead + sz * 0.04, 0, g.cx, g.cy);
                else jzAddRect(grp, g.x1 - g.x0 + Math.max(0, trk) + sz * 0.04, Math.max(sz * 1.2, G.lead + sz * 0.02), 0, (g.x0 + g.x1 + Math.max(0, trk)) / 2, g.cy);
                jzAddFill(grp, acc);
                jzSetExpr(jzGX(grp).property('ADBE Vector Group Opacity'), H + SEL + 'PO>0&&PO<0.55&&' + g.k + '>=x2from?100:0');
            }
        }
    } else {
        var KX = DEL + 'var x2n=' + nv + ',x2k=x2n-Math.min(x2n,Math.floor(x2del*(x2n+0.999)));';
        jzAnimator(L, 'JZ Out Delete', [['ADBE Text Opacity', 0]], H + KX + RA + 'x2r>=x2k&&x2r>=0?100:0');
        var b0 = ex2_curBefore(G, vis[0], sz, cw); C.push([b0[0], b0[1]]); cs = [b0[2], b0[3]];
        for (i = 0; i < nv; i++) { var a0 = ex2_curAfter(G, vis[i], sz, cw); C.push([a0[0], a0[1]]); }
        posEx = H + KX + 'var C=' + ex2_pts(C) + ';C[Math.max(0,Math.min(' + nv + ',x2k))]';
        opEx = H + KX + 'PO<=0||PO>=0.94?0:((PO<0.1||x2k==0)?(x2bl?100:0):100)';
    }
    if (!helper || !posEx) return;
    var S = ex2_shape(m, 'JZ Out Cursor', null, false, true), cg = jzGrp(S, 'cursor'), rc = jzAddRect(cg, cs[0], cs[1], 0);
    jzAddFill(cg, acc);
    jzNoGhost(S);
    jzSetExpr(rc.property('ADBE Vector Rect Position'), posEx);
    jzSetExpr(jzXf(S, 'ADBE Opacity'), opEx);
} });

/* ---- scrambleOut — 記号化: glyph by glyph (reading order + a little randomness) the characters turn into flickering symbols
   (some in the accent), shrink and blink away. Symbols come from a Source Text expression (the lyric stays editable: the
   expression only rewrites it during the exit); a layout that already drives the source text gets Character Offset instead. */
jzReg('exit', 'scrambleOut', { apply: function (m) {
    if (!ex2_hasOut(m)) return;
    var L = m.L, H = ex2_hd(m), acc = ex2_pick(m.ctx.sc.accent, m.ctx.sc.fg), N = ex2_cutN(m), mi = m.o.mi || 0;
    var o1 = jzN(N > 1 ? jzClamp(mi / (N - 1), 0, 1) : 0);
    var Q = H + 'var o=' + ex2_ordEx(m) + ',q=x2w(PO,0.65*o+0.35*hh(textIndex*7.31+SD*0.13+701),0.55),x2st=Math.floor(time*24);';
    jzAnimator(L, 'JZ Out Shrink', [['ADBE Text Scale 3D', [65, 65, 100]]], Q + 'q>0&&q<1?x2sm(0.4,1,q)*100:0');
    jzAnimator(L, 'JZ Out Code Colour', [['ADBE Text Fill Color', jzHex(acc)]], Q + 'q>0&&q<1&&hh(textIndex*3.71+x2st*1.31+SD*0.29+704)<0.3?100:0');
    jzAnimator(L, 'JZ Out Hide', [['ADBE Text Opacity', 0]], Q + 'q>=1||(q>0.55&&hh(textIndex*5.33+x2st*2.17+SD*0.41+703)<(q-0.55)*2.4)?100:0');
    var src = L.property('ADBE Text Properties').property('ADBE Text Document'), busy = false;
    try { busy = !!src.expression; } catch (e0) { busy = true; }
    if (busy) {
        jzAnimator(L, 'JZ Out Scramble', [['ADBE Text Character Offset', 60]], Q + 'q>0&&q<1?20+hh(textIndex*9.13+x2st*3.3+SD*0.53+702)*80:0');
        return;
    }
    try {
        src.expression = H + 'var x2out=value;if(PO>0){var s=String(value),PL=' + ex2_esc(EX2_POOL) + ',o2="",n=0,i=0,j,c,o,q,x2st=Math.floor(time*24);' +
            'for(j=0;j<s.length;j++){c=s.charAt(j);if(c!="\\r"&&c!="\\n"&&c!="\\u0003")n++;}' +
            'for(j=0;j<s.length;j++){c=s.charAt(j);if(c=="\\r"||c=="\\n"||c=="\\u0003"){o2+=c;continue;}i++;' +
            'o=n>1?(i-1)/(n-1):' + o1 + ';q=x2w(PO,0.65*o+0.35*hh(i*7.31+SD*0.13+701),0.55);' +
            'if(q>0&&q<1&&c!=" "&&c!="\\u3000")c=PL.charAt(Math.floor(hh(i*9.13+x2st*3.3+SD*0.53+702)*PL.length)%PL.length);o2+=c;}x2out=o2;}x2out';
    } catch (e1) { jzWarn('scrambleOut source: ' + e1.toString()); }
} });

/* ---- glitchDissolve — ブロック化: each glyph (random start) jitters sideways cut to a sliver in glitch colours and breaks into
   a cloud of flickering colour blocks that thins out. Blocks = a shape layer in the text's space (a few rects per glyph). */
jzReg('exit', 'glitchDissolve', { apply: function (m) {
    if (!ex2_hasOut(m)) return;
    var L = m.L, G = ex2_geo(m, true), sz = ex2_sz(m), H = ex2_hd(m), sc = m.ctx.sc, i, j;
    var c0 = ex2_pick(jzTextColor(L), sc.fg), acc = ex2_pick(sc.accent, sc.fg), cols = [c0, acc, ex2_pick(sc.ghostA, acc), ex2_pick(sc.ghostB, c0)];
    var Q = H + 'var x2T=hh(textIndex*4.13+SD*0.17+801)*0.55,q=(PO-x2T)/0.45,x2st=Math.floor(time*24),x2a=q>0&&q<0.3;';
    jzAnimator(L, 'JZ Out Jitter', [['ADBE Text Position 3D', [sz * 0.12, 0, 0]]], Q + 'x2a?(hh(textIndex*6.1+x2st*1.7+SD*0.23+803)*2-1)*100:0');
    // the browser clips each glyph to a random top / bottom sliver: squash + shift toward that side
    jzAnimator(L, 'JZ Out Sliver', [['ADBE Text Scale 3D', [100, 50, 100]]], Q + 'x2a?hh(textIndex*8.3+x2st*2.9+SD*0.37+804)*100:0');
    jzAnimator(L, 'JZ Out Sliver Side', [['ADBE Text Position 3D', [0, sz * 0.25, 0]]],
        Q + 'x2a?hh(textIndex*8.3+x2st*2.9+SD*0.37+804)*(hh(textIndex*2.3+x2st*5.1+SD*0.43+805)<0.5?-100:100):0');
    jzAnimator(L, 'JZ Out Glitch Colour', [['ADBE Text Fill Color', jzHex(acc)]], Q + 'x2a&&hh(textIndex*2.3+x2st*5.1+SD*0.43+802)<0.25?100:0');
    jzAnimator(L, 'JZ Out Hide', [['ADBE Text Opacity', 0]], Q + 'q>=0.3?100:0');
    if (G.arranged || ex2_crowded(m, 24) || !G.nv) return;
    var per = jzClamp(Math.floor(48 / G.nv), 2, 4), S = ex2_shape(m, 'JZ Out Blocks', null, false, true);
    jzNoGhost(S);
    var CL = '[' + ex2_col(cols[0]) + ',' + ex2_col(cols[1]) + ',' + ex2_col(cols[2]) + ',' + ex2_col(cols[3]) + ']';
    for (i = G.N - 1; i >= 0; i--) {
        var g = G.g[i]; if (g.sp) continue;
        var gg = jzGrp(S, 'blocks ' + (i + 1));
        jzGX(gg).property('ADBE Vector Position').setValue([g.cx, g.cy]);
        for (j = 0; j < per; j++) {
            var BE = H + 'var x2T=hh(' + (i + 1) + '*4.13+SD*0.17+801)*0.55,q=(PO-x2T)/0.45,x2st=Math.floor(time*24);seedRandom(SD*7+' + ((i + 1) * 131 + j * 17) + '+x2st*1009,true);' +
                'var r1=random(),r2=random(),r3=random(),r4=random(),r5=random(),r6=random(),x2on=q>0&&q<1&&' + j + '<Math.ceil(5*(1-q*0.8))&&r6>=q*0.55;';
            var sb = ex2_sub(gg, 'b' + (j + 1)), rc = jzAddRect(sb, 10, 10, 0), fl = jzAddFill(sb, cols[j % 4]);
            jzSetExpr(rc.property('ADBE Vector Rect Size'), BE + 'x2on?[' + jzN(sz) + '*(0.12+0.48*r1)*(1-q*0.5),' + jzN(sz) + '*(0.06+0.24*r2)]:[0,0]');
            jzSetExpr(rc.property('ADBE Vector Rect Position'), BE + '[(r3*2-1)*' + jzN(sz * 0.34) + ',(r4*2-1)*' + jzN(sz * 0.34) + ']');
            jzSetExpr(fl.property('ADBE Vector Fill Color'), BE + 'var CL=' + CL + ';CL[Math.floor(r5*4)%4]');
        }
    }
} });

/* ---- echoOut — 残響: the line fades while three outline echoes (text colour, accent, text colour) swell out from its centre
   and dissolve. Echoes = linked copies with fill off / stroke on, scaled about the box centre. */
jzReg('exit', 'echoOut', { apply: function (m) {
    if (!ex2_hasOut(m)) return;
    var L = m.L, r = ex2_rect(m), sz = ex2_sz(m), H = ex2_hd(m), sc = m.ctx.sc, k;
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2, lw = Math.max(1, sz * 0.016);
    var col = ex2_pick(jzTextColor(L), sc.fg), acc = ex2_pick(sc.accent, sc.fg);
    m.parts.op.push('var x2a=cl(PO/0.45);f*=1-(0.5-0.5*Math.cos(Math.PI*x2a));');
    if (ex2_matted(L) || ex2_crowded(m, 8)) {      // no copies: the line itself swells a little while it fades
        ex2_scaleC(m, 'x2es', 'x2es', 'var x2es=1+0.25*oc(PO);');
        return;
    }
    for (k = 0; k < 3; k++) {
        var D = ex2_copy(m, 'JZ Out Echo ' + (k + 1), false, true), tr = D.property('ADBE Transform Group'), c = k === 1 ? acc : col;
        jzTextDoc(D, function (d) {
            d.applyFill = false; d.applyStroke = true; d.strokeWidth = lw;
            try { d.strokeColor = jzHex(c); } catch (e0) {}
            try { d.strokeOverFill = true; } catch (e1) {}
        });
        tr.property('ADBE Anchor Point').setValue([cx, cy]);
        jzSetExpr(tr.property('ADBE Position'), '');
        tr.property('ADBE Position').setValue([cx, cy]);
        var QE = H + 'var q=cl((PO-' + jzN(k * 0.15) + ')/0.55);';
        jzSetExpr(tr.property('ADBE Scale'), QE + 'var s=1+0.5*oc(q)*' + jzN(1 + k * 0.2) + ';[value[0]*s,value[1]*s]');
        jzSetExpr(tr.property('ADBE Opacity'), QE + 'q>0&&q<1?80*(1-q):0');
    }
} });

/* ---- whipOut — ホイップ: a small wind-up the other way, then the line whips off-screen along its reading direction, stretching,
   leaning into the motion and smearing (Directional Blur for the browser's streak copies). */
jzReg('exit', 'whipOut', { apply: function (m) {
    if (!ex2_hasOut(m)) return;
    var L = m.L, r = ex2_rect(m), sz = ex2_sz(m), H = ex2_hd(m), k = ex2_scaleK(L), vert = ex2_isVert(L);
    var dir = ex2_bit(m, 4) ? 1 : -1, rot = jzXf(L, 'ADBE Rotate Z').value * Math.PI / 180, szc = sz * k[1];
    var dist = (vert ? m.H + r.height * k[1] : m.W + r.width * k[0]) + szc * 2;
    var T = 'var x2pb=' + jzN(szc * 0.14) + '*oc(PO/0.28),x2u=cl((PO-0.26)/0.74),x2v=Math.min(1.6,2*x2u),x2off=' + dir + '*(' + jzN(dist) + '*x2u*x2u-x2pb*(1-x2u));';
    var ux = vert ? -Math.sin(rot) : Math.cos(rot), uy = vert ? Math.cos(rot) : Math.sin(rot);
    m.parts.pos.push(T + 'd=[d[0]+x2off*' + jzN(ux) + ',d[1]+x2off*' + jzN(uy) + '];');
    if (vert) ex2_scaleC(m, '1', '(1+x2v*0.45)', T);
    else {
        ex2_scaleC(m, '(1+x2v*0.55)', '(1-x2v*0.08)', T);
        jzAnimator(L, 'JZ Out Lean', [['ADBE Text Skew', -dir * 28]], H + T + 'Math.min(28,x2v*16)/28*100');
    }
    var db = jzEffect(L, 'ADBE Motion Blur', 'JZ Out Streak');
    jzEP(db, 1, vert ? 0 : 90);
    jzEX(db, 2, H + T + jzN(sz * 0.6) + '*Math.min(1,x2v)');
    m.parts.op.push('var x2f=cl((PO-0.9)/0.1);f*=1-x2f*x2f*(3-2*x2f);');
} });

/* ---- gravity — 重力落下: glyphs (random starts) hop up a little, then fall off the bottom of the frame under gravity,
   drifting sideways and tumbling. */
jzReg('exit', 'gravity', { apply: function (m) {
    if (!ex2_hasOut(m)) return;
    var L = m.L, r = ex2_rect(m), sz = ex2_sz(m), H = ex2_hd(m), k = ex2_scaleK(L);
    var rot = jzXf(L, 'ADBE Rotate Z').value * Math.PI / 180, dsx = Math.sin(rot), dsy = Math.cos(rot);
    var top = Math.min(ex2_toComp(L, r.left, r.top)[1], ex2_toComp(L, r.left + r.width, r.top)[1]);
    var D = Math.max(sz * 2, (m.H - top) / k[1] + sz * 1.2), K = D + sz;
    var Q = H + 'var d0=hh(textIndex*3.1+SD*0.11+901)*0.4,q=cl((PO-d0)/0.6),h=' + jzN(sz) + '*(0.12+0.22*hh(textIndex*5.7+SD*0.19+902)),D=' + jzN(D) +
        ',v0=2*h+Math.sqrt(4*h*h+4*h*D),g2=D+v0,dn=q<=0?0:-v0*q+g2*q*q,sd=(hh(textIndex*7.3+SD*0.23+903)*2-1)*' + jzN(sz * 0.9) + '*q;';
    jzAnimator(L, 'JZ Out Fall', [['ADBE Text Position 3D', [K, K, 0]]],
        Q + '[(dn*' + jzN(dsx) + '+sd*' + jzN(dsy) + ')/' + jzN(K) + '*100,(dn*' + jzN(dsy) + '-sd*' + jzN(dsx) + ')/' + jzN(K) + '*100,0]');
    jzAnimator(L, 'JZ Out Tumble', [['ADBE Text Rotation', 240]], Q + '(hh(textIndex*9.1+SD*0.29+904)*2-1)*q*q*100');
    jzAnimator(L, 'JZ Out Hide', [['ADBE Text Opacity', 0]], Q + 'q>=1?100:x2sm(0.92,1,q)*100');
} });

/* ---- popOut — 弾ける: glyphs (reading order + randomness) swell and wobble while heating to the accent, then pop: an accent
   ring and eight sparks burst from where each glyph was. */
jzReg('exit', 'popOut', { apply: function (m) {
    if (!ex2_hasOut(m)) return;
    var L = m.L, G = ex2_geo(m, true), sz = ex2_sz(m), H = ex2_hd(m), sd = ex2_itSeed(m), i;
    var acc = ex2_pick(m.ctx.sc.accent, m.ctx.sc.fg), N = ex2_cutN(m), mi = m.o.mi || 0, O = [];
    for (i = 0; i < G.N; i++) O.push(0.6 * (G.N > 1 ? i / (G.N - 1) : (N > 1 ? jzClamp(mi / (N - 1), 0, 1) : 0)) + 0.4 * ex2_r(sd, i, 1001));
    var Q = H + 'var O=' + ex2_arr(O) + ',q=x2w(PO,O[textIndex-1]||0,0.5),u=cl(q/0.55);';
    jzAnimator(L, 'JZ Out Swell', [['ADBE Text Scale 3D', [150, 150, 100]]], Q + 'q>0&&q<0.55?u*u*100:0');
    jzAnimator(L, 'JZ Out Wobble', [['ADBE Text Scale 3D', [107, 93, 100]]], Q + 'q>0&&q<0.55?Math.sin(u*26)*u*100:0');
    jzAnimator(L, 'JZ Out Heat', [['ADBE Text Fill Color', jzHex(acc)]], Q + 'q>0?u*70:0');
    jzAnimator(L, 'JZ Out Hide', [['ADBE Text Opacity', 0]], Q + 'q>=0.55?100:0');
    if (G.arranged || ex2_crowded(m, 20) || !G.nv) return;
    var S = ex2_shape(m, 'JZ Out Bursts', null, false, true);
    jzNoGhost(S);
    for (i = G.N - 1; i >= 0; i--) {
        var g = G.g[i]; if (g.sp) continue;
        var grp = jzGrp(S, 'burst ' + (i + 1)), BE = H + 'var q=x2w(PO,' + jzN(O[i]) + ',0.5),u=cl((q-0.55)/0.45),e=oc(u);';
        jzGX(grp).property('ADBE Vector Position').setValue([g.cx, g.cy]);
        jzSetExpr(jzGX(grp).property('ADBE Vector Group Opacity'), BE + 'q>=0.55&&q<1?(1-u)*100:0');
        var ring = ex2_sub(grp, 'ring'), el = jzVecs(ring).addProperty('ADBE Vector Shape - Ellipse');
        jzSetExpr(el.property('ADBE Vector Ellipse Size'), BE + 'var R=' + jzN(sz) + '*(0.35+0.45*e)*2;[R,R]');
        var st = jzAddStroke(ring, acc, 2);
        jzSetExpr(st.property('ADBE Vector Stroke Width'), BE + 'Math.max(1,' + jzN(sz * 0.08) + '*(1-u))');
        var tk = ex2_sub(grp, 'sparks'), rc = jzAddRect(tk, 10, 2, 0);
        jzSetExpr(rc.property('ADBE Vector Rect Size'), BE + '[Math.max(0.01,' + jzN(sz * 0.16) + '*(1-u)),Math.max(1,' + jzN(sz * 0.08) + '*(1-u))]');
        jzSetExpr(rc.property('ADBE Vector Rect Position'), BE + '[' + jzN(sz) + '*(0.5+0.55*e)+' + jzN(sz * 0.08) + '*(1-u),0]');
        jzAddFill(tk, acc);
        var rp = jzVecs(tk).addProperty('ADBE Vector Filter - Repeater');
        rp.property('ADBE Vector Repeater Copies').setValue(8);
        var rt = rp.property('ADBE Vector Repeater Transform');
        rt.property('ADBE Vector Repeater Position').setValue([0, 0]);
        rt.property('ADBE Vector Repeater Rotation').setValue(45);
        jzGX(tk).property('ADBE Vector Rotation').setValue(ex2_r(sd, i, 1002) * 360);
    }
} });

/* ---- burn — 焼失: the line burns away from the bottom up, the burn front sweeping along the reading direction (either way,
   per cut): glyphs heat to the accent, char dark, a glowing rough edge eats them and embers rise from the front.
   Front = one slanted mask shrunk by mask expansion (the browser clips each glyph from its own bottom, staggered). */
jzReg('exit', 'burn', { apply: function (m) {
    if (!ex2_hasOut(m)) return;
    var L = m.L, G = ex2_geo(m, true), sz = ex2_sz(m), H = ex2_hd(m), sc = m.ctx.sc, sd = ex2_itSeed(m), i, j;
    var rev = ex2_bit(m, 5), acc = ex2_pick(sc.accent, sc.fg), bg = ex2_pick(sc.bg, '#000000'), vert = G.vert;
    var r = G.rect, x0 = r.left, x1 = r.left + r.width, yT = r.top, yB = r.top + r.height, Wt = Math.max(1, r.width), hb = Math.max(1, r.height), fs = G.fs;
    // per glyph: horizontal -> start u (0..1 along the burn), q = cl((PO-0.45u)/0.55); vertical -> the front rises through the column
    var U = [], VB = [], sv = fs / hb, N = ex2_cutN(m), one = !vert && G.nv <= 1;
    var u1 = N > 1 ? jzClamp((m.o.mi || 0) / (N - 1), 0, 1) : 0;     // one-glyph layer: its place in the cut
    if (rev) u1 = 1 - u1;
    for (i = 0; i < G.N; i++) {
        var g = G.g[i], u = one ? u1 : G.arranged ? (G.N > 1 ? i / (G.N - 1) : 0) : (g.cx - x0) / Wt;
        if (rev && !one) u = 1 - u;
        U.push(jzClamp(u, 0, 1));
        VB.push(jzClamp((yB - (g.cy + fs * 0.5)) / hb, -0.5, 1.5));
    }
    var QG = vert ? 'var VB=' + ex2_arr(VB) + ',x2kf=cl((PO-0.03)/0.9),q=cl(0.12+0.88*(x2kf-(VB[textIndex-1]||0))/' + jzN(sv) + ');'
        : 'var U=' + ex2_arr(U) + ',q=cl((PO-0.45*(U[textIndex-1]||0))/0.55);';
    jzAnimator(L, 'JZ Out Heat', [['ADBE Text Fill Color', jzHex(acc)]], H + QG + 'x2sm(0,0.2,q)*100');
    jzAnimator(L, 'JZ Out Char', [['ADBE Text Fill Color', jzHex(ex2_mix(acc, bg, 0.75))]], H + QG + 'x2sm(0.35,0.95,q)*100');
    jzAnimator(L, 'JZ Out Flicker', [['ADBE Text Position 3D', [sz * 0.012, 0, 0]]], H + QG + '(hh(textIndex*3.9+Math.floor(time*24)*1.3+SD*0.2+1102)*2-1)*x2sm(0,0.2,q)*(q<1?100:0)');
    // the front: a rotated rectangle whose lower edge is the burn line; negative expansion moves it up (1e4 before the exit)
    var sl = vert || one ? 0 : hb * 0.45 / (0.484 * Wt) * (rev ? -1 : 1), nn = Math.sqrt(1 + sl * sl);
    var tx = 1 / nn, ty = sl / nn, nx = sl / nn, ny = -1 / nn;
    var xm = (x0 + x1) / 2, yF = vert ? yB + hb * 0.034 : one ? yB + fs * 0.03 : yB + hb * 0.291 / 0.484;
    var HW = Wt / 2 + hb * 4 + fs * 2, HT = hb * 6 + fs * 4;
    var c1 = [xm - HW * tx, yF - HW * ty], c2 = [xm + HW * tx, yF + HW * ty];
    var pts = [c1, c2, [c2[0] + HT * nx, c2[1] + HT * ny], [c1[0] + HT * nx, c1[1] + HT * ny]];
    var mk = ex2_mask(L, pts, ex2_nMask(L) > 0, 'JZ Out Burn', H + (one ? 'PO<=0?1e4:-' + jzN(hb + fs * 0.03) + '*cl((cl((PO-' + jzN(0.45 * u1) + ')/0.55)-0.12)/0.88)' : 'PO<=0?1e4:-' + jzN(hb / nn) + '*PO/' + (vert ? '0.9' : '0.484')));
    try { mk.property('ADBE Mask Feather').setValue([sz * 0.03, sz * 0.03]); } catch (e0) {}
    var re = jzEffect(L, 'ADBE Roughen Edges', 'JZ Out Char Edge');
    jzEP(re, 1, 2); jzEP(re, 2, jzHex(acc)); jzEP(re, 6, 60);
    jzEX(re, 3, H + jzN(sz * 0.06) + '*x2sm(0.02,0.4,PO)');
    jzEX(re, 10, 'time*240');
    if (G.arranged || ex2_crowded(m, 20) || !G.nv) return;
    // embers rising from the front
    var per = jzClamp(Math.floor(30 / G.nv), 1, 3), S = ex2_shape(m, 'JZ Out Embers', null, false, true);
    jzNoGhost(S);
    for (i = G.N - 1; i >= 0; i--) {
        var gl = G.g[i]; if (gl.sp) continue;
        for (j = 0; j < per; j++) {
            var b0 = 0.15 + ex2_r(sd, i, j, 1103) * 0.6, K0 = Math.pow(jzClamp((b0 - 0.12) / 0.88, 0, 1), 1.15);
            var ey0 = vert ? gl.cy + fs * (0.5 - K0) : yB - hb * jzClamp((0.55 * b0 - 0.066) / 0.484, 0, 1);
            var ex0 = gl.cx + ex2_rs(sd, i, j, 1104) * gl.w * 0.4;
            var qg = vert ? 'var x2kf=cl((PO-0.03)/0.9),q=cl(0.12+0.88*(x2kf-(' + jzN(VB[i]) + '))/' + jzN(sv) + ');' : 'var q=cl((PO-' + jzN(0.45 * U[i]) + ')/0.55);';
            var EE = H + qg + 'var a=(q-' + jzN(b0) + ')/0.35;';
            var eg = jzGrp(S, 'ember ' + (i + 1) + '.' + (j + 1)), el = jzVecs(eg).addProperty('ADBE Vector Shape - Ellipse');
            jzAddFill(eg, acc);
            jzSetExpr(el.property('ADBE Vector Ellipse Size'), EE + 'var R=Math.max(1,' + jzN(sz * 0.04) + '*(1-cl(a)))*2;[R,R]');
            jzSetExpr(jzGX(eg).property('ADBE Vector Position'), EE + 'a=cl(a);[' + jzN(ex0) + '+Math.sin(a*6+' + j + ')*' + jzN(sz * 0.05) + ',' + jzN(ey0) + '-a*' + jzN(sz * 0.55) + ']');
            jzSetExpr(jzGX(eg).property('ADBE Vector Group Opacity'), EE + 'a>0&&a<1?(1-a)*100:0');
        }
    }
} });

/* ---- sweepCover — バーで隠す: an accent bar sweeps over each line (lines staggered), the line is gone underneath, and the bar
   retracts in the same direction. */
jzReg('exit', 'sweepCover', { apply: function (m) {
    if (!ex2_hasOut(m)) return;
    var L = m.L, G = ex2_geo(m, true), sz = ex2_sz(m), H = ex2_hd(m), acc = ex2_pick(m.ctx.sc.accent, m.ctx.sc.fg), i;
    var lns = G.arranged ? [{ li: 0, x0: G.rect.left, x1: G.rect.left + G.rect.width, y0: G.rect.top, y1: G.rect.top + G.rect.height, cy: G.rect.top + G.rect.height / 2, cx: G.rect.left + G.rect.width / 2 }] : ex2_lines(G);
    if (G.vert && !G.arranged) {       // vertical text: every glyph cell is its own "line" (the browser's bars step down the column)
        lns = [];
        for (i = 0; i < G.nL; i++) {
            if (!G.lines[i].chars.length || ex2_isSp(G.lines[i].chars[0])) continue;
            var cyv = G.lines[i].cy;
            lns.push({ li: i, x0: G.rect.left, x1: G.rect.left + G.rect.width, y0: cyv - G.fs * 0.5, y1: cyv + G.fs * 0.5, cy: cyv, cx: G.rect.left + G.rect.width / 2 });
        }
    }
    var nL = lns.length; if (!nL) return;
    var vert = G.vert && !G.arranged, st = nL > 1 ? Math.min(0.12, 0.3 / (nL - 1)) : 0, span = 1 - (nL - 1) * st;
    var single = ex2_single(m), N = ex2_cutN(m), ord = N > 1 ? jzClamp((m.o.mi || 0) / (N - 1), 0, 1) : 0;
    var LI = [];
    for (i = 0; i < G.N; i++) {
        var li = 0, j;
        for (j = 0; j < nL; j++) if (lns[j].li === G.g[i].li) li = j;
        LI.push(G.arranged ? 0 : li);
    }
    var uOf = single ? 'x2w(PO,' + jzN(ord) + ',0.45)' : 'cl((PO-x2l*' + jzN(st) + ')/' + jzN(span) + ')';
    var helper = !ex2_crowded(m, 30);
    jzAnimator(L, 'JZ Out Covered', [['ADBE Text Opacity', 0]], H + 'var LI=' + ex2_arr(LI) + ',x2l=LI[textIndex-1]||0,u=' + uOf + ';' + (helper ? 'u>=0.5?100:0' : 'x2sm(0.3,0.6,u)*100'));
    if (!helper) return;
    var S = ex2_shape(m, 'JZ Out Bars', null, false, true), pa = sz * 0.14, pc = sz * 0.1;
    jzNoGhost(S);
    for (i = nL - 1; i >= 0; i--) {
        var ln = lns[i], grp = jzGrp(S, 'bar ' + (i + 1)), rc = jzAddRect(grp, 10, 10, 0);
        jzAddFill(grp, acc);
        var a0 = vert ? ln.y0 - pa : ln.x0 - pa, a1 = vert ? ln.y1 + pa : ln.x1 + pa;
        var BE = H + 'var x2l=' + i + ',u=' + uOf + ',c1=x2io(u/0.5),c2=x2io((u-0.5)/0.5),p0=' + jzN(a0) + '+' + jzN(a1 - a0) + '*c2,p1=' + jzN(a0) + '+' + jzN(a1 - a0) + '*c1;';
        if (vert) {
            jzSetExpr(rc.property('ADBE Vector Rect Size'), BE + '[' + jzN(ln.x1 - ln.x0 + pc * 2) + ',Math.max(0,p1-p0)]');
            jzSetExpr(rc.property('ADBE Vector Rect Position'), BE + '[' + jzN(ln.cx) + ',(p0+p1)/2]');
        } else {
            jzSetExpr(rc.property('ADBE Vector Rect Size'), BE + '[Math.max(0,p1-p0),' + jzN(ln.y1 - ln.y0 + pc * 2) + ']');
            jzSetExpr(rc.property('ADBE Vector Rect Position'), BE + '[(p0+p1)/2,' + jzN(ln.cy) + ']');
        }
        jzSetExpr(jzGX(grp).property('ADBE Vector Group Opacity'), BE + 'u>0&&u<1&&p1-p0>0.3?100:0');
    }
} });

/* ---- shatterLite — 四分割飛散: every glyph cracks into quarters that fly apart outward (with gravity), shrinking and fading.
   The quarters are the lyric layer + three linked copies, each clipped to one quarter of every glyph (one mask per glyph) and
   thrown by its own Transform effect; glyphs shrink / fade on their own staggered clocks. */
jzReg('exit', 'shatterLite', { apply: function (m) {
    if (!ex2_hasOut(m)) return;
    var L = m.L, G = ex2_geo(m, true), sz = ex2_sz(m), H = ex2_hd(m), sd = ex2_itSeed(m), i, q;
    var Q = H + 'var x2d=hh(textIndex*3.3+SD*0.13+1201)*0.35,q=cl((PO-x2d)/0.65),e=oc(q);';
    if (ex2_matted(L) || G.arranged || ex2_crowded(m, 8) || !G.nv) {     // no copies: whole glyphs fly off toward random corners
        jzAnimator(L, 'JZ Out Scatter', [['ADBE Text Position 3D', [sz * 2.6, sz * 2.6, 0]]],
            Q + 'var dx=(hh(textIndex*5.1+SD*0.3+1202)<0.5?-1:1)+(hh(textIndex*6.7+SD*0.5+1206)*2-1)*0.5,dy=(hh(textIndex*2.9+SD*0.7+1207)<0.5?-1:1)+(hh(textIndex*8.3+SD*0.9+1205)*2-1)*0.5,dd=' + jzN(sz * 1.7) + '*(0.7+0.6*hh(textIndex*4.4+SD*0.21+1203));' +
            '[dx*dd*e/' + jzN(sz * 2.6) + '*100,(dy*dd*e+' + jzN(sz * 0.9) + '*q*q)/' + jzN(sz * 2.6) + '*100,0]');
        jzAnimator(L, 'JZ Out Spin', [['ADBE Text Rotation', 110]], Q + '(hh(textIndex*7.7+SD*0.33+1204)*2-1)*e*100');
        jzAnimator(L, 'JZ Out Shrink', [['ADBE Text Scale 3D', [55, 55, 100]]], Q + 'q*100');
        jzAnimator(L, 'JZ Out Fade', [['ADBE Text Opacity', 0]], Q + 'q>=1?100:x2sm(0.45,1,q)*100');
        return;
    }
    jzAnimator(L, 'JZ Out Shrink', [['ADBE Text Scale 3D', [45, 45, 100]]], Q + 'q*100');
    jzAnimator(L, 'JZ Out Fade', [['ADBE Text Opacity', 0]], Q + 'q>=1?100:x2sm(0.45,1,q)*100');
    var nm = ex2_nMask(L), perGlyph = nm === 0 && G.nv <= 40, fs = G.fs, eps = fs * 0.006;
    var hl = G.vert || G.nL < 2 ? fs * 0.85 : G.lead * 0.5, trk = ((ex2_td(L) || {}).tracking || 0) / 1000 * fs, gap = Math.max(0, trk) / 2 + fs * 0.02;
    var QD = [[-1, -1], [1, -1], [-1, 1], [1, 1]], lays = [L];
    for (q = 1; q < 4; q++) lays.push(ex2_copy(m, 'JZ Out Quarter ' + (q + 1), true, true));
    var r = G.rect, rcx = r.left + r.width / 2, rcy = r.top + r.height / 2, big = fs * 3;
    for (q = 0; q < 4; q++) {
        var Lx = lays[q], qx = QD[q][0], qy = QD[q][1], first = true;
        var gate = q === 0 ? H + 'PO<=0?1e4:0' : null;
        if (perGlyph) {
            for (i = 0; i < G.N; i++) {
                var g = G.g[i]; if (g.sp) continue;
                var gx0 = G.vert ? g.cx - fs * 0.7 : g.x0 - gap, gx1 = G.vert ? g.cx + fs * 0.7 : g.x1 + gap;
                var bx0 = qx < 0 ? gx0 : g.cx - eps, bx1 = qx < 0 ? g.cx + eps : gx1;
                var by0 = qy < 0 ? g.cy - hl : g.cy - eps, by1 = qy < 0 ? g.cy + eps : g.cy + hl;
                ex2_mask(Lx, ex2_box(bx0, by0, bx1, by1), false, 'JZ Out Quarter ' + (i + 1), first ? gate : null);
                first = false;
            }
        } else {
            ex2_mask(Lx, ex2_box(qx < 0 ? r.left - big : rcx - eps, qy < 0 ? r.top - big : rcy - eps, qx < 0 ? rcx + eps : r.left + r.width + big, qy < 0 ? rcy + eps : r.top + r.height + big),
                nm > 0, 'JZ Out Quarter', gate);
        }
        var dd = sz * 1.7 * (0.7 + 0.6 * ex2_r(sd, q, 1203)), jx = ex2_rs(sd, q, 1202) * 0.5, jy = ex2_rs(sd, q, 1205) * 0.5, d0 = 0.05 + ex2_r(sd, q, 1201) * 0.15;
        // thrown about the block centre: translation + a little spin and radial spread of the whole quarter set
        var TH = H + 'var q=cl((PO-' + jzN(d0) + ')/0.7),e=1-(1-q)*(1-q);', tf = jzEffect(Lx, 'ADBE Geometry2', 'JZ Out Throw');
        jzEP(tf, 1, [rcx, rcy]); jzEP(tf, 2, [rcx, rcy]);
        jzEX(tf, 2, TH + '[' + jzN(rcx) + '+' + jzN((qx + jx) * dd) + '*e,' + jzN(rcy) + '+' + jzN((qy + jy) * dd) + '*e+' + jzN(sz * 0.9) + '*q*q]');
        jzEX(tf, 4, TH + '100*(1+0.3*e)');
        jzEX(tf, 8, TH + jzN(ex2_rs(sd, q, 1204) * 24) + '*e');
    }
} });

// ================================================================ HOLDS
// Every hold scales by x2k = AMT x motionK, so it eases in after the entrance and fades out with any exit. Animator values are
// the largest amplitude (motionK = 1.6); the selector amount carries the live value.
var EX2_TAU = Math.PI * 2;
function ex2_idx(m) { return ex2_nGl(m) > 1 ? '(textIndex-1)' : jzN(m.o.mi || 0); }     // browser: n > 1 ? i : mi

/* ---- float — ふわふわ: every glyph bobs on its own soft sine + noise, drifting a touch sideways */
jzReg('hold', 'float', { apply: function (m) {
    var sz = ex2_sz(m), s = ex2_itSeed(m), A = sz * 0.075 * 1.6, ph = (s % 97) * 0.13;
    jzAnimator(m.L, 'JZ Hold Float', [['ADBE Text Position 3D', [A * 0.35, A * 1.15, 0]]], ex2_hd(m) + EX2_K +
        'var i=textIndex-1,x2f=x2k/1.6*100;[x2vn(time*0.6+i*0.31,SD+7)*x2f,(0.55*Math.sin(time*2.1+i*1.3+' + jzN(ph) + ')+0.6*x2vn(time*0.9+i*0.43,SD))/1.15*x2f,0]');
} });

/* ---- sway — ゆらぎ: the line swings like a pendulum hanging from a point just above it */
jzReg('hold', 'sway', { apply: function (m) {
    var r = ex2_rect(m), s = ex2_itSeed(m), sz = ex2_sz(m);
    ex2_rotAt(m, 'x2sw', r.left + r.width / 2, r.top - sz * 0.6, EX2_K + 'var x2sw=Math.sin(time*' + jzN(EX2_TAU / 3.2) + '+' + (s % 7) + ')*2.6*x2k;');
} });

/* ---- pulse — 脈動: a quick swell on every beat (0.5 s without a beat grid) */
jzReg('hold', 'pulse', { apply: function (m) {
    ex2_scaleC(m, 'x2pf', 'x2pf', EX2_K + 'var x2pf=1+0.055*Math.exp(-(time%0.5)*9)*x2k;');
} });

/* ---- shimmer — きらめき: glyphs twinkle in brightness on smooth noise; now and then one sparkles in the accent */
jzReg('hold', 'shimmer', { apply: function (m) {
    var acc = ex2_pick(m.ctx.sc.accent, m.ctx.sc.fg);
    var Q = ex2_hd(m) + EX2_K + 'var i=textIndex-1,x2tw=0.5+0.5*x2vn(time*3.2+i*1.7,SD),x2sp=hh(Math.floor(time*24)*1.37+i*7.7+SD*0.29+401)<0.03*x2k;';
    jzAnimator(m.L, 'JZ Hold Twinkle', [['ADBE Text Opacity', 0]], Q + '42*Math.min(1,x2k)*x2tw*x2tw');
    jzAnimator(m.L, 'JZ Hold Sparkle', [['ADBE Text Fill Color', jzHex(acc)], ['ADBE Text Scale 3D', [105, 105, 100]]], Q + 'x2sp?85:0');
} });

/* ---- colorRun — 色が走る: a soft accent highlight runs through the line again and again, lifting the glyphs it passes */
jzReg('hold', 'colorRun', { apply: function (m) {
    var acc = ex2_pick(m.ctx.sc.accent, m.ctx.sc.fg), sz = ex2_sz(m), per = ex2_cutN(m) + 5;
    var Q = ex2_hd(m) + 'var x2k2=AMT*Math.max(0,Math.min(1,M/0.7)),x2pos=((time*7)%' + per + '+' + per + ')%' + per + '-2.5,x2d=' + ex2_idx(m) + '-x2pos,x2wt=Math.exp(-x2d*x2d/1.6);x2wt=x2wt<0.02?0:x2wt*x2k2;';
    jzAnimator(m.L, 'JZ Hold Run Colour', [['ADBE Text Fill Color', jzHex(acc)]], Q + 'x2wt*90');
    jzAnimator(m.L, 'JZ Hold Run Lift', [['ADBE Text Position 3D', [0, -sz * 0.035, 0]]], Q + 'x2wt*100');
} });

/* ---- rotateSlow — ゆっくり回転: the line slowly turns about its centre (up to 10 degrees) */
jzReg('hold', 'rotateSlow', { apply: function (m) {
    var r = ex2_rect(m), dir = ((ex2_itSeed(m) >>> 1) & 1) ? 1 : -1;
    ex2_rotAt(m, 'x2rs', r.left + r.width / 2, r.top + r.height / 2, EX2_K + 'var x2rs=' + dir + '*Math.min(10,time*2.6)*x2k;');
} });

/* ---- trackBreathe — 字間の呼吸: letter spacing slowly opens and closes (Tracking; one glyph per line: glyph offsets) */
jzReg('hold', 'trackBreathe', { apply: function (m) {
    var L = m.L, W = 'var x2f=Math.sin(time*' + jzN(EX2_TAU / 2.8) + ')*x2k/1.6*100;';
    if (ex2_isVert(L)) {
        var td = ex2_td(L), fs = td ? td.fontSize : ex2_sz(m), lead = td && !td.autoLeading && td.leading > 0 ? td.leading : fs * 1.2, K = lead * 0.12 * 8;
        jzAnimator(L, 'JZ Hold Breathe', [['ADBE Text Position 3D', [0, K, 0]]], ex2_hd(m) + EX2_K + W + '[0,(textIndex-1-(textTotal-1)/2)*' + jzN(lead * 0.12) + '*x2f/' + jzN(K) + ',0]');
    } else jzAnimator(L, 'JZ Hold Breathe', [['ADBE Text Tracking Amount', 120]], ex2_hd(m) + EX2_K + W + 'x2f');
} });

/* ---- skewWobble — 斜め揺れ: the line leans left and right */
jzReg('hold', 'skewWobble', { apply: function (m) {
    jzAnimator(m.L, 'JZ Hold Lean', [['ADBE Text Skew', 19.2]], ex2_hd(m) + EX2_K + 'Math.sin(time*' + jzN(EX2_TAU / 1.9) + ')*x2k/1.6*100');
} });

/* ---- beatHop — 拍で跳ねる: one glyph per beat (0.45 s) hops with a squash, its neighbours ripple */
jzReg('hold', 'beatHop', { apply: function (m) {
    var sz = ex2_sz(m), N = ex2_cutN(m);
    var Q = ex2_hd(m) + EX2_K + 'var x2u=(time%0.45)/(0.45*0.85),x2b=Math.floor(time/0.45),x2c=((x2b%' + N + ')+' + N + ')%' + N +
        ',x2h=x2u<1?Math.pow(Math.sin(Math.PI*x2u),0.7):0,x2dd=Math.abs(' + ex2_idx(m) + '-x2c),x2a=x2h*(x2dd==0?1:(x2dd==1?0.3:0))*x2k/1.6*100;';
    jzAnimator(m.L, 'JZ Hold Hop', [['ADBE Text Position 3D', [0, -sz * 0.2 * 1.6, 0]], ['ADBE Text Scale 3D', [92, 112.8, 100]]], Q + 'x2a');
} });

/* ---- hWave — 横波: a sideways wave runs along the line, glyphs leaning with it */
jzReg('hold', 'hWave', { apply: function (m) {
    var sz = ex2_sz(m), Q = ex2_hd(m) + EX2_K + 'var x2a=time*' + jzN(EX2_TAU * 0.55) + '-(textIndex-1)*0.9,x2f=x2k/1.6*100;';
    jzAnimator(m.L, 'JZ Hold Wave X', [['ADBE Text Position 3D', [sz * 0.085 * 1.6, 0, 0]]], Q + 'Math.sin(x2a)*x2f');
    jzAnimator(m.L, 'JZ Hold Wave Lean', [['ADBE Text Skew', -9 * 1.6]], Q + 'Math.cos(x2a)*x2f');
} });

/* ---- heartbeat — 鼓動: a double thump (lub-dub) every 1.05 s, flushing toward the accent */
jzReg('hold', 'heartbeat', { apply: function (m) {
    var acc = ex2_pick(m.ctx.sc.accent, m.ctx.sc.fg), V = 'var x2u=time%1.05,x2v=Math.exp(-x2u*9)+(x2u>0.2?0.75*Math.exp(-(x2u-0.2)*9):0);';
    ex2_scaleC(m, 'x2hf', 'x2hf', EX2_K + V + 'var x2hf=1+0.055*x2v*x2k;');
    jzAnimator(m.L, 'JZ Hold Flush', [['ADBE Text Fill Color', jzHex(acc)]], ex2_hd(m) + EX2_K + V + 'Math.min(85,60*x2v*Math.min(1,x2k))');
} });

/* ---- orbitSmall — 小さな円運動: every glyph circles a little, each a step behind the previous one */
jzReg('hold', 'orbitSmall', { apply: function (m) {
    var sz = ex2_sz(m), R = sz * 0.05 * 1.6, dir = ((ex2_itSeed(m) >>> 2) & 1) ? 1 : -1;
    jzAnimator(m.L, 'JZ Hold Orbit', [['ADBE Text Position 3D', [R, R, 0]]], ex2_hd(m) + EX2_K +
        'var x2a=time*' + jzN(EX2_TAU / 1.7 * dir) + '+(textIndex-1)*0.9,x2f=x2k/1.6*100;[Math.cos(x2a)*x2f,Math.sin(x2a)*x2f,0]');
} });

/* ---- jelly — ゼリー: glyphs squash and stretch on their baseline in a travelling wave */
jzReg('hold', 'jelly', { apply: function (m) {
    var td = ex2_td(m.L), fs = td ? td.fontSize : ex2_sz(m);
    jzAnimator(m.L, 'JZ Hold Jelly', [['ADBE Text Scale 3D', [116, 84, 100]], ['ADBE Text Position 3D', [0, fs * 0.05 * 1.6, 0]]], ex2_hd(m) + EX2_K +
        'Math.sin(time*' + jzN(EX2_TAU * 1.1) + '-(textIndex-1)*0.55)*x2k/1.6*100');
} });

/* ---- scanBand — 走査帯: every 2.2 s a band scans down the line; inside it the text is shifted sideways, an accent hairline
   marks its lower edge. The band = a linked copy shown through two masks (moved by mask expansion), cut out of the lyric by
   the same two masks; only while holding (not during the entrance / exit). */
jzReg('hold', 'scanBand', { apply: function (m) {
    var L = m.L, r = ex2_rect(m), sz = ex2_sz(m), H = ex2_hd(m), acc = ex2_pick(m.ctx.sc.accent, m.ctx.sc.fg);
    var pad = sz * 0.1, y0 = r.top - pad, h = r.height + pad * 2, bh = Math.max(sz * 0.24, h * 0.12), X0 = r.left - pad, X1 = r.left + r.width + pad;
    var BX = (h + bh) * 2 + sz, BU = (h + bh) * 4 + sz, lw = Math.max(1, sz * 0.012);
    var V = H + EX2_K + 'var x2c=Math.floor(time/2.2),x2v=(time-x2c*2.2)/1.54,x2on=x2v<1&&x2k>=0.01&&PO<=0;if(!x2on)x2v=-1.5;var x2e=' + jzN(h + bh) + '*x2v;';
    var above = null;
    if (ex2_nMask(L) === 0 && !ex2_matted(L) && !ex2_crowded(m, 12)) {
        var D = ex2_copy(m, 'JZ Hold Band', true, false);
        jzSetExpr(jzXf(D, 'ADBE Position'), V + 'var a=parent.transform.anchorPoint;[a[0]+' + jzN(sz * 0.075) + '*x2k*(hh(x2c*1.7+SD*0.3+451)<0.5?1:-1),a[1]]');
        var lo = ex2_box(X0 - BX, y0 - BU, X1 + BX, y0), hi = ex2_box(X0 - BX, y0 - BU - bh, X1 + BX, y0 - bh);
        ex2_mask(D, lo, false, 'JZ Band Bottom', V + 'x2e', MaskMode.ADD);
        ex2_mask(D, hi, false, 'JZ Band Top', V + 'x2e', MaskMode.SUBTRACT);
        ex2_mask(L, lo, false, 'JZ Band Cut', V + 'x2e', MaskMode.SUBTRACT);
        ex2_mask(L, hi, false, 'JZ Band Keep', V + 'x2e', MaskMode.ADD);
        above = D;
    }
    var S = ex2_shape(m, 'JZ Hold Scan', above, false, false), g = jzGrp(S, 'scan'), rc = jzAddRect(g, X1 - X0, lw, 0);
    jzAddFill(g, acc);
    jzNoGhost(S);
    jzSetExpr(rc.property('ADBE Vector Rect Position'), V + '[' + jzN((X0 + X1) / 2) + ',' + jzN(y0 - lw / 2) + '+x2e]');
    jzSetExpr(jzXf(S, 'ADBE Opacity'), V + 'x2on?55*Math.min(1,x2k):0');
} });

/* ---- noiseDrift — ノイズ漂流: glyphs wander and turn slowly on smooth noise */
jzReg('hold', 'noiseDrift', { apply: function (m) {
    var sz = ex2_sz(m), A = sz * 0.075 * 1.6, Q = ex2_hd(m) + EX2_K + 'var x2t=time*0.35,i=textIndex-1,x2f=x2k/1.6*100;';
    jzAnimator(m.L, 'JZ Hold Drift', [['ADBE Text Position 3D', [A, A, 0]]], Q + '[x2vn(x2t+i*1.7,SD+11)*x2f,x2vn(x2t+i*2.3,SD+23)*x2f,0]');
    jzAnimator(m.L, 'JZ Hold Drift Turn', [['ADBE Text Rotation', 7 * 1.6]], Q + 'x2vn(x2t*1.3+i*0.9,SD+37)*x2f');
} });

/* ---- tilt — シーソー: the baseline seesaws about the centre while the glyphs stay upright (layer rotation + per-glyph counter-rotation) */
jzReg('hold', 'tilt', { apply: function (m) {
    var r = ex2_rect(m), pre = EX2_K + 'var x2t=Math.sin(time*' + jzN(EX2_TAU / 4.2) + '+' + (ex2_itSeed(m) % 5) + ')*4*x2k;';
    ex2_rotAt(m, 'x2t', r.left + r.width / 2, r.top + r.height / 2, pre);
    jzAnimator(m.L, 'JZ Hold Upright', [['ADBE Text Rotation', -10]], m.HD + pre + 'x2t*10');
} });

/* ---- zoomSlow — じわ寄り: a slow push-in over the whole cut (up to +7 %) */
jzReg('hold', 'zoomSlow', { apply: function (m) {
    ex2_scaleC(m, 'x2z', 'x2z', EX2_K + 'var x2zu=cl(time/DUR),x2z=1+0.07*(1-(1-x2zu)*(1-x2zu))*x2k;');
} });

/* ---- stretchPulse — 横伸び拍: on every beat (0.5 s) the line kicks wider and a little flatter */
jzReg('hold', 'stretchPulse', { apply: function (m) {
    ex2_scaleC(m, '(1+0.12*x2kk)', '(1-0.045*x2kk)', EX2_K + 'var x2kk=Math.exp(-(time%0.5)*8)*x2k;');
} });

/* ---- glitchJump — 時々ずれる: every third of a second there may be a short glitch: the line jumps sideways for a few frames,
   on the first frame it is sliced into shifted bands and may flash the ghost colour */
jzReg('hold', 'glitchJump', { apply: function (m) {
    var L = m.L, sz = ex2_sz(m), H = ex2_hd(m), k = ex2_scaleK(L), gh = ex2_pick(m.ctx.sc.ghostA, m.ctx.sc.accent, m.ctx.sc.fg);
    var S = EX2_K + 'var x2s=Math.floor(time*24),x2l=Math.floor(x2s/8),x2p=x2s-x2l*8,x2on=x2k>=0.01&&x2p<=2&&hh(x2l*3.17+SD*0.37+501)<=0.4+0.3*G;';
    m.parts.pos.push(S + 'if(x2on)d=[d[0]+(hh(x2l*5.31+SD*0.53+502)*2-1)*' + jzN(sz * 0.2 * k[0]) + '*x2k,d[1]+(hh(x2l*6.7+SD*0.61+503)*2-1)*' + jzN(sz * 0.04 * k[1]) + '*x2k];');
    var ww = jzEffect(L, 'ADBE Wave Warp', 'JZ Hold Glitch Bands');
    jzEP(ww, 1, 2); jzEP(ww, 4, 0); jzEP(ww, 5, 0); jzEP(ww, 6, 1);
    jzEX(ww, 2, H + S + 'x2on&&x2p==0?(hh(x2l*7.3+SD*0.7+505)*2-1)*' + jzN(sz * 0.12) + '*x2k:0');
    jzEX(ww, 3, H + S + jzN(sz * 0.3) + '+hh(x2l*8.9+SD*0.8+504)*' + jzN(sz * 0.6));
    jzEX(ww, 7, H + S + 'hh(x2l*9.7+SD*0.9+507)*360');
    jzAnimator(L, 'JZ Hold Glitch Colour', [['ADBE Text Fill Color', jzHex(gh)]], H + S + 'x2on&&x2p==0&&hh(x2l*4.1+SD*0.2+506)<0.5?100:0');
} });

/* ---- echoTrail — 残像を引く: the line drifts on a slow Lissajous path trailing three fading echoes in the sub colour
   (a linked copy below the lyric with the Echo effect; the drift is a text animator so the echoes see it) */
jzReg('hold', 'echoTrail', { apply: function (m) {
    var L = m.L, sz = ex2_sz(m), H = ex2_hd(m), s = ex2_itSeed(m), w = EX2_TAU / 3.4, ph = (s % 100) * 0.1, Ax = sz * 0.09 * 1.6, Ay = sz * 0.05 * 1.6;
    jzAnimator(L, 'JZ Hold Echo Drift', [['ADBE Text Position 3D', [Ax, Ay, 0]]], H + EX2_K +
        'var x2f=x2k/1.6*100;[Math.sin(' + jzN(w) + '*time+' + jzN(ph) + ')*x2f,Math.sin(' + jzN(w * 1.37) + '*time+' + jzN(ph * 1.3) + ')*x2f,0]');
    if (ex2_matted(L) || ex2_crowded(m, 10)) return;
    var D = ex2_copy(m, 'JZ Hold Echo', false, false), col = ex2_pick(m.ctx.sc.sub, jzTextColor(L));
    try { D.moveAfter(L); } catch (e0) {}
    jzTextDoc(D, function (d) {
        try { if (d.applyFill !== false) d.fillColor = jzHex(col); } catch (e1) {}
        try { if (d.applyStroke) d.strokeColor = jzHex(col); } catch (e2) {}
    });
    jzSetExpr(jzXf(D, 'ADBE Opacity'), H + EX2_K + 'parent.transform.opacity*0.55*Math.min(1,x2k)*Math.max(0,1-PO*4)');
    var ec = jzEffect(D, 'ADBE Echo', 'JZ Hold Echo');
    jzEP(ec, 1, -0.3); jzEP(ec, 2, 3); jzEP(ec, 3, 1); jzEP(ec, 4, 0.62); jzEP(ec, 5, 5);
} });
