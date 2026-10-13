import { callModel } from './providers.mjs';
import { validateSchema, validTranscription, transcriptionSchema } from './schema.mjs';

export function normalizeOcr(value) {
  if (!validateSchema(value, transcriptionSchema)) return null;
  const result = { ...value, title: value.title.trim() || 'Odręczne notatki', subject: value.subject.trim(), uncertainties: [...value.uncertainties] };
  const misplaced = result.uncertainties.filter(item => item.line < 1 || item.line > result.lines.length);
  result.uncertainties = result.uncertainties.filter(item => item.line >= 1 && item.line <= result.lines.length);
  if (misplaced.length) {
    const flagged = new Set(result.uncertainties.map(item => item.line));
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
    const guidance = attempt ? '\nPonownie obejrzyj załączone zdjęcie jako stronę pisma odręcznego. Czytaj kolejno każdy widoczny wiersz. Nie odrzucaj całej strony z powodu jednego nieczytelnego słowa: zachowaj czytelne fragmenty, a jedynie brakujące słowa oznacz [nieczytelne] z uncertainties. Nie odtwarzaj braków z wiedzy ani pamięci. Dla rzeczywiście pustego zdjęcia zwróć lines=[]. Każdy numer uncertainties.line musi odpowiadać istniejącej linii od 1. Wypełnij wszystkie pola schematu.' : '\nPismo odręczne jest pełnoprawną notatką. Nie wymagaj druku ani kompletnej czytelności całej strony. Zachowaj czytelne fragmenty także obok nieczytelnego słowa; oznacz tylko fragment, którego nie można odczytać.';
    // Provider failures, quota and safety blocks are propagated rather than retried here.
    result = normalizeOcr(await model(config, ai, schema, name, instructions + (name === 'transcription' ? guidance : ''), content, options));
    if (result && validTranscription(result)) return result;
  }
  const empty = result && !result.lines.some(line => line.trim());
  throw Object.assign(new Error(empty ? 'AI nie odczytało tekstu z tego zdjęcia mimo ponownej próby. Zdjęcie pozostaje zapisane. Spróbuj zbliżenia fragmentu strony lub wpisz treść ręcznie.' : 'AI zwróciło nieprawidłowy format odczytu. Zdjęcie pozostaje zapisane; ponów odczyt.'), { status: empty ? 422 : 502 });
}
