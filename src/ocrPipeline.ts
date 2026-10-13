import type { Source, Transcription } from './types';
import { mergeTranscriptions } from './transcription.ts';

export type OcrControls = { signal?: AbortSignal; onProgress?: (label: string) => void };
export function checkOcrCancelled(signal?: AbortSignal) {
  if (signal?.aborted) { const error = new Error('Odczyt anulowany.'); error.name = 'AbortError'; throw error; }
}
/** Keep only one encoded attachment in flight instead of building a large JSON batch. */
export async function readSequentially(sources: Source[], dependencies: {
  encode: (source: Source) => Promise<string>;
  send: (source: Source, data: string, controls: OcrControls) => Promise<Transcription>;
  yieldUI: () => Promise<void>;
}, controls: OcrControls = {}) {
  const pages: Transcription[] = [];
  for (let index = 0; index < sources.length; index++) {
    checkOcrCancelled(controls.signal);
    controls.onProgress?.(`Przygotowuję plik ${index + 1} z ${sources.length}…`);
    await dependencies.yieldUI();
    checkOcrCancelled(controls.signal);
    const source = sources[index];
    const data = await dependencies.encode(source);
    checkOcrCancelled(controls.signal);
    controls.onProgress?.(`Odczytuję plik ${index + 1} z ${sources.length}…`);
    await dependencies.yieldUI();
    checkOcrCancelled(controls.signal);
    const page = await dependencies.send(source, data, controls);
    checkOcrCancelled(controls.signal);
    pages.push(page);
  }
  return mergeTranscriptions(pages);
}
