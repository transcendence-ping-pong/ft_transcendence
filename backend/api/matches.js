
async function matchRoutes(fastify, options) {

	const db = fastify.db;

	fastify.get('/matches', (request, reply) => {
		db.all(`SELECT * FROM matchStats`, (err, rows) => {

			if (err) {
				return reply.status(500).send({ error: 'Error fetching matches from database' });
			}
			reply.send(rows);
		});
	});

	fastify.post('/matches', async (request, reply) => {
		const {
			creatorUserId,
			remoteUserId,
			player1DisplayName,
			player2DisplayName,
			winnerDisplayName,
			scorePlayer1,
			scorePlayer2,
		} = request.body;

		// TODO: Verify if additional checks are needed
		if (!creatorUserId) {
			return reply.status(400).send({ error: 'Incomplete player credentials.' });
		}

		const d = new Date();

		function addZero(i) {
			if (i < 10) {i = "0" + i}
			return i;
		}

		let day = addZero(d.getDate());
		let month = addZero(d.getMonth() + 1);
		let year = addZero(d.getFullYear());
		let h = addZero(d.getHours());
		let m = addZero(d.getMinutes());
		let s = addZero(d.getSeconds());

		const time = h + ":" + m + ":" + s;
		const date = day + "/" + month + "/" + year;

		await db.run(`INSERT INTO matchStats (creatorUserId, remoteUserId, player1DisplayName, player2DisplayName,
			 winnerDisplayName, scorePlayer1, scorePlayer2, date, time) 
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [creatorUserId, remoteUserId, player1DisplayName, 
				player2DisplayName, winnerDisplayName, scorePlayer1, scorePlayer2, date, time], function (err) {
			if (err) {
				return reply.status(500).send({ error: 'Error adding match to database' });
			}

			const matchId = this.lastID;

			db.run(`INSERT INTO matchHistory (userId, matchId) VALUES (?, ?)`, [creatorUserId, matchId], function (err) {
				if (err) {
					return reply.status(500).send({ error: 'Error adding match to user history' });
				}
				reply.send({ message: 'Success' });
			});

			if (remoteUserId) {

				db.run(`INSERT INTO matchHistory (userId, matchId) VALUES (?, ?)`, [remoteUserId, matchId], function (err) {
					if (err) {
						return reply.status(500).send({ error: 'Error adding match to user history' });
					}
					reply.send({ message: 'Success' });
				});
			}
		});
	});

	fastify.get('/matches/:matchId', async (request, reply) => {
		const { matchId } = request.params;

		await db.get(`SELECT * FROM matchStats WHERE matchId = ?`, matchId, (err, rows) => {
			if (err) {
				return reply.status(500).send({ error: 'Error fetching match from database' });
			}
			reply.send(rows);
		});
	});

	fastify.get('/matches/history/:userId', async (request, reply) => {
		const { userId } = request.params;

		await db.get(`SELECT * FROM matchHistory WHERE userId = ?`, userId, (err, rows) => {
			if (err) {
				return reply.status(500).send({ error: 'Error fetching user history from database' });
			}
			reply.send(rows);
		});
	});
};

module.exports = matchRoutes;
