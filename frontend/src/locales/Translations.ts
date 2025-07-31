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

// deal with {{param}} in translations
function formatTranslation(template: string, params: Record<string, any>) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => params[key] ?? "");
}

// get translation by key
export function t(key: string, params?: Record<string, any>): string {
  const translation = key.split('.').reduce((obj, k) => obj?.[k], state.translations) ?? key;
  return params ? formatTranslation(translation, params) : translation;
}
