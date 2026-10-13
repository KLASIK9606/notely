import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { readSequentially } from '../src/ocrPipeline.ts';
import { sourceLimit, importMime } from '../src/sourcePolicy.ts';
import { validateFiles } from '../server/index.mjs';
import { copyStoredFile } from '../src/sourceCopy.ts';

// Persistent fake IndexedDB shared by fresh module instances. This is an IO
// contract test, not an actual browser/phone or provider OCR test.
const compiled = ts.transpileModule(await readFile(new URL('../src/sourceStorage.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function storage(store, payloads) {
  let sequence = 0;
  const blobs = new Map();
  const sandbox = { exports: {}, require: name => {
    if (name === 'react-native') return { Platform: { OS: 'web' } };
    if (name === './sourcePolicy') return { sourceLimit };
    throw Error(name);
  }, fetch: async uri => ({ ok: payloads.has(uri), blob: async () => payloads.get(uri) }),
  URL: { createObjectURL: blob => { const url = `blob:instance-${++sequence}`; blobs.set(url, blob); return url; }, revokeObjectURL: url => blobs.delete(url) },
  indexedDB: { open() {
    const db = { close() {}, transaction() {
      const tx = { objectStore: () => ({ put: (blob, id) => store.set(id, blob), delete: id => store.delete(id), get(id) { const req = {}; queueMicrotask(() => { req.result = store.get(id); req.onsuccess(); }); return req; } }) };
      queueMicrotask(() => tx.oncomplete?.()); return tx;
    } };
    const req = { result: db }; queueMicrotask(() => req.onsuccess()); return req;
  } } };
  vm.runInNewContext(compiled, sandbox);
  return { ...sandbox.exports, blobs };
}
const types = ['image/png', 'application/pdf', 'audio/wav'];
for (const mime of types) test(`source bytes survive fresh storage instance: ${mime}`, async () => {
  const store = new Map(), bytes = new Blob([`own synthetic fixture ${mime}`], { type: mime });
  const first = storage(store, new Map([['blob:input', bytes]]));
  const saved = await first.saveWebSource('blob:input', 'test-1', mime);
  const second = storage(store, new Map());
  const [restored] = await second.restoreSources([{ id: 'test-1', uri: saved.uri, mime, name: 'test', bytes: bytes.size }]);
  assert.equal(await second.blobs.get(restored.uri).text(), await bytes.text());
  assert.equal(restored.bytes, bytes.size);
});
test('empty, HTTP failure and oversize imports leave no stored source', async () => {
  for (const [payload, uri] of [[new Blob([]), 'blob:input'], [new Blob(['not found']), 'missing'], [new Blob([new Uint8Array(8 * 1024 * 1024 + 1)]), 'blob:input']]) {
    const store = new Map(), h = storage(store, new Map([['blob:input', payload]]));
    await assert.rejects(h.saveWebSource(uri, 'test-1', 'image/png'));
    assert.equal(store.size, 0);
  }
});
test('deleting an owned test source removes persisted bytes', async () => {
  const store = new Map(), h = storage(store, new Map([['input', new Blob(['own fixture'])]]));
  await h.saveWebSource('input', 'owned-test', 'audio/wav');
  await h.deleteWebSource('owned-test');
  assert.equal(store.size, 0); assert.equal(h.blobs.size, 0);
});
test('mixed eight attachments retain all 1600 lines and uncertainty offsets', async () => {
  const files = Array.from({length: 8}, (_, i) => ({id: String(i), mime: types[i % 3], name: `test-${i}`, uri: String(i), bytes: 10}));
  const calls = [];
  const result = await readSequentially(files, {
    yieldUI: async () => {}, encode: async f => { calls.push(`encode-${f.id}`); return f.id; },
    send: async f => { calls.push(`send-${f.id}`); return { title: 'Synthetic lesson', subject: 'Historia', lines: Array.from({length:200}, (_, i) => `${f.id}:${i}`), uncertainties:[{line:200,reason:'Check fixture'}] }; },
  });
  assert.equal(result.lines.length, 1600); assert.equal(result.lines.at(-1), '7:199');
  assert.deepEqual(result.uncertainties.map(u => u.line), [200,400,600,800,1000,1200,1400,1600]);
  assert.deepEqual(calls, files.flatMap(f => [`encode-${f.id}`, `send-${f.id}`]));
});
test('file three provider failure does not return falsely complete notes', async () => {
  let called = 0;
  await assert.rejects(readSequentially(Array.from({length:8}, (_,i) => ({id:String(i)})), {
    yieldUI: async () => {}, encode: async f => f.id,
    send: async f => { called++; if(f.id === '2') throw Error('synthetic provider 429'); return {title:'T',subject:'S',lines:[f.id],uncertainties:[]}; },
  }), /429/);
  assert.equal(called, 3);
});
test('extension and MIME recognition is case tolerant and rejects unsupported DOCX', () => {
  assert.equal(importMime('OWN.PDF', 'application/octet-stream'), 'application/pdf');
  assert.equal(importMime('lecture.M4A'), 'audio/mp4');
  assert.equal(importMime('word.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'), '');
});
test('server rejects mismatched and empty visual content before provider work', () => {
  assert.throws(() => validateFiles([{name:'wrong.pdf',mime:'application/pdf',data:Buffer.from('not a pdf').toString('base64')}]), /zawartością/);
  assert.throws(() => validateFiles([{name:'empty.png',mime:'image/png',data:''}]), /Obsługujemy/);
});
test('native copy verifies source size after completion', async () => {
  await copyStoredFile({copy:async () => {}}, {exists:true,size:24}, 24);
  await assert.rejects(copyStoredFile({copy:async () => {}}, {exists:true,size:23}, 24), /pełnego pliku/);
});
