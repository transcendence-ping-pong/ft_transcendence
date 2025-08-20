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

	// debug logging
	static debug(message, data = {}) {
		// disabled
	}

	// info logging (disabled by default)
	static info(message, data = {}) {
		// disabled
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

	// game event logging
	static logGameEvent(event, roomId, data = {}) {
		// disabled
	}

	// user event logging
	static logUserEvent(event, username, data = {}) {
		// disabled
	}

	// room event logging
	static logRoomEvent(event, roomId, data = {}) {
		//  disabled
	}

	// chat event logging
	static logChatEvent(event, username, data = {}) {
		//  disabled
	}

	// invite event logging
	static logInviteEvent(event, senderUsername, receiverUsername, data = {}) {
		// disabled
	}
}

module.exports = Logger;
