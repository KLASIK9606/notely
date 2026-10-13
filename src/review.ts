import type { Note, Review } from './types';
export type Grade = 'again' | 'good';
const DAY = 86400000;
export function isDue(note: Pick<Note, 'reviews'>, index: number, now = Date.now()) {
  const review = note.reviews[String(index)];
  return !review || !Number.isFinite(Date.parse(review.due)) || Date.parse(review.due) <= now;
}
// Each card keeps its own successes, failures and streak; no global knowledge score.
export function schedule(previous: Review | undefined, known: boolean, now = Date.now()): Review {
  const stage = previous?.stage || (previous && previous.interval > 0 ? 'review' : 'learning');
  const oldInterval = Math.max(0, previous?.interval || 0);
  const failures = (previous?.failures || 0) + (known ? 0 : 1);
  const successes = (previous?.successes || 0) + (known ? 1 : 0);
  const streak = known ? (previous?.streak || 0) + 1 : 0;
  const result: Review = { due: '', interval: oldInterval, stage, step: previous?.step || 0, failures, successes, streak, lapses: previous?.lapses || 0, lastReviewed: new Date(now).toISOString(), lastGrade: known ? 'good' : 'again' };
  let delay: number;
  if (!known) {
    result.stage = stage === 'review' || stage === 'relearning' ? 'relearning' : 'learning';
    result.step = 0;
    result.interval = stage === 'review' ? Math.max(1, Math.round(oldInterval * .35)) : oldInterval;
    result.lapses = (result.lapses || 0) + (stage === 'review' ? 1 : 0);
    delay = 60000;
  } else if (stage !== 'review') {
    result.step = (result.step || 0) + 1;
    // Frequently missed cards need three spaced successes instead of two.
    const required = failures >= 3 ? 3 : 2;
    if (result.step < required) delay = (failures ? 3 : 10) * 60000;
    else {
      result.stage = 'review'; result.step = 0;
      result.interval = stage === 'relearning' ? Math.max(1, Math.min(180, oldInterval)) : 1;
      delay = result.interval * DAY;
    }
  } else {
    const errorRate = failures / Math.max(1, failures + successes);
    const multiplier = Math.max(1.3, Math.min(2.8, 2.5 - 1.2 * errorRate + Math.min(streak, 5) * .06));
    result.interval = Math.min(180, Math.max(oldInterval + 1, Math.round(oldInterval * multiplier)));
    delay = result.interval * DAY;
  }
  result.due = new Date(now + delay).toISOString();
  return result;
}
export function intervalLabel(review: Review, now = Date.now()) {
  const minutes = Math.max(1, Math.round((Date.parse(review.due) - now) / 60000));
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} godz.`;
  return `${Math.round(minutes / 1440)} dni`;
}
export type SessionItem = { index: number; availableAt: number; after: number; attempts: number };
export function buildSession(note: Pick<Note, 'reviews' | 'materials'>, now = Date.now(), newLimit = 10, practice = false): SessionItem[] {
  const indices = note.materials.flashcards.map((_, i) => i);
  if (practice) return indices.map(index => ({ index, availableAt: now, after: 0, attempts: 0 }));
  const due = indices.filter(i => note.reviews[String(i)] && isDue(note, i, now)).sort((a, b) => {
    const ra = note.reviews[String(a)], rb = note.reviews[String(b)];
    const weakness = (rb.failures || 0) / Math.max(1, (rb.successes || 0) + (rb.failures || 0)) - (ra.failures || 0) / Math.max(1, (ra.successes || 0) + (ra.failures || 0));
    return weakness || (Date.parse(ra.due) || 0) - (Date.parse(rb.due) || 0);
  });
  const fresh = indices.filter(i => !note.reviews[String(i)]).slice(0, Math.max(0, newLimit));
  const result: number[] = [];
  while (due.length || fresh.length) { result.push(...due.splice(0, 2)); if (fresh.length) result.push(fresh.shift()!); }
  return result.map(index => ({ index, availableAt: now, after: 0, attempts: 0 }));
}
export function nextSessionItem(queue: SessionItem[], answered: number, now = Date.now()) {
  const eligible = queue.filter(item => item.availableAt <= now);
  return eligible.find(item => item.after <= answered) || eligible[0];
}
// Continue with scheduled learning when possible; otherwise offer optional practice
// without advancing or clearing any saved review dates.
export function buildNextSession(note: Pick<Note, 'reviews' | 'materials'>, now = Date.now(), newLimit = 10) {
  const queue = buildSession(note, now, newLimit);
  if (queue.length) return { queue, practice: false };
  return { queue: buildSession(note, now, newLimit, true), practice: true };
}
export function advanceSession(queue: SessionItem[], item: SessionItem, known: boolean, review: Review, answered: number, practice = false, now = Date.now()) {
  const remaining = queue.filter(entry => entry !== item);
  // Up to three attempts prevent endless sessions. Remaining difficulties keep their due date.
  if (!known && item.attempts < 2) remaining.push({ index: item.index, attempts: item.attempts + 1, after: answered + 3, availableAt: practice ? now : Date.parse(review.due) });
  return remaining;
}
