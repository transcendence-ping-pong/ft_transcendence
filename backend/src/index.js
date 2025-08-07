const path = require('path');
const fastify = require('fastify')({ logger: true });
const fastifyStatic = require('@fastify/static');
fastify.register(require('@fastify/cors'), {
  origin: true, // permite qualquer origem (use com cuidado em produção!)
});

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
        db.run(`INSERT INTO refresh_tokens (token, userId, expires_at) VALUES (?, ?, ?)`, 
            [token, userId, expiresAt.toISOString()], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

function findRefreshToken(token) {
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
        db.run(`DELETE FROM refresh_tokens WHERE userId = ?`, [userId], function(err) {
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
        db.get(`SELECT userId, username, email FROM users WHERE userId = ?`, [user.userId], (dbErr, row) => {
            if (dbErr || !row) {
                reply.status(403).send({ error: 'User no longer exists' });
                return;
            }
            request.user = user;
            done();
        });
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

function isValidEmail(email) {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// --- TOKEN REFRESH ---
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
            
            // Add email to the access token
            const accessToken = generateAccessToken({ 
                username: tokenData.username, 
                userId: tokenData.userId,
                email: tokenData.email  // Add this line
            });
            res.send({ accessToken: accessToken });
        });
    } catch (error) {
        console.error('Error verifying refresh token:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
});

// --- 2FA: GENERATE SECRET ---
fastify.post('/generate', { preHandler: authenticateToken }, (request, reply) => {
    const { email } = request.body;

    if (!email) {
        return reply.status(400).send({ error: 'Email is required' });
    }

    // Use the email from the authenticated token if not provided
    const userEmail = email || request.user.email;

    if (request.user.email !== userEmail) {
        return reply.status(403).send({ error: 'You can only generate secrets for your own account' });
    }

    db.get(`SELECT * FROM users WHERE email = ?`, [userEmail], (err, row) => {
        if (err) {
            return reply.status(500).send({ error: 'Error fetching user from database' });
        }
        if (!row) {
            return reply.status(404).send({ error: 'User not found' });
        }

        const secret = speakeasy.generateSecret({ name: "ft_transcendence(" + row.username + ")" });

        qrcode.toDataURL(secret.otpauth_url, function (err, qrCodeUrl) {
            if (err) {
                reply.status(500).send({ error: 'Error generating QR code' });
                return;
            }
            reply.send({ qrCodeUrl, secret: secret.base32 });
            return;
        });
    });
});

// --- 2FA: VERIFY TOKEN ---
fastify.post('/verify-token', (req, res) => {
    const { email, token, secret } = req.body;

    if (!email || !token) {
        return res.status(400).json({ error: 'Email and token are required' });
    }

    if (secret) {
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 2
        });

        if (verified) {
            db.run(`UPDATE users SET secret = ? WHERE email = ?`, [secret, email], function (err) {
                if (err) {
                    return res.status(500).json({ error: 'Error saving secret to database' });
                }
                res.json({ message: 'Token verified successfully and 2FA enabled' });
            });
        } else {
            res.status(403).json({ error: 'Invalid token' });
        }
    } else {
        db.get(`SELECT secret FROM users WHERE email = ?`, [email], (err, row) => {
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

// --- 2FA: CHECK 2FA STATUS ---
fastify.get('/check-2fa', (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).send({ error: 'Email is required' });
    }

    db.get(`SELECT secret FROM users WHERE email = ?`, [email], (err, row) => {
        if (err) {
            return res.status(500).send({ error: 'Error fetching user from database' });
        }
        if (!row) {
            return res.status(404).send({ error: 'User not found' });
        }
        res.send({ has2FA: !!row.secret });
    });
});

// --- 2FA: GET CURRENT TOKEN ---
fastify.get('/current-token', { preHandler: authenticateToken }, (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).send({ error: 'Email is required' });
    }

    if (req.user.email !== email) {
        return res.status(403).send({ error: 'You can only get tokens for your own account' });
    }

    db.get(`SELECT secret FROM users WHERE email = ?`, [email], (err, row) => {
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

// --- SIGNUP ---
fastify.post('/signup', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send({ error: 'Email and password are required' });
    }

    if (!isValidEmail(email)) {
        return res.status(400).send({ error: 'Invalid email format' });
    }

    if (!isValidPassword(password)) {
        return res.status(400).send({ 
            error: 'Password must be longer than 6 characters' 
        });
    }

    const username = email.split('@')[0];

    bcrypt.hash(password, 13, (err, hashedPassword) => {
        if (err) {
            return res.status(500).send({ error: 'Error hashing password' });
        }

        db.run(
            `INSERT INTO users (email, username, password, secret) VALUES (?, ?, ?, ?)`,
            [email, username, hashedPassword, ''],
            function (dbErr) {
                if (dbErr) {
                    if (dbErr.code === 'SQLITE_CONSTRAINT') {
                        return res.status(400).send({ error: 'Email or username already exists' });
                    }
                    return res.status(500).send({ error: 'Error saving user to database' });
                }
                res.send({ message: 'Signup successful' });
            }
        );
    });
});

// --- LOGIN ---
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
            return res.status(500).send({ error: 'Error fetching user from database' });
        }
        if (!row) {
            return res.status(404).send({ error: 'Invalid email or password' });
        }
        bcrypt.compare(password, row.password, async (bcryptErr, passwordMatch) => {
            if (bcryptErr) {
                return res.status(500).send({ error: 'Error verifying password' });
            }
            if (!passwordMatch) {
                return res.status(404).send({ error: 'Invalid email or password' });
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
                res.status(500).send({ error: 'Error creating session' });
            }
        });
    });
});

// --- LOGOUT ---
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

// --- LOGOUT ALL ---
fastify.post('/logout-all', { preHandler: authenticateToken }, async (req, res) => {
    try {
        await deleteAllUserRefreshTokens(req.user.userId);
        res.send({ message: 'Logged out from all devices' });
    } catch (error) {
        console.error('Error logging out from all devices:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
});

// --- CURRENT USER ---
fastify.get('/current-user', { preHandler: authenticateToken }, (req, res) => {
    res.send({ username: req.user.username, userId: req.user.userId, email: req.user.email });
});

// --- USERS LIST ---
fastify.get('/users', { preHandler: authenticateToken }, (req, res) => {
    db.all(`SELECT userId, username, secret, googleID, email FROM users`, (err, rows) => {
        if (err) {
            console.error('Database error in /users endpoint:', err);
            return res.status(500).send({ error: 'Error fetching users from database' });
        }
        res.send(rows);
    });
});

// --- GOOGLE AUTH ---
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

        function dbGet(sql, params) {
            return new Promise((resolve, reject) => {
                db.get(sql, params, (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        }
        function dbRun(sql, params) {
            return new Promise((resolve, reject) => {
                db.run(sql, params, function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
            });
        }

        let user = await dbGet(`SELECT * FROM users WHERE googleID = ?`, [googleId]);
        let username, userId;

        if (!user) {
            userId = await dbRun(
                `INSERT INTO users (username, password, secret, googleID, email) VALUES (?, ?, ?, ?, ?)`,
                [name, '', '', googleId, email]
            );
            username = name;
        } else {
            username = user.username;
            userId = user.userId;
        }

        const accessToken = generateAccessToken({ username, userId, email });
        const refreshToken = generateRefreshToken({ username, userId, email });
        await saveRefreshToken(refreshToken, userId);

        const redirectUrl = `/?accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}&username=${encodeURIComponent(username)}`;
        return res.redirect(redirectUrl);

    } catch (error) {
        console.error('Error during Google OAuth callback:', error);
        if (error.message && error.message.includes('invalid_grant')) {
            return res.status(400).send('Authorization code expired or invalid. Please try logging in again.');
        }
        res.status(500).send('Authentication failed. Please try again.');
    }
});

// --- PROFILE MANAGEMENT ---
fastify.post('/change-username', { preHandler: authenticateToken }, (request, reply) => {
    const { newUsername } = request.body;
    if (!newUsername || !isValidUsername(newUsername)) {
        return reply.status(400).send({ error: 'Invalid new username.' });
    }
    db.run(
        `UPDATE users SET username = ? WHERE userId = ?`,
        [newUsername, request.user.userId],
        function (err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') {
                    reply.status(400).send({ error: 'Username already exists.' });
                    return;
                }
                reply.status(500).send({ error: 'Database error.' });
                return;
            }
            reply.send({ message: 'Username updated successfully.' });
            return;
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
            `UPDATE users SET password = ? WHERE userId = ?`,
            [hashedPassword, request.user.userId],
            function (err) {
                if (err) {
                    reply.status(500).send({ error: 'Database error.' });
                    return;
                }
                reply.send({ message: 'Password updated successfully.' });
                return;
            }
        );
    });
});

// --- MISC ---
fastify.get('/favicon.ico', (req, res) => res.status(204));

const matchRoutes = require('../api/matches');
fastify.decorate('db', db);
fastify.register(matchRoutes, { prefix: '/api' });

fastify.listen({ port: port, host: '0.0.0.0' }, () => {
    console.log(`Server running at http://localhost:${port}`);
});
