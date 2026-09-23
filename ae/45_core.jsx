// ================================================================ core entries for the newer groups + shared helpers
// (text treatment / background graphic / camera / effect events / cut-to-cut transitions)

// ---- expression header for anything placed on the MAIN comp timeline for one event / transition
function jzEvHead(t0, dur, extra) {
    return 'var T0=' + jzN(t0) + ',TD=' + jzN(Math.max(1 / 240, dur)) + (extra || '') + ';\n' + JZ_FNS + 'var p=cl((time-T0)/TD);\n';
}
// adjustment layer on the main comp covering [t0, t0+dur] (+ a little pre-roll)
function jzAdjLayer(comp, name, t0, dur) {
    var L = comp.layers.addSolid([1, 1, 1], name, comp.width, comp.height, 1, comp.duration);
    L.adjustmentLayer = true;
    L.inPoint = Math.max(0, t0); L.outPoint = Math.min(comp.duration, Math.max(t0 + dur, t0 + 1 / 24));
    return L;
}
// shape layer on the main comp covering [t0, t0+dur]; origin at the comp's top-left
function jzEvShape(comp, name, t0, dur) {
    var L = comp.layers.addShape(); L.name = name;
    jzXf(L, 'ADBE Position').setValue([0, 0]);
    L.inPoint = Math.max(0, t0); L.outPoint = Math.min(comp.duration, Math.max(t0 + dur, t0 + 1 / 24));
    return L;
}
function jzEvSolid(comp, name, hex, t0, dur) {
    var L = comp.layers.addSolid(jzHex(hex), name, comp.width, comp.height, 1, comp.duration);
    L.inPoint = Math.max(0, t0); L.outPoint = Math.min(comp.duration, Math.max(t0 + dur, t0 + 1 / 24));
    return L;
}

// ---- text treatment: none
jzReg('treat', 'none', { apply: function (ctx, L, P, o) {} });
// ---- background graphic: none (the scheme colour + radial lift is always there)
jzReg('bg', 'none', { build: function (b, P) {} });
// ---- camera: slow push-in (the default)
jzReg('cam', 'push', { apply: function (cam, P) {
    jzSetExpr(jzXf(cam.nul, 'ADBE Scale'), 'var s=1+0.03*' + jzN(cam.fx.motion) + '*Math.min(1,Math.max(0,time/' + jzN(Math.max(0.3, cam.cut.dur)) + '));[value[0]*s,value[1]*s]');
} });

// ---- effect events handled by the global layers in jzBuild (chroma = ghost offsets, shake / slice / zoom / invert / flash)
jzReg('fx', 'chroma', { builtin: true, build: function (f, ev) {} });
jzReg('fx', 'shake', { builtin: true, build: function (f, ev) {} });
jzReg('fx', 'slice', { builtin: true, build: function (f, ev) {} });
jzReg('fx', 'invert', { builtin: true, build: function (f, ev) {} });
jzReg('fx', 'flash', { builtin: true, build: function (f, ev) {} });
jzReg('fx', 'zoom', { builtin: true, build: function (f, ev) {} });
// block glitch: a few frames of coarse mosaic with the picture knocked sideways
jzReg('fx', 'block', { build: function (f, ev) {
    var L = jzAdjLayer(f.comp, 'JZ FX block', ev.t, ev.dur);
    var mo = jzEffect(L, 'ADBE Mosaic', 'JZ Block'); jzEP(mo, 1, 28); jzEP(mo, 2, 16); jzEP(mo, 3, 1);
    var of = jzEffect(L, 'ADBE Offset', 'JZ Block Shift');
    jzEX(of, 1, 'posterizeTime(24);seedRandom(' + (ev.seed || 3) + '+Math.floor(time*24),true);[value[0]+random(-1,1)*thisComp.width*0.04*' + jzN(ev.amp || 1) + ',value[1]]');
} });
// mosaic
jzReg('fx', 'mosaic', { build: function (f, ev) {
    var L = jzAdjLayer(f.comp, 'JZ FX mosaic', ev.t, ev.dur);
    var mo = jzEffect(L, 'ADBE Mosaic', 'JZ Mosaic'); jzEP(mo, 3, 1);
    jzEX(mo, 1, jzEvHead(ev.t, ev.dur) + 'Math.round(linear(p,0,1,24,90))');
    jzEX(mo, 2, jzEvHead(ev.t, ev.dur) + 'Math.round(linear(p,0,1,24,90)*thisComp.height/thisComp.width)');
} });

// ---- shared by background / decor packs: faint tones
function jzLayC(sc, k) { return jzMixHex(sc.bg, sc.fg, k); }      // faint layer tone (k ≈ 0.05..0.15), = layC in the browser
function jzTintC(sc, k) { return jzMixHex(sc.bg, sc.accent, k); } // faint accent tone, = tintC
// ---- shared by camera packs
function jzKM(cam) { return jzClamp(cam.fx.motion * 1.25, 0, 1.25); }     // KM(env) in the browser
// expression header for camera moves: DUR, KM, cu (= time / DUR clamped), easing incl. ios (in-out sine)
function jzCamHead(cam) { return 'var DUR=' + jzN(Math.max(0.3, cam.cut.dur)) + ',KM=' + jzN(jzKM(cam)) + ',SD=' + ((cam.cut.seed || 0) % 99991) + ';\n' + JZ_FNS + 'function ios(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}var cu=cl(time/DUR);\n'; }
// ---- shared by transition packs
function jzTAcc(t) { return t.sc.accent; }
function jzBellExpr() { return 'function bell(x){x=cl(x);return Math.sin(Math.PI*x);}'; }
