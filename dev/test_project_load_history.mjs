import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import test from 'node:test';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

test('loading a project starts fresh edit and look histories', { timeout: 30000 }, async () => {
  const dir = await mkdtemp(tmpdir() + '/jizura-history-test-');
  const projectFile = dir + '/new-project.json';
  await writeFile(projectFile, JSON.stringify({ lyrics: 'NEW PROJECT', seed: 87654321, timing: { lineTimes: { 0: 3.25 } } }));
  const chrome = spawn(process.env.CHROME_BIN || '/usr/bin/google-chrome', [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
    '--disable-background-networking', '--remote-debugging-port=0',
    '--user-data-dir=' + dir, '--window-size=1440,1000', 'about:blank',
  ], { stdio: 'ignore' });
  let ws;
  try {
    let port;
    for (let i = 0; i < 100; i++) {
      try { port = (await readFile(dir + '/DevToolsActivePort', 'utf8')).split('\n')[0]; break; }
      catch { await wait(100); }
    }
    assert.ok(port, 'Chrome started');
    const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
    ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let id = 0;
    const pending = new Map();
    ws.onmessage = event => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const p = pending.get(message.id);
      pending.delete(message.id);
      message.error ? p.reject(message.error) : p.resolve(message.result);
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const n = ++id;
      pending.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params }));
    });
    const evaluate = async expression => {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      assert.equal(r.exceptionDetails, undefined);
      return r.result.value;
    };
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Network.enable');
    await send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: "localStorage.setItem('jizura.tourDone','1')" });
    await send('Page.navigate', { url: pathToFileURL(resolve(process.env.JIZURA_TEST_INDEX || 'index.html')).href });
    for (let i = 0; i < 100 && !await evaluate('!!window.J?.ui?.plan'); i++) await wait(100);
    assert.equal(await evaluate('!!window.J?.ui?.plan'), true, 'app initialized');

    const before = await evaluate(`(() => {
      const lyrics = document.getElementById('lyrics');
      lyrics.value = 'OLD PROJECT'; lyrics.dispatchEvent(new Event('input', { bubbles: true }));
      J.uiApi.replan();
      document.getElementById('btnClearLyrics').click();
      document.getElementById('btnShuffle').click();
      return { editUndo: !document.getElementById('btnUndoEdit').disabled,
        lookUndo: !document.getElementById('btnPrev').disabled };
    })()`);
    assert.deepEqual(before, { editUndo: true, lookUndo: true }, 'old project has both history types');

    const { root } = await send('DOM.getDocument');
    const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: '#fileProject' });
    await send('DOM.setFileInputFiles', { nodeId, files: [projectFile] });
    let loaded;
    for (let i = 0; i < 100; i++) {
      loaded = await evaluate(`({ seed: J.ui.project.seed, lyrics: J.ui.project.lyrics,
        lineTime: J.ui.project.timing.lineTimes[0], editUndo: !document.getElementById('btnUndoEdit').disabled,
        lookUndo: !document.getElementById('btnPrev').disabled,
        lookRedo: !document.getElementById('btnNext').disabled,
        histPos: document.getElementById('histPos').textContent })`);
      if (loaded.seed === 87654321) break;
      await wait(50);
    }
    assert.deepEqual(loaded, { seed: 87654321, lyrics: 'NEW PROJECT', lineTime: 3.25,
      editUndo: false, lookUndo: false, lookRedo: false, histPos: '' });

    const afterOldUndo = await evaluate(`(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', ctrlKey: true, bubbles: true }));
      return J.ui.project.lyrics;
    })()`);
    assert.equal(afterOldUndo, 'NEW PROJECT', 'Ctrl+Z cannot restore old project lyrics');

    const newHistory = await evaluate(`(() => {
      document.getElementById('btnShuffle').click();
      const canUndoLook = !document.getElementById('btnPrev').disabled;
      document.getElementById('btnPrev').click();
      document.getElementById('btnClearLyrics').click();
      document.getElementById('btnUndoEdit').click();
      return { canUndoLook, seed: J.ui.project.seed, lyrics: J.ui.project.lyrics,
        lineTime: J.ui.project.timing.lineTimes[0] };
    })()`);
    assert.deepEqual(newHistory, { canUndoLook: true, seed: 87654321,
      lyrics: 'NEW PROJECT', lineTime: 3.25 }, 'new project history remains functional');
  } finally {
    ws?.close();
    if (chrome.exitCode === null) {
      chrome.kill();
      await new Promise(resolve => chrome.once('exit', resolve));
    }
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
