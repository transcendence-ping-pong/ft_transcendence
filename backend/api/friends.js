
const { dbGet } = require('./utils');

async function friendRoutes(fastify, options) {

	const db = fastify.db;

	fastify.post('/friends/add/:friendId', (request, reply) => {
		const { friendId } = request.params;
		const { userId } = request.body;

		db.get(`SELECT userID, friendId, friendStatus FROM friendList WHERE (userId = ? AND friendId = ?) OR (userId = ? AND friendId = ?)`, [userId, friendId, friendId, userId], (err, row) => {
			if (err) {
				return reply.status(500).send({ error: err.message });
			}
			if (!row) {
				db.run(`INSERT INTO friendList (userId, friendId) VALUES (?, ?)`, [userId, friendId], (err) => {
					if (err)
						return;
				});
			}
			return reply.send({ message: 'Success'});
		});
	});

	fastify.patch('/friends/accept/:friendId', (request, reply) => {
		const { friendId } = request.params;
		const { userId } = request.body;

		db.run(`UPDATE friendList SET friendStatus = ? WHERE (userId = ? AND friendId = ?)`, ['accepted', friendId, userId], function(err) {
			if (err) {
				return reply.status(500).send({ error: err.message });
			}
			if (this.changes === 0) {
				return reply.status(404).send({ message: 'No matching friend request found' });
			}
			return reply.send({ message: 'Success'});
		});
	});

	fastify.get('/friends/:userId', (request, reply) => {
		const { userId } = request.params;

		db.all(`SELECT userId, friendId, friendStatus FROM friendList WHERE userId = ? OR friendId = ?`, [userId, userId], async (err, rows) => {
			if (err) {
				return reply.status(500).send({ error: 'Error fetching friendships' });
			}
			if (!rows) {
				return reply.status(404).send({ error: 'Error fetching user' });
			}
			const object = [];
			for (const row of rows) {
				let friendDbId;
				// let status = row.friendStatus;
				if (row.userId == userId) {
					friendDbId = row.friendId;
				} else {
					friendDbId = row.userId;
				}
				const result = await dbGet(db, `SELECT username FROM users WHERE userId = ?`, friendDbId);
				if (!result)
					return reply.status(500).send({ error: 'Error fetching user' });
				object.push({ username: result.username, userId: friendDbId, status: row.friendStatus});
			}
			reply.send({ message: `Success`, result: object });
		});
	});

	fastify.delete('/friends/remove/:friendId', (request, reply) => {
		const { friendId } = request.params;
		const { userId } = request.body;

		db.run(`DELETE FROM friendList WHERE (userId = ? AND friendId = ?) OR (userId = ? AND friendId = ?)`, [userId, friendId, friendId, userId], (err, row) => {
			if (err) {
				return reply.status(500).send({ error: err.message });
			}
			return reply.send({ message: 'Success'});
		});
	});
};

module.exports = friendRoutes;
