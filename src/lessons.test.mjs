import test from 'node:test';
import assert from 'node:assert/strict';
import { nextLessonNumber, lessonName, validLessonNumber } from './lessons.ts';
import { migrateSettings } from './settings.ts';
import { localModel, localDownloadBytes } from './localCatalog.ts';
test('Lesson numbering is independent per subject and custom titles are preserved', () => {
  const lessons = [{ subject: 'Biologia', number: 1 }, { subject: 'Biologia', number: 2 }, { subject: 'Historia', number: 5 }];
  assert.equal(nextLessonNumber(lessons, ' biologia '), 3); assert.equal(nextLessonNumber(lessons, 'Historia'), 6);
  assert.equal(lessonName('', 'Biologia', 2), 'Lekcja 2 — Biologia'); assert.equal(lessonName('Komórka', 'Biologia', 2), 'Komórka');
  assert.equal(validLessonNumber('0'), false); assert.equal(validLessonNumber('2.5'), false); assert.equal(validLessonNumber('12'), true);
});
test('Old settings migrate to offline mode without losing the existing server URL', () => {
  const migrated = migrateSettings({ apiUrl: 'http://localhost:3001', token: 'test' });
  assert.equal(migrated.provider, 'local'); assert.equal(migrated.apiUrl, 'http://localhost:3001'); assert.equal(migrated.models.gemini, 'gemini-3.5-flash-lite');
  assert.equal(migrateSettings({ provider: '__proto__' }).provider, 'local');
  assert.ok(localDownloadBytes > 1500000000); assert.ok(localModel.files.every(f => f.url.includes('/52d6c8ffea26cc873ac5ad116f8631268d7eb503/') && f.url.startsWith('https://huggingface.co/Qwen/')));
});

test('Existing phones migrate to fast defaults while retaining provider, server and working Lite fallback', () => {
  const previous = { provider: 'gemini', apiUrl: 'http://192.168.1.57:3001', token: 'token', models: { openai: 'gpt-4.1-mini', claude: 'claude-sonnet-4-6', gemini: 'gemini-3.1-flash-lite' } };
  const migrated = migrateSettings(previous);
  assert.equal(migrated.provider, previous.provider); assert.equal(migrated.apiUrl, previous.apiUrl); assert.equal(migrated.token, previous.token);
  assert.deepEqual(migrated.models, { openai: 'gpt-6-luna', claude: 'claude-haiku-5-5', gemini: 'gemini-3.1-flash-lite' });
  assert.equal(migrateSettings({ ...previous, models: { ...previous.models, gemini: 'gemini-omni-1.1-flash' } }).models.gemini, 'gemini-3.5-flash-lite');
});
