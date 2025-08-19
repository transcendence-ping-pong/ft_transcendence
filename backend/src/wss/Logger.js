class Logger {
	// log levels
	static LEVELS = {
		DEBUG: 'debug',
		INFO: 'info',
		WARN: 'warn',
		ERROR: 'error'
	};

	// log level for backend logging (only errors and warnings to reduce spam)
	static BACKEND_LOG_LEVEL = this.LEVELS.WARN;

	// logs message with level (only if level is important enough for backend)
	static log(level, message, data = {}) {
		// only log errors and warnings to reduce backend spam
		if (level === this.LEVELS.ERROR || level === this.LEVELS.WARN) {
			const timestamp = new Date().toISOString();
			const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

			if (Object.keys(data).length > 0) {
				console.log(logMessage, data);
			} else {
				console.log(logMessage);
			}
		}
	}

	// debug logging (disabled by default)
	static debug(message, data = {}) {
		// debug logging disabled to reduce spam
	}

	// info logging (disabled by default)
	static info(message, data = {}) {
		// info logging disabled to reduce spam
	}

	// warning logging
	static warn(message, data = {}) {
		this.log(this.LEVELS.WARN, message, data);
	}

	// error logging
	static error(message, data = {}) {
		this.log(this.LEVELS.ERROR, message, data);
	}

	// browser log handler - receives logs from frontend via WebSocket
	static handleBrowserLog(socket, data) {
		const { level = 'info', message, data: logData, username, timestamp } = data;

		// always log browser logs to backend console
		const browserTimestamp = timestamp || new Date().toISOString();
		const userInfo = username ? `[${username}]` : '[Anonymous]';
		const logMessage = `[BROWSER ${level.toUpperCase()}] ${userInfo} ${message}`;

		// log to backend console
		if (logData && Object.keys(logData).length > 0) {
			console.log(`[${browserTimestamp}] ${logMessage}`, logData);
		} else {
			console.log(`[${browserTimestamp}] ${logMessage}`);
		}
	}

	// game event logging (disabled to reduce spam)
	static logGameEvent(event, roomId, data = {}) {
		// game event logging disabled to reduce spam
	}

	// user event logging (disabled to reduce spam)
	static logUserEvent(event, username, data = {}) {
		// user event logging disabled to reduce spam
	}

	// room event logging (disabled to reduce spam)
	static logRoomEvent(event, roomId, data = {}) {
		// room event logging disabled to reduce spam
	}

	// chat event logging (disabled to reduce spam)
	static logChatEvent(event, username, data = {}) {
		// chat event logging disabled to reduce spam
	}

	// invite event logging (disabled to reduce spam)
	static logInviteEvent(event, senderUsername, receiverUsername, data = {}) {
		// invite event logging disabled to reduce spam
	}
}

module.exports = Logger;
