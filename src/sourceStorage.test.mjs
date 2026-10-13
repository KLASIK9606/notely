import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the real storage module with browser IO substituted. No network or device storage.
async function storageHarness({ blob = new Blob(['audio']), ok = true, abort = false, deferred = false } = {}) {
  const events = [];
  let transaction;
  const db = {
    transaction() {
      transaction = {
        objectStore: () => ({ put(value, id) { events.push(['put', id, value.size]); } }),
      };
      if (!deferred) queueMicrotask(() => abort ? transaction.onabort?.() : transaction.oncomplete?.());
      return transaction;
    },
    close() { events.push(['close']); },
  };
  const sandbox = {
    exports: {},
    require(name) {
      if (name === 'react-native') return { Platform: { OS: 'web' } };
      if (name === './sourcePolicy') return { sourceLimit: () => 20 * 1024 * 1024 };
      throw Error(`Unexpected import ${name}`);
    },
    fetch: async () => ({ ok, blob: async () => blob }),
    indexedDB: { open() { events.push(['open']); const request = { result: db }; queueMicrotask(() => request.onsuccess()); return request; } },
    URL: { createObjectURL() { events.push(['url']); return 'blob:saved'; } },
  };
  const source = await readFile(new URL('./sourceStorage.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(compiled, sandbox, { filename: 'sourceStorage.ts' });
  return { save: sandbox.exports.saveWebSource, events, complete: () => transaction.oncomplete() };
}

test('web import rejects HTTP failures without persisting response content', async () => {
  const h = await storageHarness({ ok: false, blob: new Blob(['404 error']) });
  await assert.rejects(h.save('blob:source', 'file-1', 'audio/webm'));
  assert.deepEqual(h.events, []);
});

test('web import rejects an empty recording without reporting saved', async () => {
  const h = await storageHarness({ blob: new Blob([]) });
  await assert.rejects(h.save('blob:source', 'file-1', 'audio/webm'));
  assert.deepEqual(h.events, []);
});

test('web import exposes a saved URL only after the transaction completes', async () => {
  const h = await storageHarness({ deferred: true });
  let completed = false;
  const saved = h.save('blob:source', 'file-1', 'audio/webm').then(value => { completed = true; return value; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(completed, false);
  assert.deepEqual(h.events, [['open'], ['put', 'file-1', 5]]);
  h.complete();
  const value = await saved;
  assert.equal(value.uri, 'blob:saved');
  assert.equal(value.bytes, 5);
  assert.deepEqual(h.events.slice(-2), [['close'], ['url']]);
});

test('aborted web storage never returns a playable URL', async () => {
  const h = await storageHarness({ abort: true });
  await assert.rejects(h.save('blob:source', 'file-1', 'audio/webm'));
  assert.equal(h.events.some(event => event[0] === 'url'), false);
  assert.deepEqual(h.events.at(-1), ['close']);
});
