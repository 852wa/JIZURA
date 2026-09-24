"""Build the Japanese, English and Traditional Chinese single-file browser editions from src/, app/ and vendor/.
usage: python3 build.py            -> index.html, en/index.html and zh-Hant/index.html (GitHub Pages)
       python3 build.py --dev      -> also dev/www/jizura.js + dev/www/test.html for the test tools"""
import glob, os, sys
from app import english, chinese
ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
read = lambda p: open(p, encoding='utf-8').read()
sources = sorted(glob.glob('src/*.js'))
js = '\n'.join(read(f) for f in sources)
mux = '/*! mp4-muxer v5.2.2 | MIT License | (c) 2023 Vanilagy | see THIRD_PARTY_NOTICES.md */\n' + read('vendor/mp4-muxer.min.js')
SITE = 'https://852wa.github.io/JIZURA/'
# lang: folder, name in the language switch, its aria-label, title, description, copy module, label script
EDITIONS = {
    'ja': ('', '日本語', '言語', 'JIZURA 字面', '歌詞を入れると文字PV（リリックモーション）を自動で組み立てて MP4 に書き出すブラウザアプリ', None, None),
    'en': ('en/', 'English', 'Language', 'JIZURA — Lyric Motion Video Maker', 'Turn lyrics into animated lyric videos in your browser and export MP4.', english, 'app/english.js'),
    'zh-Hant': ('zh-Hant/', '繁體中文', '語言', 'JIZURA 字面 — 歌詞動態影片產生器', '輸入歌詞，就會自動組合出文字 MV（歌詞動態影片）並匯出 MP4 的瀏覽器應用程式', chinese, 'app/chinese.js'),
}
def language_nav(lang):
    up = '../' * EDITIONS[lang][0].count('/')
    links = ''.join(f'<span aria-current="page">{name}</span>' if code == lang else f'<a href="{up}{folder}index.html" lang="{code}">{name}</a>'
                    for code, (folder, name, *_) in EDITIONS.items())
    return f'<nav class="lang-switch" aria-label="{EDITIONS[lang][2]}">{links}</nav>'
def build(lang):
    folder, _, _, title, description, copy, labels = EDITIONS[lang]
    canonical = SITE + folder
    body = read('app/body.html').replace('    <div class="acts">', '    ' + language_nav(lang) + '\n    <div class="acts">', 1)
    if copy: body = copy.localize_body(body)
    script = '\n'.join(copy.localize_js(read(f), f) for f in sources) if copy else js
    if labels:
        marker = '/* ============================================================\n   JIZURA — editor UI'
        if marker not in script: raise ValueError('Could not find browser UI entry point')
        script = script.replace(marker, read(labels) + '\n' + marker, 1)
    alternates = '\n'.join(f'<link rel="alternate" hreflang="{code}" href="{SITE}{edition[0]}">' for code, edition in EDITIONS.items())
    html = f'''<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="canonical" href="{canonical}">
{alternates}
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="{canonical}">
<meta name="twitter:card" content="summary">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<style>
{read('app/style.css')}
</style>
</head>
<body>
{body}
<script>
{mux}
</script>
<script>
{script}
</script>
</body>
</html>
'''
    target = folder + 'index.html'
    os.makedirs(os.path.dirname(target) or '.', exist_ok=True)
    open(target, 'w', encoding='utf-8').write(html)
    print(target, len(html), 'bytes')
for lang in EDITIONS: build(lang)
if '--dev' in sys.argv:
    os.makedirs('dev/www', exist_ok=True)
    open('dev/www/jizura.js', 'w', encoding='utf-8').write(js)
    open('dev/www/test.html', 'w', encoding='utf-8').write(read('dev/test.html'))
    print('dev/www ready: cd dev/www && python3 -m http.server 8765')
