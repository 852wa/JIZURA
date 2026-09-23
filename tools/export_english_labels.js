/* Print the browser edition's localized metadata for the AE build. */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.resolve(__dirname, '..');
const files = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js') && f !== '12_ui.js').sort();
const context = vm.createContext({
  window: {}, document: { createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 100 }) }) }) },
  console, Intl, URL, Map, Set, TextEncoder, TextDecoder, performance: { now: () => 0 }
});
for (const file of files) vm.runInContext(fs.readFileSync(path.join(root, 'src', file), 'utf8'), context, { filename: file });
vm.runInContext(fs.readFileSync(path.join(root, 'app/english.js'), 'utf8'), context, { filename: 'english.js' });
const J = context.window.J;
const labels = { styles: {}, moods: {}, groups: {} };
for (const key of J.STYLE_ORDER) labels.styles[key] = { name: J.STYLES[key].name, desc: J.STYLES[key].desc };
for (const key of Object.keys(J.MOODS)) labels.moods[key] = J.MOODS[key].name;
for (const group of J.GROUP_KEYS) labels.groups[group] = Object.fromEntries(J.order(group).map(key => [key, J.registry(group)[key].name]));
process.stdout.write(JSON.stringify(labels));
