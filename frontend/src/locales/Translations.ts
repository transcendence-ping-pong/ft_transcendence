import { state } from '../state.js';

// for now, detach the translations from the code, use a simple object
// persist language in localStorage (a.k.a state)
export async function getTranslations(lang: string | undefined) {
  const res = await fetch('../locales/locales.json');
  const errorRes = await fetch('../locales/errorLocales.json');
  const allTranslations = await res.json();
  const errorTranslations = await errorRes.json();
  state.language = lang;
  state.availableLanguages = Object.keys(allTranslations);
  state.errorTranslations = errorTranslations[lang] || errorTranslations["GB"];
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

export function err(code: string): string {
  console.log(state.errorTranslations);
  return state.errorTranslations?.[code] || code;
}
