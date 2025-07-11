import { getTranslations } from './locales/Translations.js';
import { state } from './state.js';
import { renderHome } from './pages/home.js';
import { renderLogin } from '@/pages/login.js';
import { renderGame } from '@/pages/game.js';
import '@/styles/index.css';
import '@babylonjs/loaders';

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
  // In your main entry file, after loading state:
  document.body.classList.toggle('theme-primary', state.theme === 'primary');
  document.body.classList.toggle('theme-secondary', state.theme === 'secondary');
  let contentDiv = document.getElementById('app');
  const render = routes[window.location.pathname];
  if (render && contentDiv) {
    render('app');
  } else if (contentDiv) {
    contentDiv.innerHTML = `<h1>404 Not Found</h1`;
  }

  window.addEventListener('languagechange', async (e: Event) => {
    const newLang = (e as CustomEvent).detail.language;
    state.translations = await getTranslations(newLang);
    const render = routes[window.location.pathname];
    if (render && contentDiv) {
      render('app');
    }
  })
});