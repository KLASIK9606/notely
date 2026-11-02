import type { Note, Review } from './types';

export type WrittenItem = { index: number; attempt: number };

export function writtenTracksReview(review: Review | undefined, practiceOnly = false, reverse = false, now = Date.now()) {
  if (practiceOnly || reverse) return false;
  return !review || !Number.isFinite(Date.parse(review.due)) || Date.parse(review.due) <= now;
}

// Keep accents, apostrophes, signs and numbers: ano/año, 5/-5 and 0,5/5 differ.
export function normalizeWrittenAnswer(value: string) {
  return value.normalize('NFC').trim().toLocaleLowerCase().replace(/\s+/gu, ' ').replace(/^[¿¡]+/u, '').replace(/[.!?。！？]+$/u, '').trim();
}

export function writtenAnswerMatches(answer: string, expected: string) {
  const normalized = normalizeWrittenAnswer(answer);
  if (!normalized) return false;
  if (normalized === normalizeWrittenAnswer(expected)) return true;
  // Only short, explicitly separated vocabulary alternatives are auto-recognised.
  if (expected.length > 160 || /\n/.test(expected)) return false;
  const alternatives = expected.split(/\s*;\s*|\s+\/\s+/u);
  return alternatives.length > 1 && alternatives.every(value => value.trim()) && alternatives.some(value => normalized === normalizeWrittenAnswer(value));
}

export function buildWrittenQueue(note: Note, cardIndices?: number[], limit = 10, now = Date.now()): WrittenItem[] {
  const indices = cardIndices || note.materials.flashcards.map((_, index) => index);
  const valid = [...new Set(indices)].filter(index => Number.isInteger(index) && index >= 0 && index < note.materials.flashcards.length);
  return valid.sort((a, b) => {
    const ra = note.reviews[String(a)], rb = note.reviews[String(b)];
    const dueA = !ra || !Number.isFinite(Date.parse(ra.due)) || Date.parse(ra.due) <= now;
    const dueB = !rb || !Number.isFinite(Date.parse(rb.due)) || Date.parse(rb.due) <= now;
    if (dueA !== dueB) return dueA ? -1 : 1;
    const weakness = (rb?.failures || 0) / Math.max(1, (rb?.failures || 0) + (rb?.successes || 0)) - (ra?.failures || 0) / Math.max(1, (ra?.failures || 0) + (ra?.successes || 0));
    return weakness || a - b;
  }).slice(0, Math.max(0, Math.floor(limit))).map(index => ({ index, attempt: 0 }));
}

export function advanceWrittenQueue(queue: WrittenItem[], known: boolean): WrittenItem[] {
  if (!queue.length) return [];
  const [current, ...remaining] = queue;
  if (!known && current.attempt < 2) remaining.splice(Math.min(3, remaining.length), 0, { ...current, attempt: current.attempt + 1 });
  return remaining;
}

export function writtenPrompt(note: Note, index: number, reverse = false) {
  const card = note.materials.flashcards[index];
  return card ? { question: reverse ? card.answer : card.question, answer: reverse ? card.question : card.answer, sourceLines: card.sourceLines } : null;
}
