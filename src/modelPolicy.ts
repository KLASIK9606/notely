// Shared by the phone and API so saved settings and server defaults agree.
export const fastModels = {
  openai: 'gpt-6-luna',
  gemini: 'gemini-3.5-flash-lite',
  claude: 'claude-haiku-5-5',
};
export function fastModel(provider: keyof typeof fastModels, saved?: string) {
  if (provider === 'gemini' && ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'].includes(saved || '')) return saved!;
  return fastModels[provider];
}
