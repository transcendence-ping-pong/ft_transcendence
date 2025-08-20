CREATE TABLE IF NOT EXISTS users (
	userId INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT NOT NULL UNIQUE,
	password TEXT,
	secret TEXT,  
	googleID TEXT UNIQUE,
	avatar TEXT,
	email TEXT
);

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
	FOREIGN KEY (userId) REFERENCES users (userId) ON DELETE CASCADE	
);

CREATE TABLE IF NOT EXISTS friendList (
	userId INTEGER NOT NULL,
	friendId INTEGER NOT NULL,
	friendStatus TEXT DEFAULT 'pending',
	FOREIGN KEY (userId) REFERENCES users (userId) ON DELETE CASCADE,
	FOREIGN KEY (friendId) REFERENCES users (userId) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS matches (
	matchId INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
	tournamentId INTEGER,
	creatorUserId INTEGER NOT NULL,
	remoteUserId INTEGER,
	player1DisplayName TEXT NOT NULL,
	player2DisplayName TEXT NOT NULL,
	winnerDisplayName TEXT,
	scorePlayer1 INTEGER,
	scorePlayer2 INTEGER,
	date INTEGER,
	time INTEGER,
	FOREIGN KEY (creatorUserId) REFERENCES users (userId),
	FOREIGN KEY (remoteUserId) REFERENCES users (userId)
);

CREATE TABLE IF NOT EXISTS tournaments (
	tournamentId INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
	creatorId INTEGER NOT NULL,
	quarterId1 INTEGER,
	quarterId2 INTEGER,
	quarterId3 INTEGER,
	quarterId4 INTEGER,
	semiId1 INTEGER,
	semiId2 INTEGER,
	finalId INTEGER,
	FOREIGN KEY (creatorId) REFERENCES users (userId)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    userId INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY (userId) REFERENCES users (userId) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS blockedUsers (
	userId INTEGER NOT NULL,
	blockedId INTEGER NOT NULL,
	FOREIGN KEY (userId) REFERENCES users (userId) ON DELETE CASCADE,
	FOREIGN KEY (blockedId) REFERENCES users (userId) ON DELETE CASCADE
);