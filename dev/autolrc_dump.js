/* Dump the engine's result for a fixed set of cases, so the Python reference
   implementation can be diffed against it.  usage: node dev/autolrc_dump.js out.json */
'use strict';
const fs = require('fs');
const path = require('path');
const { load, readFixture, readText } = require('./jizura_src.js');

const J = load();
const words = (list) => ({ segments: list.map(([t, w], i) => ({ text: w, start: t, end: t + 0.2, id: i, words: [{ word: w, start: t, end: t + 0.2 }] })) });
const segs = (list) => ({ segments: list.map(([s, e, text]) => ({ text, start: s, end: e })) });

const cases = [];
const add = (name, lyrics, asr, opts) => cases.push({ name, lyrics, asr, opts: opts || null });

add('latin-basic', ['Hello darkness my old friend', "I've come to talk with you again", 'Because a vision softly creeping'],
  words([[10.0, 'Hello'], [10.4, 'darkness'], [10.8, 'my'], [11.0, 'old'], [11.3, 'friend'], [12.0, 'Ive'],
    [12.2, 'come'], [12.5, 'to'], [12.6, 'talk'], [12.9, 'with'], [13.1, 'you'], [13.3, 'again'],
    [14.0, 'Because'], [14.3, 'a'], [14.4, 'vision'], [14.9, 'softly'], [15.4, 'creeping']]));
add('latin-misheard', ['Walking through the neon rain', 'Every shadow knows my name'],
  words([[3.0, 'walking'], [3.5, 'through'], [3.9, 'the'], [4.1, 'neon'], [4.5, 'RAIN,'], [5.2, 'every'],
    [5.5, 'shadow'], [5.9, 'knows'], [6.2, 'my'], [6.5, 'name.']]));
add('latin-split-word', ['Chasing a place that was never in this town'],
  words([[20.0, 'Chas'], [20.3, 'ing'], [20.5, 'a'], [20.7, 'place'], [21.0, 'that'], [21.2, 'was'], [21.4, 'never'], [21.9, 'in'], [22.0, 'this'], [22.3, 'town']]));
add('dropped-line', ['first line here', 'a line the singer mumbles', 'third line here'],
  words([[0.0, 'first'], [0.4, 'line'], [0.7, 'here'], [6.0, 'third'], [6.4, 'line'], [6.7, 'here']]));
add('hallucination', ['alpha beta gamma', 'delta epsilon zeta', 'eta theta iota'],
  words([[0.0, 'alpha'], [0.3, 'beta'], [0.6, 'gamma'], [2.0, 'thank'], [2.3, 'you'], [2.5, 'for'], [2.7, 'watching'],
    [3.0, 'please'], [3.2, 'subscribe'], [5.0, 'delta'], [5.3, 'epsilon'], [5.6, 'zeta'], [8.0, 'eta'], [8.3, 'theta'], [8.6, 'iota']]));
add('repeated-chorus', ['hold on', 'let it go', 'hold on', 'let it go'],
  words([[0.0, 'hold'], [0.4, 'on'], [5.0, 'let'], [5.4, 'it'], [5.6, 'go'], [20.0, 'hold'], [20.4, 'on'], [25.0, 'let'], [25.4, 'it'], [25.6, 'go']]));
add('interlude', ['[間奏 8]', 'after the break', 'and the last line'],
  words([[0.0, 'after'], [0.4, 'the'], [0.7, 'break'], [3.0, 'and'], [3.3, 'the'], [3.5, 'last'], [3.9, 'line']]));
add('prelude', ['the song begins here'], words([[27.5, 'the'], [27.8, 'song'], [28.0, 'begins'], [28.4, 'here']]));
add('ja-kana-kanji', ['夜明けの色を覚えてる', 'ほどけた声が鳴った'],
  words([[5.0, '夜'], [5.3, '明'], [5.6, 'け'], [5.9, 'の'], [6.1, '色'], [6.4, 'を'], [6.7, '覚'], [7.0, 'え'], [7.3, 'て'], [7.5, 'る'],
    [9.0, 'ほ'], [9.3, 'ど'], [9.5, 'け'], [9.8, 'た'], [10.1, '声'], [10.4, 'が'], [10.7, '鳴'], [11.0, 'っ'], [11.2, 'た']]));
add('ja-wrong-kanji', ['君の声が聞こえた', '遠い街の灯り'],
  words([[2.0, '気'], [2.2, 'み'], [2.5, 'の'], [2.7, '声'], [3.0, 'が'], [3.2, '聞'], [3.5, 'こ'], [3.7, 'え'], [4.0, 'た'],
    [6.0, '遠'], [6.3, 'い'], [6.5, '街'], [6.8, 'の'], [7.0, '明'], [7.3, 'か'], [7.5, 'り']]));
add('ja-katakana', ['キラキラと光る'],
  words([[1.0, 'き'], [1.2, 'ら'], [1.4, 'き'], [1.6, 'ら'], [1.8, 'と'], [2.0, 'ひ'], [2.2, 'か'], [2.4, 'る']]));
add('zh-repeat', ['我们都是这样的', '在夜里想念', '我们都是这样的'],
  words([[0.0, '我'], [0.2, '们'], [0.4, '都'], [0.6, '是'], [0.8, '这'], [1.0, '样'], [1.2, '的'],
    [3.0, '在'], [3.2, '夜'], [3.4, '里'], [3.6, '想'], [3.8, '念'],
    [10.0, '我'], [10.2, '们'], [10.4, '都'], [10.6, '是'], [10.8, '这'], [11.0, '样'], [11.2, '的']]));
add('zh-mixed-script', ['这不是我要的结果'],
  words([[4.0, '這'], [4.2, '不'], [4.4, '是'], [4.6, '我'], [4.8, '要'], [5.0, '的'], [5.2, '結'], [5.4, '果']]));
add('tag-agrees', ['[00:30.00]the real line', 'another line'],
  words([[30.0, 'the'], [30.3, 'real'], [30.6, 'line'], [33.0, 'another'], [33.4, 'line']]));
add('tag-disagrees', ['[00:05.00]the real line'], words([[30.0, 'the'], [30.3, 'real'], [30.6, 'line']]));
add('segment-only', ['first line', 'second line'], segs([[0.0, 2.0, 'first line'], [4.0, 6.0, 'second line']]));
add('backwards-transcript', ['one two three', 'four five six', 'seven eight nine'],
  words([[10.0, 'one'], [10.3, 'two'], [10.6, 'three'], [4.0, 'four'], [4.3, 'five'], [4.6, 'six'], [12.0, 'seven'], [12.3, 'eight'], [12.6, 'nine']]));

/* the real song: written lyrics + the word-level transcript that came out of a recogniser */
const asr = readFixture('i_wont_turn_back.asr.json');
const lrc = readText('i_wont_turn_back.lrc');
const rows = [];
for (const row of lrc.split('\n')) {
  const m = row.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
  if (m) rows.push(m[3]);
}
add('real-song', rows.join('\n'), asr);

/* the audio layer, on a synthetic clip: the engine's own feature extractor, so the
   silence floor is the real one and not a hand-made array */
test_features();

function test_features() {
  const sr = 16000, dur = 12;
  const mono = new Float32Array(sr * dur);
  for (let i = 0; i < sr * dur; i++) {
    const t = i / sr;
    // 0..4s: a quiet instrumental (a low tone); 4s on: a loud "voice" with attacks
    mono[i] = t < 4 ? 0.02 * Math.sin(2 * Math.PI * 110 * t) : 0.5 * Math.sin(2 * Math.PI * 220 * (t - 4));
  }
  const F = J.audioFeatures(mono, sr);
  if (F) {
    const sil = Array.from(F.silence);
    const firstVoice = sil.indexOf(0);
    cases.push({ name: 'features-synthetic', mono: true, sr, frames: F.frames, firstVoice, silentFrames: sil.filter(v => v === 1).length });
  } else cases.push({ name: 'features-synthetic', mono: true, error: 'null' });
}

const out = cases.map(c => {
  const r = J.alignLyricTimes(c.lyrics, c.asr, c.opts);
  return { name: c.name, times: Object.values(r.times), how: Object.values(r.how), score: Object.values(r.score), stats: r.stats };
});
const dest = process.argv[2] || path.join(__dirname, 'www', 'autolrc_js.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 1));
fs.writeFileSync(path.join(path.dirname(dest), 'autolrc_cases.json'), JSON.stringify(cases, null, 1));
console.log('wrote', dest, out.length, 'cases');
for (const o of out) if (o.name === 'real-song') console.log('  real-song stats', JSON.stringify(o.stats));
