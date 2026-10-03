"""Load every built browser edition in a real browser and report page errors.

usage: python dev/page_check.py            (all editions)
       python dev/page_check.py index.html en/index.html
Complements dev/smoke_all.py, which exercises the renderer: this one only asks whether
each page starts up cleanly, which is what a change to the editor UI can break.
"""
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
from playwright.sync_api import sync_playwright  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = ['index.html', 'en/index.html', 'zh-hant/index.html', 'zh-hans/index.html', 'ko/index.html', 'id/index.html', 'vi/index.html']
BROWSERS = [r'C:\Program Files\Google\Chrome\Application\chrome.exe',
            r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe']


def main():
    pages = sys.argv[1:] or PAGES
    exe = next((p for p in BROWSERS if os.path.exists(p)), None)
    bad = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=exe) if exe else p.chromium.launch(headless=True)
        for rel in pages:
            page = browser.new_page()
            errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            page.on('console', lambda m: errs.append('console.' + m.type + ': ' + m.text[:160]) if m.type == 'error' else None)
            page.goto('file:///' + os.path.join(ROOT, rel).replace('\\', '/'))
            page.wait_for_timeout(1200)
            # ask the page for the things the auto-timing feature added
            state = page.evaluate("""() => ({
              hasButton: !!document.getElementById('btnAutoTime'),
              hasPanel: !!document.getElementById('autoTime'),
              hasModel: !!document.getElementById('autoModel'),
              hasBody: !!document.querySelector('.intro, main, body'),
              hasLyrics: !!document.getElementById('lyrics'),
              autoText: (document.getElementById('btnAutoTime') || {}).textContent || null,
              modelOptions: Array.from(document.querySelectorAll('#autoModel option')).map(o => o.value),
              whisper: !!(window.J && window.J.whisper),
              align: !!(window.J && window.J.alignLyricTimes),
              features: !!(window.J && window.J.audioFeatures),
            })""")
            issues = [k for k, v in state.items() if v is False]
            print(f'{rel:22s} errors={len(errs)} missing={issues or "-"} button={state["autoText"]!r} models={state["modelOptions"]}')
            for e in errs[:4]:
                print('    ', e[:200])
            bad += len(errs) + len(issues)
            page.close()
        browser.close()
    print('OK' if not bad else f'{bad} problems')
    return 0 if not bad else 1


sys.exit(main())
