
const { splitIntoRandomPairs } = require('./utils');

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
			remoteUserId = null,
			player1DisplayName,
			player2DisplayName = 'Bot'
		} = request.body;

		// TODO: Verify if additional checks are needed
		if (!creatorUserId || !player1DisplayName) {
			return reply.status(400).send({ error: 'Invalid parameters.' });
		}

		const event = new Date();

		const time = event.toLocaleTimeString("pt-PT");
		const date = event.toLocaleDateString("pt-PT");

		await db.run(`INSERT INTO matchStats (creatorUserId, remoteUserId, player1DisplayName, player2DisplayName, date, time) 
			VALUES (?, ?, ?, ?, ?, ?)`, [creatorUserId, remoteUserId, player1DisplayName, player2DisplayName, date, time], function (err) {
			if (err) {
				return reply.status(500).send({ error: 'Error adding match to database' });
			}

			const matchId = this.lastID;

			db.run(`INSERT INTO matchHistory (userId, matchId) VALUES (?, ?)`, [creatorUserId, matchId], function (err) {
				if (err) {
					return reply.status(500).send({ error: 'Error adding match to user history' });
				}
			});

			if (remoteUserId) {

				db.run(`INSERT INTO matchHistory (userId, matchId) VALUES (?, ?)`, [remoteUserId, matchId], function (err) {
					if (err) {
						return reply.status(500).send({ error: 'Error adding match to user history' });
					}
				});
			}
			reply.send({ message: 'Success' });
		});
	});

	fastify.get('/matches/:matchId', async (request, reply) => {
		const { matchId } = request.params;

		await db.get(`SELECT creatorUserId, remoteUserId, player1DisplayName, player2DisplayName, winnerDisplayName, scorePlayer1, scorePlayer2, date, time FROM matchStats WHERE matchId = ?`, matchId, (err, rows) => {
			if (err) {
				return reply.status(500).send({ error: 'Error fetching match from database' });
			}
			reply.send(rows);
		});
	});

	fastify.patch('/matches/:matchId', async (request, reply) => {
		const { matchId } = request.params;

		const {
			winnerDisplayName,
			scorePlayer1,
			scorePlayer2,
		} = request.body;

		await db.run(`UPDATE matches SET winnerDisplayName = ?, scorePlayer1 = ?, scorePlayer2 = ? WHERE matchId = ?`, [winnerDisplayName, scorePlayer1, scorePlayer2, matchId], (err, rows) => {
			if (err) {
				return reply.status(500).send({ error: 'Error updating match' });
			}
			reply.send({ message: 'Success' });
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

	fastify.post('/tournament', async (request, reply) => {
		const { userId, players } = request.body;

		if (players.length != 8)
			return reply.status(500).send({ error: 'Invalid player amount' });

		const shuffle = splitIntoRandomPairs(players);

		await db.run(`INSERT INTO tournament (creatorId) VALUES (?)`, [userId], async function (err) {
			if (err) {
				return reply.status(500).send({ error: 'Error creating tournament' });
			}

			const tournId = this.lastID;

			for (let i = 0; i < shuffle.length; i++)
			{
				const event = new Date();

				const time = event.toLocaleTimeString("pt-PT");
				const date = event.toLocaleDateString("pt-PT");
			
				await db.run(`INSERT INTO matchStats (creatorUserId, player1DisplayName, player2DisplayName, date, time) 
					VALUES (?, ?, ?, ?, ?)`, [userId, shuffle[i][0], shuffle[i][1], date, time], async function (err) {
					if (err) {
						return reply.status(500).send({ error: 'Error creating match'});
					}

					const matchId = this.lastID;

					await db.run(`UPDATE tournament SET quarterfinalId${i + 1} = ? WHERE tournamentId = ?`, [matchId, tournId], function (err) {
						if (err) {
							return reply.status(500).send({ error: 'Error adding match to tournament'});
						}
					});
				});
			};
		});
	});
};

module.exports = matchRoutes;
