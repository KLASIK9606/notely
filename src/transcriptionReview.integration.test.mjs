import test from 'node:test';
import assert from 'node:assert/strict';
import { editTranscriptionLine, confirmTranscriptionLine, omitTranscriptionLines, unresolvedLines } from './transcriptionReview.ts';
import { generateMaterialBatches } from './materialPipeline.ts';

const draft = () => ({ title: 'Powstanie styczniowe', subject: 'Historia', lines: ['Przyczyną była branka.', 'Powstanie wybuchło w [nieczytelne].', 'Walki miały charakter partyzancki.', 'Po klęsce nasiliły się represje.'], uncertainties: [{ line: 2, reason: 'Rok słabo widoczny.' }, { line: 4, reason: 'Sprawdź zdanie.' }] });

test('Unchanged input retains warning until explicit confirmation', () => {
  const before = draft();
  const same = editTranscriptionLine(before, 3, before.lines[3]);
  assert.deepEqual(unresolvedLines(same), [2, 4]);
  assert.deepEqual(unresolvedLines(confirmTranscriptionLine(same, 3)), [2]);
});

test('Correcting an OCR line clears only its warning and preserves remaining evidence', () => {
  const before = draft();
  const fixed = editTranscriptionLine(before, 1, 'Powstanie wybuchło w 1863 roku.');
  assert.deepEqual(unresolvedLines(fixed), [4]);
  assert.deepEqual(fixed.uncertainties, [{ line: 4, reason: 'Sprawdź zdanie.' }]);
  assert.equal(before.lines[1], 'Powstanie wybuchło w [nieczytelne].');
  assert.deepEqual(fixed.lines.filter((_, i) => i !== 1), before.lines.filter((_, i) => i !== 1));
});

test('Partial edits and confirmation cannot silently accept unreadable text', () => {
  const changed = editTranscriptionLine(draft(), 1, 'Wybuch: [niepewne: rok].');
  assert.deepEqual(unresolvedLines(confirmTranscriptionLine(changed, 1)), [2, 4]);
  assert.deepEqual(unresolvedLines(confirmTranscriptionLine(changed, 3)), [2]);
});

test('Removing a line remaps subsequent warnings to actual retained text', () => {
  const result = omitTranscriptionLines(draft(), [2]);
  assert.equal(result.lines.length, 3);
  assert.equal(result.lines[2], 'Po klęsce nasiliły się represje.');
  assert.deepEqual(result.uncertainties, [{ line: 3, reason: 'Sprawdź zdanie.' }]);
  assert.deepEqual(unresolvedLines(result), [3]);
});

test('Explicitly skipping all unresolved lines sends only clear source to AI', async () => {
  const before = draft();
  const cleared = omitTranscriptionLines(before, unresolvedLines(before));
  let sent;
  const materials = { summary: 'Kontekst powstania.', sections: [{ heading: 'Przyczyny i przebieg', body: 'Branka była przyczyną powstania. Walki miały charakter partyzancki.', sourceLines: [1, 2] }], flashcards: [], quiz: [], mindMap: { center: 'Powstanie', branches: [] } };
  const result = await generateMaterialBatches(cleared, async part => { sent = part; return materials; });
  assert.deepEqual(sent.lines, ['Przyczyną była branka.', 'Walki miały charakter partyzancki.']);
  assert.deepEqual(sent.uncertainties, []);
  assert.ok(!JSON.stringify(sent).includes('[nieczytelne]'));
  assert.deepEqual(result.sections[0].sourceLines, [1, 2]);
});

test('Skipping an entirely unreadable note never invokes AI or saves empty materials', async () => {
  const all = { title: 'Historia', subject: '', lines: ['[nieczytelne]', '[niepewne: tekst]'], uncertainties: [] };
  const cleared = omitTranscriptionLines(all, unresolvedLines(all));
  let calls = 0;
  await assert.rejects(generateMaterialBatches(cleared, async () => { calls++; }), /Dodaj treść/);
  assert.equal(calls, 0);
});

test('Deleting a warning line and leaving whitespace still prevents empty generation', async () => {
  const all = { title: 'Historia', subject: '', lines: ['  ', '[nieczytelne]'], uncertainties: [{ line: 2, reason: 'Sprawdź' }] };
  const cleared = omitTranscriptionLines(all, [2]);
  await assert.rejects(generateMaterialBatches(cleared, async () => { throw Error('AI must not run'); }), /Dodaj treść/);
});
