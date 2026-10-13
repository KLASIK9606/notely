import type { Session } from '@supabase/supabase-js';
import { authProject, expoGo, googleLogin, privateAuthStorage, supabase } from './auth';

const pendingKey = `gemini.pending.${authProject}`;
const connectionKey = (user: string) => `gemini.oauth.${authProject}.${user}`;
type Connection = { token: string; expiresAt: number; project: string };
let capture: Promise<void> = Promise.resolve();
export async function connectGoogleAI(project: string) {
  if (!supabase) throw new Error('Najpierw skonfiguruj konta Notely.');
  if (expoGo) throw new Error('Połączenie Google wymaga własnej wersji Notely. W Expo Go dostępny jest klucz API.');
  if (!/^(?:[a-z][a-z0-9-]{4,28}[a-z0-9]|[0-9]{6,20})$/.test(project)) throw new Error('Podaj identyfikator projektu Google Cloud.');
  await privateAuthStorage.setItem(pendingKey, JSON.stringify({ startedAt: Date.now(), project }));
  try { await googleLogin('https://www.googleapis.com/auth/generative-language.retriever'); }
  catch (error) { await privateAuthStorage.removeItem(pendingKey); throw error; }
}

// Called outside the Supabase auth callback's lock. Ordinary Google sign-in never
// grants Gemini access: only an explicit, recent connection attempt can save it.
export function captureGoogleAI(session: Session | null) {
  capture = capture.catch(() => {}).then(() => saveConnection(session));
  return capture;
}
async function saveConnection(session: Session | null) {
  if (!session?.provider_token || !session.user.identities?.some(i => i.provider === 'google')) return;
  const saved = await privateAuthStorage.getItem(pendingKey);
  if (!saved) return;
  const pending = JSON.parse(saved);
  if (!Number.isFinite(pending.startedAt) || Date.now() - pending.startedAt < 0 || Date.now() - pending.startedAt > 10 * 60 * 1000 || typeof pending.project !== 'string') { await privateAuthStorage.removeItem(pendingKey); return; }
  await privateAuthStorage.setItem(connectionKey(session.user.id), JSON.stringify({ token: session.provider_token, expiresAt: Date.now() + 55 * 60 * 1000, project: pending.project } satisfies Connection));
  await privateAuthStorage.removeItem(pendingKey);
}
export async function googleAIAccess(): Promise<Connection | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  await capture;
  const saved = await privateAuthStorage.getItem(connectionKey(data.session.user.id));
  if (!saved) return null;
  let value; try { value = JSON.parse(saved); } catch { return null; }
  if (typeof value.token !== 'string' || !value.token || !Number.isFinite(value.expiresAt) || value.expiresAt <= Date.now()) return null;
  return value;
}
export async function disconnectGoogleAI(user?: string) {
  await capture.catch(() => {});
  if (user) await privateAuthStorage.removeItem(connectionKey(user));
  await privateAuthStorage.removeItem(pendingKey);
}
export async function disconnectCurrentGoogleAI() {
  const user = supabase ? (await supabase.auth.getSession()).data.session?.user.id : undefined;
  await disconnectGoogleAI(user);
}
