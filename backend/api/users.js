
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
				return reply.status(500).send({ error: 'Error fetching match from database' });
			}
			reply.send(rows);
		});
	});
};

module.exports = userRoutes;