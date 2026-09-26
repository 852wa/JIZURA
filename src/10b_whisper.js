/* ============================================================
   JIZURA — in-browser Whisper transcription (Transformers.js)
   ============================================================ */
(() => {
'use strict';

const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';
const MODELS = Object.freeze({
  base: { id: 'onnx-community/whisper-base', label: 'Base' },
  tiny: { id: 'onnx-community/whisper-tiny', label: 'Tiny' },
  small: { id: 'onnx-community/whisper-small', label: 'Small' },
});
const SAMPLE_RATE = 16000;
let libraryPromise = null;
const loaded = new Map();

function notify(fn, detail) { if (typeof fn === 'function') fn(detail); }

async function library(onProgress) {
  if (!libraryPromise) {
    notify(onProgress, { phase: 'library' });
    libraryPromise = import(TRANSFORMERS_URL).then(mod => {
      mod.env.allowLocalModels = false;
      mod.env.useBrowserCache = true;
      if ('useWasmCache' in mod.env) mod.env.useWasmCache = true;
      return mod;
    }).catch(err => { libraryPromise = null; throw err; });
  }
  return libraryPromise;
}

function modelProgress(onProgress, device) {
  return info => {
    if (!info) return;
    if (info.status === 'progress_total' && Number.isFinite(info.progress)) {
      notify(onProgress, { phase: 'model-progress', device, progress: info.progress });
    } else if (info.status === 'progress' && Number.isFinite(info.progress)) {
      notify(onProgress, { phase: 'model-file-progress', device, progress: info.progress, file: info.file || '' });
    } else if (info.status === 'initiate' || info.status === 'download') {
      notify(onProgress, { phase: 'model-download', device, file: info.file || '' });
    }
  };
}

async function createPipeline(mod, model, device, onProgress) {
  const options = {
    device,
    progress_callback: modelProgress(onProgress, device),
  };
  // Keep the first version light enough for typical desktop browsers.
  options.dtype = device === 'webgpu'
    ? { encoder_model: 'fp16', decoder_model_merged: 'q4' }
    : { encoder_model: 'q8', decoder_model_merged: 'q8' };
  return mod.pipeline('automatic-speech-recognition', model.id, options);
}

async function loadModel(key, onProgress) {
  const model = MODELS[key] || MODELS.base;
  if (loaded.has(model.id)) {
    const cached = await loaded.get(model.id);
    notify(onProgress, { phase: 'model-ready', device: cached.device, cached: true });
    return cached;
  }
  const job = (async () => {
    let mod;
    try { mod = await library(onProgress); }
    catch (err) { throw whisperError('MODEL_LOAD_FAILED', 'library', err); }
    if (typeof navigator !== 'undefined' && navigator.gpu) {
      notify(onProgress, { phase: 'model-loading', device: 'webgpu' });
      try {
        const pipe = await createPipeline(mod, model, 'webgpu', onProgress);
        return { pipe, device: 'webgpu', model: model.id };
      } catch (err) {
        console.warn('[JIZURA Whisper] WebGPU initialization failed; retrying with WASM.', err);
        notify(onProgress, { phase: 'webgpu-fallback', device: 'wasm' });
      }
    } else {
      notify(onProgress, { phase: 'webgpu-unavailable', device: 'wasm' });
    }
    try {
      notify(onProgress, { phase: 'model-loading', device: 'wasm' });
      const pipe = await createPipeline(mod, model, 'wasm', onProgress);
      return { pipe, device: 'wasm', model: model.id };
    } catch (err) {
      throw whisperError('MODEL_LOAD_FAILED', 'model', err);
    }
  })();
  loaded.set(model.id, job);
  try {
    const result = await job;
    notify(onProgress, { phase: 'model-ready', device: result.device, cached: false });
    return result;
  } catch (err) {
    loaded.delete(model.id);
    throw err;
  }
}

function normalizeSingingVoice(audio) {
  let mean = 0;
  for (let i = 0; i < audio.length; i++) mean += audio[i];
  mean /= Math.max(1, audio.length);
  let peak = 0, energy = 0;
  for (let i = 0; i < audio.length; i++) {
    const sample = audio[i] - mean;
    peak = Math.max(peak, Math.abs(sample)); energy += sample * sample;
  }
  const rms = Math.sqrt(energy / Math.max(1, audio.length));
  if (peak < 1e-5) return audio;
  const rmsGain = rms > 0 ? 0.12 / rms : 1;
  const gain = Math.min(4, 0.98 / peak, Math.max(1, rmsGain));
  const output = new Float32Array(audio.length);
  for (let i = 0; i < audio.length; i++) output[i] = Math.max(-1, Math.min(1, (audio[i] - mean) * gain));
  return output;
}

async function mono16k(audioBuffer) {
  if (!audioBuffer || !audioBuffer.numberOfChannels || !audioBuffer.length) throw whisperError('NO_AUDIO', 'audio');
  const targetLength = Math.max(1, Math.ceil(audioBuffer.duration * SAMPLE_RATE));
  const OfflineAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (OfflineAC) {
    try {
      const ctx = new OfflineAC(1, targetLength, SAMPLE_RATE);
      const src = ctx.createBufferSource();
      const highpass = ctx.createBiquadFilter(), lowpass = ctx.createBiquadFilter(), compressor = ctx.createDynamicsCompressor();
      highpass.type = 'highpass'; highpass.frequency.value = 90; highpass.Q.value = 0.7;
      lowpass.type = 'lowpass'; lowpass.frequency.value = 7400; lowpass.Q.value = 0.7;
      compressor.threshold.value = -30; compressor.knee.value = 18; compressor.ratio.value = 3;
      compressor.attack.value = 0.003; compressor.release.value = 0.25;
      src.buffer = audioBuffer; src.connect(highpass); highpass.connect(lowpass); lowpass.connect(compressor); compressor.connect(ctx.destination); src.start();
      const rendered = await ctx.startRendering();
      return normalizeSingingVoice(rendered.getChannelData(0));
    } catch (err) {
      console.warn('[JIZURA Whisper] OfflineAudioContext resampling failed; using linear resampling.', err);
    }
  }
  const channels = audioBuffer.numberOfChannels;
  const sourceLength = audioBuffer.length;
  const sourceRate = audioBuffer.sampleRate;
  const source = Array.from({ length: channels }, (_, c) => audioBuffer.getChannelData(c));
  const output = new Float32Array(targetLength);
  const ratio = sourceRate / SAMPLE_RATE;
  for (let i = 0; i < targetLength; i++) {
    const pos = Math.min(sourceLength - 1, i * ratio), a = Math.floor(pos), b = Math.min(sourceLength - 1, a + 1), f = pos - a;
    let sample = 0;
    for (let c = 0; c < channels; c++) sample += (source[c][a] * (1 - f) + source[c][b] * f) / channels;
    output[i] = sample;
  }
  return normalizeSingingVoice(output);
}

function timestamp(seconds) {
  const hundredths = Math.max(0, Math.round((Number(seconds) || 0) * 100));
  const mm = Math.floor(hundredths / 6000), ss = Math.floor(hundredths / 100) % 60, hs = hundredths % 100;
  return `[${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(hs).padStart(2, '0')}]`;
}

function cleanText(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }

function toLrc(result) {
  const rows = [], chunks = result && Array.isArray(result.chunks) ? result.chunks : [];
  for (const chunk of chunks) {
    const text = cleanText(chunk && chunk.text), time = chunk && chunk.timestamp;
    if (!text || !Array.isArray(time) || !Number.isFinite(+time[0])) continue;
    const row = timestamp(+time[0]) + text;
    if (rows[rows.length - 1] !== row) rows.push(row);
  }
  const whole = cleanText(result && result.text);
  if (!rows.length && whole) rows.push(timestamp(0) + whole);
  return rows.join('\n');
}

function whisperError(code, stage, cause) {
  const err = new Error(code); err.code = code; err.stage = stage; if (cause) err.cause = cause; return err;
}

async function transcribe(audioBuffer, options = {}) {
  const onProgress = options.onProgress;
  let runtime;
  try { runtime = await loadModel(options.model || 'base', onProgress); }
  catch (err) { throw err && err.code ? err : whisperError('MODEL_LOAD_FAILED', 'model', err); }
  let audio;
  try {
    notify(onProgress, { phase: 'audio-preparing', device: runtime.device });
    audio = await mono16k(audioBuffer);
  } catch (err) {
    throw err && err.code ? err : whisperError('AUDIO_UNSUPPORTED', 'audio', err);
  }
  const params = {
    task: 'transcribe',
    return_timestamps: true,
    chunk_length_s: 30,
    stride_length_s: 5,
    force_full_sequences: false,
    // Be less eager to discard quiet/fast sung phrases as silence.
    no_speech_threshold: 0.8,
  };
  if (options.language && options.language !== 'auto') params.language = options.language;
  notify(onProgress, { phase: 'transcribing', device: runtime.device });
  try {
    const result = await runtime.pipe(audio, params);
    const lrc = toLrc(result);
    if (!lrc) throw whisperError('EMPTY_RESULT', 'transcribe');
    notify(onProgress, { phase: 'complete', device: runtime.device });
    return { result, lrc, device: runtime.device, sampleRate: SAMPLE_RATE };
  } catch (err) {
    throw err && err.code ? err : whisperError('TRANSCRIPTION_FAILED', 'transcribe', err);
  }
}

J.whisper = { MODELS, SAMPLE_RATE, transcribe, toLrc, timestamp, mono16k };
})();
