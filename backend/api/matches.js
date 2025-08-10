const { splitIntoRandomPairs } = require('./utils');

async function matchRoutes(fastify, options) {

	const db = fastify.db;

	fastify.get('/matches', (request, reply) => {
		db.all(`SELECT * FROM matchStats`, (err, rows) => {

			if (err) {
				reply.status(500).send({ error: 'Error fetching matches from database' });
				return;
			}
			reply.send(rows);
			return;
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

		await db.run(`INSERT INTO matchStats (creatorUserId, player1DisplayName, player2DisplayName, date, time, winnerDisplayName) 
			VALUES (?, ?, ?, ?, ?, NULL)`, [creatorId, pair[0], pair[1], date, time], function (err) {
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
						reply.status(500).send({ error: 'Error adding match to user history' });
						return;
					}
				});
			}
			reply.send({ message: 'Success' });
			return;
		});
	});

	fastify.get('/matches/:matchId', async (request, reply) => {
		const { matchId } = request.params;

		await db.get(`SELECT creatorUserId, remoteUserId, player1DisplayName, player2DisplayName, winnerDisplayName, scorePlayer1, scorePlayer2, date, time FROM matchStats WHERE matchId = ?`, matchId, (err, rows) => {
			if (err) {
				reply.status(500).send({ error: 'Error fetching match from database' });
				return;
			}
			reply.send(rows);
			return;
		});
	});

	fastify.patch('/matches/:matchId', async (request, reply) => {
		const { matchId } = request.params;

		const {
			winnerDisplayName,
			scorePlayer1,
			scorePlayer2,
		} = request.body;

		await db.run(`UPDATE matchStats SET winnerDisplayName = ?, scorePlayer1 = ?, scorePlayer2 = ? WHERE matchId = ?`, [winnerDisplayName, scorePlayer1, scorePlayer2, matchId], (err, rows) => {
			if (err) {
				return reply.status(500).send({ error: 'Error updating match' });
			}
			reply.send({ message: 'Success' });
			return;
		});
	});

	fastify.get('/matches/history/:userId', async (request, reply) => {
		const { userId } = request.params;

		await db.get(`SELECT * FROM matchHistory WHERE userId = ?`, userId, (err, rows) => {
			if (err) {
				reply.status(500).send({ error: 'Error fetching user history from database' });
				return;
			}
			reply.send(rows);
			return;
		});
	});

    fastify.get('/tournament', async (request, reply) => {
	const db = fastify.db;

	db.all(`SELECT * FROM tournament`, (err, rows) => {
		if (err) {
			reply.status(500).send({ error: 'Error fetching tournaments from database' });
			return;
		}
		reply.send(rows);
		return;
	});
});

	fastify.post('/tournament', async (request, reply) => {
	const { creatorId, players } = request.body;

	if (!creatorId) {
		reply.status(400).send({ error: 'creatorId é obrigatório' });
		return;
		}

	if (!Array.isArray(players) || players.length !== 8) {
		return reply.status(400).send({ error: 'Invalid player amount' });
	}

	const shuffle = splitIntoRandomPairs(players);

	try {
		// 1. Criar o torneio
		const tournId = await new Promise((resolve, reject) => {
		db.run(`INSERT INTO tournament (creatorId) VALUES (?)`, [creatorId], function (err) {
			if (err) return reject(err);
			resolve(this.lastID);
		});
		});

		// 2. Criar as partidas
		await Promise.all(
		shuffle.map((pair, i) => {
			return new Promise((resolve, reject) => {
			const event = new Date();
			const time = event.toLocaleTimeString("pt-PT");
			const date = event.toLocaleDateString("pt-PT");

			db.run(
				`INSERT INTO matchStats (creatorUserId, player1DisplayName, player2DisplayName, date, time)
				VALUES (?, ?, ?, ?, ?)`,
				[creatorId, pair[0], pair[1], date, time],
				function (err) {
				if (err) return reject(err);

				const matchId = this.lastID;
				db.run(
					`UPDATE tournament SET quarterfinalId${i + 1} = ? WHERE tournamentId = ?`,
					[matchId, tournId],
					function (err) {
					if (err) return reject(err);
					resolve();
					}
				);
				}
			);
			});
		})
		);

		// ✅ Tudo correu bem
		return reply.send({ message: 'Torneio criado com sucesso', tournamentId: tournId });
	} catch (e) {
		console.error(e);
		return reply.status(500).send({ error: 'Erro ao criar torneio' });
	}
	});

	fastify.get('/:tournamentId',(request, reply) => {
		const { tournamentId } = request.params;

		console.log('Recebido GET /api/' + tournamentId);

		db.all(
			`SELECT * FROM matchStats WHERE 
				matchId IN (
					SELECT quarterfinalId1 FROM tournament WHERE tournamentId = ?
					UNION
					SELECT quarterfinalId2 FROM tournament WHERE tournamentId = ?
					UNION
					SELECT quarterfinalId3 FROM tournament WHERE tournamentId = ?
					UNION
					SELECT quarterfinalId4 FROM tournament WHERE tournamentId = ?
					UNION
					SELECT semifinalId1 FROM tournament WHERE tournamentId = ?
					UNION
					SELECT semifinalId2 FROM tournament WHERE tournamentId = ?
					UNION
					SELECT finalId FROM tournament WHERE tournamentId = ?
				)`,
			[tournamentId, tournamentId, tournamentId, tournamentId, tournamentId, tournamentId, tournamentId],
			(err, rows) => {
				if (err) {
					reply.status(500).send({ error: 'Erro ao buscar partidas do torneio' });
					return;
				}
				console.log('Partidas retornadas:', rows);
				reply.send({ matches: rows || [] });
			}
		);
	});
};

module.exports = matchRoutes;