import { Platform } from 'react-native';
import type { Source } from './types';
import { sourceLimit } from './sourcePolicy';
const urls = new Map<string, string>();
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('notely.sources.v1', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('files');
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(new Error('Nie można otworzyć magazynu zdjęć w przeglądarce.'));
  });
}
export async function saveWebSource(uri: string, id: string, mime: string) {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Nie udało się pobrać pełnego pliku. Wybierz go ponownie.');
  const blob = await response.blob();
  if (!blob.size) throw new Error('Plik jest pusty. Wybierz go ponownie lub nagraj nowy fragment.');
  if (blob.size > sourceLimit(mime)) throw new Error(`Plik jest za duży. Limit wynosi ${sourceLimit(mime) / 1024 / 1024} MB.`);
  const db = await database();
  try { await new Promise<void>((resolve, reject) => { const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').put(blob, id); tx.oncomplete = () => resolve(); tx.onerror = () => reject(new Error('Brak miejsca na zdjęcie w pamięci przeglądarki.')); tx.onabort = () => reject(new Error('Nie udało się zapisać zdjęcia.')); }); }
  finally { db.close(); }
  const url = URL.createObjectURL(blob); urls.set(id, url); return { uri: url, bytes: blob.size };
}
export async function restoreSources(sources: Source[]): Promise<Source[]> {
  if (Platform.OS !== 'web' || !sources.length) return sources;
  const db = await database();
  try {
    return await Promise.all(sources.map(async source => {
      if (urls.has(source.id)) return { ...source, uri: urls.get(source.id)! };
      const blob = await new Promise<Blob | undefined>((resolve, reject) => { const req = db.transaction('files', 'readonly').objectStore('files').get(source.id); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
      if (!blob) return source; // Existing v1 imports did not have persistent web blobs.
      const uri = URL.createObjectURL(blob); urls.set(source.id, uri); return { ...source, uri };
    }));
  } finally { db.close(); }
}
export async function deleteWebSource(id: string) {
  const db = await database();
  try { await new Promise<void>((resolve, reject) => { const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').delete(id); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); }
  finally { db.close(); }
  const uri = urls.get(id); if (uri) URL.revokeObjectURL(uri); urls.delete(id);
}
