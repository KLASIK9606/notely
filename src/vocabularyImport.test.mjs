import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importVocabularyText } from './vocabularyImport.ts';
import { parseVocabulary, applyVocabularyTranslations, vocabularyNote } from './vocabulary.ts';
import { vocabularyQuiz } from './vocabularyQuiz.ts';

test('Real UTF-8 fixture imports original sentences without losing accents or punctuation', () => {
  const raw = readFileSync(new URL('../tests/fixtures/spanish-vocabulary.txt', import.meta.url), 'utf8');
  const text = importVocabularyText('spanish-vocabulary.txt', raw);
  const parsed = parseVocabulary(text, 'auto');
  assert.equal(parsed.missing.length, 6);
  assert.equal(parsed.entries.length, 0);
  assert.ok(parsed.missing.some(row => row.text === 'Mi pregunta: ¿qué hora es?'));
  const answers = ['dom', 'Poproszę kawę.', 'Jutro muszę się uczyć.', 'Nie mam pieniędzy.', 'Moje pytanie: która jest godzina?', 'Otwórz drzwi.'];
  const translated = applyVocabularyTranslations(text, parsed.missing.map((row, i) => ({ term: row.text, answer: answers[i] })), 'auto');
  const note = vocabularyNote(translated, 'QA Hiszpański', [], 'qa', 'auto');
  assert.equal(note.materials.flashcards.length, 6);
  assert.equal(note.materials.flashcards[4].question, 'Mi pregunta: ¿qué hora es?');
  assert.equal(note.materials.flashcards[4].answer, answers[4]);
  const quiz = vocabularyQuiz(note.materials.flashcards);
  assert.equal(quiz.length, 6);
  quiz.forEach((question, i) => assert.equal(question.options[question.correctIndex], answers[i]));
});
test('Vocabulary quizzes do not fabricate distractors or create ambiguous duplicate meanings', () => {
  const card = (question, answer) => ({ question, answer, sourceLines: [1] });
  assert.deepEqual(vocabularyQuiz([card('hola', 'cześć')]), []);
  assert.deepEqual(vocabularyQuiz([card('a', 'tak'), card('b', 'tak')]), []);
  const quiz = vocabularyQuiz([card('bank', 'brzeg'), card('bank', 'bank'), card('casa', 'dom')]);
  assert.equal(quiz.length, 1);
  assert.match(quiz[0].question, /casa/);
  assert.equal(new Set(quiz[0].options).size, quiz[0].options.length);
});
test('CSV and TSV preserve quoted commas, existing translations and repeated words', () => {
  assert.equal(importVocabularyText('words.csv', '\uFEFFword;translation\nla casa;dom\nla casa;dom'), 'la casa\tdom\nla casa\tdom');
  assert.equal(importVocabularyText('words.csv', '"¿Dónde, exactamente?","Gdzie dokładnie?"'), '¿Dónde, exactamente?\tGdzie dokładnie?');
  assert.equal(importVocabularyText('words.tsv', 'word\ttranslation\nhola\tcześć'), 'hola\tcześć');
  assert.throws(() => importVocabularyText('bad.csv', ';answer'), /oryginał/);
  assert.throws(() => importVocabularyText('bad.csv', 'a,b,c'), /dwie/);
  assert.throws(() => importVocabularyText('bad.csv', '"unterminated'), /cudzysłów/);
  assert.throws(() => importVocabularyText('bad.exe', 'hello'));
  assert.throws(() => importVocabularyText('bad.txt', ''));
});
test('Raw sentences with internal dashes survive translation and round-trip as canonical pairs', () => {
  const text = 'Me gusta — pero no hoy.';
  assert.equal(parseVocabulary(text, 'terms').missing.length, 1);
  const translated = applyVocabularyTranslations(text, [{ term: text, answer: 'Podoba mi się — ale nie dzisiaj.' }], 'terms');
  const parsed = parseVocabulary(translated, 'terms');
  assert.equal(parsed.entries[0].question, text);
  assert.equal(parsed.entries[0].answer, 'Podoba mi się — ale nie dzisiaj.');
});
