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

    // ---- building runs as a job in short steps (the panel calls step() again and again), so After Effects gets
    //      control back between steps and never shows "not responding" on long songs
    var job = null, jobT0 = 0, jobPlan = null, jobAudio = false;
    function start(s, audioId) {
        var C, plan;
        job = null; jobT0 = new Date().getTime();
        try { C = core(); } catch (e0) { return fail('engine: ' + e0.toString()); }
        try { plan = C.parse(s); } catch (e1) { return fail('JSON: ' + e1.toString()); }
        if (!plan || !plan.cuts || !plan.style) return fail('JIZURA の構成データではありません');
        if (!C.start) return fail('engine: jizura_core.jsx is too old — reinstall the panel');
        var au = audioId ? findItem(audioId) : null, err = null, off = +plan.audioOffset || 0;
        app.beginUndoGroup('JIZURA');
        try { job = C.start(plan, { roles: roles(C), audioItem: au, audioStart: -off }); }
        catch (e2) { err = e2.toString() + (e2.line ? ' (line ' + e2.line + ')' : ''); job = null; }
        finally { app.endUndoGroup(); }
        if (!job) return fail(err || 'build');
        jobPlan = plan; jobAudio = !!au;
        return str({ ok: true, name: job.comp.name, total: job.total, events: job.events });
    }
    function result(C, cancelled) {
        var comp = job.comp, log = C.log() || [], notes = [];
        for (var i = 0; i < log.length && i < 20; i++) notes.push(String(log[i]));
        lastComp = comp; lastPlan = jobPlan;
        return { ok: true, done: true, cancelled: cancelled, name: comp.name, cuts: job.done, total: job.total, secs: (new Date().getTime() - jobT0) / 1000,
            fallbacks: C.fallbacks(), notes: notes, notesTotal: log.length, audio: jobAudio, missingFonts: C.missingFonts ? C.missingFonts() : [], fontCheck: !(C.fontCheckUnavailable && C.fontCheckUnavailable()) };
    }
    function step(ms) {
        if (!job) return fail('生成中のコンポがありません');
        var C = core(), err = null;
        app.beginUndoGroup('JIZURA');
        try { job.step(ms > 0 ? ms : 1200); }
        catch (e) { err = e.toString() + (e.line ? ' (line ' + e.line + ')' : ''); }
        finally { app.endUndoGroup(); }
        if (err) { job = null; return fail(err); }
        if (!job.finished) return str({ ok: true, done: false, phase: job.phase, cuts: job.done, total: job.total, eventsDone: job.eventsDone, events: job.events });
        var r = result(C, !!job.cancelled); job = null;
        return str(r);
    }
    function build(s, audioId) {           // all at once (older panels)
        var r = start(s, audioId); if (!job) return r;
        var out; do { out = step(1e9); } while (job);
        return out;
    }
    function readTemp(path) {
        var f = File(path);
        if (!f.exists) return null;
        f.encoding = 'UTF-8'; f.open('r'); var s = f.read(); f.close();
        try { f.remove(); } catch (e) {}
        return s;
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
        buildFromFile: function (path, audioId) { var s = readTemp(path); return s == null ? fail('構成データの一時ファイルが見つかりません') : build(s, audioId); },
        buildFromString: function (enc, audioId) { return build(decodeURIComponent(enc), audioId); },
        startFromFile: function (path, audioId) { var s = readTemp(path); return s == null ? fail('構成データの一時ファイルが見つかりません') : start(s, audioId); },
        startFromString: function (enc, audioId) { return start(decodeURIComponent(enc), audioId); },
        step: function (ms) { return step(ms); },
        cancel: function () { if (job) job.cancelled = true; return str({ ok: true }); },
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
