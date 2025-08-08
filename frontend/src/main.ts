import { getTranslations } from './locales/Translations.js';
import { state } from './state.js';
import { renderHome } from './pages/home.js';
import { renderLogin } from '@/pages/login.js';
import { renderGame } from '@/pages/game.js';
import { renderProfile } from '@/pages/profile.js';
import { renderLoading } from '@/pages/loading.js';
import { initRouter } from '@/utils/Router.js';
import { notificationService } from "@/services/notificationService";
import { startMockNotifications } from "@/services/mockNotifications.js";
import '@/styles/index.css';
import '@babylonjs/loaders';

/*
  Main responsabilities:
  - initialize the application
  - set up global event listeners (e.g. for language changes)
  - manage routing and rendering of pages (using a router util)
  - handle global state management (e.g. theme, language)

  Do not:
  - handle low-level game logic, GUI logic, or user input directly
  - manage specific game scenes or components directly
  - handle user authentication or session management directly
*/

const routes = {
  "/": renderHome,
  "/login": renderLogin,
  "/game": renderGame,
  "/profile/:username": renderProfile,
};

type NavigateFn = (path: string) => void;
export let navigate: NavigateFn;

// listen for notifications and show them in UI
notificationService.listen((notif) => {
  window.dispatchEvent(new CustomEvent("new-notification", { detail: notif }));
});

// TODO SOCKET: REMOVE MOCK
startMockNotifications();

document.addEventListener('DOMContentLoaded', async () => {
  // translations by default will be in english
  // TODO: populate state, watch for changes? (?)
  state.translations = await getTranslations(state.language);
  // set style theme according to toggle state
  document.body.classList.toggle('theme-primary', state.theme === 'primary');
  document.body.classList.toggle('theme-secondary', state.theme === 'secondary');

  navigate = initRouter(routes, 'app');

  window.addEventListener('login-success', () => {
    renderLoading('app'); // render loading state, transition between pages
    setTimeout(() => {
      navigate('/');
    }, 1200);
  });

  window.addEventListener('languagechange', async (e: Event) => {
    const newLang = (e as CustomEvent).detail.language;
    state.translations = await getTranslations(newLang);

    const render = routes[window.location.pathname];
    if (render) render('app');
  });

  // handle back/forward navigation - history API
  // https://developer.mozilla.org/en-US/docs/Web/API/History_API
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') window.history.back();
    if (e.key === 'ArrowRight') window.history.forward();
  });
});
