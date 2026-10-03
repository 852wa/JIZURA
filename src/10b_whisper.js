/* ============================================================
   JIZURA — 歌詞の自動タイミング: the speech recognition it starts from

   Runs Whisper in the browser through Transformers.js (ONNX Runtime Web), on the
   user's own machine: the song is never uploaded. Nothing is downloaded until the
   user asks for a timing, and the download is the reason the interface has to say
   what it will cost before it starts (see MODEL_SIZES).

   Two decisions worth keeping:

   - Only the `*_timestamped` model exports are used. Whisper's plain models produce
     word timings from the decoder's cross-attention, and the Transformers.js issue
     tracker has a long history of those coming out reversed, equal to the audio
     length, or stretched across pauses; the repo that maintains them says to use the
     re-exported timestamped variants instead. It also means a version pin matters:
     this is pinned to one exact Transformers.js release, because a minor upgrade has
     changed timestamp quality before (issue #1684).

   - WebGPU when the browser has it, WASM otherwise, with the device reported back.
     WebGPU is several times faster but is still marked experimental in
     Transformers.js and has had an unfixed memory leak per audio chunk, so the
     model is released (`J.whisper.dispose`) between runs rather than kept alive.

   The result is handed to J.asrTokens / J.alignLyricTimes unchanged; this file only
   produces `{ segments: [{ text, start, end, words: [{ word, start, end }] }] }`.
   ============================================================ */
(() => {
'use strict';

/* pinned: a version bump needs the timestamps re-measured (dev/autolrc_browser_test.py) */
const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';

/* What the user is about to download, in MB: measured from the files on Hugging Face
   for the quantisation each device actually loads (dev/model_sizes.py).

   `note` is what the model is for, and the menu shows it next to the name, because the
   choice is not "bigger is better". Measured on two real songs (dev/autolrc_realsong.py):
   on the Japanese song base and small both put 84% of lines within a second, and on the
   Chinese song base is the better of the two (0.75 s median against 1.82 s). Tiny is a
   different offer: it is the one to pick when the machine is slow or the download
   matters, and on a real song it is not accurate enough on its own — the first eight
   lines of the Japanese song came out more than 20 seconds late.

   `broken` lists the devices a model cannot be timed on, found by measurement rather
   than by guessing (dev/autolrc_probe.py): on WebGPU the fp16 exports of base and small
   do not place anything in time. whisper-base_timestamped there returns almost nothing —
   for a 36 second song it produced the word "I" — and whisper-small_timestamped
   transcribes the same clip correctly but gives every word the timestamp [29.98, 29.98],
   which is worse than returning nothing because the words look right. Both models
   transcribe correctly on the CPU path, and that is where `plan` sends them. */
const MODELS = [
  { key: 'tiny', id: 'onnx-community/whisper-tiny_timestamped', label: 'Tiny', mb: { webgpu: 77, wasm: 41 }, note: 'fastest' },
  { key: 'base', id: 'onnx-community/whisper-base_timestamped', label: 'Base', mb: { webgpu: 146, wasm: 77 }, note: 'recommended', broken: ['webgpu'] },
  { key: 'small', id: 'onnx-community/whisper-small_timestamped', label: 'Small', mb: { webgpu: 485, wasm: 241 }, note: 'accurate', broken: ['webgpu'] },
];
const SAMPLE_RATE = 16000;
const WINDOW = 30;                                         // seconds per recogniser pass
const STEP = 15;                                           // half a window, so every moment is heard twice

let lib = null;                                            // the imported module
let loaded = null;                                         // { key, pipe, device }

const text16k = async (buffer) => {
  if (J.mono16k) return J.mono16k(buffer);                 // the analysis layer already resamples this way
  const OfflineAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const oc = new OfflineAC(1, Math.max(1, Math.ceil(buffer.duration * SAMPLE_RATE)), SAMPLE_RATE);
  const src = oc.createBufferSource(); src.buffer = buffer; src.connect(oc.destination); src.start();
  return (await oc.startRendering()).getChannelData(0);
};

async function library(onProgress) {
  if (lib) return lib;
  if (onProgress) onProgress({ phase: 'library' });
  const mod = await import(/* webpackIgnore: true */ TRANSFORMERS_URL);
  mod.env.allowLocalModels = false;
  mod.env.useBrowserCache = true;                          // the weights are kept by the browser after the first run
  /* a page may point the weights at a mirror of huggingface.co (dev/autolrc.html does,
     so the browser test can run against a local cache); the shipped page does not,
     and reads from Hugging Face */
  const host = typeof window !== 'undefined' && window.__JIZURA_MODEL_HOST;
  if (host) { mod.env.remoteHost = host.replace(/\/+$/, ''); mod.env.remotePathTemplate = '{model}/resolve/{revision}/'; }
  lib = mod;
  return lib;
}

const webgpu = () => typeof navigator !== 'undefined' && !!navigator.gpu;

/* Which model runs on which device, decided in one place because two callers need the
   same answer: the interface has to say how many MB will be downloaded before it starts,
   and the loader has to load exactly that.

   A model that cannot place words in time on the GPU (`broken`) is run on the CPU path
   rather than replaced by a smaller one. Replacing it would be the wrong trade twice
   over: the reason to choose a bigger model is accuracy, and the bigger models are the
   ones that work here. Measured on two real songs (dev/autolrc_realsong.py): on WebGPU
   the CPU path with base gives a median line error of 0.42 s and 84% of lines within a
   second, where tiny on the GPU gives 0.66 s and 59%; substituting tiny would have
   thrown that away without saying so. */
function plan(key) {
  const model = MODELS.find(m => m.key === key) || MODELS[0];
  const forced = typeof window !== 'undefined' && window.__JIZURA_FORCE_DEVICE;
  const want = forced || (webgpu() ? 'webgpu' : 'wasm');
  const device = (!forced && model.broken && model.broken.indexOf(want) >= 0) ? 'wasm' : want;
  return { model, device, mb: model.mb[device] };
}

async function load(key, onProgress) {
  const { model, device, mb } = plan(key);
  if (loaded && loaded.key === model.key && loaded.device === device) return loaded;
  if (loaded) { await J.whisper.dispose(); }
  const mod = await library(onProgress);
  if (onProgress) onProgress({ phase: 'model', device, model: model.key, mb });
  /* Which weights to load. On WASM, q8 (the `_quantized` files) is the default and
     works. On WebGPU it does not: measured with dev/autolrc_probe.py, `dtype: 'q8'`
     there returns fluent-looking nonsense ("Ой Monet我說 couch notrekil…") while fp16
     transcribes the same clip correctly, and the q4 decoder that this file used first
     is worse again — with whisper-base it returned the single word "I" for a 36 second
     song. WebGPU therefore loads the fp16 pair, which is a larger download, and the
     interface says so before it starts. dev/autolrc.html can force a quantisation with
     ?dtype= to re-check any of this. */
  const forced = typeof window !== 'undefined' && window.__JIZURA_FORCE_DTYPE;
  const dtype = forced ? { encoder_model: forced, decoder_model_merged: forced }
    : device === 'webgpu' ? { encoder_model: 'fp16', decoder_model_merged: 'fp16' } : { encoder_model: 'q8', decoder_model_merged: 'q8' };
  const pipe = await mod.pipeline('automatic-speech-recognition', model.id, {
    device, dtype,
    progress_callback: (info) => {
      if (!onProgress || !info) return;
      if (info.status === 'progress' && isFinite(info.progress)) onProgress({ phase: 'download', device, model: model.key, mb, progress: J.clamp(info.progress / 100) });
    },
  });
  loaded = { key: model.key, pipe, device, mod };
  return loaded;
}

/* one pass over `audio`, with word-level timestamps. The windowing is ours rather than
   the pipeline's so that progress moves, so that a long song does not sit in one huge
   tensor, and so that the step is a number this file controls.

   The window is 30 seconds and it moves 15, so every moment of the song is heard twice.
   That is not caution for its own sake: a window that opens on an instrumental intro
   comes back with a hallucinated word and nothing else — measured on two real songs
   (dev/autolrc_realsong.py), where a window covering 22 seconds of intro before the
   first sung line returned the single character "都" for the whole 30 seconds, and the
   same singing was transcribed once the window was moved so that it started later. With
   half-window steps every line is at worst near the edge of one window and near the
   middle of another. The two readings of the same moment are both kept and the
   alignment sorts them out: a phrase heard twice costs the monotone search one
   insertion, while a phrase heard not at all costs a whole line its timing. */
async function transcribe(buffer, o) {
  const opts = o || {};
  const onProgress = opts.onProgress;
  const say = (d) => { if (onProgress) onProgress(d); };
  const { pipe, device } = await load(opts.model || 'base', onProgress);
  const mono = await text16k(buffer);
  const total = mono.length / SAMPLE_RATE;
  /* the window and the step are options so dev/autolrc.html can measure what they cost */
  const win = Math.min(total, opts.window || WINDOW);
  const step = opts.step || STEP;
  const steps = Math.max(1, Math.ceil((total - win) / step) + 1);
  const segments = [];
  for (let c = 0; c < steps; c++) {
    if (opts.signal && opts.signal.aborted) throw new Error('aborted');
    const from = Math.min(c * step, Math.max(0, total - win));
    const to = Math.min(total, from + win);
    const slice = mono.subarray(Math.round(from * SAMPLE_RATE), Math.round(to * SAMPLE_RATE));
    const params = {
      return_timestamps: 'word',
      force_full_sequences: false,
      /* sung lines are quiet and fast: do not let the voice-activity gate throw them away */
      no_speech_threshold: 0.8,
    };
    if (opts.language && opts.language !== 'auto') { params.language = opts.language; params.task = 'transcribe'; }
    say({ phase: 'run', chunk: c + 1, chunks: steps, device });
    const out = await pipe(slice, params);
    const list = Array.isArray(out) ? out : [out];
    for (const r of list) {
      const chunksOut = r.chunks || (r.timestamp ? [{ text: r.text, timestamp: r.timestamp, words: r.words }] : []);
      for (const ch of chunksOut) {
        const text = String(ch.text || '').trim();
        const ts = ch.timestamp || (ch.words && ch.words.length ? [ch.words[0].start, ch.words[ch.words.length - 1].end] : null);
        if (!text || !ts || !isFinite(+ts[0])) continue;
        const words = (ch.words || []).filter(w => w && isFinite(+w.start)).map(w => ({ word: String(w.word || w.text || ''), start: +(w.start + from), end: +(w.end + from) }));
        segments.push({ text, start: +(+ts[0] + from), end: +(isFinite(+ts[1]) ? +ts[1] + from : +ts[0] + from), words });
      }
    }
  }
  /* the windows overlap by half; the same reading of the same moment, at the same
     hundredth of a second, is dropped here. Readings that differ belong to the
     alignment, which is where a transcript that repeats itself is cheap */
  segments.sort((a, b) => a.start - b.start);
  const seen = new Set();
  const out = [];
  for (const s of segments) {
    const k = s.start.toFixed(2) + '|' + s.text;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  const words = out.reduce((a, s) => a + s.words.length, 0);
  say({ phase: 'done', device, segments: out.length, words });
  return { segments: out, device, duration: total };
}

J.whisper = {
  MODELS, SAMPLE_RATE,
  available: () => typeof WebAssembly !== 'undefined',
  webgpu,
  plan,
  /* the raw result of one pipeline call, for dev/autolrc.html: the shape a model
     returns is the first thing to look at when word timestamps come out empty. The
     clip length is a dev knob because a model can behave differently on a window that
     is mostly instrumental. */
  probe: async (buffer, o) => {
    const opts = o || {};
    const { pipe, device } = await load(opts.model || 'tiny', opts.onProgress);
    const mono = await text16k(buffer);
    const slice = mono.subarray(
      Math.min(mono.length, SAMPLE_RATE * (opts.start || 0)),
      Math.min(mono.length, SAMPLE_RATE * ((opts.start || 0) + (opts.seconds || 20))));
    const params = { return_timestamps: 'word', force_full_sequences: false, no_speech_threshold: 0.8 };
    if (opts.language && opts.language !== 'auto') params.language = opts.language;
    const out = await pipe(slice, params);
    return { device, out };
  },
  /* the whole feature in one call: audio in, per-line times out, written nowhere */
  timeLyrics: async (lyrics, buffer, o) => {
    const opts = o || {};
    const lang = opts.language || J.asrLang(J.guessLyricLang(typeof lyrics === 'string' ? lyrics : (lyrics.lines || []).map(l => l.text).join('\n')));
    const asr = await transcribe(buffer, Object.assign({}, opts, { language: lang }));
    const result = J.alignLyricTimes(lyrics, asr, opts.align);
    return { result, asr, device: asr.device, language: lang };
  },
  transcribe,
  dispose: async () => {
    if (!loaded) return;
    const pipe = loaded.pipe;
    loaded = null;
    try { if (pipe && pipe.dispose) await pipe.dispose(); } catch (e) {}
  },
};
})();
