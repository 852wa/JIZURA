"""Build the Japanese and English single-file browser editions from src/, app/ and vendor/.
usage: python3 build.py            -> index.html and en/index.html (GitHub Pages)
       python3 build.py --dev      -> also dev/www/jizura.js + dev/www/test.html for the test tools"""
import glob, os, sys
from app.english import localize_body as localize_body_en, localize_js as localize_js_en\nfrom app.korean import localize_body as localize_body_ko, localize_js as localize_js_ko
ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
read = lambda p: open(p, encoding='utf-8').read()
sources = sorted(glob.glob('src/*.js'))
js = '\n'.join(read(f) for f in sources)
mux = '/*! mp4-muxer v5.2.2 | MIT License | (c) 2023 Vanilagy | see THIRD_PARTY_NOTICES.md */\n' + read('vendor/mp4-muxer.min.js')
def build(lang):
    english = lang == 'en'
    korean = lang == 'ko'
    title = ('JIZURA — Lyric Motion Video Maker' if english else
             'JIZURA — 가사 모션 비디오 메이커' if korean else 'JIZURA 字面')
    description = ('Turn lyrics into animated lyric videos in your browser and export MP4.' if english else
                   '가사를 넣으면 리릭 모션 영상을 자동으로 구성하고 브라우저에서 MP4로 내보내는 앱' if korean else
                   '歌詞を入れると文字PV（リリックモーション）を自動で組み立てて MP4 に書き出すブラウザアプリ')
    base = 'https://852wa.github.io/JIZURA/'
    canonical = base + ('en/' if english else 'ko/' if korean else '')
    links = [
        ('ja', '../index.html' if (english or korean) else 'index.html', '日本語'),
        ('en', '../en/index.html' if korean else 'en/index.html' if not english else 'index.html', 'English'),
        ('ko', '../ko/index.html' if english else 'ko/index.html' if not korean else 'index.html', '한국어'),
    ]
    language_nav = '<nav class="lang-switch" aria-label="' + ('Language' if english else '언어' if korean else '言語') + '">'
    nav_items = []
    for code, href, label in links:
        nav_items.append('<span aria-current="page">' + label + '</span>' if code == lang else '<a href="' + href + '" lang="' + code + '">' + label + '</a>')
    language_nav += ''.join(nav_items) + '</nav>'
    body = read('app/body.html').replace('    <div class="acts">', '    ' + language_nav + '\n    <div class="acts">', 1)
    if english: body = localize_body_en(body)
    if korean: body = localize_body_ko(body)
    if english:
        script = '\n'.join(localize_js_en(read(f), f) for f in sources)
    elif korean:
        script = '\n'.join(localize_js_ko(read(f), f) for f in sources)
    else:
        script = js
    if english or korean:
        marker = '/* ============================================================\n   JIZURA — editor UI'
        if marker not in script: raise ValueError('Could not find browser UI entry point')
        labels = 'app/english.js' if english else 'app/korean.js'
        script = script.replace(marker, read(labels) + '\n' + marker, 1)
    html = f'''<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="canonical" href="{canonical}">
<link rel="alternate" hreflang="ja" href="{base}">
<link rel="alternate" hreflang="en" href="{base}en/">
<link rel="alternate" hreflang="ko" href="{base}ko/">
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
    target = 'en/index.html' if english else 'ko/index.html' if korean else 'index.html'
    os.makedirs(os.path.dirname(target) or '.', exist_ok=True)
    open(target, 'w', encoding='utf-8').write(html)
    print(target, len(html), 'bytes')
build('ja')
build('en')
build('ko')
if '--dev' in sys.argv:
    os.makedirs('dev/www', exist_ok=True)
    open('dev/www/jizura.js', 'w', encoding='utf-8').write(js)
    open('dev/www/test.html', 'w', encoding='utf-8').write(read('dev/test.html'))
    print('dev/www ready: cd dev/www && python3 -m http.server 8765')
