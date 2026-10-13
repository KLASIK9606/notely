import type { Note } from './types';
import { isDue } from './review.ts';
export type CardOrigin = { noteId: string; cardIndex: number; label: string };
export function dailyDeck(notes: Note[]) {
  const references: CardOrigin[] = [];
  const lines: string[] = [];
  const offsets = new Map<string, number>();
  for (const note of notes) { offsets.set(note.id, lines.length); lines.push(...note.lines); }
  const flashcards: Note['materials']['flashcards'] = [];
  const reviews: Note['reviews'] = {};
  const maximum = Math.max(0, ...notes.map(note => note.materials.flashcards.length));
  // Round robin spreads the new-card limit across lessons rather than one large set.
  for (let index = 0; index < maximum; index++) {
    for (const note of notes) {
      const card = note.materials.flashcards[index]; if (!card) continue;
      const position = flashcards.length;
      flashcards.push({ ...card, sourceLines: card.sourceLines.map(line => line + offsets.get(note.id)!) });
      references.push({ noteId: note.id, cardIndex: index, label: `${note.subject || 'Notatki'} · ${note.title}` });
      if (note.reviews[String(index)]) reviews[String(position)] = note.reviews[String(index)];
    }
  }
  const note: Note = { id: '__daily__', title: 'Ucz się dziś', subject: 'Wszystkie lekcje', createdAt: '', sources: [], lines, uncertainties: [], reviews, materials: { summary: '', sections: [], quiz: [], mindMap: { center: '', branches: [] }, flashcards } };
  return { note, references };
}
export function applyDailyReviews(notes: Note[], updated: Note, references: CardOrigin[]): Note[] {
  const changes = new Map<string, Note['reviews']>();
  references.forEach((origin, i) => {
    const original = notes.find(note => note.id === origin.noteId);
    if (!original || !original.materials.flashcards[origin.cardIndex]) return;
    const current = updated.reviews[String(i)];
    const previous = original.reviews[String(origin.cardIndex)];
    if (JSON.stringify(current) === JSON.stringify(previous)) return;
    const reviews = changes.get(origin.noteId) || { ...original.reviews };
    if (current) reviews[String(origin.cardIndex)] = current;
    else delete reviews[String(origin.cardIndex)];
    changes.set(origin.noteId, reviews);
  });
  return notes.map(note => changes.has(note.id) ? { ...note, reviews: changes.get(note.id)! } : note);
}
export function learningStats(notes: Note[], now = Date.now()) {
  let fresh = 0, due = 0, learning = 0, reviewedToday = 0; let nextDue = Infinity;
  const day = new Date(now).toDateString();
  for (const note of notes) note.materials.flashcards.forEach((_, i) => {
    const review = note.reviews[String(i)];
    if (!review) { fresh++; return; }
    if (isDue(note, i, now)) due++; else nextDue = Math.min(nextDue, Date.parse(review.due));
    if (review.stage === 'learning' || review.stage === 'relearning') learning++;
    if (review.lastReviewed && new Date(review.lastReviewed).toDateString() === day) reviewedToday++;
  });
  return { fresh, due, learning, reviewedToday, nextDue: Number.isFinite(nextDue) ? nextDue : null };
}
