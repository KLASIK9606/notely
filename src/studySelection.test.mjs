import test from 'node:test';
import assert from 'node:assert/strict';
import { selectedCardIndices, toggleCardStar } from './studySelection.ts';

const note = { materials: { flashcards: Array.from({ length: 5 }, (_, i) => ({ question: `Q${i}`, answer: `A${i}` })) }, reviews: { '2': { failures: 3, streak: 0, lastGrade: 'again' }, '3': { failures: 1, streak: 3, lastGrade: 'good' } } };
test('Older notes support stars without migrations or review changes', () => {
  assert.deepEqual(selectedCardIndices(note, 'all'), [0, 1, 2, 3, 4]);
  assert.deepEqual(selectedCardIndices(note, 'starred'), []);
  const changed = toggleCardStar(note, 4);
  assert.deepEqual(selectedCardIndices(changed, 'starred'), [4]);
  assert.equal(changed.reviews, note.reviews);
  assert.deepEqual(toggleCardStar(changed, 4).starredCards, []);
  assert.equal(toggleCardStar(note, 99), note);
});
test('Filters retain original card indices and exclude recovered cards', () => {
  assert.deepEqual(selectedCardIndices(note, 'difficult'), [2]);
  assert.deepEqual(selectedCardIndices({ ...note, starredCards: [4, 4, -1, 300, '1'] }, 'starred'), [4]);
  assert.deepEqual(selectedCardIndices({ ...note, starredCards: null }, 'starred'), []);
});
