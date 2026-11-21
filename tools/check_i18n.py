"""Check a translation module: every English glossary key is translated and no Japanese is left on the page.
usage: python3 tools/check_i18n.py zh-Hant|zh-Hans|ko|id|vi"""
import json, os, re, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); os.chdir(ROOT)
from app import english as E, i18n
code = sys.argv[1]
m = i18n.module(code)
bad = 0
read = lambda p: open(p, encoding='utf-8').read()
source_files = {'BODY': 'app/body.html', 'UI': 'src/12_ui.js', 'EXPORT': 'src/11_export.js'}
for sec in ('BODY', 'UI', 'EXPORT'):
    source = read(source_files[sec])
    miss = [k for k in getattr(E, sec) if k in source and k not in getattr(m, sec)]
    if miss: bad += len(miss); print(sec, 'missing', len(miss), miss[:10])
for k in ('STYLES', 'MOODS', 'SAMPLE', 'TITLE', 'DESCRIPTION'):
    if not getattr(m, k, None): bad += 1; print('missing', k)
if code == 'ko':
    from translate_ko import validate_copy
    for section in source_files:
        for source, translated in getattr(m, section).items():
            try:
                validate_copy(source, translated)
            except ValueError as exc:
                bad += 1; print(section, 'invalid structure', repr(source), str(exc))
kana = re.compile(r'[぀-ヿ]')
han = re.compile(r'[㐀-鿿]')
allowed = {'字面', '日本語', '繁體中文', '简体中文', '태'}
def left(text, name):
    global bad
    for i, l in enumerate(text.split('\n')):
        l2 = re.sub(r'//.*$', '', l); l2 = re.sub(r'/\*.*?\*/', '', l2)
        l3 = l2
        for a in allowed: l3 = l3.replace(a, '')
        l3 = l3.replace('/bold|太|black', '')           # font weight guess regex
        hit = kana.search(l3) or (code not in ('zh-Hant', 'zh-Hans') and han.search(l3))
        if hit: bad += 1; print(name, i + 1, l2.strip()[:160])
left(i18n.localize_body(code, read('app/body.html')), 'body')
left(i18n.localize_js(code, read('src/12_ui.js'), 'src/12_ui.js'), '12_ui')
left(i18n.localize_js(code, read('src/11_export.js'), 'src/11_export.js'), '11_export')
if hasattr(m, 'PARTS'):
    originals = json.loads(subprocess.check_output(
        ['node', 'tools/export_english_labels.js', '--source'], text=True))['groups']
    for group in sorted(set(originals) | set(m.PARTS)):
        source = originals.get(group, {})
        translated = m.PARTS.get(group, {})
        missing = sorted(set(source) - set(translated))
        removed = sorted(set(translated) - set(source))
        if missing: bad += len(missing); print('PARTS', group, 'missing', missing)
        if removed: bad += len(removed); print('PARTS', group, 'removed from source', removed)
        for key, name in translated.items():
            if not isinstance(name, str) or not name.strip() or name == key or kana.search(name):
                bad += 1; print('PARTS', group, key, 'invalid label', repr(name))
print('OK' if not bad else f'{bad} problems')
sys.exit(0 if not bad else 1)
