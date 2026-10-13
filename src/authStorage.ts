type Store = { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void>; removeItem: (key: string) => Promise<void> };
type Manifest = { generation: string; count: number };
const parse = (value: string | null): Manifest | null => {
  if (!value) return null;
  const data = JSON.parse(value);
  if (typeof data?.generation !== 'string' || !/^[a-z0-9-]+$/.test(data.generation) || !Number.isInteger(data.count) || data.count < 1 || data.count > 256) throw new Error('Nieprawidłowy zapis sesji.');
  return data;
};

/** Commit the manifest only after all chunks are written; failed writes retain the old session. */
export function chunkedAuthStorage(store: Store) {
  const base = (key: string) => `notely.auth.${key.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const clean = async (key: string, manifest: Manifest | null) => {
    if (manifest) await Promise.all(Array.from({ length: manifest.count }, (_, i) => store.removeItem(`${key}.${manifest.generation}.${i}`)));
  };
  return {
    async getItem(key: string) {
      const root = base(key); const manifest = parse(await store.getItem(root));
      if (!manifest) return null;
      const values = await Promise.all(Array.from({ length: manifest.count }, (_, i) => store.getItem(`${root}.${manifest.generation}.${i}`)));
      if (values.some(value => value === null)) throw new Error('Niepełny zapis sesji.');
      return values.join('');
    },
    async setItem(key: string, value: string) {
      // 400 UTF-16 units keep even non-ASCII chunks below SecureStore's 2 KB limit.
      const root = base(key); const previous = parse(await store.getItem(root));
      const generation = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      const characters = Array.from(value);
      const count = Math.max(1, Math.ceil(characters.length / 400));
      if (count > 256) throw new Error('Sesja jest zbyt duża.');
      const next = { generation, count };
      try {
        for (let i = 0; i < count; i++) await store.setItem(`${root}.${generation}.${i}`, characters.slice(i * 400, (i + 1) * 400).join(''));
        await store.setItem(root, JSON.stringify(next));
      } catch (error) { await clean(root, next).catch(() => {}); throw error; }
      await clean(root, previous).catch(() => {});
    },
    async removeItem(key: string) {
      const root = base(key); const previous = parse(await store.getItem(root));
      await store.removeItem(root); await clean(root, previous);
    },
  };
}
