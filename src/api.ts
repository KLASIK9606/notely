import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { Materials, Note, Settings, Source, Transcription } from './types';
import type { ApiKeys } from './vault';
import { generateLocal, transcribeLocal, localAvailable, localReady } from './local';
import { readSequentially, checkOcrCancelled, OcrControls } from './ocrPipeline';
import { googleAIAccess } from './googleAI';
import { generateMaterialBatches } from './materialPipeline';
import { readableSourceBlob, uploadFilename } from './sourceRead';
import { sourceLimit } from './sourcePolicy';
import { managedAI } from './betaConfig';
import { supabase } from './auth';

export class ApiError extends Error {
  searchRequested: boolean;
  constructor(message: string, searchRequested: boolean) { super(message); this.searchRequested = searchRequested; }
}

function trustedTransport(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return true;
    if (!__DEV__ || url.protocol !== 'http:') return false;
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return true;
    const parts = url.hostname.split('.').map(Number);
    if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
    return parts[0] === 10 || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31);
  } catch { return false; }
}

function cloudOptions(settings: Settings, keys?: ApiKeys) {
  if (settings.provider === 'local') throw new Error('Tryb lokalny nie korzysta z serwera.');
  const apiKey = managedAI ? '' : keys?.[settings.provider]?.trim() || '';
  if (!trustedTransport(settings.apiUrl.trim())) throw new Error('Połączenie z serwerem wymaga HTTPS. Lokalne HTTP jest dostępne tylko podczas testów w prywatnej sieci.');
  if (settings.provider === 'gemini' && settings.geminiAccess === 'google') {
    const project = settings.googleProject?.trim() || '';
    if (!/^(?:[a-z][a-z0-9-]{4,28}[a-z0-9]|[0-9]{6,20})$/.test(project)) throw new Error('Podaj identyfikator swojego projektu Google Cloud z włączonym Gemini API.');
    return { provider: 'gemini', model: settings.models.gemini, fast: true, googleOAuth: true, project };
  }
  return { provider: settings.provider, model: settings.models[settings.provider], fast: true, ...(apiKey ? { apiKey } : {}) };
}

export async function request<T>(settings: Settings, path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const url = settings.apiUrl.trim().replace(/\/$/, '');
  if (!/^https?:\/\//.test(url)) throw new Error('Ustaw adres serwera w Ustawieniach, np. https://twoj-serwer.pl.');
  checkOcrCancelled(signal);
  let token = settings.token;
  if (managedAI) {
    if (!supabase) throw new Error('Logowanie Notely nie jest jeszcze skonfigurowane.');
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw new Error('Zaloguj się do Notely, aby korzystać z AI.');
    token = data.session.access_token;
  }
  if (settings.provider === 'gemini' && settings.geminiAccess === 'google') {
    if (!trustedTransport(url)) throw new Error('Połączenie Google wymaga zaufanego serwera HTTPS lub lokalnego serwera podczas testów.');
    const access = await googleAIAccess();
    if (!access) throw new Error('Połączenie Google wygasło lub nie zostało dodane. W Ustawieniach kliknij „Połącz Gemini z Google”.');
    const value = body as { ai: Record<string, unknown> };
    body = { ...value, ai: { ...value.ai, accessToken: access.token } };
    checkOcrCancelled(signal);
  }
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => controller.abort(), path === '/api/audio' ? 210000 : path === '/api/teacher' ? 75000 : 120000);
  try {
    const response = await fetch(url + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body), signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok) throw new ApiError(result.error || 'Nie udało się przetworzyć notatek.', response.status === 429 && result.searchRequested === true);
    return result as T;
  } catch (error) {
    if (signal?.aborted) { checkOcrCancelled(signal); }
    if (error instanceof Error && error.name === 'AbortError') throw new Error(path.startsWith('/api/teacher') ? 'Wykładowca nie odpowiedział na czas. Spróbuj ponownie; jeśli czekasz na głos, możesz wybrać głos telefonu w opcjach.' : 'Serwer nie odpowiedział w wymaganym czasie. Spróbuj z krótszym nagraniem lub mniejszą liczbą stron.');
    if (error instanceof TypeError) throw new Error('Brak połączenia z serwerem. Sprawdź adres, sieć i uruchomienie serwera.');
    throw error;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
}

export type ConnectionResult = { provider: string; model: string; modelAvailable: boolean; availableModels: string[]; message: string };
export const checkConnection = (settings: Settings, keys: ApiKeys, signal?: AbortSignal) => request<ConnectionResult>(settings, '/api/check', { ai: cloudOptions(settings, keys) }, signal);

export function validateOcr(settings: Settings, sources: Source[], keys?: ApiKeys) {
  if (!sources.length) throw new Error('Najpierw dodaj zdjęcie lub plik.');
  const hasAudio = sources.some(source => source.mime.startsWith('audio/'));
  if (hasAudio && (settings.provider === 'local' || settings.provider === 'claude')) throw new Error('Do transkrypcji audio wybierz OpenAI albo Gemini. Nagrania możesz zapisać i odsłuchać bez AI.');
  if (settings.provider === 'local') {
    if (!localAvailable()) throw new Error('W Expo Go model lokalny nie działa. Otwórz Ustawienia i wybierz GPT, Gemini lub Claude oraz skonfiguruj serwer. Zdjęcia są zapisane; możesz też wpisać treść ręcznie. Model lokalny wymaga osobnej aplikacji Notely.');
    if (!localReady()) throw new Error('Najpierw pobierz model lokalny w Ustawieniach.');
    if (sources.some(source => !['image/jpeg', 'image/png'].includes(source.mime))) throw new Error('Tryb lokalny odczytuje JPG i PNG. Inne pliki wymagają usługi chmurowej.');
  } else cloudOptions(settings, keys);
}
export async function transcribe(settings: Settings, sources: Source[], keys?: ApiKeys, controls: OcrControls = {}): Promise<Transcription> {
  validateOcr(settings, sources, keys);
  checkOcrCancelled(controls.signal);
  if (settings.provider === 'local') return transcribeLocal(sources);
  const ai = cloudOptions(settings, keys);
  return readSequentially(sources, {
    yieldUI: () => new Promise(resolve => setTimeout(resolve, 16)),
    encode: async source => {
      if (Platform.OS !== 'web') return new File(source.uri).base64();
      const blob = await readableSourceBlob(await fetch(source.uri, { signal: controls.signal }), sourceLimit(source.mime));
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        const cancel = () => reader.abort();
        controls.signal?.addEventListener('abort', cancel, { once: true });
        reader.onloadend = () => controls.signal?.removeEventListener('abort', cancel);
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = () => reject(new Error('Nie udało się odczytać pliku z pamięci.'));
        reader.onabort = () => { const error = new Error('Odczyt anulowany.'); error.name = 'AbortError'; reject(error); };
        reader.readAsDataURL(blob);
        if (controls.signal?.aborted) reader.abort();
      });
    },
    send: (source, data, { signal }) => {
      const file = { name: uploadFilename(source.name, source.mime), mime: source.mime, data };
      return source.mime.startsWith('audio/')
        ? request<Transcription>(settings, '/api/audio', { file, ai }, signal)
        : request<Transcription>(settings, '/api/transcribe', { files: [file], ai }, signal);
    },
  }, controls);
}

export const generate = (settings: Settings, note: Transcription, keys?: ApiKeys, controls: OcrControls = {}) => generateMaterialBatches(note, part => settings.provider === 'local' ? generateLocal(part) : request<Materials>(settings, '/api/materials', { title: part.title, subject: part.subject, lines: part.lines, ai: cloudOptions(settings, keys) }, controls.signal), controls);

export type VocabularyEntry = { term: string; answer: string };
export async function generateVocabulary(terms: string[], settings: Settings, keys?: ApiKeys, signal?: AbortSignal, onProgress?: (label: string, entries: VocabularyEntry[]) => void): Promise<VocabularyEntry[]> {
  if (settings.provider === 'local') throw new Error('Możesz zapisać własne pary bez AI. Automatyczne tłumaczenie samych słówek wymaga skonfigurowanej usługi chmurowej.');
  const ai = cloudOptions(settings, keys);
  const entries: VocabularyEntry[] = [];
  for (let offset = 0; offset < terms.length; offset += 30) {
    checkOcrCancelled(signal);
    const batch = terms.slice(offset, offset + 30);
    onProgress?.(`Tłumaczę słówka ${offset + 1}–${offset + batch.length} z ${terms.length}…`, [...entries]);
    const result = await request<{ entries: VocabularyEntry[] }>(settings, '/api/vocabulary', { terms: batch, ai }, signal);
    if (!Array.isArray(result.entries) || result.entries.length !== batch.length || !result.entries.every((entry, i) => entry?.term === batch[i] && typeof entry.answer === 'string')) throw new Error('AI zwróciło niepełną listę odpowiedzi. Sprawdź słówka przed zapisaniem.');
    entries.push(...result.entries);
    onProgress?.(`Gotowe ${entries.length} z ${terms.length} słówek`, [...entries]);
  }
  return entries;
}

export type TeacherMessage = { role: 'user' | 'assistant'; text: string };
export type SearchGrounding = { sources: { title: string; url: string }[]; searchSuggestions?: string };
export type TeacherReply = { reply: string; sourceLines: number[]; continueLesson?: boolean; questionAllowed?: boolean; grounding?: SearchGrounding };
export type TeacherAudio = { data: string; mime: 'audio/wav' | 'audio/mpeg'; model: string };
export function askTeacherAudio(settings: Settings, keys: ApiKeys, text: string, signal: AbortSignal) {
  return request<TeacherAudio>(settings, '/api/teacher/speech', { text, ai: cloudOptions(settings, keys) }, signal);
}
export function askTeacher(settings: Settings, keys: ApiKeys, note: Note, topic: string, question: string, history: TeacherMessage[], signal: AbortSignal, webSearch = true) {
  return request<TeacherReply>(settings, '/api/teacher', { title: note.title, lines: note.lines, topic, question, webSearch, history: history.slice(-8).map(m => ({ ...m, text: m.text.slice(0, 3000) })), ai: cloudOptions(settings, keys) }, signal);
}
