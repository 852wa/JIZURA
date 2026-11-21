"""Refresh changed Korean copy during development; the browser never calls a model.

Check without credentials: python3 tools/translate_ko.py --check
Update: set TRANSLATE_API_KEY, TRANSLATE_API_URL (base URL), TRANSLATE_MODEL,
then run python3 tools/translate_ko.py. Review the resulting source diff.
"""
import argparse
import ast
from copy import deepcopy
import hashlib
import json
import os
from pathlib import Path
import pprint
import re
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
SECTIONS = ('BODY', 'UI', 'EXPORT', 'STYLES', 'MOODS', 'SAMPLE', 'TITLE',
            'DESCRIPTION', 'PARTS', 'SOURCE_HASHES')
COPY_FILES = {'BODY': 'app/body.html', 'UI': 'src/12_ui.js', 'EXPORT': 'src/11_export.js'}
BATCH_SIZE = 30
TRANSLATABLE_ATTRS = {'title', 'aria-label', 'placeholder', 'alt'}
ATTR = re.compile(r'''([\w:-]+)(\s*=\s*)(["'])(.*?)\3''', re.S)
TAG = re.compile(r'</?[A-Za-z][^>]*>')
ESCAPE = re.compile(r'\\(?:u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)', re.S)
JAPANESE = re.compile(r'[\u3000-\u30ff\u3400-\u9fff\uff00-\uffef]')
URL = re.compile(r'https?://[^\s<>\"\']+')


def source_hash(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True).encode('utf-8')).hexdigest()[:16]


def load_catalog(path, sections=SECTIONS):
    """Read data assignments only; generated responses are never Python code."""
    result = {}
    for statement in ast.parse(Path(path).read_text(encoding='utf-8')).body:
        if isinstance(statement, ast.Assign):
            for target in statement.targets:
                if isinstance(target, ast.Name) and target.id in sections:
                    result[target.id] = ast.literal_eval(statement.value)
    return result


def serialize_catalog(catalog):
    header = '"""Korean browser copy. Update changed sources with tools/translate_ko.py."""\n\n'
    return header + '\n\n'.join(name + ' = ' + pprint.pformat(catalog[name], width=120, sort_dicts=False)
                                 for name in SECTIONS) + '\n'


def collect_sources(current, root=ROOT):
    english = load_catalog(root / 'app/english.py', COPY_FILES)
    sources = {}
    for section, filename in COPY_FILES.items():
        text = (root / filename).read_text(encoding='utf-8')
        # Keep active community-only phrases as well as the shared English keys.
        keys = dict.fromkeys([*english[section], *current[section]])
        sources[section] = {key: key for key in keys if key in text}
    labels = json.loads(subprocess.check_output(
        ['node', str(root / 'tools/export_english_labels.js'), '--source'], text=True, cwd=root))
    sources['STYLES'] = {key: [value['name'], value['desc']] for key, value in labels['styles'].items()}
    sources['MOODS'] = labels['moods']
    sources['PARTS'] = labels['groups']
    return sources


def plan_updates(current, sources):
    """Return a pruned candidate and (path, source) entries needing translation."""
    candidate = {section: deepcopy(current[section]) for section in SECTIONS}
    candidate['SOURCE_HASHES'] = {'STYLES': {}, 'MOODS': {}, 'PARTS': {}}
    pending = []
    hashes = current['SOURCE_HASHES']
    for section in COPY_FILES:
        candidate[section] = {}
        for key, source in sources[section].items():
            value = current[section].get(key)
            candidate[section][key] = value or ''
            if not value:
                pending.append(((section, key), source))
    for section in ('STYLES', 'MOODS'):
        candidate[section] = {}
        for key, source in sources[section].items():
            value = current[section].get(key)
            fingerprint = source_hash(source)
            candidate[section][key] = value or (['', ''] if section == 'STYLES' else '')
            candidate['SOURCE_HASHES'][section][key] = fingerprint
            if not value or hashes.get(section, {}).get(key) != fingerprint:
                pending.append(((section, key), source))
    candidate['PARTS'] = {}
    for group, parts in sources['PARTS'].items():
        candidate['PARTS'][group] = {}
        candidate['SOURCE_HASHES']['PARTS'][group] = {}
        for key, source in parts.items():
            value = current['PARTS'].get(group, {}).get(key)
            fingerprint = source_hash(source)
            candidate['PARTS'][group][key] = value or ''
            candidate['SOURCE_HASHES']['PARTS'][group][key] = fingerprint
            if not value or hashes.get('PARTS', {}).get(group, {}).get(key) != fingerprint:
                pending.append((('PARTS', group, key), source))
    return candidate, pending


def _expression_end(text, start):
    """Find the closing brace of a JS interpolation, respecting string literals."""
    depth, index = 1, start
    while index < len(text):
        char = text[index]
        if char in "'\"`":
            index = _string_end(text, index) + 1
            continue
        if char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                return index
        index += 1
    raise ValueError('Unclosed JavaScript interpolation')


def _string_end(text, start):
    quote, index = text[start], start + 1
    while index < len(text):
        if text[index] == '\\':
            index += 2
            continue
        if quote == '`' and text.startswith('${', index):
            index = _expression_end(text, index + 2) + 1
            continue
        if text[index] == quote:
            return index
        index += 1
    raise ValueError('Unclosed JavaScript string')


def _js_segments(text):
    """Split the small JS snippets used by the existing UI/export dictionaries."""
    segments, start, index = [], 0, 0
    while index < len(text):
        if text[index] in "'\"`":
            if start < index:
                segments.append(('code', text[start:index]))
            end = _string_end(text, index)
            segments.append((text[index], text[index + 1:end]))
            index = start = end + 1
        else:
            index += 1
    if start < len(text):
        segments.append(('code', text[start:]))
    return segments


def _validate_code(source, translated):
    left, right = _js_segments(source), _js_segments(translated)
    if len(left) != len(right):
        raise ValueError('JavaScript string boundaries changed')
    for (kind, original), (other_kind, value) in zip(left, right):
        if kind != other_kind:
            raise ValueError('JavaScript quote delimiters changed')
        if kind == 'code' or not JAPANESE.search(original):
            if original != value:
                raise ValueError('JavaScript expression or non-display literal changed')
        else:
            _validate_text(original, value)


def _interpolations(text):
    expressions, index = [], 0
    while True:
        start = text.find('${', index)
        if start < 0:
            return expressions
        end = _expression_end(text, start + 2)
        expressions.append(text[start + 2:end])
        index = end + 1


def _attribute_signature(text):
    return [(name, equals, quote, '' if name in TRANSLATABLE_ATTRS else value)
            for name, equals, quote, value in ATTR.findall(text)]


def _tag_signature(text):
    def normalize(match):
        name, equals, quote, value = match.groups()
        if name in TRANSLATABLE_ATTRS:
            value = ''
        return name + equals + quote + value + quote
    return [ATTR.sub(normalize, tag) for tag in TAG.findall(text)]


def _validate_text(source, translated):
    if ESCAPE.findall(source) != ESCAPE.findall(translated):
        raise ValueError('Escaped literals changed')
    left, right = _interpolations(source), _interpolations(translated)
    if len(left) != len(right):
        raise ValueError('JavaScript placeholders were added or removed')
    # Korean grammar can reorder placeholders, but cannot change or duplicate them.
    remaining = list(right)
    for original in left:
        for index, value in enumerate(remaining):
            try:
                _validate_code(original, value)
            except ValueError:
                continue
            del remaining[index]
            break
        else:
            raise ValueError('JavaScript placeholder expression changed')
    if _attribute_signature(source) != _attribute_signature(translated):
        raise ValueError('HTML attribute names, delimiters or non-display values changed')
    if _tag_signature(source) != _tag_signature(translated):
        raise ValueError('HTML tags or non-display attributes changed')
    if URL.findall(source) != URL.findall(translated):
        raise ValueError('URL targets changed')
    # A translated display string must not terminate an inline script.
    if translated.lower().count('</script') != source.lower().count('</script'):
        raise ValueError('A script closing tag was introduced')


def validate_copy(source, translated):
    """Raise ValueError for missing text or changes to surrounding executable syntax."""
    if not isinstance(translated, str) or (source.strip() and not translated.strip()):
        raise ValueError('Translation must be a nonempty string')
    if source.startswith(("'", '"', '`')):
        # Some existing keys replace only the start of a JS string. The complete
        # localized UI/export source is syntax-checked before the file is written.
        if source.count(source[0]) == 1:
            if not translated.startswith(source[0]) or translated.count(source[0]) != 1:
                raise ValueError('JavaScript string prefix delimiter changed')
            _validate_text(source[1:], translated[1:])
        else:
            _validate_code(source, translated)
    else:
        _validate_text(source, translated)


def validate_value(source, translated):
    if isinstance(source, list):
        if not isinstance(translated, list) or len(source) != len(translated):
            raise ValueError('Translated list has the wrong shape')
        for original, value in zip(source, translated):
            validate_copy(original, value)
    else:
        validate_copy(source, translated)


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('The JSON response repeats a key: ' + key)
        result[key] = value
    return result


def request_translations(batch, settings):
    key, api_url, model = settings
    payload = {
        'model': model,
        'max_tokens': 16000,
        'response_format': {'type': 'json_object'},
        'messages': [
            {'role': 'system', 'content': (
                'Translate the Japanese source values into concise, natural Korean for JIZURA, '
                'a lyric-motion video editor. Return one JSON object mapping each supplied id to '
                'its translation; keep arrays at the same length. Context identifies the UI area or '
                'effect; never turn internal identifiers into display names. Use consistent video '
                'editing terms: 와이프, 디졸브, 글리치, 자간, 내보내기. Preserve all code, identifiers, '
                'operators, quote delimiters, escapes, URLs, HTML tags and non-display attributes. '
                'Translate title/aria-label/placeholder/alt attribute values. In ${...}, preserve '
                'the expression, translating only Japanese display-string literals. Do not add '
                'explanations, markdown fences, keys, or empty translations.')},
            {'role': 'user', 'content': json.dumps({
                str(index): {'context': '.'.join(path), 'source': source}
                for index, (path, source) in enumerate(batch)
            }, ensure_ascii=False)},
        ],
    }
    request = urllib.request.Request(api_url.rstrip('/') + '/chat/completions',
                                     data=json.dumps(payload, ensure_ascii=False).encode('utf-8'),
                                     headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=60) as response:
        answer = json.load(response)
    try:
        content = answer['choices'][0]['message']['content']
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError('The API response has no assistant message') from exc
    if not isinstance(content, str):
        raise ValueError('The API response has no text content')
    translations = json.loads(content, object_pairs_hook=_unique_object)
    expected = {str(index) for index in range(len(batch))}
    if not isinstance(translations, dict) or set(translations) != expected:
        raise ValueError('The response must contain exactly the requested translation ids')
    values = []
    for index, (path, source) in enumerate(batch):
        value = translations[str(index)]
        try:
            validate_value(source, value)
        except ValueError as exc:
            raise ValueError('.'.join(path) + ': ' + str(exc)) from exc
        values.append(value)
    return values


def validate_javascript(catalog, root=ROOT):
    for section in ('UI', 'EXPORT'):
        source = (root / COPY_FILES[section]).read_text(encoding='utf-8')
        for original, translated in sorted(catalog[section].items(), key=lambda item: -len(item[0])):
            source = source.replace(original, translated)
        result = subprocess.run(['node', '--check'], input=source, text=True, capture_output=True)
        if result.returncode:
            raise ValueError(f'{COPY_FILES[section]}: translated JavaScript is invalid\n{result.stderr}')


def update_catalog(path, sources, *, check=False, root=ROOT):
    current = load_catalog(path)
    candidate, pending = plan_updates(current, sources)
    changed = candidate != current
    if check:
        print(f'{len(pending)} translations need updating; catalog ' + ('needs synchronization' if changed else 'is current'))
        return int(changed)
    if not changed:
        print('Korean catalog is current; no API calls or file changes')
        return 0
    if pending:
        names = ('TRANSLATE_API_KEY', 'TRANSLATE_API_URL', 'TRANSLATE_MODEL')
        missing = [name for name in names if not os.environ.get(name)]
        if missing:
            raise ValueError('Set ' + ', '.join(missing) + ' to update translations; use --check without credentials')
        settings = tuple(os.environ[name] for name in names)
        for start in range(0, len(pending), BATCH_SIZE):
            batch = pending[start:start + BATCH_SIZE]
            values = request_translations(batch, settings)
            for (keys, _), value in zip(batch, values):
                target = candidate
                for key in keys[:-1]:
                    target = target[key]
                target[keys[-1]] = value
            print(f'Translated {min(start + BATCH_SIZE, len(pending))}/{len(pending)} entries')
    validate_javascript(candidate, root)
    # Nothing is written until every response and the resulting JS have passed.
    Path(path).write_text(serialize_catalog(candidate), encoding='utf-8')
    print(f'Updated {path}; review the diff before committing')
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='report pending changes, without calling an API or writing files')
    args = parser.parse_args()
    path = ROOT / 'app/i18n_ko.py'
    try:
        return update_catalog(path, collect_sources(load_catalog(path)), check=args.check)
    except urllib.error.HTTPError as exc:
        print(f'Translation API returned HTTP {exc.code}', file=sys.stderr)
    except (ValueError, KeyError, OSError, subprocess.SubprocessError) as exc:
        print(str(exc), file=sys.stderr)
    return 2


if __name__ == '__main__':
    sys.exit(main())
