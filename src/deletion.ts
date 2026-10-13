import type { Lesson, Note, Source } from './types';

export type DeleteTarget = { kind: 'lesson' | 'note'; id: string };

// Plan the complete change before saving anything or removing owned files.
export function deletionPlan(notes: Note[], lessons: Lesson[], target: DeleteTarget, draftLessonId: string | null, draftSources: Source[]) {
  const lesson = target.kind === 'lesson' ? lessons.find(l => l.id === target.id) : undefined;
  const removedNotes = notes.filter(n => target.kind === 'note' ? n.id === target.id : !!lesson && (n.lessonId === lesson.id || n.id === lesson.noteId));
  const removedIds = new Set(removedNotes.map(n => n.id));
  const nextNotes = notes.filter(n => !removedIds.has(n.id));
  const nextLessons = lessons.filter(l => !(target.kind === 'lesson' && l.id === target.id)).map(l => removedIds.has(l.noteId || '') ? { ...l, noteId: undefined } : l);
  const clearDraft = !!lesson && draftLessonId === lesson.id;
  const retained = [...nextNotes.flatMap(n => n.sources), ...nextLessons.flatMap(l => l.sources), ...(clearDraft ? [] : draftSources)];
  const candidates = [...(lesson?.sources || []), ...removedNotes.flatMap(n => n.sources), ...(clearDraft ? draftSources : [])];
  const unusedSources = [...new Map(candidates.map(s => [s.id, s])).values()].filter(s => !retained.some(r => r.id === s.id || r.uri === s.uri));
  return { notes: nextNotes, lessons: nextLessons, clearDraft, unusedSources, removedIds };
}
