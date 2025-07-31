const MSG = require('../src/messageConstants');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');

let currentLoggedInUser = null; // Optional: to keep track of the currently logged-in user

function isValidUsername(username) {
    if (!username || username.length < 3 || username.length > 20) {
        return false;
    }
    return isAlphaNumeric(username);
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


function isAlphaNumeric(str) {
    return str.split('').every(char => {
        const isLetter = (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
        const isNumber = char >= '0' && char <= '9';
        return isLetter || isNumber;
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

function generateAccessToken(user) {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken(user) {
    return jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
}

async function userRoutes(fastify, options) {

	const db = fastify.db;

    function saveRefreshToken(token, userId) {
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

	fastify.get('/users/stats', (request, reply) => {
		db.all(`SELECT * FROM userStats`, (err, rows) => {

			if (err) {
				return reply.status(500).send({ error: 'Error fetching users from database' });
			}
			reply.send(rows);
		});
	});

	fastify.get('/users/stats:userId', (request, reply) => {
		const { userId } = request.params;

		db.get(`SELECT * FROM userStats WHERE userId = ?`, matchId, (err, rows) => {
			if (err) {
				return reply.status(500).send({ error: 'Error fetching user from database' });
			}
			reply.send(rows);
		});
	});

	fastify.post('/users/stats:userId', async (request, reply) => {
		const { userId } = request.params;
		
		await db.run(`INSERT INTO userStatus (userId) VALUES (?)`, [userId], function (err) {
			if (err) {
				return reply.status(500).send({ error: 'Error adding match to database' });
			}
		});
	});

	fastify.post('/users/addfriend/:userId', async (request, reply) => {
		const { userId } = request.params;
		
		await db.run(`INSERT INTO userStatus (userId) VALUES (?)`, [userId], function (err) {
			if (err) {
				return reply.status(500).send({ error: 'Error adding match to database' });
			}
		});
	});

    fastify.post('/login', (req, res) => {
        const { email, password, token } = req.body;
    
        if (!email || !password) {
            return res.status(400).send({ error: 'Email and password are required' });
        }
    
        if (!isValidEmail(email)) {
            return res.status(400).send({ error: 'Invalid email format' });
        }
    
        db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, row) => {
            if (err) {
                return res.status(500).send({ error: MSG.ERROR_FETCHING_USER });
            }
            if (!row) {
                return res.status(404).send({ error: MSG.INVALID_CREDENTIALS });
            }
            bcrypt.compare(password, row.password, async (bcryptErr, passwordMatch) => {
                if (bcryptErr) {
                    return res.status(500).send({ error: MSG.ERROR_VERIFYING_PASSWORD });
                }
                if (!passwordMatch) {
                    return res.status(404).send({ error: MSG.INVALID_CREDENTIALS });
                }
                if (row.secret) {
                    if (!token) {
                        return res.status(400).send({ error: MSG.AUTHENTICATOR_TOKEN_REQUIRED, requiresToken: true });
                    }
                    const verified = speakeasy.totp.verify({
                        secret: row.secret,
                        encoding: 'base32',
                        token: token
                    });
                    if (!verified) {
                        return res.status(403).send({ error: MSG.INVALID_AUTHENTICATOR_TOKEN, requiresToken: true });
                    }
                }
                currentLoggedInUser = row.username;
                try {
                    const user = { username: row.username, userId: row.userId, email: row.email };
                    const accessToken = generateAccessToken(user);
                    const refreshToken = generateRefreshToken(user);
                    await saveRefreshToken(refreshToken, row.userId);
                    res.send({
                        message: 'Login successful',
                        username: row.username,
                        accessToken: accessToken,
                        refreshToken: refreshToken
                    });
                } catch (tokenError) {
                    console.error('Error saving refresh token:', tokenError);
                    res.status(500).send({ error: MSG.ERROR_CREATING_SESSION });
                }
            });
        });
    });

    // --- SIGNUP ---
    fastify.post('/signup', (req, res) => {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).send({ error: MSG.EMAIL_AND_PASSWORD_REQUIRED });
        }

        if (!isValidUsername(username)) {
            return res.status(400).send({ error: MSG.INVALID_USERNAME });
        }

        if (!isValidEmail(email)) {
            return res.status(400).send({ error: MSG.INVALID_EMAIL_FORMAT });
        }

        if (!isValidPassword(password)) {
            return res.status(400).send({
                error: MSG.PASSWORD_TOO_SHORT
            });
        }
        
        // Check for existing username or email
        db.get(
            `SELECT username, email FROM users WHERE username = ? OR email = ?`,
            [username, email],
            (err, existingUser) => {
                if (err) {
                    return res.status(500).send({ error: MSG.ERROR_CHECKING_EXISTING_USERS });
                }

                if (existingUser) {
                    if (existingUser.username === username) {
                        return res.status(400).send({ error: MSG.USERNAME_EXISTS });
                    }
                    if (existingUser.email === email) {
                        return res.status(400).send({ error: MSG.EMAIL_EXISTS });
                    }
                }

                bcrypt.hash(password, 13, (hashErr, hashedPassword) => {
                    if (hashErr) {
                        return res.status(500).send({ error: MSG.ERROR_HASHING_PASSWORD });
                    }

                    db.run(
                        `INSERT INTO users (username, email, password, secret) VALUES (?, ?, ?, ?)`,
                        [username, email, hashedPassword, ''],
                        function (dbErr) {
                            if (dbErr) {
                                if (dbErr.code === 'SQLITE_CONSTRAINT') {
                                    return res.status(400).send({ error: MSG.EMAIL_OR_USERNAME_EXISTS });
                                }
                                return res.status(500).send({ error: MSG.ERROR_SAVING_USER });
                            }
                            res.send({ message: 'Signup successful' });
                        }
                    );
                });
            }
        );
    });
};

module.exports = userRoutes;
