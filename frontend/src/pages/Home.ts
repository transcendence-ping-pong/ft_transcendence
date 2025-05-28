import { ThreeDCanvas } from '../components/Game/BabylonCanvas.js';

export function renderHomePage(container: HTMLElement) {
  container.innerHTML = `
    <h1 class="text-2xl font-bold mb-4">Home</h1>
    <div id="babylon-container" style="width:600px; height:400px; border:1px solid #ccc; margin-bottom: 1rem;"></div>
    <button id="go-game" class="px-4 py-2 bg-blue-500 text-white rounded">Go to Game</button>
  `;
  new ThreeDCanvas('babylon-container');
}
