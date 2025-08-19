// @ts-ignore
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export async function blockUser(userId: number, blockedId: number) {
  const res = await fetch(`${BASE_URL}/block/${blockedId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, blockedId })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function unblockUser(userId: number, blockedId: number) {
  const res = await fetch(`${BASE_URL}/unblock/${blockedId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, blockedId })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getBlocked(userId: number) {
  const res = await fetch(`${BASE_URL}/blocked/${userId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}


