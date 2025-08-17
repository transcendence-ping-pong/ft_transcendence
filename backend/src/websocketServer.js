const { Server } = require('socket.io');
const {
	// coords
	VIRTUAL_WIDTH,
	VIRTUAL_HEIGHT,
	VIRTUAL_BORDER_TOP,
	VIRTUAL_BORDER_BOTTOM,
	VIRTUAL_BORDER_X,
	GAME_AREA_HEIGHT,
	GAME_AREA_WIDTH,

	// ball
	BALL_SPEED_MIN,
	BALL_SPEED_MAX,
	BALL_SIZE,

	// paddle
	PADDLE_SPEED,
	PADDLE_HEIGHT,
	PADDLE_WIDTH,
	PADDLE_MARGIN_X,
	LEFT_PADDLE_X,
	RIGHT_PADDLE_X,

	// game settings
	SCORE_MAX,
	GAME_FPS
} = require('./gameConstants.js');

class WebSocketServer {
	constructor(port) {
		this.port = port;
		this.io = null;
		this.gameRooms = new Map();
		this.connectedUsers = new Map();

		// Chat system
		this.chatMessages = []; // In-memory for now
		this.userBlocks = new Map(); // Map of blocker -> Set of blocked users
		this.userRateLimits = new Map(); // Map of socketId -> { count: number, lastReset: number }
		this.lastInviteTime = new Map(); // Map of username -> last invite timestamp
		this.pendingInvites = new Map(); // Map of inviteId -> invite data
		this.mockUsers = [
			{ userId: 1, username: 'Alice', socketId: null },
			{ userId: 2, username: 'Bob', socketId: null },
			{ userId: 3, username: 'Charlie', socketId: null }
		];
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
			socket.on('authenticate', (data) => {
				this.handleAuthentication(socket, data);
			});

			socket.on('createRoom', (data) => {
				this.handleCreateRoom(socket, data);
			});

			socket.on('getAvailableRooms', () => {
				this.handleGetAvailableRooms(socket);
			});

			socket.on('leaveRoom', (data) => {
				this.handleLeaveRoom(socket, data);
			});

			socket.on('playerReady', (data) => {
				this.handlePlayerReady(socket, data);
			});

			socket.on('sendRoomMessage', (data) => {
				this.handleRoomMessage(socket, data);
			});

			socket.on('joinRoom', (data) => {
				this.handleJoinRoom(socket, data);
			});

			// handles game input
			socket.on('gameInput', (data) => {
				this.handleGameInput(socket, data);
			});

			// handles chat messages
			socket.on('chatMessage', (data) => {
				this.handleChatMessage(socket, data);
			});

			// handles direct messages
			socket.on('directMessage', (data) => {
				this.handleDirectMessage(socket, data);
			});

			// handles invite responses
			socket.on('inviteResponse', (data) => {
				this.handleInviteResponse(socket, data);
			});

			// handles online users request
			socket.on('getOnlineUsers', () => {
				this.handleGetOnlineUsers(socket);
			});

			// handles user blocking
			socket.on('blockUser', (data) => {
				this.handleBlockUser(socket, data);
			});

			// handles user disconnection
			socket.on('disconnect', () => {
				this.handleDisconnect(socket);
			});

			socket.on('test', (data) => {
				socket.emit('test', 'Hello from server!');
			});

			// for debug
			socket.on('browserLog', (data) => {
				console.log(`[BROWSER ${data.level}] ${data.message}`, data.data || '');
			});
		});
	}

	// Handle authentication with proper session management
	handleAuthentication(socket, data) {
		try {
			const username = data.username || data.token || 'Anonymous';

			// Remove any existing connection for this username (prevents multiple tabs issue)
			const existingUser = Array.from(this.connectedUsers.values()).find(u => u.username === username);
			if (existingUser) {
				// Disconnect previous socket if it exists
				if (existingUser.socketId && existingUser.socketId !== socket.id) {
					const previousSocket = this.io.sockets.sockets.get(existingUser.socketId);
					if (previousSocket) {
						previousSocket.disconnect();
					}
					this.connectedUsers.delete(existingUser.socketId);
				}
			}

			// checks if it's a mock user
			const mockUser = this.mockUsers.find(u => u.username === username);
			if (mockUser) {
				// updates mock user's socket id
				mockUser.socketId = socket.id;
			}

			const userId = mockUser ? mockUser.userId : `user_${Date.now()}`;

			// Add new user connection
			this.connectedUsers.set(socket.id, {
				userId: userId,
				username: username,
				socketId: socket.id
			});

			socket.emit('authenticated', { success: true, username: username });

			// broadcasts user online status to all other connected users
			this.broadcastUserStatus(socket, username, 'online');

			// Only send online users to the newly connected user, not broadcast to all
			const onlineUsers = Array.from(this.connectedUsers.values()).map(user => ({
				userId: user.userId,
				username: user.username,
				status: 'online'
			}));
			socket.emit('onlineUsers', onlineUsers);
		} catch (error) {
			socket.emit('authenticated', { success: false, error: 'Authentication failed' });
		}
	}

	// Broadcast user status changes to all OTHER connected users
	broadcastUserStatus(socket, username, status) {
		const allUsers = Array.from(this.connectedUsers.values()).map(u => ({
			username: u.username,
			status: 'online'
		}));

		// Send to all users EXCEPT the sender using socket.broadcast
		socket.broadcast.emit('userStatusUpdate', {
			username,
			status,
			allUsers
		});
	}

	// This function is no longer used - online users are only sent when requested

	handleCreateRoom(socket, data) {
		// creates new game room with host player and metadata
		const user = this.connectedUsers.get(socket.id);
		if (!user) {
			socket.emit('error', { message: 'Not authenticated' });
			return;
		}

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
			createdAt: Date.now(),
			// Add room metadata for listing
			difficulty: data.difficulty || 'MEDIUM',
			gameType: data.gameType || 'ONE_MATCH',
			playerMode: data.playerMode || 'TWO_PLAYER',
			hostUsername: user.username
		};

		this.gameRooms.set(roomId, room);
		socket.join(roomId);

		console.log(`[DEBUG] Emitting roomCreated to socket ${socket.id} with roomId: ${roomId}`);
		socket.emit('roomCreated', { roomId, room });

		// Don't broadcast available rooms automatically - only when requested
		// This prevents the spamming loop

		// Also emit roomUpdated for the specific room
		this.io.to(roomId).emit('roomUpdated', { roomId, room });
	}

	handleGetAvailableRooms(socket) {
		// sends list of available rooms to requesting client
		const availableRooms = [];

		for (const [roomId, room] of this.gameRooms) {
			if (room.status === 'waiting' && room.players.length < room.maxPlayers) {
				availableRooms.push({
					id: room.id,
					hostUsername: room.hostUsername,
					difficulty: room.difficulty,
					gameType: room.gameType,
					playerMode: room.playerMode,
					maxPlayers: room.maxPlayers,
					currentPlayers: room.players.length,
					status: room.status,
					createdAt: room.createdAt
				});
			}
		}

		socket.emit('availableRooms', availableRooms);
	}

	broadcastAvailableRooms() {
		// broadcasts available rooms list to all connected clients
		const availableRooms = [];

		for (const [roomId, room] of this.gameRooms) {
			if (room.status === 'waiting' && room.players.length < room.maxPlayers) {
				availableRooms.push({
					id: room.id,
					hostUsername: room.hostUsername,
					difficulty: room.difficulty,
					gameType: room.gameType,
					playerMode: room.playerMode,
					maxPlayers: room.maxPlayers,
					currentPlayers: room.players.length,
					status: room.status,
					createdAt: room.createdAt
				});
			}
		}

		console.log(`[DEBUG] Broadcasting ${availableRooms.length} available rooms:`, availableRooms);
		this.io.emit('availableRooms', availableRooms);
	}

	handleJoinRoom(socket, data) {
		// adds player to existing room and notifies all players
		const user = this.connectedUsers.get(socket.id);
		if (!user) {
			socket.emit('error', { message: 'Not authenticated' });
			return;
		}

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

		// Send playerJoined event to the room
		this.io.to(data.roomId).emit('playerJoined', {
			player: enhancedUser,
			players: room.players,
			roomId: data.roomId,
			room: room
		});

		// Send current ready status to the new player so they can see who's already ready
		const readyPlayers = room.players.filter(p => p.isReady);
		console.log(`[DEBUG] Room ${data.roomId}: ${readyPlayers.length} players already ready, sending status to new player ${user.username}`);
		readyPlayers.forEach(readyPlayer => {
			if (readyPlayer.socketId !== socket.id) { // Don't send to the player who just joined
				console.log(`[DEBUG] Sending ready status for ${readyPlayer.username} to new player ${user.username}`);
				socket.emit('playerReady', {
					player: readyPlayer,
					players: room.players,
					roomId: data.roomId,
					room: room
				});
			}
		});

		if (room.players.length === room.maxPlayers) {
			this.checkGameStart(data.roomId);
		}

		// Don't broadcast available rooms automatically - only when requested
		// This prevents the spamming loop

		// Also emit roomUpdated for the specific room
		this.io.to(data.roomId).emit('roomUpdated', { roomId: data.roomId, room });
	}

	handleLeaveRoom(socket, data) {
		const user = this.connectedUsers.get(socket.id);
		if (!user) {
			socket.emit('error', { message: 'Not authenticated' });
			return;
		}

		const roomId = data.roomId;
		const room = this.gameRooms.get(roomId);
		if (!room) {
			socket.emit('error', { message: 'Room not found' });
			return;
		}

		// Remove player from room
		room.players = room.players.filter(p => p.socketId !== socket.id);
		socket.leave(roomId);

		// If room is empty, delete it
		if (room.players.length === 0) {
			this.gameRooms.delete(roomId);
		} else {
			// If host left, make first remaining player the host
			if (room.players[0] && !room.players[0].isHost) {
				room.players[0].isHost = true;
			}
		}

		// Don't broadcast available rooms automatically - only when requested
		// This prevents the spamming loop

		// Emit playerLeft to room
		this.io.to(roomId).emit('playerLeft', {
			player: user,
			players: room.players,
			roomId: roomId,
			room: room
		});
	}

	handlePlayerReady(socket, data) {
		const user = this.connectedUsers.get(socket.id);
		if (!user) {
			socket.emit('error', { message: 'Not authenticated' });
			return;
		}

		const roomId = data.roomId;
		const room = this.gameRooms.get(roomId);
		if (!room) {
			socket.emit('error', { message: 'Room not found' });
			return;
		}

		// Find and update the player's ready status
		const player = room.players.find(p => p.socketId === socket.id);
		if (player) {
			player.isReady = true;
			console.log(`[DEBUG] Player ${player.username} marked as ready in room ${roomId}`);

			// Emit playerReady to the room
			console.log(`[DEBUG] Broadcasting playerReady to room ${roomId} for player ${player.username}`);
			this.io.to(roomId).emit('playerReady', {
				player: player,
				players: room.players,
				roomId: roomId,
				room: room
			});

			// Check if game can start
			this.checkGameStart(roomId);
		}
	}

	handleRoomMessage(socket, data) {
		const user = this.connectedUsers.get(socket.id);
		if (!user) {
			socket.emit('error', { message: 'Not authenticated' });
			return;
		}

		const roomId = data.roomId;
		const room = this.gameRooms.get(roomId);
		if (!room) {
			socket.emit('error', { message: 'Room not found' });
			return;
		}

		// Check if user is in the room
		if (!room.players.some(p => p.socketId === socket.id)) {
			socket.emit('error', { message: 'You are not in this room' });
			return;
		}

		const message = {
			id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			roomId: roomId,
			username: user.username,
			message: data.message,
			timestamp: Date.now()
		};

		// Emit message to all players in the room
		this.io.to(roomId).emit('roomMessage', message);
	}

	checkGameStart(roomId) {
		const room = this.gameRooms.get(roomId);
		if (!room || room.players.length < 2) {
			return;
		}

		const allReady = room.players.every(p => p.isReady);

		if (allReady) {
			this.startGame(roomId);
		}
	}

	startGame(roomId) {
		const room = this.gameRooms.get(roomId);
		if (!room) {
			return;
		}

		if (room.gameLoop) {
			clearInterval(room.gameLoop);
			room.gameLoop = null;
		}

		room.status = 'playing';
		room.gameState = {
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

		this.io.to(roomId).emit('gameStart', {
			gameState: room.gameState,
			players: room.players
		});

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
		const deltaTime = (now - gameState.lastUpdate) / 1000;
		gameState.lastUpdate = now;

		// update ball position using physics (position = position + velocity * time)
		gameState.ball.x += gameState.ball.velocityX * deltaTime;
		gameState.ball.y += gameState.ball.velocityY * deltaTime;

		// left paddle movement
		if (gameState.paddles.left.moving && gameState.paddles.left.direction !== 0) {
			const oldY = gameState.paddles.left.y;
			const newY = gameState.paddles.left.y + gameState.paddles.left.direction * gameState.paddles.left.speed * deltaTime;

			const courtTop = VIRTUAL_BORDER_TOP;
			const courtBottom = VIRTUAL_HEIGHT - VIRTUAL_BORDER_BOTTOM;
			const paddleGap = PADDLE_WIDTH * 0.02;
			const paddleHeight = gameState.paddles.left.height;

			if (gameState.paddles.left.direction > 0) { // moveDown
				gameState.paddles.left.y = Math.min(newY, courtBottom - paddleHeight - paddleGap);
			} else { // moveUp
				gameState.paddles.left.y = Math.max(newY, courtTop + paddleGap);
			}
		}

		// right paddle
		if (gameState.paddles.right.moving && gameState.paddles.right.direction !== 0) {
			const oldY = gameState.paddles.right.y;
			const newY = gameState.paddles.right.y + gameState.paddles.right.direction * gameState.paddles.right.speed * deltaTime;

			const courtTop = VIRTUAL_BORDER_TOP;
			const courtBottom = VIRTUAL_HEIGHT - VIRTUAL_BORDER_BOTTOM;
			const paddleGap = PADDLE_WIDTH * 0.02;
			const paddleHeight = gameState.paddles.right.height;

			if (gameState.paddles.right.direction > 0) { // moveDown
				gameState.paddles.right.y = Math.min(newY, courtBottom - paddleHeight - paddleGap);
			} else { // moveUp
				gameState.paddles.right.y = Math.max(newY, courtTop + paddleGap);
			}
		}

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

		if (ball.y <= VIRTUAL_BORDER_TOP || ball.y >= VIRTUAL_HEIGHT - VIRTUAL_BORDER_BOTTOM) {
			ball.velocityY = -ball.velocityY;
		}

		const leftPaddle = gameState.paddles.left;
		const rightPaddle = gameState.paddles.right;

		// left paddle collision (ball moving left)
		if (ball.velocityX < 0) {
			const paddleX = leftPaddle.x;
			const paddleTop = leftPaddle.y;
			const paddleBottom = leftPaddle.y + leftPaddle.height;

			if (ball.x + ball.size / 2 >= paddleX &&
				ball.x - ball.size / 2 <= paddleX + leftPaddle.width &&
				ball.y + ball.size / 2 >= paddleTop &&
				ball.y - ball.size / 2 <= paddleBottom) {

				this.bounceOffPaddle(ball, leftPaddle, 'left');
			}
		}

		// right paddle collision (ball moving right)
		if (ball.velocityX > 0) {
			const paddleX = rightPaddle.x;
			const paddleTop = rightPaddle.y;
			const paddleBottom = rightPaddle.y + rightPaddle.height;

			if (ball.x + ball.size / 2 >= paddleX &&
				ball.x - ball.size / 2 <= paddleX + rightPaddle.width &&
				ball.y + ball.size / 2 >= paddleTop &&
				ball.y - ball.size / 2 <= paddleBottom) {

				this.bounceOffPaddle(ball, rightPaddle, 'right');
			}
		}

		// ball goes out of bounds (scoring)
		if (ball.x <= VIRTUAL_BORDER_X) {
			gameState.paddles.right.score++;
			gameState.lastScorer = 'right';
			this.resetBall(roomId);
			this.checkGameEnd(roomId);
		} else if (ball.x >= VIRTUAL_WIDTH - VIRTUAL_BORDER_X) {
			gameState.paddles.left.score++;
			gameState.lastScorer = 'left';
			this.resetBall(roomId);
			this.checkGameEnd(roomId);
		}
	}

	/**
	 * Handles ball bouncing off paddles with realistic physics
	 * Calculates bounce angle based on where the ball hits the paddle
	 * Increases ball speed gradually for more exciting gameplay

	 */
	bounceOffPaddle(ball, paddle, paddleSide) {
		// prevent sticking to the paddle
		if (paddleSide === 'left') {
			ball.x = paddle.x + paddle.width + ball.size / 2 + 1;
		} else {
			ball.x = paddle.x - ball.size / 2 - 1;
		}

		// calculate normalized hit position (-1 to 1)
		const relativeIntersectY = (ball.y - (paddle.y + paddle.height / 2));
		const normalized = relativeIntersectY / (paddle.height / 2);
		const maxBounceAngle = Math.PI / 4; // 45 degrees (medium difficulty)
		const bounceAngle = normalized * maxBounceAngle;

		// calculate current speed and increase by 25%
		let speed = Math.sqrt(ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY);
		speed = Math.max(Math.min(speed * 1.25, BALL_SPEED_MAX), BALL_SPEED_MIN);

		// update velocity: always right direction after left paddle, or left direction after right paddle
		ball.velocityX = (paddleSide === 'left' ? Math.abs(speed * Math.cos(bounceAngle)) : -Math.abs(speed * Math.cos(bounceAngle)));
		ball.velocityY = speed * Math.sin(bounceAngle);
	}

	resetBall(roomId) {
		const room = this.gameRooms.get(roomId);
		if (!room || !room.gameState) return;

		const ball = room.gameState.ball;
		ball.x = VIRTUAL_WIDTH / 2;
		ball.y = VIRTUAL_HEIGHT / 2;

		// serve toward the player who just scored
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

		if (leftScore >= SCORE_MAX || rightScore >= SCORE_MAX) {
			room.gameState.gamePhase = 'finished';
			room.status = 'waiting';

			const winner = leftScore >= SCORE_MAX ? room.players[0] : room.players[1];
			const loser = leftScore >= SCORE_MAX ? room.players[1] : room.players[0];

			winner.wins++;
			loser.losses++;

			room.gameState.winner = winner.userId;

			// reset player ready states for next game
			room.players.forEach(player => {
				player.isReady = false;
			});

			// clear the game loop
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
				if (room.gameState && room.gameState.gamePhase === 'playing' && room.gameState.gameStarted) {
					const paddleSide = playerIndex === 0 ? 'left' : 'right';
					const paddle = room.gameState.paddles[paddleSide];
					paddle.moving = true;
					paddle.direction = data.direction; // -1: up, 1: down
				} else {
				}
				break;

			case 'paddleStop':
				if (room.gameState && room.gameState.gamePhase === 'playing' && room.gameState.gameStarted) {
					const paddleSide = playerIndex === 0 ? 'left' : 'right';
					const paddle = room.gameState.paddles[paddleSide];
					paddle.moving = false;
					paddle.direction = 0;
				} else {
				}
				break;

			case 'ready':
				const player = room.players[playerIndex];
				player.isReady = true;

				this.io.to(data.roomId).emit('playerReady', {
					player: player,
					players: room.players,
					room: room
				});

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
			// Clean up rate limiting data
			this.userRateLimits.delete(socket.id);

			// remove user from any rooms they were in
			this.gameRooms.forEach((room, roomId) => {
				const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
				if (playerIndex !== -1) {
					room.players.splice(playerIndex, 1);

					// if game was in progress, end it immediately
					if (room.status === 'playing' && room.gameState && room.gameState.gamePhase === 'playing') {
						// clear the game loop
						if (room.gameLoop) {
							clearInterval(room.gameLoop);
							room.gameLoop = null;
						}

						// reset room state
						room.status = 'waiting';
						room.gameState = null;

						// reset player ready states
						room.players.forEach(player => {
							player.isReady = false;
						});
					}

					this.io.to(roomId).emit('playerLeft', {
						player: user,
						players: room.players
					});

					// if room is empty, delete it
					if (room.players.length === 0) {
						this.gameRooms.delete(roomId);
					}
				}
			});

			// Broadcast user offline status to all OTHER connected users
			// Note: socket is disconnected, so we need to broadcast to all remaining users
			const allUsers = Array.from(this.connectedUsers.values()).map(u => ({
				username: u.username,
				status: 'online'
			}));

			this.io.emit('userStatusUpdate', {
				username: user.username,
				status: 'offline',
				allUsers
			});

			// Don't broadcast online users to all clients - only send to those who request it
		}
	}

	getRooms() {
		return Array.from(this.gameRooms.values());
	}

	getConnectedUsers() {
		return Array.from(this.connectedUsers.values());
	}

	// Chat system methods
	handleChatMessage(socket, data) {
		const user = this.connectedUsers.get(socket.id);
		if (!user) return;

		// Check rate limiting
		if (!this.checkRateLimit(socket.id)) {
			socket.emit('chatError', { message: 'You are sending messages too fast. Please wait a moment.' });
			return;
		}

		const message = data.message?.trim();
		if (!message) return;

		// Validate message length (max 500 characters)
		if (message.length > 500) {
			socket.emit('chatError', { message: 'Message too long. Maximum 500 characters allowed.' });
			return;
		}

		if (message.startsWith('/')) {
			this.handleSlashCommand(socket, user, message);
			return;
		}

		const chatMessage = {
			id: Date.now(),
			senderId: user.userId,
			senderUsername: user.username,
			message: message,
			timestamp: Date.now(),
			type: 'global'
		};

		// Add message and maintain limit of 50 messages
		this.chatMessages.push(chatMessage);
		if (this.chatMessages.length > 50) {
			this.chatMessages.shift(); // Remove oldest message
		}
		this.io.emit('chatMessage', chatMessage);
	}

	handleDirectMessage(socket, data) {
		const user = this.connectedUsers.get(socket.id);
		if (!user) return;

		// Check rate limiting
		if (!this.checkRateLimit(socket.id)) {
			socket.emit('chatError', { message: 'You are sending messages too fast. Please wait a moment.' });
			return;
		}

		const { receiverUsername, message, type, senderUsername } = data;
		if (!receiverUsername || !message) return;

		// Prevent users from sending PMs to themselves
		if (receiverUsername.toLowerCase() === user.username.toLowerCase()) {
			socket.emit('chatError', { message: 'You cannot send a private message to yourself!' });
			return;
		}

		// Validate message length (max 500 characters)
		if (message.length > 500) {
			socket.emit('chatError', { message: 'Message too long. Maximum 500 characters allowed.' });
			return;
		}

		const receiver = Array.from(this.connectedUsers.values())
			.find(u => u.username === receiverUsername);

		if (!receiver) {
			socket.emit('chatError', { message: 'User not found' });
			return;
		}

		if (this.isUserBlocked(receiver.userId, user.userId)) {
			socket.emit('chatError', { message: 'Cannot send message to this user' });
			return;
		}

		if (!receiver.socketId) {
			socket.emit('chatError', { message: `${receiverUsername} is offline. Cannot send direct message.` });
			return;
		}

		const directMessage = {
			id: Date.now(),
			senderId: user.userId,
			senderUsername: senderUsername || user.username,
			receiverId: receiver.userId,
			receiverUsername: receiverUsername,
			message: message,
			timestamp: Date.now(),
			type: type || 'direct'
		};

		// Send to receiver
		this.io.to(receiver.socketId).emit('directMessage', directMessage);

		// Send back to sender so they can see their own message
		socket.emit('directMessage', directMessage);

		socket.emit('messageDelivered', {
			messageId: directMessage.id,
			receiverUsername: receiverUsername,
			status: 'delivered'
		});
	}

	handleBlockUser(socket, data) {
		const user = this.connectedUsers.get(socket.id);
		if (!user) return;

		const { targetUsername } = data;
		if (!targetUsername) return;

		const targetUser = Array.from(this.connectedUsers.values())
			.find(u => u.username === targetUsername);

		if (!targetUser) {
			socket.emit('chatError', { message: 'User not found' });
			return;
		}

		if (!this.userBlocks.has(user.userId)) {
			this.userBlocks.set(user.userId, new Set());
		}
		this.userBlocks.get(user.userId).add(targetUser.userId);

		socket.emit('userBlocked', {
			blockedUsername: targetUsername,
			message: `You blocked ${targetUsername}`
		});
	}

	handleSlashCommand(socket, user, message) {
		const parts = message.split(' ');
		const command = parts[0].toLowerCase();
		const args = parts.slice(1);

		switch (command) {
			case '/help':
				this.handleHelp(socket);
				break;

			case '/list':
				this.handleListUsers(socket);
				break;

			case '/pm':
			case '/msg':
				if (args.length < 2) {
					socket.emit('chatError', { message: 'Usage: /pm "username" "message"' });
					return;
				}
				const targetUsername = args[0];
				const directMessage = args.slice(1).join(' ');
				this.handleDirectMessage(socket, { receiverUsername: targetUsername, message: directMessage });
				break;

			case '/block':
				if (args.length < 1) {
					socket.emit('chatError', { message: 'Usage: /block "username"' });
					return;
				}
				this.handleBlockUser(socket, { targetUsername: args[0] });
				break;

			case '/invite':
				if (args.length < 1) {
					socket.emit('chatError', { message: 'Usage: /invite "username" [difficulty]' });
					return;
				}
				const difficulty = args[1] || 'MEDIUM';
				this.handleGameInvite(socket, user, args[0], difficulty);
				break;

			default:
				socket.emit('chatError', { message: 'Unknown command. Use /help, /list, /pm "username" "message", /clear, or /invite "username" [difficulty]' });
		}
	}

	handleGameInvite(socket, user, targetUsername, difficulty = 'MEDIUM') {
		// prevent self-invite
		if (user.username === targetUsername) {
			socket.emit('chatError', { message: 'You cannot invite yourself' });
			return;
		}

		// check if inviter is already in a game
		const inviterInGame = Array.from(this.gameRooms.values())
			.some(room => room.players.some(p => p.username === user.username));
		if (inviterInGame) {
			socket.emit('chatError', { message: 'You are already in a game' });
			return;
		}

		// check if receiver is already in a game
		const receiverInGame = Array.from(this.gameRooms.values())
			.some(room => room.players.some(p => p.username === targetUsername));
		if (receiverInGame) {
			socket.emit('chatError', { message: 'User is already in a game' });
			return;
		}

		// check if receiver is online
		const targetUser = Array.from(this.connectedUsers.values())
			.find(u => u.username === targetUsername);

		if (!targetUser) {
			socket.emit('chatError', { message: 'User not found or offline' });
			return;
		}

		// check cooldown (10 seconds between invites)
		const now = Date.now();
		const lastInvite = this.lastInviteTime?.get(user.username) || 0;
		if (now - lastInvite < 10000) {
			socket.emit('chatError', { message: 'Please wait 10 seconds between invites' });
			return;
		}

		// update last invite time
		if (!this.lastInviteTime) this.lastInviteTime = new Map();
		this.lastInviteTime.set(user.username, now);

		const inviteId = Date.now();
		const inviteMessage = {
			id: inviteId,
			senderId: user.userId,
			senderUsername: user.username,
			receiverId: targetUser.userId,
			receiverUsername: targetUser.username,
			difficulty: difficulty,
			message: `${user.username} invited you to play Pong (Difficulty: ${difficulty})!`,
			timestamp: Date.now(),
			type: 'invite'
		};

		// Store the pending invite
		this.pendingInvites.set(inviteId, inviteMessage);

		if (targetUser.socketId) {
			this.io.to(targetUser.socketId).emit('gameInvite', inviteMessage);
		}

		socket.emit('inviteSent', {
			targetUsername,
			message: `Invite sent to ${targetUsername}`
		});
	}

	handleInviteResponse(socket, data) {
		const { inviteId, response, senderUsername, receiverUsername, difficulty } = data;
		const user = this.connectedUsers.get(socket.id);

		if (!user) {
			socket.emit('chatError', { message: 'Authentication required' });
			return;
		}

		// Get the stored invite
		const invite = this.pendingInvites.get(inviteId);
		if (!invite) {
			socket.emit('chatError', { message: 'Invite not found or already processed' });
			return;
		}

		if (response === 'accept') {
			// Remove the invite from pending
			this.pendingInvites.delete(inviteId);

			// Create game room using the existing createRoom flow
			const roomId = `invite_${Date.now()}`;
			const room = {
				id: roomId,
				hostUsername: senderUsername,
				guestUsername: receiverUsername,
				difficulty: difficulty,
				gameType: 'invite',
				playerMode: '2v2',
				maxPlayers: 2,
				currentPlayers: 2,
				status: 'waiting',
				createdAt: Date.now(),
				hostReady: false,
				guestReady: false,
				players: [
					{ username: senderUsername, isHost: true, ready: false },
					{ username: receiverUsername, isHost: false, ready: false }
				]
			};

			this.gameRooms.set(roomId, room);

			// Find both sockets
			const senderSocket = Array.from(this.io.sockets.sockets.values())
				.find(s => this.connectedUsers.get(s.id)?.username === senderUsername);
			const receiverSocket = Array.from(this.io.sockets.sockets.values())
				.find(s => this.connectedUsers.get(s.id)?.username === receiverUsername);

			// Notify both players
			if (senderSocket) {
				senderSocket.emit('inviteAccepted', { room, message: 'Match accepted! Starting in 5 seconds...' });
			}
			if (receiverSocket) {
				socket.emit('inviteAccepted', { room, message: 'Match accepted! Starting in 5 seconds...' });
			}

			// Start countdown
			let countdown = 5;
			const countdownInterval = setInterval(() => {
				if (countdown > 0) {
					if (senderSocket) {
						senderSocket.emit('gameCountdown', { countdown });
					}
					if (receiverSocket) {
						socket.emit('gameCountdown', { countdown });
					}
					countdown--;
				} else {
					clearInterval(countdownInterval);

					// Emit roomCreated event to trigger the remote multiplayer flow
					if (senderSocket) {
						senderSocket.emit('roomCreated', { room, roomId });
					}
					if (receiverSocket) {
						socket.emit('playerJoined', {
							player: { username: receiverUsername, isHost: false },
							players: room.players,
							roomId: roomId,
							room: room
						});
					}
				}
			}, 1000);

		} else if (response === 'decline') {
			// Remove the invite from pending
			this.pendingInvites.delete(inviteId);

			// Notify sender that invite was declined
			const senderSocket = Array.from(this.io.sockets.sockets.values())
				.find(s => this.connectedUsers.get(s.id)?.username === senderUsername);

			if (senderSocket) {
				senderSocket.emit('inviteDeclined', {
					message: `${receiverUsername} declined your invite`
				});
			}
		}
	}

	isUserBlocked(blockerId, blockedId) {
		return this.userBlocks.has(blockerId) &&
			this.userBlocks.get(blockerId).has(blockedId);
	}

	// Check rate limiting for user
	checkRateLimit(socketId) {
		const now = Date.now();
		const userLimit = this.userRateLimits.get(socketId);

		// Reset counter every minute
		if (!userLimit || (now - userLimit.lastReset) > 60000) {
			this.userRateLimits.set(socketId, { count: 1, lastReset: now });
			return true;
		}

		// Allow max 10 messages per minute
		if (userLimit.count >= 10) {
			// Timeout the user for 2 minutes if they exceed limit
			const socket = this.io.sockets.sockets.get(socketId);
			if (socket) {
				socket.emit('chatError', { message: 'You have been timed out for 2 minutes due to spam. Chat is frozen.' });
				// Disconnect and reconnect after timeout
				setTimeout(() => {
					if (socket.connected) {
						socket.disconnect();
					}
				}, 2000);
			}
			return false;
		}

		userLimit.count++;
		return true;
	}

	// Reset rate limit for user (when they get timeout)
	resetRateLimit(socketId) {
		this.userRateLimits.delete(socketId);
	}

	updateUserSocketId(userId, socketId) {
		const mockUser = this.mockUsers.find(u => u.userId === userId);
		if (mockUser) {
			mockUser.socketId = socketId;
		}
	}

	handleGetOnlineUsers(socket) {
		const onlineUsers = Array.from(this.connectedUsers.values()).map(user => ({
			userId: user.userId,
			username: user.username,
			status: 'online'
		}));
		socket.emit('onlineUsers', onlineUsers);
	}

	handleListUsers(socket) {
		const onlineUsers = Array.from(this.connectedUsers.values())
			.filter(user => user.username !== 'Anonymous')
			.map(user => user.username);

		socket.emit('chatMessage', {
			id: Date.now(),
			senderId: 0,
			senderUsername: 'System',
			message: `Online Users: ${onlineUsers.join(', ')}`,
			timestamp: Date.now(),
			type: 'global'
		});
	}

	handleHelp(socket) {
		const helpMessage = {
			id: Date.now(),
			senderId: 0,
			senderUsername: 'System',
			message: 'Available commands: /help - Show this help message, /list - List online users, /pm "username" "message", /clear - Clear chat, /invite "username" [difficulty]',
			timestamp: Date.now(),
			type: 'global'
		};
		socket.emit('chatMessage', helpMessage);
	}
}

module.exports = WebSocketServer; 