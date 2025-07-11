import { state } from '../state.js';

// TODO CONCEPT: if we decide to show different languages,
// fetch from backend, returns json format(?)
// for now, detach the translations from the code, use a simple object

export async function getTranslations(lang: string | undefined) {
  const res = await fetch('../locales/locales.json');
  const allTranslations = await res.json();
  state.language = lang;
  state.availableLanguages = Object.keys(allTranslations);
  return allTranslations[lang] || allTranslations["GB"];
}

// get translation by key
export function t(key: string): string {
  return key.split('.').reduce((obj, k) => obj?.[k], state.translations) ?? key;
}
