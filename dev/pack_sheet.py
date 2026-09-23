"""Contact sheets + error/perf check for expression packs.

usage:
  python3 dev/pack_sheet.py --page t_NAME --group layout --ids a,b,c --out out/sheets
  python3 dev/pack_sheet.py --page t_NAME --group enter  --ids a,b     --out out/sheets
  (groups: layout enter exit hold decor treat bg cam fx)
Writes DIR/<group>_<id>.png (one sheet per id) and prints console warnings/errors and the slowest frame time.
Needs the local server: (cd dev/www && python3 -m http.server 8765 &)
"""
import argparse, asyncio, base64, io, json, os, sys
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument('--page', default='test')
ap.add_argument('--group', required=True)
ap.add_argument('--ids', default='')
ap.add_argument('--out', required=True)
ap.add_argument('--seed', type=int, default=11)
ap.add_argument('--cell', type=int, default=320)        # cell width in px (16:9 cell)
ap.add_argument('--texts', default='')
A = ap.parse_args()
os.makedirs(A.out, exist_ok=True)

TEXTS = A.texts.split('|') if A.texts else ['透明', '夜明けの色を', 'ほどけた声が遠くで', 'ねえ、まだ間に合うかな、きっと']
FX = {'decor': 0, 'glitch': 0.0, 'motion': 0.7, 'chroma': 0.6, 'density': 0.5, 'texture': 0.4, 'flash': False, 'onTwos': True, 'koma': 12, 'hud': 'off', 'bgSwitch': 0}
try:
    FONT = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 13)
except Exception:
    FONT = ImageFont.load_default()

def proj(lines, ov, style='noir', aspect='16:9', fx=None, gap=3.0):
    return {'lyrics': '\n'.join(lines), 'overrides': ov, 'style': style, 'aspect': aspect, 'seed': A.seed, 'fx': fx or FX,
            'timing': {'bpm': 0, 'offset': 0, 'snap': False, 'tail': 0.5, 'lineTimes': {str(i): i * gap for i in range(len(lines))}, 'lineScale': 1}}

def base_ov(extra):
    o = {'layout': 'center', 'enter': 'cut', 'exit': 'cut', 'hold': 'still', 'single': True, 'decor': [], 'treat': 'none', 'bg': 'none', 'cam': 'push'}
    o.update(extra); return o

async def shoot(pg, p, times, scale):
    await pg.evaluate('p => T.setup(p)', p)
    cuts = await pg.evaluate('() => T.cutInfo()')
    imgs = []
    for t in times:
        url = await pg.evaluate('([t,s]) => T.shot(t,s)', [t, scale])
        imgs.append(Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGB'))
    perf = await pg.evaluate('([ts,s]) => T.timeFrames(ts,s)', [times[:4], 0.5])
    return imgs, cuts, max(perf) if perf else 0

def sheet(rows, title, path):
    # rows: [(label, [(img, caption), ...]), ...]
    cw = A.cell
    pad, lh = 6, 18
    def fit(im):
        k = cw / max(im.width, im.height * 16 / 9)
        return im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))))
    rows2 = [(lab, [(fit(im) if im else None, cap) for im, cap in cells]) for lab, cells in rows]
    ncol = max(len(c) for _, c in rows2)
    rh = [max((im.height if im else int(cw * 9 / 16)) for im, _ in cells) for _, cells in rows2]
    W = pad + ncol * (cw + pad)
    H = 28 + sum(h + lh * 2 + pad for h in rh)
    S = Image.new('RGB', (W, H), (40, 40, 44))
    d = ImageDraw.Draw(S)
    d.text((pad, 6), title, fill=(255, 220, 120), font=FONT)
    y = 28
    for (lab, cells), h in zip(rows2, rh):
        d.text((pad, y), lab, fill=(200, 200, 210), font=FONT)
        y += lh
        for j, (im, cap) in enumerate(cells):
            x = pad + j * (cw + pad)
            if im: S.paste(im, (x + (cw - im.width) // 2, y))
            else: d.rectangle([x, y, x + cw, y + int(cw * 9 / 16)], outline=(90, 90, 90))
            d.text((x, y + h + 1), cap, fill=(160, 160, 170), font=FONT)
        y += h + lh + pad
    S.save(path)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1280, 'height': 800})
        logs = []
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('warning', 'error') and 'ERR_TUNNEL' not in m.text and 'Failed to load resource' not in m.text else None)
        pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
        await pg.goto(f'http://localhost:8765/{A.page}.html')
        await pg.wait_for_timeout(400)
        await pg.evaluate("p => T.setup(p)", proj(['テスト'], {}))
        ids = A.ids.split(',') if A.ids else await pg.evaluate('g => T.ids(g)', A.group)
        worst = (0, '')
        for gid in ids:
            n_before = len(logs)
            rows = []
            g = A.group
            if g == 'layout':
                fits = await pg.evaluate('([k, ts]) => ts.map(t => { const L = J.LAYOUTS[k]; return !L || L.fits([...t.replace(/\\s/g, "")].length); })', [gid, TEXTS])
                ov = {str(i): base_ov({'layout': gid, 'enter': 'cut', 'exit': 'cut'}) for i in range(len(TEXTS))}
                cfgs = [('noir', '16:9'), ('noir', '9:16'), ('caution', '4:3'), ('paper', '1:1')]
                shots = {}
                for st, asp in cfgs:
                    times = [i * 3.0 + 1.6 for i in range(len(TEXTS))]
                    imgs, cuts, pf = await shoot(pg, proj(TEXTS, ov, st, asp), times, 0.3)
                    shots[(st, asp)] = imgs
                    if pf > worst[0]: worst = (pf, f'{gid} {asp}')
                seq_times = [0.08, 0.2, 0.45, 1.2, 2.2, 2.85]
                ov2 = {str(i): base_ov({'layout': gid, 'enter': 'blur', 'exit': 'blur'}) for i in range(len(TEXTS))}
                seq, _, _ = await shoot(pg, proj(TEXTS[1:2], {'0': ov2['0']}), seq_times, 0.3)
                for i, t in enumerate(TEXTS):
                    cells = [(shots[c][i] if fits[i] else None, f'{c[1]} {c[0]}' + ('' if fits[i] else ' (fits=false)')) for c in cfgs]
                    rows.append((f'"{t}" ({len(t)})', cells))
                rows.append(('timeline (enter blur / exit blur) 16:9', [(im, f't={t}') for im, t in zip(seq, seq_times)]))
            elif g in ('enter', 'exit', 'hold', 'treat', 'cam'):
                key = {'enter': 'enter', 'exit': 'exit', 'hold': 'hold', 'treat': 'treat', 'cam': 'cam'}[g]
                layouts = [('center', '16:9', 'noir'), ('mixed', '16:9', 'caution'), ('vcols', '9:16', 'noir'), ('stack', '4:3', 'paper')]
                for lay, asp, st in layouts:
                    extra = {'layout': lay, key: gid}
                    if g == 'exit': extra['enter'] = 'cut'
                    if g in ('hold', 'treat', 'cam'): extra.setdefault('enter', 'cut')
                    ov = {'0': base_ov(extra)}
                    await pg.evaluate('p => T.setup(p)', proj([TEXTS[1]], ov, st, asp))
                    cuts = await pg.evaluate('() => T.cutInfo()')
                    c = cuts[0]
                    if g == 'enter': ts = [c['start'] + c['inDur'] * f for f in (0.02, 0.15, 0.3, 0.45, 0.6, 0.8, 1.0)] + [c['start'] + 1.4]
                    elif g == 'exit': ts = [c['end'] - c['outDur'] * (1 - f) for f in (0.0, 0.15, 0.3, 0.45, 0.6, 0.8, 0.97)]
                    else: ts = [c['start'] + (c['end'] - c['start']) * f for f in (0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95)]
                    imgs, _, pf = await shoot(pg, proj([TEXTS[1]], ov, st, asp), ts, 0.3)
                    if pf > worst[0]: worst = (pf, f'{gid} {lay}')
                    rows.append((f'{lay} {asp} {st}  in={c["inDur"]:.2f}s out={c["outDur"]:.2f}s', [(im, f'{t - c["start"]:.2f}s') for im, t in zip(imgs, ts)]))
            elif g == 'decor':
                for asp, st, lay in [('16:9', 'noir', 'center'), ('9:16', 'caution', 'center'), ('4:3', 'paper', 'mixed'), ('16:9', 'hud', 'vcols')]:
                    ov = {'0': base_ov({'layout': lay, 'decor': [gid], 'enter': 'blur'})}
                    await pg.evaluate('p => T.setup(p)', proj([TEXTS[1]], ov, st, asp))
                    c = (await pg.evaluate('() => T.cutInfo()'))[0]
                    ts = [c['start'] + f for f in (0.05, 0.15, 0.3, 0.6, 1.2, 2.0)] + [c['end'] - 0.12, c['end'] - 0.03]
                    imgs, _, pf = await shoot(pg, proj([TEXTS[1]], ov, st, asp), ts, 0.3)
                    if pf > worst[0]: worst = (pf, f'{gid} {asp}')
                    rows.append((f'{asp} {st} {lay}', [(im, f'{t - c["start"]:.2f}s') for im, t in zip(imgs, ts)]))
            elif g == 'bg':
                for asp, st in [('16:9', 'noir'), ('9:16', 'caution'), ('4:3', 'paper'), ('16:9', 'blueprint')]:
                    ov = {'0': base_ov({'layout': 'center', 'bg': gid, 'enter': 'blur'})}
                    await pg.evaluate('p => T.setup(p)', proj([TEXTS[1]], ov, st, asp))
                    c = (await pg.evaluate('() => T.cutInfo()'))[0]
                    ts = [c['start'] + f for f in (0.05, 0.2, 0.5, 1.0, 1.6, 2.2)] + [c['end'] - 0.1]
                    imgs, _, pf = await shoot(pg, proj([TEXTS[1]], ov, st, asp), ts, 0.3)
                    if pf > worst[0]: worst = (pf, f'{gid} {asp}')
                    rows.append((f'{asp} {st}', [(im, f'{t - c["start"]:.2f}s') for im, t in zip(imgs, ts)]))
            elif g == 'fx':
                # two cuts; the effect is forced as an event at the boundary via a tiny script
                for asp, st in [('16:9', 'noir'), ('9:16', 'caution'), ('4:3', 'paper')]:
                    lines = [TEXTS[1], TEXTS[2]]
                    ov = {'0': base_ov({'enter': 'cut'}), '1': base_ov({'enter': 'cut'})}
                    await pg.evaluate('p => T.setup(p)', proj(lines, ov, st, asp))
                    t0 = 3.0
                    await pg.evaluate('([k, t0]) => { const D = J.FXE[k] || {}; T.plan.events = [{ t: t0 - (D.pre || 0) / 24, type: k, amp: D.amp || 1, dur: (D.dur || 4) / 24 }]; }', [gid, t0])
                    dur = await pg.evaluate('k => ((J.FXE[k] || {}).dur || 4) / 24 + ((J.FXE[k] || {}).pre || 0) / 24', gid)
                    start = t0 - await pg.evaluate('k => ((J.FXE[k] || {}).pre || 0) / 24', gid)
                    ts = [start - 0.05] + [start + dur * f for f in (0.0, 0.15, 0.3, 0.5, 0.7, 0.9)] + [start + dur + 0.1]
                    imgs = []
                    for t in ts:
                        url = await pg.evaluate('([t,s]) => T.shot(t,s)', [t, 0.3])
                        imgs.append(Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGB'))
                    rows.append((f'{asp} {st}', [(im, f'{t - start:+.2f}s') for im, t in zip(imgs, ts)]))
            name = await pg.evaluate('([g,k]) => { const d = J.registry(g)[k]; return d ? d.name : "(missing)"; }', [g, gid])
            sheet(rows, f'{g}: {gid}  {name}', f'{A.out}/{g}_{gid}.png')
            new = logs[n_before:]
            print(f'{g}.{gid} ({name}) -> {A.out}/{g}_{gid}.png' + (f'  !! {len(new)} console problems' if new else ''))
            for l in new[:6]: print('    ', l[:300])
        print(f'slowest frame (0.5x scale): {worst[0]:.1f}ms  {worst[1]}')
        await b.close()
asyncio.run(main())
