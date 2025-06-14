import { BabylonCanvas } from './components/Game/BabylonCanvas.js';
import { BabylonGUI } from './utils/gameUtils/BabylonGUI.js';
// import GameCanvas for its type and to access its methods/control game state
import { GameCanvas } from './components/Game/GameCanvas.js';
import { GameLevel } from './utils/gameUtils/types.js';

export class AppController {
  private babylonCanvas: BabylonCanvas;
  private gui: BabylonGUI;
  private gameCanvas: GameCanvas;

  constructor(containerId: string) {
    this.babylonCanvas = new BabylonCanvas(containerId);
    // reference instance of GameCanvas being created/managed by BabylonCanvas
    this.gameCanvas = this.babylonCanvas.getGameCanvas();
    this.gui = new BabylonGUI(this.babylonCanvas.getScene());

    this.setupMenuFlow();
  }

  setupMenuFlow() {
    this.gui.showStartButton(() => {
      this.gui.showDifficultySelector((level) => {
        this.gameCanvas.setLevel(level as GameLevel);
        this.gui.showCountdown(3, () => {
          this.gameCanvas.startGame();
        });
      });
    });
  }

  // TODO CONCEPT: where to call it?
  cleanup() {
    this.babylonCanvas.cleanupGame();
  }
}
