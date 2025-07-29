const path = require('path');
const fastify = require('fastify')({ logger: true });
const fastifyStatic = require('@fastify/static');

const sqlite3 = require('sqlite3').verbose();
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); 

require('dotenv').config({ path: './backend/src/.env' });

fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/',
});

const port = 4000;

const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

let currentLoggedInUser = null;

let db_path = path.join(path.dirname(__dirname), '/database/database.db');

const db = new sqlite3.Database(db_path, sqlite3.OPEN_READWRITE);

function generateAccessToken(user) {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken(user) {
    return jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
}

function saveRefreshToken(token, userId) {
    return new Promise((resolve, reject) => {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        db.run(`INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, ?)`, 
            [token, userId, expiresAt.toISOString()], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

function findRefreshToken(token) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT rt.*, u.username FROM refresh_tokens rt 
                JOIN users u ON rt.user_id = u.user_id 
                WHERE rt.token = ? AND rt.expires_at > datetime('now')`, 
            [token], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function deleteRefreshToken(token) {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM refresh_tokens WHERE token = ?`, [token], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

function deleteAllUserRefreshTokens(userId) {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM refresh_tokens WHERE user_id = ?`, [userId], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

function authenticateToken(request, reply, done) {
    const authHeader = request.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        reply.status(401).send({ error: 'Access token required' });
        return;
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            reply.status(403).send({ error: 'Invalid or expired token' });
            return;
        }
        request.user = user;
        done();
    });
}

function cleanupExpiredTokens() {
    db.run(`DELETE FROM refresh_tokens WHERE expires_at <= datetime('now')`, function(err) {
        if (err) {
            console.error('Error cleaning up expired tokens:', err);
        } else if (this.changes > 0) {
            console.log(`Cleaned up ${this.changes} expired refresh tokens`);
        }
    });
}

setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

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

fastify.post('/token', async (req, res) => {
    const refreshToken = req.body.token;
    if (!refreshToken) {
        return res.status(401).send({ error: 'Refresh token required' });
    }
    
    try {
        const tokenData = await findRefreshToken(refreshToken);
        if (!tokenData) {
            return res.status(403).send({ error: 'Invalid or expired refresh token' });
        }
        
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
            if (err) return res.status(403).send({ error: 'Invalid refresh token' });
            
            const accessToken = generateAccessToken({ 
                username: tokenData.username, 
                user_id: tokenData.user_id 
            });
            res.send({ accessToken: accessToken });
        });
    } catch (error) {
        console.error('Error verifying refresh token:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
});

fastify.post('/generate', { preHandler: authenticateToken }, (request, reply) => {
    const { username } = request.body;

    if (!username) {
        return reply.status(400).send({ error: 'Username is required' });
    }

    if (request.user.username !== username) {
        return reply.status(403).send({ error: 'You can only generate secrets for your own account' });
    }

    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) {
            return reply.status(500).send({ error: 'Error fetching user from database' });
        }

        if (!row) {
            return reply.status(404).send({ error: 'User not found' });
        }

        const secret = speakeasy.generateSecret({ name: "ft_transcendence(" + username + ")" });

        qrcode.toDataURL(secret.otpauth_url, function (err, qrCodeUrl) {
            if (err) {
                return reply.status(500).send({ error: 'Error generating QR code' });
            }

            reply.send({ qrCodeUrl, secret: secret.base32 });
        });
    });
});

fastify.post('/verify-token', (req, res) => {
    const { username, token, secret } = req.body;

    if (!username || !token) {
        return res.status(400).json({ error: 'Username and token are required' });
    }

    if (secret) {
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 2
        });

        if (verified) {
            db.run(`UPDATE users SET secret = ? WHERE username = ?`, [secret, username], function (err) {
                if (err) {
                    return res.status(500).json({ error: 'Error saving secret to database' });
                }
                res.json({ message: 'Token verified successfully and 2FA enabled' });
            });
        } else {
            res.status(403).json({ error: 'Invalid token' });
        }
    } else {
        db.get(`SELECT secret FROM users WHERE username = ?`, [username], (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Error fetching secret from database' });
            }

            if (!row || !row.secret) {
                return res.status(404).json({ error: 'User not found or authenticator not activated' });
            }

            const verified = speakeasy.totp.verify({
                secret: row.secret,
                encoding: 'base32',
                token: token
            });

            if (verified) {
                res.json({ message: 'Token verified successfully' });
            } else {
                res.status(403).json({ error: 'Invalid token' });
            }
        });
    }
});

fastify.get('/current-token', { preHandler: authenticateToken }, (req, res) => {
    const { username } = req.query;

    if (!username) {
        return res.status(400).send({ error: 'Username is required' });
    }

    if (req.user.username !== username) {
        return res.status(403).send({ error: 'You can only get tokens for your own account' });
    }

    db.get(`SELECT secret FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) {
            return res.status(500).send({ error: 'Error fetching secret from database' });
        }

        if (!row || !row.secret) {
            return res.status(404).send({ error: 'User not found or authenticator not activated' });
        }

        const token = speakeasy.totp({
            secret: row.secret,
            encoding: 'base32'
        });

        res.send({ token });
    });
});
fastify.get('/users', { preHandler: authenticateToken }, (req, res) => {
    db.all(`SELECT user_id, username, secret, google_id, email FROM users`, (err, rows) => {
        if (err) {
            console.error('Database error in /users endpoint:', err);
            return res.status(500).send({ error: 'Error fetching users from database' });
        }
        res.send(rows);
    });
});

fastify.post('/signup', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send({ error: 'Username and password are required' });
    }

    if (!isValidUsername(username)) {
        return res.status(400).send({ 
            error: 'Username must be 3-20 characters long and contain only letters and numbers' 
        });
    }

    if (!isValidPassword(password)) {
        return res.status(400).send({ 
            error: 'Password must be longer than 6 characters' 
        });
    }

    bcrypt.hash(password, 13, (err, hashedPassword) => {
        if (err) {
            return res.status(500).send({ error: 'Error hashing password' });
        }

        db.run(`INSERT INTO users (username, password, secret) VALUES (?, ?, ?)`, [username, hashedPassword, ''], function (dbErr) {
            if (dbErr) {
                if (dbErr.code === 'SQLITE_CONSTRAINT') {
                    return res.status(400).send({ error: 'Username already exists' });
                }
                return res.status(500).send({ error: 'Error saving user to database' });
            }

            res.send({ message: 'Signup successful' });
        });
    });
});

fastify.post('/login', (req, res) => {
    const { username, password, token } = req.body;

    if (!username || !password) {
        return res.status(400).send({ error: 'Username and password are required' });
    }

    if (!isValidUsername(username)) {
        return res.status(400).send({ error: 'Invalid username format' });
    }

    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, row) => {
        if (err) {
            return res.status(500).send({ error: 'Error fetching user from database' });
        }

        if (!row) {
            return res.status(404).send({ error: 'Invalid username or password' });
        }

        bcrypt.compare(password, row.password, async (bcryptErr, passwordMatch) => {
            if (bcryptErr) {
                return res.status(500).send({ error: 'Error verifying password' });
            }

            if (!passwordMatch) {
                return res.status(404).send({ error: 'Invalid username or password' });
            }

            if (row.secret) {
                if (!token) {
                    return res.status(400).send({ error: 'Authenticator token is required', requiresToken: true });
                }

                const verified = speakeasy.totp.verify({
                    secret: row.secret,
                    encoding: 'base32',
                    token: token
                });

                if (!verified) {
                    return res.status(403).send({ error: 'Invalid authenticator token', requiresToken: true });
                }
            }

            currentLoggedInUser = username;
            
            try {
                const user = { username: username, user_id: row.user_id };
                const accessToken = generateAccessToken(user);
                const refreshToken = generateRefreshToken(user);
                
                await saveRefreshToken(refreshToken, row.user_id);
                
                res.send({ 
                    message: 'Login successful', 
                    username: row.username,
                    accessToken: accessToken,    
                    refreshToken: refreshToken
                });
            } catch (tokenError) {
                console.error('Error saving refresh token:', tokenError);
                res.status(500).send({ error: 'Error creating session' });
            }
        });
    });
});

fastify.post('/logout', async (req, res) => {
    const { token } = req.body; 
    currentLoggedInUser = null;
    req.session = null;
    
    if (token) {
        try {
            await deleteRefreshToken(token);
        } catch (error) {
            console.error('Error deleting refresh token:', error);
        }
    }

    res.send({ message: 'Logout successful' });
});

fastify.post('/logout-all', { preHandler: authenticateToken }, async (req, res) => {
    try {
        await deleteAllUserRefreshTokens(req.user.user_id);
        res.send({ message: 'Logged out from all devices' });
    } catch (error) {
        console.error('Error logging out from all devices:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
});

fastify.get('/check-2fa', (req, res) => {
    const { username } = req.query;

    if (!username) {
        return res.status(400).send({ error: 'Username is required' });
    }

    db.get(`SELECT secret FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) {
            return res.status(500).send({ error: 'Error fetching user from database' });
        }

        if (!row) {
            return res.status(404).send({ error: 'User not found' });
        }

        res.send({ has2FA: !!row.secret });
    });
});

fastify.get('/auth/google', (req, res) => {
    const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email'],
    });
    res.redirect(url);
});

fastify.get('/auth/google/callback', async (req, res) => {
    const code = req.query.code;

    if (!code) {
        return res.status(400).send('Invalid request. No authorization code provided.');
    }

    try {
        const { tokens } = await client.getToken(code);
        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name;

        db.get(`SELECT * FROM users WHERE google_id = ?`, [googleId], async (err, row) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send({ error: 'Error handling user in database' });
            }

            let username;
            let user_id;

            if (!row) {
                db.run(`INSERT INTO users (username, password, secret, google_id, email) VALUES (?, ?, ?, ?, ?)`,
                    [name, '', '', googleId, email], function (err) {
                        if (err) {
                            console.error('Database error:', err);
                            return res.status(500).send({ error: 'Error creating user' });
                        }
                        username = name;
                        user_id = this.lastID;
                        sendTokens(username, user_id, res);
                    });
            } else {
                username = row.username;
                user_id = row.user_id;
                sendTokens(username, user_id, res);
            }
        });

        function sendTokens(username, user_id, res) {
            const user = { username, user_id };
            const accessToken = generateAccessToken(user);
            const refreshToken = generateRefreshToken(user);

            saveRefreshToken(refreshToken, user_id)
                .then(() => {
                    res.send({
                        message: 'Login successful',
                        username,
                        accessToken,
                        refreshToken
                    });
                })
                .catch((tokenError) => {
                    console.error('Error saving refresh token:', tokenError);
                    res.status(500).send({ error: 'Error creating session' });
                });
        }
    } catch (error) {
        console.error('Error during Google OAuth callback:', error);
        if (error.message && error.message.includes('invalid_grant')) {
            return res.status(400).send('Authorization code expired or invalid. Please try logging in again.');
        }
        res.status(500).send('Authentication failed. Please try again.');
    }
});

fastify.get('/current-user', { preHandler: authenticateToken }, (req, res) => {
    res.send({ username: req.user.username, user_id: req.user.user_id });
});

fastify.get('/logged-in', (req, res) => {
    const username = req.query.username;
    currentLoggedInUser = username;
    res.redirect('/');
});

fastify.get('/favicon.ico', (req, res) => res.status(204));

fastify.listen({ port: port, host: '0.0.0.0' }, () => {
    console.log(`Server running at http://localhost:${port}`);
});

fastify.post('/change-username', { preHandler: authenticateToken }, (request, reply) => {
    const { newUsername } = request.body;
    if (!newUsername || !isValidUsername(newUsername)) {
        return reply.status(400).send({ error: 'Invalid new username.' });
    }
    db.run(
        `UPDATE users SET username = ? WHERE user_id = ?`,
        [newUsername, request.user.user_id],
        function (err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') {
                    return reply.status(400).send({ error: 'Username already exists.' });
                }
                return reply.status(500).send({ error: 'Database error.' });
            }
            reply.send({ message: 'Username updated successfully.' });
        }
    );
});

fastify.post('/change-email', { preHandler: authenticateToken }, (request, reply) => {
    const { newEmail } = request.body;
    if (!newEmail || !newEmail.includes('@')) {
        return reply.status(400).send({ error: 'Invalid email.' });
    }
    db.run(
        `UPDATE users SET email = ? WHERE user_id = ?`,
        [newEmail, request.user.user_id],
        function (err) {
            if (err) {
                return reply.status(500).send({ error: 'Database error.' });
            }
            reply.send({ message: 'Email updated successfully.' });
        }
    );
});

fastify.post('/change-password', { preHandler: authenticateToken }, (request, reply) => {
    const { newPassword } = request.body;
    if (!newPassword || !isValidPassword(newPassword)) {
        return reply.status(400).send({ error: 'Invalid new password.' });
    }
    bcrypt.hash(newPassword, 13, (err, hashedPassword) => {
        if (err) {
            return reply.status(500).send({ error: 'Error hashing password.' });
        }
        db.run(
            `UPDATE users SET password = ? WHERE user_id = ?`,
            [hashedPassword, request.user.user_id],
            function (err) {
                if (err) {
                    return reply.status(500).send({ error: 'Database error.' });
                }
                reply.send({ message: 'Password updated successfully.' });
            }
        );
    });
});

fastify.post('/generate-new-2fa', { preHandler: authenticateToken }, (request, reply) => {
    const username = request.user.username;
    db.get(`SELECT * FROM users WHERE user_id = ?`, [request.user.user_id], (err, row) => {
        if (err || !row) {
            return reply.status(500).send({ error: 'User not found.' });
        }
        const secret = speakeasy.generateSecret({ name: "ft_transcendence(" + username + ")" });
        db.run(`UPDATE users SET secret = ? WHERE user_id = ?`, [secret.base32, request.user.user_id], function (err) {
            if (err) {
                return reply.status(500).send({ error: 'Error saving new secret.' });
            }
            qrcode.toDataURL(secret.otpauth_url, function (err, qrCodeUrl) {
                if (err) {
                    return reply.status(500).send({ error: 'Error generating QR code.' });
                }
                reply.send({ qrCodeUrl, secret: secret.base32 });
            });
        });
    });
});
