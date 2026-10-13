import test from 'node:test';
import assert from 'node:assert/strict';
import { deletionPlan } from './deletion.ts';

const source = (id, uri = `file:///owned/${id}.jpg`) => ({ id, uri, name: id, mime: 'image/jpeg', bytes: 20 });
const a = source('a'), shared = source('shared'), draft = source('draft');
const notes = [{ id: 'v1', lessonId: 'l1', sources: [a, shared], reviews: { 0: { failures: 3 } } }, { id: 'v2', lessonId: 'l1', sources: [a] }, { id: 'legacy', sources: [a] }, { id: 'keep', lessonId: 'l2', sources: [shared] }];
const lessons = [{ id: 'l1', noteId: 'legacy', sources: [a, shared] }, { id: 'l2', noteId: 'keep', sources: [shared] }];

test('deleting lesson removes all note versions and legacy link, but preserves shared files', () => {
  const plan = deletionPlan(notes, lessons, { kind: 'lesson', id: 'l1' }, 'l1', [a, draft]);
  assert.deepEqual(plan.notes.map(n => n.id), ['keep']);
  assert.deepEqual(plan.lessons.map(l => l.id), ['l2']);
  assert.equal(plan.clearDraft, true);
  assert.deepEqual(plan.unusedSources.map(s => s.id), ['a', 'draft']);
  assert.deepEqual([...plan.removedIds], ['v1', 'v2', 'legacy']);
  assert.equal(notes.length, 4);
  assert.equal(lessons.length, 2);
});
test('deleting note keeps lesson and photos, and clears stale note link', () => {
  const plan = deletionPlan(notes, lessons, { kind: 'note', id: 'legacy' }, 'l2', [draft]);
  assert.equal(plan.lessons.length, 2);
  assert.equal(plan.lessons[0].noteId, undefined);
  assert.equal(plan.clearDraft, false);
  assert.deepEqual(plan.unusedSources, []);
  assert.equal(plan.notes.length, 3);
});
test('draft in another lesson keeps its source, including shared URI with different id', () => {
  const plan = deletionPlan(notes, lessons, { kind: 'lesson', id: 'l1' }, 'l2', [source('alias', a.uri)]);
  assert.equal(plan.clearDraft, false);
  assert.deepEqual(plan.unusedSources, []);
});
test('deleting missing lesson changes nothing and deletes no files', () => {
  const plan = deletionPlan(notes, lessons, { kind: 'lesson', id: 'missing' }, null, []);
  assert.deepEqual(plan.notes, notes);
  assert.deepEqual(plan.lessons, lessons);
  assert.deepEqual(plan.unusedSources, []);
});
test('standalone note removes only unreferenced sources', () => {
  const plan = deletionPlan([{ id: 'single', sources: [a, a] }], [], { kind: 'note', id: 'single' }, null, []);
  assert.equal(plan.notes.length, 0);
  assert.deepEqual(plan.unusedSources, [a]);
});
