export async function copyStoredFile<T>(source: { copy: (destination: T) => Promise<void> }, destination: T & { exists: boolean; size: number }, expectedBytes: number) {
  await source.copy(destination);
  if (!destination.exists || destination.size !== expectedBytes) throw new Error('Nie udało się zapisać pełnego pliku na urządzeniu. Ponów zapis.');
}
