// TODO FIX: fetch real data from the backend
export async function getPlaySummary(gameId: string) {
  const response = await fetch(`http://localhost/services/${gameId}.json`);
  if (!response.ok) throw new Error('Failed to fetch play summary');
  return response.json();
}
