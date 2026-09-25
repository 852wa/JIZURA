"""Syntax-check the inline scripts of a built page with node.  usage: python3 tools/check_page_js.py zh-hant/index.html"""
import re, subprocess, sys, tempfile, os
html = open(sys.argv[1], encoding='utf-8').read()
ok = True
for i, sc in enumerate(re.findall(r'<script>(.*?)</script>', html, re.S)):
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f: f.write(sc); fn = f.name
    r = subprocess.run(['node', '--check', fn], capture_output=True, text=True); os.unlink(fn)
    if r.returncode: ok = False; print('script', i, r.stderr[:800])
print('JS OK' if ok else 'JS ERRORS')
