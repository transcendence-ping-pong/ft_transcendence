import { gameOrchestrator } from '@/game/gameOrchestrator.js';

export function renderGame(containerId: string) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = ``;

    const controller = new gameOrchestrator(containerId);
  }
}