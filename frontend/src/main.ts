import { getTranslations } from './utils/Translations.js';
import { state } from './state.js';
import { renderHome } from './pages/home.js';
import { renderLogin } from '@/pages/login.js';
import { renderGame } from '@/pages/game.js';
import '@/styles/index.css';

// import { getUsers } from './services/api.js';

const routes = {
  "/": renderHome,
  "/login": renderLogin,
  "/game": renderGame,
};

document.addEventListener('DOMContentLoaded', async () => {
  // TODO: translations by default will be in english. Apply switching to other languages later
  // TODO: populate state, watch for changes? (?)
  state.translations = await getTranslations(state.language);
  let contentDiv = document.getElementById('app');
  const render = routes[window.location.pathname];
  if (render && contentDiv) {
    render('app');
  } else if (contentDiv) {
    contentDiv.innerHTML = `<h1>404 Not Found</h1`;
  }
});
