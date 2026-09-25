// ================================================================ diagnostics (real After Effects)
// Walks a built comp tree, evaluates every expression at a few times and collects AE's own error messages
// (Property.expressionError), plus the substitutions and warnings of the build. Used by the panels'
// "診断レポート" button; the report is plain text so it can be sent as-is.
var JZ_PANEL_VERSION = '@VERSION@';
// parts this panel can build, counted like the browser (its expression groups' orders)
function jzPartsCount() {
    var n = 0, g, i, o = JZ_DATA.orders || {};
    for (g in o) if (o.hasOwnProperty(g) && JZ_REG[g]) for (i = 0; i < o[g].length; i++) if (JZ_REG[g][o[g][i]]) n++;
    return n;
}
function jzDiagnose(comp, plan, maxSecs) {
    var t0 = new Date().getTime(), limit = (maxSecs || 120) * 1000, seen = {}, errs = [], nExpr = 0, nErr = 0, nComps = 0, nLayers = 0, stopped = false;
    function walkProps(G, L, path, depth) {
        if (stopped || depth > 12) return;
        var n = 0; try { n = G.numProperties || 0; } catch (e) { n = 0; }
        for (var i = 1; i <= n; i++) {
            if (new Date().getTime() - t0 > limit) { stopped = true; return; }
            var P = null; try { P = G.property(i); } catch (e1) { continue; }
            if (!P) continue;
            var nm = path + ' > ' + P.name, sub = 0;
            try { sub = P.numProperties || 0; } catch (e2) { sub = 0; }
            if (sub > 0) { walkProps(P, L, nm, depth + 1); continue; }
            var ex = ''; try { ex = P.canSetExpression && P.expressionEnabled !== false ? P.expression : ''; } catch (e3) { ex = ''; }
            if (!ex) continue;
            nExpr++;
            var msg = '', a = Math.max(L.inPoint, 0), b = Math.max(a, L.outPoint - 0.05), ts = [a + 0.02, (a + b) / 2, b], j;
            for (j = 0; j < ts.length && !msg; j++) {
                try { P.valueAtTime(ts[j], false); } catch (e4) { msg = 'eval: ' + e4.toString(); }
                try { if (!msg && P.expressionError) msg = String(P.expressionError); } catch (e5) {}
            }
            if (msg) { nErr++; if (errs.length < 300) errs.push(nm + '\n      ' + msg.split('\n')[0]); }
        }
    }
    function walkComp(C, path) {
        if (!C || seen[C.id]) return;
        seen[C.id] = true; nComps++;
        for (var i = 1; i <= C.numLayers; i++) {
            if (stopped) return;
            var L = C.layer(i); nLayers++;
            walkProps(L, L, path + ' / ' + L.name, 0);
            try { if (L.source && L.source instanceof CompItem) walkComp(L.source, L.source.name); } catch (e) {}
        }
    }
    walkComp(comp, comp ? comp.name : '?');
    var out = [];
    out.push('JIZURA 診断レポート');
    out.push('panel ' + JZ_PANEL_VERSION + ' / parts ' + jzPartsCount() + ' / After Effects ' + app.version + ' / ' + $.os);
    try { out.push('expression engine: ' + app.project.expressionEngine); } catch (e6) {}
    out.push('comp: ' + (comp ? comp.name + ' ' + comp.width + 'x' + comp.height + ' ' + comp.frameRate + 'fps' : '(none)'));
    out.push('checked: comps ' + nComps + ', layers ' + nLayers + ', expressions ' + nExpr + (stopped ? ' (time limit — partial)' : '') + ', ' + ((new Date().getTime() - t0) / 1000).toFixed(1) + 's');
    out.push('substitutions: ' + JZ_FALLBACKS + (JZ_FALLBACK_KEYS.length ? '  ' + JZ_FALLBACK_KEYS.join(', ') : ''));
    var mf = jzMissingFonts(); if (mf.length) out.push('missing fonts: ' + mf.join(', '));
    out.push('build notes: ' + JZLOG.length);
    for (var k = 0; k < JZLOG.length && k < 60; k++) out.push('   ' + JZLOG[k]);
    out.push('expression errors: ' + nErr);
    for (k = 0; k < errs.length; k++) out.push('   ' + errs[k]);
    if (plan && plan.cuts) {
        out.push('cuts:');
        for (k = 0; k < plan.cuts.length; k++) {
            var c = plan.cuts[k], dl = [], d;
            for (d = 0; c.decor && d < c.decor.length; d++) dl.push(c.decor[d].id);
            out.push('   ' + (k + 1) + ' ' + jzN(c.start) + '-' + jzN(c.end) + ' layout ' + c.layout + ' / enter ' + c.enter + ' / hold ' + c.hold + ' / exit ' + c.exit +
                ' / treat ' + (c.treat || '-') + ' / bg ' + (c.bg || '-') + ' / cam ' + (c.cam || '-') + ' / trans ' + (c.trans || '-') + ' / decor ' + dl.join(','));
        }
        var ev = [];
        for (k = 0; plan.events && k < plan.events.length; k++) ev.push(plan.events[k].type + '@' + jzN(plan.events[k].t));
        out.push('events: ' + ev.join(' '));
    }
    return { text: out.join('\n'), errors: nErr, expressions: nExpr, partial: stopped };
}
// save next to the project (or on the desktop); returns the file path or null
function jzSaveReport(text) {
    var dirs = [], f, i;
    try { if (app.project.file) dirs.push(app.project.file.parent); } catch (e) {}
    try { dirs.push(Folder.desktop); } catch (e1) {}
    try { dirs.push(Folder.temp); } catch (e2) {}
    for (i = 0; i < dirs.length; i++) {
        try {
            f = new File(dirs[i].fsName + '/JIZURA_report.txt'); f.encoding = 'UTF-8'; f.lineFeed = 'Windows';
            if (f.open('w')) { f.write(text); f.close(); return f.fsName; }
        } catch (e3) {}
    }
    return null;
}
