import type { Materials, Transcription } from './types';
import { checkOcrCancelled, type OcrControls } from './ocrPipeline.ts';

type Batch = { lines: string[]; originalLines: number[] };
/** Bound individual model requests without truncating or renumbering the original note. */
export function materialBatches(lines: string[]): Batch[] {
  const batches: Batch[] = [];
  let current: Batch = { lines: [], originalLines: [] };
  let characters = 0;
  lines.forEach((line, index) => {
    // Long OCR paragraphs must also respect the server's per-line input limit.
    for (let start = 0; start < line.length || (start === 0 && !line.length);) {
      let end = Math.min(start + 4000, line.length);
      if (end < line.length && /[\uD800-\uDBFF]/.test(line[end - 1])) end--;
      const part = line.slice(start, end);
      if (current.lines.length >= 200 || characters + part.length > 60000) {
        if (current.lines.some(value => value.trim())) batches.push(current);
        current = { lines: [], originalLines: [] }; characters = 0;
      }
      current.lines.push(part); current.originalLines.push(index + 1); characters += part.length;
      if (end === line.length) break;
      start = end;
    }
  });
  if (current.lines.some(value => value.trim())) batches.push(current);
  return batches;
}

export async function generateMaterialBatches(note: Transcription, send: (part: Transcription) => Promise<Materials>, controls: OcrControls = {}): Promise<Materials> {
  const batches = materialBatches(note.lines);
  if (!batches.length) throw new Error('Dodaj treść notatki.');
  const results: Materials[] = [];
  for (let index = 0; index < batches.length; index++) {
    checkOcrCancelled(controls.signal);
    controls.onProgress?.(`Tworzę materiały: część ${index + 1} z ${batches.length}…`);
    const batch = batches[index];
    const result = await send({ ...note, lines: batch.lines, uncertainties: [] });
    checkOcrCancelled(controls.signal);
    const remap = <T extends { sourceLines: number[] }>(item: T): T => {
      if (!item.sourceLines.length || !item.sourceLines.every(line => Number.isInteger(line) && line >= 1 && line <= batch.originalLines.length)) throw new Error('Materiały zawierają nieprawidłowe odwołania do odczytu. Spróbuj ponownie.');
      return { ...item, sourceLines: [...new Set(item.sourceLines.map(line => batch.originalLines[line - 1]))] };
    };
    const nodes = result.mindMap.nodes?.map(node => ({ ...remap(node), id: `part${index}-${node.id}`, parentId: node.parentId ? `part${index}-${node.parentId}` : '' }));
    results.push({ ...result, sections: result.sections.map(remap), flashcards: result.flashcards.map(remap), quiz: result.quiz.map(remap), mindMap: { ...result.mindMap, branches: result.mindMap.branches.map(remap), ...(nodes ? { nodes } : {}) } });
  }
  if (results.length === 1) return results[0];
  return {
    summary: results.map(result => result.summary).join('\n\n'),
    sections: results.flatMap(result => result.sections),
    flashcards: results.flatMap(result => result.flashcards),
    quiz: results.flatMap(result => result.quiz),
    mindMap: { center: note.title, branches: results.flatMap(result => result.mindMap.branches), ...(results.some(result => result.mindMap.nodes) ? { nodes: results.flatMap(result => result.mindMap.nodes || []), layout: results.every(result => result.mindMap.layout === results[0].mindMap.layout) ? results[0].mindMap.layout : 'concepts', layoutReason: results.every(result => result.mindMap.layout === results[0].mindMap.layout) ? results[0].mindMap.layoutReason || 'Części materiału używają tego samego układu.' : 'Materiał łączy różne struktury, dlatego pokazujemy pogrupowane pojęcia z każdej części.' } : {}) },
  };
}
