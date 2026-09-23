// Per-part check of AE implementations in an ExtendScript-like (ES3) realm.
//   node dev/ae_check.js --jsx dev/www/ae_x.jsx --group layout --ids a,b,c | all | pack:layoutsC | missing
// For every id: several texts x aspect ratios through the panel's own planner with that part forced
// (layouts also use their own plan() for parameters). Reports build warnings, bad values / effect params,
// unknown matchNames and expression syntax errors. Exit code 1 when anything is wrong.
const fs = require('fs'), vm = require('vm'), path = require('path');
const AEOM = require('./aeom');
const args = {}; for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const JSX = args.jsx || path.join(__dirname, '..', 'JIZURA_AE.jsx');
const SRC = fs.readFileSync(JSX, 'utf8').replace(/^#target.*\n/, '')
  .replace(/jzUI\(thisObj\);\s*\}\)\(this\);\s*$/, 'thisObj.__jz = { jzMakePlan: jzMakePlan, jzBuild: jzBuild, log: function () { return JZLOG; }, JZ_DATA: JZ_DATA, JZ_REG: JZ_REG, jzOrder: jzOrder, jzPlanOf: jzPlanOf, JzRng: JzRng, jzDecorParams: jzDecorParams, jzMeta: jzMeta, fallbacks: function () { return JZ_FALLBACKS; } };\n})(this);');
try { require('acorn').parse(SRC, { ecmaVersion: 3 }); } catch (e) { console.log('ES3 SYNTAX ERROR', e.message, JSON.stringify(SRC.slice(Math.max(0, e.pos - 160), e.pos + 40))); process.exit(1); }
{ // every top-level function name must be unique across core + packs (a later definition would silently replace an earlier one)
  const seen = {}, dups = [];
  for (const m of SRC.matchAll(/^function ([A-Za-z0-9_$]+)\s*\(/gm)) { if (seen[m[1]]) dups.push(m[1]); seen[m[1]] = 1; }
  if (dups.length) { console.log('DUPLICATE FUNCTION NAMES (rename yours with your file prefix):', [...new Set(dups)].join(', ')); process.exit(1); }
}
const ES3_PRELUDE = `(function(){
  function del(o, list) { for (var i = 0; i < list.length; i++) delete o[list[i]]; }
  del(Array.prototype, ['forEach','map','filter','some','every','reduce','reduceRight','indexOf','lastIndexOf','find','findIndex','includes','fill','flat','flatMap','keys','values','entries','copyWithin']);
  del(Array, ['isArray','from','of']);
  del(Object, ['keys','create','defineProperty','defineProperties','getPrototypeOf','freeze','seal','assign','entries','values','getOwnPropertyNames','fromEntries']);
  del(String.prototype, ['trim','trimStart','trimEnd','trimLeft','trimRight','includes','startsWith','endsWith','repeat','padStart','padEnd','codePointAt','normalize']);
  del(Function.prototype, ['bind']); del(Date, ['now']); del(String, ['fromCodePoint']);
  del(Math, ['sign','trunc','hypot','log2','log10','cbrt']);
  del(Number, ['isFinite','isNaN','isInteger','parseFloat','parseInt']);
  this.JSON = undefined;
}).call(this);`;
function load() {
  const env = AEOM.makeEnv({ fonts: () => true });
  for (const k of ['JSON', 'Math', 'Date', 'String', 'Number', 'Array', 'Object', 'RegExp', 'Error', 'parseInt', 'parseFloat', 'isFinite', 'isNaN', 'encodeURIComponent', 'decodeURIComponent']) delete env.ctx[k];
  vm.createContext(env.ctx); vm.runInContext(ES3_PRELUDE, env.ctx); vm.runInContext(SRC, env.ctx, { filename: path.basename(JSX) });
  return { env, JZ: env.ctx.__jz };
}
const G = args.group;
const { JZ: J0 } = load();
const D = J0.JZ_DATA;
let ids = (args.ids || 'all');
if (ids === 'all') ids = Array.from(J0.jzOrder(G));
else if (ids === 'missing') ids = Array.from(D.orders[G]).filter(k => !J0.JZ_REG[G][k]);
else if (ids.startsWith('pack:')) ids = Array.from(D.orders[G]).filter(k => (D.meta[G][k] || {}).pack === ids.slice(5));
else ids = ids.split(',');
const TEXTS = ['夜', 'ほどけた声が鳴った', 'ねえ、まだ間に合うかな ほどけた声が遠くで鳴った', 'Hello world'];
const SIZES = [[1920, 1080], [1080, 1920], [1440, 1080]];
let bad = 0;
for (const id of ids) {
  if (!J0.JZ_REG[G][id]) { console.log('MISSING', G + '.' + id); bad++; continue; }
  const issues = new Set();
  let n = 0;
  for (const [W, H] of SIZES) for (const text of TEXTS) {
    const { env, JZ } = load();
    const two = G === 'trans';
    const o = { lyrics: two ? '夜明けの色を覚えてる\n' + text : text, title: '', artist: '', style: D.styleOrder[(n++) % D.styleOrder.length], seed: 3 + n,
      fx: { motion: 0.8, glitch: 0.7, chroma: 0.7, decor: 0.6, density: 0.2, texture: 0.6, bgSwitch: 0.4, onTwos: true, flash: true, hud: false },
      width: W, height: H, fps: 24, bpm: 0, starts: null, enabled: null, offset: 0.4, lineScale: 1, duration: null, extra: true, wa: true };
    let plan;
    try { plan = JZ.jzMakePlan(o); } catch (e) { issues.add('PLAN ' + e.message); continue; }
    const cuts = Array.from(plan.cuts).filter(c => c.layout !== 'title' && c.layout !== 'interlude');
    const c = cuts[cuts.length - 1];
    if (!c) { issues.add('no cut'); continue; }
    const rng = new JZ.JzRng(17 + n), st = plan.style;
    const cut = { text: c.text, n: [...String(c.text).replace(/\s/g, '')].length, W, H, dur: c.end - c.start };
    if (G === 'layout') { c.layout = id; c.params = JZ.jzPlanOf('layout', id, rng, st, cut); }
    else if (G === 'enter') { c.enter = id; c.inDur = Math.min(0.6, (c.end - c.start) * 0.4); }
    else if (G === 'exit') { c.exit = id; c.outDur = Math.min(0.55, (c.end - c.start) * 0.35); }
    else if (G === 'hold') c.hold = id;
    else if (G === 'decor') c.decor = [JZ.jzDecorParams(rng, id)];
    else if (G === 'treat') { c.treat = id; c.treatP = JZ.jzPlanOf('treat', id, rng, st); }
    else if (G === 'bg') { c.bg = id; c.bgP = JZ.jzPlanOf('bg', id, rng, st); }
    else if (G === 'cam') { c.cam = id; c.camP = JZ.jzPlanOf('cam', id, rng, st); }
    else if (G === 'fx') { const m = JZ.jzMeta('fx', id); plan.events.push({ t: c.start + 0.4, type: id, amp: m.amp || 1, dur: (m.dur || 4) / 24 }); }
    else if (G === 'trans') { if (cuts.length < 2 || Math.abs(cuts[cuts.length - 2].end - c.start) > 0.06) { issues.add('(test plan had no adjacent cuts)'); continue; } c.trans = id; c.transP = JZ.jzPlanOf('trans', id, rng, st); c.transDur = Math.min(0.6, (JZ.jzMeta('trans', id).dur || 0.35)); c.enter = 'cut'; cuts[cuts.length - 2].exit = 'cut'; }
    try { JZ.jzBuild(plan, {}); } catch (e) { issues.add('BUILD ' + e.message); }
    Array.from(JZ.log()).forEach(w => issues.add(w));
    env.stats.problems.forEach(p => issues.add(p));
    if (env.stats.invalidRefs) { issues.add('invalid references accessed (maybe swallowed by try/catch): ' + env.stats.invalidRefs + ' (may come from another part of the test plan)'); env.stats.invalidRefs = 0; }
    env.stats.unknown.forEach(u => issues.add('unknown matchName: ' + u));
    env.stats.exprErrors.forEach(e => issues.add('expression syntax: ' + e.split('\n').join(' | ')));
    if (JZ.fallbacks() > 0 && !['decor'].includes(G)) { /* other parts of the plan may fall back; not this part's problem */ }
  }
  // messages attributed to OTHER parts of the random test plan ("decor foo: …", "cut 3 bar: …") are not this part's problem
  for (const x of [...issues]) { const m = /^(?:cut \d+ |(?:decor|exit|enter|hold|treat|bg|cam|fx|trans) )([A-Za-z0-9_]+):/.exec(x); if (m && m[1] !== id) issues.delete(x); }
  if (issues.size) { bad++; console.log('!!', G + '.' + id); [...issues].slice(0, 8).forEach(x => console.log('    ', x)); }
  else console.log('ok', G + '.' + id);
}
console.log(ids.length, 'checked,', bad, 'with problems');
process.exit(bad ? 1 : 0);
