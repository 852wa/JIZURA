// LRC import: ID tags must stay metadata (never a lyric line, never a reason to drop every timestamp), and the
// file's own [offset:±ms] plus the ずれ field must move the timeline. Run: node dev/lrc_test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const J = {
  GROUP_KEYS: [], order: () => [],
  LAYOUT_ORDER: [], ENTER_ORDER: [], EXIT_ORDER: [], HOLD_ORDER: [], DECOR_ORDER: [],
  clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
};
vm.runInNewContext(fs.readFileSync('src/08_planner.js', 'utf8'), { J });
const native = value => JSON.parse(JSON.stringify(value));
const project = (lyrics, timing = {}) => ({ lyrics, timing: Object.assign({ offset: 0.4, tail: 0.9, lineTimes: {} }, timing) });
const parsedOf = raw => J.parseLyrics(raw);
const starts = p => native(J.computeTiming(p, parsedOf(p.lyrics), null).starts.map(x => +x.toFixed(3)));
const texts = raw => native(parsedOf(raw).lines.map(l => l.text));

// The header of a .lrc file as it is downloaded: every ID tag is metadata. An unhandled tag used to be sung on
// screen as a lyric line, and since that line carries no time it also switched every timestamp in the file off.
const real = '[ti:Song]\n[ar:Artist]\n[al:Album]\n[au:Author]\n[lr:Lyricist]\n[length:03:21]\n[re:LRC Maker]\n[ve:1.0]\n[00:12.00]first\n[00:16.50]second';
assert.deepEqual(texts(real), ['first', 'second']);
assert.deepEqual(native(parsedOf(real).meta), { ti: 'Song', ar: 'Artist', al: 'Album', au: 'Author', lr: 'Lyricist', length: '03:21', re: 'LRC Maker', ve: '1.0' });
assert.deepEqual(starts(project(real)), [12, 16.5]);
// An LRC that is only time tags and text, and the title / artist the header gives the plan, keep working.
assert.deepEqual(texts('[00:20.00]B\n[00:10.00][00:30.00]A'), ['A', 'B', 'A']);
assert.deepEqual(starts(project('[00:20.00]B\n[00:10.00][00:30.00]A')), [10, 20, 30]);

// [offset:±ms]: every time in the file moves, and per the LRC spec "+" means the lyrics appear sooner. A value
// that is not a signed number counts as absent (the tag must never take the timings down with it).
assert.deepEqual(starts(project('[offset:+500]\n[00:12.00]first\n[00:16.50]second')), [11.5, 16]);
assert.deepEqual(starts(project('[offset:-500]\n[00:12.00]first\n[00:16.50]second')), [12.5, 17]);
assert.deepEqual(starts(project('[offset:abc]\n[00:12.00]first')), [12]);
assert.deepEqual(native(parsedOf('[offset:+500]').meta), { offset: '+500' });

// 「LRCのずれ」(timing.lrcShift) shifts the timeline on top of the file's own offset, and only while the lyrics
// carry LRC times: without them the estimate must be exactly what it was before this option existed.
assert.deepEqual(starts(project('[00:12.00]first\n[00:16.50]second', { lrcShift: 0.5 })), [12.5, 17]);
assert.deepEqual(starts(project('[offset:+500]\n[00:12.00]first', { lrcShift: -0.3 })), [11.2]);
assert.deepEqual(starts(project('first\nsecond', { lrcShift: 5 })), starts(project('first\nsecond')));
assert.equal(J.computeTiming(project('[00:12.00]first'), parsedOf('[00:12.00]first'), null).lrcMode, true);
assert.equal(J.computeTiming(project('[00:12.00]first\nsecond'), parsedOf('[00:12.00]first\nsecond'), null).lrcMode, false);
// A tag that would push a line before the start of the video is held at 0.
assert.deepEqual(starts(project('[offset:+9000]\n[00:12.00]first\n[00:16.50]second')), [3, 7.5]);

// 間奏 keeps working: a colon after the interlude word is a spacing, not an ID tag. Only the parsing is asserted —
// where an untimed line ends up among timed ones is a separate question (the order of such lines is not this change).
const inter = parsedOf('[interlude: 8]').lines;
assert.equal(inter.length, 1);
assert.equal(inter[0].interlude, true);
assert.equal(inter[0].secs, 8);
assert.equal(inter[0].text, '');
assert.equal(parsedOf('[interlude 8]').lines[0].interlude, true);
assert.equal(parsedOf('[間奏 8]').lines[0].interlude, true);
const mixedInter = parsedOf('[間奏 8]\n[00:20.00]after').lines;
assert.equal(mixedInter.filter(l => l.interlude).length, 1);
assert.deepEqual(native(mixedInter.filter(l => !l.interlude).map(l => [l.text, l.lrc])), [['after', 20]]);
// Still a lyric line when it is not a tag at all (a Japanese bracket label, a numbered verse without a colon).
assert.deepEqual(texts('[サビ]\n[Verse 1]'), ['[サビ]', '[Verse 1]']);
assert.deepEqual(texts('# comment\n[00:01.00]line'), ['line']);

console.log('lrc_test: passed');
