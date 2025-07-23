CREATE TABLE IF NOT EXISTS users (
	user_id INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT NOT NULL UNIQUE,
	password TEXT NOT NULL,
	secret TEXT NOT NULL,
	google_id TEXT UNIQUE,
	email TEXT
);

CREATE TABLE IF NOT EXISTS user_stats (
	user_id INTEGER NOT NULL PRIMARY KEY,
	username TEXT NOT NULL,
	displayname TEXT,
	avatar TEXT NOT NULL DEFAULT 'placeholder',
	user_status INTEGER DEFAULT 0,
	match_count INTEGER DEFAULT 0,
	win_count INTEGER DEFAULT 0,
	loss_count INTEGER DEFAULT 0,
	tornament_win_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS friend_list (
	user_id INTEGER NOT NULL,
	friend_id INTEGER NOT NULL,
	friendship_status TEXT,
	FOREIGN KEY (user_id) REFERENCES users(user_id),
	FOREIGN KEY (friend_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS match_history (
	user_id INTEGER NOT NULL,
	match_id INTEGER NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(user_id),
	FOREIGN KEY (match_id) REFERENCES match_stats(match_id)
);

CREATE TABLE IF NOT EXISTS match_stats (
	match_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
	player1_id INTEGER NOT NULL,
	player2_id INTEGER NOT NULL,
	score_player1 INTEGER,
	score_player2 INTEGER,
	forfeit INTEGER,
	winnerId INTEGER,
	date INTEGER,
	time INTEGER
);
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);