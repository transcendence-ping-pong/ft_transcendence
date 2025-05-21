// TODO: if we decide to show different languages,
// fetch from backend, returns json format(?)
// for now, detach the translations from the code, use a simple object

// english language as default
export async function getTranslations(lang = 'en') {
  const res = await fetch(`../locales/${lang}.json`);
  return await res.json();
}
