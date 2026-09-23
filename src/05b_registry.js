/* ============================================================
   JIZURA — registries for the newer expression groups + a single
   registration helper used by every expression pack (src/11p_*.js)

   group    registry      order array          picked per
   layout   J.LAYOUTS     J.LAYOUT_ORDER       cut
   enter    J.ENTER       J.ENTER_ORDER        cut
   hold     J.HOLD        J.HOLD_ORDER         cut
   exit     J.EXIT        J.EXIT_ORDER         cut
   decor    J.DECOR       J.DECOR_ORDER        cut (0..n)
   treat    J.TREAT       J.TREAT_ORDER        cut   text treatment (outline, extrude, marker…)
   bg       J.BG          J.BG_ORDER           line  full-screen background graphic
   cam      J.CAMERA      J.CAMERA_ORDER       cut   camera move over the cut
   fx       J.FXE         J.FXE_ORDER          event post-processing / transition effect

   Common optional fields on every entry:
     name  (Japanese label, required)   tags  (mood keys it suits: glitch calm pop graphic editorial emotional)
     w     (base pick weight, default 1)  pack (set by J.register)
   ============================================================ */
(() => {
'use strict';

J.TREAT = { none: { name: 'なし', apply() {} } };
J.TREAT_ORDER = ['none'];
J.BG = { none: { name: '無地', draw() {} } };
J.BG_ORDER = ['none'];
J.CAMERA = {
  push: { name: 'ゆっくり寄る', tags: ['calm', 'editorial', 'emotional', 'graphic', 'pop', 'glitch'], w: 5,
    get: (env) => ({ s: 1 + 0.03 * (env.fx.motion ?? 0.7) * J.clamp(env.lt / Math.max(0.3, env.cut.dur)) }) },
};
J.CAMERA_ORDER = ['push'];
// post / transition effects. Entries without draw() are handled by the renderer's built-in branch.
J.FXE = {
  slice:  { name: 'スライスグリッチ', builtin: true },
  block:  { name: 'ブロックグリッチ', builtin: true },
  invert: { name: '反転', builtin: true },
  flash:  { name: 'フラッシュ', builtin: true },
  zoom:   { name: 'ズームブラー', builtin: true },
  mosaic: { name: 'モザイク', builtin: true },
  shake:  { name: '揺れ', builtin: true },
  chroma: { name: '色ズレの跳ね', builtin: true },
};
J.FXE_ORDER = ['chroma', 'shake', 'slice', 'block', 'invert', 'flash', 'zoom', 'mosaic'];

const GROUPS = {
  layout: ['LAYOUTS', 'LAYOUT_ORDER'], enter: ['ENTER', 'ENTER_ORDER'], hold: ['HOLD', 'HOLD_ORDER'], exit: ['EXIT', 'EXIT_ORDER'],
  decor: ['DECOR', 'DECOR_ORDER'], treat: ['TREAT', 'TREAT_ORDER'], bg: ['BG', 'BG_ORDER'], cam: ['CAMERA', 'CAMERA_ORDER'], fx: ['FXE', 'FXE_ORDER'],
};
J.GROUP_KEYS = Object.keys(GROUPS);
J.registry = g => J[GROUPS[g][0]];
J.order = g => J[GROUPS[g][1]];

/* J.register('layout', 'myKey', { name: '…', … }, 'packName') */
J.register = (group, key, def, pack) => {
  const G = GROUPS[group];
  if (!G) throw new Error('unknown group ' + group);
  if (!def || !def.name) throw new Error(`${group}.${key}: name is required`);
  const reg = J[G[0]], order = J[G[1]];
  if (reg[key] && reg[key].pack !== pack) console.warn(`JIZURA: ${group}.${key} is being replaced`);
  def.pack = pack || def.pack || 'core';
  reg[key] = def;
  if (!def.special && !order.includes(key)) order.push(key);
  return def;
};
J.registerAll = (group, defs, pack) => { for (const k of Object.keys(defs)) J.register(group, k, defs[k], pack); };

/* items whose tags include a mood key (used by おまかせ) */
J.taggedWith = (group, mood) => J.order(group).filter(k => { const d = J.registry(group)[k]; return d && d.tags && d.tags.includes(mood); });
})();
