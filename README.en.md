# JIZURA — Lyric Motion Video Maker

Turn lyrics into animated lyric videos in your browser. JIZURA combines layouts, entrances, holds, exits, decorations, text treatments, backgrounds, camera moves, effects and transitions. Change the seed or press **Create a variation** to explore another arrangement.

**[Open the English app](https://852wa.github.io/JIZURA/en/)** · [Bahasa Indonesia](https://852wa.github.io/JIZURA/id/) · [Tiếng Việt](https://852wa.github.io/JIZURA/vi/) · [Vietnamese guide](README.vi.md) · [日本語版](https://852wa.github.io/JIZURA/) · [繁體中文](https://852wa.github.io/JIZURA/zh-hant/) · [简体中文](https://852wa.github.io/JIZURA/zh-hans/) · [한국어](https://852wa.github.io/JIZURA/ko/) · [Korean guide](README.ko.md) · [Japanese guide](README.md)

The Japanese, English, Indonesian, Vietnamese, Traditional Chinese, Simplified Chinese and Korean browser editions share the same project format and saved browser data. Use the language links at the top of the editor to switch editions without changing your lyrics or settings. English After Effects panels are available as [ScriptUI](https://852wa.github.io/JIZURA/JIZURA_AE_en.jsx) and [CEP](https://852wa.github.io/JIZURA/JIZURA_CEP_en.zip) downloads. The AE JSON format is the same in both languages.

**Version: v0.9.0** (see [CHANGELOG.md](CHANGELOG.md))

<details>
<summary><h2>Quick start</h2></summary>

1. Paste lyrics into the left panel, one phrase per line. The built-in English sample is shown on a fresh install.
2. Optionally import audio. JIZURA detects beats and can snap cut boundaries to them. Use **Tap to sync** to mark the start of each line by pressing Space during playback. **Transcribe lyrics with AI** adjusts the original mix for vocal-sensitive recognition, then runs multilingual Whisper Base (accurate) or Tiny (fast) in the browser and previews timestamped LRC lines before you explicitly apply them. Models are downloaded on first use and cached; WebGPU is preferred with automatic WASM fallback.
3. Press **Create a variation** (or `R`) to randomize the style, mood, motion, palette and arrangement. **Previous** and **Next** navigate variations; **Change one thing** rerolls just one part.
4. Set aspect ratio, resolution and frame rate, then export MP4. Advanced mode adds a PNG sequence, transparent PNGs, color key backgrounds and individual technique controls.

<details>
<summary><h3>Lyrics language</h3></summary>

The styles are designed around Japanese fonts. For Chinese (Traditional / Simplified) and Korean lyrics, set **Lyrics language** below the lyrics box (Auto-detect is the default: kana → Japanese, Hangul → Korean, Chinese only → Traditional or Simplified by characters such as 們/们 and 說/说). Each font is then replaced with a face in that language with a similar feel — e.g. Noto Sans JP → Noto Sans TC / SC / KR, Noto Serif JP → Noto Serif TC / SC / KR, Dela Gothic One → WDXL Lubrifont TC / ZCOOL QingKe HuangYou / Black Han Sans — so a line never mixes fonts. Lyrics written almost entirely in Latin letters (English or romaji) are detected as **English** and cut into short phrases rather than single words. The AE panels have the same setting, the AE JSON carries the language, and AE falls back to the OS fonts (PingFang, Microsoft JhengHei / YaHei, Apple SD Gothic Neo, Malgun Gothic) when those faces are not installed.

</details>

<details>
<summary><h3>Preview and transparent layers</h3></summary>

A volume slider next to the play button sets the preview volume (click **Vol** to mute); exported videos keep the original level. **Transparent PNG layers** exports two transparent PNGs per frame into back/ (background graphic and decorations behind the lyrics) and front/ (lyrics, their decorations, ghosts and HUD); screen effects are applied to both, so front over back matches the normal look. Transparent PNG exports keep the background empty even when full-screen effects (invert, flash, strobe, hue shift, split screen, CRT off, black frames…) are active.

</details>

<details>
<summary><h3>Editing tools</h3></summary>

Edit a line's lyrics in place (✎ or double-click), set the number of cuts per line (auto / 1–6), redo tap sync from any line (◎; Backspace undoes a tap), and drag line markers on the timeline (zoom with + / − or the wheel; hold Shift to ignore beats). Ctrl+Z undoes lyric and timing edits. **Export range** exports only the lines you pick (⇥ in the line list). The song you load is kept in this browser, so a reload does not drop it from exports; when the browser cannot encode AAC audio, a WAV of the soundtrack is saved next to the MP4. A short guided tour opens on the first visit in Simple mode (? to replay).

**Per-cut picks** (Advanced mode): click a chip under the preview (layout, entrance, hold, exit, decoration, treatment, background, camera, transition) to replace that part for this cut only; **Auto** goes back. The line list also shows a layout menu per cut, and **Shuffle / Randomize this cut** re-rolls just that cut. Other cuts keep their picks. **Locks** (Advanced mode): the lock on a Techniques group keeps its ON/OFF selection, and the locks on the effect sliders, flash and frame stepping keep their values through Randomize; locks are saved with the project. **Loop** next to the play button cycles whole piece → line → cut → off; line and cut loops are shaded on the timeline.

</details>

<details>
<summary><h3>Layout</h3></summary>

On wide windows the page no longer scrolls as a whole: the preview and timeline stay in view while the lyrics / line list and the settings scroll inside their own columns, and the line list follows playback.

</details>

<details>
<summary><h3>Unified look and Typesetting</h3></summary>

**Unified look** (Effects tab / Simple mode) builds with lyric-video conventions: each part keeps one set of layouts and motions, a returning line is shown the same way, directions alternate, the line ending in `!` becomes a big hit, lines can morph into the next and grow from thin to bold. **Typesetting** tightens kana, makes particles smaller and first characters larger, sizes Latin letters up with a small gap, shows lyrics 0.2 s before the voice and keeps effects from piling up. Both are optional; switched off, JIZURA works as before.

</details>

<details>
<summary><h3>Export</h3></summary>

MP4 export now streams the file as it encodes and retries with a software encoder when the GPU encoder fails; on Chrome / Edge, **For large videos** writes straight to a file you pick.

</details>

<details>
<summary><h3>Keep the centre free</h3></summary>

**Keep the centre free** (Export settings) splits each lyric in two and places the halves in the side bands — left / right on wide frames, top / bottom on tall ones ("flowers" | "bloomed") — on tall frames you can choose top / bottom or left / right — as one scene with the same layout, motion and decorations, so only the character's spot in the middle stays free; backgrounds and screen effects still cover the frame, the preview outlines the free area, and the AE panels build the same layout.

</details>

<details>
<summary><h3>Clear lyrics and Reset</h3></summary>

**Clear lyrics** removes the lyrics with their line timings, per-line settings and export range (Undo / Ctrl+Z brings them back); **Reset** in the header clears lyrics, the song (including the copy kept in the browser), settings and both histories after a confirmation.

</details>

<details>
<summary><h3>Phone mode</h3></summary>

On phones (narrow or touch screens) the mode switch shows **Phone / Simple / Advanced**, and Phone mode opens on the first visit. **Randomize** stays pinned in the header, the preview stays at the top while you scroll, and the line list shows one lyric per row — tap a row to open its dice, lock and cut settings. Tap a section heading to fold or unfold it; Save, Open and Reset are under **Menu**. For reliable exports, Phone mode starts at 720p and caps exports at 1080p (use Advanced mode for larger sizes), keeps the screen awake while exporting, and does not treat time spent in another app as a failure. When the browser supports it, **Share / save** hands the finished video to the share sheet (e.g. to save it to Photos).

</details>

<details>
<summary><h3>Part sets: typographic, kinetic and horror</h3></summary>

Three switches under **Randomize** (and at the top of the Techniques tab) add new part sets to random picks, independently of **Include new effects**:

- **Use typographic parts** (on by default) — 50 parts derived from the original set that work with type, rules and numbers alone rather than pictures: key-glyph splits, cropped giant type, crossed lines, ruby, ruled lines, size steps, justified lines, split type, bracket reveals, running heads and more (marked T).
- **Use kinetic parts** (on by default) — 51 motion-first parts where words move one by one: slam stacks, quarter turns, word swaps, dives into a letter, flow-then-snap, word-by-word jump cuts, gears, collisions, per-word entrances, beat holds and word-following cameras. Word changes lock to the beat when a song is loaded (marked K).
- **Include horror effects** (off by default) — 52 eerie parts and 3 styles (Ruins, Midnight Recording, Cursed Letter): flashlight, door gap, wall scrawl, CCTV, spirit board, missing poster, the one wrong character, redacted file, static TV, spirit photo, wrong shadow, blink-creep and jump-scare entrances, pulled-down exits, twitch holds, watching eye, sigil, cracks, dark corridor, nervous handheld, subliminal frames, static cuts and more (marked H). When on, Randomize adds a **Horror** mood and picks it about half the time; Randomize uses horror parts only in that mood. No gore.

The After Effects panels build all three sets too (with the same switches and the Horror mood); beat-locked timing is spread evenly over the cut in AE.

</details>

<details>
<summary><h3>Lyric syntax and projects</h3></summary>

Lyric syntax: `[interlude 8]` adds an 8-second instrumental part with background and decorations only (4 seconds without a number); `I remember/the dawn` makes a manual cut; `*word*` emphasizes a word; a final `!` adds a flash and shake; `lyric|note` adds small annotation text; `[01:23.45]lyric` imports an LRC timestamp; `# comment` is ignored.

Use **Save** and **Open** for `.jizura.json` projects. **Export for AE** creates arrangement data to import into the After Effects panel. Generated videos and images belong to their creators; rights to music and lyrics remain with their respective rights holders. Project files, lyrics, audio adjustment and transcription are handled in the browser; audio is not uploaded to an external transcription service. Google Fonts are loaded as needed; the AI runtime and selected model are loaded only when transcription is used. The original song remains unchanged for BPM detection, playback, waveform and video export. The tool is MIT licensed; see [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

</details>

</details>

<details>
<summary><h2>Build and publish</h2></summary>

The version lives in `VERSION` at the repository root; the builds insert it into the pages and panels. Record changes in `CHANGELOG.md`.

Run `python3 build.py` at the repository root. It creates `index.html`, `en/`, `zh-hant/`, `zh-hans/`, `ko/`, `id/` and `vi/` editions (translations in `app/english.py` and `app/i18n_*.py`), all standalone pages for GitHub Pages. Run `python3 build_ae.py --lang en` to rebuild `JIZURA_AE_en.jsx`, and `python3 build_cep.py --lang en --out dist` to build `dist/JIZURA_CEP_en.zip` (copy the ZIP to the repository root for Pages downloads). Commit the built pages, panels and translation sources together. Publish from the repository root on GitHub Pages; the English edition is then served at `/JIZURA/en/` and the Indonesian edition at `/JIZURA/id/`. Open either HTML file locally for offline use, with installed fonts as a fallback.

Install `JIZURA_AE_en.jsx` in After Effects' `Scripts/ScriptUI Panels` folder, restart AE, then open it from the Window menu. The English CEP package has a distinct extension ID, so it can coexist with the Japanese CEP panel. Extract the ZIP and use its Windows or macOS installer. **Lightweight** leaves out the colour-shift copies, paper texture, bloom, grain and picture-duplicating effects (about 40% fewer layers) for faster playback in AE. Both panels build long songs in small steps, so After Effects stays responsive: the panel shows progress and **Stop** finishes the composition with the cuts built so far. With an **Export range** selected, the CEP panel (and **Export for AE**) builds only those lines, with the song layer shifted to match. These panels require After Effects to verify motion and export behavior; automated checks use a mock AE environment.

</details>

<details>
<summary><h2>Contributors</h2></summary>

Traditional Chinese UI and technique names, Simplified Chinese technique names, font and language detection fixes: [Zaious](https://github.com/Zaious) (#5, #6, #7, #11, #21). Korean UI and technique names: [andongmin94](https://github.com/andongmin94) (#8). Indonesian UI: [auliaramadhann](https://github.com/auliaramadhann) and [enka25](https://github.com/enka25) (#12). Looping technique previews, the pinned tap-sync box, line / cut loops, per-cut picks and Advanced-mode locks: [nocore-dtm](https://github.com/nocore-dtm) (#18, #19, #22, #23, #24). Vietnamese UI: [phamhuulocforwork](https://github.com/phamhuulocforwork) (#20).

</details>
