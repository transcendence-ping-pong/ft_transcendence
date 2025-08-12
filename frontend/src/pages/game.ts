import { gameOrchestrator } from '@/game/gameOrchestrator.js';
import '@/components/TopBar.js';
import '@/components/GenericModal.js';
import '@/components/CreateTournament.js';
import '@/components/ViewTournament.js';

// TODO: THIS IS A MOCK, pass player names and avatars dynamically
const PLAYER_1 = { name: 'Alice', avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=alice' };
const PLAYER_2 = { name: 'Bob', avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=bob' };

// TODO FIX: use scale-100 if want to scale down border image
// remove 20px margin bottom from the border image?
export function renderGame(containerId: string) {
  document.body.classList.add('overflow-hidden'); // prevent scrolling

  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <top-bar mode="game">
      <img slot="player1-avatar" src="${PLAYER_1.avatar}" alt="${PLAYER_1.name}" />
      <p slot="player1-username">${PLAYER_1.name}</p>

      <img slot="logo-center" src="https://api.dicebear.com/7.x/pixel-art/svg?seed=octopus" alt="Logo" />
      <span slot="title-center">FOUR PING TWO PONG</span>

      <p slot="player2-username">${PLAYER_2.name}</p>
      <img slot="player2-avatar" src="${PLAYER_2.avatar}" alt="${PLAYER_2.name}" />
    </top-bar>

    <div class="game-area relative w-screen h-screen">
      <div id="game-screen" class="absolute z-10"></div>
      <img 
        src="/public/game-border.png" 
        alt="TV Frame"
        class="absolute top-0 left-0 w-full h-full z-20 pointer-events-none"
      />
    </div>
  `;

  new gameOrchestrator('game-screen');

  // insertAdjacentHTML method uses specified input as HTML...
  // ...and inserts the resulting nodes into the DOM tree at a specified position
  window.addEventListener('openTournamentConfig', () => {
    container.insertAdjacentHTML('beforeend', `
      <generic-modal dismissible="true" appear-delay="500">
        <div slot="body" class="w-full h-full min-h-full flex justify-center items-center" id="tournament-modal-content"></div>
      </generic-modal>
    `);

    const content = container.querySelector('#tournament-modal-content');
    if (!content) return;

    showTournamentConfig();

    function showTournamentConfig() {
      content.innerHTML = '';
      const el = document.createElement('create-tournament');
      el.addEventListener('tournament-created', (e: CustomEvent) => {
        showSpinner();
        setTimeout(() => showTournamentView(e.detail.matches), 1200);
      });
      content.appendChild(el);
    }

    function showSpinner() {
      content.innerHTML = `
        <div class="w-12 h-12 border-8 border-[var(--loading)] border-t-[var(--accent-tertiary)] rounded-full animate-spin"></div>
      `;
    }

    function showTournamentView(matches: Array<{ player1: string, player2: string }>) {
      content.innerHTML = '';
      const view = document.createElement('view-tournament');
      (view as any).matchesData = matches;
      content.appendChild(view);
    }
  });
}
