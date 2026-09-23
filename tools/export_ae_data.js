// Extract style packs + recipe names from the web engine for the AE panel
const vm = require('vm'), fs = require('fs');
global.window = global;
global.document = { createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 100 }) }) }), getElementById: () => null };
for (const f of ['01_util', '02_fonts', '04_styles', '05_anim', '05b_registry', '06_layouts', '07_decor', '08b_omakase']) vm.runInThisContext(fs.readFileSync(require('path').join(__dirname, '..', 'src', f + '.js'), 'utf8'));
const JJ = global.J;
const names = t => Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v.name]));
const data = {
  styles: JJ.STYLES, styleOrder: JJ.STYLE_ORDER,
  layoutOrder: JJ.LAYOUT_ORDER, enterOrder: JJ.ENTER_ORDER, holdOrder: JJ.HOLD_ORDER, exitOrder: JJ.EXIT_ORDER, decorOrder: JJ.DECOR_ORDER,
  names: { layout: names(JJ.LAYOUTS), enter: names(JJ.ENTER), hold: names(JJ.HOLD), exit: names(JJ.EXIT), decor: names(JJ.DECOR) },
  moods: JJ.MOODS, moodOrder: Object.keys(JJ.MOODS), ghostPairs: JJ.GHOST_PAIRS,
  fonts: Object.fromEntries(Object.entries(JJ.FONTS).map(([k, f]) => [k, { label: f.label, family: f.family.replace(/"/g, ''), weight: f.weight }])),
};
fs.writeFileSync(require('path').join(__dirname, '..', 'ae', 'data.json'), JSON.stringify(data));
console.log('ok', Object.keys(data.styles).length, 'styles');
