/* ============================================================
   JIZURA — 歌詞の自動タイミング: forcing the written lyrics onto
   word-level timings from speech recognition (v0.11)

   The browser edition already has three ways to time a line: the estimate from
   the text, the tap sync, and a typed / dragged time. This adds a fourth, and
   the only one that starts from a machine reading of the song: the lyrics are
   aligned against a word-level transcript and the result is written to
   timing.lineTimes, so every existing edit (tap, type, drag, LRC export) works
   on it unchanged.

   The interesting part is not the transcription but the matching. Recognisers
   mishear sung words, drop whole lines, invent lines during instrumental
   sections, and merge a phrase into one long "word"; the written lyrics have
   lines the singer repeats differently. So the words are not trusted, only
   their timestamps: the lyrics are aligned to them with a monotone edit
   distance over the whole song, and every line is timed from the words that
   really matched it.

   The algorithm is a browser port and generalisation of a Python script that
   timed one English song against a Whisper transcript. That script matched a
   whole line to a whole transcript segment, and its word matching only knew
   lower-case a-z. This version matches word by word across the whole song
   (so a line and a segment no longer have to be the same thing), works on
   Japanese and Chinese as well (one token per character, which is what the
   recogniser emits for those languages), and reports how well each line
   matched so the user knows which lines to look at.

   Nothing here touches the DOM or the audio: it is a function from text +
   timings to timings, which is what makes it testable outside the browser
   (dev/autolrc_test.js).
   ============================================================ */
(() => {
'use strict';

/* ---------------- text -> match tokens ----------------
   A token is one thing a recogniser can put a timestamp on: a word in a
   spaced script, one character in a script that is written without spaces
   (the recogniser emits roughly one token per character there too).
   `key` is the form two tokens are compared in:
     - Latin / Cyrillic / Hangul: lower case, no apostrophes, first 4 letters
       ("Never" / "never" / "NEVER" -> "neve"), so inflections and stray
       casing still match; shorter words compare whole.
     - kana: the character with its dakuten removed (か/が, は/ば/ぱ) and half
       width katakana folded to full width, because recognisers normalise those.
     - kanji / Han: the character itself.
     - Hangul: the syllable itself (the recogniser emits it as one token).
   `own` is the letter the line keeps, used for the character count that
   interpolates lines the recogniser missed. */
const KANA = /[\u3041-\u309f\u30a0-\u30ff\uff66-\uff9f]/;
const HAN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const HANGUL = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/;
const WORD = /[0-9A-Za-z\u00c0-\u024f\u0370-\u03ff\u0400-\u04ff\u1e00-\u1eff]/;

/* katakana -> hiragana, half width katakana -> full width (the recogniser mixes all three) */
const foldKana = (c) => {
  const o = c.codePointAt(0);
  if (o >= 0x30a1 && o <= 0x30f6) return String.fromCodePoint(o - 0x60);       // カ -> か
  if (o >= 0xff66 && o <= 0xff9d) {                                            // ｶ -> カ, then か
    const k = o - 0xff66, voiced = k > 24 ? k - 1 : k;                         // ｶ..ﾝ
    return String.fromCodePoint((voiced >= 0 && voiced <= 0x55 ? 0x30a1 + voiced : o) - 0x60);
  }
  return c;
};
const unvoice = (c) => {
  const o = c.codePointAt(0);
  if (o >= 0x3041 && o <= 0x3096) {                                            // hiragana
    if (o >= 0x304b && o <= 0x3054) return String.fromCodePoint(o - (o % 2 ? 1 : 2));  // が->か か->か
    if (o >= 0x3056 && o <= 0x305f) return String.fromCodePoint(o - (o > 0x3059 ? 1 : 2));
    if (o >= 0x3060 && o <= 0x3069) return String.fromCodePoint(o - (o % 2 ? 1 : 2));
    if (o === 0x308f || o === 0x3091 || o === 0x3092) return String.fromCodePoint(o - 2);
  }
  return c;
};

const isKana = (c) => KANA.test(foldKana(c));
const isHan = (c) => HAN.test(c);
const isHangul = (c) => HANGUL.test(c);
const isWordish = (c) => WORD.test(c);

/* one character in a script without spaces -> one token; runs of letters -> one token each */
J.lyricTokens = (text) => {
  const out = [];
  const chars = [...String(text || '')];
  let word = '';
  const flush = () => {
    if (!word) return;
    const w = word.toLowerCase().replace(/['\u2019\u2018\u02bc]/g, '');
    if (w) out.push({ own: w, key: w.length <= 4 ? w : w.slice(0, 4), kind: isHangul([...w][0]) ? 'hangul' : 'word' });
    word = '';
  };
  for (const c of chars) {
    if (isWordish(c)) { word += c; continue; }
    if (isHangul(c)) { flush(); const h = c.normalize('NFC'); out.push({ own: h, key: h, kind: 'hangul' }); continue; }
    if (isKana(c)) { flush(); const h = foldKana(c).normalize('NFC'); out.push({ own: h, key: unvoice(h), kind: 'kana' }); continue; }
    if (isHan(c)) { flush(); const h = c.normalize('NFC'); out.push({ own: h, key: h, kind: 'han' }); continue; }
    flush();                                                                  // punctuation, spaces, symbols
  }
  flush();
  return out;
};

/* do two tokens mean the same thing?
   exact for every script, plus the cases recognisers are sloppy about:
   words that share a stem, kana that differ only in voicing, and Han characters
   written in the other Chinese script (这/這 — src/09a_han.js has the table, and a
   recogniser answers in whichever script it was trained on, not the user's). */
J.tokenEq = (a, b) => {
  if (!a || !b) return false;
  if (a.key === b.key) return true;
  if (a.kind === 'word' && b.kind === 'word') {
    if (a.key.length >= 4 && b.key.length >= 4) return a.key === b.key;
    return a.own.startsWith(b.own) || b.own.startsWith(a.own);
  }
  if (a.kind === 'kana' && b.kind === 'kana') return a.key === b.key || a.own === b.own;
  if (a.kind === 'han' && b.kind === 'han' && J.hanVariants) {
    const va = J.hanVariants(a.own);
    if (va && va.indexOf(b.own) >= 0) return true;
  }
  return false;
};

/* ---------------- transcript -> word tokens ----------------
   Accepts the shapes a word-level transcript arrives in:
     { segments: [ { text, start, end, words: [ { word|text, start, end } ] } ] }
     { chunks:   [ { text, timestamp: [start, end] } ] }          (segments only)
     [ { text, start, end } ]                                    (already flat)
   Words without a timestamp are dropped, and only words that carry something a
   lyric can match against survive, so the token index stays comparable with
   the lyric token index. `cluster` marks the words that came in as one unit
   (the recogniser's own word) — several lyric tokens may match one cluster and
   that still counts as one match. */
J.asrTokens = (transcript) => {
  const out = [];
  let cluster = 0;
  const push = (word, start, end) => {
    const toks = J.lyricTokens(word);
    const t = +start;
    if (!toks.length || !isFinite(t)) return;
    cluster++;
    for (const k of toks) out.push({ key: k.key, own: k.own, kind: k.kind, t, end: isFinite(+end) ? +end : t, cluster });
  };
  const segs = (transcript && (transcript.segments || transcript.chunks)) || transcript || [];
  if (!Array.isArray(segs)) return out;
  for (const s of segs) {
    if (!s) continue;
    if (Array.isArray(s.words) && s.words.length) {
      for (const w of s.words) push(w.word != null ? w.word : w.text, w.start != null ? w.start : s.start, w.end != null ? w.end : s.end);
      continue;
    }
    const ts = Array.isArray(s.timestamp) ? s.timestamp : null;
    const start = ts ? ts[0] : s.start;
    if (start == null || !isFinite(+start)) continue;
    const text = s.text != null ? s.text : '';
    // a segment without word timings: spread its words evenly across the segment so they can still anchor a line
    const words = String(text).trim().split(/\s+/).filter(Boolean);
    const end = (ts && ts[1] != null ? ts[1] : s.end);
    const span = isFinite(+end) ? Math.max(0.001, +end - +start) : 0.001;
    const units = words.length > 1 ? words : [...String(text).trim()];
    units.forEach((w, i, arr) => push(w, +start + span * (i / arr.length), +start + span * ((i + 1) / arr.length)));
  }
  return out;
};

/* ---------------- the alignment ----------------
   One monotone alignment over the whole song (Levenshtein with matches at
   cost 0), then a line-by-line reading of the trace. Monotone means a line can
   never be timed before the line above it, which is what makes repeated
   choruses ("Your name, your name") land on the right repetition: the search
   has to keep going forward.

   Why not "assign each line one segment" (what the Python original did): a
   line and a transcript segment are different things when the recogniser
   merges a phrase into one long unit or splits one sung line into three, and
   those are exactly the cases that used to need hand fixing.

   Costs:
     match            0
     a word changed   1                 (misheard)
     transcript only  1 (0.3 inside a marked interlude: skipping the singing
                          there is expected, so the alignment is not dragged)
     lyric only       1                 (the recogniser dropped it)
   Then, per line:
     word   — timed from the first matched word of that line
     seg    — nothing matched, but the recogniser heard the line's own words:
              the line takes the start of the span the alignment skipped over
     gap    — nothing matched and no span to use: interpolated between the
              lines around it, in proportion to how much text each line has
     interp — same, but for a line the user marked as an interlude: placed
              after the previous line so the instrumental stays where it is
   After that every time is pushed forward to keep the written order. */

/* Costs, in units of one misheard word. Everything the transcript has that the lyrics
   do not (and the other way round) costs the same, so the alignment cannot buy a
   cheaper path by throwing away a stretch of real singing: skipping is only worth it
   when what comes after matches better. An earlier version made the transcript words
   near the start and the end cheap to skip, to survive a spoken intro; on a real song
   that let the alignment discard the first third of the lyrics, because a long run of
   nearly-free skips anywhere came out cheaper than matching it. */
const C = { match: 0, swap: 1, ins: 1, del: 1 };

/* Global alignment of the two token sequences (Needleman–Wunsch with unit costs, a
   match free), returned as the pairs of tokens that correspond.

   Written as Hirschberg's recursion: split the lyrics in half, score each half
   against the transcript with one rolling row, find the transcript position where
   the two halves meet, and recurse. A rolling row cannot tell you where the best
   path went — that is the whole reason this is a recursion and not a traceback over
   stored arrows — and it keeps the memory to two rows instead of a table the size of
   the song squared. What it does not do is band the table around the diagonal: a
   recogniser that drops a phrase makes the two sequences drift apart by as much as
   the phrase was long (149 tokens on the song this was developed against), and a
   band tight enough to be worth having cut exactly that path. */
const MAX_TOKENS = 4000;

/* The cost of aligning ref[a..b) against asr[ja..jb), for every split of the range,
   as two rows. `rev` walks both ranges backwards, which is how the second half is
   scored against the same transcript range. */
function rangeCosts(ref, a, b, asr, ja, jb, rev) {
  const w = jb - ja;
  let prev = new Float64Array(w + 1), cur = new Float64Array(w + 1);
  for (let j = 0; j <= w; j++) prev[j] = j * C.ins;
  for (let i = a; i < b; i++) {
    const r = rev ? ref[b - 1 - (i - a)] : ref[i];
    cur[0] = prev[0] + C.del;
    for (let j = 1; j <= w; j++) {
      const s = rev ? asr[jb - j] : asr[ja + j - 1];
      const diag = prev[j - 1] + (J.tokenEq(r, s) ? C.match : C.swap);
      const up = prev[j] + C.ins;
      const left = cur[j - 1] + C.del;
      cur[j] = diag < up ? (diag < left ? diag : left) : (up < left ? up : left);
    }
    const t = prev; prev = cur; cur = t;
  }
  return prev;
}

/* The last layer of the recursion: one lyric token, and the transcript range the
   split above left for it. Only a word the two sides agree on counts as a match; a
   substitution here is not evidence of anything (the range can be hundreds of words
   wide, and something in it will always be the "closest" word to any token), so a
   single token that nothing in its range matches is simply left unmatched, and the
   line it belongs to is interpolated like any other line without evidence. */
function alignOne(ref, a, asr, ja, jb, out) {
  for (let j = ja; j < jb; j++) {
    if (J.tokenEq(ref[a], asr[j])) { out.push([a, j, true]); return; }
  }
}

/* Hirschberg: score both halves of the lyric tokens against the same transcript
   range, find the transcript position where they meet, recurse. Each half is then
   confined to its share of the transcript, which is what keeps the two halves in
   order without a traceback. */
function alignHalf(ref, a, b, asr, ja, jb, out) {
  if (a >= b || ja >= jb) return;
  if (a + 1 === b) { alignOne(ref, a, asr, ja, jb, out); return; }
  const mid = (a + b) >> 1, w = jb - ja;
  const top = rangeCosts(ref, a, mid, asr, ja, jb, false);
  const bottom = rangeCosts(ref, mid, b, asr, ja, jb, true);
  let k = 0, bestV = Infinity;
  for (let t = 0; t <= w; t++) { const v = top[t] + bottom[w - t]; if (v < bestV) { bestV = v; k = t; } }
  alignHalf(ref, a, mid, asr, ja, ja + k, out);
  alignHalf(ref, mid, b, asr, ja + k, jb, out);
}

function alignTrace(ref, asr) {
  const n = ref.length, m = asr.length;
  if (!n || !m) return [];
  const out = [];
  alignHalf(ref, 0, n, asr, 0, m, out);
  out.sort((x, y) => x[0] - y[0]);
  return out;
}

/* A word or two the recogniser put at the very front, further from the rest than the
   spacing inside the rest, is its own invention: a song does not open with one word and
   then a long pause. The threshold comes from the transcript's own word spacing, so it
   works on a dense rap verse and a sparse ballad alike, and the two-second floor keeps
   it from trimming the ordinary pause between two sung lines. */
function trimStrayStart(asr) {
  if (asr.length < 6) return asr;
  const gaps = [];
  for (let i = 1; i < asr.length; i++) gaps.push(asr[i].t - asr[i - 1].t);
  const sorted = gaps.slice().sort((a, b) => a - b);
  const p80 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.8))];
  const limit = Math.max(2.0, p80 * 3);
  let cut = 0;
  while (cut < asr.length - 1 && asr[cut + 1].t - asr[cut].t > limit) cut++;
  return cut ? asr.slice(cut) : asr;
}

/* gap lines: written by the user as [間奏] / [interlude] / [inst] … and parsed by J.parseLyrics */
const isGap = (line) => !!(line && (line.interlude || (!line.text && !(line.tokens && line.tokens.length))));

/* how long a line reads: characters when the script has no spaces, words + letters when it has */
J.lineWeight = (text) => {
  const toks = J.lyricTokens(text);
  if (!toks.length) return 1;
  let w = 0;
  for (const t of toks) w += t.kind === 'word' ? Math.max(1, t.own.length / 4) : 1;
  return Math.max(1, w);
};

/* the main entry point. See the module comment; times are in seconds. */
J.alignLyricTimes = (lyrics, transcript, opts) => {
  const o = opts || {};
  const lines = (Array.isArray(lyrics) ? lyrics : J.parseLyrics(lyrics).lines).map((l, index) => {
    const text = String(l.text != null ? l.text : l);
    /* a time tag is looked for on the line itself as well as in a parsed row, so a
       caller passing plain strings still gets the soft anchor */
    const tag = l.lrc != null && isFinite(+l.lrc) ? +l.lrc
      : (() => { const m = text.match(/^\s*\[(\d+):(\d+(?:[.:]\d+)?)\]/); return m ? +m[1] * 60 + parseFloat(m[2].replace(':', '.')) : null; })();
    const tokens = J.lyricTokens(text);
    return { index, text, tokens, tagged: tag, interlude: !!l.interlude, secs: l.secs != null ? +l.secs : null, src: l.src != null ? l.src : index, gap: !tokens.length || !!l.interlude };
  });
  const asr = J.asrTokens(transcript);
  const out = { times: {}, how: {}, score: {}, stats: { lines: lines.length, words: asr.length, tokens: 0, matched: 0, anchored: 0, first: null, last: null, span: 0 } };
  if (!lines.length || !asr.length) { out.stats.reason = !lines.length ? 'no-lyrics' : 'no-words'; return out; }

  const ref = [];
  lines.forEach((l, li) => l.tokens.forEach((t, at) => ref.push(Object.assign({}, t, { line: li, at }))));
  out.stats.tokens = ref.length;
  if (ref.length > MAX_TOKENS || asr.length > MAX_TOKENS) { out.stats.reason = 'too-long'; return out; }
  /* A recogniser drops a stray word at 0.00 s on a clip that opens with an
     instrumental — Whisper does it on all three synthetic samples — and that word is
     usually the one the first line begins with, so left in it times the first line at
     zero and pushes the rest along. Such a word is recognisable without looking at the
     audio at all: it sits seconds away from everything else the recogniser heard, so
     anything at the front that is further from the second word than the gap it would
     have to account for is dropped. Measured temporally rather than by loudness because
     a loudness threshold did not travel between the samples (see src/10c_features.js). */
  const words = trimStrayStart(asr);
  if (words.length < asr.length) out.stats.dropped = asr.length - words.length;
  const pairs = alignTrace(ref, words);
  const hit = lines.map(() => []);                        // line -> [{t, i, c}] : time, index in the line, transcript word
  for (const [ri, ai, eq] of pairs) if (eq) {
    const li = ref[ri].line;
    hit[li].push({ t: words[ai].t, i: ref[ri].at, c: words[ai].cluster });
  }
  out.stats.matched = hit.filter(h => h.length).length;

  const times = new Array(lines.length).fill(null);
  const how = new Array(lines.length).fill(null);
  lines.forEach((l, li) => {
    l.words = hit[li];
    if (!l.tokens.length || !hit[li].length) return;
    const clusters = new Set(hit[li].map(x => x.c));
    l.match = clusters.size / Math.max(1, l.tokens.length);
    /* the first word the recogniser and the lyrics agree on is where the line
       starts. A cleverer reading — treating every matched word as an opinion about
       the line's start and taking the middle — was measured on the real song and is
       worse (p90 270 ms against 0 ms here): word timings drift inside a line, so the
       later words carry more noise than the first one carries bias. */
    l.first = Math.min(...hit[li].map(x => x.t));
    l.last = Math.max(...hit[li].map(x => x.t));
    times[li] = Math.max(0, l.first + (o.lead || 0));
    how[li] = 'word';
  });

  /* A line nothing matched: the recogniser heard something where the line sits but
     not its words. The alignment left those transcript words out, and they sit
     between the last word of the line above and the first word of the line below —
     so the line takes the first of them. Looking at that gap rather than at how far
     through the lyrics the line is keeps this honest when the transcript and the
     lyrics drift apart. */
  const lastUsed = new Array(lines.length).fill(-1);      // transcript index matched to this line
  const firstUsed = new Array(lines.length).fill(-1);
  const taken = new Set();
  for (const [ri, ai, eq] of pairs) {
    if (!eq) continue;
    taken.add(ai);
    const li = ref[ri].line;
    if (firstUsed[li] < 0) firstUsed[li] = ai;
    lastUsed[li] = ai;
  }
  const nearestBefore = (li) => { for (let k = li - 1; k >= 0; k--) if (lastUsed[k] >= 0) return lastUsed[k]; return -1; };
  const nearestAfter = (li) => { for (let k = li + 1; k < lines.length; k++) if (firstUsed[k] >= 0) return firstUsed[k]; return words.length; };
  for (let li = 0; li < lines.length; li++) {
    if (times[li] != null || !lines[li].tokens.length) continue;
    const before = nearestBefore(li), from = before + 1, to = nearestAfter(li);
    /* Whatever the alignment skipped between the line above and the line below is this
       line's, and only that. Two things this refuses to do: take a word when there is
       nothing skipped (the lines either side are neighbours in the transcript, so the
       line really was not sung and interpolation is the honest answer), and take a word
       when the transcript has a whole extra copy of the chorus to wander into — which is
       why the end of the song gives up when the gap is more than a line or two long. */
    const room = to - from;
    if (room <= 0 || (li > 0 && to >= words.length && room > 6)) continue;
    for (let ai = from; ai < to - 1; ai++) {
      if (taken.has(ai)) continue;
      times[li] = Math.max(0, words[ai].t + (o.lead || 0));
      how[li] = 'seg';
      break;
    }
  }

  /* what is left gets interpolated: the room between the lines that did match,
     split by how much text each line has. An interlude written with a length
     ([間奏 8]) keeps that length; the rest only shares what is left over. */
  for (let li = 0; li < lines.length; li++) {
    if (times[li] != null) continue;
    let before = li - 1; while (before >= 0 && times[before] == null) before--;
    let after = li + 1; while (after < lines.length && times[after] == null) after++;
    const run = [];
    /* only up to the next line that has a time: a run that overshot it would push
       the line below out of the way as well */
    for (let k = before + 1; k < (after < lines.length ? after : lines.length); k++) run.push(k);
    const t0 = before >= 0 ? times[before] : 0;
    const t1 = after < lines.length ? times[after] : null;
    const room = t1 != null ? Math.max(0, t1 - t0) : 0;
    /* the room between the two lines that did match is shared out in proportion to
       how much text is written in the gap, with one extra share standing for the
       silence around the dropped lines — so a single dropped line in a long gap
       lands part way into it rather than on top of the line above. A line at the
       very start of the gap still cannot start before the line above it; the
       monotone pass below is what guarantees that. An interlude keeps the length it
       was written with. */
    let fixed = 0, flexible = 0;
    for (const k of run) {
      const held = lines[k].secs > 0 ? lines[k].secs : null;
      if (held) fixed += held; else flexible += lines[k].gap ? 4 : J.lineWeight(lines[k].text);
    }
    const scale = Math.max(0, room - fixed) / (flexible + 1);
    let t = t0;
    for (const k of run) {
      const held = lines[k].secs > 0 ? lines[k].secs : null;
      t += held || (lines[k].gap ? 4 : J.lineWeight(lines[k].text)) * scale;
      times[k] = Math.max(0, t);
      how[k] = how[k] || (lines[k].gap ? 'gap' : 'interp');
    }
  }

  /* keep the written order: a later line never starts before the line above it */
  const minGap = o.minGap != null ? o.minGap : 0.05;
  for (let li = 1; li < lines.length; li++) if (times[li] < times[li - 1] + minGap) times[li] = times[li - 1] + minGap;

  /* the audio gets the last word on where a line starts: pull a start out of an
     instrumental stretch, and onto a syllable attack when one is right there */
  out.stats.moved = o.features ? refineWithAudio(lines, times, o.features, o) : 0;

  /* snap to the beat when the line is already within a fraction of one (the plan
     snaps cuts to beats anyway) */
  const beats = Array.isArray(o.beats) ? o.beats : null;
  if (beats && beats.length > 1) {
    const period = beats[1] - beats[0];
    const tol = (o.beatSnap != null ? o.beatSnap : 0.14) * period;
    for (let li = 0; li < lines.length; li++) {
      let best = null, bd = tol;
      for (const b of beats) { const d = Math.abs(b - times[li]); if (d < bd) { bd = d; best = b; } if (b > times[li] + tol) break; }
      if (best != null) times[li] = best;
    }
    for (let li = 1; li < lines.length; li++) if (times[li] < times[li - 1] + minGap) times[li] = Math.min(times[li - 1] + minGap, beats[beats.length - 1]);
  }

  lines.forEach((l, li) => {
    out.times[li] = +times[li].toFixed(3);
    out.how[li] = how[li] || 'interp';
    const n = Math.max(1, l.tokens.length);
    let score = l.match != null ? l.match : 0;
    if (l.first != null && l.last != null && n > 1) {
      /* the matched words should sit in a stretch of time that fits the line's length.
         The band is wide on purpose: it is here to catch a line matched to the wrong
         part of the song (off by an order of magnitude), not to second-guess a line
         whose words merely came out fast or slow. */
      const heard = l.last - l.first + (o.wordDur != null ? o.wordDur : 0.35);
      const expect = n * (o.secPerToken || (l.tokens[0] && l.tokens[0].kind === 'word' ? 0.34 : 0.24));
      const ratio = heard / Math.max(0.3, expect);
      score *= ratio < 0.3 || ratio > 3.5 ? 0.6 : 1;
    }
    /* a time the user already had (a partial LRC pasted into the lyrics) is a soft
       anchor: when the result lands far away from it, something is wrong with
       either the tag or the alignment, and the line should be looked at */
    if (l.tagged != null && Math.abs(l.tagged - times[li]) > (o.anchorTol != null ? o.anchorTol : 2.5)) score *= 0.6;
    out.score[li] = +J.clamp(score).toFixed(2);
  });
  out.stats.first = out.times[0];
  out.stats.last = out.times[lines.length - 1];
  out.stats.span = Math.max(...asr.map(a => a.t));
  out.stats.anchored = lines.filter(l => l.tagged != null).length;
  const scored = lines.map((l, li) => (l.tokens.length ? out.score[li] : null)).filter(v => v != null);
  out.stats.coverage = scored.length ? +(scored.reduce((a, b) => a + b, 0) / scored.length).toFixed(3) : 0;
  out.stats.low = lines.map((l, li) => (l.tokens.length && out.score[li] < 0.5 ? li : -1)).filter(i => i >= 0);
  return out;
};

/* ---------------- the audio correction ----------------
   Two moves, both deliberately small. A line start that sits in a stretch where
   nobody is singing is moved to the nearest place the singing comes back — searched
   around where the line belongs going by how much of the lyrics is above it, not
   just ahead of it, because a line can land deep inside a long prelude. And a start
   with a syllable attack right next to it moves onto that attack, because that is
   where the line audibly begins. Neither move may reorder the lines or run away
   (the search is capped, and the caller can see how many lines moved). */
function refineWithAudio(lines, times, F, o) {
  const rate = F.rate, n = F.frames;
  const at = (t) => Math.round(t * rate);
  const quiet = (i) => !!(F.silence && F.silence[i]);
  const snapSec = o.onsetSnap != null ? o.onsetSnap : 0.3;
  const searchSec = o.gapSearch != null ? o.gapSearch : 12;
  const need = o.onsetMin != null ? o.onsetMin : 0.5;     // on the same scale as J.audioFeatures' normalised onsets
  /* where a line belongs, by how much of the lyrics is written above it */
  const weight = lines.map(l => (l.tokens.length ? J.lineWeight(l.text) : 4));
  const total = weight.reduce((a, b) => a + b, 0) || 1;
  const prior = [];
  let run = 0;
  for (let li = 0; li < lines.length; li++) { prior.push((run + weight[li] / 2) / total); run += weight[li]; }
  let moved = 0;
  for (let li = 0; li < lines.length; li++) {
    const t = times[li], i0 = at(t);
    if (!(t >= 0) || i0 >= n) continue;
    let i = i0, pushed = false;
    if (quiet(i)) {
      const reach = Math.round(searchSec * rate);
      let best = -1, bd = Infinity;
      /* nearest place the singing resumes, measured from where the line already is… */
      for (let d = 0; d <= reach; d++) {
        for (const j of [i0 - d, i0 + d]) {
          if (j < 0 || j >= n || quiet(j)) continue;
          if (d < bd) { bd = d; best = j; }
        }
        if (best >= 0) break;
      }
      if (best < 0) {
        /* …and if the line landed in the middle of a long instrumental, from where it
           belongs going by how much of the lyrics is written above it */
        const guess = Math.round(prior[li] * (n - 1));
        for (let d = 0; d <= reach; d++) {
          for (const j of [guess - d, guess + d]) {
            if (j < 0 || j >= n || quiet(j)) continue;
            if (d < bd) { bd = d; best = j; }
          }
          if (best >= 0) break;
        }
      }
      if (best >= 0) { i = best; pushed = true; }
    }
    const span = Math.round(snapSec * rate);
    const from = pushed ? i : Math.max(0, i - span);      // after a move, only look forward out of the quiet
    let hit = -1, hv = need;
    for (let j = from; j <= Math.min(n - 1, i + span); j++) {
      if (F.onset[j] > hv && !quiet(j)) { hv = F.onset[j]; hit = j; }
    }
    const to = hit >= 0 ? hit / rate : i / rate;
    if (Math.abs(to - t) <= 0.02) continue;
    const lo = li > 0 ? times[li - 1] : -Infinity;        // never reorder the lines
    if (lo !== -Infinity && to < lo) continue;
    times[li] = to;
    moved++;
  }
  return moved;
}

/* ---------------- lyric language ----------------
   The recogniser needs a language hint, and the interface is written in the
   browser's language rather than the song's, so guess it from the lyrics. */
J.guessLyricLang = (text) => {
  const s = String(text || '');
  const n = { kana: 0, han: 0, hangul: 0, latin: 0, other: 0 };
  for (const c of s) {
    if (isKana(c)) n.kana++;
    else if (isHan(c)) n.han++;
    else if (isHangul(c)) n.hangul++;
    else if (/[A-Za-z\u00c0-\u024f\u1e00-\u1eff]/.test(c)) n.latin++;
    else if (/\s/.test(c)) continue;
    else n.other++;
  }
  const total = n.kana + n.han + n.hangul + n.latin;
  if (!total) return 'ja';
  if (n.kana / total > 0.05) return 'ja';                 // kana only exists in Japanese
  if (n.hangul / total > 0.3) return 'ko';
  if (n.han / total > 0.5) return /[们这个来说时过还这里为对开关实现爱恋梦们]/.test(s) ? 'zh-Hans' : 'zh-Hant';
  if (n.latin / total > 0.5) return 'en';
  return 'ja';
};
/* the code the recogniser wants (Whisper has one Chinese, not two) */
J.asrLang = (lang) => {
  const l = String(lang || '');
  if (l.startsWith('zh')) return 'zh';
  if (l.startsWith('ja') || l.startsWith('jp')) return 'ja';
  if (l.startsWith('ko')) return 'ko';
  return l || 'auto';
};
})();

