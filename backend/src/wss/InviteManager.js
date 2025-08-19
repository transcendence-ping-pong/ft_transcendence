class InviteManager {
	constructor() {
		this.pendingInvites = new Map();
		this.VALID_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];
	}

	// creates new game invite
	createInvite(senderId, senderUsername, receiverId, receiverUsername, difficulty) {
		// validate difficulty
		if (!this.VALID_DIFFICULTIES.includes(difficulty.toUpperCase())) {
			return { success: false, error: 'Difficulty must be EASY, MEDIUM, or HARD' };
		}

		const inviteId = Date.now();
		const inviteMessage = {
			id: inviteId,
			senderId: senderId,
			senderUsername: senderUsername,
			receiverId: receiverId,
			receiverUsername: receiverUsername,
			difficulty: difficulty.toUpperCase(),
			message: `${senderUsername} invited you to play Pong (Difficulty: ${difficulty.toUpperCase()})!`,
			timestamp: Date.now(),
			type: 'invite'
		};

		this.pendingInvites.set(inviteId, inviteMessage);
		return { success: true, inviteId, inviteMessage };
	}

	// gets invite by id
	getInvite(inviteId) {
		return this.pendingInvites.get(inviteId);
	}

	// removes invite
	removeInvite(inviteId) {
		return this.pendingInvites.delete(inviteId);
	}

	// checks if user has pending invite
	hasPendingInvite(username) {
		return Array.from(this.pendingInvites.values()).some(
			invite => invite.senderUsername === username || invite.receiverUsername === username
		);
	}

	// gets most recent invite for user
	getMostRecentInvite(username) {
		let mostRecentInvite = null;
		let mostRecentTime = 0;

		for (const [inviteId, invite] of this.pendingInvites) {
			if (invite.receiverUsername === username && invite.timestamp > mostRecentTime) {
				mostRecentInvite = invite;
				mostRecentTime = invite.timestamp;
			}
		}

		return mostRecentInvite;
	}

	// gets all pending invites
	getAllPendingInvites() {
		return Array.from(this.pendingInvites.values());
	}

	// gets invite count
	getInviteCount() {
		return this.pendingInvites.size;
	}

	// validates invite data
	validateInvite(senderUsername, targetUsername, difficulty) {
		if (!senderUsername || !targetUsername) {
			return { valid: false, error: 'Invalid usernames' };
		}

		if (senderUsername === targetUsername) {
			return { valid: false, error: 'You cannot invite yourself' };
		}

		if (!difficulty || !this.VALID_DIFFICULTIES.includes(difficulty.toUpperCase())) {
			return { valid: false, error: 'Difficulty must be EASY, MEDIUM, or HARD' };
		}

		return { valid: true };
	}

	// cleans up expired invites (older than 1 hour)
	cleanupExpiredInvites() {
		const now = Date.now();
		const oneHour = 60 * 60 * 1000;

		for (const [inviteId, invite] of this.pendingInvites) {
			if (now - invite.timestamp > oneHour) {
				this.pendingInvites.delete(inviteId);
			}
		}
	}

	// gets invite statistics
	getInviteStats() {
		return {
			totalPending: this.pendingInvites.size,
			validDifficulties: this.VALID_DIFFICULTIES
		};
	}
}

module.exports = InviteManager;
