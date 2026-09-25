"""Localized browser editions. Japanese (the source) and English (app/english.py) are the originals; the Chinese
and Korean editions use the same glossary keys as English, with values in their own module (app/i18n_<code>.py):
BODY / UI / EXPORT (Japanese phrase -> translation), STYLES {key: (name, description)}, MOODS {key: name},
SAMPLE (sample lyrics), TITLE, DESCRIPTION. Effect part names use the English labels (app/english.js)."""
import importlib, json

# code, output folder, html lang, native name
EDITIONS = [
    ('ja', '', 'ja', '日本語'),
    ('en', 'en', 'en', 'English'),
    ('zh-Hant', 'zh-hant', 'zh-Hant', '繁體中文'),
    ('zh-Hans', 'zh-hans', 'zh-Hans', '简体中文'),
    ('ko', 'ko', 'ko', '한국어'),
]
MODULES = {'zh-Hant': 'app.i18n_zh_hant', 'zh-Hans': 'app.i18n_zh_hans', 'ko': 'app.i18n_ko'}
BASE = 'https://852wa.github.io/JIZURA/'


def module(code):
    return importlib.import_module(MODULES[code]) if code in MODULES else None


def replace_copy(source, glossary):
    # longest first protects complete phrases from shorter label replacements
    for japanese, local in sorted(glossary.items(), key=lambda pair: -len(pair[0])):
        source = source.replace(japanese, local)
    return source


def localize_body(code, source):
    return replace_copy(source, module(code).BODY)


def localize_js(code, source, filename):
    m = module(code)
    if filename.endswith('12_ui.js'):
        return replace_copy(source, m.UI)
    if filename.endswith('11_export.js'):
        return replace_copy(source, m.EXPORT)
    return source


def names_js(code):
    """styles / moods / sample lyrics in the edition's language (after app/english.js, which names the parts)"""
    m = module(code)
    return ('(() => {\n  const S = ' + json.dumps({k: list(v) for k, v in m.STYLES.items()}, ensure_ascii=False) + ';\n'
            '  for (const [k, [n, d]] of Object.entries(S)) if (J.STYLES[k]) { J.STYLES[k].name = n; J.STYLES[k].desc = d; }\n'
            '  const M = ' + json.dumps(m.MOODS, ensure_ascii=False) + ';\n'
            '  for (const [k, n] of Object.entries(M)) if (J.MOODS[k]) J.MOODS[k].name = n;\n'
            '  J.SAMPLE_LYRICS = ' + json.dumps(m.SAMPLE, ensure_ascii=False) + ';\n'
            '})();\n')


def nav(code):
    """language menu (a select, so five languages fit the header), links relative to the edition's folder"""
    here = dict((c, f) for c, f, _, _ in EDITIONS)[code]
    up = '../' if here else ''
    opts = []
    for c, folder, hl, name in EDITIONS:
        href = up + (folder + '/' if folder else '') + 'index.html'
        opts.append(f'<option value="{href}" lang="{hl}"{" selected" if c == code else ""}>{name}</option>')
    return ('<label class="lang-switch"><span class="sr-only">Language</span>'
            '<select aria-label="Language" onchange="if(this.value)location.href=this.value">' + ''.join(opts) + '</select></label>')


def has_module(code):
    try:
        module(code); return True
    except ModuleNotFoundError:
        return False
