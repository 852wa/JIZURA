/* Load the browser sources that have no DOM dependency into Node, so the lyric
   timing engine can be tested without a browser.
   usage:  const J = require('./jizura_src.js').load();
   The sources are the real files under src/ — nothing is copied or bundled, so a
   test cannot pass against a stale copy. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.dirname(__dirname);

/* engine files only, in the load order build.py uses: no expression packs, no
   renderer, no UI. Same idea as dev/build_test.py's "core" set, minus the parts
   that want a canvas at load time (02_fonts) — the planner does not need them. */
const FILES = ['01_util.js', '02b_lang.js', '03_text.js', '04_styles.js', '05_anim.js', '05b_registry.js',
  '06_layouts.js', '07_decor.js', '08_planner.js', '08b_omakase.js', '09a_han.js', '09b_autolrc.js', '10_audio.js', '10c_features.js'];

function load(files) {
  const sandbox = { window: {}, console, Math, JSON, Date, Object, Array, Number, String, Boolean, Error, isFinite, parseInt, parseFloat, Intl, Float32Array, Uint8Array, Uint16Array, Set, Map };
  sandbox.globalThis = sandbox;
  sandbox.window.J = {};
  vm.createContext(sandbox);
  for (const f of (files || FILES)) {
    const p = path.join(ROOT, 'src', f);
    vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: p });
  }
  return sandbox.window.J;
}

function readFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8'));
}
function readText(name) {
  return fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
}

module.exports = { load, readFixture, readText, FILES, ROOT };
