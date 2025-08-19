class Validator {
	// validates user authentication
	static validateUser(socket, user) {
		if (!user) {
			socket.emit('error', { message: 'Not authenticated' });
			return false;
		}
		return true;
	}

	// validates room existence
	static validateRoom(roomId, room) {
		if (!room) {
			return { valid: false, error: 'Room not found' };
		}
		return { valid: true, room };
	}

	// validates room membership
	static validateRoomMembership(socket, room, user) {
		if (!room.players.some(p => p.socketId === user.socketId)) {
			socket.emit('error', { message: 'You are not in this room' });
			return false;
		}
		return true;
	}

	// validates game state
	static validateGameState(gameState) {
		if (!gameState) {
			return { valid: false, error: 'Game state not found' };
		}
		return { valid: true, gameState };
	}

	// validates player index
	static validatePlayerIndex(room, socketId) {
		const playerIndex = room.players.findIndex(p => p.socketId === socketId);
		if (playerIndex === -1) {
			return { valid: false, error: 'Player not found in room' };
		}
		return { valid: true, playerIndex };
	}

	// validates message data
	static validateMessageData(data) {
		if (!data.message || typeof data.message !== 'string') {
			return { valid: false, error: 'Invalid message data' };
		}
		return { valid: true };
	}

	// validates invite data
	static validateInviteData(data) {
		if (!data.username || !data.difficulty) {
			return { valid: false, error: 'Missing username or difficulty' };
		}
		return { valid: true };
	}

	// validates room data
	static validateRoomData(data) {
		if (!data.roomId) {
			return { valid: false, error: 'Missing room ID' };
		}
		return { valid: true };
	}

	// validates game input data
	static validateGameInput(data) {
		if (!data.type || !data.roomId) {
			return { valid: false, error: 'Missing game input data' };
		}
		return { valid: true };
	}
}

module.exports = Validator;
