import type { Lesson } from './types';
export function nextLessonNumber(lessons: Lesson[], subject: string) {
  return Math.max(0, ...lessons.filter(l => l.subject.trim().toLowerCase() === subject.trim().toLowerCase()).map(l => l.number)) + 1;
}
export function lessonName(title: string, subject: string, number: number) { return title.trim() || `Lekcja ${number} — ${subject.trim() || 'Moje notatki'}`; }
export function validLessonNumber(value: string) { const n = Number(value); return /^\d+$/.test(value) && Number.isSafeInteger(n) && n >= 1 && n <= 9999; }
