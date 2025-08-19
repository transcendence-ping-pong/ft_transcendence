class ChatManager {
	constructor() {
		this.chatMessages = [];
		this.MAX_MESSAGE_LENGTH = 500;
		this.MAX_MESSAGES = 50;
	}

	// adds new chat message
	addChatMessage(senderId, senderUsername, message, type = 'global') {
		const chatMessage = {
			id: Date.now(),
			senderId: senderId,
			senderUsername: senderUsername,
			message: message,
			timestamp: Date.now(),
			type: type
		};

		// add message and maintain limit
		this.chatMessages.push(chatMessage);
		if (this.chatMessages.length > this.MAX_MESSAGES) {
			this.chatMessages.shift(); // remove oldest message
		}

		return chatMessage;
	}

	// gets recent chat messages
	getRecentMessages() {
		return [...this.chatMessages];
	}

	// validates message
	validateMessage(message) {
		if (!message || typeof message !== 'string') {
			return { valid: false, error: 'Invalid message' };
		}

		const trimmedMessage = message.trim();
		if (trimmedMessage.length === 0) {
			return { valid: false, error: 'Message cannot be empty' };
		}

		if (trimmedMessage.length > this.MAX_MESSAGE_LENGTH) {
			return { valid: false, error: `Message too long. Maximum ${this.MAX_MESSAGE_LENGTH} characters allowed.` };
		}

		return { valid: true, message: trimmedMessage };
	}

	// creates system message
	createSystemMessage(message) {
		return {
			id: Date.now(),
			senderId: 0,
			senderUsername: 'System',
			message: message,
			timestamp: Date.now(),
			type: 'system'
		};
	}

	// creates direct message
	createDirectMessage(senderId, senderUsername, receiverId, receiverUsername, message) {
		return {
			id: Date.now(),
			senderId: senderId,
			senderUsername: senderUsername,
			receiverId: receiverId,
			receiverUsername: receiverUsername,
			message: message,
			timestamp: Date.now(),
			type: 'direct'
		};
	}

	// creates room message
	createRoomMessage(roomId, senderId, senderUsername, message) {
		return {
			id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			roomId: roomId,
			senderId: senderId,
			username: senderUsername,
			message: message,
			timestamp: Date.now(),
			type: 'room'
		};
	}

	// gets help message
	getHelpMessage() {
		return this.createSystemMessage(
			'Available commands: /help - Show this help message, /list - List online users, /pm "username" "message", /clear - Clear chat, /invite username difficulty (difficulty: EASY, MEDIUM, or HARD only), /accept - Accept game invite, /decline - Decline game invite'
		);
	}

	// gets user list message
	getUserListMessage(usernames) {
		return this.createSystemMessage(`Online Users: ${usernames.join(', ')}`);
	}

	// clears chat history
	clearChat() {
		this.chatMessages = [];
	}

	// gets chat statistics
	getChatStats() {
		return {
			totalMessages: this.chatMessages.length,
			maxMessages: this.MAX_MESSAGES,
			maxMessageLength: this.MAX_MESSAGE_LENGTH
		};
	}
}

module.exports = ChatManager;
