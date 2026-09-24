# Fixture: 「笑ったからって、許したわけじゃない」

Test data for `dev/align_test.js` (lyric auto-sync, `src/10b_align.js`). There is no audio here.

The song is the contributor's own, made with MiniMax Music 3 (AI music generation). You can listen to it here to check the timings by ear: <https://youtu.be/7gvC6J_CEpI>

| File | What it is |
|---|---|
| `lyrics.txt` | The lyrics as written: 65 lines. The recording skips three of them and repeats two passages that the text lists once. |
| `whisper.json` | mlx-whisper `whisper-large-v3-turbo` output for the full song (3:40). Settings: `language="ja"`, `word_timestamps=True`, `condition_on_previous_text=False`. Trimmed to segments and words. |
| `whisper_cpp.json` | The same song through whisper.cpp 1.9 `whisper-server -m ggml-large-v3-turbo-q5_0.bin -l ja -dtw large.v3.turbo -nfa`, requested with `response_format=verbose_json`. Trimmed to segments and words (with `t_dtw`). |
| `sung.lrc` | The lines in the order they are actually sung, each stamped at its onset. The onsets were checked word by word against the Whisper output, and each instrumental gap was re-transcribed on its own to confirm it holds no vocals. |

The contributor who made the song agreed to the use of its lyrics and transcripts as test data in this repository (2026-09-24).
