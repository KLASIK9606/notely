import test from 'node:test';
import assert from 'node:assert/strict';
import { readOcr, normalizeOcr } from './ocrRead.mjs';
import { transcriptionSchema, validTranscription } from './schema.mjs';
const note = { title: 'Historia', subject: 'Historia', lines: ['Powstanie wybuchło w [nieczytelne] roku.', 'Walki miały charakter partyzancki.'], uncertainties: [{ line: 1, reason: 'Rok niewyraźny.' }] };

test('Partial handwriting is retained with uncertainty instead of rejecting the entire page', async () => {
  let calls = 0;
  const result = await readOcr({}, {}, transcriptionSchema, 'transcription', 'OCR', [], {}, async (_config, _ai, _schema, _name, instructions) => {
    calls++; assert.match(instructions, /Pismo odręczne/); return note;
  });
  assert.deepEqual(result, note); assert.equal(calls, 1);
});
test('Empty handwritten OCR gets exactly one recovery using the same image', async () => {
  const content = [{ type: 'input_image', image_url: 'fixture-image' }]; let calls = 0;
  const result = await readOcr({}, {}, transcriptionSchema, 'transcription', 'OCR', content, {}, async (_config, _ai, _schema, _name, instructions, attached) => {
    calls++; assert.equal(attached, content);
    if (calls === 1) return { ...note, lines: [], uncertainties: [] };
    assert.match(instructions, /Ponownie obejrzyj/); return note;
  });
  assert.equal(calls, 2); assert.deepEqual(result.lines, note.lines);
});
test('Empty title and misplaced warning do not destroy actual text, but still require review', () => {
  const result = normalizeOcr({ ...note, title: '', uncertainties: [{ line: 99, reason: 'Niewyraźne słowo' }] });
  assert.ok(validTranscription(result)); assert.deepEqual(result.lines, note.lines);
  assert.deepEqual(result.uncertainties.map(item => item.line), [1, 2]);
  assert.equal(normalizeOcr({ lines: ['text'] }), null);
});
test('Blank images and invalid response format have distinct errors and stop after two attempts', async () => {
  for (const [value, status, message] of [[{ ...note, lines: [], uncertainties: [] }, 422, /nie odczytało tekstu/], [{ lines: ['tekst'] }, 502, /format/]]) {
    let calls = 0;
    await assert.rejects(readOcr({}, {}, transcriptionSchema, 'transcription', 'OCR', [], {}, async () => { calls++; return value; }), error => error.status === status && message.test(error.message));
    assert.equal(calls, 2);
  }
});
test('Quota, provider blocks and PDF outputs are never silently retried as handwriting', async () => {
  let calls = 0;
  const blocked = Object.assign(new Error('RECITATION'), { status: 422 });
  await assert.rejects(readOcr({}, {}, transcriptionSchema, 'transcription', 'OCR', [], {}, async () => { calls++; throw blocked; }), error => error === blocked);
  assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(readOcr({}, {}, transcriptionSchema, 'pdf_notes', 'PDF', [], {}, async () => { calls++; return { ...note, lines: [], uncertainties: [] }; }));
  assert.equal(calls, 1);
});
