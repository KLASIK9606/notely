export const VOCABULARY_TEXT_LIMIT = 1024 * 1024;
function utf8Length(text: string) {
  let bytes = 0;
  for (const character of text) {
    const point = character.codePointAt(0)!;
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
    if (bytes > VOCABULARY_TEXT_LIMIT) return bytes;
  }
  return bytes;
}

function csvRows(text: string, delimiter: string) {
  const rows: string[][] = []; let row: string[] = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++; }
      else if (quoted || !value.length) quoted = !quoted;
      else value += c;
    } else if (!quoted && c === delimiter) { row.push(value); value = ''; }
    else if (!quoted && c === '\n') { row.push(value); rows.push(row); row = []; value = ''; }
    else value += c;
  }
  if (quoted) throw new Error('Plik CSV ma niedomknięty cudzysłów. Popraw plik i spróbuj ponownie.');
  row.push(value); rows.push(row);
  return rows.filter(row => row.some(value => value.trim()));
}

function delimiterCount(text: string, delimiter: string) {
  let quoted = false, count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') { if (quoted && text[i + 1] === '"') i++; else quoted = !quoted; }
    else if (!quoted && text[i] === delimiter) count++;
  }
  return count;
}

export function importVocabularyText(name: string, text: string) {
  if (utf8Length(text) > VOCABULARY_TEXT_LIMIT) throw new Error('Plik ze słówkami może mieć maksymalnie 1 MB.');
  const ext = name.split('.').pop()?.toLowerCase();
  if (!['txt', 'csv', 'tsv'].includes(ext || '')) throw new Error('Wybierz plik TXT, CSV lub TSV. PDF dodaj jako materiał do odczytu AI.');
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (!normalized.trim()) throw new Error('Wybrany plik jest pusty.');
  if (/\u0000|\uFFFD/.test(normalized)) throw new Error('Zapisz plik jako tekst UTF-8 i spróbuj ponownie.');
  if (ext === 'txt') return normalized.trim();
  const candidates = ext === 'tsv' ? ['\t'] : [',', ';', '\t'];
  const delimiter = candidates.reduce((best, candidate) => delimiterCount(normalized, candidate) > delimiterCount(normalized, best) ? candidate : best);
  const rows = csvRows(normalized, delimiter);
  if (rows.some(row => row.length > 2)) throw new Error('CSV powinien mieć jedną kolumnę ze słowami lub dwie: oryginał i tłumaczenie.');
  if (rows.length && rows[0].length === 2 && /^(słowo|slowo|term|word|original|oryginał|question)$/i.test(rows[0][0].trim()) && /^(tłumaczenie|tlumaczenie|translation|answer|znaczenie)$/i.test(rows[0][1].trim())) rows.shift();
  if (rows.some(row => !row[0].trim())) throw new Error('Każdy wiersz musi mieć oryginał w pierwszej kolumnie.');
  const lines = rows.map(row => row.map(value => value.replace(/\s+/g, ' ').trim())).map(row => row[1] ? `${row[0]}\t${row[1]}` : row[0]);
  if (!lines.length || lines.some(line => !line)) throw new Error('Każdy wiersz musi zawierać słowo lub zdanie w pierwszej kolumnie.');
  return lines.join('\n');
}
