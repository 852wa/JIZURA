"""Build the After Effects panel (single ScriptUI .jsx) from ae/*.jsx + ae/data.json.
usage: python3 build_ae.py                         -> JIZURA_AE.jsx (core + every ae/p_*.jsx pack)
       python3 build_ae.py --packs p_a,p_b --out dev/www/ae_x.jsx   (core + only the listed packs; for testing one pack)
Regenerate ae/data.json from the web engine first whenever src/ changes:  node tools/export_ae_data.js"""
import json, os, glob, argparse
os.chdir(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument('--packs', default=None, help='comma separated pack names (p_xxx) or "none"; default: all ae/p_*.jsx')
ap.add_argument('--out', default='JIZURA_AE.jsx')
a = ap.parse_args()
allpacks = sorted(os.path.basename(f)[:-4] for f in glob.glob('ae/p_*.jsx'))
packs = allpacks if a.packs is None else ([] if a.packs == 'none' else [p.strip().replace('.jsx', '').replace('ae/', '') for p in a.packs.split(',') if p.strip()])
parts = ['00_core', '05_reg', '10_helpers', '15_plan', '16_omakase', '20_motion', '30_layouts', '40_decor', '45_core'] + packs + ['50_build', '90_ui']
data = json.load(open('ae/data.json', encoding='utf-8'))
body = '\n'.join(open(f'ae/{p}.jsx', encoding='utf-8').read() for p in parts)
head = '''/*  JIZURA 字面 — lyric motion panel for Adobe After Effects  (v2.0)
    Put this file in:  After Effects <version>/Support Files/Scripts/ScriptUI Panels/
    Restart AE, then open  Window > JIZURA_AE.jsx
    (Or run it once via File > Scripts > Run Script File... as a floating window.)
    License: see LICENSE in the source repository.
*/
'''
src = head + '(function (thisObj) {\nvar JZ_DATA = ' + json.dumps(data, ensure_ascii=True) + ';\n' + body + '\njzUI(thisObj);\n})(this);\n'
src = '#target aftereffects\n' + src
# escape every non-ASCII character so the file is encoding-proof in ExtendScript
out = []
for ch in src:
    o = ord(ch)
    if o < 128: out.append(ch)
    elif o <= 0xFFFF: out.append('\\u%04X' % o)
    else:
        o -= 0x10000; out.append('\\u%04X\\u%04X' % (0xD800 + (o >> 10), 0xDC00 + (o & 0x3FF)))
esc = ''.join(out)
os.makedirs(os.path.dirname(a.out) or '.', exist_ok=True)
open(a.out, 'w', encoding='utf-8').write(esc)
print(a.out, len(esc), 'bytes, packs:', packs)
