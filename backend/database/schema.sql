
CREATE TABLE IF NOT EXISTS users (
	userId INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT NOT NULL UNIQUE,
	password TEXT NOT NULL,
	secret TEXT NOT NULL,
	googleID TEXT UNIQUE,
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

-- TODO: Check if displayname can be same as username

CREATE TABLE IF NOT EXISTS userStats (
	userId INTEGER NOT NULL PRIMARY KEY,
	displayName TEXT,
	avatar TEXT NOT NULL DEFAULT 'placeholder',
	userStatus INTEGER DEFAULT 0,
	matchCount INTEGER DEFAULT 0,
	matchWinCount INTEGER DEFAULT 0,
	matchLossCount INTEGER DEFAULT 0,
	tournamentCount INTEGER DEFAULT 0,
	tournamentWinCount INTEGER DEFAULT 0,
	FOREIGN KEY (userId) REFERENCES users (userId)
);

CREATE TABLE IF NOT EXISTS friendList (
	userId INTEGER NOT NULL,
	friendId INTEGER NOT NULL,
	friendStatus TEXT DEFAULT 'pending',
	FOREIGN KEY (userId) REFERENCES users (userId),
	FOREIGN KEY (friendId) REFERENCES users (userId)
);

CREATE TABLE IF NOT EXISTS matchHistory (
	userId INTEGER NOT NULL,
	matchId INTEGER NOT NULL,
	FOREIGN KEY (userId) REFERENCES users (userId),
	FOREIGN KEY (matchId) REFERENCES matchStats (matchId)
);

CREATE TABLE IF NOT EXISTS matchStats (
	matchId INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
	creatorUserId INTEGER NOT NULL,
	remoteUserId INTEGER,
	player1DisplayName TEXT NOT NULL,
	player2DisplayName TEXT NOT NULL,
	winnerDisplayName TEXT,
	scorePlayer1 INTEGER,
	scorePlayer2 INTEGER,
	date INTEGER,
	time INTEGER, -- TODO: Maybe not needed
	FOREIGN KEY (creatorUserId) REFERENCES users (userId),
	FOREIGN KEY (remoteUserId) REFERENCES users (userId)
);

-- TODO: Change this table. Only saying it's ugly and badly organised, is being nice.
CREATE TABLE IF NOT EXISTS tournament (
	tournamentId INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
	creatorId INTEGER NOT NULL,
	quarterfinalId1 INTEGER,
	quarterfinalId2 INTEGER,
	quarterfinalId3 INTEGER,
	quarterfinalId4 INTEGER,
	semifinalId1 INTEGER,
	semifinalId2 INTEGER,
	finalId INTEGER,
	FOREIGN KEY (creatorId) REFERENCES users (userId),
	FOREIGN KEY (quarterfinalId1) REFERENCES matchStats (matchId),
	FOREIGN KEY (quarterfinalId2) REFERENCES matchStats (matchId),
	FOREIGN KEY (quarterfinalId3) REFERENCES matchStats (matchId),
	FOREIGN KEY (quarterfinalId4) REFERENCES matchStats (matchId),
	FOREIGN KEY (semifinalId1) REFERENCES matchStats (matchId),
	FOREIGN KEY (semifinalId2) REFERENCES matchStats (matchId),
	FOREIGN KEY (finalId) REFERENCES matchStats (matchId)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    userId INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY (userId) REFERENCES users (userId) ON DELETE CASCADE
);