// Focused planner tests without browser dependencies. Run: node dev/timing_test.js
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
const project = (lyrics, lineTimes = {}) => ({ lyrics, timing: { offset: 0.4, tail: 0.9, lineTimes } });
const starts = p => native(J.computeTiming(p, J.parseLyrics(p.lyrics), null).starts);

// A complete LRC is still ordered by time, including repeated tags on one row.
const complete = J.parseLyrics('[00:20.00]B\n[00:10.00][00:30.00]A');
assert.deepEqual(native(complete.lines.map(l => [l.text, l.lrc])), [['A', 10], ['B', 20], ['A', 30]]);
assert.deepEqual(starts(project('[00:20.00]B\n[00:10.00][00:30.00]A')), [10, 20, 30]);

const mixed = project('[00:10.00]first\n[interlude 8]\n[00:20.00]second');
assert.deepEqual(native(J.parseLyrics(mixed.lyrics).lines.map(l => l.src)), [0, 1, 2]);
assert.deepEqual(starts(mixed), [10, 11.65, 20]);
const crowded = project('[00:10.00]A\none\ntwo\n[00:11.00]B');
const crowdedTimes = J.computeTiming(crowded, J.parseLyrics(crowded.lyrics), null);
assert.deepEqual(native(crowdedTimes.starts.map(x => +x.toFixed(3))), [10, 10.333, 10.667, 11]);
assert.deepEqual(native(crowdedTimes.ends.slice(0, 3).map(x => +x.toFixed(3))), [10.333, 10.667, 11]);
assert.deepEqual(starts(project('one\ntwo\n[00:00.10]A')).map(x => +x.toFixed(3)), [0, 0.05, 0.1]);
assert.deepEqual(starts(project('one\ntwo\n[00:00.40]A')).map(x => +x.toFixed(3)), [0, 0.2, 0.4]);
const atZero = J.parseLyrics('one\ntwo\n[00:00.00]A');
assert.equal(atZero.sourceOrder, false);
assert.deepEqual(native(atZero.lines.map(l => l.src)), [2, 0, 1]);
assert.deepEqual(starts(project('[interlude 15]\n[00:15.55]first')), [0.4, 15.55]);
assert.deepEqual(starts(project('[00:10.00]first\n[interlude 8]\n[00:11.00]second')), [10, 10.65, 11]);
assert.deepEqual(starts(project('[00:10.00]first\n[interlude 8]\n[00:20.00]second', { 2: 21 })), [10, 11.65, 21]);

const backwards = J.parseLyrics('[00:20.00]A\nplain\n[00:10.00]B');
assert.equal(backwards.sourceOrder, false);
assert.deepEqual(native(backwards.lines.map(l => l.src)), [2, 0, 1]);
assert.deepEqual(starts(project('[00:20.00]A\nplain\n[00:10.00]B')), [10, 20, 21.3]);
const repeatedBackwards = J.parseLyrics('[00:20.00]A\nplain\n[00:10.00][00:30.00]B');
assert.deepEqual(native(repeatedBackwards.lines.map(l => [l.src, l.lrc])), [[2, 10], [0, 20], [2, 30], [1, null]]);
const oldBackwards = project('[00:20.00]A\nplain\n[00:10.00]B', { 0: 10, 2: 21 });
oldBackwards.overrides = { 1: { layout: 'center' } };
J.migrateMixedLineOrder(oldBackwards);
assert.deepEqual(native(oldBackwards.timing.lineTimes), { 0: 10, 2: 21 });
assert.deepEqual(native(oldBackwards.overrides), { 1: { layout: 'center' } });

// Legacy indices were assigned after all timed rows had been sorted first.
const legacy = project('[interlude 15]\n[00:15.00]A\n[00:20.00]B\n[interlude 8]\n[00:30.00]C', { 0: 15.5, 3: 0 });
legacy.overrides = { 2: { layout: 'center' }, 4: { layout: 'huge' } };
legacy.exportRange = { from: 0, to: 2 };
J.migrateMixedLineOrder(legacy);
assert.deepEqual(native(legacy.timing.lineTimes), { 1: 15.5, 0: 0 });
assert.deepEqual(native(legacy.overrides), { 4: { layout: 'center' }, 3: { layout: 'huge' } });
assert.deepEqual(native(legacy.exportRange), { from: 1, to: 4 });
assert.equal(legacy.timing.lineOrder, 'source');
const migrated = JSON.stringify(legacy);
J.migrateMixedLineOrder(legacy);
assert.equal(JSON.stringify(legacy), migrated);
assert.deepEqual(starts(legacy).slice(0, 3), [0, 15.5, 20]);

console.log('timing_test: passed');
