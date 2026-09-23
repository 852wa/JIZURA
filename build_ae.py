"""Build the After Effects ScriptUI panel (JIZURA_AE.jsx) from ae/*.jsx and ae/data.json.
Regenerate ae/data.json from the web engine first when styles change:  node tools/export_ae_data.js"""
import json, os
ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
parts = ['00_core', '10_helpers', '15_plan', '16_omakase', '20_motion', '30_layouts', '40_decor', '50_build', '90_ui']
data = json.load(open('ae/data.json', encoding='utf-8'))
body = '\n'.join(open(f'ae/{p}.jsx', encoding='utf-8').read() for p in parts)
head = '''/*  JIZURA 字面 — lyric motion panel for Adobe After Effects
    Put this file in:  After Effects <version>/Support Files/Scripts/ScriptUI Panels/
    Restart AE, then open  Window > JIZURA_AE.jsx
    (Or run it once via File > Scripts > Run Script File... as a floating window.)
    License: see LICENSE in the source repository.
*/
'''
src = '#target aftereffects\n' + head + '(function (thisObj) {\nvar JZ_DATA = ' + json.dumps(data, ensure_ascii=True) + ';\n' + body + '\njzUI(thisObj);\n})(this);\n'
# escape every non-ASCII character so the file is encoding-proof in ExtendScript
out = []
for ch in src:
    o = ord(ch)
    if o < 128: out.append(ch)
    elif o <= 0xFFFF: out.append('\\u%04X' % o)
    else:
        o -= 0x10000; out.append('\\u%04X\\u%04X' % (0xD800 + (o >> 10), 0xDC00 + (o & 0x3FF)))
open('JIZURA_AE.jsx', 'w', encoding='utf-8').write(''.join(out))
print('JIZURA_AE.jsx', len(out), 'chars')
