import { GameCanvas } from '../components/Game/GameCanvas.js';

// TODO: type for translations(??)
export function renderGamePage(container: HTMLElement, t: any) {
  container.innerHTML = `
    <h1 class="text-2xl font-bold mb-4">${t.poc.boilerplate}</h1>
    <div id="game-canvas-container"></div>
  `;

  new GameCanvas('game-canvas-container');
}
