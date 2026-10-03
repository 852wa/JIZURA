"""End-to-end timing accuracy on real songs, in a real browser.

Runs dev/autolrc.html over a directory of real recordings and scores the generated line
times against a reference LRC, so a change to the recognition or the alignment can be
measured on material that is not synthetic.

The audio and the lyrics are copyrighted and are not in the repository. Put them in a
directory as:

    mysong.mp3          the recording
    mysong.txt          the written lyrics, one line per line
    mysong.truth.json   {"lines": [{"start": 12.34, "text": "..."}]}
    mysong.ref.lrc      optional: the synced lyrics the truth came from, kept for provenance

The reference timing is whatever a human would compare against: a community LRC from
lrclib.net, or the timing you would have typed in by hand. Check it against the recording
before trusting it — the check that matters is that the first reference line lands where
the singing starts, which dev/autolrc.html?mode=probe shows (it prints what the
recogniser heard in a given window of the file).

usage:
  python dev/serve_autolrc.py 8791 <samples-dir>
  python dev/autolrc_realsong.py --dir <samples-dir> [--model tiny] [--only mysong] [--headed]
"""
import argparse
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'www', 'autolrc_realsong_result.json')
BROWSERS = [
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
]
AUDIO = ('.mp3', '.wav', '.m4a', '.flac')


def songs(directory):
    out = []
    for name in sorted(os.listdir(directory)):
        stem, ext = os.path.splitext(name)
        if ext.lower() not in AUDIO:
            continue
        if not all(os.path.exists(os.path.join(directory, stem + s)) for s in ('.txt', '.truth.json')):
            print(f'  skip {name}: needs {stem}.txt and {stem}.truth.json', flush=True)
            continue
        out.append((stem, name))
    return out


def at(obj, i):
    """the page returns both maps (times/how/score) and lists (errors/expected)"""
    if obj is None:
        return None
    if isinstance(obj, list):
        return obj[i] if i < len(obj) else None
    return obj[i] if i in obj else obj.get(str(i))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dir', required=True, help='directory the samples are served from')
    ap.add_argument('--prefix', default='', help='path of --dir under the server samples root, e.g. realsongs')
    ap.add_argument('--model', default='tiny')
    ap.add_argument('--device', default='', help='force webgpu or wasm')
    ap.add_argument('--dtype', default='', help='force the ONNX quantisation, e.g. q8')
    ap.add_argument('--win', default='', help='recogniser window in seconds')
    ap.add_argument('--step', default='', help='recogniser window step in seconds')
    ap.add_argument('--only', default='')
    ap.add_argument('--headed', action='store_true')
    ap.add_argument('--port', type=int, default=8791)
    ap.add_argument('--timeout', type=int, default=1800, help='seconds to wait for one song')
    args = ap.parse_args()

    cases = [c for c in songs(args.dir) if not args.only or args.only in c[0]]
    if not cases:
        print('no songs with lyrics and a reference in', args.dir)
        return 1

    url = f'http://127.0.0.1:{args.port}/autolrc.html'
    exe = next((p for p in BROWSERS if os.path.exists(p)), None)
    results = []
    with sync_playwright() as p:
        launch = {'headless': not args.headed}
        if exe:
            launch['executable_path'] = exe
        browser = p.chromium.launch(**launch)
        page = browser.new_page()
        page.on('console', lambda m: print('   [console]', m.text[:200]) if m.type == 'error' else None)
        for stem, name in cases:
            pre = args.prefix + '/' if args.prefix else ''
            q = (f'?audio={pre}{name}&lyrics={pre}{stem}.txt&truth={pre}{stem}.truth.json&model={args.model}')
            for key in ('device', 'dtype', 'win', 'step'):
                v = getattr(args, key)
                if v:
                    q += f'&{key}={v}'
            label = args.model + (f' {args.device}' if args.device else '') + (f' {args.dtype}' if args.dtype else '') \
                + (f' win{args.win}' if args.win else '') + (f' step{args.step}' if args.step else '')
            print(f'== {stem} ({label})', flush=True)
            page.goto(url + q)
            try:
                page.wait_for_function('window.__DONE === true', timeout=args.timeout * 1000)
            except Exception as e:
                print('   TIMEOUT', str(e)[:200], flush=True)
            res = page.evaluate('window.__RESULT')
            err = page.evaluate('window.__ERROR')
            if err:
                print('   ERROR', err[:600], flush=True)
            if not res:
                results.append({'song': stem, 'model': label, 'error': err})
                continue
            n = len(res['expected'])
            got = [at(res['times'], i) for i in range(n)]
            raw = [at(res['errors'], i) for i in range(n)]
            errs = [v for v in raw if v is not None and v == v]
            absd = sorted(abs(v) for v in errs)
            q_ = lambda r: absd[min(len(absd) - 1, int(len(absd) * r))] if absd else 0
            within = lambda t: sum(1 for v in absd if v <= t) / max(1, len(absd))
            print(f'   device {res["device"]} lang {res["language"]} {res["seconds"]}s | '
                  f'text {len(res.get("segments", []))} segments', flush=True)
            print(f'   timed {len(errs)}/{n} lines  median {q_(0.5):.2f}s p90 {q_(0.9):.2f}s '
                  f'max {absd[-1] if absd else 0:.2f}s  <=0.3s {within(0.3):.0%} <=1s {within(1.0):.0%}',
                  flush=True)
            print(f'   alignment {json.dumps(res["stats"], ensure_ascii=False)[:220]}', flush=True)
            worst = sorted(((v, i) for i, v in enumerate(raw) if v is not None and v == v),
                           key=lambda t: -abs(t[0]))[:6]
            for e, i in worst:
                print(f'     {i + 1:3d} ref {res["expected"][i]:7.2f} got {got[i]:7.2f} '
                      f'{e:+7.2f} {at(res["how"], i)} score {at(res["score"], i)}', flush=True)
            results.append({'song': stem, 'model': label, **res,
                            'median': q_(0.5), 'p90': q_(0.9), 'max': absd[-1] if absd else 0,
                            'within300': within(0.3), 'within1000': within(1.0),
                            'timed': len(errs), 'lines': n})
        browser.close()

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=1)
    print('wrote', OUT, flush=True)
    return 0 if all('error' not in r for r in results) else 1


sys.exit(main())
