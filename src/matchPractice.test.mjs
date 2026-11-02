import test from 'node:test';
import assert from 'node:assert/strict';
import { matchCards, matchRounds, matchingAnswer, shuffledMatches } from './matchPractice.ts';
const note = { materials: { flashcards: [
  { question: 'casa', answer: 'dom', sourceLines: [1] }, { question: 'hogar', answer: 'dom', sourceLines: [2] },
  { question: 'casa', answer: 'budynek', sourceLines: [3] }, { question: 'papa', answer: 'ziemniak', sourceLines: [4] },
] } };
test('Matching preserves source indices, respects empty filters and reverses locally', () => {
  assert.deepEqual(matchCards(note, []), []);
  const cards = matchCards(note, [3, 0, 3, -1, 100], true);
  assert.deepEqual(cards.map(card => card.index), [3, 0]);
  assert.equal(cards[0].question, 'ziemniak'); assert.equal(cards[0].answer, 'papa'); assert.deepEqual(cards[0].sourceLines, [4]);
});
test('Rounds cover every pair once and never offer indistinguishable questions together', () => {
  const cards = matchCards(note), rounds = matchRounds(cards);
  assert.deepEqual(rounds.flat().map(card => card.index).sort(), [0, 1, 2, 3]);
  assert.ok(rounds.every(round => round.length <= 3 && new Set(round.map(card => card.question)).size === round.length));
  assert.deepEqual(matchRounds([]), []);
});
test('Duplicate visible definitions are accepted independently of hidden card identity', () => {
  const cards = matchCards(note);
  assert.equal(matchingAnswer(cards[0], cards[1]), true);
  assert.equal(matchingAnswer(cards[0], cards[2]), false);
  assert.equal(matchingAnswer(cards[0], { ...cards[1], answer: ' dom\n' }), true);
  assert.equal(matchingAnswer(cards[0], { ...cards[1], answer: 'dóm' }), false);
});
test('Shuffle preserves all identities without mutating original cards, including a one-card set', () => {
  const cards = matchCards(note), before = [...cards], shuffled = shuffledMatches(cards, () => 0);
  assert.deepEqual(cards, before); assert.deepEqual(shuffled.map(card => card.index).sort(), [0, 1, 2, 3]);
  assert.deepEqual(shuffledMatches([cards[0]]), [cards[0]]);
});
