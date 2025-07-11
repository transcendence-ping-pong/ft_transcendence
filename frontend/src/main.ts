import { getTranslations } from './utils/Translations.js';
import { state } from './state.js';
import { renderHome } from './pages/home.js';
import { renderLogin } from '@/pages/login.js';
import { renderGame } from '@/pages/game.js';
import '@/styles/index.css';
// import { getUsers } from './services/api.js';
import { io } from 'socket.io-client';

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

  const socket = io(`http://${window.location.hostname}:4001`);
  

  // web console logs
  socket.on('connect', () => {
    console.log('✅ Connected to backend WebSocket!');
    console.log('Socket ID:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('❌ Disconnected from backend WebSocket');
  });
  
  if (render && contentDiv) {
    render('app');
  } else if (contentDiv) {
    contentDiv.innerHTML = `<h1>404 Not Found</h1`;
  }


});
