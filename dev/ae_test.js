const fs = require('fs'), vm = require('vm');
const { makeContext, stats } = require('./ae_mock');
let src = fs.readFileSync(require('path').join(__dirname, '..', 'JIZURA_AE.jsx'), 'utf8').replace(/^#target.*\n/, '');
src = src.replace('jzUI(thisObj);\n})(this);', 'thisObj.__jz = { jzMakePlan: jzMakePlan, jzBuild: jzBuild, log: function(){ return JZLOG; }, JZ_DATA: JZ_DATA, JZ_LAYOUTS: JZ_LAYOUTS, jzChunk: jzChunk };\n})(this);');
const ctx = makeContext(); vm.createContext(ctx);
vm.runInContext(src, ctx, { filename: 'JIZURA_AE.jsx' });
const JZ = ctx.__jz;
const D = JZ.JZ_DATA;
const lyrics = '夜明けの色を/覚えてる\nほどけた声が遠くで鳴った\nねえ、まだ間に合うかな\n*透明*なままじゃ終われない!\n\n朝焼けのまま|asayake\nきっと嘘じゃない\nLove is over, さよなら';
function en() { const e = { layout: {}, enter: {}, exit: {}, hold: {}, decor: {} }; for (const [g, o] of [['layout', D.layoutOrder], ['enter', D.enterOrder], ['exit', D.exitOrder], ['hold', D.holdOrder], ['decor', D.decorOrder]]) o.forEach(k => e[g][k] = true); return e; }
let builds = 0, warnings = [];
const counts = { layout: {}, enter: {}, exit: {} };
for (const style of D.styleOrder) {
  for (const seed of [1, 7, 42]) {
    const o = { lyrics, title: 'テスト', artist: 'me', style, seed, fx: { motion: 0.7, glitch: 0.6, chroma: 0.7, decor: 0.7, density: 0.6, texture: 0.6, bgSwitch: 0.4, onTwos: true, flash: true, hud: true }, width: 1920, height: 1080, fps: 24, bpm: 0, starts: null, enabled: en(), offset: 0.4, lineScale: 1, duration: null };
    const plan = JZ.jzMakePlan(o);
    plan.hud = true;
    plan.cuts.forEach(c => { counts.layout[c.layout] = (counts.layout[c.layout] || 0) + 1; counts.enter[c.enter] = (counts.enter[c.enter] || 0) + 1; counts.exit[c.exit] = (counts.exit[c.exit] || 0) + 1; });
    JZ.jzBuild(plan, {});
    builds++;
    warnings.push(...JZ.log().map(w => style + '/' + seed + ': ' + w));
  }
}
// forced layouts x all enters/exits
const L = D.layoutOrder.concat(['title', 'interlude']);
for (const lay of L) for (let k = 0; k < D.enterOrder.length; k++) {
  const o = { lyrics: '夜明けの色を覚えてる', title: 't', artist: '', style: 'noir', seed: k, fx: { motion: 0.7, glitch: 0.6, chroma: 0.7, decor: 1, density: 0.2, texture: 0.6, bgSwitch: 0.4, onTwos: true, flash: true, hud: false }, width: 1080, height: 1920, fps: 30, bpm: 120, starts: [0.5], enabled: en(), offset: 0.4, lineScale: 1, duration: 5 };
  const plan = JZ.jzMakePlan(o);
  plan.cuts.forEach((c, i) => { c.layout = lay; c.enter = D.enterOrder[k]; c.exit = D.exitOrder[k % D.exitOrder.length]; c.hold = D.holdOrder[k % D.holdOrder.length]; });
  JZ.jzBuild(plan, {}); builds++;
  warnings.push(...JZ.log().map(w => lay + '/' + D.enterOrder[k] + ': ' + w));
}
// JSON plan exported by the browser app (optional): node dev/ae_test.js path/to/plan_ae.json
const jp = process.argv[2];
if (jp && fs.existsSync(jp)) { const plan = JSON.parse(fs.readFileSync(jp, 'utf8')); JZ.jzBuild(plan, {}); builds++; warnings.push(...JZ.log().map(w => 'json: ' + w)); console.log('json plan cuts', plan.cuts.length); }
console.log('builds', builds, 'comps', stats.comps, 'layers', stats.layers, 'animators', stats.animators, 'expressions', stats.exprs);
console.log('effects', stats.effects);
console.log('unknown matchNames', [...stats.unknown]);
console.log('expr errors', stats.exprErrors.length); stats.exprErrors.slice(0, 5).forEach(e => console.log('  ', e));
console.log('warnings', warnings.length); [...new Set(warnings.map(w => w.replace(/^[^:]+: /, '')))].slice(0, 20).forEach(w => console.log('  ', w));
console.log('layouts used', counts.layout); console.log('enters', counts.enter); console.log('exits', counts.exit);
console.log('chunks', JSON.stringify(JZ.jzChunk('透明なままじゃ終われない')), JSON.stringify(JZ.jzChunk('ほどけた声が遠くで鳴った')));
console.log('alerts', ctx.__alerts.length);
