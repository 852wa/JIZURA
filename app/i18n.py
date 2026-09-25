"""Localized browser editions. Japanese (the source) and English (app/english.py) are the originals; the Chinese,
Indonesian, Korean, and Vietnamese editions use the same glossary keys as English, with values in their own module (app/i18n_<code>.py):
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
    ('id', 'id', 'id-ID', 'Bahasa Indonesia'),
    ('vi', 'vi', 'vi', 'Tiếng Việt'),
]
MODULES = {
    'zh-Hant': 'app.i18n_zh_hant', 'zh-Hans': 'app.i18n_zh_hans',
    'ko': 'app.i18n_ko', 'id': 'app.i18n_id', 'vi': 'app.i18n_vi',
}
# community translations (PR #6 by Zaious, PR #8 by andongmin94): their glossary wins over app/i18n_<code>.py, which
# only fills strings added later; their label scripts name every part, style and mood (after app/english.js)
COMMUNITY = {'zh-Hant': ('app.chinese', 'app/chinese.js'), 'ko': ('app.korean', 'app/korean.js')}
# part-name scripts for editions without a community glossary (after app/english.js and the edition's own names)
PART_NAMES = {'zh-Hans': 'app/chinese_hans.js'}
BASE = 'https://852wa.github.io/JIZURA/'


class _Merged:
    def __init__(self, base, over):
        for k in dir(base):
            if not k.startswith('_'): setattr(self, k, getattr(base, k))
        for sec in ('BODY', 'UI', 'EXPORT'):
            merged = dict(getattr(base, sec)); merged.update(getattr(over, sec, {}))
            setattr(self, sec, merged)


_cache = {}
def module(code):
    if code not in MODULES: return None
    if code not in _cache:
        base = importlib.import_module(MODULES[code])
        _cache[code] = _Merged(base, importlib.import_module(COMMUNITY[code][0])) if code in COMMUNITY else base
    return _cache[code]


def labels_js(code):
    """the label scripts injected before the editor starts: English part names, this edition's names, community labels"""
    out = names_js(code)
    if code in COMMUNITY: out += '\n' + open(COMMUNITY[code][1], encoding='utf-8').read()
    if code in PART_NAMES: out += '\n' + open(PART_NAMES[code], encoding='utf-8').read()
    return out


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
    """language menu (a select, so the editions fit the header), links relative to the edition's folder"""
    here = dict((c, f) for c, f, _, _ in EDITIONS)[code]
    up = '../' if here else ''
    opts = []
    for c, folder, hl, name in EDITIONS:
        href = up + (folder + '/' if folder else '') + 'index.html'
        opts.append(f'<option value="{href}" lang="{hl}"{" selected" if c == code else ""}>{name}</option>')
    label = 'Bahasa' if code == 'id' else 'Ngôn ngữ' if code == 'vi' else 'Language'
    return (f'<label class="lang-switch"><span class="sr-only">{label}</span>'
            f'<select aria-label="{label}" onchange="if(this.value)location.href=this.value">' + ''.join(opts) + '</select></label>')


def has_module(code):
    try:
        module(code); return True
    except ModuleNotFoundError:
        return False
