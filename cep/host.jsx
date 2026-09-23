/*  JIZURA 字面 — host script of the After Effects CEP panel (ExtendScript, ES3).
    The panel (index.html) talks to After Effects through evalScript('JZCEP.xxx(...)'); every call returns a JSON string.
    The build engine itself (jizura_core.jsx, the same code as JIZURA_AE.jsx without its ScriptUI) is loaded once by init().  */
var JZCEP = (function () {
    var ROOT = null, lastComp = null, lastPlan = null;
    try { ROOT = File($.fileName).parent.parent.fsName; } catch (e) {}

    // ---- tiny JSON writer (ExtendScript has no JSON object)
    function q(s) {
        s = String(s); var out = '"', i, c, ch, h;
        for (i = 0; i < s.length; i++) {
            ch = s.charAt(i); c = s.charCodeAt(i);
            if (ch === '"' || ch === '\\') out += '\\' + ch;
            else if (c < 32 || c > 126) { h = c.toString(16); out += '\\u' + ('0000' + h).slice(-4); }
            else out += ch;
        }
        return out + '"';
    }
    function str(v) {
        var t = typeof v, a, i, k;
        if (v === null || v === undefined) return 'null';
        if (t === 'number') return isFinite(v) ? String(v) : 'null';
        if (t === 'boolean') return v ? 'true' : 'false';
        if (t === 'string') return q(v);
        if (v instanceof Array) { a = []; for (i = 0; i < v.length; i++) a.push(str(v[i])); return '[' + a.join(',') + ']'; }
        a = []; for (k in v) if (v.hasOwnProperty(k)) a.push(q(k) + ':' + str(v[k]));
        return '{' + a.join(',') + '}';
    }
    function fail(msg) { return str({ ok: false, error: String(msg) }); }

    function core() {
        if (!$.global.JZ_CORE) {
            var f = File(ROOT + '/jsx/jizura_core.jsx');
            if (!f.exists) throw new Error('jizura_core.jsx not found: ' + f.fsName);
            $.evalFile(f);
        }
        return $.global.JZ_CORE;
    }
    // fonts: the same settings as the ScriptUI panel (JIZURA_AE.jsx → フォント tab), defaults otherwise
    function setting(k, d) { try { if (app.settings.haveSetting('JIZURA', k)) return decodeURIComponent(app.settings.getSetting('JIZURA', k)); } catch (e) {} return d; }
    function roles(C) {
        var d = C.roleDefault;
        return { display: setting('font_display', d.display), serif: setting('font_serif', d.serif), body: setting('font_body', d.body), mono: setting('font_mono', d.mono), __force: setting('forceFonts', '0') === '1' };
    }
    function findItem(id) {
        for (var i = 1; i <= app.project.numItems; i++) { var it = app.project.item(i); if (it.id === id) return it; }
        return null;
    }
    function activeComp() { var c = app.project.activeItem; return (c && c instanceof CompItem) ? c : null; }
    function audioLayerOf(c) {
        if (!c) return null;
        var sel = c.selectedLayers, i;
        for (i = 0; i < sel.length; i++) { try { if (sel[i].hasAudio && sel[i].source && sel[i].source.file) return sel[i]; } catch (e) {} }
        return null;
    }

    function build(s, audioId) {
        var C, plan, t0 = new Date().getTime();
        try { C = core(); } catch (e0) { return fail('engine: ' + e0.toString()); }
        try { plan = C.parse(s); } catch (e1) { return fail('JSON: ' + e1.toString()); }
        if (!plan || !plan.cuts || !plan.style) return fail('JIZURA の構成データではありません');
        var au = audioId ? findItem(audioId) : null, comp = null, err = null;
        app.beginUndoGroup('JIZURA');
        try { comp = C.build(plan, { roles: roles(C), audioItem: au, audioStart: 0 }); }
        catch (e2) { err = e2.toString() + (e2.line ? ' (line ' + e2.line + ')' : ''); }
        finally { app.endUndoGroup(); }
        if (comp) { lastComp = comp; lastPlan = plan; }
        var log = C.log() || [], notes = [];
        for (var i = 0; i < log.length && i < 20; i++) notes.push(String(log[i]));
        return str({ ok: !!comp && !err, error: err, name: comp ? comp.name : null, cuts: plan.cuts.length, secs: (new Date().getTime() - t0) / 1000,
            fallbacks: C.fallbacks(), notes: notes, notesTotal: log.length, audio: !!au, missingFonts: comp && C.missingFonts ? C.missingFonts() : [], fontCheck: !(C.fontCheckUnavailable && C.fontCheckUnavailable()) });
    }

    return {
        // root = the extension folder (the panel passes it; $.fileName is only a fallback)
        init: function (root) {
            if (root) ROOT = root;
            try { var C = core(); return str({ ok: true, app: app.version, engine: C.version, styles: C.data.styleOrder.length }); }
            catch (e) { return fail(e.toString()); }
        },
        info: function () {
            var c = activeComp(), r = { ok: true, app: app.version, comp: null };
            if (c) {
                r.comp = { name: c.name, width: c.width, height: c.height, fps: c.frameRate, duration: c.duration, markers: c.markerProperty.numKeys };
                var L = c.selectedLayers.length ? c.selectedLayers[0] : null;
                if (L) r.layer = { name: L.name, markers: L.property('ADBE Marker').numKeys, start: L.startTime };
                var A = audioLayerOf(c); if (A) r.audio = { name: A.source.name, start: A.startTime };
            }
            return str(r);
        },
        // the audio file behind the selected layer of the active comp (the panel analyses it for beats)
        selectedAudio: function () {
            var c = activeComp();
            if (!c) return fail('コンポを開いて、曲のレイヤーを選択してください');
            var L = audioLayerOf(c);
            if (!L) return fail('曲（音声ファイル）のレイヤーを選択してください');
            return str({ ok: true, id: L.source.id, name: L.source.name, path: L.source.file.fsName, start: L.startTime, comp: c.name });
        },
        // marker times → line start times (seconds from the start of the song)
        markers: function () {
            var c = activeComp();
            if (!c) return fail('コンポを開いてください');
            var L = c.selectedLayers.length ? c.selectedLayers[0] : null, mk = null, src = 'comp', i;
            try { if (L && L.property('ADBE Marker').numKeys > 0) { mk = L.property('ADBE Marker'); src = 'layer'; } } catch (e) {}
            if (!mk) mk = c.markerProperty;
            if (!mk || mk.numKeys < 1) return fail('マーカーが見つかりません（曲のレイヤーかコンポにマーカーを打ってください）');
            var A = audioLayerOf(c), off = A ? A.startTime : 0, t = [];
            for (i = 1; i <= mk.numKeys; i++) t.push(Math.max(0, mk.keyTime(i) - off));
            return str({ ok: true, source: src, times: t, offset: off });
        },
        buildFromFile: function (path, audioId) {
            var f = File(path);
            if (!f.exists) return fail('構成データの一時ファイルが見つかりません');
            f.encoding = 'UTF-8'; f.open('r'); var s = f.read(); f.close();
            try { f.remove(); } catch (e) {}
            return build(s, audioId);
        },
        buildFromString: function (enc, audioId) { return build(decodeURIComponent(enc), audioId); },
        // check the last built comp in this AE session: evaluates every expression and saves JIZURA_report.txt
        diagnose: function () {
            var C; try { C = core(); } catch (e0) { return fail(e0.toString()); }
            var ok = false; try { ok = !!(lastComp && lastComp.name); } catch (e) { ok = false; }
            if (!ok) return fail('先にこのパネルでコンポを作ってください');
            var r = C.diagnose(lastComp, lastPlan, 120), path = C.saveReport(r.text);
            return str({ ok: true, errors: r.errors, expressions: r.expressions, partial: r.partial, path: path });
        }
    };
})();
