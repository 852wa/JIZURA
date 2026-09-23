/*  JIZURA probe \u2014 run once in After Effects: File > Scripts > Run Script File...
    Records the real parameter ranges of the effects / shape / text properties JIZURA uses and how After Effects
    invalidates script references, so the panel can be checked against the real application.
    Writes JIZURA_probe.txt to the desktop. It creates a temporary comp and removes it again (one undo step).  */
(function () {
    var EFFECTS = ["ADBE Linear Wipe", "ADBE Radial Wipe", "ADBE Iris Wipe", "ADBE Venetian Blinds", "ADBE Block Dissolve", "CC Grid Wipe", "ADBE Gaussian Blur 2", "ADBE Box Blur2", "ADBE Motion Blur", "ADBE Radial Blur", "CC Radial Blur", "ADBE Tint", "ADBE Fill", "ADBE Invert", "ADBE Tritone", "ADBE Color Balance (HLS)", "ADBE Brightness & Contrast 2", "ADBE Posterize", "ADBE Threshold2", "ADBE Mosaic", "ADBE Find Edges", "ADBE Noise", "ADBE Fractal Noise", "ADBE Ramp", "ADBE 4ColorGradient", "ADBE Glo2", "ADBE Drop Shadow", "ADBE Geometry2", "ADBE Wave Warp", "ADBE Turbulent Displace", "ADBE Bulge", "ADBE Twirl", "ADBE Ripple", "ADBE Spherize", "ADBE Optics Compensation", "ADBE Polar Coordinates", "CC Kaleida", "ADBE Mirror", "ADBE Tile", "ADBE Offset", "ADBE Echo", "ADBE Posterize Time", "ADBE Lens Flare", "CC Light Rays", "ADBE Roughen Edges", "ADBE Simple Choker"];
    var TEXTPROPS = ["ADBE Text Position 3D", "ADBE Text Anchor Point 3D", "ADBE Text Scale 3D", "ADBE Text Skew", "ADBE Text Skew Axis", "ADBE Text Rotation", "ADBE Text Opacity", "ADBE Text Fill Color", "ADBE Text Stroke Color", "ADBE Text Fill Opacity", "ADBE Text Stroke Opacity", "ADBE Text Stroke Width", "ADBE Text Tracking Amount", "ADBE Text Line Spacing", "ADBE Text Character Offset", "ADBE Text Blur", "ADBE Text Line Anchor", "ADBE Text Fill Brightness", "ADBE Text Fill Hue", "ADBE Text Fill Saturation"];
    var VECTORS = ["ADBE Vector Group", "ADBE Vector Shape - Rect", "ADBE Vector Shape - Ellipse", "ADBE Vector Shape - Star", "ADBE Vector Shape - Group", "ADBE Vector Graphic - Fill", "ADBE Vector Graphic - Stroke", "ADBE Vector Filter - Trim", "ADBE Vector Filter - Repeater", "ADBE Vector Filter - Zigzag", "ADBE Vector Filter - RC", "ADBE Vector Filter - Offset", "ADBE Vector Filter - Twist", "ADBE Vector Filter - PB"];
    var out = [], t0 = new Date().getTime();
    function s(v) {
        if (v === null || v === undefined) return 'null';
        if (typeof v === 'number') return isFinite(v) ? String(Math.round(v * 100000) / 100000) : 'null';
        if (typeof v === 'boolean') return v ? 'true' : 'false';
        if (v instanceof Array) { var a = []; for (var i = 0; i < v.length; i++) a.push(s(v[i])); return '[' + a.join(',') + ']'; }
        return '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]/g, ' ') + '"';
    }
    function leaf(P, path, idx) {
        var r = { path: path, i: idx, name: P.name, mn: P.matchName };
        try { r.type = P.propertyValueType; } catch (e) {}
        try { r.hasMin = P.hasMin; if (P.hasMin) r.min = P.minValue; } catch (e1) {}
        try { r.hasMax = P.hasMax; if (P.hasMax) r.max = P.maxValue; } catch (e2) {}
        try { if (P.propertyValueType !== PropertyValueType.NO_VALUE && P.propertyValueType !== PropertyValueType.CUSTOM_VALUE) { var v = P.value; if (typeof v === 'number' || v instanceof Array || typeof v === 'boolean') r.value = v; } } catch (e3) {}
        try { r.dropdown = P.isDropdownEffect; } catch (e4) {}
        try { r.canExpr = P.canSetExpression; } catch (e5) {}
        var a = []; for (var k in r) if (r.hasOwnProperty(k)) a.push('"' + k + '":' + s(r[k]));
        out.push('{' + a.join(',') + '}');
    }
    function dump(G, path, depth) {
        if (depth > 8) return;
        for (var i = 1; i <= G.numProperties; i++) {
            var P = G.property(i);
            if (P.propertyType === PropertyType.PROPERTY) leaf(P, path, i); else dump(P, path + ' > ' + P.matchName, depth + 1);
        }
    }
    function test(name, fn) { var r; try { r = fn(); } catch (e) { r = 'THREW ' + e.toString(); } out.push('#TEST ' + name + ' => ' + r); }
    function alive(o, f) { try { var x = f ? f(o) : o.name; return 'valid'; } catch (e) { return 'INVALID (' + e.toString() + ')'; } }

    app.beginUndoGroup('JIZURA probe');
    var comp = app.project.items.addComp('JIZURA probe', 400, 400, 1, 2, 24), i;
    out.push('#AE ' + app.version + ' ' + $.os + ' engine ' + app.project.expressionEngine);
    try {
        // ---- effects
        var S = comp.layers.addSolid([0.5, 0.5, 0.5], 'fx', 400, 400, 1, 2);
        for (i = 0; i < EFFECTS.length; i++) {
            try {
                var fx = S.property('ADBE Effect Parade').addProperty(EFFECTS[i]);
                out.push('#EFFECT ' + EFFECTS[i] + ' "' + fx.name + '" params ' + fx.numProperties);
                dump(fx, 'fx ' + EFFECTS[i], 0);
                S.property('ADBE Effect Parade').property(1).remove();
            } catch (e) { out.push('#EFFECT ' + EFFECTS[i] + ' ERROR ' + e.toString()); }
        }
        // ---- shape items
        var SH = comp.layers.addShape();
        for (i = 0; i < VECTORS.length; i++) {
            try {
                var g = SH.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');
                var it = g.property('ADBE Vectors Group').addProperty(VECTORS[i]);
                out.push('#SHAPE ' + VECTORS[i]);
                it = SH.property('ADBE Root Vectors Group').property(SH.property('ADBE Root Vectors Group').numProperties).property('ADBE Vectors Group').property(1);
                dump(it, 'shape ' + VECTORS[i], 0);
            } catch (e) { out.push('#SHAPE ' + VECTORS[i] + ' ERROR ' + e.toString()); }
        }
        dump(SH.property('ADBE Root Vectors Group').property(1).property('ADBE Vector Transform Group'), 'shape group transform', 0);
        dump(SH.property('ADBE Transform Group'), 'layer transform', 0);
        // ---- text animator properties / selectors
        var TX = comp.layers.addText('abc');
        for (i = 0; i < TEXTPROPS.length; i++) {
            try {
                var an = TX.property('ADBE Text Properties').property('ADBE Text Animators').addProperty('ADBE Text Animator');
                an.property('ADBE Text Animator Properties').addProperty(TEXTPROPS[i]);
                an = TX.property('ADBE Text Properties').property('ADBE Text Animators').property(TX.property('ADBE Text Properties').property('ADBE Text Animators').numProperties);
                out.push('#TEXT ' + TEXTPROPS[i]);
                dump(an.property('ADBE Text Animator Properties'), 'text ' + TEXTPROPS[i], 0);
            } catch (e) { out.push('#TEXT ' + TEXTPROPS[i] + ' ERROR ' + e.toString()); }
        }
        var sels = ['ADBE Text Selector', 'ADBE Text Expressible Selector', 'ADBE Text Wiggly Selector'];
        for (i = 0; i < sels.length; i++) {
            try {
                var an2 = TX.property('ADBE Text Properties').property('ADBE Text Animators').property(1);
                an2.property('ADBE Text Selectors').addProperty(sels[i]);
                an2 = TX.property('ADBE Text Properties').property('ADBE Text Animators').property(1);
                var sg = an2.property('ADBE Text Selectors');
                out.push('#SELECTOR ' + sels[i]);
                dump(sg.property(sg.numProperties), 'selector ' + sels[i], 0);
            } catch (e) { out.push('#SELECTOR ' + sels[i] + ' ERROR ' + e.toString()); }
        }
        // ---- masks
        try { var MK = S.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'); out.push('#MASK'); dump(S.property('ADBE Mask Parade').property(1), 'mask', 0); } catch (e) { out.push('#MASK ERROR ' + e.toString()); }

        // ---- reference invalidation
        var Z = comp.layers.addShape(), root = Z.property('ADBE Root Vectors Group');
        var g1 = root.addProperty('ADBE Vector Group'), g1c = g1.property('ADBE Vectors Group'), r1 = g1c.addProperty('ADBE Vector Shape - Rect');
        test('sibling item after adding fill (rect ref)', function () { g1c.addProperty('ADBE Vector Graphic - Fill'); return alive(r1, function (o) { return o.property('ADBE Vector Rect Size').value; }); });
        test('contents group ref after adding into it', function () { return alive(g1c, function (o) { return o.numProperties; }); });
        test('group ref after adding a 2nd root group', function () { root.addProperty('ADBE Vector Group'); return alive(g1, function (o) { return o.name; }); });
        test('nested contents ref after adding a 2nd root group', function () { return alive(g1c, function (o) { return o.numProperties; }); });
        test('root ref after adding groups', function () { return alive(root, function (o) { return o.numProperties; }); });
        var gA = root.property(1), gB = root.property(2);
        test('transform of group after expression on sibling', function () { gB.property('ADBE Vector Transform Group').property('ADBE Vector Position').expression = 'value'; return alive(gA, function (o) { return o.property('ADBE Vector Transform Group').property('ADBE Vector Position').value; }); });
        test('group ref after moveTo', function () { var q = root.property(2); q.moveTo(1); return alive(q, function (o) { return o.name; }) + ' / sibling ' + alive(gA, function (o) { return o.name; }); });
        test('group ref after duplicate of sibling', function () { var a = root.property(1), b = root.property(2); b.duplicate(); return alive(a, function (o) { return o.name; }) + ' / dup source ' + alive(b, function (o) { return o.name; }); });
        var par = S.property('ADBE Effect Parade'); while (par.numProperties) par.property(1).remove();
        var e1 = par.addProperty('ADBE Gaussian Blur 2');
        test('effect ref after adding 2nd effect', function () { par.addProperty('ADBE Glo2'); return alive(e1, function (o) { return o.property(1).value; }); });
        var e1p = par.property(1).property(1);
        test('effect param ref after adding 3rd effect', function () { par.addProperty('ADBE Tint'); return alive(e1p, function (o) { return o.value; }); });
        var mp = S.property('ADBE Mask Parade'), m1 = mp.addProperty('ADBE Mask Atom');
        test('mask ref after adding 2nd mask', function () { mp.addProperty('ADBE Mask Atom'); return alive(m1, function (o) { return o.name; }); });
        var ans = TX.property('ADBE Text Properties').property('ADBE Text Animators'), a1 = ans.addProperty('ADBE Text Animator');
        test('animator ref after adding 2nd animator', function () { ans.addProperty('ADBE Text Animator'); return alive(a1, function (o) { return o.name; }); });
        var a3 = ans.property(ans.numProperties), ap = a3.property('ADBE Text Animator Properties'), pp1 = ap.addProperty('ADBE Text Position 3D');
        test('animator prop ref after adding 2nd prop', function () { ap.addProperty('ADBE Text Opacity'); return alive(pp1, function (o) { return o.value; }); });
        var sl = a3.property('ADBE Text Selectors'), s1 = sl.addProperty('ADBE Text Selector');
        test('selector ref after adding 2nd selector', function () { sl.addProperty('ADBE Text Expressible Selector'); return alive(s1, function (o) { return o.name; }); });
        test('animator props group ref after adding selector', function () { return alive(ap, function (o) { return o.numProperties; }); });
        var tr = S.property('ADBE Transform Group');
        test('layer transform ref after adding effects', function () { par.addProperty('ADBE Fill'); return alive(tr, function (o) { return o.property('ADBE Position').value; }); });
        test('Ramp blend 50', function () { var r = par.addProperty('ADBE Ramp'); try { r.property(7).setValue(50); return 'ok ' + r.property(7).value; } catch (e) { return 'ERR ' + e.toString(); } });
    } catch (eAll) { out.push('#FATAL ' + eAll.toString() + (eAll.line ? ' line ' + eAll.line : '')); }
    try { comp.remove(); } catch (eR) {}
    app.endUndoGroup();
    out.push('#DONE ' + ((new Date().getTime() - t0) / 1000) + 's');
    var f = new File(Folder.desktop.fsName + '/JIZURA_probe.txt'); f.encoding = 'UTF-8';
    if (f.open('w')) { f.write(out.join('\n')); f.close(); alert('JIZURA probe: \u30C7\u30B9\u30AF\u30C8\u30C3\u30D7\u306B JIZURA_probe.txt \u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F\uFF08' + out.length + ' \u884C\uFF09\u3002'); }
    else alert('JIZURA probe: \u30D5\u30A1\u30A4\u30EB\u3092\u4FDD\u5B58\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u74B0\u5883\u8A2D\u5B9A \u2192 \u30B9\u30AF\u30EA\u30D7\u30C8\u3068\u30A8\u30AF\u30B9\u30D7\u30EC\u30C3\u30B7\u30E7\u30F3 \u2192\u300C\u30B9\u30AF\u30EA\u30D7\u30C8\u306B\u3088\u308B\u30D5\u30A1\u30A4\u30EB\u3078\u306E\u66F8\u304D\u8FBC\u307F\u3068\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u3078\u306E\u30A2\u30AF\u30BB\u30B9\u3092\u8A31\u53EF\u300D\u3092\u30AA\u30F3\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002');
})();
