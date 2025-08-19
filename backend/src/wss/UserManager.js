class UserManager {
	constructor() {
		this.connectedUsers = new Map();
		this.userBlocks = new Map(); // runtime cache only; source of truth should be DB
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

	// hydrate runtime blocks from DB list (array of numeric ids)
	setBlocks(blockerId, blockedIdList) {
		const set = new Set(blockedIdList || []);
		this.userBlocks.set(blockerId, set);
	}

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

	// blocks user
	blockUser(blockerId, targetUsername) {
		const targetUser = this.getUserByUsername(targetUsername);
		if (!targetUser) {
			return { success: false, error: 'User not found' };
		}

		if (!this.userBlocks.has(blockerId)) {
			this.userBlocks.set(blockerId, new Set());
		}
		this.userBlocks.get(blockerId).add(targetUser.userId);

		return { success: true, blockedUsername: targetUsername };
	}

	// checks if user is blocked
	isUserBlocked(blockerId, blockedId) {
		return this.userBlocks.has(blockerId) &&
			this.userBlocks.get(blockerId).has(blockedId);
	}

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
			totalBlocked: Array.from(this.userBlocks.values()).reduce((total, blockedSet) => total + blockedSet.size, 0),
			totalRateLimited: this.userRateLimits.size
		};
	}
}

module.exports = UserManager;
