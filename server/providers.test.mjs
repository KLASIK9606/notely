import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAI, buildRequest, parseResponse, callModel, checkAI, providerError, selectGeminiModel } from './providers.mjs';
import { transcriptionSchema } from './schema.mjs';
import { teacherSpeech, pcmWave } from './speech.mjs';
const content = [ { type: 'input_image', image_url: 'data:image/jpeg;base64,/9j/AA==' }, { type: 'input_file', filename: 'page.pdf', file_data: 'data:application/pdf;base64,JVBERi0=' }, { type: 'input_text', text: 'Odczytaj notatki' } ];
test('Google OAuth cannot fall back to server credentials or inject request headers', () => {
  const config = { keys: { gemini: 'server-key' } };
  const input = { provider: 'gemini', googleOAuth: true, accessToken: 'test-google-token', project: 'my-project-123' };
  const ai = resolveAI(config, input);
  assert.equal(ai.key, undefined);
  const request = buildRequest(ai, transcriptionSchema, 'ocr', 'instructions', content);
  assert.equal(request.headers.Authorization, 'Bearer test-google-token');
  assert.equal(request.headers['x-goog-user-project'], 'my-project-123');
  assert.equal(request.headers['x-goog-api-key'], undefined);
  assert.ok(!request.url.includes(input.accessToken));
  assert.ok(!JSON.stringify(request.body).includes(input.accessToken));
  for (const changes of [{ accessToken: undefined }, { project: 'bad\r\nheader' }, { accessToken: 'bad\r\nheader' }, { provider: 'openai' }, { apiKey: 'other-key' }]) assert.throws(() => resolveAI(config, { ...input, ...changes }), /Połączenie Gemini/);
});
test('OAuth model discovery uses the user quota project and errors omit upstream secrets', async () => {
  const original = globalThis.fetch;
  const ai = { provider: 'gemini', googleOAuth: true, accessToken: 'test-google-token', project: 'my-project-123' };
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(options.headers.Authorization, 'Bearer test-google-token');
      assert.equal(options.headers['x-goog-user-project'], ai.project);
      assert.equal(options.headers['x-goog-api-key'], undefined);
      return Response.json({ models: [{ name: 'models/gemini-3.1-flash-lite', supportedGenerationMethods: ['generateContent'] }] });
    };
    const result = await checkAI({}, ai);
    assert.equal(result.modelAvailable, true);
    assert.ok(!JSON.stringify(result).includes(ai.accessToken));
    for (const status of [401, 403]) {
      const error = await providerError(ai, Response.json({ error: { message: ai.accessToken } }, { status }));
      assert.equal(error.status, status); assert.ok(!error.message.includes(ai.accessToken));
    }
  } finally { globalThis.fetch = original; }
});
test('Gemini teacher voice uses Google OAuth without a server key or token in response', async () => {
  const original = globalThis.fetch;
  const wave = pcmWave(Buffer.alloc(480));
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(options.headers.Authorization, 'Bearer test-google-token');
      assert.equal(options.headers['x-goog-user-project'], 'my-project-123');
      assert.equal(options.headers['x-goog-api-key'], undefined);
      return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ inlineData: { mimeType: 'audio/wav', data: wave.toString('base64') } }] } }] });
    };
    const result = await teacherSpeech({ keys: { gemini: 'server-key' } }, { text: 'Krótka odpowiedź', ai: { provider: 'gemini', googleOAuth: true, accessToken: 'test-google-token', project: 'my-project-123' } });
    assert.deepEqual(Buffer.from(result.data, 'base64'), wave);
    assert.ok(!JSON.stringify(result).includes('test-google-token'));
  } finally { globalThis.fetch = original; }
});
test('BYOK uses the selected provider and cannot inject endpoint paths', () => {
  assert.equal(resolveAI({ key: 'server-key' }, { provider: 'openai', apiKey: 'user-key' }).key, 'user-key');
  assert.equal(resolveAI({ keys: { gemini: 'google-key' } }, { provider: 'gemini' }).key, 'google-key');
  assert.throws(() => resolveAI({}, { provider: '__proto__' }), /Wybierz/);
  assert.throws(() => resolveAI({}, { provider: 'gemini', apiKey: 'key', model: '../../private' }), /nazwa/);
  assert.throws(() => resolveAI({}, { provider: 'claude' }), /Brak klucza/);
});
test('Provider adapters preserve images, PDFs, structured outputs and key headers', () => {
  const openai = buildRequest({ provider: 'openai', model: 'gpt-4.1-mini', key: 'key' }, transcriptionSchema, 'ocr', 'instructions', content);
  assert.equal(openai.body.store, false); assert.equal(openai.body.input[0].content[1].type, 'input_file');
  const gemini = buildRequest({ provider: 'gemini', model: 'gemini-2.5-flash', key: 'key' }, transcriptionSchema, 'ocr', 'instructions', content);
  assert.equal(gemini.headers['x-goog-api-key'], 'key'); assert.equal(gemini.body.contents[0].parts[1].inlineData.mimeType, 'application/pdf');
  assert.deepEqual(gemini.body.generationConfig.responseJsonSchema, transcriptionSchema); assert.ok(!gemini.url.includes('key='));
  const claude = buildRequest({ provider: 'claude', model: 'claude-sonnet-4-6', key: 'key' }, transcriptionSchema, 'ocr', 'instructions', content);
  assert.equal(claude.headers['x-api-key'], 'key'); assert.equal(claude.body.messages[0].content[1].type, 'document');
  assert.deepEqual(claude.body.output_config.format.schema, transcriptionSchema);
});

test('Fast mode applies the same models to OCR and materials and uses compatible low-latency settings', () => {
  for (const name of ['transcription', 'study_materials']) {
    const openai = resolveAI({}, { provider: 'openai', apiKey: 'key', model: 'gpt-4.1-mini', fast: true });
    assert.equal(openai.model, 'gpt-6-luna');
    const gpt = buildRequest(openai, transcriptionSchema, name, 'instructions', content);
    assert.deepEqual(gpt.body.reasoning, { effort: 'none' }); assert.equal(gpt.body.max_output_tokens, 10000);
    const gemini = buildRequest(resolveAI({}, { provider: 'gemini', apiKey: 'key', model: 'gemini-3.1-flash-lite', fast: true }), transcriptionSchema, name, 'instructions', content);
    assert.ok(gemini.url.includes('gemini-3.1-flash-lite'));
    assert.deepEqual(gemini.body.generationConfig.thinkingConfig, { thinkingLevel: 'minimal' });
    const claude = buildRequest(resolveAI({}, { provider: 'claude', apiKey: 'key', model: 'claude-sonnet-4-6', fast: true }), transcriptionSchema, name, 'instructions', content);
    assert.equal(claude.body.model, 'claude-haiku-5-5');
    assert.deepEqual(claude.body.thinking, { type: 'disabled' }); assert.equal(claude.body.output_config.effort, 'low');
    assert.deepEqual(claude.body.output_config.format.schema, transcriptionSchema);
  }
  assert.throws(() => resolveAI({}, { provider: 'openai', apiKey: 'key', model: '../../secret', fast: true }), /nazwa modelu/);
  const custom = buildRequest({ provider: 'openai', model: 'custom-model', key: 'key' }, transcriptionSchema, 'ocr', 'instructions', content);
  assert.equal(custom.body.reasoning, undefined);
});
test('Truncated or refused output is never treated as a complete note', () => {
  assert.throws(() => parseResponse('gemini', { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{}' }] } }] }), /MAX_TOKENS/);
  assert.throws(() => parseResponse('claude', { stop_reason: 'refusal', content: [] }), /pełnego/);
  assert.deepEqual(parseResponse('claude', { stop_reason: 'end_turn', content: [{ type: 'text', text: '{"title":"Biologia"}' }] }), { title: 'Biologia' });
});

test('Gemini retries a truncated OCR once with room for a complete result and identical source', async () => {
  const realFetch = globalThis.fetch; const calls = [];
  const note = { title: 'Biologia', subject: 'Biologia', lines: ['Początek strony', 'Koniec strony'], uncertainties: [] };
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return Response.json({ candidates: [{ finishReason: calls.length === 1 ? 'MAX_TOKENS' : 'STOP', content: { parts: [{ text: calls.length === 1 ? '{"lines":["urwany tekst' : JSON.stringify(note) }] } }] });
  };
  try {
    assert.deepEqual(await callModel({}, { provider: 'gemini', apiKey: 'key' }, transcriptionSchema, 'transcription', 'Przepisz całą stronę', content), note);
    assert.deepEqual(calls.map(c => c.body.generationConfig.maxOutputTokens), [10000, 20000]);
    assert.deepEqual(calls[0].body.contents, calls[1].body.contents);
    assert.deepEqual(calls[0].body.systemInstruction, calls[1].body.systemInstruction);
    assert.equal(calls[0].url, calls[1].url);
  } finally { globalThis.fetch = realFetch; }
});

test('Repeated Gemini truncation stops after one repair and rejects even parseable partial JSON', async () => {
  const realFetch = globalThis.fetch; let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{"title":"Niepełna strona"}' }] } }] }); };
  try {
    await assert.rejects(callModel({}, { provider: 'gemini', apiKey: 'key' }, transcriptionSchema, 'transcription', 'instructions', content), error => error.status === 422 && /MAX_TOKENS/.test(error.message));
    assert.equal(calls, 2);
  } finally { globalThis.fetch = realFetch; }
});

test('Gemini blocks and missing results have specific errors without retries or upstream prose', async () => {
  const realFetch = globalThis.fetch;
  try {
    for (const [data, match] of [
      [{ candidates: [{ finishReason: 'SAFETY', finishMessage: 'PRIVATE KEY' }] }, /filtr treści/],
      [{ promptFeedback: { blockReason: 'PROHIBITED_CONTENT' }, candidates: [{ finishReason: 'MAX_TOKENS' }] }, /filtr treści/],
      [{ candidates: [] }, /bez pełnego wyniku/],
    ]) {
      let calls = 0; globalThis.fetch = async () => { calls++; return Response.json(data); };
      await assert.rejects(callModel({}, { provider: 'gemini', apiKey: 'key' }, transcriptionSchema, 'transcription', 'instructions', content), error => match.test(error.message) && !error.message.includes('PRIVATE KEY'));
      assert.equal(calls, 1);
    }
  } finally { globalThis.fetch = realFetch; }
});

test('Recitation recovery retries only source transcription, keeping the same request and rejecting a second block', async () => {
  const realFetch = globalThis.fetch;
  try {
    for (const name of ['transcription', 'audio_transcription', 'teacher', 'study_materials']) {
      const calls = [];
      globalThis.fetch = async (url, options) => { calls.push(options.body); return Response.json({ candidates: [{ finishReason: 'RECITATION', content: { parts: [{ text: '{}' }] } }] }); };
      await assert.rejects(callModel({}, { provider: 'gemini', apiKey: 'key' }, transcriptionSchema, name, 'Odczytaj wyłącznie źródło', content), /RECITATION/);
      const expected = ['transcription', 'audio_transcription'].includes(name) ? 2 : 1;
      assert.equal(calls.length, expected);
      if (expected === 2) assert.equal(calls[0], calls[1]);
    }
    let calls = 0;
    globalThis.fetch = async () => Response.json({ candidates: [{ finishReason: ++calls === 1 ? 'RECITATION' : 'STOP', content: { parts: [{ text: '{"title":"Notatka"}' }] } }] });
    assert.deepEqual(await callModel({}, { provider: 'gemini', apiKey: 'key' }, transcriptionSchema, 'transcription', 'instructions', content), { title: 'Notatka' });
    assert.equal(calls, 2);
    calls = 0;
    globalThis.fetch = async () => { calls++; return Response.json({ promptFeedback: { blockReason: 'RECITATION' } }); };
    await assert.rejects(callModel({}, { provider: 'gemini', apiKey: 'key' }, transcriptionSchema, 'transcription', 'instructions', content), /RECITATION/);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = realFetch; }
});
test('Gemini and Claude calls use supplied keys, without storing credentials in the response', async () => {
  const realFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, headers: options.headers, body: JSON.parse(options.body) });
    const data = url.includes('googleapis') ? { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"title":"Biologia"}' }] } }] } : { stop_reason: 'end_turn', content: [{ type: 'text', text: '{"title":"Biologia"}' }] };
    return new Response(JSON.stringify(data), { status: 200 });
  };
  try {
    for (const provider of ['gemini', 'claude']) assert.deepEqual(await callModel({}, { provider, apiKey: 'private-user-key' }, transcriptionSchema, 'ocr', 'instructions', content), { title: 'Biologia' });
    assert.equal(calls[0].headers['x-goog-api-key'], 'private-user-key'); assert.equal(calls[1].headers['x-api-key'], 'private-user-key');
  } finally { globalThis.fetch = realFetch; }
});

test('Gemini connection test lists available generation models across pages without a generation request', async () => {
  const realFetch = globalThis.fetch; const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    const second = new URL(url).searchParams.has('pageToken');
    return Response.json(second ? { models: [{ name: 'models/gemini-test-pro', supportedGenerationMethods: ['generateContent'] }] } : {
      models: [
        { name: 'models/gemini-test-flash', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-test-tts', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/embedding-test', supportedGenerationMethods: ['embedContent'] },
      ], nextPageToken: 'next',
    });
  };
  try {
    const result = await checkAI({}, { provider: 'gemini', apiKey: 'secret-key', model: 'gemini-missing' });
    assert.equal(result.modelAvailable, true); assert.equal(result.model, 'gemini-test-flash');
    assert.deepEqual(result.availableModels, ['gemini-test-flash', 'gemini-test-pro']);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].options.headers['x-goog-api-key'], 'secret-key');
    assert.ok(calls.every(call => !call.url.includes('secret-key') && !call.url.includes('generateContent') && !call.options.body));
    assert.ok(!JSON.stringify(result).includes('secret-key'));
  } finally { globalThis.fetch = realFetch; }
});

test('Automatic Gemini selection prefers stable Flash models and ignores specialized models', () => {
  assert.equal(selectGeminiModel(['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-4-pro', 'gemini-5-flash-preview', 'gemini-6-flash-image']), 'gemini-3.8-flash');
  assert.equal(selectGeminiModel(['gemini-3.8-flash', 'gemini-3.5-flash-lite'], ['gemini-3.8-flash']), 'gemini-3.5-flash-lite');
  assert.throws(() => selectGeminiModel(['gemini-flash-tts']), /żadnego odpowiedniego modelu/);
  assert.equal(selectGeminiModel(['gemini-omni-1.1-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']), 'gemini-3.5-flash-lite');
  assert.equal(selectGeminiModel(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'], ['gemini-3.5-flash-lite']), 'gemini-3.1-flash-lite');
  assert.throws(() => selectGeminiModel(['gemini-omni-1.1-flash', 'gemini-3.1-pro']), /żadnego odpowiedniego modelu/);
});
test('Gemini retries a missing model automatically using the live list, with no provider switch', async () => {
  const realFetch = globalThis.fetch; const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push(String(url));
    assert.equal(options.headers['x-goog-api-key'], 'key');
    if (!String(url).includes(':generateContent')) return Response.json({ models: [{ name: 'models/gemini-new-flash', supportedGenerationMethods: ['generateContent'] }] });
    if (String(url).includes('gemini-old-flash')) return Response.json({ error: {} }, { status: 404 });
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"title":"Biologia"}' }] } }] });
  };
  try {
    assert.deepEqual(await callModel({}, { provider: 'gemini', apiKey: 'key', model: 'gemini-old-flash' }, transcriptionSchema, 'ocr', 'instructions', content), { title: 'Biologia' });
    assert.equal(calls.length, 3); assert.ok(calls[2].includes('gemini-new-flash')); assert.ok(calls.every(url => url.includes('googleapis.com')));
  } finally { globalThis.fetch = realFetch; }
});
test('Persisted Omni choice is replaced before uploading notes using quota-backed Lite preference', async () => {
  const realFetch = globalThis.fetch; const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push(String(url));
    if (!String(url).includes(':generateContent')) return Response.json({ models: ['gemini-omni-1.1-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'].map(name => ({ name: 'models/' + name, supportedGenerationMethods: ['generateContent'] })) });
    assert.ok(String(url).endsWith('/models/gemini-3.5-flash-lite:generateContent'));
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"title":"Biologia"}' }] } }] });
  };
  try {
    await callModel({}, { provider: 'gemini', apiKey: 'key', model: 'gemini-omni-1.1-flash' }, transcriptionSchema, 'ocr', 'instructions', content);
    assert.equal(calls.length, 2); assert.ok(calls.every(url => !url.includes('omni')));
  } finally { globalThis.fetch = realFetch; }
});
test('Automatic fallback never loops through missing models or retries quota errors', async () => {
  const realFetch = globalThis.fetch; let generations = 0;
  globalThis.fetch = async url => {
    if (!String(url).includes(':generateContent')) return Response.json({ models: ['gemini-a-flash', 'gemini-b-flash', 'gemini-c-flash'].map(name => ({ name: 'models/' + name, supportedGenerationMethods: ['generateContent'] })) });
    generations++; return Response.json({ error: {} }, { status: 404 });
  };
  try {
    await assert.rejects(callModel({}, { provider: 'gemini', apiKey: 'key', model: 'gemini-old' }, transcriptionSchema, 'ocr', 'instructions', content), /nie istnieje/);
    assert.equal(generations, 3);
    let calls = 0; globalThis.fetch = async () => { calls++; return Response.json({ error: {} }, { status: 429 }); };
    await assert.rejects(callModel({}, { provider: 'gemini', apiKey: 'key' }, transcriptionSchema, 'ocr', 'instructions', content), /limit/);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = realFetch; }
});
test('Provider errors identify missing model, permissions, quota and malformed request without exposing upstream prose', async () => {
  const ai = { provider: 'gemini', model: 'gemini-missing', key: 'secret-key' };
  for (const [status, match] of [[404, /gemini-missing.*nie istnieje/], [401, /klucz API/], [429, /limit/], [400, /format/], [503, /HTTP 503/]]) {
    const error = await providerError(ai, Response.json({ error: { message: 'secret-key PRIVATE PHOTO' } }, { status }));
    assert.match(error.message, match); assert.ok(!error.message.includes('secret-key')); assert.ok(!error.message.includes('PRIVATE PHOTO'));
  }
  const quota = await providerError({ ...ai, provider: 'openai' }, Response.json({ error: { code: 'insufficient_quota' } }, { status: 429 }));
  assert.match(quota.message, /środków/);
  const invalidKey = await providerError(ai, Response.json({ error: { details: [{ reason: 'API_KEY_INVALID' }] } }, { status: 400 }));
  assert.equal(invalidKey.status, 401); assert.match(invalidKey.message, /klucz API/);
});

test('Gemini quota details distinguish daily, temporary and unavailable access without leaking upstream text', async () => {
  const ai = { provider: 'gemini', model: 'gemini-3.5-flash-lite', key: 'secret-key' };
  for (const [violation, expected] of [
    [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }, /dzienny limit/],
    [{ quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier' }, /chwilowy limit.*23 s/],
    [{ quotaMetric: 'generativelanguage.googleapis.com/search_grounding_requests', quotaValue: '0' }, /limit 0 dla wyszukiwania Google/],
  ]) {
    const response = Response.json({ error: { message: 'secret-key PRIVATE QUESTION', details: [{ violations: [violation] }, { retryDelay: '22.5s' }] } }, { status: 429 });
    const error = await providerError(ai, response, { googleSearch: true });
    assert.match(error.message, expected); assert.equal(error.searchRequested, true);
    assert.doesNotMatch(error.message, /secret-key|PRIVATE QUESTION/);
  }
  const error = await providerError(ai, Response.json({ error: {} }, { status: 429 }));
  assert.equal(error.searchRequested, false); assert.doesNotMatch(error.message, /Google Search/);
});

test('Temporary Gemini 503 is retried after backoff without requiring another user action', async () => {
  const realFetch = globalThis.fetch; let calls = 0; const waits = [];
  globalThis.fetch = async () => ++calls === 1 ? Response.json({ error: {} }, { status: 503, headers: { 'retry-after': '2' } }) : Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"title":"Biologia"}' }] } }] });
  try {
    const result = await callModel({ retrySleep: async ms => waits.push(ms) }, { provider: 'gemini', apiKey: 'key', model: 'gemini-3.5-flash-lite' }, transcriptionSchema, 'ocr', 'instructions', content);
    assert.equal(result.title, 'Biologia'); assert.equal(calls, 2); assert.deepEqual(waits, [2000]);
  } finally { globalThis.fetch = realFetch; }
});
test('Repeated 503 tries another available Lite model and stops after three generation attempts', async () => {
  const realFetch = globalThis.fetch; const models = [], waits = [];
  globalThis.fetch = async url => {
    if (!String(url).includes(':generateContent')) return Response.json({ models: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'].map(name => ({ name: 'models/' + name, supportedGenerationMethods: ['generateContent'] })) });
    models.push(String(url).split('/models/')[1].split(':')[0]); return Response.json({ error: {} }, { status: 503 });
  };
  try {
    await assert.rejects(callModel({ retrySleep: async ms => waits.push(ms) }, { provider: 'gemini', apiKey: 'key', model: 'gemini-3.5-flash-lite' }, transcriptionSchema, 'ocr', 'instructions', content), error => error.status === 503 && /chwilowo niedostępna/.test(error.message));
    assert.deepEqual(models, ['gemini-3.5-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
    assert.equal(waits.length, 2); assert.ok(waits[1] > waits[0]);
  } finally { globalThis.fetch = realFetch; }
});
test('Long Retry-After prevents automatic retries before the provider permits them', async () => {
  const realFetch = globalThis.fetch; let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ error: {} }, { status: 503, headers: { 'retry-after': '60' } }); };
  try {
    await assert.rejects(callModel({ retrySleep: async () => assert.fail() }, { provider: 'gemini', apiKey: 'key' }, transcriptionSchema, 'ocr', 'instructions', content), error => error.status === 503);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = realFetch; }
});
test('Model check verifies OpenAI and Claude access and refuses a provider 404', async () => {
  const realFetch = globalThis.fetch; const calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return Response.json({ id: 'model' }); };
  try {
    for (const provider of ['openai', 'claude']) assert.equal((await checkAI({}, { provider, apiKey: 'key' })).modelAvailable, true);
    assert.equal(calls[0].options.headers.Authorization, 'Bearer key'); assert.equal(calls[1].options.headers['x-api-key'], 'key');
    globalThis.fetch = async () => Response.json({ error: {} }, { status: 404 });
    await assert.rejects(checkAI({}, { provider: 'openai', apiKey: 'key', model: 'missing' }), /model „missing”/);
  } finally { globalThis.fetch = realFetch; }
});
