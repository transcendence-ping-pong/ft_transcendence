import { BabylonCanvas } from '../components/Game/BabylonCanvas.js';

export function renderHomePage(container: HTMLElement) {
  container.innerHTML = `
    <h1 class="text-2xl font-bold mb-4">Home</h1>
    <div id="babylon-container" class="mb-8"></div>
  `;
  new BabylonCanvas('babylon-container');
}
