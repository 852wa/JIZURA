/* Lyrics for the real-song regression below, kept next to the word-level transcript
   they are aligned against (i_wont_turn_back.asr.json). These are the written lyrics;
   the .lrc in the fixture folder carries the times this test compares against.
   usage: node dev/autolrc_test.js [--update]   (--update rewrites the expected timings) */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { load, readFixture, readText } = require('./jizura_src.js');

const J = load();

/* ---------------- helpers ---------------- */
/* a transcript in the shape transformers.js returns, from [time, word] pairs */
const words = (list) => ({ segments: list.map(([t, w], i) => ({ text: w, start: t, end: t + 0.2, id: i, words: [{ word: w, start: t, end: t + 0.2 }] })) });
/* a transcript without word timings (segment timestamps only) */
const segs = (list) => ({ segments: list.map(([s, e, text]) => ({ text, start: s, end: e })) });
const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b} (tolerance ${tol})`);

test('latin: every line starts at its first matched word', () => {
  const lyrics = ['Hello darkness my old friend', "I've come to talk with you again", 'Because a vision softly creeping'];
  const r = J.alignLyricTimes(lyrics, words([[10.0, 'Hello'], [10.4, 'darkness'], [10.8, 'my'], [11.0, 'old'], [11.3, 'friend'],
    [12.0, 'Ive'], [12.2, 'come'], [12.5, 'to'], [12.6, 'talk'], [12.9, 'with'], [13.1, 'you'], [13.3, 'again'],
    [14.0, 'Because'], [14.3, 'a'], [14.4, 'vision'], [14.9, 'softly'], [15.4, 'creeping']]));
  near(r.times[0], 10.0, 0.001, 'line 1');
  near(r.times[1], 12.0, 0.001, 'line 2');
  near(r.times[2], 14.0, 0.001, 'line 3');
  assert.deepStrictEqual(Object.values(r.how), ['word', 'word', 'word']);
  assert.strictEqual(r.stats.matched, 3);
  assert.ok(r.stats.coverage > 0.9, `coverage ${r.stats.coverage}`);
});

test('latin: a misheard word does not move the line and lower-case / punctuation noise is ignored', () => {
  const lyrics = ['Walking through the neon rain', 'Every shadow knows my name'];
  const r = J.alignLyricTimes(lyrics, words([[3.0, 'walking'], [3.5, 'through'], [3.9, 'the'], [4.1, 'neon'], [4.5, 'RAIN,'],
    [5.2, 'every'], [5.5, 'shadow'], [5.9, 'knows'], [6.2, 'my'], [6.5, 'name.']]));
  near(r.times[0], 3.0, 0.001, 'line 1');
  near(r.times[1], 5.2, 0.001, 'line 2');
  assert.strictEqual(r.score[0], 1, 'a line the recogniser heard exactly scores 1');
});

test('latin: words the recogniser split into pieces still anchor the line', () => {
  // Whisper sometimes emits a long word as several sub-word pieces
  const r = J.alignLyricTimes(['Chasing a place that was never in this town'], words([[20.0, 'Chas'], [20.3, 'ing'], [20.5, 'a'], [20.7, 'place'], [21.0, 'that'], [21.2, 'was'], [21.4, 'never'], [21.9, 'in'], [22.0, 'this'], [22.3, 'town']]));
  near(r.times[0], 20.0, 0.001, 'line 1');
});

test('a dropped line is interpolated into the gap between the lines that did match', () => {
  const lyrics = ['first line here', 'a line the singer mumbles', 'third line here'];
  const r = J.alignLyricTimes(lyrics, words([[0.0, 'first'], [0.4, 'line'], [0.7, 'here'], [6.0, 'third'], [6.4, 'line'], [6.7, 'here']]));
  near(r.times[0], 0.0, 0.02, 'line 1');
  near(r.times[2], 6.0, 0.02, 'line 3');
  /* inside the gap, after the line above and before the line below, and far enough
     into it to leave room for the words it stands for */
  assert.ok(r.times[1] > r.times[0] + 1 && r.times[1] < r.times[2], `line 2 sits in the gap: ${r.times[1]}`);
  assert.strictEqual(r.how[1], 'interp');
  assert.ok(r.score[1] < 0.5, 'the dropped line is flagged for review');
});

test('a hallucinated stretch of transcript does not drag the lines after it', () => {
  const lyrics = ['alpha beta gamma', 'delta epsilon zeta', 'eta theta iota'];
  const r = J.alignLyricTimes(lyrics, words([[0.0, 'alpha'], [0.3, 'beta'], [0.6, 'gamma'],
    [2.0, 'thank'], [2.3, 'you'], [2.5, 'for'], [2.7, 'watching'], [3.0, 'please'], [3.2, 'subscribe'],
    [5.0, 'delta'], [5.3, 'epsilon'], [5.6, 'zeta'],
    [8.0, 'eta'], [8.3, 'theta'], [8.6, 'iota']]));
  near(r.times[0], 0.0, 0.001, 'line 1');
  near(r.times[1], 5.0, 0.001, 'line 2');
  near(r.times[2], 8.0, 0.001, 'line 3');
});

test('a repeated chorus lands on the right repetition', () => {
  const lyrics = ['hold on', 'let it go', 'hold on', 'let it go'];
  const r = J.alignLyricTimes(lyrics, words([[0.0, 'hold'], [0.4, 'on'], [5.0, 'let'], [5.4, 'it'], [5.6, 'go'],
    [20.0, 'hold'], [20.4, 'on'], [25.0, 'let'], [25.4, 'it'], [25.6, 'go']]));
  near(r.times[0], 0.0, 0.001, '1st hold on');
  near(r.times[1], 5.0, 0.001, '1st let it go');
  near(r.times[2], 20.0, 0.001, '2nd hold on');
  near(r.times[3], 25.0, 0.001, '2nd let it go');
});

test('a written interlude keeps its own length and the lines around it stay put', () => {
  const lyrics = ['[間奏 8]', 'after the break', 'and the last line'];
  const r = J.alignLyricTimes(lyrics, words([[0.0, 'after'], [0.4, 'the'], [0.7, 'break'], [3.0, 'and'], [3.3, 'the'], [3.5, 'last'], [3.9, 'line']]));
  near(r.times[1], 0.0, 0.05, 'line after the interlude');
  near(r.times[2], 3.0, 0.05, 'last line');
  assert.ok(r.times[0] <= r.times[1], 'the interlude sits before them');
  assert.strictEqual(r.how[0], 'interp');
});

test('a prelude is not swallowed: line one starts where the singing does', () => {
  const r = J.alignLyricTimes(['the song begins here'], words([[27.5, 'the'], [27.8, 'song'], [28.0, 'begins'], [28.4, 'here']]));
  near(r.times[0], 27.5, 0.001, 'line 1');
});

test('japanese: kana and kanji lines are timed from their first matched character', () => {
  const lyrics = ['夜明けの色を覚えてる', 'ほどけた声が鳴った'];
  const r = J.alignLyricTimes(lyrics, words([[5.0, '夜'], [5.3, '明'], [5.6, 'け'], [5.9, 'の'], [6.1, '色'], [6.4, 'を'], [6.7, '覚'], [7.0, 'え'], [7.3, 'て'], [7.5, 'る'],
    [9.0, 'ほ'], [9.3, 'ど'], [9.5, 'け'], [9.8, 'た'], [10.1, '声'], [10.4, 'が'], [10.7, '鳴'], [11.0, 'っ'], [11.2, 'た']]));
  near(r.times[0], 5.0, 0.001, 'line 1');
  near(r.times[1], 9.0, 0.001, 'line 2');
  assert.strictEqual(r.score[0], 1);
  assert.strictEqual(r.score[1], 1);
});

test('japanese: a kanji the recogniser got wrong still leaves the line anchored near its kana', () => {
  const lyrics = ['君の声が聞こえた', '遠い街の灯り'];
  // the recogniser heard 気み for 君, and 明かり for 灯り
  const r = J.alignLyricTimes(lyrics, words([[2.0, '気'], [2.2, 'み'], [2.5, 'の'], [2.7, '声'], [3.0, 'が'], [3.2, '聞'], [3.5, 'こ'], [3.7, 'え'], [4.0, 'た'],
    [6.0, '遠'], [6.3, 'い'], [6.5, '街'], [6.8, 'の'], [7.0, '明'], [7.3, 'か'], [7.5, 'り']]));
  /* When the recogniser gets the first character wrong the match starts one
     character late, which is half a second on this synthetic example — the known
     cost of timing from the first word both sides agree on. The line is still
     usable and, importantly, still recognisable as the right line. */
  near(r.times[0], 2.0, 0.6, 'line 1');
  near(r.times[1], 6.0, 0.001, 'line 2');
  assert.ok(r.score[0] >= 0.7, `a mostly-heard line still scores well: ${r.score[0]}`);
  assert.ok(r.score[1] >= 0.8, `the line the recogniser heard scores high: ${r.score[1]}`);
});

test('japanese: katakana, hiragana and voicing are treated as the same character', () => {
  // the written lyrics use katakana, the recogniser answered in hiragana with the voicing dropped
  const r = J.alignLyricTimes(['キラキラと光る'], words([[1.0, 'き'], [1.2, 'ら'], [1.4, 'き'], [1.6, 'ら'], [1.8, 'と'], [2.0, 'ひ'], [2.2, 'か'], [2.4, 'る']]));
  near(r.times[0], 1.0, 0.05, 'line 1');
  assert.ok(r.score[0] >= 0.8, `score ${r.score[0]}`);
});

test('chinese: characters are matched one by one and repeats stay in order', () => {
  const lyrics = ['我们都是这样的', '在夜里想念', '我们都是这样的'];
  const r = J.alignLyricTimes(lyrics, words([[0.0, '我'], [0.2, '们'], [0.4, '都'], [0.6, '是'], [0.8, '这'], [1.0, '样'], [1.2, '的'],
    [3.0, '在'], [3.2, '夜'], [3.4, '里'], [3.6, '想'], [3.8, '念'],
    [10.0, '我'], [10.2, '们'], [10.4, '都'], [10.6, '是'], [10.8, '这'], [11.0, '样'], [11.2, '的']]));
  near(r.times[0], 0.0, 0.001, 'first repeat');
  near(r.times[1], 3.0, 0.001, 'middle line');
  near(r.times[2], 10.0, 0.001, 'second repeat');
});

test('chinese: a lyric in one script matches a transcript in the other', () => {
  /* Simplified lyrics, Traditional transcript: 这/這, 结/結. A recogniser answers in
     whichever script it was trained on rather than the one the user typed, so the
     matcher accepts either spelling of a character (src/09a_han.js). */
  const r = J.alignLyricTimes(['这不是我要的结果'], words([[4.0, '這'], [4.2, '不'], [4.4, '是'], [4.6, '我'], [4.8, '要'], [5.0, '的'], [5.2, '結'], [5.4, '果']]));
  near(r.times[0], 4.0, 0.001, 'line 1');
  assert.strictEqual(r.score[0], 1, 'every character matched through the other script');
  /* and the other way round */
  const back = J.alignLyricTimes(['我們都是這樣的'], words([[1.0, '我'], [1.2, '们'], [1.4, '都'], [1.6, '是'], [1.8, '这'], [2.0, '样'], [2.2, '的']]));
  near(back.times[0], 1.0, 0.001, 'traditional lyrics against a simplified transcript');
  assert.strictEqual(back.score[0], 1);
});

test('a user time tag is a soft anchor: a far-away result is flagged, not moved', () => {
  /* a partial LRC pasted into the lyrics: the times in it are kept as a second
     opinion, and a line whose result disagrees with its tag gets flagged */
  const lyrics = '[00:30.00]the real line\nanother line';
  const r = J.alignLyricTimes(lyrics, words([[30.0, 'the'], [30.3, 'real'], [30.6, 'line'], [33.0, 'another'], [33.4, 'line']]));
  near(r.times[0], 30.0, 0.01, 'line 1 follows the transcript');
  assert.strictEqual(r.stats.anchored, 1, 'the tag is seen');
  assert.ok(r.score[0] >= 0.9, `the tag agrees, so nothing is flagged: ${r.score[0]}`);
  const bad = J.alignLyricTimes('[00:05.00]the real line', words([[30.0, 'the'], [30.3, 'real'], [30.6, 'line']]));
  assert.ok(bad.score[0] < 0.7, `a tag 25s away flags the line: ${bad.score[0]}`);
});

test('segment-only transcripts still time the lines', () => {
  const r = J.alignLyricTimes(['first line', 'second line'], segs([[0.0, 2.0, 'first line'], [4.0, 6.0, 'second line']]));
  near(r.times[0], 0.0, 0.3, 'line 1');
  near(r.times[1], 4.0, 0.3, 'line 2');
});

test('times are monotone and never negative, whatever the transcript does', () => {
  const lyrics = ['one two three', 'four five six', 'seven eight nine'];
  // a transcript that jumps backwards, as transformers.js has been known to do
  const r = J.alignLyricTimes(lyrics, words([[10.0, 'one'], [10.3, 'two'], [10.6, 'three'], [4.0, 'four'], [4.3, 'five'], [4.6, 'six'], [12.0, 'seven'], [12.3, 'eight'], [12.6, 'nine']]));
  for (let i = 1; i < lyrics.length; i++) assert.ok(r.times[i] >= r.times[i - 1], `line ${i + 1} is not before line ${i}`);
  assert.ok(r.times[0] >= 0);
});

test('no transcript / no lyrics returns a usable shape instead of throwing', () => {
  assert.strictEqual(J.alignLyricTimes('', words([[0, 'a']])).stats.reason, 'no-lyrics');
  assert.strictEqual(J.alignLyricTimes('hello there', { segments: [] }).stats.reason, 'no-words');
});

test('audio features pull a line start out of an instrumental and onto an attack', () => {
  const rate = 100, frames = 1200;                            // 12 seconds
  const silence = new Float32Array(frames), onset = new Float32Array(frames), power = new Float32Array(frames);
  for (let i = 0; i < 400; i++) power[i] = 0.02;              // 0..4s instrumental, below the singing floor
  for (let i = 400; i < frames; i++) power[i] = 0.6;          // the singing
  for (let i = 0; i < 400; i++) silence[i] = 1;
  onset[405] = 0.9;                                           // first attack at 4.05s
  const F = { rate, frames, power, onset, silence };
  const r = J.alignLyricTimes(['the singing starts now'], words([[1.0, 'the'], [1.3, 'singing'], [1.9, 'starts'], [2.3, 'now']]), { features: F });
  assert.ok(r.times[0] >= 4.0, `pushed out of the instrumental: ${r.times[0]}`);
  assert.ok(r.times[0] <= 4.1, `landed on the attack: ${r.times[0]}`);
  assert.strictEqual(r.stats.moved, 1);
});

test('the audio layer leaves a line alone when it is already on the singing', () => {
  const rate = 100, frames = 1200;
  const silence = new Float32Array(frames), onset = new Float32Array(frames), power = new Float32Array(frames);
  for (let i = 0; i < frames; i++) power[i] = 0.6;
  const F = { rate, frames, power, onset, silence };
  const r = J.alignLyricTimes(['a line in the clear'], words([[2.0, 'a'], [2.3, 'line'], [2.6, 'in'], [2.9, 'the'], [3.2, 'clear']]), { features: F });
  assert.strictEqual(r.times[0], 2);
  assert.strictEqual(r.stats.moved, 0);
});

test('language guess from the lyrics', () => {
  assert.strictEqual(J.guessLyricLang('夜明けの色を覚えてる'), 'ja');
  assert.strictEqual(J.guessLyricLang('I saw your shadow dancing in the dashboard light'), 'en');
  assert.strictEqual(J.guessLyricLang('我们都在夜里想念着对方'), 'zh-Hans');
  assert.strictEqual(J.guessLyricLang('我們都在夜裡想念著對方'), 'zh-Hant');
  assert.strictEqual(J.guessLyricLang('이 밤이 지나면'), 'ko');
  assert.strictEqual(J.asrLang('zh-Hant'), 'zh');
  assert.strictEqual(J.asrLang('ja'), 'ja');
});

/* ---------------- real song regression ----------------
   A real 4-minute English song: the word-level transcript that came out of a
   recogniser, the written lyrics, and the LRC that was made by hand from those
   word timings. The engine has to land on the same line starts without being
   told any of the times. */
test('real song: written lyrics + word-level transcript reproduce the hand-made LRC', () => {
  const asr = readFixture('i_wont_turn_back.asr.json');
  const lrc = readText('i_wont_turn_back.lrc');
  const truth = [];
  const rows = [];
  /* \r stripped: git checks the fixture out with the line endings of the machine
     running the test */
  for (const row of lrc.replace(/\r/g, '').split('\n')) {
    const m = row.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
    if (!m) continue;
    truth.push(+m[1] * 60 + parseFloat(m[2]));
    rows.push(m[3]);
  }
  assert.ok(truth.length > 60, `fixture has ${truth.length} timed lines`);
  const r = J.alignLyricTimes(rows.join('\n'), asr);
  const err = truth.map((t, i) => r.times[i] - t);
  const abs = err.map(Math.abs).sort((a, b) => a - b);
  const median = abs[abs.length >> 1], p90 = abs[Math.floor(abs.length * 0.9)];
  const within = abs.filter(v => v <= 0.3).length / abs.length;
  const max = abs[abs.length - 1];
  console.log(`    real song: ${abs.length} lines, median ${(median * 1000).toFixed(0)}ms, p90 ${(p90 * 1000).toFixed(0)}ms, max ${(max * 1000).toFixed(0)}ms, within 300ms ${(within * 100).toFixed(1)}%, coverage ${r.stats.coverage}`);
  assert.ok(median <= 0.25, `median error ${(median * 1000).toFixed(0)}ms`);
  assert.ok(p90 <= 0.9, `p90 error ${(p90 * 1000).toFixed(0)}ms`);
  assert.ok(within >= 0.85, `only ${(within * 100).toFixed(1)}% of lines within 300ms`);
});
