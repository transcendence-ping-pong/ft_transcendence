import { gameOrchestrator } from '@/game/gameOrchestrator.js';
import '@/components/ThemeToggle.js'; // This registers <toggle-switch>
import '@/components/DynamicDropdown.js';
import '@/components/MenuNavigation.js';

export function renderGame(containerId: string) {
  new gameOrchestrator(containerId);
}
