import { createClient } from '@supabase/supabase-js';

export function betaVerifier(url, key) {
  if (!url || !key) throw new Error('Tryb beta wymaga SUPABASE_URL i SUPABASE_PUBLISHABLE_KEY.');
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(10000) }) },
  });
  return async token => {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user || data.user.is_anonymous) return null;
    return data.user.id;
  };
}
