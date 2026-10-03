"""Compare what each whisper model and quantisation actually returns for one clip.

usage: python dev/autolrc_probe.py [--audio sample.en.wav] [--lang en]
Drives dev/autolrc.html?mode=probe, which dumps the raw pipeline result.
"""
import argparse
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
from playwright.sync_api import sync_playwright  # noqa: E402

BROWSERS = [r'C:\Program Files\Google\Chrome\Application\chrome.exe',
            r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe']
COMBOS = [
    ('tiny  fp16+q4', 'model=tiny&dtype='),
    ('tiny  q8+q8', 'model=tiny&dtype=q8'),
    ('base  fp16+q4', 'model=base&dtype='),
    ('base  fp16+fp16', 'model=base&dtype=fp16'),
    ('base  q8+q8', 'model=base&dtype=q8'),
    ('small fp16+q4', 'model=small&dtype='),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--audio', default='sample.en.wav')
    ap.add_argument('--lang', default='en')
    ap.add_argument('--only', default='')
    args = ap.parse_args()
    exe = next((p for p in BROWSERS if os.path.exists(p)), None)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=exe) if exe else p.chromium.launch(headless=True)
        page = browser.new_page()
        for label, q in COMBOS:
            if args.only and args.only not in label:
                continue
            url = (f'http://127.0.0.1:8791/autolrc.html?mode=probe&{q}'
                   f'&audio={args.audio}&lyrics=sample.en.txt&truth=sample.en.truth.json&lang={args.lang}')
            print(f'-- {label}', flush=True)
            page.goto(url)
            try:
                page.wait_for_function('window.__DONE === true', timeout=900000)
            except Exception as e:
                print('   TIMEOUT', str(e)[:120], flush=True)
                continue
            r = page.evaluate('window.__RESULT') or {}
            err = page.evaluate('window.__ERROR')
            if err:
                print('   ERROR', err[:300], flush=True)
                continue
            pr = (r.get('probe') or [{}])[0]
            print(f"   device={r.get('device')} chunks={pr.get('chunkCount')} "
                  f"wordsPerChunk={pr.get('chunks', [{}])[0].get('words')} text={str(pr.get('text'))[:70]!r}", flush=True)
        browser.close()


main()
