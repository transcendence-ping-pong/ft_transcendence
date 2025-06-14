import { AppController } from './appController.js';
import { getTranslations } from './utils/Translations.js';
import { state } from './state.js';

document.addEventListener('DOMContentLoaded', async () => {
  // TODO: translations by default will be in english. Apply switching to other languages later
  // TODO: populate state, watch for changes? (?)
  state.language = 'fr';
  state.translations = await getTranslations(state.language);
  const controller = new AppController('app'); // pass container id
});