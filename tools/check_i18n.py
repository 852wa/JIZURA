"""Check a translation module: every English glossary key is translated and no Japanese is left on the page.
usage: python3 tools/check_i18n.py zh-Hant|zh-Hans|ko"""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); os.chdir(ROOT)
from app import english as E, i18n
code = sys.argv[1]
m = i18n.module(code)
bad = 0
for sec in ('BODY', 'UI', 'EXPORT'):
    miss = [k for k in getattr(E, sec) if k not in getattr(m, sec)]
    if miss: bad += len(miss); print(sec, 'missing', len(miss), miss[:10])
for k in ('STYLES', 'MOODS', 'SAMPLE', 'TITLE', 'DESCRIPTION'):
    if not getattr(m, k, None): bad += 1; print('missing', k)
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
        hit = kana.search(l3) or (code == 'ko' and han.search(l3))
        if hit: bad += 1; print(name, i + 1, l2.strip()[:160])
read = lambda p: open(p, encoding='utf-8').read()
left(i18n.localize_body(code, read('app/body.html')), 'body')
left(i18n.localize_js(code, read('src/12_ui.js'), 'src/12_ui.js'), '12_ui')
left(i18n.localize_js(code, read('src/11_export.js'), 'src/11_export.js'), '11_export')
print('OK' if not bad else f'{bad} problems')
