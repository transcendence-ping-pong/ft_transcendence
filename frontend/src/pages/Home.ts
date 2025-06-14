import { BabylonCanvas } from '../game/BabylonCanvas.js';

export function renderHomePage(container: HTMLElement) {
  container.innerHTML = `
    <div id="game-canvas-container"></div>
    <div id="babylon-container" class="mb-8"></div>
  `;

  const babylon = new BabylonCanvas('babylon-container');
}
