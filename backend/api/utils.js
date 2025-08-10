
function splitIntoRandomPairs(inputArray) {
	if (inputArray.length !== 8) {
		throw new Error("Input array must contain exactly 8 elements.");
	}

	const copyArray = [...inputArray]
	for (let i = copyArray.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copyArray[i], copyArray[j]] = [copyArray[j], copyArray[i]];
	}

	const result = [];
	for (let i = 0; i < 8; i += 2) {
		result.push([copyArray[i], copyArray[i + 1]]);
	}

	return result;
};

function dbRun(db, sql, params) {
	return new Promise((resolve, reject) => {
		db.run(sql, params, function (err) {
			if (err) return reject(err);
			resolve({ lastID: this.lastID });
		});
	});
};

function getWinner(db, params) {
	return new Promise((resolve, reject) => {
		db.get('SELECT winnerDisplayName FROM matches WHERE matchId = ?', params, (err, row) => {
			if (err) {
				return reject(err);
			} 
			resolve({ name: row.winnerDisplayName });
		});
	});
};

module.exports = {
	splitIntoRandomPairs,
	dbRun,
	getWinner
};
