const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const app = express();
const port = 4000;

// Initialize Google OAuth Client
const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

let currentLoggedInUser = null;
app.use(express.json());
app.use(express.static('src/public'));

const db = new sqlite3.Database('./authenticator.db');

db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    secret TEXT NOT NULL,
    google_id TEXT UNIQUE,
    email TEXT
)`);

app.post('/generate', (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).send({ error: 'Username is required' });
    }

    if (currentLoggedInUser !== username) {
        return res.status(403).send({ error: 'You must be logged in to generate a secret' });
    }

    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) {
            return res.status(500).send({ error: 'Error fetching user from database' });
        }

        if (!row) {
            return res.status(404).send({ error: 'User not found' });
        }

        const secret = speakeasy.generateSecret({ name: "ft_transcendence(" + currentLoggedInUser + ")" });

        db.run(`UPDATE users SET secret = ? WHERE username = ?`, [secret.base32, username], function (err) {
            if (err) {
                return res.status(500).send({ error: 'Error saving secret to database' });
            }

            qrcode.toDataURL(secret.otpauth_url, function (err, qrCodeUrl) {
                if (err) {
                    return res.status(500).send({ error: 'Error generating QR code' });
                }

                res.send({ qrCodeUrl, secret: secret.base32 });
            });
        });
    });
});
app.get('/current-token', (req, res) => {
    const { username } = req.query;

    if (!username) {
        return res.status(400).send({ error: 'Username is required' });
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

app.post('/verify-token', (req, res) => {
    const { username, token } = req.body;

    if (!username || !token) {
        return res.status(400).json({ error: 'Username and token are required' });
    }

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
});

app.get('/users', (req, res) => {
    db.all(`SELECT id, username, password, secret, google_id, email FROM users`, (err, rows) => {
        if (err) {
            return res.status(500).send({ error: 'Error fetching users from database' });
        }
        res.send(rows);
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

app.post('/signup', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send({ error: 'Username and password are required' });
    }

    db.run(`INSERT INTO users (username, password, secret) VALUES (?, ?, ?)`, [username, password, ''], function (err) {
        if (err) {
            if (err.code === 'SQLITE_CONSTRAINT') {
                return res.status(400).send({ error: 'Username already exists' });
            }
            return res.status(500).send({ error: 'Error saving user to database' });
        }

        res.send({ message: 'Signup successful' });
    });
});

app.post('/login', (req, res) => {
    const { username, password, token } = req.body;

    if (!username || !password) {
        return res.status(400).send({ error: 'Username and password are required' });
    }

    db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
        if (err) {
            return res.status(500).send({ error: 'Error fetching user from database' });
        }

        if (!row) {
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

        currentLoggedInUser = username; // Update currentLoggedInUser
        res.send({ message: 'Login successful', username: row.username });
    });
});

app.post('/logout', (req, res) => {
    const { username } = req.body;

    // if (!currentLoggedInUser || currentLoggedInUser !== username) {
    //     return res.status(403).send({ error: 'You are not logged in' });
    // }//idek why i cant logout if reload the server logged on with gmail
    currentLoggedInUser = null;
    req.session = null;

    res.send({ message: 'Logout successful' });
});

app.get('/check-2fa', (req, res) => {
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

app.get('/auth/google', (req, res) => {
    const url = client.generateAuthUrl({
        access_type: 'offline',
        scope: ['profile', 'email'],
    });
    res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
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

        db.get(`SELECT * FROM users WHERE google_id = ?`, [googleId], (err, row) => {
            if (err) {
                console.error('Error checking user in database:', err);
                return res.status(500).send({ error: 'Error checking user in database' });
            }

            if (!row) {
                // Create a new user if not found
                db.run(`INSERT INTO users (username, password, secret, google_id, email) VALUES (?, ?, ?, ?, ?)`,
                    [name, '', '', googleId, email], function (err) {
                        if (err) {
                            return res.status(500).send({ error: 'Error creating user in database' });
                        }

                        currentLoggedInUser = name; // Update currentLoggedInUser
                        res.redirect(`/logged-in?username=${name}`);
                    });
            } else {
                // User exists, log them in
                currentLoggedInUser = row.username; // Update currentLoggedInUser
                res.redirect(`/logged-in?username=${row.username}`);
            }
        });
    } catch (error) {
        console.error('Error during Google OAuth callback:', error);
        res.status(500).send('Authentication failed.');
    }
});

// Add a route to handle the logged-in page update
app.get('/logged-in', (req, res) => {
    const username = req.query.username;

    // Update currentLoggedInUser
    currentLoggedInUser = username;

    res.send(`<script>
        localStorage.setItem('loggedInUser', '${username}');
        window.location.href = '/';
    </script>`);
});

app.get('/favicon.ico', (req, res) => res.status(204));
