import test from 'node:test';
import assert from 'node:assert/strict';
import { readSequentially } from './ocrPipeline.ts';
import { mergeTranscriptions } from './transcription.ts';
const sources = ['a', 'b'].map(id => ({ id, name: id, mime: 'image/jpeg', uri: id, bytes: 1 }));
const page = id => ({ title: id, subject: 'Biologia', lines: [id], uncertainties: [{ line: 1, reason: 'Sprawdź' }] });
test('PDF paraphrase provenance survives merging with photos and uncertainty offsets', () => {
  const result = mergeTranscriptions([page('photo'), { ...page('[Strona 3] Ziemniak'), sourceMode: 'pdf-notes' }]);
  assert.equal(result.sourceMode, 'pdf-notes');
  assert.deepEqual(result.lines, ['photo', '[Strona 3] Ziemniak']);
  assert.equal(result.uncertainties[1].line, 2);
});
test('OCR sends each attachment before reading the next and retains source order', async () => {
  const calls = [], progress = [];
  const result = await readSequentially(sources, {
    yieldUI: async () => calls.push('yield'),
    encode: async source => { calls.push(`read:${source.id}`); return source.id; },
    send: async (source, data) => { assert.equal(data, source.id); calls.push(`send:${source.id}`); return page(source.id); },
  }, { onProgress: label => progress.push(label) });
  assert.deepEqual(calls, ['yield', 'read:a', 'yield', 'send:a', 'yield', 'read:b', 'yield', 'send:b']);
  assert.deepEqual(result.lines, ['a', 'b']);
  assert.deepEqual(result.uncertainties.map(u => u.line), [1, 2]);
  assert.equal(progress.length, 4); assert.match(progress[2], /2 z 2/);
});
test('Cancel before starting does not read or transmit anything', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(readSequentially(sources, {
    yieldUI: async () => assert.fail(), encode: async () => assert.fail(), send: async () => assert.fail(),
  }, { signal: controller.signal }), { name: 'AbortError' });
});
test('Cancel during encoding prevents transmission of that attachment', async () => {
  const controller = new AbortController();
  await assert.rejects(readSequentially(sources, {
    yieldUI: async () => {}, encode: async () => { controller.abort(); return 'data'; }, send: async () => assert.fail('No upload after cancel'),
  }, { signal: controller.signal }), { name: 'AbortError' });
});
test('Late response after cancel cannot produce a result or start the next file', async () => {
  const controller = new AbortController(); let reads = 0;
  await assert.rejects(readSequentially(sources, {
    yieldUI: async () => {}, encode: async () => { reads++; return 'data'; },
    send: async source => { controller.abort(); return page(source.id); },
  }, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(reads, 1);
});
test('An error in a page does not silently return an incomplete lesson', async () => {
  await assert.rejects(readSequentially(sources, {
    yieldUI: async () => {}, encode: async source => source.id,
    send: async source => { if (source.id === 'b') throw new Error('network'); return page(source.id); },
  }), /network/);
});
