import { getTranslations } from './utils/translations.js';
import { renderGamePage } from './pages/Game.js';

document.addEventListener('DOMContentLoaded', async () => {
  // TODO: translations by default will be in english. Apply switching to other languages later
  const translations = await getTranslations();
  const app = document.getElementById('app');
  if (app) renderGamePage(app, translations);
});
