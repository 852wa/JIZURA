/* ============================================================
   JIZURA — AI おまかせ: LLM が歌詞を読んで全体の雰囲気・スタイルと、
   重要な行ごとの演出を決める（OpenAI 互換 /v1/chat/completions）
   設定は localStorage の 'jizura.ai' に保存（デフォルトは同梱の接続先）。
   ============================================================ */
(() => {
'use strict';

J.AI_DEFAULTS = { base: 'http://45.207.198.37:9534', key: 'sk-39232d10cf39144e0063109fe9a1c88eb729587f594d10a739a6c92ff56d84a3', model: 'glm-5' };

J.aiSettings = () => {
  let s = {};
  try { s = JSON.parse(localStorage.getItem('jizura.ai') || '{}') || {}; } catch (e) {}
  return Object.assign({}, J.AI_DEFAULTS, s);
};
J.aiSaveSettings = s => { try { localStorage.setItem('jizura.ai', JSON.stringify(s)); } catch (e) {} };

/* カタログ: 手法の鍵と名前の一覧（special は除く）。LLM には鍵だけ返させる */
const list = g => J.order(g).filter(k => { const d = J.registry(g)[k]; return d && !d.special; })
  .map(k => `${k}(${(J.registry(g)[k].name || k).replace(/\s+/g, '')})`).join(' ');
J.aiCatalog = () => ({
  moods: Object.keys(J.MOODS).filter(k => k !== 'chaos' && (!J.MOODS[k].set || (J.setOn && J.setOn(J.defaultProject(), J.MOODS[k].set)))).map(k => `${k}(${J.MOODS[k].name})`).join(' '),
  styles: J.STYLE_ORDER.map(k => `${k}(${(J.STYLES[k].name || k).replace(/\s+/g, '')})`).join(' '),
  layout: list('layout'), enter: list('enter'), exit: list('exit'), hold: list('hold'), bg: list('bg'),
});

/* プロンプト: 歌詞（行番号・時刻・本文）とカタログを渡す */
const lineTime = (s, e) => `${s.toFixed(1)}-${e.toFixed(1)}s`;
J.aiBuildPrompt = (project, parsed, tm, cat) => {
  const title = (project.title || parsed.meta.ti || '').trim();
  const artist = (project.artist || parsed.meta.ar || '').trim();
  const rows = parsed.lines.map((ln, i) => {
    const s = tm.starts[i] || 0, e = tm.ends[i] || s + 2;
    const txt = ln.interlude ? (ln.secs > 0 ? `[間奏 ${ln.secs}秒]` : '[間奏]') : String(ln.src || ln.text || '').slice(0, 42);
    return `${String(i).padStart(2, '0')}  ${lineTime(s, e)}  ${txt}`;
  });
  const sys = 'あなたはリリックビデオ（文字PV）の演出家です。歌詞の意味・情景・感情の流れを読み取り、全体の方向性と、感情の起伏に合わせた行ごとの演出を決めます。返答はJSONのみ（コードフェンスや説明文は禁止）。JSONの値の中に半角の二重引用符（"）を含めないこと。引用したいときは「」や『』を使う。';
  const user = `曲: ${[title, artist].filter(Boolean).join(' / ') || '無題'}

## 選べる手法（かっこ内は名前。JSON には鍵をそのまま書く）
mood: ${cat.moods}
style: ${cat.styles}
layout: ${cat.layout}
enter: ${cat.enter}
exit: ${cat.exit}
hold: ${cat.hold}
bg: ${cat.bg}

## 歌詞（行番号  時刻  本文）
${rows.join('\n')}

## 仕事
1. 歌詞全体の意味と感情のアーチ（Aメロ→Bメロ→サビなど）を読む。
2. mood を1つ選ぶ（歌詞の感情に最も合うもの）。style も1つ選ぶ（mood と色彩・世界観が合うもの）。
3. 感情が強い行（サビ・クライマックス・象徴的な言葉・転換点）を中心に、全行の 1〜3 割に行ごとの指定を付ける。付けても意味のない地味な行には何も付けない。
   - layout: その行のレイアウト。意味や情景が伝わるものを選ぶ（例: 大きな一言 → huge、つぶやき → stack や type、並べたい → vcols）。
   - enter / exit: 出現・退場の動き。感情の強い行には目立つもの、静かな行には控えめなもの。
   - hold: その行で文字がどう居座るか。
   - bg: 背景グラフィック。行の情景に合うものを。
   - single: その行を1カットで見せたいとき true（短く強い言葉など）。
4. 隣接する行に同じ layout を続けない。演出は細かく指定しすぎない。
5. "reason" に演出の意図を日本語で30字くらい。

## 出力JSONの形（鍵は文字列で行番号）
{"mood":"…","style":"…","reason":"…","lines":{"12":{"layout":"…","enter":"…","exit":"…","hold":"…","bg":"…"},"5":{"single":true}}}`;
  return { sys, user };
};

/* リクエスト (OpenAI 互換 /v1/chat/completions) */
J.aiRequest = async (cfg, sys, user, signal) => {
  const base = String(cfg.base || J.AI_DEFAULTS.base).replace(/\/+$/, '');
  const res = await fetch(base + '/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key || ''}` },
    body: JSON.stringify({ model: cfg.model || J.AI_DEFAULTS.model, temperature: 0.7, max_tokens: 2400, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }] }),
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText || ''}`.trim());
  const data = await res.json();
  return (((data || {}).choices || [])[0] || {}).message || {};
};

/* 返答のパース: コードフェンスを除いて JSON を取り出し、手法の鍵を検証する。
   LLM が壊した JSON（引用符の混入・余分なカンマ・後ろに説明文）は修復を試みる */
const clean = s => String(s || '').replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
/* 文字列リテラルを数えながら、最初の { から対応する } までを取り出す */
const extract = s => {
  const start = s.indexOf('{');
  if (start < 0) return '';
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; }
    else if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') { if (--depth === 0) return s.slice(start, i + 1); }
  }
  return s.slice(start);
};
const repair = s => s.replace(/[\u201C\u201D]/g, '"').replace(/、\s*([}\]])/g, '$1').replace(/,\s*([}\]])/g, '$1');
const tryParse = s => { try { return JSON.parse(s); } catch (e) { return null; } };
/* 最後の手段: 正規表現で各フィールドを拾う（reason の中の引用符で壊れたときの救済） */
const salvage = t => {
  let inStr = false, esc = false, depth = 0;
  for (const c of t) { if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; } else if (c === '"') inStr = true; else if (c === '{') depth++; else if (c === '}') depth--; }
  return t + (inStr ? '"' : '') + '}'.repeat(Math.max(0, depth));
};
const loose = s => {
  const val = k => { const m = s.match(new RegExp('"' + k + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"')); return m ? m[1] : null; };
  const out = { mood: val('mood'), style: val('style'), reason: val('reason'), lines: {} };
  const li = s.indexOf('"lines"'), lb = li >= 0 ? s.indexOf('{', li) : -1;
  if (lb >= 0) {
    let depth = 0, inStr = false, esc = false, end = -1;
    for (let i = lb; i < s.length; i++) {
      const c = s[i];
      if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; }
      else if (c === '"') inStr = true;
      else if (c === '{') depth++;
      else if (c === '}') { if (--depth === 0) { end = i + 1; break; } }
    }
    const L = tryParse(repair(end > 0 ? s.slice(lb, end) : salvage(s.slice(lb))));
    if (L) out.lines = L;
  }
  return out;
};
const validKey = (g, k) => { const d = k && J.registry(g)[k]; return d && !d.special ? k : null; };
J.aiParse = (text, parsed) => {
  const s = clean(text);
  const raw = tryParse(extract(s)) || tryParse(repair(extract(s))) || loose(s) || (() => { throw new Error('no JSON in response'); })();
  const out = { mood: raw.mood && J.MOODS[raw.mood] && raw.mood !== 'chaos' ? raw.mood : null, style: raw.style && J.STYLES[raw.style] ? raw.style : null, reason: String(raw.reason || '').slice(0, 80), lines: {} };
  if (!out.mood) out.mood = 'emotional';
  const fits = (k, txt) => !J.LAYOUTS[k].fits || J.LAYOUTS[k].fits([...String(txt || '').replace(/\s+/g, '')].length);
  for (const [k2, v] of Object.entries(raw.lines || {})) {
    const li = +k2, L = parsed.lines[li];
    if (!L || !v || typeof v !== 'object') continue;
    const o = {};
    for (const g of ['enter', 'exit', 'hold', 'bg']) { const key = validKey(g, v[g]); if (key) o[g] = key; }
    if (!L.interlude) {
      const key = validKey('layout', v.layout);
      if (key && fits(key, L.text)) o.layout = key;
      if (v.single === true) o.single = true;
    }
    if (Object.keys(o).length) out.lines[li] = o;
  }
  return out;
};

/* 一連の流れ: 歌詞とタイミング → プロンプト → LLM → 検証済みの案。
   audio は拍グリッドのためのもの（UI の audioLike() と同じ形）。
   返答のJSONが壊れていたり・サーバーが一時的に失敗したときは1回だけやり直す */
J.aiCompose = async (project, cfg, opt = {}) => {
  const parsed = J.parseLyrics(project.lyrics);
  if (!parsed.lines.length) throw new Error('no lyrics');
  const tm = J.computeTiming(project, parsed, opt.audio || null);
  const cat = J.aiCatalog();
  const { sys, user } = J.aiBuildPrompt(project, parsed, tm, cat);
  let lastErr = null;
  for (let n = 0; n < 2; n++) {
    if (n) await new Promise(r => setTimeout(r, 900));
    try {
      const msg = await J.aiRequest(cfg, sys, user, opt.signal);
      return J.aiParse(msg.content, parsed);
    } catch (e) {
      if (e && e.name === 'AbortError') throw e;
      lastErr = e;
    }
  }
  throw lastErr;
};
})();
