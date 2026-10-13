import type { Transcription } from './types';

export const unreadable = (text: string) => /\[(?:nieczytelne|niepewne)[^\]]*\]/i.test(text);
export function unresolvedLines(draft: Transcription): number[] {
  const marked = new Set(draft.uncertainties.map(item => item.line));
  return draft.lines.flatMap((text, i) => marked.has(i + 1) || unreadable(text) ? [i + 1] : []);
}
export function editTranscriptionLine(draft: Transcription, index: number, text: string): Transcription {
  if (draft.lines[index] === text) return draft;
  return { ...draft, lines: draft.lines.map((line, i) => i === index ? text : line),
    uncertainties: draft.uncertainties.filter(item => item.line !== index + 1 || unreadable(text)) };
}
export function confirmTranscriptionLine(draft: Transcription, index: number): Transcription {
  if (unreadable(draft.lines[index])) return draft;
  return { ...draft, uncertainties: draft.uncertainties.filter(item => item.line !== index + 1) };
}
export function omitTranscriptionLines(draft: Transcription, lineNumbers: number[]): Transcription {
  const removed = new Set(lineNumbers);
  const retained = draft.lines.map((_, i) => i + 1).filter(line => !removed.has(line));
  return { ...draft, lines: retained.map(line => draft.lines[line - 1]),
    uncertainties: draft.uncertainties.filter(item => !removed.has(item.line)).map(item => ({ ...item, line: retained.indexOf(item.line) + 1 })).filter(item => item.line > 0) };
}
