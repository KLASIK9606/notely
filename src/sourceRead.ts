/** Reject failed or expired source downloads before encoding and paying for an AI request. */
export async function readableSourceBlob(response: Response, maxBytes: number): Promise<Blob> {
  if (!response.ok) throw new Error(`Nie udało się odczytać zapisanego pliku (HTTP ${response.status}). Dodaj ten plik ponownie.`);
  if (/^(?:text\/html|application\/json)/i.test(response.headers.get('content-type') || '')) throw new Error('Zamiast dokumentu pobrano stronę błędu. Dodaj ten plik ponownie.');
  const blob = await response.blob();
  if (!blob.size) throw new Error('Zapisany plik jest pusty. Dodaj go ponownie.');
  if (blob.size > maxBytes) throw new Error('Zapisany plik przekracza limit rozmiaru. Dodaj mniejszy plik.');
  return blob;
}

/** Retain the display name; only shorten the filename sent to the AI provider. */
export function uploadFilename(name: string, mime: string): string {
  const value = name.trim() || 'material';
  const extension = mime === 'application/pdf' ? '.pdf' : value.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0] || '';
  const stem = extension && value.toLowerCase().endsWith(extension.toLowerCase()) ? value.slice(0, -extension.length) : value;
  let shortened = stem.slice(0, 180 - extension.length);
  if (/[\uD800-\uDBFF]$/.test(shortened)) shortened = shortened.slice(0, -1);
  return shortened + extension;
}
