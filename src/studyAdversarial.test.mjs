import test from 'node:test';
import assert from 'node:assert/strict';
import { nextQuizIndex } from './quizNavigation.ts';
import { buildWrittenQueue, advanceWrittenQueue, writtenAnswerMatches, writtenPrompt, writtenTracksReview } from './writtenPractice.ts';
import { matchCards, matchRounds, matchingAnswer } from './matchPractice.ts';
import { selectedCardIndices, toggleCardStar } from './studySelection.ts';
import { buildSession, nextSessionItem, advanceSession, schedule, buildNextSession } from './review.ts';

const now = Date.parse('2026-11-02T12:00:00Z');
const large = () => ({ id: 'qa-300', starredCards: [], materials: { flashcards: Array.from({ length: 300 }, (_, index) => ({ question: `palabra ${index}`, answer: `słowo ${index}`, sourceLines: [index + 1] })) }, reviews: {} });

test('Two rapid quiz taps cannot skip a question, answer review or long-text page', () => {
  for (const count of [1, 5, 300]) {
    let index = 0;
    index = nextQuizIndex(index, 0, count);
    index = nextQuizIndex(index, 0, count); // event callback from the same render
    assert.equal(index, 1);
    index = nextQuizIndex(index, 1, count);
    assert.equal(index, Math.min(2, count));
    assert.equal(nextQuizIndex(count, count, count), count);
  }
});

test('Spanish question punctuation is optional while accents, signs and negation remain meaningful', () => {
  assert.equal(writtenAnswerMatches('Qué hora es?', '¿Qué hora es?'), true);
  assert.equal(writtenAnswerMatches('Hola!', '¡Hola!'), true);
  assert.equal(writtenAnswerMatches('si', 'sí'), false);
  assert.equal(writtenAnswerMatches('5', '-5'), false);
  assert.equal(writtenAnswerMatches('mam', 'nie mam'), false);
  assert.equal(writtenAnswerMatches('ano', 'año'), false);
  assert.equal(writtenAnswerMatches('cafe\u0301', 'café'), true);
});

test('All 300 selected written cards remain reachable, including repeated failures', () => {
  const note = large();
  let queue = buildWrittenQueue(note, undefined, 300, now);
  const seen = new Map();
  let attempts = 0;
  while (queue.length) {
    seen.set(queue[0].index, (seen.get(queue[0].index) || 0) + 1);
    queue = advanceWrittenQueue(queue, false);
    assert.ok(++attempts <= 900, 'A failed session must terminate');
  }
  assert.equal(seen.size, 300);
  assert.equal(attempts, 900);
  assert.ok([...seen.values()].every(count => count === 3));
});

test('Matching 300 cards with repeated visible prompts neither loses cards nor makes a round ambiguous', () => {
  const note = large();
  note.materials.flashcards.forEach((card, index) => { if (index % 4 === 0) card.question = 'banco'; });
  const rounds = matchRounds(matchCards(note));
  assert.equal(rounds.flat().length, 300);
  assert.equal(new Set(rounds.flat().map(card => card.index)).size, 300);
  assert.ok(rounds.every(round => round.length <= 3 && new Set(round.map(card => card.question)).size === round.length));
  const same = { ...rounds[0][0], answer: 'dom' };
  assert.equal(matchingAnswer(same, { ...same, index: 999, answer: ' dom\n' }), true);
  assert.equal(matchingAnswer(same, { ...same, answer: 'dóm' }), false);
});

test('Stars and reverse use original source IDs without changing notes or scheduled reviews', () => {
  const note = large();
  note.reviews['299'] = { due: new Date(now + 86400000).toISOString(), interval: 1, failures: 3, streak: 0 };
  const frozen = JSON.stringify(note);
  const starred = toggleCardStar(note, 299);
  assert.deepEqual(selectedCardIndices(starred, 'starred'), [299]);
  assert.deepEqual(selectedCardIndices(starred, 'difficult'), [299]);
  assert.equal(writtenPrompt(starred, 299, true).question, 'słowo 299');
  assert.deepEqual(writtenPrompt(starred, 299, true).sourceLines, [300]);
  assert.equal(writtenTracksReview(note.reviews['299'], false, true, now), false);
  assert.equal(writtenTracksReview(note.reviews['299'], true, false, now), false);
  assert.equal(writtenTracksReview(note.reviews['299'], false, false, now), false);
  assert.equal(JSON.stringify(note), frozen);
  assert.deepEqual(matchCards(starred, []), []);
});

test('Scheduled sessions move through successive batches rather than stranding cards past index ten', () => {
  const note = large();
  const seen = new Set();
  for (let session = 0; session < 30; session++) {
    const queue = buildSession(note, now);
    assert.equal(queue.length, 10);
    for (const item of queue) {
      seen.add(item.index);
      note.reviews[String(item.index)] = schedule(note.reviews[String(item.index)], true, now);
    }
  }
  assert.equal(seen.size, 300);
  assert.equal(buildSession(note, now).length, 0);
  const snapshot = JSON.stringify(note.reviews);
  assert.equal(buildNextSession(note, now).practice, true);
  assert.equal(JSON.stringify(note.reviews), snapshot);
});

test('All-failed optional flashcard practice terminates after at most three attempts per card', () => {
  const note = large();
  let queue = buildSession(note, now, 10, true);
  let answered = 0;
  while (queue.length) {
    const item = nextSessionItem(queue, answered, now);
    assert.ok(item);
    const review = schedule(undefined, false, now);
    queue = advanceSession(queue, item, false, review, ++answered, true, now);
    assert.ok(answered <= 900);
  }
  assert.equal(answered, 900);
});
