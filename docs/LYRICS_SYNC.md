# 歌詞の自動同期（ローカル Whisper）

「曲とタイミング」の **自動で同期** は、各行の開始時刻を曲に合わせます。使うのは、自分の PC で動かす Whisper（音声認識）が聞き取った時刻です。

- **歌詞の文字はそのまま使います。**
  Whisper は歌の聞き取りが苦手で、日本語の歌では文字の 4 割ほどを間違えます（「羊」が「7時」になる、など）。
  そこで、聞き取った文字は表示に使いません。入力した歌詞と照らし合わせて、「どの行がいつ歌われたか」だけを取り出します。
- **曲はこの PC の外に出ません。**
  JIZURA は `127.0.0.1`（この PC）で動く Whisper サーバーにだけ曲を送ります。
  サーバーを使わずに、Whisper の出力（JSON）を読み込むこともできます。
- **結果は「行とカット」の開始秒に入ります。**
  「タップで同期」や手入力と同じ場所です。あとから手で直せますし、「元に戻す」で元の状態に戻せます。

## 使い方

1. 曲を読み込み、歌詞を入れます（1 行 = 1 フレーズ）。
2. 下のどれかで Whisper サーバーを起動します。
3. **自動で同期 → サーバーで聞き取る** を押します。
   3 分 40 秒の曲での実測は次のとおりです（初回はモデルのダウンロードもあります）。
   - mlx-whisper（Apple Silicon）：約 10 秒
   - whisper.cpp：約 12 秒
   - faster-whisper（CPU のみ・int8）：約 1 分半
4. 結果を確かめて **各行に適用** を押します。

結果の見方：

| 印 | 意味 |
|---|---|
| ✓ | 歌詞と聞き取りが合った行 |
| ? | 聞き取りが少なかったので、前後の行から推定した行 |
| ✗ | ほとんど聞き取れなかった行。この録音では歌われていない可能性があります。**歌われていない行を # で無効に** でコメントにできます |

**歌詞に無い聞き取り** には、歌詞に書かれていないのに聞こえた部分（繰り返し・アドリブなど）が時刻付きで並びます。歌詞に行を足すときの目安にしてください。

**先出し(秒)**（既定 0.15 秒）は、歌い出しより少し早く文字を出す量です。入場の動きの分を見込んでいます。

歌詞に LRC の時刻 `[mm:ss.xx]` が付いていると、手動の時刻より LRC が優先されてしまいます。そのため「各行に適用」の時点で LRC の時刻を外します。元に戻すこともできます。**LRC を保存** で、合わせた結果を `.lrc` で書き出せます。

### A. Python（mlx-whisper / faster-whisper）— おすすめ

```sh
pip install mlx-whisper          # Apple Silicon
pip install faster-whisper       # Windows / Linux / Intel Mac
python3 tools/jizura_whisper_server.py
```

- このサーバーは JIZURA のページも配信します。`http://127.0.0.1:8080/` を開けば、同じ場所から使えます。
- 既定のモデルは `large-v3-turbo` です。`--model small` などで変えられます。
- `--vad`（faster-whisper のみ）を付けると、声のない区間を飛ばします。
- faster-whisper は、使う Python に ctranslate2 の配布版（wheel）が必要です。Python 3.12 で確認しています。

### B. whisper.cpp（`whisper-server`、Python 不要）

```sh
brew install whisper-cpp        # Windows / Linux は https://github.com/ggml-org/whisper.cpp をビルド
curl -LO https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin
whisper-server -m ggml-large-v3-turbo-q5_0.bin -l ja -dtw large.v3.turbo -nfa --port 8080
```

`-dtw large.v3.turbo -nfa` は必ず付けてください。

- `-dtw` を付けないと、単語の時刻が間奏をまたいで大きくずれます（テスト曲では 13 秒）。
- `-nfa`（flash attention を切る）を付けないと、`-dtw` が無効になります。

付けた場合でも、A より少し粗くなります（下の表）。

### C. JSON を読み込む（サーバーなし・オフライン）

Whisper を自分で実行し、単語ごとの時刻を含む JSON を **JSON を読み込む** で入れます。

```sh
mlx_whisper song.mp3 --model mlx-community/whisper-large-v3-turbo --language ja --word-timestamps True --output-format json
whisper song.mp3 --model large-v3-turbo --language ja --word_timestamps True --output_format json   # openai-whisper
whisper-cli -m ggml-large-v3-turbo-q5_0.bin -l ja -dtw large.v3.turbo -nfa -ojf song.wav             # whisper.cpp
```

読める形式：

- whisper.cpp（`verbose_json` / `-oj` / `-ojf`）
- openai-whisper、mlx-whisper、faster-whisper（`segments[].words[]`）
- transformers.js（`chunks`）

### ブラウザごとの注意

- **Chrome / Edge**：公開ページ（https）から `127.0.0.1` のサーバーを呼ぶと、「ローカル ネットワークへのアクセス」の許可を求められることがあります。許可してください。
- **Safari**：https のページから `http://127.0.0.1` へ接続できません。次のどちらかで使ってください。
  - A のサーバーが配信する `http://127.0.0.1:8080/` を開く
  - C の JSON を読み込む
- **`file://` で開いた `index.html`**：A のサーバーとは接続できます。
- **自分でフォークして公開したページ**：A のサーバーに `--allow-origin https://<ユーザー名>.github.io` を付けてください。

## 仕組み

`src/10b_align.js`（`J.align`）の処理：

1. **16 kHz に変換**：曲をモノラル 16 kHz の WAV にして、サーバーに送ります（`toWav16k`）。
2. **読み込み**：いろいろな形式の Whisper の JSON から、単語と時刻を取り出します（`readWhisperJSON`）。
3. **幻聴の除去**（`filterSegments`）：Whisper は間奏などで、存在しない言葉を作ることがあります。
   - 「ご視聴ありがとうございました」「チャンネル登録」など、動画字幕から覚えた決まり文句
   - 同じ音の繰り返し（「e-e-e-e…」）
   - Whisper 自身が「無音」と判定した区間
4. **照合**（`alignLyrics`）：歌詞と聞き取りを、どちらも次のようにそろえます。
   - NFKC に正規化
   - カタカナをひらがなに
   - 数字を漢数字に（「15年」→「十五年」）
   - 記号と JIZURA の記法を除去

   そろえた文字列を、1 文字ずつ全体で対応付けます（Needleman–Wunsch）。点数は、同じ文字が +2、濁点・小書きだけ違う文字が +1、それ以外が −1、飛ばしが −1 です。
5. **行の開始時刻**：対応が取れた最初の数文字の時刻から、各行の開始を求めます。
   - 対応が 25% 未満の行は ✗ にします。
   - ✗ と ? の行は、前後の行のあいだに文字数の比で置きます。
   - 時刻は必ず前の行より後ろになります。

### 精度の例

テストに使っている曲「笑ったからって、許したわけじゃない」（3 分 40 秒、65 行。MiniMax Music 3 で作った曲で、[YouTube で聴けます](https://youtu.be/7gvC6J_CEpI)）での結果です。歌われている 59 行について、実際の歌い出しとの差を比べました。

| | 中央値 | 90% | 最大 | 1 秒以上ずれた行 |
|---|---|---|---|---|
| 元の LRC（行の長さから割り振った推定） | 0.41 秒 | 3.13 秒 | 8.07 秒 | 15 行 |
| 自動で同期：A. mlx-whisper / faster-whisper large-v3-turbo | 0.13 秒 | 0.30 秒 | 0.71 秒 | 0 行 |
| 自動で同期：B. whisper.cpp large-v3-turbo q5_0（`-dtw -nfa`） | 0.41 秒 | 0.66 秒 | 1.17 秒 | 2 行 |

歌われていない 3 行も ✗ になりました。2 回繰り返された部分は「歌詞に無い聞き取り」に出ました。

テスト：`node dev/align_test.js`（依存なし）。データは `dev/fixtures/warattakara/` にあります。

### 苦手なもの

- 伴奏が大きく、声が埋もれている曲
- ラップのように非常に速い部分
- 歌詞と大きく違う歌い方

→ 聞き取りが減り、? と ✗ が増えます。そのときは「タップで同期」や手入力で直してください。

伴奏を消す処理（Demucs などのボーカル分離）は含めていません。事前にボーカルだけを書き出して読み込むと、精度が上がることがあります。

---

## English summary

**Auto sync** aligns each lyric line to the times heard by a Whisper model running on your own computer.

- Whisper only supplies timing. Sung Japanese is too error-prone for its text to be shown, so the lyrics stay exactly as typed.
- The song is sent only to a server on `127.0.0.1`. You can also import a Whisper JSON file instead.
- The result goes into the per-line start times (the same place **Tap to sync** writes), with Undo.

**Start a server**

- `python3 tools/jizura_whisper_server.py` (mlx-whisper / faster-whisper; recommended). This one also serves the app at `http://127.0.0.1:8080/`, which is the way to use it in Safari.
- `whisper-server -m ggml-large-v3-turbo-q5_0.bin -l ja -dtw large.v3.turbo -nfa --port 8080` (whisper.cpp). `-dtw` and `-nfa` are required for usable word times, and it is still looser: median 0.41 s (vs 0.13 s) on the test song.

**Then** press **Auto sync → Transcribe with server → Apply to lines**.

**Result marks**

- ✓ aligned
- ? placed between its neighbours
- ✗ barely heard: probably not sung in this recording. **Comment out unsung lines** turns these into `#` comments.

**How it works** (`src/10b_align.js`): hallucination filtering, then a character-level Needleman–Wunsch alignment of the normalised lyrics against the heard characters (NFKC, katakana→hiragana, digits→kanji numerals), then monotonic line starts.

**Accuracy** on the bundled test song (59 sung lines), measured against the actual onsets:

- median error drops from 0.41 s to 0.13 s
- lines off by more than 1 s drop from 15 to 0

Run the test with `node dev/align_test.js`.
