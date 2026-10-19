import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVocabulary, vocabularyNote } from './vocabulary.ts';

test('Long lists retain every pair, original order, repeated words and evidence', () => {
  const text = Array.from({ length: 650 }, (_, i) => `word ${i} — znaczenie ${i}`).join('\n') + '\nword 0 — inne znaczenie';
  const note = vocabularyNote(text, '', [], 'words');
  assert.equal(note.materials.flashcards.length, 651);
  assert.deepEqual(note.materials.flashcards[649], { question: 'word 649', answer: 'znaczenie 649', sourceLines: [650] });
  assert.equal(note.materials.flashcards[650].answer, 'inne znaczenie');
  assert.equal(note.kind, 'vocabulary');
});
test('Supports tabs, colon, semicolon, arrows and spaced hyphens without splitting hyphenated words', () => {
  const result = parseVocabulary('well-known — znany\r\napple\tjabłko\ncut: ciąć\npotato; ziemniak\nhello -> cześć\nbye → pa\nchair - krzesło');
  assert.equal(result.entries.length, 7);
  assert.equal(result.entries[0].question, 'well-known');
  assert.deepEqual(result.missing, []);
});
test('Never drops incomplete lines or silently saves empty answers', () => {
  const result = parseVocabulary('apple — jabłko\n\ncut\npotato — ');
  assert.deepEqual(result.missing.map(row => row.line), [3, 4]);
  assert.throws(() => vocabularyNote('apple — jabłko\ncut', 'English', [], 'words'), /Uzupełnij/);
  assert.throws(() => vocabularyNote('\n', 'English', [], 'words'), /przynajmniej/);
  assert.throws(() => vocabularyNote('apple — [nieczytelne]', '', [], 'words'), /Uzupełnij/);
  assert.throws(() => vocabularyNote('[niepewne] — jabłko', '', [], 'words'), /Uzupełnij/);
});
import { applyVocabularyTranslations } from './vocabulary.ts';

test('Automatic translations retain full Spanish sentences, existing pairs and duplicate rows', () => {
  const text = 'la casa\nMe gustaría un café.\napple — jabłko\nla casa';
  const translated = applyVocabularyTranslations(text, [
    { term: 'la casa', answer: 'dom' },
    { term: 'Me gustaría un café.', answer: 'Poproszę kawę.' },
    { term: 'la casa', answer: 'dom' },
  ]);
  assert.equal(translated, 'la casa — dom\nMe gustaría un café. — Poproszę kawę.\napple — jabłko\nla casa — dom');
  assert.throws(() => applyVocabularyTranslations(text, [{ term: 'wrong row', answer: 'dom' }]));
  assert.equal(applyVocabularyTranslations('[niepewne]', [{ term: '[niepewne]', answer: 'dom' }]), '[niepewne]');
});
