/* ============================================================
   JIZURA — which entries random picks may use
   1) 追加分 (extra): everything added after the first public
      version (356 parts, 12 styles). Random picks (planner /
      おまかせ / シャッフル) use the first version's set unless
      project.extra === true.
   2) 和風 (wa): entries built around a traditional Japanese object,
      pattern or motif. Applied after (1): with project.wa === false
      they are never picked at random.
   A line can still be set to any entry by hand (per-line override).
   3) Part sets with their own switch (not 追加分): ホラー (horror,
      off by default), 文字PV系 (typo) and キネティック (kinetic),
      both on by default. Entries carry `set: '<name>'` (or come
      from a pack of that name).
   Pack authors: packs not listed in J.BASE_PACKS count as 追加分;
   add Japanese-motif keys to J.WA (or set `wa: true` on the def).
   ============================================================ */
(() => {
'use strict';
J.BASE_PACKS = ['core', undefined, 'layoutsA', 'layoutsB', 'enter', 'exitHold', 'decor', 'looks'];
J.BASE_STYLES = ['noir', 'crimson', 'caution', 'magenta', 'paper', 'hud', 'mint', 'specimen', 'transit', 'blueprint', 'rouge', 'mono'];
J.EXTRA_FONTS = ['reggae', 'rampart', 'potta', 'kiwi', 'klee', 'shippori'];
J.WA = {
  layout: ['ema', 'chochin', 'noren', 'tanzaku', 'omikuji', 'kakejiku', 'shoji', 'karuta', 'origami', 'postcard', 'letterPaper', 'genkou', 'hanko'],
  enter: ['fanOpen', 'brushReveal'],
  exit: ['fanClose'],
  decor: ['seal', 'kamon', 'seigaiha', 'asanoha', 'chochin', 'shimenawa', 'sensu', 'tsukiKumo', 'momiji', 'namiGashira', 'kasumi', 'brushStroke', 'petals'],
  bg: ['seigaiha', 'asanoha'],
  treat: ['monoGrid'],
  style: ['sakura', 'sumi'],
};
J.SETS = { horror: { on: false }, typo: { on: true }, kinetic: { on: true } };   // on = default (UI labels live in 12_ui.js)
J.SET_ORDER = Object.keys(J.SETS);
/* is this part set switched on in the project? (old projects without the flag get the default) */
J.setOn = (project, set) => { const v = project && project[set]; return typeof v === 'boolean' ? v : !!(J.SETS[set] && J.SETS[set].on); };
const def = (g, k) => g === 'style' ? J.STYLES[k] : g === 'font' ? J.FONTS[k] : (J.registry(g) || {})[k];
// mark the part sets, then 追加分 (set entries are not 追加分: they have their own switch)
for (const g of J.GROUP_KEYS) for (const k of J.order(g)) { const d = def(g, k); if (d && !d.set && J.SETS[d.pack]) d.set = d.pack; }
for (const g of J.GROUP_KEYS) for (const k of J.order(g)) { const d = def(g, k); if (d && !d.set && !J.BASE_PACKS.includes(d.pack)) d.extra = true; }
for (const k of J.STYLE_ORDER) if (!J.BASE_STYLES.includes(k) && !J.STYLES[k].set) J.STYLES[k].extra = true;
for (const k of J.EXTRA_FONTS) if (J.FONTS[k]) J.FONTS[k].extra = true;
// mark 和風
for (const [g, keys] of Object.entries(J.WA)) for (const k of keys) { const d = def(g, k); if (d) d.wa = true; }

J.isWa = (g, k) => { const d = def(g, k); return !!(d && d.wa); };
J.isExtra = (g, k) => { const d = def(g, k); return !!(d && d.extra); };
J.setOf = (g, k) => { const d = def(g, k); return (d && d.set) || null; };
/* may random picks use this entry? (g: a group key, 'style' or 'font') — 追加分 first, then 和風 */
J.randomOk = (project, g, k) => {
  const d = def(g, k); if (!d) return false;
  if (d.extra && !(project && project.extra === true)) return false;
  if (d.wa && project && project.wa === false) return false;
  if (d.set && !J.setOn(project, d.set)) return false;
  return true;
};
})();
