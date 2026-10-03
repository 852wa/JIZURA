"""Summarise the browser end-to-end results into the table for the PR description.

usage: python dev/autolrc_report.py
Reads dev/www/autolrc_browser_result.json (written by dev/autolrc_browser_test.py).
"""
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, 'dev', 'www', 'autolrc_browser_result.json')

with open(PATH, encoding="utf-8") as f:
    runs = json.load(f)

# keep the newest run of each (case, model)
seen = {}
for r in runs:
    seen[(r['case'], r['model'])] = r

print(f"{'lang':5s} {'model':6s} {'device':6s} {'s':>6s} {'median':>8s} {'p90':>8s} {'<=300ms':>8s} {'matched':>8s} {'cover':>6s}")
for key in sorted(seen):
    r = seen[key]
    if 'error' in r or r.get('times') is None:
        print(f"{key[0]:5s} {key[1]:6s} ERROR {str(r.get('error'))[:60]}")
        continue
    pick = lambda o, i: (o[i] if i in o else o.get(str(i))) if isinstance(o, dict) else (o[i] if i < len(o) else None)
    errs = [abs(pick(r['times'], i) - e) for i, e in enumerate(r['expected']) if pick(r['times'], i) is not None]
    errs.sort()
    q = lambda p: errs[min(len(errs) - 1, int(len(errs) * p))] if errs else float('nan')
    good = sum(1 for e in errs if e <= 0.3) / len(errs) if errs else 0
    print(f"{r['case']:5s} {r['model']:6s} {r['device']:6s} {r['seconds']:6.1f} {q(0.5):8.3f} {q(0.9):8.3f} "
          f"{good * 100:7.0f}% {r['stats']['matched']:3d}/{r['stats']['lines']:<4d} {r['stats']['coverage']:6.3f}")
