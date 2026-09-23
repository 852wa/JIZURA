# JIZURA 字面 — Text PV (lyric video) auto-composition tool

**English · [日本語](README.ja.md)**

Browser app that takes your lyrics, combines visual techniques common in text PVs (lyric motion) to assemble cuts automatically, and exports to MP4. Layout, motion, decor, transitions, and finishing are held as 707 small parts (plus 24 styles); the combination changes every time, so change the seed and you get a different composition as many times as you like. An After Effects panel (ScriptUI) is included.

**▶ Use in browser: <https://852wa.github.io/JIZURA/>**　／　AE panel: [Download JIZURA_AE.jsx](https://852wa.github.io/JIZURA/JIZURA_AE.jsx) (right-click the link → “Save link as…”)

- No installation needed. Lyrics, audio, and export are all processed in the browser and never sent to a server (the only external load is Google Fonts, and only the typefaces used by the current composition).
- Auto-compose button (key `R`): each press changes style, mood, motion, colors, and composition as a whole.
- Aspect ratios 16:9 / 9:16 / 4:3 / 3:4 / 1:1 / 4:5 / 21:9, 720p–4K, 24 / 30 / 60fps.
- Loading a song detects its beats and snaps cuts to them. Manual sync by tapping is also available.
- Export MP4 (with audio) · PNG sequence · transparent PNG — including **green screen / black screen** backgrounds (white text + effects only) for compositing. Also exports After Effects composition JSON.

| File | Contents |
|---|---|
| `index.html` | Browser app (built, single file). This is what GitHub Pages opens. Can also be downloaded and opened locally |
| `JIZURA_AE.jsx` | After Effects panel (built) |
| `src/` `app/` | Browser app source (engine · expression packs · UI) |
| `ae/` | AE panel source |
| `docs/EXPRESSION_PACKS.md` | Guide for adding expression parts (packs) |

### Requirements

- **MP4 export**: a browser with WebCodecs support (Chrome / Edge recommended. Safari 16.4+ and Firefox 130+ also support WebCodecs, but whether H.264 export works depends on browser and OS). In unsupported environments, preview and PNG-sequence export still work.
- Fonts are loaded from Google Fonts, only the typefaces used, only when needed (offline: falls back to the PC’s fonts).

---

## Usage (output rights and license)

- **Rights to videos and images (outputs) made with this tool belong to their creator.** Free to use, commercial or non-commercial.
- Rights to the lyrics and songs you use belong to their respective rights holders.
- The tool itself is released under the MIT License. See [LICENSE](LICENSE) for details.
- Lyrics and songs you input are processed only inside the browser and never sent to a server.
- The same content is available in the app itself via the “Usage” button at top right (in Easy mode: the link below the export button).

---

## Auto-compose (Easy mode)

Switch screens with “Easy / Detailed” at top right. Opens in Easy mode.

- **Auto-compose** (keyboard `R` also works): each press re-randomizes the following all at once and plays from the top.
  - Style (never the same as the previous one)
  - Mood (Glitch / Calm / Pop / Graphic / Editorial / Emotional / All-in). Each mood changes motion strength, glitch amount, and which layout, entrance, and exit techniques get used.
  - Typeface for headings and mincho frames
  - Colors (occasionally the accent color and offset colors A/B are randomized too)
  - Cut composition (seed)
- **◀ Previous take / Next take ▶**: move back and forth among takes produced by Auto-compose. Return to a take you like, then export.
- **Re-roll only this**: keep the current take, re-randomize only part of it.
  - Style / colors (accent, offset A/B) / mood (motion and techniques used) / composition (layout and motion combinations)
- Lyrics, song, timing, and export settings never change under Auto-compose. Lines locked in the line list stay locked.

### Range of techniques used at random

Two checkboxes below the Auto-compose button (above the “Techniques” tab in Detailed mode) control which techniques are eligible for Auto-compose, shuffle, and per-line re-rolls.

- **Include added techniques** (default: off): when off, only techniques from the first public release (356 parts · 12 styles) are used. When on, techniques added later (351 parts · 12 styles · 6 typefaces) also become candidates.
- **Include Japanese-style techniques** (default: on): Japanese-style graphics — lanterns, postcards, shoji screens, fans, family crests, seigaiha waves, cherry petals — and Japanese styles (Sakura, Ink & Vermilion). When off, they are excluded. This filter is applied after the “include added” checkbox.
- Either way, both remain usable when a layout was set manually for a line or when you picked a style yourself.
- In the “Techniques” tab and style list, added items get an “Add” mark and Japanese-style items a “JP” mark. Items not randomly selectable under current settings are dimmed.

## Randomize colors

Found under Detailed → Style tab → “Accent & offset colors”.

- **Randomize colors**: re-picks the accent color and offset colors A/B (the two chromatic-shift colors) as a set.
  - A little over half the time, it picks from combinations already tuned to go together (complementary pairs etc.). The rest are newly built from the color wheel each time.
  - Brightness is auto-corrected to the background’s lightness so text stays readable (accent keeps a contrast ratio of 3+ against the background).
- You can also pick colors directly. Uncheck “Override with my own colors” to return to the style’s own colors.

---

## Using the browser app

1. **Lyrics**: one line = one phrase. Notation as follows.
   - `夜明けの色を/覚えてる` … `/` marks the cut point
   - `*透明*` … emphasis (larger, high-impact treatments get picked more often)
   - `!` at line end … adds a flash and shake
   - `歌詞|注釈` … small text for the annotation layout
   - `[01:23.45]歌詞` … LRC timestamps are used as-is
2. **Song and timing**
   - Loading a song auto-detects BPM and beats, snapping cut points to the beat.
   - Press “Sync by tap” and the song plays. Press `Space` at the moment each line starts.
   - Seconds in the line list can also be edited directly.
3. **Choose composition**
   - “Shuffle” re-rolls everything.
   - The die per line re-rolls only that line.
   - Lock that line’s composition; a layout can also be assigned directly.
4. **Styles**: 24 sets of colors, typefaces, and textures (including Sakura / Deep Sea / Sunset Grad / Forest Notes / Vapor / Newspaper / Synth 80s / Kraft Paper / Candy / Acid / Ink & Vermilion / Gold Night). Even within one video, the background color switches per cut.
   - Typefaces come from 18 Google Fonts families (including Reggae One / Rampart One / Potta One / Kiwi Maru / Klee One / Shippori Mincho B1). **Only the typefaces used by the current composition** are loaded each time, so startup and performance never slow down as the font count grows.
   - Fonts can be swapped by:
     - Typing the name of a font installed on the PC
     - Loading a .ttf / .otf file
5. **Effects and techniques**
   - The “Effects” tab adjusts motion strength, glitch, chromatic shift, decor amount, cut granularity, texture, and frame stepping.
   - The “Techniques” tab lets you toggle parts in each of the 10 categories (Layout · Entrance · Hold · Exit · Decor · Text treatment · Background · Camera · Screen FX · Transitions) one by one (evaluated together with the “added” / “Japanese-style” checkboxes above). Categories are collapsible, with “All ON / All OFF / Invert” and filtering by name.
6. **Export**
   - MP4 (H.264 on Chrome / Edge; audio can be included)
   - Image sequence PNG (ZIP)
   - Transparent PNG (ZIP, no background — for compositing in AE etc.)
   - Choosing **green screen / black screen** under Background exports compositing-ready material with only white text and effects (see “Background for compositing” below).
   - Aspect ratio 16:9 / 9:16 / 4:3 / 3:4 / 1:1 / 4:5 / 21:9, resolution 720p–4K, frame rate 24 / 30 / 60fps (see “Exporting at 24 / 30 / 60fps” below).
7. **Export for AE**: writes the current composition (timing · layout · effects · colors) to JSON. Load it in the AE panel and you get a comp with the same composition, ready to edit.

### Exporting at 24 / 30 / 60fps

1. On the “Export” tab (Easy mode: the “Export” panel on the right), pick aspect ratio, resolution, and **fps**.
2. Press “Export MP4”. Frames are written at the chosen fps as-is (e.g.: 6 seconds = 144 frames at 24fps, 360 frames at 60fps).
3. How steppy the motion looks is set separately from fps by **frame stepping** on the “Effects” tab.
   - **On twos (12 frames/sec)**: classic text-PV motion, slightly steppy. Looks the same at any export fps (default).
   - **On threes (8 frames/sec)**: even more animation-like, more held motion.
   - **Full**: moves every frame at the output fps. 60fps + Full is the smoothest (camera moves and flowing bands look cleanest).
4. Random switches in glitches and flickers are held to a 24fps baseline when fps changes. Exporting at 60fps does not double the flicker rate.
5. Rule of thumb: YouTube / MV → 24fps (or 30fps); for smooth vertical social video → 30–60fps + Full. 60fps and 4K take longer to export.

In the AE panel, the panel’s “fps” (24 / 30 / 60) sets the comp frame rate. Comps built from JSON use the fps chosen in the browser app.

### Background for compositing (green screen / black screen)

Use this when you want to overlay only the lyrics on top of live-action or illustration footage.

1. Under **Background** on the “Export” tab (Easy mode: the “Export” panel on the right), pick one of:
   - **Normal**: the style’s own colors and background (default)
   - **Green screen**: white text and effects only on `#00FF00`
   - **Black screen**: white text and effects only on `#000000`
2. The preview reflects it the same way (a “Green screen” badge appears at the top right). Whichever export you use — MP4, image-sequence PNG or transparent PNG — the look is the same, and the filename gets a `_greenback` / `_blackback` suffix.
3. How to composite
   - Green screen: key out the green with your editor’s chroma keyer (Ultra key in Premiere Pro, 3D Keyer in DaVinci Resolve, Keylight in AE, etc.).
   - Black screen: composite with the blend mode set to **Screen** (or Add), or key out the black with a luma key.
   - Exporting as a transparent PNG gives you white material on an already-transparent background from the start.

- Text, decor and effects all become white-to-grey monochrome. The style’s colors, background patterns, paper texture, particles and vignette are excluded (the combination, motion and effects are the same as with “Normal”).
- Chromatic-shift ghosts and light bleed are drawn in grey and turn partially transparent when keyed. Green screen is built to match the result of screen-blending the black version.
- Full-screen effects such as flash, invert and strobe remain as white light. If you don’t want them, turn Flash off on the “Effects” tab, weaken the glitch, or switch individual ones off under “Screen FX” on the “Techniques” tab.
- The AE panel offers the same Background choice (Normal / Green screen / Black screen). The background setting is also included in the JSON from “Export for AE”.

### Expression parts (combined for automatic composition)

Total parts: **707** (356 from the first public release + 351 added; added parts become random candidates when “Include added techniques” is on). Per cut, one part from each category is combined (0–3 Decor parts).

| Category | Count | Examples |
|---|---|---|
| Layout | 140 | Center, Vertical text, Screen break-through, Lower third, Speech bubble, Manuscript paper, Text rain, Tunnel, Neon, End credits, Magazine spread, Table of contents, Newspaper… |
| Entrance | 100 | Assemble from pieces, Slice, Flip, Domino, Iris, Blinds, Spiral assemble, Neon light-up, Stamp, Spring, Pinball, Bouncing ball, Fan open, Cylinder rotate, Stop-motion, Sticker place, Crumple-return, Letter open, Flutter, Magnifier, Film advance, CRT power-on, Loading, Drum spin, Data drop, Brush sweep, Ink drop, Count-in, Stroke by stroke… |
| Hold | 38 | Jitter, Fluffy drift, Sway, Beat pulse, Heartbeat, Jelly, Candle flicker, Gust, Dangle, Stretch by sound pressure, Beat flip, Gloss, Occasional flip, Focus pull, String vibration… |
| Exit | 86 | Burst apart, Collapse, Doors close, TV off, Sucked in, Melt, Backspace, Sticker peel, Crumple & toss, Tear away, Burn away, Blackboard eraser, Turn to sand, Shredder, Float away on balloon, Glass shatter, Tornado, Flutter down, Shockwave, Submerge, One-cut split, Blow out… |
| Decor | 115 | Crosshair lines, Registration marks, Radar, Dimension line, Confetti, Petals, Light leak, Bokeh, Brush stroke, Seal stamp, Family crest, Seigaiha wave, Lantern, Shimenawa rope, Fan, Autumn leaves, Mist, Circuit, Registration, Staple, Clip, Starfield, Moon phase, Firefly, Memphis, Play button, Like, Music notes… |
| Text treatment | 52 | Outlined fill, Border, 3D, Long shadow, Glow, Marker, Halftone, Emphasis dots, Neon tube, Chrome, Rainbow, Plate misregistration, Multi-ghost, Stencil text, Karaoke, Circle around, Corner brackets, Reflection, Sticker edge, Manuscript paper style, Cut-and-paste text… |
| Background | 62 | Radial burst, Concentric circles, Spotlight, Giant text, Retro grid, Polka dots, Aurora, Mesh gradient, Seigaiha, Asanoha, Checkerboard, Tartan, Contour lines, Starfield, Moonlit night, Cityscape, Sunset, Ocean waves, Rainy window, Fireworks, Mountains, VHS noise, Marble, Paper-cut… |
| Camera | 28 | Slow push-in, Pan, Dutch angle, Handheld, Beat zoom, Crash zoom, Orbit, Barrel roll, Pendulum, Focus pull, Earthquake, Dizzy, Swirl zoom, Snap pan… |
| Screen FX | 66 | Slice/block glitch, Invert, Flash, RGB split, VHS roll, Strobe, Film burn, Radial chromatic aberration, Bloom, Fisheye, Pixel sort, 1-bit dither, Kaleidoscope, Anamorphic flare, Static, Film scratches, Speed lines, Sparkle, Color bars, Glass crack, Shutter… |
| Transitions | 20 | Edge wipe, Diagonal band wipe, Clock wipe, Iris in, Push, Cover, Zoom through, Barn-door open, Blinds transition, Checkerboard transition, Block break, Whip pan, Ink, Tile collapse, Cube, Flash transition, Mosaic transition… |

- Text treatment is used more often as “decor amount” rises; background is chosen per line (frequency rises with “Background switching”).
- Transitions appear occasionally between consecutive cuts, depending on motion strength (the previous cut’s last frame is blended into the next for the switch).
- Each part carries a mood tag (Glitch / Calm / Pop / Graphic / Editorial / Emotional); Auto-compose mostly uses parts matching the chosen mood.

Below is the basic set (the parts also included in the AE panel).

- **Layout (17)**: Center / Large-small mix / Vertical text / Flowing band / Tiled / Scattered / Ring / Wave path / Screen break-through / Label paste / Tall compression / Annotation / Type / Diagonal band / Circular window / Afterimage stack / Capsule
- **Entrance (13)**: Assemble from pieces (glyphs break into stroke or part units) / Slice / Type / Pop / Drop / Stretch / Wipe / Blur / Spin / Blink / Scramble / Zoom / Cut
- **Hold**: Jitter / Drift / Breath / Wave / Glitch
- **Exit (11)**: Burst / Collapse / Dissipate / Slice / Wipe / Contract / Blur / Stretch / Scatter / Glitch / Cut
- **Decor (15)**: Frame marks / Coordinate circles / Dot ring / Arrows / Slashes / Sparks / Leader lines / Waveform / Barcode / Grid / Stripes / Ink blot / Rough band / Shapes / Big numbers
- **Finishing**
  - Time-offset RGB split (chromatic shift)
  - Full-screen slice glitch / block glitch
  - Invert / Flash / Zoom blur / Mosaic
  - Shake / On twos / Particles / Paper texture / Scanlines / Light bleed / Vignette

---

## Using the After Effects panel

### Installation

1. Place `JIZURA_AE.jsx` in the folder below and restart AE.
   - Windows: `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\`
   - Mac: `/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/`
2. Menu Window → JIZURA_AE.jsx opens the panel; it can be docked.
3. To just try it, File → Scripts → Run Script File also works (opens as a floating window).

### Usage

- **From lyrics**: choose lyrics, style, size, and effects, then press “Create comp”.
  - Timing can be picked from three sources:
    - Automatic (calculated from character count and BPM)
    - Markers on the selected layer
    - Comp markers
  - Recommended workflow: select the song layer, play, and tap numpad `*` at the start of each line to drop markers. Then choose “Use selected layer’s markers at line starts” and generate.
- **Auto-generate**: each press randomly picks style, mood, effect strength, on-twos/flash/HUD, seed, and colors, reflects them in the panel display, and creates a new comp. If you like a result, tweak values from there and regenerate with “Create comp”.
- **Mood** (in the Effects section): when chosen, assembly is narrowed to layout, entrance, and exit techniques matching that mood. Which techniques are chosen is determined by the seed, so the same seed gives the same result.
- **Accent & offset colors**: “Random colors” re-picks the accent and offset colors A/B. Direct `#RRGGBB` input also works. With “Override style colors” checked, they apply to every scene in the generated comp (brightness auto-adjusts to the background).
- **Extra & Japanese-style & background**: the same “Include added techniques” and “Include Japanese-style techniques” checkboxes as the browser app, plus Background (Normal / Green screen / Black screen). All 24 styles are selectable (look for the 〔Extra〕〔JP〕 marks in the list).
- **Supported parts**: all 707 parts of the browser app (layout 140 · entrance 100 · hold 38 · exit 86 · decor 115 · text treatment 52 · background 62 · camera 28 · screen FX 66 · transitions 20), built from AE text layers, shape layers, masks, effects and expressions. Lyrics stay editable text layers in every part, so you can retype them later.
  - 3D rotations, page-turning motion and per-pixel treatments (pixel sort, dither, etc.) are approximated with AE’s standard effects and 2D transforms.
  - If the JSON contains a part name the panel doesn’t know (parts added to the browser app later, etc.), it is replaced with the nearest counterpart and the panel status shows “Replaced”.
- **Size**: 1920×1080 / 1080×1920 / 1080×1080 / 3840×2160 / 1280×720 / 1440×1080 (4:3) / 1080×1440 (3:4), or same size as the active comp.
- **From JSON**: load JSON made with the browser app’s “Export for AE”. The composition decided in the browser assembles in AE as-is.
- **Fonts**
  - Noto Sans JP / Noto Serif JP / Dela Gothic One etc. are used automatically if installed (auto-selection only in AE 2024 and later).
  - If not installed, the typeface set on the Fonts tab is used. Default: Yu Gothic / Yu Mincho.

### What gets generated

- Per-cut precomps (in the `JIZURA <song name> cuts` folder)
  - Depending on the part, cuts may contain further precomps (`JZ … art`) or chromatic-shift copies (`… ghost`: version without paper/board background objects).
  - Text moves via text animators (expression selectors), so motion survives retyping.
  - Chromatic shift is expressed by duplicating each cut with a time offset and tinting the ghost layers with the Tint effect.
- The top `JZ FX` adjustment layer collects:
  - On twos (Posterize Time)
  - Shake (Transform)
  - Slice glitch (Wave Warp)
  - Zoom blur / Invert / Glow / Noise
- `JZ Flash` · `JZ Vignette` · HUD (timecode, line counter) are also generated.
- With green/black screen, `JZ Key Mono` (Tint adjustment layer) is added at the top instead of `JZ Vignette`; green screen also adds `JZ Key Green` (Screen blend mode).

### Notes

- On AE 2020 and later, the expression engine assumes JavaScript (the default for new projects).
- This panel has been validated in an environment mimicking AE’s object model: every one of the 707 parts built with multiple character counts and aspect ratios without errors, auto-generate across all styles × multiple seeds without errors, and visual/motion comparison against the same composition in the browser app. It has not yet been run on a real AE. If effect settings or similar behave unexpectedly, the affected items are listed after generation and the rest of the generation continues.
- Cuts with many parts have many layers and expressions. Long songs can take time to generate and preview (lowering the preview resolution to 1/2–1/4 helps).

---

## Development / build

```
python3 build.py              # src/ app/ vendor/ → index.html
node tools/export_ae_data.js  # when src/ changes: refresh ae/data.json (style/part info the AE panel uses)
python3 build_ae.py           # ae/ (main script + ported packs ae/p_*.jsx) → JIZURA_AE.jsx
```
The build needs only Python 3 and Node.js (no npm packages). The AE panel test (assembling every style in an environment mimicking AE’s object model) can be run with `cd dev && npm install` then `node dev/ae_test.js`. When adding expression parts, see `docs/EXPRESSION_PACKS.md` (testing tools are in `dev/`).

### Publishing from your own repository (e.g., after forking)

1. Push with `index.html` at the repository root.
2. Under **Settings → Pages**, set Source to **Deploy from a branch**, Branch to `main` / `/ (root)`, and save.
3. After a few minutes it opens at `https://<username>.github.io/<repository-name>/`.

## License

[MIT License](LICENSE). Use, modify, and redistribute freely, commercial or non-commercial (condition: include the copyright notice and license text).
Rights to videos and images made with this tool belong to their creator (and to the rights holders of their lyrics and songs). This software’s license does not extend to the outputs.

For bundled third-party software, see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
