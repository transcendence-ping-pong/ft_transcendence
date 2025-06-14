import { AppController } from './appController.js';
import { getTranslations } from './utils/Translations.js';
import { state } from './state.js';
import { getUsers } from './services/api.js';

document.addEventListener('DOMContentLoaded', async () => {
  // TODO: translations by default will be in english. Apply switching to other languages later
  // TODO: populate state, watch for changes? (?)
  state.language = 'fr';
  state.translations = await getTranslations(state.language);
  const controller = new AppController('app'); // pass container id

  try {
    const users = await getUsers();
    const h1 = document.createElement('h1');
    h1.textContent = 'Users: ' + users.map(u => u.name).join(', ');
    document.body.prepend(h1);
  } catch (err) {
    const h1 = document.createElement('h1');
    h1.textContent = 'Failed to fetch users';
    document.body.prepend(h1);
  }
});
