
const fastify = require('fastify')({ logger: true });
const fastifyStatic = require('@fastify/static');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { OAuth2Client } = require('google-auth-library');

// TODO: Change path... definitely not /home/manumart/Desktop/maneleh42 ;)
// require('dotenv').config({ path: '/home/manumart/Desktop/maneleh42/ft_transcendence/backend/src/.env' });

let html_path = path.join(path.dirname(__dirname), 'src/public');

fastify.register(fastifyStatic, {
  root: html_path,
  prefix: '/',
});

const port = 4000;

// Initialize Google OAuth Client
const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

let currentLoggedInUser = null;

// TODO: Change path when file is moved to correct place (might not be needed, please check)
let db_path = path.join(path.dirname(__dirname), '/database/database.db');

const db = new sqlite3.Database(db_path, sqlite3.OPEN_READWRITE);

console.log('Path');
console.log(db_path);

fastify.post('/generate', (req, res) => {
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

fastify.get('/current-token', (req, res) => {
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

fastify.post('/verify-token', (req, res) => {
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

fastify.get('/users', (req, res) => {
    db.all(`SELECT user_id, username, password, secret, google_id, email FROM users`, (err, rows) => {
        if (err) {
            return res.status(500).send({ error: 'Error fetching users from database' });
        }
        res.send(rows);
    });
});

// TODO: check host listening ip

fastify.listen({ port: port, host: '0.0.0.0' }, () => {
    console.log(`Server running at http://localhost:${port}`);
});

fastify.post('/signup', (req, res) => {
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

		const userId = this.lastID;

		db.run(`INSERT INTO userStats (userId) VALUES (?)`, [userId], function (err) {
			if (err) {
            	return res.status(500).send({ error: 'Error saving user to stats database' });
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

fastify.post('/logout', (req, res) => {
    const { username } = req.body;

    // if (!currentLoggedInUser || currentLoggedInUser !== username) {
    //     return res.status(403).send({ error: 'You are not logged in' });
    // }//idek why i cant logout if reload the server logged on with gmail
    currentLoggedInUser = null;
    req.session = null;

    res.send({ message: 'Logout successful' });
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
fastify.get('/logged-in', (req, res) => {
    const username = req.query.username;

    // Update currentLoggedInUser
    currentLoggedInUser = username;

    res.send(`<script>
        localStorage.setItem('loggedInUser', '${username}');
        window.location.href = '/';
    </script>`);
});

fastify.get('/favicon.ico', (req, res) => res.status(204));
