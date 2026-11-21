# Maintaining Korean translations

The Korean edition keeps its UI copy, effect names, styles, moods and sample text
in `app/i18n_ko.py`. Edit that file to correct a translation. There is one Korean
catalogue; no second glossary or effect-name script overrides it.

`build.py` embeds the catalogue in the standalone Korean page. The browser does
not contact a translation service, and building the app needs no API credentials.
Effect names are explicit entries keyed by their registry group and ID. Internal
IDs are not converted into display labels.

## Check for source changes

From the repository root, with Python 3 and Node.js installed:

```sh
python3 tools/translate_ko.py --check
```

This command makes no network requests. A nonzero exit status means translations
or catalogue cleanup are needed. It can also be run in an existing CI job.

The source is Japanese. UI phrases come from the shared keys in `app/english.py`
and active Korean-specific keys in the original HTML and JavaScript. Register a
new UI phrase in the shared glossary when adding it to the app. Effects, styles
and moods come directly from the engine registry through
`node tools/export_english_labels.js --source`.

UI phrases are their own source keys. Effect, style and mood entries use
`SOURCE_HASHES` to detect changed original text. An unchanged source keeps the
existing translation, including manual corrections. Do not edit its hash when
correcting Korean wording. Removed source entries are pruned.

## Update changed entries

The optional developer command uses an OpenAI-compatible chat-completions API.
Set these environment variables for the process that runs it:

| Variable | Value |
| --- | --- |
| `TRANSLATE_API_URL` | Your API base URL, including its version path; the command appends `/chat/completions` |
| `TRANSLATE_MODEL` | The model available at that endpoint |
| `TRANSLATE_API_KEY` | Its access key; keep it out of source files and commits |

```sh
python3 tools/translate_ko.py
git diff -- app/i18n_ko.py
```

Only new or changed source entries are sent, in batches. The input is repository
UI copy and effect metadata, not a user's lyrics, audio or project. The endpoint's
normal usage charges apply. If nothing needs translation, the command makes no
API call and requires no credentials.

Responses must contain exactly the requested entries. The command checks markup,
attributes, JavaScript expressions, escapes and quote boundaries, and syntax-checks
the translated UI/export JavaScript before writing the catalogue. Japanese display
strings inside an expression may be translated, and expressions may be reordered
to fit Korean grammar. A failed request or invalid response exits with an error
without writing the proposed catalogue. Review the diff for terminology and meaning
before committing; structural checks cannot judge translation quality.

This follows the source-change tracking approach used by
[NSH's website translations](https://github.com/longbridge/nsh-website-translates).
It is an explicitly run development tool: no scheduled translation, automatic
commit, publishing action or browser integration is installed.

## Validate and contribute

```sh
python3 tools/check_i18n.py ko
python3 -m unittest discover -s tools -p 'test_translate_ko.py'
python3 build.py
python3 tools/check_page_js.py ko/index.html
```

The Korean check includes complete effect-name coverage and UI string structure.
Both check scripts return a failing exit status when they find a problem.
Follow `CONTRIBUTING.md`: include translation sources and tools in the PR, but omit
built HTML, panel bundles, `sitemap.xml`, `VERSION` and `CHANGELOG.md`.
