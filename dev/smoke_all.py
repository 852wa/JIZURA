"""Render every registered expression in many combinations and report console problems / exceptions / slow frames.
usage: python3 dev/smoke_all.py [page=t_all]"""
import asyncio, json, sys
from playwright.async_api import async_playwright
PAGE = sys.argv[1] if len(sys.argv) > 1 else 't_all'
JS = r"""
async () => {
  const out = { problems: [], slow: [], counts: T.counts() };
  const warn = console.warn, err = console.error; let cur = '';
  console.warn = (...a) => { out.problems.push(cur + ' :: ' + a.map(String).join(' ').slice(0, 200)); };
  console.error = (...a) => { out.problems.push(cur + ' :: ERR ' + a.map(String).join(' ').slice(0, 200)); };
  const texts = ['愛', '透明', 'ほどけた声が鳴った', 'Hello world', 'ねえ、まだ間に合うかな'];
  const aspects = ['16:9', '9:16', '4:3', '3:4', '1:1', '21:9'];
  const styles = J.STYLE_ORDER;
  const cv = document.createElement('canvas'); const ctx = cv.getContext('2d');
  const r = new J.Renderer();
  const run = (label, ovs, aspect, style, n = 7) => {
    cur = label;
    const lines = ovs.map((o, i) => texts[i % texts.length]);
    const p = Object.assign(J.defaultProject(), { extra: true, lyrics: lines.join('\n'), style, aspect, seed: 1 + (label.length * 7919) % 99991,
      overrides: Object.fromEntries(ovs.map((o, i) => [i, Object.assign({ single: true }, o)])),
      timing: { bpm: 0, offset: 0, snap: false, tail: 0.5, lineTimes: Object.fromEntries(lines.map((_, i) => [i, i * 2.4])), lineScale: 1 } });
    p.fx = Object.assign(J.defaultProject().fx, { hud: 'on', glitch: 0.8, decor: 0.9 });
    let plan;
    try { plan = J.plan(p, { beats: Array.from({ length: 60 }, (_, i) => i * 0.5), duration: 30, energy: Array.from({ length: 300 }, (_, i) => 0.5 + 0.5 * Math.sin(i / 3)), energyRate: 10 }); }
    catch (e) { out.problems.push(label + ' :: PLAN ' + e.message); return; }
    const [W, H] = [plan.W, plan.H]; cv.width = Math.round(W * 0.2); cv.height = Math.round(H * 0.2);
    for (const c of plan.cuts) {
      for (let k = 0; k < n; k++) {
        const t = c.start + (c.end - c.start) * (k + 0.5) / n;
        const t0 = performance.now();
        try { r.frame(ctx, plan, t, { scale: 0.2 }); } catch (e) { out.problems.push(label + ' :: THROW ' + e.message + ' @' + t.toFixed(2)); }
        const dt = performance.now() - t0; if (dt > 60) out.slow.push(label + ' ' + dt.toFixed(0) + 'ms');
      }
    }
  };
  const G = (g) => J.order(g).filter(k => !(J.registry(g)[k] || {}).special);
  for (const k of G('layout')) for (const a of aspects) run('layout.' + k + ' ' + a, texts.map(() => ({ layout: k })), a, styles[(k.length + a.length) % styles.length], 4);
  for (const k of G('enter')) run('enter.' + k, texts.map((_, i) => ({ enter: k, layout: ['center', 'vcols', 'mixed', 'labels', 'huge'][i] })), aspects[k.length % 6], 'noir', 6);
  for (const k of G('exit')) run('exit.' + k, texts.map((_, i) => ({ exit: k, layout: ['center', 'vcols', 'mixed', 'labels', 'huge'][i] })), aspects[k.length % 6], 'caution', 6);
  for (const k of G('hold')) run('hold.' + k, texts.map((_, i) => ({ hold: k, layout: ['center', 'vcols', 'mixed', 'labels', 'huge'][i] })), aspects[k.length % 6], 'paper', 5);
  for (const k of G('decor')) run('decor.' + k, texts.map((_, i) => ({ decor: [k], layout: ['center', 'vcols', 'mixed', 'labels', 'huge'][i] })), aspects[k.length % 6], styles[k.length % styles.length], 5);
  for (const k of G('treat')) run('treat.' + k, texts.map((_, i) => ({ treat: k, layout: ['center', 'vcols', 'mixed', 'stack', 'huge'][i] })), aspects[k.length % 6], 'noir', 4);
  for (const k of G('bg')) run('bg.' + k, texts.map((_, i) => ({ bg: k })), aspects[k.length % 6], styles[k.length % styles.length], 4);
  for (const k of G('cam')) run('cam.' + k, texts.map((_, i) => ({ cam: k })), aspects[k.length % 6], 'hud', 5);
  for (const k of G('trans')) run('trans.' + k, texts.map((_, i) => (i ? { trans: k } : {})), aspects[k.length % 6], styles[k.length % styles.length], 8);
  for (const k of J.STYLE_ORDER) run('style.' + k, texts.map(() => ({})), aspects[k.length % 6], k, 5);
  // random full plans with everything on
  for (let s = 0; s < 30; s++) run('random#' + s, texts.map(() => ({})), aspects[s % 6], styles[s % styles.length], 6);
  console.warn = warn; console.error = err;
  return out;
}
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(f'http://localhost:8765/{PAGE}.html')
        await pg.wait_for_timeout(400)
        await pg.evaluate("p => T.setup(p)", {'lyrics': 'テスト'})
        out = await pg.evaluate(JS)
        print('counts', out['counts'], 'total', sum(out['counts'].values()))
        print('problems', len(out['problems']))
        seen = {}
        for pr in out['problems']:
            key = pr.split(' :: ')[0].split(' ')[0]
            seen.setdefault(key, []).append(pr)
        for k, v in list(seen.items())[:60]: print(' ', len(v), v[0][:260])
        print('slow frames', len(out['slow']), out['slow'][:60])
        print('page errors', errs[:5])
        await b.close()
asyncio.run(main())
