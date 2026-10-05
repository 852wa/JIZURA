#!/usr/bin/env node
/** Regression for #45: opening brackets must stay with the following text. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const window = {};
const J = {};
window.J = J;
const ctx = vm.createContext({
  window, J, Intl, console, Math, Array, String, Object, Number, Boolean, Map, Set, WeakMap, RegExp, JSON,
  Infinity, NaN, isFinite, parseInt, parseFloat, Uint8Array, Float32Array,
  performance: { now: () => Date.now() },
  document: { createElement: () => ({ style: {}, getContext: () => null, width: 0, height: 0 }), getElementById: () => null },
  requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
  Image: class { set src(v) {} }, Path2D: class {}, OffscreenCanvas: class { getContext() { return null; } },
  HTMLCanvasElement: class {}, AudioContext: class {},
  fetch: async () => ({ ok: true, text: async () => '', arrayBuffer: async () => new ArrayBuffer(0) }),
  URL: { createObjectURL: () => '', revokeObjectURL: () => {} }, Blob: class {}, Worker: class {},
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  location: { href: 'http://localhost/', search: '' }, navigator: { userAgent: 'node', language: 'ja' },
  setTimeout, clearTimeout, setInterval, clearInterval,
});
const root = path.join(__dirname, '..');
for (const f of fs.readdirSync(path.join(root, 'src')).filter((n) => n.endsWith('.js')).sort()) {
  try { vm.runInContext(fs.readFileSync(path.join(root, 'src', f), 'utf8'), ctx); } catch (_) {}
}
function fail(msg) { console.error('FAIL:', msg); process.exit(1); }
const hook = ctx.J.chunkText('「鉤括弧」');
if (JSON.stringify(hook) !== JSON.stringify(['「鉤括弧」'])) fail('「鉤括弧」 -> ' + JSON.stringify(hook));
const paren = ctx.J.chunkText('『漢字』と（英語）');
if (JSON.stringify(paren) !== JSON.stringify(['『漢字』と', '（英語）'])) fail('paren -> ' + JSON.stringify(paren));
for (const chunks of [hook, paren, ctx.J.chunkText('「かぎ括弧」')]) {
  if (chunks.some((c) => c.length && [...c].every((ch) => ctx.J.isOpenPunct(ch)))) fail('lone open in ' + JSON.stringify(chunks));
  if (chunks.some((c, i) => i < chunks.length - 1 && [...c].length && ctx.J.isOpenPunct([...c].at(-1)))) fail('trailing open in ' + JSON.stringify(chunks));
}
const split = ctx.J.splitLines('「鉤括弧」は便利ですよ本当に', 6);
if (split.split('\n').some((line) => line === '「' || (line.length && [...line].every((c) => ctx.J.isOpenPunct(c))))) fail('split ' + JSON.stringify(split));
console.log('ok');
