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
import { websocketService } from "@/services/websocketService.js";
import '@/styles/index.css';
import '@babylonjs/loaders';
import { renderBracket } from '@/pages/tournament.js';

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
// import { getUsers } from './services/api.js';

const routes = {
  "/": renderHome,
  "/login": renderLogin,
  "/game": renderGame,
  "/profile/:username": renderProfile,
  "/tournament": renderBracket,
};

type NavigateFn = (path: string) => void;
export let navigate: NavigateFn;

notificationService.listen((notif) => {
  window.dispatchEvent(new CustomEvent("new-notification", { detail: notif }));
});

// TODO SOCKET: REMOVE MOCK
// startMockNotifications();

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const accessToken = params.get('accessToken');
  const refreshToken = params.get('refreshToken');
  const username = params.get('username');
  
  if (accessToken && refreshToken && username) {
    console.log('Google OAuth tokens detected, processing login...');
    
    const extractEmailFromToken = (token: string): string => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.email || '';
      } catch (error) {
        console.error('Error decoding token:', error);
        return '';
      }
    };
    
    const email = extractEmailFromToken(accessToken);
    
    // Store tokens in localStorage
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('loggedInUser', decodeURIComponent(username));
    localStorage.setItem('userEmail', email);
    
    state.userData = {
      username: decodeURIComponent(username),
      email: email,
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
    
    // Clean URL (remove tokens from address bar)
    window.history.replaceState({}, document.title, "/");
    
    window.dispatchEvent(new CustomEvent('login-success', { 
      bubbles: true, 
      composed: true,
      detail: { 
        username: decodeURIComponent(username), 
        email,
        accessToken, 
        refreshToken 
      } 
    }));
    
    console.log('Google OAuth login successful for:', decodeURIComponent(username));
  }

  // translations by default will be in english
  // TODO: populate state, watch for changes? (?)
  state.translations = await getTranslations(state.language);
  // set style theme according to toggle state
  document.body.classList.toggle('theme-primary', state.theme === 'primary');
  document.body.classList.toggle('theme-secondary', state.theme === 'secondary');

  navigate = initRouter(routes, 'app');

  window.addEventListener('login-success', () => {
    renderLoading('app'); 
    setTimeout(() => {
      navigate('/');
    }, 1200);
  });

  window.addEventListener('logout', () => {
    console.log('Logout event triggered, clearing user data...');
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('userEmail');
    
    state.userData = null;
    
    renderLoading('app');
    setTimeout(() => {
      navigate('/login');
    }, 1200);
    
    console.log('User logged out successfully');
  });

  window.addEventListener('languagechange', async (e: Event) => {
    const newLang = (e as CustomEvent).detail.language;
    state.translations = await getTranslations(newLang);

    const render = routes[window.location.pathname];

    if (render) render('app');
    window.location.reload(); // TODO: improve it, a full reload is not necessary (?)
  });

  // handle back/forward navigation - history API
  // https://developer.mozilla.org/en-US/docs/Web/API/History_API
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') window.history.back();
    if (e.key === 'ArrowRight') window.history.forward();
  });

  // connects to websocket server
  websocketService.connect(`http://${window.location.hostname}:4001`);
});
