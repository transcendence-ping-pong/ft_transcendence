
async function userRoutes(fastify, options) {

	const db = fastify.db;

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
};

module.exports = userRoutes;
