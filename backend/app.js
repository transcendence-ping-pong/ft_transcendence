const fastify = require('fastify')({ logger: true });
const fastifyStatic = require('@fastify/static');
const fastifyCors = require('@fastify/cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const websocketServer = require('./src/websocketServer.js');

require('dotenv').config({ path: '.env' });

let db_path = path.join(__dirname, '/database/database.db');

const db = new sqlite3.Database(db_path, sqlite3.OPEN_READWRITE);
// db.run('PRAGMA foreign_keys = ON;');
fastify.decorate('db', db);

fastify.register(require('@fastify/multipart'));

// Register API routes
fastify.register(require('./api/matches'), { prefix: '/api' });
fastify.register(require('./api/users'), { prefix: '/api' });
fastify.register(require('./api/friends'), { prefix: '/api' });
fastify.register(require('./api/block'), { prefix: '/api' });

const port = 4000;

let html_path = path.join(__dirname, 'temp');
let uploads_path = path.join(__dirname, 'uploads');

fastify.register(fastifyStatic, {
	root: html_path,
	prefix: '/',
});

fastify.register(fastifyStatic, {
    root: uploads_path,
    prefix: '/uploads/',
    decorateReply: false
});

fastify.register(fastifyCors, {
    origin: true,
    credentials: true,
	methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
});

const wsServer = new websocketServer(4001);
wsServer.start();

fastify.listen({ port: port, host: '0.0.0.0' }, (err) => {
	if (err) {
		console.error('Error starting Fastify server:', err);
		process.exit(1);
	}
	console.log(`Server running on http://localhost:${port}`);
});

fastify.get('/favicon.ico', (req, res) => res.status(204));