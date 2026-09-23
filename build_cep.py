"""Build the After Effects CEP panel (HTML panel = the browser app + "build in AE" bridge).
usage: python3 build_cep.py [--debug]
  -> <out>/com.852wa.jizura/   the extension folder (unsigned; install in debug mode or sign it into a .zxp)
     <out>/JIZURA_CEP.zip       that folder + install notes + signing scripts
Needs the built browser app (dist/JIZURA.html or index.html) — run build.py first.
--debug adds a .debug file (Chrome DevTools on http://localhost:8098) — for development only."""
import argparse, glob, os, shutil, subprocess, sys, zipfile
ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
VERSION = '1.0.0'
ap = argparse.ArgumentParser()
ap.add_argument('--out', default='dist' if os.path.isdir('dist') else 'build')
ap.add_argument('--debug', action='store_true')
a = ap.parse_args()

app_html = next((p for p in ['dist/JIZURA.html', 'index.html'] if os.path.exists(p)), None)
if not app_html: sys.exit('build the browser app first (python3 build.py)')
ext = os.path.join(a.out, 'com.852wa.jizura')
if os.path.isdir(ext): shutil.rmtree(ext)
os.makedirs(os.path.join(ext, 'CSXS')); os.makedirs(os.path.join(ext, 'jsx'))

def es_escape(src):
    """escape every non-ASCII character so the ExtendScript file is encoding-proof"""
    out = []
    for ch in src:
        o = ord(ch)
        if o < 128: out.append(ch)
        elif o <= 0xFFFF: out.append('\\u%04X' % o)
        else:
            o -= 0x10000; out.append('\\u%04X\\u%04X' % (0xD800 + (o >> 10), 0xDC00 + (o & 0x3FF)))
    return ''.join(out)

# 1) panel page: the browser app + a Node-context guard for the MP4 muxer + the AE bridge
html = open(app_html, encoding='utf-8').read()
guard = "<script>if(!window.Mp4Muxer&&typeof module!=='undefined'&&module&&module.exports&&module.exports.Muxer)window.Mp4Muxer=module.exports;</script>\n"
i = html.index('</script>') + len('</script>\n')          # right after the mp4-muxer script
html = html[:i] + guard + html[i:]
bridge = open('cep/cep.js', encoding='utf-8').read()
html = html.replace('</body>', '<script>\n' + bridge + '\n</script>\n</body>', 1)
open(os.path.join(ext, 'index.html'), 'w', encoding='utf-8').write(html)

# 2) ExtendScript side: host + the build engine (same code as JIZURA_AE.jsx, without its ScriptUI)
open(os.path.join(ext, 'jsx', 'host.jsx'), 'w', encoding='utf-8').write(es_escape(open('cep/host.jsx', encoding='utf-8').read()))
subprocess.run([sys.executable, 'build_ae.py', '--core', '--out', os.path.join(ext, 'jsx', 'jizura_core.jsx')], check=True, stdout=subprocess.DEVNULL)

# 3) manifest (+ optional remote-debug file)
open(os.path.join(ext, 'CSXS', 'manifest.xml'), 'w', encoding='utf-8').write(open('cep/manifest.xml', encoding='utf-8').read().replace('@VERSION@', VERSION))
if a.debug:
    open(os.path.join(ext, '.debug'), 'w', encoding='utf-8').write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<ExtensionList>\n  <Extension Id="com.852wa.jizura.panel">\n    <HostList>\n      <Host Name="AEFT" Port="8098"/>\n    </HostList>\n  </Extension>\n</ExtensionList>\n')
for f in ['LICENSE', 'THIRD_PARTY_NOTICES.md']:
    if os.path.exists(f): shutil.copy(f, ext)

# 4) distributable zip: extension folder + install notes + signing scripts
zp = os.path.join(a.out, 'JIZURA_CEP.zip')
with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
    for p in sorted(glob.glob(os.path.join(ext, '**'), recursive=True) + glob.glob(os.path.join(ext, '.debug'))):
        if os.path.isfile(p): z.write(p, os.path.join('JIZURA_CEP', os.path.relpath(p, a.out)))
    for f in sorted(glob.glob('cep/dist/*')):
        z.write(f, os.path.join('JIZURA_CEP', os.path.basename(f)))
size = sum(os.path.getsize(p) for p in glob.glob(os.path.join(ext, '**'), recursive=True) if os.path.isfile(p))
print(ext, f'{size // 1024} KB', '->', zp, f'{os.path.getsize(zp) // 1024} KB', '(debug)' if a.debug else '')
