import { getTranslations } from './utils/translations.js';
import { renderGamePage } from './pages/Game.js';
import { state } from './state.js';

document.addEventListener('DOMContentLoaded', async () => {
  // TODO: translations by default will be in english. Apply switching to other languages later
  // TODO: populate state, watch for changes? (?)
  state.translations = await getTranslations(state.language);

  const app = document.getElementById('app');
  if (app) renderGamePage(app);
});
