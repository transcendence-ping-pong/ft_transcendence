import { BabylonCanvas } from '@/game/babylon/BabylonCanvas';
import { BabylonGUI } from '@/game/babylon/BabylonGUI.js';
// import GameCanvas for its type and to access its methods/control game state
import { GameCanvas } from '@/game/GameCanvas.js';
import { GameLevel, PlayerMode, VIRTUAL_WIDTH, VIRTUAL_HEIGHT, VIRTUAL_BORDER_X, VIRTUAL_BORDER_BOTTOM, VIRTUAL_BORDER_TOP } from '@/utils/gameUtils/GameConstants.js';
import { state } from '@/state';

/*
  Game Orchestrator responsabilities:
  - orchestrate the game flow (2D canvas game, Babylon.js scene, GUI)
  - start/stop/reset the game, switch scenes, etc. (?)
  - set up game scale factor based on the window size and virtual dimensions

  Do not:
  - handle low-level game logic, GUI logic, or user input directly
*/

export class gameOrchestrator {
  private babylonCanvas: BabylonCanvas;
  private gui: BabylonGUI;
  private gameCanvas: GameCanvas;
  private isTournament: boolean;
  // private gameManager: GameManager;
  // TODO CONCEPT: should we have a GameManager here?
  // instead of instantiating it in GameCanvas?

  constructor(containerId: string) {
    state.scaleFactor = this.getScaleFactor();
    this.babylonCanvas = new BabylonCanvas(containerId);
    this.gui = new BabylonGUI(this.babylonCanvas.getScene());

    const params = new URLSearchParams(window.location.search);
    this.isTournament = params.get('tournament') === '1';
    
    if (this.isTournament) {
      this.setupTournamentFlow();
    } else {
      this.setupMenuFlow();
    }

    this.babylonCanvas.startRenderLoop();

    // TODO FIX: when refreshing the page, resume the game from where it left off
    window.addEventListener('resize', () => {
      this.babylonCanvas.cleanupGame();
      state.scaleFactor = this.getScaleFactor();
      window.location.reload();
    });
  }

  getScaleFactor() {
    // calculate scale factor based on the virtual dimensions and the actual window size
    // this is used to scale the game objects, GUI, etc.
    const scaleX = window.innerWidth / VIRTUAL_WIDTH;
    const scaleY = window.innerHeight / VIRTUAL_HEIGHT;

    // margins, considering the game border image
    // scale it based on the virtual dimensions * scale factor
    const leftMargin = VIRTUAL_BORDER_X * scaleX;
    const rightMargin = VIRTUAL_BORDER_X * scaleX;
    const topMargin = VIRTUAL_BORDER_TOP * scaleY;
    const bottomMargin = VIRTUAL_BORDER_BOTTOM * scaleY;

    // set game area dimensions
    const gameAreaWidth = window.innerWidth - leftMargin - rightMargin;
    const gameAreaHeight = window.innerHeight - topMargin - bottomMargin;

    // set game position
    const gameAreaLeft = leftMargin;
    const gameAreaTop = topMargin;

    return {
      scaleX,
      scaleY,
      gameAreaWidth,
      gameAreaHeight,
      gameAreaLeft,
      gameAreaTop,
    };
  }

   private setupTournamentFlow() {
    this.babylonCanvas.createGameCanvas(GameLevel.MEDIUM, PlayerMode.TWO_PLAYER);
    this.gameCanvas = this.babylonCanvas.getGameCanvas();

    this.gui.showCountdown(3, () => {
      this.gameCanvas.startGame();
      this.gui.showScoreBoard({ LEFT: 0, RIGHT: 0 }, () => {});
    });

    this.gameCanvas.addEventListener('gameOver', (e: CustomEvent) => {
      const { winner, score } = e.detail;
      const winnerName = winner === 'LEFT' ? 'Player 1' : 'Player 2';
      const message = `${winnerName} Win!\nFinal Score: ${score.LEFT} x ${score.RIGHT}`;
      this.gui.showGameOver(winnerName, score);
    });
  }

  setupMenuFlow() {
    this.gui.showStartButton(() => {
      this.gui.showPlayerSelector((mode) => {
        this.gui.showDifficultySelector((level) => {
          this.babylonCanvas.createGameCanvas(level as GameLevel, mode as PlayerMode);
          this.gameCanvas = this.babylonCanvas.getGameCanvas();

          if (mode === PlayerMode.ONE_PLAYER) {
            this.gameCanvas.enableBotForPlayer(1);
          }


          this.gui.showCountdown(3, () => {
            this.gameCanvas.startGame();
            this.gui.showScoreBoard({ LEFT: 0, RIGHT: 0 }, () => {});
          });

          // this.gameCanvas.addEventListener('scoreChanged', (e: CustomEvent) => {
          //   console.log('Received scoreChanged', e.detail);
          //   this.gui.clearGUI();
          //   this.gui.showScoreBoard(e.detail, () => { });
          // });

          this.gameCanvas.addEventListener('gameOver', (e: CustomEvent) => {
            //console.log('Received gameOver', e.detail);
            const { winner, score } = e.detail;
            const winnerName = winner === 'LEFT' ? 'Player 1' : 'Player 2';
            const message = `$${winnerName} Win!\nFinal Score: ${score.LEFT} x ${score.RIGHT}`;

            this.gui.showGameOver(winnerName, score);

            // setTimeout(() => {
            //   this.gui.clearGUI();
            //   this.babylonCanvas.initPlaneMaterial();

            //   window.dispatchEvent(new CustomEvent('openSummary', {
            //     detail: { summary: true, match: e.detail }
            //   }));
            // }, 2000);
          });
        });
      });
    });
  }
}
