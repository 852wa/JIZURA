# JIZURA expression packs — contributor guide

JIZURA is a browser lyric-video (文字PV) engine: lyrics → timed "cuts", each cut = one **layout** (composition) +
**enter** (entrance) + **hold** (idle motion) + **exit** + 0..n **decor** graphics (+ treatment / background / camera / fx,
which are handled by other packs). Everything renders into a Canvas2D in *design space* and is deterministic from a seed.

A pack is ONE file: `src/11p_<pack>.js`. It only registers new entries; it never edits the core files.

Existing implementations to read first (they show the house style and all the idioms):
`src/06_layouts.js` (layouts, `J.mainDraw`, `J.drawFx`), `src/05_anim.js` (enter/hold/exit), `src/07_decor.js` (decor),
`src/03_text.js` (`J.drawItem` — the text item model), `src/09_render.js` (`makeEnv` drawing helpers).

## File skeleton

```js
/* JIZURA pack: <pack> — <one line> */
(() => {
'use strict';
const E = J.E;
const P = '<pack>';            // pack name for J.register
J.register('layout', 'myKey', { name: '日本語名', tags: ['pop', 'graphic'], w: 1, fits: n => n <= 12, plan(rng, cut, st) { … }, render(env) { … } }, P);
})();
```
`J.register(group, key, def, pack)` adds the entry to the registry and to the order array. Keys must be unique camelCase and
must not collide with existing keys (check `J.order(group)`). `name` (Japanese, short, 2–7 chars) is shown in the UI.
`tags` = moods it suits, any of: `glitch calm pop graphic editorial emotional`. `w` = base pick weight (1 normal; 0.4–0.7 for
gimmicky / very specific looks; 1.2–1.5 for strong general-purpose ones).

## Design space & environment

Design size by aspect: 16:9 1920×1080 · 9:16 1080×1920 · 4:3 1440×1080 · 3:4 1080×1440 · 1:1 1440×1440 · 4:5 1440×1800 · 21:9 2520×1080.
Always position/size relative to `W`/`H` (and `Math.min(W, H)`); every layout must look right in landscape AND portrait.

Every render/draw/apply receives `env`:

| field | meaning |
|---|---|
| `ctx` | CanvasRenderingContext2D, already transformed to design space (and camera) |
| `W`, `H` | design size |
| `sc` | colour scheme: `bg fg sub accent accent2 ink dim ghostA ghostB` (+ optional `grad:[a,b]`). `ink` = sticker/plate colour, `dim` = faint background-text colour. Use ONLY these colours (plus `#000/#fff` for contrast decisions via `J.lum`). |
| `st` | style pack: `st.fonts.display/serif/body/mono` = arrays of font keys |
| `fx` | sliders 0..1: `motion glitch chroma decor density texture bgSwitch` |
| `cut` | `text` (this cut's text), `lineText` (whole lyric line), `note`, `line` (index), `index`, `start end dur inDur outDur`, `params` (your plan() output), `seed`, `emph` (emphasised), `words` (chunks) |
| `lt` | local time since cut start (s). **Lagged per pass** (see ghosts) |
| `ltb` | `lt` + pass lag — use this for continuous motions (scrolling, rotation) so ghosts trail correctly |
| `pIn`, `pOut` | 0..1 entrance / exit progress of the cut |
| `step` | integer random clock (≤24 Hz) — use for flicker / jitter randomness |
| `pass` | `'B'`, `'A'` (chromatic ghost passes, drawn first, tinted) or `'main'` |
| `scale` | design→pixel scale (for pixel-sized strokes / filters) |
| `allowFilter` | false in fast preview — skip `ctx.filter` blur when false |
| `energy` | 0..1 audio loudness or null · `beat` = `{since, len, index}` or null |

### Chromatic ghost passes (important)
Each layout `render` / decor `draw` is called THREE times per frame: pass B, pass A (time-lagged, drawn in a single ghost colour
under the main image) and pass main. The env helpers handle this for you:
- `env.draw(item)` / `J.mainDraw(env, item)` — text; ghost passes draw the same glyphs in the ghost colour. Set `ghost: false`
  on secondary text that should NOT get chromatic ghosts.
- `env.rect(x, y, w, h, color, alpha = 1, ghost = true)`, `env.line(pts, color, lw, alpha, ghost)`, `env.polyPartial(pts, e, color, lw, alpha, ghost)`,
  `env.circle(cx, cy, r, fill, stroke, lw, alpha, ghost)`, `env.arc(cx, cy, r, a0deg, a1deg, color, lw, alpha, ghost)`,
  `env.rrect(x, y, w, h, r, fill, alpha, ghost, stroke, lw)`, `env.poly(pts, color, alpha, ghost)`, `env.blob(pts, color, alpha, ghost)`.
  With `ghost=false` the shape is drawn in the main pass only. Use `ghost=true` only for bold graphic shapes that should split.
- If you draw with `ctx` directly (gradients, clip paths, images…) you MUST guard it: `if (env.pass === 'main') { … }`,
  otherwise it is drawn 3× in its real colours. `ctx.save()/restore()` around any transform/clip/alpha/composite change.

## Text items (`J.drawItem` model)

`{ text, font, size, x, y, color, align:'center'|'left'|'right', vertical, lead, track, sx, sy, rot, skew, alpha,
   fill (default true), stroke (px), strokeColor, strokeUnder, strokeDash:[a,b], gradient:[c1,c2] or [[offset,colour],…],
   pattern:'dots'|'stripes'|'hatch'|'grid'|'lines' (+patternColor, patternBg), shadow:{color,blur,dx,dy}, extrude:{n,dx,dy,color,fade,a},
   fillAlpha, dash (0..1 stroke draw-on progress), blur, blend, ghost:false, mi (motion index for stagger), plain:true (skip treatments),
   enter/exit/hold (per-item override keys), noHold }`
Glyphs are centred on `(x, y)` (multi-line via `\n`; `lead` = line spacing factor). `J.measure(item)` → `{w, h, lay}`,
`J.fitSize(text, font, maxW, maxH, {sx, sy, track, lead, vertical})` → size that fits, `J.itemBox(item)` → `{x0 y0 x1 y1 w h cx cy}`,
`J.splitLines(text, maxPerLine)` balanced Japanese line breaks, `J.glyphCount(text)`, `J.fontsOf(st, ['display','serif'])` → font keys,
`J.metrics.adv(fontKey, ch)` advance in em. Fonts: `gothic_black gothic_bold gothic_med gothic_light dela zenkaku mincho_black mincho_bold
mincho mincho_light tokumin round pop dot brush mono sansui` — prefer the style's role fonts (`st.fonts.*`).

`J.mainDraw(env, item)` draws the lyric WITH the cut's enter/hold/exit/treatment applied and returns its bbox
`{x0,y0,x1,y1,cx,cy,boxes}` (or null while hidden). `env.draw(item)` draws plain text (no motion) — use it for secondary text.
Combine boxes with `J.unionBB(a, b)`; fall back with `J.centerBB(env, bb)`.

Motion extras an enter/exit/hold may set on an item: `clip:[x0,x1]` (horizontal window), `clipY:[y0,y1]`, `clipFn(ctx, env, it)`
(add a path; it becomes the clip), `bands:[[y0,y1,dx],…]` (horizontal slices shifted), `vbands:[[x0,x1,dy],…]` (vertical slices),
`streak:{n,dx,dy,a}` (motion-trail copies), `echo:{n,dx,dy,a,decay,scale,rot,outline,color}` (stepped copies behind),
`wipeBar:{x,h}`, `cursorAt`, `pre(env,it)` / `post(env,it,bb)` hooks, plus any item field above.
Helpers: `J.itemBands(env, it, n, (i,n)=>dx)`, `J.itemVBands(env, it, n, (i,n)=>dy)`.
Per-glyph functions: push `(i, g, n) => ({dx, dy, rot, s, sx, sy, a, color, ch, hide, skew, blur, outline, clipX:[a,b], clipY:[a,b]})`
into `it.charFns` (`i` glyph index, `n` glyph count, `g` glyph layout with `g.w g.h g.x g.y`; clipX/clipY are fractions of the glyph box,
centre 0, e.g. `clipY:[-0.7, 0.2]` shows the top part). Return `null` for "no change". Per-stroke-piece functions (advanced):
`it.pieceFns.push((ci, pj, piece, ox, oy) => J.PT(dx, dy, rot, s, stretch, stretchDir, a))`, return `J.PID` for rest and `null` for hidden;
set `pieces: true` on the recipe (see `assemble`, `explode` in 05_anim.js).

## Randomness, easing, colour
Deterministic only — never `Math.random()` in render/draw/apply. In `plan(rng, …)` use `rng()`, `rng.range(a,b)`, `rng.int(a,b)`,
`rng.pick(arr)`, `rng.chance(p)`. At render time hash: `J.r(a,b,c,d,e)` 0..1, `J.rs(…)` −1..1, `J.rr(lo,hi,…)`, `J.h(…)` uint, keyed by
`env.cut.seed`, `it.seed`, index, `env.step`. `J.noise1(x, seed)` smooth noise. Easing `J.E.lin inQuad outQuad inCubic outCubic inOutCubic
outExpo inExpo inOutExpo outBack(x, s) outElastic inOutSine`. `J.clamp(x,a=0,b=1) J.lerp J.smooth(a,b,x) J.TAU J.DEG`.
Colour: `J.lum(hex)` 0..1, `J.mix(a, b, t)`, `J.rgba(hex, alpha)`, `J.fitContrast(hex, bg, ratio)`. Script tests: `J.isKanji J.isHira J.isKata J.isLatin J.isPunct J.isSmallKana`.
`J.romaji(kana)` (null when kanji present), `J.fmtTime(t)`.

## Group contracts

**layout** `{ name, tags, w, fits(n) → bool (n = glyph count without spaces, 1..30), plan(rng, cut:{text,n,W,H,dur}, st) → params (plain JSON: numbers/strings/bools/arrays, no functions), render(env) → bbox|null,`
optional `portrait` (weight multiplier when H > W, e.g. 0.5 if it is weak in portrait), `emph` (weight multiplier on emphasised lines), `treat: false | 'safe'` (false = no text treatments; 'safe' when the lyric sits on your own coloured plate), `busy: true` (you fill the whole screen → busy backgrounds are suppressed), `enterBias: {enterKey: mult}` }`
- The lyric itself MUST go through `J.mainDraw` (so every entrance/exit/treatment works on it); use `mi` on multiple items for stagger.
- Your own secondary graphics must animate IN (use `env.lt`, e.g. `E.outExpo(J.clamp(env.lt / 0.35))`) and OUT (`1 - E.inCubic(env.pOut)`).
- Keep the lyric inside a ~5% safe margin at rest in every aspect; handle 1–16 glyphs (use `fits` to exclude what can't work) and latin text with spaces.
- Params are chosen in `plan` (variety per cut: pick among 2–4 variants, sizes, directions…), render reads `env.cut.params`.

**enter** `{ name, tags, w, apply(env, it, p, ctx) }` — `p` 0→1 (already delayed per item by `it.delay`); `ctx = {dur, inDur, outDur}`.
Mutate the item / push charFns so that p=0 is "not yet visible" and **p=1 is exactly the resting item** (no leftover offset/alpha).
Optional: `inDur(dur, n) → seconds` (default clamp(dur*0.36, 0.12, 0.6)), `minDur` (avoid on cuts shorter than this), `maxChars`, `pieces: true`.
apply() is only called while p < 1.

**exit** `{ name, tags, w, apply(env, it, p, ctx) }` — p 0 (resting) → 1 (**fully gone**: alpha 0 / off-screen / hidden). Optional `outDur(dur, n)`, `minDur`.

**hold** `{ name, tags, w, apply(env, it, amt, ctx) }` — continuous idle motion while the cut rests; `amt` 0..1 ramps in after the
entrance and out during the exit; the effect must scale with `amt` (0 = no change) and `env.fx.motion`. Use `env.lt`/`env.ltb`, `env.step`, `env.beat`. Subtle > loud.

**decor** `{ name, tags, w, layer: 'back'|'front', subtle?: true (ok behind busy layouts), draw(env, bb, P) }` — `bb` = lyric bbox (may be null → `J.centerBB(env, bb)`).
`P = {id, seed, n (1..3), right, low, accent, corner, big (bools), mode, from, to, v (int 0..5 variant), r (0..1)}` — use them for variety.
Animate in over the first ~0.3–0.5 s of `env.lt`, out with `env.pOut`. Front decor must not cover the lyric bbox (stay around/outside it);
back decor sits under the text — keep it low-contrast (`sc.dim`, `sc.sub`, low alpha) unless it is small.

**treat** `{ name, tags, w, safe?, plan?(rng, st) → params, apply(env, it, P) }` — text treatment applied to EVERY main item of a cut
(whole lines, single chars, vertical, rotated, huge) before enter/hold/exit run. Skip items with `it.fill === false` or low alpha
(layouts' secondary copies). Keep `it.color` as the text colour; pick complementary colours from `env.sc` with `J.lum` checks.
`safe: true` only if it still looks right when the lyric sits on a coloured plate (layouts marked `treat:'safe'` get only safe ones).
Markers/boxes/underlines use `it.pre` / `it.post` hooks (they run in every pass — use the env helpers' ghost flag deliberately).

**bg** `{ name, tags, w, subtle?, plan?(rng, st) → params, draw(env, P) }` — full-screen background graphic, drawn ONCE per frame (main
pass only, not affected by the camera) after the scheme's bg fill, before any text. Chosen per lyric line, so continuous motion should
use `env.t` (absolute time). Keep contrast LOW so text on top stays readable. `subtle: true` = allowed behind busy layouts.

**cam** `{ name, tags, w, strong?, plan?(rng, st) → params, get(env, P) → {x, y, s, rot, sx, sy, skx, blur} }` — transform of the cut's
content around the screen centre (design px / degrees). Called per pass with lagged time. Keep the lyric on screen (|x|,|y| ≤ 5%,
s 0.92..1.15, rot ≤ 5°); big moves only briefly and they must settle. Scale by `env.fx.motion`; `strong: true` for aggressive moves.

**fx** `{ name, tags, w, glitchy?, edge? (default true), mid?, dur (frames @24fps, default 4), pre (frames before the cut boundary),
amp, scratch?, ae?, draw(ctx, ev, k, info) }` — post-processing in DEVICE pixels (identity transform). `info = {cw, ch, S (copy of the
frame when scratch:true), sc, st, step, t, scale, allowFilter, opt, tmp(w,h), tmp2(w,h)}`; `k` 0..1 progress, `ev.amp` intensity.
Leave ctx state clean. No getImageData on full frames. `ae` = the closest After Effects event type
(`chroma shake slice block invert flash zoom mosaic`) or omit.

**trans** (カット間のつなぎ) `{ name, tags, w, dur (seconds, default 0.35), plan?(rng, st) → params, draw(ctx, A, B, p, info) }` — how a
cut takes over from the previous one. `A` = canvas with the previous cut's resting frame, `B` = canvas with this cut's frame (both full
device-pixel size), `p` 0→1 (linear; ease it yourself). Draw the complete composite into `ctx` (identity transform, same size) — at p=0
it must look exactly like A, at p=1 exactly like B. `info = {cw, ch, sc, scPrev, st, P, step, t, scale, allowFilter, seed, tmp(w,h)}`.
The planner turns the previous cut's exit and this cut's entrance into plain cuts when a transition is used.

**style** (配色セット) — added directly to `J.STYLES` + `J.STYLE_ORDER` (see src/04_styles.js for the full schema): `{ name, desc,
moods: [mood keys], schemes: [2–4 × {bg, fg, sub, accent, accent2, ink, dim, ghostA, ghostB, grad?, paper?}], fonts: {display, serif,
body, mono}, texture: {grain, paper, scan}, ghost, bias: {layout, enter, exit}, decor: {decorKey: weight}, hud, glow?, glitchBoost?, useGrad? }`.

### After Effects counterpart (`ae`)
Every new **layout / enter / exit / hold / decor** entry must declare `ae: '<key>'` = its closest counterpart in the original set, used
when the browser exports a plan to the After Effects panel:
- layout: `center mixed vcols marquee tile scatter ring wave huge labels condensed gloss type diag circle stack pill`
- enter: `cut assemble slice type pop drop stretch wipe blur spin flicker scramble zoom`
- exit: `cut explode fall drift slice wipe shrink blur stretch scatter glitch`
- hold: `still jitter drift breathe wave glitchtick`
- decor: `brackets rings dots arrows slash sparks leaders waveform barcode grid stripes blobs bars shapes counter`

### Fonts
Catalogue keys: `gothic_black gothic_bold gothic_med gothic_light dela zenkaku mincho_black mincho_bold mincho mincho_light tokumin
round pop dot brush mono sansui` + newer faces `reggae` (Reggae One, rough heavy display) `rampart` (Rampart One, 3D outline display)
`potta` (Potta One, brush pop) `kiwi` (Kiwi Maru, soft round) `klee` (Klee One, handwritten pencil) `shippori` (Shippori Mincho B1,
elegant heavy mincho). Faces are fetched lazily only when a plan uses them, so prefer the style's role fonts (`st.fonts.*`).
(When Google Fonts cannot be reached, sheets render with system fallback fonts — judge layout and motion, not the typeface.)

### 追加分 / 和風 (random-pick sets)
`src/11q_sets.js` decides what random picks may use. Entries from packs not listed in `J.BASE_PACKS` count as 追加分 (extra) and
are only picked at random when the project's 「追加分の演出も使う」 switch is on. Entries built around a traditional Japanese
object, pattern or motif (提灯, 障子, 扇, 家紋, 青海波 …) must be listed in `J.WA` (or carry `wa: true`) so the 「和風の演出も使う」
switch can leave them out. New styles are extra unless listed in `J.BASE_STYLES`; new fonts belong in `J.EXTRA_FONTS`.

### Avoid near-duplicates
Before designing, list what already exists in your group: `node -e` is not enough for visuals — run
`python3 dev/overview.py <group> out/ov t_all` (after `python3 dev/build_test.py all --all-packs`) and look at the grid. Every
new entry must be recognisably different from all existing ones (different motion principle, composition or graphic idea — not the
same thing with other numbers).

## Performance & robustness
Budget ≈ 2 ms per call at 1080p. No `getImageData`, no canvas creation per frame (cache on a module-level Map keyed by params if you must
pre-render), no unbounded loops (cap counts). Guard against `bb === null`, empty text, 1-glyph text, very long text. No exceptions.

## Testing loop (do this for every entry)
```
python3 dev/build_test.py <pack> src/11p_<pack>.js          # builds dev/www/t_<pack>.html (core + your pack only)
(cd dev/www && python3 -m http.server 8765 &)                 # once
python3 dev/pack_sheet.py --page t_<pack> --group layout --ids key1,key2 --out out/<pack>
```
Requirements: Python 3 with `playwright` (Chromium) and `Pillow`.
The sheet tool prints console problems per entry (must be zero) and the slowest frame, and writes one contact sheet PNG per id
(layouts: 4 texts × 16:9/9:16/4:3/1:1 + a timeline row; enter/exit/hold: frames across the motion on 4 layouts; decor: 4 setups × time).
Look at every sheet critically — overlapping text, text off-screen, ugly spacing, flat or identical-to-existing motion, leftovers at p=1,
graphics that pop instead of animating. `python3 dev/build_test.py all --all-packs && python3 dev/smoke_all.py t_all` renders every
entry in many combinations; `python3 dev/overview.py <group> out/ov t_all` makes one overview grid per group (groups: layout enter exit hold decor treat bg cam fx trans style).
`python3 dev/cost_scan.py t_all 45` lists entries whose frames take longer than 45 ms.
Syntax check: `node -e "new Function(require('fs').readFileSync('src/11p_<pack>.js','utf8'))"`. Finally run `python3 build.py`.

## After Effects
The AE panel implements the original set only. Give every new layout / enter / exit / hold / decor entry an `ae` counterpart (see
"After Effects counterpart" above; `J.AE_MAP` in src/11_export.js can override it) so browser → AE JSON exports keep working.
fx entries may declare `ae`; text treatments, backgrounds, camera moves and transitions are browser-only.
