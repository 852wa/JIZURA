// Build JIZURA_AE.jsx comps on the emulated AE object model (dev/aeom.js) and report problems.
//   node dev/ae_test.js [plan_ae.json | folder ...]
// Checks: every style x several seeds through the panel's own planner (with and without 追加分 / 和風),
// and any JSON plans exported by the browser app.
const fs = require('fs'), vm = require('vm'), path = require('path');
const AEOM = require('./aeom');
const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'JIZURA_AE.jsx'), 'utf8').replace(/^#target.*\n/, '')
  .replace(/jzUI\(thisObj\);\s*\}\)\(this\);\s*$/, 'thisObj.__jz = { jzMakePlan: jzMakePlan, jzBuild: jzBuild, log: function () { return JZLOG; }, JZ_DATA: JZ_DATA, JZ_REG: JZ_REG, jzOrder: jzOrder, jzChunk: jzChunk, jzMoodEnabled: jzMoodEnabled, fallbacks: function () { return JZ_FALLBACKS; } };\n})(this);');
const total = { builds: 0, comps: 0, layers: 0, exprs: 0, animators: 0, effects: {}, unknown: new Set(), exprErrors: [], problems: [], warnings: [] };
// ExtendScript is ES3: run the panel in a realm without ES5+ built-ins so accidental use fails here, not in AE
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
  vm.createContext(env.ctx);
  vm.runInContext(ES3_PRELUDE, env.ctx);
  vm.runInContext(SRC, env.ctx, { filename: 'JIZURA_AE.jsx' });
  return { env, JZ: env.ctx.__jz };
}
try { require('acorn').parse(SRC, { ecmaVersion: 3 }); } catch (e) { console.log('ES3 SYNTAX ERROR', e.message, JSON.stringify(SRC.slice(e.pos - 100, e.pos + 40))); process.exit(1); }
function account(env, label, JZ) {
  const s = env.stats;
  total.builds++; total.comps += s.comps; total.layers += s.layers; total.exprs += s.exprs; total.animators += s.animators;
  for (const [k, v] of Object.entries(s.effects)) total.effects[k] = (total.effects[k] || 0) + v;
  s.unknown.forEach(u => total.unknown.add(u));
  s.exprErrors.forEach(e => total.exprErrors.push(label + ': ' + e));
  s.problems.forEach(p => total.problems.push(label + ': ' + p));
  if (s.invalidRefs) total.problems.push(label + ': ' + s.invalidRefs + ' access(es) through invalid references (some swallowed by try/catch)');
  { // no hidden layers may be left over, except track mattes (After Effects keeps a matte's own video off)
    let hid = 0;
    for (const c of env.comps) c._layers.forEach((L, i) => { if (L.enabled) return; const below = c._layers[i + 1]; if (below && below.trackMatteType && below.trackMatteType !== 'none') return; hid++; });
    if (hid) total.problems.push(label + ': ' + hid + ' hidden layer(s) left in the project');
  }
  Array.from(JZ.log()).forEach(w => total.warnings.push(label + ": " + w));
}
const { JZ: J0 } = load();
const D = J0.JZ_DATA;
console.log('registered', JSON.stringify(Object.fromEntries(Object.keys(J0.JZ_REG).map(g => [g, J0.jzOrder(g).length]))));
const lyrics = '夜明けの色を/覚えてる\nほどけた声が遠くで鳴った\nねえ、まだ間に合うかな\n*透明*なままじゃ終われない!\n\n朝焼けのまま|asayake\nきっと届くよ\nGood night, またね';
const used = {};
for (const style of D.styleOrder) {
  for (const [seed, extra, wa] of [[1, false, true], [7, true, true], [42, true, false]]) {
    const { env, JZ } = load();
    const o = { lyrics, title: 'テスト', artist: 'me', style, seed, fx: { motion: 0.8, glitch: 0.7, chroma: 0.7, decor: 0.8, density: 0.6, texture: 0.6, bgSwitch: 0.5, onTwos: true, flash: true, hud: true },
      width: 1920, height: 1080, fps: 24, bpm: 0, starts: null, enabled: JZ.jzMoodEnabled(null, seed), offset: 0.4, lineScale: 1, duration: null, extra, wa };
    let plan;
    try { plan = JZ.jzMakePlan(o); } catch (e) { total.warnings.push(`${style}/${seed}: PLAN ${e.message}`); continue; }
    plan.hud = true;
    for (const c of Array.from(plan.cuts)) for (const g of ['layout', 'enter', 'exit', 'hold', 'treat', 'bg', 'cam', 'trans']) if (c[g]) { used[g] = used[g] || {}; used[g][c[g]] = 1; }
    try { JZ.jzBuild(plan, {}); } catch (e) { total.warnings.push(`${style}/${seed}: BUILD ${e.message}`); }
    account(env, `${style}/${seed}${extra ? '+' : ''}${wa ? '' : '-wa'}`, JZ);
  }
}
// part sets: ホラー mood with the horror switch on, and the typo / kinetic sets through the panel's own planner
const setUse = {};
for (const [mood, seed, sw] of [['horror', 3, { horror: true }], ['horror', 11, { horror: true, extra: true }], ['pop', 5, { horror: true }], ['graphic', 9, {}], ['emotional', 13, { typo: false }]]) {
  const { env, JZ } = load();
  const style = mood === 'horror' ? 'hrRuin' : 'noir';
  const o = Object.assign({ lyrics, title: 'テスト', artist: 'me', style, seed, fx: { motion: 0.8, glitch: 0.6, chroma: 0.6, decor: 0.8, density: 0.6, texture: 0.6, bgSwitch: 0.5, onTwos: true, flash: true, hud: false },
    width: 1920, height: 1080, fps: 24, bpm: 0, starts: null, offset: 0.4, lineScale: 1, duration: null, wa: true }, sw);
  o.enabled = JZ.jzMoodEnabled(mood, seed, o);
  let plan;
  try { plan = JZ.jzMakePlan(o); } catch (e) { total.warnings.push(`set ${mood}/${seed}: PLAN ${e.message}`); continue; }
  for (const c of Array.from(plan.cuts)) for (const g of ['layout', 'enter', 'exit', 'hold', 'treat', 'bg', 'cam', 'trans']) {
    const m = c[g] && D.meta[g] && D.meta[g][c[g]];
    if (m && m.set) { const k = mood + ':' + m.set; setUse[k] = (setUse[k] || 0) + 1; if (m.set === 'horror' && mood !== 'horror') total.problems.push(`horror part ${c[g]} outside the horror mood`); if (m.set === 'typo' && sw.typo === false) total.problems.push(`typo part ${c[g]} with the switch off`); }
  }
  try { JZ.jzBuild(plan, {}); } catch (e) { total.warnings.push(`set ${mood}/${seed}: BUILD ${e.message}`); }
  account(env, `set ${mood}/${seed}`, JZ);
}
console.log('part sets used', JSON.stringify(setUse));
// JSON plans from the browser app
const P = path;
const jsons = process.argv.slice(2).flatMap(p => fs.existsSync(p) && fs.statSync(p).isDirectory() ? fs.readdirSync(p).filter(f => f.endsWith('.json')).map(f => P.join(p, f)) : [p]).filter(p => fs.existsSync(p));
let fallbacks = 0;
for (const jp of jsons) {
  const { env, JZ } = load();
  const plan = JSON.parse(fs.readFileSync(jp, 'utf8'));
  try { JZ.jzBuild(plan, {}); } catch (e) { total.warnings.push(P.basename(jp) + ': BUILD ' + e.message); }
  fallbacks += JZ.fallbacks();
  account(env, P.basename(jp), JZ);
}
console.log('builds', total.builds, 'comps', total.comps, 'layers', total.layers, 'animators', total.animators, 'expressions', total.exprs, jsons.length ? '| json plans ' + jsons.length + ' (fallbacks ' + fallbacks + ')' : '');
console.log('effects', JSON.stringify(total.effects));
console.log('used', JSON.stringify(Object.fromEntries(Object.entries(used).map(([g, o]) => [g, Object.keys(o).length]))));
console.log('unknown matchNames', [...total.unknown]);
console.log('expr syntax errors', total.exprErrors.length); total.exprErrors.slice(0, 5).forEach(e => console.log('  ', e));
console.log('problems', total.problems.length); [...new Set(total.problems.map(w => w.replace(/^[^:]+: /, '')))].slice(0, 12).forEach(w => console.log('  ', w));
console.log('warnings', total.warnings.length); [...new Set(total.warnings.map(w => w.replace(/^[^:]+: /, '')))].slice(0, 20).forEach(w => console.log('  ', w));
