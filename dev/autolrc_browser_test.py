"""Drive dev/autolrc.html in a real browser: audio in, per-line times out, compared
with the known line starts of the synthetic samples and with the hand-made LRC of a
real song.

usage: python dev/autolrc_browser_test.py [--model tiny|base|small] [--only ja]
                                          [--headed] [--seconds 120]
Needs dev/serve_autolrc.py running on 8791 and a Chromium-based browser installed.
"""
import argparse
import json
import os
import sys

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'www', 'autolrc_browser_result.json')
URL = 'http://127.0.0.1:8791/autolrc.html'
BROWSERS = [
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', default='tiny')
    ap.add_argument('--only', default='')
    ap.add_argument('--headed', action='store_true')
    ap.add_argument('--seconds', type=int, default=180)
    ap.add_argument('--mirror', default='1')
    args = ap.parse_args()

    exe = next((p for p in BROWSERS if os.path.exists(p)), None)
    cases = [c for c in ('ja', 'en', 'zh') if not args.only or c in args.only.split(',')]
    results = []
    with sync_playwright() as p:
        launch = {'headless': not args.headed, 'args': ['--autoplay-policy=no-user-gesture-required']}
        if exe:
            launch['executable_path'] = exe
        browser = p.chromium.launch(**launch)
        page = browser.new_page()
        page.on('console', lambda m: print('   [console]', m.text[:200]) if m.type == 'error' else None)
        for c in cases:
            q = f'?audio=sample.{c}.wav&truth=sample.{c}.truth.json&lyrics=sample.{c}.txt&model={args.model}&mirror={args.mirror}'
            print(f'== {c} ({args.model})', flush=True)
            page.goto(URL + q)
            try:
                page.wait_for_function('window.__DONE === true', timeout=args.seconds * 1000)
            except Exception as e:
                print('   TIMEOUT', str(e)[:200], flush=True)
            res = page.evaluate('window.__RESULT')
            err = page.evaluate('window.__ERROR')
            if err:
                print('   ERROR', err[:600], flush=True)
            if res:
                print('   device {device} lang {language} {seconds}s | median {median:.3f}s p90 {p90:.3f}s max {max:.3f}s'.format(**res), flush=True)
                print('   stats', json.dumps(res['stats']), flush=True)
                pick = lambda o, i: (o[i] if i in o else o.get(str(i))) if isinstance(o, dict) else (o[i] if i < len(o) else None)
                for i, e in enumerate(res['expected']):
                    got = pick(res['times'], i)
                    print(f"     {i + 1:2d} expected {e:7.2f} got {str(got):>7} {pick(res['how'], i)} score {pick(res['score'], i)}", flush=True)
                results.append({'case': c, 'model': args.model, **res})
            else:
                results.append({'case': c, 'model': args.model, 'error': err})
        browser.close()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    old = []
    if os.path.exists(OUT):
        with open(OUT, encoding='utf-8') as f:
            old = json.load(f)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(old + results, f, ensure_ascii=False, indent=1)
    print('wrote', OUT, flush=True)
    return 0 if all('error' not in r for r in results) else 1


sys.exit(main())
