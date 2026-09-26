/* JIZURA pack: レイアウト文字 — per-cut control of every text a layout draws.

   Every layout (186 of them, incl. the packs upstream keeps adding) puts its text
   on screen through J.drawItem(), so one wrapper can do both halves of the feature:

     · probe  — report which strings this cut's layout actually draws, so the panel
                lists exactly those rows (a layout that never prints a number simply
                shows no 番号 row)
     · apply  — hide / replace them, again for every layout, without touching any
                layout's render code

   A drawn string is matched against the cut's own values (line text, 注釈, the 自動
   ローマ字 spellings, No.NN, 時刻, 曲名), so nothing else the layout draws is touched. */
(() => {
'use strict';

const pad2 = n => String(Math.max(0, n | 0)).padStart(2, '0');

/* 自動ローマ字: the spellings a pack may print for this line (plain / upper, spaces kept or stripped) */
const romajiSet = cut => {
  if (cut.__romajiSet) return cut.__romajiSet;
  const s = new Set(), raw = String(cut.text || ''), clean = raw.replace(/\s+/g, '');
  for (const t of [raw, clean]) {
    if (!t) continue;
    const r = J.romaji(t);
    if (r) { s.add(r); s.add(r.toUpperCase()); }
  }
  return (cut.__romajiSet = s);
};

/* packs also print a romaji label cut short (romaji.slice(0, 12) …) */
const romajiPiece = (cut, s) => {
  if ([...s].length < 2) return false;
  for (const r of romajiSet(cut)) if (r.includes(s)) return true;
  return false;
};

/* the controllable slot a drawn string belongs to — null = not ours (frames, glyphs, punctuation …) */
J.txSlotOf = (cut, str, env) => {
  if (!cut || str == null) return null;
  const s = String(str), t = String(cut.text || '');
  if (!s) return null;
  const n = (cut.line | 0) + 1, tm = J.fmtTime(cut.start);
  if (cut.note && s === String(cut.note)) return 'note';
  if (romajiPiece(cut, s)) return 'romaji';
  if (s === 'No.' + pad2(n) || s === '#' + pad2(n)) return 'no';
  if (s === tm || (env && env.t != null && s === J.fmtTime(env.t))) return 'time';
  if (s === pad2(n) + ' ／ ' + tm) return 'no+time';
  const tt = cut.params && cut.params.titleText;
  if (tt && s === String(tt)) return 'title';
  if (t && s === t) return 'main';
  if (t && [...s].length === 1 && t.includes(s)) return 'main:split';
  return null;
};

/* the rows the panel should show for this cut: what its layout really draws.
   The layout runs once per sample point against a throw-away 8×8 canvas, with the
   recorder in place, so nothing is painted and no state is kept. */
J.txProbe = (cut, plan) => {
  const seen = [], have = new Set();
  const st = (plan && plan.style) || {}, sch = st.schemes || [];
  const sc = sch[(cut.scheme | 0) % Math.max(1, sch.length)] || sch[0] || {};
  const cv = document.createElement('canvas'); cv.width = cv.height = 8;
  const ctx = cv.getContext('2d');
  const R = new J.Renderer();
  const td = Math.max(0.05, cut.dur || 0);
  let last = null;
  for (const k of [0.3, 0.5, 0.72]) {
    const lt = td * k;
    const env = R.makeEnv(ctx, plan, cut, sc, { pass: 'main', layer: 'front', t: cut.start + lt, lt, ltb: lt, step: 1, scale: 1, allowFilter: false, energy: 0, bgOnly: false, zone: null });
    env.__rec = seen; env.__probe = true; env.__ly = true; last = env;
    const L = J.LAYOUTS[cut.layout] || J.LAYOUTS.center;
    try { L.render(env); } catch (e) { /* keep whatever we already collected */ }
  }
  for (const s of seen) {
    const sl = J.txSlotOf(cut, s, last);
    if (sl) sl.split('+').forEach(x => have.add(x));
  }
  return ['main', 'main:split', 'note', 'romaji', 'no', 'time', 'title'].filter(x => have.has(x));
};

/* apply the cut's override to one drawn item; null = leave it out */
J.txApply = (env, it) => {
  const cut = env.cut, o = cut && cut.tx;
  if (!o || !it || it.text == null) return it;
  const slot = J.txSlotOf(cut, String(it.text), env);
  if (!slot) return it;
  if (slot === 'main' || slot === 'main:split') {
    if (o.hideMain) return null;
    if (o.main != null && slot === 'main') return Object.assign({}, it, { text: o.main });
  } else if (slot === 'note') {
    if (o.hideNote) return null;
    if (o.note != null) return Object.assign({}, it, { text: o.note });
  } else if (slot === 'romaji') {
    if (o.hideRomaji) return null;
  } else if (slot.split('+').includes('no')) {
    if (o.hideNo) return null;
  } else if (slot.split('+').includes('time')) {
    if (o.hideTime) return null;
  } else if (slot === 'title') {
    if (o.hideTitle) return null;
    if (o.title != null) return Object.assign({}, it, { text: o.title });
  } else return it;
  return it;
};

/* one wrapper over the text primitive: every layout goes through here */
const drawItem = J.drawItem;
J.drawItem = (env, it) => {
  if (!env) return drawItem(env, it);
  if (env.__rec) {
    const t = it && it.text;
    if (t != null && String(t)) env.__rec.push(String(t));
    if (env.__probe) return null;                       // probe: report only, never paint
  }
  if (env.__ly) { it = J.txApply(env, it); if (!it) return null; }
  return drawItem(env, it);
};

})();
