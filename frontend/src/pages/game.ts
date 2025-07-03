import { gameOrchestrator } from '@/game/gameOrchestrator.js';
import '@/components/ThemeToggle.js'; // This registers <toggle-switch>
import '@/components/DynamicDropdown.js';
import '@/components/MenuNavigation.js';

export function renderGame(containerId: string) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="flex flex-col justify-center items-center gap-4">
        <dynamic-dropdown>
          <user-login></user-login>
        </dynamic-dropdown>
      </div>
    `;

    new gameOrchestrator(containerId);
  }
}