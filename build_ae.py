"""Build the After Effects panel (single ScriptUI .jsx) from ae/*.jsx + ae/data.json.
usage: python3 build_ae.py                         -> JIZURA_AE.jsx (core + every ae/p_*.jsx pack)
       python3 build_ae.py --packs p_a,p_b --out dev/www/ae_x.jsx   (core + only the listed packs; for testing one pack)
Regenerate ae/data.json from the web engine first whenever src/ changes:  node tools/export_ae_data.js"""
import json, os, glob, argparse, subprocess
from app.english import localize_ae
os.chdir(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument('--packs', default=None, help='comma separated pack names (p_xxx) or "none"; default: all ae/p_*.jsx')
ap.add_argument('--out', default=None)
ap.add_argument('--core', action='store_true', help='engine only (no ScriptUI), exposed as $.global.JZ_CORE — used by the CEP panel')
ap.add_argument('--lang', choices=['ja', 'en'], default='ja', help='interface language (default: Japanese)')
a = ap.parse_args()
if a.out is None: a.out = 'dist/JIZURA_CEP/jsx/jizura_core.jsx' if a.core else ('JIZURA_AE_en.jsx' if a.lang == 'en' else 'JIZURA_AE.jsx')
allpacks = sorted(os.path.basename(f)[:-4] for f in glob.glob('ae/p_*.jsx'))
packs = allpacks if a.packs is None else ([] if a.packs == 'none' else [p.strip().replace('.jsx', '').replace('ae/', '') for p in a.packs.split(',') if p.strip()])
parts = ['00_core', '05_reg', '10_helpers', '15_plan', '16_omakase', '20_motion', '30_layouts', '40_decor', '45_core'] + packs + ['50_build', '55_diag'] + ([] if a.core else ['90_ui'])
data = json.load(open('ae/data.json', encoding='utf-8'))
if a.lang == 'en':
    labels = json.loads(subprocess.check_output(['node', 'tools/export_english_labels.js'], text=True))
    for key, value in labels['styles'].items():
        if key in data['styles']: data['styles'][key].update(value)
    for key, name in labels['moods'].items():
        if key in data['moods']: data['moods'][key]['name'] = name
    for group, entries in labels['groups'].items():
        for key, name in entries.items():
            if key in data['names'].get(group, {}): data['names'][group][key] = name
            if key in data['meta'].get(group, {}): data['meta'][group][key]['name'] = name
body = '\n'.join(localize_ae(open(f'ae/{p}.jsx', encoding='utf-8').read()) if a.lang == 'en' and p == '90_ui' else open(f'ae/{p}.jsx', encoding='utf-8').read() for p in parts)
head = '''/*  JIZURA 字面 — lyric motion panel for Adobe After Effects  (v2.0)
    Put this file in:  After Effects <version>/Support Files/Scripts/ScriptUI Panels/
    Restart AE, then open  Window > JIZURA_AE.jsx
    (Or run it once via File > Scripts > Run Script File... as a floating window.)
    License: see LICENSE in the source repository.
*/
'''
if a.core:
    head = '/*  JIZURA 字面 — After Effects build engine for the CEP panel (v2.0). Loaded by host.jsx. */\n'
    api = ('$.global.JZ_CORE = { version: 2, build: jzBuild, makePlan: jzMakePlan, keyStyle: jzKeyStyle, parse: jzParseJSON, '
           'log: function () { return JZLOG; }, fallbacks: function () { return JZ_FALLBACKS; }, missingFonts: jzMissingFonts, diagnose: jzDiagnose, saveReport: jzSaveReport, parts: jzPartsCount, panelVersion: JZ_PANEL_VERSION, fontCheckUnavailable: function () { return JZ_FONT_NOAPI; }, roleDefault: JZ_ROLE_DEFAULT, data: JZ_DATA };')
    src = head + '(function () {\nvar JZ_DATA = ' + json.dumps(data, ensure_ascii=True) + ';\n' + body + '\n' + api + '\n})();\n'
else:
    if a.lang == 'en': head = head.replace('JIZURA 字面', 'JIZURA')
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
