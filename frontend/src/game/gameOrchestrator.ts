import { BabylonCanvas } from '@/game/babylon/BabylonCanvas';
import { BabylonGUI } from '@/game/babylon/BabylonGUI.js';
// import GameCanvas for its type and to access its methods/control game state
import { GameCanvas } from '@/game/GameCanvas.js';
import { GameLevel, GameScore } from '@/utils/gameUtils/types.js';

export class gameOrchestrator {
  private babylonCanvas: BabylonCanvas;
  private gui: BabylonGUI;
  private gameCanvas: GameCanvas;

  constructor(containerId: string) {
    this.babylonCanvas = new BabylonCanvas(containerId);
    // reference instance of GameCanvas being created/managed by BabylonCanvas
    this.gameCanvas = this.babylonCanvas.getGameCanvas();
    this.gui = new BabylonGUI(this.babylonCanvas.getScene());

    this.setupMenuFlow();
    this.babylonCanvas.startRenderLoop();
  }

  setupMenuFlow() {
    this.gui.showStartButton(() => {
      this.gui.showDifficultySelector((level) => {
        this.gameCanvas.setLevel(level as GameLevel);
        this.gui.showCountdown(3, () => {
          this.gameCanvas.startGame();
          this.gui.showScoreBoard({ [GameScore.LEFT]: 1, [GameScore.RIGHT]: 0 }, () => { });
        });
      });
    });
  }

  // TODO CONCEPT: where to call it?
  cleanup() {
    this.babylonCanvas.cleanupGame();
  }
}
