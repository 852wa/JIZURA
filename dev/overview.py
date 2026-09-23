"""Overview grids: one (or a few) frames per registered id, for fast visual QA of a whole group.
usage: python3 dev/overview.py GROUP OUTDIR  (GROUP: layout enter exit hold decor treat bg cam fx trans style)
       [page=t_all] [aspect=16:9] [style=noir] [phase=hold|enter|exit] [ids]"""
import asyncio, base64, io, sys, os
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFont
G, OUT = sys.argv[1], sys.argv[2]
PAGE = sys.argv[3] if len(sys.argv) > 3 else 't_all'
ASP = sys.argv[4] if len(sys.argv) > 4 else '16:9'
STY = sys.argv[5] if len(sys.argv) > 5 else 'noir'
PH = sys.argv[6] if len(sys.argv) > 6 else 'hold'
IDS = sys.argv[7].split(',') if len(sys.argv) > 7 and not sys.argv[7].startswith('pack:') else None
PACK = sys.argv[7][5:] if len(sys.argv) > 7 and sys.argv[7].startswith('pack:') else None
os.makedirs(OUT, exist_ok=True)
try:
    FONT = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 14)
except Exception:
    FONT = ImageFont.load_default()
TEXT = 'ほどけた声が鳴った'
TEXT2 = '夜明けの色を'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page()
        await pg.goto(f'http://localhost:8765/{PAGE}.html'); await pg.wait_for_timeout(300)
        await pg.evaluate("p => T.setup(p)", {'lyrics': 'テスト'})
        ids = IDS or await pg.evaluate("([g, pk]) => g === 'style' ? J.STYLE_ORDER.filter(k => !pk || (J.STYLES[k].pack || 'core') === pk) : J.order(g).filter(k => !(J.registry(g)[k]||{}).special && (!pk || J.registry(g)[k].pack === pk))", [G, PACK])
        cells = []
        for k in ids:
            ov = {'single': True, 'layout': 'center', 'enter': 'cut', 'exit': 'cut', 'hold': 'still', 'decor': [], 'treat': 'none', 'bg': 'none', 'cam': 'push'}
            if G == 'decor': ov['decor'] = [k]
            elif G not in ('fx', 'style', 'trans'): ov[G] = k
            lyr, ovs, lts = TEXT, {'0': ov}, {'0': 0}
            if G == 'trans':   # two cuts back to back; the second one opens with the transition
                lyr, ovs, lts = TEXT2 + '\n' + TEXT, {'0': dict(ov, layout='stack'), '1': dict(ov, trans=k)}, {'0': 0, '1': 2}
            proj = {'lyrics': lyr, 'overrides': ovs, 'style': k if G == 'style' else STY, 'aspect': ASP, 'seed': 5,
                    'fx': {'decor': 0.8 if G == 'style' else 0, 'glitch': 0, 'motion': 0.7, 'chroma': 0.6, 'density': 0.5, 'texture': 0.4, 'flash': False, 'onTwos': True, 'hud': 'off', 'bgSwitch': 0},
                    'timing': {'bpm': 0, 'offset': 0, 'snap': False, 'tail': 0.5, 'lineTimes': lts, 'lineScale': 1}}
            if G == 'style': proj['overrides'] = {'0': {'single': True}}
            await pg.evaluate('p => T.setup(p)', proj)
            c = (await pg.evaluate('() => T.cutInfo()'))[-1]
            if G == 'fx':
                await pg.evaluate('([k, t]) => { const D = J.FXE[k]; T.setEvents([{ t, type: k, amp: D.amp || 1, dur: (D.dur || 4) / 24 }]); }', [k, c['start'] + 1.0])
                ts = [c['start'] + 1.0 + f / 24 for f in (0.5, 2.5)]
            elif G == 'trans': ts = [c['start'] + (c.get('transDur') or 0.35) * f for f in (0.3, 0.65)]
            elif PH == 'enter': ts = [c['start'] + c['inDur'] * f for f in (0.25, 0.55)]
            elif PH == 'exit': ts = [c['end'] - c['outDur'] * (1 - f) for f in (0.35, 0.7)]
            else: ts = [c['start'] + 1.5]
            ims = []
            for t in ts:
                url = await pg.evaluate('([t,s]) => T.shot(t,s)', [t, 0.2])
                ims.append(Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGB'))
            name = await pg.evaluate('([g,k]) => g === "style" ? (J.STYLES[k].label || J.STYLES[k].name || k) : J.registry(g)[k].name', [G, k])
            cells.append((f'{k} {name}', ims))
        w, h = cells[0][1][0].size
        per = len(cells[0][1])
        cols = max(1, 6 // per) * per if w > h else max(1, 10 // per) * per
        ncell = cols // per
        rows = (len(cells) + ncell - 1) // ncell
        S = Image.new('RGB', (cols * (w + 4) + 4, rows * (h + 22) + 4), (40, 40, 44))
        d = ImageDraw.Draw(S)
        for i, (lab, ims) in enumerate(cells):
            r, cc = divmod(i, ncell)
            for j, im in enumerate(ims):
                x = 4 + (cc * per + j) * (w + 4); y = 4 + r * (h + 22)
                S.paste(im, (x, y))
            d.text((4 + cc * per * (w + 4), 4 + r * (h + 22) + h + 2), lab, fill=(230, 220, 150), font=FONT)
        path = f'{OUT}/ov_{G}_{PH}_{ASP.replace(":", "x")}_{STY}.png'
        S.save(path); print(path, S.size, len(cells))
        await b.close()
asyncio.run(main())
