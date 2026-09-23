// ================================================================ planner (AE standalone mode)
// Same decisions as the browser app: chunks -> cuts -> weighted recipe picks -> events.
function jzW(obj, k, d) { return (obj && obj[k] != null) ? obj[k] : d; }
function jzNovelty(hist, key, val) {
    var w = 1;
    for (var i = hist.length - 1, d = 0; i >= 0 && d < 6; i--, d++) if (hist[i][key] === val) w *= d < 2 ? 0.2 : 0.6;
    return w;
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

// ---------------------------------------------------------------- picks (ES3 port of the browser planner; weights come from JZ_DATA.meta)
var JZ_PORTRAIT_W = { vcols: 1.9, condensed: 1.3, huge: 1.3, center: 1.2, stack: 1.1, mixed: 0.7, marquee: 0.6, wave: 0.6, diag: 0.8, type: 0.8, gloss: 0.5 };
var JZ_LAYOUT_ENTER = { type: { type: 4, scramble: 1.5 }, ring: { pop: 2, spin: 2, cut: 1, assemble: 0.4, slice: 0.2, wipe: 0.2 }, labels: { cut: 3, pop: 1 }, wave: { pop: 1.5, drop: 1.5, blur: 1, slice: 0.3 }, tile: { assemble: 1.3, slice: 1.4, zoom: 1.4 }, huge: { zoom: 1.5, wipe: 1.5, slice: 1.4, stretch: 1.3, type: 0.2 }, mixed: { pop: 1.6, drop: 1.6, spin: 1.3 }, scatter: { pop: 1.5, spin: 1.5, drop: 1.2, assemble: 1.3 }, vcols: { assemble: 1.8, type: 1.2 }, pill: { wipe: 1.8, type: 1.2 } };
var JZ_HOLD_W = { still: 1, jitter: 1.2, drift: 1, breathe: 0.7, wave: 0.4, glitchtick: 0.9 };
function jzInList(k, list) { return jzIndexOf(list, k) >= 0; }
function jzBias(st, g) { return st.bias && st.bias[g] ? st.bias[g] : null; }
function jzHasTag(m, t) { return m.tags ? jzIndexOf(m.tags, t) >= 0 : false; }
function jzPickLayout(rng, st, en, n, dur, hist, emph, recap, portrait) {
    var c = [], order = jzOrder('layout');
    for (var i = 0; i < order.length; i++) {
        var k = order[i], m = jzMeta('layout', k);
        if (!en.layout[k] || m.special || JZ_REG.layout[k].special || !jzFitsN(k, n)) continue;
        var w = jzW(jzBias(st, 'layout'), k, m.w != null ? m.w : 1) * jzNovelty(hist, 'layout', k);
        if (portrait) w *= m.portrait != null ? m.portrait : jzW(JZ_PORTRAIT_W, k, 1);
        if (emph && m.emph) w *= m.emph;
        if (emph && jzInList(k, ['huge', 'center', 'tile', 'marquee', 'condensed'])) w *= 2;
        if (recap && jzInList(k, ['center', 'stack', 'marquee', 'tile', 'mixed', 'type', 'gloss'])) w *= 1.8;
        if (dur < 0.5 && jzInList(k, ['wave', 'ring', 'labels', 'gloss', 'type', 'tile'])) w *= 0.3;
        if (dur < 0.5 && jzInList(k, ['center', 'huge', 'condensed', 'vcols'])) w *= 1.4;
        c.push([k, w]);
    }
    return c.length ? rng.wpick(c) : 'center';
}
function jzPickEnter(rng, st, en, layout, dur, hist, emph, n) {
    var c = [], order = jzOrder('enter'), LM = jzMeta('layout', layout);
    for (var i = 0; i < order.length; i++) {
        var k = order[i], m = jzMeta('enter', k); if (!en.enter[k]) continue;
        var w = jzW(jzBias(st, 'enter'), k, m.w != null ? m.w : 1) * jzNovelty(hist, 'enter', k) * jzW(JZ_LAYOUT_ENTER[layout] || LM.enterBias, k, 1);
        if (m.minDur && dur < m.minDur) w *= 0.15;
        if (m.maxChars && n > m.maxChars) w *= 0.2;
        if (k === 'cut') w *= 0.5;
        if (dur < 0.45 && jzInList(k, ['type', 'assemble', 'drop', 'spin', 'pop', 'flicker'])) w *= 0.25;
        if (dur < 0.45 && jzInList(k, ['cut', 'slice', 'zoom', 'stretch'])) w *= 1.8;
        if (k === 'type' && n > 18) w *= 0.3;
        if (emph && jzInList(k, ['zoom', 'assemble', 'slice'])) w *= 1.8;
        c.push([k, w]);
    }
    return c.length ? rng.wpick(c) : 'cut';
}
function jzPickExit(rng, st, en, layout, dur, last, hist) {
    var c = [], order = jzOrder('exit');
    for (var i = 0; i < order.length; i++) {
        var k = order[i], m = jzMeta('exit', k); if (!en.exit[k]) continue;
        var w = jzW(jzBias(st, 'exit'), k, m.w != null ? m.w : 1) * jzNovelty(hist, 'exit', k);
        if (m.minDur && dur < m.minDur) w *= 0.15;
        if (k === 'cut') w *= dur < 0.6 ? 4 : (last ? 1.2 : 2.2);
        if (dur < 0.6 && k !== 'cut') w *= 0.4;
        if (jzInList(layout, ['labels', 'ring', 'tile']) && jzInList(k, ['explode', 'fall', 'drift'])) w *= 0.3;
        c.push([k, w]);
    }
    return c.length ? rng.wpick(c) : 'cut';
}
function jzPickHold(rng, en, fx, hist) {
    var c = [], order = jzOrder('hold');
    for (var i = 0; i < order.length; i++) {
        var k = order[i], m = jzMeta('hold', k); if (!en.hold[k]) continue;
        var w = JZ_HOLD_W[k] != null ? JZ_HOLD_W[k] : (m.w != null ? m.w : 0.8);
        if (k === 'jitter' || jzHasTag(m, 'glitch')) w *= 0.4 + fx.motion;
        if (k === 'glitchtick') w *= fx.glitch;
        c.push([k, w * jzNovelty(hist, 'hold', k)]);
    }
    return c.length ? rng.wpick(c) : 'still';
}
function jzDecorParams(rng, k) {
    return { id: k, seed: rng.int(1, 999999999), n: rng.int(1, 3) + (k === 'shapes' ? 3 : 0) + (k === 'sparks' ? 4 : 0), right: rng.chance(0.5), low: rng.chance(0.5), accent: rng.chance(0.4), corner: rng.chance(0.5), big: rng.chance(0.4), mode: rng.pick(['count', 'index']), from: rng.int(0, 20), to: rng.int(30, 999), v: rng.int(0, 5), r: rng.next() };
}
function jzPickDecor(rng, st, en, fx, layout, hist) {
    var count = Math.round(fx.decor * 2.8 * rng.range(0.45, 1.15)), c = [], out = [], order = jzOrder('decor'), LM = jzMeta('layout', layout), recent = {}, i, j;
    for (i = Math.max(0, hist.length - 2); i < hist.length; i++) for (j = 0; j < (hist[i].decor || []).length; j++) recent[hist[i].decor[j]] = 1;
    for (i = 0; i < order.length; i++) {
        var k = order[i], m = jzMeta('decor', k);
        if (!en.decor[k] || (LM.busy && m.layer === 'back' && !m.subtle)) continue;
        c.push([k, jzW(st.decor, k, m.w != null ? m.w * 0.5 : 0.35) * (recent[k] ? 0.35 : 1)]);
    }
    for (i = 0; i < count && c.length; i++) {
        var pk = rng.wpick(c);
        for (j = 0; j < c.length; j++) if (c[j][0] === pk) { c.splice(j, 1); break; }
        out.push(jzDecorParams(rng, pk));
    }
    return out;
}
function jzPickTreat(rng, st, en, fx, layout, emph, hist) {
    var LM = jzMeta('layout', layout);
    if (LM.treat === false) return 'none';
    if (!rng.chance(0.18 + 0.42 * fx.decor + (emph ? 0.15 : 0))) return 'none';
    var c = [], order = jzOrder('treat');
    for (var i = 0; i < order.length; i++) {
        var k = order[i], m = jzMeta('treat', k);
        if (k === 'none' || !en.treat[k] || (LM.treat === 'safe' && !m.safe)) continue;
        c.push([k, jzW(jzBias(st, 'treat'), k, m.w != null ? m.w : 1) * jzNovelty(hist, 'treat', k)]);
    }
    return c.length ? rng.wpick(c) : 'none';
}
function jzPickBg(rng, st, en, fx, bgHist) {
    if (!rng.chance(0.2 + 0.35 * fx.decor + 0.2 * fx.bgSwitch)) return 'none';
    var c = [], order = jzOrder('bg'), last = bgHist.slice(Math.max(0, bgHist.length - 3));
    for (var i = 0; i < order.length; i++) {
        var k = order[i], m = jzMeta('bg', k);
        if (k === 'none' || !en.bg[k]) continue;
        c.push([k, jzW(jzBias(st, 'bg'), k, m.w != null ? m.w : 1) * (jzInList(k, last) ? 0.25 : 1)]);
    }
    return c.length ? rng.wpick(c) : 'none';
}
function jzPickCam(rng, st, en, fx, layout, emph, hist) {
    var c = [], order = jzOrder('cam'), LM = jzMeta('layout', layout);
    for (var i = 0; i < order.length; i++) {
        var k = order[i], m = jzMeta('cam', k); if (!en.cam[k]) continue;
        var w = jzW(jzBias(st, 'cam'), k, m.w != null ? m.w : 1) * jzNovelty(hist, 'cam', k);
        if (m.strong) w *= 0.25 + 0.9 * fx.motion + (emph ? 0.6 : 0);
        if (LM.cam === false && k !== 'push') w *= 0.05;
        c.push([k, w]);
    }
    return c.length ? rng.wpick(c) : 'push';
}
function jzPickTrans(rng, st, en, fx, emph, hist) {
    var order = jzOrder('trans');
    if (!order.length) return null;
    if (!rng.chance(0.1 + 0.22 * fx.motion + (emph ? 0.08 : 0))) return null;
    var c = [];
    for (var i = 0; i < order.length; i++) { var k = order[i], m = jzMeta('trans', k); if (!en.trans[k]) continue; c.push([k, jzW(jzBias(st, 'trans'), k, m.w != null ? m.w : 1) * jzNovelty(hist, 'trans', k)]); }
    return c.length ? rng.wpick(c) : null;
}
function jzPickFx(rng, st, en, fx, emph, fxHist, kind) {
    var g = fx.glitch, p = kind === 'edge' ? 0.12 + 0.38 * g + 0.12 * fx.motion + (emph ? 0.15 : 0) : 0.05 + 0.2 * g;
    if (!rng.chance(p)) return null;
    var last = fxHist.slice(Math.max(0, fxHist.length - 3)), c = [], order = jzOrder('fx');
    for (var i = 0; i < order.length; i++) {
        var k = order[i], m = jzMeta('fx', k);
        if (m.builtin || JZ_REG.fx[k].builtin || !en.fx[k]) continue;
        if (kind === 'edge' ? m.edge === false : !m.mid) continue;
        var w = jzW(jzBias(st, 'fx'), k, m.w != null ? m.w : 1) * (jzInList(k, last) ? 0.2 : 1);
        if (m.glitchy) w *= 0.3 + g * 1.4;
        c.push([k, w]);
    }
    return c.length ? rng.wpick(c) : null;
}
function jzPlanOf(g, k, rng, st, extra) { var D = JZ_REG[g][k]; if (!D || !D.plan) return {}; try { return (g === 'layout' ? D.plan(rng, extra || {}, st) : D.plan(rng, st)) || {}; } catch (e) { jzWarn(g + ' ' + k + ' plan: ' + e.toString()); return {}; } }

// o: {lyrics, title, artist, style, seed, fx, width, height, fps, bpm, starts[], enabled{group:{key:false}}, offset, lineScale, duration, extra, wa}
function jzMakePlan(o) {
    var st = JZ_DATA.styles[o.style] || JZ_DATA.styles.noir;
    var fx = o.fx, parsed = jzParseLyrics(o.lyrics), lines = parsed.lines;
    if (fx.decor == null) fx.decor = 0.5; if (fx.bgSwitch == null) fx.bgSwitch = 0.35;
    var title = o.title || parsed.meta.ti || '', artist = o.artist || parsed.meta.ar || '';
    var beat = o.bpm > 0 ? 60 / o.bpm : 0, starts = [], ends = [], i, allLrc = lines.length > 0, g0, k0;
    // enabled map: implemented + not switched off + allowed by the 追加分 / 和風 switches
    var en = {};
    for (g0 = 0; g0 < JZ_GROUPS.length; g0++) {
        var gg = JZ_GROUPS[g0], ord = jzOrder(gg); en[gg] = {};
        for (k0 = 0; k0 < ord.length; k0++) { var kk = ord[k0]; en[gg][kk] = !(o.enabled && o.enabled[gg] && o.enabled[gg][kk] === false) && jzRandomOk(o, gg, kk); }
    }
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
    var W = o.width, H = o.height, portrait = H > W;
    var plan = { version: 2, generator: 'JIZURA-AE', title: title, artist: artist, W: W, H: H, width: W, height: H, fps: o.fps, duration: duration, style: st, styleKey: o.style, fx: fx, lines: [], cuts: [], events: [], hud: fx.hud };
    var hist = [], bgHist = [], fxHist = [], schemeIdx = 0, nS = st.schemes.length;
    function ev(t, type, amp, dur) { plan.events.push({ t: t, type: type, amp: amp, dur: dur }); }
    if (title && starts.length && starts[0] >= 1.1) {
        var tr = new JzRng(jzHash(o.seed, 999));
        plan.cuts.push({ text: title, note: artist, lineText: title, line: -1, start: 0.1, end: starts[0] - 0.04, layout: 'title', enter: tr.pick(['blur', 'type', 'wipe', 'assemble']), exit: tr.pick(['blur', 'drift', 'wipe']), hold: 'still', inDur: 0.3, outDur: 0.3, params: { font: tr.pick(st.fonts.display) }, decor: [], scheme: 0, seed: jzHash(o.seed, 999, 1) % 1000000, treat: 'none', bg: 'none', cam: 'push' });
    }
    var F = 1 / 24;
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
        var lineBg = jzPickBg(rng, st, en, fx, bgHist); bgHist.push(lineBg);
        var lineBgP = lineBg !== 'none' ? jzPlanOf('bg', lineBg, rng, st) : {};
        for (var k = 0; k < units.length; k++) {
            var u = units[k], cs = bounds[k], ce = bounds[k + 1], dur = ce - cs, nn = jzCount(u.text);
            var emph = (ln.impact && (k === 0 || u.recap));
            for (var q = 0; q < ln.emph.length; q++) if (u.text.indexOf(ln.emph[q]) >= 0) emph = true;
            var layout = jzPickLayout(rng, st, en, nn, dur, hist, emph, u.recap, portrait);
            var enter = jzPickEnter(rng, st, en, layout, dur, hist, emph, nn);
            var exit = jzPickExit(rng, st, en, layout, dur, k === units.length - 1, hist);
            var hold = jzPickHold(rng, en, fx, hist);
            var inDur = jzClamp(dur * 0.36, 0.12, 0.6);
            if (enter === 'type') inDur = jzClamp(nn * 0.055 + 0.1, 0.15, dur * 0.65);
            if (enter === 'assemble') inDur = jzClamp(dur * 0.45, 0.22, 0.75);
            var mIn = jzTab(jzMeta('enter', enter).inDur, dur, nn); if (mIn != null) inDur = mIn;
            if (enter === 'cut') inDur = 0.12;
            var outDur = exit === 'cut' ? 0 : jzClamp(dur * 0.3, 0.14, 0.55);
            if (/^(explode|fall|drift)$/.test(exit)) outDur = jzClamp(dur * 0.38, 0.25, 0.7);
            var mOut = jzTab(jzMeta('exit', exit).outDur, dur, nn); if (mOut != null) outDur = mOut;
            if (inDur + outDur > dur * 0.92) { var f = dur * 0.92 / (inDur + outDur); inDur *= f; outDur *= f; }
            var sch = schemeIdx; if (nS > 1 && k > 0 && rng.chance(0.12 * fx.bgSwitch)) sch = (schemeIdx + 1) % nS;
            var params = jzPlanOf('layout', layout, rng, st, { text: u.text, n: nn, W: W, H: H, dur: dur });
            var decor = jzPickDecor(rng, st, en, fx, layout, hist);
            var treat = jzPickTreat(rng, st, en, fx, layout, emph, hist), treatP = treat !== 'none' ? jzPlanOf('treat', treat, rng, st) : {};
            if (k > 0 && rng.chance(0.18 * fx.bgSwitch + 0.04)) { lineBg = jzPickBg(rng, st, en, fx, bgHist); lineBgP = lineBg !== 'none' ? jzPlanOf('bg', lineBg, rng, st) : {}; }
            var LM = jzMeta('layout', layout), bg = LM.busy && !jzMeta('bg', lineBg).subtle ? 'none' : lineBg;
            var cam = jzPickCam(rng, st, en, fx, layout, emph, hist), camP = jzPlanOf('cam', cam, rng, st);
            var prevCut = plan.cuts[plan.cuts.length - 1], trans = null, transP = {}, transDur = 0;
            if (prevCut && Math.abs(prevCut.end - cs) < 0.06 && prevCut.layout !== 'interlude' && dur > 0.5) {
                trans = jzPickTrans(rng, st, en, fx, emph, hist);
                if (trans) {
                    transDur = jzClamp(jzMeta('trans', trans).dur || 0.35, 0.12, Math.min(0.6, dur * 0.45));
                    transP = jzPlanOf('trans', trans, rng, st);
                    enter = 'cut'; inDur = 0.12; prevCut.exit = 'cut'; prevCut.outDur = 0;
                }
            }
            var dids = []; for (q = 0; q < decor.length; q++) dids.push(decor[q].id);
            plan.cuts.push({ index: plan.cuts.length, text: u.text, lineText: ln.text, note: ln.note, line: li, start: cs, end: ce, dur: dur, layout: layout, enter: enter, exit: exit, hold: hold, inDur: inDur, outDur: outDur,
                params: params, decor: decor, scheme: sch, seed: jzHash(o.seed, li, k) % 1000000, emph: emph, recap: !!u.recap, words: jzChunk(u.text), stagger: rng.range(0.025, 0.06),
                treat: treat, treatP: treatP, bg: bg, bgP: bg === lineBg ? lineBgP : {}, cam: cam, camP: camP, trans: trans, transP: transP, transDur: transDur });
            hist.push({ layout: layout, enter: enter, exit: exit, hold: hold, treat: treat, cam: cam, trans: trans, decor: dids });
            var g = fx.glitch * (st.glitchBoost || 1);
            if (en.fx.chroma !== false) ev(cs, 'chroma', 1.4 + rng.range(0, 2) * fx.chroma + (emph ? 2.5 : 0), 0.25);
            if (en.fx.slice !== false && rng.chance(g * 0.5 + (emph ? 0.3 : 0))) ev(cs, 'slice', 0.6 + rng.range(0, 0.8) * g + (emph ? 0.5 : 0), rng.pick([2, 3, 4]) * F);
            if (en.fx.block !== false && rng.chance(g * 0.22)) ev(cs + rng.range(0, 0.05), 'block', 0.5 + g, rng.pick([2, 4]) * F);
            if (en.fx.shake !== false && (emph || rng.chance(fx.motion * 0.18))) ev(cs, 'shake', (emph ? 1 : 0.5) * fx.motion, 0.3);
            if (en.fx.flash !== false && fx.flash && ln.impact && k === 0) ev(cs, 'flash', 1, 3 * F);
            if (en.fx.invert !== false && rng.chance(0.035 * g)) ev(cs, 'invert', 1, 2 * F);
            if (en.fx.zoom !== false && ((emph && rng.chance(0.6)) || rng.chance(0.06 * fx.motion))) ev(cs, 'zoom', 0.7 + 0.5 * fx.motion, 0.22);
            if (en.fx.mosaic !== false && rng.chance(0.04 * g)) ev(cs, 'mosaic', 1, 3 * F);
            if (en.fx.slice !== false && dur > 0.8 && rng.chance(g * 0.4)) ev(cs + rng.range(0.35, 0.8) * dur, 'slice', 0.4 + g * 0.4, 2 * F);
            if (plan.cuts.length > 1 || k > 0 || li > 0) {
                var pe = jzPickFx(rng, st, en, fx, emph, fxHist, 'edge');
                if (pe) { var M1 = jzMeta('fx', pe); ev(cs - (M1.pre ? M1.pre * F : 0), pe, (M1.amp || 1) * (0.7 + 0.5 * g + (emph ? 0.3 : 0)), (M1.dur || 4) * F); fxHist.push(pe); }
            }
            if (dur > 1.1) { var pm = jzPickFx(rng, st, en, fx, emph, fxHist, 'mid'); if (pm) { var M2 = jzMeta('fx', pm); ev(cs + rng.range(0.4, 0.75) * dur, pm, (M2.amp || 1) * (0.5 + 0.4 * g), (M2.dur || 3) * F); } }
        }
        if (li < lines.length - 1 && starts[li + 1] - visEnd > 1.3) {
            var r2 = new JzRng(jzHash(o.seed, li, 404));
            plan.cuts.push({ index: plan.cuts.length, text: title || '', lineText: '', line: li, start: visEnd, end: starts[li + 1], layout: 'interlude', enter: 'blur', exit: 'blur', hold: 'still', inDur: 0.3, outDur: 0.3, params: { variant: r2.pick(['counter', 'rings']) }, decor: jzPickDecor(r2, st, en, { decor: 1 }, 'interlude', []), scheme: schemeIdx, seed: jzHash(o.seed, li, 405) % 1000000, treat: 'none', bg: 'none', cam: 'push' });
        }
    }
    plan.cuts.sort(function (a, b) { return a.start - b.start; });
    for (i = 0; i < plan.cuts.length; i++) plan.cuts[i].index = i;
    plan.events.sort(function (a, b) { return a.t - b.t; });
    return plan;
}
