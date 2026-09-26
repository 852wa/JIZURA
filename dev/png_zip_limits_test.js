// ZIP32 boundary tests for the browser PNG sequence writer. Run: node dev/png_zip_limits_test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const source = fs.readFileSync(path.join(__dirname, '../src/11_export.js'), 'utf8');
assert(source.endsWith('})();\n'));
const J = {};
let canvasCreated = false;
const sandbox = {
  J, Blob, TextEncoder, Uint8Array, DataView, ArrayBuffer,
  document: { createElement() { canvasCreated = true; throw Error('rendering should not start'); } },
};
vm.runInNewContext(source.slice(0, -6) + 'globalThis.ZipWriterForTest = ZipWriter;})();\n', sandbox);
const ZipWriter = sandbox.ZipWriterForTest;
const limit = 0xffffffff;
const empty = new Uint8Array();
const overLimit = fn => assert.throws(fn, e => e.name === 'RangeError' && /PNG ZIP/.test(e.message));

(async () => {
  // A real ZIP is readable by a separate implementation, including a UTF-8 filename.
  const valid = new ZipWriter();
  valid.add('a.txt', new TextEncoder().encode('first'));
  valid.add('日本語.txt', new TextEncoder().encode('second'));
  const bytes = Buffer.from(await valid.finish().arrayBuffer());
  const checked = spawnSync('python3', ['-c', `
import io, json, sys, zipfile
with zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())) as z:
    assert z.testzip() is None
    print(json.dumps({name: z.read(name).decode() for name in z.namelist()}, ensure_ascii=False))
`], { input: bytes, encoding: 'utf8' });
  assert.equal(checked.status, 0, checked.stderr);
  assert.deepEqual(JSON.parse(checked.stdout), { 'a.txt': 'first', '日本語.txt': 'second' });

  // EOCD count 0xffff is a ZIP64 sentinel, so 0xfffe is the last valid count.
  const count = new ZipWriter();
  for (let i = 0; i < 0xfffe; i++) count.add('x', empty);
  const countBytes = Buffer.from(await count.finish().arrayBuffer());
  assert.equal(countBytes.readUInt16LE(countBytes.length - 14), 0xfffe);
  overLimit(() => count.add('x', empty));

  // Synthetic offsets exercise the exact 32-bit boundary without allocating 4 GiB.
  const edge = new ZipWriter();
  edge.offset = limit - 101; // one-byte name: 31-byte local header, 47-byte central entry, 22-byte end
  edge.add('x', empty); // hypothetical final size is limit - 1
  assert.equal(edge.offset + edge.centralSize + 22, limit - 1);
  const overflow = new ZipWriter();
  overflow.offset = limit - 100;
  overLimit(() => overflow.add('x', empty)); // hypothetical final size is the reserved value
  const localOffset = new ZipWriter();
  localOffset.offset = limit - 31;
  overLimit(() => localOffset.add('x', empty)); // next local offset is the reserved value
  for (const offset of [limit, NaN, Infinity, -1]) {
    const writer = new ZipWriter();
    writer.offset = offset;
    overLimit(() => writer.add('x', empty));
    overLimit(() => writer.finish());
  }
  const largeEntry = new ZipWriter();
  overLimit(() => largeEntry.add('x', { length: limit })); // rejected before CRC reads bytes
  const largeDirectory = new ZipWriter();
  largeDirectory.centralSize = limit - 47;
  overLimit(() => largeDirectory.add('x', empty)); // next directory size is the reserved value
  largeDirectory.centralSize = limit;
  overLimit(() => largeDirectory.finish());

  // The highest accepted frame count proceeds to setup; the next count stops before the canvas.
  J.outputSize = () => [1, 1];
  await assert.rejects(J.exportPNGZip({ plan: { fps: 1, duration: 0xfffe }, project: {}, layers: false }), /rendering should not start/);
  assert.equal(canvasCreated, true);
  canvasCreated = false;
  await assert.rejects(J.exportPNGZip({ plan: { fps: 1, duration: 0xffff }, project: {}, layers: false }), /PNG ZIP/);
  await assert.rejects(J.exportPNGZip({ plan: { fps: 1, duration: 32768 }, project: {}, layers: true }), /PNG ZIP/);
  assert.equal(canvasCreated, false);
  console.log('PNG ZIP limit and compatibility checks passed');
})().catch(e => { console.error(e); process.exitCode = 1; });
