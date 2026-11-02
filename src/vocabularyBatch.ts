/** Match the backend's limits without dropping or altering any source row. */
export function vocabularyBatches(terms: string[]): string[][] {
  const batches: string[][] = [];
  let batch: string[] = [], size = 0;
  for (let index = 0; index < terms.length; index++) {
    const term = terms[index];
    if (typeof term !== 'string' || !term.trim()) throw new Error(`Wiersz ${index + 1} jest pusty.`);
    if (term.length > 500) throw new Error(`Wiersz ${index + 1} ma więcej niż 500 znaków. Podziel go na krótsze zdania przed tłumaczeniem.`);
    if (batch.length === 30 || size + term.length > 12000) { batches.push(batch); batch = []; size = 0; }
    batch.push(term); size += term.length;
  }
  if (batch.length) batches.push(batch);
  return batches;
}
