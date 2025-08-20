
async function blockRoutes(fastify, options) {

	const db = fastify.db;

	// ensure table exists (defensive in case schema init didn't run)
	db.run(`CREATE TABLE IF NOT EXISTS blockedUsers (
		userId INTEGER NOT NULL,
		blockedId INTEGER NOT NULL,
		FOREIGN KEY (userId) REFERENCES users (userId) ON DELETE CASCADE,
		FOREIGN KEY (blockedId) REFERENCES users (userId) ON DELETE CASCADE,
		UNIQUE(userId, blockedId)
	)`);

	// block a user (the blocker must be the authenticated caller)
	fastify.post('/block/:Id', (request, reply) => {
		const { Id } = request.params;
		// prefer header provided by trusted caller (e.g., WS server), fall back to body for legacy clients
		const headerUserId = Number(request.headers['x-user-id']);
		const bodyUserId = Number((request.body || {}).userId);
		const userId = Number.isFinite(headerUserId) ? headerUserId : bodyUserId;

		if (!userId || !Number.isFinite(Number(Id))) {
			return reply.status(400).send({ error: 'Invalid parameters' });
		}

		db.run(`INSERT INTO blockedUsers (userId, blockedId) VALUES (?, ?)`, [userId, Id], (err) => {
			if (err) {
				// ignore duplicate rows gracefully
				if (String(err.message || '').toLowerCase().includes('unique')) {
					return reply.send({ message: 'User already blocked' });
				}
				return reply.status(500).send({ error: err.message });
			}
			return reply.send({ message: 'User blocked' });
		});
	});

	// unblock a user (only the original blocker can remove their own block)
	fastify.delete('/unblock/:Id', (request, reply) => {
		const { Id } = request.params;
		const headerUserId = Number(request.headers['x-user-id']);
		const bodyUserId = Number((request.body || {}).userId);
		const userId = Number.isFinite(headerUserId) ? headerUserId : bodyUserId;

		if (!userId || !Number.isFinite(Number(Id))) {
			return reply.status(400).send({ error: 'Invalid parameters' });
		}

		db.run(`DELETE FROM blockedUsers WHERE (userId = ? AND blockedId = ?)`, [userId, Id], (err) => {
			if (err) {
				return reply.status(500).send({ error: err.message });
			}
			return reply.send({ message: 'User unblocked' });
		});
	});

	// list blocked ids for a given user
	fastify.get('/blocked/:userId', (request, reply) => {
		const { userId } = request.params;
		db.all(`SELECT blockedId FROM blockedUsers WHERE userId = ?`, [userId], (err, rows) => {
			if (err) {
				return reply.status(500).send({ error: err.message });
			}
			// respond in a standard format expected by various callers
			return reply.send({ result: rows });
		});
	});

	// resolve userId by username (utility for websocket server)
	fastify.get('/userIdByUsername/:username', (request, reply) => {
		const { username } = request.params;
		db.get(`SELECT userId FROM users WHERE username = ?`, [username], (err, row) => {
			if (err) {
				return reply.status(500).send({ error: err.message });
			}
			if (!row) {
				return reply.status(404).send({ error: 'User not found' });
			}
			return reply.send({ userId: row.userId, username });
		});
	});

};

module.exports = blockRoutes;