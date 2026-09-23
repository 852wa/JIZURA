// ================================================================ camera moves (AE port of the cam entries in src/11p_looks.js + src/11p_bgcamB.js)
// cam.apply(cam, P): cam.nul is a null at the comp centre (anchor = position = centre) that carries the lyric content and its
// colour ghosts. Put expressions on its Position / Scale / Rotation relative to `value`; time 0 = cut start, cam.cut.dur = length.
// For blur (focus pulls) add an effect to every layer in cam.content. The browser's { x, y, s, rot } map to px / % / degrees.

/* ---- dutch — ダッチ: the frame tilts slowly (ease in-out) and pushes in a little */
jzReg('cam', 'dutch', {
    plan: function (rng, st) { return { dir: rng.pick([1, -1]), a: rng.range(2.5, 4.5) }; },
    apply: function (cam, P) {
        var H0 = jzCamHead(cam);
        jzSetExpr(jzXf(cam.nul, 'ADBE Rotate Z'), H0 + 'value+' + (P.dir || 1) + '*Math.min(5,' + jzN(P.a || 3.5) + '*KM)*ios(time/Math.max(0.3,DUR*0.8))');
        jzSetExpr(jzXf(cam.nul, 'ADBE Scale'), H0 + 'var s=1+0.03*KM*cu;[value[0]*s,value[1]*s]');
    }
});

// ---------------------------------------------------------------- shared helpers of this pack (cm_)
// browser design px (absolute px constants such as blur radii) → comp px. Design sizes: min side 1080, 1440 for 1:1 / 4:5.
function cm_px(cam) {
    var W = cam.W || 1920, H = cam.H || 1080, r = W / H;
    return Math.min(W, H) / ((Math.abs(r - 1) < 0.02 || Math.abs(r - 0.8) < 0.02) ? 1440 : 1080);
}
// the browser's `P.k || d`, as an expression literal (parenthesised so negatives are safe)
function cm_p(P, k, d) { return (P && P[k]) ? P[k] : d; }
function cm_n(v) { return '(' + jzN(v) + ')'; }
function cm_dur(cam) { return Math.max(0.01, (cam.cut && cam.cut.dur) || 3); }
// expression code defining CAM(t) → [x, y, s*sx, s*sy, rot, skx, blur] = the browser's get() at cut time t. Inside the entry's
// snippets: t, cu (= t / DUR clamped), KM, DUR, W, H (comp px), sd (seed), vn(x, seed) (-1..1 smooth value noise — J.noise1),
// rs(k) (-1..1 per 1/24 s step — J.rs(seed, env.step, k)) and the JZ_FNS easings + ios.
function cm_fn(cam, o) {
    return jzCamHead(cam) + 'var W=' + jzN(cam.W || 1920) + ',H=' + jzN(cam.H || 1080) + ',sd=SD%997;' +
        'function vn(x,s){var i=Math.floor(x),f=x-i,u=f*f*(3-2*f),a=hh(i*1.731+s*7.117)*2-1,b=hh(i*1.731+1.731+s*7.117)*2-1;return a+(b-a)*u;}\n' +
        'function CAM(t){t=Math.max(0,t);var cu=cl(t/DUR),ST=Math.floor(t*24+0.000001);function rs(k){return hh(ST*1.618+k*9.73+sd*3.17)*2-1;}\n' +
        (o.pre || '') + '\nvar S=(' + (o.s || '1') + ');return [' + (o.x || '0') + ',' + (o.y || '0') + ',S*(' + (o.sx || '1') + '),S*(' + (o.sy || '1') + '),' +
        (o.rot || '0') + ',' + (o.skx || '0') + ',' + (o.blur || '0') + '];}\n';
}
// o = { pre: shared code, x, y (px), s, sx, sy, rot (deg), skx (deg), blur (design px) } — expression snippets in the units of the
// browser's get(). x / y / s / sx / sy / rot go on the camera null; skx = Transform effect Skew and blur = Gaussian Blur on every
// content layer (the browser blurs the whole content layer once, from the main pass, only above 0.4 px).
// The browser evaluates the camera per pass at that pass's lagged time, so fast moves split the colour ghosts. The ghosts here share
// the null, so each ghost (startTime = its lag) gets a Transform effect = N(t)^-1 · N(t - lag) (translation / rotation / scale).
function cm_cam(cam, o) {
    var F = cm_fn(cam, o), i, e, C = cam.content || [], lag, LG;
    if (o.x || o.y) jzSetExpr(jzXf(cam.nul, 'ADBE Position'), F + 'var c=CAM(time);[value[0]+c[0],value[1]+c[1]]');
    if (o.s || o.sx || o.sy) jzSetExpr(jzXf(cam.nul, 'ADBE Scale'), F + 'var c=CAM(time);[value[0]*c[2],value[1]*c[3]]');
    if (o.rot) jzSetExpr(jzXf(cam.nul, 'ADBE Rotate Z'), F + 'value+CAM(time)[4]');
    for (i = 0; i < C.length; i++) {
        lag = 0; try { lag = C[i].startTime || 0; } catch (err) { lag = 0; }
        LG = 'var LAG=' + jzN(Math.max(0, lag)) + ';';
        if (o.skx) { e = jzEffect(C[i], 'ADBE Geometry2', 'JZ Cam Skew'); jzEX(e, 6, F + LG + '-CAM(time-LAG)[5]'); }
        if (lag > 0.001) {
            e = jzEffect(C[i], 'ADBE Geometry2', 'JZ Cam Lag'); jzEP(e, 3, 0);
            jzEX(e, 2, F + LG + 'var a=CAM(time),b=CAM(time-LAG),dx=b[0]-a[0],dy=b[1]-a[1],r=-a[4]*Math.PI/180,cs=Math.cos(r),sn=Math.sin(r);' +
                '[value[0]+(dx*cs-dy*sn)/a[2],value[1]+(dx*sn+dy*cs)/a[3]]');
            if (o.s || o.sx || o.sy) {
                jzEX(e, 4, F + LG + 'CAM(time-LAG)[3]/CAM(time)[3]*100');
                jzEX(e, 5, F + LG + 'CAM(time-LAG)[2]/CAM(time)[2]*100');
            }
            if (o.rot) jzEX(e, 8, F + LG + 'CAM(time-LAG)[4]-CAM(time)[4]');
        }
        if (o.blur) { e = jzEffect(C[i], 'ADBE Gaussian Blur 2', 'JZ Cam Blur'); jzEX(e, 1, F + 'var B=CAM(time)[6];B>0.4?B*' + jzN(2 * cm_px(cam)) + ':0'); }
    }
}
// pans / tilt: panP(u) = u*0.6 + inOutSine(u)*0.4
function cm_pan(cam, P, key, sign) {
    var A = cm_n(cm_p(P, 'a', key === 'y' ? 0.025 : 0.022)), o = { pre: 'var pp=cu*0.6+ios(cu)*0.4;', s: '1.02' };
    o[key] = cm_n(sign) + '*(pp-0.5)*2*' + (key === 'y' ? 'H' : 'W') + '*' + A + '*KM';
    cm_cam(cam, o);
}

// ================================================================ src/11p_looks.js
/* ---- pullOut — 引き: starts pushed in, eases back out to the full frame */
jzReg('cam', 'pullOut', {
    plan: function (rng, st) { return { a: rng.range(0.06, 0.09) }; },
    apply: function (cam, P) { cm_cam(cam, { s: '1+' + cm_n(cm_p(P, 'a', 0.07)) + '*KM*(1-oc(cu))' }); }
});

/* ---- panL / panR — 左パン / 右パン: slow sideways travel across the cut */
jzReg('cam', 'panL', {
    plan: function (rng, st) { return { a: rng.range(0.018, 0.028) }; },
    apply: function (cam, P) { cm_pan(cam, P, 'x', 1); }
});
jzReg('cam', 'panR', {
    plan: function (rng, st) { return { a: rng.range(0.018, 0.028) }; },
    apply: function (cam, P) { cm_pan(cam, P, 'x', -1); }
});

/* ---- tiltUp — ティルト: slow vertical travel (content drifts down) */
jzReg('cam', 'tiltUp', {
    plan: function (rng, st) { return { a: rng.range(0.02, 0.03) }; },
    apply: function (cam, P) { cm_pan(cam, P, 'y', 1); }
});

/* ---- handheld — 手持ち: two-octave smooth noise on x / y / rotation */
jzReg('cam', 'handheld', {
    plan: function (rng, st) { return { f: rng.range(0.8, 1.3) }; },
    apply: function (cam, P) {
        cm_cam(cam, { pre: 'var f=' + cm_n(cm_p(P, 'f', 1)) + ';',
            x: '(vn(t*f*1.1,sd)*0.7+vn(t*f*2.9,sd+1)*0.3)*W*0.007*KM',
            y: '(vn(t*f*0.9,sd+2)*0.7+vn(t*f*3.3,sd+3)*0.3)*H*0.009*KM',
            rot: 'vn(t*f*0.8,sd+4)*0.7*KM', s: '1.012' });
    }
});

/* ---- beatPunch — 拍でズーム: a zoom punch that decays on every beat (no beat data in AE: the browser's fixed 0.5 s clock) */
jzReg('cam', 'beatPunch', {
    plan: function (rng, st) { return { a: rng.range(0.03, 0.045) }; },
    apply: function (cam, P) {
        cm_cam(cam, { pre: 'var ks=Math.exp(-(((t%0.5)+0.5)%0.5)*9);',
            s: '1+' + cm_n(cm_p(P, 'a', 0.035)) + '*KM*ks', y: '-H*0.004*KM*ks' });
    }
});

/* ---- whipIn — ホイップイン: the frame arrives with a fast whip (offset + skew + blur settle in 0.3 s) */
jzReg('cam', 'whipIn', {
    plan: function (rng, st) { return { dir: rng.pick(['L', 'R', 'L', 'R', 'U', 'D']), d: rng.range(0.16, 0.24) }; },
    apply: function (cam, P) {
        var sg = (P.dir === 'L' || P.dir === 'U') ? -1 : 1, hor = (P.dir === 'L' || P.dir === 'R');
        var o = { pre: 'var r=1-oe(cl(t/0.3)),dd=' + cm_n(cm_p(P, 'd', 0.2)) + '*KM*r;', s: '1+0.04*r', blur: '22*KM*r' };
        if (hor) { o.x = cm_n(sg) + '*W*dd'; o.skx = cm_n(sg) + '*9*r*KM'; }
        else o.y = cm_n(sg) + '*H*dd*0.7';
        cm_cam(cam, o);
    }
});

/* ---- crashZoom — クラッシュズーム: late in the cut a sudden zoom slams in (blur flash + small jolt) */
jzReg('cam', 'crashZoom', {
    plan: function (rng, st) { return { at: rng.range(0.6, 0.75), a: rng.range(0.08, 0.11) }; },
    apply: function (cam, P) {
        var dur = cm_dur(cam), tc = dur < 0.8 ? dur * 0.5 : Math.max(dur * cm_p(P, 'at', 0.65), dur - 0.6);
        cm_cam(cam, { pre: 'var tc=' + jzN(tc) + ',dt=t-tc,q=dt<0?0:oe(cl(dt/0.1)),sh=dt<0?0:Math.exp(-dt*6)*q;',
            s: 'dt<0?1-0.008*KM*cl((t-tc+0.25)/0.25):1+Math.min(0.12,' + cm_n(cm_p(P, 'a', 0.1)) + '*KM)*q',
            blur: 'dt<0?0:12*KM*Math.max(0,1-Math.abs(dt-0.05)/0.08)',
            x: 'rs(1)*W*0.004*sh*KM', y: 'rs(2)*H*0.004*sh*KM' });
    }
});

/* ---- bounce — バウンス: damped springy zoom / hop at the cut start */
jzReg('cam', 'bounce', {
    plan: function (rng, st) { return { a: rng.range(0.045, 0.065) }; },
    apply: function (cam, P) {
        cm_cam(cam, { pre: 'var dd=Math.exp(-t*5.5);',
            s: '1-' + cm_n(cm_p(P, 'a', 0.07)) + '*KM*dd*Math.cos(t*16)', y: '-H*0.012*KM*dd*Math.sin(t*16)' });
    }
});

/* ---- roll — ロール: the frame rolls linearly through level across the cut */
jzReg('cam', 'roll', {
    plan: function (rng, st) { return { dir: rng.pick([1, -1]), a: rng.range(2.5, 4) }; },
    apply: function (cam, P) {
        cm_cam(cam, { rot: cm_n(cm_p(P, 'dir', 1)) + '*(cu-0.5)*' + cm_n(cm_p(P, 'a', 3)) + '*KM', s: '1.025' });
    }
});

/* ---- driftDiag — 斜めドリフト: diagonal drift with a slow push */
jzReg('cam', 'driftDiag', {
    plan: function (rng, st) { return { dx: rng.pick([1, -1]), dy: rng.pick([1, -1]) }; },
    apply: function (cam, P) {
        cm_cam(cam, { pre: 'var uu=ios(cu)*0.5+cu*0.5;',
            x: '(uu-0.5)*W*0.035*KM*' + cm_n(cm_p(P, 'dx', 1)), y: '(uu-0.5)*H*0.03*KM*' + cm_n(cm_p(P, 'dy', 1)),
            s: '1.02+0.025*KM*uu' });
    }
});

/* ---- shakeHard — 強い揺れ: a hard random shake (24 steps / s) that dies out */
jzReg('cam', 'shakeHard', {
    plan: function (rng, st) { return {}; },
    apply: function (cam, P) {
        cm_cam(cam, { pre: 'var amp=Math.exp(-t*4.5)*KM;if(amp<0.01)amp=0;',
            x: 'rs(1)*W*0.022*amp', y: 'rs(2)*H*0.02*amp', rot: 'rs(3)*1.6*amp', s: '1+0.03*amp', blur: '2.5*amp' });
    }
});

/* ---- dollyIn — ドリー: accelerating push-in (in-cubic) with a slight rise */
jzReg('cam', 'dollyIn', {
    plan: function (rng, st) { return { a: rng.range(0.08, 0.11) }; },
    apply: function (cam, P) {
        cm_cam(cam, { pre: 'var q=ic(cu);', s: '1+Math.min(0.14,' + cm_n(cm_p(P, 'a', 0.1)) + '*KM)*q', y: '-H*0.008*KM*q' });
    }
});

/* ---- stepZoom — 段階ズーム: 2–3 snap zooms (no beats in AE: evenly spaced, the browser's no-beat fallback) */
jzReg('cam', 'stepZoom', {
    plan: function (rng, st) { return { n: rng.int(2, 3), a: rng.range(0.035, 0.045) }; },
    apply: function (cam, P) {
        var dur = cm_dur(cam), n = Math.max(1, Math.round(cm_p(P, 'n', 2))), ts = [], i;
        for (i = 0; i < n; i++) ts.push(jzN(dur * (i + 1) / (n + 1)));
        cm_cam(cam, { pre: 'var ts=[' + ts.join(',') + '],aa=' + cm_n(cm_p(P, 'a', 0.04)) + '*KM,sz=1,bz=0;' +
            'for(var i=0;i<ts.length;i++){var d=t-ts[i];if(d<0)continue;sz+=aa*oe(cl(d/0.07));bz+=5*KM*(1-cl(d/0.06));}',
            s: 'Math.min(1.15,sz)', blur: 'bz' });
    }
});

// ================================================================ src/11p_bgcamB.js
/* ---- orbitDrift — 周回: the frame circles slowly (x / y on a circle, rotation follows) */
jzReg('cam', 'orbitDrift', {
    plan: function (rng, st) { return { dir: rng.pick([1, -1]), a0: rng.range(0, 6.28), sp: rng.range(1.1, 1.6) }; },
    apply: function (cam, P) {
        var d = cm_n(cm_p(P, 'dir', 1));
        cm_cam(cam, { pre: 'var th=' + cm_n(cm_p(P, 'a0', 0)) + '+' + d + '*t*' + cm_n(cm_p(P, 'sp', 1.3)) + ',r=oc(cl(t/0.7));',
            x: 'Math.cos(th)*W*0.016*KM*r', y: 'Math.sin(th)*H*0.02*KM*r', rot: 'Math.sin(th)*0.9*KM*r*' + d, s: '1.02' });
    }
});

/* ---- barrelRoll — バレルロール: opens rolled ~90°, rolls level with a small overshoot (dip in scale + blur) */
jzReg('cam', 'barrelRoll', {
    plan: function (rng, st) { return { dir: rng.pick([1, -1]), a: rng.range(70, 110), d: rng.range(0.42, 0.55) }; },
    apply: function (cam, P) {
        cm_cam(cam, { pre: 'var K1=Math.min(1,KM),q=cl(t/' + cm_n(cm_p(P, 'd', 0.5)) + '),r=q>=1?0:1-ob(q,1.3);',
            rot: cm_n(cm_p(P, 'dir', 1)) + '*' + cm_n(cm_p(P, 'a', 90)) + '*K1*r',
            s: 'q>=1?1:1-0.12*K1*Math.sin(Math.PI*Math.min(1,q*1.25))', blur: 'q>=1?0:9*K1*cl(1-q*2.2)' });
    }
});

/* ---- pendulumSway — 振り子: the frame hangs from a pivot above the screen (rotation + coupled sideways arc) */
jzReg('cam', 'pendulumSway', {
    plan: function (rng, st) { return { a: rng.range(1.8, 2.6), per: rng.range(2, 3), side: rng.pick([1, -1]) }; },
    apply: function (cam, P) {
        cm_cam(cam, { pre: 'var damp=0.75+0.25*Math.exp(-t*0.6),LL=W*0.62,phi=' + cm_n(cm_p(P, 'a', 2.2)) + '*KM*' + cm_n(cm_p(P, 'side', 1)) +
            '*Math.cos(t/' + cm_n(cm_p(P, 'per', 2.4)) + '*2*Math.PI)*damp*Math.PI/180;',
            x: '-LL*Math.sin(phi)', y: '-LL*(1-Math.cos(phi))', rot: 'phi*180/Math.PI', s: '1.02' });
    }
});

/* ---- focusIn — ピント合わせ: opens out of focus and pulls sharp (lens breathing) */
jzReg('cam', 'focusIn', {
    plan: function (rng, st) { return { d: rng.range(0.5, 0.8), b: rng.range(10, 15) }; },
    apply: function (cam, P) {
        cm_cam(cam, { pre: 'var q=oc(cl(t/' + cm_n(cm_p(P, 'd', 0.65)) + '));',
            blur: '(1-q)*' + cm_n(cm_p(P, 'b', 12)) + '*Math.min(1,KM)', s: '1+0.03*(1-q)+0.012*KM*cu' });
    }
});

/* ---- rackFocus — ピンぼけ: sharp, then drifts out of focus towards the end of the cut */
jzReg('cam', 'rackFocus', {
    plan: function (rng, st) { return { b: rng.range(5, 8), at: rng.range(0.6, 0.7) }; },
    apply: function (cam, P) {
        var dur = cm_dur(cam), s0 = Math.max(dur * cm_p(P, 'at', 0.65), dur - 0.9), dd = Math.max(0.2, dur - s0);
        cm_cam(cam, { pre: 'var q=ios(cl((t-' + cm_n(s0) + ')/' + cm_n(dd) + '));',
            blur: 'q*' + cm_n(cm_p(P, 'b', 6.5)) + '*Math.min(1,KM)', s: '1.01-0.02*q*KM', y: 'H*0.004*q' });
    }
});

/* ---- earthquake — 地震: constant rumble + a jolt every period (no beats in AE: the browser's fixed-period fallback) */
jzReg('cam', 'earthquake', {
    plan: function (rng, st) { return { per: rng.range(0.55, 0.8), a: rng.range(0.85, 1.1) }; },
    apply: function (cam, P) {
        var per = cm_n(cm_p(P, 'per', 0.65));
        cm_cam(cam, { pre: 'var K2=KM*' + cm_n(cm_p(P, 'a', 1)) + ',hit=Math.exp(-(((t%' + per + ')+' + per + ')%' + per + ')*7),amp=K2*(0.14+hit);',
            x: 'rs(11)*W*0.005*amp', y: 'rs(12)*H*0.014*amp', rot: 'rs(13)*0.45*amp', s: '1.02+0.012*hit*K2', blur: '1.5*hit*K2' });
    }
});

/* ---- floatNoise — 浮遊: slow floating drift (noise + a gentle sine bob, breathing scale) */
jzReg('cam', 'floatNoise', {
    plan: function (rng, st) { return { f: rng.range(0.8, 1.2) }; },
    apply: function (cam, P) {
        cm_cam(cam, { pre: 'var tf=t*' + cm_n(cm_p(P, 'f', 1)) + ',s7=sd+7;',
            x: 'vn(tf*0.6,s7)*W*0.02*KM', y: '(vn(tf*0.5+5,s7+1)*0.7+0.3*Math.sin(tf*1.3))*H*0.024*KM',
            rot: 'vn(tf*0.3+9,s7+2)*1.3*KM', s: '1.025+0.012*Math.sin(tf*0.8)' });
    }
});

/* ---- vertigo — めまい: creeping push-in whose perspective wavers (stretch / squash, skew and roll grow with the zoom) */
jzReg('cam', 'vertigo', {
    plan: function (rng, st) { return { dir: rng.pick([1, -1]), a: rng.range(0.05, 0.07) }; },
    apply: function (cam, P) {
        var d = cm_n(cm_p(P, 'dir', 1));
        cm_cam(cam, { pre: 'var z=ios(cu),ww=Math.sin(t*2.3);',
            s: '1+' + cm_n(cm_p(P, 'a', 0.06)) + '*KM*z', sx: '1+0.03*KM*z*ww', sy: '1-0.026*KM*z*ww',
            skx: '2.2*KM*z*Math.sin(t*1.7)*' + d, rot: '0.8*KM*z*Math.sin(t*1.1+1)*' + d });
    }
});

/* ---- tiltDown — ティルトダウン: the line rises into frame from below and settles, easing out of a slight zoom */
jzReg('cam', 'tiltDown', {
    plan: function (rng, st) { return { a: rng.range(0.024, 0.032) }; },
    apply: function (cam, P) {
        cm_cam(cam, { pre: 'var q=oc(cu),A=H*' + cm_n(cm_p(P, 'a', 0.028)) + '*KM;', y: 'A*(1.2-1.6*q)', s: '1.035-0.02*q' });
    }
});

/* ---- spiralIn — 渦ズーム: spirals in from a small, rotated, off-centre frame */
jzReg('cam', 'spiralIn', {
    plan: function (rng, st) { return { dir: rng.pick([1, -1]), a0: rng.range(0, 6.28), d: rng.range(0.9, 1.3) }; },
    apply: function (cam, P) {
        var d = cm_p(P, 'dir', 1);
        cm_cam(cam, { pre: 'var e=oc(cl(t/' + cm_n(cm_p(P, 'd', 1.1)) + ')),r=1-e,th=' + cm_n(cm_p(P, 'a0', 0)) + '+' + cm_n(d) + '*e*2*Math.PI*0.8;',
            x: 'Math.cos(th)*W*0.03*KM*r', y: 'Math.sin(th)*H*0.035*KM*r', rot: cm_n(-d) + '*7*KM*r', s: '1-0.08*KM*r+0.015*KM*cu' });
    }
});

/* ---- snapPan — スナップパン: holds one framing, whips to the opposite one mid-cut (skew + blur on the whip), holds again */
jzReg('cam', 'snapPan', {
    plan: function (rng, st) { return { dir: rng.pick([1, -1]), a: rng.range(0.024, 0.032), at: rng.range(0.45, 0.6) }; },
    apply: function (cam, P) {
        var dur = cm_dur(cam), d = cm_n(cm_p(P, 'dir', 1)), A = 'W*' + cm_n(cm_p(P, 'a', 0.028)) + '*KM*' + d;
        if (dur < 1.1) { cm_cam(cam, { pre: 'var A=' + A + ';', x: 'A*0.5*(1-2*cu)', s: '1.02' }); return; }
        cm_cam(cam, { pre: 'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}' +
            'var A=' + A + ',drift=W*0.005*KM*' + d + '*(cu-0.5),dt=t-' + cm_n(dur * cm_p(P, 'at', 0.5)) + ',q=ioc(cl(dt/0.16)),bl=(dt>0&&dt<0.16)?Math.sin(Math.PI*dt/0.16):0;',
            x: 'A*(1-2*q)-drift', s: '1.02+0.015*bl', skx: '-' + d + '*5*KM*bl', blur: '14*KM*bl' });
    }
});

/* ---- jelly — ぷるん: squash-and-stretch wobble on landing (no beat re-wobbles in AE) */
jzReg('cam', 'jelly', {
    plan: function (rng, st) { return { a: rng.range(0.045, 0.065), f: rng.range(18, 24) }; },
    apply: function (cam, P) {
        cm_cam(cam, { pre: 'var ww=Math.exp(-t*5)*Math.cos(t*' + cm_n(cm_p(P, 'f', 21)) + '),A=' + cm_n(cm_p(P, 'a', 0.055)) + '*KM;',
            sx: '1+A*ww', sy: '1-A*ww*0.9', y: 'H*0.008*KM*ww', s: '1.01' });
    }
});
