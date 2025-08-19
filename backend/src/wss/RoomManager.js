const { v4: uuidv4 } = require('uuid');

class RoomManager {
	constructor() {
		this.rooms = new Map();
	}

	// creates new game room
	createRoom(hostUser, difficulty) {
		const roomId = `room_${uuidv4()}`;
		const hostPlayer = {
			...hostUser,
			isReady: false,
			isHost: true,
		};

		const room = {
			id: roomId,
			players: [hostPlayer],
			maxPlayers: 2,
			status: 'waiting',
			gameState: null,
			createdAt: Date.now(),
			difficulty: difficulty,
			hostUsername: hostUser.username
		};

		this.rooms.set(roomId, room);
		return { roomId, room };
	}

	// gets room by id
	getRoom(roomId) {
		return this.rooms.get(roomId);
	}

	// gets all available rooms
	getAvailableRooms() {
		const availableRooms = [];

		for (const [roomId, room] of this.rooms) {
			if (room.status === 'waiting' && room.players.length < room.maxPlayers) {
				availableRooms.push({
					id: room.id,
					hostUsername: room.hostUsername,
					difficulty: room.difficulty,
					currentPlayers: room.players.length,
					status: room.status,
				});
			}
		}
		return availableRooms;
	}

	// adds player to room
	addPlayerToRoom(roomId, player) {
		const room = this.rooms.get(roomId);
		if (!room) {
			return { success: false, error: 'Room not found' };
		}

		if (room.players.length >= room.maxPlayers) {
			return { success: false, error: 'Room is full' };
		}

		if (room.status === 'playing') {
			return { success: false, error: 'Game is already in progress' };
		}

		const guestPlayer = {
			...player,
			isReady: false,
			isHost: false,
		};

		room.players.push(guestPlayer);
		return { success: true, room };
	}

	// removes player from room
	removePlayerFromRoom(roomId, socketId) {
		const room = this.rooms.get(roomId);
		if (!room) {
			return { success: false, error: 'Room not found' };
		}

		const playerIndex = room.players.findIndex(p => p.socketId === socketId);
		if (playerIndex === -1) {
			return { success: false, error: 'Player not in room' };
		}

		const removedPlayer = room.players[playerIndex];
		room.players.splice(playerIndex, 1);

		// if room is empty, delete it
		if (room.players.length === 0) {
			this.rooms.delete(roomId);
			return { success: true, room: null, removedPlayer };
		}

		// if host left, make first remaining player the host
		if (removedPlayer.isHost && room.players.length > 0) {
			room.players[0].isHost = true;
			room.hostUsername = room.players[0].username;
		}

		return { success: true, room, removedPlayer };
	}

	// checks if player is in any room
	isPlayerInRoom(socketId) {
		for (const [roomId, room] of this.rooms) {
			if (room.players.some(p => p.socketId === socketId)) {
				return { inRoom: true, roomId, room };
			}
		}
		return { inRoom: false };
	}

	// sets player ready status
	setPlayerReady(roomId, socketId) {
		const room = this.rooms.get(roomId);
		if (!room) {
			return { success: false, error: 'Room not found' };
		}

		const player = room.players.find(p => p.socketId === socketId);
		if (!player) {
			return { success: false, error: 'Player not in room' };
		}

		player.isReady = true;
		return { success: true, room };
	}

	// checks if all players are ready
	areAllPlayersReady(roomId) {
		const room = this.rooms.get(roomId);
		if (!room || room.players.length < 2) {
			return false;
		}

		return room.players.every(p => p.isReady);
	}

	// gets ready players count
	getReadyPlayersCount(roomId) {
		const room = this.rooms.get(roomId);
		if (!room) return 0;

		return room.players.filter(p => p.isReady).length;
	}

	// updates room status
	updateRoomStatus(roomId, status) {
		const room = this.rooms.get(roomId);
		if (room) {
			room.status = status;
		}
	}

	// sets game state for room
	setGameState(roomId, gameState) {
		const room = this.rooms.get(roomId);
		if (room) {
			room.gameState = gameState;
		}
	}

	// resets room for new game
	resetRoom(roomId) {
		const room = this.rooms.get(roomId);
		if (room) {
			room.status = 'waiting';
			room.gameState = null;
			room.players.forEach(player => {
				player.isReady = false;
			});
		}
	}

	// deletes room
	deleteRoom(roomId) {
		this.rooms.delete(roomId);
	}

	// gets room count
	getRoomCount() {
		return this.rooms.size;
	}

	// gets total player count
	getTotalPlayerCount() {
		let total = 0;
		for (const room of this.rooms.values()) {
			total += room.players.length;
		}
		return total;
	}

	// cleans up empty rooms
	cleanupEmptyRooms() {
		for (const [roomId, room] of this.rooms) {
			if (room.players.length === 0) {
				this.rooms.delete(roomId);
			}
		}
	}
}

module.exports = RoomManager;
