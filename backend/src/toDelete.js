const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const GameManager = require('./wss/GameManager.js');
const RoomManager = require('./wss/RoomManager.js');
const UserManager = require('./wss/UserManager.js');
const ChatManager = require('./wss/ChatManager.js');
const InviteManager = require('./wss/InviteManager.js');
const Validator = require('./wss/Validator.js');
const Logger = require('./wss/Logger.js');

class WebSocketServer {
	constructor(port) {
		this.port = port;
		this.io = null;

		// initialize manager classes
		this.gameManager = new GameManager();
		this.roomManager = new RoomManager();
		this.userManager = new UserManager();
		this.chatManager = new ChatManager();
		this.inviteManager = new InviteManager();
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

			// for debug
			socket.on('browserLog', (data) => {
				Logger.handleBrowserLog(socket, data);
			});
		});
	}

	handleAuthentication(socket, data) {
		try {
			const username = data.username;
			const userId = data.userId;

			// add new user connection using user manager
			const user = this.userManager.addUser(socket.id, userId, username);

			// sends authentication success to client
			socket.emit('authenticated', { success: true, username: username });

			// broadcasts user online status to all other connected users
			const allUsers = this.userManager.getOnlineUsers();

			// Send to all users EXCEPT the sender using socket.broadcast
			socket.broadcast.emit('userStatusUpdate', {
				username,
				status: 'online',
				allUsers
			});

			// Only send online users to the newly connected user, not broadcast to all
			socket.emit('onlineUsers', allUsers);

			Logger.logUserEvent('authenticated', username);
		} catch (error) {
			Logger.error('Authentication failed', { username: data.username, error: error.message });
			socket.emit('authenticated', { success: false, error: 'Authentication failed' });
		}
	}

	// creates new game room with host player
	handleCreateRoom(socket, data) {
		const user = this.userManager.getUser(socket.id);
		if (!Validator.validateUser(socket, user)) {
			return;
		}

		// check if already in a room
		const roomCheck = this.roomManager.isPlayerInRoom(socket.id);
		if (roomCheck.inRoom) {
			socket.emit('error', { message: 'You are already in a room' });
			return;
		}

		// create room using room manager
		const { roomId, room } = this.roomManager.createRoom(user, data.difficulty);
		socket.join(roomId);

		Logger.logRoomEvent('created', roomId, { hostUsername: user.username, difficulty: data.difficulty });
		socket.emit('roomCreated', { roomId, room });

		// emit roomUpdated for the specific room
		this.io.to(roomId).emit('roomUpdated', { roomId, room });
	}

	handleGetAvailableRooms(socket) {
		// sends list of available rooms to requesting client
		const availableRooms = this.roomManager.getAvailableRooms();
		socket.emit('availableRooms', availableRooms);
	}

	// adds player to existing room
	handleJoinRoom(socket, data) {
		const user = this.userManager.getUser(socket.id);
		if (!Validator.validateUser(socket, user)) {
			return;
		}

		// check if already in a room
		const roomCheck = this.roomManager.isPlayerInRoom(socket.id);
		if (roomCheck.inRoom) {
			socket.emit('error', { message: 'You are already in a room' });
			return;
		}

		// add player to room using room manager
		const result = this.roomManager.addPlayerToRoom(data.roomId, user);
		if (!result.success) {
			socket.emit('error', { message: result.error });
			return;
		}

		const room = result.room;
		socket.join(data.roomId);

		// send playerJoined event to the room
		this.io.to(data.roomId).emit('playerJoined', {
			player: user,
			players: room.players,
			roomId: data.roomId,
			room: room
		});

		// Send current ready status to the new player so they can see who's already ready
		const readyPlayers = room.players.filter(p => p.isReady);
		readyPlayers.forEach(readyPlayer => {
			if (readyPlayer.socketId !== socket.id) { // Don't send to the player who just joined
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

		// emit roomUpdated for the specific room
		this.io.to(data.roomId).emit('roomUpdated', { roomId: data.roomId, room });

		Logger.logRoomEvent('playerJoined', data.roomId, { username: user.username });
	}

	handleLeaveRoom(socket, data) {
		const user = this.userManager.getUser(socket.id);
		if (!Validator.validateUser(socket, user)) {
			return;
		}

		const roomId = data.roomId;
		const room = this.roomManager.getRoom(roomId);
		if (!Validator.validateRoom(roomId, room).valid) {
			socket.emit('error', { message: 'Room not found' });
			return;
		}

		// Remove player from room using room manager
		const result = this.roomManager.removePlayerFromRoom(roomId, socket.id);
		if (!result.success) {
			socket.emit('error', { message: result.error });
			return;
		}

		socket.leave(roomId);

		// Emit playerLeft to room
		if (result.room) {
			this.io.to(roomId).emit('playerLeft', {
				player: user,
				players: result.room.players,
				roomId: roomId,
				room: result.room
			});
		}

		Logger.logRoomEvent('playerLeft', roomId, { username: user.username });
	}

	handlePlayerReady(socket, data) {
		const user = this.userManager.getUser(socket.id);
		if (!Validator.validateUser(socket, user)) {
			return;
		}

		const roomId = data.roomId;
		const room = this.roomManager.getRoom(roomId);
		if (!Validator.validateRoom(roomId, room).valid) {
			socket.emit('error', { message: 'Room not found' });
			return;
		}

		// Set player ready using room manager
		const result = this.roomManager.setPlayerReady(roomId, socket.id);
		if (!result.success) {
			socket.emit('error', { message: result.error });
			return;
		}

		const updatedRoom = result.room;
		const player = updatedRoom.players.find(p => p.socketId === socket.id);

		Logger.logRoomEvent('playerReady', roomId, { username: player.username });

		// Emit playerReady to the room
		this.io.to(roomId).emit('playerReady', {
			player: player,
			players: updatedRoom.players,
			roomId: roomId,
			room: updatedRoom
		});

		// Check if game can start
		this.checkGameStart(roomId);
	}

	handleRoomMessage(socket, data) {
		const user = this.userManager.getUser(socket.id);
		if (!Validator.validateUser(socket, user)) {
			return;
		}

		const roomId = data.roomId;
		const room = this.roomManager.getRoom(roomId);
		if (!Validator.validateRoom(roomId, room).valid) {
			socket.emit('error', { message: 'Room not found' });
			return;
		}

		// Check if user is in the room
		if (!Validator.validateRoomMembership(socket, room, user)) {
			return;
		}

		// create room message using chat manager
		const message = this.chatManager.createRoomMessage(roomId, user.userId, user.username, data.message);

		// Emit message to all players in the room
		this.io.to(roomId).emit('roomMessage', message);

		Logger.logChatEvent('roomMessage', user.username, { roomId, message: data.message });
	}

	checkGameStart(roomId) {
		const room = this.roomManager.getRoom(roomId);
		if (!room) {
			return;
		}

		const allReady = this.roomManager.areAllPlayersReady(roomId);

		if (allReady) {
			this.startGame(roomId);
		}
	}

	startGame(roomId) {
		const room = this.roomManager.getRoom(roomId);
		if (!room) {
			return;
		}

		// stop any existing game loop
		this.gameManager.stopGameLoop(roomId);

		// update room status
		this.roomManager.updateRoomStatus(roomId, 'playing');

		// create game state using game manager
		const gameState = this.gameManager.createGameState();
		this.roomManager.setGameState(roomId, gameState);

		this.io.to(roomId).emit('gameStart', {
			gameState: gameState,
			players: room.players
		});

		Logger.logGameEvent('started', roomId, { players: room.players.length });
		this.startCountdown(roomId);
	}

	startCountdown(roomId) {
		const room = this.roomManager.getRoom(roomId);
		if (!room) return;

		// use game manager for countdown
		this.gameManager.startCountdown(roomId, this.io, () => {
			// countdown complete callback
			const updatedRoom = this.roomManager.getRoom(roomId);
			if (updatedRoom && updatedRoom.gameState) {
				updatedRoom.gameState.gamePhase = 'playing';
				updatedRoom.gameState.gameStarted = true;
				updatedRoom.gameState.countdown = 0;

				// reset paddle states
				updatedRoom.gameState.paddles.left.moving = false;
				updatedRoom.gameState.paddles.left.direction = 0;
				updatedRoom.gameState.paddles.right.moving = false;
				updatedRoom.gameState.paddles.right.direction = 0;

				this.io.to(roomId).emit('gameStarted', { gameState: updatedRoom.gameState });
				this.startGameLoop(roomId);
			}
		});
	}

	startGameLoop(roomId) {
		const room = this.roomManager.getRoom(roomId);
		if (!room) return;

		// use game manager for game loop
		this.gameManager.startGameLoop(roomId, this.io, room.gameState, (gameState) => {
			this.io.to(roomId).emit('gameUpdate', {
				gameState: gameState,
				timestamp: Date.now()
			});
		});
	}

	/**
	 * Handles game input from clients (paddle movement, ready status, etc.)
	 * Validates user authentication and room membership
	 * Updates game state based on player actions
	 */
	handleGameInput(socket, data) {
		const user = this.userManager.getUser(socket.id);
		if (!Validator.validateUser(socket, user)) {
			return;
		}

		const room = this.roomManager.getRoom(data.roomId);
		if (!Validator.validateRoom(data.roomId, room).valid) {
			return;
		}

		const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
		if (playerIndex === -1) {
			return;
		}

		switch (data.type) {
			case 'paddleMove':
			case 'paddleStop':
				if (room.gameState && room.gameState.gamePhase === 'playing' && room.gameState.gameStarted) {
					this.gameManager.handlePaddleInput(room.gameState, playerIndex, data.type, data.direction);
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
		const user = this.userManager.getUser(socket.id);
		if (user) {
			// remove user using user manager
			this.userManager.removeUser(socket.id);

			// remove user from any rooms they were in
			const roomCheck = this.roomManager.isPlayerInRoom(socket.id);
			if (roomCheck.inRoom) {
				const result = this.roomManager.removePlayerFromRoom(roomCheck.roomId, socket.id);

				// if game was in progress, end it immediately
				if (result.room && result.room.status === 'playing' && result.room.gameState && result.room.gameState.gamePhase === 'playing') {
					// stop game loop
					this.gameManager.stopGameLoop(roomCheck.roomId);

					// reset room state
					this.roomManager.resetRoom(roomCheck.roomId);
				}

				if (result.room) {
					this.io.to(roomCheck.roomId).emit('playerLeft', {
						player: user,
						players: result.room.players
					});
				}
			}

			// Broadcast user offline status to all OTHER connected users
			const allUsers = this.userManager.getOnlineUsers();

			this.io.emit('userStatusUpdate', {
				username: user.username,
				status: 'offline',
				allUsers
			});

			Logger.logUserEvent('disconnected', user.username);
		}
	}

	// Chat system methods
	handleChatMessage(socket, data) {
		const user = this.userManager.getUser(socket.id);
		if (!user) return;

		// Check rate limiting
		if (!this.userManager.checkRateLimit(socket.id)) {
			socket.emit('chatError', { message: 'You are sending messages too fast. Please wait a moment.' });
			return;
		}

		// validate message using chat manager
		const validation = this.chatManager.validateMessage(data.message);
		if (!validation.valid) {
			socket.emit('chatError', { message: validation.error });
			return;
		}

		if (validation.message.startsWith('/')) {
			this.handleSlashCommand(socket, user, validation.message);
			return;
		}

		// create chat message using chat manager
		const chatMessage = this.chatManager.addChatMessage(user.userId, user.username, validation.message, 'global');
		this.io.emit('chatMessage', chatMessage);

		Logger.logChatEvent('message', user.username, { message: validation.message });
	}

	handleDirectMessage(socket, data) {
		const user = this.userManager.getUser(socket.id);
		if (!user) return;

		// Check rate limiting
		if (!this.userManager.checkRateLimit(socket.id)) {
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

		// validate message using chat manager
		const validation = this.chatManager.validateMessage(message);
		if (!validation.valid) {
			socket.emit('chatError', { message: validation.error });
			return;
		}

		const receiver = this.userManager.getUserByUsername(receiverUsername);

		if (!receiver) {
			socket.emit('chatError', { message: 'User not found' });
			return;
		}

		if (this.userManager.isUserBlocked(receiver.userId, user.userId)) {
			socket.emit('chatError', { message: 'Cannot send message to this user' });
			return;
		}

		if (!receiver.socketId) {
			socket.emit('chatError', { message: `${receiverUsername} is offline. Cannot send direct message.` });
			return;
		}

		// create direct message using chat manager
		const directMessage = this.chatManager.createDirectMessage(
			user.userId,
			senderUsername || user.username,
			receiver.userId,
			receiverUsername,
			validation.message
		);

		// Send to receiver
		this.io.to(receiver.socketId).emit('directMessage', directMessage);

		// Send back to sender so they can see their own message
		socket.emit('directMessage', directMessage);

		socket.emit('messageDelivered', {
			messageId: directMessage.id,
			receiverUsername: receiverUsername,
			status: 'delivered'
		});

		Logger.logChatEvent('directMessage', user.username, { receiverUsername, message: validation.message });
	}

	handleBlockUser(socket, data) {
		const user = this.userManager.getUser(socket.id);
		if (!user) return;

		const { targetUsername } = data;
		if (!targetUsername) return;

		// block user using user manager
		const result = this.userManager.blockUser(user.userId, targetUsername);
		if (!result.success) {
			socket.emit('chatError', { message: result.error });
			return;
		}

		socket.emit('userBlocked', {
			blockedUsername: targetUsername,
			message: `You blocked ${targetUsername}`
		});

		Logger.logChatEvent('userBlocked', user.username, { blockedUsername: targetUsername });
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
					socket.emit('chatError', { message: 'Usage: /invite username difficulty' });
					return;
				}
				if (args.length < 2) {
					socket.emit('chatError', { message: 'Usage: /invite username difficulty (EASY, MEDIUM, or HARD)' });
					return;
				}

				const difficulty = args[1];

				// Validate difficulty - only accept EASY, MEDIUM, HARD
				const validDifficulties = ['EASY', 'MEDIUM', 'HARD'];
				if (!validDifficulties.includes(difficulty.toUpperCase())) {
					socket.emit('chatError', { message: 'Difficulty must be EASY, MEDIUM, or HARD' });
					return;
				}

				this.handleGameInvite(socket, user, args[0], difficulty.toUpperCase());
				break;

			case '/accept':
				this.handleInviteCommand(socket, user, 'accept');
				break;

			case '/decline':
				this.handleInviteCommand(socket, user, 'decline');
				break;



			default:
				socket.emit('chatError', { message: 'Unknown command. Use /help, /list, /pm "username" "message", /clear, /invite username difficulty (difficulty: EASY, MEDIUM, or HARD only), /accept, or /decline' });
		}
	}

	handleInviteCommand(socket, user, action) {
		// Find the most recent pending invite for this user using invite manager
		const mostRecentInvite = this.inviteManager.getMostRecentInvite(user.username);

		if (!mostRecentInvite) {
			socket.emit('chatError', { message: 'No pending game invite found' });
			return;
		}

		// Process the invite response
		this.handleInviteResponse(socket, {
			inviteId: mostRecentInvite.id,
			response: action,
			senderUsername: mostRecentInvite.senderUsername,
			receiverUsername: mostRecentInvite.receiverUsername,
			difficulty: mostRecentInvite.difficulty
		});
	}

	handleGameInvite(socket, user, targetUsername, difficulty = 'MEDIUM') {
		// validate invite data using invite manager
		const validation = this.inviteManager.validateInvite(user.username, targetUsername, difficulty);
		if (!validation.valid) {
			socket.emit('chatError', { message: validation.error });
			return;
		}

		// check if inviter is already in a game
		const inviterInGame = this.roomManager.isPlayerInRoom(user.socketId).inRoom;
		if (inviterInGame) {
			socket.emit('chatError', { message: 'You are already in a game' });
			return;
		}

		// check if receiver is already in a game
		const targetUser = this.userManager.getUserByUsername(targetUsername);
		if (!targetUser) {
			socket.emit('chatError', { message: 'User not found or offline' });
			return;
		}

		const receiverInGame = this.roomManager.isPlayerInRoom(targetUser.socketId).inRoom;
		if (receiverInGame) {
			socket.emit('chatError', { message: 'User is already in a game' });
			return;
		}

		// check if either user has pending invites
		if (this.inviteManager.hasPendingInvite(user.username)) {
			socket.emit('chatError', { message: 'You already have a pending invite. Wait for it to be accepted or declined.' });
			return;
		}

		if (this.inviteManager.hasPendingInvite(targetUsername)) {
			socket.emit('chatError', { message: 'User already has a pending invite. Wait for them to respond to it first.' });
			return;
		}

		// create invite using invite manager
		const result = this.inviteManager.createInvite(user.userId, user.username, targetUser.userId, targetUsername, difficulty);
		if (!result.success) {
			socket.emit('chatError', { message: result.error });
			return;
		}

		Logger.logInviteEvent('created', user.username, targetUsername, { difficulty });

		if (targetUser.socketId) {
			this.io.to(targetUser.socketId).emit('gameInvite', result.inviteMessage);
		}

		socket.emit('inviteSent', {
			targetUsername,
			message: `Invite sent to ${targetUsername}`
		});
	}

	handleInviteResponse(socket, data) {
		const { inviteId, response, senderUsername, receiverUsername, difficulty } = data;
		const user = this.userManager.getUser(socket.id);

		if (!user) {
			socket.emit('chatError', { message: 'Authentication required' });
			return;
		}

		// Get the stored invite using invite manager
		const invite = this.inviteManager.getInvite(inviteId);

		if (!invite) {
			socket.emit('chatError', { message: 'Invite not found or already processed' });
			return;
		}

		if (response === 'accept') {
			// Remove the invite from pending
			this.inviteManager.removeInvite(inviteId);

			// Find both users to get their socket IDs and user data
			const senderUser = this.userManager.getUserByUsername(senderUsername);
			const receiverUser = this.userManager.getUserByUsername(receiverUsername);

			if (!senderUser || !receiverUser) {
				socket.emit('chatError', { message: 'One or both users not found' });
				return;
			}

			// Create game room following the same pattern as normal room creation
			const roomId = `invite_${Date.now()}`;

			// Start with just the host player (like normal room creation)
			const enhancedHostUser = {
				...senderUser,
				isReady: false,
				isHost: true,
				score: 0,
				wins: 0,
				losses: 0
			};

			const room = {
				id: roomId,
				players: [enhancedHostUser], // Only host initially
				maxPlayers: 2,
				status: 'waiting',
				gameState: null,
				createdAt: Date.now(),
				difficulty: difficulty,
				gameType: 'invite',
				playerMode: 'TWO_PLAYER',
				hostUsername: senderUsername
			};

			this.roomManager.rooms.set(roomId, room);

			// Find both sockets
			const senderSocket = Array.from(this.io.sockets.sockets.values())
				.find(s => this.userManager.getUser(s.id)?.username === senderUsername);
			const receiverSocket = Array.from(this.io.sockets.sockets.values())
				.find(s => this.userManager.getUser(s.id)?.username === receiverUsername);

			// Host creates the room (follows normal flow)
			if (senderSocket) {
				senderSocket.join(roomId);
				senderSocket.emit('inviteAccepted', {
					room,
					message: 'Match accepted! Creating game room...'
				});

				// Send roomCreated to host (like normal room creation)
				senderSocket.emit('roomCreated', { roomId, room });
			}

			// Don't automatically add guest - let them join manually like normal flow
			// This ensures the waiting room is shown properly
			if (receiverSocket) {
				// Just notify guest that invite was accepted
				receiverSocket.emit('inviteAccepted', {
					room,
					message: 'Match accepted! You can now join the game room.'
				});
			}

			Logger.logInviteEvent('accepted', senderUsername, receiverUsername, { difficulty });

		} else if (response === 'decline') {
			// Remove the invite from pending
			this.inviteManager.removeInvite(inviteId);

			// Notify sender that invite was declined
			const senderSocket = Array.from(this.io.sockets.sockets.values())
				.find(s => this.userManager.getUser(s.id)?.username === senderUsername);

			if (senderSocket) {
				socket.emit('inviteDeclined', {
					message: `${receiverUsername} declined your invite`
				});
			}

			Logger.logInviteEvent('declined', senderUsername, receiverUsername, { difficulty });
		}
	}

	// rate limiting and user blocking are now handled by UserManager

	handleGetOnlineUsers(socket) {
		const onlineUsers = this.userManager.getOnlineUsers();
		socket.emit('onlineUsers', onlineUsers);
	}

	handleListUsers(socket) {
		const onlineUsers = this.userManager.getOnlineUsernames();

		const message = this.chatManager.getUserListMessage(onlineUsers);
		socket.emit('chatMessage', message);
	}

	handleHelp(socket) {
		const helpMessage = this.chatManager.getHelpMessage();
		socket.emit('chatMessage', helpMessage);
	}
}

module.exports = WebSocketServer; 