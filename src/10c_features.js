/* ============================================================
   JIZURA — 歌詞の自動タイミング: the audio side of it

   This does not try to find where the lyrics are. On a full mix the instruments
   fill the same band as the voice, and a test on a real song (see
   dev/autolrc_test.js and the notes in the PR) showed that a band-energy voice
   detector finds 35 "phrases" for 64 lyric lines and that onsets fire 4.6 times
   as often as syllables. Timing has to come from what was sung, not from what
   the mix does.

   So what is here is only the two things the mix is genuinely good for:
     - singingPower: is anyone singing here at all (used to reject a line start
       that landed in an instrumental section, and to hand the alignment a
       "nothing was sung here" prior);
     - onsets: where a syllable attack is (used to nudge a start by a few
       tenths of a second onto the attack, never to invent one).

   Cheap on purpose: mono 16 kHz, 40 ms frames at 100 Hz, one 512-point FFT per
   frame, no mel filter bank and no model. A 4-minute song is a fraction of a
   second of work even on a slow laptop.
   ============================================================ */
(() => {
'use strict';

const RATE = 100, FFT = 512;

/* mono 16 kHz copy of an AudioBuffer: the analysis rate, and the rate a speech
   recogniser wants anyway */
J.mono16k = async (buffer) => {
  const ctx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, Math.max(1, Math.ceil(buffer.duration * 16000)), 16000);
  const src = ctx.createBufferSource(); src.buffer = buffer;
  src.connect(ctx.destination); src.start();
  const out = await ctx.startRendering();
  return out.getChannelData(0);
};

/* in-place radix-2 FFT magnitude of one 512-sample frame (real input) */
const cosT = new Float32Array(FFT / 2), sinT = new Float32Array(FFT / 2);
for (let i = 0; i < FFT / 2; i++) { cosT[i] = Math.cos(-2 * Math.PI * i / FFT); sinT[i] = Math.sin(-2 * Math.PI * i / FFT); }
const re = new Float32Array(FFT), im = new Float32Array(FFT);
function spectrum(frame, mag) {
  for (let i = 0; i < FFT; i++) { re[i] = frame[i] || 0; im[i] = 0; }
  for (let i = 1, j = 0; i < FFT; i++) {                     // bit reversal
    let bit = FFT >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { const a = re[i]; re[i] = re[j]; re[j] = a; const b = im[i]; im[i] = im[j]; im[j] = b; }
  }
  for (let len = 2; len <= FFT; len <<= 1) {
    const half = len >> 1, step = FFT / len;
    for (let i = 0; i < FFT; i += len) {
      for (let k = 0; k < half; k++) {
        const c = cosT[k * step], s = sinT[k * step];
        const xr = re[i + k + half] * c - im[i + k + half] * s;
        const xi = re[i + k + half] * s + im[i + k + half] * c;
        re[i + k + half] = re[i + k] - xr; im[i + k + half] = im[i + k] - xi;
        re[i + k] += xr; im[i + k] += xi;
      }
    }
  }
  for (let i = 0; i < mag.length; i++) { const a = re[i], b = im[i]; mag[i] = Math.sqrt(a * a + b * b); }
}

/* everything the aligner can use about the audio.
   Returns null when the audio is too short to say anything. */
J.audioFeatures = (mono, sampleRate) => {
  const sr = sampleRate || 16000, hop = Math.round(sr / RATE), n = Math.floor(mono.length / hop) - 8;
  if (n < 20) return null;
  const win = new Float32Array(FFT);
  for (let i = 0; i < FFT; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (FFT - 1));
  const mag = new Float32Array(FFT / 2 + 1);
  const binHz = sr / FFT;
  const loBin = Math.max(1, Math.round(180 / binHz)), hiBin = Math.min(mag.length - 1, Math.round(4200 / binHz));
  const voice = new Float32Array(n), flat = new Float32Array(n), flux = new Float32Array(n), ac = new Float32Array(n);
  const frame = new Float32Array(FFT);
  let prev = new Float32Array(mag.length);
  for (let f = 0; f < n; f++) {
    const at = f * hop;
    for (let i = 0; i < FFT; i++) frame[i] = (mono[at + i] || 0) * win[i];
    /* frame energy, and how much of it sits in the band a voice lives in:
       a low-passed copy of the frame keeps only 0..~700 Hz, so subtracting it
       from the frame leaves the band above it — cheaper than a filter bank */
    let e = 0, lo = 0, prevLo = 0;
    for (let i = 0; i < FFT; i++) { const x = frame[i]; e += x * x; const y = 0.885 * (prevLo + x - (i ? frame[i - 1] : 0)); prevLo = y; lo += y * y; }
    voice[f] = Math.sqrt(Math.max(0, e - lo) / FFT);
    spectrum(frame, mag);
    let sum = 0, logSum = 0, band = 0, all = 0;
    for (let i = loBin; i <= hiBin; i++) band += mag[i] * mag[i];
    for (let i = 1; i < mag.length; i++) { const p = mag[i] * mag[i] + 1e-12; sum += p; logSum += Math.log(p); all++; }
    flat[f] = Math.exp(logSum / all) / (sum / all + 1e-12);
    let d = 0;
    for (let i = loBin; i <= hiBin; i++) { const v = mag[i]; if (v > prev[i]) d += v - prev[i]; prev[i] = v; }
    flux[f] = d / (band + 1e-6) * 1000;
    ac[f] = e > 1e-9 ? Math.sqrt(band / e) : 0;            // share of the frame that is voice-band
  }
  /* singing power: voice-band share, sharpened by how tonal (not noise-like) the frame is.
     Smoothed over ~120 ms so a single syllable does not read as a section. */
  const k = Math.max(1, Math.round(0.12 * RATE));
  const power = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    let a = 0, c = 0;
    for (let j = Math.max(0, f - k); j <= Math.min(n - 1, f + k); j++) { a += voice[j]; c++; }
    const local = a / c;
    power[f] = local * (0.35 + 0.65 * J.clamp(1 - flat[f] * 6));
  }
  const p95 = percentile(power, 0.95) || 1;
  for (let f = 0; f < n; f++) power[f] /= p95;
  /* onsets: rise of the voice-band spectrum against its own recent average, so a
     loud chorus and a quiet verse produce comparable numbers */
  const w = Math.max(2, Math.round(0.4 * RATE)), onset = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    let m = 0, c = 0;
    for (let j = Math.max(0, f - w); j < f; j++) { m += flux[j]; c++; }
    onset[f] = Math.max(0, flux[f] - (c ? m / c : 0));
  }
  const o95 = percentile(onset, 0.98) || 1;
  for (let f = 0; f < n; f++) onset[f] = J.clamp(onset[f] / o95);
  const silence = silenceFloor(power, n);
  /* where the singing starts: everything a recogniser reports before this is its own
     invention (Whisper reliably emits one stray word at 0.00 s on a clip that opens
     with an instrumental). The gate is only applied when most of the clip is singing,
     so a song that opens quietly is not thrown away. */
  let first = 0;
  while (first < n - 1 && silence[first]) first++;
  let quiet = 0;
  for (let f = 0; f < n; f++) if (silence[f]) quiet++;
  return { rate: RATE, frames: n, power, onset, silence, firstVoice: quiet < n * 0.75 ? first / RATE : 0, quiet };
};

function percentile(arr, q) {
  const s = Array.from(arr).sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))];
}
/* Frames that are clearly below the singing level of this song: where a long stretch of
   them sits, a line that nothing matched probably belongs (a prelude or an interlude),
   and a recogniser's stray word before the singing starts can be recognised as one.

   The threshold is a share of the song's own 90th percentile rather than an absolute
   level. An absolute one was tried first and does not travel: the quiet bed of the
   synthetic test sample sits at four times what a pure tone does, so the same constant
   called one clip silent everywhere and the other nowhere. */
function silenceFloor(power, n) {
  const p90 = percentile(power, 0.9) || 1;
  const thr = p90 * 0.35;
  const step = 5, q = Math.max(1, Math.round(1.5 * RATE / step)), m = Math.ceil(n / step);
  const coarse = new Float32Array(m);
  for (let i = 0; i < m; i++) {
    let a = 0, c = 0;
    for (let j = i * step; j < Math.min(n, (i + 1) * step); j++) { a += power[j]; c++; }
    coarse[i] = c ? a / c : 0;
  }
  const med = new Float32Array(m);
  for (let i = 0; i < m; i++) {
    const s = [];
    for (let j = Math.max(0, i - q); j <= Math.min(m - 1, i + q); j++) s.push(coarse[j]);
    s.sort((a, b) => a - b);
    med[i] = s[s.length >> 1];
  }
  const out = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    const i = Math.min(m - 1, Math.floor(f / step));
    out[f] = med[i] < thr ? 1 : 0;
  }
  return out;
}
})();
