/* JIZURA pack: 逐字 (word by word) lyrics for the After Effects build.
   A line timed word by word (jzWordTiming) is built word by word: each word of the cut gets its own text layer in
   the main comp, visible from the moment the voice reaches it (the layer's in-point is the word's own time), and the
   cut's own lyric stays under it held back — so the words light up one by one as the song goes.
   The times come from the plan (cut.karaoke); the audio is never read here. Off unless jzBuild(plan, {words: true}). */
// a cut that carries word timestamps: cut.karaoke = the time of each word, then the time the last one ends
function jzWordsOn(cut) { return !!(cut && cut.karaoke && cut.karaoke.length > 1 && cut.words && cut.words.length > 0); }
/* a cut's words as words of their own (an empty list rather than null: the plan may give none) */
function jzWordList(cut) { return (cut && cut.words && cut.words.length) ? cut.words : jzChunk(cut ? cut.text : ''); }
/* [word, from, until] for a cut */
function jzWordSpans(cut) {
    var W = jzWordList(cut), out = [], n = Math.min(cut.karaoke.length - 1, W.length), i;
    for (i = 0; i < n; i++) out.push([W[i], cut.karaoke[i], i + 1 < n ? cut.karaoke[i + 1] : cut.karaoke[cut.karaoke.length - 1]]);
    return out;
}
/* the words of a cut as layers of the main comp: one per word, each starting when the voice reaches it. They are
   laid out on one line (the same font, size and tracking), centred like the line the cut draws.
   The size rule works in the plan's own frame (plan.W / plan.H), so a comp built at another size needs the plan frame
   scaled to it: k = the plan frame in this comp (both ways, the smaller ratio, so a frame of another shape still
   fits). A plan frame on its own (no plan.W/H) uses the comp as it is — the same fallback the rest of the build uses
   for a plan without a size, with k = 1. */
function jzWordLayers(comp, cut, sc, k, plan) {
    var spans = jzWordSpans(cut), n = spans.length, i;
    if (!n) return null;
    var st = plan.style, font = jzFontOf2(st, 'display');
    var PW = plan.W || comp.width, PH = plan.H || comp.height;
    var size = jzWordSizeOf(cut, PW, PH) * k;
    var track = 0;
    var widths = [], total = 0;
    for (i = 0; i < n; i++) { widths.push(jzTextW(comp, spans[i][0], font, size, track)); total += widths[i]; }
    var cx = comp.width / 2, cy = comp.height / 2;
    var acc = cx - total / 2, lit = [];
    // the words that are not sung yet: the line held back, under the lit words (the cut draws its own lyric too, so
    // this is only the frame the highlight runs on — kept at a low opacity)
    var dim = comp.layers.addText(String(cut.text || ''));
    jzWordStyle(dim, font, size, track, sc.sub, st);
    jzXf(dim, 'ADBE Position').setValue([cx, cy]);
    jzXf(dim, 'ADBE Opacity').setValue(45);
    dim.name = 'words rest ' + String(cut.text || '').substr(0, 12);
    dim.inPoint = cut.start; dim.outPoint = Math.min(comp.duration, cut.end + 0.6);
    for (i = 0; i < n; i++) {
        var L = comp.layers.addText(spans[i][0]);
        jzWordStyle(L, font, size, track, sc.fg, st);
        jzXf(L, 'ADBE Position').setValue([acc + widths[i] / 2, cy]);
        L.name = 'w' + (i + 1) + ' ' + String(spans[i][0]).substr(0, 12);
        L.inPoint = Math.max(0, spans[i][1]);                             // the voice reaches this word
        L.outPoint = Math.min(comp.duration, cut.end + 0.6);              // …and it stays to the end of the cut
        jzWordPop(L, size, 0.06, 0.08);
        lit.push(L);
        acc += widths[i];
    }
    return { rest: dim, lit: lit };
}
function jzFontOf2(st, role) { return (st.fonts && st.fonts[role] && st.fonts[role][0]) || 'gothic_black'; }
/* the font, size, tracking and colour of a word layer */
function jzWordStyle(L, font, size, track, color, st) {
    try {
        var src = L.property('ADBE Text Properties').property('ADBE Text Document'), td = src.value;
        try { td.resetCharStyle(); } catch (e0) {}
        try { td.resetParagraphStyle(); } catch (e1) {}
        td.fontSize = Math.max(1, size); td.font = font;
        td.tracking = Math.round((track || 0) * 1000);
        td.applyFill = true; td.fillColor = jzHex(color);
        td.justification = ParagraphJustification.CENTER_JUSTIFY;
        src.setValue(td);
    } catch (e) { jzWarn('words: ' + e.toString()); }
    jzAnchor(L, 'center');
}
/* the size a word layer uses: the same rule as the karaoke layout in the browser (fit the frame, cap at 0.3 of H).
   The wrap the plan chose (cut.params.per) is honoured, so a long line is sized for the lines it is actually drawn
   on and the word layers come out at the size the cut's own lyric does. */
function jzWordSizeOf(cut, W, H) {
    var n = jzCount(String(cut.text || '')), per = (cut.params && cut.params.per) || 0, lines = 1;
    if (per) { per = W < H ? 5 : per; lines = Math.ceil(n / per); }
    var byW = W * 0.86 / Math.max(1, n / lines) / 1.02, byH = H * 0.52 / lines;
    return Math.max(8, Math.min(byW, byH, H * 0.3));
}
/* the width of a word with the same font / size / tracking (a throw-away layer: AE has no metrics API) */
function jzTextW(comp, str, font, size, track) {
    var L = comp.layers.addText(String(str)), w = 0;
    try {
        var src = L.property('ADBE Text Properties').property('ADBE Text Document'), td = src.value;
        try { td.resetCharStyle(); } catch (e0) {}
        td.fontSize = Math.max(1, size); td.font = font;
        td.tracking = Math.round((track || 0) * 1000); src.setValue(td);
        w = jzRect(L).width;
    } catch (e) { w = jzCount(str) * size; }
    L.remove();
    return w;
}
/* the word lands with a small lift and a slight swell, then keeps still */
function jzWordPop(L, size, rise, pop) {
    var D = '.22', f = 'var k=Math.max(0,Math.min((time-' + jzN(L.inPoint) + ')/' + D + ',1));var e=1-Math.pow(1-k,3);';
    if (rise > 0) jzSetExpr(jzXf(L, 'ADBE Position'), f + '[value[0],value[1]+' + jzN(size * rise) + '*(1-e)]');
    if (pop > 0) jzSetExpr(jzXf(L, 'ADBE Scale'), f + 'var s=1+' + jzN(pop) + '*(1-e);[value[0]*s,value[1]*s]');
}
