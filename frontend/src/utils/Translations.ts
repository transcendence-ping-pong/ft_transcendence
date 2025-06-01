import { state } from '../state.js';

// TODO CONCEPT: if we decide to show different languages,
// fetch from backend, returns json format(?)
// for now, detach the translations from the code, use a simple object

export async function getTranslations(lang: string) {
  const res = await fetch(`../locales/${lang}.json`);
  return await res.json();
}
