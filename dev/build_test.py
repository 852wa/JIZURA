"""Build an isolated test bundle: core engine (src/*.js except packs) + the given pack files.
usage: python3 dev/build_test.py NAME [src/11p_x.js ...]   ->  dev/www/t_NAME.js + dev/www/t_NAME.html
       python3 dev/build_test.py NAME --all-packs          (core + every src/11p_*.js)
       python3 dev/build_test.py NAME --autotiming         (jizura_core.js: the modules the
                                                            auto-timing needs, no packs, no UI)"""
import glob, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
name = sys.argv[1]
args = sys.argv[2:]
allsrc = sorted(glob.glob('src/*.js'))
packs = [f for f in allsrc if os.path.basename(f).startswith('11p_')]
core = [f for f in allsrc if f not in packs]
chosen = packs if '--all-packs' in args else [a for a in args if a.endswith('.js')]
files = sorted(core + chosen)          # keep global load order (packs load before 12_ui)
out = f'dev/www/t_{name}.js'
if '--autotiming' in args:
    # the automatic timing on its own: engine + audio + recognition + alignment, and
    # none of the 1.9 MB of expression packs or the editor UI, so the browser test
    # starts fast and only loads what it exercises
    files = [f for f in core if not f.startswith('src/11') and os.path.basename(f) not in
             ('02_fonts.js', '09_render.js', '11_export.js', '12_ui.js')]
    out = 'dev/www/jizura_core.js'
js = '\n'.join(open(f, encoding='utf-8').read() for f in files)
os.makedirs('dev/www', exist_ok=True)
open(out, 'w', encoding='utf-8').write(js)
if out.endswith('jizura_core.js'):
    print('built', out, 'files:', [os.path.basename(f) for f in files])
    sys.exit(0)
page = open('dev/test.html', encoding='utf-8').read().replace('src="jizura.js"', f'src="t_{name}.js"')
open(f'dev/www/t_{name}.html', 'w', encoding='utf-8').write(page)
print('built', f'dev/www/t_{name}.html', 'files:', len(files), 'packs:', [os.path.basename(c) for c in chosen])
