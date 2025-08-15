const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const MSG = require('../src/messageConstants');
const {
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
    authenticateToken
} = require('./utils');

async function userRoutes(fastify, options) {
    const db = fastify.db;
    
    // Google OAuth client setup
    const client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    let currentLoggedInUser = null;

    // Google OAuth routes
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
            return res.status(400).send(MSG.INVALID_REQUEST_NO_AUTH_CODE);
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
            let user = await dbGet(db, `SELECT * FROM users WHERE googleID = ?`, [googleId]);
            let username, userId;

            if (!user) {
                userId = await dbRun(db,
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
            await saveRefreshToken(db, refreshToken, userId);

            const redirectUrl = `http://localhost/?accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}&username=${encodeURIComponent(username)}`;
            return res.redirect(redirectUrl);

        } catch (error) {
            console.error('Error during Google OAuth callback:', error);
            if (error.message && error.message.includes('invalid_grant')) {
                return res.status(400).send(MSG.AUTHORIZATION_CODE_EXPIRED);
            }
        }
    });

    fastify.post('/token', async (req, res) => {
        const refreshToken = req.body.token;
        if (!refreshToken) {
            return res.status(401).send({ error: MSG.REFRESH_TOKEN_REQUIRED });
        }

        try {
            const tokenData = await findRefreshToken(db, refreshToken);
            if (!tokenData) {
                return res.status(403).send({ error: MSG.INVALID_OR_EXPIRED_REFRESH_TOKEN });
            }

            const accessToken = generateAccessToken({ 
                username: tokenData.username, 
                userId: tokenData.userId,
                email: tokenData.email
            });
            res.send({ accessToken: accessToken });
        } catch (error) {
            console.error('Error verifying refresh token:', error);
            res.status(500).send({ error: MSG.INTERNAL_SERVER_ERROR });
        }
    });

    // Signup
    fastify.post('/signup', (req, res) => {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).send({ error: MSG.USERNAME_EMAIL_PASSWORD_REQUIRED });
        }

        if (!isValidUsername(username)) {
            return res.status(400).send({ error: MSG.INVALID_USERNAME });
        }

        if (!isValidEmail(email)) {
            return res.status(400).send({ error: MSG.INVALID_EMAIL_FORMAT });
        }

        if (!isValidPassword(password)) {
            return res.status(400).send({ error: MSG.PASSWORD_TOO_SHORT });
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
                            res.send({ message: MSG.SIGNUP_SUCCESSFUL });
                        }
                    );
                });
            }
        );
    });

    // Login
    fastify.post('/login', (req, res) => {
        const { email, password, token } = req.body;

        if (!email || !password) {
            return res.status(400).send({ error: MSG.EMAIL_AND_PASSWORD_REQUIRED });
        }

        if (!isValidEmail(email)) {
            return res.status(400).send({ error: MSG.INVALID_EMAIL_FORMAT });
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
                    await saveRefreshToken(db, refreshToken, row.userId);
                    res.send({
                        message: MSG.LOGIN_SUCCESSFUL,
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

    // Logout
    fastify.post('/logout', async (req, res) => {
        const { token } = req.body;
        currentLoggedInUser = null;

        if (token) {
            try {
                await deleteRefreshToken(db, token);
            } catch (error) {
                console.error('Error deleting refresh token:', error);
            }
        }

        res.send({ message: MSG.LOGOUT_SUCCESSFUL });
    });

    fastify.get('/current-user', { preHandler: authenticateToken }, (req, res) => {
        res.send({ username: req.user.username, userId: req.user.userId, email: req.user.email });
    });

    fastify.get('/users', { preHandler: authenticateToken }, async (req, res) => {
        try {
            const users = await dbAll(db, `SELECT userId, username, secret, googleID, email FROM users`);
            res.send(users);
        } catch (error) {
            console.error('Database error in /users endpoint:', error);
            res.status(500).send({ error: MSG.ERROR_FETCHING_USERS });
        }
    });

    // 2FA routes
    fastify.post('/generate', { preHandler: authenticateToken }, (request, reply) => {
        const { email } = request.body;

        if (!email) {
            return reply.status(400).send({ error: MSG.EMAIL_REQUIRED });
        }

        const userEmail = email || request.user.email;

        if (request.user.email !== userEmail) {
            return reply.status(403).send({ error: MSG.CAN_ONLY_GENERATE_FOR_OWN_ACCOUNT });
        }

        db.get(`SELECT * FROM users WHERE email = ?`, [userEmail], (err, row) => {
            if (err) {
                return reply.status(500).send({ error: MSG.ERROR_FETCHING_USER });
            }
            if (!row) {
                return reply.status(404).send({ error: MSG.USER_NOT_FOUND });
            }

            const secret = speakeasy.generateSecret({ name: "ft_transcendence(" + row.username + ")" });

            qrcode.toDataURL(secret.otpauth_url, function (err, qrCodeUrl) {
                if (err) {
                    return reply.status(500).send({ error: MSG.ERROR_GENERATING_QR });
                }
                reply.send({ qrCodeUrl, secret: secret.base32 });
            });
        });
    });

    fastify.post('/verify-token', (req, res) => {
        const { email, token, secret } = req.body;

        if (!email || !token) {
            return res.status(400).send({ error: MSG.EMAIL_AND_TOKEN_REQUIRED });
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
                        return res.status(500).send({ error: MSG.ERROR_SAVING_SECRET });
                    }
                    res.send({ message: MSG.TOKEN_VERIFIED_2FA_ENABLED });
                });
            } else {
                res.status(403).send({ error: MSG.INVALID_TOKEN });
            }
        } else {
            db.get(`SELECT secret FROM users WHERE email = ?`, [email], (err, row) => {
                if (err) {
                    return res.status(500).send({ error: MSG.ERROR_FETCHING_SECRET });
                }
                if (!row || !row.secret) {
                    return res.status(404).send({ error: MSG.USER_NOT_FOUND_OR_NO_2FA });
                }
                const verified = speakeasy.totp.verify({
                    secret: row.secret,
                    encoding: 'base32',
                    token: token
                });
                if (verified) {
                    res.send({ message: MSG.TOKEN_VERIFIED_SUCCESSFULLY });
                } else {
                    res.status(403).send({ error: MSG.INVALID_TOKEN });
                }
            });
        }
    });

    fastify.get('/check-2fa', (req, res) => {
        const { email } = req.query;

        if (!email) {
            return res.status(400).send({ error: MSG.EMAIL_REQUIRED });
        }

        db.get(`SELECT secret FROM users WHERE email = ?`, [email], (err, row) => {
            if (err) {
                return res.status(500).send({ error: MSG.ERROR_FETCHING_USER });
            }
            if (!row) {
                return res.status(404).send({ error: MSG.USER_NOT_FOUND });
            }
            res.send({ has2FA: !!row.secret });
        });
    });

    fastify.get('/current-token', { preHandler: authenticateToken }, (req, res) => {
        const { email } = req.query;

        if (!email) {
            return res.status(400).send({ error: MSG.EMAIL_REQUIRED });
        }

        if (req.user.email !== email) {
            return res.status(403).send({ error: MSG.CAN_ONLY_GET_TOKENS_FOR_OWN_ACCOUNT });
        }

        db.get(`SELECT secret FROM users WHERE email = ?`, [email], (err, row) => {
            if (err) {
                return res.status(500).send({ error: MSG.ERROR_FETCHING_SECRET });
            }
            if (!row || !row.secret) {
                return res.status(404).send({ error: MSG.USER_NOT_FOUND_OR_NO_2FA });
            }
            const token = speakeasy.totp({
                secret: row.secret,
                encoding: 'base32'
            });
            res.send({ token });
        });
    });

    fastify.post('/change-username', { preHandler: authenticateToken }, (request, reply) => {
        const { newUsername } = request.body;
        if (!newUsername || !isValidUsername(newUsername)) {
            return reply.status(400).send({ error: MSG.INVALID_NEW_USERNAME });
        }
        db.run(
            `UPDATE users SET username = ? WHERE userId = ?`,
            [newUsername, request.user.userId],
            function (err) {
                if (err) {
                    if (err.code === 'SQLITE_CONSTRAINT') {
                        return reply.status(400).send({ error: MSG.USERNAME_EXISTS });
                    }
                    return reply.status(500).send({ error: MSG.DATABASE_ERROR });
                }
                reply.send({ message: MSG.USERNAME_UPDATED_SUCCESSFULLY });
            }
        );
    });

    fastify.post('/change-password', { preHandler: authenticateToken }, (request, reply) => {
        const { newPassword } = request.body;
        if (!newPassword || !isValidPassword(newPassword)) {
            return reply.status(400).send({ error: MSG.INVALID_NEW_PASSWORD });
        }
        bcrypt.hash(newPassword, 13, (err, hashedPassword) => {
            if (err) {
                return reply.status(500).send({ error: MSG.ERROR_HASHING_PASSWORD });
            }
            db.run(
                `UPDATE users SET password = ? WHERE userId = ?`,
                [hashedPassword, request.user.userId],
                function (err) {
                    if (err) {
                        reply.status(500).send({ error: MSG.DATABASE_ERROR });
                        return;
                    }
                    reply.send({ message: MSG.PASSWORD_UPDATED_SUCCESSFULLY });
                }
            );
        });
    });

    // User stats routes
    fastify.get('/users/stats', (request, reply) => {
        db.all(`SELECT * FROM userStats`, (err, rows) => {
            if (err) {
                return reply.status(500).send({ error: MSG.ERROR_FETCHING_USERS_FROM_DATABASE });
            }
            reply.send(rows);
        });
    });

    fastify.get('/users/stats/:userId', (request, reply) => {
        const { userId } = request.params;

        db.get(`SELECT * FROM userStats WHERE userId = ?`, [userId], (err, row) => {
            if (err) {
                return reply.status(500).send({ error: MSG.ERROR_FETCHING_USER_FROM_DATABASE });
            }
            reply.send(row);
        });
    });

    fastify.post('/users/stats/:userId', async (request, reply) => {
        const { userId } = request.params;
        
        db.run(`INSERT INTO userStats (userId) VALUES (?)`, [userId], function (err) {
            if (err) {
                return reply.status(500).send({ error: MSG.ERROR_ADDING_USER_STATS_TO_DATABASE });
            }
            reply.send({ message: MSG.USER_STATS_CREATED_SUCCESSFULLY });
        });
    });

    fastify.post('/users/addfriend/:userId', async (request, reply) => {
        const { userId } = request.params;
        
//missing code
        reply.send({ message: MSG.FRIEND_FUNCTIONALITY_NOT_IMPLEMENTED });
    });
}

module.exports = userRoutes;
