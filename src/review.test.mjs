import test from 'node:test';
import assert from 'node:assert/strict';
import { isDue, schedule, buildSession, buildNextSession, nextSessionItem, advanceSession } from './review.ts';
const now = Date.UTC(2026, 9, 8, 12);
const DAY = 86400000;

test('Next session after all known answers starts practice and preserves saved progress', () => {
  const note = { materials: { flashcards: Array(3).fill({}) }, reviews: {} };
  let queue = buildSession(note, now);
  while (queue.length) {
    const item = nextSessionItem(queue, 0, now);
    const review = schedule(undefined, true, now);
    note.reviews[String(item.index)] = review;
    queue = advanceSession(queue, item, true, review, 1, false, now);
  }
  assert.equal(buildSession(note, now).length, 0);
  const saved = structuredClone(note.reviews);
  const next = buildNextSession(note, now);
  assert.equal(next.practice, true);
  assert.deepEqual(next.queue.map(item => item.index), [0, 1, 2]);
  assert.ok(nextSessionItem(next.queue, 0, now));
  assert.deepEqual(note.reviews, saved);
});

test('Next session keeps spaced scheduling when due or fresh cards remain', () => {
  const note = { materials: { flashcards: Array(12).fill({}) }, reviews: {} };
  for (let index = 0; index < 10; index++) note.reviews[String(index)] = schedule(undefined, true, now);
  const next = buildNextSession(note, now);
  assert.equal(next.practice, false);
  assert.deepEqual(next.queue.map(item => item.index), [10, 11]);
  note.reviews['0'] = schedule(undefined, false, now - 60000);
  const due = buildNextSession(note, now);
  assert.equal(due.practice, false);
  assert.deepEqual(due.queue.map(item => item.index), [0, 10, 11]);
});
test('New cards require two spaced successes before a day-long interval', () => {
  const first = schedule(undefined, true, now);
  assert.equal(first.stage, 'learning'); assert.equal(Date.parse(first.due) - now, 600000);
  const graduated = schedule(first, true, Date.parse(first.due));
  assert.equal(graduated.stage, 'review'); assert.equal(graduated.interval, 1); assert.equal(graduated.streak, 2);
});
test('Failures belong to one card, reset the streak and shorten the interval', () => {
  const previous = { due: new Date(now).toISOString(), stage: 'review', interval: 20, successes: 8, failures: 1, streak: 8 };
  const failure = schedule(previous, false, now);
  assert.equal(failure.failures, 2); assert.equal(failure.successes, 8); assert.equal(failure.streak, 0);
  assert.equal(failure.stage, 'relearning'); assert.equal(failure.interval, 7); assert.equal(Date.parse(failure.due) - now, 60000);
  assert.equal(previous.interval, 20); assert.equal(previous.failures, 1);
});
test('Frequently missed cards need more successes and grow slower than reliable cards', () => {
  let difficult;
  for (let i = 0; i < 3; i++) difficult = schedule(difficult, false, now);
  for (let i = 0; i < 2; i++) { difficult = schedule(difficult, true, now); assert.equal(difficult.stage, 'learning'); }
  difficult = schedule(difficult, true, now); assert.equal(difficult.stage, 'review');
  const reliable = schedule({ due: new Date(now).toISOString(), stage: 'review', interval: 10, successes: 20, failures: 0, streak: 5 }, true, now);
  const weak = schedule({ due: new Date(now).toISOString(), stage: 'review', interval: 10, successes: 5, failures: 15, streak: 0 }, true, now);
  assert.ok(weak.interval < reliable.interval);
});
test('Legacy cards retain their dates and intervals stay within bounds', () => {
  const old = { interval: 4, due: new Date(now + DAY).toISOString() };
  assert.equal(isDue({ reviews: { '0': old } }, 0, now), false);
  assert.equal(isDue({ reviews: { '0': old } }, 0, now + DAY), true);
  assert.equal(isDue({ reviews: {} }, 0, now), true);
  assert.equal(schedule({ ...old, interval: 179 }, true, now).interval, 180);
  assert.ok(schedule(old, true, now).interval > 4);
});
test('Session interleaves two due cards with a new one, prioritizes weakness and caps new cards', () => {
  const note = { materials: { flashcards: Array(16).fill({}) }, reviews: { '0': { due: new Date(now - DAY).toISOString(), interval: 1, failures: 0, successes: 10 }, '1': { due: new Date(now).toISOString(), interval: 0, failures: 5, successes: 1 }, '2': { due: new Date(now).toISOString(), interval: 1 }, '3': { due: new Date(now + DAY).toISOString(), interval: 1 } } };
  const queue = buildSession(note, now, 2);
  assert.deepEqual(queue.map(q => q.index), [1, 0, 4, 2, 5]);
  assert.equal(buildSession(note, now, 10, true).length, 16);
});
test('Failed cards wait, return after other cards, and cannot loop indefinitely', () => {
  const item = { index: 0, availableAt: now, after: 0, attempts: 0 };
  const others = [1, 2, 3].map(index => ({ index, availableAt: now, after: 0, attempts: 0 }));
  const review = schedule(undefined, false, now);
  const queue = advanceSession([item, ...others], item, false, review, 1, false, now);
  assert.equal(nextSessionItem(queue, 1, now).index, 1);
  assert.equal(nextSessionItem([queue.at(-1)], 4, now), undefined);
  assert.equal(nextSessionItem([queue.at(-1)], 4, now + 60000).index, 0);
  const last = { ...item, attempts: 2 };
  assert.equal(advanceSession([last], last, false, review, 3, false, now).length, 0);
});
