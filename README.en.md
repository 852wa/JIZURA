# JIZURA — Lyric Motion Video Maker

Turn lyrics into animated lyric videos in your browser. JIZURA combines layouts, entrances, holds, exits, decorations, text treatments, backgrounds, camera moves, effects and transitions. Change the seed or press **Create a variation** to explore another arrangement.

**[Open the English app](https://852wa.github.io/JIZURA/en/)** · [日本語版](https://852wa.github.io/JIZURA/) · [Japanese guide](README.md)

The English and Japanese browser editions share the same project format and saved browser data. Use the language links at the top of the editor to switch editions without changing your lyrics or settings. English After Effects panels are available as [ScriptUI](https://852wa.github.io/JIZURA/JIZURA_AE_en.jsx) and [CEP](https://852wa.github.io/JIZURA/JIZURA_CEP_en.zip) downloads. The AE JSON format is the same in both languages.

## Quick start

1. Paste lyrics into the left panel, one phrase per line. The built-in English sample is shown on a fresh install.
2. Optionally import audio. JIZURA detects beats and can snap cut boundaries to them. Use **Tap to sync** to mark the start of each line by pressing Space during playback.
3. Press **Create a variation** (or `R`) to randomize the style, mood, motion, palette and arrangement. **Previous** and **Next** navigate variations; **Change one thing** rerolls just one part.
4. Set aspect ratio, resolution and frame rate, then export MP4. Advanced mode adds a PNG sequence, transparent PNGs, color key backgrounds and individual technique controls.

Lyric syntax: `I remember/the dawn` makes a manual cut; `*word*` emphasizes a word; a final `!` adds a flash and shake; `lyric|note` adds small annotation text; `[01:23.45]lyric` imports an LRC timestamp; `# comment` is ignored.

Use **Save** and **Open** for `.jizura.json` projects. **Export for AE** creates arrangement data to import into the After Effects panel. Generated videos and images belong to their creators; rights to music and lyrics remain with their respective rights holders. Project files, lyrics and audio are handled in the browser. Google Fonts are loaded as needed. The tool is MIT licensed; see [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Build and publish

Run `python3 build.py` at the repository root. It creates `index.html` and `en/index.html`, both standalone pages for GitHub Pages. Run `python3 build_ae.py --lang en` to rebuild `JIZURA_AE_en.jsx`, and `python3 build_cep.py --lang en --out dist` to build `dist/JIZURA_CEP_en.zip` (copy the ZIP to the repository root for Pages downloads). Commit the built pages, panels and translation sources together. Publish from the repository root on GitHub Pages; the English edition is then served at `/JIZURA/en/`. Open either HTML file locally for offline use, with installed fonts as a fallback.

Install `JIZURA_AE_en.jsx` in After Effects' `Scripts/ScriptUI Panels` folder, restart AE, then open it from the Window menu. The English CEP package has a distinct extension ID, so it can coexist with the Japanese CEP panel. Extract the ZIP and use its Windows or macOS installer. These panels require After Effects to verify motion and export behavior; automated checks use a mock AE environment.
