import { BabylonCanvas } from '@/game/babylon/BabylonCanvas';
import { BabylonGUI } from '@/game/babylon/BabylonGUI.js';
import { GameCanvas } from '@/game/GameCanvas.js';
import { MultiplayerGameCanvas } from '@/multiplayer/MultiplayerGameCanvas.js';
import { GameLevel, PlayerMode, GameMode, GameType, VIRTUAL_WIDTH, VIRTUAL_HEIGHT, VIRTUAL_BORDER_X, VIRTUAL_BORDER_TOP, VIRTUAL_BORDER_BOTTOM } from '@/utils/gameUtils/GameConstants.js';
import { state } from '@/state';


/*
  Game Orchestrator responsabilities:
  - orchestrate the game flow (2D canvas game, Babylon.js scene, GUI)
  - start/stop/reset the game, switch scenes, etc. (?)
  - set up game scale factor based on the window size and virtual dimensions

  Do not:
  - handle low-level game logic, GUI logic, or user input directly
  - for tournament mode, orchestrator only triggers the modal config...
  - ...the logic itself is handed by the web component
*/

export class gameOrchestrator {
  private babylonCanvas: BabylonCanvas;
  private gui: BabylonGUI;
  private gameCanvas: GameCanvas | MultiplayerGameCanvas;
  private isMultiplayerMode: boolean = false;
  private multiplayerKeyDownHandler?: (event: KeyboardEvent) => void;
  private multiplayerKeyUpHandler?: (event: KeyboardEvent) => void;

  private gameLevel: GameLevel = GameLevel.EASY;
  private gameMode: GameMode = GameMode.LOCAL;
  private gameType: GameType = GameType.ONE_MATCH;
  private gamePlayerMode: PlayerMode = PlayerMode.TWO_PLAYER;

  // private isTournament: boolean;
  // private gameManager: GameManager;
  // TODO CONCEPT: should we have a GameManager here?
  // instead of instantiating it in GameCanvas?

  constructor(containerId: string) {
    state.scaleFactor = this.getScaleFactor();
    this.babylonCanvas = new BabylonCanvas(containerId);
    this.gui = new BabylonGUI(this.babylonCanvas.getScene());

    // const params = new URLSearchParams(window.location.search);
    // this.isTournament = params.get('tournament') === '1';

    // if (this.isTournament) {
    //   this.setupTournamentFlow();
    // } else {
    //   this.setupMenuFlow();
    // }
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

  private getScaleFactor() {
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
      this.gui.showGameOver('Player 1', { LEFT: 0, RIGHT: 0 });
      setTimeout(() => {
        this.gui.clearGUI();
        this.babylonCanvas.initPlaneMaterial();
      }, 3000);
    });

    // TODO: think its somewhat buggy
    window.addEventListener('player-disconnected', (e: CustomEvent) => {
      if (this.isMultiplayerMode) {
        this.isMultiplayerMode = false;
        this.removeMultiplayerInput();
        this.gui.showGameOver('Player 1', { LEFT: 0, RIGHT: 0 });
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

    // Store references for cleanup TODO: remove?
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



  // keep track of score changes and update the GUI accordingly
  // reminder: the score is a Babylon.js GUI element
  private setupScoreTracking() {
    this.gameCanvas.addEventListener('scoreChanged', (e: CustomEvent) => {
      console.log('Received scoreChanged', e.detail);
      this.gui.clearGUI();
      this.gui.showScoreBoard(e.detail, () => { });
    });
  }

  private setupGameOverTracking() {
    this.gameCanvas.addEventListener('gameOver', (e: CustomEvent) => {
      // TODO FIX: arguments are obsolete (player and score), review
      this.gui.showGameOver('Player 1', { LEFT: 5, RIGHT: 3 });

      // TODO: detail matches should be handled via state
      if (this.gameType === GameType.TOURNAMENT) {
        this.babylonCanvas.cleanupGame();
        window.dispatchEvent(new CustomEvent('tournament-created', {
          detail: { matches: [{ player1: "tchau", player2: "ola" }] },
          bubbles: true,
          composed: true
        }));
      } else {
        this.babylonCanvas.endingGame();
        setTimeout(() => {
          this.gui.clearGUI();
        }, 2000);
      }
    });
  }

  public startGame() {
    // start game!!!!! countdown and then ball starts moving
    this.babylonCanvas.createGameCanvas(this.gameLevel, this.gamePlayerMode);
    this.gameCanvas = this.babylonCanvas.getGameCanvas();

    this.gui.showCountdown(3, () => {
      this.gameCanvas.startGame();
      this.gui.showScoreBoard({ LEFT: 0, RIGHT: 0 }, () => { });
    });

    this.setupScoreTracking();
    this.setupGameOverTracking();

    // restart the render loop for the new game
    this.babylonCanvas.startRenderLoop();
  }

  private setupMenuFlow() {
    if (this.isMultiplayerMode) {
        return;
    }
    // user starts the game from the main menu. Flow starting point
    this.gui.showStartButton(() => {
      // wants to play in which level? HARD, MEDIUM, EASY
      // it is the first step because is a rule that needs to be defined for all modes, the most generic of all
      this.gui.showDifficultySelector((level) => {
        this.gameLevel = level as GameLevel;

        // wants to play local or remote? // TODO: for now, only local is implemented
        this.gui.showGameModeButton((selectedMode) => {
          this.gameMode = selectedMode as GameMode;

          if (this.gameMode === GameMode.LOCAL) {
            // wants to play a single match or a tournament?
            // if one match, the flow is simpler. User can play with a bot or with another player
            // then, the game is ready to start
            this.gui.showGameTypeButton((gameType) => {
              this.gameType = gameType as GameType;
              if (gameType === GameType.ONE_MATCH) {
                state.Players = {
                  p1: "Cenas",
                  p2: "WTV" // needs to be string since Players expects strings
                };
				state.UserData = {
					userId: 5
				}
                this.gui.showPlayerSelector((mode) => {
                  if (mode === PlayerMode.ONE_PLAYER) {
                    this.gameCanvas.enableBotForPlayer(1);
                  }
                });

                this.startGame();
              } else {
                // tournmament mode, there is a the need of showing a modal for more complex config
                window.dispatchEvent(new CustomEvent('openTournamentConfig', {
                  detail: {},
                }));
              }
            })
          };
        });
      });
    });
  }

}

// private setupTournamentFlow() {
//   this.babylonCanvas.createGameCanvas(GameLevel.MEDIUM, PlayerMode.TWO_PLAYER);
//   this.gameCanvas = this.babylonCanvas.getGameCanvas();

//   this.gui.showCountdown(3, () => {
//     this.gameCanvas.startGame();
//     this.gui.showScoreBoard({ LEFT: 0, RIGHT: 0 }, () => { });
//   });

//   this.gameCanvas.addEventListener('gameOver', (e: CustomEvent) => {
//     const { winner, score } = e.detail;
//     const winnerName = winner === 'LEFT' ? 'Player 1' : 'Player 2';
//     const message = `${winnerName} Win!\nFinal Score: ${score.LEFT} x ${score.RIGHT}`;
//     this.gui.showGameOver(winnerName, score);
//   });
// }


// this.gameCanvas.addEventListener('gameOver', (e: CustomEvent) => {
//             //console.log('Received gameOver', e.detail);
//             const { winner, score } = e.detail;
//             const winnerName = winner === 'LEFT' ? 'Player 1' : 'Player 2';
//             const message = `$${winnerName} Win!\nFinal Score: ${score.LEFT} x ${score.RIGHT}`;

//             this.gui.showGameOver(winnerName, score);

//             // setTimeout(() => {
//             //   this.gui.clearGUI();
//             //   this.babylonCanvas.initPlaneMaterial();

//             //   window.dispatchEvent(new CustomEvent('openSummary', {
//             //     detail: { summary: true, match: e.detail }
//             //   }));
//             // }, 2000);
//           });