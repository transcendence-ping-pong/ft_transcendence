
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

	fastify.post('/matches', (request, reply) => {
		const {
			matchType,
			creatorUserId,
			player1DisplayName,
			player2DisplayName,
			winnerDisplayName,
			scorePlayer1,
			scorePlayer2,
			forfeit
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

		db.run(`INSERT INTO matchStats (matchType, creatorUserId, player1DisplayName, player2DisplayName,
			 winnerDisplayName, scorePlayer1, scorePlayer2, forfeit, date, time) 
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [matchType, creatorUserId, player1DisplayName, 
				player2DisplayName, winnerDisplayName, scorePlayer1, scorePlayer2, forfeit, date, time], function (err) {
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
		});
	});

	fastify.get('/matches/:matchId', (request, reply) => {
		const { matchId } = request.params;

		db.get(`SELECT * FROM matchStats WHERE matchId = ?`, matchId, (err, rows) => {
			if (err) {
				return reply.status(500).send({ error: 'Error fetching match from database' });
			}
			reply.send(rows);
		});
	});

	fastify.get('/matches/history/:userId', (request, reply) => {
		const { userId } = request.params;

		db.get(`SELECT * FROM matchHistory WHERE userId = ?`, userId, (err, rows) => {
			if (err) {
				return reply.status(500).send({ error: 'Error fetching user history from database' });
			}
			reply.send(rows);
		});
	});
};

module.exports = matchRoutes;
