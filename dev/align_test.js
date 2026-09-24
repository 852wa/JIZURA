/* Tests for src/10b_align.js (lyric sync) against a real song: Whisper output + the lyrics as written.
   usage: node dev/align_test.js        (no dependencies; exit 1 on failure) */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
globalThis.window = globalThis;
// the util core, J.parseLyrics (self-contained, cut out of the planner) and the aligner
const planner = read('src/08_planner.js');
const parse = planner.slice(planner.indexOf('J.parseLyrics = '), planner.indexOf('/* ---------------- chunking'));
vm.runInThisContext(read('src/01_util.js') + '\n' + parse + '\n' + read('src/10b_align.js'));

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS  ' : 'FAIL  ') + msg); if (!cond) fails++; };
const median = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const FX = 'dev/fixtures/warattakara/';
const whisper = J.align.readWhisperJSON(read(FX + 'whisper.json'));

/* 1. the lyrics as actually sung (sung.lrc = onsets checked word by word) -> times within 0.3 s */
const sung = J.parseLyrics(read(FX + 'sung.lrc')).lines;
const rA = J.align.alignLyrics(sung.map(l => l.text), whisper, { lead: 0 });
const errA = sung.map((l, i) => Math.abs(rA.times[i] - l.lrc));
ok(median(errA) <= 0.3, `sung lyrics: median error ${median(errA).toFixed(2)} s (≤ 0.30) over ${sung.length} lines`);
ok(Math.max(...errA) <= 1.0, `sung lyrics: max error ${Math.max(...errA).toFixed(2)} s (≤ 1.00)`);
ok(rA.lines.filter(l => l.conf === 'missing').length === 0, 'sung lyrics: no line reported as missing');

/* 2. the lyrics as written (three lines the recording never sings, two passages it repeats) */
const written = J.parseLyrics(read(FX + 'lyrics.txt')).lines.map(l => l.text);
const rB = J.align.alignLyrics(written, whisper, { lead: 0 });
const missing = written.filter((_, i) => rB.lines[i].conf === 'missing');
const unsung = ['明日の私なら　笑えるかもしれない', '布団の真ん中に　壁を作っても', '朝には少し　近くに来て'];
ok(unsung.every(s => missing.includes(s)), `written lyrics: the 3 unsung lines are reported missing (got: ${missing.join(' / ') || 'none'})`);
ok(missing.length <= 5, `written lyrics: at most 5 lines reported missing (got ${missing.length})`);
ok(rB.times.every((t, i) => i === 0 || t > rB.times[i - 1]), 'written lyrics: start times strictly increase');
// every written line that is sung as written starts where it is sung (first unused sung line with the same text, in order)
const errB = []; let from = 0;
written.forEach((s, i) => {
  if (rB.lines[i].conf === 'missing') return;
  const k = sung.findIndex((l, j) => j >= from && J.align.normalize(l.text) === J.align.normalize(s));
  if (k < 0 || sung[k].lrc - (sung[from - 1] ? sung[from - 1].lrc : 0) > 40) return;
  errB.push(Math.abs(rB.times[i] - sung[k].lrc)); from = k + 1;
});
ok(errB.length >= 45 && median(errB) <= 0.3, `written lyrics: median error ${median(errB).toFixed(2)} s over ${errB.length} lines sung as written`);
ok(rB.unmatched.some(u => u.start > 186 && u.start < 192), 'written lyrics: the repeated ごめんね passage (≈3:07) is listed as heard but not in the lyrics');

/* 3. the instrumental break 0:06–0:21 gets no line */
ok(!rB.times.some(t => t > 6.5 && t < 21), 'no line starts inside the 0:06–0:21 instrumental');

/* 4. whisper.cpp `whisper-server -dtw large.v3.turbo -nfa` (verbose_json): its DTW times are used, and are good
      enough to place lines, though looser than mlx-whisper's (it runs ~0.4 s late, more on held first notes) */
const cppRaw = JSON.parse(read(FX + 'whisper_cpp.json'));
const cpp0 = J.align.readWhisperJSON(cppRaw);
const w0 = cppRaw.segments[1].words[0];
ok(Math.abs(cpp0.segments[1].words[0].start - w0.t_dtw / 100) < 1e-9 && Math.abs(w0.start - w0.t_dtw / 100) > 10,
  `whisper.cpp: word time taken from t_dtw (${(w0.t_dtw / 100).toFixed(2)} s), not the stretched start (${w0.start} s)`);
const rC = J.align.alignLyrics(sung.map(l => l.text), cpp0, { lead: 0 });
const errC = sung.map((l, i) => Math.abs(rC.times[i] - l.lrc));
ok(median(errC) <= 0.6 && errC.filter(e => e > 1).length <= 10, `whisper.cpp: median error ${median(errC).toFixed(2)} s (≤ 0.60), ${errC.filter(e => e > 1).length} lines over 1 s (≤ 10)`);
const rC2 = J.align.alignLyrics(written, cpp0, { lead: 0 });
ok(unsung.every(s => rC2.lines[written.indexOf(s)].conf === 'missing'), 'whisper.cpp: the 3 unsung lines are reported missing');

/* 5. input formats and filters */
const hall = J.align.filterSegments(J.align.readWhisperJSON({ segments: [
  { start: 10, end: 12, text: 'ご視聴ありがとうございました', words: [{ word: 'ご視聴ありがとうございました', start: 10, end: 12 }] },
  { start: 20, end: 24, text: ' chee-e-e-e-e-e-e-e-e', words: [{ word: 'chee-e-e-e-e-e-e-e-e', start: 20, end: 24 }] },
  { start: 30, end: 31, text: '夜の風', words: [{ word: '夜', start: 30, end: 30.4 }, { word: 'の風', start: 30.4, end: 31 }] },
] }).segments);
ok(hall.length === 1 && hall[0].start === 30, 'filter: hallucinated thanks and looping output dropped, singing kept');
const tjs = J.align.readWhisperJSON({ text: '夜の風', chunks: [{ text: '夜', timestamp: [1, 1.3] }, { text: 'の風', timestamp: [1.3, 2] }] });
ok(tjs.segments[0].words.length === 2 && tjs.segments[0].words[1].start === 1.3, 'reads transformers.js chunks');
const cpp = J.align.readWhisperJSON({ transcription: [{ offsets: { from: 1000, to: 2000 }, text: '夜の風', tokens: [
  { text: '[_BEG_]', offsets: { from: 1000, to: 1000 } }, { text: '夜', offsets: { from: 1000, to: 1300 } }, { text: 'の風', offsets: { from: 1300, to: 2000 } }] }] });
ok(cpp.segments[0].words.length === 2 && cpp.segments[0].words[0].start === 1, 'reads whisper.cpp -ojf tokens');
ok(J.align.normalize('「十五年」15年 カッコ！*羊*/見て') === '十五年十五年かっこ羊見て', 'normalize: numerals, katakana, markup');
ok(J.align.toLRC(['a', 'b'], [1.5, 65.25]) === '[00:01.50]a\n[01:05.25]b\n', 'toLRC formats mm:ss.xx');

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
