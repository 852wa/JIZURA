// Planner regression: locking a line preserves its own effects, including late accents.
// Run: node dev/test_locked_line_effects.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const canvas = { getContext: () => ({ measureText: () => ({ width: 100 }) }) };
const context = vm.createContext({
  window: {}, document: { createElement: () => canvas, getElementById: () => null },
  console, Intl, setTimeout, clearTimeout,
});
for (const file of fs.readdirSync(root + 'src').filter(f => f.endsWith('.js') && f !== '12_ui.js').sort())
  vm.runInContext(fs.readFileSync(root + 'src/' + file, 'utf8'), context, { filename: file });
const J = context.window.J;
const plain = x => JSON.parse(JSON.stringify(x));
const effects = events => plain(events.map(e => ({
  t: +e.t.toFixed(3), type: e.type, amp: e.amp, dur: e.dur,
}))).sort((a, b) => a.t - b.t || a.type.localeCompare(b.type));

const p = J.defaultProject();
p.seed = 32;
p.lyrics = '歌いたい言葉がそこにある';
p.fx.density = 0.9;
p.fx.glitch = 1;
p.timing.lineTimes = { 0: 1 };
p.overrides = { 0: { cuts: 3 } };
const original = J.plan(p, null);
const last = original.cuts.at(-1);
assert(original.events.some(e => e.t >= last.end - 0.3 && e.t < last.end), 'fixture must exercise a late effect');
p.overrides[0] = { lock: true, lockedSeed: original.lines[0].seed, lockedCuts: J.lineSnapshot(original, 0) };
assert.deepEqual(effects(J.plan(p, null).events), effects(original.events), 'locking must preserve late effects');

// A pre-roll accent belongs to the following cut even when it plays during the previous line.
J.FXE.lockTestPre = { name: 'test pre-roll', pre: 5, dur: 4, edge: true, w: 100 };
J.FXE_ORDER.push('lockTestPre');
const q = J.defaultProject();
q.seed = 7;
q.lyrics = '[00:01]最初の言葉\n[00:04]次の言葉';
q.fx.glitch = 1;
q.overrides = { 0: { cuts: 1 }, 1: { cuts: 1 } };
for (const key of J.FXE_ORDER) q.enabled.fx[key] = key === 'lockTestPre';
const before = J.plan(q, null);
const pre = before.events.find(e => e.type === 'lockTestPre' && e.t < before.lines[1].start);
assert(pre, 'fixture must contain a following-line pre-roll');
assert.equal(J.lineSnapshot(before, 0).flatMap(s => s.events).filter(e => e.type === 'lockTestPre').length, 0,
  'locking the previous line must not capture the following pre-roll');
assert(J.lineSnapshot(before, 1).flatMap(s => s.events).some(e => e.dt < 0), 'following line keeps its pre-roll');
for (const line of before.lines) q.overrides[line.index] = {
  ...q.overrides[line.index], lock: true, lockedSeed: line.seed, lockedCuts: J.lineSnapshot(before, line.index),
};
assert.deepEqual(effects(J.plan(q, null).events), effects(before.events), 'locking adjacent lines must not duplicate or drop effects');

// Re-lock after serializing the project: effect ownership is rebuilt by the planner.
const roundTrip = plain(q);
const rebuilt = J.plan(roundTrip, null);
for (const line of rebuilt.lines) roundTrip.overrides[line.index].lockedCuts = J.lineSnapshot(rebuilt, line.index);
assert.deepEqual(effects(J.plan(roundTrip, null).events), effects(before.events));
console.log('locked line effects: late accents, pre-roll ownership, adjacent locks and project round-trip passed');
