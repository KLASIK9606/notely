import test from 'node:test';
import assert from 'node:assert/strict';
import { materialLibrary } from './materialLibrary.ts';

const lesson = { id: 'l', title: 'Biologia', subject: 'Biologia', createdAt: '2026-10-08', sources: [{ caption: 'Budowa komórki', name: 'strona.jpg' }], noteId: 'new' };
const notes = [{ id: 'new', lessonId: 'l', title: 'Komórka', subject: 'Biologia', createdAt: '2026-10-09', sources: [] }, { id: 'old', lessonId: 'l', title: 'Starszy odczyt', createdAt: '2026-10-07', sources: [] }, { id: 'demo', title: 'Przykład', subject: 'Chemia', createdAt: '2026-10-06', sources: [] }];
test('one card per lesson opens current note and keeps standalone materials', () => {
  const items = materialLibrary(notes, [lesson]);
  assert.equal(items.length, 2);
  assert.equal(items[0].note.id, 'new');
  assert.equal(items[0].lesson.id, 'l');
  assert.equal(items[1].note.id, 'demo');
});
test('unprocessed and changed lessons stay clickable through their original files', () => {
  const items = materialLibrary(notes, [{ ...lesson, noteId: undefined }]);
  assert.equal(items.length, 2);
  assert.equal(items[0].note, undefined);
  assert.equal(items[0].lesson.id, 'l');
  assert.equal(materialLibrary([], [lesson])[0].note, undefined);
});
test('search includes captions and subject and handles legacy note links', () => {
  const legacy = notes.map(note => ({ ...note, lessonId: undefined }));
  const items = materialLibrary(legacy, [lesson], '  KOMÓRKI  ');
  assert.equal(items.length, 1);
  assert.equal(items[0].note.id, 'new');
  assert.equal(materialLibrary(notes, [lesson], 'chemia').length, 1);
  assert.equal(materialLibrary(notes, [lesson], 'missing').length, 0);
});
