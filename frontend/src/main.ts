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
startMockNotifications();

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
    localStorage.setItem('loginMethod', 'google');
    
    state.userData = {
      username: decodeURIComponent(username),
      email: email,
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
    
    // ADD THIS: Load user profile data including avatar
    await loadUserProfile();
    
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
  } else {
    // ADD THIS: Also load profile for existing users (on page refresh)
    const existingToken = localStorage.getItem('accessToken');
    const existingUsername = localStorage.getItem('loggedInUser');
    const existingEmail = localStorage.getItem('userEmail');
    
    if (existingToken && existingUsername && existingEmail) {
      console.log('Loading existing user session...');
      
      // Check if loginMethod exists, if not default to 'regular'
      let loginMethod = localStorage.getItem('loginMethod');
      if (!loginMethod) {
        // For existing users without loginMethod, assume regular login
        loginMethod = 'regular';
        localStorage.setItem('loginMethod', 'regular');
      }
      
      state.userData = {
        username: existingUsername,
        email: existingEmail,
        accessToken: existingToken,
        refreshToken: localStorage.getItem('refreshToken') || '',
      };
      
      // Load user profile data including avatar
      await loadUserProfile();
    }
  }

  // translations by default will be in english
  // TODO: populate state, watch for changes? (?)
  state.translations = await getTranslations(state.language);
  // set style theme according to toggle state
  document.body.classList.toggle('theme-primary', state.theme === 'primary');
  document.body.classList.toggle('theme-secondary', state.theme === 'secondary');

  navigate = initRouter(routes, 'app');

  window.addEventListener('login-success', async (e: CustomEvent) => {
    // Check if this is a regular login (not Google OAuth)
    if (state.userData && !localStorage.getItem('accessToken')) {
        // Store tokens for regular login
        localStorage.setItem('accessToken', state.userData.accessToken);
        localStorage.setItem('refreshToken', state.userData.refreshToken);
        localStorage.setItem('loggedInUser', state.userData.username);
        localStorage.setItem('userEmail', state.userData.email);
        localStorage.setItem('loginMethod', 'regular');
        
        // Load user profile data
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

// ADD THIS FUNCTION: Load user profile data
async function loadUserProfile() {
  try {
    let token = localStorage.getItem('accessToken');
    if (!token) return;

    console.log('Loading user profile data...');
    
    // First, try the request with current token
    let response = await fetch('/api/current-user', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // If token expired (401), try to refresh it automatically
    if (response.status === 401) {
      console.log('Token expired, attempting automatic refresh...');
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        console.log('No refresh token, logging out...');
        window.dispatchEvent(new CustomEvent('logout'));
        return;
      }

      try {
        const refreshResponse = await fetch('/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: refreshToken })
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          
          // Update stored tokens
          localStorage.setItem('accessToken', refreshData.accessToken);
          if (refreshData.refreshToken) {
            localStorage.setItem('refreshToken', refreshData.refreshToken);
          }
          
          console.log('Token refreshed successfully, retrying request...');
          
          // Retry the original request with new token
          response = await fetch('/api/current-user', {
            headers: {
              'Authorization': `Bearer ${refreshData.accessToken}`
            }
          });
        } else {
          console.log('Token refresh failed, logging out...');
          window.dispatchEvent(new CustomEvent('logout'));
          return;
        }
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
        window.dispatchEvent(new CustomEvent('logout'));
        return;
      }
    }

    if (response.ok) {
      const userData = await response.json();
      console.log('Loaded user profile:', userData);
      
      // Update state with fetched data including avatar
      state.userData = {
        ...state.userData,
        ...userData
      };
      
      console.log('Updated state.userData with avatar:', state.userData.avatar);
    } else {
      console.log('Failed to load user profile after token refresh');
    }
  } catch (error) {
    console.error('Failed to load user profile:', error);
  }
}

// Add this helper function for all API calls:
async function makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
  let token = localStorage.getItem('accessToken');
  if (!token) {
    throw new Error('No access token available');
  }

  // Make the request
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });

  // If token expired, try to refresh automatically
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      window.dispatchEvent(new CustomEvent('logout'));
      throw new Error('Token expired and no refresh token available');
    }

    try {
      const refreshResponse = await fetch('/api/token', {
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

        // Retry original request with new token
        response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${refreshData.accessToken}`
          }
        });
      } else {
        window.dispatchEvent(new CustomEvent('logout'));
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      window.dispatchEvent(new CustomEvent('logout'));
      throw error;
    }
  }

  return response;
}

export { makeAuthenticatedRequest };
