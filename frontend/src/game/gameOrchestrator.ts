import { BabylonCanvas } from '@/game/babylon/BabylonCanvas';
import { BabylonGUI } from '@/game/babylon/BabylonGUI.js';
import { GameCanvas } from '@/game/GameCanvas.js';
import { MultiplayerGameCanvas } from '@/multiplayer/MultiplayerGameCanvas.js';
import { GameLevel, PlayerMode, GameMode, GameType, VIRTUAL_WIDTH, VIRTUAL_HEIGHT, VIRTUAL_BORDER_X, VIRTUAL_BORDER_TOP, VIRTUAL_BORDER_BOTTOM } from '@/utils/gameUtils/GameConstants.js';
import { state, TournamentData } from '@/state';
import { createMatch, updateMatch, getTournamentSemi, getTournamentFinal } from '@/services/matchService';
import { getUserProfile } from '@/services/friendsService';


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
  private handledGameOver: boolean = false;
  private handledOpponentLeft: boolean = false;
  // bound window handlers for cleanup
  private onGameStart?: (e: CustomEvent) => void;
  private onGameEnd?: (e: CustomEvent) => void;
  private onGameCountdown?: (e: CustomEvent) => void;
  private onGameStarted?: (e: CustomEvent) => void;
  private onGameUpdate?: (e: CustomEvent) => void;
  private onPlayerLeft?: (e: CustomEvent) => void;
  private onResize?: () => void;

  private gameLevel: GameLevel = GameLevel.EASY;
  private gameMode: GameMode = GameMode.LOCAL;
  private gameType: GameType = GameType.ONE_MATCH;
  private gamePlayerMode: PlayerMode = PlayerMode.TWO_PLAYER;
  private matchId: number | null = null;
  private lastKnownScore: { LEFT: number; RIGHT: number } = { LEFT: 0, RIGHT: 0 };

  // private isTournament: boolean;
  // private gameManager: GameManager;
  // TODO CONCEPT: should we have a GameManager here?
  // instead of instantiating it in GameCanvas?

  constructor(containerId: string) {
    state.scaleFactor = this.getScaleFactor();
    this.babylonCanvas = new BabylonCanvas(containerId);
    this.gui = new BabylonGUI(this.babylonCanvas.getScene());
    // auto open remote UI on invite acceptance
    try { (this.gui as any).attachInviteAutoOpen(); } catch { }

    this.setupMultiplayerEvents();
    this.setupMenuFlow();
    this.babylonCanvas.startRenderLoop();

    // if redirected here from invite flow, open Remote UI automatically
    try {
      if (localStorage.getItem('openRemoteUI') === '1') {
        localStorage.removeItem('openRemoteUI');
        // if a room was cached, ensure manager has it before opening UI
        try {
          const raw = localStorage.getItem('inviteRoom');
          const roomIdRaw = localStorage.getItem('inviteRoomId');
          if (raw) {
            const cached = JSON.parse(raw);
            // keep inviteRoom for later safety; do not remove yet
            const mgr = (window as any).remoteMultiplayerManager;
            if (mgr && typeof mgr.setInviteRoom === 'function') {
              mgr.setInviteRoom(cached.room, cached.isHost === true);
              // also give websocketService the room id early for join/ready/leave
              try {
                const wss = (window as any).websocketService;
                const roomId = cached.room?.id || cached.roomId || roomIdRaw;
                if (wss && roomId) {
                  (wss as any).currentRoomId = roomId;
                }
              } catch { }
            }
          }
        } catch { }
        this.gui.showRemoteMultiplayerUI(this.gameLevel);
      }
    } catch { }

    // TODO FIX: when refreshing the page, resume the game from where it left off
    this.onResize = () => {
      this.babylonCanvas.cleanupGame();
      state.scaleFactor = this.getScaleFactor();
      window.location.reload();
    };
    window.addEventListener('resize', this.onResize as EventListener);
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
    this.onGameStart = (e: CustomEvent) => {
      try {
        // reset one-shot guards for a fresh session
        this.handledGameOver = false;
        this.handledOpponentLeft = false;
        this.lastKnownScore = { LEFT: 0, RIGHT: 0 };

        this.isMultiplayerMode = true;
        this.babylonCanvas.createMultiplayerGameCanvas();
        this.gameCanvas = this.babylonCanvas.getGameCanvas();

        if (this.gameCanvas instanceof MultiplayerGameCanvas) {
          (this.gameCanvas as any).isMultiplayerMode = true;
          (this.gameCanvas as any).currentRoomId = e.detail.room?.id || null;
          (this.gameCanvas as any).playerIndex = (this.gameCanvas as any).getPlayerIndex();

          // defer actual game start until server signals gameStarted (after countdown)

          // wire score updates to HUD, matching single-player
          try {
            (this.gameCanvas as any).addEventListener('scoreChanged', (evt: CustomEvent) => {
              this.gui.clearGUI();
              this.gui.showScoreBoard(evt.detail, () => { });
            });
          } catch { }
        }
        this.gui.hideAllGUI();
        // start server-driven countdown overlay
        try { (this.gui as any).beginCountdownOverlay(); } catch { }
        window.dispatchEvent(new CustomEvent('hideMultiplayerUI'));
        this.setupMultiplayerInput();

        // host-only: create match record for remote games
        (async () => {
          try {
            const room = (e as any).detail?.room;
            if (!room || this.matchId) return;
            const hostUsername = room.hostUsername;
            const me = state.userData?.username || localStorage.getItem('loggedInUser');
            const isHost = me && hostUsername && me.toLowerCase() === hostUsername.toLowerCase();
            if (!isHost) return;
            const players = room.players || [];
            const guest = players.find((p: any) => p.username && p.username.toLowerCase() !== hostUsername.toLowerCase());
            if (!guest) return;
            const creatorId = state.userData?.userId || parseInt(localStorage.getItem('userId') || '0');
            let remoteId = guest.userId || 0;
            if (!remoteId && guest.username) {
              try { const prof = await getUserProfile(guest.username); remoteId = prof?.userId || 0; } catch { }
            }
            if (creatorId && remoteId) {
              const res = await createMatch(creatorId, remoteId, null, hostUsername, guest.username);
              if (res && typeof res.id === 'number') this.matchId = res.id;
              // surface a lightweight system line for host only
              try {
                const panel = document.querySelector('chat-panel') as any;
                if (panel && typeof panel.addMessage === 'function') {
                  panel.addMessage('', `match created (#${this.matchId}): ${hostUsername} vs ${guest.username}`, 'system', 'global');
                }
              } catch { }
            }
          } catch { }
        })();
      } catch (error) {
        this.isMultiplayerMode = false;
      }
    };
    window.addEventListener('gameStart', this.onGameStart as EventListener);

    this.onGameEnd = (e: CustomEvent) => {
      if (this.handledGameOver) return;



      this.handledGameOver = true;
      this.isMultiplayerMode = false;
      window.dispatchEvent(new CustomEvent('showMultiplayerUI'));
      this.removeMultiplayerInput();
      const detail: any = (e as any).detail || {};
      const winnerSide = detail.winner || 'left';
      const paddles = detail.gameState?.paddles;
      const score = paddles ? { LEFT: paddles.left.score, RIGHT: paddles.right.score } : { LEFT: 0, RIGHT: 0 };

      // map sides to usernames
      const room = detail.room || (window as any).websocketService?.getCurrentRoom?.();
      const hostUsername = room?.hostUsername || 'Player 1';
      const players = room?.players || [];
      const guest = players.find((p: any) => p.username && p.username.toLowerCase() !== (hostUsername || '').toLowerCase());
      const leftName = hostUsername;
      const rightName = guest?.username || 'Player 2';
      const winnerName = winnerSide === 'left' ? leftName : rightName;

      this.gui.showGameOver(winnerName, score);
      // stop rendering updates so the ball doesn't keep moving underneath
      try { (this.babylonCanvas as any).cleanupGame(); } catch { }
      // chat message is handled by Home via lastMatchSummary banner

      // persist match summary for Home page (simple global event)
      const summary = { winner: winnerName, score, reason: 'score', host: leftName, guest: rightName } as any;
      try { localStorage.setItem('lastMatchSummary', JSON.stringify(summary)); } catch { }
      try { window.dispatchEvent(new CustomEvent('lastMatchSummary', { detail: summary })); } catch { }

      // host-only: update match stats
      (async () => {
        try {
          const me = state.userData?.username || localStorage.getItem('loggedInUser');
          const isHost = me && leftName && me.toLowerCase() === leftName.toLowerCase();
          if (isHost && this.matchId) {
            await updateMatch(this.matchId, winnerName, score.LEFT, score.RIGHT);
          }
        } catch { }
      })();
      setTimeout(() => {
        this.gui.clearGUI();
        this.babylonCanvas.initPlaneMaterial();
        try {
          window.history.pushState({}, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch { window.location.href = '/'; }
      }, 3000);
    };
    window.addEventListener('gameEnd', this.onGameEnd as EventListener);

    // reflect server countdown ticks (3->2->1) then start
    this.onGameCountdown = (e: CustomEvent) => {
      try { (this.gui as any).setCountdownNumber(e.detail.countdown); } catch { }
    };
    window.addEventListener('gameCountdown', this.onGameCountdown as EventListener);
    this.onGameStarted = (_e: CustomEvent) => {
      try { (this.gui as any).endCountdownOverlay(); } catch { }
      if (this.gameCanvas instanceof MultiplayerGameCanvas) {
        (this.gameCanvas as any).startGame();
      }
    };
    window.addEventListener('gameStarted', this.onGameStarted as EventListener);

    // track latest score for persistence on opponent leave
    this.onGameUpdate = (e: CustomEvent) => {
      const gs: any = (e as any).detail?.gameState;
      if (gs?.paddles) {
        this.lastKnownScore = { LEFT: gs.paddles.left.score, RIGHT: gs.paddles.right.score };
      }
    };
    window.addEventListener('gameUpdate', this.onGameUpdate as EventListener);

    // TODO: think its somewhat buggy
    // removed: duplicate with playerLeft handler below

    // opponent left
    this.onPlayerLeft = (e: CustomEvent) => {
      if (this.handledOpponentLeft) return;
      this.handledOpponentLeft = true;
      if (this.isMultiplayerMode) {
        this.isMultiplayerMode = false;
        this.removeMultiplayerInput();
        this.gui.clearGUI();
        // chat message is handled by Home via lastMatchSummary banner
        // prefer room info embedded in event if present (backend now includes it)
        const evtRoom = (e as any).detail?.room || (window as any).websocketService?.getCurrentRoom?.();
        const hostName = evtRoom?.hostUsername;
        const guestName = evtRoom?.players?.find((p: any) => p.username?.toLowerCase() !== (hostName || '').toLowerCase())?.username;
        const summary: any = { winner: state.userData?.username || 'You', score: this.lastKnownScore, reason: 'opponentLeft', host: hostName, guest: guestName };
        try { localStorage.setItem('lastMatchSummary', JSON.stringify(summary)); } catch { }
        try { window.dispatchEvent(new CustomEvent('lastMatchSummary', { detail: summary })); } catch { }
        // host-only: persist current score and winner on opponent leave
        (async () => {
          try {
            const room = evtRoom;
            const leftName = room?.hostUsername;
            const me = state.userData?.username || localStorage.getItem('loggedInUser');
            const isHost = me && leftName && me.toLowerCase() === leftName.toLowerCase();
            if (isHost && this.matchId) {
              await updateMatch(this.matchId, me || 'You', this.lastKnownScore.LEFT, this.lastKnownScore.RIGHT);
            }
          } catch { }
        })();
        try {
          window.history.pushState({}, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch {
          window.location.href = '/';
        }
      }
    };
    window.addEventListener('playerLeft', this.onPlayerLeft as EventListener);
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

  public destroy() {
    // remove all bound window listeners
    try { if (this.onGameStart) window.removeEventListener('gameStart', this.onGameStart as EventListener); } catch { }
    try { if (this.onGameEnd) window.removeEventListener('gameEnd', this.onGameEnd as EventListener); } catch { }
    try { if (this.onGameCountdown) window.removeEventListener('gameCountdown', this.onGameCountdown as EventListener); } catch { }
    try { if (this.onGameStarted) window.removeEventListener('gameStarted', this.onGameStarted as EventListener); } catch { }
    try { if (this.onGameUpdate) window.removeEventListener('gameUpdate', this.onGameUpdate as EventListener); } catch { }
    try { if (this.onPlayerLeft) window.removeEventListener('playerLeft', this.onPlayerLeft as EventListener); } catch { }
    try { if (this.onResize) window.removeEventListener('resize', this.onResize as EventListener); } catch { }

    this.removeMultiplayerInput();
    try { this.babylonCanvas.cleanupGame(); } catch { }
  }

  // keep track of score changes and update the GUI accordingly
  // reminder: the score is a Babylon.js GUI element
  private setupScoreTracking() {
    this.gameCanvas.addEventListener('scoreChanged', (e: CustomEvent) => {
      this.gui.clearGUI();
      this.gui.showScoreBoard(e.detail, () => { });
    });
  }

  private clearStateTournament() {
    state.tournamentData = {
      players: {},
      matches: {},
      currentMatchIndex: 0,
      stage: 1,
      tournamentId: 0
    } as TournamentData;
  };

  private async updateTournamentMatches(matchIndex: number) {
    if (matchIndex == 4 && state.tournamentData.stage == 1) {

      state.tournamentData.stage++;
      state.tournamentData.currentMatchIndex = 0;

      const result = await getTournamentSemi(state.tournamentData.tournamentId);
      state.tournamentData.players = result.players;

    } else if (matchIndex == 2 && state.tournamentData.stage == 2) {

      state.tournamentData.stage++;
      state.tournamentData.currentMatchIndex = 0;

      const result = await getTournamentFinal(state.tournamentData.tournamentId);
      state.tournamentData.players = result.players;

    } else if (state.tournamentData.stage == 3) {
      state.tournamentData.stage++;
    }
    return;
  }

  private async handleTournamentEvents() {
    await this.updateTournamentMatches(state.tournamentData.currentMatchIndex);
    const matches = state.tournamentData.players;
    if (state.tournamentData.stage < 4) {
      this.babylonCanvas.cleanupGame();
      window.dispatchEvent(new CustomEvent('tournament-stage', {
        detail: { matches },
        bubbles: true,
        composed: true
      }));
    } else {
      this.clearStateTournament();
      this.babylonCanvas.endingGame();
      setTimeout(() => {
        this.gui.clearGUI();
      }, 2000);
    }
  }

  private setupGameOverTracking() {
    this.gameCanvas.addEventListener('gameOver', async (e: CustomEvent) => {
      let winner;
      if (e.detail.winner == 'LEFT')
        winner = state.players.p1;
      else
        winner = state.players.p2;
      await updateMatch(this.matchId, winner, e.detail.score.LEFT, e.detail.score.RIGHT);

      // TODO FIX: arguments are obsolete (player and score), review
      this.gui.showGameOver('Player 1', { LEFT: 5, RIGHT: 3 });
      // surface summary banner + chat line on home for normal flow
      try {
        const score = { LEFT: e.detail.score.LEFT, RIGHT: e.detail.score.RIGHT };
        const summary: any = { winner, score, reason: 'score', host: state.players?.p1, guest: state.players?.p2 };
        try { localStorage.setItem('lastMatchSummary', JSON.stringify(summary)); } catch { }
        try { window.dispatchEvent(new CustomEvent('lastMatchSummary', { detail: summary })); } catch { }
      } catch { }
      if (this.gameType === GameType.TOURNAMENT) {
        this.handleTournamentEvents();
      } else {
        this.babylonCanvas.endingGame();
        setTimeout(() => {
          this.gui.clearGUI();
        }, 2000);
      }
    });
  }

  public async startGame() {
    // start game!!!!! countdown and then ball starts moving
    // TODO: Change placeholder 0 for remoteUserId for the actual Id
    const match = await createMatch(state.userData.userId, 0, state.tournamentData.tournamentId, state.players.p1, state.players.p2);
    this.matchId = match.id;
    this.babylonCanvas.createGameCanvas(this.gameLevel, this.gamePlayerMode);
    this.gameCanvas = this.babylonCanvas.getGameCanvas();

    this.gui.showCountdown(1, () => {
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
                this.clearStateTournament();
                state.players = { p1: "Player1", p2: "Player2" };
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
          } else if (this.gameMode === GameMode.REMOTE) {
            // remote multiplayer mode - show remote multiplayer ui
            this.gui.showRemoteMultiplayerUI(this.gameLevel);
          }
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