import { gameOrchestrator } from '@/game/gameOrchestrator.js';
import '@/components/GenericModal.js';
import '@/components/ThemeToggle.js';
import '@/components/LanguagesDropdown.js';
import '@/components/TopBar.js';

// TODO: THIS IS A MOCK, pass player names and avatars dynamically
const PLAYER_1 = { name: 'Alice', avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=alice' };
const PLAYER_2 = { name: 'Bob', avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=bob' };

// TODO FIX: use scale-100 if want to scale down border image
// remove 20px margin bottom from the border image?
export function renderGame(containerId: string) {
  document.body.classList.add('overflow-hidden'); // prevent scrolling

  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <top-bar mode="game">
        <img slot="player1-avatar" src="${PLAYER_1.avatar}" alt="${PLAYER_1.name}" />
        <p slot="player1-username">${PLAYER_1.name}</p>

        <img slot="logo-center" src="https://api.dicebear.com/7.x/pixel-art/svg?seed=octopus" alt="Logo" />
        <span slot="title-center">FOUR PING TWO PONG</span>

        <p slot="player2-username">${PLAYER_2.name}</p>
        <img slot="player2-avatar" src="${PLAYER_2.avatar}" alt="${PLAYER_2.name}" />
      </top-bar>

      <generic-modal dismissible="true" appear-delay="1000"></generic-modal>

      <div class="game-area relative w-screen h-screen">
        <div id="game-screen" class="absolute z-10" ></div>
        <img 
          src="/public/game-border.png" 
          alt="TV Frame"
          class="absolute top-0 left-0 w-full h-full z-20 pointer-events-none"
        />
      </div>
    `;

    new gameOrchestrator('game-screen');

    window.addEventListener('openSummary', (e: CustomEvent) => {
      console.log('openSummary event received', e.detail);
      const dropdown = document.querySelector('dynamic-dropdown') as any;
      if (dropdown) {
        dropdown.setDefaultSlotContent(false);
        dropdown.setOpen(true);
      }

      const gameArea = document.querySelector('.game-area') as HTMLElement;
      if (gameArea) {
        gameArea.classList.add('with-overlay');
      }
    });

    window.addEventListener('closeSummary', () => {
      const gameArea = document.querySelector('.game-area') as HTMLElement;
      if (gameArea) {
        gameArea.classList.remove('with-overlay');
      }
    });
  }
}

/*
OBSOLETE NAVIGATION BAR VERSION
<dynamic-dropdown>
  <navigation-cta slot="nav-buttons"></navigation-cta>
  <span slot="app-name">FOUR PING TWO PONG</span>
  <menu-navigation slot="default"></menu-navigation>
  <play-summary slot="summary"></play-summary>
</dynamic-dropdown>
*/