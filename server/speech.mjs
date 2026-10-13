import { resolveAI, providerError, geminiHeaders } from './providers.mjs';
const fail = (status, message) => Object.assign(new Error(message), { status });
const MAX_AUDIO = 6 * 1024 * 1024;
const style = 'Mów po polsku jak zaangażowany nauczyciel, którego naprawdę ciekawi omawiany temat. Ciepło, rozmownie i z wyczuwalnym zainteresowaniem. Różnicuj intonację, podkreślaj intrygujące pytania i istotne pojęcia, rób krótkie naturalne pauzy między myślami. Wyraźnie wymawiaj liczby i terminy. Bez teatralnego tonu i monotonii. Odczytaj wyłącznie podany tekst.';

export function pcmWave(pcm, rate = 24000) {
  if (!pcm.length || pcm.length % 2 || pcm.length > MAX_AUDIO || !Number.isInteger(rate) || rate < 8000 || rate > 48000) throw fail(502, 'AI zwróciło nieprawidłowe audio.');
  const header = Buffer.alloc(44);
  header.write('RIFF'); header.writeUInt32LE(pcm.length + 36, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
export async function teacherSpeech(config, body) {
  if (typeof body.text !== 'string' || !body.text.trim() || body.text.length > 3000) throw fail(400, 'Podaj krótką wypowiedź wykładowcy.');
  const ai = resolveAI(config, body.ai);
  if (!['gemini', 'openai'].includes(ai.provider)) throw fail(400, 'Naturalny głos AI obsługują Gemini i GPT. Dla Claude wybierz głos telefonu.');
  const signal = AbortSignal.timeout(90000);
  if (ai.provider === 'openai') {
    const model = 'gpt-4o-mini-tts';
    const response = await fetch('https://api.openai.com/v1/audio/speech', { method: 'POST', signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ai.key}` }, body: JSON.stringify({ model, voice: 'marin', input: body.text, instructions: style, response_format: 'mp3' }) });
    if (!response.ok) throw await providerError({ ...ai, model }, response);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_AUDIO) throw fail(502, 'Nie udało się pobrać pełnego głosu AI.');
    return { data: bytes.toString('base64'), mime: 'audio/mpeg', model };
  }
  // Separate speech model: never send the whole note or a user's API model name to TTS.
  const models = ['gemini-3.8-flash-tts', 'gemini-3.1-flash-tts-preview'];
  for (const model of models) {
    const modern = model.startsWith('gemini-3.8');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', signal, headers: { 'Content-Type': 'application/json', ...geminiHeaders(ai) },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [modern ? { text: body.text, speech_metadata: { style } } : { text: `${style}\n\nTekst do odczytania:\n${body.text}` }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: modern ? { voice: 'Charon' } : { prebuiltVoiceConfig: { voiceName: 'Charon' } } } } }),
    });
    if (response.status === 404 && model !== models.at(-1)) { await response.arrayBuffer(); continue; }
    if (!response.ok) throw await providerError({ ...ai, model }, response);
    const result = await response.json(); const candidate = result.candidates?.[0];
    if (result.promptFeedback?.blockReason || candidate?.finishReason !== 'STOP') throw fail(422, 'Gemini nie przygotowało głosu. Tekst odpowiedzi jest dostępny; możesz wybrać głos telefonu.');
    const audio = candidate.content?.parts?.find(p => p.inlineData?.data)?.inlineData;
    if (!audio || typeof audio.data !== 'string' || audio.data.length > Math.ceil(MAX_AUDIO / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audio.data)) throw fail(502, 'Gemini zwróciło nieprawidłowy plik głosu.');
    let bytes = Buffer.from(audio.data, 'base64');
    if (/^audio\/l16(?:;|$)/i.test(audio.mimeType || '')) bytes = pcmWave(bytes, Number(/rate=(\d+)/i.exec(audio.mimeType)?.[1] || 24000));
    else if (!/^audio\/(wav|x-wav)(?:;|$)/i.test(audio.mimeType || '')) throw fail(502, 'Gemini zwróciło nieobsługiwany format głosu.');
    if (bytes.length < 44 || bytes.subarray(0, 4).toString() !== 'RIFF' || bytes.subarray(8, 12).toString() !== 'WAVE') throw fail(502, 'Plik głosu AI jest uszkodzony.');
    return { data: bytes.toString('base64'), mime: 'audio/wav', model };
  }
}
