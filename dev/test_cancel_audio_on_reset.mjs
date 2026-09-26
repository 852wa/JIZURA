import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import test from 'node:test';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

test('reset invalidates an in-flight audio analysis', { timeout: 30000 }, async () => {
  const dir = await mkdtemp(tmpdir() + '/jizura-audio-reset-test-');
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

    const started = await evaluate(`(() => {
      J.analyzeAudio = () => new Promise(resolve => { window.releaseAnalysis = resolve; });
      J.forgetSong = () => new Promise(resolve => { window.releaseForget = resolve; });
      J.saveSong = () => Promise.resolve(true);
      window.pendingAudio = J.uiApi.loadAudioFile(new File([new Uint8Array(2)], 'old.wav', { type: 'audio/wav' }));
      const dialog = document.getElementById('resetDlg');
      dialog.returnValue = 'reset'; dialog.dispatchEvent(new Event('close'));
      return { analysisStarted: !!window.releaseAnalysis, resetStarted: !!window.releaseForget,
        audio: !!J.ui.audio, audioName: J.ui.project.audioName };
    })()`);
    assert.equal(started.analysisStarted, true);
    assert.equal(started.resetStarted, true);
    assert.equal(started.audio, false);
    assert.ok(!started.audioName);

    const oldResult = await evaluate(`(async () => {
      window.releaseAnalysis({ duration: 12, bpm: 120, beats: [0, 0.5, 1] });
      return await window.pendingAudio;
    })()`);
    assert.equal(oldResult, false, 'old analysis is rejected once reset has started');
    const duringReset = await evaluate(`({ audio: !!J.ui.audio, audioName: J.ui.project.audioName })`);
    assert.equal(duringReset.audio, false);
    assert.ok(!duringReset.audioName);

    const resetDone = await evaluate(`(async () => {
      window.releaseForget();
      await new Promise(resolve => setTimeout(resolve, 100));
      return { audio: !!J.ui.audio, audioName: J.ui.project.audioName,
        label: document.getElementById('audioName').textContent };
    })()`);
    assert.equal(resetDone.audio, false);
    assert.ok(!resetDone.audioName);
    assert.ok(!resetDone.label.includes('old.wav'));

    const newResult = await evaluate(`(async () => {
      const pending = J.uiApi.loadAudioFile(new File([new Uint8Array(2)], 'new.wav', { type: 'audio/wav' }));
      window.releaseAnalysis({ duration: 12, bpm: 120, beats: [0, 0.5, 1] });
      return { loaded: await pending, audioName: J.ui.project.audioName, audio: !!J.ui.audio };
    })()`);
    assert.deepEqual(newResult, { loaded: true, audioName: 'new.wav', audio: true },
      'a new audio selection after reset still loads normally');
  } finally {
    ws?.close();
    if (chrome.exitCode === null) {
      chrome.kill();
      await new Promise(resolve => chrome.once('exit', resolve));
    }
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
