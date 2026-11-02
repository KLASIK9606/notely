import test from 'node:test';
import assert from 'node:assert/strict';
import { vocabularyBatches } from './vocabularyBatch.ts';

test('Translation batches respect item and character limits without losing rows', () => {
  const terms = Array.from({ length: 63 }, (_, i) => `${i} ` + 'ñ'.repeat(497));
  const batches = vocabularyBatches(terms);
  assert.deepEqual(batches.flat(), terms);
  assert.ok(batches.every(batch => batch.length <= 30 && batch.join('').length <= 12000));
  assert.deepEqual(batches.map(batch => batch.length), [24, 24, 15]);
});
test('Short lists retain repeats, Unicode and punctuation; invalid rows fail before upload', () => {
  assert.deepEqual(vocabularyBatches(['¿Qué tal?', 'año', 'año']), [['¿Qué tal?', 'año', 'año']]);
  assert.deepEqual(vocabularyBatches([]), []);
  assert.throws(() => vocabularyBatches(['hola', ' ']), /Wiersz 2/);
  assert.throws(() => vocabularyBatches(['x'.repeat(501)]), /500/);
  assert.deepEqual(vocabularyBatches(Array(31).fill('hola')).map(batch => batch.length), [30, 1]);
});
