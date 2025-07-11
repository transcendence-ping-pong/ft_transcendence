
const path = require('path');
const fastify = require('fastify')({ logger: true });
const fastifyStatic = require('@fastify/static');

const sqlite3 = require('sqlite3').verbose();
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcrypt');

// TODO: Change path... definitely not /home/manumart/Desktop/maneleh42 ;)
// Also, without info on what .env needs, this blocks all possible execution
require('dotenv').config({ path: '/home/manumart/Desktop/maneleh42/ft_transcendence/backend/src/.env' });

fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
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

        qrcode.toDataURL(secret.otpauth_url, function (err, qrCodeUrl) {
            if (err) {
                return res.status(500).send({ error: 'Error generating QR code' });
            }

            res.send({ qrCodeUrl, secret: secret.base32 });
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
fastify.get('/users', (req, res) => {
    db.all(`SELECT user_id, username, password, secret, google_id, email FROM users`, (err, rows) => {
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

    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) {
            return res.status(500).send({ error: 'Error fetching user from database' });
        }

        if (!row) {
            return res.status(404).send({ error: 'Invalid username or password' });
        }

        bcrypt.compare(password, row.password, (bcryptErr, passwordMatch) => {
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

            currentLoggedInUser = username; // Update currentLoggedInUser
            res.send({ message: 'Login successful', username: row.username });
        });
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
        // Add await here
        const { tokens } = await client.getToken(code);
        
        // Add await here and fix the method call
        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name;

        // Convert database operations to Promise-based for better error handling
        const checkUser = () => {
            return new Promise((resolve, reject) => {
                db.get(`SELECT * FROM users WHERE google_id = ?`, [googleId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        };

        const createUser = (username, googleId, email) => {
            return new Promise((resolve, reject) => {
                db.run(`INSERT INTO users (username, password, secret, google_id, email) VALUES (?, ?, ?, ?, ?)`,
                    [username, '', '', googleId, email], function (err) {
                        if (err) reject(err);
                        else resolve(this);
                    });
            });
        };

        try {
            const existingUser = await checkUser();
            
            if (!existingUser) {
                // Create a new user if not found
                await createUser(name, googleId, email);
                currentLoggedInUser = name;
                res.redirect(`/logged-in?username=${encodeURIComponent(name)}`);
            } else {
                // User exists, log them in
                currentLoggedInUser = existingUser.username;
                res.redirect(`/logged-in?username=${encodeURIComponent(existingUser.username)}`);
            }
        } catch (dbError) {
            console.error('Database error:', dbError);
            return res.status(500).send({ error: 'Error handling user in database' });
        }

    } catch (error) {
        console.error('Error during Google OAuth callback:', error);
        
        // More specific error handling
        if (error.message && error.message.includes('invalid_grant')) {
            return res.status(400).send('Authorization code expired or invalid. Please try logging in again.');
        }
        
        res.status(500).send('Authentication failed. Please try again.');
    }
});

// Add these routes before fastify.get('/favicon.ico', (req, res) => res.status(204));

// Add the current-user endpoint that your frontend is looking for
fastify.get('/current-user', (req, res) => {
    if (currentLoggedInUser) {
        res.send({ username: currentLoggedInUser });
    } else {
        res.status(401).send({ error: 'No user logged in' });
    }
});

// Replace the logged-in route with this simple redirect:
fastify.get('/logged-in', (req, res) => {
    const username = req.query.username;
    currentLoggedInUser = username;
    
    // Direct redirect to home page
    res.redirect('/');
});

fastify.get('/favicon.ico', (req, res) => res.status(204));

fastify.listen({ port: port, host: '0.0.0.0' }, () => {
    console.log(`Server running at http://localhost:${port}`);
});
