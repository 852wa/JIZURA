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
