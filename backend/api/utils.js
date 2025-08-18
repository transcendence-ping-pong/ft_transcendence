const jwt = require('jsonwebtoken');

// Existing tournament function
function splitIntoRandomPairs(inputArray) {
	if (inputArray.length !== 8) {
		throw new Error("Input array must contain exactly 8 elements.");
	}

	const copyArray = [...inputArray]
	for (let i = copyArray.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copyArray[i], copyArray[j]] = [copyArray[j], copyArray[i]];
	}

	const result = [];
	for (let i = 0; i < 8; i += 2) {
		result.push([copyArray[i], copyArray[i + 1]]);
	}

	return result;
}

// JWT Helper functions
function generateAccessToken(user) {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken(user) {
    return jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
}

function saveRefreshToken(db, token, userId) {
    return new Promise((resolve, reject) => {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        db.run(`INSERT INTO refresh_tokens (token, userId, expires_at) VALUES (?, ?, ?)`, 
            [token, userId, expiresAt.toISOString()], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

function findRefreshToken(db, token) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT rt.*, u.username, u.email FROM refresh_tokens rt 
                JOIN users u ON rt.userId = u.userId 
                WHERE rt.token = ? AND rt.expires_at > datetime('now')`, 
            [token], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
    });
}

function deleteRefreshToken(db, token) {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM refresh_tokens WHERE token = ?`, [token], function (err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

function deleteAllUserRefreshTokens(db, userId) {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM refresh_tokens WHERE userId = ?`, [userId], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

// Validation functions
function isAlphaNumeric(str) {
    return str.split('').every(char => {
        const isLetter = (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
        const isNumber = char >= '0' && char <= '9';
        return isLetter || isNumber || ' ';
    });
}

function isSafePassword(str) {
    return str.split('').every(char => {
        const isLetter = (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
        const isNumber = char >= '0' && char <= '9';
        const hasSymbols = char >= '!' && char <= '/';
        return isLetter || isNumber || hasSymbols;
    });
}

function isValidUsername(username) {
    if (!username || username.length < 3 || username.length > 20) {
        return false;
    }
    // Allow letters, numbers, spaces, and some common characters
    return /^[a-zA-Z0-9\s._-]+$/.test(username);
}

function isValidPassword(password) {
    if (!password || password.length <= 6) {
        return false;
    }
    return isSafePassword(password);
}

function isValidEmail(email) {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Database helper functions
function dbGet(db, sql, params) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbRun(db, sql, params) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

function dbAll(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// JWT verification middleware
function authenticateToken(req, reply, done) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return reply.status(401).send({ error: 'No token provided' });

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return reply.status(403).send({ error: 'Invalid or expired token' });
        req.user = user;
        done();
    });
}

// function dbRun(db, sql, params) {
// 	return new Promise((resolve, reject) => {
// 		db.run(sql, params, function (err) {
// 			if (err) return reject(err);
// 			resolve({ lastID: this.lastID });
// 		});
// 	});
// };
// TO DO: DB MATCH RUN

function getWinner(db, params) {
	return new Promise((resolve, reject) => {
		db.get('SELECT winnerDisplayName FROM matches WHERE matchId = ?', params, (err, row) => {
			if (err) {
				return reject(err);
			}
			if (row) {
				resolve(row.winnerDisplayName);
			} else {
				resolve(null);
			}
		});
	});
};

module.exports = {
  	splitIntoRandomPairs,
    generateAccessToken,
    generateRefreshToken,
    saveRefreshToken,
    findRefreshToken,
    deleteRefreshToken,
    deleteAllUserRefreshTokens,
    isValidUsername,
    isValidPassword,
    isValidEmail,
    dbGet,
    dbRun,
    dbAll,
    authenticateToken,
    getWinner
};
