
async function blockRoutes(fastify, options) {

	const db = fastify.db;

	fastify.post('/block/:Id', (request, reply) => {
		const { Id } = request.params;
		const { userId } = request.body
		// const currentId = request.user?.userid;

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

	//TODO: Check if currentId can be retrieved this way!!
	fastify.get('/blocked', (request, reply) => {
		const currentId = request.user?.userid;

		db.all(`SELECT blockedId FROM blockedUsers WHERE userId = ?`, [currentId], (err, rows) => {
			if (err) {
				return reply.status(500).send({ error: err.message });
			}
			return reply.send({rows});
		});
	});

};

module.exports = blockRoutes;