"""Browser WebMCP contract and integration checks (no production dependencies).
Run: python3 build.py && python3 dev/webmcp_test.py
Requires pip install playwright and an installed Chrome (or --browser PATH).
Uses a local HTTP server, fresh profiles, and blocks external font requests.
"""
import argparse
import asyncio
import functools
import http.server
import json
import io
import wave
from pathlib import Path
import threading
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
MOCK = """
window.__tools = new Map();
Object.defineProperty(document, 'modelContext', { configurable: true, value: {
  registerTool(tool, options) {
    if (__tools.has(tool.name)) throw new Error('duplicate tool');
    __tools.set(tool.name, tool);
    options?.signal?.addEventListener('abort', () => __tools.delete(tool.name));
  }
}});
"""
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--browser', default='/usr/bin/google-chrome')
    args = ap.parse_args()
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}/'
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=args.browser, args=['--no-sandbox', '--enable-experimental-web-platform-features'])
        async def page_for(path='', init=MOCK):
            page = await browser.new_page()
            await page.route('https://**/*', lambda route: route.abort())
            if init: await page.add_init_script(init)
            await page.add_init_script("localStorage.setItem('jizura.tourDone','1');")
            await page.goto(base + path, wait_until='domcontentloaded')
            await page.wait_for_function('window.J && J.ui && J.ui.plan && !J.ui.loading.boot')
            await page.wait_for_function("!J.webMCP || J.webMCP.status !== 'registering'")
            return page
        page = await page_for()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        async def call(name, a=None, ok=True, pg=None):
            result = await (pg or page).evaluate("async ([n,a]) => JSON.parse(await __tools.get('jizura_'+n).execute(a))", [name, a or {}])
            assert result['ok'] == ok, (name, a, result)
            return result
        async def state(): return await call('get_state')
        assert await page.evaluate('__tools.size') == 18
        assert (await call('list_options', {'category':'style'}))['total'] >= 27
        await call('set_lyrics', {'text':'# comment\n[00:00.00]Hello/world\n[間奏 1]\n[00:03.00]Again!'})
        st = await state()
        assert st['lines'][0]['sourceRow'] == 2
        old = st['revision']
        await call('update_settings', {'settings': {'mode':'pro','title':'Test','res':720,'fps':24,'style':'noir','fonts':{'display':'gothic_bold'}}})
        await call('edit_line', {'line':1,'revision':old,'cuts':1}, ok=False)
        await call('edit_line', {'line':1,'revision':(await state())['revision'],'text':'New/words'})
        assert '[00:00.00]New/words' in (await state())['project']['lyrics']
        await call('history', {'kind':'edit','direction':'back'})
        assert 'Hello/world' in (await state())['project']['lyrics']
        await call('history', {'kind':'edit','direction':'forward'})
        await call('edit_line', {'line':1,'revision':(await state())['revision'],'cuts':1})
        await call('edit_cut', {'line':1,'cut':1,'revision':(await state())['revision'],'group':'layout','key':'center','quiet':True})
        assert (await state())['project']['overrides']['0']['cutTech']['0']['layout'] == 'center'
        await call('edit_line', {'line':1,'revision':(await state())['revision'],'lock':True})
        locked = (await state())['project']['overrides']['0']['lockedCuts']
        await call('set_locks', {'kind':'params','keys':['motion'],'locked':True})
        motion = (await state())['project']['fx']['motion']
        await call('randomize', {'target':'all'})
        st = await state()
        assert st['project']['overrides']['0']['lockedCuts'] == locked
        assert st['project']['fx']['motion'] == motion
        await call('history', {'kind':'look','direction':'back'})
        await call('history', {'kind':'look','direction':'forward'})
        await call('set_timing', {'revision':(await state())['revision'],'times':[{'line':1,'time':0.1}]})
        await call('set_techniques', {'group':'enter','enabled':False})
        enabled = (await state())['project']['enabled']['enter']
        assert enabled['cut'] and sum(enabled.values()) == 1
        await call('set_techniques', {'group':'enter','enabled':True})
        await call('preview', {'time':0.5,'loop':'line','volume':0.2,'muted':True,'action':'pause'})
        assert (await state())['playback']['volume'] == 0.2
        await call('tap_sync', {'action':'start','revision':(await state())['revision'],'line':1})
        await call('set_lyrics', {'text':'busy'}, ok=False)
        await call('tap_sync', {'action':'record'})
        await call('tap_sync', {'action':'back'})
        await call('tap_sync', {'action':'stop'})
        before = (await call('project', {'action':'get'}))['project']
        await call('project', {'action':'import','json':json.dumps(before)})
        after = (await call('project', {'action':'get'}))['project']
        # Existing importer fills omitted enabled entries with true.
        for group, values in after['enabled'].items():
            assert all(value == before['enabled'][group].get(key, True) for key, value in values.items())
        assert {k:v for k,v in after.items() if k != 'enabled'} == {k:v for k,v in before.items() if k != 'enabled'}
        before = after
        assert (await call('project', {'action':'get_ae'}))['project']
        for tool, a in [('update_settings', {'settings':{'fps':25}}), ('update_settings', {'settings':{'fonts':{'display':'bad'}}}), ('set_lyrics',{'text':'x','extra':1}), ('edit_cut',{'line':1,'cut':999,'revision':(await state())['revision'],'group':'layout','key':'center'}), ('project',{'action':'import','json':'{"lyrics":"x","__proto__":{}}'}), ('project',{'action':'import','json':'{"lyrics":"x","fx":{"motion":"oops"}}'})]:
            await call(tool, a, ok=False)
        assert (await call('project', {'action':'get'}))['project'] == before
        # Tools serialize conflicting edits; the second stale reference must not apply.
        rev = (await state())['revision']
        concurrent = await page.evaluate("""async r => Promise.all([1,2].map(cuts => __tools.get('jizura_edit_line').execute({line:1,revision:r,cuts}).then(JSON.parse)))""", rev)
        assert concurrent[0]['ok'] and concurrent[1]['error']['code'] == 'stale_revision'
        # Loading status and aborted calls are explicit, without partial edits.
        await page.evaluate('J.ui.loading.audio = true')
        await call('update_settings', {'settings':{'title':'blocked'}}, ok=False)
        await page.evaluate('J.ui.loading.audio = false')
        cancelled = await page.evaluate("""async () => { const ac = new AbortController(); ac.abort(); return JSON.parse(await __tools.get('jizura_set_lyrics').execute({text:'cancelled'}, {signal:ac.signal})); }""")
        assert cancelled['error']['code'] == 'cancelled'
        # File upload uses the original input and real audio decoder/analysis.
        wav = io.BytesIO()
        with wave.open(wav, 'wb') as w:
            w.setparams((1, 2, 8000, 0, 'NONE', 'not compressed'))
            w.writeframes(b'\0\0' * 8000)
        await page.locator('#audioFile').set_input_files({'name':'test.wav','mimeType':'audio/wav','buffer':wav.getvalue()})
        await page.wait_for_function('!J.ui.loading.audio && !!J.ui.audio')
        assert (await state())['audio']['name'] == 'test.wav'
        # A pending UI input is flushed before revision validation, not overwritten by a stale tool.
        await page.locator('#lyrics').fill('Changed by human')
        await call('edit_line', {'line':1,'revision':st['revision'],'text':'stale'}, ok=False)
        assert (await state())['project']['lyrics'] == 'Changed by human'
        # Reset is only a prompt. Cancelling it leaves the project intact.
        await call('reset_project')
        assert await page.locator('#resetDlg').evaluate('(e) => e.open')
        await page.evaluate("document.getElementById('resetDlg').close('cancel')")
        assert (await state())['project']['lyrics'] == 'Changed by human'
        # Shared UI actions remain functional.
        await page.locator('#btnClearLyrics').click()
        assert (await state())['project']['lyrics'] == ''
        await call('history', {'kind':'edit','direction':'back'})
        # Export integration: actual short PNG variants and MP4, with browser download event.
        await call('set_lyrics', {'text':'[00:00.00]A\n[00:00.25]B'})
        await call('update_settings', {'settings':{'mode':'pro','res':720,'style':'noir','extra':False,'fx':{'density':0}}})
        await call('update_settings', {'revision':(await state())['revision'],'settings':{'exportRange':{'from':1,'to':1}}})
        for kind in ['png','pnga','pngl','mp4']:
            async with page.expect_download(timeout=60000) as download:
                result = await call('start_export', {'kind':kind})
                job_id = result['job']['id']
            dl = await download.value
            await page.wait_for_function("J.ui.exportJob.status !== 'running'", timeout=60000)
            job = (await call('get_export_status', {'jobId':job_id}))['job']
            assert job['status'] == 'completed', job
            assert job['files'][0]['status'] == 'download_started'
            assert job['files'][0]['bytes'] > 100
            assert '_L01' in dl.suggested_filename
        # A deliberately delayed encoder proves UI edits do not change the captured export inputs.
        await page.evaluate("""() => { window.originalPNG = J.exportPNGZip; J.exportPNGZip = async o => { window.captured = o; await new Promise(r => window.releaseExport = r); return new Blob(['zip']); }; }""")
        result = await call('start_export', {'kind':'png'})
        await page.wait_for_function('!!window.releaseExport')
        await page.locator('#songTitle').fill('Edited during export')
        assert await page.evaluate('captured.project.title') == 'Test'
        assert await page.evaluate('Array.isArray(captured.plan.energy) && captured.plan.energy.length === J.ui.audio.energy.length')
        await call('set_lyrics', {'text':'blocked'}, ok=False)
        await call('cancel_export', {'jobId':result['job']['id']})
        await page.evaluate('releaseExport()')
        await page.wait_for_function("J.ui.exportJob.status === 'cancelled'")
        await page.evaluate('() => { J.exportPNGZip = originalPNG; }')
        # Missing uploaded fonts and unavailable video codecs use actual export error handling.
        await page.evaluate("() => { window.originalMissing = J.missingUserFonts; J.missingUserFonts = () => ['missing.ttf']; }")
        await call('start_export', {'kind':'png'})
        await page.wait_for_function("J.ui.exportJob.status === 'failed'")
        assert 'missing.ttf' in (await call('get_export_status'))['job']['error']
        await page.evaluate("() => { J.missingUserFonts = originalMissing; window.originalAttempts = J.videoAttempts; J.videoAttempts = async () => []; }")
        await call('start_export', {'kind':'mp4'})
        await page.wait_for_function("J.ui.exportJob.status === 'failed'")
        await page.evaluate('() => { J.videoAttempts = originalAttempts; }')
        # Failed encoder and declined save are distinct terminal states.
        await page.evaluate("() => { J.exportPNGZip = async () => { throw new Error('codec test failure'); }; }")
        await call('start_export', {'kind':'png'})
        await page.wait_for_function("J.ui.exportJob.status === 'failed'")
        await page.evaluate("() => { J.exportPNGZip = async () => new Blob(['zip']); J.saveFile = async () => 'declined'; }")
        await call('start_export', {'kind':'png'})
        await page.wait_for_function("J.ui.exportJob.status === 'save_declined'")
        await call('reset_project')
        await page.evaluate("document.getElementById('resetDlg').close('reset')")
        await page.wait_for_function("!J.ui.loading.reset && J.ui.project.lyrics === ''")
        assert not (await state())['audio']['loaded']
        await page.add_script_tag(content=(ROOT / 'src/13_webmcp.js').read_text())
        assert await page.evaluate('__tools.size') == 18
        assert not errors, errors
        print('PASS: 18 tools, editing, histories, locks, validation, JSON, reset, real MP4/PNG exports and export outcomes')
        await page.close()
        # No UI host: engine-only pages must never register tools.
        pg = await browser.new_page()
        await pg.set_content('<html><body></body></html>')
        await pg.evaluate(MOCK)
        for source in sorted((ROOT / 'src').glob('*.js')):
            await pg.add_script_tag(content=source.read_text())
        assert await pg.evaluate('__tools.size === 0 && !J.ui && !!J.plan')
        await pg.close()
        # All editions register identical tool names and their UI remains live.
        for folder in ['', 'en/', 'zh-hant/', 'zh-hans/', 'ko/', 'id/', 'vi/']:
            pg = await page_for(folder)
            assert await pg.evaluate('__tools.size') == 18
            assert (await call('get_state', pg=pg))['lineCount'] > 0
            await pg.close()
        for init, expected in [
            ("Object.defineProperty(document,'modelContext',{value:undefined}); Object.defineProperty(navigator,'modelContext',{value:undefined});", 'unavailable'),
            (MOCK + 'window.__adobe_cep__ = {};', None),
            (MOCK + "Object.defineProperty(navigator,'modelContext',{value:document.modelContext}); Object.defineProperty(document,'modelContext',{value:undefined});", 'ready'),
            (MOCK + "const reg = document.modelContext.registerTool; document.modelContext.registerTool = (...args) => {if (__tools.size === 2) throw new Error('denied'); return reg(...args);};", 'failed'),
        ]:
            pg = await page_for(init=init)
            assert await pg.evaluate('J.webMCP?.status || null') == expected
            if expected == 'failed': assert await pg.evaluate('__tools.size') == 0
            await pg.locator('#lyrics').fill('UI still works')
            await pg.wait_for_function("J.ui.plan.lines[0].text === 'UI still works'")
            await pg.close()
        print('PASS: seven editions, absent/legacy/failed WebMCP and CEP guards')
        # Real browser surface, separate from the registration mock.
        pg = await page_for(init='')
        native = await pg.evaluate(r"""async () => {
          const c = document.modelContext || navigator.modelContext;
          const result = { userAgent: navigator.userAgent, status: J.webMCP.status, error: J.webMCP.error || null };
          if (c?.getTools) {
            const tools = await c.getTools(); result.count = tools.length;
            const tool = tools.find(t => t.name === 'jizura_get_state');
            if (tool) { const major = +(navigator.userAgent.match(/Chrome\/(\d+)/) || [0, 0])[1]; const out = await c.executeTool(tool, major && major < 155 ? '{}' : {}); result.call = typeof out === 'string' ? JSON.parse(out).ok : out;
              const edit = tools.find(t => t.name === 'jizura_update_settings');
              const arg = {settings:{title:'Native WebMCP',fps:30}};
              const edited = await c.executeTool(edit, major && major < 155 ? JSON.stringify(arg) : arg);
              result.edit = JSON.parse(edited).ok && J.ui.project.title === 'Native WebMCP' && J.ui.project.fps === 30;
            }
          }
          return result;
        }""")
        print('NATIVE:', json.dumps(native, ensure_ascii=False))
        if native['status'] == 'ready' and 'count' in native: assert native['count'] == 18 and native['call'] is True and native['edit'] is True
        await browser.close()
    server.shutdown()

if __name__ == '__main__': asyncio.run(main())
