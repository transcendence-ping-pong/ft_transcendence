import { state } from '../state.js';
import { GameCanvas } from '../components/Game/GameCanvas.js';
// import { getTranslations } from '../utils/translations.js';

// TODO: type for translations(??)
export function renderGamePage(container: HTMLElement) {
  const t = state.translations;
  container.innerHTML = `
    <h1 class="text-2xl font-bold mb-4">${t.poc.boilerplate}</h1>
    <div id="game-canvas-container"></div>
  `;

  new GameCanvas('game-canvas-container');
}

// TODO: add language switch logic. this is a temporary experiment
// document.getElementById('lang-switch')?.addEventListener('click', async () => {
//   state.language = state.language === 'en' ? 'fr' : 'en';
//   state.translations = await getTranslations(state.language);
//   renderGamePage(container);
// });
