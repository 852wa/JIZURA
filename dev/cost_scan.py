"""Per-entry render cost: each registered entry alone (others at defaults), best-of-2 warmed frame at 0.5x.
usage: python3 dev/cost_scan.py [page=t_all] [threshold_ms=45]"""
import asyncio, sys
from playwright.async_api import async_playwright
PAGE = sys.argv[1] if len(sys.argv) > 1 else 't_all'
TH = float(sys.argv[2]) if len(sys.argv) > 2 else 45
JS = r"""
async (TH) => {
  const cv = document.createElement('canvas'); const ctx = cv.getContext('2d'); const r = new J.Renderer();
  const out = [];
  const time = (ov, aspect, style, phase, lines) => {
    lines = lines || ['ほどけた声が鳴った'];
    const ovs = Object.fromEntries(lines.map((_, i) => [i, Object.assign({ single: true, enter: 'cut', exit: 'cut', hold: 'still', treat: 'none', bg: 'none', cam: 'push', decor: [] }, i === lines.length - 1 ? ov : {})]));
    const p = Object.assign(J.defaultProject(), { lyrics: lines.join('\n'), style, aspect, seed: 5, overrides: ovs,
      timing: { bpm: 0, offset: 0, snap: false, tail: 0.5, lineTimes: Object.fromEntries(lines.map((_, i) => [i, i * 2.5])), lineScale: 1 } });
    p.fx = Object.assign(J.defaultProject().fx, { glitch: 0, decor: 0.8 });
    const plan = J.plan(p, null); if (!ov.fx) plan.events = [];
    const c = plan.cuts[plan.cuts.length - 1];
    if (ov.fx) { const D = J.FXE[ov.fx]; plan.events = [{ t: c.start, type: ov.fx, amp: D.amp || 1, dur: (D.dur || 4) / 24 }]; }
    cv.width = Math.round(plan.W * 0.5); cv.height = Math.round(plan.H * 0.5);
    const t = phase === 'enter' ? c.start + c.inDur * 0.5 : phase === 'exit' ? c.end - c.outDur * 0.5 : phase === 'fx' ? c.start + 0.02 : phase === 'trans' ? c.start + (c.transDur || 0.3) * 0.5 : c.start + 1.2;
    r.frame(ctx, plan, t, { scale: 0.5 });
    let best = 1e9; for (let i = 0; i < 2; i++) { const t0 = performance.now(); r.frame(ctx, plan, t, { scale: 0.5 }); ctx.getImageData(0, 0, 1, 1); best = Math.min(best, performance.now() - t0); }
    return best;
  };
  const G = g => J.order(g).filter(k => !(J.registry(g)[k] || {}).special);
  const cases = [];
  for (const k of G('layout')) cases.push(['layout', k, { layout: k }, 'hold']);
  for (const k of G('enter')) cases.push(['enter', k, { enter: k }, 'enter']);
  for (const k of G('exit')) cases.push(['exit', k, { exit: k }, 'exit']);
  for (const k of G('hold')) cases.push(['hold', k, { hold: k }, 'hold']);
  for (const k of G('decor')) cases.push(['decor', k, { decor: [k] }, 'hold']);
  for (const k of G('treat')) cases.push(['treat', k, { treat: k }, 'hold']);
  for (const k of G('bg')) cases.push(['bg', k, { bg: k }, 'hold']);
  for (const k of G('cam')) cases.push(['cam', k, { cam: k }, 'hold']);
  for (const k of G('fx')) if (!J.FXE[k].builtin) cases.push(['fx', k, { fx: k }, 'fx']);
  for (const k of G('trans')) cases.push(['trans', k, { trans: k }, 'trans', ['夜明けの色を', 'ほどけた声が鳴った']]);
  const base = Math.max(time({}, '16:9', 'paper', 'hold'), time({}, '9:16', 'noir', 'hold'));
  for (const [g, k, ov, ph, lines] of cases) {
    const a = time(ov, '16:9', 'paper', ph, lines), b = time(ov, '9:16', 'noir', ph, lines);
    const m = Math.max(a, b); if (m > TH) out.push([g, k, Math.round(a), Math.round(b)]);
  }
  return { base: Math.round(base), heavy: out.sort((x, y) => Math.max(y[2], y[3]) - Math.max(x[2], x[3])) };
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        await pg.goto(f'http://localhost:8765/{PAGE}.html'); await pg.wait_for_timeout(300)
        await pg.evaluate("p => T.setup(p)", {'lyrics': 'テスト'})
        r = await pg.evaluate(JS, TH)
        print('baseline frame', r['base'], 'ms;', len(r['heavy']), f'entries over {TH}ms (16:9 paper / 9:16 noir):')
        for h in r['heavy']: print('  ', h)
        await b.close()
asyncio.run(main())
