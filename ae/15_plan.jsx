// ================================================================ planner (AE standalone mode)
// Same decisions as the browser app: chunks -> cuts -> weighted recipe picks -> events.
function jzW(obj, k, d) { return (obj && obj[k] != null) ? obj[k] : d; }
function jzNovelty(hist, key, val) {
    var w = 1;
    for (var i = hist.length - 1, d = 0; i >= 0 && d < 6; i--, d++) if (hist[i][key] === val) w *= d < 2 ? 0.2 : 0.6;
    return w;
}
var JZ_FITS = { center: [1, 99], mixed: [2, 16], vcols: [1, 18], marquee: [1, 12], tile: [1, 12], scatter: [2, 14], ring: [2, 16], wave: [2, 16], huge: [1, 8], labels: [1, 16], condensed: [1, 10], gloss: [1, 12], type: [1, 28], diag: [1, 14], circle: [1, 10], stack: [1, 12], pill: [1, 14] };
var JZ_LAYOUT_ENTER = { type: { type: 4, scramble: 1.5 }, ring: { pop: 2, spin: 2, cut: 1, assemble: 0.4, slice: 0.2, wipe: 0.2 }, labels: { cut: 3, pop: 1 }, wave: { pop: 1.5, drop: 1.5, blur: 1, slice: 0.3 }, tile: { assemble: 1.3, slice: 1.4, zoom: 1.4 }, huge: { zoom: 1.5, wipe: 1.5, slice: 1.4, stretch: 1.3, type: 0.2 }, mixed: { pop: 1.6, drop: 1.6, spin: 1.3 }, scatter: { pop: 1.5, spin: 1.5, drop: 1.2, assemble: 1.3 }, vcols: { assemble: 1.8, type: 1.2 }, pill: { wipe: 1.8, type: 1.2 } };

function jzPickLayout(rng, st, en, n, dur, hist, emph, recap) {
    var c = [], order = JZ_DATA.layoutOrder;
    for (var i = 0; i < order.length; i++) {
        var k = order[i], f = JZ_FITS[k];
        if (!en[k] || !f || n < f[0] || n > f[1]) continue;
        var w = jzW(st.bias.layout, k, 1) * jzNovelty(hist, 'layout', k);
        if (emph && /^(huge|center|tile|marquee|condensed)$/.test(k)) w *= 2;
        if (recap && /^(center|stack|marquee|tile|mixed|type|gloss)$/.test(k)) w *= 1.8;
        if (dur < 0.5 && /^(wave|ring|labels|gloss|type|tile)$/.test(k)) w *= 0.3;
        if (dur < 0.5 && /^(center|huge|condensed|vcols)$/.test(k)) w *= 1.4;
        c.push([k, w]);
    }
    return c.length ? rng.wpick(c) : 'center';
}
function jzPickEnter(rng, st, en, layout, dur, hist, emph, n) {
    var c = [], order = JZ_DATA.enterOrder;
    for (var i = 0; i < order.length; i++) {
        var k = order[i]; if (!en[k]) continue;
        var w = jzW(st.bias.enter, k, 1) * jzNovelty(hist, 'enter', k) * jzW(JZ_LAYOUT_ENTER[layout], k, 1);
        if (k === 'cut') w *= 0.5;
        if (dur < 0.45 && /^(type|assemble|drop|spin|pop|flicker)$/.test(k)) w *= 0.25;
        if (dur < 0.45 && /^(cut|slice|zoom|stretch)$/.test(k)) w *= 1.8;
        if (k === 'type' && n > 18) w *= 0.3;
        if (emph && /^(zoom|assemble|slice)$/.test(k)) w *= 1.8;
        c.push([k, w]);
    }
    return c.length ? rng.wpick(c) : 'cut';
}
function jzPickExit(rng, st, en, layout, dur, last, hist) {
    var c = [], order = JZ_DATA.exitOrder;
    for (var i = 0; i < order.length; i++) {
        var k = order[i]; if (!en[k]) continue;
        var w = jzW(st.bias.exit, k, 1) * jzNovelty(hist, 'exit', k);
        if (k === 'cut') w *= dur < 0.6 ? 4 : (last ? 1.2 : 2.2);
        if (dur < 0.6 && k !== 'cut') w *= 0.4;
        if (/^(labels|ring|tile)$/.test(layout) && /^(explode|fall|drift)$/.test(k)) w *= 0.3;
        c.push([k, w]);
    }
    return c.length ? rng.wpick(c) : 'cut';
}
function jzParams(layout, rng, st, text) {
    var n = jzCount(text), D = st.fonts.display, S = st.fonts.serif, B = st.fonts.body;
    function both(a, b) { return a.concat(b); }
    switch (layout) {
        case 'center': return { font: rng.pick(rng.chance(0.7) ? D : S), sx: rng.pick([1, 1, 1, 1.25, 1.45, 0.78]), track: rng.range(0.02, 0.14), sub: rng.chance(0.45), under: rng.chance(0.3), accent: rng.chance(0.18), ox: rng.range(-0.05, 0.05), oy: rng.range(-0.06, 0.06) };
        case 'mixed': return { fontBig: rng.pick(both(D, S)), fontSmall: rng.pick(both(S, B)), mode: rng.pick(['line', 'stair', 'line', 'wave']), rotAmp: rng.range(2, 10), smallK: rng.range(0.42, 0.6), accentIdx: rng.int(0, 20) };
        case 'vcols': return { variant: n <= 5 ? rng.pick(['repeat', 'repeat', 'split']) : (n <= 9 ? rng.pick(['split', 'repeat']) : 'split'), cols: n <= 4 ? rng.pick([3, 5, 5]) : 3, font: rng.pick(both(S, D)), side: rng.pick(['same', 'outline', 'dim']), perCol: rng.int(3, 6) };
        case 'marquee': return { rows: rng.pick([2, 4, 4, 2]), rowStyle: rng.pick(['outline', 'dim', 'box']), speed: rng.range(0.5, 1.2), font: rng.pick(D), sx: rng.pick([1.25, 1.45, 1.6]) };
        case 'tile': return { unit: rng.pick(['chunk', 'line', 'chunk']), knock: rng.pick(['stroke', 'box']), font: rng.pick(D), tileFont: rng.pick(both(S, B)), rowsN: rng.pick([12, 14, 16]) };
        case 'scatter': return { font: rng.pick(D), fontB: rng.pick(both(S, D)), extras: rng.chance(0.65) };
        case 'ring': return { center: rng.pick(['word', 'disc', 'word', 'none']), speed: rng.range(4, 12) * rng.pick([1, -1]), R: rng.range(0.28, 0.35), font: rng.pick(both(D, S)), fontC: rng.pick(both(D, S)) };
        case 'wave': return { amp: rng.range(0.08, 0.17), freq: rng.range(0.8, 1.6), trail: rng.pick([5, 7, 9]), font: rng.pick(D), travel: rng.range(0.25, 0.5) * rng.pick([1, -1]) };
        case 'huge': return { font: rng.pick(D), grad: !!st.useGrad && rng.chance(0.75), dir: rng.pick([1, -1]), label: rng.chance(0.8) };
        case 'labels': return { variant: rng.pick(['radial', 'rows', 'scatter']), unit: n <= 6 ? 'char' : rng.pick(['char', 'word']), center: rng.pick(['orb', 'word', 'none']), font: rng.pick(both(D, B)), fontC: rng.pick(D) };
        case 'condensed': return { count: n <= 4 ? rng.pick([3, 2, 1]) : (n <= 7 ? rng.pick([2, 1]) : 1), sx: rng.range(0.42, 0.58), sy: rng.range(1.1, 1.3), font: rng.pick(both(D, B)) };
        case 'gloss': return { font: rng.pick(both(S, D)), side: rng.pick(['right', 'left']), bgText: rng.chance(0.6), vertNote: rng.chance(0.45) };
        case 'type': return { font: rng.pick(both(B, S)), align: rng.pick(['left', 'center']), prompt: rng.chance(0.6) };
        case 'diag': return { ang: rng.range(10, 22) * rng.pick([1, -1]), band: rng.pick(['accent', 'ink']), second: rng.chance(0.7), font: rng.pick(D) };
        case 'circle': return { variant: rng.pick(['disc', 'eclipse', 'ring']), vertical: n <= 4 && rng.chance(0.5), font: rng.pick(both(D, S)), off: rng.range(-0.12, 0.12) };
        case 'stack': return { copies: rng.pick([3, 4, 5]), dir: rng.pick([1, -1]), style: rng.pick(['fade', 'outline', 'fade']), font: rng.pick(both(D, S)), gap: rng.range(0.82, 1.02), xs: rng.range(-0.04, 0.04) };
        case 'pill': return { grad: !!st.useGrad || rng.chance(0.35), font: rng.pick(both(D, B)), smalls: rng.chance(0.75) };
    }
    return {};
}
function jzPickDecor(rng, st, en, fx) {
    var count = Math.round(fx.decor * 2.8 * rng.range(0.45, 1.15)), c = [], out = [], order = JZ_DATA.decorOrder, i;
    for (i = 0; i < order.length; i++) if (en[order[i]]) c.push([order[i], jzW(st.decor, order[i], 0.12)]);
    for (i = 0; i < count && c.length; i++) {
        var k = rng.wpick(c);
        for (var j = 0; j < c.length; j++) if (c[j][0] === k) { c.splice(j, 1); break; }
        out.push({ id: k, seed: rng.int(1, 999999999), n: rng.int(1, 3) + (k === 'shapes' ? 3 : 0) + (k === 'sparks' ? 4 : 0), right: rng.chance(0.5), low: rng.chance(0.5), accent: rng.chance(0.4), corner: rng.chance(0.5), big: rng.chance(0.4), mode: rng.pick(['count', 'index']), from: rng.int(0, 20), to: rng.int(30, 999) });
    }
    return out;
}
function jzPartition(chunks, k) {
    var lens = [], tot = 0, i;
    for (i = 0; i < chunks.length; i++) { lens.push(jzChars(chunks[i]).length + 1); tot += lens[i]; }
    var target = tot / k, groups = [], cur = [], acc = 0, remG = k;
    for (i = 0; i < chunks.length; i++) {
        var remC = chunks.length - i;
        if (cur.length && (acc + lens[i] / 2 > target || remC < remG) && groups.length < k - 1) { groups.push(cur); cur = []; acc = 0; remG--; }
        cur.push(chunks[i]); acc += lens[i];
    }
    if (cur.length) groups.push(cur);
    return groups;
}

// o: {lyrics, title, artist, style, seed, fx, width, height, fps, bpm, starts[], enabled{layout,enter,exit,hold,decor}, offset, lineScale, duration}
function jzMakePlan(o) {
    var st = JZ_DATA.styles[o.style] || JZ_DATA.styles.noir;
    var fx = o.fx, parsed = jzParseLyrics(o.lyrics), lines = parsed.lines;
    var title = o.title || parsed.meta.ti || '', artist = o.artist || parsed.meta.ar || '';
    var en = o.enabled, beat = o.bpm > 0 ? 60 / o.bpm : 0, starts = [], ends = [], i, allLrc = lines.length > 0;
    for (i = 0; i < lines.length; i++) if (lines[i].lrc == null) allLrc = false;
    for (i = 0; i < lines.length; i++) {
        var s;
        if (o.starts && o.starts[i] != null) s = o.starts[i];
        else if (allLrc) s = lines[i].lrc;
        else if (i === 0) s = o.offset || 0.4;
        else {
            var n0 = jzChars(lines[i - 1].text).length, d0 = jzClamp(0.8 + n0 * 0.17, 1.3, 5.2) * (o.lineScale || 1);
            if (beat) d0 = Math.max(2, Math.round(d0 / beat)) * beat;
            s = starts[i - 1] + d0 + (lines[i].gapBefore ? (beat ? beat * 2 : 0.8) : 0);
        }
        starts.push(s);
    }
    for (i = 0; i < lines.length; i++) {
        if (i < lines.length - 1) ends.push(Math.max(starts[i] + 0.35, starts[i + 1]));
        else { var nl = jzChars(lines[i].text).length, dl = jzClamp(0.8 + nl * 0.17, 1.5, 5.2) * (o.lineScale || 1); if (beat) dl = Math.max(2, Math.round(dl / beat)) * beat; ends.push(starts[i] + dl); }
    }
    var duration = o.duration || ((ends.length ? ends[ends.length - 1] : 3) + 0.9);
    var plan = { version: 1, generator: 'JIZURA-AE', title: title, artist: artist, W: o.width, H: o.height, width: o.width, height: o.height, fps: o.fps, duration: duration, style: st, styleKey: o.style, fx: fx, lines: [], cuts: [], events: [], hud: fx.hud };
    var hist = [], schemeIdx = 0, nS = st.schemes.length;
    function ev(t, type, amp, dur) { plan.events.push({ t: t, type: type, amp: amp, dur: dur }); }
    if (title && starts.length && starts[0] >= 1.1) {
        var tr = new JzRng(jzHash(o.seed, 999));
        plan.cuts.push({ text: title, note: artist, lineText: title, line: -1, start: 0.1, end: starts[0] - 0.04, layout: 'title', enter: tr.pick(['blur', 'type', 'wipe', 'assemble']), exit: tr.pick(['blur', 'drift', 'wipe']), hold: 'still', inDur: 0.3, outDur: 0.3, params: { font: tr.pick(st.fonts.display) }, decor: [], scheme: 0, seed: jzHash(o.seed, 999, 1) % 1000000 });
    }
    for (var li = 0; li < lines.length; li++) {
        var ln = lines[li], s0 = starts[li], e0 = ends[li], rng = new JzRng(jzHash(o.seed, li + 1));
        var nch = jzCount(ln.text), visEnd = Math.min(e0, s0 + Math.max(3.6, nch * 0.5 + 1.2)), D = visEnd - s0;
        plan.lines.push({ index: li, text: ln.text, start: s0, end: e0, visEnd: visEnd, note: ln.note, impact: ln.impact });
        var chunks = ln.manual || jzChunk(ln.text), L = jzLerp(1.3, 0.5, fx.density), nC = Math.round(D / L);
        var maxC = chunks.length + (chunks.length >= 2 && D > 2 ? 1 : 0); nC = jzClamp(nC, 1, Math.max(1, maxC));
        var nG = Math.min(nC, chunks.length), groups = [];
        if (nG <= 1) groups = [ln.text];
        else { var pg = jzPartition(chunks, nG); for (i = 0; i < pg.length; i++) groups.push(pg[i].join(/[A-Za-z]/.test(pg[i].join('')) ? ' ' : '')); }
        var recap = nC > groups.length && groups.length >= 2, units = [], tot = 0;
        for (i = 0; i < groups.length; i++) { units.push({ text: groups[i], w: jzChars(groups[i]).length + 1.6 }); tot += units[i].w; }
        if (recap) { var rw = tot / units.length * 1.25; units.push({ text: ln.text, w: rw, recap: true }); tot += rw; }
        var bounds = [s0], acc = s0;
        for (i = 0; i < units.length; i++) { acc += D * units[i].w / tot; bounds.push(i === units.length - 1 ? visEnd : acc); }
        if (nS > 1 && li > 0 && rng.chance(fx.bgSwitch * (ln.impact ? 1.8 : 1))) schemeIdx = (schemeIdx + 1 + rng.int(0, nS - 2)) % nS;
        for (var k = 0; k < units.length; k++) {
            var u = units[k], cs = bounds[k], ce = bounds[k + 1], dur = ce - cs, nn = jzCount(u.text);
            var emph = (ln.impact && (k === 0 || u.recap));
            for (var q = 0; q < ln.emph.length; q++) if (u.text.indexOf(ln.emph[q]) >= 0) emph = true;
            var layout = jzPickLayout(rng, st, en.layout, nn, dur, hist, emph, u.recap);
            var enter = jzPickEnter(rng, st, en.enter, layout, dur, hist, emph, nn);
            var exit = jzPickExit(rng, st, en.exit, layout, dur, k === units.length - 1, hist);
            var holds = [['still', 1], ['jitter', 1.2 * fx.motion], ['drift', 1], ['breathe', 0.7], ['wave', 0.4], ['glitchtick', 0.9 * fx.glitch]], hc = [];
            for (q = 0; q < holds.length; q++) if (en.hold[holds[q][0]] !== false) hc.push(holds[q]);
            var hold = hc.length ? rng.wpick(hc) : 'still';
            var inDur = jzClamp(dur * 0.36, 0.12, 0.6);
            if (enter === 'type') inDur = jzClamp(nn * 0.055 + 0.1, 0.15, dur * 0.65);
            if (enter === 'assemble') inDur = jzClamp(dur * 0.45, 0.22, 0.75);
            if (enter === 'cut') inDur = 0.12;
            var outDur = exit === 'cut' ? 0 : jzClamp(dur * 0.3, 0.14, 0.55);
            if (/^(explode|fall|drift)$/.test(exit)) outDur = jzClamp(dur * 0.38, 0.25, 0.7);
            if (inDur + outDur > dur * 0.92) { var f = dur * 0.92 / (inDur + outDur); inDur *= f; outDur *= f; }
            var sch = schemeIdx; if (nS > 1 && k > 0 && rng.chance(0.12 * fx.bgSwitch)) sch = (schemeIdx + 1) % nS;
            plan.cuts.push({ index: plan.cuts.length, text: u.text, lineText: ln.text, note: ln.note, line: li, start: cs, end: ce, dur: dur, layout: layout, enter: enter, exit: exit, hold: hold, inDur: inDur, outDur: outDur, params: jzParams(layout, rng, st, u.text), decor: jzPickDecor(rng, st, en.decor, fx), scheme: sch, seed: jzHash(o.seed, li, k) % 1000000, emph: emph, recap: !!u.recap, words: jzChunk(u.text), stagger: rng.range(0.025, 0.06) });
            hist.push({ layout: layout, enter: enter, exit: exit });
            var g = fx.glitch * (st.glitchBoost || 1);
            ev(cs, 'chroma', 1.4 + rng.range(0, 2) * fx.chroma + (emph ? 2.5 : 0), 0.25);
            if (rng.chance(g * 0.5 + (emph ? 0.3 : 0))) ev(cs, 'slice', 0.6 + rng.range(0, 0.8) * g + (emph ? 0.5 : 0), rng.pick([2, 3, 4]) / o.fps);
            if (emph || rng.chance(fx.motion * 0.18)) ev(cs, 'shake', (emph ? 1 : 0.5) * fx.motion, 0.3);
            if (fx.flash && ln.impact && k === 0) ev(cs, 'flash', 1, 3 / o.fps);
            if (rng.chance(0.035 * g)) ev(cs, 'invert', 1, 2 / o.fps);
            if ((emph && rng.chance(0.6)) || rng.chance(0.06 * fx.motion)) ev(cs, 'zoom', 0.7 + 0.5 * fx.motion, 0.22);
            if (dur > 0.8 && rng.chance(g * 0.4)) ev(cs + rng.range(0.35, 0.8) * dur, 'slice', 0.4 + g * 0.4, 2 / o.fps);
        }
        if (li < lines.length - 1 && starts[li + 1] - visEnd > 1.3) {
            var r2 = new JzRng(jzHash(o.seed, li, 404));
            plan.cuts.push({ index: plan.cuts.length, text: title || '', lineText: '', line: li, start: visEnd, end: starts[li + 1], layout: 'interlude', enter: 'blur', exit: 'blur', hold: 'still', inDur: 0.3, outDur: 0.3, params: { variant: r2.pick(['counter', 'rings']) }, decor: jzPickDecor(r2, st, en.decor, { decor: 1 }), scheme: schemeIdx, seed: jzHash(o.seed, li, 405) % 1000000 });
        }
    }
    plan.cuts.sort(function (a, b) { return a.start - b.start; });
    for (i = 0; i < plan.cuts.length; i++) plan.cuts[i].index = i;
    plan.events.sort(function (a, b) { return a.t - b.t; });
    return plan;
}
