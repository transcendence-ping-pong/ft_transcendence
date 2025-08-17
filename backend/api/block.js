
async function blockRoutes(fastify, options) {

	const db = fastify.db;

	fastify.post('/block/:Id', (request, reply) => {
		const { Id } = request.params;
		const { userId } = request.body

		db.run(`INSERT INTO blockedUsers (userId, blockedId) VALUES (?, ?)`, [userId, Id], (err) => {
			if (err) {
				return reply.status(500).send({ err: err.message });
			}
			return reply.send({ message: 'User blocked'});
		});
	});

	fastify.delete('/unblock/:Id', (request, reply) => {
		const { Id } = request.params;
		const { userId } = request.body;

		db.run(`DELETE FROM blockedUsers WHERE (userId = ? AND blockedId = ?)`, [userId, Id], (err) => {
			if (err) {
				return reply.status(500).send({ error: err.message });
			}
			return reply.send({ message: 'User unblocked'});
		});
	});

	fastify.get('/blocked/:userId', (request, reply) => {
		const { currentId } = request.params;

		db.all(`SELECT blockedId FROM blockedUsers WHERE userId = ?`, [currentId], (err, rows) => {
			if (err) {
				return reply.status(500).send({ error: err.message });
			}
			return reply.send({rows});
		});
	});

};

module.exports = blockRoutes;