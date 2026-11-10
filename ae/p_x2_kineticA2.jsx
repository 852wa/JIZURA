// ================================================================ x2kineticA part 2 (AE port of src/11p_x2_kineticA.js — キネティック 追加分2)
// Layouts kzSlingshot … kzInchworm, the motion-accent decor (kzImpactTicks … kzPushRods) and the moving backgrounds
// (kzKickStreaks … kzSqueezeLines). Shared helpers (akza_…) are in part 1 (p_x2_kineticA1.jsx).

/* ================================================================================================ LAYOUTS (continued) */

/* 9 kzSlingshot — ゴム発射: a rubber band under the block is drawn back with each word and fires it up into its place */
jzReg('layout', 'kzSlingshot', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), deep: rng.range(0.6, 1), acc: rng.int(0, 5), posts: rng.chance(0.8), hot: rng.chance(0.5) }; },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i;
        var font = akza_font(ctx), units = akza_wu(ctx, 5, 6), n = units.length, ts = akza_onsets(c, n, 0.5, 0.44);
        var F = akza_flow(ctx, units, font, W * 0.84, H * 0.5, { maxLines: akza_tall(ctx) ? 4 : 3, maxSize: H * (port ? 0.12 : 0.18) });
        var size = F.size, bx = W / 2, by = H * 0.43, band = H * 0.87, half = Math.max(F.w / 2 + size * 0.2, W * 0.24), accC = akza_acc(sc), hot = jzP(ctx, 'hot', false), acc = jzP(ctx, 'acc', 0);
        var HD = akza_H(ctx, { TS: ts, PX: akza_pl(F.pos, 'x'), PY: akza_pl(F.pos, 'y'), SZ: size, BX: bx, BY: by, BAND: band, PD: 0.17, PULL: size * jzP(ctx, 'deep', 0.8), HALF: half, UU: u },
            'function U(I,t){var tau=t-TS[I],q=oc(tau/PD),ry=BAND-SZ*0.6+PULL*q,f=tau<PD?0:spr(tau-PD,9,12),st=tau<PD?1-0.25*q:1+0.3*Math.exp(-(tau-PD)*9);' +
            'return [BX+PX[I],lrp(ry,BY+PY[I],f),1,st,0,cl(tau/0.05)];}');
        var Ls = [];
        for (i = 0; i < n; i++) {
            Ls.push(akza_word(ctx, units[i], { font: font, size: size, color: (!hot && i === acc % n) ? accC : sc.fg, x: bx + F.pos[i].x, y: by + F.pos[i].y, mi: akza_mi(ctx, ts[i]), H: HD, I: i, use: 'ps', a: true,
                tint: hot ? [accC, 'cix(TS,time)===' + i + '?100:0'] : null }));
        }
        // the band (pulled down by the newest word, then twanging) and its posts
        var lw = Math.max(2.5 * ctx.u, u * 0.005), S = akza_shape(ctx, 'kz sling band');
        var M = 'var k=cix(TS,time),e0=oe(time/0.35),x0=BX-HALF*e0,x1=BX+HALF*e0,ax=BX,ay=BAND;if(k>=0){var tau=time-TS[k];ax=BX+PX[k];ay=tau<PD?BAND+PULL*oc(tau/PD):BAND-SZ*0.4*pls(tau-PD,8,34);}';
        akza_line(S, 'band', HD + M + 'createPath([[x0,BAND],[Math.max(x0,Math.min(x1,ax)),ay],[x1,BAND]],[],[],false)', accC, lw, 95);
        if (jzP(ctx, 'posts', false)) {
            var g = jzGrp(S, 'posts');
            akza_px(g, HD + M + 'createPath([[x0,BAND-UU*0.03*e0],[x0,BAND+UU*0.045*e0]],[],[],false)');
            akza_px(g, HD + M + 'createPath([[x1,BAND-UU*0.03*e0],[x1,BAND+UU*0.045*e0]],[],[],false)');
            jzAddStroke(g, sc.fg, lw * 1.3);
        }
        akza_op(S, HD + 'K*100');
        return akza_bbL(Ls);
    }
});

/* 10 kzWedge — 割り込み: the line stands closed; the key word drops in and wedges the others apart */
jzReg('layout', 'kzWedge', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), how: rng.pick(['drop', 'drop', 'rise', 'inflate']), key: rng.int(0, 5), marks: rng.chance(0.6) }; },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, p, s, v;
        var font = akza_font(ctx), units = akza_wu(ctx, 5, 6), n = units.length, pk = jzP(ctx, 'key', 0), how = jzP(ctx, 'how', 'drop');
        var F = akza_flow(ctx, units, font, W * 0.84, H * (port ? 0.5 : 0.44), { maxLines: akza_tall(ctx) ? 4 : 2, maxSize: H * (port ? 0.12 : 0.2), track: 0.02 });
        // the key word: the longest one that has neighbours on its line to push aside (inner words first)
        var key = akza_keyOf(units, pk), kv = -1;
        for (i = 0; i < n; i++) {
            p = F.pos[i];
            if (p.a === p.b) continue;
            v = akza_gc(units[i]) + (i > p.a && i < p.b ? 0.5 : 0) + ((i + pk) % n) * 0.01;
            if (v > kv) { kv = v; key = i; }
        }
        var size = F.size, kp = F.pos[key], tK = jzClamp(c.dur * 0.3, 0.3, 0.9), fall = how === 'inflate' ? 0 : 0.17, hit = tK + fall, cx = W / 2, cy = H / 2, accC = akza_acc(sc);
        var gapPx = key < kp.b ? F.pos[key + 1].x - F.pos[key + 1].w / 2 - (kp.x + kp.w / 2) : (key > kp.a ? kp.x - kp.w / 2 - (F.pos[key - 1].x + F.pos[key - 1].w / 2) : 0);
        var half = (kp.w + gapPx) / 2, mn = 1e9, mx = -1e9, x;
        for (i = kp.a; i <= kp.b; i++) if (i !== key) { p = F.pos[i]; x = p.x + (i < key ? half : -half); mn = Math.min(mn, x - p.w / 2); mx = Math.max(mx, x + p.w / 2); }
        var corr = mn < mx ? -(mn + mx) / 2 : 0, DXO = [], RS = [], DY = [];
        for (i = 0; i < n; i++) {
            p = F.pos[i]; s = i < key ? 1 : -1;
            var same = i !== key && p.li === kp.li;
            DXO.push(same ? s * half + corr : 0); RS.push(same ? -s * 4 : 0);
            DY.push(i === key || same ? 0 : (p.li > kp.li ? 1 : -1) * size * 0.1);
        }
        var HD = akza_H(ctx, { PX: akza_pl(F.pos, 'x'), PY: akza_pl(F.pos, 'y'), DXO: DXO, RS: RS, DY: DY, HIT: hit, TK: tK, FALL: Math.max(0.001, fall), SZ: size, CX: cx, CY: cy, KEY: key,
            HOW: how === 'inflate' ? 2 : (how === 'rise' ? 1 : 0), KW: kp.w },
            'function U(I,t){var op=spr(t-HIT,7.5,14),kk=pls(t-HIT,7,16);return [CX+PX[I]+DXO[I]*(1-op),CY+PY[I]+DY[I]*kk,1,1,RS[I]*kk,1];}' +
            'function UK(I,t){var tau=t-TK,y=PY[KEY],sy=1,z=1;if(HOW===2)z=Math.max(0.02,spr(tau,8,13));else{y+=(HOW===1?1:-1)*H*0.62*(1-iq(tau/FALL));' +
            'if(t>HIT)sy=1-0.2*Math.exp(-(t-HIT)*12)*Math.cos((t-HIT)*18);}return [CX+PX[KEY],CY+y,z,z*sy,0,1];}');
        var Ls = [], mi = 0;
        for (i = 0; i < n; i++) {
            p = F.pos[i];
            if (i === key) Ls.push(akza_word(ctx, units[i], { font: font, size: size, color: accC, x: cx + p.x, y: cy + p.y, track: 0.02, mi: akza_mi(ctx, tK), H: HD, I: i, fn: 'UK', use: 'ps' }));
            else Ls.push(akza_word(ctx, units[i], { font: font, size: size, color: sc.fg, x: cx + p.x, y: cy + p.y, track: 0.02, mi: mi++, H: HD, I: i }));
        }
        // impact marks at the four corners of the key word
        if (jzP(ctx, 'marks', false)) {
            var S = akza_shape(ctx, 'kz wedge marks'), g = jzGrp(S, 'marks'), M = 'var t2=time-HIT,q=t2/0.35,e=oe(q);';
            for (s = -1; s <= 1; s += 2) for (v = -1; v <= 1; v += 2) {
                akza_px(g, HD + M + 'var x0=CX+PX[KEY]+(' + s + ')*(KW/2+SZ*0.1*e),y0=CY+PY[KEY]+(' + v + ')*SZ*(0.56+0.2*e);createPath([[x0,y0],[x0+(' + s + ')*SZ*0.16*(1-q),y0+(' + v + ')*SZ*0.16*(1-q)]],[],[],false)');
            }
            jzAddStroke(g, accC, Math.max(2 * ctx.u, u * 0.004));
            akza_gop(g, HD + M + '(t2>0&&t2<0.35)?(1-q)*K*100:0');
        }
        return akza_bbL(Ls);
    }
});

/* 11 kzTiltTray — 傾く盤: a tray tips one way, then the other: the lines slide to the walls, thud, and settle in the middle */
jzReg('layout', 'kzTiltTray', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), th: rng.range(4, 6.5), sgn: rng.pick([1, -1]), frame: rng.pick(['tray', 'tray', 'floor']), acc: rng.int(0, 5) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i;
        var font = akza_font(ctx), units = akza_wu(ctx, 5, 6, 1), n = units.length;
        var F = akza_flow(ctx, units, font, W * (port ? 0.62 : 0.56), H * 0.5, { maxLines: akza_tall(ctx) ? 5 : 3, lineBonus: 1.04, maxSize: H * (port ? 0.11 : 0.17), lead: 1.3 });
        var size = F.size, TW = W * 0.84, TH = Math.max(F.h + size * 0.7, H * 0.26), T = jzClamp(c.dur * 0.52, 0.5, 1.6), sgn = jzP(ctx, 'sgn', 1), cx = W / 2, cy = H / 2;
        var accC = akza_acc(sc), subC = akza_sub(sc), acc = jzP(ctx, 'acc', 0), RR = [];
        for (i = 0; i < n; i++) RR.push(Math.max(0, (TW - F.lw[F.pos[i].li]) / 2 - size * 0.22));
        // TL(t) = tilt of the tray; SA(line, t) = where that line has slid to (-1 … 1 between the walls)
        var HD = akza_H(ctx, { PX: akza_pl(F.pos, 'x'), PY: akza_pl(F.pos, 'y'), LI: akza_pl(F.pos, 'li'), RR: RR, TT: T, THA: jzP(ctx, 'th', 5) * sgn, SGN: sgn, CX: cx, CY: cy },
            'function TL(t){return lrp(lrp(-THA,THA,ioc((t-0.1*TT)/(0.22*TT))),0,t>0.62*TT?spr(t-0.62*TT,5,8):0);}' +
            'function SA(l,t){var t1=0.16*TT+l*0.045,d1=0.26*TT,t2=0.66*TT+l*0.045,s=-1;if(t>=t1){var q=(t-t1)/d1,t3=t-t1-d1;s=q<1?-1+2*iq(q):1-0.13*Math.exp(-t3*9)*Math.abs(Math.sin(t3*17));}' +
            'if(t>=t2)s*=sprg(t-t2,5.5,9);return s*SGN;}' +
            'function U(I,t){var tl=TL(t),v=rvx(SA(LI[I],t)*RR[I]+PX[I],PY[I],tl);return [CX+v[0],CY+v[1],1,1,tl,1];}');
        var Ls = [];
        for (i = 0; i < n; i++) {
            Ls.push(akza_word(ctx, units[i], { font: font, size: size, color: (n > 1 && i === acc % n) ? accC : sc.fg, x: cx + F.pos[i].x, y: cy + F.pos[i].y, mi: i, H: HD, I: i, use: 'pr' }));
        }
        var Tr = akza_shape(ctx, 'kz tray', cx, cy);
        akza_line(Tr, 'tray', HD + 'var wl=' + jzN(jzP(ctx, 'frame', 'tray') === 'tray' ? TH : TH * 0.3) + '*oe(time/0.35),hw=' + jzN(TW / 2) + ',hh=' + jzN(TH / 2) + ';createPath([[-hw,hh-wl],[-hw,hh],[hw,hh],[hw,hh-wl]],[],[],false)',
            subC, Math.max(2.5 * ctx.u, u * 0.005), 90);
        jzSetExpr(jzXf(Tr, 'ADBE Rotate Z'), HD + 'TL(time)');
        akza_op(Tr, HD + 'K*oe(time/0.35)*100');
        return akza_bbL(Ls);
    }
});

/* 12 kzRelay — 主役リレー: one word holds the stage; when the next arrives the old one shrinks away into a small running line above */
jzReg('layout', 'kzRelay', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), acc: rng.chance(0.7), rule: rng.chance(0.7), al: rng.pick(['center', 'center', 'left']) }; },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i;
        var font = akza_font(ctx), units = akza_wu(ctx, 5, 6), n = units.length, ts = akza_onsets(c, n, 0.5, 0.46);
        var capY = H * (port ? 0.33 : 0.25), bigY = H * (port ? 0.56 : 0.6), accC = akza_acc(sc), subC = akza_sub(sc), useAcc = jzP(ctx, 'acc', false), big = [], bw = [];
        for (i = 0; i < n; i++) {
            big.push(Math.min(akza_fit(ctx, units[i], font, W * 0.84, H * 0.36, 0.02), H * (port ? 0.24 : 0.36), W * 0.56));
            bw.push(akza_em(ctx, units[i], font, 0.02) * big[i]);
        }
        var Fc = n > 1 ? akza_flow(ctx, units.slice(0, n - 1), font, W * 0.8, H * 0.15, { maxLines: 2, maxSize: H * (port ? 0.055 : 0.1) }) : null;
        var left = jzP(ctx, 'al', 'center') === 'left' && Fc, ox = left ? W * 0.1 + Fc.w / 2 : W / 2, fs = Fc ? Fc.size : big[0], BX = [], CPX = [], CPY = [], BS = [];
        for (i = 0; i < n; i++) {
            BX.push(left ? W * 0.1 + bw[i] / 2 : W / 2);
            CPX.push(i < n - 1 ? Fc.pos[i].x : 0); CPY.push(i < n - 1 ? Fc.pos[i].y : 0);
            BS.push(i < n - 1 ? fs : big[i]);                 // the font size each layer is made at (its resting size)
        }
        // U -> [x, y, sx, sy, rot, alpha, accent amount]: the word on stage, then (once the next one arrives) shrinking into the caption line
        var HD = akza_H(ctx, { TS: ts, BG: big, BX: BX, BIGY: bigY, CAPY: capY, OX: ox, CPX: CPX, CPY: CPY, FS: fs, BS: BS, NU: n },
            'function U(I,t){var k=cix(TS,t),z,x,y,al=1,cm=1,q;if(k<=I||I>=NU-1){q=cl((t-TS[I])/0.22);z=BG[I]*(I?lrp(1.6,1,oe(q)):1);x=BX[I];y=BIGY;al=I?cl(q*4):1;}' +
            'else{q=oe((t-TS[I+1])/0.34);z=Math.exp(lrp(Math.log(BG[I]),Math.log(FS),q));x=lrp(BX[I],OX+CPX[I],q);y=lrp(BIGY,CAPY+CPY[I],q);cm=1-q;}return [x,y,z/BS[I],z/BS[I],0,al,cm];}');
        var Ls = [];
        for (i = 0; i < n; i++) {
            var last = i === n - 1;
            Ls.push(akza_word(ctx, units[i], { font: font, size: BS[i], color: (useAcc && last) ? accC : sc.fg, x: last ? BX[i] : ox + CPX[i], y: last ? bigY : capY + CPY[i], track: last ? 0.02 : 0,
                mi: akza_mi(ctx, ts[i]), H: HD, I: i, use: 'ps', a: i > 0, tint: (useAcc && !last) ? [accC, 'U(' + i + ',time)[6]*100'] : null }));
        }
        // a rule under the caption line grows by one step per word
        if (jzP(ctx, 'rule', false) && Fc) {
            var lw = Math.max(2 * ctx.u, u * 0.003), R = akza_shape(ctx, 'kz relay rule', ox - Fc.w / 2, capY + Fc.h / 2 + Fc.size * 0.45), g = jzGrp(R, 'rule');
            jzAddRect(g, Fc.w, lw, 0, Fc.w / 2, 0); jzAddFill(g, subC);
            jzSetExpr(jzXf(R, 'ADBE Scale'), HD + 'var k=cix(TS,time);[k>0?lrp((k-1)/(NU-1),k/(NU-1),oe((time-TS[k])/0.35))*100:0,100]');
            akza_op(R, HD + '85*K');
        }
        return akza_bbL(Ls);
    }
});

/* 13 kzLineFeed — 行送り: the lyric is fed out of a slot line by line in jerky steps, then the sheet glides up to the middle */
jzReg('layout', 'kzLineFeed', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'body', 'mono'])), al: rng.pick(['left', 'left', 'center']), paper: rng.chance(0.6), acc: rng.int(0, 5), steps: rng.pick([2, 3, 3]) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, i;
        var font = akza_font(ctx), units = akza_wu(ctx, 4, 6), n = units.length, ts = akza_onsets(c, n, 0.5, 0.42), mm = 0, lead = 1.3;
        for (i = 0; i < n; i++) mm = Math.max(mm, akza_em(ctx, units[i], font, 0.02));
        var size = Math.min(W * 0.76 / mm, H * 0.6 / (n * lead), H * 0.19), bh = n * lead * size, bw = mm * size, pad = size * 0.3;
        var slotY = Math.min(H * 0.9, H / 2 + bh / 2 + size * 0.7), Yf = H / 2 - bh / 2, x0 = W / 2 - bw / 2, al = jzP(ctx, 'al', 'left') === 'left' ? 'left' : 'center';
        var tE = Math.max(ts[n - 1] + 0.3, Math.min(ts[n - 1] + 0.6, c.dur - (c.outDur || 0) - 0.4)), accC = akza_acc(sc), subC = akza_sub(sc), acc = jzP(ctx, 'acc', 0);
        var sw = bw + pad * 4.4, sh = Math.max(5 * ctx.u, size * 0.13);
        // YY(t) = top of the sheet: one line per word in STP jerks, then the glide to the middle (GE)
        var HD = akza_H(ctx, { TS: ts, SLOT: slotY, YF: Yf, LS: lead * size, SZ: size, STP: jzP(ctx, 'steps', 3), TE: tE, XX: al === 'left' ? x0 : W / 2, X0: x0, BW: bw, BH: bh, PAD: pad, SW: sw, SH: sh },
            'function SE(q){q=cl(q);var a=Math.floor(q*STP);return q>=1?1:(a+oe(q*STP-a))/STP;}function YK(k){return SLOT-SZ*0.1-(k+1)*LS;}function GE(t){return ioc((t-TE)/0.45);}' +
            'function YY(t){var k=cix(TS,t),y=k<0?SLOT:lrp(k>0?YK(k-1):SLOT,YK(k),SE((t-TS[k])/0.3));return lrp(y,YF,GE(t));}' +
            'function U(I,t){return [XX,YY(t)+(I+0.5)*LS,1,1,0,1];}');
        var Ls = [];
        for (i = 0; i < n; i++) {
            var wd = akza_word(ctx, units[i], { font: font, size: size, color: i === acc % n ? accC : sc.fg, x: al === 'left' ? x0 : W / 2, y: Yf + (i + 0.5) * lead * size, align: al, track: 0.02,
                mi: akza_mi(ctx, ts[i]), H: HD, I: i, use: 'p' });
            // nothing shows below the slot while the sheet is being fed (a mask fixed in comp space)
            try {
                var mk = jzMaskRect(wd.L, -W * 3, -H * 3, W * 3, H * 3);
                jzSetExpr(mk.property('ADBE Mask Shape'), HD + 'var y1=time>TE+0.5?H*4:SLOT,a=fromComp([-W,-H]),b=fromComp([W*2,-H]),c=fromComp([W*2,y1]),d=fromComp([-W,y1]);createPath([[a[0],a[1]],[b[0],b[1]],[c[0],c[1]],[d[0],d[1]]],[],[],true)');
            } catch (e) { jzWarn('kzLineFeed mask: ' + e.toString()); }
            Ls.push(wd);
        }
        if (jzP(ctx, 'paper', false)) {
            var Pp = akza_shape(ctx, 'kz feed paper'), g = jzGrp(Pp, 'paper');
            akza_px(g, HD + 'var y=YY(time),yb=Math.min(SLOT,y+BH+PAD*0.5);createPath([[X0-PAD,y-PAD*0.5],[X0+BW+PAD,y-PAD*0.5],[X0+BW+PAD,yb],[X0-PAD,yb]],[],[],true)', true);
            jzAddFill(g, sc.dim);
            akza_op(Pp, HD + '30*K');
            Pp.moveToEnd();
        }
        // the slot and its busy lamp
        var Sl = jzNoGhost(jzRectLayer(ctx, 'kz feed slot', W / 2, slotY + sh / 2, sw, sh, subC, { round: sh / 2 }));
        jzSetExpr(jzXf(Sl, 'ADBE Scale'), HD + '[oe(time/0.3)*100,100]');
        akza_op(Sl, HD + '(1-GE(time))*K*100');
        var Ld = akza_shape(ctx, 'kz feed lamp', W / 2 + sw / 2 - sh * 1.6, slotY + sh / 2), g2 = jzGrp(Ld, 'lamp');
        jzAddEllipse(g2, sh * 0.56, sh * 0.56);
        var fl = jzAddFill(g2, accC);
        jzSetExpr(fl.property('ADBE Vector Fill Color'), HD + 'var k=cix(TS,time);(k>=0&&time-TS[k]<0.3&&Math.floor(time*12)%2)?' + akza_cx(sc.bg) + ':' + akza_cx(accC));
        jzSetExpr(jzXf(Ld, 'ADBE Position'), HD + '[W/2+SW*oe(time/0.3)/2-SH*1.6,value[1]]');
        akza_op(Ld, HD + '(1-GE(time))*K*oe(time/0.3)*100');
        return { x0: x0, x1: x0 + bw, y0: Yf, y1: Yf + bh, cx: W / 2, cy: H / 2 };
    }
});

/* 14 kzLob — 放物線: every word is lobbed from a corner along a spinning arc and lands in its place with a little bounce */
jzReg('layout', 'kzLob', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), from: rng.pick(['bl', 'br', 'alt']), spin: rng.pick([180, 270, 360]), trail: rng.chance(0.8), acc: rng.int(0, 5) }; },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, j;
        var font = akza_font(ctx), units = akza_wu(ctx, 5, 6), n = units.length, ts = akza_onsets(c, n, 0.48, 0.42);
        var F = akza_flow(ctx, units, font, W * 0.82, H * (port ? 0.5 : 0.46), { maxLines: akza_tall(ctx) ? 4 : 3, maxSize: H * (port ? 0.12 : 0.19), lead: 1.3 });
        var size = F.size, d = 0.42, cx = W / 2, cy = H * 0.47, Ly = H * 0.98, accC = akza_acc(sc), subC = akza_sub(sc), from = jzP(ctx, 'from', 'bl'), acc = jzP(ctx, 'acc', 0);
        var TX = [], TY = [], LX = [], HP = [], SDD = [];
        for (i = 0; i < n; i++) {
            var sd = from === 'bl' ? -1 : (from === 'br' ? 1 : (i % 2 ? 1 : -1));
            SDD.push(sd); LX.push(W * (sd < 0 ? 0.05 : 0.95)); TX.push(cx + F.pos[i].x); TY.push(cy + F.pos[i].y); HP.push(Math.max(H * 0.2, (Ly - TY[i]) * 0.55));
        }
        var HD = akza_H(ctx, { TS: ts, TX: TX, TY: TY, LX: LX, LYB: Ly, HP: HP, SDD: SDD, SPN: jzP(ctx, 'spin', 270), DD: d, SZ: size, UU: u },
            'function PT(I,q){return [lrp(LX[I],TX[I],q),lrp(LYB,TY[I],q)-HP[I]*4*q*(1-q)];}' +
            'function U(I,t){var tau=t-TS[I],q=cl(tau/DD),p=PT(I,q),t2=tau-DD,z=lrp(0.3,1,oq(q));' +
            'return [p[0],p[1]+(t2>0?SZ*0.14*pls(t2,9,21):0),z,z,-SDD[I]*SPN*(1-oc(q))+(t2>0?SDD[I]*5*pls(t2,8,17):0),1];}');
        var Ls = [], S = akza_shape(ctx, 'kz lob marks'), trail = jzP(ctx, 'trail', false), dr = Math.max(2 * ctx.u, u * 0.0045) * 2, g;
        for (i = 0; i < n; i++) {
            Ls.push(akza_word(ctx, units[i], { font: font, size: size, color: i === acc % n ? accC : sc.fg, x: TX[i], y: TY[i], mi: akza_mi(ctx, ts[i]), H: HD, I: i }));
            // dotted trail along the arc, fading behind the word
            if (trail) for (j = 1; j <= 11; j++) {
                var qq = j / 12;
                g = jzGrp(S, 'trail ' + i + '.' + j);
                jzAddEllipse(g, dr, dr, jzLerp(LX[i], TX[i], qq), jzLerp(Ly, TY[i], qq) - HP[i] * 4 * qq * (1 - qq)); jzAddFill(g, subC);
                akza_gop(g, HD + 'var tau=time-TS[' + i + ']-' + jzN(qq * d) + ';tau<0?0:60*(1-cl(tau/0.55))*K');
            }
            // launch ring at the corner
            g = jzGrp(S, 'launch ' + i);
            var el = jzAddEllipse(g, u * 0.03, u * 0.03, LX[i], Ly);
            jzSetExpr(el.property('ADBE Vector Ellipse Size'), HD + 'var s=UU*(0.015+0.06*oe((time-TS[' + i + '])/0.3))*2;[s,s]');
            jzAddStroke(g, accC, Math.max(2 * ctx.u, u * 0.004));
            akza_gop(g, HD + 'var tau=time-TS[' + i + '];(tau>=0&&tau<0.3)?(1-tau/0.3)*K*100:0');
        }
        return akza_bbL(Ls);
    }
});

/* 15 kzInchworm — 尺取り歩き: the line crawls into place like an inchworm: it bunches up into an arch, then stretches forward */
jzReg('layout', 'kzInchworm', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), cyc: rng.pick([2, 3, 3]), dir: rng.pick([1, 1, -1]), acc: rng.int(0, 5), track: rng.chance(0.6) }; },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, li;
        var font = akza_font(ctx), lat = jzHasLatin(c.text), units = akza_wu(ctx, 5, 6);
        var gm = !lat && units.length < 3 && akza_gc(c.text) <= 8;        // short lyric: the glyphs are the segments
        if (gm) units = jzChars(jzStrip(c.text));
        var n = units.length;
        var F = akza_flow(ctx, units, font, W * 0.74, H * (port ? 0.5 : 0.4), { maxLines: gm ? 1 : (akza_tall(ctx) ? 4 : 2), sp: lat ? 0.55 : (gm ? 0.26 : 0.4), maxSize: H * (port ? 0.11 : 0.17), lead: 1.7 });
        var size = F.size, T = jzClamp(c.dur * 0.5, 0.5, 1.5), cx = W / 2, cy = H / 2, accC = akza_acc(sc), subC = akza_sub(sc), acc = jzP(ctx, 'acc', 0), pdir = jzP(ctx, 'dir', 1);
        var GS = [], SO = [], LF = [], RT = [], LY = [];
        for (li = 0; li < F.pt.length; li++) {
            var a = F.pt[li][0], b = F.pt[li][1], dir = (li % 2 ? -1 : 1) * pdir, m = b - a, gaps = [], S = 0, acc2;
            for (i = a; i < b - 1; i++) { var gp = F.pos[i + 1].x - F.pos[i + 1].w / 2 - F.pos[i].x - F.pos[i].w / 2; gaps.push(gp); S += gp * (1 - 0.08); }
            if (m === 1) S = size * 0.6;
            // bunched up, a word sits closer to the leading end by the gaps between them: GS = that shift at full squeeze
            for (i = a; i < b; i++) {
                acc2 = 0;
                if (dir > 0) { for (var j = i; j < b - 1; j++) acc2 += gaps[j - a]; } else { for (var j2 = a; j2 < i; j2++) acc2 -= gaps[j2 - a]; }
                var s = m > 1 ? (i - a) / (m - 1) : 0.5;
                GS[i] = acc2; SO[i] = -dir * S; LY[i] = cy + F.pos[a].y;
                LF[i] = m > 1 ? Math.sin(Math.PI * (0.12 + 0.76 * s)) : -1;
                RT[i] = m > 1 ? -16 * Math.cos(Math.PI * s) : 0;
            }
        }
        var HD = akza_H(ctx, { PX: akza_pl(F.pos, 'x'), GS: GS, SO: SO, LF: LF, RT: RT, LY: LY, TT: T, CYC: jzP(ctx, 'cyc', 3), CMIN: 0.08, SZ: size, CX: cx },
            'function U(I,t){var ph=cl(t/TT)*CYC,cy=Math.min(CYC-1,Math.floor(ph)),fr=t>=TT?1:ph-cy,cc=fr<0.5?lrp(1,CMIN,ios(fr/0.5)):lrp(CMIN,1,ios((fr-0.5)/0.5)),pf=fr<0.5?0:ios((fr-0.5)/0.5),' +
            'ar=(1-cc)/(1-CMIN),off=t>=TT?0:SO[I]*(CYC-cy-pf);return [CX+PX[I]+off+(1-cc)*GS[I],LY[I]-SZ*0.42*ar*(LF[I]<0?Math.sin(Math.PI*fr):LF[I]),1,1,RT[I]*ar,1];}');
        var Ls = [];
        for (i = 0; i < n; i++) {
            Ls.push(akza_word(ctx, units[i], { font: font, size: size, color: i === acc % n ? accC : sc.fg, x: cx + F.pos[i].x, y: LY[i], mi: i, H: HD, I: i, use: 'pr' }));
        }
        if (jzP(ctx, 'track', false)) {
            var Tk = akza_shape(ctx, 'kz crawl track');
            for (li = 0; li < F.pt.length; li++) {
                akza_line(Tk, 'track ' + li, HD + 'var e=oe(time/0.4),y=' + jzN(LY[F.pt[li][0]] + size * 0.64) + ',hw=' + jzN(F.w / 2) + ';createPath([[CX-hw*e-SZ*0.3,y],[CX+hw*e+SZ*0.3,y]],[],[],false)',
                    subC, Math.max(1.5 * ctx.u, u * 0.003), 70);
            }
            akza_op(Tk, HD + 'K*100');
        }
        return akza_bbL(Ls);
    }
});

/* ================================================================================================ DECOR */
// decor.build(ctx, bb, d): layers live in the content comp (time 0 = cut start); the lyric's box is the resting one. Every entry
// is main-pass line work in the browser (ghost off) -> jzNoGhost. o = fade in × fade with the cut's exit (browser dIO).
function akza_dbb(ctx, bb) { return bb || { x0: ctx.W * 0.35, x1: ctx.W * 0.65, y0: ctx.H * 0.4, y1: ctx.H * 0.6 }; }
// word clock of a cut (same rule as the browser's wordTimes; no beat grid in AE)
function akza_wt(cut) {
    var n = Math.max(1, Math.min(6, (cut.words || []).length || 1)), dur = cut.dur || 2, i, t = [];
    if (n < 2 && dur > 1.2) n = 2;
    var last = Math.max(0, Math.min(dur * 0.5, (n - 1) * 0.38));
    for (i = 0; i < n; i++) t.push(n > 1 ? last * i / (n - 1) : 0);
    return t;
}
function akza_vert(bb) { return (bb.y1 - bb.y0) > (bb.x1 - bb.x0) * 1.3; }
// reading axis of the lyric box on the chosen side (s = -1 above / right of vertical text, +1 below / left): P0 -> P1 run along
// the reading direction on the box edge, nrm points away from the box
function akza_axis(ctx, bb, pref) {
    var v = akza_vert(bb), W = ctx.W, H = ctx.H, u = jzU(ctx), roomA = v ? W - bb.x1 : bb.y0, roomB = v ? bb.x0 : H - bb.y1, s = pref;
    if ((s < 0 ? roomA : roomB) < u * 0.13 && (s < 0 ? roomB : roomA) > (s < 0 ? roomA : roomB)) s = -s;
    var e = v ? (s < 0 ? bb.x1 : bb.x0) : (s < 0 ? bb.y0 : bb.y1);
    return { v: v, s: s, room: s < 0 ? roomA : roomB, len: v ? bb.y1 - bb.y0 : bb.x1 - bb.x0, nrm: v ? [s < 0 ? 1 : -1, 0] : [0, s < 0 ? -1 : 1], dirv: v ? [0, 1] : [1, 0],
        P0: v ? [e, bb.y0] : [bb.x0, e], P1: v ? [e, bb.y1] : [bb.x1, e] };
}
function akza_at(A, t, d) { return [A.P0[0] + (A.P1[0] - A.P0[0]) * t + A.nrm[0] * d, A.P0[1] + (A.P1[1] - A.P0[1]) * t + A.nrm[1] * d]; }
var AKZA_AT = 'function AT(f,d){return [AP0[0]+(AP1[0]-AP0[0])*f+ANR[0]*d,AP0[1]+(AP1[1]-AP0[1])*f+ANR[1]*d];}';
// dashed stroke (AE starts with an empty Dashes group; each entry is added AND set before the next one is added)
function akza_dashP(D, mn, v) {
    var p = null;
    try { p = D.addProperty(mn); } catch (e) { p = null; }
    if (!p) { try { p = D.property(mn); } catch (e2) { p = null; } }
    if (p && v != null) p.setValue(v);
    return p;
}

/* 1 kzImpactTicks — 着地の火花: a fan of ticks kicks out from under each word as it lands */
jzReg('decor', 'kzImpactTicks', { back: false, build: function (ctx, bb0, d) {
    var bb = akza_dbb(ctx, bb0), sc = ctx.sc, u = jzU(ctx), ts = akza_wt(ctx.cut), n = ts.length, A = akza_axis(ctx, bb, d.low ? -1 : 1), col = akza_acc(sc), N = 5 + (d.n | 0), sd = d.seed | 0;
    var lw = Math.max(2 * ctx.u, u * 0.0065), base = Math.atan2(A.nrm[1], A.nrm[0]) * 180 / Math.PI, HD = akza_H(ctx, { TS: ts, UU: u }, 'var o=oc(time/0.1)*K;'), S = akza_shape(ctx, 'kz impact ticks'), j, m, g, X;
    for (j = 0; j < n; j++) {
        var c0 = akza_at(A, (j + 0.5) / n, u * 0.02), Q = 'var tau=time-TS[' + j + ']-0.04,q=tau/0.5,e=oe(q),on=tau>=0&&tau<=0.5;';
        for (m = 0; m < N; m++) {
            var a = base + jzLerp(-72, 72, (m + 0.5) / N) + akza_rs(sd, j, m) * 7, ar = a * Math.PI / 180;
            g = jzGrp(S, 'tick ' + j + '.' + m);
            jzAddRect(g, 1, lw, 0, 0.5, 0); jzAddFill(g, col);
            X = jzGX(g);
            X.property('ADBE Vector Rotation').setValue(a);
            jzSetExpr(X.property('ADBE Vector Position'), HD + Q + 'var r0=UU*(0.016+' + jzN(0.065 + 0.04 * akza_r(sd, m, j, 2)) + '*e);[' + jzN(c0[0]) + '+' + jzN(Math.cos(ar)) + '*r0,' + jzN(c0[1]) + '+' + jzN(Math.sin(ar)) + '*r0]');
            jzSetExpr(X.property('ADBE Vector Scale'), HD + Q + '[Math.max(0,UU*0.06*(1-q)*' + jzN(0.6 + 0.6 * akza_r(sd, m, j, 3)) + ')*100,100]');
            jzSetExpr(X.property('ADBE Vector Group Opacity'), HD + Q + 'on?(1-q*q)*o*100:0');
        }
        // the ground line under the word
        g = jzGrp(S, 'ground ' + j);
        jzAddRect(g, 1, lw); jzAddFill(g, col);
        X = jzGX(g);
        X.property('ADBE Vector Position').setValue(c0);
        if (A.v) X.property('ADBE Vector Rotation').setValue(90);
        jzSetExpr(X.property('ADBE Vector Scale'), HD + Q + '[UU*0.14*e*100,100]');
        jzSetExpr(X.property('ADBE Vector Group Opacity'), HD + Q + 'on?(1-q)*o*100:0');
    }
} });

/* 2 kzBounceDot — 読み玉: a ball hops along the lyric, landing on each word on its beat and leaving a mark */
jzReg('decor', 'kzBounceDot', { back: false, build: function (ctx, bb0, d) {
    var bb = akza_dbb(ctx, bb0), sc = ctx.sc, u = jzU(ctx), ts = akza_wt(ctx.cut), n = ts.length, A = akza_axis(ctx, bb, d.low ? 1 : -1), col = akza_acc(sc), sub = akza_sub(sc), j;
    var r = u * 0.019, gap = u * 0.024, hopH = Math.min(u * 0.075, Math.max(u * 0.02, A.room - gap - r * 3));
    // BK(t) = the word the ball is on or hopping to (it takes off a little before that word's onset)
    var HD = akza_H(ctx, { TS: ts, NU: n, AP0: A.P0, AP1: A.P1, ANR: A.nrm, HH: hopH, GAP: gap, RB: r, VV: A.v, UU: u },
        AKZA_AT + 'function BK(t){var k=0;for(var j=0;j<NU;j++)if(t>=TS[j]-Math.min(0.3,j?(TS[j]-TS[j-1])*0.8:0.3))k=j;return k;}var o=oc(time/0.15)*K;');
    var Mk = akza_shape(ctx, 'kz ball marks'), lwm = Math.max(2 * ctx.u, u * 0.004);
    for (j = 0; j < n; j++) {
        var g = jzGrp(Mk, 'mark ' + j);
        jzAddRect(g, 1, lwm);
        var fl = jzAddFill(g, sub);
        jzSetExpr(fl.property('ADBE Vector Fill Color'), HD + 'BK(time)===' + j + '?' + akza_cx(col) + ':' + akza_cx(sub));
        var X = jzGX(g);
        X.property('ADBE Vector Position').setValue(akza_at(A, (j + 0.5) / n, gap * 0.45));
        if (A.v) X.property('ADBE Vector Rotation').setValue(90);
        jzSetExpr(X.property('ADBE Vector Scale'), HD + 'var tj=time-TS[' + j + '];[tj<0?0:UU*0.032*ob(tj/0.2,2.5)*100,100]');
        jzSetExpr(X.property('ADBE Vector Group Opacity'), HD + '(BK(time)===' + j + '?1:0.6)*o*100');
    }
    var p0 = akza_at(A, 0.5 / n, gap + r), B = akza_shape(ctx, 'kz ball', p0[0], p0[1]), gb = jzGrp(B, 'ball');
    jzAddEllipse(gb, r * 2, r * 2); jzAddFill(gb, col);
    var BL = HD + 'var k=BK(time),hd=Math.max(0.01,k?Math.min(0.3,(TS[k]-TS[k-1])*0.8):0.22),q=cl((time-(TS[k]-hd))/hd),t0=k?(k-0.5)/NU:0.5/NU,t1=(k+0.5)/NU,' +
        'h=k?HH*4*q*(1-q):HH*2.4*(1-q)*(1-q),tl=time-TS[k];if(q>=1&&k===NU-1)h=HH*0.45*Math.abs(Math.sin(tl*6.5))*Math.exp(-tl*1.3);' +
        'var sq=q>=1?0.35*Math.exp(-Math.max(0,tl)*14):0,p=AT(lrp(t0,t1,k?q:1),GAP+RB+h);';
    jzSetExpr(jzXf(B, 'ADBE Position'), BL + '[p[0]-ANR[0]*RB*sq,p[1]-ANR[1]*RB*sq]');
    jzSetExpr(jzXf(B, 'ADBE Scale'), BL + 'VV?[(1-sq)*100,(1+sq*0.7)*100]:[(1+sq*0.7)*100,(1-sq)*100]');
    akza_op(B, HD + 'o*100');
} });

/* 3 kzUnderRun — 走る下線: an underline shoots forward one word at a time, arrow first, overshooting each stop */
jzReg('decor', 'kzUnderRun', { back: false, build: function (ctx, bb0, d) {
    var bb = akza_dbb(ctx, bb0), sc = ctx.sc, u = jzU(ctx), ts = akza_wt(ctx.cut), n = ts.length, A = akza_axis(ctx, bb, d.low ? -1 : 1), col = akza_acc(sc), sub = akza_sub(sc), j, g;
    var dd = u * 0.035, lw = Math.max(3 * ctx.u, u * 0.007), thin = Math.max(1.5 * ctx.u, u * 0.002), ah = u * 0.018, p0 = akza_at(A, 0, dd), pe = akza_at(A, 1, dd);
    var HD = akza_H(ctx, { TS: ts, NU: n, AP0: A.P0, AP1: A.P1, ANR: A.nrm, DD: dd },
        AKZA_AT + 'var o=oc(time/0.25)*K,k=Math.max(0,cix(TS,time)),f=lrp(k/NU,(k+1)/NU,spr(time-TS[k],9,15)),p1=AT(Math.max(0,Math.min(1.03,f)),DD);');
    var S = akza_shape(ctx, 'kz running underline');
    // arrow head, the run so far, the word stops and the whole track (top to bottom)
    g = jzGrp(S, 'head');
    jzAddPath(g, [[A.dirv[0] * ah * 1.3, A.dirv[1] * ah * 1.3], [A.nrm[0] * ah * 0.8, A.nrm[1] * ah * 0.8], [-A.nrm[0] * ah * 0.8, -A.nrm[1] * ah * 0.8]], true); jzAddFill(g, col);
    jzSetExpr(jzGX(g).property('ADBE Vector Position'), HD + '[p1[0],p1[1]]');
    akza_line(S, 'run', HD + 'createPath([[' + jzN(p0[0]) + ',' + jzN(p0[1]) + '],[p1[0],p1[1]]],[],[],false)', col, lw);
    if (n > 1) {
        g = jzGrp(S, 'stops');
        for (j = 1; j < n; j++) { var q = akza_at(A, j / n, dd); jzAddPath(g, [[q[0] - A.nrm[0] * ah * 0.4, q[1] - A.nrm[1] * ah * 0.4], [q[0] + A.nrm[0] * ah * 0.4, q[1] + A.nrm[1] * ah * 0.4]], false); }
        jzAddStroke(g, sub, thin, 60);
    }
    g = jzGrp(S, 'track');
    jzAddPath(g, [p0, pe], false); jzAddStroke(g, sub, thin, 45);
    akza_op(S, HD + 'o*100');
} });

/* 4 kzWobbleArcs — 揺れマーク: cartoon shake marks: nested arcs at both ends of the lyric jump outwards on every word */
jzReg('decor', 'kzWobbleArcs', { back: false, build: function (ctx, bb0, d) {
    var bb = akza_dbb(ctx, bb0), sc = ctx.sc, W = ctx.W, H = ctx.H, u = jzU(ctx), ts = akza_wt(ctx.cut), col = d.accent ? akza_acc(sc) : akza_sub(sc), m, s;
    var v = akza_vert(bb), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, span = v ? bb.x1 - bb.x0 : bb.y1 - bb.y0, R = Math.max(u * 0.13, span * 0.85), N = 2 + Math.min(2, d.n | 0);
    var HD = akza_H(ctx, { TS: ts, UU: u, RA: R, VV: v, BCX: cx, BCY: cy }, 'var o=oc(time/0.2)*K,k=Math.max(0,cix(TS,time)),tau=time-TS[k];');
    var S = akza_shape(ctx, 'kz wobble arcs');
    for (m = 0; m < N; m++) for (s = -1; s <= 1; s += 2) {
        // each arc is a slice of a big circle centred inside the lyric; e = the box edge it sits beyond, a0 = the direction it faces
        var e = v ? (s < 0 ? bb.y0 : bb.y1) : (s < 0 ? bb.x0 : bb.x1), a0 = v ? 90 * s : (s < 0 ? 180 : 0);
        var M = 'var kick=Math.exp(-Math.max(0,tau-' + jzN(m * 0.04) + ')*6),dd=UU*' + jzN(0.034 + 0.036 * m) + '+UU*0.04*kick*(tau>=' + jzN(m * 0.04) + '?1:0),half=' + jzN(30 - m * 5) + '*(0.75+0.25*kick),' +
            'pe=' + jzN(e) + '+(' + s + ')*dd,vis=pe>=' + jzN((v ? H : W) * 0.02) + '&&pe<=' + jzN((v ? H : W) * 0.98) + ';';
        var g = akza_line(S, 'arc ' + m + (s < 0 ? 'a' : 'b'), HD + M + 'posterizeTime(12);seedRandom(' + ((d.seed | 0) % 9973 + m * 31) + '+Math.floor(time*12)*7,true);var wob=random(-1,1)*2.5*kick,p=[],' +
            'ox=VV?BCX:pe-(' + s + ')*RA,oy=VV?pe-(' + s + ')*RA:BCY;for(var i=0;i<=10;i++){var an=(' + a0 + '-half+wob+2*half*i/10)*0.0174533;p.push([ox+Math.cos(an)*RA,oy+Math.sin(an)*RA]);}createPath(p,[],[],false)',
            col, Math.max(2.5 * ctx.u, u * (0.009 - m * 0.002)));
        akza_gop(g, HD + M + 'vis?(0.4+0.6*kick)*o*' + jzN(1 - m * 0.18) + '*100:0');
    }
} });

/* 5 kzMarchFrame — 行進する破線: a dashed frame whose dashes march round the lyric and lurch forward with every word */
jzReg('decor', 'kzMarchFrame', { back: false, build: function (ctx, bb0, d) {
    var bb = akza_dbb(ctx, bb0), sc = ctx.sc, W = ctx.W, H = ctx.H, u = jzU(ctx), ts = akza_wt(ctx.cut), pad = u * 0.045, dash = u * 0.022, k;
    var fx0 = Math.max(W * 0.025, bb.x0 - pad), fy0 = Math.max(H * 0.025, bb.y0 - pad), fx1 = Math.min(W * 0.975, bb.x1 + pad), fy1 = Math.min(H * 0.975, bb.y1 + pad);
    var r = Math.max(0, Math.min(u * 0.02, (fx1 - fx0) / 2, (fy1 - fy0) / 2));
    // the frame settles inwards over the first 0.4 s; ph = how far the dashes have marched (px along the frame)
    var HD = akza_H(ctx, { TS: ts, UU: u, PADD: pad, BX0: bb.x0, BY0: bb.y0, BX1: bb.x1, BY1: bb.y1, DSH: dash, DIRR: d.right ? -1 : 1 },
        'var o=oc(time/0.3)*K,e=oe(time/0.4),pd=PADD*(2-e),x0=Math.max(W*0.025,BX0-pd),y0=Math.max(H*0.025,BY0-pd),x1=Math.min(W*0.975,BX1+pd),y1=Math.min(H*0.975,BY1+pd),' +
        'ww=Math.max(1,x1-x0),hh=Math.max(1,y1-y0),LL=2*(ww+hh),ph=time*UU*0.02;for(var i=0;i<TS.length;i++)if(time>TS[i])ph+=DSH*5*(1-Math.exp(-(time-TS[i])*5));ph*=DIRR;');
    var S = akza_shape(ctx, 'kz marching frame');
    for (k = 0; k < 2; k++) {
        var g = jzGrp(S, k ? 'dashes' : 'runner'), rc = jzVecs(g).addProperty('ADBE Vector Shape - Rect');
        rc.property('ADBE Vector Rect Size').setValue([fx1 - fx0, fy1 - fy0]);
        rc.property('ADBE Vector Rect Position').setValue([(fx0 + fx1) / 2, (fy0 + fy1) / 2]);
        rc.property('ADBE Vector Rect Roundness').setValue(r);
        jzSetExpr(rc.property('ADBE Vector Rect Size'), HD + '[ww,hh]');
        jzSetExpr(rc.property('ADBE Vector Rect Position'), HD + '[(x0+x1)/2,(y0+y1)/2]');
        if (!k) {
            // one long accent dash runs with them at twice the pace (Trim Paths: a fixed length that travels round the frame)
            jzAddStroke(g, akza_acc(sc), Math.max(3 * ctx.u, u * 0.007));
            var tr = jzVecs(g).addProperty('ADBE Vector Filter - Trim');
            jzSetExpr(tr.property('ADBE Vector Trim End'), HD + 'Math.min(100,DSH*3/LL*100)');
            jzSetExpr(tr.property('ADBE Vector Trim Offset'), HD + 'ph*2/LL*360');
        } else {
            var st = jzAddStroke(g, akza_sub(sc), Math.max(2 * ctx.u, u * 0.004), 80), D = st.property('ADBE Vector Stroke Dashes');
            akza_dashP(D, 'ADBE Vector Stroke Dash 1', dash);
            akza_dashP(D, 'ADBE Vector Stroke Gap 1', dash);
            var of = akza_dashP(D, 'ADBE Vector Stroke Offset', null);
            if (of) jzSetExpr(of, HD + '-ph');
        }
    }
    akza_op(S, HD + 'o*100');
} });

/* 6 kzMetronome — 拍の針: a small metronome in a corner; its arm swings across once for every word */
// corner placement that keeps clear of the lyric box: the centre of a w × h spot, or null
function akza_corner(ctx, bb, w, h, d) {
    var W = ctx.W, H = ctx.H, mx = W * 0.05, my = H * 0.05, cand = [[!!d.right, !!d.low], [!d.right, !!d.low], [!!d.right, !d.low], [!d.right, !d.low]], i;
    for (i = 0; i < 4; i++) {
        var x = cand[i][0] ? W - mx - w / 2 : mx + w / 2, y = cand[i][1] ? H - my - h / 2 : my + h / 2;
        if (x + w / 2 < bb.x0 || x - w / 2 > bb.x1 || y + h / 2 < bb.y0 || y - h / 2 > bb.y1) return [x, y];
    }
    return null;
}
jzReg('decor', 'kzMetronome', { back: false, build: function (ctx, bb0, d) {
    var bb = akza_dbb(ctx, bb0), sc = ctx.sc, u = jzU(ctx), Lr = u * 0.18, sp = akza_corner(ctx, bb, Lr * 1.5, Lr * 1.2, d), m, i;
    if (!sp) return;
    var ts = akza_wt(ctx.cut), A0 = 30, sub = akza_sub(sc), col = akza_acc(sc), lw = Math.max(2.5 * ctx.u, u * 0.006), thin = Math.max(1.5 * ctx.u, u * 0.0025), DG = Math.PI / 180;
    var HD = akza_H(ctx, { TS: ts }, 'var o=oc(time/0.3)*K;function tg(j){return (j%2?1:-1)*' + A0 + ';}');
    var S = akza_shape(ctx, 'kz metronome', sp[0], sp[1] + Lr * 0.5), g;
    g = jzGrp(S, 'pivot');
    jzAddEllipse(g, u * 0.014, u * 0.014); jzAddFill(g, sc.fg);
    // the arm with its weight: swings to the other side on every word and rings a little
    g = jzGrp(S, 'weight');
    jzAddEllipse(g, u * 0.036, u * 0.036, 0, -Lr * 0.9 * 0.62); jzAddFill(g, col);
    var AR = HD + 'var k=Math.max(0,cix(TS,time)),tau=time-TS[k];k===0?tg(0)*ob(time/0.3,1.6):lrp(tg(k-1),tg(k),ioc(tau/0.2))+(tau>0.2?tg(k)*0.12*pls(tau-0.2,7,22):0)';
    jzSetExpr(jzGX(g).property('ADBE Vector Rotation'), AR);
    g = jzGrp(S, 'arm');
    jzAddPath(g, [[0, 0], [0, -Lr * 0.9]], false); jzAddStroke(g, sc.fg, lw);
    jzSetExpr(jzGX(g).property('ADBE Vector Rotation'), AR);
    g = jzGrp(S, 'base');
    jzAddPath(g, [[-Lr * 0.3, u * 0.012], [Lr * 0.3, u * 0.012]], false); jzAddStroke(g, sub, lw, 80);
    g = jzGrp(S, 'dial');
    var arc = [];
    for (i = 0; i <= 16; i++) { var an = (-90 - A0 - 4 + (2 * A0 + 8) * i / 16) * DG; arc.push([Math.cos(an) * Lr, Math.sin(an) * Lr]); }
    jzAddPath(g, arc, false);
    for (m = -2; m <= 2; m++) { var a = (-90 + m * A0 / 2) * DG, r0 = Lr * (m % 2 ? 0.95 : 0.9); jzAddPath(g, [[Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(a) * Lr, Math.sin(a) * Lr]], false); }
    jzAddStroke(g, sub, thin, 70);
    jzSetExpr(jzXf(S, 'ADBE Scale'), HD + 'var e=oe(time/0.35);[e*100,e*100]');
    akza_op(S, HD + 'o*100');
} });

/* 7 kzSpringCoils — ばね支え: coil springs brace the lyric against the frame edges; they stretch with it and jiggle on every word */
jzReg('decor', 'kzSpringCoils', { back: false, build: function (ctx, bb0, d) {
    var bb = akza_dbb(ctx, bb0), sc = ctx.sc, W = ctx.W, H = ctx.H, u = jzU(ctx), ts = akza_wt(ctx.cut), sub = akza_sub(sc), col = akza_acc(sc), horiz = akza_vert(bb), s;
    var gap = u * 0.03, lw = Math.max(2 * ctx.u, u * 0.004), N = 7 + 2 * Math.min(2, d.n | 0), amp = u * 0.022, ph = u * 0.035;
    var c = horiz ? jzClamp((bb.y0 + bb.y1) / 2, H * 0.08, H * 0.92) : jzClamp((bb.x0 + bb.x1) / 2, W * 0.08, W * 0.92);
    for (s = -1; s <= 1; s += 2) {
        var wall = horiz ? (s < 0 ? W * 0.03 : W * 0.97) : (s < 0 ? H * 0.03 : H * 0.97), inner0 = (horiz ? (s < 0 ? bb.x0 : bb.x1) : (s < 0 ? bb.y0 : bb.y1)) + s * gap;
        if ((inner0 - wall) * -s < u * 0.04) continue;
        var HD = akza_H(ctx, { TS: ts, UU: u, WALL: wall, IN0: inner0, CC: c, NN: N, AMP: amp, HZ: horiz, PH: ph },
            'var o=oc(time/0.3)*K,k=Math.max(0,cix(TS,time)),inn=lrp(WALL,IN0,oe(time/0.4))-UU*0.018*pls(time-TS[k],6,26),LL=inn-WALL;function PT(a,b){return HZ?[a,b]:[b,a];}');
        var S = akza_shape(ctx, 'kz spring ' + (s < 0 ? 'a' : 'b'));
        akza_line(S, 'plate', HD + 'createPath([PT(inn,CC-PH),PT(inn,CC+PH)],[],[],false)', col, lw * 1.6);
        akza_line(S, 'coil', HD + 'var p=[PT(WALL,CC),PT(WALL+LL*0.06,CC)],am=AMP*Math.max(0.7,Math.min(1.5,UU*0.3/Math.max(1,Math.abs(LL))+0.5));' +
            'for(var m=0;m<NN;m++)p.push(PT(WALL+LL*(0.08+0.84*(m+0.5)/NN),CC+(m%2?1:-1)*am));p.push(PT(WALL+LL*0.94,CC));p.push(PT(inn,CC));createPath(p,[],[],false)', sub, lw, 90);
        var g = jzGrp(S, 'wall');
        jzAddPath(g, horiz ? [[wall, c - ph * 1.3], [wall, c + ph * 1.3]] : [[c - ph * 1.3, wall], [c + ph * 1.3, wall]], false); jzAddStroke(g, sub, lw * 1.6, 90);
        akza_op(S, HD + '(inn-WALL)*' + (-s) + '<UU*0.04?0:o*100');
    }
} });

/* 8 kzChevronRun — 流れる山形: a lane of chevrons marches in the reading direction; a bright patch keeps pace with the current word */
jzReg('decor', 'kzChevronRun', { back: false, build: function (ctx, bb0, d) {
    var bb = akza_dbb(ctx, bb0), sc = ctx.sc, u = jzU(ctx), ts = akza_wt(ctx.cut), n = ts.length, A = akza_axis(ctx, bb, d.low ? -1 : 1), col = akza_acc(sc), sub = akza_sub(sc), m;
    var gs = u * 0.036, M = Math.max(3, Math.min(40, Math.floor(A.len / gs))), sz = u * 0.015, lw = Math.max(2 * ctx.u, u * 0.005), dd = u * 0.05, dx = A.dirv[0], dy = A.dirv[1], nx = A.nrm[0], ny = A.nrm[1];
    // fr = how far the lane has moved on (in chevron spacings); CH(m) -> [alpha, heat] of the chevron in slot m
    var HD = akza_H(ctx, { TS: ts, NU: n, MM: M },
        'var o=oc(time/0.3)*K,k=Math.max(0,cix(TS,time)),ph=time*0.55;for(var i=0;i<NU;i++)if(time>TS[i])ph+=1.2*(1-Math.exp(-(time-TS[i])*6));' +
        'var fr=wr(ph,1),head=(k+0.5)/NU+(k?-(1/NU)*sprg(time-TS[k],8,12):0);' +
        'function CH(m){var t=(m+fr)/MM,ed=cl(Math.min(t,1-t)*7),hot=Math.exp(-Math.pow((t-head)*NU*1.3,2));return [(0.3+0.7*hot)*ed*o,hot];}');
    var S = akza_shape(ctx, 'kz chevron lane');
    for (m = 0; m < M; m++) {
        var p = akza_at(A, m / M, dd), g = jzGrp(S, 'chevron ' + m);
        jzAddPath(g, [[p[0] - dx * sz * 0.6 + nx * sz, p[1] - dy * sz * 0.6 + ny * sz], [p[0] + dx * sz * 0.6, p[1] + dy * sz * 0.6], [p[0] - dx * sz * 0.6 - nx * sz, p[1] - dy * sz * 0.6 - ny * sz]], false);
        var st = jzAddStroke(g, sub, lw);
        jzSetExpr(st.property('ADBE Vector Stroke Color'), HD + 'CH(' + m + ')[1]>0.5?' + akza_cx(col) + ':' + akza_cx(sub));
        akza_gop(g, HD + 'CH(' + m + ')[0]*100');
    }
    jzSetExpr(jzXf(S, 'ADBE Position'), HD + '[' + jzN(dx * A.len / M) + '*fr,' + jzN(dy * A.len / M) + '*fr]');
} });

/* 9 kzWhooshCurls — 巻き風: looping wind curls whip off the lyric each time a word arrives */
jzReg('decor', 'kzWhooshCurls', { back: false, build: function (ctx, bb0, d) {
    var bb = akza_dbb(ctx, bb0), sc = ctx.sc, u = jzU(ctx), ts = akza_wt(ctx.cut), n = ts.length, col = d.accent ? akza_acc(sc) : akza_sub(sc), lw = Math.max(2.5 * ctx.u, u * 0.006), sd = d.seed | 0;
    var ev = [], i, m, t, s, bk = d.right ? 1 : -1;
    for (i = 0; i < n; i++) ev.push([ts[i], i]);
    for (m = 1, t = ts[n - 1] + 0.9; m <= 6 && t < (ctx.cut.dur || 2) - 0.4; m++, t += 0.9) ev.push([t, n + m]);     // keep the air moving after the last word
    var S = akza_shape(ctx, 'kz whoosh curls');
    for (i = 0; i < ev.length; i++) {
        var j = ev[i][1], side = (j + (d.low ? 1 : 0)) % 2 ? 1 : -1, A = akza_axis(ctx, bb, side), late = j >= n;
        var f = late ? akza_r(sd, j, 1) : (j + 0.5) / n, o0 = akza_at(A, f, u * 0.035), sc0 = u * (0.032 + 0.012 * akza_r(sd, j, 2)) * (late ? 0.8 : 1), pts = [];
        // prolate cycloid = a streak with one loop in it; it runs backwards against the reading direction
        for (s = 0; s <= 40; s++) {
            var th = jzLerp(-1.4, 7.7, s / 40), a = th - 1.9 * Math.sin(th), b = 1 - 1.9 * Math.cos(th) + 0.9;
            pts.push([o0[0] + (A.dirv[0] * a * bk + A.nrm[0] * b * 0.55) * sc0, o0[1] + (A.dirv[1] * a * bk + A.nrm[1] * b * 0.55) * sc0]);
        }
        var HD = akza_H(ctx, { PTS: pts, DX: A.dirv[0] * bk * sc0 * 2, DY: A.dirv[1] * bk * sc0 * 2 },
            'var o=oc(time/0.1)*K,tau=time-' + jzN(ev[i][0] + 0.03) + ',q=tau/0.8,hd=Math.round(40*oc(q*1.7)),tl=Math.round(40*ic(q*1.25-0.25)),on=tau>=0&&tau<=0.8&&hd-tl>=1;');
        var g = akza_line(S, 'curl ' + i, HD + 'if(hd-tl<1){tl=Math.max(0,hd-1);hd=tl+1;}var p=[];for(var s=tl;s<=hd;s++)p.push([PTS[s][0]+DX*q,PTS[s][1]+DY*q]);createPath(p,[],[],false)', col, lw);
        akza_gop(g, HD + 'on?' + (late ? 55 : 90) + '*o:0');
    }
} });

/* 10 kzPushRods — 押しピストン: piston rods come in from the frame edges and tap the lyric, alternating sides with the words */
jzReg('decor', 'kzPushRods', { back: false, build: function (ctx, bb0, d) {
    var bb = akza_dbb(ctx, bb0), sc = ctx.sc, W = ctx.W, H = ctx.H, u = jzU(ctx), ts = akza_wt(ctx.cut), sub = akza_sub(sc), col = akza_acc(sc), s;
    var horiz = akza_vert(bb) !== !!((d.v | 0) % 2 && Math.min(bb.x0, W - bb.x1) > u * 0.16 && Math.min(bb.y0, H - bb.y1) > u * 0.16);
    var th = Math.max(4 * ctx.u, u * 0.012), rest = u * 0.06, span = horiz ? bb.y1 - bb.y0 : bb.x1 - bb.x0, hp = jzClamp(span * 0.3, u * 0.03, u * 0.09);
    var c = horiz ? jzClamp((bb.y0 + bb.y1) / 2, H * 0.08, H * 0.92) : jzClamp((bb.x0 + bb.x1) / 2, W * 0.08, W * 0.92);
    for (s = -1; s <= 1; s += 2) {
        var edge = horiz ? (s < 0 ? 0 : W) : (s < 0 ? 0 : H), near = (horiz ? (s < 0 ? bb.x0 : bb.x1) : (s < 0 ? bb.y0 : bb.y1)) + s * u * 0.014;
        if ((near + s * rest - edge) * -s < u * 0.03) continue;
        // push = how hard this side is tapping (its own words; the first word taps from both sides)
        var HD = akza_H(ctx, { TS: ts, EDGE: edge, NEAR: near, REST: s * rest, SS: s },
            'var o=oc(time/0.3)*K,push=0;for(var j=0;j<TS.length;j++){if(j&&(j%2?1:-1)!==SS)continue;var tau=time-TS[j]+0.05;if(tau>0)push=Math.max(push,tau<0.05?tau/0.05:Math.exp(-(tau-0.05)*6));}' +
            'var tip=lrp(EDGE,NEAR+REST*(1-push),oe(time/0.4));');
        var S = akza_shape(ctx, 'kz push rod ' + (s < 0 ? 'a' : 'b')), g = jzGrp(S, 'head');
        jzAddRect(g, horiz ? th : hp * 2, horiz ? hp * 2 : th); jzAddFill(g, col);
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), HD + (horiz ? '[tip+(' + jzN(-s * th / 2) + '),' + jzN(c) + ']' : '[' + jzN(c) + ',tip+(' + jzN(-s * th / 2) + ')]'));
        g = jzGrp(S, 'rod');
        jzAddRect(g, horiz ? 1 : th, horiz ? th : 1, 0, horiz ? -s * 0.5 : 0, horiz ? 0 : -s * 0.5); jzAddFill(g, sub, 90);
        jzGX(g).property('ADBE Vector Position').setValue(horiz ? [edge, c] : [c, edge]);
        jzSetExpr(jzGX(g).property('ADBE Vector Scale'), HD + (horiz ? '[Math.abs(tip-EDGE)*100,100]' : '[100,Math.abs(tip-EDGE)*100]'));
        akza_op(S, HD + 'o*100');
    }
} });

/* ================================================================================================ BACKGROUNDS */
// bg.build(b, P): b.comp is the cut's wrapper comp (full frame, time 0 = cut start). T = song time (browser env.t),
// BT = time since this background started (consecutive cuts with the same bg + seed are one run, browser bgT).
function akza_run(b) {
    var c = b.cut, cs = (b.plan && b.plan.cuts) || [], s = c.start || 0, P0 = c.bgP || {}, idx = -1, i;
    for (i = 0; i < cs.length; i++) if (cs[i] === c) { idx = i; break; }
    for (i = idx - 1; i >= 0; i--) {
        var p = cs[i];
        if (p.bg === c.bg && (p.bgP || {}).seed === P0.seed && Math.abs(p.end - s) < 0.06) s = p.start; else break;
    }
    return (c.start || 0) - s;
}
function akza_BH(b, data, code) {
    return JZ_FNS + AKZA_FNS + 'var W=' + jzN(b.W) + ',H=' + jzN(b.H) + ',T=time+' + jzN(b.cut.start || 0) + ',BT=time+' + jzN(akza_run(b)) + ';' + akza_D(data || {}) + (code || '') + '\n';
}
function akza_bpx(b) { return jzU(b) / 1080; }                 // one browser design px in comp px
function akza_al(k) { return jzClamp(k, 0, 1) * 100; }         // alpha 0..1 -> opacity %

/* 1 kzKickStreaks — 加速する筋: streaks in the travel direction that surge at every cut and coast in between */
jzReg('bg', 'kzKickStreaks', {
    plan: function (rng, st) { return { seed: rng.int(1, 1e9), ang: rng.pick([0, 0, 180, -18, 162, 90]), n: rng.int(12, 18), k: rng.range(0.07, 0.1) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, u = jzU(b), n = P.n || 14, k = P.k || 0.06, D = Math.sqrt(W * W + H * H), i;
        // trav = distance travelled (in frame diagonals): steady drift + a kick at every cut; the streaks stretch while the kick lasts
        var HD = akza_BH(b, { DG: D, IDX: (b.cut.index | 0) }, 'var lt=Math.max(0,time),sp=Math.exp(-lt*5),trav=T*0.05+0.3*(IDX+1-sp);');
        var S = jzShapeLayer(b, 'bg kick streaks', W / 2, H / 2);
        for (i = 0; i < n; i++) {
            var dep = 0.5 + akza_r(s, i, 1), len0 = D * (0.08 + 0.2 * akza_r(s, i, 2)), th = Math.max(2 * akza_bpx(b), u * (0.004 + 0.02 * akza_r(s, i, 3) * akza_r(s, i, 6)));
            var g = jzGrp(S, 'streak ' + i);
            jzAddRect(g, 1, th, 0, 0.5, 0);
            jzAddFill(g, i % 6 === 2 ? sc.accent : sc.fg, akza_al(i % 6 === 2 ? k * 1.3 : k * (0.6 + 0.7 * akza_r(s, i, 7))));
            var Q = 'var len=' + jzN(len0) + '*(1+0.8*sp);';
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), HD + Q + '[wr(' + jzN(akza_r(s, i, 4)) + '*(DG+len)+trav*' + jzN(dep) + '*DG,DG+len)-len-DG/2,' + jzN((akza_r(s, i, 5) - 0.5) * D) + ']');
            jzSetExpr(jzGX(g).property('ADBE Vector Scale'), HD + Q + '[len*100,100]');
        }
        jzXf(S, 'ADBE Rotate Z').setValue(P.ang || 0);
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + 'oc(BT/0.6)*100');
    }
});

/* 2 kzRollSquare — 転がる四角: a huge square tumbles corner over corner along the floor */
function akza_roll(b, S, per, d, ph, fillA, accent) {
    var W = b.W, H = b.H, sc = b.sc, u = jzU(b), fl = H * 0.9, x0 = d > 0 ? -S : 0, span = Math.ceil((W + S * 2) / S) * S, lw = Math.max(2 * akza_bpx(b), u * 0.003);
    var HD = akza_BH(b, { PER: per, PH: ph, FP: Math.floor(ph * 2), SS: S, SPAN: span }, 'var tt=T/PER+PH,st=Math.floor(tt),fr=cl((tt-st)/0.82),px=wr((st+2+FP)*SS,SPAN)-SS;');
    var L = jzShapeLayer(b, 'bg rolling square', 0, fl), g = jzGrp(L, 'inner');
    jzAddRect(g, S * 0.6, S * 0.6, 0, x0 + S * 0.5, -S * 0.5); jzAddStroke(g, sc.fg, lw, akza_al(fillA * 2.2));
    g = jzGrp(L, 'square');
    jzAddRect(g, S, S, 0, x0 + S / 2, -S / 2); jzAddStroke(g, sc.fg, lw, akza_al(fillA * 2.2)); jzAddFill(g, accent ? sc.accent : sc.fg, akza_al(fillA));
    // it rests on one corner, tips over it (accelerating), and the next corner becomes the pivot
    jzSetExpr(jzXf(L, 'ADBE Position'), HD + '[' + (d > 0 ? 'px' : 'W-px') + ',' + jzN(fl) + ']');
    jzSetExpr(jzXf(L, 'ADBE Rotate Z'), HD + '90*Math.pow(fr,2.3)*(' + d + ')');
    jzSetExpr(jzXf(L, 'ADBE Opacity'), HD + 'oc(BT/0.8)*100');
}
jzReg('bg', 'kzRollSquare', {
    plan: function (rng, st) { return { seed: rng.int(1, 1e9), dir: rng.pick([1, -1]), per: rng.range(2.6, 3.6), s: rng.range(0.5, 0.66), k: rng.range(0.04, 0.055), two: rng.chance(0.6) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, u = jzU(b), k = P.k || 0.045, dir = P.dir || 1, fl = H * 0.9, fh = Math.max(2 * akza_bpx(b), u * 0.003), sd = P.seed || 1;
        var F = jzShapeLayer(b, 'bg floor', W / 2, fl + fh / 2), g = jzGrp(F, 'floor');
        jzAddRect(g, W, fh); jzAddFill(g, sc.fg, akza_al(k * 1.6));
        jzSetExpr(jzXf(F, 'ADBE Opacity'), akza_BH(b) + 'oc(BT/0.8)*100');
        if (P.two) akza_roll(b, u * 0.26, (P.per || 3) * 0.55, -dir, (sd % 97) / 97, k * 0.9, true);
        akza_roll(b, u * (P.s || 0.58), P.per || 3, dir, (sd % 53) / 53, k, false);
    }
});

/* 3 kzBounceDiscs — 弾む円: a few big soft discs bounce slowly across the floor, squashing as they land */
jzReg('bg', 'kzBounceDiscs', {
    plan: function (rng, st) { return { seed: rng.int(1, 1e9), n: rng.int(3, 4), k: rng.range(0.045, 0.06), dir: rng.pick([1, -1]) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, u = jzU(b), k = P.k || 0.05, n = P.n || 3, fl = H * 0.97, i;
        var S = jzShapeLayer(b, 'bg bouncing discs', 0, 0);
        for (i = n - 1; i >= 0; i--) {          // the first group is the top one: later discs are drawn over earlier ones
            var r = u * (0.1 + 0.16 * akza_r(s, i, 1)), Tb = 1.7 + 1.3 * akza_r(s, i, 2) + r / u * 2, hgt = H * (0.35 + 0.4 * akza_r(s, i, 4));
            var vx = (0.03 + 0.03 * akza_r(s, i, 5)) * (P.dir || 1) * (i % 2 ? 1 : -0.7);
            var HD = akza_BH(b, { RD: r, TB: Tb, HG: hgt, FL: fl },
                'var f=wr(T/TB+' + jzN(akza_r(s, i, 3)) + ',1),x=wr(' + jzN(akza_r(s, i, 6)) + '*(W+RD*2)+T*' + jzN(vx) + '*W,W+RD*2)-RD,h=HG*4*f*(1-f),sq=0.16*Math.exp(-Math.min(f,1-f)*TB*14);');
            var g = jzGrp(S, 'disc ' + i);
            jzAddEllipse(g, r * 2, r * 2); jzAddFill(g, i === 1 ? sc.accent : sc.fg, akza_al(i === 1 ? k * 1.1 : k));
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), HD + '[x,FL-RD*(1-sq)-h]');
            jzSetExpr(jzGX(g).property('ADBE Vector Scale'), HD + '[(1+sq*0.7)*100,(1-sq)*100]');
            g = jzGrp(S, 'shadow ' + i);
            jzAddEllipse(g, r * 2, r * 0.14); jzAddFill(g, sc.fg);
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), HD + '[x,FL]');
            jzSetExpr(jzGX(g).property('ADBE Vector Scale'), HD + '[(1.1-0.5*h/HG)*100,100]');
            jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), HD + jzN(akza_al(k * 0.7)) + '*(1-h/HG*0.8)');
        }
        jzSetExpr(jzXf(S, 'ADBE Opacity'), akza_BH(b) + 'oc(BT/0.8)*100');
    }
});

/* 4 kzRockHorizon — 揺れる地平: the lower half of the frame is a plane that rocks like a see-saw, with a disc rolling to the low side */
jzReg('bg', 'kzRockHorizon', {
    plan: function (rng, st) { return { seed: rng.int(1, 1e9), amp: rng.range(3.5, 6.5), per: rng.range(5, 8), y: rng.pick([0.64, 0.7, 0.74]), k: rng.range(0.045, 0.06), ball: rng.chance(0.75) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, u = jzU(b), k = P.k || 0.05, D = Math.sqrt(W * W + H * H), px = akza_bpx(b), r = u * 0.055;
        var HD = akza_BH(b, { WW: Math.PI * 2 / (P.per || 6), PH: ((P.seed || 1) % 100) / 100 * Math.PI * 2 }, 'var an=T*WW+PH;');
        var S = jzShapeLayer(b, 'bg rocking horizon', W / 2, H * (P.y || 0.66)), g, h1 = Math.max(2 * px, u * 0.003), h2 = Math.max(1.5 * px, u * 0.0015);
        g = jzGrp(S, 'fulcrum');
        jzAddPath(g, [[0, 0], [-u * 0.05, u * 0.085], [u * 0.05, u * 0.085]], true); jzAddFill(g, sc.fg, akza_al(k * 1.6));
        if (P.ball !== false) {
            // the disc rolls to whichever side is low (a quarter period behind the tilt); its spoke shows the roll
            g = jzGrp(S, 'disc');
            var sp = jzVecs(g).addProperty('ADBE Vector Group'); sp.name = 'spoke';
            jzAddPath(sp, [[0, 0], [r, 0]], false); jzAddStroke(sp, sc.bg, Math.max(2 * px, u * 0.003), 50);
            var bd = jzVecs(g).addProperty('ADBE Vector Group'); bd.name = 'body';
            jzAddEllipse(bd, r * 2, r * 2); jzAddFill(bd, sc.accent, akza_al(k * 1.5));
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), HD + '[-W*0.36*Math.cos(an),' + jzN(-r) + ']');
            jzSetExpr(jzGX(g).property('ADBE Vector Rotation'), HD + '-W*0.36*Math.cos(an)/' + jzN(r) + '*57.2958');
        }
        g = jzGrp(S, 'second line');
        jzAddRect(g, D * 2, h2, 0, 0, u * 0.03 + h2 / 2); jzAddFill(g, sc.fg, akza_al(k * 1.2));
        g = jzGrp(S, 'edge');
        jzAddRect(g, D * 2, h1, 0, 0, h1 / 2); jzAddFill(g, sc.fg, akza_al(k * 2.2));
        g = jzGrp(S, 'plane');
        jzAddRect(g, D * 2, D, 0, 0, D / 2); jzAddFill(g, sc.fg, akza_al(k));
        jzSetExpr(jzXf(S, 'ADBE Rotate Z'), HD + jzN(P.amp || 5) + '*Math.sin(an)');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + 'oc(BT/0.8)*100');
    }
});

/* 5 kzBigGears — 噛み合う歯車: huge meshing gears turn slowly at the corners */
function akza_gear(b, x, y, R, n, fa, flip, rotEx) {
    var sc = b.sc, u = jzU(b), W = b.W, lw = Math.max(2 * akza_bpx(b), u * 0.003), m = R * Math.PI / n * 0.55, st = Math.PI * 2 / n, pts = [], i, j;
    var S = jzShapeLayer(b, 'bg gear', flip ? W - x : x, y), g = jzGrp(S, 'spokes');
    jzAddEllipse(g, R * 1.44, R * 1.44);
    for (i = 0; i < 4; i++) { var a = i * Math.PI / 2; jzAddPath(g, [[Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3], [Math.cos(a) * R * 0.72, Math.sin(a) * R * 0.72]], false); }
    jzAddStroke(g, sc.fg, lw, akza_al(fa * 2.2));
    g = jzGrp(S, 'wheel');
    for (i = 0; i < n; i++) {
        var q = [[i * st - st * 0.18, R + m], [i * st + st * 0.18, R + m], [i * st + st * 0.32, R - m], [i * st + st * 0.68, R - m]];
        for (j = 0; j < 4; j++) pts.push([Math.cos(q[j][0]) * q[j][1], Math.sin(q[j][0]) * q[j][1]]);
    }
    jzAddPath(g, pts, true);
    jzAddEllipse(g, R * 0.6, R * 0.6);
    jzAddStroke(g, sc.fg, lw, akza_al(fa * 2.2));
    var fl = jzAddFill(g, sc.fg, akza_al(fa));
    try { fl.property('ADBE Vector Fill Rule').setValue(2); } catch (e) {}          // even-odd: the hub is a hole
    if (flip) jzXf(S, 'ADBE Scale').setValue([-100, 100]);
    jzSetExpr(jzXf(S, 'ADBE Rotate Z'), akza_BH(b) + '(' + rotEx + ')*' + (flip ? -1 : 1));
    jzSetExpr(jzXf(S, 'ADBE Opacity'), akza_BH(b) + 'oc(BT/0.8)*100');
}
jzReg('bg', 'kzBigGears', {
    plan: function (rng, st) { return { seed: rng.int(1, 1e9), flip: rng.chance(0.5), spd: rng.range(3, 6) * rng.pick([1, -1]), k: rng.range(0.035, 0.05), nA: rng.pick([16, 18, 22]), ang: rng.range(-50, -20) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, u = jzU(b), k = P.k || 0.04, nA = P.nA || 18, nB = Math.round(nA * 0.6), nC = Math.round(nA * 0.42), spd = P.spd || 4, flip = !!P.flip, RD = 180 / Math.PI;
        var RA = u * 0.5, RB = RA * nB / nA, RC = RA * nC / nA, ax = W * 0.1, ay = H * 0.9, phi = (P.ang || -35) * Math.PI / 180, phc = phi - 1.15;
        // meshing: a driven gear turns the other way at the tooth ratio, half a tooth out of phase at the contact point
        var bx = ax + Math.cos(phi) * (RA + RB), by = ay + Math.sin(phi) * (RA + RB), cB = (phi + Math.PI + Math.PI / nB + phi * nA / nB) * RD, sB = -spd * nA / nB;
        var cx = bx + Math.cos(phc) * (RB + RC), cy = by + Math.sin(phc) * (RB + RC), cC = (phc + Math.PI + Math.PI / nC + phc * nB / nC) * RD - cB * nB / nC, sC = -sB * nB / nC;
        akza_gear(b, ax, ay, RA, nA, k, flip, 'T*' + jzN(spd));
        akza_gear(b, bx, by, RB, nB, k * 1.15, flip, jzN(cB) + '+T*' + jzN(sB));
        akza_gear(b, cx, cy, RC, nC, k * 0.9, flip, jzN(cC) + '+T*' + jzN(sC));
    }
});

/* 6 kzSqueezeLines — 疎密の波: a field of parallel lines carries a compression wave: they bunch up and spread out as it passes */
jzReg('bg', 'kzSqueezeLines', {
    plan: function (rng, st) { return { seed: rng.int(1, 1e9), vert: rng.chance(0.7), n: rng.int(30, 40), per: rng.range(4.5, 7) * rng.pick([1, -1]), lam: rng.range(0.55, 0.85), k: rng.range(0.1, 0.14) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, u = jzU(b), vert = P.vert !== false, L = vert ? W : H, n = P.n || 36, k = P.k || 0.12, i;
        var lam = L * (P.lam || 0.7), amp = lam / (Math.PI * 2) * 0.78, lw = Math.max(2 * akza_bpx(b), u * 0.0035);
        var HD = akza_BH(b, { LAM: lam, AMP: amp, PER: P.per || 5 }, 'function PHS(x0){return 6.28319*(x0/LAM-T/PER);}');
        var S = jzShapeLayer(b, 'bg compression wave', 0, 0);
        for (i = -4; i < n + 4; i++) {
            var x0 = (i + 0.5) / n * L, hot = i % 9 === 4, g = jzGrp(S, 'line ' + i);
            jzAddRect(g, vert ? lw : W, vert ? H : lw, 0, vert ? 0 : W / 2, vert ? H / 2 : 0);
            jzAddFill(g, hot ? sc.accent : sc.fg);
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), HD + 'var x=' + jzN(x0) + '+AMP*Math.sin(PHS(' + jzN(x0) + '));' + (vert ? '[x,0]' : '[0,x]'));
            // thin where the lines are bunched, fuller where they are spread
            if (hot) jzGX(g).property('ADBE Vector Group Opacity').setValue(akza_al(k * 1.3));
            else jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), HD + jzN(akza_al(k)) + '*(0.55+0.25*(1-0.78*Math.cos(PHS(' + jzN(x0) + '))))');
        }
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + 'oc(BT/0.6)*100');
    }
});
