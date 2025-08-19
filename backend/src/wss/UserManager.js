class UserManager {
	constructor() {
		this.connectedUsers = new Map();
		// removed in-memory block list; database is the single source of truth
		this.userRateLimits = new Map();
	}

	// adds new user connection
	addUser(socketId, userId, username) {
		// prevents multiple tabs same user
		const existingUser = Array.from(this.connectedUsers.values()).find(user => user.username === username);
		if (existingUser) {
			this.connectedUsers.delete(existingUser.socketId);
		}

		const user = {
			userId: userId,
			username: username,
			socketId: socketId
		};

		this.connectedUsers.set(socketId, user);
		return user;
	}

	// no-op: legacy API removed; blocks are read directly from DB when needed
	setBlocks() { }

	// gets user by socket id
	getUser(socketId) {
		return this.connectedUsers.get(socketId);
	}

	// gets user by username (case-insensitive)
	getUserByUsername(username) {
		if (!username) return null;
		const lower = String(username).toLowerCase();
		return Array.from(this.connectedUsers.values()).find(user => String(user.username).toLowerCase() === lower) || null;
	}

	// removes user connection
	removeUser(socketId) {
		const user = this.connectedUsers.get(socketId);
		if (user) {
			this.connectedUsers.delete(socketId);
			this.userRateLimits.delete(socketId);
		}
		return user;
	}

	// gets all online users
	getOnlineUsers() {
		return Array.from(this.connectedUsers.values()).map(user => ({
			userId: user.userId,
			username: user.username,
			status: 'online'
		}));
	}

	// gets online usernames for listing
	getOnlineUsernames() {
		return Array.from(this.connectedUsers.values())
			.filter(user => user.username !== 'Anonymous')
			.map(user => user.username);
	}

	// checks if user is online
	isUserOnline(username) {
		return Array.from(this.connectedUsers.values()).some(user => user.username === username);
	}

	// block operations are handled in WebSocketServer via DB; keep signature for compatibility if called
	blockUser() {
		return { success: false, error: 'Not implemented' };
	}

	// block checks are done against DB in WebSocketServer
	isUserBlocked() { return false; }

	// checks rate limiting for user
	checkRateLimit(socketId) {
		const now = Date.now();
		const userLimit = this.userRateLimits.get(socketId);

		// reset counter every minute
		if (!userLimit || (now - userLimit.lastReset) > 60000) {
			this.userRateLimits.set(socketId, { count: 1, lastReset: now });
			return true;
		}

		// allow max 10 messages per minute
		if (userLimit.count >= 10) {
			return false;
		}

		userLimit.count++;
		return true;
	}

	// gets user count
	getUserCount() {
		return this.connectedUsers.size;
	}

	// cleans up inactive users
	cleanupInactiveUsers() {
		// this could be extended to track last activity time
		// for now, just return the current count
		return this.connectedUsers.size;
	}

	// gets user statistics
	getUserStats() {
		return {
			totalConnected: this.connectedUsers.size,
			totalBlocked: 0,
			totalRateLimited: this.userRateLimits.size
		};
	}
}

module.exports = UserManager;
