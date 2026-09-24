/* ============================================================
   JIZURA — lyric sync: fit the user's lyrics onto local Whisper word times
   Whisper only says *when* something was sung. Its text is too unreliable for
   sung lyrics to be shown (it hears 羊 as 7時), so the words on screen stay the
   user's, and each line takes the start time of the words it aligns with.
   Pure functions except toWav16k / transcribeServer (browser only).
   ============================================================ */
(() => {
'use strict';
const A = J.align = {};

/* ---------------- text normalisation ---------------- */
const KD = '〇一二三四五六七八九';
function numToKanji(n) {
  if (n === 0) return KD[0];
  let out = '';
  for (const [u, k] of [[1000, '千'], [100, '百'], [10, '十']]) {
    const d = Math.floor(n / u) % 10;
    if (d) out += (d > 1 ? KD[d] : '') + k;
  }
  return out + (n % 10 ? KD[n % 10] : '');
}
/* NFKC, digits as kanji numerals (ASR writes 15年 for 十五年), katakana as hiragana,
   and nothing but letters and digits (punctuation, spaces and JIZURA markup dropped) */
A.normalize = s => String(s || '').normalize('NFKC').toLowerCase()
  .replace(/\d{1,4}/g, d => numToKanji(+d))
  .replace(/[\u30a1-\u30f6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
  .replace(/[^\p{L}\p{N}ー]/gu, '');

const SMALL = { 'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お', 'っ': 'つ', 'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ', 'ゎ': 'わ' };
const baseChar = c => { const d = c.normalize('NFD').replace(/[\u3099\u309a]/g, ''); return SMALL[d] || d; };

/* ---------------- reading Whisper output ---------------- */
/* Phrases Whisper invents over instrumental passages (it was trained on subtitled video). */
A.HALLUCINATIONS = ['ご視聴ありがとうございました', 'ご視聴ありがとうございます', '最後までご視聴いただきありがとうございました',
  'チャンネル登録をお願いします', 'チャンネル登録', '字幕視聴ありがとうございました', 'thankyouforwatching', 'thanksforwatching'];

/* Accepts the JSON of: whisper.cpp server (verbose_json) and CLI (-oj / -ojf), openai-whisper,
   mlx-whisper, faster-whisper (segments[].words[]), transformers.js ({chunks}), or a bare word list.
   Returns { segments: [{ start, end, text, noSpeech, logprob, words: [{ w, start, end }] }] }. */
A.readWhisperJSON = (obj) => {
  if (typeof obj === 'string') obj = JSON.parse(obj);
  const W = (w, start, end) => ({ w: String(w == null ? '' : w), start: +start, end: +(end ?? start) });
  let segs = null;
  if (obj && Array.isArray(obj.segments)) {
    segs = obj.segments.map(s => ({
      start: +s.start, end: +s.end, text: s.text || '', noSpeech: s.no_speech_prob ?? 0, logprob: s.avg_logprob ?? 0,
      words: Array.isArray(s.words) && s.words.length ? s.words.map(w => W(w.word ?? w.text, w.start, w.end)) : [W(s.text, s.start, s.end)],
    }));
  } else if (obj && Array.isArray(obj.transcription)) {
    segs = obj.transcription.map(s => {
      const o = s.offsets || {}, t0 = (o.from || 0) / 1000, t1 = (o.to || 0) / 1000;
      const toks = (s.tokens || []).filter(k => k.text && !/^\[_/.test(k.text) && k.offsets);
      const clean = toks.length && toks.every(k => !k.text.includes('\uFFFD'));
      return { start: t0, end: t1, text: s.text || '', noSpeech: 0, logprob: 0,
        words: clean ? toks.map(k => W(k.text, k.offsets.from / 1000, k.offsets.to / 1000)) : [W(s.text, t0, t1)] };
    });
  } else if (obj && Array.isArray(obj.chunks)) {
    segs = [{ start: 0, end: 0, text: obj.text || '', noSpeech: 0, logprob: 0,
      words: obj.chunks.map(c => W(c.text, c.timestamp[0], c.timestamp[1] ?? c.timestamp[0])) }];
  } else if (Array.isArray(obj)) {
    segs = [{ start: 0, end: 0, text: '', noSpeech: 0, logprob: 0, words: obj.map(w => W(w.word ?? w.text ?? w.w, w.start, w.end)) }];
  }
  if (!segs) throw new Error('unrecognised Whisper JSON');
  // whisper.cpp with -dtw: the token's DTW time (centiseconds) is the reliable one; its start/end can
  // stretch across an instrumental break. Each word then runs to the next word's DTW time.
  if (obj.segments || obj.transcription) (obj.segments || obj.transcription).forEach((s, k) => {
    const src = obj.segments ? (s.words || []) : (s.tokens || []).filter(t => t.text && !/^\[_/.test(t.text) && t.offsets);
    const ws = segs[k].words;
    if (src.length !== ws.length || !src.some(t => t.t_dtw >= 0)) return;
    src.forEach((t, q) => { if (t.t_dtw >= 0) ws[q].start = t.t_dtw / 100; });
    ws.forEach((w, q) => { w.end = q + 1 < ws.length ? Math.max(w.start, ws[q + 1].start) : Math.max(w.start, w.end); });
  });
  segs.forEach(s => { s.words = s.words.filter(w => isFinite(w.start)); });
  return { segments: segs.filter(s => s.words.length) };
};

/* Drop what is not singing: known hallucinated phrases, looping output ("e-e-e-e…"),
   and segments Whisper itself rated as silence. */
A.filterSegments = (segments) => segments.filter(s => {
  let n = A.normalize(s.words.map(w => w.w).join(''));
  if (!n) return false;
  for (const h of A.HALLUCINATIONS) n = n.split(A.normalize(h)).join('');
  if (n.length <= 1) return false;
  if (/(.{1,3})\1{5,}/u.test(n)) return false;
  if (s.noSpeech > 0.6 && s.logprob < -1) return false;
  return true;
});

/* ---------------- alignment ---------------- */
/* Global alignment of the lyric characters to the heard characters (Needleman–Wunsch):
   same character +2, same kana ignoring dakuten / small kana +1, otherwise −1; a skipped
   character costs 1, except heard characters before the first and after the last lyric
   (intro / outro chatter is free). Each heard character carries its word's time, spread
   evenly across the word. */
function align(lc, ac) {
  const n = lc.length, m = ac.length, W = m + 1;
  const H = new Int32Array((n + 1) * W), T = new Uint8Array((n + 1) * W);
  for (let i = 1; i <= n; i++) { H[i * W] = -i; T[i * W] = 2; }
  for (let j = 1; j <= m; j++) T[j] = 3;                      // leading heard chars: free
  for (let i = 1; i <= n; i++) {
    const a = lc[i - 1].c, ab = lc[i - 1].b;
    for (let j = 1; j <= m; j++) {
      const b = ac[j - 1];
      const s = a === b.c ? 2 : ab === b.b ? 1 : -1;
      let best = H[(i - 1) * W + j - 1] + s, tr = 1;
      const up = H[(i - 1) * W + j] - 1; if (up > best) { best = up; tr = 2; }
      const lf = H[i * W + j - 1] - (i === n ? 0 : 1); if (lf > best) { best = lf; tr = 3; }   // trailing heard chars: free
      H[i * W + j] = best; T[i * W + j] = tr;
    }
  }
  const pair = new Int32Array(n).fill(-1);                    // lyric char -> heard char
  let i = n, j = m;
  while (i > 0 || j > 0) {
    const tr = T[i * W + j];
    if (tr === 1) { if (lc[i - 1].c === ac[j - 1].c || lc[i - 1].b === ac[j - 1].b) pair[i - 1] = j - 1; i--; j--; }
    else if (tr === 2) i--;
    else j--;
  }
  return pair;
}

/* lines: lyric strings (J.parseLyrics(...).lines[i].text). whisper: the result of readWhisperJSON.
   opts.lead: seconds to show a line before it is sung (covers the entrance animation).
   Returns { times, lines: [{ t, conf: 'ok' | 'weak' | 'missing', ratio }], unmatched: [{ start, end, text }] }.
   'weak' and 'missing' lines are placed between their aligned neighbours; 'missing' means
   almost none of the line was heard — usually a line the recording does not sing. */
A.alignLyrics = (lines, whisper, opts = {}) => {
  const lead = opts.lead ?? 0.15, gapMin = opts.minGap ?? 0.3;
  const segs = A.filterSegments(whisper.segments || []);
  const ac = [];
  segs.forEach(s => s.words.forEach(w => {
    const k = [...A.normalize(w.w)];
    k.forEach((c, q) => ac.push({ c, b: baseChar(c), t: w.start + (Math.max(w.end, w.start) - w.start) * q / k.length, w }));
  }));
  const lc = [], lens = [];
  lines.forEach((text, li) => { const k = [...A.normalize(text)]; lens.push(k.length); k.forEach((c, p) => lc.push({ c, b: baseChar(c), li, p })); });
  const pair = align(lc, ac);

  // per line: matched share, and a start estimated from its earliest matched characters
  const out = lines.map((_, li) => ({ li, t: null, conf: 'missing', ratio: 0 }));
  const byLine = lines.map(() => []);
  lc.forEach((x, k) => { if (pair[k] >= 0) byLine[x.li].push({ p: x.p, t: ac[pair[k]].t }); });
  byLine.forEach((ms, li) => {
    const r = lens[li] ? ms.length / lens[li] : 0;
    out[li].ratio = +r.toFixed(2);
    if (!ms.length || r < 0.25) return;
    const span = ms[ms.length - 1].p - ms[0].p;
    const cd = span >= 3 ? J.clamp((ms[ms.length - 1].t - ms[0].t) / span, 0.08, 0.6) : 0.2;
    const est = ms.slice(0, 3).map(x => x.t - x.p * cd).sort((a, b) => a - b);
    out[li].t = est[Math.floor(est.length / 2)];
    out[li].conf = r >= 0.5 ? 'ok' : 'weak';
  });
  // keep anchors in time order: a line that jumps back is re-placed like an unheard one
  let last = -Infinity;
  for (const o of out) {
    if (o.t == null) continue;
    if (o.t < last + gapMin) { o.t = null; if (o.conf === 'ok') o.conf = 'weak'; continue; }
    last = o.t;
  }
  // place lines without an anchor between their neighbours, in proportion to their length
  const anchors = out.filter(o => o.t != null);
  for (let li = 0; li < out.length; li++) {
    if (out[li].t != null) continue;
    let a = li - 1; while (a >= 0 && out[a].t == null) a--;
    let b = li + 1; while (b < out.length && out[b].t == null) b++;
    const w = k => Math.max(1, lens[k]);
    if (a >= 0 && b < out.length) {
      let tot = 0, acc = 0; for (let k = a; k < b; k++) tot += w(k);
      for (let k = a; k < li; k++) acc += w(k);
      out[li].t = out[a].t + (out[b].t - out[a].t) * acc / tot;
    } else if (a >= 0) {
      let acc = 0; for (let k = a; k < li; k++) acc += w(k);
      out[li].t = out[a].t + acc * 0.25;
    } else if (b < out.length) {
      let acc = 0; for (let k = li; k < b; k++) acc += w(k);
      out[li].t = Math.max(0, out[b].t - acc * 0.25);
    } else out[li].t = li * 2;
  }
  const times = out.map(o => Math.max(0, +(o.t - lead).toFixed(3)));
  for (let k = 1; k < times.length; k++) if (times[k] <= times[k - 1]) times[k] = +(times[k - 1] + 0.05).toFixed(3);

  // heard passages that no lyric line took: repeats or ad-libs missing from the lyrics
  const used = new Uint8Array(ac.length);
  pair.forEach(j => { if (j >= 0) used[j] = 1; });
  const unmatched = [];
  let run = null;
  const flush = () => { if (run && run.n >= 4) unmatched.push({ start: +run.start.toFixed(2), end: +run.end.toFixed(2), text: run.words.map(w => w.w).join('').trim() }); run = null; };
  ac.forEach((x, j) => {
    if (used[j]) { flush(); return; }
    if (!run) run = { start: x.t, end: x.t, n: 0, words: [] };
    run.end = Math.max(run.end, x.w.end); run.n++;
    if (run.words[run.words.length - 1] !== x.w) run.words.push(x.w);
  });
  flush();
  return { times, lines: out.map((o, k) => ({ t: times[k], conf: o.conf, ratio: o.ratio })), unmatched,
    stats: { lyricChars: lc.length, heardChars: ac.length, anchors: anchors.length, segments: segs.length } };
};

/* ---------------- helpers for the editor ---------------- */
A.fmtLRC = t => { const m = Math.floor(t / 60), s = t - m * 60; return `[${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}]`; };
A.toLRC = (texts, times) => texts.map((s, i) => A.fmtLRC(times[i]) + s).join('\n') + '\n';

/* the language to ask Whisper for, from the lyrics' script */
A.guessLang = text => {
  const s = String(text || '');
  if (/[\u3040-\u30ff]/.test(s)) return 'ja';
  if (/[\uac00-\ud7af]/.test(s)) return 'ko';
  if (/[\u4e00-\u9fff]/.test(s)) return 'zh';
  return 'auto';
};

/* AudioBuffer -> 16 kHz mono 16-bit WAV (what Whisper consumes) */
A.toWav16k = async (buffer, sr = 16000) => {
  const oc = new OfflineAudioContext(1, Math.max(1, Math.ceil(buffer.duration * sr)), sr);
  const src = oc.createBufferSource(); src.buffer = buffer; src.connect(oc.destination); src.start(0);
  const pcm = (await oc.startRendering()).getChannelData(0);
  const dv = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const str = (o, s) => { for (let k = 0; k < s.length; k++) dv.setUint8(o + k, s.charCodeAt(k)); };
  str(0, 'RIFF'); dv.setUint32(4, 36 + pcm.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, sr, true);
  dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); str(36, 'data'); dv.setUint32(40, pcm.length * 2, true);
  for (let k = 0; k < pcm.length; k++) dv.setInt16(44 + k * 2, J.clamp(pcm[k], -1, 1) * 0x7fff, true);
  return new Blob([dv], { type: 'audio/wav' });
};

/* POST to a Whisper server on this computer. The API is whisper.cpp's `whisper-server`
   (/inference, multipart); tools/jizura_whisper_server.py speaks the same protocol. */
A.transcribeServer = async (url, wav, { language, signal } = {}) => {
  const fd = new FormData();
  fd.append('file', wav, 'audio.wav');
  fd.append('response_format', 'verbose_json');
  fd.append('temperature', '0');
  if (language && language !== 'auto') fd.append('language', language);
  const res = await fetch(String(url).replace(/\/+$/, '') + '/inference', { method: 'POST', body: fd, signal });
  if (!res.ok) {
    let m = 'HTTP ' + res.status;
    try { const j = await res.json(); if (j && j.error) m += ': ' + j.error; } catch (e) {}
    const err = new Error(m); err.server = true; throw err;
  }
  return res.json();
};
})();
