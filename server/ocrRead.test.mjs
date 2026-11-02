import test from 'node:test';
import assert from 'node:assert/strict';
import { readOcr, normalizeOcr, hasReadableOcrText } from './ocrRead.mjs';
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

test('Uncertainty markers without refs become review warnings without dropping partial words or source lines', async () => {
  const value = { ...note, lines: ['  Powstanie w [niepewne: 1794] roku.  ', '', 'Kolejna linia.'], uncertainties: [] };
  const original = JSON.stringify(value);
  let calls = 0;
  const result = await readOcr({}, {}, transcriptionSchema, 'transcription', 'OCR', [], {}, async () => { calls++; return value; });
  assert.equal(calls, 1);
  assert.deepEqual(result.lines, value.lines);
  assert.deepEqual(result.uncertainties.map(item => item.line), [1]);
  assert.ok(result.uncertainties[0].reason.trim());
  assert.equal(JSON.stringify(value), original);
  assert.notEqual(result.lines, value.lines);
});

test('Only unreadable markers, whitespace or punctuation cannot become a readable lesson', async () => {
  for (const lines of [['[nieczytelne]'], ['[niepewne: rok]'], ['[Strona 1] [nieczytelne]'], ['[unreadable]'], ['  ', '\t'], ['...', '—']]) {
    let calls = 0;
    await assert.rejects(readOcr({}, {}, transcriptionSchema, 'transcription', 'OCR', [], {}, async () => { calls++; return { ...note, lines, uncertainties: [] }; }), error => error.status === 422);
    assert.equal(calls, 2);
  }
  assert.equal(hasReadableOcrText(['0']), true);
  assert.equal(hasReadableOcrText(['[nieczytelne] roku']), true);
  assert.equal(hasReadableOcrText(['[Strona 2] X = 5']), true);
});

test('Duplicate warnings are merged per real source line, including missing reasons', () => {
  const value = { ...note, uncertainties: [{ line: 1, reason: 'Rok niewyraźny.' }, { line: 1, reason: 'Rok niewyraźny.' }, { line: 1, reason: 'Sprawdź cyfrę.' }, { line: 2, reason: ' ' }] };
  const result = normalizeOcr(value);
  assert.equal(result.uncertainties.length, 2);
  assert.equal(result.uncertainties[0].reason, 'Rok niewyraźny. Sprawdź cyfrę.');
  assert.ok(result.uncertainties[1].reason.trim());
  assert.equal(value.uncertainties.length, 4);
});

test('A pre-cancelled OCR request never invokes AI', async () => {
  const controller = new AbortController(); controller.abort(); let calls = 0;
  await assert.rejects(readOcr({}, {}, transcriptionSchema, 'transcription', 'OCR', [], { signal: controller.signal }, async () => { calls++; return note; }), error => error.name === 'AbortError');
  assert.equal(calls, 0);
});

test('Cancellation after AI response neither accepts late data nor starts paid recovery', async () => {
  for (const result of [note, { ...note, lines: [], uncertainties: [] }]) {
    const controller = new AbortController(); let calls = 0;
    await assert.rejects(readOcr({}, {}, transcriptionSchema, 'transcription', 'OCR', [], { signal: controller.signal }, async (_config, _ai, _schema, _name, _instructions, _content, options) => {
      assert.equal(options.signal, controller.signal); calls++; controller.abort(); return result;
    }), error => error.name === 'AbortError');
    assert.equal(calls, 1);
  }
});

test('Schema line limit and invalid types never bypass validation or erase valid source lines', async () => {
  const boundary = { ...note, lines: Array.from({ length: 200 }, (_, i) => `Linia ${i + 1}`), uncertainties: [] };
  const result = await readOcr({}, {}, transcriptionSchema, 'transcription', 'OCR', [], {}, async () => boundary);
  assert.deepEqual(result.lines, boundary.lines);
  for (const value of [{ ...boundary, lines: [...boundary.lines, 'Linia 201'] }, { ...note, lines: [42] }, { ...note, uncertainties: [{ line: 1.5, reason: 'Niepewne' }] }, { ...note, hidden: 'unexpected field' }]) {
    let calls = 0;
    await assert.rejects(readOcr({}, {}, transcriptionSchema, 'transcription', 'OCR', [], {}, async () => { calls++; return value; }), error => error.status === 502);
    assert.equal(calls, 2);
  }
});

test('Quota, cancellation and blocked errors retain their original identity without recovery', async () => {
  for (const error of [Object.assign(new Error('Limit'), { status: 429 }), Object.assign(new Error('RECITATION'), { status: 422 }), new DOMException('Cancelled by provider', 'AbortError')]) {
    let calls = 0;
    await assert.rejects(readOcr({}, {}, transcriptionSchema, 'transcription', 'OCR', [], {}, async () => { calls++; throw error; }), actual => actual === error);
    assert.equal(calls, 1);
  }
});
