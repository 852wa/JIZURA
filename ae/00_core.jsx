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
function jzIsPunct(ch) { return /[\u3001\u3002\uFF0C\uFF0E,.!?\uFF01\uFF1F\u2026\u2025\u30FB\u300C\u300D\u300E\u300F\uFF08\uFF09()\u3010\u3011\u3008\u3009\u300A\u300B\u3014\u3015\uFF3B\uFF3D\[\]'"\u201C\u201D\u2018\u2019~\u301C\uFF5E:\uFF1A;\uFF1B\-\u2014\u2015]/.test(ch); }
// opening brackets / quotes (same rule as the browser's J.isOpenPunct): a line or a chunk never ends with one.
// A straight " or ' opens a quote at the start or after a space / another opening bracket, when a non-space follows
var JZ_OPEN_BR = '\u300C\u300E\uFF08(\u3010\u3008\u300A\u3014\uFF3B[\uFF5B{\u201C\u2018';
var JZ_NO_START = '\u3001\u3002\uFF0C\uFF0E,.!?\uFF01\uFF1F\u2026\u2025\u30FB\u300D\u300F\uFF09)\u3011\u3009\u300B\u3015\uFF3D]\uFF5D}\u201D\u2019:\uFF1A;\uFF1B';
var JZ_WORDCH = /[A-Za-z\u00C0-\u024F0-9\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
function jzIsOpenAt(cs, i) {
    var c = cs[i];
    if (JZ_OPEN_BR.indexOf(c) >= 0) return true;
    if (c !== '"' && c !== "'") return false;
    var p = cs[i - 1], n = cs[i + 1];
    return (i === 0 || /[\s\u3000]/.test(p) || JZ_OPEN_BR.indexOf(p) >= 0) && n != null && !/[\s\u3000]/.test(n);
}
// closing punctuation that must not start a line: closing brackets / quotes, commas, stops, ! ? …
function jzIsNoStart(cs, i) { var c = cs[i]; return c != null && (JZ_NO_START.indexOf(c) >= 0 || ((c === '"' || c === "'") && !jzIsOpenAt(cs, i))); }
function jzIsWordLike(t) { return /^[A-Za-z\u00C0-\u024F0-9\uAC00-\uD7AF'\u2019.,!?\u2010\u2013\u2014\-]+$/.test(t) && JZ_WORDCH.test(t); }
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

// ---------------------------------------------------------------- lyric parsing
function jzParseLyrics(raw) {
    var lines = [], meta = {}, gap = false;
    var rows = String(raw || '').replace(/\r\n?/g, '\n').split('\n');
    for (var r = 0; r < rows.length; r++) {
        var s0 = jzTrim(rows[r]);
        if (!s0) { if (lines.length) gap = true; continue; }
        if (s0.charAt(0) === '#') continue;
        var mm = s0.match(/^\[(ti|ar|al|by|offset):(.*)\]$/i);
        if (mm) { meta[mm[1].toLowerCase()] = jzTrim(mm[2]); continue; }
        var s = s0, times = [], m;
        while ((m = s.match(/^\[(\d+):(\d+(?:[.:]\d+)?)\]/))) { times.push(parseInt(m[1], 10) * 60 + parseFloat(m[2].replace(':', '.'))); s = s.substr(m[0].length); }
        s = jzTrim(s);
        // 間奏: [間奏] / [間奏 8] — also [interlude] [inst] [间奏] [간주]
        var im = s.match(/^\[\s*(\u9593\u594F|\u95F4\u594F|interlude|instrumental|inst|\uAC04\uC8FC)(?:\s*[:\uFF1A]?\s*(\d+(?:\.\d+)?)\s*(?:s|sec|\u79D2|\uCD08)?)?\s*\]$/i);
        if (im) {
            var ib = { text: '', interlude: true, secs: im[2] ? parseFloat(im[2]) : null, note: null, impact: false, emph: [], manual: null, gapBefore: gap, lrc: null };
            gap = false;
            if (times.length) { for (var it = 0; it < times.length; it++) { var ic = jzCopy(ib); ic.lrc = times[it]; lines.push(ic); } }
            else lines.push(ib);
            continue;
        }
        var note = null, bar = s.indexOf('|');
        if (bar >= 0) { note = jzTrim(s.substr(bar + 1)) || null; s = jzTrim(s.substr(0, bar)); }
        var impact = false;
        if (s.length > 1 && s.charAt(s.length - 1) === '!') { impact = true; s = jzTrim(s.substr(0, s.length - 1)); }
        var emph = [];
        s = s.replace(/\*([^*]+)\*/g, function (all, w) { emph.push(w); return w; });
        var manual = null;
        if (s.indexOf('/') >= 0) {
            var parts = s.split('/'), mp = [];
            for (var p = 0; p < parts.length; p++) { var tp = jzTrim(parts[p]); if (tp) mp.push(tp); }
            manual = mp; s = mp.join(/[A-Za-z]/.test(s) ? ' ' : '');
        }
        if (!s) continue;
        var base = { text: s, note: note, impact: impact, emph: emph, manual: manual, gapBefore: gap, lrc: null };
        gap = false;
        if (times.length) { for (var t = 0; t < times.length; t++) { var c = jzCopy(base); c.lrc = times[t]; lines.push(c); } }
        else lines.push(base);
    }
    return { lines: lines, meta: meta };
}
function jzCopy(o) { var r = {}; for (var k in o) if (o.hasOwnProperty(k)) r[k] = o[k]; return r; }

// bunsetsu-ish chunking without a dictionary: script runs + trailing kana
function jzChunk(text) {
    var cs = jzChars(text), chunks = [], cur = null, gap = false, i, j;
    function typeOf(ch) {
        if (/[\s\u3000]/.test(ch)) return 'S';
        if (jzIsPunct(ch)) return 'P';
        if (jzIsKanji(ch)) return 'K';
        if (jzIsHira(ch) || ch === '\u30FC') return 'H';
        if (jzIsKata(ch)) return 'T';
        if (/[A-Za-z0-9\u00C0-\u024F]/.test(ch)) return 'L';
        if (/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(ch)) return 'G';   // Hangul: one word per run, like Latin
        return 'O';
    }
    // each chunk remembers whether a space came before it (sp), so words split apart are joined back with that space
    function start(ch, t) { cur = { s: ch, k: t, hasH: t === 'H', sp: gap, open: false }; }
    function close() { if (cur && jzTrim(cur.s)) { chunks.push({ s: jzTrim(cur.s), sp: cur.sp }); gap = false; } cur = null; }
    for (i = 0; i < cs.length; i++) {
        var ch = cs[i], t = typeOf(ch);
        if (t === 'S') { close(); gap = true; continue; }
        if (t === 'P') {
            // an opening bracket / quote starts the next chunk \u2014 it never ends one
            if (jzIsOpenAt(cs, i)) { if (cur && cur.open) cur.s += ch; else { close(); start(ch, 'P'); cur.open = true; } }
            else if (cur) cur.s += ch;
            else if (chunks.length) chunks[chunks.length - 1].s += ch;
            else start(ch, 'P');
            continue;
        }
        if (!cur) { start(ch, t); continue; }
        if (cur.open) { cur.s += ch; cur.k = t; cur.hasH = t === 'H'; cur.open = false; continue; }
        if (t === 'H') {
            // kana after kanji/katakana (okurigana, particles) stays; long pure-kana runs split at ~6
            if (cur.k !== 'H' || jzChars(cur.s).length < 6) { cur.s += ch; cur.hasH = true; continue; }
            close(); start(ch, 'H'); continue;
        }
        if (t === 'K' && cur.k === 'K' && !cur.hasH) { cur.s += ch; continue; }
        if (t === 'T' && cur.k === 'T' && !cur.hasH) { cur.s += ch; continue; }
        if ((t === 'L' || t === 'G') && cur.k === t) { cur.s += ch; continue; }
        // kanji right after a short kana particle run starts a new chunk
        close(); start(ch, t);
    }
    close();
    var out = [];
    for (i = 0; i < chunks.length; i++) {
        var c = chunks[i], cc = jzChars(c.s), n = cc.length;
        if (n > 10 && jzIsWordLike(c.s)) {
            // one long Latin / Hangul word: never cut inside it \u2014 only after its dashes (never-ending \u2192 never- / ending)
            var part = '', first = true;
            for (j = 0; j < n; j++) { part += cc[j]; if (/[\-\u2010\u2013\u2014]/.test(cc[j]) && j + 1 < n) { out.push({ s: part, sp: first ? c.sp : false }); part = ''; first = false; } }
            if (part) out.push({ s: part, sp: first ? c.sp : false });
        } else if (n > 10) { var half = Math.ceil(n / 2); out.push({ s: cc.slice(0, half).join(''), sp: c.sp }); out.push({ s: cc.slice(half).join(''), sp: false }); }
        else out.push(c);
    }
    for (i = out.length - 1; i > 0; i--) {
        var a = out[i - 1].s, b = out[i].s;
        if (jzChars(b).length !== 1 || jzIsKanji(b)) continue;
        // a lone word after a sentence break (\u201Cexactly! I know,\u201D) goes with the words after it
        if (out[i].sp && JZ_WORDCH.test(b) && /[.,!?;:\u2026\u201D\u2019"')\]\u300D\u300F\uFF09]$/.test(a) && i + 1 < out.length) { out[i + 1] = { s: b + ' ' + out[i + 1].s, sp: true }; out.splice(i, 1); continue; }
        var ac = jzChars(a), space = JZ_WORDCH.test(b) && !/[\-\u2010\u2013\u2014]$/.test(a) && (out[i].sp || JZ_WORDCH.test(ac[ac.length - 1]));
        out[i - 1] = { s: a + (space ? ' ' : '') + b, sp: out[i - 1].sp }; out.splice(i, 1);
    }
    var res = [];
    for (i = 0; i < out.length; i++) res.push(out[i].s);
    return res.length ? res : [text];
}
