// Export everything the After Effects panel needs from the web engine into ae/data.json:
// style packs, fonts, moods and — for every expression group — the web order and the planning metadata
// (weights, mood tags, 追加分/和風 flags, fits tables, durations …). The AE panel re-implements the drawing;
// the decisions about WHAT to use come from this file so both planners stay in step.
const vm = require('vm'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const noop = () => {};
const ctx2d = new Proxy({}, { get: (t, k) => k === 'measureText' ? (() => ({ width: 100, actualBoundingBoxAscent: 80, actualBoundingBoxDescent: 10 }))
  : (k === 'getImageData' || k === 'createImageData') ? (() => ({ data: new Uint8ClampedArray(4) })) : (typeof k === 'string' && /^create/.test(k)) ? (() => ({ addColorStop: noop })) : noop, set: () => true });
const el = () => ({ getContext: () => ctx2d, style: {}, width: 0, height: 0, appendChild: noop, addEventListener: noop, setAttribute: noop, classList: { add: noop, remove: noop, toggle: noop } });
global.window = global;
global.document = { createElement: el, getElementById: () => null, querySelectorAll: () => [], head: { appendChild: noop }, fonts: { load: async () => [], ready: Promise.resolve() }, addEventListener: noop };
global.localStorage = { getItem: () => null, setItem: noop };
global.OffscreenCanvas = function () { return el(); };
global.Path2D = function () { return new Proxy({}, { get: () => noop }); };
global.DOMMatrix = function () { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; };
global.requestAnimationFrame = noop;
for (const f of fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.js') && f !== '12_ui.js').sort())
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'), { filename: f });
const JJ = global.J;

const DUR = []; for (let d = 0.2; d <= 4.001; d += 0.1) DUR.push(+d.toFixed(2));
const NS = [1, 2, 3, 4, 6, 8, 12, 16, 24];
const r3 = x => Math.round(x * 1000) / 1000;
function tab(fn) {   // inDur / outDur (dur[, n]) -> table on a fixed grid (AE interpolates)
  if (typeof fn !== 'function') return undefined;
  if (fn.length < 2) return { d: DUR.map(d => r3(fn(d, 8))) };
  return { n: NS, d: NS.map(n => DUR.map(d => r3(fn(d, n)))) };
}
const KEEP = ['w', 'tags', 'extra', 'wa', 'ae', 'portrait', 'emph', 'enterBias', 'busy', 'treat', 'cam', 'minDur', 'maxChars', 'safe', 'subtle', 'strong',
  'layer', 'edge', 'mid', 'glitchy', 'dur', 'amp', 'pre', 'builtin', 'special', 'scratch', 'pack', 'set'];
const meta = {}, orders = {}, names = {};
for (const g of JJ.GROUP_KEYS) {
  meta[g] = {}; names[g] = {}; orders[g] = JJ.order(g).slice();
  for (const k of orders[g]) {
    const d = JJ.registry(g)[k], m = { name: d.name };
    for (const f of KEEP) if (d[f] !== undefined && typeof d[f] !== 'function') m[f] = d[f];
    if (JJ.AE_MAP && JJ.AE_MAP[g] && JJ.AE_MAP[g][k]) m.ae = JJ.AE_MAP[g][k];      // closest original counterpart (fallback)
    if (g === 'layout') {
      let s = ''; for (let n = 1; n <= 60; n++) { let ok = false; try { ok = !!d.fits(n); } catch (e) {} s += ok ? '1' : '0'; }
      m.fits = s;
    }
    if (d.inDur) m.inDur = tab(d.inDur);
    if (d.outDur) m.outDur = tab(d.outDur);
    meta[g][k] = m; names[g][k] = d.name;
  }
}
const styles = {};
for (const k of JJ.STYLE_ORDER) styles[k] = JSON.parse(JSON.stringify(JJ.STYLES[k]));
const data = {
  version: 2, durGrid: DUR,
  styles, styleOrder: JJ.STYLE_ORDER.slice(), baseStyles: JJ.BASE_STYLES,
  orders, meta, names,
  // v1 keys (kept for older panel code)
  layoutOrder: orders.layout, enterOrder: orders.enter, holdOrder: orders.hold, exitOrder: orders.exit, decorOrder: orders.decor,
  // moods tied to a part set (ホラー) need that set's parts, which the panel does not build: leave them out
  moods: JJ.MOODS, moodOrder: Object.keys(JJ.MOODS).filter(k => !JJ.MOODS[k].set), ghostPairs: JJ.GHOST_PAIRS,
  fonts: Object.fromEntries(Object.entries(JJ.FONTS).map(([k, f]) => [k, { label: f.label, family: f.family.replace(/"/g, ''), weight: f.weight, kind: f.kind, extra: !!f.extra }])),
};
fs.writeFileSync(path.join(ROOT, 'ae', 'data.json'), JSON.stringify(data));
console.log('ok', data.styleOrder.length, 'styles;', JJ.GROUP_KEYS.map(g => g + ' ' + orders[g].length).join(', '), '; bytes', JSON.stringify(data).length);
