export const translationLanguages = { pl: 'Polski', en: 'Angielski', es: 'Hiszpański', de: 'Niemiecki', fr: 'Francuski', it: 'Włoski' };
export type TranslationLanguage = keyof typeof translationLanguages;
export type TranslationOptions = { targetLanguage?: TranslationLanguage; context?: string };
