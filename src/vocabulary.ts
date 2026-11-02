import type { Note, Source } from './types';

export type VocabularyEntry = { question: string; answer: string; line: number };
export type VocabularyFormat = 'auto' | 'terms' | 'pairs';
export function vocabularyBlockReason(text: string, storageAvailable = true, consent = true, format: VocabularyFormat = 'pairs') {
  if (!storageAvailable) return 'Nie można teraz zapisać fiszek. Sprawdź wolne miejsce na urządzeniu i uruchom ponownie Notely. Twoja lista pozostaje zachowana.';
  if (!text.trim()) return 'Wpisz słowa lub zdania w polu listy albo najpierw odczytaj dodane zdjęcie.';
  const uncertain = text.split(/\r?\n/).map((line, i) => /\[(?:nieczytelne|niepewne)\]/i.test(line) ? i + 1 : 0).filter(Boolean);
  if (uncertain.length) return `Sprawdź i popraw tekst w wierszach ${uncertain.slice(0, 12).join(', ')}. Po porównaniu ze zdjęciem usuń oznaczenia [niepewne] lub [nieczytelne].`;
  if (parseVocabulary(text, format).missing.length && !consent) return 'Zaznacz zgodę na przetworzenie słówek przez AI nad listą, a potem kliknij ponownie.';
  return '';
}
// Keep every non-empty row, including repeats: different meanings may share a word.
export function parseVocabulary(text: string, format: VocabularyFormat = 'pairs') {
  const entries: VocabularyEntry[] = [];
  const missing: { text: string; line: number }[] = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  lines.forEach((raw, i) => {
    const value = raw.trim();
    if (!value) return;
    if (/\[(?:nieczytelne|niepewne)\]/i.test(value)) { missing.push({ text: value, line: i + 1 }); return; }
    const separator = format === 'terms' ? /^(.+?)\t+(.+)$/ : format === 'auto' ? /^(.+?)(?:\t+|\s+(?:[-–—=]|->|→)\s+)(.+)$/ : /^(.+?)(?:\t+|\s+(?:[-–—=]|->|→)\s+|\s*[:;]\s*)(.+)$/;
    // Canonical tab-separated pairs take precedence over punctuation inside a sentence.
    const match = value.match(/^(.+?)\t+(.+)$/) || value.match(separator);
    if (!match || !match[1].trim() || !match[2].trim()) missing.push({ text: value, line: i + 1 });
    else entries.push({ question: match[1].trim(), answer: match[2].trim(), line: i + 1 });
  });
  return { entries, missing, lines };
}

export function applyVocabularyTranslations(text: string, answers: { term: string; answer: string }[], format: VocabularyFormat = 'pairs') {
  const parsed = parseVocabulary(text, format);
  if (answers.length > parsed.missing.length) throw new Error('Tłumaczenia nie pasują do listy.');
  const lines = [...parsed.lines];
  answers.forEach((answer, i) => {
    const row = parsed.missing[i];
    if (answer.term !== row.text) throw new Error('Kolejność tłumaczeń nie pasuje do listy.');
    if (answer.answer.trim() && !/\[(?:nieczytelne|niepewne)\]/i.test(row.text)) lines[row.line - 1] = `${row.text}${format === 'pairs' ? ' — ' : '\t'}${answer.answer.trim()}`;
  });
  return lines.join('\n');
}

export function vocabularyNote(text: string, title: string, sources: Source[], id: string, format: VocabularyFormat = 'pairs'): Note {
  const parsed = parseVocabulary(text, format);
  if (parsed.missing.length) throw new Error(`Uzupełnij tłumaczenie lub znaczenie w ${parsed.missing.length} wierszach. Żadnego słówka nie pominiemy.`);
  if (!parsed.entries.length) throw new Error('Wpisz przynajmniej jedną parę: słowo — tłumaczenie.');
  const finalTitle = title.trim() || `Słówka: ${parsed.entries[0].question.slice(0, 80)}`;
  return { id, kind: 'vocabulary', createdAt: new Date().toISOString(), title: finalTitle, subject: 'Słówka', lines: parsed.lines, uncertainties: [], sources, reviews: {}, materials: {
    summary: `${parsed.entries.length} fiszek z Twojej listy.`, sections: [], quiz: [], mindMap: { center: finalTitle, branches: [] },
    flashcards: parsed.entries.map(entry => ({ question: entry.question, answer: entry.answer, sourceLines: [entry.line] })),
  } };
}
