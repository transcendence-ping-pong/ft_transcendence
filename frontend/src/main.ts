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
import { remoteMultiplayerManager } from "@/multiplayer/RemoteMultiplayerManager.js";
import '@/styles/index.css';
import '@babylonjs/loaders';
import { renderBracket } from '@/pages/tournament.js';
// chat system
import { ChatPanel } from '@/chat/index.js';

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

// // initialize chat system
function initializeChatSystem() {
  // create only the chat panel (button is now in TopBar)
  const chatPanel = new ChatPanel();

  // add to body so it's always available
  document.body.appendChild(chatPanel);

  console.log('Chat system initialized');
}

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

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('loggedInUser', decodeURIComponent(username));
    localStorage.setItem('userEmail', email);
    localStorage.setItem('loginMethod', 'google');

    state.userData = {
      username: decodeURIComponent(username),
      email: email,
      accessToken: accessToken,
      refreshToken: refreshToken,
    };

    await loadUserProfile();

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
  } else {
    const existingToken = localStorage.getItem('accessToken');
    const existingUsername = localStorage.getItem('loggedInUser');
    const existingEmail = localStorage.getItem('userEmail');

    if (existingToken && existingUsername && existingEmail) {
      console.log('Loading existing user session...');

      let loginMethod = localStorage.getItem('loginMethod');
      if (!loginMethod) {
        loginMethod = 'regular';
        localStorage.setItem('loginMethod', 'regular');
      }

      state.userData = {
        username: existingUsername,
        email: existingEmail,
        accessToken: existingToken,
        refreshToken: localStorage.getItem('refreshToken') || '',
      };

      await loadUserProfile();
    }
  }

  // translations by default will be in english
  // TODO: populate state, watch for changes? (?)
  state.translations = await getTranslations(state.language);
  // set style theme according to toggle state
  document.body.classList.toggle('theme-primary', state.theme === 'primary');
  document.body.classList.toggle('theme-secondary', state.theme === 'secondary');

  // connects to websocket server
  websocketService.connect(`ws://${window.location.hostname}:4001`);

  navigate = initRouter(routes, 'app');


  // Make websocketService available globally for chat system
  (window as any).websocketService = websocketService;
  (window as any).remoteMultiplayerManager = remoteMultiplayerManager;

  // websocketAuthenticated is handled for UI feedback elsewhere; no socket connects here


  window.addEventListener('login-success', () => {
    renderLoading('app');
    setTimeout(() => {
      navigate('/');
    }, 1200);
  });

  // Connect RemoteMultiplayerManager when user logs in
  window.addEventListener('login-success', () => {
    const username = state.userData?.username;
    if (username) {
      remoteMultiplayerManager.connect(username);
    }
  });

  // Connect RemoteMultiplayerManager if user is already logged in
  const loggedInUser = localStorage.getItem('loggedInUser');
  if (loggedInUser) {
    remoteMultiplayerManager.connect(loggedInUser);
  }

  // initialize chat system
  initializeChatSystem();


  window.addEventListener('login-success', async (e: CustomEvent) => {
    if (state.userData && !localStorage.getItem('accessToken')) {
      localStorage.setItem('accessToken', state.userData.accessToken);
      localStorage.setItem('refreshToken', state.userData.refreshToken);
      localStorage.setItem('loggedInUser', state.userData.username);
      localStorage.setItem('userEmail', state.userData.email);
      localStorage.setItem('loginMethod', 'regular');

      await loadUserProfile();
    }

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
    localStorage.removeItem('loginMethod');

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

});

// @ts-ignore
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

async function loadUserProfile() {
  try {
    let token = localStorage.getItem('accessToken');
    if (!token) return;

    console.log('Loading user profile data...');
    let response = await fetch(`${BASE_URL}/current-user`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 404) {
      console.log('User not found in database, clearing cache and redirecting to login');
      clearCacheAndRedirectToLogin();
      return;
    }

    if (response.status === 401 || response.status === 403) {
      console.log('Token expired, attempting refresh...');

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        console.log('No refresh token, redirecting to login');
        clearCacheAndRedirectToLogin();
        return;
      }

      try {
        const refreshResponse = await fetch(`${BASE_URL}/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: refreshToken })
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          localStorage.setItem('accessToken', refreshData.accessToken);
          if (refreshData.refreshToken) {
            localStorage.setItem('refreshToken', refreshData.refreshToken);
          }
          response = await fetch(`${BASE_URL}/current-user`, {
            headers: {
              'Authorization': `Bearer ${refreshData.accessToken}`
            }
          });

          if (!response.ok) {
            console.log('Still failed after refresh, redirecting to login');
            clearCacheAndRedirectToLogin();
            return;
          }
        } else {
          console.log('Token refresh failed, redirecting to login');
          clearCacheAndRedirectToLogin();
          return;
        }
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
        clearCacheAndRedirectToLogin();
        return;
      }
    }

    if (response.ok) {
      const userData = await response.json();
      console.log('Loaded user profile:', userData);

      state.userData = {
        ...state.userData,
        ...userData
      };

      console.log('Updated state.userData with profile data');
    } else {
      console.log('Failed to load user profile, redirecting to login');
      clearCacheAndRedirectToLogin();
    }
  } catch (error) {
    console.error('Failed to load user profile:', error);
    clearCacheAndRedirectToLogin();
  }
}

function clearCacheAndRedirectToLogin() {
  localStorage.clear();
  state.userData = null;
  if (typeof navigate === 'function') navigate('/login');
  else window.location.assign('/login');
}


export async function makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
  let accessToken = state.userData?.accessToken || localStorage.getItem('accessToken');
  const refreshToken = state.userData?.refreshToken || localStorage.getItem('refreshToken');

  if (!accessToken) {
    throw new Error('No access token available');
  }

  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (response.status === 401 || response.status === 403) {
    console.log(`Request failed with ${response.status}, attempting token refresh...`);

    if (refreshToken) {
      try {
        const refreshResult = await refreshAccessToken(refreshToken);

        if (refreshResult.accessToken) {
          console.log('Token refreshed successfully, retrying request...');

          if (state.userData) {
            state.userData.accessToken = refreshResult.accessToken;
          }
          localStorage.setItem('accessToken', refreshResult.accessToken);
          accessToken = refreshResult.accessToken;

          response = await fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (response.status === 401 || response.status === 403) {
            console.log('Request still failed after token refresh, logging out...');
            logoutUser();
            throw new Error('Session expired, please log in again');
          }
        } else {
          console.log('Token refresh failed, logging out...');
          logoutUser();
          throw new Error('Session expired, please log in again');
        }
      } catch (error) {
        console.log('Error during token refresh, logging out...');
        logoutUser();
        throw new Error('Session expired, please log in again');
      }
    } else {
      console.log('No refresh token available, logging out...');
      logoutUser();
      throw new Error('Session expired, please log in again');
    }
  }

  return response;
}

function logoutUser() {
  state.userData = null;
  localStorage.clear();
  window.dispatchEvent(new CustomEvent('logout', { bubbles: true, composed: true }));
}

async function refreshAccessToken(refreshToken: string): Promise<any> {
  try {
    console.log('Attempting to refresh access token...');
    const res = await fetch(`${BASE_URL}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: refreshToken }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Token refresh failed');
    }

    const data = await res.json();
    console.log('Token refresh successful');
    return data;
  } catch (error: any) {
    console.error('Token refresh error:', error);
    return { error: error.message || 'Token refresh failed' };
  }
}
