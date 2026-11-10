# JIZURA への貢献について / Contributing

Issue やプルリクエストをありがとうございます。作り始める前に、次の方針を確認してください。

## 実装しない機能

JIZURA は次の2つの方針で作っています。どちらかに当たる機能は、プルリクエストをいただいても基本的に取り込みません。

1. **JIZURA 自身は外部と送受信しない**：GitHub Pages に置いた1つのページだけで動き、歌詞や曲をブラウザの外に出しません。外部のサーバー・サービスとの送受信（API、アカウント、クラウド保存、解析・トラッキングなど）や、実行時に外部の CDN・モデルの配布元から読み込む機能は入れません。例外は Google Fonts の書体だけです。
2. **AI と連携する機能は入れない**：外部と通信しないものも含みます（LLM による演出、音声認識による書き起こし・タイミング合わせ、AI エージェント向けの操作口など）。

詳しくは README の「[開発の方針](README.md#開発の方針)」を見てください。こうした機能をフォークで作って公開するのは自由です（MIT License）。

## 歓迎するもの

- 不具合の報告と修正
- 表現の部品の追加（`docs/EXPRESSION_PACKS.md` を参照）
- 翻訳の修正
- ブラウザの中だけで完結する機能の提案と実装

大きな変更は、作り始める前に Issue で相談していただけると、遠回りを減らせます。プルリクエストには、ビルド済みのファイル（`index.html`、各言語のフォルダ、`JIZURA_AE*.jsx`、`JIZURA_CEP*.zip`、`sitemap.xml`）や `VERSION`・`CHANGELOG.md` の変更は含めないでください。リリースのときにこちらで作り直します。

---

Thank you for your issues and pull requests. Please read this before you start building.

## Features we do not add

1. **JIZURA itself does not talk to the outside.** It runs from one static page on GitHub Pages, and lyrics and songs never leave the browser: no outside servers or services (APIs, accounts, cloud storage, analytics or tracking), and no code or data loaded at run time from outside CDNs or model hosts. The only exception is Google Fonts.
2. **No AI integration**, including integrations that use no network (LLM-driven direction, speech recognition, interfaces for AI agents, …).

See [Project policy](README.en.md#project-policy). You are free to build such features in your own fork (MIT License).

## Welcome

Bug reports and fixes, new expression parts (see `docs/EXPRESSION_PACKS.md`), translation fixes, and features that work entirely inside the browser. For larger changes, please open an issue first. Leave the built files (`index.html`, the language folders, `JIZURA_AE*.jsx`, `JIZURA_CEP*.zip`, `sitemap.xml`), `VERSION` and `CHANGELOG.md` out of pull requests; they are regenerated at release.
