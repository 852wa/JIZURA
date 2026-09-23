"""Test the After Effects CEP panel in a browser: the panel page (www/cepx = a copy of the built extension) runs with a mocked
CEP bridge whose evalScript executes host.jsx + jizura_core.jsx on the emulated AE object model (dev/aeom.js).
usage: python3 build_cep.py && rm -rf dev/www/cepx && cp -r build/com.852wa.jizura dev/www/cepx && python3 dev/cep_test.py <outdir>"""
import asyncio, base64, json, os, sys
from playwright.async_api import async_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else 'shots/cep'
os.makedirs(OUT, exist_ok=True)

MOCK = r"""
window.__H = { vfs: {}, links: [], log: [], errors: [] };
(function () {
  const H = window.__H;
  let env = null, G = null, run = null;
  const ready = (async () => {
    await new Promise(r => { if (document.readyState !== 'loading') r(); else document.addEventListener('DOMContentLoaded', r); });
    for (const u of ['/acorn.js', '/aeom.js', '/aerender.js']) { const t = await (await fetch(u)).text(); (0, eval)(t); }
    H.vfs['/fake/ext/jsx/host.jsx'] = (await (await fetch('/cepx/jsx/host.jsx')).text()).replace(/^var JZCEP = /m, 'G.JZCEP = ');
    H.vfs['/fake/ext/jsx/jizura_core.jsx'] = await (await fetch('/cepx/jsx/jizura_core.jsx')).text();
    env = AEOM.makeEnv({ fonts: () => true, measureRect: (L, t) => AER.measureRect(L, t) });
    G = env.ctx; H.env = env;
    const fileOf = p => ({ fsName: p, name: p.split('/').pop(), get exists() { return p in H.vfs; }, get parent() { return fileOf(p.replace(/\/[^\/]*$/, '')); },
      encoding: '', open() { return true; }, read() { const v = H.vfs[p]; return typeof v === 'string' ? v : new TextDecoder().decode(v); }, close() {}, remove() { delete H.vfs[p]; return true; } });
    G.File = function (p) { return fileOf(String(p)); };
    G.$ = { global: G, fileName: '/fake/ext/jsx/host.jsx', evalFile(f) { return run(G, H.vfs[f.fsName]); }, writeln() {}, sleep() {} };
    run = new Function('G', 'code', 'with (G) { return eval(code); }');
  })();
  window.__adobe_cep__ = {
    getSystemPath: k => 'file:///fake/ext',
    evalScript(code, cb) {
      ready.then(() => {
        let r;
        try { r = run(G, code); r = r === undefined ? 'undefined' : String(r); }
        catch (e) { H.errors.push(code.slice(0, 80) + ' :: ' + e.message); r = 'EvalScript error.'; }
        H.log.push(code.slice(0, 70)); cb && cb(r);
      });
    },
  };
  if (!window.__NO_NODE) window.cep_node = {
    require: n => ({ fs: { writeFileSync: (p, d) => { H.vfs[p] = d; }, readFileSync: p => { const v = H.vfs[p]; if (!v) throw new Error('ENOENT ' + p); return v; } },
                     os: { tmpdir: () => '/tmp' }, path: { join: (...a) => a.join('/').replace(/\/+/g, '/') } })[n],
    Buffer: { from: u => u },
  };
  window.cep = { fs: { showSaveDialogEx: (t, i, types, name) => ({ data: '/out/' + name, err: 0 }) }, util: { openURLInDefaultBrowser: u => H.links.push(u) } };
})();
"""

SCENE = r"""async () => {
  const H = __H, app = H.env.app;
  const ft = app.project._addFootage({ name: 'song.wav', path: '/fake/song.wav', duration: 14 });
  const c = app.project.items.addComp('Song', 1920, 1080, 1, 14, 24);
  const L = c.layers.add(ft); L.startTime = 0.5;
  const mk = L.property('ADBE Marker'); [1.0, 3.5, 6.0, 8.2].forEach(t => mk.setValueAtTime(t, 0));
  c.selectedLayers = [L]; app.project.activeItem = c;
  H.vfs['/fake/song.wav'] = new Uint8Array(await (await fetch('/cepx_song.wav')).arrayBuffer());
  return true;
}"""

RENDER = r"""(ts) => {
  const env = __H.env, comp = env.comps.filter(c => /^JIZURA /.test(c.name)).pop(); env.refCheck = false;
  const R = new AER.Renderer(); R.comps = env.comps;
  const urls = ts.map(t => { const cv = R.renderComp(comp, t, 0.25, 0); const o = document.createElement('canvas'); o.width = cv.width; o.height = cv.height; const x = o.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, o.width, o.height); x.drawImage(cv, 0, 0); return o.toDataURL('image/png'); });
  return { name: comp.name, layers: comp._layers.map(l => l.name), urls, errors: [...R.ev.errors.keys()].slice(0, 5) };
}"""

async def wait_status(pg, text, timeout=90000):
    await pg.wait_for_function("t => [...document.querySelectorAll('.ae-status')].some(e => e.textContent.includes(t))", arg=text, timeout=timeout)
    return await pg.evaluate("() => document.querySelector('.ae-status').textContent")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # ---- A: with Node (temp-file path), pro mode
        ctx = await b.new_context(viewport={'width': 1280, 'height': 860})
        await ctx.add_init_script("try{localStorage.setItem('jizura.mode','pro')}catch(e){}")
        await ctx.add_init_script(MOCK)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/cepx/index.html')
        print('connect:', await wait_status(pg, '接続しました'))
        await pg.evaluate(SCENE)
        await pg.click('#aeAudio')
        await pg.wait_for_function("() => /BPM/.test(document.getElementById('audioName').textContent)", timeout=60000)
        print('audio:', await pg.inner_text('#audioName'))
        await pg.click('#aeMarkers'); await pg.wait_for_timeout(400)
        print('lineTimes:', await pg.evaluate("() => J.ui.project.timing.lineTimes"))
        await pg.click('.tabs button[data-tab=out]')
        await pg.screenshot(path=f'{OUT}/pro_out.png')
        await pg.click('#btnAE')
        print('build:', await wait_status(pg, '作成しました', 180000))
        r = await pg.evaluate(RENDER, [1.0, 3.0, 5.0, 7.5])
        print('comp:', r['name'], len(r['layers']), 'layers; last:', r['layers'][-1], '| expr errors', r['errors'])
        for i, u in enumerate(r['urls']): open(f'{OUT}/ae_frame{i}.png', 'wb').write(base64.b64decode(u.split(',')[1]))
        await pg.click('#btnSave'); await pg.wait_for_timeout(500)
        print('saved files:', await pg.evaluate("() => Object.keys(__H.vfs).filter(k => k.startsWith('/out/'))"))
        print('temp files left:', await pg.evaluate("() => Object.keys(__H.vfs).filter(k => k.startsWith('/tmp/'))"))
        await pg.evaluate("() => document.querySelector('.terms-open').click()"); await pg.wait_for_timeout(200)
        await pg.click('#termsDlg a[href^=http]'); print('links:', await pg.evaluate("() => __H.links"))
        await pg.evaluate("() => document.getElementById('termsDlg').close()")
        print('host errors:', await pg.evaluate("() => __H.errors"), '| page errors:', errs[:5])
        await pg.click('.tabs button[data-tab=style]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'{OUT}/pro_style.png')
        await ctx.close()
        # ---- B: no Node (string path), easy mode, narrow panel
        ctx = await b.new_context(viewport={'width': 420, 'height': 860})
        await ctx.add_init_script("try{localStorage.setItem('jizura.mode','easy')}catch(e){}; window.__NO_NODE = true;")
        await ctx.add_init_script(MOCK)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/cepx/index.html')
        await wait_status(pg, '接続しました')
        await pg.click('#eAEBuild')
        print('build (no node):', await wait_status(pg, '作成しました', 180000))
        el = await pg.query_selector('#eAEBuild'); await el.scroll_into_view_if_needed()
        await pg.screenshot(path=f'{OUT}/easy_narrow.png')
        print('host errors:', await pg.evaluate("() => __H.errors"), '| page errors:', errs[:5])
        await b.close()
asyncio.run(main())
