# ブラウザ版の WebMCP

JIZURA のページを開いたエージェントが、既存UIと同じ編集状態を読み取り、制作操作を実行するためのツールです。7言語版で共通のツール名・引数・部品IDを使い、部品の表示名は画面の言語に従います。追加サーバー、APIキー、実行時の外部ライブラリは不要です。

## 利用条件

- WebMCP の Imperative API が有効なブラウザと、それを呼び出せるエージェント／ブラウザ接続が必要です。ページがツールを公開することと、個別エージェントが利用できることは別です。
- `document.modelContext.registerTool` を優先し、旧環境の `navigator.modelContext.registerTool` にも対応します。未対応ブラウザでは通常UIがそのまま動きます。
- 公開サイトの HTTPS、または開発用 localhost で利用してください。単一HTMLのローカル起動は引き続き使えますが、`file:` での WebMCP 公開可否はブラウザに依存します。
- CEP 内とエンジン単体ページでは登録しません。クロスオリジン公開、独自ポリフィル、エージェント専用の拡張機能は含みません。
- WebMCP はドラフトです。APIの提供状況や有効化手順は [Chrome公式ドキュメント](https://developer.chrome.com/docs/ai/webmcp/imperative-api) と [WebMCP仕様](https://webmachinelearning.github.io/webmcp/) を確認してください。

## 制作の流れ

1. `jizura_get_state` で状態を取得します。`loading` の各値が `false` になるまで編集を待ちます。
2. `jizura_list_options` でスタイル・部品・フォントのIDを調べます。`category: "settings"` で設定スキーマとロック対象も取得できます。
3. `jizura_set_lyrics`、`jizura_update_settings`、`jizura_randomize` で作品を組み立てます。
4. 最新状態の `revision` と行／カット番号を使って、タイミングや個々のカットを調整します。
5. `jizura_preview` で再生位置を合わせます。見た目の確認にはブラウザのプレビューを使用します。
6. `jizura_project` でJSONを保存するか、`jizura_start_export` で書き出しを開始し、`jizura_get_export_status` で完了を確認します。

### ファイル投入

音源は `#audioFile`、フォントは `#fontFile`、プロジェクトファイルは `#fileProject` に、人間またはエージェントのブラウザ機能から投入します。ツールに端末パスや音源URLを渡しても読み込みません。

プロジェクトJSONだけは `jizura_project` の `action: "import"` と `json` 文字列で直接読み込めます。既存と同じ形式で、音源・フォントのバイナリは含みません。別の音源名のプロジェクトを開くと、前の音源を誤って使わないように外します。必要なファイルを改めて投入してください。

大きなMP4の直接保存は `start_export` の `kind: "mp4file"` が既存の `#btnMP4File` ボタンを案内します。保存先ダイアログや、書き出し後の「共有して保存」はブラウザUIを使います。音声再生が自動再生制限に止められた場合も、UIの再生ボタンを使います。

## ツール一覧

全ツール名には `jizura_` が付きます。下表は接頭辞を省略しています。

| 名前 | 主な引数・用途 |
|---|---|
| `get_state` | `detail`（既定 true）。設定・行・カット・元テキスト行・読込状況・再生・履歴・書き出しを取得。false は軽量な状態のみ |
| `list_options` | `category`, `query`, `page`, `pageSize`。style/font/settings または演出分類。既定30件、最大100件 |
| `set_lyrics` | `text` または `clear: true`。LRC、間奏、強調、分割記法に対応 |
| `update_settings` | `settings`。曲名、言語、スタイル、配色、フォント、演出、部品セット、画面比、解像度、fps、音声、背景、表示モード、範囲など |
| `set_timing` | `settings`, `times: [{line,time}]`, `clear`, `revision`。time は秒、null は手動指定の解除 |
| `edit_line` | `revision`, `line`, `text` または `layout`/`cuts`/`lock`。空layout・cuts=0 は自動 |
| `edit_cut` | `revision`, `line`, `cut`, `group`, `key`, `quiet`。空key は自動。quiet は追加効果の抑制 |
| `set_techniques` | `group`, `keys`, `enabled`。keys省略は分類全体（UI一括操作と同じ最低限の部品を維持） |
| `set_locks` | `kind: "tech"/"params"`, `keys`, `locked`。おまかせ時の変更をロック |
| `randomize` | `target: "all"/"style"/"mood"/"palette"/"composition"/"line"/"cut"`。line/cut は参照とrevisionが必要。cut は strategy: "omakase"/"shuffle" も指定可能 |
| `history` | `kind: "edit"/"look"`, `direction: "back"/"forward"` |
| `preview` | `action: "play"/"pause"`, `time`, `loop`, `volume`（0〜1）, `muted`, `mode` |
| `tap_sync` | `action: "start"/"record"/"back"/"stop"`。start はrevision、開始lineは既定1 |
| `project` | `action: "get"/"import"/"save"/"get_ae"/"save_ae"`。import はjson文字列 |
| `start_export` | `kind: "mp4"/"png"/"pnga"/"pngl"/"mp4file"`。pnga は透過、pngl は前景／後景 |
| `get_export_status` | `jobId`（省略可）。最新ジョブのみ保持 |
| `cancel_export` | `jobId`（省略可）。中止要求後、状態を再取得 |
| `reset_project` | 既存の確認ダイアログを開く。確認を自動承認しない |

### 番号・履歴・入力検証

- 外向きの行番号、行内のカット番号、`sourceRow`、ページ番号、出力範囲は **1始まり**。`get_state.project` や保存JSONの内部インデックスは既存どおり **0始まり**です。
- `revision` は再構成ごとに更新されます。行／カット編集、行時刻指定・解除、出力範囲変更、行／カット再抽選、タップ開始には最新値が必要です。`stale_revision` なら状態を再取得してください。
- コメント行、空行、LRC複数タイムスタンプにより、歌詞の元行と生成行は一致しないことがあります。`edit_line.text` は元行のLRC接頭辞を保って本文を置き換えるため、同じ元行を参照する複数の生成行が変更されます。本文変更と見た目変更は別々に呼び出してください。
- 歌詞／行時刻のundoと、見た目の前後の案は別の履歴です。全設定を一括で戻す汎用undoではありません。明示的な行再抽選はUIと同様、その行のロックを外します。
- 更新操作は直列化されます。復元／解析中、書き出し中、確認待ち、タップ中の競合編集は `busy` を返します。読取と書き出し中止は可能です。
- 不正な設定値、未知のID・引数、存在しない行、危険なオブジェクトキーは実行前に拒否します。プロジェクトJSONは8 MB、歌詞は200,000文字までです。

### 結果と書き出し

ツールはJSON文字列を返します。成功は `{ "ok": true, ... }`、失敗は `{ "ok": false, "error": { "code": "...", "message": "..." } }`。更新結果には軽量な `state` を含みます。

書き出しは既存エンコーダーとUI進捗表示を使い、開始時点の構成・設定・音源・範囲・ファイル名を固定します。ジョブ状態は `running` → `completed` / `cancelled` / `failed` / `save_declined` です。音声の互換性によって補助WAVが作られる場合も、`files` に列挙します。

`files[].status: "download_started"` はブラウザへダウンロードを依頼した状態です。保存先にファイルが完成した保証ではありません。エージェントはブラウザ側のダウンロード確認機能を併用してください。UIの直接保存が成功した場合のみ `saved` になります。ジョブはページ内の最新1件を保持し、再読み込みで消えます。

## 開発とテスト

- `src/12_ui.js`: `J.uiApi.editor` に既存状態を操作する窓口、読込状態、構成リビジョン、出力ジョブを保持。
- `src/13_webmcp.js`: スキーマ、検証、登録、結果のシリアライズ。`J.webMCP.status` で登録状況を確認可能。
- `build.py`: 既存のソース収集・7言語生成を利用。新しいビルド手順は不要。

```sh
python3 build.py
python3 -m venv /tmp/jizura-webmcp-venv
/tmp/jizura-webmcp-venv/bin/pip install playwright
/tmp/jizura-webmcp-venv/bin/python dev/webmcp_test.py --browser /usr/bin/google-chrome
```

テストは一時ブラウザプロファイルとlocalhostサーバーを使い、Google Fontsへの通信を遮断して環境依存を抑えます。登録モックによる契約テストと、ブラウザの実WebMCPによる発見・呼出し結果を別々に出力します。個別のエージェント製品からの接続を検証したことにはなりません。

### 検証結果（2026-09-27）

Chrome 154.0.8037.57（Linux、headless、`--enable-experimental-web-platform-features`）で実行しました。

- 18ツールの契約テスト、歌詞・行／カット・履歴・ロック・LRC・間奏・JSON往復・確認ダイアログ。
- 音源ファイル投入と解析、MP4と3種類のPNG ZIPの実ダウンロード、出力範囲、開始時点の設定と音源エネルギーの保持。
- 競合／古いリビジョン／不正入力、処理中拒否、事前中止、出力中止、フォント不足、コーデック非対応、保存辞退。
- 7言語版、WebMCP未対応・旧API・登録失敗、CEPガード、エンジン単体ページ。
- 実 `document.modelContext` で18ツールを発見し、`jizura_get_state` の呼び出しと `jizura_update_settings` による設定変更の成功を確認。Chrome 154 の `executeTool` はJSON文字列の引数を使用。
- 7言語の生成HTML構文チェックと、既存の5言語翻訳チェックが成功。

個別のCodex接続、OSの保存先ダイアログ、共有シート、AE実機はこのテストの対象外です。
