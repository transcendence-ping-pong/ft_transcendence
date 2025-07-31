
const fastify = require('fastify')({ logger: true });
const fastifyStatic = require('@fastify/static');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db_path = path.join(__dirname, '/database/database.db');

const db = new sqlite3.Database(db_path, sqlite3.OPEN_READWRITE);

fastify.decorate('db', db);

fastify.register(require('./api/matches'));
// fastify.register(require('./api/users'));

const port = 4000;

let html_path = path.join(__dirname, 'temp');

fastify.register(fastifyStatic, {
	root: html_path,
	prefix: '/',
});

fastify.listen({ port: port, host: '0.0.0.0' }, () => {
	console.log(`Server running at http://localhost:${port}`);
});

fastify.get('/favicon.ico', (req, res) => res.status(204));