
const { dbGet, dbRun, dbAll } = require('./utils');

async function friendRoutes(fastify, options) {

	const db = fastify.db;

	fastify.post('/friends/add/:friendId', async (request, reply) => {
		const { friendId } = request.params;
		const { userId } = request.body;

		try {
			const row = await dbGet(db, `SELECT userID, friendId, friendStatus FROM friendList WHERE (userId = ? AND friendId = ?) OR (userId = ? AND friendId = ?)`, [userId, friendId, friendId, userId]);
			if (row)
				throw new Error ("Friend Request / Friendship already exists");
			else {
				await dbRun(db, `INSERT INTO friendList (userId, friendId) VALUES (?, ?)`, [userId, friendId]);
				return reply.send({ message: 'Sucess' });
			}
		} catch (err) {
			return reply.status(500).send({ error: err.message });
		}
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

	fastify.get('/friends/:userId', async (request, reply) => {
		const { userId } = request.params;

		try {
			const rows = await dbAll(db, `SELECT userId, friendId, friendStatus FROM friendList WHERE (userId = ? AND friendStatus = ?) OR (friendId = ? AND friendStatus = ?)`, [userId, 'accepted', userId, 'accepted']);
			if (!rows)
				throw new Error ("No friendships found");

			const object = [];
			for (const row of rows) {
				let friendDbId;
				if (row.userId == userId)
					friendDbId = row.friendId;
				else
					friendDbId = row.userId;
				const result = await dbGet(db, `SELECT username FROM users WHERE userId = ?`, friendDbId);
				if (!result)
					throw new Error ("User not found");
				object.push({ username: result.username, Id: friendDbId });
			}
			reply.send({ message: `Success`, result: object });

		} catch (err) {
		 	return reply.status(500).send({ error: err.message });
		}
	});

	fastify.get('/friends/:userId/sent', async (request, reply) => {
		const { userId } = request.params;

		try {
			const rows = await dbAll(db, `SELECT friendId, friendStatus FROM friendList WHERE (userId = ? AND friendStatus = ?)`, [userId, 'pending']);
			if (!rows)
				throw new Error ("No friendships found");

			const object = [];
			for (const row of rows) {
				const result = await dbGet(db, `SELECT username FROM users WHERE userId = ?`, row.friendId);
				if (!result)
					throw new Error ("User not found");
				object.push({ username: result.username, Id: row.friendId });
			}
			reply.send({ message: `Success`, result: object });

		} catch (err) {
		 	return reply.status(500).send({ error: err.message });
		}
	});

	fastify.get('/friends/:userId/received', async (request, reply) => {
		const { userId } = request.params;

		try {
			const rows = await dbAll(db, `SELECT userId, friendStatus FROM friendList WHERE (friendId = ? AND friendStatus = ?)`, [userId, 'pending']);
			if (!rows)
				throw new Error ("No friendships found");

			const object = [];
			for (const row of rows) {
				const result = await dbGet(db, `SELECT username FROM users WHERE userId = ?`, row.userId);
				if (!result)
					throw new Error ("User not found");
				object.push({ username: result.username, Id: row.userId });
			}
			reply.send({ message: `Success`, result: object });
			
		} catch (err) {
		 	return reply.status(500).send({ error: err.message });
		}
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
