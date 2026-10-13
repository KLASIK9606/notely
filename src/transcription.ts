import type { Transcription } from './types';
export function mergeTranscriptions(pages: Transcription[]): Transcription {
  const merged: Transcription = { title: pages[0]?.title || 'Moje materiały', subject: pages[0]?.subject || '', lines: [], uncertainties: [] };
  if (pages.some(page => page.sourceMode === 'pdf-notes')) merged.sourceMode = 'pdf-notes';
  for (const page of pages) {
    const offset = merged.lines.length;
    merged.lines.push(...page.lines);
    merged.uncertainties.push(...page.uncertainties.map(u => ({ ...u, line: u.line + offset })));
  }
  if (!merged.lines.length || !merged.lines.some(line => line.trim())) throw new Error('Nie znaleziono czytelnej treści w dodanych materiałach.');
  // Each of the eight supported attachments may produce up to 200 lines.
  if (merged.lines.length > 1600 || merged.lines.join('').length > 480000) throw new Error('Odczyt przekroczył pojemność jednej lekcji. Podziel materiały na dwa zestawy; nie pomijamy żadnej części.');
  return merged;
}
