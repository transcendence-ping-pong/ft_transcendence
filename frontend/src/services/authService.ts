export interface AuthResponse {
  error?: string;
  message?: string;
  user?: { id: string; username: string; email?: string };
  requiresToken?: boolean;
  has2FA?: boolean;
  qrCodeUrl?: string;
  secret?: string;
}

const BASE_URL = "http://localhost:4000";

export async function signup(username: string, password: string) {
  const res = await fetch(`${BASE_URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return await res.json();
}

export async function login(username: string, password: string, token?: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, token }),
  });
  return await res.json();
}

export async function googleLogin(): Promise<void> {
  window.location.href = '/auth/google';
}

export async function fetchLoggedInUser(): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/google/callback`);
  return await res.json();
}

export async function logout(username: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  return await res.json();
}

export async function check2FAStatus(username: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/check-2fa?username=${username}`);
  return await res.json();
}

export async function fetchUsers(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/users`);
  return await res.json();
}

export async function verifyToken(username: string, token: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/verify-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, token }),
  });
  return await res.json();
}

export async function generateSecret(username: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  return await res.json();
}
