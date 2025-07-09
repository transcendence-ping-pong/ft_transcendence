CREATE TABLE IF NOT EXISTS users (
	user_id INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT NOT NULL UNIQUE,
	password TEXT NOT NULL,
	secret TEXT NOT NULL,
	google_id TEXT UNIQUE,
	email TEXT
);

-- CREATE TABLE IF NOT EXISTS users (
-- 	userId INTEGER PRIMARY KEY AUTOINCREMENT,
-- 	username TEXT NOT NULL UNIQUE,
-- 	password TEXT NOT NULL,
-- 	secret TEXT NOT NULL,
-- 	googleId TEXT UNIQUE,
-- 	email TEXT
-- );

CREATE TABLE IF NOT EXISTS userStats (
	userId INTEGER NOT NULL PRIMARY KEY,
	displayName TEXT,
	avatar TEXT NOT NULL DEFAULT 'placeholder',
	userStatus INTEGER DEFAULT 0,
	matchCount INTEGER DEFAULT 0,
	winCount INTEGER DEFAULT 0,
	lossCount INTEGER DEFAULT 0,
	tournamentWinCount INTEGER DEFAULT 0,
	FOREIGN KEY (userId) REFERENCES users(userId)
);

CREATE TABLE IF NOT EXISTS friendList (
	userId INTEGER NOT NULL,
	friendId INTEGER NOT NULL,
	friendStatus TEXT DEFAULT 'pending',
	FOREIGN KEY (userId) REFERENCES users(userId),
	FOREIGN KEY (friendId) REFERENCES users(userId)
);


CREATE TABLE IF NOT EXISTS matchHistory (
	userId INTEGER NOT NULL,
	matchId INTEGER NOT NULL,
	FOREIGN KEY (userId) REFERENCES users(userId),
	FOREIGN KEY (matchId) REFERENCES matchStats(matchId)
);

CREATE TABLE IF NOT EXISTS matchStats (
	matchId INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
	creatorUserId INTEGER NOT NULL,
	player1DisplayName TEXT NOT NULL,
	player2DisplayName TEXT NOT NULL DEFAULT 'Bot',
	winnerDisplayName TEXT NOT NULL,
	scorePlayer1 INTEGER,
	scorePlayer2 INTEGER,
	matchType TEXT NOT NULL DEFAULT 'bot',
	forfeit INTEGER,
	date INTEGER,
	time INTEGER,
	FOREIGN KEY (creatorUserId) REFERENCES users(userId)
);
