import type { Settings } from './types';
import { fastModels, fastModel } from './modelPolicy.ts';
import { managedAI, managedApiUrl } from './betaConfig.ts';
export const providerNames = { local: 'Lokalnie na telefonie', openai: 'GPT / OpenAI', gemini: 'Gemini / Google', claude: 'Claude / Anthropic' };
export const defaultModels = fastModels;
export function migrateSettings(value: Partial<Settings> | null, apiUrl = ''): Settings {
  if (managedAI) return { apiUrl: managedApiUrl || apiUrl, token: '', provider: 'gemini', models: fastModels, geminiAccess: 'key', googleProject: '' };
  return { apiUrl: value?.apiUrl || apiUrl, token: value?.token || '', provider: value?.provider && Object.hasOwn(providerNames, value.provider) ? value.provider : 'local', models: { openai: fastModel('openai'), gemini: fastModel('gemini', value?.models?.gemini), claude: fastModel('claude') }, geminiAccess: value?.geminiAccess === 'google' ? 'google' : 'key', googleProject: typeof value?.googleProject === 'string' ? value.googleProject : '' };
}
