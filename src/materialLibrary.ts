import type { Lesson, Note } from './types';

export type LibraryItem = { id: string; title: string; subject: string; createdAt: string; lesson?: Lesson; note?: Note };

export function materialLibrary(notes: Note[], lessons: Lesson[], search = ''): LibraryItem[] {
  const assigned = new Set<string>();
  const items: LibraryItem[] = lessons.map(lesson => {
    const linked = notes.filter(note => note.lessonId === lesson.id || note.id === lesson.noteId);
    linked.forEach(note => assigned.add(note.id));
    // A changed source list clears noteId: open the files for a fresh read in that case.
    const note = linked.find(note => note.id === lesson.noteId);
    return { id: `lesson-${lesson.id}`, title: note?.title || lesson.title, subject: note?.subject || lesson.subject, createdAt: lesson.createdAt, lesson, note };
  });
  notes.filter(note => !assigned.has(note.id)).forEach(note => items.push({ id: `note-${note.id}`, title: note.title, subject: note.subject, createdAt: note.createdAt, note }));
  const query = search.trim().toLocaleLowerCase('pl');
  return items.filter(item => `${item.title} ${item.subject} ${(item.lesson?.sources || item.note?.sources || []).map(source => source.caption || source.name).join(' ')}`.toLocaleLowerCase('pl').includes(query)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
