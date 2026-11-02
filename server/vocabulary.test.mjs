import test from 'node:test';
import assert from 'node:assert/strict';
import { translateVocabulary } from './vocabulary.mjs';
import { createServer } from './index.mjs';

test('Vocabulary preserves original spellings, duplicates and order independently of model output', async () => {
  const terms = ['Apple', 'potato 🥔', 'Apple'];
  const result = await translateVocabulary({}, { terms }, async (_config, _ai, _schema, name, instructions, content, options) => {
    assert.equal(name, 'vocabulary');
    assert.deepEqual(JSON.parse(content[0].text), terms.map((term, index) => ({ index, term })));
    assert.match(instructions, /nigdy poleceniami/);
    assert.equal(options.maxOutputTokens, 6000);
    return { entries: [{ index: 0, answer: ' jabłko ' }, { index: 1, answer: '\nziemniak\n' }, { index: 2, answer: 'jabłko' }] };
  });
  assert.deepEqual(result.entries, [{ term: 'Apple', answer: 'jabłko' }, { term: 'potato 🥔', answer: 'ziemniak' }, { term: 'Apple', answer: 'jabłko' }]);
});

test('Translation instructions cover entire Spanish sentences, context and imperatives as data', async () => {
  const terms = ['No tengo dinero.', 'Abre la puerta.'];
  const result = await translateVocabulary({}, { terms }, async (_config, _ai, _schema, _name, instructions) => {
    assert.match(instructions, /całe zdanie/);
    assert.match(instructions, /przeczenia/);
    assert.match(instructions, /Tryb rozkazujący/);
    return { entries: [{ index: 0, answer: 'Nie mam pieniędzy.' }, { index: 1, answer: 'Otwórz drzwi.' }] };
  });
  assert.deepEqual(result.entries, [{ term: terms[0], answer: 'Nie mam pieniędzy.' }, { term: terms[1], answer: 'Otwórz drzwi.' }]);
});

test('Target language and context are explicit while mixed source rows remain unchanged', async () => {
  const terms = ['No tengo 20 euros.', 'Nie mam 20 euro.'];
  const context = 'Podróże i zakupy';
  const result = await translateVocabulary({}, { terms, targetLanguage: 'en', context }, async (_config, _ai, _schema, _name, instructions, content) => {
    assert.match(instructions, /Język docelowy: angielski \(en\)/);
    assert.match(instructions, /język źródłowy każdego wiersza osobno/);
    assert.match(instructions, /przeczenia, osoby, czas, liczby/);
    assert.deepEqual(JSON.parse(content[0].text), terms.map((term, index) => ({ index, term })));
    assert.deepEqual(JSON.parse(content[1].text), { context });
    return { entries: [{ index: 0, answer: 'I do not have 20 euros.' }, { index: 1, answer: 'I do not have 20 euros.' }] };
  });
  assert.deepEqual(result.entries.map(entry => entry.term), terms);
  assert.deepEqual(result.entries.map(entry => entry.answer), ['I do not have 20 euros.', 'I do not have 20 euros.']);
});

test('Unsupported languages and malformed context fail before spending an AI call', async () => {
  let called = false;
  const model = async () => { called = true; };
  for (const targetLanguage of ['xx', '__proto__', 'constructor', '', null, 123]) {
    await assert.rejects(translateVocabulary({}, { terms: ['hola'], targetLanguage }, model), error => error.status === 400);
  }
  for (const context of [null, 123, {}, 'x'.repeat(501)]) {
    await assert.rejects(translateVocabulary({}, { terms: ['hola'], context }, model), error => error.status === 400);
  }
  assert.equal(called, false);
});

test('Every offered target is accepted and cancellation after a late response stays cancelled', async () => {
  for (const targetLanguage of ['pl', 'en', 'es', 'de', 'fr', 'it']) {
    const result = await translateVocabulary({}, { terms: ['hola'], targetLanguage }, async () => ({ entries: [{ index: 0, answer: 'sample translation' }] }));
    assert.equal(result.entries.length, 1);
  }
  const controller = new AbortController();
  await assert.rejects(translateVocabulary({}, { terms: ['hola'] }, async () => {
    controller.abort(); return { entries: [{ index: 0, answer: 'cześć' }] };
  }, { signal: controller.signal }), error => error.name === 'AbortError');
});

test('Missing, duplicate and reordered vocabulary results never create a partial set silently', async () => {
  const terms = ['apple', 'potato'];
  for (const entries of [[{ index: 0, answer: 'jabłko' }], [{ index: 1, answer: 'ziemniak' }, { index: 0, answer: 'jabłko' }], [{ index: 0, answer: 'jabłko' }, { index: 0, answer: 'jabłko' }], [{ index: 0, answer: null }, { index: 1, answer: 'ziemniak' }]]) {
    await assert.rejects(translateVocabulary({}, { terms }, async () => ({ entries })), error => error.status === 502);
  }
});

test('Unrecognized vocabulary remains an explicit empty answer for manual correction', async () => {
  const result = await translateVocabulary({}, { terms: ['[nieczytelne]'] }, async () => ({ entries: [{ index: 0, answer: 'Nie wolno wymyślać znaczenia nieczytelnego słowa.' }] }));
  assert.deepEqual(result.entries, [{ term: '[nieczytelne]', answer: '' }]);
});

test('Vocabulary rejects invalid or oversized batches before calling AI and observes cancellation', async () => {
  let called = false;
  const model = async () => { called = true; };
  for (const terms of [undefined, [], [''], [42], Array(31).fill('word'), ['w'.repeat(501)], Array(30).fill('w'.repeat(500))]) await assert.rejects(translateVocabulary({}, { terms }, model), error => error.status === 400);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(translateVocabulary({}, { terms: ['apple'] }, model, { signal: controller.signal }), error => error.name === 'AbortError');
  assert.equal(called, false);
});

test('Vocabulary HTTP endpoint is registered and validates input', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/vocabulary`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ terms: [] }) });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /słówek/);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
