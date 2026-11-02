import type { Note } from './types';
export type StudyFilter = 'all' | 'starred' | 'difficult';
export function selectedCardIndices(note: Note, filter: StudyFilter = 'all') {
  const stars = new Set(Array.isArray(note.starredCards) ? note.starredCards : []);
  return note.materials.flashcards.map((_, i) => i).filter(index => {
    if (filter === 'starred') return stars.has(index);
    if (filter === 'difficult') {
      const review = note.reviews[String(index)];
      return !!review && (review.lastGrade === 'again' || ((review.failures || 0) > 0 && (review.streak || 0) < 2));
    }
    return true;
  });
}
export function toggleCardStar(note: Note, index: number): Note {
  if (!Number.isInteger(index) || index < 0 || index >= note.materials.flashcards.length) return note;
  const stars = new Set(selectedCardIndices(note, 'starred'));
  if (stars.has(index)) stars.delete(index); else stars.add(index);
  return { ...note, starredCards: [...stars].sort((a, b) => a - b) };
}
