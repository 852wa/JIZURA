/* JIZURA pack: karaoke — 逐字 (word by word) lyrics. A line that was given word-by-word timestamps keeps its words
   as written, and this layout lights them as the voice reaches them: the words still to come wait in the sub
   colour, the word being sung takes the lyric colour (and a lift), the sung ones stay lit. The times come from the
   lyric line itself (J.parseLyrics → cut.karaoke) — the audio is never analysed a second time. */
(() => {
'use strict';
const E = J.E;

J.register('layout', 'karaoke', {
  name: 'カラオケ', tags: ['pop', 'emotional', 'graphic'], karaoke: true, w: 2, fits: n => n <= 60,
  plan: (rng, cut, st) => ({
    font: rng.pick(J.fontsOf(st, rng.chance(0.6) ? ['display'] : ['serif'])),
    lead: rng.pick([1.16, 1.24, 1.32]), track: rng.range(0.02, 0.1),
    per: cut && cut.text && [...cut.text].length > 14 ? rng.pick([8, 10, 12]) : 0,     // wrap long lines; 0 = as written
    rise: rng.pick([0, 0, 0.06, 0.1]),                                                 // the lift of the word being sung
    pop: rng.chance(0.5),                                                              // …and a small size bump
    bar: rng.chance(0.6),
    sub: rng.chance(0.3),
  }),
  render(env) {
    const { W, H, sc } = env, cut = env.cut, P = cut.params || {}, st = env.st;
    const text = P.per ? J.splitLines(cut.text, W < H ? 5 : P.per) : String(cut.text || '').replace(/\s+/g, ' ');
    const size = Math.min(J.fitSize(text, P.font, W * 0.86, H * 0.52, { track: P.track, lead: P.lead }), H * 0.3);
    const x = W / 2, y = H / 2;
    const it = { text, font: P.font, size, x, y, track: P.track, lead: P.lead };
    if (P.bar) {                                        // a hairline the highlight runs along
      const m = J.measure(it), e = E.outExpo(env.pIn * 1.3 - 0.2) * (1 - E.inCubic(env.pOut));
      if (e > 0) env.rect(x - m.w / 2 - size * 0.2, y + m.h / 2 + size * 0.22, (m.w + size * 0.4) * e, Math.max(2, size * 0.03), sc.accent, 0.9, false);
    }
    if (P.sub && cut.lineText !== cut.text) env.draw({ text: cut.lineText, font: st.fonts.body[0], size: J.clamp(H * 0.026, 16, 34), x, y: y + size * 1.6, track: 0.22, color: sc.sub, alpha: E.outCubic(env.pIn), ghost: false });
    const wk = env.wk;
    if (!wk || !cut.karaoke) return J.mainDraw(env, it);
    // The highlight is a per-glyph function like any other: it goes into it.charFn, which mainDraw folds into its
    // own chain (combineChar) together with the enter / hold / treat animations instead of letting them replace it.
    // The glyph index counts the glyphs of the text this item draws (the wrap above), so the character list is
    // built from that same text — never from cut.text, whose length only matches when nothing was wrapped.
    const chars = J.wkChars(it.text, cut.words);
    it.charFn = (i, g) => {
      const c = chars[g.i];
      if (!c || c.w < 0) return null;                                  // not part of any word: leave it alone
      // per glyph: what the voice has already passed keeps the lyric colour, what is still to come waits in the sub
      // colour at a lower alpha, and the word being sung lands with a small lift (the highlight walks with the voice)
      const inE = E.outCubic(J.clamp(wk.p * 2.2));
      if (c.w > wk.k) return { color: sc.sub, a: wk.k < 0 ? 0.5 : 0.45 };        // not sung yet
      if (c.w < wk.k || wk.p >= 1) return null;                                   // sung: the lyric colour
      return { color: sc.accent, a: 1, s: P.pop ? 1 + 0.08 * (1 - inE) : 1, dy: P.rise ? -size * P.rise * (1 - inE) : 0 };
    };
    return J.mainDraw(env, it);
  },
});
})();
