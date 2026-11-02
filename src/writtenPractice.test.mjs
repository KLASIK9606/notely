import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWrittenAnswer, writtenAnswerMatches, buildWrittenQueue, advanceWrittenQueue, writtenPrompt, writtenTracksReview } from './writtenPractice.ts';

const note = { materials: { flashcards: [{ question: 'la casa', answer: 'dom', sourceLines: [1] }, { question: 'Open the door.', answer: 'Otwórz drzwi.', sourceLines: [2] }, { question: 'potato', answer: 'ziemniak', sourceLines: [3] }] }, reviews: { '2': { failures: 4, successes: 1 } } };
test('Written answers ignore case, whitespace and terminal punctuation without erasing meaning', () => {
  assert.equal(normalizeWrittenAnswer('  Otwórz   drzwi! '), 'otwórz drzwi');
  assert.equal(writtenAnswerMatches(' OTWÓRZ drzwi ', 'Otwórz drzwi.'), true);
  assert.equal(writtenAnswerMatches('año', 'ano'), false);
  assert.equal(writtenAnswerMatches('laska', 'łaska'), false);
  assert.equal(writtenAnswerMatches('5', '-5'), false);
  assert.equal(writtenAnswerMatches('5', '0,5'), false);
  assert.equal(writtenAnswerMatches('Nie mam pieniędzy.', 'Mam pieniądze.'), false);
  assert.equal(writtenAnswerMatches(' ', ' '), false);
});
test('Only explicit short vocabulary alternatives match; arbitrary prose is not graded semantically', () => {
  assert.equal(writtenAnswerMatches('budynek', 'dom; budynek'), true);
  assert.equal(writtenAnswerMatches('dom', 'dom / budynek'), true);
  assert.equal(writtenAnswerMatches('dom', 'dom i ogród'), false);
  assert.equal(writtenAnswerMatches('Fotosynteza wymaga światła', 'Rośliny wykorzystują energię światła podczas fotosyntezy.'), false);
  assert.equal(writtenAnswerMatches('dom', 'dom; '), false);
});
test('Filtered sessions preserve original card IDs, deduplicate and reject invalid indices', () => {
  assert.deepEqual(buildWrittenQueue(note, [2, 0, 2, -1, 99, 1.5]), [{ index: 2, attempt: 0 }, { index: 0, attempt: 0 }]);
  assert.deepEqual(buildWrittenQueue(note, []), []);
  assert.equal(buildWrittenQueue(note, undefined, 1).length, 1);
  assert.deepEqual(writtenPrompt(note, 1, true), { question: 'Otwórz drzwi.', answer: 'Open the door.', sourceLines: [2] });
  assert.equal(writtenPrompt(note, 99), null);
});
test('Failed cards repeat after other cards and at most twice, so sessions always end', () => {
  const queue = [{ index: 0, attempt: 0 }, { index: 1, attempt: 0 }, { index: 2, attempt: 0 }];
  assert.deepEqual(advanceWrittenQueue(queue, false), [{ index: 1, attempt: 0 }, { index: 2, attempt: 0 }, { index: 0, attempt: 1 }]);
  assert.deepEqual(advanceWrittenQueue(queue, true), queue.slice(1));
  let remaining = [{ index: 2, attempt: 0 }]; let count = 0;
  while (remaining.length) { remaining = advanceWrittenQueue(remaining, false); count++; assert.ok(count < 4); }
  assert.equal(count, 3);
  assert.equal(queue[0].attempt, 0);
});
test('The next session reaches new cards beyond the first ten instead of repeating future cards forever', () => {
  const now = Date.parse('2026-11-02T10:00:00Z');
  const large = { materials: { flashcards: Array.from({ length: 15 }, (_, i) => ({ question: String(i), answer: String(i), sourceLines: [] })) }, reviews: {} };
  for (let i = 0; i < 10; i++) large.reviews[String(i)] = { due: new Date(now + 600000).toISOString(), failures: 0, successes: 1 };
  assert.deepEqual(buildWrittenQueue(large, undefined, 10, now).slice(0, 5).map(item => item.index), [10, 11, 12, 13, 14]);
  assert.deepEqual(buildWrittenQueue(large, [2, 12], 10, now).map(item => item.index), [12, 2]);
});
test('Practice filters, reverse direction and future cards do not modify scheduled review progress', () => {
  const now = Date.parse('2026-11-02T10:00:00Z');
  const due = { due: new Date(now - 1000).toISOString(), interval: 1 };
  const future = { due: new Date(now + 60000).toISOString(), interval: 1 };
  assert.equal(writtenTracksReview(undefined, false, false, now), true);
  assert.equal(writtenTracksReview(due, false, false, now), true);
  assert.equal(writtenTracksReview(future, false, false, now), false);
  assert.equal(writtenTracksReview(undefined, true, false, now), false);
  assert.equal(writtenTracksReview(due, true, false, now), false);
  assert.equal(writtenTracksReview(due, false, true, now), false);
  assert.deepEqual(due, { due: new Date(now - 1000).toISOString(), interval: 1 });
});
