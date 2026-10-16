// Build JIZURA_AE.jsx comps on the emulated AE object model (dev/aeom.js) and report problems.
//   node dev/ae_test.js [plan_ae.json | folder ...]
// Checks: every style x several seeds through the panel's own planner (with and without 追加分 / 和風),
// and any JSON plans exported by the browser app.
const fs = require('fs'), vm = require('vm'), path = require('path');
const AEOM = require('./aeom');
const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'JIZURA_AE.jsx'), 'utf8').replace(/^#target.*\n/, '')
  .replace(/jzUI\(thisObj\);\s*\}\)\(this\);\s*$/, 'thisObj.__jz = { jzMakePlan: jzMakePlan, jzBuild: jzBuild, log: function () { return JZLOG; }, JZ_DATA: JZ_DATA, JZ_REG: JZ_REG, jzOrder: jzOrder, jzChunk: jzChunk, jzMoodEnabled: jzMoodEnabled, jzParseLyrics: jzParseLyrics, jzWordTiming: jzWordTiming, jzWordSpans: jzWordSpans, fallbacks: function () { return JZ_FALLBACKS; } };\n})(this);');
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
// 逐字 (word by word): the parser, the plan's word times, and the word layers the build adds ({ words: true })
{
  const { env, JZ } = load();
  const kbLyrics = '<00:01.00>ほ<00:01.40>どけた<00:02.00>声<00:02.60>を<00:03.00>唄う\n[00:05.00]ねえ[00:05.60]まだ[00:06.20]間に合うかな\n[00:08.00]ふつうの行';
  const o = { lyrics: kbLyrics, title: 'テスト', artist: 'me', style: 'noir', seed: 5, fx: { motion: 0.7, glitch: 0.6, chroma: 0.6, decor: 0.7, density: 0.6, texture: 0.6, bgSwitch: 0.5, onTwos: true, flash: true, hud: false },
    width: 1920, height: 1080, fps: 24, bpm: 0, starts: null, offset: 0.4, lineScale: 1, duration: null, extra: true, wa: true };
  let plan;
  try { plan = JZ.jzMakePlan(o); } catch (e) { total.problems.push('words: PLAN ' + e.message); plan = null; }
  if (plan) {
    // the parsed line: the words as written, and their own times
    const parsed = JZ.jzParseLyrics(kbLyrics).lines;
    if (!parsed[0].kb || parsed[0].kb.times.length !== 5 || parsed[0].kb.times[0] !== 1 || parsed[0].kb.last !== 3) total.problems.push('words: <mm:ss.xxx> times wrong: ' + JSON.stringify(parsed[0].kb && parsed[0].kb.times));
    if (parsed[0].text !== 'ほどけた声を唄う') total.problems.push('words: <mm:ss.xxx> text wrong: ' + parsed[0].text);
    if (parsed[1].text !== 'ねえまだ間に合うかな') total.problems.push('words: repeated [mm:ss.xx] text wrong: ' + parsed[1].text);
    if (!parsed[1].kb || parsed[1].kb.times.length !== 3 || parsed[1].kb.times[0] !== 5) total.problems.push('words: repeated [mm:ss.xx] times wrong: ' + JSON.stringify(parsed[1].kb && parsed[1].kb.times));
    if (parsed[2].kb) total.problems.push('words: a plain line was read as timed');
    // a repeated line ([t][t]同じ歌詞) is NOT 逐字: it stays as many lines as it has tags (issue: 3 tags → 1 line)
    {
      const rep = JZ.jzParseLyrics('[00:01.00][00:30.00]同じ歌詞').lines;
      if (rep.length !== 2) total.problems.push('words: a repeated line gave ' + rep.length + ' lines, want 2');
      else {
        for (let i = 0; i < rep.length; i++) if (rep[i].kb) total.problems.push('words: a repeated line was read as timed');
        if (rep[0].lrc !== 1 || rep[1].lrc !== 30) total.problems.push('words: a repeated line times: ' + JSON.stringify([rep[0].lrc, rep[1].lrc]));
      }
      const rep3 = JZ.jzParseLyrics('[00:01.00][00:30.00][00:40.00]三度').lines;
      if (rep3.length !== 3) total.problems.push('words: a 3× repeated line gave ' + rep3.length + ' lines, want 3');
    }
    // a tag a row ends on is where the next row starts: never lyric text (it used to be drawn on screen), and never
    // a second showing of the row either
    {
      const raw = '[00:19.59]深陷孤独 即使怅然落泪[00:23.25]\n[00:23.26]蝶[00:23.81]の[00:24.02]羽[00:24.26]根[00:24.49]で[00:24.87]\n[00:24.88]次';
      const pp = JZ.jzParseLyrics(raw).lines;
      if (pp.length !== 3) total.problems.push('words: a row with a trailing tag gave ' + pp.length + ' lines, want 3');
      else {
        // a plain row: only its own starting tag is a time, the tag at the end comes off the text
        if (pp[0].text !== '深陷孤独 即使怅然落泪') total.problems.push('words: the tag at the end of a plain row is still in the text: ' + pp[0].text);
        if (pp[0].lrc !== 19.59 || pp[0].kb) total.problems.push('words: a plain row with a trailing tag: ' + JSON.stringify([pp[0].lrc, !!pp[0].kb]));
        // a 逐字 row: the words are the words, and the tag at the end is where the last word ends
        if (pp[1].text !== '蝶の羽根で' || !pp[1].kb || pp[1].kb.words.length !== 5) total.problems.push('words: a timed row: ' + JSON.stringify([pp[1].text, pp[1].kb && pp[1].kb.words]));
        if (pp[1].lrc !== 23.26 || pp[1].kb.last !== 24.87) total.problems.push('words: a timed row with a trailing tag: ' + JSON.stringify([pp[1].lrc, pp[1].kb.last]));
        if (pp[2].lrc !== 24.88 || pp[2].kb) total.problems.push('words: the row after a timed row: ' + JSON.stringify([pp[2].lrc, !!pp[2].kb]));
      }
      // every text of a plan must be free of timestamps: that is what used to be drawn on screen
      const p2 = JZ.jzMakePlan({ lyrics: raw, title: '', artist: '', style: 'noir', seed: 1, fx: { motion: 0.5, glitch: 0, chroma: 0, decor: 0, density: 0.5, texture: 0, bgSwitch: 0, onTwos: true, flash: false, hud: false },
        width: 1920, height: 1080, fps: 24, bpm: 0, starts: null, offset: 0.4, lineScale: 1, duration: null, extra: true, wa: true });
      const dirty = [];
      for (let i = 0; i < p2.cuts.length; i++) if (/\[\d+:\d|\]\s*$|<\d+:\d/.test(p2.cuts[i].text || '')) dirty.push(p2.cuts[i].text);
      if (dirty.length) total.problems.push('words: ' + dirty.length + ' cut(s) still show a timestamp: ' + JSON.stringify(dirty));
      // a blank line between the rows still separates the parts (空行)
      const raw2 = '[00:19.59]深陷孤独 即使怅然落泪[00:23.25]\n\n[00:23.26]蝶[00:23.81]の[00:24.87]\n\n[00:23.26]挥舞粉蝶般的羽翼[00:25.13]';
      const bb = JZ.jzParseLyrics(raw2).lines;
      // 双语: the last row starts with the row above it, so it is the translation and is dropped -> 2 rows
      if (bb.length !== 2) total.problems.push('words: blank lines gave ' + bb.length + ' lines, want 2');
      else {
        if (!bb[1].gapBefore) total.problems.push('words: the blank lines were lost: ' + JSON.stringify([bb[1].text, bb[1].gapBefore]));
        if (bb[1].text !== '蝶の') total.problems.push('words: blank line rows: ' + JSON.stringify([bb[1].text]));
      }
      // 双语 (a lyric written in two languages): the second row of a pair starts while the row above it is still
      // singing — the first row keeps it, the translation is dropped (one line, one showing)
      {
        const bi = '[00:19.59]孤[00:19.80]独[00:20.25]の[00:20.50]中[00:21.15] [00:21.15]泣[00:21.61]い[00:22.08]て[00:22.58]も[00:23.07]\n'
          + '[00:19.59]深陷孤独 即使怅然落泪[00:23.25]\n'
          + '[00:23.26]蝶[00:23.81]の[00:24.02]羽[00:24.26]根[00:24.49]で[00:24.87]\n'
          + '[00:23.26]挥舞粉蝶般的羽翼[00:25.13]';
        const bl = JZ.jzParseLyrics(bi).lines;
        if (bl.length !== 2) total.problems.push('bilingual: ' + bl.length + ' lines, want 2: ' + JSON.stringify(Array.prototype.slice.call(bl).map(l => [l.lrc, l.text])));
        else {
          if (bl[0].lrc !== 19.59 || bl[0].text !== '孤独の中泣いても' || !bl[0].kb || bl[0].kb.words.length !== 8) total.problems.push('bilingual: row 0 ' + JSON.stringify([bl[0].lrc, bl[0].text, bl[0].kb && bl[0].kb.words.length]));
          if (bl[1].lrc !== 23.26 || bl[1].text !== '蝶の羽根で' || !bl[1].kb || bl[1].kb.words.length !== 5) total.problems.push('bilingual: row 1 ' + JSON.stringify([bl[1].lrc, bl[1].text, bl[1].kb && bl[1].kb.words.length]));
          if (bl[1].gapBefore) total.problems.push('bilingual: a dropped row left a gap behind');
        }
        // a plain pair (no word timings, no tag at the end): only the same start time is the pair. A later start
        // is left alone — nothing says how long the first row sings, so the next phrase must not go with it
        const bp = JZ.jzParseLyrics('[00:05.00]Always with me\n[00:05.00]いつも何度でも').lines;
        if (bp.length !== 1 || bp[0].text !== 'Always with me') total.problems.push('bilingual: a plain pair gave ' + JSON.stringify(Array.prototype.slice.call(bp).map(l => [l.lrc, l.text])));
        const bl2 = JZ.jzParseLyrics('[00:05.00]Always with me\n[00:05.60]いつも何度でも').lines;
        if (bl2.length !== 2) total.problems.push('bilingual: a plain lyric lost a row: ' + JSON.stringify(Array.prototype.slice.call(bl2).map(l => [l.lrc, l.text])));
        // …and a row that starts where the row above ends is the next phrase, not a translation
        const bn = JZ.jzParseLyrics('[00:05.00]Always with me[00:08.00]\n[00:08.00]いつも何度でも').lines;
        if (bn.length !== 2 || bn[0].text !== 'Always with me' || bn[1].text !== 'いつも何度でも') total.problems.push('bilingual: the next phrase was dropped: ' + JSON.stringify(Array.prototype.slice.call(bn).map(l => [l.lrc, l.text])));
      }
      // the same, with one word timed in the other notation: the tag at the end only closes the last word
      const mixed = JZ.jzParseLyrics('[00:01.00]深陷<00:02.00>孤独[00:03.00]').lines;
      if (mixed.length !== 1 || mixed[0].lrc !== 1) total.problems.push('words: a mixed-notation row gave ' + JSON.stringify([mixed.length, mixed[0].lrc]));
      else {
        const ws = [];
        for (let i = 0; i < mixed[0].kb.words.length; i++) ws.push(mixed[0].kb.words[i].text);
        if (ws.join('|') !== '深陷|孤独') total.problems.push('words: a mixed-notation row words: ' + JSON.stringify(ws));
        if (mixed[0].kb.times[0] !== 1 || mixed[0].kb.times[1] !== 2 || mixed[0].kb.last !== 3) total.problems.push('words: a mixed-notation row times: ' + JSON.stringify([mixed[0].kb.times, mixed[0].kb.last]));
      }
    }
    // the line markers still work on a 逐字 line: |注释, !, *強調*, and / (the words, not the tags)
    {
      const mk1 = JZ.jzParseLyrics('<00:01.00>まだ<00:02.00>ルビ|注釈').lines[0];
      if (mk1.text !== 'まだルビ' || mk1.note !== '注釈') total.problems.push('words: | on a timed line: ' + JSON.stringify([mk1.text, mk1.note]));
      const mk2 = JZ.jzParseLyrics('<00:01.00>まだ<00:02.00>あ!').lines[0];
      if (mk2.text !== 'まだあ' || !mk2.impact) total.problems.push('words: ! on a timed line: ' + JSON.stringify([mk2.text, mk2.impact]));
      const mk3 = JZ.jzParseLyrics('<00:01.00>*強*<00:02.00>調').lines[0];
      if (mk3.text !== '強調' || mk3.emph.length !== 1 || mk3.emph[0] !== '強') total.problems.push('words: *強調* on a timed line: ' + JSON.stringify([mk3.text, mk3.emph]));
      const mk4 = JZ.jzParseLyrics('<00:01.00>ねえ<00:02.00>まだ<00:03.00>間に合う/かな').lines[0];
      if (!mk4.kb || mk4.kb.words.length !== 3) total.problems.push('words: / on a timed line lost the words: ' + JSON.stringify(mk4.kb && mk4.kb.words));
      if (!mk4.manual || mk4.manual.length !== 2 || mk4.manual[0] !== 'ねえまだ間に合う') total.problems.push('words: / on a timed line: ' + JSON.stringify(mk4.manual));
    }
    // the plan: a line starts with its first word, the cuts carry the word times
    const L0 = plan.lines[0];
    if (Math.abs(L0.start - 1) > 1e-6 || Math.abs(L0.end - 3) > 1e-6) total.problems.push('words: line time ' + L0.start + '..' + L0.end);
    let wc = 0;
    for (const c of Array.from(plan.cuts)) if (c.wordTimes) { wc++; if (!c.karaoke || c.karaoke.length !== c.wordTimes.length + 1) total.problems.push('words: cut ' + c.text + ' karaoke ' + JSON.stringify(c.karaoke)); }
    if (wc < 2) total.problems.push('words: no cut carries word times');
    try { JZ.jzBuild(plan, { words: true }); } catch (e) { total.warnings.push('words: BUILD ' + e.message); }
    // the word layers live in the main comp, each starting at its own word's time
    let inPoints = [];
    for (const c of env.comps) for (let i = 1; i <= c.numLayers; i++) { const L = c.layer(i); if (/^w\d+ /.test(String(L.name))) inPoints.push([String(c.name), L.name, L.inPoint]); }
    if (inPoints.length < 4) total.problems.push('words: only ' + inPoints.length + ' word layers built');
    for (const [comp, name, ip] of inPoints) {
      const t = parseFloat(String(name).split(' ')[0].replace('w', ''));
      if (!(ip >= 0) || ip > 30) total.problems.push('words: layer ' + comp + '/' + name + ' in-point ' + ip);
    }
    // 中央を空ける + 逐字: a split cut keeps the words and times of its own half (not plain chunks), and the
    // second half never inherits the first half's times
    {
      const o2 = Object.assign({}, o, { lyrics: '<00:01.00>ほ<00:01.40>どけ<00:02.00>た<00:02.60>声<00:03.00>が', centerFree: true });
      let pl2 = null;
      try { pl2 = JZ.jzMakePlan(o2); } catch (e) { total.problems.push('split: PLAN ' + e.message); }
      if (pl2) {
        const kc = Array.prototype.slice.call(pl2.cuts).filter(c => c.karaoke && c.karaoke.length);
        if (!kc.length) total.problems.push('split: no timed cut after 中央を空ける');
        for (const c of kc) {
          const whole = String(c.words.join('')).replace(/[ \u3000]/g, ''), txt = String(c.text || '').replace(/[ \u3000]/g, '');
          if (whole !== txt) total.problems.push('split: words ' + JSON.stringify(c.words) + ' do not spell the cut ' + JSON.stringify(c.text));
          if (c.karaoke.length !== c.words.length + 1) total.problems.push('split: ' + c.karaoke.length + ' times for ' + c.words.length + ' words');
        }
        for (const c of pl2.cuts) if (c.companion && (c.companion.karaoke || c.companion.wordTimes)) total.problems.push('split: the twin of ' + JSON.stringify(c.text) + ' kept the first half times');
      }
    }
    // a half may end inside a word: the part hanging over the cut is not drawn, so it is not a word of the half
    {
      const o3 = Object.assign({}, o, { lyrics: '<00:00.40>孤独<00:00.90>ねえ<00:01.50>ほ<00:01.90>ン', centerFree: true });
      let pl3 = null;
      try { pl3 = JZ.jzMakePlan(o3); } catch (e) { total.problems.push('split: PLAN ' + e.message); }
      if (pl3) {
        const kc = Array.prototype.slice.call(pl3.cuts).filter(c => c.karaoke && c.karaoke.length);
        if (!kc.length) total.problems.push('split: no timed cut for a half that ends inside a word');
        for (const c of kc) {
          const whole = String(c.words.join('')).replace(/[ \u3000]/g, ''), txt = String(c.text || '').replace(/[ \u3000]/g, '');
          if (whole !== txt) total.problems.push('split: words ' + JSON.stringify(c.words) + ' do not spell the cut ' + JSON.stringify(c.text));
        }
      }
    }
    // 手で入れた行時刻: the word times are absolute, so a cut that starts later must not draw its words early
    {
      const o4 = Object.assign({}, o, { lyrics: '<00:01.00>ほ<00:01.40>どけ<00:02.00>た<00:02.60>声<00:03.00>が', starts: [3] });
      let pl4 = null;
      try { pl4 = JZ.jzMakePlan(o4); } catch (e) { total.problems.push('words: PLAN ' + e.message); }
      if (pl4) {
        for (const c of Array.prototype.slice.call(pl4.cuts)) {
          if (!c.karaoke || !c.karaoke.length) continue;
          if (c.karaoke[0] < c.start - 1e-6) total.problems.push('words: cut ' + JSON.stringify(c.text) + ' starts at ' + c.start + ' but its first word is at ' + c.karaoke[0]);
          for (let i = 1; i < c.karaoke.length; i++) if (c.karaoke[i] < c.karaoke[i - 1] - 1e-6) total.problems.push('words: cut ' + JSON.stringify(c.text) + ' times out of order ' + JSON.stringify(c.karaoke));
          // the words the plan itself gives must match its own karaoke (bar the end of the last word)
          if (c.wordTimes && c.karaoke.length !== c.wordTimes.length + 1) total.problems.push('words: cut ' + JSON.stringify(c.text) + ' ' + c.karaoke.length + ' times for ' + c.wordTimes.length + ' words');
        }
      }
    }
    // 語レイヤーの大きさ: the size rule works in the plan's frame, so a comp built at another size must still centre
    // the words and scale them with the comp (a portrait comp used to put the whole line off the right edge)
    {
      for (const [pw2, ph2, w, h] of [[1920, 1080, 1920, 1080], [1920, 1080, 1280, 720], [1920, 1080, 3840, 2160], [1080, 1920, 1080, 1920], [1920, 1080, 1080, 1920]]) {
        const { env: e2, JZ: JZ2 } = load();
        const o5 = { lyrics: '<00:01.00>ほ<00:01.40>どけ<00:02.00>た<00:02.60>声<00:03.00>が', title: '', artist: '', style: 'noir', seed: 5,
          fx: { motion: 0.5, glitch: 0, chroma: 0, decor: 0, density: 0.5, texture: 0, bgSwitch: 0, onTwos: true, flash: false, hud: false },
          width: pw2, height: ph2, fps: 24, bpm: 0, starts: null, offset: 0.4, lineScale: 1, duration: null, extra: true, wa: true };
        let pl5 = null, comp = null;
        try { pl5 = JZ2.jzMakePlan(o5); comp = JZ2.jzBuild(pl5, { words: true, width: w, height: h }); } catch (e) { total.problems.push('size ' + w + 'x' + h + ': BUILD ' + e.message); }
        if (!comp) continue;
        let seen = 0;
        for (let i = 1; i <= comp.numLayers; i++) {
          const L = comp.layer(i); if (!/^w\d+ /.test(String(L.name))) continue;
          seen++;
          const p = L.property('ADBE Transform Group').property('ADBE Position').value;
          if (!(p[0] >= 0 && p[0] <= w && p[1] >= 0 && p[1] <= h)) total.problems.push('size ' + w + 'x' + h + ': word layer ' + L.name + ' at ' + JSON.stringify([Math.round(p[0]), Math.round(p[1])]) + ' is off the comp');
        }
        if (!seen) total.problems.push('size ' + w + 'x' + h + ': no word layers');
      }
    }
    account(env, 'words', JZ);
  }
}
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
