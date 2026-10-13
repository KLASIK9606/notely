import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { createClient, processLock } from '@supabase/supabase-js';
import { chunkedAuthStorage } from './authStorage';
import { authCallbackCode, publicAuthConfig } from './accountPolicy';

WebBrowser.maybeCompleteAuthSession();
const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || '';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || '';
const validUrl = /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co\/?$/.test(url);
export const authConfigured = publicAuthConfig(url, key);
export const authProject = validUrl ? new URL(url).hostname.split('.')[0] : '';
export const expoGo = Platform.OS !== 'web' && Constants.appOwnership === 'expo';
const secureStorage = chunkedAuthStorage({
  getItem: SecureStore.getItemAsync,
  setItem: (name, value) => SecureStore.setItemAsync(name, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
  removeItem: SecureStore.deleteItemAsync,
});
// Web tokens stay in the current tab rather than permanent browser storage.
const webStorage = {
  getItem: async (name: string) => typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(name),
  setItem: async (name: string, value: string) => { sessionStorage.setItem(name, value); },
  removeItem: async (name: string) => { sessionStorage.removeItem(name); },
};
export const privateAuthStorage = Platform.OS === 'web' ? webStorage : secureStorage;
export const supabase = authConfigured ? createClient(url, key, { auth: {
  storage: Platform.OS === 'web' ? webStorage : secureStorage,
  persistSession: true, autoRefreshToken: true, detectSessionInUrl: Platform.OS === 'web', flowType: 'pkce',
  lock: processLock,
} }) : null;

export function authRedirect() {
  return Platform.OS === 'web' ? `${window.location.origin}/` : 'notely://auth/callback';
}
export async function finishAuth(value: string) {
  if (!supabase) throw new Error('Konta nie są jeszcze skonfigurowane.');
  const code = authCallbackCode(value, authRedirect());
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}
let oauthOpen = false;
export const browserAuthActive = () => oauthOpen;
export async function googleLogin(scopes?: string) {
  if (!supabase) throw new Error('Konta nie są jeszcze skonfigurowane.');
  if (expoGo) throw new Error('Logowanie Google na telefonie wymaga wersji deweloperskiej Notely. W Expo Go możesz użyć e-maila.');
  const redirectTo = authRedirect();
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web', ...(scopes ? { scopes } : {}), queryParams: { prompt: scopes ? 'consent select_account' : 'select_account' } } });
  if (error) throw error;
  if (Platform.OS === 'web') return;
  if (!data.url) throw new Error('Nie udało się otworzyć Google.');
  oauthOpen = true;
  try {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success') await finishAuth(result.url);
    else if (scopes) throw new Error('Połączenie Google anulowane.');
  } finally { oauthOpen = false; }
}
