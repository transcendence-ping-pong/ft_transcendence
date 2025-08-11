// TODO FIX: fetch real data from the backend
export async function getPlaySummary(gameId: string) {
  const response = await fetch(`http://localhost:3001/services/${gameId}.json`);
  if (!response.ok) throw new Error('Failed to fetch play summary');
  return response.json();
}

// VITE_API_BASE_URL variable is set in Makefile...
// for running on port 3000 locally and taking advantage of vite hot reload
// mainly used for local development
// @ts-ignore
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export async function createTournament(userId: number, players: string[]) {
  const res = await fetch(`${BASE_URL}/tournament`, {
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
  const res = await fetch(`${BASE_URL}/matches/${matchId}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro do backend: ${res.status} - ${text}`);
  }
  return res.json();
}

export async function updateMatch(matchId: number, winner: string, score1: number, score2: number) {
  const res = await fetch(`${BASE_URL}/matches/${matchId}`, {
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
