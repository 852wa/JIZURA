// ================================================================ pack enter part 2 (AE port of src/11p_enter.js)
// checker randomOrder bounceBig squashDrop rubber glitchIn echoIn whip skewIn trackIn trackOut blurStagger fadeStagger
// waveIn spiralIn zoomOut resolve magnet inkBleed neonOn cursorSweep stamp
// Per-glyph motion = text animators with Expression Selectors (amount −100..100 % of the animator's value, per glyph via
// textIndex / textTotal). Graphics the browser draws around the item (tiles, bars, impact lines) are shape layers parented
// to the text layer (so they follow the layout + hold / exit transforms) and placed directly above it.

// ---------------------------------------------------------------- shared helpers (en2_*)
// extra easings used inside expression strings (JZ_FNS has cl oe ioe oc ic iq ie ob bo)
var EN2_FNS = 'function oq4(x){x=cl(x);return 1-Math.pow(1-x,4);}function oq5(x){x=cl(x);return 1-Math.pow(1-x,5);}' +
    'function oqd(x){x=cl(x);return 1-(1-x)*(1-x);}function ios(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}' +
    'function sm(a,b,x){var t=cl((x-a)/(b-a));return t*t*(3-2*t);}' +
    'function hr(a,b){var x=Math.sin(a*12.9898+b*78.233+SD*0.6173)*43758.5453;return x-Math.floor(x);}\n';
// NOTE: AE seeds random() per property, so a random value that several animators must agree on (a glyph's delay, its
// direction …) comes from hr(textIndex, salt) — a pure hash of the glyph index — instead of seedRandom/random().
// per-glyph order (ordLR) + stagger (stg) → q
function en2_stg(spread) { return 'var n=textTotal,o=n>1?(textIndex-1)/(n-1):0,q=cl((P-' + jzN(spread) + '*o)/' + jzN(1 - spread) + ');'; }
// compact timing header for the many small tile expressions (P only)
function en2_mini(m) {
    var c = m.c, IN = Math.max(0.02, c.inDur || 0.3), DL = (m.o.mi || 0) * (c.stagger || 0.04);
    return 'var P=Math.max(0,Math.min(1,(time-' + jzN(DL) + ')/' + jzN(IN) + '));';
}
function en2_end(m) { var c = m.c; return (m.o.mi || 0) * (c.stagger || 0.04) + Math.max(0.02, c.inDur || 0.3); }
// the browser's J.h (hash of up to 5 ints) so seeded directions (dirOf) match the web version
function en2_h(a, b, c, d, e) {
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
function en2_dir(m, salt) { return en2_h(m.c.seed | 0, salt, 5) / 4294967296 < 0.5 ? -1 : 1; }
function en2_isHex(c) { return typeof c === 'string' && c.charAt(0) === '#' && (c.length === 7 || c.length === 4); }
function en2_pick(a, b, c) { if (en2_isHex(a)) return a; if (en2_isHex(b)) return b; if (en2_isHex(c)) return c; return '#FFFFFF'; }
function en2_same(a, b) { return String(a || '').toLowerCase() === String(b || '').toLowerCase(); }
// contrasting flash colour: accent2 / fg when the text already is the accent colour, else accent
function en2_flash(m) {
    var sc = m.ctx.sc, col = jzTextColor(m.L);
    return en2_same(col, sc.accent) ? en2_pick(sc.accent2, sc.fg) : en2_pick(sc.accent, sc.fg);
}
// approximate advance of a glyph in em
function en2_adv(ch) {
    var c = ch.charCodeAt(0);
    if (ch === ' ') return 0.3;
    if (c >= 0xFF61 && c <= 0xFF9F) return 0.5;
    return c < 0x2000 ? 0.56 : 1;
}
// glyph geometry in the text layer's own space (textIndex order): centres xs / ys, advances ws, line height lh
function en2_geom(m) {
    var L = m.L, r = jzRect(L), fs = m.size, td = null, i, j;
    try { td = L.property('ADBE Text Properties').property('ADBE Text Document').value; } catch (e0) {}
    var text = td ? String(td.text) : '', trk = td ? (td.tracking || 0) / 1000 * fs : 0;
    var lines = text.split(/\r\n|\r|\n|\u0003/), nL = lines.length, lead = fs * 1.2;
    try { if (td && !td.autoLeading && td.leading > 0) lead = td.leading; } catch (e1) {}
    var just = 'c';
    try { if (td.justification === ParagraphJustification.LEFT_JUSTIFY) just = 'l'; else if (td.justification === ParagraphJustification.RIGHT_JUSTIFY) just = 'r'; } catch (e2) {}
    var rows = [], maxW = 0, vert = nL > 1;
    for (i = 0; i < nL; i++) {
        var cs = jzChars(lines[i]), ws = [], w = 0;
        for (j = 0; j < cs.length; j++) { var a = en2_adv(cs[j]) * fs; ws.push(a); w += a + (j < cs.length - 1 ? trk : 0); }
        if (cs.length > 1) vert = false;
        rows.push({ cs: cs, ws: ws, w: w }); maxW = Math.max(maxW, w);
    }
    var k = maxW > 0 ? r.width / maxW : 1; if (!(k > 0.5 && k < 2)) k = 1;
    var lh = r.height - (nL - 1) * lead; if (!(lh > fs * 0.5 && lh < fs * 1.6)) lh = fs * 0.95;
    var cx = r.left + r.width / 2, xs = [], ys = [], wa = [], li = [], ci = [], nl = [];
    for (i = 0; i < nL; i++) {
        var R = rows[i], x = just === 'l' ? r.left : (just === 'r' ? r.left + r.width - R.w * k : cx - R.w * k / 2), y = r.top + lh / 2 + i * lead;
        for (j = 0; j < R.cs.length; j++) {
            xs.push(x + R.ws[j] * k / 2); ys.push(y); wa.push(R.ws[j] * k); x += (R.ws[j] + trk) * k;
            li.push(i); ci.push(j); nl.push(R.cs.length);
        }
    }
    return { r: r, xs: xs, ys: ys, ws: wa, li: li, ci: ci, nl: nl, nL: nL, lh: lh, vert: vert, n: xs.length, cx: cx, cy: r.top + r.height / 2, lead: lead };
}
// put a new layer (shape layer or duplicate) into the text layer's own space, directly above it
function en2_attach(m, S) {
    try { S.setParentWithJump(m.L); } catch (e) { try { S.parent = m.L; } catch (e2) {} }
    var tr = S.property('ADBE Transform Group');
    try { tr.property('ADBE Anchor Point').setValue([0, 0]); } catch (e3) {}
    tr.property('ADBE Position').setValue([0, 0]); tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    try { S.moveBefore(m.L); } catch (e4) {}
    return S;
}
function en2_text(L) { try { return String(L.property('ADBE Text Properties').property('ADBE Text Document').value.text); } catch (e) { return ''; } }
// helper shape layers (checker tiles, decode block, cursor bar, stamp lines): the browser draws them with ghost off -> jzNoGhost
function en2_shape(m, name) { var S = m.ctx.comp.layers.addShape(); S.name = name; return jzNoGhost(en2_attach(m, S)); }
// keep the text box centre fixed while the layer is scaled by fS / rotated by rS (expression strings; the layer may be anchored
// at its left / right edge): the browser scales / rotates items about their box centre (scaleAbout)
function en2_pivot(m, fS, rS) {
    var L = m.L, tr = L.property('ADBE Transform Group'), a = tr.property('ADBE Anchor Point').value, s = tr.property('ADBE Scale').value;
    var rot = tr.property('ADBE Rotate Z').value * Math.PI / 180, r = jzRect(L);
    var ux = (r.left + r.width / 2 - a[0]) * s[0] / 100, uy = (r.top + r.height / 2 - a[1]) * s[1] / 100;
    var vx = Math.cos(rot) * ux - Math.sin(rot) * uy, vy = Math.sin(rot) * ux + Math.cos(rot) * uy;
    if (Math.abs(vx) + Math.abs(vy) < 0.5) return;
    var X = jzN(vx), Y = jzN(vy);
    m.parts.pos.push('var n2f=' + fS + ',n2r=(' + (rS || '0') + ')*Math.PI/180,n2c=Math.cos(n2r),n2s=Math.sin(n2r);d=[d[0]+' + X + '-n2f*(n2c*' + X + '-n2s*' + Y + '),d[1]+' + Y + '-n2f*(n2s*' + X + '+n2c*' + Y + ')];');
}

/* ---- checker — 市松: accent tiles pop up in a checkerboard / left→right order and shrink away, each tile uncovering its square of text */
jzReg('enter', 'checker', { selfHide: true, apply: function (m) {
    var L = m.L, r = jzRect(L), size = m.size, seed = m.c.seed | 0, acc = en2_pick(m.ctx.sc.accent, m.ctx.sc.fg);
    var mg = size * 0.15, W = r.width + mg * 2, H = r.height + mg * 2, cell = size * 0.34;
    while ((W / cell) * (H / cell) > 96) cell *= 1.25;      // the browser allows 320 tiles; masks are heavier in AE
    var nx = Math.ceil(W / cell), ny = Math.ceil(H / cell), ox = r.left + r.width / 2 - nx * cell / 2, oy = r.top + r.height / 2 - ny * cell / 2;
    var mh = en2_mini(m), S = en2_shape(m, 'JZ Checker'), ix, iy, C = jzN(cell);
    for (iy = 0; iy < ny; iy++) for (ix = 0; ix < nx; ix++) {
        var d = ((ix + iy) & 1) * 0.25 + (nx > 1 ? ix / (nx - 1) : 0) * 0.3 + jzR(seed, ix, iy, 7) * 0.08;
        var tx = ox + (ix + 0.5) * cell, ty = oy + (iy + 0.5) * cell, U = mh + 'var u=(P-' + jzN(d) + ')/0.22;';
        // text clip: the tile's square grows (outQuart) from its centre — full-size mask contracted by a negative expansion
        var mk = jzMaskRect(L, tx - cell / 2 - 0.5, ty - cell / 2 - 0.5, tx + cell / 2 + 0.5, ty + cell / 2 + 0.5);
        mk.property('ADBE Mask Offset').expression = U + 'u<=0?0:-' + C + '/2*Math.pow(1-Math.min(1,u),4)';
        mk.property('ADBE Mask Opacity').expression = U + 'u>0?100:0';
        // accent tile on top: pops in, then shrinks away (inCubic) before the text square is complete
        var g = jzGrp(S, 't' + ix + '_' + iy);
        jzAddRect(g, cell, cell, 0); jzAddFill(g, acc, 90);
        jzGX(g).property('ADBE Vector Position').setValue([tx, ty]);
        jzGX(g).property('ADBE Vector Scale').expression = U + 'var k=(u<=0||u>=0.75)?0:(1-Math.pow(u/0.75,3))*Math.min(1,u*6);[k*100,k*100]';
    }
    // once the entrance is over the text is no longer clipped (holds / exits may move glyphs outside the tile grid)
    var mo = jzMaskRect(L, r.left, r.top, r.left + r.width, r.top + r.height), E = jzN(en2_end(m));
    mo.property('ADBE Mask Offset').expression = 'time>=' + E + '?1e4:0';
    mo.property('ADBE Mask Opacity').expression = 'time>=' + E + '?100:0';
} });

/* ---- randomOrder — ランダム順: glyphs pop in (scale 1.45 → 1) in a random order, flashing the accent colour as they land */
jzReg('enter', 'randomOrder', { selfHide: true, apply: function (m) {
    var L = m.L, q = m.HD + EN2_FNS + 'var u=cl((P-hr(textIndex,61)*0.62)/0.38);';
    jzAnimator(L, 'JZ In Pop', [['ADBE Text Scale 3D', [300, 300, 100]]], q + 'u<=0||u>=1?0:0.45*(1-oq5(u))/2*100');
    jzAnimator(L, 'JZ In Flash', [['ADBE Text Fill Color', jzHex(en2_flash(m))]], q + 'u>0&&u<0.42?100:0');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'u<=0?100:(1-cl(u*6))*100');
} });

/* ---- bounceBig — 大ジャンプ: each glyph leaps up from below, lands with a squash and bounces twice */
jzReg('enter', 'bounceBig', { selfHide: true, apply: function (m) {
    var L = m.L, h = m.size;
    var q = m.HD + en2_stg(0.35) + 'var y=0,s=0;if(q<0.5){s=q/0.5;y=7.666*s*s-9.266*s+1.6;}else if(q<0.76){s=(q-0.5)/0.26;y=-0.96*s*(1-s);}else if(q<0.9){s=(q-0.76)/0.14;y=-0.24*s*(1-s);}' +
        'var imp=Math.exp(-Math.pow((q-0.5)/0.035,2))+0.6*Math.exp(-Math.pow((q-0.76)/0.03,2)),sy=1-0.3*imp,sx=1+0.24*imp,on=q>0&&q<1;';
    jzAnimator(L, 'JZ In Jump', [['ADBE Text Position 3D', [0, h * 2, 0]]], q + 'on?[0,(y+(1-sy)/2)/2*100,0]:[0,0,0]');
    jzAnimator(L, 'JZ In Squash', [['ADBE Text Scale 3D', [300, 300, 100]]], q + 'on?[(sx-1)/2*100,(sy-1)/2*100,0]:[0,0,0]');
    jzAnimator(L, 'JZ In Tilt', [['ADBE Text Rotation', 28]], q + m.seedR + 'var rs=random(-1,1);on&&q<0.5?rs*Math.sin(Math.PI*s)*100:0');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-cl(q*7))*100');
} });

/* ---- squashDrop — 潰れて着地: glyphs fall in stretched, squash flat on landing and wobble back */
jzReg('enter', 'squashDrop', { selfHide: true, apply: function (m) {
    var L = m.L, h = m.size;
    var q = m.HD + en2_stg(0.4) + 'var dy=0,sy=1,t=0;if(q<0.22){t=q/0.22;dy=-(1-t*t)*1.7;sy=1+0.4*t;}else{t=(q-0.22)/0.78;sy=1-0.58*Math.exp(-3*t)*Math.cos(t*6.2)*(1-t);}' +
        'var sx=1/Math.pow(sy,0.8),on=q>0&&q<1;';
    jzAnimator(L, 'JZ In Fall', [['ADBE Text Position 3D', [0, h * 2, 0]]], q + 'on?[0,(dy+(1-sy)/2)/2*100,0]:[0,0,0]');
    jzAnimator(L, 'JZ In Squash', [['ADBE Text Scale 3D', [300, 300, 100]]], q + 'on?[(sx-1)/2*100,(sy-1)/2*100,0]:[0,0,0]');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-cl(q*10))*100');
} });

/* ---- rubber — ゴム伸び: glyphs snap open from a thin sliver like rubber (damped horizontal stretch, volume kept) */
jzReg('enter', 'rubber', { selfHide: true, apply: function (m) {
    var L = m.L;
    var q = m.HD + en2_stg(0.4) + 'var f=Math.pow(1-q,2)*Math.cos(q*3.5*Math.PI),sx=Math.max(0.03,1-f),sy=Math.max(0.72,Math.min(1.45,1+(1-sx)*0.45)),on=q>0&&q<1;';
    jzAnimator(L, 'JZ In Rubber', [['ADBE Text Scale 3D', [300, 300, 100]]], q + 'on?[(sx-1)/2*100,(sy-1)/2*100,0]:[0,0,0]');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-cl(q*6))*100');
} });

/* ---- glitchIn — グリッチ出現: glyphs flicker in at random, jittering, recoloured and stretched, over sliding glitch bands */
jzReg('enter', 'glitchIn', { selfHide: true, apply: function (m) {
    var L = m.L, sc = m.ctx.sc, size = m.size, cols = [], k, all = [sc.accent, sc.ghostA, sc.ghostB, sc.accent2];
    for (k = 0; k < all.length; k++) if (en2_isHex(all[k])) cols.push(all[k]);
    var base = m.HD + EN2_FNS + 'var st=0.38+0.52*hr(textIndex,71),u=P/st,on=P<st,F=Math.floor(time*12),i=textIndex;';
    jzAnimator(L, 'JZ In Glitch Hide', [['ADBE Text Opacity', 0]], base + 'on?(hr(i,F*5+72)>0.25*cl(P*12)+0.75*u?100:0):0');
    jzAnimator(L, 'JZ In Glitch Jitter', [['ADBE Text Position 3D', [size * 0.5, size * 0.14, 0]]], base + 'var j=on?1-u:0;[(hr(i,F*5+73)*2-1)*j*100,(hr(i,F*5+74)*2-1)*j*100,0]');
    jzAnimator(L, 'JZ In Glitch Stretch', [['ADBE Text Scale 3D', [300, 100, 100]]], base + 'on&&hr(i,F*5+77)<0.35?(0.55+1.35*hr(i,F*5+78)-1)/2*100:0');
    for (k = 0; k < cols.length; k++)
        jzAnimator(L, 'JZ In Glitch Colour ' + (k + 1), [['ADBE Text Fill Color', jzHex(cols[k])]], base + 'on&&hr(i,F*5+75)<0.55&&Math.floor(hr(i,F*5+76)*' + cols.length + ')==' + k + '?100:0');
    // horizontal glitch bands (the browser's hBands): stepped square-wave displacement of rows
    var ww = jzEffect(L, 'ADBE Wave Warp', 'JZ In Glitch Bands');
    jzEP(ww, 1, 2); jzEP(ww, 4, 0); jzEP(ww, 5, 0); jzEP(ww, 6, 1);
    jzEX(ww, 2, m.HD + 'posterizeTime(12);seedRandom(SD+Math.floor(time*12)*3,true);var a=random(),b=random();P>0&&P<0.85&&a<0.6?b*SZ*0.45*Math.pow(1-P,1.2):0');
    jzEX(ww, 3, m.HD + 'posterizeTime(12);seedRandom(SD+Math.floor(time*12)+9,true);random(SZ*0.25,SZ*0.9)');
    jzEX(ww, 7, m.HD + 'posterizeTime(12);seedRandom(SD+Math.floor(time*12)+5,true);random(0,360)');
} });

/* ---- echoIn — 残像集束: three accent outline copies of every glyph collapse onto it while the glyph fades in */
jzReg('enter', 'echoIn', { selfHide: true, apply: function (m) {
    var L = m.L, sc = m.ctx.sc, col = en2_pick(sc.accent, sc.fg), size = m.size, nLay = 0;
    try { nLay = m.ctx.comp.numLayers; } catch (e0) {}
    var nc = nLay > 30 ? 1 : (nLay > 18 ? 2 : 3), q = m.HD + EN2_FNS + en2_stg(0.35), prev = L, k;
    var sw = Math.max(1.4 * m.u, size * 0.02);
    // the copies are made before the lyric's own animators are added (they only carry the layout's placement animators)
    for (k = 1; k <= nc; k++) {
        var D = L.duplicate();
        D.name = 'JZ Echo ' + k;
        jzTextDoc(D, function (td) { td.applyFill = false; td.applyStroke = true; td.strokeColor = jzHex(col); td.strokeWidth = sw; });
        en2_attach(m, D); D.moveAfter(prev); prev = D;
        var ek = q + 'var k=1-oq4(q),on=q>0&&q<1;';
        jzAnimator(D, 'JZ Echo Scale', [['ADBE Text Scale 3D', [300, 300, 100]]], ek + 'on?' + jzN(k * 0.3) + '*k/2*100:0');
        jzAnimator(D, 'JZ Echo Fade', [['ADBE Text Opacity', 0]], ek + 'on?(1-' + jzN(0.95 - k * 0.2) + '*Math.min(1,k*1.8)*cl(q*6))*100:100');
    }
    jzAnimator(L, 'JZ In Echo Grow', [['ADBE Text Scale 3D', [300, 300, 100]]], q + 'q>0&&q<1?-0.12*(1-oq4(q))/2*100:0');
    jzAnimator(L, 'JZ In Echo Fade', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-cl(q*2.2))*100');
} });

/* ---- whip — ホイップ: the line whips in from the side (outExpo), leaning into the move and swinging back, with a speed streak */
jzReg('enter', 'whip', { apply: function (m) {
    var L = m.L, dir = en2_dir(m, 19), g = en2_geom(m), r = g.r, s = jzXf(L, 'ADBE Scale').value, size = m.size;
    var D = Math.max(size * 4.5, r.width * 0.9) * Math.abs(s[0]) / 100;
    m.parts.pos.push('var n2e=oe(P);d=[d[0]+' + jzN(dir * D) + '*(1-n2e),d[1]];');
    m.parts.op.push('f*=cl(P*8);');
    var sk = m.HD + EN2_FNS + 'var e=oe(P),sk=(' + dir + ')*34*Math.pow(1-e,0.7)-(' + dir + ')*14*Math.sin(Math.PI*cl((P-0.3)/0.7))*(1-sm(0.6,1,P));';
    jzAnimator(L, 'JZ In Whip Lean', [['ADBE Text Skew', 70]], sk + 'P>=1?0:sk/70*100');
    // the browser shears the whole item: glyphs on other lines slide sideways by tan(skew) * their height from the centre
    var dy = [], mx = 0, i;
    for (i = 0; i < g.n; i++) { dy.push(g.ys[i] - g.cy); mx = Math.max(mx, Math.abs(g.ys[i] - g.cy)); }
    if (mx > size * 0.2) {
        var K = mx * 1.2;
        jzAnimator(L, 'JZ In Whip Shear', [['ADBE Text Position 3D', [K, 0, 0]]], sk + 'var Y=' + jzArrExpr(dy) + ';var y=Y[textIndex-1]||0;P>=1?0:Math.tan(sk*Math.PI/180)*y/' + jzN(K) + '*100');
    }
    // speed streak: directional blur along the move while it is fast
    var db = jzEffect(L, 'ADBE Motion Blur', 'JZ In Whip Streak');
    jzEP(db, 1, 90); jzEX(db, 2, m.HD + '(1-oe(P))*SZ*0.9');
} });

/* ---- skewIn — スキュー: glyphs slide in slanted from the side and straighten up with a little overshoot (pivot at the foot) */
jzReg('enter', 'skewIn', { selfHide: true, apply: function (m) {
    var L = m.L, dir = en2_dir(m, 23), size = m.size, h = size;
    var q = m.HD + EN2_FNS + en2_stg(0.45) + 'var sk=Math.max(-66,Math.min(66,(' + dir + ')*60*(1-ob(q,1.6)))),on=q>0&&q<1;';
    jzAnimator(L, 'JZ In Skew', [['ADBE Text Skew', 66]], q + 'on?sk/66*100:0');
    jzAnimator(L, 'JZ In Skew Slide', [['ADBE Text Position 3D', [size * 2, 0, 0]]], q + 'var dx=-Math.tan(sk*Math.PI/180)*' + jzN(h / 2) + '+(' + dir + ')*(1-oq5(q))*' + jzN(size * 0.7) + ';on?dx/' + jzN(size * 2) + '*100:0');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-cl(q*3))*100');
} });

// per-glyph spread factor for tracking moves: index in its line − line centre (vertical text: line − centre, along y)
function en2_trackAnim(m, name, em) {
    var g = en2_geom(m), f = [], mx = 0, i;
    for (i = 0; i < g.n; i++) { var v = g.vert ? g.li[i] - (g.nL - 1) / 2 : g.ci[i] - (g.nl[i] - 1) / 2; f.push(v); mx = Math.max(mx, Math.abs(v)); }
    if (mx <= 0) return;
    var K = mx * Math.abs(em) * m.size, sg = em < 0 ? -1 : 1;
    jzAnimator(m.L, name, [['ADBE Text Position 3D', [K, K, 0]]], m.HD + 'var F=' + jzArrExpr(f) + ';var v=(F[textIndex-1]||0)/' + jzN(mx) + '*' + sg + '*Math.pow(1-P,5)*100;' + (g.vert ? '[0,v,0]' : '[v,0,0]'));
}

/* ---- trackIn — 字間収束: wide letter-spacing closes in (outQuint) while the line fades up */
jzReg('enter', 'trackIn', { apply: function (m) {
    if (jzCount(en2_text(m.L)) <= 1) m.parts.pos.push('var n2e=1-Math.pow(1-P,5);d=[d[0]+(value[0]-thisComp.width/2)*0.9*(1-n2e),d[1]];');
    else en2_trackAnim(m, 'JZ In Track', 1.6);
    m.parts.op.push('f*=oc(cl(P*1.7));');
} });

/* ---- trackOut — 字間拡張: glyphs start piled up (negative spacing, see-through) and spread out to their places */
jzReg('enter', 'trackOut', { apply: function (m) {
    if (jzCount(en2_text(m.L)) <= 1) m.parts.pos.push('var n2e=1-Math.pow(1-P,5);d=[d[0]+(thisComp.width/2-value[0])*(1-n2e),d[1]+(thisComp.height/2-value[1])*(1-n2e)];');
    else en2_trackAnim(m, 'JZ In Track', -0.72);
    jzAnimator(m.L, 'JZ In Track Fade', [['ADBE Text Opacity', 0]], m.HD + '0.45*Math.pow(1-P,5)*100');
    m.parts.op.push('f*=cl(P*2.5);');
} });

/* ---- blurStagger — ブラー段差: glyphs come into focus one after another, settling down from a larger, blurred state */
jzReg('enter', 'blurStagger', { selfHide: true, apply: function (m) {
    var L = m.L, size = m.size, bl = Math.min(42 * m.u, size * 0.14);
    var q = m.HD + en2_stg(0.55) + 'var e=oc(q),on=q>0&&q<1;';
    jzAnimator(L, 'JZ In Focus', [['ADBE Text Blur', [bl, bl]]], q + 'on?(1-e)*100:0');
    jzAnimator(L, 'JZ In Settle', [['ADBE Text Scale 3D', [300, 300, 100]], ['ADBE Text Position 3D', [0, -size * 0.16 / 0.175, 0]]], q + 'on?0.175*(1-e)*100:0');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-Math.pow(e,0.6))*100');
} });

/* ---- fadeStagger — 字ごとフェード: a soft glyph-by-glyph fade (in-out sine) rising a touch into place */
jzReg('enter', 'fadeStagger', { selfHide: true, apply: function (m) {
    var L = m.L, q = m.HD + EN2_FNS + en2_stg(0.62) + 'var on=q>0&&q<1;';
    jzAnimator(L, 'JZ In Rise', [['ADBE Text Position 3D', [0, m.size * 0.07, 0]]], q + 'on?(1-oc(q))*100:0');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-ios(q))*100');
} });

/* ---- waveIn — 波立ち: glyphs appear left→right riding a damped travelling wave (bob + rock) */
jzReg('enter', 'waveIn', { selfHide: true, apply: function (m) {
    var L = m.L, q = m.HD + 'var o=textTotal>1?(textIndex-1)/(textTotal-1):0,a=cl(P*2.4-o*1.3),dm=Math.pow(1-P,1.6),ph=P*3.6*Math.PI-(textIndex-1)*0.8;';
    jzAnimator(L, 'JZ In Wave', [['ADBE Text Position 3D', [0, m.size * 0.66, 0]]], q + '[0,-Math.sin(ph)*dm*100,0]');
    jzAnimator(L, 'JZ In Rock', [['ADBE Text Rotation', 13]], q + 'Math.cos(ph)*dm*100');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + '(1-a)*100');
} });

/* ---- spiralIn — 螺旋集合: glyphs swirl in on a shrinking spiral around the line's centre, spinning and growing into place */
jzReg('enter', 'spiralIn', { selfHide: true, apply: function (m) {
    var L = m.L, g = en2_geom(m), dir = en2_dir(m, 29), size = m.size, X = [], Y = [], mr = 0, i;
    for (i = 0; i < g.n; i++) { X.push(g.xs[i] - g.cx); Y.push(g.ys[i] - g.cy); mr = Math.max(mr, Math.sqrt(X[i] * X[i] + Y[i] * Y[i])); }
    var K = mr * 2.7 + size * 1.05, KN = jzN(K);
    var q = m.HD + EN2_FNS + en2_stg(0.15) + 'var X=' + jzArrExpr(X) + ',Y=' + jzArrExpr(Y) + ';var px=X[textIndex-1]||0,py=Y[textIndex-1]||0,e=oc(q),k=1-e,on=q>0&&q<1;' +
        'var ang=(' + dir + ')*k*200*Math.PI/180,c=Math.cos(ang),s=Math.sin(ang),r=1+0.7*k,th=hr(textIndex,31)*Math.PI*2+ang,orb=' + jzN(size) + '*k;' +
        'var nx=(c*px-s*py)*r+Math.cos(th)*orb,ny=(s*px+c*py)*r+Math.sin(th)*orb;';
    jzAnimator(L, 'JZ In Spiral', [['ADBE Text Position 3D', [K, K, 0]]], q + 'on?[(nx-px)/' + KN + '*100,(ny-py)/' + KN + '*100,0]:[0,0,0]');
    jzAnimator(L, 'JZ In Spin', [['ADBE Text Rotation', 320]], q + 'on?(' + dir + ')*k*100:0');
    jzAnimator(L, 'JZ In Grow', [['ADBE Text Scale 3D', [300, 300, 100]]], q + 'on?-0.55*k/2*100:0');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-cl(q*5))*100');
} });

/* ---- zoomOut — 巨大→等倍: the line slams down from 4.4× to its size (outExpo) with a tiny undershoot */
jzReg('enter', 'zoomOut', { apply: function (m) {
    var fS = '(1+3.4*(1-oe(P))-0.035*Math.sin(Math.PI*cl((P-0.22)/0.58)))';
    m.parts.sc.push('var n2z=' + fS + ';f=[f[0]*n2z,f[1]*n2z];');
    m.parts.op.push('f*=cl(P*6);');
    en2_pivot(m, fS, '0');
} });

/* ---- magnet — 磁石: glyphs hover far out (half-lit), get yanked in, overshoot and wobble with a small bump */
jzReg('enter', 'magnet', { selfHide: true, apply: function (m) {
    var L = m.L, size = m.size;
    var q = m.HD + EN2_FNS + 'var i=textIndex,d=textTotal>1?hr(i,81)*0.3:0,ang=hr(i,82)*Math.PI*2,dist=1.3+1.5*hr(i,83),r0=hr(i,84)*2-1;' +
        'var u=cl((P-d)/0.7),f=0,a=1,t=0;if(u<0.36){f=1-0.16*oc(u/0.36);a=0.5*cl(u*8);}else if(u<0.6){t=(u-0.36)/0.24;f=0.84*(1-ic(t));a=0.5+0.5*cl(t*3);}' +
        'else{t=(u-0.6)/0.4;f=-0.1*Math.sin(t*Math.PI*2)*(1-t);}var s=1+0.14*Math.exp(-Math.pow((u-0.6)/0.05,2)),on=u>0&&u<1;';
    jzAnimator(L, 'JZ In Pull', [['ADBE Text Position 3D', [size * 3, size * 3, 0]]], q + 'on?[Math.cos(ang)*dist*f/3*100,Math.sin(ang)*dist*f/3*100,0]:[0,0,0]');
    jzAnimator(L, 'JZ In Twist', [['ADBE Text Rotation', 55]], q + 'on?r0*f*100:0');
    jzAnimator(L, 'JZ In Bump', [['ADBE Text Scale 3D', [300, 300, 100]]], q + 'on?(s-1)/2*100:0');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'u<=0?100:(1-a)*100');
} });

/* ---- inkBleed — にじみ: glyphs bloom out of a blurred blot (random order) with a soft halo of their own colour */
jzReg('enter', 'inkBleed', { selfHide: true, apply: function (m) {
    var L = m.L, size = m.size, bl = Math.min(36 * m.u, size * 0.16);
    var q = m.HD + EN2_FNS + 'var d=textTotal>1?hr(textIndex,91)*0.45:0,u=cl((P-d)/0.55),e=oc(u),on=u>0&&u<1;';
    jzAnimator(L, 'JZ In Bloom', [['ADBE Text Scale 3D', [300, 300, 100]]], q + 'on?(0.5+0.5*ob(u,1.1)-1)/2*100:0');
    jzAnimator(L, 'JZ In Bleed', [['ADBE Text Blur', [bl, bl]]], q + 'on?Math.pow(1-e,1.3)*100:0');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'u<=0?100:(1-cl(u*3.2))*100');
    var ds = jzEffect(L, 'ADBE Drop Shadow', 'JZ In Bleed Halo'), hh = m.HD + EN2_FNS + 'var h=1-sm(0.2,0.88,P);';
    jzEP(ds, 1, jzHex(jzTextColor(L))); jzEP(ds, 3, 0); jzEP(ds, 4, 0);
    jzEX(ds, 2, hh + '255*0.55*h');
    jzEX(ds, 5, hh + 'SZ*0.6*h');
} });

/* ---- resolve — 解読: a decoder front runs through the line — an accent block on the current glyph, scrambled dim glyphs
   ahead of it, freshly decoded glyphs flash the accent colour (browser: random signs → AE: Character Offset scramble) */
jzReg('enter', 'resolve', { selfHide: true, apply: function (m) {
    var L = m.L, sc = m.ctx.sc, g = en2_geom(m), hi = en2_pick(sc.accent, sc.fg), dim = en2_pick(sc.sub, sc.fg);
    var q = m.HD + 'var N=textTotal,i=textIndex-1,f=P*(N+1.8),fr=Math.floor(f),on=P>=0.03;';
    jzAnimator(L, 'JZ In Decode Hide', [['ADBE Text Opacity', 0]], q + '!on?100:(i<fr?0:(i==fr?100:(i<=fr+4?50:100)))');
    jzAnimator(L, 'JZ In Decode Scramble', [['ADBE Text Character Offset', 40]], q + 'posterizeTime(12);seedRandom(textIndex*17+SD+Math.floor(time*12)*29,true);var r=random(20,100);on&&i>fr&&i<=fr+4?r:0');
    jzAnimator(L, 'JZ In Decode Dim', [['ADBE Text Fill Color', jzHex(dim)]], q + 'on&&i>fr&&i<=fr+4?100:0');
    jzAnimator(L, 'JZ In Decode Flash', [['ADBE Text Fill Color', jzHex(hi)]], q + 'on&&i<fr&&f-i-1<0.6?100:0');
    if (!g.n) return;
    // the accent block sitting on the glyph being decoded
    var W = [], i;
    for (i = 0; i < g.n; i++) W.push(g.ws[i] * 0.9);
    // the rect is set up before the fill is added (AE invalidates the rect reference once a sibling is added)
    var S = en2_shape(m, 'JZ Decode Block'), gr = jzGrp(S, 'block'), rc = jzAddRect(gr, m.size * 0.9, m.size * 0.98, 0);
    var bh = m.HD + 'var N=' + g.n + ',f=P*(N+1.8),fr=Math.min(N-1,Math.floor(f));';
    rc.property('ADBE Vector Rect Size').expression = bh + 'var W=' + jzArrExpr(W) + ';[W[fr],' + jzN(m.size * 0.98) + ']';
    rc.property('ADBE Vector Rect Position').expression = bh + 'var X=' + jzArrExpr(g.xs) + ',Y=' + jzArrExpr(g.ys) + ';[X[fr],Y[fr]]';
    jzAddFill(gr, hi);
    jzSetExpr(jzXf(S, 'ADBE Opacity'), bh + 'P>=0.03&&Math.floor(f)<N?100:0');
} });

/* ---- neonOn — ネオン点灯: dim tubes (10 %) flicker on glyph by glyph while a glow swells and settles */
jzReg('enter', 'neonOn', { selfHide: true, apply: function (m) {
    var L = m.L, sc = m.ctx.sc, col = jzTextColor(L), gc = jzLum(col) > 0.35 ? col : en2_pick(sc.accent, col);
    jzAnimator(L, 'JZ In Neon', [['ADBE Text Opacity', 0]], m.HD + EN2_FNS + 'var i=textIndex,ig=0.3+0.45*hr(i,101),F=Math.floor(time*12),on=hr(i,F*3+102)<0.25+0.75*cl((P-ig+0.22)/0.34);' +
        'P>=ig+0.12?0:(P<ig-0.22?(1-0.1*cl(P*8))*100:(on?0:90))');
    var ds = jzEffect(L, 'ADBE Drop Shadow', 'JZ In Neon Glow'), gl = m.HD + EN2_FNS + 'var gw=sm(0.1,0.4,P)*(1-sm(0.62,0.92,P));';
    jzEP(ds, 1, jzHex(gc)); jzEP(ds, 3, 0); jzEP(ds, 4, 0);
    jzEX(ds, 2, gl + 'gw>0.01?242:0');
    jzEX(ds, 5, gl + 'Math.min(' + jzN(80 * m.u) + ',SZ*0.32)*gw*2');
} });

/* ---- cursorSweep — カーソル掃引: an accent bar sweeps across the line; glyphs pop out behind it (growing, sliding back) */
jzReg('enter', 'cursorSweep', { selfHide: true, apply: function (m) {
    var L = m.L, g = en2_geom(m), r = g.r, size = m.size, vert = g.vert, bw = size * 0.28, i;
    var U0 = (vert ? r.top : r.left) - bw, U1 = (vert ? r.top + r.height : r.left + r.width) + bw * 1.5, GU = [], HS = [];
    for (i = 0; i < g.n; i++) { GU.push(vert ? g.ys[i] : g.xs[i]); HS.push((vert ? size : g.ws[i]) / 2); }
    var ps = 'var pos=' + jzN(U0) + '+' + jzN(U1 - U0) + '*oqd(P/0.85);';
    var q = m.HD + EN2_FNS + ps + 'var G=' + jzArrExpr(GU) + ',H=' + jzArrExpr(HS) + ';var gu=G[textIndex-1]||0,hs=H[textIndex-1]||1;' +
        'var u=cl((pos-' + jzN(bw / 2) + '-(gu-hs))/(hs*2+' + jzN(size * 0.2) + ')),e=oq5(u),on=u>0&&u<1;';
    jzAnimator(L, 'JZ In Sweep Slide', [['ADBE Text Position 3D', vert ? [0, size * 0.3, 0] : [size * 0.3, 0, 0]]], q + 'on?(1-e)*100:0');
    jzAnimator(L, 'JZ In Sweep Grow', [['ADBE Text Scale 3D', [300, 300, 100]]], q + 'on?-0.3*(1-e)/2*100:0');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'u<=0?100:(1-cl(u*3))*100');
    // the cursor bar (thins out at the end)
    // the rect is set up before the fill is added (AE invalidates the rect reference once a sibling is added)
    var S = en2_shape(m, 'JZ Cursor'), gr = jzGrp(S, 'bar'), mg = size * 0.15, rc = jzAddRect(gr, 10, 10, 0);
    var bh = m.HD + EN2_FNS + ps + 'var t=' + jzN(bw) + '*(1-sm(0.78,0.94,P));';
    rc.property('ADBE Vector Rect Size').expression = bh + (vert ? '[' + jzN(r.width + mg * 2) + ',Math.max(0.01,t)]' : '[Math.max(0.01,t),' + jzN(r.height + mg * 2) + ']');
    rc.property('ADBE Vector Rect Position').expression = bh + (vert ? '[' + jzN(r.left + r.width / 2) + ',pos]' : '[pos,' + jzN(r.top + r.height / 2) + ']');
    jzAddFill(gr, en2_pick(m.ctx.sc.accent, m.ctx.sc.fg));
    jzSetExpr(jzXf(S, 'ADBE Opacity'), bh + 'time>=DL&&t>=0.5?100:0');
} });

/* ---- stamp — スタンプ: the line drops onto the page like a rubber stamp (big + tilted → impact), shudders, impact lines burst out */
jzReg('enter', 'stamp', { apply: function (m) {
    var L = m.L, dir = en2_dir(m, 37), size = m.size, r = jzRect(L);
    var fS = '(P<0.42?2.3-1.3*iq(P/0.42):1-0.05*Math.exp(-9*(P-0.42)/0.58)*(1-(P-0.42)/0.58))';
    var rS = '(P<0.42?' + jzN(-22 * dir) + '*(1-iq(P/0.42)):0)';
    m.parts.sc.push('var n2s=' + fS + ';f=[f[0]*n2s,f[1]*n2s];');
    m.parts.rot.push('r+=' + rS + ';');
    m.parts.op.push('f*=P<0.42?cl(P/0.42*3):1;');
    en2_pivot(m, fS, rS);
    // shudder after the impact (stepped, decaying)
    m.parts.pos.push('if(P>=0.42&&P<1){var n2t=(P-0.42)/0.58,n2d=(1-n2t)*(1-n2t),n2F=Math.floor(time*12),n2x=Math.sin(n2F*12.9898+SD*0.6173+1.7)*43758.5453,n2y=Math.sin(n2F*78.233+SD*0.6173+4.1)*43758.5453;n2x=(n2x-Math.floor(n2x))*2-1;n2y=(n2y-Math.floor(n2y))*2-1;d=[d[0]+n2x*SZ*0.05*n2d,d[1]+n2y*SZ*0.03*n2d];}');
    // impact lines around the box (item space: parented to the text layer)
    var N = jzCount(en2_text(L)) <= 1 ? 6 : 12, S = en2_shape(m, 'JZ Stamp Lines'), Ln = size * 0.42, lw = Math.max(2 * m.u, size * 0.05);
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2, rx = r.width / 2 + size * 0.28, ry = r.height / 2 + size * 0.28, k;
    var lh = m.HD + EN2_FNS + 'var lt=cl((P-0.42)/0.58/0.7),e=oq4(lt);';
    for (k = 0; k < N; k++) {
        var an = (k / N) * Math.PI * 2 + 0.26, c = Math.cos(an), s = Math.sin(an), gr = jzGrp(S, 'line ' + (k + 1));
        jzAddPath(gr, [[0, 0], [Ln, 0]], false);
        jzAddStroke(gr, en2_pick(m.ctx.sc.accent, m.ctx.sc.fg), lw);
        var gx = jzGX(gr);
        gx.property('ADBE Vector Rotation').setValue(an * 180 / Math.PI);
        gx.property('ADBE Vector Position').expression = lh + '[' + jzN(cx + c * rx) + '+' + jzN(c * rx) + '*0.08*e+' + jzN(c * Ln * 0.6) + '*e,' + jzN(cy + s * ry) + '+' + jzN(s * ry) + '*0.08*e+' + jzN(s * Ln * 0.6) + '*e]';
        gx.property('ADBE Vector Scale').expression = lh + '[(1-0.6*e)*100,100]';
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), lh + 'P>=0.42&&lt<1?(1-lt)*100:0');
} });
