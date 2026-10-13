import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer, validateFiles } from './index.mjs';
import { validMaterials, validTranscription } from './schema.mjs';
const png = { name: 'page.png', mime: 'image/png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB1kAAAAASUVORK5CYII=' };

test('Server allows an eight-photo lesson workflow while retaining bounded request throttling', async () => {
  const server = createServer({ token: 'fixture-token' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    for (let request = 1; request <= 31; request++) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/vocabulary`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fixture-token' }, body: JSON.stringify({ terms: [] }) });
      assert.equal(response.status, request <= 30 ? 400 : 429);
      await response.json();
    }
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
test('Disconnecting a teacher request aborts the upstream model call', { timeout: 5000 }, async () => {
  const originalFetch = globalThis.fetch;
  let started; const began = new Promise(resolve => { started = resolve; });
  let cancelled; const aborted = new Promise(resolve => { cancelled = resolve; });
  let calls = 0;
  const server = createServer({ key: 'test-key' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let request;
  try {
    globalThis.fetch = async (_url, options) => {
      calls++; started();
      return new Promise((_resolve, reject) => {
        const cancel = () => { cancelled(); reject(new DOMException('Cancelled', 'AbortError')); };
        if (options.signal.aborted) cancel(); else options.signal.addEventListener('abort', cancel, { once: true });
      });
    };
    request = http.request({ host: '127.0.0.1', port: server.address().port, path: '/api/teacher', method: 'POST', headers: { 'Content-Type': 'application/json' } });
    request.on('error', () => {});
    request.end(JSON.stringify({ title: 'Fotosynteza', lines: ['Fotosynteza zachodzi w chloroplastach.'], topic: 'Miejsce', question: '', history: [] }));
    await began;
    request.destroy();
    await aborted;
    assert.equal(calls, 1);
  } finally {
    request?.destroy(); globalThis.fetch = originalFetch;
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
});
const materials = {
  summary: 'Fotosynteza zachodzi w chloroplastach.',
  sections: [{ heading: 'Miejsce', body: 'Chloroplasty', sourceLines: [1] }],
  flashcards: [{ question: 'Gdzie zachodzi fotosynteza?', answer: 'W chloroplastach.', sourceLines: [1] }],
  quiz: [{ question: 'Gdzie?', options: ['Chloroplasty', 'Jądro', 'Rybosomy', 'Cytoplazma'], correctIndex: 0, explanation: 'Źródło podaje chloroplasty.', sourceLines: [1] }],
  mindMap: { center: 'Fotosynteza', branches: [{ label: 'Miejsce', children: ['Chloroplasty'], sourceLines: [1] }] },
};
async function withServer(config, run) {
  const server = createServer(config); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, token = '') => fetch(url + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  try { await run(post, url); } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
test('Rejects wrong signatures, invalid base64 and oversized inputs', () => {
  assert.equal(validateFiles([png])[0].type, 'input_image');
  assert.throws(() => validateFiles([{ ...png, mime: 'application/pdf' }]), /zawartością/);
  assert.throws(() => validateFiles([{ ...png, data: '!bad' }]), /Obsługujemy/);
  assert.throws(() => validateFiles(Array(9).fill(png)), /8 plików/);
  assert.throws(() => validateFiles([{ ...png, data: Buffer.alloc(9 * 1024 * 1024).toString('base64') }]), /Limit/);
});

test('Connection check requires server authorization and the selected provider key', async () => {
  await withServer({ token: 'server-token' }, async post => {
    assert.equal((await post('/api/check', { ai: { provider: 'gemini' } })).status, 401);
    const response = await post('/api/check', { ai: { provider: 'gemini' } }, 'server-token');
    assert.equal(response.status, 503); assert.match((await response.json()).error, /Brak klucza Gemini/);
  });
});
test('Rejects references to missing or blank source lines and invalid quiz indices', () => {
  assert.equal(validMaterials(materials, ['Fotosynteza zachodzi w chloroplastach.']), true);
  assert.equal(validMaterials(materials, ['']), false);
  const invalid = structuredClone(materials); invalid.flashcards[0].sourceLines = [2];
  assert.equal(validMaterials(invalid, ['one']), false);
  invalid.flashcards[0].sourceLines = [1]; invalid.quiz[0].correctIndex = 4;
  assert.equal(validMaterials(invalid, ['one']), false);
});
test('Rejects empty OCR and out-of-range uncertainty lines', () => {
  assert.ok(validTranscription({ title: 'Temat', subject: 'Biologia', lines: ['tekst'], uncertainties: [] }));
  assert.ok(!validTranscription({ title: 'Temat', subject: 'Biologia', lines: [], uncertainties: [] }));
  assert.ok(!validTranscription({ title: 'Temat', subject: 'Biologia', lines: ['tekst'], uncertainties: [{ line: 2, reason: 'test' }] }));
});
test('Health, authorization and missing AI key return clear responses', async () => {
  await withServer({ token: 'test-token' }, async (post, url) => {
    assert.deepEqual(await (await fetch(url + '/health')).json(), { ok: true, aiConfigured: false });
    assert.equal((await post('/api/transcribe', { files: [png] })).status, 401);
    const response = await post('/api/transcribe', { files: [png] }, 'test-token');
    assert.equal(response.status, 503); assert.match((await response.json()).error, /klucza OpenAI/);
  });
});
test('Unresolved handwriting is blocked before materials generation', async () => {
  await withServer({}, async post => {
    assert.equal((await post('/api/materials', null)).status, 400);
    const response = await post('/api/materials', { title: 'Temat', subject: '', lines: ['To [nieczytelne] fragment.'] });
    assert.equal(response.status, 400); assert.match((await response.json()).error, /nieczytelne/);
  });
});

test('PDF creates labelled paraphrased notes with page references, without teacher or speech calls', async () => {
  const originalFetch = globalThis.fetch; const calls = [];
  const result = { title: 'Ziemniak', subject: 'Biologia', lines: ['[Strona 1] Bulwy ziemniaka magazynują skrobię.'], uncertainties: [] };
  globalThis.fetch = async (url, options) => {
    if (url !== 'https://api.openai.com/v1/responses') return originalFetch(url, options);
    calls.push(JSON.parse(options.body));
    return Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(result) }] }] });
  };
  try {
    await withServer({ key: 'fake-test-key' }, async post => {
      const file = { name: 'ziemniak.pdf', mime: 'application/pdf', data: Buffer.from('%PDF-1.7\nfixture').toString('base64') };
      const response = await post('/api/transcribe', { files: [file] });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ...result, sourceMode: 'pdf-notes' });
      assert.equal(calls.length, 1); assert.equal(calls[0].text.format.name, 'pdf_notes');
      assert.match(calls[0].instructions, /własnymi słowami/);
      assert.match(calls[0].instructions, /Nie dodawaj wiedzy z zewnątrz/);
      assert.equal(calls[0].input[0].content[0].type, 'input_file');
    });
  } finally { globalThis.fetch = originalFetch; }
});
test('OCR and materials stay separate from teacher generation until an explicit teacher request', async () => {
  const originalFetch = globalThis.fetch; const calls = [];
  globalThis.fetch = async (url, options) => {
    if (url !== 'https://api.openai.com/v1/responses') return originalFetch(url, options);
    const body = JSON.parse(options.body); calls.push(body);
    const result = body.text.format.name === 'transcription' ? { title: 'Fotosynteza', subject: 'Biologia', lines: ['Fotosynteza zachodzi w [nieczytelne].'], uncertainties: [] } : body.text.format.name === 'teacher' ? { reply: 'Fotosynteza zachodzi w chloroplastach.', sourceLines: [1], questionStatus: 'lecture', verification: 'supported', answerBasis: 'note', evidence: [{ line: 1, quote: 'Fotosynteza zachodzi w chloroplastach.' }] } : materials;
    return new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(result) }] }] }), { status: 200 });
  };
  try {
    await withServer({ key: 'fake-test-key' }, async post => {
      const ocr = await post('/api/transcribe', { files: [png] }); assert.equal(ocr.status, 200);
      const transcription = await ocr.json(); assert.equal(transcription.uncertainties[0].line, 1);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].text.format.name, 'transcription');
      assert.match(calls[0].instructions, /wyłącznie OCR/);
      assert.match(calls[0].instructions, /Nie twórz wykładu/);
      const response = await post('/api/materials', { title: 'Fotosynteza', subject: 'Biologia', lines: ['Fotosynteza zachodzi w chloroplastach.'] });
      assert.equal(response.status, 200); assert.deepEqual(await response.json(), materials);
      assert.equal(calls.length, 2); assert.equal(calls[0].store, false); assert.equal(calls[0].text.format.strict, true);
      assert.equal(calls[0].input[0].content[0].type, 'input_image');
      assert.match(calls[1].input[0].content[0].text, /chloroplastach/);
      assert.doesNotMatch(calls[1].input[0].content[0].text, /nieczytelne/);
      assert.deepEqual(calls.map(c => c.text.format.name), ['transcription', 'study_materials']);
      const lecture = await post('/api/teacher', { title: 'Fotosynteza', lines: ['Fotosynteza zachodzi w chloroplastach.'], topic: 'Miejsce', question: '', history: [] });
      assert.equal(lecture.status, 200);
      assert.deepEqual(await lecture.json(), { reply: 'Fotosynteza zachodzi w chloroplastach.', sourceLines: [1], continueLesson: false });
      assert.deepEqual(calls.map(c => c.text.format.name), ['transcription', 'study_materials', 'teacher']);
    });
  } finally { globalThis.fetch = originalFetch; }
});
