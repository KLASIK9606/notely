import test from 'node:test';
import assert from 'node:assert/strict';
import { copyStoredFile } from './sourceCopy.ts';

test('file is verified only after asynchronous copy finishes', async () => {
  let complete;
  let copied = false;
  const target = { get exists() { assert.equal(copied, true); return true; }, get size() { assert.equal(copied, true); return 1024; } };
  const result = copyStoredFile({ copy: async () => { await new Promise(resolve => { complete = resolve; }); copied = true; } }, target, 1024);
  assert.equal(copied, false);
  complete();
  await result;
});
test('copy failure and incomplete destination are never reported as saved', async () => {
  await assert.rejects(copyStoredFile({ copy: async () => { throw Error('no space'); } }, { exists: false, size: 0 }, 1024), /no space/);
  await assert.rejects(copyStoredFile({ copy: async () => {} }, { exists: true, size: 512 }, 1024), /pełnego pliku/);
});
