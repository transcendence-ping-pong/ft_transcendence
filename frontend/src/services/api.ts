// TODO FIX: fetch real data from the backend
export async function getPlaySummary(gameId: string) {
const response = await fetch(`http://localhost:3001/services/${gameId}.json`);
if (!response.ok) throw new Error('Failed to fetch play summary');
  return response.json();
}

const API_URL = '/api';

export async function createTournament(userId: number, players: string[]) {
  const res = await fetch(`${API_URL}/tournament`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creatorId: userId, players }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro do backend: ${res.status} - ${text}`);
  }
  return res.json();
}

export async function getMatch(matchId: number) {
  const res = await fetch(`${API_URL}/matches/${matchId}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro do backend: ${res.status} - ${text}`);
  }
  return res.json();
}

export async function updateMatch(matchId: number, winner: string, score1: number, score2: number) {
  const res = await fetch(`${API_URL}/matches/${matchId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      winnerDisplayName: winner,
      scorePlayer1: score1,
      scorePlayer2: score2
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro do backend: ${res.status} - ${text}`);
  }
  return res.json();
}
