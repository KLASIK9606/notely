import test from 'node:test';
import assert from 'node:assert/strict';
import { validMaterials } from './schema.mjs';
const lines = ['Bulwa ziemniaka jest przekształconą łodygą.'];
const note = { summary: 'Budowa ziemniaka.', sections: [{ heading: 'Bulwa', body: lines[0], sourceLines: [1] }], flashcards: [], quiz: [], mindMap: { center: 'Ziemniak', branches: [] } };

test('Short source can produce a useful note without forced flashcards, quiz or branches', () => {
  assert.equal(validMaterials(note, lines), true);
  assert.equal(validMaterials({ ...note, sections: [] }, lines), false);
  assert.equal(validMaterials({ ...note, mindMap: { center: '', branches: [] } }, lines), false);
});
test('Optional study aids remain fully validated when present', () => {
  assert.equal(validMaterials({ ...note, flashcards: [{ question: 'Czym jest bulwa?', answer: 'Łodygą.', sourceLines: [] }] }, lines), false);
  assert.equal(validMaterials({ ...note, quiz: [{ question: 'Czym jest bulwa?', options: ['Łodygą', 'Łodygą', 'Korzeniem', 'Kwiatem'], correctIndex: 0, explanation: lines[0], sourceLines: [1] }] }, lines), false);
  assert.equal(validMaterials({ ...note, mindMap: { center: 'Ziemniak', branches: [{ label: 'Budowa', children: ['Łodyga'], sourceLines: [99] }] } }, lines), false);
  assert.equal(validMaterials({ ...note, sections: Array(31).fill(note.sections[0]) }, lines), false);
});
