import { gameOrchestrator } from '@/game/gameOrchestrator.js';
import '@/components/DynamicDropdown.js';
import '@/components/MenuNavigation.js';
import '@/components/NavigationCta.js';
import '@/components/PlaySummary.js';
import '@/components/RadialNav.js';

// TODO FIX: use scale-100 if want to scale down border image
// remove 20px margin bottom from the border image?
export function renderGame(containerId: string) {
  document.body.classList.add('overflow-hidden'); // prevent scrolling

  const container = document.getElementById(containerId);
  if (container) {
    const nav = [
      { "id": "nav-settings", "icon": "settings", "label": "Settings", "action": "settings", "path": "/settings" },
      { "id": "nav-game", "icon": "game", "label": "Game", "action": "game", "path": "/game" },
      { "id": "nav-logout", "icon": "logout", "label": "Logout", "action": "logout", "path": "/logout" },
      { "id": "nav-ranking", "icon": "ranking", "label": "Ranking", "action": "ranking", "path": "/ranking" }
    ];

    container.innerHTML = `
      <div class="game-area relative w-screen h-screen">
        <radial-nav nav='${JSON.stringify(nav)}'>
          <img slot="logo" src="/logo.png" alt="Logo" />
        </radial-nav>

        <dynamic-dropdown>
          <navigation-cta slot="nav-buttons"></navigation-cta>
          <span slot="app-name">FOUR PING TWO PONG</span>
          <menu-navigation slot="default"></menu-navigation>
          <play-summary slot="summary"></play-summary>
        </dynamic-dropdown>
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