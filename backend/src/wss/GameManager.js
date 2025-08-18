const {
	// coords
	VIRTUAL_WIDTH,
	VIRTUAL_HEIGHT,
	VIRTUAL_BORDER_TOP,
	VIRTUAL_BORDER_BOTTOM,
	VIRTUAL_BORDER_X,

	// ball
	BALL_SPEED_MIN,
	BALL_SPEED_MAX,
	BALL_SIZE,

	// paddle
	PADDLE_SPEED,
	PADDLE_HEIGHT,
	PADDLE_WIDTH,
	LEFT_PADDLE_X,
	RIGHT_PADDLE_X,

	// game settings
	SCORE_MAX,
	GAME_FPS
} = require('../gameConstants.js');

class GameManager {
	constructor() {
		this.gameLoops = new Map();
	}

	// creates initial game state
	createGameState() {
		return {
			ball: {
				x: VIRTUAL_WIDTH / 2,
				y: VIRTUAL_HEIGHT / 2,
				velocityX: (Math.random() > 0.5 ? 1 : -1) * BALL_SPEED_MIN,
				velocityY: (Math.random() - 0.5) * BALL_SPEED_MIN,
				size: BALL_SIZE
			},
			paddles: {
				left: {
					x: LEFT_PADDLE_X,
					y: VIRTUAL_HEIGHT / 2 - PADDLE_HEIGHT / 2,
					score: 0,
					moving: false,
					direction: 0,
					height: PADDLE_HEIGHT,
					width: PADDLE_WIDTH,
					speed: PADDLE_SPEED
				},
				right: {
					x: RIGHT_PADDLE_X,
					y: VIRTUAL_HEIGHT / 2 - PADDLE_HEIGHT / 2,
					score: 0,
					moving: false,
					direction: 0,
					height: PADDLE_HEIGHT,
					width: PADDLE_WIDTH,
					speed: PADDLE_SPEED
				}
			},
			gamePhase: 'countdown',
			winner: null,
			lastScorer: 'right',
			serverTime: Date.now(),
			gameStarted: false,
			countdown: 3,
			lastUpdate: Date.now()
		};
	}

	// starts countdown sequence
	startCountdown(roomId, io, onCountdownComplete) {
		let countdown = 3;
		const countdownInterval = setInterval(() => {
			if (countdown > 0) {
				io.to(roomId).emit('countdown', { countdown });
				countdown--;
			} else {
				clearInterval(countdownInterval);
				onCountdownComplete();
			}
		}, 1000);
	}

	// starts main game loop
	startGameLoop(roomId, io, gameState, onGameUpdate) {
		if (this.gameLoops.has(roomId)) {
			clearInterval(this.gameLoops.get(roomId));
		}

		const gameLoop = setInterval(() => {
			if (gameState.gamePhase !== 'playing' || !gameState.gameStarted) {
				clearInterval(gameLoop);
				this.gameLoops.delete(roomId);
				return;
			}

			this.updateGameState(gameState);
			onGameUpdate(gameState);
		}, 1000 / GAME_FPS);

		this.gameLoops.set(roomId, gameLoop);
	}

	// stops game loop for a room
	stopGameLoop(roomId) {
		if (this.gameLoops.has(roomId)) {
			clearInterval(this.gameLoops.get(roomId));
			this.gameLoops.delete(roomId);
		}
	}

	// updates game state every frame
	updateGameState(gameState) {
		const now = Date.now();
		const deltaTime = (now - gameState.lastUpdate) / 1000;
		gameState.lastUpdate = now;

		// update ball position
		gameState.ball.x += gameState.ball.velocityX * deltaTime;
		gameState.ball.y += gameState.ball.velocityY * deltaTime;

		// update paddle positions
		this.updatePaddle(gameState.paddles.left, deltaTime);
		this.updatePaddle(gameState.paddles.right, deltaTime);

		// check collisions
		this.checkCollisions(gameState);
	}

	// updates individual paddle position
	updatePaddle(paddle, deltaTime) {
		if (paddle.moving && paddle.direction !== 0) {
			const newY = paddle.y + paddle.direction * paddle.speed * deltaTime;
			const courtTop = VIRTUAL_BORDER_TOP;
			const courtBottom = VIRTUAL_HEIGHT - VIRTUAL_BORDER_BOTTOM;
			const paddleGap = PADDLE_WIDTH * 0.02;

			if (paddle.direction > 0) { // moveDown
				paddle.y = Math.min(newY, courtBottom - paddle.height - paddleGap);
			} else { // moveUp
				paddle.y = Math.max(newY, courtTop + paddleGap);
			}
		}
	}

	// checks for collisions between ball and paddles/walls
	checkCollisions(gameState) {
		const ball = gameState.ball;

		// wall collisions
		if (ball.y <= VIRTUAL_BORDER_TOP || ball.y >= VIRTUAL_HEIGHT - VIRTUAL_BORDER_BOTTOM) {
			ball.velocityY = -ball.velocityY;
		}

		const leftPaddle = gameState.paddles.left;
		const rightPaddle = gameState.paddles.right;

		// left paddle collision
		if (ball.velocityX < 0) {
			if (this.checkPaddleCollision(ball, leftPaddle)) {
				this.bounceOffPaddle(ball, leftPaddle, 'left');
			}
		}

		// right paddle collision
		if (ball.velocityX > 0) {
			if (this.checkPaddleCollision(ball, rightPaddle)) {
				this.bounceOffPaddle(ball, rightPaddle, 'right');
			}
		}

		// scoring
		if (ball.x <= VIRTUAL_BORDER_X) {
			gameState.paddles.right.score++;
			gameState.lastScorer = 'right';
			this.resetBall(gameState);
			return 'right';
		} else if (ball.x >= VIRTUAL_WIDTH - VIRTUAL_BORDER_X) {
			gameState.paddles.left.score++;
			gameState.lastScorer = 'left';
			this.resetBall(gameState);
			return 'left';
		}

		return null;
	}

	// checks if ball collides with paddle
	checkPaddleCollision(ball, paddle) {
		const paddleX = paddle.x;
		const paddleTop = paddle.y;
		const paddleBottom = paddle.y + paddle.height;

		return ball.x + ball.size / 2 >= paddleX &&
			ball.x - ball.size / 2 <= paddleX + paddle.width &&
			ball.y + ball.size / 2 >= paddleTop &&
			ball.y - ball.size / 2 <= paddleBottom;
	}

	// handles ball bouncing off paddles
	bounceOffPaddle(ball, paddle, paddleSide) {
		// prevent sticking to paddle
		if (paddleSide === 'left') {
			ball.x = paddle.x + paddle.width + ball.size / 2 + 1;
		} else {
			ball.x = paddle.x - ball.size / 2 - 1;
		}

		// calculate bounce angle
		const relativeIntersectY = (ball.y - (paddle.y + paddle.height / 2));
		const normalized = relativeIntersectY / (paddle.height / 2);
		const maxBounceAngle = Math.PI / 4;
		const bounceAngle = normalized * maxBounceAngle;

		// calculate speed
		let speed = Math.sqrt(ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY);
		speed = Math.max(Math.min(speed * 1.25, BALL_SPEED_MAX), BALL_SPEED_MIN);

		// update velocity
		ball.velocityX = (paddleSide === 'left' ? Math.abs(speed * Math.cos(bounceAngle)) : -Math.abs(speed * Math.cos(bounceAngle)));
		ball.velocityY = speed * Math.sin(bounceAngle);
	}

	// resets ball to center
	resetBall(gameState) {
		const ball = gameState.ball;
		ball.x = VIRTUAL_WIDTH / 2;
		ball.y = VIRTUAL_HEIGHT / 2;

		// serve toward the player who just scored
		const direction = gameState.lastScorer === 'left' ? 1 : -1;
		const angle = (Math.random() - 0.5) * Math.PI / 4;
		ball.velocityX = direction * BALL_SPEED_MIN * Math.cos(angle);
		ball.velocityY = BALL_SPEED_MIN * Math.sin(angle);
	}

	// checks if game should end
	checkGameEnd(gameState) {
		const leftScore = gameState.paddles.left.score;
		const rightScore = gameState.paddles.right.score;

		if (leftScore >= SCORE_MAX || rightScore >= SCORE_MAX) {
			gameState.gamePhase = 'finished';
			gameState.winner = leftScore >= SCORE_MAX ? 'left' : 'right';
			return true;
		}
		return false;
	}

	// handles paddle movement input
	handlePaddleInput(gameState, playerIndex, type, direction) {
		if (!gameState || gameState.gamePhase !== 'playing' || !gameState.gameStarted) {
			return;
		}

		const paddleSide = playerIndex === 0 ? 'left' : 'right';
		const paddle = gameState.paddles[paddleSide];

		if (type === 'paddleMove') {
			paddle.moving = true;
			paddle.direction = direction;
		} else if (type === 'paddleStop') {
			paddle.moving = false;
			paddle.direction = 0;
		}
	}
}

module.exports = GameManager;
