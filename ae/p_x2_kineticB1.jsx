// ================================================================ pack x2kineticB part 1 (AE port of src/11p_x2_kineticB.js, keys kz…)
// 9 entrances, 8 exits, 5 holds — words and lines with weight: they overshoot, squash, recoil, get hit and thrown.
// As in ae/p_kinetic3.jsx every entry is one set of text animators whose Expression Selectors run the browser's per-glyph
// charFn: word index / word boxes / glyph centres are estimated at build time and embedded in the expression (px in the
// text layer's own space; the browser's em units are multiplied by the font size FS).
// rg(px,py,S,SX,SY,R,TX,TY) in the expressions = the browser's rigid(): scale / turn the glyph about a pivot, then shift.
// No beat grid inside the content comp: the beat-driven holds run on the browser's fall-back periods.

// ---- glyph geometry in the text layer's own space (textIndex order, spaces included, line breaks excluded)
function akzb_isSp(ch) { return ch === ' ' || ch === '　' || ch === '\t'; }
function akzb_adv(ch) {
    var c = ch.charCodeAt(0);
    if (ch === ' ') return 0.3;
    if (c >= 0xFF61 && c <= 0xFF9F) return 0.5;
    if (/[iljI.,:;'!|]/.test(ch)) return 0.3;
    if (/[mwMW]/.test(ch)) return 0.85;
    return c < 0x2000 ? 0.58 : 1;
}
function akzb_geo(L, size) {
    var TP = L.property('ADBE Text Properties'), td = TP.property('ADBE Text Document').value, r = jzRect(L), i, j;
    var fs = td.fontSize || size || 100, text = String(td.text), trk = (td.tracking || 0) / 1000 * fs;
    var lines = text.split(/\r\n|\r|\n|\u0003/), nL = lines.length, lead = fs * 1.2;
    try { if (!td.autoLeading && td.leading > 0) lead = td.leading; } catch (e0) {}
    var just = 'c';
    try { if (td.justification === ParagraphJustification.LEFT_JUSTIFY) just = 'l'; else if (td.justification === ParagraphJustification.RIGHT_JUSTIFY) just = 'r'; } catch (e1) {}
    var G = { fs: fs, text: text, g: [], n: 0, nk: 0, vert: nL > 1, nL: nL, lead: lead, just: just, trk: trk };
    var rows = [], maxW = 0;
    for (i = 0; i < nL; i++) {
        var cs = jzChars(lines[i]), ws = [], w = 0;
        for (j = 0; j < cs.length; j++) { var a = akzb_adv(cs[j]) * fs; ws.push(a); w += a + (j < cs.length - 1 ? trk : 0); }
        if (cs.length > 1) G.vert = false;
        rows.push({ cs: cs, ws: ws, w: w }); if (w > maxW) maxW = w;
    }
    var k = maxW > 0 ? r.width / maxW : 1; if (!(k > 0.5 && k < 2)) k = 1;
    var lh = r.height - (nL - 1) * lead; if (!(lh > fs * 0.5 && lh < fs * 1.6)) lh = fs * 0.95;
    var cx = r.left + r.width / 2;
    G.rowY = [];
    for (i = 0; i < nL; i++) {
        var R = rows[i], x = just === 'l' ? r.left : (just === 'r' ? r.left + r.width - R.w * k : cx - R.w * k / 2), y = r.top + lh / 2 + i * lead;
        G.rowY.push(y);
        for (j = 0; j < R.cs.length; j++) {
            var sp = akzb_isSp(R.cs[j]);
            G.g.push({ ch: R.cs[j], li: i, sp: sp, x: x + R.ws[j] * k / 2, y: y, w: Math.max(1, R.ws[j] * k), h: fs });
            x += (R.ws[j] + trk) * k; G.n++;
            if (!sp) G.nk++;
        }
    }
    G.cx = cx; G.cy = r.top + r.height / 2; G.r = r;
    return G;
}
// word of every glyph: the cut's word chunks (else chunks of the layer's own text), boxes per word
function akzb_words(cut, G) {
    var cw = (cut && cut.words) || [], ws = [], i, j, s;
    for (i = 0; i < cw.length; i++) { s = jzStrip(cw[i]); if (s) ws.push(s); }
    var flat = jzStrip(G.text), off = ws.length ? ws.join('').indexOf(flat) : -1;
    if (off < 0) {
        var t = G.text.replace(/[\r\n]+/g, jzHasLatin(G.text) ? ' ' : ''), src = jzHasLatin(t) ? t.split(/\s+/) : jzChunk(t);
        ws = []; for (i = 0; i < src.length; i++) { s = jzStrip(src[i]); if (s) ws.push(s); }
        off = 0;
    }
    var bnd = [], acc = 0;
    for (i = 0; i < ws.length; i++) { acc += jzChars(ws[i]).length; bnd.push(acc); }
    var map = [], k = 0, jmin = 1e9, jmax = -1;
    for (i = 0; i < G.n; i++) {
        if (G.g[i].sp) { map.push(-1); continue; }
        var pos = off + k; j = 0;
        while (j < bnd.length && pos >= bnd[j]) j++;
        if (j >= bnd.length) j = Math.max(0, bnd.length - 1);
        map.push(j); if (j < jmin) jmin = j; if (j > jmax) jmax = j; k++;
    }
    if (jmax < 0) { jmin = 0; jmax = 0; }
    var nW = jmax - jmin + 1, W = [], b;
    for (j = 0; j < nW; j++) W.push({ x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9, n: 0, li: 0 });
    var inW = [];
    for (i = 0; i < G.n; i++) {
        if (map[i] < 0) { inW.push(0); continue; }
        map[i] -= jmin;
        b = W[map[i]]; var g = G.g[i];
        if (!b.n) b.li = g.li;
        inW.push(b.n); b.n++;
        b.x0 = Math.min(b.x0, g.x - g.w / 2); b.x1 = Math.max(b.x1, g.x + g.w / 2); b.y0 = Math.min(b.y0, g.y - g.h / 2); b.y1 = Math.max(b.y1, g.y + g.h / 2);
    }
    var X0 = 1e9, X1 = -1e9, Y0 = 1e9, Y1 = -1e9;
    for (j = 0; j < nW; j++) { b = W[j]; if (!b.n) { b.x0 = b.x1 = G.cx; b.y0 = b.y1 = G.cy; continue; } X0 = Math.min(X0, b.x0); X1 = Math.max(X1, b.x1); Y0 = Math.min(Y0, b.y0); Y1 = Math.max(Y1, b.y1); }
    if (X0 > X1) { X0 = X1 = G.cx; Y0 = Y1 = G.cy; }
    return { map: map, inW: inW, nW: nW, W: W, box: { x0: X0, x1: X1, y0: Y0, y1: Y1 } };
}
function akzb_arr(a) { var s = [], i; for (i = 0; i < a.length; i++) s.push(jzN(a[i])); return '[' + s.join(',') + ']'; }
// expression data: per glyph WI (word), GX GY (centre), NI (index in word); per word X0 X1 Y0 Y1 BN (glyphs) WL (line); NW; box BX0..BY1
function akzb_gdata(G, Wd) {
    var gx = [], gy = [], i, x0 = [], x1 = [], y0 = [], y1 = [], bn = [], wl = [];
    for (i = 0; i < G.n; i++) { gx.push(G.g[i].x); gy.push(G.g[i].y); }
    for (i = 0; i < Wd.nW; i++) { var b = Wd.W[i]; x0.push(b.x0); x1.push(b.x1); y0.push(b.y0); y1.push(b.y1); bn.push(b.n); wl.push(b.li); }
    return 'var WI=' + akzb_arr(Wd.map) + ',GX=' + akzb_arr(gx) + ',GY=' + akzb_arr(gy) + ',NI=' + akzb_arr(Wd.inW) + ',X0=' + akzb_arr(x0) + ',X1=' + akzb_arr(x1) +
        ',Y0=' + akzb_arr(y0) + ',Y1=' + akzb_arr(y1) + ',BN=' + akzb_arr(bn) + ',WL=' + akzb_arr(wl) + ',NW=' + Wd.nW + ',BX0=' + jzN(Wd.box.x0) + ',BX1=' + jzN(Wd.box.x1) +
        ',BY0=' + jzN(Wd.box.y0) + ',BY1=' + jzN(Wd.box.y1) + ',GV=' + (G.vert ? 1 : 0) + ',FS=' + jzN(G.fs) + ';\n';
}
// the browser's numeric hash J.h / J.r / J.rs (seeded sides and variants match the web version)
function akzb_h(a, b, c, d, e) {
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
function akzb_r(a, b, c, d, e) { return akzb_h(a, b, c, d, e) / 4294967296; }
function akzb_rs(a, b, c, d, e) { return akzb_r(a, b, c, d, e) * 2 - 1; }
function akzb_rr(lo, hi, a, b, c, d) { return lo + (hi - lo) * akzb_r(a, b, c, d); }
// sideOf(env, it, salt)
function akzb_dir(m, salt) { return (akzb_h((m.c.seed | 0), (m.o.mi | 0), salt) & 1) ? 1 : -1; }

// easing / helpers for expressions (names distinct from JZ_FNS and the motion header):
// ioc inOutCubic, bel bell, kck damped wobble from 0, sp1 damped spring 1 -> 0, smo smoothstep, stg stagger, ios inOutSine,
// oq outQuad, lrp lerp, rvx rotate a vector (degrees), rng ring (1 at 0, swings through zero, dies out at 1)
var AKZB_FNS = 'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}function bel(x){return Math.sin(Math.PI*cl(x));}' +
    'function kck(t,k,f){return t<=0?0:Math.exp(-k*t)*Math.sin(f*t);}function sp1(t,k,f){t=cl(t);return Math.exp(-k*t)*Math.cos(f*Math.PI*t)*(1-t*t*t);}' +
    'function smo(a,b,x){x=cl((x-a)/(b-a));return x*x*(3-2*x);}function stg(p,k,n,s){return cl((p-(n>1?k/(n-1):0)*s)/(1-s));}' +
    'function ios(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}function oq(x){x=cl(x);return 1-(1-x)*(1-x);}' +
    'function lrp(a,b,t){return a+(b-a)*t;}function rvx(x,y,a){var c=Math.cos(a*0.0174533),s=Math.sin(a*0.0174533);return [x*c-y*s,x*s+y*c];}' +
    'function rng(q,tu,k){q=cl(q);return Math.exp(-k*q)*Math.cos(q*6.28319*tu)*(1-q);}\n';

// the browser's charFn as animators. `code` runs inside F() per glyph and may set dx dy (px) s sx sy r (deg) a hd (hide)
// cc (accent colour 0..1) sk (skew deg) ol (hollow outline 0..1), directly or through rg(). Ready: i (0-based glyph), j (word),
// gx gy (glyph centre), bcx bcy (word centre), Bcx Bcy (line box centre). use: { p, s, r, a, col, sk, ol } + o.K (px range) / o.S / o.R
function akzb_fn(m, tag, pre, code, use, o) {
    o = o || {};
    var L = m.L, G = akzb_geo(L, m.size), Wd = akzb_words(m.c, G);
    var K = o.K || Math.max(m.W, m.H) * 2, S = o.S || 7, RR = o.R || 360;
    var head = m.HD + AKZB_FNS + akzb_gdata(G, Wd) + 'var W=' + jzN(m.W) + ',H=' + jzN(m.H) + ',NG=' + G.n + ',Bcx=(BX0+BX1)/2,Bcy=(BY0+BY1)/2;' + (pre || '') + '\n' +
        'var i=textIndex-1,j=i<NG?WI[i]:-1,gx=GX[i]||0,gy=GY[i]||0,bcx=j>=0?(X0[j]+X1[j])/2:0,bcy=j>=0?(Y0[j]+Y1[j])/2:0;' +
        'var dx=0,dy=0,s=1,sx=1,sy=1,r=0,a=1,hd=0,cc=0,sk=0,ol=0;' +
        'function rg(px,py,S,SX,SY,R,TX,TY){var x=(gx-px)*S*SX,y=(gy-py)*S*SY;if(R){var v=rvx(x,y,R);x=v[0];y=v[1];}dx=px+x-gx+TX;dy=py+y-gy+TY;r=R;s=S;sx=SX;sy=SY;}' +
        'function F(){' + code + '}F();\n';
    var nm = 'JZ ' + tag + ' ';
    if (use.p) jzAnimator(L, nm + 'Move', [['ADBE Text Position 3D', [K, K, 0]]], head + '[dx/' + jzN(K) + '*100,dy/' + jzN(K) + '*100,0]');
    if (use.s) jzAnimator(L, nm + 'Scale', [['ADBE Text Scale 3D', [S * 100, S * 100, 100]]], head + 'var u=' + jzN(S - 1) + ';[(Math.max(0,s*sx)-1)/u*100,(Math.max(0,s*sy)-1)/u*100,0]');
    if (use.r) jzAnimator(L, nm + 'Turn', [['ADBE Text Rotation', RR]], head + 'r/' + jzN(RR) + '*100');
    if (use.sk) jzAnimator(L, nm + 'Skew', [['ADBE Text Skew', 60]], head + 'Math.max(-100,Math.min(100,sk/60*100))');
    if (use.col) jzAnimator(L, nm + 'Colour', [['ADBE Text Fill Color', jzHex(use.col)]], head + 'cc*100');
    if (use.ol) {       // hollow glyphs: the fill goes, a thin line in the glyph's own colour stays
        var td = L.property('ADBE Text Properties').property('ADBE Text Document').value, own = !!(td.applyStroke && td.strokeWidth > 0);
        if (!own) jzTextDoc(L, function (d) {
            d.applyStroke = true; d.strokeWidth = 0;
            try { d.strokeColor = d.applyFill ? d.fillColor : d.strokeColor; } catch (e0) {}
            try { d.strokeOverFill = false; } catch (e1) {}
        });
        jzAnimator(L, nm + 'Outline', own ? [['ADBE Text Fill Opacity', 0]] : [['ADBE Text Stroke Width', Math.max(1, G.fs * 0.02)], ['ADBE Text Fill Opacity', 0]], head + 'cl(ol)*100');
    }
    if (use.a) jzAnimator(L, nm + 'Fade', [['ADBE Text Opacity', 0]], head + 'hd?100:(1-cl(a))*100');
    return { G: G, Wd: Wd };
}

/* ================================================================ ENTRANCES */
/* kzSideVolley — 左右から語: words shoot in from the left and the right in turn and overshoot; each arrival shoves the ones already down */
jzReg('enter', 'kzSideVolley', { selfHide: true, apply: function (m) {
    akzb_fn(m, 'In Volley', 'var sp=NW>1?0.6:0,secs=IN*(1-sp),d0=' + akzb_dir(m, 811) + ',D=(GV?H:W)*0.62,fade=cl((1-P)*10);function sgn(q){return q%2?-d0:d0;}',
        'if(j<0)return;var q=stg(P,j,NW,sp);if(q<=0){hd=1;return;}' +
        'var sh=0,j2,q2;for(j2=j+1;j2<NW;j2++){q2=stg(P,j2,NW,sp);if(q2>0.45)sh-=sgn(j2)*0.14*kck((q2-0.45)*secs,10,30);}' +
        'var e=ob(cl(q*1.3),1.5),fast=Math.pow(1-cl(q*1.7),2),av=sgn(j)*D*(1-e)+sh*SZ*fade,st=1+0.7*fast;' +
        'if(GV)rg(bcx,bcy,1,1,st,0,0,av);else rg(bcx,bcy,1,st,1,0,av,0);a=cl(q*8);', { p: 1, s: 1, a: 1 });
} });
/* kzWordWheel — 語の車輪: each word rolls in along the line as one rigid wheel, a full turn, rolls a touch too far and rocks back */
jzReg('enter', 'kzWordWheel', { selfHide: true, apply: function (m) {
    akzb_fn(m, 'In Wheel', 'var sp=NW>1?0.5:0;',
        'if(j<0)return;var q=stg(P,j,NW,sp);if(q<=0){hd=1;return;}' +
        'var bw=X1[j]-X0[j],bh=Y1[j]-Y0[j],R=Math.max(0.45*FS,Math.sqrt(bw*bw+bh*bh)*0.4),d=6.28319*R*(1-ob(q,1.1)),ang=d/R*57.2958;' +
        'if(GV)rg(bcx,bcy,1,1,1,-ang,0,d);else rg(bcx,bcy,1,1,1,ang,d,0);a=cl(q*7);', { p: 1, r: 1, a: 1 }, { R: 720 });
} });
/* kzPunchThrough — 突き抜け戻り: each word swells straight through its size as a hollow outline, then snaps back solid and rings */
jzReg('enter', 'kzPunchThrough', { selfHide: true, apply: function (m) {
    akzb_fn(m, 'In Punch', 'var sp=NW>1?0.55:0,T=0.46;',
        'if(j<0)return;var q=stg(P,j,NW,sp);if(q<=0){hd=1;return;}' +
        'if(q<T){rg(bcx,bcy,lrp(0.15,1.6,oc(q/T)),1,1,0,0,0);a=cl(q*12);ol=1;return;}' +
        'var t=(q-T)/(1-T);rg(bcx,bcy,1+0.6*sp1(t,4.5,3.4),1,1,0,0,0);cc=(q<1&&t<0.2)?1:0;', { p: 1, s: 1, a: 1, col: m.ctx.sc.accent, ol: 1 });
} });
/* kzTowerUnstack — 塔からほどく: the words pile up as a tower in the middle, one per tick, then swing out of it into the line */
jzReg('enter', 'kzTowerUnstack', { selfHide: true, apply: function (m) {
    akzb_fn(m, 'In Tower', 'var lh=0,q0;for(q0=0;q0<NW;q0++)lh=Math.max(lh,GV?X1[q0]-X0[q0]:Y1[q0]-Y0[q0]);lh*=1.1;' +
        'var fit=Math.min(1,(GV?W:H)*0.78/Math.max(1,NW*lh)),T=0.5;',
        'if(j<0)return;if(NW<2){if(P<=0){hd=1;return;}dy=-(1-bo(P))*SZ*1.5;a=cl(P*7);return;}' +
        'var aIn=stg(cl(P/T),j,NW,0.72);if(aIn<=0){hd=1;return;}' +
        'var off=(j-(NW-1)/2)*lh*fit,sx0=GV?Bcx-off:Bcx,sy0=GV?Bcy:Bcy+off;' +
        'var e=ob(ios(stg(cl((P-T)/(1-T)),j,NW,0.4)),1.25),pp=ob(aIn,2.2),S1=lrp(fit*lrp(0.55,1,pp),1,cl(e));' +
        'rg(bcx,bcy,S1,1,1,4*e*(1-e)*(j%2?9:-9),(sx0-bcx)*(1-e),(sy0-bcy)*(1-e));a=cl(aIn*7);', { p: 1, s: 1, r: 1, a: 1 });
} });
/* kzSkipStone — 水切り: each word skips in from the side like a flat stone: three hops, each lower, flattening where it touches */
jzReg('enter', 'kzSkipStone', { selfHide: true, apply: function (m) {
    akzb_fn(m, 'In Skip', 'var sp=NW>1?0.5:0,sg=' + akzb_dir(m, 815) + ',D=Math.min(W*0.5,SZ*5.5),H0=SZ*1.05;',
        'if(j<0)return;var q=stg(P,j,NW,sp);if(q<=0){hd=1;return;}' +
        'var u=1-Math.pow(1-q,1.7),ph=u*3,fr=ph-Math.floor(ph),h=Math.abs(Math.sin(Math.PI*ph))*H0*Math.pow(1-u,1.1),tc=Math.max(0,1-Math.min(fr,1-fr)*7)*(1-u);' +
        'rg(bcx,Y1[j],1,1+0.2*tc,1-0.32*tc,-sg*7*(1-u)*(1-tc),sg*D*(1-u),-h);a=cl(q*9);', { p: 1, s: 1, r: 1, a: 1 });
} });
/* kzSeesaw — シーソー着地: the line is a see-saw: every word that drops onto it tips the whole line towards its side before it levels out */
jzReg('enter', 'kzSeesaw', { selfHide: true, apply: function (m) {
    akzb_fn(m, 'In Seesaw', 'var sp=NW>1?0.45:0,fd=(1-sp)*0.34,secs=IN,half=Math.max(0.001*FS,GV?BY1-BY0:BX1-BX0)/2,th=0,ST=[],q0,p0,u0;' +
        'for(q0=0;q0<NW;q0++){p0=(NW>1?q0/(NW-1):0)*sp;ST.push(p0);' +
        'u0=NW>1?(GV?(Y0[q0]+Y1[q0])/2-Bcy:(X0[q0]+X1[q0])/2-Bcx)/half:' + jzN(0.5 * akzb_dir(m, 817)) + ';th+=9*u0*kck((P-p0-fd)*secs,6.5,20);}' +
        'th=Math.max(-13,Math.min(13,th))*cl((1-P)*8);',
        'if(j<0)return;if(P<=ST[j]){hd=1;return;}var q=cl((P-ST[j])/fd),fall=(1-q*q)*SZ*2.4;' +
        'rg(Bcx,Bcy,1,1,1,th,GV?fall:0,GV?0:-fall);a=cl(q*5);', { p: 1, r: 1, a: 1 });
} });
/* kzTrampoline — トランポリン: each word is tossed up from below and lands on the springy line; the dent runs outward under the other letters */
jzReg('enter', 'kzTrampoline', { selfHide: true, apply: function (m) {
    akzb_fn(m, 'In Trampoline', 'var sp=NW>1?0.5:0,fd=(1-sp)*0.4,secs=IN,A=SZ*0.3*cl((1-P)*9),ST=[],PS=[],q0;' +
        'for(q0=0;q0<NW;q0++){ST.push((NW>1?q0/(NW-1):0)*sp);PS.push((GV?(Y0[q0]+Y1[q0])/2:(X0[q0]+X1[q0])/2)/FS);}',
        'if(j<0)return;if(P<=ST[j]){hd=1;return;}var q=cl((P-ST[j])/fd),x=(GV?gy:gx)/FS,w=0,j2,d,t;' +
        'for(j2=0;j2<NW;j2++){d=Math.abs(x-PS[j2]);t=(P-ST[j2]-fd)*secs-d/28;if(t>0)w+=Math.exp(-d*0.28)*kck(t,6,19);}' +
        'var fly=q<0.55?lrp(2.4,-0.75,oq(q/0.55)):-0.75*(1-Math.pow((q-0.55)/0.45,2)),v=fly*SZ+A*w,st2=1+0.22*(q<1?Math.sin(Math.PI*q):0);a=cl(q*5);' +
        'if(GV){dx=-v;sx=st2;}else{dy=v;sy=st2;}', { p: 1, s: 1, a: 1 });
} });
/* kzOverrun — 行き過ぎ戻り: every word runs in leaning forward, cannot stop, skids past its place leaning back and backs up into it */
jzReg('enter', 'kzOverrun', { selfHide: true, apply: function (m) {
    akzb_fn(m, 'In Overrun', 'var sp=NW>1?0.48:0,D=(GV?H:W)*0.55,O=SZ*0.95,T=0.55;',
        'if(j<0)return;var q=stg(P,j,NW,sp);if(q<=0){hd=1;return;}var av,lean,st=1,t;' +
        'if(q<T){t=q/T;av=lrp(D,-O,oq(t));lean=lrp(17,-21,t*t);st=1+0.4*(1-t)*(1-t);}' +
        'else{t=(q-T)/(1-T);av=-O*(1-ioc(t));lean=-21*(1-t)*(1-t)+7*Math.sin(Math.PI*t)*(1-t);}' +
        'if(GV)rg(bcx,bcy,1,1,st,-lean*0.3,0,av);else{rg(bcx,bcy,1,st,1,0,av,0);sk=lean;}a=cl(q*9);', { p: 1, s: 1, r: 1, sk: 1, a: 1 });
} });
/* kzBowSnap — 弓なり戻り: the line appears drawn like a bow and is let go: it whips through straight a few times and comes to rest */
jzReg('enter', 'kzBowSnap', { selfHide: true, apply: function (m) {
    akzb_fn(m, 'In Bow', 'var half=Math.max(0.001*FS,GV?BY1-BY0:BX1-BX0)/2,A=Math.min(SZ*1.5,(GV?W:H)*0.2)*' + akzb_dir(m, 823) + '*sp1((P-0.14)/0.86,2.1,3.2);',
        'if(j<0)return;var u=Math.max(-1,Math.min(1,(GV?gy-Bcy:gx-Bcx)/half)),al=cl((P*1.8-Math.abs(u)*0.22)*8);if(al<=0){hd=1;return;}' +
        'var d=A*(1-u*u),sl=Math.atan(2*u*A/half)*57.2958;a=al;r=sl;if(GV)dx=d;else dy=-d;', { p: 1, r: 1, a: 1 });
} });

/* ================================================================ EXITS */
/* kzBatAway — 打ち飛ばし: the line takes a hit on one end: a flash of squash, then it sails off as one piece, tumbling end over end */
jzReg('exit', 'kzBatAway', { apply: function (m) {
    akzb_fn(m, 'Out Bat', 'var sg=' + akzb_dir(m, 831) + ',T=0.16,oS=1,oSX=1,oSY=1,oTX=0,oTY=0,oR=0,oA=1,oC=0,bl,t,e;' +
        'if(PO>0){if(PO<T){bl=bel(PO/T);oSX=1-0.16*bl;oSY=1+0.1*bl;oTX=sg*SZ*0.14*bl;oC=PO>T*0.35?1:0;}' +
        'else{t=(PO-T)/(1-T);e=Math.pow(t,0.85);oTX=sg*W*e;oTY=-H*0.55*e+H*0.5*e*e;oR=sg*230*e;oS=1-0.35*e;oA=1-smo(0.72,1,t);}}',
        'if(j<0||PO<=0)return;if(PO>=0.999){hd=1;return;}rg(Bcx,Bcy,oS,oSX,oSY,oR,oTX,oTY);a=oA;cc=oC;', { p: 1, s: 1, r: 1, a: 1, col: m.ctx.sc.accent });
} });
/* kzYankOut — 引っこ抜き: the words are grabbed by one end, stretched, and snatched off sideways one by one, the last word first */
jzReg('exit', 'kzYankOut', { apply: function (m) {
    akzb_fn(m, 'Out Yank', 'var sp=NW>1?0.55:0,d0=' + akzb_dir(m, 833) + ',D=(GV?H:W)*1.1;',
        'if(j<0)return;var rr=NW-1-j,q=stg(PO,rr,NW,sp);if(q>=1){hd=1;return;}if(q<=0)return;' +
        'var sg=rr%2?-d0:d0,st,av=0,al=1,t;if(q<0.4)st=1+0.55*oc(q/0.4);else{t=(q-0.4)/0.6;st=1.55+0.9*t;av=sg*D*1.2*Math.pow(t,1.7);al=1-smo(0.7,1,t);}' +
        'if(GV)rg(bcx,sg>0?Y0[j]:Y1[j],1,1,st,0,0,av);else rg(sg>0?X0[j]:X1[j],bcy,1,st,1,0,av,0);a=al;', { p: 1, s: 1, a: 1 });
} });
/* kzSwingFling — 振って放る: the line starts to swing from a point above it, further each time, and is let go at full speed */
jzReg('exit', 'kzSwingFling', { apply: function (m) {
    akzb_fn(m, 'Out Swing', 'var sg=' + akzb_dir(m, 835) + ',T=0.66,oPY=Bcy,oTX=0,oTY=0,oR=0,oA=1,u,t,v0;' +
        'if(PO>0){if(PO<T){u=PO/T;oPY=BY0-3.2*FS;oR=sg*24*Math.pow(u,1.3)*Math.sin(6.28319*1.5*u);}' +
        'else{t=(PO-T)/(1-T);v0=6.5*SZ;oTX=sg*(v0*t+Math.max(0,W*1.15-v0)*t*t);oTY=-SZ*1.6*t+(H*0.45+SZ*1.6)*t*t;oR=-sg*(116*t+70*t*t);oA=1-smo(0.78,1,t);}}',
        'if(j<0||PO<=0)return;if(PO>=0.999){hd=1;return;}rg(Bcx,oPY,1,1,1,oR,oTX,oTY);a=oA;', { p: 1, r: 1, a: 1 });
} });
/* kzCrouchDive — 屈んで飛び込む: word after word crouches flat, springs up a little and dives straight down out of the frame */
jzReg('exit', 'kzCrouchDive', { apply: function (m) {
    akzb_fn(m, 'Out Dive', 'var sp=NW>1?0.4:0;',
        'if(j<0)return;var q=stg(PO,j,NW,sp);if(q>=1){hd=1;return;}if(q<=0)return;var c;' +
        'if(q<0.3){c=oc(q/0.3);rg(bcx,Y1[j],1,1+0.31*c,1-0.42*c,0,0,0);return;}' +
        'var t=(q-0.3)/0.7,v=7*SZ,ac=Math.max(17.5*SZ,H*1.2+v),yy=0.58+0.8*oc(cl(t/0.12));' +
        'rg(bcx,Y1[j],1,1/Math.sqrt(yy),yy,0,0,-v*t+ac*t*t);a=1-smo(0.7,1,t);', { p: 1, s: 1, a: 1 }, { K: Math.max(m.W, m.H) * 2 + m.size * 12 });
} });
/* kzSlingAway — 引き絞り発射: the middle of the line is drawn back like a catapult band, trembles, and the whole line is shot away */
jzReg('exit', 'kzSlingAway', { apply: function (m) {
    akzb_fn(m, 'Out Sling', 'var half=Math.max(0.001*FS,GV?BY1-BY0:BX1-BX0)/2,sg=' + akzb_dir(m, 837) + ',T=0.58,A=0,shoot=0,st=1,al=1,c,t;' +
        'if(PO<T){c=ios(PO/T);A=SZ*1.25*c*(1+0.035*Math.sin(PO*90)*c);}' +
        'else{t=(PO-T)/(1-T);A=SZ*1.25*lrp(1,-0.55,oc(cl(t*3.5)));shoot=(GV?W:H)*1.3*Math.pow(t,1.5);st=1+0.5*t;al=1-smo(0.8,1,t);}',
        'if(j<0||PO<=0)return;if(PO>=0.999){hd=1;return;}var u=Math.max(-1,Math.min(1,(GV?gy-Bcy:gx-Bcx)/half)),d=sg*(A*(1-u*u)-shoot);' +
        'r=Math.atan(-2*u*sg*A/half)*57.2958;a=al;if(GV){dx=-d;sx=st;}else{dy=d;sy=st;}', { p: 1, s: 1, r: 1, a: 1 });
} });
/* kzHammerDown — 打ち込み: the words are hammered into the floor like nails: three blows each, a third deeper every time, the others jumping.
   One floor for the whole layer (a single row, or one word): the glyphs sink behind a layer mask whose edge is the floor (the mask
   is wide open until the exit starts). Several floors (rows / a column of words): each word is pressed flat onto its own floor instead. */
jzReg('exit', 'kzHammerDown', { apply: function (m) {
    var L = m.L, G0 = akzb_geo(L, m.size), W0 = akzb_words(m.c, G0), j, one = true, had = 0;
    for (j = 1; j < W0.nW; j++) if (W0.W[j].n && Math.abs(W0.W[j].y1 - W0.W[0].y1) > 1) one = false;
    akzb_fn(m, 'Out Hammer', 'var sp=NW>1?0.4:0,gap=(1-sp)/3.4,secs=OD,DP=[],jolt=0,q0,m2,d0;function hit(q,k){return (NW>1?q/(NW-1):0)*sp+k*gap+0.02;}' +
        'for(q0=0;q0<NW;q0++){d0=0;for(m2=0;m2<3;m2++){d0+=oe(cl((PO-hit(q0,m2))/0.07));if(q0<12)jolt+=Math.abs(kck((PO-hit(q0,m2))*secs,13,38));}DP.push(d0/3);}' +
        'jolt=Math.min(1.2,jolt)*SZ*0.07;',
        'if(j<0||PO<=0)return;var d=DP[j];if(d>=0.999){hd=1;return;}if(d<=0){if(jolt>0.3)dy=-jolt;return;}' +
        (one ? 'dy=d*(Y1[j]-Y0[j])*1.06;' : 'sy=Math.max(0.02,1-d);dy=(Y1[j]-gy)*(1-sy);'), one ? { p: 1, a: 1 } : { p: 1, s: 1, a: 1 });
    if (!one) return;
    try { had = L.property('ADBE Mask Parade').numProperties; } catch (e0) { had = 0; }
    var big = Math.max(m.W, m.H) * 3, floor = W0.box.y1 + G0.fs * 0.06;
    var mk = jzMaskRect(L, W0.box.x0 - big, W0.box.y0 - big, W0.box.x1 + big, floor);
    try { mk.name = 'JZ Out Hammer Floor'; } catch (e1) {}
    if (had > 0) { try { mk.maskMode = MaskMode.INTERSECT; } catch (e2) {} }
    jzSetExpr(mk.property('ADBE Mask Offset'), m.HD + 'PO>0?0:' + jzN(big));
} });
/* kzCrashApart — 激突して散る: the words rush together, crash in the middle with a flash, and ricochet off in all directions, spinning */
jzReg('exit', 'kzCrashApart', { apply: function (m) {
    var sd = m.c.seed | 0, ra = [], j;
    for (j = 0; j < 24; j++) ra.push(akzb_r(sd, j, 3));
    akzb_fn(m, 'Out Crash', 'var T=0.36,far=Math.max(W,H)*0.8,RA=' + akzb_arr(ra) + ',R1=' + jzN(Math.PI * 2 * akzb_r(sd, m.o.mi | 0, 5)) + ';',
        'if(j<0||PO<=0)return;if(PO>=0.999){hd=1;return;}var hx=(Bcx-bcx)*0.8,hy=(Bcy-bcy)*0.8,c;' +
        'if(PO<T){c=ic(PO/T);rg(bcx,bcy,1-0.12*c,1,1,0,hx*c,hy*c);return;}' +
        'var t=(PO-T)/(1-T),e=oc(t),tw=j%2?1:-1,ang=NW>1?Math.atan2(bcy-Bcy,bcx-Bcx)+tw*(0.45+0.5*RA[j%24]):R1;' +
        'rg(bcx,bcy,0.88+0.3*bel(t*2.5),1,1,tw*250*e,hx+Math.cos(ang)*far*e,hy+Math.sin(ang)*far*e);a=1-smo(0.55,1,t);cc=t<0.16?1:0;',
        { p: 1, s: 1, r: 1, a: 1, col: m.ctx.sc.accent });
} });
/* kzPinchShoot — 細めて発射: the line swells a little, is pinched into one thin tall sliver, and the sliver shoots out of the frame */
jzReg('exit', 'kzPinchShoot', { apply: function (m) {
    akzb_fn(m, 'Out Pinch', 'var sg=' + akzb_dir(m, 841) + ',T=0.44,c=0,shoot=0,lng=1,al=1,t;' +
        'if(PO<T){t=PO/T;c=t<0.25?-0.07*Math.sin(Math.PI*t/0.25):ioc((t-0.25)/0.75);lng=1+0.3*Math.max(0,c);}' +
        'else{t=(PO-T)/(1-T);c=1;shoot=(GV?W:H)*1.3*Math.pow(t,1.6);lng=1.3+1.7*t;al=1-smo(0.7,1,t);}var thin=1-0.93*c;',
        'if(j<0||PO<=0)return;if(PO>=0.999){hd=1;return;}a=al;' +
        'if(GV){dy=(gy-Bcy)*(thin-1);sy=thin;sx=lng;dx=sg*shoot;}else{dx=(gx-Bcx)*(thin-1);sx=thin;sy=lng;dy=-sg*shoot;}', { p: 1, s: 1, a: 1 });
} });

/* ================================================================ HOLDS (no beat grid inside the content comp: fixed periods) */
/* kzSquashWave — つぶれ波: a bump runs along the line under the letters: the one above it is pressed flat, its neighbours stand tall */
jzReg('hold', 'kzSquashWave', { apply: function (m) {
    akzb_fn(m, 'Hold Squash', 'var MM=AMT*(0.4+M),start=(GV?BY0:BX0)/FS,len=Math.max(0.001,(GV?BY1-BY0:BX1-BX0)/FS),per=1.7,fr=(((time%per)+per)%per)/per,xw=start-2+fr*(len+4);',
        'if(j<0||MM<0.01)return;var d=(GV?gy:gx)/FS-xw,b0=Math.exp(-d*d/0.8),b1=Math.exp(-(d-1.5)*(d-1.5)/0.9)+Math.exp(-(d+1.5)*(d+1.5)/0.9),yy=1-0.32*MM*b0+0.1*MM*b1;' +
        'if(Math.abs(yy-1)<0.004)return;sy=yy;sx=1+0.2*MM*b0-0.04*MM*b1;dy=FS*(1-yy)/2;', { p: 1, s: 1 });
} });
/* kzInertiaSway — 慣性ゆれ: the line shuttles to and fro; the words follow one after another like wagons and lean back against the pull */
jzReg('hold', 'kzInertiaSway', { apply: function (m) {
    akzb_fn(m, 'Hold Sway', 'var MM=AMT*(0.4+M),w=6.28319*0.42,A=SZ*0.2*MM;',
        'if(j<0||MM<0.01)return;var ph=w*(time-j*0.15),off=A*Math.sin(ph),v=Math.cos(ph);if(GV){dy=off;r=3*MM*v;}else{dx=off;sk=6.5*MM*v;}', { p: 1, r: 1, sk: 1 });
} });
/* kzDivingBoard — 飛び込み板: the line is a springboard fixed at one end: every beat it is flicked and the free end whips up and down */
jzReg('hold', 'kzDivingBoard', { apply: function (m) {
    akzb_fn(m, 'Hold Board', 'var MM=AMT*(0.4+M),PER=1.15,s0=((time%PER)+PER)%PER,A=SZ*0.45*MM*Math.exp(-s0*2.5)*Math.sin(s0*12.5),' +
        'start=GV?BY0:BX0,len=Math.max(1,GV?BY1-BY0:BX1-BX0),en=' + (akzb_dir(m, 851) > 0 ? 1 : 0) + ';',
        'if(j<0||Math.abs(A)<0.25)return;var v=cl(((GV?gy:gx)-start)/len);if(en)v=1-v;var d=A*v*v;r=Math.atan(2*A*v/len*(en?-1:1))*57.2958;if(GV)dx=-d;else dy=d;', { p: 1, r: 1 });
} });
/* kzSlinky — 疎密パルス: a push travels down the line like along a slinky: the letters bunch up where it is and spread again behind it */
jzReg('hold', 'kzSlinky', { apply: function (m) {
    akzb_fn(m, 'Hold Slinky', 'var MM=AMT*(0.4+M),PER=0.95,s0=((time%PER)+PER)%PER,fr=s0/0.5,start=(GV?BY0:BX0)/FS,len=Math.max(0.001,(GV?BY1-BY0:BX1-BX0)/FS),' +
        'fwd=Math.floor(time/PER)%2===0,xp=fwd?start-1+fr*(len+2):start+len+1-fr*(len+2),A=SZ*0.3*MM*(fwd?1:-1)*cl((1.5-fr)*2.5);',
        'if(j<0||MM<0.01||fr>1.5)return;var d=((GV?gy:gx)/FS-xp)/1.25,u=A*Math.exp(-d*d);if(Math.abs(u)<0.3)return;if(GV)dy=u;else dx=u;', { p: 1 });
} });
/* kzBeatSquat — 拍で屈伸: on every beat the words bend their knees, one a moment after the other: flat on their feet, then up tall, then still */
jzReg('hold', 'kzBeatSquat', { apply: function (m) {
    akzb_fn(m, 'Hold Squat', 'var MM=AMT*(0.4+M),PER=0.6,s0=((time%PER)+PER)%PER;',
        'if(j<0||MM<0.01)return;var ss=s0-Math.min(j,6)*0.045;if(ss<0)return;var v=0.2*MM*Math.exp(-ss*4.2)*Math.cos(ss*13);if(Math.abs(v)<0.003)return;' +
        'rg(bcx,Y1[j],1,1+v*0.5,1-v,0,0,0);', { p: 1, s: 1 });
} });
