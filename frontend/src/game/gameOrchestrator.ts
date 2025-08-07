import { BabylonCanvas } from '@/game/babylon/BabylonCanvas';
import { BabylonGUI } from '@/game/babylon/BabylonGUI.js';
import { GameCanvas } from '@/game/GameCanvas.js';
import { MultiplayerGameCanvas } from '@/game/MultiplayerGameCanvas.js';
import { GameLevel, PlayerMode, VIRTUAL_WIDTH, VIRTUAL_HEIGHT, VIRTUAL_BORDER_X, VIRTUAL_BORDER_TOP, VIRTUAL_BORDER_BOTTOM } from '@/utils/gameUtils/GameConstants.js';
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
  private gameCanvas: GameCanvas | MultiplayerGameCanvas;
  private isMultiplayerMode: boolean = false;
  private multiplayerKeyDownHandler?: (event: KeyboardEvent) => void;
  private multiplayerKeyUpHandler?: (event: KeyboardEvent) => void;
  


  constructor(containerId: string) {
    state.scaleFactor = this.getScaleFactor();
    this.babylonCanvas = new BabylonCanvas(containerId);
    this.gui = new BabylonGUI(this.babylonCanvas.getScene());
    this.setupMultiplayerEvents();
    this.setupMenuFlow();

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

  setupMultiplayerEvents() {
    window.addEventListener('game-start', (e: CustomEvent) => {
      this.isMultiplayerMode = true;
      this.babylonCanvas.createMultiplayerGameCanvas();
      this.gameCanvas = this.babylonCanvas.getGameCanvas();
      
      // Set multiplayer mode in the canvas
      if (this.gameCanvas instanceof MultiplayerGameCanvas) {
        (this.gameCanvas as any).isMultiplayerMode = true;
        (this.gameCanvas as any).currentRoomId = e.detail.room?.id || null;
        (this.gameCanvas as any).playerIndex = (this.gameCanvas as any).getPlayerIndex();
        (this.gameCanvas as any).startGame();
      }
      
      this.gui.hideAllGUI();
      window.dispatchEvent(new CustomEvent('hide-multiplayer-ui'));
      this.setupMultiplayerInput();
    });

    window.addEventListener('game-end', (e: CustomEvent) => {
      this.isMultiplayerMode = false;
      window.dispatchEvent(new CustomEvent('show-multiplayer-ui'));
      this.removeMultiplayerInput();
      this.gui.showGameOver();
      setTimeout(() => {
        this.gui.clearGUI();
        this.babylonCanvas.initPlaneMaterial();
      }, 3000);
    });

    // Handle player disconnection during game
    window.addEventListener('player-disconnected', (e: CustomEvent) => {
      if (this.isMultiplayerMode) {
        console.log('👋 Player disconnected during game, ending session');
        this.isMultiplayerMode = false;
        this.removeMultiplayerInput();
        this.gui.showGameOver();
        this.gui.clearGUI();
        this.babylonCanvas.initPlaneMaterial();
        window.dispatchEvent(new CustomEvent('show-multiplayer-ui'));
      }
    });
  }

  private setupMultiplayerInput() {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (this.isMultiplayerMode && this.gameCanvas instanceof MultiplayerGameCanvas) {
        this.gameCanvas.handleMultiplayerKeyDown(event);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (this.isMultiplayerMode && this.gameCanvas instanceof MultiplayerGameCanvas) {
        this.gameCanvas.handleMultiplayerKeyUp(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Store references for cleanup
    this.multiplayerKeyDownHandler = handleKeyDown;
    this.multiplayerKeyUpHandler = handleKeyUp;
  }

  private removeMultiplayerInput() {
    if (this.multiplayerKeyDownHandler) {
      window.removeEventListener('keydown', this.multiplayerKeyDownHandler);
    }
    if (this.multiplayerKeyUpHandler) {
      window.removeEventListener('keyup', this.multiplayerKeyUpHandler);
    }
  }



  setupMenuFlow() {
    // Only show single-player menu if not in multiplayer mode
    if (this.isMultiplayerMode) {
      return;
    }

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
            this.gui.showGameOver();
            setTimeout(() => {
              this.gui.clearGUI();
              this.babylonCanvas.initPlaneMaterial();

              window.dispatchEvent(new CustomEvent('openSummary', {
                detail: { summary: true, match: e.detail }
              }));
            }, 2000);
          });
        });
      });
    });
  }
}
