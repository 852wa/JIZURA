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
const def = (g, k) => g === 'style' ? J.STYLES[k] : g === 'font' ? J.FONTS[k] : (J.registry(g) || {})[k];
// mark 追加分
for (const g of J.GROUP_KEYS) for (const k of J.order(g)) { const d = def(g, k); if (d && !J.BASE_PACKS.includes(d.pack)) d.extra = true; }
for (const k of J.STYLE_ORDER) if (!J.BASE_STYLES.includes(k)) J.STYLES[k].extra = true;
for (const k of J.EXTRA_FONTS) if (J.FONTS[k]) J.FONTS[k].extra = true;
// mark 和風
for (const [g, keys] of Object.entries(J.WA)) for (const k of keys) { const d = def(g, k); if (d) d.wa = true; }

J.isWa = (g, k) => { const d = def(g, k); return !!(d && d.wa); };
J.isExtra = (g, k) => { const d = def(g, k); return !!(d && d.extra); };
/* may random picks use this entry? (g: a group key, 'style' or 'font') — 追加分 first, then 和風 */
J.randomOk = (project, g, k) => {
  const d = def(g, k); if (!d) return false;
  if (d.extra && !(project && project.extra === true)) return false;
  if (d.wa && project && project.wa === false) return false;
  return true;
};
})();
