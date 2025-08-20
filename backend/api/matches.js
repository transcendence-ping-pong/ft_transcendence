
const { splitIntoRandomPairs } = require('./utils');
const { dbRun, dbGet } = require('./utils');
const { getWinner } = require('./utils');

async function matchRoutes(fastify, options) {

	const db = fastify.db;

	fastify.get('/matches', (request, reply) => {
		db.all(`SELECT * FROM matches`, (err, rows) => {

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
			tournId = null,
			player1DisplayName,
			player2DisplayName = 'Bot'
		} = request.body;

		if (!creatorUserId || !player1DisplayName) {
			return reply.status(400).send({ error: 'Invalid parameters.' });
		}

		const event = new Date();

		const time = event.toLocaleTimeString("pt-PT");
		const date = event.toLocaleDateString("pt-PT");
		
		try {
			const matchId = await dbRun(db, `INSERT INTO matches (creatorUserId, remoteUserId, player1DisplayName, player2DisplayName, date, time) VALUES (?, ?, ?, ?, ?, ?)`, [creatorUserId, remoteUserId, player1DisplayName, player2DisplayName, date, time]);

			if (tournId)
			{
				await dbRun(db, `UPDATE matches SET tournamentId = ? WHERE matchId = ?`, [tournId, matchId]);
				const row = await dbGet(db, `SELECT quarterId1, quarterId2, quarterId3, quarterId4, semiId1, semiId2, finalId FROM tournaments WHERE tournamentId = ?`, [tournId]);
					if (!row)
						throw new Error('Failed to fetch tournament match');

				const columns = ['quarterId1', 'quarterId2', 'quarterId3', 'quarterId4', 'semiId1', 'semiId2', 'finalId'];
				let emptyCol = null;

				for (const col of columns) {
					if (!row[col]) {
						emptyCol = col;
						break ;
					}
				}
				if (!emptyCol) {
					return ;
				}
				await dbRun(db, `UPDATE tournaments SET ${emptyCol} = ? WHERE tournamentId = ?`, [matchId, tournId]);
			}
			reply.send({message: 'Match created', id: matchId});
		} catch (err) {
			return reply.status(500).send({ error: err.message});
		}
	});

	fastify.get('/matches/:matchId', (request, reply) => {
		const { matchId } = request.params;

		db.get(`SELECT creatorUserId, remoteUserId, tournamentId, player1DisplayName, player2DisplayName, winnerDisplayName, scorePlayer1, scorePlayer2, date, time FROM matches WHERE matchId = ?`, matchId, function(err, row) {
			if (err || !row) {
				return reply.status(500).send({ error: 'Error fetching match' });
			}
			const object = {
        		creatorId: row.creatorUserId,
        		remoteId: row.remoteUserId,
        		tournId: row.tournamentId,
        		winner: row.winnerDisplayName,
        		p1: row.player1DisplayName,
        		p2: row.player2DisplayName,
        		scorep1: row.scorePlayer1,
        		scorep2: row.scorePlayer2,
        		date: row.date,
        		time: row.time
      		};
			reply.send(object);
		});
	});

	fastify.post('/matches/:matchId', async (request, reply) => {
		const { matchId } = request.params;

		const {
			winnerDisplayName,
			scorePlayer1,
			scorePlayer2,
		} = request.body;

		try {
			await db.run(`UPDATE matches SET winnerDisplayName = ?, scorePlayer1 = ?, scorePlayer2 = ? WHERE matchId = ?`, [winnerDisplayName, scorePlayer1, scorePlayer2, matchId]);
		} catch (err) {
			return reply.status(500).send({ error: 'Error updating match' });
		}
		reply.send({ message: 'Match result updated' });
	});

	fastify.get('/matches/history/:userId', (request, reply) => {
		const { userId } = request.params;

		db.all(`SELECT matchId FROM matches WHERE creatorUserId = ? OR remoteUserId = ?`, [userId, userId], (err, rows) => {
			if (err) {
				return reply.status(500).send({ error: 'Error fetching user history from database' });
			}
			reply.send(rows);
		});
	});

	fastify.post('/tournament', async (request, reply) => {
		const { userId, players } = request.body;


		if (!userId || !Array.isArray(players) || players.length !== 8) {
			return reply.status(400).send({ error: 'Invalid player amount' });
		}

		const shuffle = splitIntoRandomPairs(players);

		try{
			const tournId = await dbRun(db, `INSERT INTO tournaments (creatorId) VALUES (?)`, [userId]);
			reply.send({ message: 'Tournament created', id: tournId, players: shuffle });
		} catch (err) {
			return reply.status(500).send({ error: 'Error creating tournament' });
		}
	});

	fastify.get('/tournament/:tournId/semi', (request, reply) => {
		const { tournId } = request.params;

		db.get( `SELECT quarterId1, quarterId2, quarterId3, quarterId4 FROM tournaments WHERE tournamentId = ?`, [tournId], async (err, row) => {
			if (err || !row) {
				return reply.status(500).send({ error: 'Tournament not found'});
			}
				
			const quarterIds = [row.quarterId1, row.quarterId2, row.quarterId3, row.quarterId4];

			if (quarterIds.some(id => !id)) {
				return reply.status(500).send({ error: 'Quarterfinals incomplete' });
			}

			const winners = await Promise.all(quarterIds.map(matchId => getWinner(db, matchId)));

			if (winners.some(name => !name)) {
				return reply.status(500).send({ error: 'Quarterfinals incomplete' });
			}

			const result = [];
			for (let i = 0; i < 4; i += 2) {
				result.push({player1: winners[i], player2: winners[i + 1]});
			}
			reply.send({ message: 'Semifinals players retrieved', players: result});
		});
	});

	fastify.get('/tournament/:tournId/final', (request, reply) => {
		const { tournId } = request.params;

		db.get( `SELECT semiId1, semiId2 FROM tournaments WHERE tournamentId = ?`, [tournId], async (err, row) => {
			if (err || !row) {
				return reply.status(500).send({ error: 'Tournament not found'});
			}
				
			const semiIds = [row.semiId1, row.semiId2];

			if (semiIds.some(id => !id)) {
				return reply.status(500).send({ error: 'Semifinals incomplete' });
			}

			const winners = await Promise.all(semiIds.map(matchId => getWinner(db, matchId)));

			const result = [ {
				player1: winners[0],
				player2: winners[1]
			} ];

			reply.send({ message: 'Final players retrieved', players: result});
		});
	});

	// TODO: Check if it makes sense to also return creatorUserId
	fastify.get('/tournament/:tournId', (request, reply) => {
		const { tournId } = request.params;

		db.get( `SELECT quarterId1, quarterId2, quarterId3, quarterId4, semiId1, semiId2, finalId FROM tournaments WHERE tournamentId = ?`, [tournId], (err, row) => {
			if (err || !row) {
				return reply.status(500).send({ error: 'Tournament not found'});
			}
			return reply.send(row);
		});
	});

	fastify.get('/matches/stats/:userId', async (request, reply) => {
		const { userId } = request.params;

		try {
			const {wins} = await dbGet(db, `SELECT COUNT(*) AS wins FROM matches WHERE remoteUserId > 0 AND (creatorUserId = ? AND winnerDisplayName = player1DisplayName) OR (remoteUserId = ? AND winnerDisplayName = player2DisplayName)`, [userId, userId]);
			const {losses} = await dbGet(db, `SELECT COUNT(*) AS losses FROM matches WHERE remoteUserId > 0 AND (creatorUserId = ? AND winnerDisplayName = player2DisplayName) OR (remoteUserId = ? AND winnerDisplayName = player1DisplayName)`, [userId, userId]);
			return reply.send({wins, losses});

		} catch (err) {
			return reply.send(err.message)
		}

	});

};

module.exports = matchRoutes;
