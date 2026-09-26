import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import test from 'node:test';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

test('technique thumbnails render only when visible, including after scrolling', { timeout: 30000 }, async () => {
  const dir = await mkdtemp(tmpdir() + '/jizura-preview-test-');
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

    const first = await evaluate(`(async () => {
      document.getElementById('modePro').click();
      document.querySelector('.tabs button[data-tab="tech"]').click();
      const group = document.querySelector('#techLists details');
      group.open = true;
      group.scrollIntoView();
      await new Promise(resolve => setTimeout(resolve, 700));
      const cards = [...group.querySelectorAll('canvas[data-g]')];
      return { total: cards.length, ready: cards.filter(c => c.dataset.ready === '1').length,
        lastReady: cards.at(-1).dataset.ready === '1' };
    })()`);
    assert.ok(first.total > 100, 'layout group has many cards');
    assert.ok(first.ready > 0, 'visible cards are painted');
    assert.ok(first.ready < first.total / 2, 'offscreen cards are not eagerly painted');
    assert.equal(first.lastReady, false, 'last card is initially offscreen');

    const lastReady = await evaluate(`(async () => {
      const last = [...document.querySelector('#techLists details').querySelectorAll('canvas[data-g]')].at(-1);
      last.scrollIntoView();
      for (let i = 0; i < 30 && last.dataset.ready !== '1'; i++)
        await new Promise(resolve => setTimeout(resolve, 100));
      return last.dataset.ready === '1';
    })()`);
    assert.equal(lastReady, true, 'offscreen card paints when scrolled into view');
  } finally {
    ws?.close();
    if (chrome.exitCode === null) {
      chrome.kill();
      await new Promise(resolve => chrome.once('exit', resolve));
    }
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
