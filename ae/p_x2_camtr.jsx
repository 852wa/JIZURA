// ================================================================ camera moves + cut-to-cut transitions 追加分2
// (AE port of src/11p_x2_camtr.js, pack x2camtr — keys xq…: 20 cam + 17 trans)
// cam.apply(cam, P): expressions on the cut's camera null (Position / Scale / Rotation relative to `value`; time 0 = cut start),
//   skew = Transform effect and blur = Gaussian Blur on every content layer — the construction of ae/p_cam.jsx (axq_cam = cm_cam).
//   There is no beat / loudness data in AE: the beat-driven moves run on the browser's own no-beat fallback clock.
// trans.build(t): t.A = previous cut's wrapper (holds its last state until t0 + dur), t.B = this cut's wrapper (above A).
//   As in ae/p_trans.jsx: effects on the wrappers are identity outside the transition; whatever must sit above the new cut is a
//   copy of a wrapper that lives only for the transition (axq_copy), usually cut open by a shape-layer track matte.

// ---------------------------------------------------------------- helpers
// J.h / J.r / J.rs of the browser (same uint32 for the same keys)
function axq_h(a, b, c, d, e) {
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
function axq_r(a, b, c, d, e) { return axq_h(a, b, c, d, e) / 4294967296; }
function axq_rs(a, b, c, d, e) { return axq_r(a, b, c, d, e) * 2 - 1; }
var AXQ_IOC = 'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}';
var AXQ_IOS = 'function ios(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}';
var AXQ_DEG = Math.PI / 180;

// ================================================================ CAMERA
// browser design px (blur radii) → comp px. Design sizes: min side 1080, 1440 for 1:1 / 4:5.
function axq_px(cam) {
    var W = cam.W || 1920, H = cam.H || 1080, r = W / H;
    return Math.min(W, H) / ((Math.abs(r - 1) < 0.02 || Math.abs(r - 0.8) < 0.02) ? 1440 : 1080);
}
function axq_p(P, k, d) { return (P && P[k]) ? P[k] : d; }      // the browser's `Q.k || d`
function axq_n(v) { return '(' + jzN(v) + ')'; }
function axq_dur(cam) { return Math.max(0.01, (cam.cut && cam.cut.dur) || 3); }
function axq_seed(cam) { return ((cam.cut && cam.cut.seed) || 0) | 0; }
// expression code defining CAM(t) → [x, y, s*sx, s*sy, rot, skx, blur] = the browser's get() at cut time t. Inside the snippets:
// t, cu (= t / DUR clamped), KM, K1 (= min(1, KM)), DUR, W, H (comp px), sd, vn(x, seed) (-1..1 smooth value noise — J.noise1)
// and the JZ_FNS easings + ios + ioc.
function axq_fn(cam, o) {
    return jzCamHead(cam) + AXQ_IOC + 'var W=' + jzN(cam.W || 1920) + ',H=' + jzN(cam.H || 1080) + ',sd=SD%997,K1=Math.min(1,KM);' +
        'function vn(x,s){var i=Math.floor(x),f=x-i,u=f*f*(3-2*f),a=hh(i*1.731+s*7.117)*2-1,b=hh(i*1.731+1.731+s*7.117)*2-1;return a+(b-a)*u;}\n' +
        'function CAM(t){t=Math.max(0,t);var cu=cl(t/DUR);\n' +
        (o.pre || '') + '\nvar S=(' + (o.s || '1') + ');return [' + (o.x || '0') + ',' + (o.y || '0') + ',S*(' + (o.sx || '1') + '),S*(' + (o.sy || '1') + '),' +
        (o.rot || '0') + ',' + (o.skx || '0') + ',' + (o.blur || '0') + '];}\n';
}
// o = { pre, x, y (px), s, sx, sy, rot (deg), skx (deg), blur (design px) } — expression snippets in the units of the browser's get().
// The colour ghosts share the null but the browser evaluates the camera at each pass's lagged time: every ghost (startTime = its
// lag) gets a Transform effect = N(t)^-1 · N(t - lag).
function axq_cam(cam, o) {
    var F = axq_fn(cam, o), i, e, C = cam.content || [], lag, LG;
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
        if (o.blur) { e = jzEffect(C[i], 'ADBE Gaussian Blur 2', 'JZ Cam Blur'); jzEX(e, 1, F + 'var B=CAM(time)[6];B>0.4?B*' + jzN(2 * axq_px(cam)) + ':0'); }
    }
}

/* ---- xqArcSweep — 弧を描く: one pass along a shallow arc (sideways travel, a rise in the middle, leaning into the curve) */
jzReg('cam', 'xqArcSweep', {
    plan: function (rng, st) { return { dir: rng.pick([1, -1]), v: rng.pick([1, 1, -1]), a: rng.range(0.02, 0.026) }; },
    apply: function (cam, P) {
        var d = axq_n(axq_p(P, 'dir', 1)), v = axq_n(axq_p(P, 'v', 1));
        axq_cam(cam, { pre: 'var e=(cu*0.5+ios(cu)*0.5)*2-1;',
            x: d + '*e*W*' + axq_n(axq_p(P, 'a', 0.023)) + '*KM', y: '-1*' + v + '*H*0.026*KM*(1-e*e-0.45)', rot: d + '*' + v + '*e*1.5*KM', s: '1.03' });
    }
});

/* ---- xqWindUp — 溜めて寄る: backs off a little first, then pushes in on an S-curve and holds the tighter framing */
jzReg('cam', 'xqWindUp', {
    plan: function (rng, st) { return { a: rng.range(0.055, 0.075), b: rng.range(0.018, 0.026) }; },
    apply: function (cam, P) {
        var dur = axq_dur(cam), t1 = Math.max(0.001, Math.min(0.45, dur * 0.25)), t2 = Math.max(0.3, dur * 0.5);
        axq_cam(cam, { pre: 'var bk=ios(t/' + jzN(t1) + '),ps=ioc((t-' + jzN(t1) + ')/' + jzN(t2) + '),b=' + axq_n(axq_p(P, 'b', 0.022)) + '*KM,a=' + axq_n(axq_p(P, 'a', 0.065)) + '*KM;',
            s: '1-b*bk+(b+a)*ps+0.006*KM*cu', y: '-H*0.006*KM*ps' });
    }
});

/* ---- xqFocusHunt — ピント迷い: autofocus hunting (soft, almost sharp, soft again, then it locks) with the lens breathing along */
jzReg('cam', 'xqFocusHunt', {
    plan: function (rng, st) { return { d: rng.range(0.75, 1.0), b: rng.range(8, 12) }; },
    apply: function (cam, P) {
        var qd = Math.min(axq_p(P, 'd', 0.9), Math.max(0.4, axq_dur(cam) * 0.6));
        axq_cam(cam, { pre: 'var q=cl(t/' + jzN(qd) + '),c=Math.cos(q*Math.PI*1.5),dk=Math.pow(1-q,1.2);',
            blur: axq_n(axq_p(P, 'b', 10)) + '*K1*Math.abs(c)*dk', s: '1+0.02*KM*c*dk+0.01*KM*cu' });
    }
});

/* ---- xqBeatBreath — 拍で呼吸: a smooth zoom that breathes in and out (no beats in AE: the browser's fixed period) */
jzReg('cam', 'xqBeatBreath', {
    plan: function (rng, st) { return { a: rng.range(0.03, 0.042), per: rng.range(1.5, 1.9) }; },
    apply: function (cam, P) {
        axq_cam(cam, { pre: 'var w=0.5-0.5*Math.cos(t/' + axq_n(axq_p(P, 'per', 1.7)) + '*2*Math.PI);',
            s: '1.012+' + axq_n(axq_p(P, 'a', 0.036)) + '*KM*w', y: '-H*0.004*KM*w' });
    }
});

/* ---- xqWalkCam — 歩き撮り: carried on the shoulder while walking (step bob with a soft landing, hips swaying) */
jzReg('cam', 'xqWalkCam', {
    plan: function (rng, st) { return { f: rng.range(1.5, 1.9), side: rng.pick([1, -1]) }; },
    apply: function (cam, P) {
        var sg = axq_n(axq_p(P, 'side', 1));
        axq_cam(cam, { pre: 'var ph=t*' + axq_n(axq_p(P, 'f', 1.7)) + '*Math.PI;',
            x: sg + '*Math.sin(ph)*W*0.006*KM+vn(t*0.7,sd+3)*W*0.003*KM', y: '(0.5-Math.abs(Math.sin(ph)))*H*0.011*KM',
            rot: sg + '*Math.sin(ph+0.6)*0.45*KM', s: '1.02' });
    }
});

/* ---- xqTripodNudge — 三脚の直し: locked off; the operator corrects the framing in a few eased nudges, each smaller, ending centred */
jzReg('cam', 'xqTripodNudge', {
    plan: function (rng, st) { return { per: rng.range(0.85, 1.25), s0: rng.int(0, 99) }; },
    apply: function (cam, P) {
        var per = axq_p(P, 'per', 1), sd = axq_seed(cam) + ((P.s0 || 0) | 0), kz = Math.min(60, Math.max(1, Math.floor((axq_dur(cam) - 0.35) / per)));
        var px = [], py = [], i;
        for (i = 0; i < kz; i++) { px.push(jzN(axq_rs(sd, i, 1) / (1 + 0.5 * i))); py.push(jzN(axq_rs(sd, i, 2) / (1 + 0.5 * i))); }   // the browser's own offsets
        axq_cam(cam, { pre: 'var per=' + jzN(per) + ',PX=[' + px.join(',') + '],PY=[' + py.join(',') + '],k=Math.floor(t/per),e=ioc((t-k*per)/0.3);' +
            'function ps(a,i){return (i<0||i>=a.length)?0:a[i];}var x0=ps(PX,k>0?k-1:0),y0=ps(PY,k>0?k-1:0);',
            x: '(x0+(ps(PX,k)-x0)*e)*W*0.016*KM', y: '(y0+(ps(PY,k)-y0)*e)*H*0.013*KM', s: '1.02' });
    }
});

/* ---- xqLongLens — 望遠の震え: tight framing, a fine fast tremor riding on a slow sideways float */
jzReg('cam', 'xqLongLens', {
    plan: function (rng, st) { return { f: rng.range(0.9, 1.2) }; },
    apply: function (cam, P) {
        axq_cam(cam, { pre: 'var tf=t*' + axq_n(axq_p(P, 'f', 1)) + ',s2=sd+21;',
            x: '(vn(tf*11,s2)*0.6+vn(tf*17,s2+1)*0.4)*W*0.0026*KM+vn(tf*0.35,s2+2)*W*0.009*KM',
            y: '(vn(tf*12,s2+3)*0.6+vn(tf*19,s2+4)*0.4)*H*0.0032*KM', s: '1.045+0.006*Math.sin(tf*0.9)' });
    }
});

/* ---- xqStopMotion — コマ撮り寄り: a push-in shot frame by frame (small held steps with a registration wobble) */
jzReg('cam', 'xqStopMotion', {
    plan: function (rng, st) { return { fps: rng.pick([5, 6, 8]), a: rng.range(0.065, 0.085) }; },
    apply: function (cam, P) {
        axq_cam(cam, { pre: 'var fq=' + axq_n(axq_p(P, 'fps', 6)) + ',fr=Math.floor(t*fq+0.000001),u=cl(fr/fq/DUR);function rr(k){return hh(fr*1.618+k*9.73+sd*3.17)*2-1;}',
            s: '1+' + axq_n(axq_p(P, 'a', 0.075)) + '*KM*u', x: 'rr(1)*W*0.0022*KM', y: 'rr(2)*H*0.0022*KM', rot: 'rr(3)*0.22*KM' });
    }
});

/* ---- xqWhipSpring — 小ホイップ: a short diagonal whip that lands on a spring (two quick overshoots, a trace of blur, then still) */
jzReg('cam', 'xqWhipSpring', {
    plan: function (rng, st) { return { ang: rng.pick([0, 180, 25, 155, -25, -155, 90, -90]), f: rng.range(17, 21) }; },
    apply: function (cam, P) {
        var a = (P.ang || 0) * AXQ_DEG, cx = Math.cos(a), cy = Math.sin(a);
        if (Math.abs(cx) < 1e-6) cx = 0;
        if (Math.abs(cy) < 1e-6) cy = 0;
        var o = { pre: 'var d=Math.exp(-t*7);if(d<0.004)d=0;var w=d*Math.cos(t*' + axq_n(axq_p(P, 'f', 19)) + ');', s: '1+0.02*K1*d', blur: 'd>0?10*K1*Math.exp(-t*16):0' };
        if (cx) { o.x = axq_n(cx) + '*W*0.045*K1*w'; o.skx = axq_n(cx) + '*3.5*K1*w'; }
        if (cy) { o.y = axq_n(cy) + '*H*0.04*K1*w'; o.rot = axq_n(cy) + '*1.2*K1*w'; }
        axq_cam(cam, o);
    }
});

/* ---- xqLevelOut — 水平出し: opens crooked and is levelled like a spirit level (swings past true once or twice, comes to rest) */
jzReg('cam', 'xqLevelOut', {
    plan: function (rng, st) { return { dir: rng.pick([1, -1]), a: rng.range(3, 4) }; },
    apply: function (cam, P) {
        axq_cam(cam, { pre: 'var q=t/' + jzN(jzClamp(axq_dur(cam) * 0.5, 0.5, 1.4)) + ',r=Math.exp(-q*3.2)*Math.cos(q*4.4);',
            rot: 'Math.max(-5,Math.min(5,' + axq_n(axq_p(P, 'dir', 1)) + '*' + axq_n(axq_p(P, 'a', 3.5)) + '*KM*r))', s: '1.035-0.012*cl(q)' });
    }
});

/* ---- xqSquashRelax — つぶれ戻り: arrives pressed flat (or pulled tall / wide) on one axis and slowly relaxes — no wobble */
jzReg('cam', 'xqSquashRelax', {
    plan: function (rng, st) { return { ax: rng.pick(['x', 'y', 'y']), sg: rng.pick([1, -1]), a: rng.range(0.07, 0.095) }; },
    apply: function (cam, P) {
        var o = { pre: 'var a=' + axq_n(axq_p(P, 'sg', 1)) + '*' + axq_n(axq_p(P, 'a', 0.08)) + '*K1*(1-oc(t/' + jzN(jzClamp(axq_dur(cam) * 0.6, 0.5, 1.6)) + '));', s: '1.005' };
        if (P.ax === 'x') { o.sx = '1+a'; o.sy = '1-a*0.35'; } else { o.sy = '1+a'; o.sx = '1-a*0.35'; }
        axq_cam(cam, o);
    }
});

/* ---- xqDriftTurn — 折り返し: drifts one way, slows, turns round mid-cut and drifts back while it keeps sinking / rising */
jzReg('cam', 'xqDriftTurn', {
    plan: function (rng, st) { return { dx: rng.pick([1, -1]), dy: rng.pick([1, -1]), a: rng.range(0.024, 0.03) }; },
    apply: function (cam, P) {
        axq_cam(cam, { x: axq_n(axq_p(P, 'dx', 1)) + '*W*' + axq_n(axq_p(P, 'a', 0.027)) + '*KM*(Math.sin(Math.PI*cu)-0.55)',
            y: axq_n(axq_p(P, 'dy', 1)) + '*H*0.014*KM*(cu*2-1)', s: '1.025' });
    }
});

/* ---- xqCraneUp — クレーン: the camera rises and pulls back at once, the foreshortened frame opening up as it levels */
jzReg('cam', 'xqCraneUp', {
    plan: function (rng, st) { return { dir: rng.pick([1, -1]), up: rng.chance(0.75) }; },
    apply: function (cam, P) {
        axq_cam(cam, { pre: 'var r=1-oc(cu);', y: axq_n(P.up === false ? -1 : 1) + '*H*0.036*KM*(r-0.2)', s: '1.01+0.055*KM*r', sy: '1-0.035*KM*r',
            rot: axq_n(axq_p(P, 'dir', 1)) + '*1.1*KM*r' });
    }
});

/* ---- xqTruckAround — 回り込み: trucks round the lyric (seen from one side, face-on in the middle, from the other side at the end) */
jzReg('cam', 'xqTruckAround', {
    plan: function (rng, st) { return { dir: rng.pick([1, -1]), a: rng.range(0.045, 0.06) }; },
    apply: function (cam, P) {
        var d = axq_n(axq_p(P, 'dir', 1));
        axq_cam(cam, { pre: 'var k=(cu*0.5+ios(cu)*0.5)*2-1;', sx: '1-' + axq_n(axq_p(P, 'a', 0.05)) + '*KM*k*k', x: d + '*W*0.022*KM*k', skx: d + '*1.3*KM*k', s: '1.03' });
    }
});

/* ---- xqHeartbeat — 鼓動: lub-dub, two close swells and a rest (no beats in AE: the browser's fixed period of about a second) */
jzReg('cam', 'xqHeartbeat', {
    plan: function (rng, st) { return { a: rng.range(0.024, 0.032), per: rng.range(1.0, 1.25) }; },
    apply: function (cam, P) {
        var per = axq_p(P, 'per', 1.1), d2 = Math.min(0.3, per * 0.27);
        axq_cam(cam, { pre: 'var tt=t%' + jzN(per) + ',k=Math.exp(-tt*10)+(tt>' + jzN(d2) + '?0.65*Math.exp(-(tt-' + jzN(d2) + ')*10):0);',
            s: '1.01+' + axq_n(axq_p(P, 'a', 0.028)) + '*KM*k', sy: '1+0.006*KM*k' });
    }
});

/* ---- xqLeafFall — 舞い降り: comes down from above like a falling leaf (swinging, tilting with each swing) and lands still */
jzReg('cam', 'xqLeafFall', {
    plan: function (rng, st) { return { dir: rng.pick([1, -1]), n: rng.range(1.2, 1.7) }; },
    apply: function (cam, P) {
        var d = axq_n(axq_p(P, 'dir', 1));
        axq_cam(cam, { pre: 'var q=cl(t/' + jzN(jzClamp(axq_dur(cam) * 0.65, 0.6, 1.9)) + '),r=1-oc(q),ph=q*2*Math.PI*' + axq_n(axq_p(P, 'n', 1.5)) + ';',
            y: '-H*0.042*K1*r', x: d + '*W*0.03*K1*r*Math.sin(ph)', rot: d + '*2.6*K1*r*Math.cos(ph)', s: '1.01' });
    }
});

/* ---- xqLoudZoom — 音量で寄る: the framing follows the loudness (no audio analysis in AE: the browser's slow two-sine fallback) */
jzReg('cam', 'xqLoudZoom', {
    plan: function (rng, st) { return { a: rng.range(0.04, 0.055) }; },
    apply: function (cam, P) {
        axq_cam(cam, { pre: 'var en=0.5+0.5*Math.sin(t*2.1)*Math.sin(t*0.7+1);', s: '1.005+' + axq_n(axq_p(P, 'a', 0.047)) + '*KM*en', y: '-H*0.004*KM*en' });
    }
});

/* ---- xqPushPull — 寄って引く: in and back out again in one breath (closest mid-cut, home at both ends) */
jzReg('cam', 'xqPushPull', {
    plan: function (rng, st) { return { a: rng.range(0.065, 0.085), at: rng.range(0.42, 0.58) }; },
    apply: function (cam, P) {
        axq_cam(cam, { pre: 'var at=' + axq_n(jzClamp(axq_p(P, 'at', 0.5), 0.05, 0.95)) + ',v=cu<at?cu/at*0.5:0.5+(cu-at)/(1-at)*0.5,b=0.5-0.5*Math.cos(2*Math.PI*v);',
            s: '1+' + axq_n(axq_p(P, 'a', 0.075)) + '*KM*b', y: '-H*0.006*KM*b' });
    }
});

/* ---- xqFindFrame — 構図を探す: starts too tight and off to one corner, then finds the lyric and frames it */
jzReg('cam', 'xqFindFrame', {
    plan: function (rng, st) { return { cx: rng.pick([1, -1]), cy: rng.pick([1, -1, 0]) }; },
    apply: function (cam, P) {
        var T = jzClamp(axq_dur(cam) * 0.45, 0.45, 1.1), cy = P.cy || 0;
        var o = { pre: 'var r=1-ob((t-' + jzN(T * 0.15) + ')/' + jzN(T * 0.85) + ',1.15);', x: axq_n(axq_p(P, 'cx', 1)) + '*W*0.028*K1*r', s: '1+0.06*K1*Math.max(-0.15,r)' };
        if (cy) o.y = axq_n(cy) + '*H*0.03*K1*r';
        axq_cam(cam, o);
    }
});

/* ---- xqTickRoll — 秒針ロール: the frame rolls like a second hand (small ticks, each with a tiny overshoot, from one lean to the other) */
jzReg('cam', 'xqTickRoll', {
    plan: function (rng, st) { return { dir: rng.pick([1, -1]), n: rng.int(4, 6), a: rng.range(2, 2.8) }; },
    apply: function (cam, P) {
        var dur = Math.max(0.3, axq_dur(cam)), n = Math.max(2, Math.min(axq_p(P, 'n', 5), Math.floor(dur / 0.3))), per = dur / n;
        axq_cam(cam, { pre: 'var n=' + jzN(n) + ',per=' + jzN(per) + ',k=Math.min(n-1,Math.floor(t/per)),A=' + axq_n(axq_p(P, 'dir', 1)) + '*' + axq_n(axq_p(P, 'a', 2.4)) + '*KM,' +
            'e=ob((t-k*per)/0.14,2.2);function ps(i){return -A+2*A*i/(n-1);}',
            rot: 'k>0?ps(k-1)+(ps(k)-ps(k-1))*e:ps(0)', s: '1.03' });
    }
});

// ================================================================ TRANSITIONS
function axq_acc(t, second) {                                     // tAcc: an accent that reads against both backgrounds
    var sc = t.sc, pb = (t.scPrev || sc).bg;
    var list = second ? [sc.accent2, sc.accent, sc.fg] : [sc.accent, sc.accent2, sc.fg];
    for (var i = 0; i < list.length; i++) if (list[i] && jzContrast(list[i], sc.bg) >= 1.8 && jzContrast(list[i], pb) >= 1.4) return list[i];
    return sc.fg;
}
function axq_md(t) { return Math.min(t.W, t.H); }                 // minD
function axq_lw(t, k) { return Math.max(2, axq_md(t) * k); }      // lwOf
// expression header: T0, TD, p + easings (JZ_FNS, ioc inOutCubic, ios inOutSine, sm smoothstep, bell)
function axq_hd(t) {
    return jzEvHead(t.t0, t.dur) + jzBellExpr() + AXQ_IOC + AXQ_IOS + 'function sm(a,b,x){x=cl((x-a)/(b-a));return x*x*(3-2*x);}\n';
}
// compact header for expressions repeated on many layers / groups
function axq_hs(t) { return 'var T0=' + jzN(t.t0) + ',TD=' + jzN(Math.max(1 / 240, t.dur)) + ';function cl(x){return Math.max(0,Math.min(1,x));}var p=cl((time-T0)/TD);'; }
// Transform effect driven by the transition. o: anc [x,y] pivot (layer px) · pos [dxExpr, dyExpr] · sc factor · sw / sh factors
// (non-uniform) · rot degrees · op 0..1 — all expressions relative to the effect's own values
function axq_xf(L, name, HD, o) {
    var e = jzEffect(L, 'ADBE Geometry2', name);
    if (!e) return null;
    if (o.anc) { jzEP(e, 1, o.anc); jzEP(e, 2, o.anc); }
    if (o.pos) jzEX(e, 2, HD + '[value[0]+(' + o.pos[0] + '),value[1]+(' + o.pos[1] + ')]');
    if (o.sw || o.sh) { jzEP(e, 3, 0); jzEX(e, 4, HD + 'value*(' + (o.sh || '1') + ')'); jzEX(e, 5, HD + 'value*(' + (o.sw || '1') + ')'); }
    else if (o.sc) jzEX(e, 4, HD + 'value*(' + o.sc + ')');
    if (o.rot) jzEX(e, 8, HD + 'value+(' + o.rot + ')');
    if (o.op) jzEX(e, 9, HD + 'value*cl(' + o.op + ')');
    return e;
}
// a copy of wrapper layer L living only during the transition, directly above B (each later copy lands below the earlier ones)
function axq_copy(t, L, name) {
    var C = L.duplicate();
    C.name = name;
    C.moveBefore(t.B);
    C.inPoint = t.t0; C.outPoint = t.t0 + t.dur;
    return C;
}
function axq_solid(t, hex, name, opEx) {
    var S = jzEvSolid(t.comp, name, hex, t.t0, t.dur);
    if (opEx) jzSetExpr(jzXf(S, 'ADBE Opacity'), opEx);
    return S;
}
// polygon mask in layer px. The first mask added here intersects with masks the layer may already carry; `add` = a further
// region of the same cut-out (the wrappers carry no masks of their own, so two band masks simply add up)
function axq_maskPoly(L, pts, add) {
    var mp = L.property('ADBE Mask Parade'), first = mp.numProperties === 0;
    var m = mp.addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = pts; sh.closed = true;
    m.property('ADBE Mask Shape').setValue(sh);
    if (!first) { try { m.maskMode = add ? MaskMode.ADD : MaskMode.INTERSECT; } catch (e) {} }
    return m;
}
function axq_mask(L, x0, y0, x1, y1, add) { return axq_maskPoly(L, [[x1, y0], [x1, y1], [x0, y1], [x0, y0]], add); }
// M becomes the track matte of L (placed directly above it, switched off)
function axq_matte(M, L, type) { M.moveBefore(L); L.trackMatteType = type; M.enabled = false; }
// regular polygon (polystar, type polygon) whose radius / rotation are expressions; canvas angle 0 = AE rotation 90
function axq_poly(g, n, radEx, rotEx) {
    var s = jzVecs(g).addProperty('ADBE Vector Shape - Star');
    s.property('ADBE Vector Star Type').setValue(2);
    s.property('ADBE Vector Star Points').setValue(n);
    jzSetExpr(s.property('ADBE Vector Star Outer Radius'), radEx);
    jzSetExpr(s.property('ADBE Vector Star Rotation'), rotEx);
    return s;
}
// Linear Wipe that keeps the half of the layer on the side its unit normal (nx, ny) points to; cEx = completion 0..100
// (the hidden part grows from the opposite side — same angle convention as diagonalWipe in ae/p_trans.jsx)
function axq_wipe(L, name, nx, ny, cEx, feather) {
    var lw = jzEffect(L, 'ADBE Linear Wipe', name), ang = Math.atan2(nx, -ny) * 180 / Math.PI;
    if (ang < 0) ang += 360;
    jzEP(lw, 2, ang); jzEP(lw, 3, feather || 0);
    jzEX(lw, 1, cEx);
    return lw;
}
// soft black strip: a long rect in the layer's own frame (x0..x1 across, `len` along y), blurred (shape layers are transformed
// before their effects, so the blur stays even when the layer is rotated)
function axq_soft(t, name, x0, x1, len, blur) {
    var S = jzEvShape(t.comp, name, t.t0, t.dur), g = jzGrp(S, 'shade');
    jzAddRect(g, Math.abs(x1 - x0), len, 0, (x0 + x1) / 2, 0);
    jzAddFill(g, '#000000');
    var b = jzEffect(S, 'ADBE Gaussian Blur 2', 'JZ Trans soft'); jzEP(b, 1, blur); jzEP(b, 3, 0);
    return S;
}

/* ---- xqBladeRun — 斜め刃走り: the new cut runs down parallel diagonal lanes, neighbouring lanes in opposite directions */
jzReg('trans', 'xqBladeRun', {
    plan: function (rng, st) { return { n: rng.int(5, 8), ang: rng.pick([-32, -24, 24, 32, 58, -58]), mid: rng.chance(0.5) }; },
    build: function (t) {
        var W = t.W, H = t.H, n = Math.max(2, Math.round(t.P.n || 6)), ang = t.P.ang || 30, mid = !!t.P.mid;
        var R = Math.sqrt(W * W + H * H) + 4, hb = R / n, lw = axq_lw(t, 0.005), ac = axq_acc(t), HS = axq_hs(t) + AXQ_IOC;
        // the old cut stays on top (copy); a matte of growing lanes (in a frame turned by `ang` about the centre) cuts it away
        var C = axq_copy(t, t.A, 'JZ Trans blades (prev cut)');
        var M = jzEvShape(t.comp, 'JZ Trans blades matte', t.t0, t.dur), Ln = jzEvShape(t.comp, 'JZ Trans blade tips', t.t0, t.dur);
        for (var i = 0; i < n; i++) {
            var o = mid ? Math.abs(i - (n - 1) / 2) / Math.max(1, (n - 1) / 2) : i / Math.max(1, n - 1);
            var Q = HS + 'var q=ioc(p*1.5-' + jzN(o * 0.5) + ');', yc = -R / 2 + i * hb + hb / 2, odd = i % 2, ax = odd ? R / 2 : -R / 2;
            var g = jzGrp(M, 'lane ' + (i + 1));
            jzAddRect(g, R, hb + 1.2, 0, 0, yc); jzAddFill(g, '#FFFFFF');
            var gx = jzGX(g);
            gx.property('ADBE Vector Anchor').setValue([ax, yc]); gx.property('ADBE Vector Position').setValue([ax, yc]);
            jzSetExpr(gx.property('ADBE Vector Scale'), Q + '[100*q,100]');
            // accent tip on the leading end of the lane
            var gl = jzGrp(Ln, 'tip ' + (i + 1));
            jzAddRect(gl, lw, hb, 0, 0, yc); jzAddFill(gl, ac);
            jzSetExpr(jzGX(gl).property('ADBE Vector Position'), Q + (odd ? '[' + jzN(R / 2 - lw / 2) + '-' + jzN(R) + '*q,0]' : '[' + jzN(-R / 2 + lw / 2) + '+' + jzN(R) + '*q,0]'));
            jzSetExpr(jzGX(gl).property('ADBE Vector Group Opacity'), Q + '(q>0&&q<1)?100*Math.min(1,(1-q)*3):0');
        }
        jzXf(M, 'ADBE Position').setValue([W / 2, H / 2]); jzXf(M, 'ADBE Rotate Z').setValue(ang);
        jzXf(Ln, 'ADBE Position').setValue([W / 2, H / 2]); jzXf(Ln, 'ADBE Rotate Z').setValue(ang);
        axq_matte(M, C, TrackMatteType.ALPHA_INVERTED);
    }
});

/* ---- xqPropeller — プロペラ: several wedges open at once round the centre while the whole rotor turns */
jzReg('trans', 'xqPropeller', {
    plan: function (rng, st) { return { n: rng.int(3, 5), dir: rng.pick([1, -1]), a0: rng.range(0, 360), x: 0.5 + rng.range(-0.08, 0.08), y: 0.5 + rng.range(-0.06, 0.06) }; },
    build: function (t) {
        var W = t.W, H = t.H, n = Math.max(2, Math.round(t.P.n || 4)), d = t.P.dir < 0 ? -1 : 1, a0 = t.P.a0 || 0;
        var cx = W * (t.P.x || 0.5), cy = H * (t.P.y || 0.5), lw = axq_lw(t, 0.005), ac = axq_acc(t), i;
        var R = Math.sqrt(Math.pow(Math.max(cx, W - cx), 2) + Math.pow(Math.max(cy, H - cy), 2)) + 4;
        // sw = wedge angle in degrees (the browser's e * TAU / n + 0.004 rad), tn = the rotor's turn (0.9 rad over the transition)
        var HD = axq_hd(t) + 'var e=ioc(p),sw=e*' + jzN(360 / n) + '+0.2292,tn=' + jzN(d * 0.9 * 180 / Math.PI) + '*e;';
        var C = axq_copy(t, t.A, 'JZ Trans propeller (prev cut)');
        // wedge = a circle of radius R/2 stroked R wide (a full disc) cut down by Trim Paths; the ellipse path starts at 12 o'clock
        var M = jzEvShape(t.comp, 'JZ Trans propeller matte', t.t0, t.dur);
        for (i = 0; i < n; i++) {
            var g = jzGrp(M, 'wedge ' + (i + 1));
            jzAddEllipse(g, R, R, 0, 0);
            jzAddStroke(g, '#FFFFFF', R);
            if (d > 0) jzAddTrimPaths(g, HD + 'sw/3.6', null); else jzAddTrimPaths(g, null, HD + '100-sw/3.6');
            jzGX(g).property('ADBE Vector Rotation').setValue(i * 360 / n);
        }
        jzXf(M, 'ADBE Position').setValue([cx, cy]);
        jzSetExpr(jzXf(M, 'ADBE Rotate Z'), HD + jzN(a0 + 90) + '+tn');
        // an accent blade on the leading edge of every wedge
        var S = jzEvShape(t.comp, 'JZ Trans propeller blades', t.t0, t.dur);
        for (i = 0; i < n; i++) {
            var gb = jzGrp(S, 'blade ' + (i + 1));
            jzAddPath(gb, [[0, 0], [R, 0]], false);
            var sk = jzAddStroke(gb, ac, lw); sk.property('ADBE Vector Stroke Line Cap').setValue(2);
            jzGX(gb).property('ADBE Vector Rotation').setValue(i * 360 / n);
        }
        jzXf(S, 'ADBE Position').setValue([cx, cy]);
        jzSetExpr(jzXf(S, 'ADBE Rotate Z'), HD + jzN(a0) + '+tn+' + jzN(d) + '*sw');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + '100*Math.pow(bell(p),0.5)');
        axq_matte(M, C, TrackMatteType.ALPHA_INVERTED);
    }
});

/* ---- xqPolyIris — 多角アイリス: a triangle / square / hexagon window turns as it opens */
jzReg('trans', 'xqPolyIris', {
    plan: function (rng, st) { return { n: rng.pick([3, 4, 4, 6]), spin: rng.range(50, 110) * rng.pick([1, -1]), a0: rng.pick([0, 45, 90, 30]) }; },
    build: function (t) {
        var W = t.W, H = t.H, n = Math.max(3, Math.round(t.P.n || 4)), lw = axq_lw(t, 0.008);
        var R = (Math.sqrt(W * W + H * H) / 2 + 4) / Math.cos(Math.PI / n);
        var HD = axq_hd(t) + 'var e=' + (n === 3 ? 'ic(p)*0.5+ioc(p)*0.5' : 'ioc(p)') + ',r=' + jzN(R) + '*e,ro=' + jzN((t.P.a0 || 0) + 90) + '+' + jzN(t.P.spin || 80) + '*(1-e);';
        var C = axq_copy(t, t.A, 'JZ Trans iris (prev cut)');
        var M = jzEvShape(t.comp, 'JZ Trans iris matte', t.t0, t.dur), gm = jzGrp(M, 'window');
        axq_poly(gm, n, HD + 'r', HD + 'ro'); jzAddFill(gm, '#FFFFFF');
        jzXf(M, 'ADBE Position').setValue([W / 2, H / 2]);
        // rim + a thin outer polygon (each polygon is configured before its stroke / the next group is added)
        var S = jzEvShape(t.comp, 'JZ Trans iris rim', t.t0, t.dur);
        var g2 = jzGrp(S, 'outer'); axq_poly(g2, n, HD + 'r*1.12+' + jzN(lw * 3), HD + 'ro'); jzAddStroke(g2, axq_acc(t, true), Math.max(1, lw * 0.4), 55);
        var g1 = jzGrp(S, 'rim'); axq_poly(g1, n, HD + 'r', HD + 'ro'); jzAddStroke(g1, axq_acc(t), lw);
        jzXf(S, 'ADBE Position').setValue([W / 2, H / 2]);
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + 'r<0.5?0:100*Math.pow(bell(p),0.6)');
        axq_matte(M, C, TrackMatteType.ALPHA_INVERTED);
    }
});

/* ---- xqRingRipple — 同心リング: concentric bands, each one widening outwards, the inner ones first */
jzReg('trans', 'xqRingRipple', {
    plan: function (rng, st) { return { n: rng.int(4, 7), x: rng.pick([0.5, 0.5, 0.2, 0.8]), y: rng.pick([0.5, 0.5, 0.3, 0.75]), inw: rng.chance(0.3) }; },
    build: function (t) {
        var W = t.W, H = t.H, n = Math.max(2, Math.round(t.P.n || 5)), inw = !!t.P.inw, cx = W * (t.P.x == null ? 0.5 : t.P.x), cy = H * (t.P.y == null ? 0.5 : t.P.y);
        var R = Math.sqrt(Math.pow(Math.max(cx, W - cx), 2) + Math.pow(Math.max(cy, H - cy), 2)) + 4, bw = R / n, lw = axq_lw(t, 0.004), ac = axq_acc(t);
        var HS = axq_hs(t) + AXQ_IOC;
        var C = axq_copy(t, t.A, 'JZ Trans rings (prev cut)');
        // band j = a circle half-way between its inner and outer radius, stroked as wide as the band
        var M = jzEvShape(t.comp, 'JZ Trans rings matte', t.t0, t.dur), Ln = jzEvShape(t.comp, 'JZ Trans ring edges', t.t0, t.dur);
        for (var j = 0; j < n; j++) {
            var o = (inw ? n - 1 - j : j) / Math.max(1, n - 1);
            var Q = HS + 'var q=ioc(p*1.6-' + jzN(o * 0.6) + '),r0=' + jzN(Math.max(0, j * bw - 0.8)) + ',r1=' + jzN(j * bw) + '+' + jzN(bw) + '*q;';
            var g = jzGrp(M, 'band ' + (j + 1)), el = jzAddEllipse(g, 10, 10, 0, 0);
            jzSetExpr(el.property('ADBE Vector Ellipse Size'), Q + 'var d=r0+r1;[d,d]');
            var sk = jzAddStroke(g, '#FFFFFF', 1);
            jzSetExpr(sk.property('ADBE Vector Stroke Width'), Q + 'q>0?r1-r0:0');
            var ge = jzGrp(Ln, 'edge ' + (j + 1)), ee = jzAddEllipse(ge, 10, 10, 0, 0);
            jzSetExpr(ee.property('ADBE Vector Ellipse Size'), Q + '[2*r1,2*r1]');
            jzAddStroke(ge, ac, lw);
            jzSetExpr(jzGX(ge).property('ADBE Vector Group Opacity'), Q + '(q>0&&q<1)?100*Math.min(1,(1-q)*2.5)*Math.min(1,q*6):0');
        }
        jzXf(M, 'ADBE Position').setValue([cx, cy]); jzXf(Ln, 'ADBE Position').setValue([cx, cy]);
        axq_matte(M, C, TrackMatteType.ALPHA_INVERTED);
    }
});

/* ---- xqLouverTurn — ルーバー: the old cut is cut into slats that turn edge-on (each squeezes to its own centre line) */
jzReg('trans', 'xqLouverTurn', {
    plan: function (rng, st) { return { n: rng.int(7, 12), vert: rng.chance(0.4), rev: rng.chance(0.5) }; },
    build: function (t) {
        var W = t.W, H = t.H, n = Math.max(2, Math.round(t.P.n || 9)), v = !!t.P.vert, rev = !!t.P.rev, Lx = v ? W : H;
        var lw = Math.max(1, axq_lw(t, 0.0025)), ac = axq_acc(t), HS = axq_hs(t) + AXQ_IOC;
        var Ln = jzEvShape(t.comp, 'JZ Trans louver edges', t.t0, t.dur);
        // one masked copy of the old cut per slat: Fill = the shade as it turns away, Transform = the squeeze to its centre line
        for (var i = 0; i < n; i++) {
            var a0 = Math.round(i * Lx / n), a1 = Math.round((i + 1) * Lx / n), mc = (a0 + a1) / 2;
            var Q = HS + 'var q=ioc((p-' + jzN((rev ? n - 1 - i : i) / n * 0.4) + ')/0.6),f=Math.cos(q*Math.PI/2);';
            var C = axq_copy(t, t.A, 'JZ Trans louver ' + (i + 1));
            if (v) axq_mask(C, a0, 0, a1, H); else axq_mask(C, 0, a0, W, a1);
            var sh = jzEffect(C, 'ADBE Fill', 'JZ Trans louver shade'); jzEP(sh, 3, [0, 0, 0]);
            jzEX(sh, 7, Q + '0.55*q');
            var e = jzEffect(C, 'ADBE Geometry2', 'JZ Trans louver turn'), pv = v ? [mc, H / 2] : [W / 2, mc];
            jzEP(e, 1, pv); jzEP(e, 2, pv); jzEP(e, 3, 0);
            jzEX(e, v ? 5 : 4, Q + '100*f');
            jzEX(e, 9, Q + 'f<=0.004?0:100');
            // accent line on the slat's leading edge
            var g = jzGrp(Ln, 'edge ' + (i + 1));
            if (v) jzAddRect(g, lw, H, 0, 0, H / 2); else jzAddRect(g, W, lw, 0, W / 2, 0);
            jzAddFill(g, ac);
            var m = jzN(mc + lw / 2) + '-' + jzN((a1 - a0) / 2) + '*f';
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), Q + (v ? '[' + m + ',0]' : '[0,' + m + ']'));
            jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), Q + '(q>0&&f>0.004)?100*Math.min(1,q*4)*f:0');
        }
        var Dk = axq_solid(t, '#000000', 'JZ Trans louver dim', axq_hd(t) + '35*(1-ioc(p))'); Dk.moveBefore(t.B);
    }
});

/* ---- xqHalftone — 網点ワイプ: a screen of dots swells across the frame until the dots merge into the new cut */
jzReg('trans', 'xqHalftone', {
    plan: function (rng, st) { return { n: rng.int(6, 9), dir: rng.pick(['L', 'R', 'U', 'D', 'C', 'X']) }; },
    build: function (t) {
        var W = t.W, H = t.H, cell = axq_md(t) / Math.max(2, t.P.n || 7), d = t.P.dir || 'L', rm = cell * 0.62;
        var cols = Math.ceil(W / cell) + 1, rows = Math.ceil(H / (cell * 0.866)) + 1, HS = axq_hs(t);
        var C = axq_copy(t, t.A, 'JZ Trans halftone (prev cut)');
        // matte: one ellipse per dot of the staggered screen (dots that never reach the frame are left out)
        var M = jzEvShape(t.comp, 'JZ Trans halftone matte', t.t0, t.dur), g = jzGrp(M, 'dots');
        for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
            var x = (i + (j % 2 ? 0.5 : 0)) * cell - cell * 0.25, y = j * cell * 0.866, fx = jzClamp(x / W, 0, 1), fy = jzClamp(y / H, 0, 1);
            if (x + rm < 0 || x - rm > W || y + rm < 0 || y - rm > H) continue;
            var o = d === 'R' ? fx : d === 'L' ? 1 - fx : d === 'D' ? fy : d === 'U' ? 1 - fy :
                d === 'C' ? Math.min(1, Math.sqrt((fx - 0.5) * (fx - 0.5) + (fy - 0.5) * (fy - 0.5)) * 1.42) : (fx + fy) / 2;
            var el = jzAddEllipse(g, 10, 10, x, y);    // (configured before the next one is added)
            jzSetExpr(el.property('ADBE Vector Ellipse Size'), HS + 'var d=' + jzN(rm) + '*(1-Math.cos(Math.PI*cl((p-' + jzN(o * 0.55) + ')/0.45)));[d,d]');
        }
        jzAddFill(g, '#FFFFFF');
        axq_matte(M, C, TrackMatteType.ALPHA_INVERTED);
    }
});

/* ---- xqChevronPush — くの字押し: thin bands push the old cut out one after another, so the seam travels as an arrow head */
jzReg('trans', 'xqChevronPush', {
    plan: function (rng, st) { return { dir: rng.pick(['L', 'L', 'R', 'R', 'U', 'D']), n: rng.pick([14, 18, 24]), inv: rng.chance(0.35) }; },
    build: function (t) {
        var W = t.W, H = t.H, n = Math.max(2, Math.round(t.P.n || 18)), dir = t.P.dir, inv = !!t.P.inv;
        var hor = dir !== 'U' && dir !== 'D', sg = (dir === 'R' || dir === 'D') ? 1 : -1, Lx = hor ? H : W, Mx = hor ? W : H;
        var lw = axq_lw(t, 0.004), ac = axq_acc(t), HS = axq_hs(t) + AXQ_IOC, S = jzEvShape(t.comp, 'JZ Trans chevron seam', t.t0, t.dur);
        // bands i and n-1-i move together (same distance from the middle): one copy of each cut with both bands masked in
        for (var i = 0; i < Math.ceil(n / 2); i++) {
            var c = Math.abs(i - (n - 1) / 2) / Math.max(0.5, (n - 1) / 2), bands = [i], b, q;
            if (n - 1 - i !== i) bands.push(n - 1 - i);
            var O = HS + 'var q=ioc((p-' + jzN(0.34 * (inv ? 1 - c : c)) + ')/0.66),o=Math.round(q*' + jzN(Mx) + ')*' + jzN(sg) + ';';
            var pr = [[t.A, 'o', 'A'], [t.B, 'o-' + jzN(sg * Mx), 'B']];
            for (q = 0; q < 2; q++) {
                var C = axq_copy(t, pr[q][0], 'JZ Trans chevron ' + pr[q][2] + (i + 1));
                for (b = 0; b < bands.length; b++) {
                    var a0 = Math.round(bands[b] * Lx / n), a1 = Math.round((bands[b] + 1) * Lx / n);
                    if (hor) axq_mask(C, 0, a0, W, a1, b > 0); else axq_mask(C, a0, 0, a1, H, b > 0);
                }
                axq_xf(C, 'JZ Trans chevron push', O, { pos: hor ? [pr[q][1], '0'] : ['0', pr[q][1]] });
            }
            // accent seam of the two bands
            var g = jzGrp(S, 'seam ' + (i + 1));
            for (b = 0; b < bands.length; b++) {
                var s0 = Math.round(bands[b] * Lx / n), s1 = Math.round((bands[b] + 1) * Lx / n);
                if (hor) jzAddRect(g, lw, s1 - s0, 0, 0, (s0 + s1) / 2); else jzAddRect(g, s1 - s0, lw, 0, (s0 + s1) / 2, 0);
            }
            jzAddFill(g, ac);
            var sq = sg < 0 ? jzN(Mx) + '+o' : 'o';
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), O + (hor ? '[' + sq + ',0]' : '[0,' + sq + ']'));
            jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), O + '(q>0&&q<1)?100:0');
        }
        jzSetExpr(jzXf(S, 'ADBE Opacity'), axq_hd(t) + '100*Math.pow(bell(p),0.6)');
    }
});

/* ---- xqDiagSplit — 斜め割り: the old cut is cut along a slanted line and the two pieces part at right angles to it */
jzReg('trans', 'xqDiagSplit', {
    plan: function (rng, st) { return { ang: rng.pick([28, 38, 52, -28, -38, -52, 142, 128]) }; },
    build: function (t) {
        var W = t.W, H = t.H, a = (t.P.ang || 35) * AXQ_DEG, nx = Math.cos(a), ny = Math.sin(a), L = (W + H) * 2, lw = axq_lw(t, 0.005);
        var dist = (Math.abs(nx) * W + Math.abs(ny) * H) / 2 + 4, HD = axq_hd(t) + 'var e=ioc(p),off=e*' + jzN(dist) + ';';
        var S = jzEvShape(t.comp, 'JZ Trans split edges', t.t0, t.dur), sgs = [1, -1];
        for (var k = 0; k < 2; k++) {
            var sg = sgs[k], qx = W / 2 - nx * sg * 0.75, qy = H / 2 - ny * sg * 0.75;     // (the halves overlap by 1.5 px: no seam before they part)
            var C = axq_copy(t, t.A, 'JZ Trans split piece ' + (k + 1));
            axq_maskPoly(C, [[qx - ny * L, qy + nx * L], [qx + ny * L, qy - nx * L], [qx + ny * L + nx * sg * L, qy - nx * L + ny * sg * L], [qx - ny * L + nx * sg * L, qy + nx * L + ny * sg * L]]);
            axq_xf(C, 'JZ Trans split', HD, { pos: [jzN(nx * sg) + '*off', jzN(ny * sg) + '*off'] });
            // accent line on the cut edge of this piece
            var g = jzGrp(S, 'edge ' + (k + 1));
            jzAddPath(g, [[-ny * L, nx * L], [ny * L, -nx * L]], false);
            jzAddStroke(g, axq_acc(t, sg < 0), lw);
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), HD + '[' + jzN(W / 2) + '+' + jzN(nx * sg) + '*off,' + jzN(H / 2) + '+' + jzN(ny * sg) + '*off]');
        }
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + '100*Math.pow(bell(p),0.5)');
        // behind the pieces: the new cut settles from 106 %, dimmed at first
        var Dk = axq_solid(t, '#000000', 'JZ Trans split dim', HD + '40*(1-e)'); Dk.moveBefore(t.B);
        axq_xf(t.B, 'JZ Trans in xqDiagSplit', HD, { sc: '1.06-0.06*oc(p)' });
    }
});

/* ---- xqAccordion — 蛇腹たたみ: the old cut folds up into pleats against one edge */
jzReg('trans', 'xqAccordion', {
    plan: function (rng, st) { return { n: rng.pick([6, 8, 10]), dir: rng.pick(['L', 'R', 'L', 'R', 'U']) }; },
    build: function (t) {
        var W = t.W, H = t.H, n = Math.max(2, Math.round(t.P.n || 8)), v = t.P.dir === 'U', toEnd = t.P.dir === 'R', Lx = v ? H : W, lw = axq_lw(t, 0.005);
        var HD = axq_hd(t) + 'var e=ioc(p),k=1-e,po=' + jzN((toEnd ? -1 : 1) * Lx * 0.05) + '*k;';
        var edge = toEnd ? Lx : 0, pv = v ? [W / 2, edge] : [edge, H / 2];
        // the n pleats all shrink by the same factor towards the edge = the whole old cut squeezed against it …
        var C = axq_copy(t, t.A, 'JZ Trans accordion (prev cut)');
        axq_xf(C, 'JZ Trans accordion fold', HD, v ? { anc: pv, sh: 'k' } : { anc: pv, sw: 'k' });
        // … under alternating dark / light pleat faces squeezed with it
        var Sh = jzEvShape(t.comp, 'JZ Trans accordion pleats', t.t0, t.dur);
        for (var i = 0; i < n; i++) {
            var s0 = Math.round(i * Lx / n), s1 = Math.round((i + 1) * Lx / n), g = jzGrp(Sh, 'pleat ' + (i + 1));
            if (v) jzAddRect(g, W, s1 - s0, 0, W / 2, (s0 + s1) / 2); else jzAddRect(g, s1 - s0, H, 0, (s0 + s1) / 2, H / 2);
            jzAddFill(g, i % 2 ? '#000000' : '#FFFFFF', i % 2 ? 42 : 10);
        }
        var ep = v ? [0, edge] : [edge, 0];
        jzXf(Sh, 'ADBE Anchor Point').setValue(ep); jzXf(Sh, 'ADBE Position').setValue(ep);
        jzSetExpr(jzXf(Sh, 'ADBE Scale'), HD + (v ? '[100,100*k]' : '[100*k,100]'));
        jzSetExpr(jzXf(Sh, 'ADBE Opacity'), HD + '100*cl(e*3)');
        // the new cut underneath drifts into place, dimmed at first
        axq_xf(t.B, 'JZ Trans in xqAccordion', HD, { pos: v ? ['0', 'po'] : ['po', '0'] });
        var Dk = axq_solid(t, '#000000', 'JZ Trans accordion dim', HD + '35*k'); Dk.moveBefore(t.B);
        // accent bar on the free edge of the folded stack
        var S = jzEvShape(t.comp, 'JZ Trans accordion edge', t.t0, t.dur), gb = jzGrp(S, 'edge');
        if (v) jzAddRect(gb, W, lw, 0, W / 2, lw / 2); else jzAddRect(gb, lw, H, 0, lw / 2, H / 2);
        jzAddFill(gb, axq_acc(t));
        var q = toEnd ? jzN(Lx - lw) + '-' + jzN(Lx) + '*k' : jzN(Lx) + '*k';
        jzSetExpr(jzXf(S, 'ADBE Position'), HD + (v ? '[0,' + q + ']' : '[' + q + ',0]'));
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + 'k<0.002?0:100*Math.pow(bell(p),0.6)');
    }
});

/* ---- xqStripShuffle — 短冊シャッフル: tall strips lift, trade places like shuffled cards, and come home carrying the new cut */
jzReg('trans', 'xqStripShuffle', {
    plan: function (rng, st) { return { n: rng.int(4, 7), k: rng.int(1, 5) }; },
    build: function (t) {
        var W = t.W, H = t.H, n = Math.max(2, Math.round(t.P.n || 5)), k = 1 + ((t.P.k || 1) % Math.max(1, n - 1)), sh = axq_md(t) * 0.012;
        var HS = axq_hs(t) + 'function sm(a,b,x){x=cl((x-a)/(b-a));return x*x*(3-2*x);}var m=0.5-0.5*Math.cos(2*Math.PI*p),xf=sm(0.4,0.6,p);';
        // per strip, top to bottom: the new cut (fading in mid-way) / the old cut / its shadow. Built from the top of the stack
        // down: odd strips lie over even ones, later strips over earlier ones
        for (var pass = 1; pass >= 0; pass--) for (var i = n - 1; i >= 0; i--) {
            if ((i % 2) !== pass) continue;
            var x0 = Math.round(i * W / n), x1 = Math.round((i + 1) * W / n), w = x1 - x0, tx = Math.round(((n - 1 - i + k) % n) * W / n);
            var D = HS + 'var dx=Math.round(' + jzN(tx - x0) + '*m),dy=Math.round(' + jzN((pass ? -1 : 1) * H * 0.04) + '*m);';
            var Bc = axq_copy(t, t.B, 'JZ Trans shuffle B' + (i + 1));
            axq_mask(Bc, x0, 0, x1, H); axq_xf(Bc, 'JZ Trans shuffle', D, { pos: ['dx', 'dy'] });
            jzSetExpr(jzXf(Bc, 'ADBE Opacity'), HS + 'value*xf');
            var Ac = axq_copy(t, t.A, 'JZ Trans shuffle A' + (i + 1));
            axq_mask(Ac, x0, 0, x1, H); axq_xf(Ac, 'JZ Trans shuffle', D, { pos: ['dx', 'dy'] });
            jzSetExpr(jzXf(Ac, 'ADBE Opacity'), HS + 'xf<1?value:0');
            var Sd = jzEvShape(t.comp, 'JZ Trans shuffle shadow ' + (i + 1), t.t0, t.dur), g = jzGrp(Sd, 'shadow');
            jzAddRect(g, w + sh * 2, H, 0, x0 + w / 2, H / 2); jzAddFill(g, '#000000');
            jzSetExpr(jzXf(Sd, 'ADBE Position'), D + '[dx,dy]');
            jzSetExpr(jzXf(Sd, 'ADBE Opacity'), HS + '35*m');
            Sd.moveBefore(t.B);
        }
        // the table under the strips: both backgrounds darkened, cross-fading
        var S2 = axq_solid(t, jzMixHex(t.sc.bg, '#000000', 0.55), 'JZ Trans shuffle back 2', axq_hd(t) + '100*p'); S2.moveBefore(t.B);
        var S1 = axq_solid(t, jzMixHex((t.scPrev || t.sc).bg, '#000000', 0.55), 'JZ Trans shuffle back'); S1.moveBefore(t.B);
    }
});

/* ---- xqWindowZoom — 窓ズーム: the new cut arrives as a small framed picture that grows until it fills the screen */
jzReg('trans', 'xqWindowZoom', {
    plan: function (rng, st) { return { x: rng.pick([0.5, 0.5, 0.3, 0.7]), y: rng.pick([0.5, 0.5, 0.4, 0.62]), r: rng.range(-7, 7) }; },
    build: function (t) {
        var W = t.W, H = t.H, x0 = W * (t.P.x == null ? 0.5 : t.P.x), y0 = H * (t.P.y == null ? 0.5 : t.P.y), lw = axq_lw(t, 0.007), so = axq_md(t) * 0.02;
        var HD = axq_hd(t) + 'var e=ioc(p),cx=' + jzN(x0) + '+' + jzN(W / 2 - x0) + '*e,cy=' + jzN(y0) + '+' + jzN(H / 2 - y0) + '*e,ro=' + jzN(t.P.r || 0) + '*(1-e),' +
            'lw=' + jzN(lw) + '*(1-sm(0.75,1,p));';
        // the old cut pushes in and dims; the new one is the picture (Transform about the centre: place, size, tilt)
        axq_xf(t.A, 'JZ Trans out xqWindowZoom', HD, { sc: '1+0.18*e' });
        axq_xf(t.B, 'JZ Trans in xqWindowZoom', HD, { anc: [W / 2, H / 2], pos: ['cx-' + jzN(W / 2), 'cy-' + jzN(H / 2)], sc: 'e', rot: 'ro' });
        var Dk = axq_solid(t, '#000000', 'JZ Trans window dim', HD + '45*oc(p)'); Dk.moveAfter(t.B);
        // the picture's shadow (under it) and accent frame (over it)
        var Sh = jzEvShape(t.comp, 'JZ Trans window shadow', t.t0, t.dur), gs = jzGrp(Sh, 'shadow');
        jzAddRect(gs, W, H, 0); jzAddFill(gs, '#000000');
        jzSetExpr(jzXf(Sh, 'ADBE Position'), HD + 'var a=ro*Math.PI/180,so=' + jzN(so) + '*(1-e);[cx+so*(Math.cos(a)-Math.sin(a)),cy+so*(Math.sin(a)+Math.cos(a))]');
        jzSetExpr(jzXf(Sh, 'ADBE Scale'), HD + '[100*e,100*e]');
        jzSetExpr(jzXf(Sh, 'ADBE Rotate Z'), HD + 'ro');
        jzSetExpr(jzXf(Sh, 'ADBE Opacity'), HD + '40*(1-e)');
        Sh.moveAfter(t.B);
        var S = jzEvShape(t.comp, 'JZ Trans window frame', t.t0, t.dur), g = jzGrp(S, 'frame'), r = jzAddRect(g, W, H, 0);
        jzSetExpr(r.property('ADBE Vector Rect Size'), HD + '[' + jzN(W) + '*e+lw,' + jzN(H) + '*e+lw]');     // (before the stroke is added)
        var sk = jzAddStroke(g, axq_acc(t), lw);
        jzSetExpr(sk.property('ADBE Vector Stroke Width'), HD + 'lw');
        jzSetExpr(jzXf(S, 'ADBE Position'), HD + '[cx,cy]');
        jzSetExpr(jzXf(S, 'ADBE Rotate Z'), HD + 'ro');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + '(lw>0.3&&e>=0.004)?100:0');
    }
});

/* ---- xqSoftSweep — 流しディゾルブ: a dissolve with a direction — a wide feathered edge crosses the frame */
jzReg('trans', 'xqSoftSweep', {
    plan: function (rng, st) { return { ang: rng.pick([0, 180, 0, 180, 90, -90, 30, 150, -30, -150]), f: rng.range(0.3, 0.5) }; },
    build: function (t) {
        var a = (t.P.ang || 0) * AXQ_DEG, dx = Math.cos(a), dy = Math.sin(a), D = Math.abs(dx) * t.W + Math.abs(dy) * t.H;
        // the new cut is kept behind the travelling edge (normal -d), with the browser's feather width
        axq_wipe(t.B, 'JZ Trans xqSoftSweep', -dx, -dy, axq_hd(t) + '100*(1-ios(p))', D * (t.P.f || 0.4));
    }
});

/* ---- xqLightLeak — 光漏れ: soft patches of the scheme's accent colours bloom across the frame and carry the dissolve */
jzReg('trans', 'xqLightLeak', {
    plan: function (rng, st) { return { dir: rng.pick([1, -1]), y: rng.range(0.2, 0.8), s0: rng.int(0, 99) }; },
    build: function (t) {
        var W = t.W, H = t.H, sc = t.sc, pb = (t.scPrev || sc).bg, d = t.P.dir < 0 ? -1 : 1, s0 = ((t.P.s0 || 0) | 0) + 3, md = Math.round(axq_md(t)), y0 = t.P.y || 0.5;
        var light = jzLum(sc.bg) > 0.6 && jzLum(pb) > 0.6, HD = axq_hd(t) + 'var a=Math.pow(bell(p),0.8);';
        var cols = [sc.accent, sc.accent2 || sc.accent, jzMixHex(sc.accent, light ? (sc.accent2 || sc.fg) : '#FFFFFF', 0.55)];
        // cross-dissolve: the old cut (a copy on top) fades out between p .30 and .70
        var C = axq_copy(t, t.A, 'JZ Trans leak (prev cut)');
        jzSetExpr(jzXf(C, 'ADBE Opacity'), HD + 'value*(1-sm(0.3,0.7,p))');
        // three soft blobs (square solid, feathered round mask reaching its edge) travelling across, screened / multiplied
        for (var i = 0; i < 3; i++) {
            var L = t.comp.layers.addSolid(jzHex(cols[i]), 'JZ Trans leak ' + (i + 1), md, md, 1, t.comp.duration);
            L.inPoint = Math.max(0, t.t0); L.outPoint = Math.min(t.comp.duration, Math.max(t.t0 + t.dur, t.t0 + 1 / 24));
            var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
            m.property('ADBE Mask Shape').setValue(jzCircleShape(md / 2, md / 2, md * 0.25));
            m.property('ADBE Mask Feather').setValue([md * 0.5, md * 0.5]);
            L.blendingMode = light ? BlendingMode.MULTIPLY : BlendingMode.SCREEN;
            var U = HD + 'var u=ios(p*1.15-' + jzN(i * 0.07) + ');';
            jzSetExpr(jzXf(L, 'ADBE Position'), U + '[' + jzN(W) + '*(' + (d > 0 ? '-0.25+1.5*u' : '1.25-1.5*u') + '),' +
                jzN(H) + '*Math.max(0.05,Math.min(0.95,' + jzN(y0 + axq_rs(s0, i, 1) * 0.3) + '+(u-0.5)*' + jzN(0.2 * axq_rs(s0, i, 2)) + '))]');
            jzSetExpr(jzXf(L, 'ADBE Scale'), HD + 'var s=' + jzN(200 * (0.75 + 0.45 * axq_r(s0, i, 3))) + '*(0.7+0.5*bell(p));[s,s]');
            jzSetExpr(jzXf(L, 'ADBE Opacity'), HD + jzN(light ? 45 : 100) + '*a');
        }
        // a faint wash of the lightest tint over everything
        axq_solid(t, cols[2], 'JZ Trans leak wash', HD + '22*a');
    }
});

/* ---- xqPagePeel — ページめくり: the old cut is peeled off from a corner; its pale back side folds over as it goes */
jzReg('trans', 'xqPagePeel', {
    plan: function (rng, st) { return { cx: rng.chance(0.7) ? 1 : 0, cy: rng.chance(0.65) ? 1 : 0, k: rng.range(0.4, 0.8) }; },
    build: function (t) {
        var W = t.W, H = t.H, c0x = t.P.cx === 0 ? 0 : W, c0y = t.P.cy === 0 ? 0 : H, k = t.P.k || 0.6, pb = (t.scPrev || t.sc).bg;
        var dx = c0x ? -1 : 1, dy = (c0y ? -1 : 1) * k, dl = Math.sqrt(dx * dx + dy * dy); dx /= dl; dy /= dl;
        var D = Math.abs(dx) * W + Math.abs(dy) * H, sw = axq_md(t) * 0.09, LEN = (W + H) * 2, th = Math.atan2(dy, dx) * 180 / Math.PI;
        // tt = distance of the fold line from the corner (the fold's normal d points from the corner into the page)
        var HD = axq_hd(t) + 'var tt=(ios(p)*0.6+iq(p)*0.4)*' + jzN(D + 2) + ',on=cl(p*6);';
        var Q = HD + '[' + jzN(c0x) + '+' + jzN(dx) + '*tt,' + jzN(c0y) + '+' + jzN(dy) + '*tt]';
        // the page still lying flat: the old cut (copy) wiped away from the corner up to the fold
        var C = axq_copy(t, t.A, 'JZ Trans peel (prev cut)');
        axq_wipe(C, 'JZ Trans peel', dx, dy, HD + 'Math.min(100,100*tt/' + jzN(D) + ')');
        // the fold's shadow on the new cut
        var Sb = axq_soft(t, 'JZ Trans peel shadow', -sw * 0.75, 0, LEN, sw * 0.4);
        jzSetExpr(jzXf(Sb, 'ADBE Position'), Q); jzXf(Sb, 'ADBE Rotate Z').setValue(th);
        jzSetExpr(jzXf(Sb, 'ADBE Opacity'), HD + '45*on');
        Sb.moveAfter(C);
        // the flap = the peeled part mirrored across the fold line: pale paper + a faint mirror image of the old cut.
        // Mirror = scale [-100, 100] + rotation 2·θ about the corner, which lands at corner + 2·tt·d; the wipe (in layer space,
        // before the mirror) keeps only the part that has been peeled
        var mir = HD + '[' + jzN(c0x) + '+' + jzN(2 * dx) + '*tt,' + jzN(c0y) + '+' + jzN(2 * dy) + '*tt]', wc = HD + 'Math.max(0,100*(1-tt/' + jzN(D) + '))';
        var Fs = axq_solid(t, jzMixHex(pb, jzLum(pb) > 0.5 ? '#000000' : '#FFFFFF', 0.16), 'JZ Trans peel flap');
        var Fa = axq_copy(t, t.A, 'JZ Trans peel flap (back of prev cut)'); Fa.moveBefore(Fs);
        var fl = [Fs, Fa];
        for (var i = 0; i < 2; i++) {
            axq_wipe(fl[i], 'JZ Trans peel flap', -dx, -dy, wc);
            jzXf(fl[i], 'ADBE Anchor Point').setValue([c0x, c0y]);
            jzSetExpr(jzXf(fl[i], 'ADBE Position'), mir);
            jzXf(fl[i], 'ADBE Scale').setValue([-100, 100]);
            jzXf(fl[i], 'ADBE Rotate Z').setValue(2 * th);
        }
        jzXf(Fa, 'ADBE Opacity').setValue(16);
        var ds = jzEffect(Fs, 'ADBE Drop Shadow', 'JZ Trans peel flap shadow');
        jzEP(ds, 1, [0, 0, 0]); jzEP(ds, 2, 76); jzEP(ds, 4, 0); jzEP(ds, 5, sw * 0.5);
        // shading in the crease of the flap
        var Sf = axq_soft(t, 'JZ Trans peel crease', 0, sw * 0.6, LEN, sw * 0.3);
        jzSetExpr(jzXf(Sf, 'ADBE Position'), Q); jzXf(Sf, 'ADBE Rotate Z').setValue(th);
        jzSetExpr(jzXf(Sf, 'ADBE Opacity'), HD + '42*on*cl(tt/' + jzN(sw * 2.2) + ')');
    }
});

/* ---- xqWaveWipe — 波ワイプ: the edge between the cuts is a rolling wave */
// wave edge as a smooth path (Catmull-Rom tangents) in the layer's frame: u along the edge, w across it (sgn = the side the
// new cut comes from). closed → the region behind the edge, back to w = -bk
function axq_wave(g, us, ws, hor, sgn, bk) {
    var v = [], it = [], ot = [], n = us.length, i;
    for (i = 0; i < n; i++) v.push(hor ? [sgn * ws[i], us[i]] : [us[i], sgn * ws[i]]);
    for (i = 0; i < n; i++) {
        var P0 = v[Math.max(0, i - 1)], P2 = v[Math.min(n - 1, i + 1)], tx = (P2[0] - P0[0]) / 6, ty = (P2[1] - P0[1]) / 6;
        if (i === 0 || i === n - 1) { tx = 0; ty = 0; }
        ot.push([tx, ty]); it.push([-tx, -ty]);
    }
    if (bk) {
        v.push(hor ? [-sgn * bk, us[n - 1]] : [us[n - 1], -sgn * bk]); v.push(hor ? [-sgn * bk, us[0]] : [us[0], -sgn * bk]);
        it.push([0, 0]); it.push([0, 0]); ot.push([0, 0]); ot.push([0, 0]);
    }
    var p = jzVecs(g).addProperty('ADBE Vector Shape - Group'), sh = new Shape();
    sh.vertices = v; sh.inTangents = it; sh.outTangents = ot; sh.closed = !!bk;
    p.property('ADBE Vector Shape').setValue(sh);
    return p;
}
jzReg('trans', 'xqWaveWipe', {
    plan: function (rng, st) { return { dir: rng.pick(['L', 'R', 'U', 'U', 'D']), w: rng.range(1.1, 2.2), sp: rng.pick([1, -1]) * rng.range(0.7, 1.3), ph: rng.range(0, 6.28) }; },
    build: function (t) {
        var W = t.W, H = t.H, dir = t.P.dir, hor = dir === 'L' || dir === 'R', fromEnd = dir === 'L' || dir === 'U', Lm = hor ? W : H, Le = hor ? H : W;
        var amp = axq_md(t) * 0.055, wv = t.P.w || 1.5, sp = t.P.sp || 1, ph = t.P.ph || 0, TAU = Math.PI * 2, lw = axq_lw(t, 0.006), sgn = fromEnd ? -1 : 1;
        // the browser rolls the two sines of the edge against each other; here the edge keeps its shape and rolls as a whole at the
        // main wave's speed: the path is long enough to slide by sE along the edge during the transition
        var sE = -sp * Le / wv, mg = 8 + Le * 0.02, u0 = -Math.max(0, sE) - mg, u1 = Le - Math.min(0, sE) + mg, N = Math.ceil((u1 - u0) / (Le / 48)), us = [], ws = [], i;
        for (i = 0; i <= N; i++) {
            var u = u0 + (u1 - u0) * i / N;
            us.push(u); ws.push(amp * Math.sin(u / Le * TAU * wv + ph) + amp * 0.4 * Math.sin(u / Le * TAU * (wv * 2 + 1) - ph * 1.7));
        }
        var HD = axq_hd(t) + 'var X=' + jzN(-amp * 1.5 - 2) + '+' + jzN(Lm + amp * 3 + 4) + '*ioc(p),sl=' + jzN(sE) + '*p;';
        var xe = fromEnd ? jzN(Lm) + '-X' : 'X', POS = HD + (hor ? '[' + xe + ',sl]' : '[sl,' + xe + ']');
        var C = axq_copy(t, t.A, 'JZ Trans wave (prev cut)');
        var M = jzEvShape(t.comp, 'JZ Trans wave matte', t.t0, t.dur), gm = jzGrp(M, 'new cut');
        axq_wave(gm, us, ws, hor, sgn, Lm + amp * 6 + 20); jzAddFill(gm, '#FFFFFF');
        jzSetExpr(jzXf(M, 'ADBE Position'), POS);
        // accent line on the edge + a thin one running ahead of it
        var S = jzEvShape(t.comp, 'JZ Trans wave edge', t.t0, t.dur);
        var g2 = jzGrp(S, 'ahead'); axq_wave(g2, us, ws, hor, sgn, 0);
        var s2 = jzAddStroke(g2, axq_acc(t, true), Math.max(1, lw * 0.4), 60); s2.property('ADBE Vector Stroke Line Join').setValue(2);
        jzGX(g2).property('ADBE Vector Position').setValue(hor ? [sgn * lw * 3.5, 0] : [0, sgn * lw * 3.5]);
        var g1 = jzGrp(S, 'edge'); axq_wave(g1, us, ws, hor, sgn, 0);
        var s1 = jzAddStroke(g1, axq_acc(t), lw); s1.property('ADBE Vector Stroke Line Join').setValue(2);
        jzSetExpr(jzXf(S, 'ADBE Position'), POS);
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + '100*Math.pow(bell(p),0.6)');
        axq_matte(M, C, TrackMatteType.ALPHA_INVERTED);
    }
});

/* ---- xqStretchSmear — 引き伸ばし: the new cut's edge is pulled across the frame like wet paint, then the picture follows it */
jzReg('trans', 'xqStretchSmear', {
    plan: function (rng, st) { return { dir: rng.pick(['R', 'L', 'R', 'L', 'D', 'U']) }; },
    build: function (t) {
        var W = t.W, H = t.H, dir = t.P.dir, hor = dir !== 'U' && dir !== 'D', fromEnd = dir === 'L' || dir === 'U', Lx = hor ? W : H, lw = axq_lw(t, 0.005);
        var sg = fromEnd ? -1 : 1, nx = hor ? sg : 0, ny = hor ? 0 : sg;       // the direction the smear travels in
        // xe = leading end of the smear, xb = how far the picture itself has come (both measured from the starting side)
        var HD = axq_hd(t) + 'var L=' + jzN(Lx) + ',xe=Math.round(L*oc(p/0.62)),xb=Math.min(xe,Math.round(L*ioc((p-0.14)/0.86))),S=xe-xb;';
        // top: the old cut ahead of the smear · the new cut behind it · between them a copy of the new cut whose one pixel column
        // at the picture's edge is stretched (layer scale about that column) over the whole gap
        var Ac = axq_copy(t, t.A, 'JZ Trans smear (prev cut)');
        axq_wipe(Ac, 'JZ Trans smear', nx, ny, HD + '100*xe/L');
        var Bc = axq_copy(t, t.B, 'JZ Trans smear (new cut)');
        axq_wipe(Bc, 'JZ Trans smear', -nx, -ny, HD + '100*(1-xb/L)');
        var Sm = axq_copy(t, t.B, 'JZ Trans smear (stretched edge)');
        var src = 'Math.max(0,Math.min(L-1,' + (fromEnd ? 'L-xb' : 'xb-1') + '))+0.5', at = (fromEnd ? 'L-xe' : 'xb') + '+0.5*S';
        jzSetExpr(jzXf(Sm, 'ADBE Anchor Point'), HD + (hor ? '[' + src + ',' + jzN(H / 2) + ']' : '[' + jzN(W / 2) + ',' + src + ']'));
        jzSetExpr(jzXf(Sm, 'ADBE Position'), HD + (hor ? '[' + at + ',' + jzN(H / 2) + ']' : '[' + jzN(W / 2) + ',' + at + ']'));
        jzSetExpr(jzXf(Sm, 'ADBE Scale'), HD + (hor ? '[100*S,100]' : '[100,100*S]'));
        // the smear thins towards its leading end: three stacked steps of shade (30 / 20 / 10 %), drawn 100 px long and scaled to the gap
        var Sh = jzEvShape(t.comp, 'JZ Trans smear shade', t.t0, t.dur), e0 = fromEnd ? 'L-xe' : 'xe';
        for (var k = 1; k <= 3; k++) {
            var g = jzGrp(Sh, 'step ' + k), w = 100 * k / 3;
            if (hor) jzAddRect(g, w, H, 0, -sg * w / 2, H / 2); else jzAddRect(g, W, w, 0, W / 2, -sg * w / 2);
            jzAddFill(g, '#000000', 10);
        }
        jzSetExpr(jzXf(Sh, 'ADBE Position'), HD + (hor ? '[' + e0 + ',0]' : '[0,' + e0 + ']'));
        jzSetExpr(jzXf(Sh, 'ADBE Scale'), HD + (hor ? '[S,100]' : '[100,S]'));
        // accent bar on the leading end
        var Sb = jzEvShape(t.comp, 'JZ Trans smear edge', t.t0, t.dur), gb = jzGrp(Sb, 'edge');
        if (hor) jzAddRect(gb, lw, H, 0, -sg * lw / 2, H / 2); else jzAddRect(gb, W, lw, 0, W / 2, -sg * lw / 2);
        jzAddFill(gb, axq_acc(t));
        jzSetExpr(jzXf(Sb, 'ADBE Position'), HD + (hor ? '[' + e0 + ',0]' : '[0,' + e0 + ']'));
        jzSetExpr(jzXf(Sb, 'ADBE Opacity'), HD + 'xe<L?100*Math.min(1,p*8):0');
    }
});

/* ---- xqFlipOver — 裏返し: the frame turns over like a card on its middle axis; the new cut is on the back.
   Faux 3D like cubeTurn in ae/p_trans.jsx: each face is drawn in slices (masked copies), the far edge shorter than the near one */
jzReg('trans', 'xqFlipOver', {
    plan: function (rng, st) { return { vert: rng.chance(0.35), dir: rng.pick([1, -1]) }; },
    build: function (t) {
        var W = t.W, H = t.H, v = !!t.P.vert, d = t.P.dir < 0 ? -1 : 1, K = 8, Lx = v ? H : W, SW = Lx / K;
        var HS = axq_hs(t) + AXQ_IOC + 'var ang=ioc(p)*Math.PI,c=Math.cos(ang),sn=Math.sin(ang),f=Math.abs(c),per=0.16*sn*' + jzN(d) + '*(c>=0?1:-1);';
        var faces = [[t.A, 'c>=0', 'A'], [t.B, 'c<0', 'B']];
        for (var q = 0; q < 2; q++) for (var i = 0; i < K; i++) {
            var u0 = i / K, um = (i + 0.5) / K - 0.5, mc = u0 * Lx + SW / 2;
            var C = axq_copy(t, faces[q][0], 'JZ Trans flip ' + faces[q][2] + (i + 1));
            if (v) axq_mask(C, 0, u0 * Lx - 0.5, W, u0 * Lx + SW + 0.5); else axq_mask(C, u0 * Lx - 0.5, 0, u0 * Lx + SW + 0.5, H);
            var sh = jzEffect(C, 'ADBE Fill', 'JZ Trans flip shade'); jzEP(sh, 3, [0, 0, 0]);
            jzEX(sh, 7, HS + '0.5*sn');
            var e = jzEffect(C, 'ADBE Geometry2', 'JZ Trans flip face');
            jzEP(e, 1, v ? [W / 2, mc] : [mc, H / 2]); jzEP(e, 3, 0);
            var along = jzN(Lx / 2) + '+' + jzN(um * Lx) + '*f', thin = HS + '100*f+' + jzN(60 / SW), tall = HS + '100*(1-0.05*sn+per*' + jzN(um) + ')';
            jzEX(e, 2, HS + (v ? '[' + jzN(W / 2) + ',' + along + ']' : '[' + along + ',' + jzN(H / 2) + ']'));
            jzEX(e, 4, v ? thin : tall);
            jzEX(e, 5, v ? tall : thin);
            jzEX(e, 9, HS + '(' + faces[q][1] + '&&f>=0.006)?100:0');
        }
        // the void behind the card: both backgrounds darkened, cross-fading
        var S2 = axq_solid(t, jzMixHex(t.sc.bg, '#000000', 0.6), 'JZ Trans flip back 2', axq_hd(t) + '100*p'); S2.moveBefore(t.B);
        var S1 = axq_solid(t, jzMixHex((t.scPrev || t.sc).bg, '#000000', 0.6), 'JZ Trans flip back'); S1.moveBefore(t.B);
    }
});
