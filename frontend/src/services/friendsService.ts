// VITE_API_BASE_URL variable is set in Makefile...
// for running on port 3000 locally and taking advantage of vite hot reload
// mainly used for local development
// @ts-ignore
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export async function getUserProfile(username: string): Promise<any> {
  try {
    const res = await fetch(`${BASE_URL}/users/username/${username}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch user profile');
    }
    return data.user;
  } catch (error: any) {
    return { error: error.message || 'Network error' };
  }
}

export async function postAddFriend(userId: number, friendId: number) {
  const res = await fetch(`${BASE_URL}/friends/add/${friendId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: userId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} - ${text}`);
  }
  return res.json();
}

export async function patchAcceptFriend(userId: number, friendId: number) {
  const res = await fetch(`${BASE_URL}/friends/accept/${friendId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: userId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend: ${res.status} - ${text}`);
  }
  return res.json();
}

export async function deleteFriend(userId: number, friendId: number) {
  const res = await fetch(`${BASE_URL}/friends/remove/${friendId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: userId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend: ${res.status} - ${text}`);
  }
  return res.json();
}

export async function getSentRequests(userId: number) {
  const res = await fetch(`${BASE_URL}/friends/${userId}/sent`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend: ${res.status} - ${text}`);
  }
  return res.json();
}

export async function getReceivedRequests(userId: number) {
  const res = await fetch(`${BASE_URL}/friends/${userId}/received`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend: ${res.status} - ${text}`);
  }
  return res.json();
}

export async function getFriends(userId: number) {
  const res = await fetch(`${BASE_URL}/friends/${userId}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend: ${res.status} - ${text}`);
  }
  return res.json();
}

// export async function getUserStats(userId: number): Promise<any> {
//   try {
//     const res = await fetch(`${BASE_URL}/users/stats/${userId}`, {
//       method: 'GET',
//       headers: { 'Content-Type': 'application/json' }
//     });

//     const data = await res.json();
//     if (!res.ok) {
//       throw new Error(data.error || 'Failed to fetch user stats');
//     }
//     return data;
//   } catch (error: any) {
//     return { error: error.message || 'Network error' };
//   }
// }
