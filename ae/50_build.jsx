// ================================================================ build a composition from a plan
function jzEventsArr(plan, type, t0, t1) {
    var out = [], ev = plan.events || [];
    for (var i = 0; i < ev.length; i++) {
        var e = ev[i]; if (e.type !== type) continue;
        if (t0 != null && (e.t < t0 - 0.7 || e.t > t1 + 0.1)) continue;
        out.push('[' + jzN(e.t) + ',' + jzN(e.amp || 1) + ',' + jzN(Math.max(e.dur || 0, 1 / 24)) + ']');
    }
    return '[' + out.join(',') + ']';
}

function jzBuild(plan, opt) {
    opt = opt || {};
    JZLOG = [];
    var W = opt.width || plan.width || 1920, H = opt.height || plan.height || 1080, fps = plan.fps || 24, D = Math.max(1, plan.duration || 10);
    var st = plan.style, fx = plan.fx || {}, roles = opt.roles || JZ_ROLE_DEFAULT;
    var ghostAmt = (fx.chroma == null ? 0.7 : fx.chroma) * (st.ghost == null ? 1 : st.ghost);
    var title = String(plan.title || 'lyric').substr(0, 20);
    var comp = app.project.items.addComp('JIZURA ' + title, W, H, 1, D, fps);
    var folder = app.project.items.addFolder('JIZURA ' + title + ' cuts');
    var u = H / 1080;
    var schemes = st.schemes, cuts = plan.cuts || [];
    function schemeOf(c) { return schemes[(c.scheme || 0) % schemes.length] || schemes[0]; }

    // ---------- background: radial ramp with hold keyframes where the colour scheme changes
    var bg = comp.layers.addSolid(jzHex(schemes[0].bg), 'JZ Background', W, H, 1, D);
    var ramp = jzEffect(bg, 'ADBE Ramp', 'JZ BG Colour');
    jzEP(ramp, 1, [W / 2, H * 0.45]); jzEP(ramp, 3, [W, H]); jzEP(ramp, 5, 2);
    var last = -1;
    for (var i = 0; i < cuts.length; i++) {
        var si = (cuts[i].scheme || 0) % schemes.length;
        if (si === last) continue;
        var s = schemes[si], lift = jzLum(s.bg) < 0.5 ? 0.045 : 0.1, b = jzHex(s.bg);
        var c1 = [Math.min(1, b[0] + lift), Math.min(1, b[1] + lift), Math.min(1, b[2] + lift)];
        var tt = i === 0 ? 0 : cuts[i].start;
        try {
            var p2 = ramp.property(2), p4 = ramp.property(4);
            p2.setValueAtTime(tt, c1); p4.setValueAtTime(tt, b);
            p2.setInterpolationTypeAtKey(p2.nearestKeyIndex(tt), KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
            p4.setInterpolationTypeAtKey(p4.nearestKeyIndex(tt), KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
        } catch (e) { jzWarn('bg key: ' + e.toString()); }
        last = si;
    }
    var paperAmt = (st.texture && st.texture.paper) || 0;
    if (paperAmt > 0.05 && (fx.texture == null || fx.texture > 0.05)) {
        var pp = comp.layers.addSolid([0.5, 0.5, 0.5], 'JZ Paper', W, H, 1, D);
        jzEffect(pp, 'ADBE Fractal Noise', 'JZ Paper Noise');
        pp.blendingMode = BlendingMode.OVERLAY; jzXf(pp, 'ADBE Opacity').setValue(22 * paperAmt);
        pp.moveAfter(bg); bg.moveToEnd();
    }

    // ---------- cuts
    var lagA = 0.8 / 24, lagB = 1.6 / 24;
    for (var ci = 0; ci < cuts.length; ci++) {
        var cut = cuts[ci];
        if (!(cut.end > cut.start)) continue;
        cut.dur = cut.end - cut.start;
        var sc = schemeOf(cut);
        var pc = app.project.items.addComp(jzPad(ci + 1, 3) + ' ' + String(cut.text || cut.layout).substr(0, 16), W, H, 1, Math.max(cut.dur, 1 / fps) + 0.2, fps);
        pc.parentFolder = folder;
        var ctx = { comp: pc, W: W, H: H, sc: sc, st: st, fx: { motion: fx.motion == null ? 0.7 : fx.motion, glitch: fx.glitch == null ? 0.5 : fx.glitch }, cut: cut, P: cut.params || {}, roles: roles, plan: plan };
        var bb = null;
        try { var fn = JZ_LAYOUTS[cut.layout] || JZ_LAYOUTS.center; bb = fn(ctx); }
        catch (e) { jzWarn('cut ' + (ci + 1) + ' ' + cut.layout + ': ' + e.toString() + (e.line ? ' (line ' + e.line + ')' : '')); }
        try { jzDecorate(ctx, bb); } catch (e2) { jzWarn('decor: ' + e2.toString()); }
        var L = comp.layers.add(pc);
        L.startTime = cut.start; L.inPoint = cut.start; L.outPoint = cut.end;
        L.name = (jzPad(ci + 1, 3) + ' ' + (cut.text || '')).substr(0, 24);
        if (ghostAmt > 0.02 && opt.ghosts !== false) {
            var ghosts = [['B', lagB, [-3.4, -1.3], sc.ghostB], ['A', lagA, [3.2, 1.9], sc.ghostA]];
            for (var g = 0; g < ghosts.length; g++) {
                var G = L.duplicate();
                G.name = L.name + ' ghost' + ghosts[g][0];
                G.startTime = cut.start + ghosts[g][1]; G.inPoint = cut.start; G.outPoint = cut.end + ghosts[g][1];
                G.moveAfter(L);
                var tint = jzEffect(G, 'ADBE Tint', 'JZ Ghost Colour');
                jzEP(tint, 1, jzHex(ghosts[g][3])); jzEP(tint, 2, jzHex(ghosts[g][3])); jzEP(tint, 3, 100);
                if (jzLum(sc.bg) > 0.55) G.blendingMode = BlendingMode.MULTIPLY;
                var off = ghosts[g][2];
                jzSetExpr(jzXf(G, 'ADBE Position'), 'var ev=' + jzEventsArr(plan, 'chroma', cut.start, cut.end) + ';var s=1;for(var i=0;i<ev.length;i++){var dt=(time-ev[i][0])*24;if(dt>=0&&dt<14)s+=ev[i][1]*Math.pow(0.55,dt);}' +
                    'var k=' + jzN(ghostAmt * u) + '*s;[value[0]+' + off[0] + '*k,value[1]+' + off[1] + '*k]');
            }
        }
    }

    // ---------- HUD
    if (plan.hud && opt.hud !== false) jzHUD(comp, plan, schemes[0], roles);

    // ---------- global FX (top adjustment layer)
    var fxL = comp.layers.addSolid([1, 1, 1], 'JZ FX', W, H, 1, D); fxL.adjustmentLayer = true;
    if (fx.onTwos !== false) { var pt = jzEffect(fxL, 'ADBE Posterize Time', 'JZ 2-koma'); jzEP(pt, 1, fps / 2); }
    var tr = jzEffect(fxL, 'ADBE Geometry2', 'JZ Shake');
    jzEX(tr, 2, 'var ev=' + jzEventsArr(plan, 'shake') + ';var s=0;for(var i=0;i<ev.length;i++){var dt=(time-ev[i][0])*24;if(dt>=0&&dt<14)s+=ev[i][1]*Math.pow(0.62,dt);}seedRandom(Math.floor(time*12),true);[value[0]+random(-1,1)*s*16*' + jzN(u) + ',value[1]+random(-1,1)*s*11*' + jzN(u) + ']');
    var ww = jzEffect(fxL, 'ADBE Wave Warp', 'JZ Slice Glitch');
    jzEP(ww, 1, 2); jzEP(ww, 4, 0); jzEP(ww, 5, 0); jzEP(ww, 6, 1);
    jzEX(ww, 2, 'var ev=' + jzEventsArr(plan, 'slice') + ';var h=0;for(var i=0;i<ev.length;i++){var dt=time-ev[i][0];if(dt>=0&&dt<ev[i][2])h=Math.max(h,ev[i][1]);}posterizeTime(24);seedRandom(Math.floor(time*24),true);h>0?h*thisComp.width*0.05*random(0.4,1):0');
    jzEX(ww, 3, 'posterizeTime(24);seedRandom(Math.floor(time*24)+7,true);random(thisComp.height*0.02,thisComp.height*0.12)');
    jzEX(ww, 7, 'posterizeTime(24);seedRandom(Math.floor(time*24)+11,true);random(0,360)');
    var rb = jzEffect(fxL, 'CC Radial Blur', 'JZ Zoom Hit');
    jzEX(rb, 2, 'var ev=' + jzEventsArr(plan, 'zoom') + ';var a=0;for(var i=0;i<ev.length;i++){var dt=time-ev[i][0];if(dt>=0&&dt<ev[i][2])a=Math.max(a,ev[i][1]*(1-dt/ev[i][2]));}a*30');
    var iv = jzEffect(fxL, 'ADBE Invert', 'JZ Invert Hit');
    jzEX(iv, 2, 'var ev=' + jzEventsArr(plan, 'invert') + ';var on=false;for(var i=0;i<ev.length;i++){var dt=time-ev[i][0];if(dt>=0&&dt<ev[i][2])on=true;}on?0:100');
    var glowAmt = (st.glow || 0.6) * (fx.texture == null ? 0.6 : fx.texture);
    if (glowAmt > 0.05) { var gl = jzEffect(fxL, 'ADBE Glo2', 'JZ Bloom'); jzEP(gl, 2, 70); jzEP(gl, 3, 60 * u); jzEP(gl, 4, 0.35 * glowAmt); }
    var gr = (st.texture && st.texture.grain || 0) * (fx.texture == null ? 0.6 : fx.texture);
    if (gr > 0.02) { var nz = jzEffect(fxL, 'ADBE Noise', 'JZ Grain'); jzEP(nz, 1, 5 * gr); jzEP(nz, 2, 0); }

    // ---------- flash + vignette
    var fl = comp.layers.addSolid(jzHex(jzLum(schemes[0].bg) < 0.5 ? schemes[0].fg : '#ffffff'), 'JZ Flash', W, H, 1, D);
    jzSetExpr(jzXf(fl, 'ADBE Opacity'), 'var ev=' + jzEventsArr(plan, 'flash') + ';var o=0;for(var i=0;i<ev.length;i++){var dt=time-ev[i][0];if(dt>=0&&dt<ev[i][2])o=Math.max(o,Math.pow(1-dt/ev[i][2],1.5)*92);}o');
    var vg = comp.layers.addSolid([0, 0, 0], 'JZ Vignette', W, H, 1, D);
    try {
        var m = vg.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
        m.property('ADBE Mask Shape').setValue(jzCircleShape(W / 2, H / 2, Math.max(W, H) * 0.62));
        m.inverted = true; m.property('ADBE Mask Feather').setValue([H * 0.5, H * 0.5]);
        jzXf(vg, 'ADBE Scale').setValue([100, 100 * H / W * 1.6]);
    } catch (e3) { jzWarn('vignette: ' + e3.toString()); }
    jzXf(vg, 'ADBE Opacity').setValue(32 * (fx.texture == null ? 0.6 : fx.texture));

    // audio layer (optional)
    if (opt.audioItem) { try { var au = comp.layers.add(opt.audioItem); au.startTime = opt.audioStart || 0; au.moveToEnd(); } catch (e4) { jzWarn('audio: ' + e4.toString()); } }
    comp.openInViewer();
    return comp;
}

function jzHUD(comp, plan, sc, roles) {
    var W = comp.width, H = comp.height, m = Math.round(H * 0.045), L = H * 0.035, fs = Math.max(10, H * 0.016);
    var ctx = { comp: comp, W: W, H: H, sc: sc, roles: roles, cut: { dur: plan.duration, outDur: 0.2, inDur: 0.3, seed: 1 } };
    var S = jzShapeLayer(ctx, 'HUD frame', 0, 0), g = jzGrp(S);
    jzAddPath(g, [[m, m + L], [m, m], [m + L, m]], false); jzAddPath(g, [[W - m - L, m], [W - m, m], [W - m, m + L]], false);
    jzAddPath(g, [[m, H - m - L], [m, H - m], [m + L, H - m]], false); jzAddPath(g, [[W - m - L, H - m], [W - m, H - m], [W - m, H - m - L]], false);
    jzAddStroke(g, sc.sub, 1.4, 90);
    jzText(ctx, (plan.title || 'UNTITLED') + (plan.artist ? ' / ' + plan.artist : ''), { font: 'gothic_med', size: fs, color: sc.sub, x: m + L * 0.6, y: m + L * 0.9, align: 'left', track: 0.12 });
    var rec = jzText(ctx, 'REC', { font: 'mono', size: fs, color: sc.sub, x: W - m - L * 2.2, y: m + L * 0.9, align: 'left', track: 0.1 });
    var dot = jzShapeLayer(ctx, 'REC dot', W - m - L * 2.6, m + L * 0.9), gd = jzGrp(dot); jzAddEllipse(gd, fs * 0.64, fs * 0.64); jzAddFill(gd, sc.accent);
    jzSetExpr(jzXf(dot, 'ADBE Opacity'), 'Math.floor(time*6)%2===0?100:0');
    var tc = jzText(ctx, '00:00:00:00', { font: 'mono', size: fs, color: sc.sub, x: m + L * 0.6, y: H - m - L * 0.9, align: 'left', track: 0.1 });
    try { tc.property('ADBE Text Properties').property('ADBE Text Document').expression = 'timeToTimecode(time)'; } catch (e) {}
    var starts = []; for (var i = 0; i < (plan.lines || []).length; i++) starts.push(jzN(plan.lines[i].start));
    var lc = jzText(ctx, 'LYRIC 00/00', { font: 'mono', size: fs, color: sc.sub, x: W - m - L * 0.6, y: H - m - L * 0.9, align: 'right', track: 0.1 });
    try { lc.property('ADBE Text Properties').property('ADBE Text Document').expression = 'var ls=[' + starts.join(',') + '];var n=0;for(var i=0;i<ls.length;i++)if(time>=ls[i])n=i+1;"LYRIC "+("0"+n).slice(-2)+"/"+("0"+ls.length).slice(-2)'; } catch (e2) {}
    var bar = jzShapeLayer(ctx, 'HUD progress', 0, 0), gb = jzGrp(bar);
    jzAddPath(gb, [[W * 0.3, H - m - L * 0.9], [W * 0.7, H - m - L * 0.9]], false); jzAddStroke(gb, sc.accent, 2);
    jzAddTrimPaths(gb, 'linear(time,0,thisComp.duration,0,100)');
}
