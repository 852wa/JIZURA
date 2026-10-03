/* Regression checks for the audio feature layer.
   usage: node --test dev/autolrc_features_test.js

   The features have no data source of their own — they are a function of a mono signal
   — so the fixtures here are signals this file builds, in the two shapes that matter: a
   clip that opens with an instrumental and then sings, and a clip that sings
   throughout. What is asserted is what the alignment has to be able to trust: where the
   singing starts, and which stretches are below the singing level. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { load } = require('./jizura_src.js');

const J = load();
const SR = 16000;

/* a quiet backing bed, the way a real recording never has digital silence */
function bed(n, amp) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = amp * (0.6 * Math.sin(2 * Math.PI * 110 * i / SR) + 0.4 * Math.sin(2 * Math.PI * 220 * i / SR + 0.7));
  }
  return out;
}
/* something voice-shaped: a harmonic stack with an amplitude envelope, so the
   per-frame features have something to work with */
function voice(n, amp) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = 0.55 + 0.45 * Math.sin(2 * Math.PI * 4 * t);
    out[i] = amp * env * (Math.sin(2 * Math.PI * 220 * t) + 0.5 * Math.sin(2 * Math.PI * 440 * t) + 0.25 * Math.sin(2 * Math.PI * 660 * t));
  }
  return out;
}
function clip(parts) {
  const n = parts.reduce((a, p) => a + p.n, 0);
  const out = new Float32Array(n);
  let at = 0;
  for (const p of parts) { out.set(p.sig, at); at += p.n; }
  return out;
}

test('an instrumental opening is measured as below the singing level', () => {
  const prelude = 4, total = 16;
  const mono = clip([
    { sig: bed(prelude * SR, 0.02), n: prelude * SR },
    { sig: voice((total - prelude) * SR, 0.5), n: (total - prelude) * SR },
  ]);
  const F = J.audioFeatures(mono, SR);
  assert.ok(F, 'features are produced');
  assert.ok(F.frames > total * F.rate * 0.9, `frames ${F.frames}`);
  assert.ok(F.firstVoice >= prelude - 0.4 && F.firstVoice <= prelude + 0.4, `singing starts at ${F.firstVoice}s, expected ~${prelude}s`);
  assert.ok(F.quiet > F.rate, `the prelude is marked quiet (${F.quiet} frames)`);
  assert.ok(F.quiet < F.frames * 0.6, `most of the clip is not quiet (${F.quiet}/${F.frames})`);
});

test('a clip that sings throughout is not called quiet anywhere', () => {
  const mono = voice(12 * SR, 0.5);
  const F = J.audioFeatures(mono, SR);
  assert.ok(F.quiet < F.frames * 0.25, `quiet frames ${F.quiet} of ${F.frames}`);
  assert.strictEqual(F.firstVoice, 0);
});

test('the threshold follows the loudness of the clip, not a fixed level', () => {
  /* the same shape at two very different levels has to come out the same way: this is
     what an absolute threshold got wrong, and why the shapes above are built relative */
  const build = (amp) => clip([
    { sig: bed(4 * SR, amp * 0.04), n: 4 * SR },
    { sig: voice(12 * SR, amp), n: 12 * SR },
  ]);
  for (const amp of [0.2, 0.8]) {
    const F = J.audioFeatures(build(amp), SR);
    assert.ok(F.firstVoice >= 3.6 && F.firstVoice <= 4.4, `at amplitude ${amp} the singing starts at ${F.firstVoice}s`);
  }
});

test('a clip too short to say anything returns null', () => {
  assert.strictEqual(J.audioFeatures(new Float32Array(SR / 10), SR), null);
});
