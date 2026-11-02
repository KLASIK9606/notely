import { callModel } from './providers.mjs';
import { validateSchema, validTranscription, transcriptionSchema } from './schema.mjs';

const uncertaintyMarker = /\[(?:nieczytelne|niepewne|illegible|unreadable|unclear)[^\]]*\]/giu;
const defaultWarning = 'Sprawdź zaznaczony fragment z oryginałem. AI nie odczytało go jednoznacznie.';

export function hasReadableOcrText(lines) {
  return lines.some(line => /[\p{L}\p{N}\p{S}]/u.test(line.replace(uncertaintyMarker, '').replace(/^\s*\[Strona\s+\d+\]\s*/iu, '')));
}

function checkCancelled(signal) {
  if (signal?.aborted) throw new DOMException('Odczyt anulowany', 'AbortError');
}

export function normalizeOcr(value) {
  if (!validateSchema(value, transcriptionSchema)) return null;
  const result = { ...value, title: value.title.trim() || 'Odręczne notatki', subject: value.subject.trim(), lines: [...value.lines], uncertainties: [] };
  // Keep one warning per source line, including model output that forgot its refs.
  const warnings = new Map();
  for (const item of value.uncertainties) {
    const reason = item.reason.trim() || defaultWarning;
    const previous = warnings.get(item.line);
    if (!previous) warnings.set(item.line, reason);
    else if (!previous.includes(reason)) warnings.set(item.line, `${previous} ${reason}`.slice(0, 30000));
  }
  result.uncertainties = [...warnings].map(([line, reason]) => ({ line, reason }));
  const misplaced = result.uncertainties.filter(item => item.line < 1 || item.line > result.lines.length);
  result.uncertainties = result.uncertainties.filter(item => item.line >= 1 && item.line <= result.lines.length);
  const flagged = new Set(result.uncertainties.map(item => item.line));
  result.lines.forEach((line, i) => {
    if (line.match(uncertaintyMarker) && !flagged.has(i + 1)) {
      result.uncertainties.push({ line: i + 1, reason: defaultWarning });
      flagged.add(i + 1);
    }
  });
  if (misplaced.length) {
    result.lines.forEach((line, i) => {
      if (line.trim() && !flagged.has(i + 1)) result.uncertainties.push({ line: i + 1, reason: 'AI wskazało niepewny fragment bez poprawnego numeru. Sprawdź ten odczyt z oryginałem.' });
    });
  }
  return result;
}

/** One image-only recovery for an empty or inconsistent result; never accept blocked output. */
export async function readOcr(config, ai, schema, name, instructions, content, options = {}, model = callModel) {
  let result;
  const attempts = name === 'transcription' ? 2 : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    checkCancelled(options.signal);
    const guidance = attempt ? '\nPonownie obejrzyj załączone zdjęcie jako stronę pisma odręcznego. Czytaj kolejno każdy widoczny wiersz. Nie odrzucaj całej strony z powodu jednego nieczytelnego słowa: zachowaj czytelne fragmenty, a jedynie brakujące słowa oznacz [nieczytelne] z uncertainties. Nie odtwarzaj braków z wiedzy ani pamięci. Dla rzeczywiście pustego zdjęcia zwróć lines=[]. Każdy numer uncertainties.line musi odpowiadać istniejącej linii od 1. Wypełnij wszystkie pola schematu.' : '\nPismo odręczne jest pełnoprawną notatką. Nie wymagaj druku ani kompletnej czytelności całej strony. Zachowaj czytelne fragmenty także obok nieczytelnego słowa; oznacz tylko fragment, którego nie można odczytać.';
    // Provider failures, quota and safety blocks are propagated rather than retried here.
    const value = await model(config, ai, schema, name, instructions + (name === 'transcription' ? guidance : ''), content, options);
    checkCancelled(options.signal);
    result = normalizeOcr(value);
    if (result && validTranscription(result) && hasReadableOcrText(result.lines)) return result;
  }
  const empty = result && !hasReadableOcrText(result.lines);
  const source = name === 'transcription' ? 'zdjęcia mimo ponownej próby' : 'dokumentu';
  throw Object.assign(new Error(empty ? `AI nie odczytało tekstu z tego ${source}. Materiał pozostaje zapisany. Spróbuj zbliżenia fragmentu strony lub wpisz treść ręcznie.` : 'AI zwróciło nieprawidłowy format odczytu. Materiał pozostaje zapisany; ponów odczyt.'), { status: empty ? 422 : 502 });
}
