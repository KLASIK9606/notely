import test from 'node:test';
import assert from 'node:assert/strict';
import { audioTextNote, transcribeAudio, validateAudio } from './audio.mjs';
import { createServer } from './index.mjs';
import { mergeTranscriptions } from '../src/transcription.ts';
import { importMime, sourceLimit } from '../src/sourcePolicy.ts';
const wav = { name: 'wyklad.wav', mime: 'audio/wav', data: Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVEfmt '), Buffer.alloc(30)]).toString('base64') };
test('Audio signatures, size and imported MIME types are checked', () => {
  assert.ok(validateAudio(wav).length);
  assert.throws(() => validateAudio({ ...wav, mime: 'audio/mp4' }), /zawartością/);
  assert.throws(() => validateAudio({ ...wav, data: 'bad!' }), /nagranie/);
  assert.throws(() => validateAudio({ ...wav, data: Buffer.alloc(21 * 1024 * 1024).toString('base64') }), /20 MB/);
  assert.equal(importMime('wyklad.m4a', 'application/octet-stream'), 'audio/mp4');
  assert.equal(importMime('program.exe', 'application/octet-stream'), '');
  assert.equal(sourceLimit('audio/webm'), 20 * 1024 * 1024);
});
test('Transcript keeps all words and rejects silence or excessive length', () => {
  const text = Array(500).fill('chloroplasty').join(' ');
  const note = audioTextNote(text);
  assert.equal(note.lines.join(' '), text);
  assert.throws(() => audioTextNote('  '), /mowy/);
  assert.throws(() => audioTextNote('a'.repeat(60001)), /długa/);
});
test('Merged image and audio sources retain order and uncertainty offsets', () => {
  const result = mergeTranscriptions([{ title: 'A', subject: '', lines: ['Zdjęcie'], uncertainties: [] }, { title: 'B', subject: '', lines: ['Nagranie', '[nieczytelne]'], uncertainties: [{ line: 2, reason: 'szum' }] }]);
  assert.deepEqual(result.lines, ['Zdjęcie', 'Nagranie', '[nieczytelne]']); assert.equal(result.uncertainties[0].line, 3);
  assert.equal(mergeTranscriptions([{ title: 'A', subject: '', lines: Array(201).fill('tekst'), uncertainties: [] }]).lines.length, 201);
  assert.throws(() => mergeTranscriptions([{ title: 'A', subject: '', lines: Array(1601).fill('tekst'), uncertainties: [] }]), /pojemność/);
});
test('OpenAI audio uses multipart speech API and Gemini uses structured audio input; no silent provider fallback', async t => {
  const originalFetch = globalThis.fetch; t.after(() => { globalThis.fetch = originalFetch; });
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (String(url).includes('audio/transcriptions')) return Response.json({ text: 'Fotosynteza zachodzi w chloroplastach.' });
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ title: 'Wykład', subject: 'Biologia', lines: ['Chloroplasty'], uncertainties: [] }) }] } }] });
  };
  const result = await transcribeAudio({}, { provider: 'openai', apiKey: 'own-key', model: 'gpt-4.1-mini' }, wav);
  assert.equal(result.lines[0], 'Fotosynteza zachodzi w chloroplastach.');
  assert.equal(calls[0].options.body.get('model'), 'gpt-4o-mini-transcribe'); assert.equal(calls[0].options.headers.Authorization, 'Bearer own-key');
  const gemini = await transcribeAudio({}, { provider: 'gemini', apiKey: 'google-key' }, wav);
  assert.equal(gemini.lines[0], 'Chloroplasty');
  const body = JSON.parse(calls[1].options.body); assert.equal(body.contents[0].parts[0].inlineData.mimeType, 'audio/wav');
  await assert.rejects(transcribeAudio({}, { provider: 'claude', apiKey: 'key' }, wav), /OpenAI lub Gemini/);
  await assert.rejects(transcribeAudio({}, { provider: 'local' }, wav), /OpenAI lub Gemini/);
  assert.equal(calls.length, 2);
});
test('Audio endpoint enforces server authorization and input validation', async () => {
  const server = createServer({ token: 'test-token' }); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/audio`;
    const post = (body, token) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    assert.equal((await post({ file: wav }, 'wrong')).status, 401);
    assert.equal((await post({ file: { ...wav, data: 'bad!' } }, 'test-token')).status, 400);
    assert.equal((await post({ file: wav, ai: { provider: 'openai' } }, 'test-token')).status, 503);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
