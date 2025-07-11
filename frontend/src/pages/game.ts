import { gameOrchestrator } from '@/game/gameOrchestrator.js';
import '@/components/ThemeToggle.js'; // This registers <toggle-switch>
import '@/components/DynamicDropdown.js';
import '@/components/MenuNavigation.js';

// TODO FIX: use scale-100 if want to scale down border image
// remove 20px margin bottom from the border image?
export function renderGame(containerId: string) {
  document.body.classList.add('overflow-hidden'); // prevent scrolling

  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="game-area">
        <div id="game-screen" class="absolute inset-0 mt-[100px] mb-[120px] mx-[100px]  z-10"></div>
        <img 
          src="/public/game-border.png" 
          alt="TV Frame"
          class="absolute top-0 left-0 w-full h-full z-20 pointer-events-none"
        />
      </div>
    `;
    new gameOrchestrator('game-screen');
  }
}