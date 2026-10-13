import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { accountStorageKey } from './accountPolicy';
import type { CloudProvider } from './types';
const providers: CloudProvider[] = ['openai', 'gemini', 'claude'];
export type ApiKeys = Record<CloudProvider, string>;
export async function readKeys(owner: string | null = null): Promise<ApiKeys> {
  const values = await Promise.all(providers.map(p => Platform.OS === 'web' ? Promise.resolve('') : SecureStore.getItemAsync(accountStorageKey(`notely.key.${p}`, owner))));
  return Object.fromEntries(providers.map((p, i) => [p, values[i] || ''])) as ApiKeys;
}
export async function saveKeys(keys: ApiKeys, owner: string | null = null) {
  if (Platform.OS === 'web') return; // Preview keys are kept only in React state.
  for (const p of providers) {
    if (keys[p].trim()) await SecureStore.setItemAsync(accountStorageKey(`notely.key.${p}`, owner), keys[p].trim(), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    else await SecureStore.deleteItemAsync(accountStorageKey(`notely.key.${p}`, owner));
  }
}
