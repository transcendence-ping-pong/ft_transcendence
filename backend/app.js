
const fastify = require('fastify')({ logger: true });
const fastifyStatic = require('@fastify/static');
const fastifyCors = require('@fastify/cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db_path = path.join(__dirname, '/database/database.db');

const db = new sqlite3.Database(db_path, sqlite3.OPEN_READWRITE);

await fastify.decorate('db', db);

fastify.register(require('./api/matches'));
fastify.register(require('./api/remote'));
// fastify.register(require('./api/users'));

const port = 4000;

let html_path = path.join(__dirname, 'temp');

fastify.register(fastifyStatic, {
	root: html_path,
	prefix: '/',
});

fastify.register(fastifyCors, {
	origin: true, // Allow all origins (for development)
	credentials: true
});

fastify.listen({ port: port, host: '0.0.0.0' }, (err) => {
	if (err) {
		console.error('Error starting Fastify server:', err);
		return;
	}
	const networkIP = getNetworkIP();

	const socketPort = port + 1;
	server.listen(socketPort, '0.0.0.0', () => {
		console.log(`--------------------------------`);
		console.log(`Multiplayer: http://${networkIP}:80`);
		console.log(`--------------------------------`);
	});
});

fastify.get('/favicon.ico', (req, res) => res.status(204));