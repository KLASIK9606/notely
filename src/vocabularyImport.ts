export const VOCABULARY_TEXT_LIMIT = 1024 * 1024;

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

export function importVocabularyText(name: string, text: string) {
  if (new TextEncoder().encode(text).length > VOCABULARY_TEXT_LIMIT) throw new Error('Plik ze słówkami może mieć maksymalnie 1 MB.');
  const ext = name.split('.').pop()?.toLowerCase();
  if (!['txt', 'csv', 'tsv'].includes(ext || '')) throw new Error('Wybierz plik TXT, CSV lub TSV. PDF dodaj jako materiał do odczytu AI.');
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (!normalized.trim()) throw new Error('Wybrany plik jest pusty.');
  if (/\u0000|\uFFFD/.test(normalized)) throw new Error('Zapisz plik jako tekst UTF-8 i spróbuj ponownie.');
  if (ext === 'txt') return normalized.trim();
  const candidates = ext === 'tsv' ? ['\t'] : [',', ';', '\t'];
  let rows = csvRows(normalized, candidates[0]);
  for (const delimiter of candidates.slice(1)) {
    const attempt = csvRows(normalized, delimiter);
    if (attempt.filter(row => row.length === 2).length > rows.filter(row => row.length === 2).length) rows = attempt;
  }
  if (rows.some(row => row.length > 2)) throw new Error('CSV powinien mieć jedną kolumnę ze słowami lub dwie: oryginał i tłumaczenie.');
  if (rows.length && /^(słowo|slowo|term|word|original|oryginał|question)$/i.test(rows[0][0].trim()) && (!rows[0][1] || /^(tłumaczenie|tlumaczenie|translation|answer|znaczenie)$/i.test(rows[0][1].trim()))) rows.shift();
  if (rows.some(row => !row[0].trim())) throw new Error('Każdy wiersz musi mieć oryginał w pierwszej kolumnie.');
  const lines = rows.map(row => row.map(value => value.replace(/\s+/g, ' ').trim())).map(row => row[1] ? `${row[0]}\t${row[1]}` : row[0]);
  if (!lines.length || lines.some(line => !line)) throw new Error('Każdy wiersz musi zawierać słowo lub zdanie w pierwszej kolumnie.');
  return lines.join('\n');
}
