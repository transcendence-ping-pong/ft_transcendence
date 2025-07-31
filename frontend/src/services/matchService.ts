const API_BASE = '/api';

export async function getAllMatches() {
  console.log('Fetching matches');
  const res = await fetch(`${API_BASE}/matches`);
  if (!res.ok) throw new Error('Failed to fetch matches');
  return res.json();
}

export async function getMatchById(matchId: number) {
  const res = await fetch(`${API_BASE}/matches/${matchId}`);
  if (!res.ok) throw new Error('Failed to fetch match');
  return res.json();
}

export async function getMatchHistory(userId: number) {
  const res = await fetch(`${API_BASE}/matches/history/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch user history');
  return res.json();
}

export async function createMatch(payload: {
  matchType: string;
  creatorUserId: number;
  player1DisplayName: string;
  player2DisplayName: string;
  winnerDisplayName: string;
  scorePlayer1: number;
  scorePlayer2: number;
  forfeit: boolean;
}) {
  const res = await fetch(`${API_BASE}/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create match');
  return res.json();
}
