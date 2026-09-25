// ================================================================ pack kinetic part 3 — word-by-word enters, exits and holds
// Every entry is one set of text animators whose Expression Selectors run the browser's per-glyph charFn:
// word index / word boxes / glyph centres are estimated at build time and embedded in the expression.

// ---- glyph geometry in the text layer's own space (textIndex order, spaces included, line breaks excluded)
function akn_isSp(ch) { return ch === ' ' || ch === '　' || ch === '\t'; }
function akn_adv(ch) {
    var c = ch.charCodeAt(0);
    if (ch === ' ') return 0.3;
    if (c >= 0xFF61 && c <= 0xFF9F) return 0.5;
    if (/[iljI.,:;'!|]/.test(ch)) return 0.3;
    if (/[mwMW]/.test(ch)) return 0.85;
    return c < 0x2000 ? 0.58 : 1;
}
function akn_geo(L, size) {
    var TP = L.property('ADBE Text Properties'), td = TP.property('ADBE Text Document').value, r = jzRect(L), i, j;
    var fs = td.fontSize || size || 100, text = String(td.text), trk = (td.tracking || 0) / 1000 * fs;
    var lines = text.split(/\r\n|\r|\n|\u0003/), nL = lines.length, lead = fs * 1.2;
    try { if (!td.autoLeading && td.leading > 0) lead = td.leading; } catch (e0) {}
    var just = 'c';
    try { if (td.justification === ParagraphJustification.LEFT_JUSTIFY) just = 'l'; else if (td.justification === ParagraphJustification.RIGHT_JUSTIFY) just = 'r'; } catch (e1) {}
    var G = { fs: fs, text: text, g: [], n: 0, nk: 0, vert: nL > 1, nL: nL };
    var rows = [], maxW = 0;
    for (i = 0; i < nL; i++) {
        var cs = jzChars(lines[i]), ws = [], w = 0;
        for (j = 0; j < cs.length; j++) { var a = akn_adv(cs[j]) * fs; ws.push(a); w += a + (j < cs.length - 1 ? trk : 0); }
        if (cs.length > 1) G.vert = false;
        rows.push({ cs: cs, ws: ws, w: w }); if (w > maxW) maxW = w;
    }
    var k = maxW > 0 ? r.width / maxW : 1; if (!(k > 0.5 && k < 2)) k = 1;
    var lh = r.height - (nL - 1) * lead; if (!(lh > fs * 0.5 && lh < fs * 1.6)) lh = fs * 0.95;
    var cx = r.left + r.width / 2;
    for (i = 0; i < nL; i++) {
        var R = rows[i], x = just === 'l' ? r.left : (just === 'r' ? r.left + r.width - R.w * k : cx - R.w * k / 2), y = r.top + lh / 2 + i * lead;
        for (j = 0; j < R.cs.length; j++) {
            var sp = akn_isSp(R.cs[j]);
            G.g.push({ ch: R.cs[j], li: i, sp: sp, x: x + R.ws[j] * k / 2, y: y, w: Math.max(1, R.ws[j] * k), h: fs });
            x += (R.ws[j] + trk) * k; G.n++;
            if (!sp) G.nk++;
        }
    }
    G.cx = cx; G.cy = r.top + r.height / 2;
    return G;
}
// word of every glyph: the cut's word chunks (else chunks of the layer's own text), boxes per word
function akn_words(cut, G) {
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
    var nW = jmax - jmin + 1, W = [];
    for (j = 0; j < nW; j++) W.push({ x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9, n: 0, li: 0 });
    var inW = [];
    for (i = 0; i < G.n; i++) {
        if (map[i] < 0) { inW.push(0); continue; }
        map[i] -= jmin;
        var b = W[map[i]], g = G.g[i];
        if (!b.n) b.li = g.li;
        inW.push(b.n); b.n++;
        b.x0 = Math.min(b.x0, g.x - g.w / 2); b.x1 = Math.max(b.x1, g.x + g.w / 2); b.y0 = Math.min(b.y0, g.y - g.h / 2); b.y1 = Math.max(b.y1, g.y + g.h / 2);
    }
    var X0 = 1e9, X1 = -1e9, Y0 = 1e9, Y1 = -1e9;
    for (j = 0; j < nW; j++) { b = W[j]; if (!b.n) { b.x0 = b.x1 = G.cx; b.y0 = b.y1 = G.cy; continue; } X0 = Math.min(X0, b.x0); X1 = Math.max(X1, b.x1); Y0 = Math.min(Y0, b.y0); Y1 = Math.max(Y1, b.y1); }
    if (X0 > X1) { X0 = X1 = G.cx; Y0 = Y1 = G.cy; }
    return { map: map, inW: inW, nW: nW, W: W, box: { x0: X0, x1: X1, y0: Y0, y1: Y1 } };
}
function akn_arr(a) { var s = [], i; for (i = 0; i < a.length; i++) s.push(jzN(a[i])); return '[' + s.join(',') + ']'; }
// expression data: per glyph WI (word), GX GY (centre), NI (index in word); per word X0 X1 Y0 Y1 BN (glyphs) WL (line); NW; box BX0..BY1
function akn_gdata(G, Wd) {
    var gx = [], gy = [], i, x0 = [], x1 = [], y0 = [], y1 = [], bn = [], wl = [];
    for (i = 0; i < G.n; i++) { gx.push(G.g[i].x); gy.push(G.g[i].y); }
    for (i = 0; i < Wd.nW; i++) { var b = Wd.W[i]; x0.push(b.x0); x1.push(b.x1); y0.push(b.y0); y1.push(b.y1); bn.push(b.n); wl.push(b.li); }
    return 'var WI=' + akn_arr(Wd.map) + ',GX=' + akn_arr(gx) + ',GY=' + akn_arr(gy) + ',NI=' + akn_arr(Wd.inW) + ',X0=' + akn_arr(x0) + ',X1=' + akn_arr(x1) +
        ',Y0=' + akn_arr(y0) + ',Y1=' + akn_arr(y1) + ',BN=' + akn_arr(bn) + ',WL=' + akn_arr(wl) + ',NW=' + Wd.nW + ',BX0=' + jzN(Wd.box.x0) + ',BX1=' + jzN(Wd.box.x1) +
        ',BY0=' + jzN(Wd.box.y0) + ',BY1=' + jzN(Wd.box.y1) + ',GV=' + (G.vert ? 1 : 0) + ',FS=' + jzN(G.fs) + ';\n';
}
// the browser's numeric hash J.h (seeded directions match the web version)
function akn_h(a, b, c, d, e) {
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
function akn_r(a, b, c, d, e) { return akn_h(a, b, c, d, e) / 4294967296; }
function akn_rs(a, b, c, d, e) { return akn_r(a, b, c, d, e) * 2 - 1; }

// easing / helpers for expressions (names distinct from JZ_FNS and the motion header)
var AKN_FNS = 'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}function bel(x){return Math.sin(Math.PI*cl(x));}' +
    'function sprg(t,k,f){return t<=0?1:Math.exp(-k*t)*Math.cos(f*t);}function kck(t,k,f){return t<=0?0:Math.exp(-k*t)*Math.sin(f*t);}' +
    'function smo(a,b,x){x=cl((x-a)/(b-a));return x*x*(3-2*x);}function stg(p,k,n,s){return cl((p-(n>1?k/(n-1):0)*s)/(1-s));}' +
    'function oel(x){if(x<=0)return 0;if(x>=1)return 1;return Math.pow(2,-10*x)*Math.sin((x*10-0.75)*2.0944)+1;}function ios(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}' +
    'function lrp(a,b,t){return a+(b-a)*t;}function rvx(x,y,a){var c=Math.cos(a*0.0174533),s=Math.sin(a*0.0174533);return [x*c-y*s,x*s+y*c];}\n';

// the browser's charFn as animators. `code` runs inside F() per glyph and may set dx dy s sx sy r a hd (hide) cc (accent colour 0..1) sk (skew deg);
// variables i (0-based glyph), j (word), gx gy (glyph centre), bcx bcy (word centre) are ready. use: { p, s, r, a, col, sk } + K (px range) / S (scale range).
function akn_fn(m, tag, pre, code, use, o) {
    o = o || {};
    var G = akn_geo(m.L, m.size), Wd = akn_words(m.c, G);
    var K = o.K || Math.max(m.W, m.H) * 2, S = o.S || 7, RR = o.R || 360;
    var head = m.HD + AKN_FNS + akn_gdata(G, Wd) + 'var W=' + jzN(m.W) + ',H=' + jzN(m.H) + ',NG=' + G.n + ';' + (pre || '') + '\n' +
        'var i=textIndex-1,j=i<NG?WI[i]:-1,gx=GX[i]||0,gy=GY[i]||0,bcx=j>=0?(X0[j]+X1[j])/2:0,bcy=j>=0?(Y0[j]+Y1[j])/2:0;' +
        'var dx=0,dy=0,s=1,sx=1,sy=1,r=0,a=1,hd=0,cc=0,sk=0;function F(){' + code + '}F();\n';
    var nm = 'JZ ' + tag + ' ';
    if (use.p) jzAnimator(m.L, nm + 'Move', [['ADBE Text Position 3D', [K, K, 0]]], head + '[dx/' + jzN(K) + '*100,dy/' + jzN(K) + '*100,0]');
    if (use.s) jzAnimator(m.L, nm + 'Scale', [['ADBE Text Scale 3D', [S * 100, S * 100, 100]]], head + 'var u=' + jzN(S - 1) + ';[(Math.max(0,s*sx)-1)/u*100,(Math.max(0,s*sy)-1)/u*100,0]');
    if (use.r) jzAnimator(m.L, nm + 'Turn', [['ADBE Text Rotation', RR]], head + 'r/' + jzN(RR) + '*100');
    if (use.sk) jzAnimator(m.L, nm + 'Skew', [['ADBE Text Skew', 60]], head + 'Math.max(-100,Math.min(100,sk/60*100))');
    if (use.col) jzAnimator(m.L, nm + 'Colour', [['ADBE Text Fill Color', jzHex(use.col)]], head + 'cc*100');
    if (use.a) jzAnimator(m.L, nm + 'Fade', [['ADBE Text Opacity', 0]], head + 'hd?100:(1-cl(a))*100');
    return { G: G, Wd: Wd };
}
function akn_dir(m, salt) { return (akn_h((m.c.seed | 0), (m.o.mi | 0), salt) & 1) ? 1 : -1; }

/* ================================================================ ENTRANCES */
jzReg('enter', 'knWordSlam', { selfHide: true, apply: function (m) {
    // words slam down from a huge scale one after another; landed words take a knock at each impact
    akn_fn(m, 'In Slam', 'var sp=NW>1?0.62:0,secs=IN*(1-sp);', 'if(j<0)return;var q=stg(P,j,NW,sp);if(q<=0){hd=1;return;}' +
        'var e=oe(q*1.35);s=1+2.1*(1-e);var kn=0;for(var j2=NW-1;j2>j;j2--){var q2=stg(P,j2,NW,sp);if(q2>=0.74){kn=SZ*0.09*kck((q2-0.74)*secs,11,30);break;}}kn*=cl((1-P)*10);' +
        'dx=(gx-bcx)*(s-1);dy=(gy-bcy)*(s-1)+kn;a=cl(q*7);r=(1-e)*(j%2?7:-7);', { p: 1, s: 1, r: 1, a: 1 });
} });
jzReg('enter', 'knTypeToSlam', { selfHide: true, apply: function (m) {
    // each word is typed small at its start, then snaps up to full size
    akn_fn(m, 'In TypeSlam', 'var sp=NW>1?0.55:0,tq=0.55;', 'if(j<0)return;var q=stg(P,j,NW,sp);if(q<=0){hd=1;return;}' +
        'if(q<tq&&NI[i]>=Math.floor(q/tq*BN[j]+1e-6)+1){hd=1;return;}var e=q<tq?0:ob(cl((q-tq)/(1-tq)),2.2);s=lrp(0.42,1,e);' +
        'var ax=GV?bcx:X0[j],ay=GV?Y0[j]:bcy;dx=(gx-ax)*(s-1);dy=(gy-ay)*(s-1);a=q<tq?0.85:1;', { p: 1, s: 1, a: 1 });
} });
jzReg('enter', 'knReplaceIn', { selfHide: true, apply: function (m) {
    // the words flash big in the middle one by one, replacing each other, then all fly to their places
    akn_fn(m, 'In Replace', 'var T=NW>1?0.7:0.2,Bcx=(BX0+BX1)/2,Bcy=(BY0+BY1)/2,bw=Math.max(0.001,GV?BY1-BY0:BX1-BX0),fly=oe(cl((P-T)/(1-T)));',
        'if(j<0)return;var ww=Math.max(0.001,GV?Y1[j]-Y0[j]:X1[j]-X0[j]),big=Math.min(2.4,Math.max(1,bw/ww*0.8)),w0=j/NW*T,w1=(j+1)/NW*T,cx,cy;' +
        'if(P<T){if(P<w0||P>=w1){hd=1;return;}var q=(P-w0)/(w1-w0);s=big*(1+0.35*Math.exp(-q*9));cx=Bcx;cy=Bcy;a=cl(q*8);}' +
        'else{var last=j===NW-1;s=lrp(last?big:0.3,1,fly);cx=lrp(Bcx,bcx,fly);cy=lrp(Bcy,bcy,fly);a=last?1:cl(fly*3);}' +
        'dx=cx+(gx-bcx)*s-gx;dy=cy+(gy-bcy)*s-gy;', { p: 1, s: 1, a: 1 });
} });
jzReg('enter', 'knHingeDrop', { selfHide: true, apply: function (m) {
    // each word swings down from upright on a hinge at its bottom corner and bounces level
    akn_fn(m, 'In Hinge', 'var sp=NW>1?0.5:0,dr=' + akn_dir(m, 61) + ';', 'if(j<0)return;var q=stg(P,j,NW,sp);if(q<=0){hd=1;return;}' +
        'var th=-88*dr*(1-bo(q)),px=dr>0?X0[j]:X1[j],py=Y1[j],v=rvx(gx-px,gy-py,th);dx=px+v[0]-gx;dy=py+v[1]-gy;r=th;a=cl(q*6);', { p: 1, r: 1, a: 1 });
} });
jzReg('enter', 'knLoopIn', { selfHide: true, apply: function (m) {
    // every glyph rides the same looping track into its place, one after another like a train
    var D = Math.min(m.W, m.H) * 0.55;
    akn_fn(m, 'In Loop', 'var dr=' + akn_dir(m, 63) + ',D=' + jzN(D) + ',R=' + jzN(D / (Math.PI * 2) * 1.5) + ',n=textTotal;',
        'var q=stg(P,dr>0?i:n-1-i,n,0.5);if(q<=0){hd=1;return;}var v=1-oc(q),ph=6.28319*v,a0=v*D-R*Math.sin(ph),b0=-R*(1-Math.cos(ph)),' +
        'ta=D-6.28319*R*Math.cos(ph),tb=-6.28319*R*Math.sin(ph);r=Math.atan2(tb,ta*dr)*57.2958*Math.min(1,v*4);a=cl(q*6);' +
        'if(GV){dx=b0;dy=-a0*dr;}else{dx=a0*dr;dy=b0;}', { p: 1, r: 1, a: 1 });
} });
jzReg('enter', 'knPushIn', { selfHide: true, apply: function (m) {
    // words arrive at the end of the line one by one and push the ones before them into place
    akn_fn(m, 'In Push', 'var f=P*NW,k0=Math.min(NW-1,Math.floor(f)),e=ob(cl((f-k0)/0.75),1.5);' +
        'function lo(q){return GV?Y0[q]:X0[q];}function hi(q){return GV?Y1[q]:X1[q];}',
        'if(j<0)return;if(j>k0){hd=1;return;}var li=WL[j],end=-1e9,last=-1,prev=-1,q;for(q=0;q<NW;q++)if(WL[q]===li){end=hi(q);if(q<=k0){prev=last;last=q;}}' +
        'var v=end-hi(last);if(last===k0)v+=prev>=0?((end-hi(prev))-(end-hi(last)))*(1-e):(end-lo(last))*0.6*(1-e);' +
        'a=j===k0?cl(e*3):1;if(GV)dy=v;else dx=v;', { p: 1, a: 1 });
} });
jzReg('enter', 'knInertia', { apply: function (m) {
    // the line brakes into place: the front stops first, the rest bunch up behind it and spring apart
    var dr = akn_dir(m, 67);
    akn_fn(m, 'In Brake', 'var dr=' + dr + ',D=' + jzN((0) + m.W * 0.6) + ',DV=' + jzN(m.H * 0.6) + ',n=textTotal;',
        'var bk=n>1?(dr>0?(n-1-i)/(n-1):i/(n-1)):0,q=cl((P-bk*0.3)/0.7),e=ob(q,2.1),v=(ob(Math.min(1,q+0.02),2.1)-e)/0.02,' +
        'st=1+Math.min(0.5,Math.abs(v)*0.08),sq=q>0.55?1-0.18*bk*bel((q-0.55)/0.45):1;' +
        'if(GV){dy=-dr*DV*(1-e);sy=st*sq;sx=1/st;}else{dx=-dr*D*(1-e);sx=st*sq;sy=1/st;}', { p: 1, s: 1 });
} });
jzReg('enter', 'knWordSpin', { selfHide: true, apply: function (m) {
    // each word spins in as one rigid piece, neighbours turning the opposite way
    akn_fn(m, 'In Spin', 'var sp=NW>1?0.5:0;', 'if(j<0)return;var q=stg(P,j,NW,sp);if(q<=0){hd=1;return;}' +
        'var e=ob(q,1.6),th=(1-oc(q))*200*(j%2?-1:1);s=lrp(0.15,1,e);var v=rvx((gx-bcx)*s,(gy-bcy)*s,th);dx=bcx+v[0]-gx;dy=bcy+v[1]-gy;r=th;a=cl(q*5);', { p: 1, s: 1, r: 1, a: 1 });
} });
jzReg('enter', 'knDiveIn', { selfHide: true, apply: function (m) {
    // words fly in from behind the camera one after another, huge and soft, landing sharp
    akn_fn(m, 'In Dive', 'var sp=NW>1?0.55:0,Bcx=(BX0+BX1)/2;', 'if(j<0)return;var q=stg(P,j,NW,sp);if(q<=0){hd=1;return;}' +
        'var e=oc(q);s=lrp(5.5,1,e);dx=(gx-bcx)*(s-1)+(bcx-Bcx)*(s-1)*0.6;dy=(gy-bcy)*(s-1);a=cl(q*2.2)*lrp(0.35,1,e);', { p: 1, s: 1, a: 1 });
} });
jzReg('enter', 'knStretchOut', { selfHide: true, apply: function (m) {
    // each word shoots out from its first letter like a tape measure and snaps back to length
    akn_fn(m, 'In Stretch', 'var sp=NW>1?0.55:0;', 'if(j<0)return;var q=stg(P,j,NW,sp);if(q<=0){hd=1;return;}' +
        'var k=q>=1?1:Math.max(0.02,oel(q));a=cl(q*8);if(GV){dy=(gy-Y0[j])*(k-1);sy=k;}else{dx=(gx-X0[j])*(k-1);sx=k;}', { p: 1, s: 1, a: 1 });
} });

/* ================================================================ EXITS */
jzReg('exit', 'knWordKick', { apply: function (m) {
    // the words are kicked out one after another, up and down in turn, tumbling
    akn_fn(m, 'Out Kick', 'var sp=NW>1?0.4:0;', 'if(j<0)return;var q=stg(PO,j,NW,sp);if(q<=0)return;if(q>=1){hd=1;return;}' +
        'var up=j%2?1:-1,e=ic(q),th=up*70*e,v=rvx(gx-bcx,gy-bcy,th);dx=bcx+v[0]-gx+up*SZ*0.6*e;dy=bcy+v[1]-gy+up*H*0.9*e-up*SZ*0.25*bel(q*2);r=th;' +
        'a=1-iq(cl((q-0.45)/0.55));', { p: 1, r: 1, a: 1 });
} });
jzReg('exit', 'knPushOut', { apply: function (m) {
    // the line is shunted along in word-sized steps; each word fades as it passes the line's start
    akn_fn(m, 'Out Push', 'function lo(q){return GV?Y0[q]:X0[q];}function hi(q){return GV?Y1[q]:X1[q];}',
        'if(j<0)return;var li=WL[j],js=[],q;for(q=0;q<NW;q++)if(WL[q]===li)js.push(q);var mm=js.length,s0=lo(js[0]),f=PO*mm,k0=Math.min(mm-1,Math.floor(f)),e=ob(cl((f-k0)/0.8),1.6);' +
        'function to(z){return z>=mm?hi(js[mm-1])-s0+0.2*FS:lo(js[z])-s0;}var sh=lrp(to(k0),to(k0+1),e),ov=s0-((GV?gy:gx)-sh);' +
        'a=(1-cl(ov/(0.45*FS)))*(1-smo(0.72,1,PO))*(PO>0.97?1-cl((PO-0.97)/0.03):1);if(a<=0.01){hd=1;return;}if(GV)dy=-sh;else dx=-sh;', { p: 1, a: 1 });
} });
jzReg('exit', 'knDiveGlyph', { apply: function (m) {
    // the camera dives into one letter: the line blows up around it and the rest flies past
    var G = akn_geo(m.L, m.size), fi = -1, i, nk = 0, ks = [];
    for (i = 0; i < G.n; i++) if (!G.g[i].sp) { ks.push(i); if (fi < 0 && jzIsKanji(G.g[i].ch)) fi = i; }
    if (!ks.length) return;
    if (fi < 0) fi = ks[Math.floor(ks.length / 2)];
    var one = ks.length <= 1, f = G.g[fi];
    if (one) { m.parts.op.push('f*=1-(function(x){x=cl((x-0.3)/0.7);return x*x*(3-2*x);})(PO);'); return; }
    // the chosen letter drifts to the middle of the frame (static transform chain, unrotated layers only)
    var L = m.L, tr = L.property('ADBE Transform Group'), rot = tr.property('ADBE Rotate Z').value, ap = tr.property('ADBE Anchor Point').value, sc = tr.property('ADBE Scale').value;
    var px = tr.property('ADBE Position').value[0] + (f.x - ap[0]) * sc[0] / 100, py = tr.property('ADBE Position').value[1] + (f.y - ap[1]) * sc[1] / 100, P0 = L.parent, g = 0, ok = !rot;
    while (P0 && g++ < 6) {
        var t2 = P0.property('ADBE Transform Group'), a2 = t2.property('ADBE Anchor Point').value, s2 = t2.property('ADBE Scale').value;
        if (t2.property('ADBE Rotate Z').value) ok = false;
        px = t2.property('ADBE Position').value[0] + (px - a2[0]) * s2[0] / 100; py = t2.property('ADBE Position').value[1] + (py - a2[1]) * s2[1] / 100;
        P0 = P0.parent;
    }
    if (ok) m.parts.pos.push('var de=(function(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;})(PO);d=[d[0]+' + jzN(m.W / 2 - px) + '*de,d[1]+' + jzN(m.H / 2 - py) + '*de];');
    akn_fn(m, 'Out DiveGlyph', 'var FI=' + fi + ',SS=Math.exp(Math.pow(PO,1.7)*Math.log(34));',
        'if(GX[i]==null)return;var fx=GX[FI],fy=GY[FI];a=i===FI?1-smo(0.6,1,PO):1-smo(0.25,0.7,PO);if(a<=0.01){hd=1;return;}s=SS;dx=(gx-fx)*(s-1);dy=(gy-fy)*(s-1);',
        { p: 1, s: 1, a: 1 }, { S: 36, K: Math.max(m.W, m.H) * 40 });
} });
jzReg('exit', 'knLaunch', { apply: function (m) {
    // the line pulls away: the front glyph goes first, the rest follow on a stretching chain
    akn_fn(m, 'Out Launch', 'var dr=' + akn_dir(m, 71) + ',D=' + jzN(m.W * 1.25) + ',DV=' + jzN(m.H * 1.25) + ',n=textTotal;',
        'var bk=n>1?(dr>0?(n-1-i)/(n-1):i/(n-1)):0,q=cl((PO-bk*0.35)/0.65),an=-0.06*bel(cl(PO/0.18)),e=ic(q)+an,st=1+Math.min(1.2,3*q*q*0.35);' +
        'if(q>=1){hd=1;return;}if(GV){dy=dr*DV*e;sy=st;sx=1/Math.sqrt(st);}else{dx=dr*D*e;sx=st;sy=1/Math.sqrt(st);}', { p: 1, s: 1, a: 1 });
} });
jzReg('exit', 'knWordBlink', { apply: function (m) {
    // one word at a time: a punch in the accent colour, then gone
    var rev = (akn_h(m.c.seed | 0, 73) & 1) === 1;
    akn_fn(m, 'Out Blink', 'var RV=' + (rev ? 1 : 0) + ',R1=' + jzN(akn_r(m.c.seed | 0, m.o.mi | 0, 74) * 0.6) + ';',
        'if(j<0)return;var jj=RV?NW-1-j:j,w0=NW>1?jj/NW:R1,w1=NW>1?(jj+1)/NW:R1+0.4;if(PO>=w1||PO>=0.999){hd=1;return;}if(PO<w0)return;' +
        'var q=(PO-w0)/(w1-w0);s=1+0.16*bel(q*1.4);dx=(gx-bcx)*(s-1);dy=(gy-bcy)*(s-1);cc=q>0.25?1:0;a=q>0.7?0.35:1;', { p: 1, s: 1, a: 1, col: m.ctx.sc.accent });
} });
jzReg('exit', 'knCloseGap', { apply: function (m) {
    // words drop out one by one and the rest slide together, re-centring, until the last one pops
    akn_fn(m, 'Out Close', 'function lo(q){return GV?Y0[q]:X0[q];}function hi(q){return GV?Y1[q]:X1[q];}function rk(q){var a2=0,b2=NW-1,r2=0;while(a2<=b2){if(a2===q)return r2;r2++;if(b2!==a2){if(b2===q)return r2;r2++;}a2++;b2--;}return 0;}' +
        'function cc2(q){return ioc(PO*NW-rk(q));}',
        'if(j<0)return;var cj=cc2(j);if(cj>=0.999){hd=1;return;}var li=WL[j],js=[],q;for(q=0;q<NW;q++)if(WL[q]===li)js.push(q);var mm=js.length,tot=0,z,ctr=0;' +
        'function cz(z){return z<mm-1?(lo(js[z+1])-hi(js[z]))*(1-Math.max(cc2(js[z]),cc2(js[z+1]))):0;}' +
        'for(z=0;z<mm;z++)tot+=(hi(js[z])-lo(js[z]))*(1-cc2(js[z]))+cz(z);var x=(lo(js[0])+hi(js[mm-1]))/2-tot/2;' +
        'for(z=0;z<mm;z++){var w2=(hi(js[z])-lo(js[z]))*(1-cc2(js[z]));if(js[z]===j)ctr=x+w2/2;x+=w2+cz(z);}' +
        's=Math.max(0.01,1-cj);var wc=(lo(j)+hi(j))/2,al=GV?gy:gx,cr=GV?gx:gy,cm=GV?bcx:bcy,na=ctr+(al-wc)*s,nc=cm+(cr-cm)*s;' +
        'if(GV){dx=nc-gx;dy=na-gy;}else{dx=na-gx;dy=nc-gy;}', { p: 1, s: 1, a: 1 });
} });
jzReg('exit', 'knJumpCutOut', { apply: function (m) {
    // three hard jump cuts (closer, wider, tilted) and the line is gone
    var side = (akn_h(m.c.seed | 0, m.o.mi | 0, 79) & 1) ? 1 : -1;
    var T = 'var jst=Math.floor(cl(PO)*4),JST=[[1.22,' + jzN(0.05 * side) + ',-0.02,0],[0.8,' + jzN(-0.07 * side) + ',0.03,0],[1.5,' + jzN(0.02 * side) + ',0,' + (3 * side) + '],[1,0,0,0]],JSJ=PO>0?JST[Math.min(3,jst)]:[1,0,0,0];';
    m.parts.sc.push(T + 'f=[f[0]*JSJ[0],f[1]*JSJ[0]];');
    m.parts.pos.push(T + 'd=[d[0]+JSJ[1]*thisComp.width,d[1]+JSJ[2]*thisComp.height];');
    m.parts.rot.push(T + 'r+=JSJ[3];');
    m.parts.op.push(T + 'f*=PO>0&&jst>=3?0:1;');
} });
jzReg('exit', 'knStackAway', { apply: function (m) {
    // the words hop into a tower one by one, then the whole tower drops out of frame
    akn_fn(m, 'Out Stack', 'var T=0.62,Bcx=(BX0+BX1)/2,Bcy=(BY0+BY1)/2,lh=BY1-BY0;',
        'if(j<0)return;var q=ioc(cl((PO/T-j/Math.max(1,NW)*0.7)/0.3)),h=GV?X1[j]-X0[j]:Math.max(0.001,Y1[j]-Y0[j]);' +
        'var tx=GV?Bcx-(j-(NW-1)/2)*h*1.05:Bcx,ty=GV?Bcy:Bcy-(j-(NW-1)/2)*h*1.05,hop=-bel(q)*(GV?h:lh)*0.8;' +
        'dx=(tx-bcx)*q;dy=(ty-bcy)*q+hop;var fa=cl((PO-T)/(1-T));dy+=iq(fa)*H*1.2;r=fa*(j%2?8:-8);if(fa>=1){hd=1;return;}a=1-smo(0.8,1,fa);', { p: 1, r: 1, a: 1 });
} });

/* ================================================================ HOLDS (no beat grid inside the content comp: fixed periods) */
jzReg('hold', 'knWordPulse', { apply: function (m) {
    // one word at a time swells on the beat, cycling through the line
    akn_fn(m, 'Hold Pulse', 'var PER=0.52,s0=((time%PER)+PER)%PER,cur=((Math.floor(time/PER)%NW)+NW)%NW,pu=Math.exp(-s0*4)*0.14*AMT*(0.4+M);',
        'if(j!==cur||pu<0.002)return;s=1+pu;dx=(gx-bcx)*(s-1);dy=(gy-bcy)*(s-1);', { p: 1, s: 1 });
} });
jzReg('hold', 'knCounterRock', { apply: function (m) {
    // neighbouring words rock the opposite way, like meshed gears
    akn_fn(m, 'Hold Rock', 'var A=4*AMT*(0.4+M)*Math.sin(time*6.28319*0.55);',
        'if(j<0)return;var th=A*(j%2?-1:1)*(NW===1?0.6:1),v=rvx(gx-bcx,gy-bcy,th);dx=bcx+v[0]-gx;dy=bcy+v[1]-gy;r=th;', { p: 1, r: 1 });
} });
jzReg('hold', 'knWordRide', { apply: function (m) {
    // a slow swell travels along the line; each word rides it as one piece, tilting with the slope
    akn_fn(m, 'Hold Ride', 'var A=SZ*0.07*AMT*(0.4+M);',
        'if(j<0)return;var ph=time*3.1-j*1.25,off=A*Math.sin(ph),th=Math.cos(ph)*3.5*AMT,v=rvx(gx-bcx,gy-bcy,th);dx=bcx+v[0]-gx;dy=bcy+v[1]-gy;r=th;if(GV)dx+=off;else dy+=off;', { p: 1, r: 1 });
} });
jzReg('hold', 'knTickShift', { apply: function (m) {
    // the line ticks sideways on every beat like a second hand: snap, tiny overshoot, hold
    var G = akn_geo(m.L, m.size);
    m.parts.pos.push('var PER=0.5,ts0=((time%PER)+PER)%PER,tix=Math.floor(time/PER),tdd=SZ*0.05*AMT*(0.4+M),tfr=tix%2?1:-1,tx=(-tfr+2*tfr*ob(cl(ts0/0.09),2.6))*tdd;' +
        (G.vert ? 'd=[d[0],d[1]+tx];' : 'd=[d[0]+tx,d[1]];'));
} });
jzReg('hold', 'knBeatLean', { apply: function (m) {
    // on each beat the words lean over, alternately forward and back, and spring upright
    akn_fn(m, 'Hold Lean', 'var PER=0.55,s0=((time%PER)+PER)%PER,ix=Math.floor(time/PER),A=18*AMT*(0.4+M)*Math.exp(-s0*4.5)*Math.cos(s0*15);',
        'if(j<0||Math.abs(A)<0.1)return;sk=A*((j+ix)%2?1:-1);', { sk: 1 });
} });
jzReg('hold', 'knGapBreath', { apply: function (m) {
    // the spaces between words breathe in and out; the words themselves keep still
    akn_fn(m, 'Hold Gap', 'var A=SZ*0.16*AMT*(0.4+M)*(0.5-0.5*Math.cos(time*6.28319*0.4));',
        'if(j<0||NW<2)return;var o=(j-(NW-1)/2)*A;if(GV)dy=o;else dx=o;', { p: 1 });
} });
