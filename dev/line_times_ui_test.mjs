// After python3 build.py: node dev/line_times_ui_test.mjs
// Uses a throwaway Chrome profile; no test dependencies or browser state changes.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const dir = await mkdtemp(tmpdir() + '/jizura-line-times-');
const chrome = spawn(process.env.CHROME_BIN || '/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--disable-background-networking', '--remote-debugging-port=0',
  '--user-data-dir=' + dir, 'about:blank',
], { stdio: 'ignore' });
let socket;
try {
  let port;
  for (let i = 0; i < 100; i++) {
    try { port = (await readFile(dir + '/DevToolsActivePort', 'utf8')).split('\n')[0]; break; }
    catch { await new Promise(done => setTimeout(done, 100)); }
  }
  assert.ok(port, 'Chrome did not start');
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((done, fail) => { socket.onopen = done; socket.onerror = fail; });
  let nextId = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const reply = JSON.parse(event.data);
    if (!reply.id) return;
    const p = pending.get(reply.id); pending.delete(reply.id);
    reply.error ? p.fail(reply.error) : p.done(reply.result);
  };
  const send = (method, params = {}) => new Promise((done, fail) => {
    const id = ++nextId; pending.set(id, { done, fail });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', { url: pathToFileURL(resolve('index.html')).href });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (await evaluate('!!window.J?.ui?.plan')) { ready = true; break; }
    await new Promise(done => setTimeout(done, 100));
  }
  assert.ok(ready, 'JIZURA page did not initialize');
  const auto = await evaluate(`(() => {
    const p = J.defaultProject(); p.lyrics = 'first\\nsecond'; p.timing.bpm = 0;
    J.ui.project = p; J.uiApi.syncUI(); J.uiApi.replan();
    const input = document.querySelector('#lineList .time');
    input.value = '10'; input.dispatchEvent(new Event('change'));
    return { value: p.timing.lineTimes[0], starts: J.ui.plan.lines.map(l => l.start) };
  })()`);
  assert.equal(auto.value, 10);
  assert.deepEqual(auto.starts.map(x => +x.toFixed(3)), [10, 11.65]);
  const fixed = await evaluate(`(() => {
    const p = J.defaultProject(); p.lyrics = '[00:10.00]first\\n[00:20.00]second';
    J.ui.project = p; J.uiApi.syncUI(); J.uiApi.replan();
    const input = document.querySelector('#lineList .time');
    input.value = '30'; input.dispatchEvent(new Event('change'));
    return { value: p.timing.lineTimes[0], starts: J.ui.plan.lines.map(l => l.start) };
  })()`);
  assert.equal(fixed.value, 19.8);
  assert.deepEqual(fixed.starts, [19.8, 20]);
  console.log('line_times_ui_test: passed');
} finally {
  socket?.close();
  await new Promise(done => { chrome.once('exit', done); chrome.kill(); setTimeout(done, 1000).unref(); });
  await rm(dir, { recursive: true, force: true });
}
