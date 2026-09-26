/* JIZURA pack: レイアウト文字 — per-cut control of every text a layout draws.

   Every layout (186 of them, incl. the packs upstream keeps adding) paints its text through
   J.drawItem(), so one wrapper covers all of them and does both halves of the feature:

     · probe  — report which strings this cut's layout really draws, so the panel lists
                exactly those rows (a layout that never prints a number shows no number row)
     · apply  — hide / replace them, again without touching any layout's render code

   A drawn string is matched to a slot by comparing *normalised* forms, because layouts
   rewrite what they are handed: they strip spaces, wrap lines with \n, split the line into
   words, uppercase romaji, or glue the serial number and the timecode together
   ("No.01 00:00.40"). Anything matching nothing is reported as "other", so a layout that
   letterpresses its own station code ("LY", "33", "← LY32") is still the user's to hide. */
(() => {
'use strict';

const RX_SP = /[\s\u3000]+/g;
const norm = s => String(s == null ? '' : s).replace(RX_SP, '');
const pad2 = n => String(Math.max(0, n | 0)).padStart(2, '0');

/* every spelling of this line's romaji a pack may print: plain / upper / Capitalised,
   with or without spaces (packs build them with J.romaji + toUpperCase + slice) */
const romajiSet = cut => {
  if (cut.__romajiSet) return cut.__romajiSet;
  const s = new Set();
  for (const t of [String(cut.text || ''), norm(cut.text), String(cut.lineText || '')]) {
    if (!t) continue;
    const r = J.romaji(t);
    if (!r) continue;
    for (const v of [r, norm(r)]) {
      s.add(v);
      s.add(v.toUpperCase());
      s.add(v.charAt(0).toUpperCase() + v.slice(1).toLowerCase());
    }
  }
  return (cut.__romajiSet = s);
};
const isRomajiExact = (cut, n) => romajiSet(cut).has(n);
const isRomajiPiece = (cut, n) => {
  if ([...n].length < 3) return false;
  for (const r of romajiSet(cut)) if (r.length >= 3 && r.includes(n)) return true;
  return false;
};

/* which controllable slot a drawn string belongs to */
J.txSlotOf = (cut, str, env) => {
  if (!cut || str == null) return null;
  const s = String(str);
  if (!s.trim()) return null;
  const n = norm(s);
  if (!n) return null;
  const main = norm(cut.text), note = norm(cut.note), line = norm(cut.lineText || cut.text);
  const tag = pad2((cut.line | 0) + 1);
  const noS = 'No.' + tag, hashS = '#' + tag;
  const tm = J.fmtTime(cut.start), live = env ? J.fmtTime(env.t) : '';
  // serial number / timecode, alone or glued together — one drawing, so the panel shows a
  // single row for the pair and strips whichever half was switched off
  const hasNo = n.includes(noS) || n.includes(hashS);
  const hasTm = (!!tm && n.includes(norm(tm))) || (!!live && n.includes(norm(live)));
  if (hasNo || hasTm) {
    if (n === noS || n === hashS) return hasTm ? 'no+time' : 'no';
    if ((tm && n === norm(tm)) || (live && n === norm(live))) return hasNo ? 'no+time' : 'time';
    // a glued "No.01 00:00.40" is recognised by shape, not only against the current time,
    // so the strip path works during the probe too (where there is no playhead)
    if (hasNo && (hasTm || /\d{1,2}:\d{2}\.\d{2}/.test(n)) && n.length <= noS.length + 14) return 'no+time';
  }
  if (note && n === note) return 'note';
  if (isRomajiExact(cut, n)) return 'romaji';
  const tt = cut.params && cut.params.titleText;
  if (tt && n === norm(tt)) return 'title';
  if (main && n === main) return 'main';
  if (main && [...n].length === 1 && main.includes(n)) return 'main:split';
  // a decoration built by repeating the lyric ("nee, mada . nee, mada . ...") is still the lyric
  const SEP = /[・･／/、,،+\-]/g;
  if (main) {
    const fm = main.replace(SEP, '');
    const flat = n.replace(SEP, '');
    if (fm && flat.length >= fm.length * 2 && flat.length % fm.length === 0 && flat === fm.repeat(flat.length / fm.length)) return 'main';
  }
  if (isRomajiPiece(cut, n)) return 'romaji';
  if (line && n === line) return 'line';
  if (line && [...n].length >= 2 && (line.includes(n) || n.includes(line))) return 'line';
  return 'other';
};

/* apply a cut's override to one drawn item (null = do not draw) */
J.txApply = (env, it) => {
  const cut = env.cut, o = cut && cut.tx;
  const g = env.fx || {};
  if (!it || it.text == null) return it;
  if (!o && !g.hideNo && !g.hideTime) return it;      // nothing switched on anywhere
  const s = String(it.text);
  const slot = J.txSlotOf(cut, s, env);
  if (!slot) return it;
  const hit = k => slot === k || slot.split('+').includes(k);
  const off = k => !!(o && o[k]);                     // per-cut flag, safe when the cut has no overrides
  // serial number / timecode: the per-cut boxes and the project-wide switches both count
  if (hit('no') || hit('time')) {
    const hNo = (o && o.hideNo) || !!g.hideNo, hTm = (o && o.hideTime) || !!g.hideTime;
    if (hit('no') && hit('time') && hNo && hTm) return null;
    if (slot === 'no+time') {
      if (hTm) {                                       // keep the serial number, drop only the timecode
        const t = s.replace(/\d{1,2}:\d{2}\.\d{2}/g, '').replace(/^[\s\u3000／/]+|[\s\u3000／/]+$/g, '');
        return t ? Object.assign({}, it, { text: t }) : null;
      }
      if (!hNo) return it;
      const t = s
        .replace(new RegExp('(#|No\\.)\\s*' + pad2((cut.line | 0) + 1), 'g'), '')
        .replace(new RegExp('^\\s*' + pad2((cut.line | 0) + 1) + '\\s*[／/]\\s*'), '')
        .replace(/^[\s\u3000／/]+|[\s\u3000／/]+$/g, '');
      return t ? Object.assign({}, it, { text: t }) : null;
    }
    if (hit('no')) return hNo ? null : it;
    if (hit('time')) return hTm ? null : it;
  }
  if (hit('main')) {
    if (off('hideMain')) return null;
    if (o && o.main != null && slot === 'main') return Object.assign({}, it, { text: o.main });
  } else if (hit('line')) {
    if (off('hideLine')) return null;
  } else if (hit('note')) {
    if (off('hideNote')) return null;
    if (o && o.note != null && slot === 'note') return Object.assign({}, it, { text: o.note });
  } else if (hit('romaji')) {
    if (off('hideRomaji')) return null;
  } else if (hit('no')) {
    if (off('hideNo')) return null;
  } else if (hit('time')) {
    if (off('hideTime')) return null;
  } else if (hit('title')) {
    if (off('hideTitle')) return null;
    if (o && o.title != null && slot === 'title') return Object.assign({}, it, { text: o.title });
  } else if (hit('other')) {
    if (off('hideOther')) return null;
  }
  return it;
};

/* the row list for the panel: what this cut's layout really draws.
   Sampling five instants covers layouts that reveal their text over time. */
J.txProbe = (cut, plan) => {
  const seen = [];
  const R = new J.Renderer();
  const st = plan.style, sch = st.schemes || [];
  const sc = sch[cut.scheme % sch.length] || sch[0] || {};
  const cv = document.createElement('canvas'); cv.width = cv.height = 8;
  const ctx = cv.getContext('2d');
  const td = Math.max(0.05, cut.dur || 0);
  let probeEnv = null;
  for (const k of [0.2, 0.35, 0.5, 0.65, 0.8]) {
    const lt = td * k;
    const env = R.makeEnv(ctx, plan, cut, sc, { pass: 'main', layer: 'front', t: cut.start + lt, lt, ltb: lt, step: 1, scale: 1, allowFilter: false, energy: 0, bgOnly: false, zone: null });
    env.__rec = seen; env.__probe = true; env.__ly = true;
    probeEnv = env;
    try { (J.LAYOUTS[cut.layout] || J.LAYOUTS.center).render(env); } catch (e) { /* keep what we have */ }
  }
  const order = ['main', 'main:split', 'line', 'note', 'romaji', 'no', 'time', 'title', 'other'];
  const have = new Set();
  for (const s of seen) {
    const slot = J.txSlotOf(cut, s, probeEnv);
    if (slot) slot.split('+').forEach(x => have.add(x));
  }
  return order.filter(x => have.has(x));
};

/* one wrapper over the text primitive — the single place every layout goes through */
const drawItem = J.drawItem;
J.drawItem = (env, it) => {
  if (!env) return drawItem(env, it);
  if (env.__rec) {
    const t = it && it.text;
    if (t != null && String(t)) env.__rec.push(String(t));
    if (env.__probe) return null;                       // probe: report only, never paint
  }
  if (env.__ly) { try { it = J.txApply(env, it); } catch (e) { /* never drop a frame for a label */ } if (!it) return null; }
  return drawItem(env, it);
};

})();
