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

// Structure of the generated project:
//   main comp  ── base background (first scheme) ─ one WRAPPER precomp per cut ─ effect-event layers ─ HUD ─ JZ FX ─ flash ─ vignette
//   wrapper    ── scheme background + radial lift ─ paper ─ background graphic ─ ghost B ─ ghost A ─ content ─ "JZ Camera" null
//   content    ── the layout's text / shape layers + decor (built by the registry entries)
// Cut-to-cut transitions work on neighbouring wrapper layers in the main comp.
function jzBuild(plan, opt) {
    opt = opt || {};
    JZLOG = []; JZ_FALLBACKS = 0; JZ_FALLBACK_KEYS = []; JZ_FONT_MISSING = {}; JZ_FONT_NOAPI = false;
    var W = opt.width || plan.width || 1920, H = opt.height || plan.height || 1080, fps = plan.fps || 24, D = Math.max(1, plan.duration || 10);
    var st = plan.style, fx = plan.fx || {}, roles = opt.roles || JZ_ROLE_DEFAULT;
    var ghostAmt = (fx.chroma == null ? 0.7 : fx.chroma) * (st.ghost == null ? 1 : st.ghost);
    var title = String(plan.title || 'lyric').substr(0, 20);
    var comp = app.project.items.addComp('JIZURA ' + title, W, H, 1, D, fps);
    // edges uncovered by glitch shifts show the scheme background (the browser redraws over the old frame) instead of black
    try { comp.bgColor = plan.keyBg ? [0, 0, 0] : jzHex(st.schemes[0].bg); } catch (eb) {}
    var folder = app.project.items.addFolder('JIZURA ' + title + ' cuts');
    var u = H / 1080;
    var schemes = st.schemes, cuts = plan.cuts || [];
    var FXV = { motion: fx.motion == null ? 0.7 : fx.motion, glitch: fx.glitch == null ? 0.5 : fx.glitch, decor: fx.decor == null ? 0.5 : fx.decor, texture: fx.texture == null ? 0.6 : fx.texture, chroma: fx.chroma == null ? 0.7 : fx.chroma };
    function schemeOf(c) { return schemes[(c.scheme || 0) % schemes.length] || schemes[0]; }
    var paperAmt = (st.texture && st.texture.paper) || 0;
    // 合成用の背景: the plan's style is already white-on-black; no lift / paper / background graphic / vignette,
    // the finished comp is made monochrome (Tint) and — for green — screened onto #00FF00
    var KEY = (plan.keyBg === 'green' || plan.keyBg === 'black') ? plan.keyBg : null;
    if (KEY) paperAmt = 0;

    // ---------- base background (visible between cuts)
    var base = comp.layers.addSolid(jzHex(schemes[0].bg), 'JZ Background', W, H, 1, D);
    if (!KEY) jzBgLift(base, schemes[0], W, H);

    // ---------- cuts
    var lagA = 0.8 / 24, lagB = 1.6 / 24, wraps = [];
    for (var ci = 0; ci < cuts.length; ci++) {
        var cut = cuts[ci];
        if (!(cut.end > cut.start)) continue;
        cut.dur = cut.end - cut.start;
        var sc = schemeOf(cut), label = jzPad(ci + 1, 3) + ' ' + String(cut.text || cut.layout).substr(0, 16);
        var cdur = Math.max(cut.dur, 1 / fps) + 1.0;
        // content
        var pc = app.project.items.addComp(label + ' text', W, H, 1, cdur, fps);
        pc.parentFolder = folder;
        var ctx = { comp: pc, W: W, H: H, u: u, sc: sc, st: st, fx: FXV, cut: cut, P: cut.params || {}, roles: roles, plan: plan };
        var bb = null, lk = jzFallback('layout', cut.layout, 'center');
        if (lk !== cut.layout) { ctx.P = JZ_REG.layout[lk].plan ? JZ_REG.layout[lk].plan(new JzRng(jzHash(cut.seed, 31)), { text: cut.text, n: jzCount(cut.text), W: W, H: H, dur: cut.dur }, st) : {}; }
        try { bb = JZ_REG.layout[lk].build(ctx); }
        catch (e) { jzWarn('cut ' + (ci + 1) + ' ' + lk + ': ' + e.toString() + (e.line ? ' (line ' + e.line + ')' : '')); }
        try { jzDecorate(ctx, bb); } catch (e2) { jzWarn('decor: ' + e2.toString()); }
        // wrapper
        var wc = app.project.items.addComp(label, W, H, 1, cdur, fps);
        wc.parentFolder = folder;
        var bgL = wc.layers.addSolid(jzHex(sc.bg), 'JZ BG', W, H, 1, cdur);
        if (!KEY) jzBgLift(bgL, sc, W, H);
        if (paperAmt > 0.05 && FXV.texture > 0.05) {
            var pp = wc.layers.addSolid([0.5, 0.5, 0.5], 'JZ Paper', W, H, 1, cdur);
            var pn = jzEffect(pp, 'ADBE Fractal Noise', 'JZ Paper Noise'); jzEP(pn, 4, 60);
            // the browser's paper is a faint fibre texture: keep the overlay light, fainter still on dark schemes
            pp.blendingMode = BlendingMode.OVERLAY; jzXf(pp, 'ADBE Opacity').setValue((jzLum(sc.bg) < 0.4 ? 6 : 12) * paperAmt);
        }
        var bk = !KEY && cut.bg && cut.bg !== 'none' ? jzFallback('bg', cut.bg, null) : null;
        if (bk) {
            var bctx = { comp: wc, W: W, H: H, u: u, sc: sc, st: st, fx: FXV, cut: cut, plan: plan, P: cut.bgP || {} };
            try { JZ_REG.bg[bk].build(bctx, bctx.P); } catch (e3) { jzWarn('bg ' + bk + ': ' + e3.toString() + (e3.line ? ' (line ' + e3.line + ')' : '')); }
        }
        var CL = wc.layers.add(pc); CL.name = 'content'; CL.startTime = 0;
        var content = [CL];
        if (ghostAmt > 0.02 && opt.ghosts !== false) {
            // layers marked with jzNoGhost() stay out of the ghosts: feed them from a copy of the content comp with those layers off
            var gsrc = null, li;
            for (li = 1; li <= pc.numLayers; li++) if (jzIsNoGhost(pc.layer(li))) { gsrc = pc; break; }
            if (gsrc) {
                try {
                    gsrc = pc.duplicate(); gsrc.name = label + ' ghost'; gsrc.parentFolder = folder;
                    jzTidyComp(gsrc, true);          // drop the main-pass-only layers (keeps what the ghosted layers still need)
                } catch (eg) { gsrc = null; jzWarn('ghost copy: ' + eg.toString()); }
            }
            var ghosts = [['B', lagB, [-3.4, -1.3], sc.ghostB], ['A', lagA, [3.2, 1.9], sc.ghostA]];
            for (var g = 0; g < ghosts.length; g++) {
                var G = gsrc ? wc.layers.add(gsrc) : CL.duplicate();
                G.name = 'ghost ' + ghosts[g][0];
                G.startTime = ghosts[g][1]; G.inPoint = 0; G.outPoint = cdur;
                G.moveAfter(CL);
                var tint = jzEffect(G, 'ADBE Tint', 'JZ Ghost Colour');
                jzEP(tint, 1, jzHex(ghosts[g][3])); jzEP(tint, 2, jzHex(ghosts[g][3])); jzEP(tint, 3, 100);
                if (jzLum(sc.bg) > 0.55) G.blendingMode = BlendingMode.MULTIPLY;
                var off = ghosts[g][2];
                jzSetExpr(jzXf(G, 'ADBE Position'), 'var T0=' + jzN(cut.start) + ',ev=' + jzEventsArr(plan, 'chroma', cut.start, cut.end) + ';var s=1;for(var i=0;i<ev.length;i++){var dt=(time+T0-ev[i][0])*24;if(dt>=0&&dt<14)s+=ev[i][1]*Math.pow(0.55,dt);}' +
                    'var k=' + jzN(ghostAmt * u) + '*s;[value[0]+' + off[0] + '*k,value[1]+' + off[1] + '*k]');
                content.push(G);
            }
        }
        // camera: a null at the comp centre (identity transform) that carries the content and its ghosts
        var nul = wc.layers.addNull(cdur); nul.name = 'JZ Camera';
        jzXf(nul, 'ADBE Anchor Point').setValue([W / 2, H / 2]); jzXf(nul, 'ADBE Position').setValue([W / 2, H / 2]);
        for (var q = 0; q < content.length; q++) content[q].parent = nul;
        var ck = jzFallback('cam', cut.cam || 'push', 'push');
        try { JZ_REG.cam[ck].apply({ ctx: ctx, comp: wc, nul: nul, content: content, P: cut.camP || {}, W: W, H: H, u: u, cut: cut, fx: FXV, sc: sc }, cut.camP || {}); }
        catch (e4) { jzWarn('cam ' + ck + ': ' + e4.toString() + (e4.line ? ' (line ' + e4.line + ')' : '')); }
        // into the main comp
        var WL = comp.layers.add(wc);
        WL.startTime = cut.start; WL.inPoint = cut.start; WL.outPoint = cut.end;
        WL.name = (jzPad(ci + 1, 3) + ' ' + (cut.text || '')).substr(0, 24);
        wraps.push({ cut: cut, layer: WL, comp: wc, sc: sc });
    }

    // ---------- cut-to-cut transitions (the previous wrapper holds its last state under the new one)
    for (var wi = 1; wi < wraps.length; wi++) {
        var B = wraps[wi], A = wraps[wi - 1], tk = B.cut.trans ? jzFallback('trans', B.cut.trans, null) : null;
        if (!tk || Math.abs(A.cut.end - B.cut.start) > 0.06) continue;
        var td = jzClamp(B.cut.transDur || jzMeta('trans', tk).dur || 0.35, 0.08, Math.max(0.1, B.cut.dur * 0.6));
        A.layer.outPoint = B.cut.start + td;
        var tctx = { comp: comp, W: W, H: H, u: u, A: A.layer, B: B.layer, t0: B.cut.start, dur: td, P: B.cut.transP || {}, sc: B.sc, scPrev: A.sc, st: st, fx: FXV, cut: B.cut, prev: A.cut, fps: fps };
        try { JZ_REG.trans[tk].build(tctx); } catch (e5) { jzWarn('trans ' + tk + ': ' + e5.toString() + (e5.line ? ' (line ' + e5.line + ')' : '')); }
    }

    // ---------- HUD
    if (plan.hud && opt.hud !== false) jzHUD(comp, plan, schemes[0], roles);

    // ---------- global FX (top adjustment layer)
    var fxL = comp.layers.addSolid([1, 1, 1], 'JZ FX', W, H, 1, D); fxL.adjustmentLayer = true;
    if (fx.onTwos !== false && (fx.koma == null || fx.koma > 0)) { var pt = jzEffect(fxL, 'ADBE Posterize Time', 'JZ Koma'); jzEP(pt, 1, fx.koma > 0 ? fx.koma : 12); }
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
    var glowAmt = (st.glow || 0.6) * FXV.texture;
    if (glowAmt > 0.05) { var gl = jzEffect(fxL, 'ADBE Glo2', 'JZ Bloom'); jzEP(gl, 2, 70); jzEP(gl, 3, 60 * u); jzEP(gl, 4, 0.35 * glowAmt); }
    var gr = (st.texture && st.texture.grain || 0) * FXV.texture;
    if (gr > 0.02) { var nz = jzEffect(fxL, 'ADBE Noise', 'JZ Grain'); jzEP(nz, 1, 5 * gr); jzEP(nz, 2, 0); }

    // ---------- effect events that have their own layers (above the koma / shake layer: they run at full frame rate, like the browser's post effects)
    var evs = plan.events || [], fctx = { comp: comp, W: W, H: H, u: u, st: st, fx: FXV, plan: plan, fps: fps };
    for (var ei = 0; ei < evs.length; ei++) {
        var ev = evs[ei], fk = jzFallback('fx', ev.type, null);
        if (!fk || JZ_REG.fx[fk].builtin) continue;
        var e1 = { t: ev.t, type: fk, amp: ev.amp || 1, dur: Math.max(ev.dur || 0, 1 / 24), seed: jzHash(ev.t, ev.type) % 100000, sc: schemeOf(jzCutAtTime(cuts, ev.t) || cuts[0] || { scheme: 0 }) };
        try { JZ_REG.fx[fk].build(fctx, e1); } catch (e6) { jzWarn('fx ' + fk + ': ' + e6.toString() + (e6.line ? ' (line ' + e6.line + ')' : '')); }
    }

    // ---------- flash + vignette
    var fl = comp.layers.addSolid(jzHex(jzLum(schemes[0].bg) < 0.5 ? schemes[0].fg : '#ffffff'), 'JZ Flash', W, H, 1, D);
    jzSetExpr(jzXf(fl, 'ADBE Opacity'), 'var ev=' + jzEventsArr(plan, 'flash') + ';var o=0;for(var i=0;i<ev.length;i++){var dt=time-ev[i][0];if(dt>=0&&dt<ev[i][2])o=Math.max(o,Math.pow(1-dt/ev[i][2],1.5)*92);}o');
    var vg = KEY ? null : comp.layers.addSolid([0, 0, 0], 'JZ Vignette', W, H, 1, D);
    if (vg) try {
        var m = vg.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
        m.property('ADBE Mask Shape').setValue(jzCircleShape(W / 2, H / 2, Math.max(W, H) * 0.62));
        m.inverted = true; m.property('ADBE Mask Feather').setValue([H * 0.5, H * 0.5]);
        jzXf(vg, 'ADBE Scale').setValue([100, 100 * H / W * 1.6]);
    } catch (e7) { jzWarn('vignette: ' + e7.toString()); }
    if (vg) jzXf(vg, 'ADBE Opacity').setValue(32 * FXV.texture);
    if (KEY) {
        var km = comp.layers.addSolid([1, 1, 1], 'JZ Key Mono', W, H, 1, D); km.adjustmentLayer = true;
        jzEffect(km, 'ADBE Tint', 'JZ Key Mono');
        if (KEY === 'green') { var kg = comp.layers.addSolid([0, 1, 0], 'JZ Key Green', W, H, 1, D); kg.blendingMode = BlendingMode.SCREEN; }
    }

    // no hidden leftovers anywhere in what was built (track mattes stay: After Effects keeps a matte's own video off)
    try { jzTidyTree(comp); } catch (et) { jzWarn('tidy: ' + et.toString()); }

    // audio layer (optional)
    if (opt.audioItem) { try { var au = comp.layers.add(opt.audioItem); au.startTime = opt.audioStart || 0; au.moveToEnd(); } catch (e8) { jzWarn('audio: ' + e8.toString()); } }
    comp.openInViewer();
    return comp;
}
function jzCutAtTime(cuts, t) { for (var i = cuts.length - 1; i >= 0; i--) if (t >= cuts[i].start - 1e-6 && t < cuts[i].end) return cuts[i]; return null; }
// scheme background: radial "lift" like the browser (Gradient Ramp on the solid)
function jzBgLift(L, sc, W, H) {
    var lift = jzLum(sc.bg) < 0.5 ? 0.045 : 0.1, b = jzHex(sc.bg);
    var c1 = [Math.min(1, b[0] + lift), Math.min(1, b[1] + lift), Math.min(1, b[2] + lift)];
    var ramp = jzEffect(L, 'ADBE Ramp', 'JZ BG Lift');
    jzEP(ramp, 1, [W / 2, H * 0.45]); jzEP(ramp, 2, c1); jzEP(ramp, 3, [W, H]); jzEP(ramp, 4, b); jzEP(ramp, 5, 2);
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

// ---------------------------------------------------------------- tidy: remove hidden / main-pass-only leftovers
// index of the layer used as track matte by layer i (0 = none): AE 23+ trackMatteLayer, else the legacy "layer above"
function jzMatteIndex(C, i) {
    var L = C.layer(i);
    try { if (L.trackMatteLayer) return L.trackMatteLayer.index; } catch (e) {}
    try { if (L.trackMatteType && L.trackMatteType !== TrackMatteType.NO_TRACK_MATTE && i > 1) return i - 1; } catch (e2) {}
    return 0;
}
// ghost = the ghost copy of a content comp: also drop the jzNoGhost() layers. A dropped layer that another kept layer still needs
// stays: as a track matte it keeps its video off (After Effects' own rule for mattes); as a parent it stays on at 0 % opacity.
function jzTidyComp(C, ghost) {
    var n = C.numLayers, i, cand = [], keep = [], par = [], mat = [], changed = true, L;
    for (i = 1; i <= n; i++) {
        L = C.layer(i); par[i] = 0; mat[i] = jzMatteIndex(C, i);
        try { if (L.parent) par[i] = L.parent.index; } catch (e) {}
        var hidden = false; try { hidden = !L.enabled; } catch (e1) {}
        cand[i] = hidden || (ghost && jzIsNoGhost(L));
    }
    for (i = 1; i <= n; i++) if (cand[i] && mat[i]) cand[mat[i]] = true;      // a matte goes with the layer it cuts
    for (i = 1; i <= n; i++) keep[i] = !cand[i];
    while (changed) {
        changed = false;
        for (i = 1; i <= n; i++) if (keep[i]) {
            if (par[i] && !keep[par[i]]) { keep[par[i]] = true; changed = true; }
            if (mat[i] && !keep[mat[i]]) { keep[mat[i]] = true; changed = true; }
        }
    }
    var isMatte = [];
    for (i = 1; i <= n; i++) if (keep[i] && mat[i]) isMatte[mat[i]] = true;
    for (i = n; i >= 1; i--) {
        L = C.layer(i);
        if (!keep[i]) { try { L.remove(); } catch (e2) { jzWarn('tidy remove: ' + e2.toString()); } continue; }
        if (!cand[i] || isMatte[i]) continue;
        // kept only as a parent: visible switch on, nothing drawn
        try { L.enabled = true; var op = L.property('ADBE Transform Group').property('ADBE Opacity'); try { op.expression = ''; } catch (e3) {} op.setValue(0); } catch (e4) { jzWarn('tidy parent: ' + e4.toString()); }
    }
}
function jzTidyTree(comp) {
    var seen = {}, todo = [comp], C, i, L;
    while (todo.length) {
        C = todo.pop();
        if (!C || seen[C.id]) continue;
        seen[C.id] = true;
        jzTidyComp(C, / ghost$/.test(C.name));
        for (i = 1; i <= C.numLayers; i++) { L = C.layer(i); try { if (L.source && L.source instanceof CompItem) todo.push(L.source); } catch (e) {} }
    }
}
