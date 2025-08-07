import { GameCanvas } from '@/game/GameCanvas.js';
import { GameLevel, VIRTUAL_WIDTH, VIRTUAL_HEIGHT, GameSize } from '@/utils/gameUtils/GameConstants.js';
import { websocketService } from '@/services/websocketService.js';

export class MultiplayerGameCanvas extends GameCanvas {
	private isMultiplayerMode: boolean = false;
	private currentRoomId: string | null = null;
	private playerIndex: number = -1;

	constructor(level: GameLevel, containerId?: string, width?: number, height?: number) {
		super(level, containerId, width, height);

		// Stop the base class to prevent conflicts
		this.stop();

		// Initialize multiplayer state
		this.setupMultiplayerEvents();
	}

	private setupMultiplayerEvents() {
		// Game started event
		window.addEventListener('game-started', (e: CustomEvent) => {
			if (this.isMultiplayerMode && e.detail.gameState) {
				this.updateFromServerState(e.detail.gameState);
			}
		});

		// Game update event
		window.addEventListener('game-update', (e: CustomEvent) => {
			if (this.isMultiplayerMode && e.detail.gameState) {
				this.updateFromServerState(e.detail.gameState);
			}
		});

		// Game end event
		window.addEventListener('game-end', (e: CustomEvent) => {
			this.isMultiplayerMode = false;
			this.currentRoomId = null;
			this.playerIndex = -1;
		});

		// Player disconnect event
		window.addEventListener('player-left', (e: CustomEvent) => {
			if (this.isMultiplayerMode) {
				this.isMultiplayerMode = false;
				this.currentRoomId = null;
				this.playerIndex = -1;
				
				window.dispatchEvent(new CustomEvent('player-disconnected', { 
					detail: { player: e.detail.player, players: e.detail.players } 
				}));
			}
		});
	}

	private getPlayerIndex(): number {
		const room = websocketService.getCurrentRoom();
		if (!room) return -1;

		const socketId = websocketService.getSocketId();
		if (!socketId) return -1;

		return room.players.findIndex(p => p.socketId === socketId);
	}

	private updateFromServerState(gameState: any) {
		// Update scores
		if (gameState.paddles) {
			this.gameManager.score.LEFT = gameState.paddles.left?.score || 0;
			this.gameManager.score.RIGHT = gameState.paddles.right?.score || 0;
		}

		// Update ball position
		if (gameState.ball) {
			const ball = this.getBall();
			if (ball) {
				(ball as any).virtualX = gameState.ball.x;
				(ball as any).virtualY = gameState.ball.y;
				(ball as any).vx = gameState.ball.velocityX;
				(ball as any).vy = gameState.ball.velocityY;
				(ball as any).size = gameState.ball.size;
			}
		}

		// Update paddle positions
		if (gameState.paddles) {
			const paddles = this.getPaddles();

			if (gameState.paddles.left) {
				(paddles[0] as any).y = gameState.paddles.left.y;
			}

			if (gameState.paddles.right) {
				(paddles[1] as any).y = gameState.paddles.right.y;
			}
		}
	}

	public startGame() {
		if (this.isMultiplayerMode) {
			this.gameManager.isStarted = true;

			// Initialize ball position to center
			const ball = this.getBall();
			if (ball) {
				(ball as any).virtualX = VIRTUAL_WIDTH / 2;
				(ball as any).virtualY = VIRTUAL_HEIGHT / 2;
				(ball as any).size = VIRTUAL_HEIGHT * 0.025;
			}

			this.gameManager.startGame();
		} else {
			super.startGame();
		}
	}

	public stop() {
		if (this.isMultiplayerMode) {
			this.isMultiplayerMode = false;
			this.currentRoomId = null;
			this.playerIndex = -1;
		}
		
		super.stop();
	}

	public render2DGameCanvas(runLoop: boolean = false, deltaTime: number = 1) {
		
		if (this.isMultiplayerMode) {
			
			// Ensure game is started for rendering
			if (!this.gameManager.isStarted) {
				this.gameManager.isStarted = true;
			}

			// Clear canvas
			const ctx = this.getCtx();
			const canvas = this.getCanvas();
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Draw game objects (same as single-player)
			const { PADDLE_WIDTH_RATIO, PADDLE_HEIGHT_RATIO } = GameSize;
			const paddleSizeX = VIRTUAL_WIDTH * PADDLE_WIDTH_RATIO;
			const paddleSizeY = (VIRTUAL_HEIGHT - this.getCourtBounds().specs.top * 2) * PADDLE_HEIGHT_RATIO;

			this.getCourtBounds().draw(ctx);
			this.getPaddles().forEach(paddle => paddle.draw(ctx, paddleSizeX, paddleSizeY));

			const ball = this.getBall();
			if (ball) {
				ball.draw(ctx);
			}
		} else {
			super.render2DGameCanvas(runLoop, deltaTime);
		}
	}

	public handleMultiplayerKeyDown(event: KeyboardEvent) {
		const roomId = websocketService.getCurrentRoomId();

		if (!this.isMultiplayerMode || !roomId) {
			return;
		}

		if (this.playerIndex === -1) {
			this.playerIndex = this.getPlayerIndex();
		}

		if (this.playerIndex === -1) {
			return;
		}

		switch (event.key) {
			case 'w':
			case 'W':
			case 'ArrowUp':
				websocketService.sendPaddleMove(roomId, -1);
				break;
			case 's':
			case 'S':
			case 'ArrowDown':
				websocketService.sendPaddleMove(roomId, 1);
				break;
		}
	}

	public handleMultiplayerKeyUp(event: KeyboardEvent) {
		const roomId = websocketService.getCurrentRoomId();

		if (!this.isMultiplayerMode || this.playerIndex === -1 || !roomId) {
			return;
		}

		switch (event.key) {
			case 'w':
			case 'W':
			case 's':
			case 'S':
			case 'ArrowUp':
			case 'ArrowDown':
				websocketService.sendPaddleStop(roomId);
				break;
		}
	}
} 