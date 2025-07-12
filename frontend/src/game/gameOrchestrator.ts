import { BabylonCanvas } from '@/game/babylon/BabylonCanvas';
import { BabylonGUI } from '@/game/babylon/BabylonGUI.js';
// import GameCanvas for its type and to access its methods/control game state
import { GameCanvas } from '@/game/GameCanvas.js';
import { GameLevel, PlayerMode, VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '@/utils/gameUtils/Constants.js';
import { state } from '@/state';

/*
  Game Orchestrator responsabilities:
  - orchestrate the game flow (2D canvas game, Babylon.js scene, GUI)
  - start/stop/reset the game, switch scenes, etc. (?)

  Do not:
  - handle low-level game logic, GUI logic, or user input directly
*/

export class gameOrchestrator {
  private babylonCanvas: BabylonCanvas;
  private gui: BabylonGUI;
  private gameCanvas: GameCanvas;
  // private gameManager: GameManager;
  // TODO CONCEPT: should we have a GameManager here?
  // instead of instantiating it in GameCanvas?

  constructor(containerId: string) {
    const { scaleX, scaleY } = this.getScaleFactor();
    state.scaleFactor = { scaleX, scaleY };
    this.babylonCanvas = new BabylonCanvas(containerId);
    this.gui = new BabylonGUI(this.babylonCanvas.getScene());
    this.setupMenuFlow();

    this.babylonCanvas.startRenderLoop();
    // this.gui.showScoreBoard({ LEFT: 0, RIGHT: 0 }, () => { });

    // reference instance of GameCanvas being created/managed by BabylonCanvas
    // this.gameCanvas = this.babylonCanvas.getGameCanvas();

    window.addEventListener('resize', () => {
      const { scaleX, scaleY } = this.getScaleFactor();
      state.scaleFactor = { scaleX, scaleY };
    });
  }

  getScaleFactor() {
    const scaleX = window.innerWidth / VIRTUAL_WIDTH;
    const scaleY = window.innerHeight / VIRTUAL_HEIGHT;
    return { scaleX, scaleY };
  }

  setupMenuFlow() {
    this.gui.showStartButton(() => {
      this.gui.showPlayerSelector((mode) => {
        this.gui.showDifficultySelector((level) => {
          this.babylonCanvas.createGameCanvas(level as GameLevel, mode as PlayerMode);
          this.gameCanvas = this.babylonCanvas.getGameCanvas();

          this.gui.showCountdown(3, () => {
            this.gameCanvas.startGame();
            this.gui.showScoreBoard({ LEFT: 0, RIGHT: 0 }, () => { });
          });

          this.gameCanvas.addEventListener('scoreChanged', (e: CustomEvent) => {
            console.log('Received scoreChanged', e.detail);
            this.gui.clearGUI();
            this.gui.showScoreBoard(e.detail, () => { });
          });

          this.gameCanvas.addEventListener('gameOver', (e: CustomEvent) => {
            console.log('Received gameOver', e.detail);
            this.gui.clearGUI();
            this.babylonCanvas.endingGame();
          });
        });
      });
    });
  }
}

// THINK ABOUT IT
// this.gui.showGameOver(e.detail, () => {
//   this.babylonCanvas.cleanupGame();
//   this.setupMenuFlow(); // reset to main menu
// });
