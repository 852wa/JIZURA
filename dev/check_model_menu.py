"""Read back the model menu the shipped page builds, to check the device each model
would actually run on (the "(CPU)" marker) - usage: python check_model_menu.py <page-url>"""
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright  # noqa: E402

BROWSERS = [r'C:\Program Files\Google\Chrome\Application\chrome.exe',
            r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe']
url = sys.argv[1] if len(sys.argv) > 1 else 'file:///' + os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'index.html').replace('\\', '/')

with sync_playwright() as p:
    exe = next((b for b in BROWSERS if os.path.exists(b)), None)
    b = p.chromium.launch(headless=True, executable_path=exe)
    pg = b.new_page()
    pg.goto(url)
    pg.wait_for_timeout(1500)
    print('webgpu:', pg.evaluate('!!(navigator.gpu)'))
    print('menu  :', pg.evaluate('[...document.querySelectorAll("#autoModel option")].map(o => o.textContent)'))
    print('chosen:', pg.evaluate('document.getElementById("autoModel").value'))
    b.close()
