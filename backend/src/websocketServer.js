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

			socket.on('joinRoom', (data) => {
				this.handleJoinRoom(socket, data);
			});

			// Handle game input
			socket.on('gameInput', (data) => {
				this.handleGameInput(socket, data);
			});

			// Handle chat messages
			socket.on('chatMessage', (data) => {
				this.handleChatMessage(socket, data);
			});

			// Handle direct messages
			socket.on('directMessage', (data) => {
				this.handleDirectMessage(socket, data);
			});

			// Handle user blocking
			socket.on('blockUser', (data) => {
				this.handleBlockUser(socket, data);
			});

			// Handle online users request
			socket.on('getOnlineUsers', (data) => {
				this.handleGetOnlineUsers(socket);
			});

			// Handle disconnection
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

	// for now just using username for login
	handleAuthentication(socket, data) {
		try {
			const username = data.username || data.token || 'Anonymous';

			// Check if it's a mock user
			const mockUser = this.mockUsers.find(u => u.username === username);
			if (mockUser) {
				// Update mock user's socket ID
				mockUser.socketId = socket.id;
			}

			const existingUser = Array.from(this.connectedUsers.values()).find(u => u.username === username);
			if (existingUser && existingUser.socketId !== socket.id) {
				socket.emit('authenticated', { success: false, error: 'Username already taken' });
				return;
			}

			const userId = mockUser ? mockUser.userId : `user_${Date.now()}`;

			this.connectedUsers.set(socket.id, {
				userId: userId,
				username: username,
				socketId: socket.id
			});

			socket.emit('authenticated', { success: true, username: username });

			// Broadcast user online status to all OTHER connected users
			this.broadcastUserStatus(socket, username, 'online');
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

	handleCreateRoom(socket, data) {
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

		this.io.to(data.roomId).emit('playerJoined', {
			player: enhancedUser,
			players: room.players,
			roomId: data.roomId,
			room: room
		});

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

		const message = data.message.trim();
		if (!message) return;

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

		this.chatMessages.push(chatMessage);

		this.io.emit('chatMessage', chatMessage);
	}

	handleDirectMessage(socket, data) {
		const user = this.connectedUsers.get(socket.id);
		if (!user) return;

		const { receiverUsername, message } = data;
		if (!receiverUsername || !message) return;

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
			senderUsername: user.username,
			receiverId: receiver.userId,
			receiverUsername: receiver.username,
			message: message,
			timestamp: Date.now(),
			type: 'direct'
		};

		this.io.to(receiver.socketId).emit('directMessage', directMessage);

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
			case '/pm':
			case '/msg':
				if (args.length < 2) {
					socket.emit('chatError', { message: 'Usage: /pm <username> <message>' });
					return;
				}
				const targetUsername = args[0];
				const directMessage = args.slice(1).join(' ');
				this.handleDirectMessage(socket, { receiverUsername: targetUsername, message: directMessage });
				break;

			case '/block':
				if (args.length < 1) {
					socket.emit('chatError', { message: 'Usage: /block <username>' });
					return;
				}
				this.handleBlockUser(socket, { targetUsername: args[0] });
				break;

			case '/invite':
				if (args.length < 1) {
					socket.emit('chatError', { message: 'Usage: /invite <username>' });
					return;
				}
				this.handleGameInvite(socket, user, args[0]);
				break;

			default:
				socket.emit('chatError', { message: 'Unknown command. Use /pm, /block, or /invite' });
		}
	}

	handleGameInvite(socket, user, targetUsername) {
		const targetUser = Array.from(this.connectedUsers.values())
			.find(u => u.username === targetUsername);

		if (!targetUser) {
			socket.emit('chatError', { message: 'User not found' });
			return;
		}

		const inviteMessage = {
			id: Date.now(),
			senderId: user.userId,
			senderUsername: user.username,
			receiverId: targetUser.userId,
			receiverUsername: targetUser.username,
			message: `${user.username} invited you to play Pong!`,
			timestamp: Date.now(),
			type: 'invite'
		};

		if (targetUser.socketId) {
			this.io.to(targetUser.socketId).emit('gameInvite', inviteMessage);
		}

		socket.emit('inviteSent', {
			targetUsername,
			message: `Invite sent to ${targetUsername}`
		});
	}

	isUserBlocked(blockerId, blockedId) {
		return this.userBlocks.has(blockerId) &&
			this.userBlocks.get(blockerId).has(blockedId);
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
}

module.exports = WebSocketServer; 