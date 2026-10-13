import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyDeck, applyDailyReviews, learningStats } from './daily.ts';
import { buildSession, schedule } from './review.ts';
const now = Date.UTC(2026, 9, 8, 12);
function note(id, count = 2) { return { id, title: `Lekcja ${id}`, subject: id === 'a' ? 'Biologia' : 'Historia', createdAt: '', sources: [], lines: [`Źródło ${id}`], uncertainties: [], reviews: {}, materials: { summary: '', sections: [], quiz: [], mindMap: { center: '', branches: [] }, flashcards: Array.from({ length: count }, (_, i) => ({ question: `${id}${i}`, answer: 'Odpowiedź', sourceLines: [1] })) } }; }
test('Daily deck spreads new cards across lessons and keeps their original sources', () => {
  const notes = [note('a', 20), note('b', 20)];
  const deck = dailyDeck(notes);
  assert.deepEqual(deck.note.materials.flashcards.slice(0, 4).map(card => card.question), ['a0', 'b0', 'a1', 'b1']);
  const queue = buildSession(deck.note, now, 10);
  assert.equal(queue.length, 10);
  assert.equal(queue.filter(item => deck.references[item.index].noteId === 'a').length, 5);
  const b = deck.note.materials.flashcards[1];
  assert.equal(deck.note.lines[b.sourceLines[0] - 1], 'Źródło b');
});
test('Daily ratings only modify the exact origin card and undo restores it', () => {
  const notes = [note('a'), note('b')]; const deck = dailyDeck(notes);
  const updated = { ...deck.note, reviews: { '1': schedule(undefined, false, now) } };
  const next = applyDailyReviews(notes, updated, deck.references);
  assert.equal(next[0], notes[0]); assert.equal(next[1].reviews['0'].failures, 1);
  assert.equal(next[1].reviews['1'], undefined); assert.deepEqual(notes[1].reviews, {});
  const restored = applyDailyReviews(next, deck.note, deck.references);
  assert.deepEqual(restored[1].reviews, {});
});
test('Daily counters distinguish new cards from due and future reviews', () => {
  const notes = [note('a', 4)];
  notes[0].reviews = { '1': { ...schedule(undefined, true, now), due: new Date(now - 1).toISOString() }, '2': schedule(undefined, false, now), '3': { due: new Date(now + 86400000).toISOString(), interval: 1 } };
  const stats = learningStats(notes, now);
  assert.deepEqual(stats, { fresh: 1, due: 1, learning: 2, reviewedToday: 2, nextDue: now + 60000 });
  assert.equal(dailyDeck([]).note.materials.flashcards.length, 0);
});
