/*  JIZURA for After Effects — lyric motion panel
    ScriptUI panel: builds editable compositions (text animators, expressions,
    shape layers, effects) from lyrics or from a JIZURA plan JSON.
    Install: copy this file to
      After Effects/Support Files/Scripts/ScriptUI Panels/
    then open it from the Window menu.                                         */

// ---------------------------------------------------------------- utilities
function jzClamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
function jzLerp(a, b, t) { return a + (b - a) * t; }
function jzTrim(s) { return String(s).replace(/^[\s\u3000]+|[\s\u3000]+$/g, ''); }
function jzIndexOf(arr, v) { for (var i = 0; i < arr.length; i++) if (arr[i] === v) return i; return -1; }
function jzKeys(o) { var r = []; for (var k in o) if (o.hasOwnProperty(k)) r.push(k); return r; }
function jzPad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
function jzHex(h) {
    h = String(h || '#000000').replace('#', '');
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    var n = parseInt(h.substr(0, 6), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
function jzLum(h) { var c = jzHex(h); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
function jzParseJSON(s) {
    s = String(s).replace(/^\uFEFF/, '');
    if (typeof JSON !== 'undefined' && JSON.parse) return JSON.parse(s);
    return eval('(' + s + ')');
}
function jzChars(s) {
    var out = [], i = 0; s = String(s);
    while (i < s.length) {
        var c = s.charCodeAt(i);
        if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length) { out.push(s.substr(i, 2)); i += 2; }
        else { out.push(s.charAt(i)); i++; }
    }
    return out;
}
function jzCode(ch) { return ch.charCodeAt(0); }
function jzIsKanji(ch) { var c = jzCode(ch); return (c >= 0x3400 && c <= 0x9FFF) || (c >= 0xF900 && c <= 0xFAFF) || ch === '\u3005' || ch === '\u3006'; }
function jzIsHira(ch) { var c = jzCode(ch); return c >= 0x3041 && c <= 0x309F; }
function jzIsKata(ch) { var c = jzCode(ch); return (c >= 0x30A0 && c <= 0x30FF) || (c >= 0x31F0 && c <= 0x31FF); }
function jzIsLatin(ch) { return /[A-Za-z0-9]/.test(ch); }
function jzIsPunct(ch) { return /[\u3001\u3002\uFF0C\uFF0E,.!?\uFF01\uFF1F\u2026\u2025\u30FB\u300C\u300D\u300E\u300F\uFF08\uFF09()\u3010\u3011~\u301C\uFF5E:\uFF1A;\uFF1B\-\u2014\u2015]/.test(ch); }
function jzCount(s) { return jzChars(String(s).replace(/[\s\u3000]+/g, '')).length; }

// deterministic hashing + seeded stream
function jzImul(a, b) {
    var ah = (a >>> 16) & 0xffff, al = a & 0xffff, bh = (b >>> 16) & 0xffff, bl = b & 0xffff;
    return ((al * bl) + (((ah * bl + al * bh) << 16) >>> 0)) | 0;
}
function jzHash(a, b, c, d) {
    var s = String(a) + '|' + String(b) + '|' + String(c) + '|' + String(d);
    var h = -2128831035;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = jzImul(h, 16777619); }
    h ^= h >>> 15; h = jzImul(h, 0x2c1b3c6d); h ^= h >>> 12; h = jzImul(h, 0x297a2d39); h ^= h >>> 15;
    return h >>> 0;
}
function jzR(a, b, c, d) { return jzHash(a, b, c, d) / 4294967296; }
function JzRng(seed) {
    this.s = (seed % 2147483647 + 2147483647) % 2147483647 || 1;
}
JzRng.prototype.next = function () { this.s = (this.s * 48271) % 2147483647; return (this.s - 1) / 2147483646; };
JzRng.prototype.range = function (a, b) { return a + (b - a) * this.next(); };
JzRng.prototype.int = function (a, b) { return Math.floor(a + (b - a + 1) * this.next()); };
JzRng.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length) % arr.length]; };
JzRng.prototype.chance = function (p) { return this.next() < p; };
JzRng.prototype.wpick = function (list) { // [[value, weight], ...]
    var tot = 0, i; for (i = 0; i < list.length; i++) tot += list[i][1];
    var x = this.next() * tot;
    for (i = 0; i < list.length; i++) { x -= list[i][1]; if (x <= 0) return list[i][0]; }
    return list[list.length - 1][0];
};

// ---------------------------------------------------------------- 逐字 (per-word) timestamps
var JZ_KB_LINE = /^\[(\d+):(\d+(?:[.:]\d+)?)\]/;
var JZ_KB_WORD = /^<\s*(\d+):(\d+(?:[.:]\d+)?)\s*>/;
// [mm:ss.xx] before every word, or <mm:ss.xxx> before every word (the two may be mixed). The text after a tag
// belongs to that tag, and the text of the first tag belongs to it as well: <t1>a<t2>b<t3>c< -> a@t1 b@t2 c@t3.
// Kept identical to the browser engine (src/08_planner.js): the AE panel reads the same lyrics.
function jzKbWords(body) {
    var tags = [], texts = [], rest = body, guard = 0;
    while (rest && guard++ < 128) {
        var tg = rest.match(JZ_KB_WORD) || rest.match(JZ_KB_LINE);
        if (!tg) { if (tags.length) { texts.push(rest); rest = ''; } break; }
        var a = rest.indexOf('<', tg[0].length), b = rest.indexOf('[', tg[0].length), cut = rest.length;
        if (a >= 0 && a < cut) cut = a;
        if (b >= 0 && b < cut) cut = b;
        tags.push(jzKbSec(tg[1], tg[2])); texts.push(jzTrim(rest.substr(tg[0].length, cut - tg[0].length)));
        rest = jzTrim(rest.substr(cut));
    }
    if (tags.length < 2) return null;
    // a tag with no text of its own (its text is the next tag) is skipped, and a tag with nothing after it only closes
    // the word before it (that is where the next row starts)
    var words = [], k;
    for (k = 0; k < tags.length; k++) if (texts[k]) words.push({ t: tags[k], text: texts[k], end: tags[k + 1] != null ? tags[k + 1] : tags[k] });
    // only a line with two or more words of its own is 逐字: one word means every tag was a line tag, so
    // [00:01.00][00:30.00]同じ歌詞 is a repeated line (the chorus) and has to stay two lines
    if (words.length < 2) return null;
    var out = [];
    for (k = 0; k < words.length - 1; k++) out.push({ t: words[k].t, text: words[k].text, end: words[k + 1].t });
    var lastW = words[words.length - 1];
    out.push({ t: lastW.t, text: lastW.text, end: lastW.end });
    return out;
}
function jzKbSec(mm, ss) { return parseInt(mm, 10) * 60 + parseFloat(String(ss).replace(':', '.')); }
// The [mm:ss.xx] / <mm:ss.xxx> a row ends on: where this row stops singing (the next row starts there). Many LRC
// files write the next line's time at the end of the line before it, and on a 逐字 row it ends the last word — either
// way it is a time, never lyric text, so it comes off the row. Kept identical to the browser engine (kbTailOff).
var JZ_KB_TAIL = /(?:\s*(?:\[\s*\d+:\d+(?:[.:]\d+)?\s*\]|\s*<\s*\d+:\d+(?:[.:]\d+)?\s*>))+\s*$/;
function jzKbTailOff(s) { return s.replace(JZ_KB_TAIL, ''); }
// the time that tail holds: where the row stops singing (null when the row does not name one)
function jzKbTailEnd(row) {
    var tail = String(row || '').match(JZ_KB_TAIL);
    if (!tail) return null;
    var tags = tail[0].match(/[\[<]\s*(\d+):(\d+(?:[.:]\d+)?)\s*[\]>]/g), g;
    if (!tags) return null;
    g = tags[tags.length - 1].match(/(\d+):(\d+(?:[.:]\d+)?)/);
    return g ? jzKbSec(g[1], g[2]) : null;
}
// [mm:ss.xx] / <mm:ss.xxx> with nothing else on the line: a time of the line, not a word
function jzKbQuiet(s) { return !/[^\d:.\uFF1A\s]/.test(s); }
// the line markers (|注释, a trailing !, *強調*, /手動切分) off a row, with every timestamp tag left in place.
// Kept identical to the browser engine (J.lineMarkers in src/08_planner.js) -> { text, note, impact, emph, cuts }
function jzLineMarkers(row) {
    var s = jzTrim(row), note = null, bar = s.indexOf('|');
    if (bar >= 0) { note = jzTrim(s.substr(bar + 1)) || null; s = jzTrim(s.substr(0, bar)); }
    var impact = false;
    if (s.length > 1 && s.charAt(s.length - 1) === '!') { impact = true; s = jzTrim(s.substr(0, s.length - 1)); }
    var emph = [];
    s = s.replace(/\*([^*]+)\*/g, function (all, w) { emph.push(w); return w; });
    if (/\/$/.test(s)) s = jzTrim(s.replace(/\/+$/, ''));          // a / with nothing after it closes the last cut
    var parts = s.indexOf('/') >= 0 ? s.split('/') : [], cuts = [], i;
    for (i = 0; i < parts.length; i++) { var tp = jzTrim(parts[i]); if (tp) cuts.push(tp); }
    if (cuts.length < 2) cuts = [];                                 // a lone / is not a cut point
    return { text: s, note: note, impact: impact, emph: emph, cuts: cuts };
}
// 逐字: / は語の切れ目。断片が覆う語を求め、語はそのままの形（/ は落とす）で返す。合わなければ null。
function jzKbCuts(kb, cuts) {
    if (!kb || !kb.words || !kb.words.length || !cuts || cuts.length < 2) return null;
    function norm(w) { return String(w).replace(/<\s*\d+:\d+(?:[.:]\d+)?\s*>/g, '').replace(/\[\d+:\d+(?:[.:]\d+)?\]/g, '').replace(/[\s\u3000/]/g, ''); }
    var pieces = [], k, i;
    for (k = 0; k < kb.words.length; k++) { var sub = String(kb.words[k].text).split('/'); for (i = 0; i < sub.length; i++) { var x = norm(sub[i]); if (x) pieces.push(x); } }
    var line = pieces.join(''), at = 0, out = [];
    for (i = 0; i < cuts.length; i++) {
        var t = norm(cuts[i]);
        if (!t) return null;
        var to = at + t.length;
        if (line.substring(at, to) !== t) return null;
        var acc = 0, j;
        for (j = 0; j < pieces.length; j++) { if (acc >= to) break; acc += pieces[j].length; }
        if (acc !== to) return null;
        out.push(t); at = to;
    }
    return at === line.length ? out : null;
}
// 逐字の時刻 -> { text, words, times, ends, first, last, body } | null. A tag with nothing after it is not a word of
// its own: it only says where the last word ends (and where the next row starts), so `last` is that time and the row
// is never shown a second time for it (see jzParseLyrics).
// Kept identical to the browser engine (J.wordTiming in src/08_planner.js).
function jzWordTiming(row) {
    var s = jzTrim(row), lead = [], m, guard = 0;
    while ((m = s.match(JZ_KB_LINE)) && guard++ < 64) { if (s.indexOf('<', 1) >= 0 && jzKbQuiet(s)) break; lead.push(m[0]); s = jzTrim(s.substr(m[0].length)); }
    if (!s) return null;
    var body = s.charAt(0) === '<' ? s : lead.join('') + s;
    var words = jzKbWords(body);
    if (!words) return null;
    // the words are kept as they were written
    var text = '', times = [], ends = [], i;
    for (i = 0; i < words.length; i++) { text += words[i].text; times.push(words[i].t); ends.push(words[i].end); }
    return { text: text, words: words, times: times, ends: ends, first: times[0],
        last: ends[ends.length - 1], body: body };
}
// the words one cut shows, each with its own start and end (see J.wordSlice in the browser engine)
function jzWordSlice(kb, txt) {
    if (!kb || !kb.words || !kb.words.length || !txt) return null;
    var norm = function (w) { return String(w).replace(/[\s\u3000]/g, ''); };
    var line = '', k;
    for (k = 0; k < kb.words.length; k++) line += norm(kb.words[k].text);
    var target = norm(txt), at = line.indexOf(target);
    if (at < 0 || !target) return null;
    var out = [], acc = 0;
    for (k = 0; k < kb.words.length; k++) {
        var w = norm(kb.words[k].text), from = acc, to = acc + w.length;
        acc = to;
        if (to <= at) continue;
        if (from >= at + target.length) break;
        out.push({ text: kb.words[k].text, t: kb.words[k].t, e: kb.words[k].end });
    }
    // a word at the edge of the cut can reach past its text (the cut starts / ends inside it): the tail that hangs
    // over is not drawn anywhere, so it is not a word of the cut (jzWordsForText)
    out = jzWordsForText(out, target);
    if (!out.length) return null;
    var ws = [], ts = [], es = [];
    for (k = 0; k < out.length; k++) { ws.push(out[k].text); ts.push(out[k].t); es.push(out[k].e); }
    return { words: ws, times: ts, ends: es };
}
// the times of the words on the timeline (see J.karaokeTimes in the browser engine): a word without a time is spread
// over the cut, the first one is pulled inside the cut (the times in the lyric are absolute and a cut may start
// later), and they never go backwards. cut.karaoke then adds the end of the last word.
function jzKaraokeTimes(start, dur, times) {
    if (!times || !times.length) return null;
    var end = start + dur, n = times.length, out = [], i, t;
    for (i = 0; i < n; i++) { t = times[i]; out.push(isFinite(t) ? +t : start + dur * i / Math.max(1, n - 1)); }
    out[0] = jzClamp(out[0], start, Math.max(start, end - 0.05));
    for (i = 1; i < n; i++) if (out[i] < out[i - 1]) out[i] = out[i - 1];
    return out;
}
function jzKaraoke(cut) {
    var t = cut.wordTimes;
    if (!t || !t.length) return null;
    var last = cut.kEnd != null ? cut.kEnd : cut.end;   // where the last word ends (see kEnd in the browser engine)
    return t.concat([+last]);
}
// the words of a cut, taken back to the text it really draws (see J.wordsForText in the browser engine). A cut that
// starts or ends inside a word (a half of a split line, 中央を空ける) keeps whole words, so the one at the edge can
// reach past its text: that tail is not drawn anywhere, so it comes off here — the word layers must not spell a
// character the cut does not draw. Takes and gives [word, from, until].
function jzWordsForText(list, text) {
    var norm = function (w) { return String(w).replace(/[\s\u3000]/g, ''); };
    var target = norm(text), out = [], acc = 0, i;
    for (i = 0; i < list.length; i++) {
        var c = norm(list[i].text), room = target.length - acc;
        if (room <= 0) break;
        if (c.length <= room) { out.push(list[i]); acc += c.length; continue; }
        out.push({ text: jzChars(c).slice(0, room).join(''), t: list[i].t, e: list[i].e });
        break;
    }
    return out.length ? out : list;
}

// ---------------------------------------------------------------- lyric parsing
function jzParseLyrics(raw) {
    var lines = [], meta = {}, gap = false, open = null;   // 双语: the row that is singing now (start / end)
    var rows = String(raw || '').replace(/\r\n?/g, '\n').split('\n');
    for (var r = 0; r < rows.length; r++) {
        var s0 = jzTrim(rows[r]);
        if (!s0) { if (lines.length) gap = true; continue; }
        if (s0.charAt(0) === '#') continue;
        var mm = s0.match(/^\[(ti|ar|al|by|offset):(.*)\]$/i);
        if (mm) { meta[mm[1].toLowerCase()] = jzTrim(mm[2]); continue; }
        // the line markers (|注释, a trailing !, *強調*, /手動切分) come off the row first: they may sit between the
        // word timestamps, so they have to be gone before the words are read out of it (逐字 and markers mix freely)
        var mk = jzLineMarkers(s0);
        var kb = jzWordTiming(mk.text);                  // 逐字: the time of every word
        var s = mk.text, times = [], m;
        while ((m = s.match(JZ_KB_LINE))) { if (s.indexOf('<', 1) >= 0 && jzKbQuiet(s)) break; times.push(jzKbSec(m[1], m[2])); s = s.substr(m[0].length); }
        // a tag the row ends on is a time too (where the next row starts), never lyric text: it comes off here, and on
        // a 逐字 row it is already the end of the last word, so the row is not shown twice for it
        s = jzKbTailOff(jzTrim(s));
        // 逐字: on a timed line those leading tags are where the words are, so they are not row times any more
        if (kb) times.length = 0;
        // 双语 (a lyric written in two languages): the second row of a pair starts while the row above it is still
        // singing — the same phrase in another language, and only one of them can be on screen. The row already
        // singing keeps it, so the translation is dropped here (the panel's plan and the browser read the same
        // lyric). A row that starts when the row above ends is the next phrase, not a translation, and stays.
        var st = null, ai;
        if (kb) st = kb.first;
        else for (ai = 0; ai < times.length; ai++) if (st == null || times[ai] < st) st = times[ai];
        if (st != null && open && (open.end != null ? st < open.end - 0.02 : st <= open.start + 0.02)) continue;
        // 間奏: [間奏] / [間奏 8] — also [interlude] [inst] [间奏] [간주]
        var im = s.match(/^\[\s*(\u9593\u594F|\u95F4\u594F|interlude|instrumental|inst|\uAC04\uC8FC)(?:\s*[:\uFF1A]?\s*(\d+(?:\.\d+)?)\s*(?:s|sec|\u79D2|\uCD08)?)?\s*\]$/i);
        if (im) {
            var ib = { text: '', interlude: true, secs: im[2] ? parseFloat(im[2]) : null, note: null, impact: false, emph: [], manual: null, gapBefore: gap, lrc: null };
            gap = false;
            open = st != null ? { start: st, end: im[2] ? st + parseFloat(im[2]) : null } : null;
            if (times.length) { for (var it = 0; it < times.length; it++) { var ic = jzCopy(ib); ic.lrc = times[it]; lines.push(ic); } }
            else lines.push(ib);
            continue;
        }
        var note = mk.note, impact = mk.impact, emph = mk.emph, manual = null;
        if (kb && mk.cuts.length) { manual = jzKbCuts(kb, mk.cuts); s = kb.text; }   // 逐字: / cuts the words, not the tags
        else if (mk.cuts.length) { manual = mk.cuts; s = mk.cuts.join(/[A-Za-z]/.test(s) ? ' ' : ''); }
        if (kb) s = kb.text;                             // 逐字: the line is the words and their times
        if (!s) continue;
        var base = { text: s, note: note, impact: impact, emph: emph, manual: manual, gapBefore: gap, lrc: null, kb: kb };
        gap = false;
        var at = [], t;
        if (kb) at.push(kb.first);
        else for (t = 0; t < times.length; t++) at.push(times[t]);
        open = (st != null && at.length <= 1) ? { start: st, end: kb ? kb.last : jzKbTailEnd(mk.text) } : null;
        if (at.length) { for (var q = 0; q < at.length; q++) { var c = jzCopy(base); c.lrc = at[q]; lines.push(c); } }
        else lines.push(base);
    }
    return { lines: lines, meta: meta };
}
function jzCopy(o) { var r = {}; for (var k in o) if (o.hasOwnProperty(k)) r[k] = o[k]; return r; }

// bunsetsu-ish chunking without a dictionary: script runs + trailing kana
function jzChunk(text) {
    var cs = jzChars(text), chunks = [], cur = '', curType = '', hasH = false, i;
    function typeOf(ch) {
        if (/[\s\u3000]/.test(ch)) return 'S';
        if (jzIsPunct(ch)) return 'P';
        if (jzIsKanji(ch)) return 'K';
        if (jzIsHira(ch) || ch === '\u30FC') return 'H';
        if (jzIsKata(ch)) return 'T';
        if (jzIsLatin(ch)) return 'L';
        return 'O';
    }
    function close() { if (jzTrim(cur)) chunks.push(jzTrim(cur)); cur = ''; curType = ''; hasH = false; }
    var hRun = 0;
    for (i = 0; i < cs.length; i++) {
        var ch = cs[i], t = typeOf(ch);
        if (t === 'S') { close(); continue; }
        if (t === 'P') { if (cur) cur += ch; else if (chunks.length) chunks[chunks.length - 1] += ch; continue; }
        if (!cur) { cur = ch; curType = t; hasH = t === 'H'; hRun = t === 'H' ? 1 : 0; continue; }
        if (t === 'H') {
            // kana after kanji/katakana (okurigana, particles) stays; long pure-kana runs split at ~6
            if (curType !== 'H' || jzChars(cur).length < 6) { cur += ch; hasH = true; hRun++; continue; }
            close(); cur = ch; curType = 'H'; hasH = true; hRun = 1; continue;
        }
        if (t === 'K' && curType === 'K' && !hasH) { cur += ch; continue; }
        if (t === 'T' && curType === 'T' && !hasH) { cur += ch; continue; }
        if (t === 'L' && curType === 'L') { cur += ch; continue; }
        // kanji right after a short kana particle run starts a new chunk
        close(); cur = ch; curType = t; hasH = t === 'H'; hRun = 0;
    }
    close();
    var out = [];
    for (i = 0; i < chunks.length; i++) {
        var n = jzChars(chunks[i]).length;
        if (n > 10) { var half = Math.ceil(n / 2), cc = jzChars(chunks[i]); out.push(cc.slice(0, half).join('')); out.push(cc.slice(half).join('')); }
        else out.push(chunks[i]);
    }
    for (i = out.length - 1; i > 0; i--) if (jzChars(out[i]).length === 1 && !jzIsKanji(out[i])) { out[i - 1] += out[i]; out.splice(i, 1); }
    return out.length ? out : [text];
}
