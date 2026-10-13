import { setTimeout as pause } from 'node:timers/promises';
import { fastModels, fastModel } from '../src/modelPolicy.ts';
export const defaults = fastModels;
export function searchGrounding(metadata) {
  if (!metadata || !Array.isArray(metadata.webSearchQueries) || !metadata.webSearchQueries.some(q => typeof q === 'string' && q.trim())) return null;
  const sources = [];
  for (const chunk of metadata.groundingChunks || []) {
    try {
      const url = new URL(chunk.web?.uri);
      if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 4000 || sources.some(source => source.url === url.href)) continue;
      sources.push({ url: url.href, title: typeof chunk.web.title === 'string' ? chunk.web.title.slice(0, 200) : url.hostname });
    } catch {}
  }
  const html = metadata.searchEntryPoint?.renderedContent;
  return { sources: sources.slice(0, 20), ...(typeof html === 'string' && html.length <= 100000 ? { searchSuggestions: html } : {}) };
}
const fail = (status, message) => Object.assign(new Error(message), { status });
export function resolveAI(config, ai) {
  const provider = ai?.provider || 'openai';
  if (!Object.hasOwn(defaults, provider)) throw fail(400, 'Wybierz GPT, Gemini albo Claude. Tryb lokalny działa na telefonie.');
  if (ai && (typeof ai !== 'object' || Array.isArray(ai))) throw fail(400, 'Nieprawidłowe ustawienia AI.');
  if (ai?.apiKey !== undefined && (typeof ai.apiKey !== 'string' || ai.apiKey.length > 2048 || /\s/.test(ai.apiKey))) throw fail(400, 'Nieprawidłowy klucz API.');
  let model = ai?.model || (provider === 'openai' ? config.model : '') || defaults[provider];
  if (typeof model !== 'string' || model.length > 150 || !/^[\w.:-]+$/.test(model)) throw fail(400, 'Nieprawidłowa nazwa modelu.');
  if (ai?.fast === true || ['gpt-4.1-mini', 'claude-sonnet-4-6'].includes(model)) model = fastModel(provider, model);
  if (ai?.googleOAuth !== undefined && typeof ai.googleOAuth !== 'boolean') throw fail(400, 'Nieprawidłowy sposób połączenia Google.');
  if (ai?.googleOAuth === true) {
    if (provider !== 'gemini' || ai.apiKey || typeof ai.accessToken !== 'string' || !/^[\w.~-]{8,8192}$/.test(ai.accessToken) || typeof ai.project !== 'string' || !/^(?:[a-z][a-z0-9-]{4,28}[a-z0-9]|[0-9]{6,20})$/.test(ai.project)) throw fail(400, 'Połączenie Gemini wymaga tokenu Google i poprawnego projektu. Połącz konto ponownie w Ustawieniach.');
    return { provider, model, accessToken: ai.accessToken, project: ai.project };
  }
  if (ai?.accessToken !== undefined) throw fail(400, 'Wybierz połączenie Gemini przez Google.');
  const key = ai?.apiKey || (provider === 'openai' ? config.key : config.keys?.[provider]);
  if (!key) throw fail(503, `Brak klucza ${provider === 'openai' ? 'OpenAI' : provider === 'gemini' ? 'Gemini' : 'Claude'}. Dodaj własny klucz w Ustawieniach lub skonfiguruj go na serwerze.`);
  return { provider, model, key };
}
export function geminiHeaders(ai) {
  return ai.accessToken ? { Authorization: `Bearer ${ai.accessToken}`, 'x-goog-user-project': ai.project } : { 'x-goog-api-key': ai.key };
}
export async function providerError(ai, response, options = {}) {
  // Never return or log upstream prose: it may echo credentials or uploaded content.
  const label = { openai: 'OpenAI', gemini: 'Gemini', claude: 'Claude' }[ai.provider];
  let data; try { data = await response.json(); } catch { data = {}; }
  const code = data?.error?.code;
  const badKey = data?.error?.details?.some(detail => detail?.reason === 'API_KEY_INVALID');
  const billing = ['insufficient_quota', 'billing_hard_limit_reached'].includes(code);
  if (response.status === 404) return fail(422, `${label}: model „${ai.model}” nie istnieje lub nie jest dostępny dla tego klucza. W Ustawieniach kliknij „Sprawdź połączenie” i wybierz dostępny model.`);
  if (response.status === 429) {
    const details = Array.isArray(data?.error?.details) ? data.error.details : [];
    const violations = details.flatMap(detail => Array.isArray(detail?.violations) ? detail.violations : []);
    const quotas = violations.map(v => `${typeof v.quotaMetric === 'string' ? v.quotaMetric : ''} ${typeof v.quotaId === 'string' ? v.quotaId : ''}`).join(' ');
    const zero = violations.some(v => v.quotaValue === 0 || v.quotaValue === '0');
    const search = ai.provider === 'gemini' && /search|grounding/i.test(quotas);
    const day = /PerDay|per_day/i.test(quotas);
    const minute = /PerMinute|per_minute/i.test(quotas);
    const retry = details.find(d => typeof d?.retryDelay === 'string' && /^\d+(\.\d+)?s$/.test(d.retryDelay))?.retryDelay;
    const seconds = retry ? Math.ceil(parseFloat(retry)) : 0;
    const scope = search ? 'wyszukiwania Google' : 'modelu AI';
    let message = billing ? `${label}: brak środków lub limit konta API. Sprawdź rozliczenia u dostawcy.` : zero ? `${label}: konto ma limit 0 dla ${scope}. Czekanie nie odblokuje tej usługi. Sprawdź dostęp i rozliczenia projektu w Google AI Studio.` : day ? `${label}: wyczerpano dzienny limit ${scope}. Poczekaj na odnowienie limitu lub sprawdź plan projektu w Google AI Studio.` : minute ? `${label}: przekroczono chwilowy limit ${scope}.${seconds > 0 && seconds <= 86400 ? ` Spróbuj za co najmniej ${seconds} s.` : ' Odczekaj chwilę przed ponowieniem.'}` : `${label}: przekroczony limit żądań lub dostępna kwota API. Sprawdź limity konta i spróbuj później.`;
    const searchRequested = ai.provider === 'gemini' && options.googleSearch === true;
    if (searchRequested) message += ' Google Search w Flash Lite wymaga płatnego planu API. Możesz spróbować odpowiedzi bez internetu.';
    return Object.assign(fail(429, message), { searchRequested });
  }
  if (ai.accessToken && response.status === 401) return fail(401, 'Gemini: połączenie Google wygasło. Połącz konto ponownie w Ustawieniach.');
  if (ai.accessToken && response.status === 403) return fail(403, 'Gemini: brak dostępu do projektu. Sprawdź, czy włączono Generative Language API, udzielono zgody Google i Twoje konto ma uprawnienia do korzystania z limitów tego projektu.');
  if ([401, 403].includes(response.status) || badKey) return fail(401, `${label}: klucz API został odrzucony albo nie ma wymaganych uprawnień. Sprawdź klucz i dostęp projektu.`);
  if (response.status === 400) return fail(422, `${label}: odrzucono format materiału lub ustawienia modelu „${ai.model}”. Sprawdź model w Ustawieniach; jeśli jest dostępny, spróbuj z jednym zdjęciem JPG.`);
  if (response.status === 503) return fail(503, `${label}: usługa jest chwilowo niedostępna (HTTP 503). Automatyczne próby nie zakończyły się powodzeniem. Zachowaliśmy Twoje zdjęcia; ponów odczyt za chwilę.`);
  return fail(502, `${label}: błąd usługi (HTTP ${response.status}). Spróbuj ponownie później.`);
}

export function selectGeminiModel(models, excluded = []) {
  const choices = models.filter(name => /^gemini-[\w.:-]+$/.test(name) && /flash/.test(name) && !/(omni|image|tts|live|audio|computer|robot|research)/i.test(name) && !excluded.includes(name));
  // The test project's quota dashboard confirms 500 requests/day for these Lite models.
  // Model listing alone does not imply a nonzero generation quota.
  const preferred = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
  const rank = name => preferred.includes(name) ? 100 - preferred.indexOf(name) : (/preview|exp|latest/.test(name) ? 0 : 10) + (/lite/.test(name) ? 3 : 2);
  choices.sort((a, b) => rank(b) - rank(a) || b.localeCompare(a, 'en', { numeric: true }));
  if (!choices.length) throw fail(422, 'Gemini nie udostępnia temu kluczowi żadnego odpowiedniego modelu do odczytu. Sprawdź projekt i dostęp API w Google AI Studio.');
  return choices[0];
}

export async function checkAI(config, settings, excluded = []) {
  const ai = resolveAI(config, settings);
  const headers = ai.provider === 'gemini' ? geminiHeaders(ai) : ai.provider === 'openai' ? { Authorization: `Bearer ${ai.key}` } : { 'x-api-key': ai.key, 'anthropic-version': '2023-06-01' };
  if (ai.provider === 'gemini') {
    const models = [];
    let token = '';
    const signal = AbortSignal.timeout(15000);
    do {
      const url = new URL('https://generativelanguage.googleapis.com/v1beta/models');
      url.searchParams.set('pageSize', '1000'); if (token) url.searchParams.set('pageToken', token);
      const response = await fetch(url, { headers, signal });
      if (!response.ok) throw await providerError(ai, response);
      const data = await response.json();
      for (const model of data.models || []) {
        const name = typeof model.name === 'string' ? model.name.replace(/^models\//, '') : '';
        if (model.supportedGenerationMethods?.includes('generateContent') && /^gemini-[\w.:-]+$/.test(name) && !/(image|tts|live|audio)/i.test(name)) models.push(name);
      }
      const next = data.nextPageToken || '';
      if (next === token && next) throw fail(502, 'Gemini: nie udało się pobrać pełnej listy modeli.');
      token = next;
    } while (token);
    const availableModels = [...new Set(models)].sort();
    const model = selectGeminiModel(availableModels, excluded);
    return { provider: ai.provider, model, modelAvailable: true, availableModels, message: `Dostęp do listy modeli Gemini działa${ai.accessToken ? ' przez konto Google' : ''}. Wybrano „${model}”. Odczyt materiału może podlegać osobnym limitom.` };
  }
  const base = ai.provider === 'openai' ? 'https://api.openai.com/v1/models/' : 'https://api.anthropic.com/v1/models/';
  const response = await fetch(base + encodeURIComponent(ai.model), { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw await providerError(ai, response);
  return { provider: ai.provider, model: ai.model, modelAvailable: true, availableModels: [], message: `Serwer, klucz i dostęp do modelu „${ai.model}” działają.` };
}

function asData(content) {
  const url = content.type === 'input_image' ? content.image_url : content.file_data;
  const match = /^data:([^;]+);base64,(.+)$/.exec(url);
  if (!match) throw fail(400, 'Nieprawidłowy plik.');
  return { mime: match[1], data: match[2] };
}
export function buildRequest(ai, schema, name, instructions, content, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const openaiSpeed = ai.model === 'gpt-6-luna' ? { reasoning: { effort: 'none' } } : {};
  const geminiSpeed = /^gemini-3\.(1|5)-flash-lite$/.test(ai.model) ? { thinkingConfig: { thinkingLevel: 'minimal' } } : /^gemini-2\.5-flash(-lite)?$/.test(ai.model) ? { thinkingConfig: { thinkingBudget: 0 } } : {};
  const claudeSpeed = ai.model === 'claude-haiku-5-5' ? { thinking: { type: 'disabled' } } : {};
  const claudeEffort = ai.model === 'claude-haiku-5-5' ? { effort: 'low' } : {};
  if (ai.provider === 'openai') return { url: 'https://api.openai.com/v1/responses', headers: { ...headers, Authorization: `Bearer ${ai.key}` }, body: { ...openaiSpeed, model: ai.model, store: false, instructions, input: [{ role: 'user', content }], text: { format: { type: 'json_schema', name, strict: true, schema } }, max_output_tokens: options.maxOutputTokens || 10000 } };
  if (ai.provider === 'gemini') return { url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(ai.model)}:generateContent`, headers: { ...headers, ...geminiHeaders(ai) }, body: { ...(options.googleSearch ? { tools: [{ google_search: {} }] } : {}), systemInstruction: { parts: [{ text: instructions }] }, contents: [{ role: 'user', parts: content.map(c => { if (c.type === 'input_text') return { text: c.text }; const file = asData(c); return { inlineData: { mimeType: file.mime, data: file.data } }; }) }], generationConfig: { ...geminiSpeed, responseMimeType: 'application/json', responseJsonSchema: schema, maxOutputTokens: options.maxOutputTokens || 10000 } } };
  return { url: 'https://api.anthropic.com/v1/messages', headers: { ...headers, 'x-api-key': ai.key, 'anthropic-version': '2023-06-01' }, body: { ...claudeSpeed, model: ai.model, system: instructions, max_tokens: options.maxOutputTokens || 10000, messages: [{ role: 'user', content: content.map(c => { if (c.type === 'input_text') return { type: 'text', text: c.text }; const file = asData(c); if (file.mime === 'image/webp') throw fail(400, 'Claude nie przyjmuje w tej integracji WEBP. Wybierz JPG lub PNG.'); return { type: c.type === 'input_file' ? 'document' : 'image', source: { type: 'base64', media_type: file.mime, data: file.data } }; }) }], output_config: { ...claudeEffort, format: { type: 'json_schema', schema } } } };
}
export function parseResponse(provider, data) {
  let text;
  if (provider === 'openai') {
    const contents = data.output?.flatMap(item => item.content || []) || [];
    if (data.status !== 'completed' || contents.some(c => c.type === 'refusal')) throw fail(422, 'AI nie przygotowało pełnego wyniku. Spróbuj z krótszą notatką.');
    text = contents.filter(c => c.type === 'output_text').map(c => c.text).join('');
  } else if (provider === 'gemini') {
    const candidate = data.candidates?.[0];
    const reason = data.promptFeedback?.blockReason || candidate?.finishReason;
    if (!candidate || reason !== 'STOP') {
      if (reason === 'MAX_TOKENS') throw fail(422, 'Gemini: odczyt przekroczył limit długości odpowiedzi (MAX_TOKENS). Nie zapisaliśmy urwanego tekstu. Podziel PDF lub nagranie na części; dla zdjęcia spróbuj osobno górnej i dolnej części strony.');
      if (['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'IMAGE_SAFETY', 'SPII'].includes(reason)) throw fail(422, 'Gemini zablokowało przetwarzanie tego materiału przez filtr treści. To nie jest limit długości. Sprawdź załącznik; możesz wpisać treść ręcznie.');
      if (reason === 'RECITATION') throw fail(422, 'Gemini przerwało odczyt z powodu wykrycia powielania tekstu (RECITATION). Możesz wpisać treść ręcznie.');
      throw fail(502, 'Gemini przerwało odpowiedź bez pełnego wyniku. Ponów odczyt; jeżeli problem wraca, sprawdź połączenie z AI w Ustawieniach.');
    }
    text = candidate.content?.parts?.filter(c => c.text && !c.thought).map(c => c.text).join('');
  } else {
    if (data.stop_reason !== 'end_turn') throw fail(422, 'Claude nie przygotowało pełnego wyniku. Spróbuj z krótszą notatką.');
    text = data.content?.filter(c => c.type === 'text').map(c => c.text).join('');
  }
  try { return JSON.parse(text); } catch { throw fail(502, 'AI zwróciło nieprawidłowy wynik. Spróbuj ponownie.'); }
}
export async function callModel(config, aiSettings, schema, name, instructions, content, options = {}) {
  const ai = resolveAI(config, aiSettings);
  // Repair older clients that persisted the automatically selected Omni model.
  if (ai.provider === 'gemini' && /omni/.test(ai.model)) ai.model = (await checkAI(config, aiSettings)).model;
  const signal = options.signal ? AbortSignal.any([AbortSignal.timeout(105000), options.signal]) : AbortSignal.timeout(105000);
  const missing = [];
  let unavailable = 0;
  let outputLimit = options.maxOutputTokens || 10000;
  let repairedTruncation = false;
  let retriedRecitation = false;
  // Also repairs requests from older app versions carrying a retired model name.
  for (let attempt = 0; attempt < 3; attempt++) {
    const request = buildRequest(ai, schema, name, instructions, content, options);
    if (ai.provider === 'gemini') request.body.generationConfig.maxOutputTokens = outputLimit;
    const response = await fetch(request.url, { method: 'POST', signal, headers: request.headers, body: JSON.stringify(request.body) });
    if (response.ok) {
      const data = await response.json();
      // One identical retry for source transcription only. Never accept the blocked
      // candidate, remove filtering, paraphrase OCR, or start a teacher conversation.
      if (ai.provider === 'gemini' && !data.promptFeedback?.blockReason && data.candidates?.[0]?.finishReason === 'RECITATION' && ['transcription', 'audio_transcription'].includes(name) && !retriedRecitation && attempt < 2) {
        retriedRecitation = true;
        continue;
      }
      // Retry only a confirmed output limit, without shortening or discarding source text.
      // Share the existing three-attempt deadline/budget with 404 and 503 recovery.
      if (ai.provider === 'gemini' && !data.promptFeedback?.blockReason && data.candidates?.[0]?.finishReason === 'MAX_TOKENS' && !options.maxOutputTokens && !repairedTruncation && attempt < 2) {
        repairedTruncation = true;
        outputLimit = 20000;
        continue;
      }
      if (ai.provider === 'gemini' && ['teacher', 'teacher_scope'].includes(name) && data.candidates?.[0]?.finishReason === 'MAX_TOKENS') throw fail(422, 'Wykładowca przekroczył długość pojedynczej odpowiedzi. To nie jest limit konta API. Podziel pytanie na dwa krótsze; nie odtworzyliśmy urwanej odpowiedzi.');
      const result = parseResponse(ai.provider, data);
      if (ai.provider === 'gemini' && options.googleSearch) {
        const grounding = searchGrounding(data.candidates?.[0]?.groundingMetadata);
        if (grounding) result.grounding = grounding;
      }
      return result;
    }
    if (ai.provider === 'gemini' && response.status === 503 && attempt < 2) {
      const retryHeader = response.headers.get('retry-after');
      const numericDelay = retryHeader !== null && /^\d+(\.\d+)?$/.test(retryHeader) ? Number(retryHeader) * 1000 : NaN;
      const retryDelay = retryHeader === null ? 0 : Number.isFinite(numericDelay) ? numericDelay : Date.parse(retryHeader) - Date.now();
      // Do not retry earlier than a long provider-directed waiting period.
      if (Number.isFinite(retryDelay) && retryDelay > 8000) throw await providerError(ai, response);
      await response.arrayBuffer();
      unavailable++;
      if (unavailable > 1) {
        try {
          const alternatives = await checkAI(config, aiSettings, [...missing, ai.model]);
          // Use only the two Lite models whose positive quotas were confirmed.
          if (['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'].includes(alternatives.model)) ai.model = alternatives.model;
        } catch (error) {
          if (error.status !== 422) throw error;
          // If no suitable alternative exists, keep the original model for the final retry.
        }
      }
      const waitMs = Math.max(1000 * 2 ** (unavailable - 1) + Math.floor(Math.random() * 250), Number.isFinite(retryDelay) ? retryDelay : 0);
      await (config.retrySleep || pause)(waitMs, undefined, { signal });
      continue;
    }
    if (ai.provider === 'gemini' && response.status === 404 && attempt < 2) {
      await response.arrayBuffer();
      missing.push(ai.model);
      const replacement = await checkAI(config, aiSettings, missing);
      ai.model = replacement.model;
      continue;
    }
    console.error('AI request failed:', ai.provider, ai.model, response.status);
    throw await providerError(ai, response, options);
  }
}
