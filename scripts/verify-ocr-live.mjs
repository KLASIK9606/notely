import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { validMaterials } from '../server/schema.mjs';

const api = 'https://notely-api-89ap.onrender.com';
const output = new URL('../dist/ocr-live-results.json', import.meta.url);
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
async function post(path, body) {
  const response = await fetch(api + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(180000) });
  const result = await response.json();
  return { status: response.status, result };
}
if (process.argv.includes('--generate')) {
  const results = JSON.parse(await readFile(output, 'utf8'));
  const source = results.find(item => item.file === 'ocr-two-pages.pdf');
  if (!source || source.status !== 200 || source.result.uncertainties.length) throw new Error('Review the OCR result and uncertainties before generation.');
  const generated = await post('/api/materials', { title: source.result.title, subject: source.result.subject, lines: source.result.lines, ai: { provider: 'gemini', fast: true } });
  await writeFile(new URL('../dist/ocr-live-materials.json', import.meta.url), JSON.stringify(generated, null, 2));
  console.log(JSON.stringify({ status: generated.status, valid: generated.status === 200 && validMaterials(generated.result, source.result.lines), result: generated.result }));
} else {
  const results = [];
  for (const [file, mime] of [['ocr-printed-pl.png', 'image/png'], ['ocr-handwriting-font.png', 'image/png'], ['ocr-two-pages.pdf', 'application/pdf'], ['ocr-blank.png', 'image/png']]) {
    const data = (await readFile(new URL('../tests/fixtures/ocr/' + file, import.meta.url))).toString('base64');
    const result = await post('/api/transcribe', { files: [{ name: file, mime, data }], ai: { provider: 'gemini', fast: true } });
    results.push({ file, ...result });
    await writeFile(output, JSON.stringify(results, null, 2));
    console.log(JSON.stringify({ file, ...result }));
  }
}
