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
