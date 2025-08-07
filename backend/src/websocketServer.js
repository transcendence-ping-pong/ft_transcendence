const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const {
	// Coordinate system
	VIRTUAL_WIDTH,
	VIRTUAL_HEIGHT,
	VIRTUAL_BORDER_TOP,
	VIRTUAL_BORDER_BOTTOM,
	VIRTUAL_BORDER_X,
	GAME_AREA_HEIGHT,
	GAME_AREA_WIDTH,

	// Ball physics
	BALL_SPEED_MIN,
	BALL_SPEED_MAX,
	BALL_SIZE,

	// Paddle physics
	PADDLE_SPEED,
	PADDLE_HEIGHT,
	PADDLE_WIDTH,
	PADDLE_MARGIN_X,
	LEFT_PADDLE_X,
	RIGHT_PADDLE_X,

	// Game settings
	SCORE_MAX,
	GAME_FPS
} = require('./gameConstants.js');

class WebSocketServer {
	constructor(port) {
		this.port = port;
		this.io = null;
		this.gameRooms = new Map();
		this.connectedUsers = new Map();
	}

	start() {
		this.io = new Server(this.port, {
			cors: {
				origin: "*",
				methods: ["GET", "POST"]
			}
		});

		this.setupEventHandlers();
		console.log(`WebSocket server running at ws://localhost:${this.port}`);
	}

	setupEventHandlers() {
		this.io.on('connection', (socket) => {
			// Handle user authentication
			socket.on('authenticate', (data) => {
				this.handleAuthentication(socket, data);
			});

			// Handle game room creation
			socket.on('createRoom', (data) => {
				this.handleCreateRoom(socket, data);
			});

			// Handle joining a room
			socket.on('joinRoom', (data) => {
				this.handleJoinRoom(socket, data);
			});

			// Handle game input
			socket.on('gameInput', (data) => {
				this.handleGameInput(socket, data);
			});

			// Handle disconnection
			socket.on('disconnect', () => {
				this.handleDisconnect(socket);
			});

			// Test endpoint
			socket.on('test', (data) => {
				socket.emit('test', 'Hello from server!');
			});

			// Browser log endpoint for debugging
			socket.on('browserLog', (data) => {
				console.log(`[BROWSER ${data.level}] ${data.message}`, data.data || '');
			});
		});
	}

	handleAuthentication(socket, data) {
		try {
			// Simple username-based authentication
			const username = data.username || data.token || 'Anonymous';

			// Check if username is already taken
			const existingUser = Array.from(this.connectedUsers.values()).find(u => u.username === username);
			if (existingUser && existingUser.socketId !== socket.id) {
				socket.emit('authenticated', { success: false, error: 'Username already taken' });
				return;
			}

			this.connectedUsers.set(socket.id, {
				userId: `user_${Date.now()}`,
				username: username,
				socketId: socket.id
			});
			socket.emit('authenticated', { success: true, username: username });
		} catch (error) {
			socket.emit('authenticated', { success: false, error: 'Authentication failed' });
		}
	}

	handleCreateRoom(socket, data) {
		const user = this.connectedUsers.get(socket.id);
		if (!user) {
			socket.emit('error', { message: 'Not authenticated' });
			return;
		}

		// Check if user is already in a room
		for (const [roomId, room] of this.gameRooms) {
			if (room.players.some(p => p.socketId === socket.id)) {
				socket.emit('error', { message: 'You are already in a room' });
				return;
			}
		}

		const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const enhancedUser = {
			...user,
			isReady: false,
			isHost: true,
			score: 0,
			wins: 0,
			losses: 0
		};

		const room = {
			id: roomId,
			players: [enhancedUser],
			maxPlayers: 2,
			status: 'waiting',
			gameState: null,
			createdAt: Date.now()
		};

		this.gameRooms.set(roomId, room);
		socket.join(roomId);
		socket.emit('roomCreated', { roomId, room });
	}

	handleJoinRoom(socket, data) {
		const user = this.connectedUsers.get(socket.id);
		if (!user) {
			socket.emit('error', { message: 'Not authenticated' });
			return;
		}

		// Check if user is already in a room
		for (const [roomId, room] of this.gameRooms) {
			if (room.players.some(p => p.socketId === socket.id)) {
				socket.emit('error', { message: 'You are already in a room' });
				return;
			}
		}

		const room = this.gameRooms.get(data.roomId);
		if (!room) {
			socket.emit('error', { message: 'Room not found' });
			return;
		}

		if (room.players.length >= room.maxPlayers) {
			socket.emit('error', { message: 'Room is full' });
			return;
		}

		if (room.status === 'playing') {
			socket.emit('error', { message: 'Game is already in progress' });
			return;
		}

		const enhancedUser = {
			...user,
			isReady: false,
			isHost: false,
			score: 0,
			wins: 0,
			losses: 0
		};

		room.players.push(enhancedUser);
		socket.join(data.roomId);

		// Notify all players in the room
		this.io.to(data.roomId).emit('playerJoined', {
			player: enhancedUser,
			players: room.players,
			roomId: data.roomId,
			room: room
		});

		// Start game if room is full and both players are ready
		if (room.players.length === room.maxPlayers) {
			this.checkGameStart(data.roomId);
		}
	}

	checkGameStart(roomId) {
		const room = this.gameRooms.get(roomId);
		if (!room || room.players.length < 2) {
			return;
		}

		const allReady = room.players.every(p => p.isReady);
		// Checking game start conditions

		if (allReady) {
			this.startGame(roomId);
		}
	}

	startGame(roomId) {
		const room = this.gameRooms.get(roomId);
		if (!room) {
			return;
		}

		// Clear any existing game loop
		if (room.gameLoop) {
			clearInterval(room.gameLoop);
			room.gameLoop = null;
		}

		room.status = 'playing';
		room.gameState = {
			ball: {
				x: VIRTUAL_WIDTH / 2, // Center of screen (same as single-player)
				y: VIRTUAL_HEIGHT / 2, // Center of screen (same as single-player)
				velocityX: (Math.random() > 0.5 ? 1 : -1) * BALL_SPEED_MIN,
				velocityY: (Math.random() - 0.5) * BALL_SPEED_MIN,
				size: BALL_SIZE
			},
			paddles: {
				left: {
					x: LEFT_PADDLE_X, // Same as single-player
					y: VIRTUAL_HEIGHT / 2 - PADDLE_HEIGHT / 2, // Center position (same as single-player)
					score: 0,
					moving: false,
					direction: 0,
					height: PADDLE_HEIGHT,
					width: PADDLE_WIDTH,
					speed: PADDLE_SPEED
				},
				right: {
					x: RIGHT_PADDLE_X, // Same as single-player
					y: VIRTUAL_HEIGHT / 2 - PADDLE_HEIGHT / 2, // Center position (same as single-player)
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
			lastScorer: 'right', // Initialize to serve toward left player first
			serverTime: Date.now(),
			gameStarted: false,
			countdown: 3,
			lastUpdate: Date.now()
		};

		// Game initialization complete
		this.io.to(roomId).emit('gameStart', {
			gameState: room.gameState,
			players: room.players
		});

		// Start countdown
		this.startCountdown(roomId);
	}

	startCountdown(roomId) {
		const room = this.gameRooms.get(roomId);
		if (!room) return;

		let countdown = 3;
		const countdownInterval = setInterval(() => {
			if (countdown > 0) {
				room.gameState.countdown = countdown;
				this.io.to(roomId).emit('countdown', { countdown });
				countdown--;
			} else {
				clearInterval(countdownInterval);
				room.gameState.gamePhase = 'playing';
				room.gameState.gameStarted = true;
				room.gameState.countdown = 0;

				// Reset all paddle movement state to prevent any movement from countdown phase
				room.gameState.paddles.left.moving = false;
				room.gameState.paddles.left.direction = 0;
				room.gameState.paddles.right.moving = false;
				room.gameState.paddles.right.direction = 0;

				this.io.to(roomId).emit('gameStarted', { gameState: room.gameState });
				this.startGameLoop(roomId);
			}
		}, 1000);
	}

	startGameLoop(roomId) {
		const room = this.gameRooms.get(roomId);
		if (!room) return;

		const gameLoop = setInterval(() => {
			if (room.status !== 'playing' || room.gameState.gamePhase !== 'playing' || !room.gameState.gameStarted) {
				clearInterval(gameLoop);
				return;
			}

			this.updateGameState(roomId);
			this.io.to(roomId).emit('gameUpdate', {
				gameState: room.gameState,
				timestamp: Date.now()
			});
		}, 1000 / GAME_FPS);

		// Store the interval reference
		room.gameLoop = gameLoop;
	}

	/**
	 * Updates the game state every frame (60 FPS)
	 * Handles ball movement, paddle movement, and collision detection
	 * This is the main game loop that runs on the server
	 */
	updateGameState(roomId) {
		const room = this.gameRooms.get(roomId);
		if (!room || !room.gameState) return;

		const gameState = room.gameState;
		const now = Date.now();
		const deltaTime = (now - gameState.lastUpdate) / 1000; // Convert to seconds
		gameState.lastUpdate = now;

		// Game state update

		// Update ball position using physics (position = position + velocity * time)
		gameState.ball.x += gameState.ball.velocityX * deltaTime;
		gameState.ball.y += gameState.ball.velocityY * deltaTime;

		// Ball position monitoring (disabled for performance)

		// ========================================
		// PADDLE MOVEMENT (Same logic as single-player)
		// ========================================
		// Left paddle movement
		if (gameState.paddles.left.moving && gameState.paddles.left.direction !== 0) {
			const oldY = gameState.paddles.left.y;
			const newY = gameState.paddles.left.y + gameState.paddles.left.direction * gameState.paddles.left.speed * deltaTime;

			// EXACTLY like single-player: use court bounds with paddle gap
			// Single-player: this.y = Math.max(this.y - this.speed * dt, top + (this.width * PADDLE_TO_COURT_GAP))
			const courtTop = VIRTUAL_BORDER_TOP;
			const courtBottom = VIRTUAL_HEIGHT - VIRTUAL_BORDER_BOTTOM;
			const paddleGap = PADDLE_WIDTH * 0.02; // PADDLE_TO_COURT_GAP * paddle width
			const paddleHeight = gameState.paddles.left.height;

			// Apply EXACT same logic as single-player
			if (gameState.paddles.left.direction > 0) { // moveDown
				gameState.paddles.left.y = Math.min(newY, courtBottom - paddleHeight - paddleGap);
			} else { // moveUp
				gameState.paddles.left.y = Math.max(newY, courtTop + paddleGap);
			}
			// Paddle movement logging removed for performance
		}

		// Right paddle - EXACTLY like single-player moveUp/moveDown
		if (gameState.paddles.right.moving && gameState.paddles.right.direction !== 0) {
			const oldY = gameState.paddles.right.y;
			const newY = gameState.paddles.right.y + gameState.paddles.right.direction * gameState.paddles.right.speed * deltaTime;

			// EXACTLY like single-player: use court bounds with paddle gap
			const courtTop = VIRTUAL_BORDER_TOP;
			const courtBottom = VIRTUAL_HEIGHT - VIRTUAL_BORDER_BOTTOM;
			const paddleGap = PADDLE_WIDTH * 0.02;
			const paddleHeight = gameState.paddles.right.height;

			// Apply EXACT same logic as single-player
			if (gameState.paddles.right.direction > 0) { // moveDown
				gameState.paddles.right.y = Math.min(newY, courtBottom - paddleHeight - paddleGap);
			} else { // moveUp
				gameState.paddles.right.y = Math.max(newY, courtTop + paddleGap);
			}
			// Paddle movement logging removed for performance
		}
		// Stationary paddles stay exactly where they are - NO modifications (like single-player)

		// Paddle position monitoring (disabled for performance)

		// Paddle movement complete

		// ========================================
		// COLLISION DETECTION (Same logic as single-player)
		// ========================================
		this.checkCollisions(roomId);
	}

	/**
	 * Checks for collisions between ball and paddles/walls
	 * Uses the same collision detection logic as single-player
	 * Handles ball bouncing, scoring, and game end conditions
	 */
	checkCollisions(roomId) {
		const room = this.gameRooms.get(roomId);
		if (!room || !room.gameState) return;

		const gameState = room.gameState;
		const ball = gameState.ball;

		// Ball hits top or bottom walls (same as single-player)
		if (ball.y <= VIRTUAL_BORDER_TOP || ball.y >= VIRTUAL_HEIGHT - VIRTUAL_BORDER_BOTTOM) {
			ball.velocityY = -ball.velocityY;
		}

		// Paddle collision detection - use same AABB logic as single-player
		const leftPaddle = gameState.paddles.left;
		const rightPaddle = gameState.paddles.right;

		// Left paddle collision (ball moving left)
		if (ball.velocityX < 0) {
			const paddleX = leftPaddle.x;
			const paddleTop = leftPaddle.y;
			const paddleBottom = leftPaddle.y + leftPaddle.height;

			// AABB collision check (same as single-player Ball.collidesWithPaddle)
			if (ball.x + ball.size / 2 >= paddleX &&
				ball.x - ball.size / 2 <= paddleX + leftPaddle.width &&
				ball.y + ball.size / 2 >= paddleTop &&
				ball.y - ball.size / 2 <= paddleBottom) {

				// Bounce off left paddle with proper physics (like single-player)
				this.bounceOffPaddle(ball, leftPaddle, 'left');
			}
		}

		// Right paddle collision (ball moving right)
		if (ball.velocityX > 0) {
			const paddleX = rightPaddle.x;
			const paddleTop = rightPaddle.y;
			const paddleBottom = rightPaddle.y + rightPaddle.height;

			// AABB collision check (same as single-player Ball.collidesWithPaddle)
			if (ball.x + ball.size / 2 >= paddleX &&
				ball.x - ball.size / 2 <= paddleX + rightPaddle.width &&
				ball.y + ball.size / 2 >= paddleTop &&
				ball.y - ball.size / 2 <= paddleBottom) {

				// Bounce off right paddle with proper physics (like single-player)
				this.bounceOffPaddle(ball, rightPaddle, 'right');
			}
		}

		// Ball goes out of bounds (scoring) - same as single-player
		if (ball.x <= VIRTUAL_BORDER_X) {
			gameState.paddles.right.score++;
			gameState.lastScorer = 'right'; // Track who scored last
			this.resetBall(roomId);
			this.checkGameEnd(roomId);
		} else if (ball.x >= VIRTUAL_WIDTH - VIRTUAL_BORDER_X) {
			gameState.paddles.left.score++;
			gameState.lastScorer = 'left'; // Track who scored last
			this.resetBall(roomId);
			this.checkGameEnd(roomId);
		}
	}

	/**
	 * Handles ball bouncing off paddles with realistic physics
	 * Calculates bounce angle based on where the ball hits the paddle
	 * Increases ball speed gradually for more exciting gameplay
	 * @param {Object} ball - The ball object with position and velocity
	 * @param {Object} paddle - The paddle object that was hit
	 * @param {string} paddleSide - 'left' or 'right' to determine bounce direction
	 */
	bounceOffPaddle(ball, paddle, paddleSide) {
		// Prevent sticking to the paddle
		if (paddleSide === 'left') {
			ball.x = paddle.x + paddle.width + ball.size / 2 + 1;
		} else {
			ball.x = paddle.x - ball.size / 2 - 1;
		}

		// Calculate normalized hit position (-1 to 1) like single-player
		const relativeIntersectY = (ball.y - (paddle.y + paddle.height / 2));
		const normalized = relativeIntersectY / (paddle.height / 2);
		const maxBounceAngle = Math.PI / 4; // 45 degrees (medium difficulty)
		const bounceAngle = normalized * maxBounceAngle;

		// Calculate current speed and increase by 25% (more controlled gameplay)
		let speed = Math.sqrt(ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY);
		speed = Math.max(Math.min(speed * 1.25, BALL_SPEED_MAX), BALL_SPEED_MIN);

		// Update velocity: always right direction after left paddle, or left direction after right paddle
		ball.velocityX = (paddleSide === 'left' ? Math.abs(speed * Math.cos(bounceAngle)) : -Math.abs(speed * Math.cos(bounceAngle)));
		ball.velocityY = speed * Math.sin(bounceAngle);
	}

	resetBall(roomId) {
		const room = this.gameRooms.get(roomId);
		if (!room || !room.gameState) return;

		const ball = room.gameState.ball;
		ball.x = VIRTUAL_WIDTH / 2; // Center of screen (same as single-player)
		ball.y = VIRTUAL_HEIGHT / 2; // Center of screen (same as single-player)

		// Serve toward the player who just scored (like single-player)
		const direction = room.gameState.lastScorer === 'left' ? 1 : -1; // left scored = serve right, right scored = serve left
		const angle = (Math.random() - 0.5) * Math.PI / 4; // Random angle up to 45 degrees
		ball.velocityX = direction * BALL_SPEED_MIN * Math.cos(angle);
		ball.velocityY = BALL_SPEED_MIN * Math.sin(angle);
	}

	checkGameEnd(roomId) {
		const room = this.gameRooms.get(roomId);
		if (!room || !room.gameState) return;

		const leftScore = room.gameState.paddles.left.score;
		const rightScore = room.gameState.paddles.right.score;

		// Use score limit from constants

		if (leftScore >= SCORE_MAX || rightScore >= SCORE_MAX) {
			room.gameState.gamePhase = 'finished';
			room.status = 'waiting'; // Reset to waiting for next game

			const winner = leftScore >= SCORE_MAX ? room.players[0] : room.players[1];
			const loser = leftScore >= SCORE_MAX ? room.players[1] : room.players[0];

			winner.wins++;
			loser.losses++;

			room.gameState.winner = winner.userId;

			// Reset player ready states for next game
			room.players.forEach(player => {
				player.isReady = false;
			});

			// Clear the game loop
			if (room.gameLoop) {
				clearInterval(room.gameLoop);
				room.gameLoop = null;
			}

			this.io.to(roomId).emit('gameEnd', {
				gameState: room.gameState,
				winner: winner,
				players: room.players
			});
		}
	}

	/**
	 * Handles game input from clients (paddle movement, ready status, etc.)
	 * Validates user authentication and room membership
	 * Updates game state based on player actions
	 * @param {Object} socket - WebSocket connection
	 * @param {Object} data - Input data from client
	 */
	handleGameInput(socket, data) {
		const user = this.connectedUsers.get(socket.id);
		if (!user) {
			return;
		}

		const room = this.gameRooms.get(data.roomId);
		if (!room) {
			return;
		}

		const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
		if (playerIndex === -1) {
			return;
		}

		switch (data.type) {
			case 'paddleMove':
				// Paddle move attempt
				if (room.gameState && room.gameState.gamePhase === 'playing' && room.gameState.gameStarted) {
					const paddleSide = playerIndex === 0 ? 'left' : 'right';
					const paddle = room.gameState.paddles[paddleSide];
					paddle.moving = true;
					paddle.direction = data.direction; // -1: up, 1: down
					// Paddle movement processed
				} else {
					// Paddle move ignored (game not started)
				}
				break;

			case 'paddleStop':
				if (room.gameState && room.gameState.gamePhase === 'playing' && room.gameState.gameStarted) {
					const paddleSide = playerIndex === 0 ? 'left' : 'right';
					const paddle = room.gameState.paddles[paddleSide];
					paddle.moving = false;
					paddle.direction = 0;
					// Paddle stopped
				} else {
					// Paddle stop ignored (game not started)
				}
				break;

			case 'ready':
				const player = room.players[playerIndex];
				player.isReady = true;
				// Room status updated

				this.io.to(data.roomId).emit('playerReady', {
					player: player,
					players: room.players,
					room: room
				});

				// Check if all players are ready
				if (room.players.length === room.maxPlayers && room.players.every(p => p.isReady)) {
					this.checkGameStart(data.roomId);
				}
				break;

			case 'gameStart':
				if (player.isHost && room.players.length === room.maxPlayers) {
					this.checkGameStart(data.roomId);
				}
				break;
		}
	}

	handleDisconnect(socket) {
		const user = this.connectedUsers.get(socket.id);
		if (user) {
			this.connectedUsers.delete(socket.id);

			// Remove user from any rooms they were in
			this.gameRooms.forEach((room, roomId) => {
				const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
				if (playerIndex !== -1) {
					room.players.splice(playerIndex, 1);

					// If game was in progress, end it immediately
					if (room.status === 'playing' && room.gameState && room.gameState.gamePhase === 'playing') {
						// Clear the game loop
						if (room.gameLoop) {
							clearInterval(room.gameLoop);
							room.gameLoop = null;
						}

						// Reset room state
						room.status = 'waiting';
						room.gameState = null;

						// Reset player ready states
						room.players.forEach(player => {
							player.isReady = false;
						});
					}

					this.io.to(roomId).emit('playerLeft', {
						player: user,
						players: room.players
					});

					// If room is empty, delete it
					if (room.players.length === 0) {
						this.gameRooms.delete(roomId);
					}
				}
			});
		}
	}

	getRooms() {
		return Array.from(this.gameRooms.values());
	}

	getConnectedUsers() {
		return Array.from(this.connectedUsers.values());
	}
}

module.exports = WebSocketServer; 