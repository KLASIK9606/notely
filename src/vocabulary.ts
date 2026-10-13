import type { Note, Source } from './types';

export type VocabularyEntry = { question: string; answer: string; line: number };
// Keep every non-empty row, including repeats: different meanings may share a word.
export function parseVocabulary(text: string) {
  const entries: VocabularyEntry[] = [];
  const missing: { text: string; line: number }[] = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  lines.forEach((raw, i) => {
    const value = raw.trim();
    if (!value) return;
    if (/\[(?:nieczytelne|niepewne)\]/i.test(value)) { missing.push({ text: value, line: i + 1 }); return; }
    const match = value.match(/^(.+?)(?:\t+|\s+(?:[-–—=]|->|→)\s+|\s*[:;]\s*)(.+)$/);
    if (!match || !match[1].trim() || !match[2].trim()) missing.push({ text: value, line: i + 1 });
    else entries.push({ question: match[1].trim(), answer: match[2].trim(), line: i + 1 });
  });
  return { entries, missing, lines };
}

export function vocabularyNote(text: string, title: string, sources: Source[], id: string): Note {
  const parsed = parseVocabulary(text);
  if (parsed.missing.length) throw new Error(`Uzupełnij tłumaczenie lub znaczenie w ${parsed.missing.length} wierszach. Żadnego słówka nie pominiemy.`);
  if (!parsed.entries.length) throw new Error('Wpisz przynajmniej jedną parę: słowo — tłumaczenie.');
  const finalTitle = title.trim() || `Słówka: ${parsed.entries[0].question.slice(0, 80)}`;
  return { id, kind: 'vocabulary', createdAt: new Date().toISOString(), title: finalTitle, subject: 'Słówka', lines: parsed.lines, uncertainties: [], sources, reviews: {}, materials: {
    summary: `${parsed.entries.length} fiszek z Twojej listy.`, sections: [], quiz: [], mindMap: { center: finalTitle, branches: [] },
    flashcards: parsed.entries.map(entry => ({ question: entry.question, answer: entry.answer, sourceLines: [entry.line] })),
  } };
}
