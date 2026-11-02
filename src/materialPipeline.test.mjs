import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeTranscriptions } from './transcription.ts';
import { materialBatches, generateMaterialBatches } from './materialPipeline.ts';

const fixture = (lines) => ({ summary: 'Opis', sections: [{ heading: 'Temat', body: 'Treść', sourceLines: [1, lines.length] }], flashcards: [{ question: 'Pytanie', answer: 'Odpowiedź', sourceLines: [lines.length] }], quiz: [{ question: 'Pytanie', options: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: 'Źródło', sourceLines: [1] }], mindMap: { center: 'Temat', branches: [{ label: 'Gałąź', children: ['Treść'], sourceLines: [lines.length] }] } });

test('Eight dense photo reads merge fully and generate all batches with correct global evidence', async () => {
  const pages = Array.from({ length: 8 }, (_, p) => ({ title: 'Biologia', subject: 'Biologia', lines: Array.from({ length: 200 }, (_, l) => `Zdjęcie ${p + 1}, wiersz ${l + 1}`), uncertainties: [{ line: 200, reason: 'Sprawdź' }] }));
  const note = mergeTranscriptions(pages);
  assert.equal(note.lines.length, 1600);
  assert.equal(note.lines.at(-1), 'Zdjęcie 8, wiersz 200');
  assert.deepEqual(note.uncertainties.map(item => item.line), [200, 400, 600, 800, 1000, 1200, 1400, 1600]);
  const sent = [], progress = [];
  // The user reviewed all uncertainty markers before generating study materials.
  const result = await generateMaterialBatches({ ...note, uncertainties: [] }, async part => { sent.push(...part.lines); return fixture(part.lines); }, { onProgress: label => progress.push(label) });
  assert.deepEqual(sent, note.lines);
  assert.equal(result.flashcards.length, 8);
  assert.deepEqual(result.flashcards.map(card => card.sourceLines[0]), [200, 400, 600, 800, 1000, 1200, 1400, 1600]);
  assert.deepEqual(result.quiz.at(-1).sourceLines, [1401]);
  assert.match(progress.at(-1), /8 z 8/);
});

test('Character and paragraph limits are handled without losing characters or splitting emoji', () => {
  const lines = ['x'.repeat(3999) + '🥔' + 'z'.repeat(12000), ...Array(40).fill('ó'.repeat(3500))];
  const batches = materialBatches(lines);
  assert.ok(batches.length > 1);
  assert.equal(batches.flatMap(batch => batch.lines).join(''), lines.join(''));
  assert.ok(batches.every(batch => batch.lines.length <= 200 && batch.lines.join('').length <= 60000 && batch.lines.every(line => line.length <= 4000)));
  assert.ok(batches.flatMap(batch => batch.lines).every(line => !/[\uD800-\uDBFF]$/.test(line) && !/^[\uDC00-\uDFFF]/.test(line)));
  assert.ok(batches[0].originalLines.slice(0, 5).every(line => line === 1));
});

test('A failed later material batch never returns a misleading partial lesson', async () => {
  let calls = 0;
  const note = { title: 'Biologia', subject: 'Biologia', uncertainties: [], lines: Array(201).fill('Treść') };
  await assert.rejects(generateMaterialBatches(note, async part => { if (++calls === 2) throw new Error('quota'); return fixture(part.lines); }), /quota/);
  assert.equal(calls, 2);
});

test('Cancellation prevents later batches and invalid source references are rejected', async () => {
  const note = { title: 'Biologia', subject: 'Biologia', uncertainties: [], lines: Array(201).fill('Treść') };
  const controller = new AbortController(); let calls = 0;
  await assert.rejects(generateMaterialBatches(note, async part => { calls++; controller.abort(); return fixture(part.lines); }, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls, 1);
  await assert.rejects(generateMaterialBatches(note, async part => ({ ...fixture(part.lines), flashcards: [{ question: 'Q', answer: 'A', sourceLines: [9999] }] })), /odwołania/);
});

test('Unreviewed handwriting and unreadable placeholders never reach any generation call', async () => {
  const base = { title: 'Notatka', subject: 'Biologia', uncertainties: [], lines: ['Czytelna treść'] };
  let calls = 0;
  const send = async part => { calls++; return fixture(part.lines); };
  for (const note of [
    { ...base, uncertainties: [{ line: 1, reason: 'Niepewna data' }] },
    { ...base, lines: ['Fragment [nieczytelne]'] },
    { ...base, lines: ['Słowo [niepewne: bulwa]'] },
  ]) await assert.rejects(generateMaterialBatches(note, send), /niejasne/);
  assert.equal(calls, 0);
});

test('Blank line references are rejected while subsequent global line numbers remain intact', async () => {
  const note = { title: 'Notatka', subject: 'Biologia', uncertainties: [], lines: ['Czytelna treść', '', 'Końcowa treść'] };
  await assert.rejects(generateMaterialBatches(note, async part => ({ ...fixture(part.lines), flashcards: [{ question: 'Q', answer: 'A', sourceLines: [2] }] })), /odwołania/);
  const result = await generateMaterialBatches(note, async part => fixture(part.lines));
  assert.deepEqual(result.flashcards[0].sourceLines, [3]);
});

test('Graph IDs are separated across batches and split paragraphs retain their original evidence', async () => {
  const note = { title: 'Notatka', subject: 'Biologia', uncertainties: [], lines: ['x'.repeat(65000), 'Koniec'] };
  const result = await generateMaterialBatches(note, async part => ({ ...fixture(part.lines), mindMap: { center: 'Temat', layout: 'tree', layoutReason: 'Zależności', branches: [], nodes: [{ id: 'root', parentId: '', label: 'Korzeń', detail: '', sourceLines: [1] }, { id: 'child', parentId: 'root', label: 'Gałąź', detail: '', sourceLines: [part.lines.length] }] } }));
  assert.equal(result.mindMap.nodes.length, 4);
  assert.equal(new Set(result.mindMap.nodes.map(node => node.id)).size, 4);
  assert.equal(result.mindMap.nodes[1].parentId, result.mindMap.nodes[0].id);
  assert.equal(result.mindMap.nodes[3].parentId, result.mindMap.nodes[2].id);
  assert.deepEqual(result.mindMap.nodes[0].sourceLines, [1]);
  assert.deepEqual(result.mindMap.nodes.at(-1).sourceLines, [2]);
});
